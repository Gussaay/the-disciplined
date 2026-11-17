// The FitPro watch protocol (the green "FitPro" app; Gizmo, M6, M4, LH716
// and many other low-cost watches), as documented by the Gadgetbridge
// project. Pure functions: building commands and reading what the watch sends.
//
// Every packet: CD | len hi | len lo | group | 01 | command | payload len hi | payload len lo | payload
// where len counts everything after the first three bytes. The watch's
// packets are acknowledged with DC 00 05 group 01 size-hi size-lo 01.

export const FITPRO_SERVICES = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9d', // FitPro
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // the same on the standard Nordic UART id
];
export const fitproChars = (service) => ({
  tx: service.replace(/^6e400001/, '6e400002'),
  rx: service.replace(/^6e400001/, '6e400003'),
});

export const GROUP = { general: 0x12, bind: 0x14, sports: 0x15, request: 0x1a, button: 0x1c, info: 0x20 };
export const CMD = {
  setTime: 0x01, userData: 0x04, init1: 0x0a, init2: 0x0c, findBand: 0x0b, language: 0x15, init3: 0xff,
  hrMeasure: 0x18, stepsToday: 0x06, hwInfo: 0x10, bandInfo: 0x02,
};
export const RX = { heartRate: 0x0e, dayTotals: 0x0c, steps: 0x02, sleep: 0x03, findPhone: 0x01 };

export function craft(group, command, payload = []) {
  const data = Array.from(payload);
  const total = 8 + data.length;
  return Uint8Array.from([0xcd, ((total - 3) >> 8) & 0xff, (total - 3) & 0xff, group, 0x01, command, (data.length >> 8) & 0xff, data.length & 0xff, ...data]);
}

const be32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** The watch's clock format: seconds | minutes<<6 | hours<<12 | day<<17 | month<<22 | (year-2000)<<26. */
export function timePayload(d = new Date()) {
  const v = (d.getSeconds() | (d.getMinutes() << 6) | (d.getHours() << 12) | (d.getDate() << 17) | ((d.getMonth() + 1) << 22) | ((d.getFullYear() - 2000) << 26)) >>> 0;
  return be32(v);
}

/** Sex, age, height and weight packed the way the watch wants them (metric). */
export function userPayload({ sex, age, height, weight }) {
  const male = sex !== 'female' ? 1 : 0;
  const v = ((male << 31) | ((Number(age) || 30) << 24) | ((Math.round(Number(height)) || 170) << 15) | ((Math.round(Number(weight)) || 70) << 5) | 1) >>> 0;
  return be32(v);
}

/** The start-up sequence the watch expects before it sends any data. */
export function initSequence(profile = {}, now = new Date()) {
  return [
    craft(GROUP.general, CMD.init1, [0x02]),
    craft(GROUP.general, CMD.setTime, timePayload(now)),
    craft(GROUP.request, CMD.init1),
    craft(GROUP.request, CMD.init2),
    craft(GROUP.general, CMD.language, [0x01]),
    craft(GROUP.general, CMD.init3, [0x01]),
    craft(GROUP.request, 0x01),
    craft(GROUP.request, 0x0f),
    craft(GROUP.general, CMD.userData, userPayload(profile)),
    craft(GROUP.sports, CMD.stepsToday, [0x01]),
  ];
}

export const ack = (p) => Uint8Array.from([0xdc, 0x00, 0x05, p[3], 0x01, ((((p[1] << 8) | p[2]) + 3) >> 8) & 0xff, (((p[1] << 8) | p[2]) + 3) & 0xff, 0x01]);

/**
 * Joins notification chunks into whole packets. `push(bytes)` returns the
 * packets completed by that chunk.
 */
export function createAssembler() {
  let buf = [];
  return {
    push(chunk) {
      const bytes = Array.from(chunk);
      if (bytes[0] === 0xcd && bytes.length >= 3) buf = [];
      buf.push(...bytes);
      const out = [];
      while (buf.length >= 3 && buf[0] === 0xcd) {
        const need = ((buf[1] << 8) | buf[2]) + 3;
        if (buf.length < need) break;
        out.push(Uint8Array.from(buf.slice(0, need)));
        buf = buf.slice(need);
      }
      if (buf.length && buf[0] !== 0xcd) buf = [];
      return out;
    },
  };
}

const u32 = (p, i) => ((p[i] << 24) | (p[i + 1] << 16) | (p[i + 2] << 8) | p[i + 3]) >>> 0;

/** What a whole packet from the watch means, or null. */
export function parsePacket(p) {
  if (!p || p[0] !== 0xcd || p.length < 6) return null;
  const group = p[3];
  const cmd = p[5];
  if (group === GROUP.sports && cmd === RX.heartRate && p.length >= 20) {
    const bpm = p[19];
    return {
      type: 'heart',
      bpm: bpm > 25 && bpm < 230 ? bpm : null,
      spo2: p[13] >= 70 && p[13] <= 100 ? p[13] : null,
      systolic: p[17] > 60 && p[17] < 250 ? p[17] : null,
      diastolic: p[18] > 30 && p[18] < 160 ? p[18] : null,
    };
  }
  if (group === GROUP.sports && cmd === RX.dayTotals && p.length >= 20) {
    return { type: 'day', steps: u32(p, 10), distance: u32(p, 14), kcal: (p[18] << 8) | p[19] };
  }
  if (group === GROUP.button && cmd === RX.findPhone) return { type: 'findPhone' };
  return { type: 'other', group, cmd };
}

/** Packets the watch wants acknowledged before it sends more. */
export const needsAck = (p) => p?.[0] === 0xcd && [GROUP.sports, GROUP.info, GROUP.request].includes(p[3]);
