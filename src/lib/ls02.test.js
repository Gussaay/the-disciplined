import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLs02, LS02, ls02Cmd, parseLs02 } from './ls02.js';

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
  // the GZCSW02's live step record (from Qusay's log, 2026-11-18 00:18)
  const t = new Map();
  assert.deepEqual(parseLs02([0xf7, 0x03, 0x07, 0xea, 0x0b, 0x12, 0x00, 0x01, 0x4c], { now: new Date(2026, 10, 18, 0, 18), steps: t }), { type: 'day', steps: 332 });
  // old history rows (7 August) do not count for today
  parseLs02([0xb2, 0x07, 0xea, 0x08, 0x07, 0x14, 0x02, 0xc2, 0, 0, 0, 0, 0, 0x02, 0x0e, 0x06, 0x02, 0xc2], { now: new Date(2026, 10, 18), steps: t });
  assert.deepEqual(parseLs02([0xb2, 0xfd, 0xfb], { now: new Date(2026, 10, 18), steps: t }), { type: 'day', steps: 332 });
});
