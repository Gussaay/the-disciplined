import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyTotals, isRecord, lastPerformance, nextTarget, oneRepMax, personalRecords, sessionVolume, estimateBurn } from './gym.js';

const set = (weight, reps, done = true) => ({ weight, reps, done });
const session = (id, date, startedAt, sets) => ({
  id, date, startedAt, endedAt: startedAt + 45 * 60000,
  exercises: [{ exerciseId: 'bench_press', sets }],
});

test('one-rep max: Epley, and one rep is the weight itself', () => {
  assert.equal(oneRepMax(100, 1), 100);
  assert.equal(oneRepMax(100, 10), 133.3);
  assert.equal(oneRepMax(0, 10), 0);
});

test('volume counts finished sets only', () => {
  assert.equal(sessionVolume(session('a', '2026-01-01', 1, [set(50, 10), set(50, 8), set(60, 5, false)])), 900);
});

test('last performance skips the session being edited', () => {
  const sessions = [
    session('old', '2026-01-01', 1000, [set(50, 10)]),
    session('new', '2026-01-03', 3000, [set(55, 8)]),
  ];
  assert.equal(lastPerformance(sessions, 'bench_press').date, '2026-01-03');
  assert.equal(lastPerformance(sessions, 'bench_press', 'new').date, '2026-01-01');
  assert.equal(lastPerformance(sessions, 'squat'), null);
});

test('next target raises the weight only when every set reached the top', () => {
  assert.deepEqual(nextTarget({ sets: [set(50, 12), set(50, 12)] }), { weight: 52.5, reps: 8, raise: true });
  assert.deepEqual(nextTarget({ sets: [set(50, 12), set(50, 9)] }), { weight: 50, reps: 10, raise: false });
  assert.equal(nextTarget(null), null);
});

test('records and new-record detection', () => {
  const records = personalRecords([session('a', '2026-01-01', 1, [set(50, 10), set(60, 5)])]);
  assert.equal(records.bench_press.maxWeight, 60);
  assert.equal(records.bench_press.best1rm, 70);
  assert.equal(isRecord(records, 'bench_press', set(60, 6)), true);
  assert.equal(isRecord(records, 'bench_press', set(50, 5)), false);
  assert.equal(isRecord(records, 'squat', set(40, 5)), true);
});

test('daily totals cover the asked days, oldest first', () => {
  const days = dailyTotals([session('a', '2026-01-06', 1, [set(50, 10)])], 7, '2026-01-07');
  assert.equal(days.length, 7);
  assert.equal(days[5].volume, 500);
  assert.equal(days[6].sessions, 0);
});

test('burn estimate grows with time and body weight', () => {
  const s = session('a', '2026-01-06', 1, [set(50, 10)]);
  assert.ok(estimateBurn(s, 90) > estimateBurn(s, 60));
  assert.ok(estimateBurn(s, 70) > 150 && estimateBurn(s, 70) < 400);
});
