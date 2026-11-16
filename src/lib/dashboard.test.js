import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboard } from './dashboard.js';

const today = '2026-11-16';

test('an empty account gives zeros, not errors', () => {
  const d = dashboard({}, 7, today);
  assert.equal(d.keys.length, 7);
  assert.equal(d.gym.sessions, 0);
  assert.equal(d.food.daysLogged, 0);
  assert.equal(d.prayer.total, 35);
  assert.equal(d.social.contacts, 0);
});

test('the period counts what happened inside it only', () => {
  const data = {
    profile: { weight: 80, height: 180, age: 35 },
    gymSessions: [
      { id: 'a', date: '2026-11-15', endedAt: 1, startedAt: 0, exercises: [] },
      { id: 'b', date: '2026-10-01', endedAt: 1, startedAt: 0, exercises: [] },
    ],
    foodLog: { '2026-11-16': [{ kcal: 500, protein: 40, carbs: 50, fat: 10, sugar: 5, fiber: 6 }] },
    prayerLog: { '2026-11-16': { fajr: { s: 'ontime', m: true }, dhuhr: { s: 'late' }, asr: { s: 'missed' } } },
    contacts: [{ id: 'c', every: 7, last: '2026-11-14', history: [{ date: '2026-11-14', type: 'call' }, { date: '2026-09-01', type: 'visit' }] }],
    english: { level: 'A2', minutes: 20, log: { '2026-11-16': { done: { vocab: true }, minutes: 5 } } },
  };
  const d = dashboard(data, 7, today);
  assert.equal(d.gym.sessions, 1);
  assert.equal(d.food.daysLogged, 1);
  assert.equal(d.food.kcalAvg, 500);
  assert.equal(d.prayer.prayed, 2);
  assert.equal(d.prayer.ontime, 1);
  assert.equal(d.prayer.mosque, 1);
  assert.equal(d.prayer.byPrayer.fajr.ontime, 1);
  assert.equal(d.social.touches, 1);
  assert.deepEqual(d.social.byType, { call: 1 });
  assert.equal(d.english.minutes, 5);
  assert.equal(d.english.daysStudied, 1);
  assert.ok(Math.abs(d.food.split.protein + d.food.split.carbs + d.food.split.fat - 1) < 1e-9);
});
