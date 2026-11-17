// Listening to a Bluetooth body-fat scale from the Android app. The scale is
// never paired or connected: the app scans for its advertisements and reads
// the numbers out of them (see scaleParse.js), so the OKOK app is not needed.
import { isNative } from './native';

export const scaleSupported = () => isNative;

/** Android hands MACs in upper case with colons; keep one spelling. */
export const normMac = (id) => String(id || '').toUpperCase();

function toBytes(view) {
  if (!view) return null;
  if (view instanceof Uint8Array) return view;
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

/**
 * Starts a scan. `onAdvert({ id, name, rssi, mfr })` is called for every
 * advertisement that carries manufacturer data (`mfr` maps company id to
 * bytes). Resolves to a stop function.
 */
export async function scanAdverts(onAdvert) {
  if (!isNative) throw Object.assign(new Error('The scale works in the Android app'), { code: 'scale-web' });
  const { BleClient, ScanMode } = await import('@capacitor-community/bluetooth-le');
  await BleClient.initialize({ androidNeverForLocation: false });
  if (!(await BleClient.isEnabled())) {
    try {
      await BleClient.requestEnable();
    } catch {
      throw Object.assign(new Error('Bluetooth is off'), { code: 'scale-bt-off' });
    }
  }
  await BleClient.requestLEScan({ allowDuplicates: true, scanMode: ScanMode?.SCAN_MODE_LOW_LATENCY ?? 2 }, (result) => {
    const raw = result.manufacturerData || {};
    const mfr = {};
    for (const [key, view] of Object.entries(raw)) {
      const bytes = toBytes(view);
      if (bytes) mfr[Number(key)] = Uint8Array.from(bytes);
    }
    if (!Object.keys(mfr).length) return;
    onAdvert({
      id: normMac(result.device?.deviceId),
      name: result.localName || result.device?.name || '',
      rssi: result.rssi,
      mfr,
    });
  });
  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;
    try {
      await BleClient.stopLEScan();
    } catch { /* already stopped */ }
  };
}
