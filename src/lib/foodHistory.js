// What the person usually eats, and editing of logged food. Pure functions,
// so the rules can be tested without a browser.
import { normalize } from './foodDb.js';

const MAIN_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'sugar', 'fiber'];
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

/** One name for a food, whatever its language or how it was added. */
export function foodKey(entry) {
  if (entry?.foodId) return entry.foodId;
  const name = typeof entry?.name === 'string' ? entry.name : entry?.name?.en || entry?.name?.ar || '';
  return `name:${normalize(name)}`;
}

/** The text of an entry's name, for memory keys and searches. */
export const nameText = (name) => (typeof name === 'string' ? name : name?.en || name?.ar || '');

/**
 * Foods from the log the person eats most at this meal, recent days counting
 * more. Each comes back as the latest entry of that food with the median of
 * the grams they usually take. Foods already in today's meal are left out.
 */
export function historySuggestions(log, meal, { today, days = 45, limit = 8, skip = [] } = {}) {
  const keys = Object.keys(log || {}).filter((k) => !today || k < today).sort().reverse().slice(0, days);
  const skipKeys = new Set(skip.map(foodKey));
  const stats = new Map();
  keys.forEach((day, age) => {
    for (const e of log[day] || []) {
      if (!e || !(Number(e.grams) > 0)) continue;
      const key = foodKey(e);
      if (skipKeys.has(key)) continue;
      const weight = (e.meal === meal ? 1 : 0.25) * (1 / (1 + age / 7));
      const s = stats.get(key) || { score: 0, times: 0, grams: [], entry: null, sameMeal: 0 };
      s.score += weight;
      s.times += 1;
      if (e.meal === meal) s.sameMeal += 1;
      s.grams.push(Number(e.grams));
      if (!s.entry) s.entry = e; // keys run newest first, so the first one is the latest
      stats.set(key, s);
    }
  });
  return [...stats.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => {
      const sorted = [...s.grams].sort((a, b) => a - b);
      const grams = sorted[Math.floor(sorted.length / 2)];
      return { entry: rescale(s.entry, grams), times: s.times, sameMeal: s.sameMeal };
    });
}

/** The whole meal from the last day that has one. */
export function lastMeal(log, meal, today) {
  const day = Object.keys(log || {}).filter((k) => k < today).sort().reverse()
    .find((k) => (log[k] || []).some((e) => e.meal === meal));
  return day ? { day, items: log[day].filter((e) => e.meal === meal) } : null;
}

/** The same entry for a different amount: every nutrient scales with the grams. */
export function rescale(entry, grams) {
  const g = Number(grams);
  const from = Number(entry.grams);
  if (!(g > 0) || !(from > 0) || g === from) return { ...entry, grams: g > 0 ? g : entry.grams };
  const f = g / from;
  const out = { ...entry, grams: g };
  for (const k of MAIN_KEYS) {
    if (entry[k] == null) continue;
    out[k] = k === 'kcal' ? Math.round(entry[k] * f) : r1(entry[k] * f);
  }
  if (entry.micro) {
    out.micro = Object.fromEntries(Object.entries(entry.micro).map(([k, v]) => [k, v == null ? null : r2(v * f)]));
  }
  delete out.portion;
  return out;
}

/**
 * Saved memory of foods: a name the AI or the person used, linked to the
 * nutrition-table food it really is. Next time the same name comes back from
 * a photo or a description, the table values are used.
 */
export function remember(memory, name, food, grams) {
  const key = normalize(nameText(name));
  if (!key || !food?.id) return memory || {};
  return { ...(memory || {}), [key]: { foodId: food.id, en: food.name.en, ar: food.name.ar, grams: Number(grams) || undefined, at: Date.now() } };
}

export function recall(memory, name) {
  return (memory || {})[normalize(nameText(name))] || null;
}

/** Names the person eats often, so the AI can reuse them when it sees them. */
export function knownNames(log, memory, limit = 40) {
  const counts = new Map();
  for (const day of Object.values(log || {})) {
    for (const e of day || []) {
      const n = nameText(e.name).trim();
      if (n) counts.set(n, (counts.get(n) || 0) + 1);
    }
  }
  for (const m of Object.values(memory || {})) if (m.en) counts.set(m.en, (counts.get(m.en) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n);
}

/**
 * The nutrition-table food an item most likely is: the one the person linked
 * it to before, else the best search hit for its plain-English name.
 */
export function tableMatch(db, item, memory, search) {
  if (!db) return null;
  const saved = recall(memory, item.name);
  if (saved) {
    const food = db.foods.find((f) => f.id === saved.foodId);
    if (food) return { food, remembered: true };
  }
  if (item.foodId && String(item.foodId).startsWith('usda:')) {
    const food = db.foods.find((f) => f.id === item.foodId);
    if (food) return { food, remembered: false, same: true };
  }
  const query = item.search || nameText(item.name);
  const food = query ? search(db, query, { limit: 1 })[0] : null;
  return food ? { food, remembered: false } : null;
}
