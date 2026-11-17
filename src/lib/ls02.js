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
    [base('55ff'), base('b004')],
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
  user: ({ sex, age, height, weight, stepGoal = 8000 }) => {
    const goal = Math.max(1000, Math.min(60000, Number(stepGoal) || 8000));
    return [
      0x05, 0x00, Math.round(Number(height) || 170) & 0xff, 0x00, Math.round(Number(weight) || 70) & 0xff, 0x0a, 0x00, 0x00,
      (goal >> 8) & 0xff, goal & 0xff, 0x01, 0xa0, 0x00, Math.round(Number(age) || 30) & 0xff, sex === 'female' ? 0x02 : 0x01, 0x00, 0x01, 0x01, 0x28,
    ];
  },
};

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
  if (id === 0xe5 && p[1] === 0x11 && p.length >= 4) {
    const bpm = bpmOf(p[3]);
    return bpm ? { type: 'heart', bpm, spo2: null, systolic: null, diastolic: null, live: true } : null;
  }
  if (id === 0x18 && p[1] === 0x03 && p.length >= 9) {
    const bpm = bpmOf(p[8]);
    return bpm ? { type: 'heart', bpm, spo2: null, systolic: null, diastolic: null } : null;
  }
  if (id === 0x18 && p[1] === 0x04 && p.length >= 11 && sameDay(p, 2, now)) {
    const bpm = bpmOf(p[10]);
    return bpm ? { type: 'heart', bpm, bpmMax: bpmOf(p[8]), bpmMin: bpmOf(p[9]), spo2: null, systolic: null, diastolic: null } : null;
  }
  if (id === 0xb2 && p[1] === 0xfd) return { type: 'day', steps: [...steps.values()].reduce((a, b) => a + b, 0) };
  if (id === 0xb2 && p.length >= 8) {
    if (sameDay(p, 1, now)) steps.set(p[5], u16(p, 6));
    return { type: 'stepsRow' };
  }
  if ((id === 0x09 || id === 0xb1) && p.length >= 8) return { type: 'stepsChanged' };
  if (id === 0xd1 && p[1] === 0x0a) return { type: 'findPhone' };
  return null;
}
