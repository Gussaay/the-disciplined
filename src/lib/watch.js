// Linking a smartwatch directly, without its own app. FitPro watches (the
// Gizmo GZCSW02 and many others) speak the protocol in fitpro.js; any watch
// or strap with the standard Heart Rate service also works for heart rate.
// Android app only (the web view has no Web Bluetooth).
import { isNative } from './native';
import { FITPRO_SERVICES, GROUP, CMD, ack, craft, createAssembler, fitproChars, initSequence, needsAck, parsePacket } from './fitpro';
import { parseHeartRate } from './hrParse';
import { hex } from './scaleParse';

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

export const watchSupported = () => isNative;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (bytes) => new DataView(Uint8Array.from(bytes).buffer);
const bytesOf = (dv) => new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);

async function ble() {
  const { BleClient } = await import('@capacitor-community/bluetooth-le');
  await BleClient.initialize({ androidNeverForLocation: false });
  return BleClient;
}

/** Lets the person pick the watch in the phone's list. Resolves to { id, name }. */
export async function pickWatch() {
  if (!isNative) throw Object.assign(new Error('The watch works in the Android app'), { code: 'watch-web' });
  const BleClient = await ble();
  const device = await BleClient.requestDevice({ optionalServices: [...FITPRO_SERVICES, HR_SERVICE, BATTERY_SERVICE] });
  return { id: device.deviceId, name: device.name || 'Watch' };
}

/**
 * Connects to a saved watch and streams what it sends to `onEvent`:
 * { type: 'day', steps, distance, kcal } · { type: 'heart', bpm, spo2, systolic, diastolic }
 * · { type: 'battery', level } · { type: 'findPhone' } · { type: 'log', dir, hex }.
 * Resolves to { protocol, measureHeart, findWatch, refresh, syncTime, disconnect }.
 */
export async function connectWatch({ id }, { profile = {}, onEvent = () => {}, onEnd = () => {} } = {}) {
  const BleClient = await ble();
  const log = (dir, bytes) => onEvent({ type: 'log', dir, hex: hex(bytes) });
  const note = (text) => onEvent({ type: 'log', dir: 'info', hex: text });
  await BleClient.connect(id, () => onEnd());
  // Some phones hand back an empty service list right after connecting,
  // especially while the watch's own app shares the connection. Ask again.
  let services = await BleClient.getServices(id).catch(() => []);
  for (let tries = 0; !services.length && tries < 3; tries += 1) {
    note(`no services yet, discovering (${tries + 1})`);
    await sleep(700);
    await BleClient.discoverServices(id).catch(() => {});
    services = await BleClient.getServices(id).catch(() => []);
  }
  note(`services: ${services.map((x) => x.uuid).join(', ') || 'none listed'}`);
  const has = (uuid) => services.find((s) => s.uuid.toLowerCase() === uuid);

  const battery = has(BATTERY_SERVICE);
  const readBattery = async () => {
    if (!battery) return;
    try {
      const v = await BleClient.read(id, BATTERY_SERVICE, BATTERY_LEVEL);
      onEvent({ type: 'battery', level: v.getUint8(0) });
    } catch { /* not readable */ }
  };

  // The FitPro service: the listed one, or, when the phone listed nothing,
  // each known id tried directly.
  const assembler = createAssembler();
  let send = null;
  const onData = (dv) => {
    const chunk = bytesOf(dv);
    log('in', chunk);
    for (const packet of assembler.push(chunk)) {
      if (needsAck(packet) && send) send(ack(packet)).catch(() => {});
      const event = parsePacket(packet);
      if (event && event.type !== 'other') onEvent(event);
    }
  };
  const listed = FITPRO_SERVICES.map(has).find(Boolean);
  const candidates = listed ? [listed.uuid.toLowerCase()] : services.length && !services.some((x) => x.uuid.toLowerCase().startsWith('6e40')) ? [] : FITPRO_SERVICES;
  let service = null;
  for (const uuid of candidates) {
    try {
      await BleClient.startNotifications(id, uuid, fitproChars(uuid).rx, onData);
      service = uuid;
      break;
    } catch (e) {
      note(`${uuid}: ${e?.message || e}`);
    }
  }
  if (service) {
    const { tx } = fitproChars(service);
    let withResponse = listed?.characteristics?.find((c) => c.uuid.toLowerCase() === tx)?.properties?.write ?? false;
    send = async (bytes) => {
      log('out', bytes);
      // Long packets go in 20-byte pieces, as many of these watches need.
      for (let i = 0; i < bytes.length; i += 20) {
        const part = view(bytes.slice(i, i + 20));
        try {
          if (withResponse) await BleClient.write(id, service, tx, part);
          else await BleClient.writeWithoutResponse(id, service, tx, part);
        } catch (e) {
          // The other way of writing, once, if the watch refused this one.
          withResponse = !withResponse;
          note(`write switched (${e?.message || e})`);
          if (withResponse) await BleClient.write(id, service, tx, part);
          else await BleClient.writeWithoutResponse(id, service, tx, part);
        }
      }
    };
    for (const packet of initSequence(profile)) {
      await send(packet);
      await sleep(220);
    }
    await readBattery();
    return {
      protocol: 'fitpro',
      measureHeart: () => send(craft(GROUP.general, CMD.hrMeasure, [0x01])),
      stopHeart: () => send(craft(GROUP.general, CMD.hrMeasure, [0x00])),
      findWatch: () => send(craft(GROUP.general, CMD.findBand, [0x01])),
      refresh: async () => {
        await send(craft(GROUP.sports, CMD.stepsToday, [0x01]));
        await readBattery();
      },
      syncTime: () => send(initSequence(profile)[1]),
      disconnect: () => BleClient.disconnect(id).catch(() => {}),
    };
  }

  if (has(HR_SERVICE)) {
    await BleClient.startNotifications(id, HR_SERVICE, HR_MEASUREMENT, (dv) => {
      log('in', bytesOf(dv));
      const bpm = parseHeartRate(dv);
      if (bpm) onEvent({ type: 'heart', bpm, spo2: null, systolic: null, diastolic: null });
    });
    await readBattery();
    return {
      protocol: 'heart-rate',
      measureHeart: async () => {},
      stopHeart: async () => {},
      findWatch: null,
      refresh: readBattery,
      syncTime: null,
      disconnect: () => BleClient.disconnect(id).catch(() => {}),
    };
  }

  const list = services.map((x) => x.uuid).join(', ') || 'none listed by the phone';
  await BleClient.disconnect(id).catch(() => {});
  throw Object.assign(new Error(`This watch speaks a protocol the app does not know yet. Services: ${list}`), { code: 'watch-unknown', services: list });
}
