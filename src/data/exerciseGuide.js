// What each exercise works, exactly, and how it moves. Muscle regions are
// drawn on the body map (MuscleMap); motions are the animated figures
// (ExerciseMotion). Photos are of Qusay's own gym (public/gym).

export const REGIONS = {
  chest: { en: 'Chest (pectoralis major)', ar: 'الصدر (العضلة الصدرية الكبرى)' },
  front_delt: { en: 'Front of the shoulder', ar: 'مقدمة الكتف' },
  side_delt: { en: 'Side of the shoulder', ar: 'جانب الكتف' },
  rear_delt: { en: 'Back of the shoulder', ar: 'خلفية الكتف' },
  biceps: { en: 'Biceps', ar: 'العضلة ذات الرأسين (البايسبس)' },
  triceps: { en: 'Triceps', ar: 'العضلة ثلاثية الرؤوس (الترايسبس)' },
  forearms: { en: 'Forearms and grip', ar: 'الساعد والقبضة' },
  abs: { en: 'Abs (rectus abdominis)', ar: 'عضلات البطن المستقيمة' },
  obliques: { en: 'Obliques (sides of the waist)', ar: 'الخواصر (العضلات المائلة)' },
  lats: { en: 'Lats (latissimus dorsi)', ar: 'الظهر العريضة (المجنص)' },
  traps: { en: 'Traps (trapezius)', ar: 'شبه المنحرفة (الترابيس)' },
  mid_back: { en: 'Middle back (rhomboids)', ar: 'وسط الظهر (المعينية)' },
  lower_back: { en: 'Lower back (spinal erectors)', ar: 'أسفل الظهر (ناصبات الفقار)' },
  glutes: { en: 'Glutes', ar: 'الأرداف (الألوية)' },
  quads: { en: 'Front of the thigh (quadriceps)', ar: 'الفخذ الأمامية (الرباعية)' },
  hamstrings: { en: 'Back of the thigh (hamstrings)', ar: 'الفخذ الخلفية' },
  adductors: { en: 'Inner thigh (adductors)', ar: 'الفخذ الداخلية (المقربة)' },
  abductors: { en: 'Outer hip (abductors)', ar: 'الورك الخارجي (المبعدة)' },
  calves: { en: 'Calves', ar: 'السمانة (بطة الساق)' },
  heart: { en: 'Heart and lungs', ar: 'القلب والرئتان' },
};

// exercise id: [main muscles, helping muscles, motion]
const T = {
  treadmill_walk: [['heart', 'quads', 'glutes'], ['calves', 'hamstrings'], 'walk'],
  treadmill_run: [['heart', 'quads', 'glutes'], ['calves', 'hamstrings'], 'run'],
  treadmill_intervals: [['heart', 'quads', 'glutes'], ['calves', 'hamstrings'], 'run'],
  bike_steady: [['heart', 'quads'], ['glutes', 'calves', 'hamstrings'], 'bike'],
  bike_intervals: [['heart', 'quads'], ['glutes', 'calves', 'hamstrings'], 'bike'],
  elliptical: [['heart', 'quads', 'glutes'], ['hamstrings', 'chest', 'lats'], 'walk'],
  row_erg: [['heart', 'lats', 'mid_back', 'quads'], ['biceps', 'glutes', 'hamstrings'], 'rowErg'],
  stairs: [['heart', 'glutes', 'quads'], ['calves', 'hamstrings'], 'walk'],
  bench_press: [['chest'], ['front_delt', 'triceps'], 'benchPress'],
  incline_bench: [['chest', 'front_delt'], ['triceps'], 'benchPress'],
  skull_crusher: [['triceps'], [], 'skull'],
  squat: [['quads', 'glutes'], ['hamstrings', 'lower_back', 'abs', 'adductors'], 'squat'],
  deadlift: [['glutes', 'hamstrings', 'lower_back'], ['quads', 'traps', 'forearms', 'lats'], 'hinge'],
  ohp: [['front_delt', 'side_delt', 'triceps'], ['traps', 'abs'], 'pressUp'],
  barbell_row: [['lats', 'mid_back'], ['rear_delt', 'biceps', 'lower_back'], 'bentRow'],
  hip_thrust: [['glutes'], ['hamstrings', 'quads'], 'hipThrust'],
  db_press: [['chest'], ['front_delt', 'triceps'], 'benchPress'],
  db_row: [['lats', 'mid_back'], ['rear_delt', 'biceps'], 'bentRow'],
  db_shoulder: [['front_delt', 'side_delt'], ['triceps', 'traps'], 'pressUp'],
  lateral_raise: [['side_delt'], ['traps', 'front_delt'], 'lateral'],
  db_curl: [['biceps'], ['forearms'], 'curl'],
  hammer_curl: [['biceps', 'forearms'], [], 'curl'],
  db_triceps: [['triceps'], [], 'overheadExt'],
  goblet_squat: [['quads', 'glutes'], ['adductors', 'abs'], 'squat'],
  lunge: [['quads', 'glutes'], ['hamstrings', 'adductors', 'calves'], 'lunge'],
  rdl: [['hamstrings', 'glutes'], ['lower_back', 'forearms'], 'hinge'],
  kb_swing: [['glutes', 'hamstrings'], ['lower_back', 'abs', 'front_delt'], 'hinge'],
  kb_carry: [['forearms', 'traps', 'abs'], ['obliques', 'glutes'], 'walk'],
  smith_squat: [['quads', 'glutes'], ['hamstrings'], 'squat'],
  smith_bench: [['chest'], ['front_delt', 'triceps'], 'benchPress'],
  machine_chest_press: [['chest'], ['front_delt', 'triceps'], 'chestPress'],
  pec_fly: [['chest'], ['front_delt'], 'fly'],
  rear_delt_fly: [['rear_delt', 'mid_back'], ['traps'], 'reverseFly'],
  lat_pulldown: [['lats'], ['biceps', 'mid_back', 'rear_delt'], 'pulldown'],
  close_pulldown: [['lats'], ['biceps', 'mid_back'], 'pulldown'],
  seated_row: [['mid_back', 'lats'], ['rear_delt', 'biceps', 'traps'], 'seatedRow'],
  tbar_row: [['lats', 'mid_back'], ['rear_delt', 'biceps', 'traps', 'lower_back'], 'tbarRow'],
  triceps_pushdown: [['triceps'], [], 'pushdown'],
  cable_curl: [['biceps'], ['forearms'], 'curl'],
  cable_fly: [['chest'], ['front_delt'], 'fly'],
  face_pull: [['rear_delt', 'mid_back'], ['traps', 'side_delt'], 'seatedRow'],
  cable_crunch: [['abs'], ['obliques'], 'crunch'],
  machine_shoulder_press: [['front_delt', 'side_delt'], ['triceps'], 'pressUp'],
  leg_press: [['quads', 'glutes'], ['hamstrings', 'adductors'], 'legPress'],
  calf_press: [['calves'], [], 'calf'],
  leg_extension: [['quads'], [], 'legExt'],
  leg_curl: [['hamstrings'], ['calves'], 'legCurl'],
  hip_abduction: [['abductors', 'glutes'], [], 'abduction'],
  hip_adduction: [['adductors'], [], 'abduction'],
  pullup: [['lats'], ['biceps', 'mid_back', 'rear_delt', 'forearms'], 'pullup'],
  chinup: [['lats', 'biceps'], ['mid_back', 'forearms'], 'pullup'],
  dip: [['triceps', 'chest'], ['front_delt'], 'dip'],
  hanging_leg_raise: [['abs'], ['obliques', 'forearms'], 'legRaise'],
  pushup: [['chest'], ['triceps', 'front_delt', 'abs'], 'pushup'],
  plank: [['abs'], ['obliques', 'glutes', 'front_delt'], 'plank'],
  crunch: [['abs'], ['obliques'], 'crunch'],
  bw_squat: [['quads', 'glutes'], ['hamstrings'], 'squat'],
  burpee: [['heart', 'quads', 'chest'], ['glutes', 'triceps', 'abs'], 'squat'],
  band_pull_apart: [['rear_delt', 'mid_back'], ['traps'], 'reverseFly'],
  band_row: [['mid_back', 'lats'], ['biceps', 'rear_delt'], 'seatedRow'],
  preacher_curl: [['biceps'], ['forearms'], 'preacher'],
  assisted_pullup: [['lats'], ['biceps', 'mid_back', 'rear_delt'], 'pullup'],
  assisted_chinup: [['lats', 'biceps'], ['mid_back', 'forearms'], 'pullup'],
  assisted_dip: [['triceps', 'chest'], ['front_delt'], 'dip'],
};

// For custom and AI-found exercises: the broad muscle group, as regions.
const GROUP_REGIONS = {
  chest: ['chest'], back: ['lats', 'mid_back'], shoulders: ['front_delt', 'side_delt'], biceps: ['biceps'], triceps: ['triceps'],
  legs: ['quads', 'hamstrings'], glutes: ['glutes'], core: ['abs'], cardio: ['heart'],
};

/** { primary, secondary, motion } for an exercise id, or from its broad muscle group. */
export function targetsOf(id, muscle) {
  const t = T[id];
  if (t) return { primary: t[0], secondary: t[1], motion: t[2] };
  return { primary: GROUP_REGIONS[muscle] || [], secondary: [], motion: null };
}

/** Photos of the machines at Qusay's gym, and the instruction label on the machine. */
export const PHOTOS = {
  chest_press: { label: '/gym/chest_press_label.webp' },
  leg_extension: { photo: '/gym/leg_extension.webp', label: '/gym/leg_extension_label.webp' },
  leg_curl: { label: '/gym/leg_curl_label.webp' },
  seated_row: { photo: '/gym/seated_row.webp', label: '/gym/seated_row_label.webp' },
  tbar_row: { photo: '/gym/tbar_row.webp' },
  preacher_curl: { photo: '/gym/preacher_curl.webp' },
  cable: { photo: '/gym/cable.webp' },
  assisted_chin_dip: { photo: '/gym/assisted_chin_dip.webp' },
};

/** Setting the machine up before the first set. */
export const SETUP = {
  chest_press: [
    ['Adjust the seat so the handles are level with the middle of your chest (the handle under the seat).', 'اضبط المقعد حتى تكون المقابض بمستوى منتصف صدرك (المقبض أسفل المقعد).'],
    ['Back flat on the pad, feet flat on the floor.', 'الظهر ملاصق للمسند والقدمان على الأرض.'],
  ],
  leg_extension: [
    ['Move the back pad so your knees line up with the machine\'s pivot (the red dot).', 'حرّك مسند الظهر حتى تكون ركبتاك على محور الجهاز (النقطة الحمراء).'],
    ['Set the shin pad just above the ankles.', 'اضبط مسند الساق فوق الكاحلين مباشرة.'],
  ],
  leg_curl: [
    ['Lie face down with the knees just past the edge of the bench.', 'استلقِ على بطنك والركبتان بعد حافة المقعد مباشرة.'],
    ['Set the roller just above the heels and hold the handles.', 'اضبط الأسطوانة فوق الكعبين مباشرة وأمسك المقابض.'],
  ],
  seated_row: [
    ['Set the seat so the handles are level with your lower chest.', 'اضبط المقعد حتى تكون المقابض بمستوى أسفل صدرك.'],
    ['Set the chest pad so you reach the handles with straight arms.', 'اضبط مسند الصدر حتى تصل إلى المقابض بذراعين ممدودتين.'],
  ],
  tbar_row: [
    ['Load the same plates on the end of the bar and fit the clip.', 'ضع الأقراص على طرف البار وثبّتها بالمشبك.'],
    ['Stand on the foot plates over the bar and take the handles.', 'قف على مكان القدمين فوق البار وأمسك المقابض.'],
  ],
  preacher_curl: [
    ['Load the same plates on both sides.', 'ضع أقراصاً متساوية على الجانبين.'],
    ['Set the seat so your armpits sit on the top edge of the pad.', 'اضبط المقعد حتى يستقر الإبطان على الحافة العليا للمسند.'],
  ],
  assisted_chin_dip: [
    ['The weight helps you: more weight means easier, less weight means harder.', 'الوزن هنا يساعدك: وزن أكثر يعني أسهل، ووزن أقل يعني أصعب.'],
    ['Step up, take the handles, then lower the knee pad and kneel on it.', 'اصعد وأمسك المقابض ثم أنزل مسند الركبتين واركع عليه.'],
  ],
  cable: [
    ['Set the pulley height: pull the pin, slide the pulley, let the pin click in.', 'اضبط ارتفاع البكرة: اسحب المسمار، حرّك البكرة، ثم اتركه يثبت.'],
    ['Clip on the right handle (straight bar, rope or single handle).', 'ركّب المقبض المناسب (بار مستقيم أو حبل أو مقبض فردي).'],
  ],
  lat_pulldown: [
    ['Set the thigh pad so your legs are locked under it.', 'اضبط مسند الفخذين حتى تثبت رجلاك تحته.'],
  ],
  leg_press: [
    ['Feet shoulder-width in the middle of the plate, back flat on the pad.', 'القدمان بعرض الكتفين في منتصف اللوح والظهر ملاصق للمسند.'],
    ['Release the safety handles before you start and lock them when you finish.', 'افتح مقابض الأمان قبل البدء وأغلقها عند الانتهاء.'],
  ],
  shoulder_press: [
    ['Adjust the seat so the handles are at shoulder height.', 'اضبط المقعد حتى تكون المقابض بمستوى الكتفين.'],
  ],
};

/** The how-to text as numbered steps. */
export const stepsOf = (text = '') => text.split(/(?<=[.!؟?])\s+/).map((s) => s.trim()).filter(Boolean);
