import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodKey, historySuggestions, knownNames, lastMeal, recall, remember, rescale, tableMatch } from './foodHistory.js';

const egg = (grams, meal = 'breakfast') => ({ id: Math.random().toString(36), foodId: 'egg', name: { en: 'Egg, boiled', ar: 'بيض مسلوق' }, grams, kcal: Math.round(1.55 * grams), protein: 0.13 * grams, carbs: 0, fat: 0.11 * grams, sugar: 0, fiber: 0, meal });
const ful = (meal = 'breakfast') => ({ id: 'f', name: 'Ful with oil', grams: 200, kcal: 300, protein: 15, carbs: 30, fat: 12, sugar: 1, fiber: 8, meal });

test('suggestions put the foods of this meal first, with the usual grams', () => {
  const log = {
    '2026-11-14': [egg(100), ful()],
    '2026-11-15': [egg(50), { ...ful('dinner'), name: 'Rice' }],
    '2026-11-16': [egg(100)],
  };
  const out = historySuggestions(log, 'breakfast', { today: '2026-11-17' });
  assert.equal(out[0].entry.foodId, 'egg');
  assert.equal(out[0].entry.grams, 100);
  assert.equal(out[0].times, 3);
  assert.equal(nameOf(out[1]), 'Ful with oil');
  assert.equal(nameOf(out.at(-1)), 'Rice');
});

test('today and foods already in the meal are left out', () => {
  const log = { '2026-11-16': [egg(100), ful()], '2026-11-17': [ful()] };
  const out = historySuggestions(log, 'breakfast', { today: '2026-11-17', skip: [egg(50)] });
  assert.deepEqual(out.map(nameOf), ['Ful with oil']);
});

test('rescale moves every nutrient with the grams, micro included', () => {
  const e = { grams: 100, kcal: 155, protein: 13, carbs: 1.1, fat: 11, sugar: null, fiber: 0, micro: { iron_mg: 1.2, vitamin_d_ug: null }, portion: '1 large' };
  const half = rescale(e, 50);
  assert.equal(half.kcal, 78);
  assert.equal(half.protein, 6.5);
  assert.equal(half.sugar, null);
  assert.equal(half.micro.iron_mg, 0.6);
  assert.equal(half.micro.vitamin_d_ug, null);
  assert.equal(half.portion, undefined);
  assert.equal(rescale(e, 0).grams, 100);
});

test('memory links a name to a table food whatever the spelling', () => {
  const food = { id: 'usda:1', name: { en: 'Egg, whole, boiled', ar: 'بيض' } };
  const m = remember({}, 'Boiled  EGG', food, 50);
  assert.equal(recall(m, 'boiled egg').foodId, 'usda:1');
  assert.equal(recall(m, { en: 'Boiled egg' }).grams, 50);
  assert.equal(recall(m, 'toast'), null);
});

test('last meal and known names come from the log', () => {
  const log = { '2026-11-15': [egg(50)], '2026-11-16': [ful('lunch')] };
  assert.equal(lastMeal(log, 'breakfast', '2026-11-17').day, '2026-11-15');
  assert.equal(lastMeal(log, 'snack', '2026-11-17'), null);
  assert.deepEqual(knownNames(log, {}), ['Egg, boiled', 'Ful with oil']);
  assert.equal(foodKey(ful()), 'name:ful with oil');
});

function nameOf(s) {
  const n = s.entry.name;
  return typeof n === 'string' ? n : n.en;
}

test('table match prefers the saved memory, then the search name', async () => {
  const { readFileSync } = await import('node:fs');
  const { unpack, searchFoods } = await import('./foodDb.js');
  const db = unpack(JSON.parse(readFileSync(new URL('../../public/nutrition/foods-v1.json', import.meta.url), 'utf8')));
  const hit = tableMatch(db, { name: 'بيض مسلوق', search: 'egg whole hard-boiled' }, {}, searchFoods);
  assert.match(hit.food.name.en, /egg/i);
  assert.equal(hit.remembered, false);
  const other = db.foods.find((f) => /^Bread, white/i.test(f.name.en));
  const mem = remember({}, 'بيض مسلوق', other, 60);
  assert.equal(tableMatch(db, { name: 'بيض مسلوق', search: 'egg' }, mem, searchFoods).food.id, other.id);
  assert.equal(tableMatch(null, { name: 'x' }, {}, searchFoods), null);
});
