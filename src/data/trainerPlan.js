// The diet table set by Qusay's trainer (given 2026-11-23): gain weight as
// muscle mass on 2,800 kcal a day, four home meals, one option chosen from
// each meal. The Arabic is the trainer's own wording; the English is a
// faithful translation. Weights of rice, pasta, meat and chicken are after
// cooking, as the trainer's rules say.
//
// Every option also lists its foods with their amounts, so choosing an
// option can write the foods into the day's food log and the day's totals
// follow the plan. Nutrition is per 100 g (or 100 ml) from standard food
// tables — estimates for tracking, not lab values.
const PER100 = {
  egg: { name: { en: 'Egg', ar: 'بيض' }, kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, sugar: 0.4, fiber: 0 },
  baladi: { name: { en: 'Baladi bread', ar: 'عيش بلدي' }, kcal: 265, protein: 9, carbs: 49, fat: 3.2, sugar: 2, fiber: 4 },
  qareesh: { name: { en: 'Cottage cheese', ar: 'جبنة قريش' }, kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, sugar: 2.7, fiber: 0 },
  foul: { name: { en: 'Fava beans', ar: 'فول' }, kcal: 110, protein: 7.6, carbs: 19.6, fat: 0.4, sugar: 1.7, fiber: 5.4 },
  milk: { name: { en: 'Milk', ar: 'لبن' }, kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, sugar: 5, fiber: 0 },
  cheese: { name: { en: 'Cheese', ar: 'جبنة' }, kcal: 350, protein: 22, carbs: 1, fat: 28, sugar: 0.5, fiber: 0 },
  toast: { name: { en: 'Toast', ar: 'توست' }, kcal: 265, protein: 9, carbs: 49, fat: 3.2, sugar: 5, fiber: 3 },
  chicken: { name: { en: 'Grilled chicken', ar: 'فراخ مشوية' }, kcal: 190, protein: 29, carbs: 0, fat: 7.5, sugar: 0, fiber: 0 },
  meat: { name: { en: 'Meat', ar: 'لحمة' }, kcal: 250, protein: 26, carbs: 0, fat: 15, sugar: 0, fiber: 0 },
  rice: { name: { en: 'Cooked rice', ar: 'رز مطبوخ' }, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, sugar: 0, fiber: 0.4 },
  pasta: { name: { en: 'Cooked pasta', ar: 'مكرونة مطبوخة' }, kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, sugar: 0.6, fiber: 1.8 },
  fish: { name: { en: 'Fish', ar: 'سمك' }, kcal: 140, protein: 26, carbs: 0, fat: 3, sugar: 0, fiber: 0 },
  kofta: { name: { en: 'Kofta', ar: 'كفتة' }, kcal: 250, protein: 26, carbs: 2, fat: 15, sugar: 0, fiber: 0.5 },
  liver: { name: { en: 'Liver', ar: 'كبدة' }, kcal: 165, protein: 26, carbs: 4, fat: 4.4, sugar: 0, fiber: 0 },
  potatoOven: { name: { en: 'Oven potatoes', ar: 'بطاطس في الفرن' }, kcal: 110, protein: 2.5, carbs: 21, fat: 2, sugar: 1, fiber: 2 },
  potatoMash: { name: { en: 'Mashed potatoes', ar: 'بطاطس مهروسة' }, kcal: 113, protein: 2, carbs: 15, fat: 4.8, sugar: 1.5, fiber: 1.3 },
  banana: { name: { en: 'Banana', ar: 'موز' }, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, sugar: 12, fiber: 2.6 },
  peanuts: { name: { en: 'Peanuts', ar: 'سوداني' }, kcal: 567, protein: 26, carbs: 16, fat: 49, sugar: 4, fiber: 8.5 },
  orangeJuice: { name: { en: 'Orange juice', ar: 'عصير برتقال' }, kcal: 45, protein: 0.7, carbs: 10.4, fat: 0.2, sugar: 8.4, fiber: 0.2 },
  juice: { name: { en: 'Natural juice', ar: 'عصير طبيعي' }, kcal: 45, protein: 0.5, carbs: 11, fat: 0.2, sugar: 9, fiber: 0.2 },
  honey: { name: { en: 'Honey', ar: 'عسل' }, kcal: 304, protein: 0.3, carbs: 82, fat: 0, sugar: 82, fiber: 0 },
  peanutButter: { name: { en: 'Peanut butter', ar: 'زبدة فول سوداني' }, kcal: 588, protein: 25, carbs: 20, fat: 50, sugar: 9, fiber: 6 },
  yoghurt: { name: { en: 'Yoghurt', ar: 'زبادي' }, kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, sugar: 4.7, fiber: 0 },
  cornflakes: { name: { en: 'Cornflakes', ar: 'كورن فليكس' }, kcal: 357, protein: 7, carbs: 84, fat: 0.9, sugar: 8, fiber: 3 },
  apple: { name: { en: 'Apple', ar: 'تفاح' }, kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, sugar: 10, fiber: 2.4 },
  tuna: { name: { en: 'Tuna', ar: 'تونة' }, kcal: 132, protein: 28, carbs: 0, fat: 1, sugar: 0, fiber: 0 },
  salad: { name: { en: 'Salad', ar: 'سلطة' }, kcal: 20, protein: 1, carbs: 4, fat: 0.2, sugar: 2, fiber: 1.5 },
  veg: { name: { en: 'Vegetables', ar: 'خضار' }, kcal: 25, protein: 1.5, carbs: 5, fat: 0.2, sugar: 2.5, fiber: 2 },
};

const r1 = (v) => Math.round(v * 10) / 10;

/** The foods of one option, ready to write into the food log. */
export function optionItems(option) {
  return (option?.items || []).map(([key, grams]) => {
    const ref = PER100[key];
    const f = grams / 100;
    return {
      name: ref.name,
      grams,
      kcal: Math.round(ref.kcal * f),
      protein: r1(ref.protein * f),
      carbs: r1(ref.carbs * f),
      fat: r1(ref.fat * f),
      sugar: r1(ref.sugar * f),
      fiber: r1(ref.fiber * f),
    };
  });
}

/** The option's total calories (the sum of its foods). */
export const optionKcal = (option) => optionItems(option).reduce((sum, item) => sum + item.kcal, 0);

export const TRAINER_PLAN = {
  kcal: 2800,
  waterMl: 3000,
  meals: [
    {
      id: 'breakfast', icon: '🍳', name: { en: 'Breakfast', ar: 'الفطار' },
      options: [
        { ar: '3 بيضات + 120 جم عيش بلدي (رغيفان صغيران) + 50 جم جبنة قريش + خيار وطماطم', en: '3 eggs + 120 g baladi bread (2 small loaves) + 50 g cottage cheese + cucumber and tomato', items: [['egg', 150], ['baladi', 120], ['qareesh', 50], ['veg', 100]] },
        { ar: '200 جم فول (10 ملاعق كبيرة) + 2 بيضة + 90 جم عيش بلدي', en: '200 g fava beans (10 tablespoons) + 2 eggs + 90 g baladi bread', items: [['foul', 200], ['egg', 100], ['baladi', 90]] },
        { ar: '150 جم جبنة قريش + 120 جم عيش بلدي + موزة', en: '150 g cottage cheese + 120 g baladi bread + a banana', items: [['qareesh', 150], ['baladi', 120], ['banana', 120]] },
        { ar: '2 بيضة + 80 جم جبنة + 4 توست (120 جم) + كوب لبن 250 مل', en: '2 eggs + 80 g cheese + 4 toast slices (120 g) + a 250 ml glass of milk', items: [['egg', 100], ['cheese', 80], ['toast', 120], ['milk', 250]] },
      ],
    },
    {
      id: 'lunch', icon: '🍗', name: { en: 'Lunch', ar: 'الغداء' },
      options: [
        { ar: '200 جم فراخ مشوية + 300 جم رز مطبوخ (حوالي 20 ملعقة كبيرة) + سلطة', en: '200 g grilled chicken + 300 g cooked rice (about 20 tablespoons) + salad', items: [['chicken', 200], ['rice', 300], ['salad', 100]] },
        { ar: '180 جم لحمة + 300 جم مكرونة مطبوخة (حوالي 20 ملعقة) + سلطة', en: '180 g meat + 300 g cooked pasta (about 20 tablespoons) + salad', items: [['meat', 180], ['pasta', 300], ['salad', 100]] },
        { ar: '250 جم سمك + 300 جم رز مطبوخ + سلطة', en: '250 g fish + 300 g cooked rice + salad', items: [['fish', 250], ['rice', 300], ['salad', 100]] },
        { ar: '200 جم كفتة + 350 جم بطاطس في الفرن + سلطة', en: '200 g kofta + 350 g oven potatoes + salad', items: [['kofta', 200], ['potatoOven', 350], ['salad', 100]] },
        { ar: '200 جم كبدة + 300 جم رز + سلطة', en: '200 g liver + 300 g rice + salad', items: [['liver', 200], ['rice', 300], ['salad', 100]] },
        { ar: '200 جم فراخ + 350 جم بطاطس مهروسة + خضار', en: '200 g chicken + 350 g mashed potatoes + vegetables', items: [['chicken', 200], ['potatoMash', 350], ['veg', 100]] },
      ],
    },
    {
      id: 'snack', icon: '🥤', name: { en: 'Snack', ar: 'سناك' },
      options: [
        { ar: 'موزة 150 جم + 30 جم سوداني (3 ملاعق) + 250 مل عصير برتقال', en: 'A 150 g banana + 30 g peanuts (3 tablespoons) + 250 ml orange juice', items: [['banana', 150], ['peanuts', 30], ['orangeJuice', 250]] },
        { ar: '250 مل لبن + موزة + 20 جم عسل (ملعقة كبيرة)', en: '250 ml milk + a banana + 20 g honey (1 tablespoon)', items: [['milk', 250], ['banana', 120], ['honey', 20]] },
        { ar: '4 توست (120 جم) + 30 جم زبدة فول سوداني (ملعقتان) + عصير', en: '4 toast slices (120 g) + 30 g peanut butter (2 tablespoons) + juice', items: [['toast', 120], ['peanutButter', 30], ['juice', 250]] },
        { ar: '200 جم زبادي + 40 جم كورن فليكس + تفاحة', en: '200 g yoghurt + 40 g cornflakes + an apple', items: [['yoghurt', 200], ['cornflakes', 40], ['apple', 150]] },
        { ar: '100 جم جبنة قريش + 2 توست + كوب عصير طبيعي', en: '100 g cottage cheese + 2 toast slices + a glass of natural juice', items: [['qareesh', 100], ['toast', 60], ['juice', 250]] },
      ],
    },
    {
      id: 'dinner', icon: '🌙', name: { en: 'Dinner', ar: 'العشاء' },
      options: [
        { ar: '3 بيضات + 120 جم عيش بلدي + 50 جم جبنة قريش', en: '3 eggs + 120 g baladi bread + 50 g cottage cheese', items: [['egg', 150], ['baladi', 120], ['qareesh', 50]] },
        { ar: '150 جم جبنة قريش + 120 جم عيش بلدي + خضار', en: '150 g cottage cheese + 120 g baladi bread + vegetables', items: [['qareesh', 150], ['baladi', 120], ['veg', 100]] },
        { ar: 'علبة تونة مصفاة 140 جم + 120 جم عيش بلدي + سلطة', en: 'A drained 140 g tin of tuna + 120 g baladi bread + salad', items: [['tuna', 140], ['baladi', 120], ['salad', 100]] },
        { ar: '150 جم فراخ + 250 جم رز مطبوخ (حوالي 17 ملعقة)', en: '150 g chicken + 250 g cooked rice (about 17 tablespoons)', items: [['chicken', 150], ['rice', 250]] },
        { ar: '200 جم فول + 2 بيضة + 100 جم عيش بلدي', en: '200 g fava beans + 2 eggs + 100 g baladi bread', items: [['foul', 200], ['egg', 100], ['baladi', 100]] },
        { ar: '150 جم جبنة قريش + 300 جم بطاطس في الفرن + خضار', en: '150 g cottage cheese + 300 g oven potatoes + vegetables', items: [['qareesh', 150], ['potatoOven', 300], ['veg', 100]] },
      ],
    },
  ],
  rules: [
    { ar: 'اشرب 3 لتر ماء يومياً', en: 'Drink 3 litres of water a day' },
    { ar: 'العصير طبيعي بدون سكر إضافي', en: 'Juice is natural, with no added sugar' },
    { ar: 'وزن الرز والمكرونة بعد التسوية', en: 'Rice and pasta are weighed after cooking' },
    { ar: 'وزن اللحوم والفراخ بعد التسوية', en: 'Meat and chicken are weighed after cooking' },
    { ar: 'اختر وجبة واحدة من كل قسم', en: 'Choose one option from each meal' },
  ],
};
