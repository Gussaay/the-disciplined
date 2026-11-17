import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSettler, fromHex, learnFormat, parseAdvert, parseLearnt } from './scaleParse.js';
import { band, bodyComposition, bmiOf, summary } from './bodyComp.js';

function v20({ weight, impedance, final = true, twoDecimals = false }) {
  const d = new Uint8Array(19);
  d[6] = (final ? 1 : 0) | (twoDecimals ? 4 : 0);
  const raw = Math.round(weight * (twoDecimals ? 100 : 10));
  d[8] = raw >> 8; d[9] = raw & 0xff;
  d[10] = impedance >> 8; d[11] = impedance & 0xff;
  let sum = 0x20;
  for (let i = 0; i < 12; i++) sum ^= d[i];
  d[12] = sum;
  return { [0x20ca]: d };
}

test('V20 adverts give weight, impedance and the final flag, with the checksum checked', () => {
  const r = parseAdvert(v20({ weight: 57.2, impedance: 5123 }));
  assert.deepEqual(r, { format: 'V20', weight: 57.2, impedance: 512.3, final: true, checksum: true });
  assert.equal(parseAdvert(v20({ weight: 57.25, impedance: 0, twoDecimals: true })).weight, 57.25);
  assert.equal(parseAdvert(v20({ weight: 57.2, impedance: 0, final: false })).final, false);
  const bad = v20({ weight: 57.2, impedance: 5000 });
  bad[0x20ca][12] ^= 0xff;
  assert.equal(parseAdvert(bad).checksum, false);
});

test('C0 nameless adverts check the MAC and read decimals and units', () => {
  const d = fromHex('02 3c 01 f4 00 00 01 98 f6 7a 5e f9 9a'); // 57.2 kg, 500 ohm, final
  const r = parseAdvert({ [0x12c0]: d }, { mac: '98:F6:7A:5E:F9:9A' });
  assert.equal(r.format, 'C0');
  assert.equal(r.weight, 57.2);
  assert.equal(r.impedance, 500);
  assert.equal(r.final, true);
  assert.equal(parseAdvert({ [0x12c0]: d }, { mac: '98:F6:7A:7C:FA:4B' }), null);
  const lb = fromHex('04 e2 00 00 00 00 11 98 f6 7a 5e f9 9a'); // 125.0 lb
  assert.equal(parseAdvert({ [0x00c0]: lb }).weight, 56.7);
});

test('V11 weight-only adverts', () => {
  const d = new Uint8Array(23);
  d[3] = 0x02; d[4] = 0x3c; d[9] = 0;
  let sum = 0xca ^ 0x11;
  for (let i = 0; i < 16; i++) sum ^= d[i];
  d[16] = sum;
  assert.deepEqual(parseAdvert({ [0x11ca]: d }), { format: 'V11', weight: 57.2, impedance: null, final: null, checksum: true });
  assert.equal(parseAdvert({ [0x004c]: new Uint8Array(20) }), null);
});

test('an unknown scale is learnt from the weight on its display', () => {
  const sample = (kg) => ({ [0x1234]: Uint8Array.from([1, 2, 9, 0, 0, Math.round(kg * 10) & 0xff, Math.round(kg * 10) >> 8, 7]) });
  const cfg = learnFormat([sample(57.2), sample(57.2), sample(57.1)], 57.2);
  assert.equal(cfg.company, 0x1234);
  assert.equal(cfg.offset, 5);
  assert.equal(cfg.order, 'le');
  assert.equal(cfg.divider, 10);
  assert.equal(parseLearnt(sample(80.4), cfg).weight, 80.4);
  assert.equal(learnFormat([{ [1]: [0, 0] }], 57.2), null);
});

test('the settler waits for the final flag or a steady weight', () => {
  const s = createSettler({ holdMs: 2000 });
  assert.equal(s.push({ weight: 50, final: false }, 0).settled, false);
  assert.equal(s.push({ weight: 57.2, final: true }, 100).settled, true);
  const t = createSettler({ holdMs: 2000 });
  assert.equal(t.push({ weight: 57.2, final: null }, 0).settled, false);
  assert.equal(t.push({ weight: 57.2, final: null }, 1000).settled, false);
  assert.equal(t.push({ weight: 57.2, final: null }, 2100).settled, true);
  assert.equal(t.push({ weight: 57.2, final: null }, 3000).settled, false);
});

test('body composition for a 35-year-old man, 174 cm, 57.2 kg', () => {
  const b = bodyComposition({ weight: 57.2, impedance: 500, height: 174, age: 35, sex: 'male' });
  assert.equal(b.bmi, 18.9);
  assert.ok(b.fat > 5 && b.fat < 20, `fat ${b.fat}`);
  assert.ok(b.muscle > 40 && b.muscle < 55, `muscle ${b.muscle}`);
  assert.ok(b.water > 50 && b.water < 70);
  assert.ok(b.bone > 1.5 && b.bone < 4);
  assert.ok(b.visceral >= 1 && b.visceral < 10);
  assert.ok(b.bmr > 1200 && b.bmr < 1700);
  assert.ok(b.protein > 10 && b.protein < 25);
  const noImp = bodyComposition({ weight: 57.2, impedance: null, height: 174 });
  assert.deepEqual(Object.keys(noImp), ['weight', 'bmi']);
  assert.equal(bmiOf(80, 0), null);
});

test('bands and summaries', () => {
  assert.equal(band('bmi', 18.9), 1);
  assert.equal(band('bmi', 31), 3);
  assert.equal(band('fat', 30, { sex: 'female' }), 1);
  assert.equal(band('bone', 3), null);
  const s = summary([{ at: 1, value: 55.3 }, { at: 2, value: 57.2 }, { at: 3, value: 56 }]);
  assert.equal(s.avg, 56.2);
  assert.equal(s.change, 0.7);
  assert.equal(s.max.value, 57.2);
  assert.equal(s.min.at, 1);
});
