import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logEntry, mealTotals, microTotals, normalize, nutrientsFor, searchFoods, unpack } from './foodDb.js';

const db = unpack(JSON.parse(readFileSync(new URL('../../public/nutrition/foods-v1.json', import.meta.url), 'utf8')));
const byFdc = (id) => db.foods.find((f) => f.fdc === id);

test('the database loads with its source and categories', () => {
  assert.ok(db.foods.length > 6000);
  assert.equal(db.source.release, '2018-04');
  assert.ok(Object.keys(db.categories).length > 15);
  assert.ok(db.foods.every((f) => f.per100.energy_kcal !== null));
});

test('Arabic search for boiled egg finds the hard-boiled egg first, not a fried one', () => {
  const [first] = searchFoods(db, 'بيض مسلوق');
  assert.equal(first.fdc, 173424);
  assert.match(first.name.en, /hard-boiled/i);
});

test('raw and cooked rice stay separate foods', () => {
  const rice = searchFoods(db, 'rice white long-grain', { limit: 200 });
  assert.ok(rice.some((f) => /\braw\b/i.test(f.name.en)));
  assert.ok(rice.some((f) => /\bcooked\b/i.test(f.name.en)));
});

test('oil-drained and water-drained tuna stay separate', () => {
  assert.notEqual(byFdc(173708).per100.fat_g, byFdc(173709).per100.fat_g);
});

test('50 g gives half of the 100 g values', () => {
  const egg = byFdc(173424);
  const half = nutrientsFor(egg, 50);
  assert.equal(half.protein_g, egg.per100.protein_g / 2);
});

test('unknown nutrients stay unknown and totals say how many entries lack them', () => {
  const missing = db.foods.find((f) => f.per100.vitamin_d_ug === null);
  const known = db.foods.find((f) => f.per100.vitamin_d_ug !== null && f.per100.vitamin_d_ug > 0);
  const a = logEntry(missing, 100);
  const b = logEntry(known, 100);
  assert.equal(a.micro.vitamin_d_ug, null);
  const t = microTotals([a, b], ['vitamin_d_ug']);
  assert.equal(t.vitamin_d_ug.missing, 1);
  assert.equal(t.vitamin_d_ug.value, b.micro.vitamin_d_ug);
});

test('no portion with a zero or missing weight is offered', () => {
  assert.ok(db.foods.every((f) => f.portions.every((p) => p.grams > 0)));
});

test('a log entry carries the main numbers the rest of the app sums', () => {
  const e = logEntry(byFdc(173424), 50);
  assert.equal(e.grams, 50);
  assert.equal(e.kcal, Math.round(byFdc(173424).per100.energy_kcal / 2));
  assert.equal(e.source, 'database');
  assert.deepEqual(Object.keys(mealTotals([e, e])).sort(), ['carbs', 'fat', 'fiber', 'grams', 'kcal', 'protein', 'sugar']);
});

test('normalize folds Arabic letter forms', () => {
  assert.equal(normalize('أُرز'), normalize('ارز'));
});
