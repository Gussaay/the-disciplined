// Training maths. A session is
//   { id, date: 'YYYY-MM-DD', startedAt, endedAt, name, exercises: [{ exerciseId, name?, unit, sets: [{ reps, weight, seconds, minutes, km, done }] }], hr: { avg, max } }
import { dayKey, lastDays } from './dates.js';

const n = (v) => Number(v) || 0;

/** Estimated one-rep max (Epley). One rep is the weight itself. */
export function oneRepMax(weight, reps) {
  const w = n(weight);
  const r = n(reps);
  if (!w || !r) return 0;
  return r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
}

export const doneSets = (exercise) => (exercise?.sets || []).filter((s) => s.done);

/** Weight moved in a session (kg x reps over finished sets). */
export function sessionVolume(session) {
  return (session?.exercises || []).reduce(
    (sum, e) => sum + doneSets(e).reduce((s, set) => s + n(set.weight) * n(set.reps), 0),
    0,
  );
}

export function sessionSets(session) {
  return (session?.exercises || []).reduce((sum, e) => sum + doneSets(e).length, 0);
}

export function sessionMinutes(session) {
  if (!session?.startedAt || !session?.endedAt) return 0;
  return Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000));
}

/** The last time this exercise was done: its finished sets and the date. */
export function lastPerformance(sessions, exerciseId, beforeId) {
  const sorted = [...(sessions || [])].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  for (const s of sorted) {
    if (s.id === beforeId) continue;
    const e = (s.exercises || []).find((x) => x.exerciseId === exerciseId);
    if (e && doneSets(e).length) return { date: s.date, sets: doneSets(e) };
  }
  return null;
}

/**
 * Progressive overload: what to aim for today. When every set last time
 * reached `top` reps the weight goes up one step; otherwise the same weight
 * with one more rep on the weakest set.
 */
export function nextTarget(last, { top = 12, step = 2.5 } = {}) {
  if (!last?.sets?.length) return null;
  const weight = Math.max(...last.sets.map((s) => n(s.weight)));
  const atWeight = last.sets.filter((s) => n(s.weight) === weight);
  const minReps = Math.min(...atWeight.map((s) => n(s.reps)));
  if (!weight) return { weight: 0, reps: minReps + 1, raise: false };
  if (minReps >= top) return { weight: weight + step, reps: Math.max(6, top - 4), raise: true };
  return { weight, reps: minReps + 1, raise: false };
}

/** Best estimated 1RM, heaviest weight and most reps per exercise. */
export function personalRecords(sessions) {
  const records = {};
  for (const s of sessions || []) {
    for (const e of s.exercises || []) {
      for (const set of doneSets(e)) {
        const r = (records[e.exerciseId] ||= { best1rm: 0, maxWeight: 0, maxReps: 0, maxSeconds: 0, date: s.date });
        const orm = oneRepMax(set.weight, set.reps);
        if (orm > r.best1rm) {
          r.best1rm = orm;
          r.date = s.date;
        }
        r.maxWeight = Math.max(r.maxWeight, n(set.weight));
        r.maxReps = Math.max(r.maxReps, n(set.reps));
        r.maxSeconds = Math.max(r.maxSeconds, n(set.seconds));
      }
    }
  }
  return records;
}

/** Is this set a new best for its exercise, compared with earlier sessions? */
export function isRecord(records, exerciseId, set) {
  const r = records[exerciseId];
  const orm = oneRepMax(set.weight, set.reps);
  if (!orm) return false;
  return !r || orm > r.best1rm;
}

/** Per-day totals for the last `days` days (charts). */
export function dailyTotals(sessions, days = 7, today = dayKey()) {
  return lastDays(days, today).map((key) => {
    const list = (sessions || []).filter((s) => s.date === key && s.endedAt);
    return {
      key,
      sessions: list.length,
      volume: list.reduce((s, x) => s + sessionVolume(x), 0),
      minutes: list.reduce((s, x) => s + sessionMinutes(x), 0),
      sets: list.reduce((s, x) => s + sessionSets(x), 0),
    };
  });
}

export const trainedOn = (sessions, key) => (sessions || []).some((s) => s.date === key && s.endedAt);

/** Finished sessions in the 7 days ending today. */
export const sessionsThisWeek = (sessions, today = dayKey()) =>
  dailyTotals(sessions, 7, today).reduce((s, d) => s + d.sessions, 0);

/** Calories burned, a rough estimate from time and body weight (MET 5 for weights, 8 for cardio). */
export function estimateBurn(session, weightKg = 70) {
  const minutes = sessionMinutes(session);
  const cardio = (session?.exercises || []).filter((e) => e.unit === 'cardio').length;
  const all = (session?.exercises || []).length || 1;
  const met = 5 + 3 * (cardio / all);
  return Math.round((met * 3.5 * weightKg) / 200 * minutes);
}

/** Share of finished sets per muscle group over the given sessions. */
export function muscleBalance(sessions, exerciseIndex) {
  const out = {};
  for (const s of sessions || []) {
    for (const e of s.exercises || []) {
      const muscle = exerciseIndex[e.exerciseId]?.muscle || e.muscle || 'other';
      out[muscle] = (out[muscle] || 0) + doneSets(e).length;
    }
  }
  return out;
}
