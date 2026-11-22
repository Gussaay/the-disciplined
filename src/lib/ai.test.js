import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentPrompt, parseJson, readCorrection, readEquipment, readFoods, readMealIdeas, readWorkout } from './aiPrompts.js';

test('JSON is found bare, fenced, or inside prose', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Here you go: {"a":[1,2]} hope it helps'), { a: [1, 2] });
  assert.throws(() => parseJson('sorry, no idea'));
});

test('JSON with the slips models make is repaired, and junk fails kindly', () => {
  assert.deepEqual(parseJson('{"tip":"use a \\wide grip"}'), { tip: 'use a wide grip' });
  assert.deepEqual(parseJson("{\"tip\":\"don\\'t stop\"}"), { tip: "don't stop" });
  assert.deepEqual(parseJson('{"a":1,}'), { a: 1 });
  assert.deepEqual(parseJson('{"a":"one\ntwo"}'), { a: 'one\ntwo' });
  assert.throws(() => parseJson('{"a": }'), /not understood/);
  assert.throws(() => parseJson('{broken'), /not understood/);
});

test('food answers are cleaned: numbers from text, alternate field names, junk rows dropped', () => {
  const { items, note } = readFoods({
    items: [
      { name: 'Rice', search: 'rice white cooked', grams: '180 g', calories: '234', protein: '4.9g', carbs: 50, fat: 0.5 },
      { grams: 50 },
      { name: 'Tea', grams: 250, kcal: 'abc' },
    ],
    note: 'assumed white rice',
  });
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { name: 'Rice', search: 'rice white cooked', grams: 180, kcal: 234, protein: 4.9, carbs: 50, fat: 0.5, sugar: 0, fiber: 0 });
  assert.equal(items[1].kcal, 0);
  assert.equal(items[1].search, '');
  assert.equal(note, 'assumed white rice');
  assert.deepEqual(readFoods(null).items, []);
});

test('equipment answers and prompt', () => {
  const p = equipmentPrompt([{ id: 'treadmill', name: { en: 'Treadmill' } }], 'ar');
  assert.match(p.prompt, /treadmill \(Treadmill\)/);
  assert.match(p.prompt, /Arabic/);
  assert.equal(readEquipment({ id: 'treadmill', confidence: 7 }).confidence, 1);
  assert.equal(readEquipment({}).id, 'none');
  assert.equal(readEquipment({ id: 'other', exercises: [{ name: 'Sled push' }, {}] }).exercises.length, 1);
});

test('a programme keeps only exercises the app knows', () => {
  const plan = readWorkout({ name: 'P', days: [{ name: 'A', exercises: ['squat', 'made_up'] }, { name: 'B', exercises: ['nope'] }] }, ['squat']);
  assert.deepEqual(plan.days, [{ name: 'A', exercises: ['squat'] }]);
  assert.throws(() => readWorkout({ days: [] }, ['squat']));
});

test('meal ideas without items are dropped; corrections are bounded', () => {
  const ideas = readMealIdeas({ ideas: [{ title: 'Ful', items: [{ name: 'Ful', grams: 250, kcal: 275 }] }, { title: 'Empty', items: [] }] });
  assert.equal(ideas.length, 1);
  assert.equal(readCorrection({ corrected: 'I went.', score: 14, mistakes: [{ wrong: 'goed', right: 'went' }, {}] }).score, 10);
  assert.equal(readCorrection({ mistakes: [{ wrong: 'goed', right: 'went' }, {}] }).mistakes.length, 1);
});

test('a Groq request uses the vision model for photos and asks for JSON when needed', async () => {
  const { groqBody } = await import('./groq.js');
  const photo = groqBody({ system: 'Count food', prompt: 'What is this?', image: { mimeType: 'image/jpeg', base64: 'AAA' }, json: true });
  assert.match(photo.model, /llama-4-scout/);
  assert.equal(photo.response_format.type, 'json_object');
  assert.match(photo.messages[0].content, /JSON/);
  assert.equal(photo.messages[1].content[1].image_url.url, 'data:image/jpeg;base64,AAA');
  const chat = groqBody({ system: 'Tutor', messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'hello' }] });
  assert.deepEqual(chat.messages.map((m) => m.role), ['system', 'user', 'assistant']);
  assert.equal(chat.response_format, undefined);
});
