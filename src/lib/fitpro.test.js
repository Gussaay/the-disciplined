import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ack, craft, createAssembler, fitproChars, initSequence, needsAck, parsePacket, timePayload, userPayload } from './fitpro.js';
import { fromHex, hex } from './scaleParse.js';

test('commands are framed like the FitPro app frames them', () => {
  assert.equal(hex(craft(0x12, 0x0b, [0x01])), 'cd 00 06 12 01 0b 00 01 01'); // find watch
  assert.equal(hex(craft(0x1a, 0x0a)), 'cd 00 05 1a 01 0a 00 00');
  assert.equal(hex(craft(0x15, 0x06, [1])), 'cd 00 06 15 01 06 00 01 01'); // real-time steps
  assert.equal(initSequence({}).length, 10);
  assert.deepEqual(fitproChars('6e400001-b5a3-f393-e0a9-e50e24dcca9d'), {
    tx: '6e400002-b5a3-f393-e0a9-e50e24dcca9d',
    rx: '6e400003-b5a3-f393-e0a9-e50e24dcca9d',
  });
});

test('clock and user data are packed into 32 bits', () => {
  const t = timePayload(new Date(2026, 10, 17, 13, 5, 9));
  const v = ((t[0] << 24) | (t[1] << 16) | (t[2] << 8) | t[3]) >>> 0;
  assert.equal(v & 63, 9);
  assert.equal((v >> 6) & 63, 5);
  assert.equal((v >> 12) & 31, 13);
  assert.equal((v >> 17) & 31, 17);
  assert.equal((v >> 22) & 15, 11);
  assert.equal(v >>> 26, 26);
  const u = userPayload({ sex: 'male', age: 35, height: 174, weight: 57.2 });
  const w = ((u[0] << 24) | (u[1] << 16) | (u[2] << 8) | u[3]) >>> 0;
  assert.equal(w >>> 31, 1);
  assert.equal((w >> 24) & 127, 35);
  assert.equal((w >> 15) & 511, 174);
  assert.equal((w >> 5) & 1023, 57);
});

test('heart rate packets from the watch (examples recorded by Gadgetbridge)', () => {
  const p = fromHex('cd 00 11 15 01 0e 00 0c 2b 04 00 01 00 01 43 94 62 5c 48 53');
  const r = parsePacket(p);
  assert.equal(r.type, 'heart');
  assert.equal(r.bpm, 83);
  assert.equal(r.systolic, 92);
  assert.equal(r.diastolic, 72);
  assert.equal(needsAck(p), true);
  assert.equal(hex(ack(p)), 'dc 00 05 15 01 00 14 01');
});

test('day totals and chunked notifications', () => {
  const day = craft(0x15, 0x0c, [0, 0, 0, 0, 0x1a, 0x2b, 0, 0, 0x0f, 0xa0, 0x01, 0x2c]);
  const a = createAssembler();
  assert.deepEqual(a.push(day.slice(0, 9)), []);
  const [whole] = a.push(day.slice(9));
  const r = parsePacket(whole);
  assert.deepEqual(r, { type: 'day', steps: 6699, distance: 4000, kcal: 300 });
  assert.equal(a.push(fromHex('cd 00 06 12 01 0b 00 01 01')).length, 1);
  assert.equal(parsePacket(fromHex('cd 00 05 1c 01 01 00 00')).type, 'findPhone');
});
