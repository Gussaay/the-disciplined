// Turns the nutrition database package (USDA FoodData Central SR Legacy,
// April 2018, with curated Arabic names) into the compact file the app loads:
// public/nutrition/foods-v1.json.
//
//   node scripts/build-nutrition.mjs <path to nutrition-database/data/foods.json>
//
// Values stay per 100 g of the food in the state its name says. Missing
// values stay null (unknown is not zero). Source portions are kept only when
// their amount and gram weight are positive.
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/build-nutrition.mjs <foods.json>');
  process.exit(1);
}
const db = JSON.parse(readFileSync(src, 'utf8'));

// The nutrients the app shows, in this order. Units come from the source.
export const KEYS = [
  'energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'sugars_g', 'fiber_g',
  'saturated_fat_g', 'monounsaturated_fat_g', 'polyunsaturated_fat_g', 'trans_fat_g', 'cholesterol_mg',
  'sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'phosphorus_mg', 'zinc_mg',
  'vitamin_c_mg', 'vitamin_a_rae_ug', 'vitamin_d_ug', 'vitamin_b12_ug', 'folate_dfe_ug', 'water_g',
];

// Food groups. Left out: 10 pork, 24 American Indian/Alaska Native foods,
// 26 historical branded products, 27 lab quality-control materials and 28
// alcoholic drinks. Foods in other groups whose names mention pork, ham,
// bacon, lard or alcohol are left out too.
const CATEGORIES = {
  1: ['Dairy and eggs', 'الألبان والبيض'],
  2: ['Spices and herbs', 'التوابل والأعشاب'],
  3: ['Baby foods', 'أغذية الأطفال'],
  4: ['Fats and oils', 'الدهون والزيوت'],
  5: ['Poultry', 'الدواجن'],
  6: ['Soups and sauces', 'الشوربات والصلصات'],
  7: ['Sausages and cold cuts', 'النقانق واللحوم الباردة'],
  8: ['Breakfast cereals', 'حبوب الإفطار'],
  9: ['Fruits and juices', 'الفواكه والعصائر'],
  11: ['Vegetables', 'الخضروات'],
  12: ['Nuts and seeds', 'المكسرات والبذور'],
  13: ['Beef', 'لحم البقر'],
  14: ['Drinks', 'المشروبات'],
  15: ['Fish and seafood', 'الأسماك والمأكولات البحرية'],
  16: ['Legumes', 'البقوليات'],
  17: ['Lamb, veal and game', 'الضأن والعجل والطرائد'],
  18: ['Baked goods', 'المخبوزات'],
  19: ['Sweets', 'الحلويات'],
  20: ['Grains and pasta', 'الحبوب والمعكرونة'],
  21: ['Fast food', 'الوجبات السريعة'],
  22: ['Meals and side dishes', 'الوجبات والأطباق الجانبية'],
  23: ['Snacks', 'الوجبات الخفيفة'],
  25: ['Restaurant foods', 'أطعمة المطاعم'],
};

// Three significant figures are well inside the precision of the source.
const round = (v) => (v === null || v === undefined ? null : Number(Number(v).toPrecision(3)));

const foods = [];
let portionsKept = 0;
for (const f of db.foods) {
  if (!CATEGORIES[f.category_id]) continue;
  if (/\b(pork|ham|hams|bacon|lard|gelatin|wine|beer|rum|whiskey|vodka|liqueur|brandy|gin|sherry)\b/i.test(f.name_en)) continue;
  const values = KEYS.map((k) => round(f.nutrients_per_100g[k]));
  const portions = (f.portions || [])
    .filter((p) => p.amount > 0 && p.gram_weight > 0)
    .map((p) => {
      const label = [p.amount !== 1 ? String(round(p.amount)) : '1', p.measure_unit_name !== 'undetermined' ? p.measure_unit_name : '', p.modifier || '', p.portion_description || '']
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      // gram_weight is the weight of the whole stated amount, not of one unit.
      return [label, round(p.gram_weight)];
    });
  portionsKept += portions.length;
  foods.push([
    f.fdc_id,
    f.name_en,
    f.name_ar || '',
    (f.aliases_ar || []).join('|'),
    f.preparation_curated || '',
    f.category_id,
    values,
    // [label, grams for that label]; the label already includes the amount.
    portions,
  ]);
}

// Foods with an Arabic name first, so they come up first in a search.
foods.sort((a, b) => (b[2] ? 1 : 0) - (a[2] ? 1 : 0));

const units = Object.fromEntries(KEYS.map((k) => [k, db.nutrient_definitions[k]?.unit?.toLowerCase() || '']));
const out = {
  v: 1,
  source: {
    name: db.source.name,
    release: db.source.release,
    license: db.source.license,
    url: db.source.url,
    assembled: db.generated_on,
  },
  basis: '100 g edible portion in the state named',
  keys: KEYS,
  units,
  categories: CATEGORIES,
  foods,
};
writeFileSync(new URL('../public/nutrition/foods-v1.json', import.meta.url), JSON.stringify(out));
console.log(`${foods.length} foods, ${portionsKept} portions written`);
