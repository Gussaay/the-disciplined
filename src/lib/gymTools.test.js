import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addKeyword, groupTools, looseEntries, removeKeyword, toolDoneSets, toolMatches, toolStatus } from './gymTools.js';

const TOOLS = [
  { id: 'press', name: { en: 'Chest press', ar: 'جهاز ضغط الصدر' }, exercises: [{ id: 'press_flat', muscle: 'chest' }, { id: 'press_inc', muscle: 'chest' }] },
  { id: 'bike', name: { en: 'Bike', ar: 'دراجة' }, exercises: [{ id: 'bike_ride', muscle: 'cardio' }] },
  { id: 'row', name: { en: 'Rowing machine', ar: 'جهاز التجديف' }, exercises: [{ id: 'row_seated', muscle: 'back' }] },
];
const BY_ID = {
  press_flat: { name: { en: 'Flat press', ar: 'ضغط مستوٍ' } },
  press_inc: { name: { en: 'Incline press', ar: 'ضغط مائل' } },
  bike_ride: { name: { en: 'Ride', ar: 'ركوب' } },
  row_seated: { name: { en: 'Seated row', ar: 'سحب جالس' } },
};
const MUSCLES = { chest: { en: 'Chest', ar: 'الصدر' }, back: { en: 'Back', ar: 'الظهر' }, cardio: { en: 'Cardio', ar: 'لياقة' } };

const sessionWith = (exercises) => ({ id: 's1', exercises });

test('groups tools by their first exercise muscle, in the given order', () => {
  const groups = groupTools(TOOLS, ['chest', 'back', 'cardio']);
  assert.deepEqual(groups.map((g) => g.muscle), ['chest', 'back', 'cardio']);
  assert.equal(groups[0].tools[0].id, 'press');
});

test('status: untouched tool is todo, even with pre-filled weights', () => {
  const s = sessionWith([{ exerciseId: 'press_flat', sets: [{ weight: 40, reps: '', done: false }] }]);
  assert.equal(toolStatus(s, TOOLS[0], []), 'todo');
  assert.equal(toolStatus(s, TOOLS[1], []), 'todo');
});

test('status: a ticked or filled set makes it doing; the done list wins', () => {
  const ticked = sessionWith([{ exerciseId: 'press_flat', sets: [{ weight: 40, reps: 10, done: true }] }]);
  assert.equal(toolStatus(ticked, TOOLS[0], []), 'doing');
  assert.equal(toolStatus(ticked, TOOLS[0], ['press']), 'done');
  const filled = sessionWith([{ exerciseId: 'bike_ride', sets: [{ minutes: 20, done: false }] }]);
  assert.equal(toolStatus(filled, TOOLS[1], []), 'doing');
});

test('done sets are counted across the tool exercises', () => {
  const s = sessionWith([
    { exerciseId: 'press_flat', sets: [{ done: true }, { done: true }, { done: false }] },
    { exerciseId: 'press_inc', sets: [{ done: true }] },
    { exerciseId: 'bike_ride', sets: [{ done: true }] },
  ]);
  assert.equal(toolDoneSets(s, TOOLS[0]), 3);
});

test('loose entries are the ones no tool owns, with their indexes', () => {
  const s = sessionWith([
    { exerciseId: 'press_flat', sets: [] },
    { exerciseId: 'custom:plank', sets: [] },
  ]);
  const loose = looseEntries(s, TOOLS);
  assert.equal(loose.length, 1);
  assert.equal(loose[0].index, 1);
});

test('search matches English, Arabic, exercise names and user keywords', () => {
  assert.equal(toolMatches(TOOLS[0], BY_ID, {}, 'chest', MUSCLES), true);
  assert.equal(toolMatches(TOOLS[0], BY_ID, {}, 'ضغط', MUSCLES), true);
  assert.equal(toolMatches(TOOLS[0], BY_ID, {}, 'incline', MUSCLES), true);
  assert.equal(toolMatches(TOOLS[0], BY_ID, {}, 'squat', MUSCLES), false);
  assert.equal(toolMatches(TOOLS[2], BY_ID, { row: ['boat machine'] }, 'boat', MUSCLES), true);
  assert.equal(toolMatches(TOOLS[2], BY_ID, {}, '', MUSCLES), true);
});

test('keywords are added trimmed and de-duplicated, and removed cleanly', () => {
  let map = addKeyword({}, 'row', '  boat machine ');
  assert.deepEqual(map.row, ['boat machine']);
  map = addKeyword(map, 'row', 'Boat Machine');
  assert.deepEqual(map.row, ['boat machine']);
  map = addKeyword(map, 'row', 'السفينة');
  assert.deepEqual(map.row, ['boat machine', 'السفينة']);
  map = removeKeyword(map, 'row', 'boat machine');
  assert.deepEqual(map.row, ['السفينة']);
  assert.deepEqual(addKeyword(map, 'row', '   '), map);
});
