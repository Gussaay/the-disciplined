// Watches on Realtek chips (services 55FF, 56FF, 60FF, 61FF and D0FF; the
// Gizmo GZCSW02 among them), as reverse engineered for the Haylou LS02
// (github.com/XorTroll/ls02-re). Commands are a one-byte id and fixed fields,
// no framing. Pure functions: building commands and reading notifications.

const base = (short) => `0000${short}-0000-1000-8000-00805f9b34fb`;
export const LS02 = {
  general: base('55ff'),
  generalWrite: base('33f1'),
  generalNotify: base('33f2'),
  data: base('60ff'),
  dataWrite: base('6001'),
  dataNotify: base('6002'),
  // Notifications that may also carry replies; subscribed to and logged.
  extra: [
    [base('56ff'), base('34f2')],
    [base('61ff'), base('6102')],
  ],
};

export const isLs02 = (serviceIds) => serviceIds.includes(LS02.general) && serviceIds.includes(LS02.data);

const u16 = (p, i) => (p[i] << 8) | p[i + 1];

export const ls02Cmd = {
  battery: () => [0xa2],
  time: (d = new Date()) => [0x04, (d.getFullYear() >> 8) & 0xff, d.getFullYear() & 0xff, d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()],
  steps: () => [0xb2, 0x03, 0x01],
  heartOn: () => [0x18, 0x01],
  heartOff: () => [0x18, 0x02],
  heartAll: () => [0x18, 0xfa],
  firmware: () => [0xa1],
  // Metric units and the 24-hour clock; the watch echoes it back.
  format: () => [0x01, 0x01, 0x01],
  // Profile and watch settings in one command: screen-on seconds, step goal, raise-to-wake.
  user: ({ sex, age, height, weight, stepGoal = 8000 }, { screen = 10, wrist = true } = {}) => {
    const goal = Math.max(1000, Math.min(60000, Number(stepGoal) || 8000));
    return [
      0x05, 0x00, Math.round(Number(height) || 170) & 0xff, 0x00, Math.round(Number(weight) || 70) & 0xff, Math.max(3, Math.min(30, Number(screen) || 10)), 0x00, 0x00,
      (goal >> 8) & 0xff, goal & 0xff, wrist ? 0x01 : 0x00, 0xa0, 0x00, Math.round(Number(age) || 30) & 0xff, sex === 'female' ? 0x02 : 0x01, 0x00, 0x01, 0x01, 0x28,
    ];
  },
};

/** Alert types the watch shows with their own icon. */
export const ALERT = { call: 0x00, message: 0x04, whatsapp: 0x07 };

/**
 * A message shown on the watch (it vibrates): UTF-16 text split into writes of
 * at most 20 bytes, then the finishing write. Returns the list of writes.
 */
export function ls02Alert(text, type = ALERT.message) {
  const chars = [...String(text || '')].slice(0, 60).join('');
  const bytes = [];
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars.charCodeAt(i);
    bytes.push((c >> 8) & 0xff, c & 0xff);
  }
  const len = Math.min(bytes.length, 0xfc);
  const body = bytes.slice(0, len);
  const writes = [[0x0f, 0x00, type, len, ...body.slice(0, 16)]];
  for (let i = 16, idx = 1; i < body.length; i += 18, idx += 1) writes.push([0x0f, idx, ...body.slice(i, i + 18)]);
  writes.push([0x0f, 0xfd]);
  return writes;
}

/** Sport kinds the watch reports when a workout starts or ends on it. */
export const SPORTS = {
  0x01: ['Jogging', 'الهرولة'], 0x02: ['Cycling', 'الدراجة'], 0x08: ['Climbing', 'التسلق'], 0x09: ['Running', 'الجري'],
  0x0a: ['Basketball', 'كرة السلة'], 0x0b: ['Football', 'كرة القدم'], 0x12: ['Spinning', 'الدراجة الثابتة'], 0x13: ['Yoga', 'اليوغا'],
  0x15: ['Treadmill', 'جهاز المشي'], 0x16: ['Gymnastics', 'الجمباز'], 0x17: ['Rowing', 'التجديف'], 0x19: ['Training', 'تمرين متكامل'],
};

/**
 * Commands that may start a heart measurement on these watches; none is
 * documented. The app tries them one at a time and keeps the one the watch
 * answers with heart readings. Only heart-rate ids (E5, 18) are tried.
 */
export const HEART_CANDIDATES = [
  ['general', [0xe5, 0x11, 0x01]],
  ['general', [0xe5, 0x01]],
  ['general', [0xe5, 0x11, 0x00, 0x01]],
  ['general', [0x18, 0x11]],
  ['general', [0x18, 0x05]],
  ['data', [0xe5, 0x11]],
  ['data', [0xe5, 0x11, 0x01]],
  ['general', [0xe5, 0x12]],
  ['general', [0x18, 0x03]],
  ['data', [0x18, 0x03]],
  ['data', [0x16, 0x11]],
  ['general', [0xe5, 0x11, 0x00, 0xff]],
];

const sameDay = (p, i, now) => u16(p, i) === now.getFullYear() && p[i + 2] === now.getMonth() + 1 && p[i + 3] === now.getDate();
const bpmOf = (v) => (v > 25 && v < 230 ? v : null);

/**
 * Reads one notification. `steps` is a Map(hour -> steps) the caller keeps
 * for today; a step history ends with { type: 'day', steps }.
 */
export function parseLs02(p, { now = new Date(), steps = new Map() } = {}) {
  if (!p?.length) return null;
  const id = p[0];
  if (id === 0xa2 && p.length >= 2) return { type: 'battery', level: p[1] };
  if (id === 0xa1 && p.length > 1) return { type: 'firmware', text: String.fromCharCode(...p.slice(1).filter((b) => b >= 0x20 && b < 0x7f)) };
  // Live heart rate while the watch's heart screen is open (E5 on the general
  // channel, 16 on the data one); E5 00 carries the last value on leaving it.
  if ((id === 0xe5 || id === 0x16) && (p[1] === 0x11 || p[1] === 0x00) && p.length >= 4) {
    const bpm = bpmOf(p[3]);
    return bpm ? { type: 'heart', bpm, spo2: null, systolic: null, diastolic: null, live: p[1] === 0x11 } : null;
  }
  if ((id === 0xe5 || id === 0x16) && p.length <= 3) return { type: 'heartScreen', open: p[1] === 0x11 };
  // The watch's own reading every 10 minutes (18 03, or F7 03 on this watch):
  // date, hour, minute, heart rate.
  if ((id === 0x18 || id === 0xf7) && p[1] === 0x03 && p.length >= 9) {
    const bpm = bpmOf(p[8]);
    if (!bpm || !sameDay(p, 2, now)) return { type: 'old' };
    return { type: 'heart', bpm, auto: true, minute: p[6] * 60 + p[7], spo2: null, systolic: null, diastolic: null };
  }
  // Summary of a measurement: date, hour, minute, max, min, average.
  if ((id === 0x18 || id === 0xf7) && p[1] === 0x04 && p.length >= 11) {
    const bpm = bpmOf(p[10]);
    if (!bpm || !sameDay(p, 2, now)) return { type: 'old' };
    return { type: 'heart', bpm, bpmMax: bpmOf(p[8]), bpmMin: bpmOf(p[9]), minute: p[6] * 60 + p[7], spo2: null, systolic: null, diastolic: null };
  }
  // Heart history: one row per two hours, a value every 10 minutes.
  if (id === 0x18 && p[1] === 0x07 && p.length >= 18) {
    if (!sameDay(p, 1, now)) return { type: 'old' };
    const points = [];
    for (let i = 0; i < 12; i += 1) {
      const bpm = bpmOf(p[6 + i]);
      if (bpm) points.push([p[5] * 60 + i * 10, bpm]);
    }
    return { type: 'heartHistory', points };
  }
  if ((id === 0x18) && (p[1] === 0x01 || p[1] === 0x02 || p[1] === 0xfd)) return { type: 'ack', what: 'heart' };
  if ((id === 0xb2 || id === 0x0a) && p[1] === 0xfd) return { type: 'day', steps: [...steps.values()].reduce((a, b) => a + b, 0) };
  if ((id === 0xb2 || id === 0x0a) && p.length >= 8 && p[1] === 0x07) {
    if (sameDay(p, 1, now)) steps.set(p[5], u16(p, 6));
    return { type: 'stepsRow' };
  }
  if ((id === 0x09 || id === 0xb1) && p.length >= 8) return { type: 'stepsChanged' };
  if ((id === 0xd1 || id === 0x12) && p[1] === 0x0a) return { type: 'findPhone' };
  // A workout started (11) or ended (00) on the watch, and its kind.
  if (id === 0xfd && (p[1] === 0x11 || p[1] === 0x00) && p.length >= 3) return { type: 'sport', on: p[1] === 0x11, kind: p[2] };
  if (id === 0xbe && p[1] === 0x02 && p.length >= 3) return { type: 'silent', on: p[2] === 0x00 };
  // Echoes that confirm the watch took a command.
  if (id === 0x04 && p.length >= 8) return { type: 'ack', what: 'time' };
  if (id === 0x01 && p.length >= 3) return { type: 'ack', what: 'format' };
  if (id === 0x0f) return { type: 'ack', what: 'alert' };
  if (id === 0x11) return { type: 'ack', what: 'weather' };
  if (id === 0x1c || id === 0x33) return { type: 'ack', what: 'pair' };
  return null;
}
