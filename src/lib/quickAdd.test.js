import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFood, applyGym, applyPrayer, applyTasks, defaultMeal, quickAddPrompt, readQuickAdd } from './quickAdd.js';

const EXERCISES = {
  bench_press: { id: 'bench_press', name: { en: 'Bench press', ar: 'ضغط صدر' }, muscle: 'chest', unit: 'kg' },
  treadmill_run: { id: 'treadmill_run', name: { en: 'Run', ar: 'جري' }, muscle: 'cardio', unit: 'cardio' },
};
const FOODS = [
  { id: 'rice', name: { en: 'Rice', ar: 'أرز' }, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, sugar: 0, fiber: 0.4, serving: 180 },
  { id: 'egg', name: { en: 'Egg', ar: 'بيض' }, kcal: 155, protein: 13, carbs: 1.1, fat: 11, sugar: 1.1, fiber: 0, serving: 50 },
];
const CTX = { exercises: EXERCISES, foods: FOODS };

test('the prompt carries the catalogues and today', () => {
  const { prompt } = quickAddPrompt('did bench', { today: '2026-11-28', lang: 'en', ...CTX });
  assert.match(prompt, /bench_press = Bench press/);
  assert.match(prompt, /rice = Rice/);
  assert.match(prompt, /2026-11-28/);
});

test('reads a mixed answer into sorted proposals', () => {
  const out = readQuickAdd(
    {
      items: [
        { type: 'gym', exercise: 'bench_press', sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }] },
        { type: 'food', food: 'rice', grams: 200, meal: 'lunch' },
        { type: 'prayer', prayer: 'fajr', status: 'ontime', mosque: true },
        { type: 'task', title: 'Call the bank', due: '2026-11-29', time: '10:00' },
      ],
    },
    CTX,
  );
  assert.equal(out.length, 4);
  assert.equal(out[0].kind, 'gym');
  assert.equal(out[0].custom, false);
  assert.equal(out[0].sets.length, 2);
  assert.equal(out[0].sets[0].done, true);
  assert.equal(out[1].food.id, 'rice');
  assert.equal(out[2].status, 'ontime');
  assert.equal(out[3].due, '2026-11-29');
});

test('unknown exercises and foods stay custom, with the person\'s words', () => {
  const out = readQuickAdd(
    {
      items: [
        { type: 'gym', exercise: 'Cable fly machine', sets: [{ weight: 15, reps: 12 }] },
        { type: 'food', food: 'Koshari', grams: 300, kcal: 450 },
      ],
    },
    CTX,
  );
  assert.equal(out[0].custom, true);
  assert.equal(out[0].name, 'Cable fly machine');
  assert.equal(out[1].custom, true);
  assert.equal(out[1].kcal, 450);
});

test('cardio gym items use minutes; empty and invalid items drop out', () => {
  const out = readQuickAdd(
    {
      items: [
        { type: 'gym', exercise: 'treadmill_run', minutes: 20, km: 3 },
        { type: 'gym', exercise: 'bench_press', sets: [] },
        { type: 'prayer', prayer: 'sunrise', status: 'ontime' },
        { type: 'task', title: '  ' },
        { type: 'food', food: 'egg', grams: 0 },
      ],
    },
    CTX,
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].unit, 'cardio');
  assert.equal(out[0].sets[0].minutes, 20);
  assert.equal(out[1].grams, 50); // fell back to the food's serving
});

test('prayer status is validated and mosque never rides on a missed prayer', () => {
  const out = readQuickAdd({ items: [{ type: 'prayer', prayer: 'asr', status: 'missed', mosque: true }] }, CTX);
  assert.equal(out[0].mosque, false);
});

test('default meal follows the clock', () => {
  assert.equal(defaultMeal(8), 'breakfast');
  assert.equal(defaultMeal(13), 'lunch');
  assert.equal(defaultMeal(19), 'dinner');
  assert.equal(defaultMeal(23), 'snack');
});

test('gym proposals become a finished session when no workout is open', () => {
  const proposals = readQuickAdd({ items: [{ type: 'gym', exercise: 'bench_press', sets: [{ weight: 60, reps: 10 }] }] }, CTX);
  const { sessions, added } = applyGym(proposals, { active: null, sessions: [], today: '2026-11-28', now: 1000 });
  assert.equal(added, 1);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].date, '2026-11-28');
  assert.equal(sessions[0].exercises[0].sets[0].done, true);
});

test('gym proposals merge into the workout in progress', () => {
  const proposals = readQuickAdd({ items: [{ type: 'gym', exercise: 'bench_press', sets: [{ weight: 65, reps: 6 }] }] }, CTX);
  const active = { id: 'a', exercises: [{ exerciseId: 'bench_press', unit: 'kg', sets: [{ weight: 60, reps: 10, done: true }] }] };
  const { active: next } = applyGym(proposals, { active, sessions: [], today: '2026-11-28', now: 1000 });
  assert.equal(next.exercises.length, 1);
  assert.equal(next.exercises[0].sets.length, 2);
});

test('food proposals land in today\'s log with computed nutrition', () => {
  const proposals = readQuickAdd({ items: [{ type: 'food', food: 'rice', grams: 200, meal: 'lunch' }] }, CTX);
  const { log, added } = applyFood(proposals, { log: {}, today: '2026-11-28', hour: 13 });
  assert.equal(added, 1);
  assert.equal(log['2026-11-28'][0].kcal, 260);
  assert.equal(log['2026-11-28'][0].meal, 'lunch');
});

test('prayer and task proposals write their logs with the app defaults', () => {
  const proposals = readQuickAdd(
    { items: [{ type: 'prayer', prayer: 'maghrib', status: 'late' }, { type: 'task', title: 'Buy milk' }] },
    CTX,
  );
  const p = applyPrayer(proposals, { log: {}, today: '2026-11-28' });
  assert.deepEqual(p.log['2026-11-28'].maghrib, { s: 'late', m: false });
  const t = applyTasks(proposals, { tasks: [], today: '2026-11-28', now: 5 });
  assert.equal(t.tasks[0].due, '2026-11-28');
  assert.equal(t.tasks[0].source, 'quick');
  assert.equal(t.tasks[0].done, false);
});
