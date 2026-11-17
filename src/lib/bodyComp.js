// Body composition from weight, body impedance, height, age and sex.
//
// The scale only measures weight and impedance; every other number on a
// body-fat scale is a formula. These are the open formulas used by the
// Xiaomi body-composition scales (as published by the openScale and
// "body metrics" projects). OKOK's own formulas are not public, so numbers
// can differ from the OKOK app by a few points; the trend is what matters.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;

export function bmiOf(weight, heightCm) {
  const h = Number(heightCm) / 100;
  return h > 0 && weight > 0 ? r1(weight / (h * h)) : null;
}

/**
 * Every metric the scale screen shows. Without impedance (shoes on, or a
 * weight-only scale) only weight and BMI come back.
 */
export function bodyComposition({ weight, impedance, height, age, sex }) {
  const w = Number(weight);
  const h = Number(height) || 170;
  const a = Number(age) || 30;
  const female = sex === 'female';
  const out = { weight: r1(w), bmi: bmiOf(w, h) };
  const imp = Number(impedance);
  if (!(w > 0) || !(imp > 0)) return out;

  const lbmCoeff = (h * 9.058 / 100) * (h / 100) + w * 0.32 + 12.226 - imp * 0.0068 - a * 0.0542;

  const constant = female ? (a <= 49 ? 9.25 : 7.25) : 0.8;
  let coefficient = 1;
  if (!female && w < 61) coefficient = 0.98;
  else if (female && w > 60) coefficient = 0.96 * (h > 160 ? 1.03 : 1);
  else if (female && w < 50) coefficient = 1.02 * (h > 160 ? 1.03 : 1);
  let fat = (1 - ((lbmCoeff - constant) * coefficient) / w) * 100;
  if (fat > 63) fat = 75;
  fat = clamp(fat, 5, 75);

  let water = (100 - fat) * 0.7;
  water = clamp(water * (water <= 50 ? 1.02 : 0.98), 35, 75);

  let bone = ((female ? 0.245691014 : 0.18016894) - lbmCoeff * 0.05158) * -1;
  bone = bone > 2.2 ? bone + 0.1 : bone - 0.1;
  bone = clamp(bone, 0.5, 8);

  const muscle = clamp(w - (fat / 100) * w - bone, 10, 120);

  let visceral;
  if (female) {
    if (w > (13 - h * 0.5) * -1) {
      const sub = h * 1.45 + h * 0.1158 * h - 120;
      visceral = (w * 500) / sub - 6 + a * 0.07;
    } else {
      const sub = 0.691 + h * -0.0024 + h * -0.0024;
      visceral = (h * 0.027 - sub * w) * -1 + a * 0.07 - a;
    }
  } else if (h < w * 1.6) {
    const sub = (h * 0.4 - h * (h * 0.0826)) * -1;
    visceral = (w * 305) / (sub + 48) - 2.9 + a * 0.15;
  } else {
    const sub = 0.765 + h * -0.0015;
    visceral = (h * 0.143 - w * sub) * -1 + a * 0.15 - 5.0;
  }
  visceral = clamp(visceral, 1, 50);

  // Basal metabolic rate from lean mass (Katch-McArdle), which follows the
  // measured body fat instead of weight alone.
  const lean = w * (1 - fat / 100);
  const bmr = Math.round(370 + 21.6 * lean);

  const protein = clamp((muscle / w) * 100 - water, 5, 32);

  return {
    ...out,
    impedance: Math.round(imp),
    fat: r1(fat),
    fatMass: r1((fat / 100) * w),
    water: r1(water),
    muscle: r1(muscle),
    bone: r1(bone),
    visceral: r1(visceral),
    bmr,
    protein: r1(protein),
    lean: r1(lean),
  };
}

/**
 * Where a value sits: 0 low, 1 healthy, 2 high, 3 very high (or null when the
 * metric has no healthy range). Ranges are the common adult references.
 */
export function band(metric, value, { sex } = {}) {
  if (value == null || Number.isNaN(value)) return null;
  const female = sex === 'female';
  const cuts = {
    bmi: [18.5, 25, 30],
    fat: female ? [21, 33, 39] : [8, 20, 25],
    water: female ? [45, 60, 70] : [50, 65, 75],
    visceral: [0, 10, 15],
    protein: [16, 30, 40],
  }[metric];
  if (!cuts) return null;
  if (value < cuts[0]) return 0;
  if (value < cuts[1]) return 1;
  if (value < cuts[2]) return 2;
  return 3;
}

/** Summary of one metric over a list of measurements (oldest first). */
export function summary(points) {
  const values = points.map((p) => p.value).filter((v) => v != null);
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  let max = points[0];
  let min = points[0];
  for (const p of points) {
    if (p.value == null) continue;
    if (max.value == null || p.value > max.value) max = p;
    if (min.value == null || p.value < min.value) min = p;
  }
  const first = points.find((p) => p.value != null);
  const last = [...points].reverse().find((p) => p.value != null);
  return { avg: r1(avg), change: r1(last.value - first.value), max, min, last, count: values.length };
}
