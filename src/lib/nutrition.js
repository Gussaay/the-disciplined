// Food maths: daily targets from the profile, totals of what was eaten, and
// simple suggestions for what to eat next.
//
// A log entry is { id, meal, name: {en, ar} | string, grams, kcal, protein, carbs, fat, sugar, fiber, foodId?, source }
// with the nutrient values already worked out for `grams`.
const n = (v) => Number(v) || 0;
const r1 = (v) => Math.round(v * 10) / 10;

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'sugar', 'fiber'];

export const ACTIVITY = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
};

/**
 * Daily targets. BMR by Mifflin-St Jeor, times the activity factor, then
 * -20% to lose weight or +10% to gain. Protein 1.6-2 g per kg, fat 27% of
 * the calories, the rest carbohydrate. Free sugar under 10% of calories
 * (WHO), fibre 14 g per 1000 kcal, water 35 ml per kg.
 */
export function dailyTargets(profile = {}) {
  const weight = n(profile.weight) || 70;
  const height = n(profile.height) || 170;
  const age = n(profile.age) || 30;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (profile.sex === 'female' ? -161 : 5);
  const tdee = bmr * (ACTIVITY[profile.activity] || ACTIVITY.light);
  const goal = profile.goal || 'maintain';
  const factor = goal === 'lose' ? 0.8 : goal === 'gain' ? 1.1 : 1;
  const kcal = Math.max(1200, Math.round((tdee * factor) / 10) * 10);
  const protein = Math.round(weight * (goal === 'maintain' ? 1.6 : 2));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    kcal, protein, carbs, fat,
    sugar: Math.round((kcal * 0.1) / 4),
    fiber: Math.round((kcal / 1000) * 14),
    water: Math.round((weight * 35) / 50) * 50,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    ...(profile.targets || {}),
  };
}

/** Nutrients of `grams` of a food whose values are per 100 g. */
export function portion(food, grams) {
  const f = n(grams) / 100;
  return {
    grams: n(grams),
    kcal: Math.round(n(food.kcal) * f),
    protein: r1(n(food.protein) * f),
    carbs: r1(n(food.carbs) * f),
    fat: r1(n(food.fat) * f),
    sugar: r1(n(food.sugar) * f),
    fiber: r1(n(food.fiber) * f),
  };
}

/**
 * Sums of the main numbers. Entries from the food database list in `unknown`
 * the numbers their source does not report (stored as 0); those keys come back
 * in `unknown` here too, so a total that is only a floor can say so.
 */
export function totals(entries) {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 };
  const unknown = new Set();
  for (const e of entries || []) {
    for (const k of NUTRIENTS) sum[k] += n(e[k]);
    if (n(e.grams) > 0) for (const k of e.unknown || []) unknown.add(k);
  }
  for (const k of NUTRIENTS) sum[k] = k === 'kcal' ? Math.round(sum[k]) : r1(sum[k]);
  if (unknown.size) sum.unknown = [...unknown];
  return sum;
}

export function remaining(targets, eaten) {
  const out = {};
  for (const k of NUTRIENTS) out[k] = r1(n(targets[k]) - n(eaten[k]));
  return out;
}

/**
 * How well a day went, 0-1: calories within 10% of the target count fully and
 * fall off to zero at 40% away; protein counts by the share reached; going
 * over the sugar limit takes up to a fifth off. A day with nothing logged is 0.
 */
export function dayScore(targets, eaten, logged = true) {
  if (!logged || !n(eaten.kcal)) return 0;
  const off = Math.abs(n(eaten.kcal) - n(targets.kcal)) / n(targets.kcal);
  const kcalScore = off <= 0.1 ? 1 : Math.max(0, 1 - (off - 0.1) / 0.3);
  const proteinScore = Math.min(1, n(eaten.protein) / (n(targets.protein) || 1));
  const over = Math.max(0, n(eaten.sugar) - n(targets.sugar)) / (n(targets.sugar) || 1);
  const sugarPenalty = Math.min(0.2, over * 0.2);
  return Math.max(0, Math.round((kcalScore * 0.5 + proteinScore * 0.5 - sugarPenalty) * 100) / 100);
}

/**
 * Foods that fit what is left for the day, best first. A food scores by how
 * much of the protein still needed one serving brings per calorie, with
 * sweets and fried dishes pushed down and anything larger than the calories
 * left removed.
 */
export function suggest(foods, left, { limit = 6, mealShare = 0.3, targets } = {}) {
  const budget = Math.max(0, n(left.kcal));
  const perMeal = targets ? n(targets.kcal) * mealShare : budget;
  const needProtein = Math.max(0, n(left.protein));
  const sugarLeft = n(left.sugar);
  return (foods || [])
    .map((food) => {
      const p = portion(food, food.serving || 100);
      if (!p.kcal || p.kcal > Math.min(budget, perMeal)) return null;
      const density = p.protein / p.kcal;
      let score = needProtein > 10 ? density * 100 : 2;
      score += Math.min(p.fiber, 8) * 0.4;
      if (p.sugar > Math.max(sugarLeft, 0)) score -= 5;
      if (food.category === 'sweets' || food.category === 'drinks') score -= 4;
      if (['fries', 'fried_chicken', 'burger', 'pizza', 'samosa'].includes(food.id)) score -= 3;
      if (food.category === 'fats') score -= 1.5;
      return { food, portion: p, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Body mass index and its band. */
export function bmi(weight, heightCm) {
  const h = n(heightCm) / 100;
  if (!h || !n(weight)) return null;
  const value = r1(n(weight) / (h * h));
  const band = value < 18.5 ? 'under' : value < 25 ? 'normal' : value < 30 ? 'over' : 'obese';
  return { value, band };
}
