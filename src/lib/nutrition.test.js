import test from 'node:test';
import assert from 'node:assert/strict';
import { bmi, dailyTargets, dayScore, portion, remaining, suggest, totals } from './nutrition.js';

const man = { sex: 'male', weight: 80, height: 180, age: 30, activity: 'moderate', goal: 'maintain' };

test('targets follow Mifflin-St Jeor and the goal', () => {
  const t = dailyTargets(man);
  assert.equal(t.bmr, 1780);
  assert.equal(t.kcal, 2760);
  assert.equal(t.protein, 128);
  assert.ok(dailyTargets({ ...man, goal: 'lose' }).kcal < t.kcal);
  assert.ok(dailyTargets({ ...man, goal: 'gain' }).kcal > t.kcal);
  // The macros add up to the calories (within rounding).
  assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) < 15);
});

test('own targets override the calculated ones', () => {
  assert.equal(dailyTargets({ ...man, targets: { kcal: 2000 } }).kcal, 2000);
});

test('a woman needs fewer calories than a man of the same size, never under 1200', () => {
  assert.ok(dailyTargets({ ...man, sex: 'female' }).kcal < dailyTargets(man).kcal);
  assert.equal(dailyTargets({ sex: 'female', weight: 40, height: 150, age: 70, activity: 'sedentary', goal: 'lose' }).kcal, 1200);
});

test('portion scales per-100 g values', () => {
  const p = portion({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, 150);
  assert.equal(p.kcal, 248);
  assert.equal(p.protein, 46.5);
});

test('totals and what is left', () => {
  const eaten = totals([{ kcal: 500, protein: 30.25 }, { kcal: 300, protein: 10 }]);
  assert.equal(eaten.kcal, 800);
  assert.equal(eaten.protein, 40.3);
  assert.equal(remaining({ kcal: 2000, protein: 100 }, eaten).kcal, 1200);
});

test('day score: on target is 1, nothing logged is 0, far off is low', () => {
  const t = { kcal: 2000, protein: 120, sugar: 50 };
  assert.equal(dayScore(t, { kcal: 2000, protein: 120, sugar: 20 }), 1);
  assert.equal(dayScore(t, { kcal: 0, protein: 0 }), 0);
  assert.ok(dayScore(t, { kcal: 3200, protein: 60, sugar: 120 }) < 0.3);
});

test('suggestions fit the calories left and favour protein', () => {
  const foods = [
    { id: 'chicken', kcal: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, fiber: 0, serving: 120, category: 'protein' },
    { id: 'cake', kcal: 400, protein: 4, carbs: 60, fat: 16, sugar: 40, fiber: 1, serving: 100, category: 'sweets' },
    { id: 'feast', kcal: 300, protein: 20, carbs: 20, fat: 10, sugar: 0, fiber: 0, serving: 500, category: 'dishes' },
  ];
  const out = suggest(foods, { kcal: 600, protein: 60, sugar: 20 });
  assert.equal(out[0].food.id, 'chicken');
  assert.ok(!out.some((s) => s.food.id === 'feast'));
});

test('bmi bands', () => {
  assert.deepEqual(bmi(80, 180), { value: 24.7, band: 'normal' });
  assert.equal(bmi(100, 170).band, 'obese');
  assert.equal(bmi(0, 170), null);
});

test('totals say which numbers are only a floor because a food did not report them', async () => {
  const { totals } = await import('./nutrition.js');
  const t = totals([{ grams: 100, kcal: 100, sugar: 0, unknown: ['sugar'] }, { grams: 50, kcal: 50, sugar: 3 }]);
  assert.deepEqual(t.unknown, ['sugar']);
  assert.equal(t.sugar, 3);
  assert.equal(totals([{ grams: 50, kcal: 50, sugar: 3 }]).unknown, undefined);
});
