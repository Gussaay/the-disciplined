// Building and editing the workout in progress (saved under `gymActive`, on
// this device only, so closing the app in the middle loses nothing).
import { dayKey, uid } from './dates.js';
import { lastPerformance } from './gym.js';

const blank = (unit) =>
  unit === 'cardio' ? { minutes: '', km: '', done: false }
    : unit === 'time' ? { seconds: '', done: false }
      : { weight: '', reps: '', done: false };

/**
 * An exercise ready to log. Sets start from what was done last time (same
 * number of sets, same weights) so the person only confirms or improves.
 */
export function makeExercise(exercise, sessions) {
  const unit = exercise.unit || 'kg';
  const last = lastPerformance(sessions, exercise.id);
  const sets = last
    ? last.sets.map((s) => ({ ...blank(unit), ...(unit === 'cardio' || unit === 'time' ? {} : { weight: s.weight ?? '' }) }))
    : Array.from({ length: unit === 'cardio' ? 1 : 3 }, () => blank(unit));
  return {
    exerciseId: exercise.id,
    unit,
    muscle: exercise.muscle,
    // Exercises that are not in the catalogue (described by the AI) carry their own texts.
    ...(exercise.custom ? { name: exercise.name, how: exercise.how } : {}),
    sets,
  };
}

export function newSession(name, exercises, sessions) {
  const now = Date.now();
  return { id: uid(), date: dayKey(new Date(now)), startedAt: now, name, exercises: exercises.map((e) => makeExercise(e, sessions)) };
}

export const addSet = (exercise) => {
  const prev = exercise.sets[exercise.sets.length - 1];
  const next = { ...blank(exercise.unit), ...(prev && 'weight' in prev ? { weight: prev.weight, reps: prev.reps } : {}) };
  return { ...exercise, sets: [...exercise.sets, { ...next, done: false }] };
};

/** A set counts when it has what its kind needs (reps, seconds or minutes). */
export function setComplete(set, unit) {
  if (unit === 'cardio') return Number(set.minutes) > 0;
  if (unit === 'time') return Number(set.seconds) > 0;
  return Number(set.reps) > 0;
}

/** Drops unfinished sets and empty exercises, and stamps the end time. */
export function finishSession(session, hr, now = Date.now()) {
  const exercises = session.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && setComplete(s, e.unit)) }))
    .filter((e) => e.sets.length);
  return { ...session, exercises, endedAt: now, ...(hr?.n ? { hr: { avg: hr.avg, max: hr.max } } : {}) };
}

export function customExercise(name, muscle, how) {
  return { id: `custom:${name.trim().toLowerCase()}`, custom: true, name, muscle: muscle || '', how: how || '', unit: 'kg' };
}
