// Quick add: the person says or types one mixed sentence — what they
// trained, what they ate, which prayers they prayed, what they must do —
// and the AI sorts it into the four logs. Nothing is saved from the AI's
// answer directly: readQuickAdd turns it into proposals, the person reviews
// and approves them, and only then do the apply* functions write the logs.
import { uid } from './dates.js';
import { portion } from './nutrition.js';

export const QUICK_KINDS = ['gym', 'food', 'prayer', 'task'];
const PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_STATUS = ['ontime', 'late', 'missed'];
const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
};

/** The meal a food entry belongs to when none is named: by the clock. */
export function defaultMeal(hour = new Date().getHours()) {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/** The AI request: catalogue ids are listed so answers can be matched. */
export function quickAddPrompt(text, { today, lang, exercises, foods }) {
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
  const exList = Object.values(exercises || {})
    .map((x) => `${x.id} = ${x.name.en} / ${x.name.ar}`)
    .join('; ');
  const foodList = (foods || []).map((f) => `${f.id} = ${f.name.en} / ${f.name.ar}`).join('; ');
  return {
    system:
      'You sort a person\'s spoken or typed notes into the logs of their self-discipline app: gym training, food, prayers and tasks. Answer with JSON only.',
    prompt: `Today is ${weekday} ${today}. The person said or wrote (Arabic or English):
"""${text}"""

Return {"items": [...]} with one item per thing they mention, using exactly these shapes:
- Training they DID: {"type":"gym","exercise":"<id from the exercise list, or their words if none fits>","sets":[{"weight":60,"reps":10}],"minutes":0,"km":0}
  "3 sets of 60 kg x 10" means three set objects. Bodyweight means weight 0. Cardio uses minutes and km instead of sets.
- Food they ATE: {"type":"food","food":"<id from the food list, or their words if none fits>","grams":150,"meal":"breakfast|lunch|dinner|snack or empty","kcal":0}
  Estimate grams from the portion they name (a plate, a cup, one piece). For a food not in the list, estimate its total kcal for that portion in "kcal".
- Prayers they PRAYED: {"type":"prayer","prayer":"fajr|dhuhr|asr|maghrib|isha","status":"ontime|late|missed","mosque":false}
  Default status ontime; mosque true only if they say so.
- Things to DO: {"type":"task","title":"...","due":"YYYY-MM-DD or empty","time":"HH:MM or empty"}
  Resolve "tomorrow" and weekday names against today. No due date means empty.
Only include what they actually mention. If nothing fits, return {"items": []}.
Answer in the language of their note for free-text names and titles (current language: ${lang === 'ar' ? 'Arabic' : 'English'}).

Exercise list: ${exList}
Food list: ${foodList}`,
  };
}

const cleanSets = (raw) => {
  const sets = (Array.isArray(raw) ? raw : [])
    .map((s) => ({ weight: num(s?.weight), reps: num(s?.reps), seconds: num(s?.seconds), minutes: num(s?.minutes), km: num(s?.km), done: true }))
    .filter((s) => s.reps > 0 || s.seconds > 0 || s.minutes > 0)
    .slice(0, 12);
  return sets;
};

/**
 * Validates the AI's JSON into proposals the person can review. Catalogue
 * ids resolve to the real exercise/food; anything else stays a free-text
 * (custom) proposal, clearly carrying the person's own words.
 */
export function readQuickAdd(json, { exercises, foods } = {}) {
  const raw = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
  const foodById = new Map((foods || []).map((f) => [f.id, f]));
  const out = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'gym') {
      const known = exercises?.[item.exercise];
      const sets = cleanSets(item.sets);
      if (!sets.length && num(item.minutes) > 0) {
        sets.push({ weight: 0, reps: 0, seconds: 0, minutes: num(item.minutes), km: num(item.km), done: true });
      }
      if (!sets.length) continue;
      out.push({
        kind: 'gym',
        custom: !known,
        exerciseId: known ? known.id : `custom:${String(item.exercise || 'exercise').trim().toLowerCase()}`,
        name: known ? known.name : String(item.exercise || '').trim().slice(0, 60),
        unit: known?.unit || (sets[0].minutes ? 'cardio' : 'kg'),
        muscle: known?.muscle || '',
        sets,
      });
    } else if (item.type === 'food') {
      const known = foodById.get(item.food);
      const grams = num(item.grams) || known?.serving || 100;
      out.push({
        kind: 'food',
        custom: !known,
        food: known || null,
        name: known ? known.name : String(item.food || '').trim().slice(0, 60),
        grams,
        meal: MEAL_IDS.includes(item.meal) ? item.meal : '',
        kcal: known ? 0 : num(item.kcal),
      });
    } else if (item.type === 'prayer') {
      if (!PRAYER_IDS.includes(item.prayer)) continue;
      out.push({
        kind: 'prayer',
        prayer: item.prayer,
        status: PRAYER_STATUS.includes(item.status) ? item.status : 'ontime',
        mosque: Boolean(item.mosque) && item.status !== 'missed',
      });
    } else if (item.type === 'task') {
      const title = String(item.title || '').trim().slice(0, 140);
      if (!title) continue;
      out.push({
        kind: 'task',
        title,
        due: /^\d{4}-\d{2}-\d{2}$/.test(item.due || '') ? item.due : '',
        time: /^\d{2}:\d{2}$/.test(item.time || '') ? item.time : '',
      });
    }
  }
  return out.filter((p) => (p.kind !== 'gym' && p.kind !== 'food') || p.name);
}

const ofKind = (proposals, kind) => (proposals || []).filter((p) => p.kind === kind);

/** A session entry in the shape GymSession and the history already use. */
const gymEntry = (p) => ({
  exerciseId: p.exerciseId,
  unit: p.unit,
  muscle: p.muscle,
  ...(p.custom ? { name: p.name } : {}),
  sets: p.sets.map((s) => ({ ...s })),
});

/**
 * Gym proposals: into the workout in progress when there is one (merging
 * sets into an exercise already there), otherwise a finished session for
 * today. Returns the stores to write; `added` counts the exercises.
 */
export function applyGym(proposals, { active, sessions, today, now = Date.now() }) {
  const mine = ofKind(proposals, 'gym');
  if (!mine.length) return { active, sessions, added: 0 };
  if (active) {
    const exercises = [...(active.exercises || [])];
    for (const p of mine) {
      const at = exercises.findIndex((e) => e.exerciseId === p.exerciseId);
      if (at >= 0) exercises[at] = { ...exercises[at], sets: [...exercises[at].sets, ...gymEntry(p).sets] };
      else exercises.push(gymEntry(p));
    }
    return { active: { ...active, exercises }, sessions, added: mine.length };
  }
  const session = {
    id: uid(),
    date: today,
    startedAt: now,
    endedAt: now,
    name: 'Quick add · إضافة سريعة',
    exercises: mine.map(gymEntry),
  };
  return { active, sessions: [session, ...(sessions || [])], added: mine.length };
}

/** Food proposals appended to today's log, with the meal filled in. */
export function applyFood(proposals, { log, today, hour }) {
  const mine = ofKind(proposals, 'food');
  if (!mine.length) return { log, added: 0 };
  const entries = mine.map((p) => {
    const meal = p.meal || defaultMeal(hour);
    if (p.food) return { name: p.food.name, foodId: p.food.id, ...portion(p.food, p.grams), source: 'quick', id: uid(), meal };
    return {
      name: { en: p.name, ar: p.name },
      grams: p.grams,
      kcal: Math.round(p.kcal),
      protein: 0,
      carbs: 0,
      fat: 0,
      sugar: 0,
      fiber: 0,
      source: 'quick',
      id: uid(),
      meal,
    };
  });
  return { log: { ...(log || {}), [today]: [...((log || {})[today] || []), ...entries] }, added: entries.length };
}

/** Prayer proposals merged into today's prayer log. */
export function applyPrayer(proposals, { log, today }) {
  const mine = ofKind(proposals, 'prayer');
  if (!mine.length) return { log, added: 0 };
  const day = { ...((log || {})[today] || {}) };
  for (const p of mine) day[p.prayer] = { s: p.status, m: p.status === 'missed' ? false : Boolean(p.mosque) };
  return { log: { ...(log || {}), [today]: day }, added: mine.length };
}

/** Task proposals appended with the Tasks page's own defaults. */
export function applyTasks(proposals, { tasks, today, now = Date.now() }) {
  const mine = ofKind(proposals, 'task');
  if (!mine.length) return { tasks, added: 0 };
  const made = mine.map((p) => ({
    id: uid(),
    created: now,
    done: false,
    source: 'quick',
    steps: [],
    stepsDone: [],
    priority: 'normal',
    category: 'personal',
    notes: '',
    title: p.title,
    due: p.due || today,
    time: p.time || '',
  }));
  return { tasks: [...(tasks || []), ...made], added: made.length };
}
