import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayKey, daysBetween, lastDays, streak } from './dates.js';
import { PRAYERS, countdown, daySummary, prayerNow, prayerStreak, prayerTimes, qiblaDirection, weekSummary } from './prayer.js';
import { dueInfo, logContact, socialScore, sortByDue, whatsappLink } from './social.js';
import { dayPlan, dayProgress, dueWords, newWords, reviewWord, studyStreak, wordStats } from './english.js';
import { commitment } from './score.js';
import { claimFor, exportAll, importAll, ownerAction, read, resetStore, resolve, update, write, changedAt } from './store.js';

test('dates: keys, adding days across months, streaks', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(daysBetween('2026-01-01', '2026-03-01'), 59);
  assert.deepEqual(lastDays(3, '2026-03-01'), ['2026-02-27', '2026-02-28', '2026-03-01']);
  const done = new Set(['2026-03-01', '2026-02-28', '2026-02-27']);
  assert.equal(streak((k) => done.has(k), '2026-03-01'), 3);
  // Today not done yet does not break yesterday's streak.
  assert.equal(streak((k) => done.has(k), '2026-03-02'), 3);
  assert.equal(streak((k) => done.has(k), '2026-03-03'), 0);
});

test('prayer times in Makkah are in order and near the known times', () => {
  const t = prayerTimes({ lat: 21.4225, lng: 39.8262, method: 'UmmAlQura' }, new Date(Date.UTC(2026, 2, 20, 9)));
  const ids = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (let i = 1; i < ids.length; i += 1) assert.ok(t[ids[i]] > t[ids[i - 1]], ids[i]);
  // Dhuhr in Makkah at the equinox is about 12:28 local (09:28 UTC).
  const dhuhrUtc = t.dhuhr.getUTCHours() * 60 + t.dhuhr.getUTCMinutes();
  assert.ok(Math.abs(dhuhrUtc - (9 * 60 + 28)) <= 4, `dhuhr ${dhuhrUtc}`);
  // Umm al-Qura: Isha is 90 minutes after Maghrib.
  assert.equal(Math.round((t.isha - t.maghrib) / 60000), 90);
});

test('a manual adjustment shifts that prayer only', () => {
  const s = { lat: 15.5, lng: 32.56, method: 'Egyptian' };
  const d = new Date(Date.UTC(2026, 5, 1, 9));
  const a = prayerTimes(s, d);
  const b = prayerTimes({ ...s, adjust: { fajr: 3 } }, d);
  assert.equal(b.fajr - a.fajr, 180000);
  assert.equal(b.dhuhr - a.dhuhr, 0);
});

test('qibla from Khartoum points north-east, from London south-east', () => {
  const khartoum = qiblaDirection({ lat: 15.5, lng: 32.56 });
  assert.ok(khartoum > 40 && khartoum < 60, String(khartoum));
  const london = qiblaDirection({ lat: 51.5, lng: -0.13 });
  assert.ok(london > 110 && london < 125, String(london));
});

test('current and next prayer', () => {
  const at = (h, m = 0) => new Date(2026, 0, 1, h, m);
  const times = { fajr: at(5), sunrise: at(6, 20), dhuhr: at(12), asr: at(15), maghrib: at(18), isha: at(19, 30) };
  assert.deepEqual(prayerNow(times, at(5, 30)).current, 'fajr');
  assert.equal(prayerNow(times, at(8)).current, null);
  assert.equal(prayerNow(times, at(8)).next.id, 'dhuhr');
  assert.equal(prayerNow(times, at(16)).current, 'asr');
  const late = prayerNow(times, at(22), new Date(2026, 0, 2, 5));
  assert.equal(late.current, 'isha');
  assert.equal(late.next.id, 'fajr');
  assert.equal(countdown(late.msLeft), '7:00');
  assert.equal(countdown(12 * 60000), '12');
});

test('prayer log: counts, score, streak, week', () => {
  const full = Object.fromEntries(PRAYERS.map((p) => [p.id, { s: 'ontime', m: p.id !== 'fajr' }]));
  assert.deepEqual(daySummary(full), { prayed: 5, ontime: 5, mosque: 4, score: 1 });
  const mixed = { fajr: { s: 'missed', m: true }, dhuhr: { s: 'late' }, asr: { s: 'ontime' } };
  assert.deepEqual(daySummary(mixed), { prayed: 2, ontime: 1, mosque: 0, score: 0.3 });
  const log = { '2026-03-01': full, '2026-02-28': full, '2026-02-27': mixed };
  assert.equal(prayerStreak(log, '2026-03-01'), 2);
  const week = weekSummary(log, 7, '2026-03-01');
  assert.equal(week.prayed, 12);
  assert.equal(week.total, 35);
  assert.equal(week.mosque, 8);
});

test('contacts: due states and ordering', () => {
  const today = '2026-03-10';
  const c = (name, every, last) => ({ id: name, name, every, last });
  assert.equal(dueInfo(c('a', 7, '2026-03-01'), today).status, 'overdue');
  assert.equal(dueInfo(c('a', 7, '2026-03-03'), today).status, 'due');
  assert.equal(dueInfo(c('a', 7, '2026-03-04'), today).status, 'soon');
  assert.equal(dueInfo(c('a', 30, '2026-03-04'), today).status, 'ok');
  assert.equal(dueInfo(c('a', 7), today).status, 'never');
  const sorted = sortByDue([c('ok', 30, '2026-03-09'), c('never', 7), c('late', 7, '2026-02-01'), c('late2', 30, '2026-02-01')], today);
  assert.deepEqual(sorted.map((s) => s.contact.id), ['late', 'late2', 'never', 'ok']);
  assert.equal(socialScore([c('ok', 30, '2026-03-09'), c('late', 7, '2026-02-01')], today), 0.5);
  assert.equal(socialScore([], today), 1);
});

test('logging a contact updates the last date and never moves it backwards', () => {
  let c = logContact({ id: 'x', name: 'x', every: 7 }, 'call', '2026-03-10');
  assert.equal(c.last, '2026-03-10');
  c = logContact(c, 'visit', '2026-03-05');
  assert.equal(c.last, '2026-03-10');
  assert.equal(c.history.length, 2);
  assert.equal(c.history[0].type, 'visit');
});

test('whatsapp links keep digits only', () => {
  assert.equal(whatsappLink('+249 91 234 5678'), 'https://wa.me/249912345678');
  assert.equal(whatsappLink('00966-5-1234'), 'https://wa.me/96651234');
  assert.equal(whatsappLink(''), '');
});

test('english plan: three tasks, minutes close to the goal, level wording', () => {
  const monday = new Date(2026, 2, 9);
  const tasks = dayPlan({ level: 'B1', minutes: 30 }, monday);
  assert.deepEqual(tasks.map((t) => t.skill), ['vocab', 'reading', 'grammar']);
  assert.equal(tasks.reduce((s, t) => s + t.minutes, 0), 30);
  assert.match(tasks[1].text.en, /news article/);
  assert.equal(dayPlan({ level: 'A1', minutes: 10 }, monday).length, 2);
  // An unknown level falls back instead of crashing.
  assert.equal(dayPlan({ level: 'Z9' }, monday).length, 3);
});

test('english progress and streak', () => {
  const monday = new Date(2026, 2, 9);
  const log = { '2026-03-09': { done: { vocab: true, reading: true }, minutes: 20 }, '2026-03-08': { done: { vocab: true } } };
  const p = dayProgress({ level: 'B1', minutes: 30 }, log, monday);
  assert.equal(p.done, 2);
  assert.equal(p.total, 3);
  assert.equal(studyStreak(log, '2026-03-09'), 2);
});

test('words: boxes move up when known and back to 1 when not', () => {
  let w = reviewWord({ id: 'a', word: 'a' }, true, '2026-03-01');
  assert.equal(w.box, 1);
  assert.equal(w.due, '2026-03-02');
  w = reviewWord(w, true, '2026-03-02');
  assert.equal(w.due, '2026-03-04');
  w = reviewWord(w, false, '2026-03-04');
  assert.equal(w.box, 1);
  const words = { a: w, b: { id: 'b', box: 5, due: '2026-03-05' }, c: { id: 'c', box: 6, due: '2026-04-01' } };
  assert.deepEqual(dueWords(words, '2026-03-05').map((x) => x.id), ['a', 'b']);
  assert.deepEqual(newWords([{ id: 'a' }, { id: 'z' }], words).map((x) => x.id), ['z']);
  assert.deepEqual(wordStats(words), { total: 3, learning: 1, known: 2, mastered: 1 });
});

test('commitment brings the five goals together', () => {
  const today = '2026-03-09';
  const empty = commitment({}, today);
  assert.equal(empty.gym, 0);
  assert.equal(empty.food, 0);
  assert.equal(empty.prayer, 0);
  assert.equal(empty.social, 1);
  const full = commitment({
    gymSessions: [{ id: 's', date: today, startedAt: 1, endedAt: 2, exercises: [] }],
    prayerLog: { [today]: Object.fromEntries(PRAYERS.map((p) => [p.id, { s: 'ontime' }])) },
    english: { level: 'B1', minutes: 30, log: { [today]: { done: { vocab: true, reading: true, grammar: true } } } },
    settings: { modules: { food: false } },
  }, today);
  assert.equal(full.overall, 1);
  assert.ok(!full.active.includes('food'));
});

test('store: write, update, backup and restore', () => {
  resetStore();
  write('contacts', [{ id: 1 }]);
  update('contacts', (list) => [...list, { id: 2 }], []);
  assert.equal(read('contacts').length, 2);
  assert.ok(changedAt('contacts') > 0);
  const backup = exportAll();
  resetStore();
  assert.equal(read('contacts'), undefined);
  assert.equal(importAll(JSON.parse(JSON.stringify(backup))), 1);
  assert.equal(read('contacts').length, 2);
  assert.throws(() => importAll({ app: 'other' }));
});

test('sync: the newer side wins, an empty side never overwrites', () => {
  assert.equal(resolve(100, true, { t: 200 }), 'pull');
  assert.equal(resolve(300, true, { t: 200 }), 'push');
  assert.equal(resolve(300, true, null), 'push');
  assert.equal(resolve(0, false, null), 'same');
  assert.equal(resolve(200, true, { t: 200 }), 'same');
});

test('a second account on the same device does not inherit the first one\'s data', () => {
  resetStore();
  assert.equal(ownerAction(null, 'a'), 'adopt');
  assert.equal(ownerAction('a', 'a'), 'same');
  assert.equal(ownerAction('a', 'b'), 'reset');
  write('contacts', [{ id: 1 }]);
  write('settings', { lang: 'ar' });
  assert.equal(claimFor('a'), 'adopt');
  assert.equal(read('contacts').length, 1);
  assert.equal(claimFor('a'), 'same');
  assert.equal(read('contacts').length, 1);
  assert.equal(claimFor('b'), 'reset');
  assert.equal(read('contacts'), undefined);
  assert.equal(changedAt('contacts'), 0);
  // What never syncs (language, theme) stays with the device.
  assert.deepEqual(read('settings'), { lang: 'ar' });
});
