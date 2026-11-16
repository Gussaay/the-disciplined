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

// --- the workout in progress ---
import { addSet, finishSession, makeExercise, newSession, setComplete } from './gymSession.js';
import { hrStats, parseHeartRate, summarise } from './hrParse.js';

test('a new exercise starts from last time, or three empty sets', () => {
  const sessions = [session('a', '2026-01-01', 1, [set(50, 10), set(55, 8)])];
  const again = makeExercise({ id: 'bench_press', muscle: 'chest' }, sessions);
  assert.deepEqual(again.sets.map((s) => s.weight), [50, 55]);
  assert.ok(again.sets.every((s) => s.reps === '' && !s.done));
  assert.equal(makeExercise({ id: 'squat' }, sessions).sets.length, 3);
  assert.equal(makeExercise({ id: 'treadmill_run', unit: 'cardio' }, sessions).sets.length, 1);
});

test('adding a set repeats the previous one', () => {
  const e = addSet({ unit: 'kg', sets: [{ weight: 40, reps: 10, done: true }] });
  assert.deepEqual(e.sets[1], { weight: 40, reps: 10, done: false });
});

test('finishing keeps only completed sets and non-empty exercises', () => {
  const s = newSession('Day', [{ id: 'squat' }, { id: 'plank', unit: 'time' }], []);
  s.exercises[0].sets[0] = { weight: 60, reps: 5, done: true };
  s.exercises[0].sets[1] = { weight: 60, reps: '', done: true };
  const done = finishSession(s, { n: 3, avg: 120, max: 150 }, s.startedAt + 1000);
  assert.equal(done.exercises.length, 1);
  assert.equal(done.exercises[0].sets.length, 1);
  assert.deepEqual(done.hr, { avg: 120, max: 150 });
  assert.equal(setComplete({ seconds: 30 }, 'time'), true);
  assert.equal(setComplete({ minutes: 0 }, 'cardio'), false);
});

test('heart rate packets: one-byte and two-byte values', () => {
  assert.equal(parseHeartRate(new DataView(new Uint8Array([0x00, 72]).buffer)), 72);
  assert.equal(parseHeartRate(new DataView(new Uint8Array([0x01, 0x2c, 0x01]).buffer)), 300);
  assert.equal(parseHeartRate(new DataView(new Uint8Array([0x00]).buffer)), 0);
  let stats = hrStats(null, 100);
  stats = hrStats(stats, 140);
  stats = hrStats(stats, 0);
  assert.deepEqual(stats, { n: 2, avg: 120, max: 140 });
});

test('health readings are totalled; the newest weight wins', () => {
  const s = summarise({
    steps: [{ value: 4000 }, { value: 2500 }],
    distance: [{ value: 3210 }],
    heartRate: [{ value: 60 }, { value: 100 }],
    weight: [{ value: 80.04, startDate: '2026-01-01' }, { value: 79.26, startDate: '2026-02-01' }],
  });
  assert.deepEqual(s, { steps: 6500, calories: 0, km: 3.21, hrAvg: 80, hrMax: 100, weight: 79.3 });
});
