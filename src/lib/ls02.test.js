import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLs02, LS02, ls02Alert, ls02Cmd, parseLs02 } from './ls02.js';

test('commands', () => {
  assert.deepEqual(ls02Cmd.time(new Date(2024, 4, 10, 14, 30, 0)), [0x04, 0x07, 0xe8, 5, 10, 14, 30, 0]);
  assert.deepEqual(ls02Cmd.user({ sex: 'male', age: 30, height: 175, weight: 70, stepGoal: 8000 }), [5, 0, 175, 0, 70, 10, 0, 0, 0x1f, 0x40, 1, 0xa0, 0, 30, 1, 0, 1, 1, 0x28]);
  assert.equal(isLs02([LS02.general, LS02.data]), true);
});

test('notifications', () => {
  const now = new Date(2026, 10, 17, 22, 0, 0);
  const steps = new Map();
  assert.deepEqual(parseLs02([0xa2, 80]), { type: 'battery', level: 80 });
  assert.equal(parseLs02([0xe5, 0x11, 0, 72]).bpm, 72);
  assert.equal(parseLs02([0xe5, 0x11, 0, 0xff]), null);
  parseLs02([0xb2, 0x07, 0xea, 11, 17, 9, 0x01, 0xf4], { now, steps });
  parseLs02([0xb2, 0x07, 0xea, 11, 17, 10, 0x00, 0x64], { now, steps });
  parseLs02([0xb2, 0x07, 0xea, 11, 16, 10, 0x03, 0xe8], { now, steps }); // yesterday
  assert.deepEqual(parseLs02([0xb2, 0xfd, 0], { now, steps }), { type: 'day', steps: 600 });
  assert.equal(parseLs02([0xd1, 0x0a]).type, 'findPhone');
  // F7 03 is the watch's own 10-minute heart reading (00:01, 76 bpm), not steps
  const t = new Map();
  const auto = parseLs02([0xf7, 0x03, 0x07, 0xea, 0x0b, 0x12, 0x00, 0x01, 0x4c], { now: new Date(2026, 10, 18, 0, 18), steps: t });
  assert.equal(auto.type, 'heart');
  assert.equal(auto.bpm, 76);
  assert.equal(auto.minute, 1);
  // heart summary after a measurement (Qusay's log, 00:37)
  const h = parseLs02([0xf7, 0x04, 0x07, 0xea, 0x0b, 0x12, 0x00, 0x25, 0x54, 0x4e, 0x51], { now: new Date(2026, 10, 18, 0, 40) });
  assert.equal(h.bpm, 81);
  assert.equal(h.bpmMax, 84);
  // old history rows (7 August) do not count for today
  parseLs02([0xb2, 0x07, 0xea, 0x08, 0x07, 0x14, 0x02, 0xc2, 0, 0, 0, 0, 0, 0x02, 0x0e, 0x06, 0x02, 0xc2], { now: new Date(2026, 10, 18), steps: t });
  // today's rows from the 06:05 log: 1275 + 22 steps
  parseLs02([0xb2, 0x07, 0xea, 0x0b, 0x12, 0x07, 0x04, 0xfb, 0, 0, 0, 0, 0, 0x28, 0x39, 0x0b, 0x04, 0xfb], { now: new Date(2026, 10, 18, 8, 5), steps: t });
  parseLs02([0xb2, 0x07, 0xea, 0x0b, 0x12, 0x08, 0x00, 0x16, 0, 0, 0, 0, 0, 0x02, 0x03, 0, 0, 0x16], { now: new Date(2026, 10, 18, 8, 5), steps: t });
  assert.deepEqual(parseLs02([0xb2, 0xfd, 0xef], { now: new Date(2026, 10, 18), steps: t }), { type: 'day', steps: 1297 });
});

test('alerts, workouts and confirmations', () => {
  const w = ls02Alert('Hi');
  assert.deepEqual(w, [[0x0f, 0, 0x04, 4, 0, 0x48, 0, 0x69], [0x0f, 0xfd]]);
  const long = ls02Alert('Rest is over, next set now');
  assert.ok(long.every((x) => x.length <= 20));
  assert.equal(long[0][3], 52);
  assert.equal(long.slice(0, -1).reduce((n, x, i) => n + x.length - (i ? 2 : 4), 0), 52);
  assert.deepEqual(parseLs02([0xfd, 0x11, 0x19, 0]), { type: 'sport', on: true, kind: 0x19 });
  assert.equal(parseLs02([0x01, 0x01, 0x01]).what, 'format');
  assert.equal(parseLs02([0x0f, 0xfd, 0, 4]).what, 'alert');
  assert.equal(parseLs02([0x16, 0x11, 0, 90]).bpm, 90);
  assert.equal(parseLs02([0xa1, 0x52, 0x48, 0x32]).text, 'RH2');
  const hist = parseLs02([0x18, 0x07, 0xea, 0x0b, 0x12, 0x08, 70, 0xff, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0], { now: new Date(2026, 10, 18, 9) });
  assert.deepEqual(hist.points, [[480, 70], [500, 72]]);
});
