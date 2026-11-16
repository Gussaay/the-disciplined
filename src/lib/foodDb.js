// The nutrition database (USDA FoodData Central SR Legacy, April 2018, with
// curated Arabic names), loaded once from public/nutrition/foods-v1.json.
//
// Rules carried over from the database's own notes:
//   - every value is per 100 g of the food in the state its name says
//     (raw, boiled, fried... are separate foods);
//   - a missing value is unknown, never zero, and a total that includes an
//     unknown is marked incomplete;
//   - source portions are reference weights and are always shown with their
//     grams; no spoon, loaf or bowl size is assumed.

/** Arabic-aware text folding for search. */
export function normalize(text) {
  return String(text || '').toLowerCase().normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Turns the compact file into food objects. */
export function unpack(raw) {
  const foods = raw.foods.map(([fdc, en, ar, aliases, prep, cat, values, portions]) => {
    const per100 = {};
    raw.keys.forEach((k, i) => { per100[k] = values[i]; });
    const aliasList = aliases ? aliases.split('|') : [];
    return {
      id: `usda:${fdc}`,
      fdc,
      name: { en, ar: ar || en },
      hasArabic: Boolean(ar),
      aliases: aliasList,
      prep: prep || '',
      category: cat,
      per100,
      portions: portions.map(([label, grams]) => ({ label, grams })),
      text: normalize([en, ar, ...aliasList].join(' ')),
    };
  });
  return {
    source: raw.source, keys: raw.keys, units: raw.units, categories: raw.categories, foods,
  };
}

/**
 * Foods that contain every word of the query, best first: a match in the
 * Arabic name or at the start of the name ranks higher, then shorter names.
 * Nothing is chosen for the user; the list is only ordered.
 */
export function searchFoods(db, query, { category = 'all', limit = 50 } = {}) {
  const words = normalize(query).split(' ').filter(Boolean);
  const inCategory = (f) => category === 'all' || String(f.category) === String(category);
  if (!words.length) return db.foods.filter(inCategory).slice(0, limit);
  const hits = [];
  for (const f of db.foods) {
    if (!inCategory(f) || !words.every((w) => f.text.includes(w))) continue;
    const en = normalize(f.name.en);
    let score = 0;
    if (f.hasArabic) score += 2;
    if (en.startsWith(words[0])) score += 3;
    if (en.split(' ')[0] === words[0]) score += 2;
    if (f.aliases.some((a) => normalize(a) === words.join(' '))) score += 6;
    if (/\braw\b/.test(en)) score -= 0.5;
    score -= f.name.en.length / 60;
    hits.push([score, f]);
  }
  return hits.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, f]) => f);
}

/** Every nutrient for `grams` of the food; unknown stays null. */
export function nutrientsFor(food, grams) {
  const g = Number(grams);
  if (!Number.isFinite(g) || g < 0) throw new RangeError('grams must be a non-negative number');
  return Object.fromEntries(Object.entries(food.per100).map(([k, v]) => [k, v === null ? null : (v * g) / 100]));
}

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

/** Keys the food log stores as its main numbers (as the rest of the app uses them). */
export const MAIN = {
  kcal: 'energy_kcal', protein: 'protein_g', carbs: 'carbohydrate_g', fat: 'fat_g', sugar: 'sugars_g', fiber: 'fiber_g',
};

/**
 * A food-log entry for `grams` of a database food. It keeps a snapshot of the
 * values, so a later update of the database never changes an old log.
 * `micro` holds the other nutrients (null = unknown), `unknown` lists the main
 * numbers the source does not report.
 */
export function logEntry(food, grams, { portion, release } = {}) {
  const all = nutrientsFor(food, grams);
  const entry = {
    name: { en: food.name.en, ar: food.name.ar }, foodId: food.id, grams: Number(grams), source: 'database',
    release: release || '2018-04',
  };
  const unknown = [];
  for (const [key, src] of Object.entries(MAIN)) {
    const v = all[src];
    if (v === null) unknown.push(key);
    entry[key] = v === null ? 0 : key === 'kcal' ? Math.round(v) : r1(v);
  }
  if (unknown.length) entry.unknown = unknown;
  const mains = new Set(Object.values(MAIN));
  entry.micro = Object.fromEntries(Object.entries(all).filter(([k]) => !mains.has(k)).map(([k, v]) => [k, v === null ? null : r2(v)]));
  if (portion) entry.portion = portion;
  return entry;
}

/**
 * Sum of the extra nutrients over log entries. A nutrient is complete only
 * when every entry with grams reports it; otherwise `value` is what the known
 * entries add up to (a floor) and `missing` counts the entries without it.
 */
export function microTotals(entries, keys) {
  const out = {};
  for (const key of keys) {
    let value = 0;
    let missing = 0;
    for (const e of entries || []) {
      if (!(Number(e.grams) > 0)) continue;
      const v = e.micro?.[key];
      if (v === null || v === undefined) missing += 1;
      else value += v;
    }
    out[key] = { value: r2(value), missing };
  }
  return out;
}

/**
 * Reference daily values used on food labels (US FDA, adults, 2016 rule).
 * They are shown only as a scale for the amounts, not as personal targets.
 */
export const DAILY_VALUE = {
  saturated_fat_g: 20, cholesterol_mg: 300, sodium_mg: 2300, potassium_mg: 4700, calcium_mg: 1300,
  iron_mg: 18, magnesium_mg: 420, phosphorus_mg: 1250, zinc_mg: 11, vitamin_c_mg: 90, vitamin_a_rae_ug: 900,
  vitamin_d_ug: 20, vitamin_b12_ug: 2.4, folate_dfe_ug: 400,
};

/** Bilingual nutrient names. */
export const NUTRIENT_NAMES = {
  energy_kcal: ['Calories', 'السعرات'],
  protein_g: ['Protein', 'البروتين'],
  carbohydrate_g: ['Carbohydrate', 'الكربوهيدرات'],
  fat_g: ['Fat', 'الدهون'],
  sugars_g: ['Total sugars', 'السكريات الكلية'],
  fiber_g: ['Fibre', 'الألياف'],
  saturated_fat_g: ['Saturated fat', 'الدهون المشبعة'],
  monounsaturated_fat_g: ['Monounsaturated fat', 'الدهون الأحادية غير المشبعة'],
  polyunsaturated_fat_g: ['Polyunsaturated fat', 'الدهون المتعددة غير المشبعة'],
  trans_fat_g: ['Trans fat', 'الدهون المتحولة'],
  cholesterol_mg: ['Cholesterol', 'الكوليسترول'],
  sodium_mg: ['Sodium', 'الصوديوم'],
  potassium_mg: ['Potassium', 'البوتاسيوم'],
  calcium_mg: ['Calcium', 'الكالسيوم'],
  iron_mg: ['Iron', 'الحديد'],
  magnesium_mg: ['Magnesium', 'المغنيسيوم'],
  phosphorus_mg: ['Phosphorus', 'الفوسفور'],
  zinc_mg: ['Zinc', 'الزنك'],
  vitamin_c_mg: ['Vitamin C', 'فيتامين C'],
  vitamin_a_rae_ug: ['Vitamin A (RAE)', 'فيتامين A'],
  vitamin_d_ug: ['Vitamin D', 'فيتامين D'],
  vitamin_b12_ug: ['Vitamin B12', 'فيتامين B12'],
  folate_dfe_ug: ['Folate (DFE)', 'الفولات'],
  water_g: ['Water', 'الماء'],
};

export const UNIT_NAMES = { g: ['g', 'جم'], mg: ['mg', 'ملجم'], ug: ['µg', 'ميكروجرام'], kcal: ['kcal', 'سعرة'] };

/** The extra nutrients shown in the daily panel, grouped. */
export const MICRO_GROUPS = [
  { id: 'fats', name: ['Fats', 'الدهون'], keys: ['saturated_fat_g', 'monounsaturated_fat_g', 'polyunsaturated_fat_g', 'trans_fat_g', 'cholesterol_mg'] },
  { id: 'minerals', name: ['Minerals', 'المعادن'], keys: ['sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'phosphorus_mg', 'zinc_mg'] },
  { id: 'vitamins', name: ['Vitamins', 'الفيتامينات'], keys: ['vitamin_c_mg', 'vitamin_a_rae_ug', 'vitamin_d_ug', 'vitamin_b12_ug', 'folate_dfe_ug'] },
];

/**
 * A saved meal: several items with their grams, logged together in one tap.
 * Its totals are the sum of the item snapshots.
 */
export function mealTotals(items) {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, grams: 0 };
  for (const i of items || []) for (const k of Object.keys(sum)) sum[k] += Number(i[k]) || 0;
  for (const k of Object.keys(sum)) sum[k] = k === 'kcal' || k === 'grams' ? Math.round(sum[k]) : r1(sum[k]);
  return sum;
}

// ---------------------------------------------------------------------------
// Loading (browser only). The file is about 1.5 MB (0.5 MB compressed), so it
// is fetched the first time the database is opened, then kept in memory; the
// service worker keeps a copy for offline use.
// ---------------------------------------------------------------------------
let loading = null;

export function loadFoodDb() {
  if (!loading) {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    loading = fetch(`${base}nutrition/foods-v1.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(unpack)
      .catch((error) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}
