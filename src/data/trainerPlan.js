// The diet table set by Qusay's trainer (given 2026-11-23): gain weight as
// muscle mass on 2,800 kcal a day, four home meals, one option chosen from
// each meal. The Arabic is the trainer's own wording; the English is a
// faithful translation. Weights of rice, pasta, meat and chicken are after
// cooking, as the trainer's rules say.
export const TRAINER_PLAN = {
  kcal: 2800,
  waterMl: 3000,
  meals: [
    {
      id: 'breakfast', icon: '🍳', name: { en: 'Breakfast', ar: 'الفطار' },
      options: [
        { ar: '3 بيضات + 120 جم عيش بلدي (رغيفان صغيران) + 50 جم جبنة قريش + خيار وطماطم', en: '3 eggs + 120 g baladi bread (2 small loaves) + 50 g cottage cheese + cucumber and tomato' },
        { ar: '200 جم فول (10 ملاعق كبيرة) + 2 بيضة + 90 جم عيش بلدي', en: '200 g fava beans (10 tablespoons) + 2 eggs + 90 g baladi bread' },
        { ar: '150 جم جبنة قريش + 120 جم عيش بلدي + موزة', en: '150 g cottage cheese + 120 g baladi bread + a banana' },
        { ar: '2 بيضة + 80 جم جبنة + 4 توست (120 جم) + كوب لبن 250 مل', en: '2 eggs + 80 g cheese + 4 toast slices (120 g) + a 250 ml glass of milk' },
      ],
    },
    {
      id: 'lunch', icon: '🍗', name: { en: 'Lunch', ar: 'الغداء' },
      options: [
        { ar: '200 جم فراخ مشوية + 300 جم رز مطبوخ (حوالي 20 ملعقة كبيرة) + سلطة', en: '200 g grilled chicken + 300 g cooked rice (about 20 tablespoons) + salad' },
        { ar: '180 جم لحمة + 300 جم مكرونة مطبوخة (حوالي 20 ملعقة) + سلطة', en: '180 g meat + 300 g cooked pasta (about 20 tablespoons) + salad' },
        { ar: '250 جم سمك + 300 جم رز مطبوخ + سلطة', en: '250 g fish + 300 g cooked rice + salad' },
        { ar: '200 جم كفتة + 350 جم بطاطس في الفرن + سلطة', en: '200 g kofta + 350 g oven potatoes + salad' },
        { ar: '200 جم كبدة + 300 جم رز + سلطة', en: '200 g liver + 300 g rice + salad' },
        { ar: '200 جم فراخ + 350 جم بطاطس مهروسة + خضار', en: '200 g chicken + 350 g mashed potatoes + vegetables' },
      ],
    },
    {
      id: 'snack', icon: '🥤', name: { en: 'Snack', ar: 'سناك' },
      options: [
        { ar: 'موزة 150 جم + 30 جم سوداني (3 ملاعق) + 250 مل عصير برتقال', en: 'A 150 g banana + 30 g peanuts (3 tablespoons) + 250 ml orange juice' },
        { ar: '250 مل لبن + موزة + 20 جم عسل (ملعقة كبيرة)', en: '250 ml milk + a banana + 20 g honey (1 tablespoon)' },
        { ar: '4 توست (120 جم) + 30 جم زبدة فول سوداني (ملعقتان) + عصير', en: '4 toast slices (120 g) + 30 g peanut butter (2 tablespoons) + juice' },
        { ar: '200 جم زبادي + 40 جم كورن فليكس + تفاحة', en: '200 g yoghurt + 40 g cornflakes + an apple' },
        { ar: '100 جم جبنة قريش + 2 توست + كوب عصير طبيعي', en: '100 g cottage cheese + 2 toast slices + a glass of natural juice' },
      ],
    },
    {
      id: 'dinner', icon: '🌙', name: { en: 'Dinner', ar: 'العشاء' },
      options: [
        { ar: '3 بيضات + 120 جم عيش بلدي + 50 جم جبنة قريش', en: '3 eggs + 120 g baladi bread + 50 g cottage cheese' },
        { ar: '150 جم جبنة قريش + 120 جم عيش بلدي + خضار', en: '150 g cottage cheese + 120 g baladi bread + vegetables' },
        { ar: 'علبة تونة مصفاة 140 جم + 120 جم عيش بلدي + سلطة', en: 'A drained 140 g tin of tuna + 120 g baladi bread + salad' },
        { ar: '150 جم فراخ + 250 جم رز مطبوخ (حوالي 17 ملعقة)', en: '150 g chicken + 250 g cooked rice (about 17 tablespoons)' },
        { ar: '200 جم فول + 2 بيضة + 100 جم عيش بلدي', en: '200 g fava beans + 2 eggs + 100 g baladi bread' },
        { ar: '150 جم جبنة قريش + 300 جم بطاطس في الفرن + خضار', en: '150 g cottage cheese + 300 g oven potatoes + vegetables' },
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
