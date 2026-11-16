// Numbers for the dashboard: every goal over a period (the last N days),
// worked out from the same saved data the screens use.
import { lastDays } from './dates.js';
import { commitment } from './score.js';
import { dailyTotals, personalRecords } from './gym.js';
import { dailyTargets, totals } from './nutrition.js';
import { PRAYERS, daySummary } from './prayer.js';
import { dueInfo } from './social.js';
import { wordStats } from './english.js';

const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);
const r1 = (v) => Math.round(v * 10) / 10;

export function dashboard(data, days = 7, today) {
  const keys = lastDays(days, today);
  const inPeriod = new Set(keys);
  const profile = data.profile || {};

  // Overall commitment per day and per goal.
  const daily = keys.map((key) => ({ key, ...commitment(data, key) }));
  const active = daily[0]?.active || [];
  const overall = {
    average: avg(daily.map((d) => d.overall)),
    goodDays: daily.filter((d) => d.overall >= 0.6).length,
    best: daily.reduce((b, d) => (d.overall > (b?.overall ?? -1) ? d : b), null),
    byGoal: Object.fromEntries(active.map((g) => [g, avg(daily.map((d) => d[g]))])),
  };

  // Training.
  const gymDays = dailyTotals(data.gymSessions, days, today);
  const sessions = (data.gymSessions || []).filter((s) => s.endedAt && inPeriod.has(s.date));
  const before = (data.gymSessions || []).filter((s) => s.endedAt && s.date < keys[0]);
  const recordsNow = personalRecords([...before, ...sessions]);
  const recordsBefore = personalRecords(before);
  const newRecords = Object.entries(recordsNow).filter(([id, r]) => !recordsBefore[id] || r.best1rm > recordsBefore[id].best1rm).length;
  const gym = {
    sessions: sessions.length,
    minutes: gymDays.reduce((s, d) => s + d.minutes, 0),
    volume: Math.round(gymDays.reduce((s, d) => s + d.volume, 0)),
    sets: gymDays.reduce((s, d) => s + d.sets, 0),
    goal: (Number(profile.gymDays) || 3) * (days / 7),
    newRecords,
    series: gymDays.map((d) => ({ key: d.key, value: d.minutes })),
  };

  // Food.
  const targets = dailyTargets(profile);
  const foodDays = keys.map((key) => {
    const entries = data.foodLog?.[key] || [];
    return { key, logged: entries.length > 0, ...totals(entries), water: Number(data.water?.[key]) || 0 };
  });
  const logged = foodDays.filter((d) => d.logged);
  const kcalAvg = avg(logged.map((d) => d.kcal));
  const macroKcal = {
    protein: avg(logged.map((d) => d.protein)) * 4,
    carbs: avg(logged.map((d) => d.carbs)) * 4,
    fat: avg(logged.map((d) => d.fat)) * 9,
  };
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat || 1;
  const food = {
    daysLogged: logged.length,
    kcalAvg: Math.round(kcalAvg),
    target: targets.kcal,
    proteinAvg: r1(avg(logged.map((d) => d.protein))),
    proteinTarget: targets.protein,
    sugarAvg: r1(avg(logged.map((d) => d.sugar))),
    fiberAvg: r1(avg(logged.map((d) => d.fiber))),
    waterAvg: Math.round(avg(foodDays.map((d) => d.water))),
    waterTarget: targets.water,
    onTarget: logged.filter((d) => Math.abs(d.kcal - targets.kcal) <= targets.kcal * 0.1).length,
    split: {
      protein: macroKcal.protein / macroSum,
      carbs: macroKcal.carbs / macroSum,
      fat: macroKcal.fat / macroSum,
    },
    series: foodDays.map((d) => ({ key: d.key, value: d.kcal })),
  };

  // Prayer.
  const prayerDays = keys.map((key) => ({ key, ...daySummary(data.prayerLog?.[key]) }));
  const total = days * PRAYERS.length;
  const byPrayer = Object.fromEntries(PRAYERS.map(({ id }) => {
    const rows = keys.map((key) => data.prayerLog?.[key]?.[id]).filter(Boolean);
    return [id, {
      ontime: rows.filter((e) => e.s === 'ontime').length,
      prayed: rows.filter((e) => e.s === 'ontime' || e.s === 'late').length,
      mosque: rows.filter((e) => e.m && e.s !== 'missed').length,
    }];
  }));
  const prayer = {
    prayed: prayerDays.reduce((s, d) => s + d.prayed, 0),
    ontime: prayerDays.reduce((s, d) => s + d.ontime, 0),
    mosque: prayerDays.reduce((s, d) => s + d.mosque, 0),
    total,
    fullDays: prayerDays.filter((d) => d.prayed === PRAYERS.length).length,
    byPrayer,
    series: prayerDays.map((d) => ({ key: d.key, value: d.prayed })),
  };

  // Keeping in touch.
  const contacts = data.contacts || [];
  const touches = contacts.flatMap((c) => (c.history || []).filter((h) => inPeriod.has(h.date)).map((h) => ({ ...h, id: c.id })));
  const byType = touches.reduce((acc, h) => ({ ...acc, [h.type]: (acc[h.type] || 0) + 1 }), {});
  const social = {
    contacts: contacts.length,
    reached: new Set(touches.map((t) => t.id)).size,
    touches: touches.length,
    byType,
    overdue: contacts.filter((c) => ['overdue', 'never'].includes(dueInfo(c, today).status)).length,
    series: keys.map((key) => ({ key, value: touches.filter((t) => t.date === key).length })),
  };

  // English.
  const log = data.english?.log || {};
  const englishDays = keys.map((key) => ({ key, minutes: Number(log[key]?.minutes) || 0, studied: Object.values(log[key]?.done || {}).some(Boolean) }));
  const english = {
    minutes: englishDays.reduce((s, d) => s + d.minutes, 0),
    daysStudied: englishDays.filter((d) => d.studied).length,
    words: wordStats(data.words),
    series: englishDays.map((d) => ({ key: d.key, value: d.minutes })),
  };

  return { keys, daily, overall, gym, food, prayer, social, english };
}
