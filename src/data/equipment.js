// The gym catalogue: every machine or tool, and the exercises done on it.
// The AI photo recognition answers with one of these ids, so a photo and a
// tap on the list lead to the same place.
//
// exercise: [id, English, Arabic, primary muscle, how-to English, how-to Arabic, unit?]
// unit: 'kg' (default) | 'bw' body weight (reps only) | 'time' (seconds) | 'cardio' (minutes + distance)
const ex = ([id, en, ar, muscle, howEn, howAr, unit = 'kg']) => ({
  id, name: { en, ar }, muscle, how: { en: howEn, ar: howAr }, unit,
});

export const MUSCLES = {
  chest: { en: 'Chest', ar: 'الصدر' },
  back: { en: 'Back', ar: 'الظهر' },
  shoulders: { en: 'Shoulders', ar: 'الأكتاف' },
  biceps: { en: 'Biceps', ar: 'العضلة ذات الرأسين' },
  triceps: { en: 'Triceps', ar: 'العضلة ثلاثية الرؤوس' },
  legs: { en: 'Legs', ar: 'الأرجل' },
  glutes: { en: 'Glutes', ar: 'الأرداف' },
  core: { en: 'Core', ar: 'عضلات البطن' },
  cardio: { en: 'Cardio', ar: 'اللياقة القلبية' },
};

export const EQUIPMENT = [
  {
    id: 'treadmill', icon: '🏃', name: { en: 'Treadmill', ar: 'جهاز المشي' },
    exercises: [
      ['treadmill_walk', 'Incline walk', 'مشي بميل', 'cardio', 'Walk at a brisk pace on a 5-10% incline. Stand tall and do not hold the rails.', 'امشِ بسرعة نشطة على ميل 5-10٪. قف منتصباً ولا تمسك المقابض.', 'cardio'],
      ['treadmill_run', 'Run', 'جري', 'cardio', 'Run at a pace where you can still say a short sentence. Land softly under your hips.', 'اجرِ بسرعة تستطيع معها قول جملة قصيرة. انزل بقدمك برفق تحت الورك.', 'cardio'],
      ['treadmill_intervals', 'Intervals', 'تمرين متقطع', 'cardio', '1 minute fast, 2 minutes easy. Repeat 6-8 times.', 'دقيقة سريعة ثم دقيقتان خفيفتان. كرر 6-8 مرات.', 'cardio'],
    ],
  },
  {
    id: 'bike', icon: '🚴', name: { en: 'Stationary bike', ar: 'الدراجة الثابتة' },
    exercises: [
      ['bike_steady', 'Steady ride', 'ركوب ثابت', 'cardio', 'Set the seat at hip height. Keep a steady effort you could hold for 30 minutes.', 'اضبط المقعد عند مستوى الورك. حافظ على مجهود ثابت تستطيع تحمله 30 دقيقة.', 'cardio'],
      ['bike_intervals', 'Bike intervals', 'دراجة متقطعة', 'cardio', '30 seconds hard, 90 seconds easy. Repeat 8 times.', '30 ثانية بقوة ثم 90 ثانية خفيفة. كرر 8 مرات.', 'cardio'],
    ],
  },
  {
    id: 'elliptical', icon: '⛷️', name: { en: 'Elliptical', ar: 'الإليبتيكال' },
    exercises: [
      ['elliptical', 'Elliptical', 'إليبتيكال', 'cardio', 'Push and pull the handles, keep your heels down and your chest up.', 'ادفع واسحب المقابض، أبقِ كعبيك على الدواسة وصدرك مرفوعاً.', 'cardio'],
    ],
  },
  {
    id: 'rower', icon: '🚣', name: { en: 'Rowing machine', ar: 'جهاز التجديف' },
    exercises: [
      ['row_erg', 'Rowing', 'تجديف', 'cardio', 'Legs first, then lean back, then pull the handle to the lower ribs. Return in the reverse order.', 'ادفع بالرجلين أولاً، ثم مِل للخلف، ثم اسحب المقبض إلى أسفل الأضلاع. ارجع بالترتيب العكسي.', 'cardio'],
    ],
  },
  {
    id: 'stairs', icon: '🪜', name: { en: 'Stair climber', ar: 'جهاز السلالم' },
    exercises: [
      ['stairs', 'Stair climb', 'صعود السلالم', 'cardio', 'Step with the whole foot, stay upright and rest your hands lightly on the rails.', 'اصعد بكامل القدم، ابقَ منتصباً وضع يديك برفق على المقابض.', 'cardio'],
    ],
  },
  {
    id: 'bench', icon: '🏋️', name: { en: 'Bench and barbell', ar: 'البنش والبار' },
    exercises: [
      ['bench_press', 'Bench press', 'ضغط الصدر بالبار', 'chest', 'Feet flat, shoulder blades squeezed. Lower the bar to mid-chest, then press up without bouncing.', 'ثبّت قدميك وضمّ لوحي الكتف. أنزل البار إلى منتصف الصدر ثم ادفعه دون ارتداد.'],
      ['incline_bench', 'Incline bench press', 'ضغط صدر مائل', 'chest', 'Bench at 30-45°. Lower the bar to the upper chest and press straight up.', 'اضبط البنش على 30-45°. أنزل البار إلى أعلى الصدر وادفعه للأعلى.'],
      ['skull_crusher', 'Skull crusher', 'تمديد الترايسبس مستلقياً', 'triceps', 'Upper arms still and vertical. Bend the elbows to bring the bar to the forehead, then extend.', 'ثبّت العضدين عمودياً. اثنِ المرفقين لإنزال البار نحو الجبهة ثم مدّهما.'],
    ],
  },
  {
    id: 'rack', icon: '🏗️', name: { en: 'Squat rack', ar: 'قفص السكوات' },
    exercises: [
      ['squat', 'Back squat', 'سكوات بالبار', 'legs', 'Bar on the upper back, feet shoulder-width. Sit down and back until thighs are parallel, knees over toes, then drive up.', 'البار على أعلى الظهر والقدمان بعرض الكتفين. انزل حتى يوازي الفخذان الأرض والركبتان فوق الأصابع ثم ادفع للأعلى.'],
      ['deadlift', 'Deadlift', 'الرفعة الميتة', 'back', 'Bar over mid-foot, flat back. Push the floor away and stand tall; lower with control.', 'البار فوق منتصف القدم والظهر مستقيم. ادفع الأرض وقف منتصباً ثم أنزل بتحكم.'],
      ['ohp', 'Overhead press', 'ضغط الأكتاف واقفاً', 'shoulders', 'Bar at the collarbone, squeeze the glutes. Press straight overhead and bring the head through.', 'البار عند الترقوة مع شدّ الأرداف. ادفع البار فوق الرأس مباشرة.'],
      ['barbell_row', 'Barbell row', 'تجديف بالبار', 'back', 'Hinge forward with a flat back. Pull the bar to the lower ribs and lower slowly.', 'انحنِ للأمام بظهر مستقيم. اسحب البار إلى أسفل الأضلاع وأنزله ببطء.'],
      ['hip_thrust', 'Hip thrust', 'رفع الحوض', 'glutes', 'Upper back on a bench, bar over the hips. Drive the hips up until the body is level and squeeze.', 'أعلى الظهر على البنش والبار فوق الحوض. ارفع الحوض حتى يستوي الجسم واضغط.'],
    ],
  },
  {
    id: 'dumbbells', icon: '🏋️‍♂️', name: { en: 'Dumbbells', ar: 'الدمبلز' },
    exercises: [
      ['db_press', 'Dumbbell press', 'ضغط صدر بالدمبل', 'chest', 'Lie on a bench, press both dumbbells up over the chest and lower until the elbows pass the bench line.', 'استلقِ على البنش وادفع الدمبلين فوق الصدر ثم أنزلهما حتى يتجاوز المرفقان مستوى البنش.'],
      ['db_row', 'One-arm row', 'تجديف بذراع واحدة', 'back', 'One hand and knee on the bench. Pull the dumbbell to the hip, elbow close to the body.', 'ضع يداً وركبة على البنش. اسحب الدمبل نحو الورك والمرفق قريب من الجسم.'],
      ['db_shoulder', 'Shoulder press', 'ضغط أكتاف بالدمبل', 'shoulders', 'Seated, dumbbells at ear height. Press up until the arms are straight, lower with control.', 'اجلس والدمبلان عند مستوى الأذن. ادفعهما حتى تستقيم الذراعان ثم أنزل بتحكم.'],
      ['lateral_raise', 'Lateral raise', 'رفع جانبي', 'shoulders', 'Slight bend in the elbows. Raise the arms out to shoulder height, lower slowly.', 'اثنِ المرفقين قليلاً. ارفع الذراعين جانباً حتى مستوى الكتف وأنزل ببطء.'],
      ['db_curl', 'Biceps curl', 'تمرين البايسبس', 'biceps', 'Elbows pinned to the sides. Curl up, squeeze, and lower all the way.', 'ثبّت المرفقين بجانب الجسم. ارفع الدمبل، اضغط، ثم أنزل كاملاً.'],
      ['hammer_curl', 'Hammer curl', 'بايسبس مطرقة', 'biceps', 'Palms facing each other. Curl without swinging the body.', 'راحتا اليدين متقابلتان. ارفع دون تأرجح الجسم.'],
      ['db_triceps', 'Overhead triceps extension', 'ترايسبس خلف الرأس', 'triceps', 'Hold one dumbbell overhead with both hands. Lower it behind the head and extend.', 'أمسك دمبلاً فوق الرأس بكلتا اليدين. أنزله خلف الرأس ثم مدّ الذراعين.'],
      ['goblet_squat', 'Goblet squat', 'سكوات الكأس', 'legs', 'Hold a dumbbell at the chest. Squat between the knees, chest up.', 'أمسك دمبلاً عند الصدر. انزل بين الركبتين والصدر مرفوع.'],
      ['lunge', 'Lunge', 'الطعن', 'legs', 'Step forward and lower until both knees are at 90°. Push back through the front heel.', 'اخطُ للأمام وانزل حتى تصبح الركبتان بزاوية 90°. ادفع بكعب القدم الأمامية للعودة.'],
      ['rdl', 'Romanian deadlift', 'الرفعة الرومانية', 'glutes', 'Soft knees, push the hips back and slide the weights down the thighs until the hamstrings stretch.', 'اثنِ الركبتين قليلاً وادفع الحوض للخلف مع إنزال الوزن على الفخذين حتى تشعر بشد خلفي.'],
    ],
  },
  {
    id: 'kettlebell', icon: '🔔', name: { en: 'Kettlebell', ar: 'الكيتل بل' },
    exercises: [
      ['kb_swing', 'Kettlebell swing', 'أرجحة الكيتل بل', 'glutes', 'Hinge at the hips and snap them forward to swing the bell to chest height. Arms stay loose.', 'انحنِ من الحوض ثم ادفعه للأمام بقوة لترجّح الوزن حتى مستوى الصدر. الذراعان مرتخيتان.'],
      ['kb_carry', 'Farmer carry', 'مشي المزارع', 'core', 'Walk tall with a bell in each hand, shoulders back. Record the seconds.', 'امشِ منتصباً حاملاً وزناً في كل يد والكتفان للخلف. سجّل الثواني.', 'time'],
    ],
  },
  {
    id: 'smith', icon: '🛤️', name: { en: 'Smith machine', ar: 'جهاز سميث' },
    exercises: [
      ['smith_squat', 'Smith squat', 'سكوات سميث', 'legs', 'Feet slightly ahead of the bar. Lower until thighs are parallel and push up.', 'القدمان أمام البار قليلاً. انزل حتى يوازي الفخذان الأرض وادفع.'],
      ['smith_bench', 'Smith bench press', 'ضغط صدر سميث', 'chest', 'Bench centred under the bar. Lower to mid-chest and press.', 'ضع البنش تحت البار في المنتصف. أنزل إلى منتصف الصدر وادفع.'],
    ],
  },
  {
    id: 'chest_press', icon: '💪', name: { en: 'Chest press machine', ar: 'جهاز ضغط الصدر' },
    exercises: [
      ['machine_chest_press', 'Machine chest press', 'ضغط الصدر بالجهاز', 'chest', 'Handles at mid-chest height. Press forward without locking the elbows, return slowly.', 'اضبط المقابض عند منتصف الصدر. ادفع للأمام دون قفل المرفقين وارجع ببطء.'],
    ],
  },
  {
    id: 'pec_deck', icon: '🦋', name: { en: 'Pec deck / fly machine', ar: 'جهاز الفراشة' },
    exercises: [
      ['pec_fly', 'Machine fly', 'تفتيح الصدر بالجهاز', 'chest', 'Slight bend in the elbows. Bring the handles together in front of the chest and open slowly.', 'اثنِ المرفقين قليلاً. ضمّ المقبضين أمام الصدر وافتح ببطء.'],
      ['rear_delt_fly', 'Reverse fly', 'فراشة عكسية', 'shoulders', 'Face the pad. Pull the handles back in a wide arc, squeezing the shoulder blades.', 'واجه المسند. اسحب المقبضين للخلف في قوس واسع مع ضم لوحي الكتف.'],
    ],
  },
  {
    id: 'lat_pulldown', icon: '⬇️', name: { en: 'Lat pulldown', ar: 'جهاز السحب العلوي' },
    exercises: [
      ['lat_pulldown', 'Lat pulldown', 'سحب علوي', 'back', 'Grip wider than the shoulders. Pull the bar to the upper chest, elbows down, then return fully.', 'أمسك البار أوسع من الكتفين. اسحبه إلى أعلى الصدر والمرفقان للأسفل ثم ارجع كاملاً.'],
      ['close_pulldown', 'Close-grip pulldown', 'سحب علوي ضيق', 'back', 'Narrow handle, lean back a little and pull to the chest.', 'بمقبض ضيق، مِل للخلف قليلاً واسحب إلى الصدر.'],
    ],
  },
  {
    id: 'seated_row', icon: '↔️', name: { en: 'Seated row', ar: 'جهاز التجديف جالساً' },
    exercises: [
      ['seated_row', 'Seated cable row', 'تجديف جالساً', 'back', 'Sit tall. Pull the handle to the stomach, squeeze the shoulder blades, return with straight arms.', 'اجلس منتصباً. اسحب المقبض إلى البطن وضمّ لوحي الكتف ثم ارجع بذراعين ممدودتين.'],
    ],
  },
  {
    id: 'cable', icon: '🔗', name: { en: 'Cable machine', ar: 'جهاز الكيبل' },
    exercises: [
      ['triceps_pushdown', 'Triceps pushdown', 'ترايسبس بالكيبل', 'triceps', 'Elbows at the sides. Push the bar down until the arms are straight, return to 90°.', 'ثبّت المرفقين بالجانبين. ادفع البار حتى تستقيم الذراعان ثم ارجع إلى 90°.'],
      ['cable_curl', 'Cable curl', 'بايسبس بالكيبل', 'biceps', 'Low pulley. Curl the bar up with still elbows.', 'من البكرة السفلية، ارفع البار مع ثبات المرفقين.'],
      ['cable_fly', 'Cable crossover', 'تفتيح بالكيبل', 'chest', 'High pulleys. Step forward and bring the hands together in front of the hips.', 'من البكرتين العلويتين، تقدم خطوة وضمّ اليدين أمام الحوض.'],
      ['face_pull', 'Face pull', 'سحب للوجه', 'shoulders', 'Rope at face height. Pull towards the eyes with elbows high.', 'الحبل عند مستوى الوجه. اسحبه نحو العينين والمرفقان مرفوعان.'],
      ['cable_crunch', 'Cable crunch', 'طحن البطن بالكيبل', 'core', 'Kneel under the pulley, rope beside the head. Curl the ribs towards the hips.', 'اجثُ تحت البكرة والحبل بجانب الرأس. اثنِ الأضلاع نحو الحوض.'],
    ],
  },
  {
    id: 'shoulder_press', icon: '🙆', name: { en: 'Shoulder press machine', ar: 'جهاز ضغط الأكتاف' },
    exercises: [
      ['machine_shoulder_press', 'Machine shoulder press', 'ضغط الأكتاف بالجهاز', 'shoulders', 'Handles at shoulder height. Press up without arching the back.', 'المقابض عند مستوى الكتف. ادفع للأعلى دون تقويس الظهر.'],
    ],
  },
  {
    id: 'leg_press', icon: '🦵', name: { en: 'Leg press', ar: 'جهاز ضغط الأرجل' },
    exercises: [
      ['leg_press', 'Leg press', 'ضغط الأرجل', 'legs', 'Feet shoulder-width on the plate. Lower until the knees are at 90° and push without locking them.', 'القدمان بعرض الكتفين على اللوح. انزل حتى زاوية 90° وادفع دون قفل الركبتين.'],
      ['calf_press', 'Calf press', 'ضغط السمانة', 'legs', 'Balls of the feet on the edge of the plate. Push with the ankles only.', 'ضع مقدمة القدم على حافة اللوح. ادفع بالكاحلين فقط.'],
    ],
  },
  {
    id: 'leg_extension', icon: '🦿', name: { en: 'Leg extension', ar: 'جهاز تمديد الأرجل' },
    exercises: [
      ['leg_extension', 'Leg extension', 'تمديد الأرجل', 'legs', 'Pad on the lower shin. Straighten the knees, pause, lower slowly.', 'المسند على أسفل الساق. مدّ الركبتين، توقف لحظة، ثم أنزل ببطء.'],
    ],
  },
  {
    id: 'leg_curl', icon: '🦵', name: { en: 'Leg curl', ar: 'جهاز ثني الأرجل' },
    exercises: [
      ['leg_curl', 'Leg curl', 'ثني الأرجل', 'legs', 'Pad above the heels. Curl the heels towards the glutes and return with control.', 'المسند فوق الكعبين. اثنِ الكعبين نحو الأرداف وارجع بتحكم.'],
    ],
  },
  {
    id: 'hip_machine', icon: '🍑', name: { en: 'Hip abductor / adductor', ar: 'جهاز فتح وضم الفخذين' },
    exercises: [
      ['hip_abduction', 'Hip abduction', 'فتح الفخذين', 'glutes', 'Push the knees out against the pads, pause, return slowly.', 'ادفع الركبتين للخارج ضد المسندين، توقف، وارجع ببطء.'],
      ['hip_adduction', 'Hip adduction', 'ضم الفخذين', 'legs', 'Squeeze the knees together against the pads, return slowly.', 'ضمّ الركبتين ضد المسندين وارجع ببطء.'],
    ],
  },
  {
    id: 'pullup_bar', icon: '🧗', name: { en: 'Pull-up / dip station', ar: 'العقلة والمتوازي' },
    exercises: [
      ['pullup', 'Pull-up', 'العقلة', 'back', 'Hang with straight arms. Pull until the chin passes the bar, lower all the way.', 'تعلّق بذراعين ممدودتين. اسحب حتى يتجاوز الذقن البار ثم انزل كاملاً.', 'bw'],
      ['chinup', 'Chin-up', 'عقلة بقبضة معكوسة', 'biceps', 'Palms facing you, shoulder-width. Pull the chest to the bar.', 'راحتا اليدين نحوك بعرض الكتفين. اسحب الصدر نحو البار.', 'bw'],
      ['dip', 'Dip', 'المتوازي', 'triceps', 'Lower until the shoulders are just below the elbows, press back up.', 'انزل حتى يصبح الكتفان أسفل المرفقين قليلاً ثم ادفع للأعلى.', 'bw'],
      ['hanging_leg_raise', 'Hanging leg raise', 'رفع الأرجل معلّقاً', 'core', 'Hang from the bar and raise the legs to hip height without swinging.', 'تعلّق بالبار وارفع الرجلين إلى مستوى الحوض دون تأرجح.', 'bw'],
    ],
  },
  {
    id: 'bodyweight', icon: '🤸', name: { en: 'Body weight / mat', ar: 'وزن الجسم والبساط' },
    exercises: [
      ['pushup', 'Push-up', 'الضغط', 'chest', 'Body in one line. Lower the chest to the floor, elbows at 45°, push up.', 'الجسم في خط واحد. أنزل الصدر إلى الأرض والمرفقان بزاوية 45° ثم ادفع.', 'bw'],
      ['plank', 'Plank', 'البلانك', 'core', 'Elbows under shoulders, body straight, glutes tight. Record the seconds.', 'المرفقان تحت الكتفين والجسم مستقيم مع شد الأرداف. سجّل الثواني.', 'time'],
      ['crunch', 'Crunch', 'تمرين البطن', 'core', 'Lower back on the floor. Lift the shoulder blades and lower slowly.', 'أسفل الظهر على الأرض. ارفع لوحي الكتف وأنزل ببطء.', 'bw'],
      ['bw_squat', 'Body-weight squat', 'سكوات بوزن الجسم', 'legs', 'Arms forward, sit back and down, stand up fully.', 'مدّ الذراعين للأمام، انزل للخلف والأسفل، ثم قف كاملاً.', 'bw'],
      ['burpee', 'Burpee', 'بيربي', 'cardio', 'Squat, jump the feet back, push-up, jump the feet in and jump up.', 'انزل قرفصاء، اقفز بالقدمين للخلف، اضغط، اقفز بالقدمين للأمام ثم اقفز للأعلى.', 'bw'],
    ],
  },
  {
    id: 'bands', icon: '🎗️', name: { en: 'Resistance bands', ar: 'أحزمة المقاومة' },
    exercises: [
      ['band_pull_apart', 'Band pull-apart', 'شد الحزام', 'shoulders', 'Arms straight in front. Pull the band apart to the chest.', 'مدّ الذراعين أمامك. شدّ الحزام حتى يلامس الصدر.', 'bw'],
      ['band_row', 'Band row', 'تجديف بالحزام', 'back', 'Anchor the band, pull the hands to the ribs.', 'ثبّت الحزام واسحب اليدين إلى الأضلاع.', 'bw'],
    ],
  },
].map((e) => ({ ...e, exercises: e.exercises.map(ex) }));

export const EXERCISES = Object.fromEntries(
  EQUIPMENT.flatMap((e) => e.exercises.map((x) => [x.id, { ...x, equipment: e.id }])),
);

export const equipmentById = (id) => EQUIPMENT.find((e) => e.id === id);

// Ready-made weekly programmes. Each day is a list of exercise ids.
export const PROGRAMS = [
  {
    id: 'full3', name: { en: 'Full body · 3 days', ar: 'الجسم كامل · 3 أيام' },
    about: { en: 'Best start for beginners: every muscle three times a week.', ar: 'أفضل بداية للمبتدئين: كل عضلة ثلاث مرات أسبوعياً.' },
    days: [
      { name: { en: 'Day A', ar: 'اليوم أ' }, exercises: ['leg_press', 'machine_chest_press', 'lat_pulldown', 'machine_shoulder_press', 'plank'] },
      { name: { en: 'Day B', ar: 'اليوم ب' }, exercises: ['goblet_squat', 'db_press', 'seated_row', 'lateral_raise', 'crunch'] },
      { name: { en: 'Day C', ar: 'اليوم ج' }, exercises: ['rdl', 'pushup', 'db_row', 'db_curl', 'triceps_pushdown'] },
    ],
  },
  {
    id: 'ul4', name: { en: 'Upper / lower · 4 days', ar: 'علوي / سفلي · 4 أيام' },
    about: { en: 'Two upper-body and two lower-body days.', ar: 'يومان للجزء العلوي ويومان للسفلي.' },
    days: [
      { name: { en: 'Upper 1', ar: 'علوي 1' }, exercises: ['bench_press', 'lat_pulldown', 'db_shoulder', 'seated_row', 'triceps_pushdown', 'db_curl'] },
      { name: { en: 'Lower 1', ar: 'سفلي 1' }, exercises: ['squat', 'leg_curl', 'leg_extension', 'calf_press', 'plank'] },
      { name: { en: 'Upper 2', ar: 'علوي 2' }, exercises: ['incline_bench', 'db_row', 'lateral_raise', 'pec_fly', 'face_pull', 'hammer_curl'] },
      { name: { en: 'Lower 2', ar: 'سفلي 2' }, exercises: ['deadlift', 'leg_press', 'lunge', 'hip_abduction', 'cable_crunch'] },
    ],
  },
  {
    id: 'ppl', name: { en: 'Push / pull / legs', ar: 'دفع / سحب / أرجل' },
    about: { en: 'Three days, or repeat twice for six.', ar: 'ثلاثة أيام، أو كررها مرتين لستة أيام.' },
    days: [
      { name: { en: 'Push', ar: 'دفع' }, exercises: ['bench_press', 'db_shoulder', 'incline_bench', 'lateral_raise', 'triceps_pushdown', 'dip'] },
      { name: { en: 'Pull', ar: 'سحب' }, exercises: ['lat_pulldown', 'barbell_row', 'seated_row', 'face_pull', 'db_curl', 'hammer_curl'] },
      { name: { en: 'Legs', ar: 'أرجل' }, exercises: ['squat', 'rdl', 'leg_press', 'leg_curl', 'calf_press', 'hanging_leg_raise'] },
    ],
  },
  {
    id: 'home', name: { en: 'Home · no equipment', ar: 'المنزل · بدون أجهزة' },
    about: { en: 'Body weight only, 25 minutes.', ar: 'بوزن الجسم فقط، 25 دقيقة.' },
    days: [
      { name: { en: 'Circuit', ar: 'دائرة' }, exercises: ['bw_squat', 'pushup', 'lunge', 'plank', 'crunch', 'burpee'] },
    ],
  },
];
