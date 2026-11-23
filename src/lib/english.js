// The English plan: a weekly timetable built from the level and the minutes a
// day, and spaced repetition for vocabulary (Leitner boxes).
//
// english = { level, minutes, startedAt, log: { [day]: { done: { [taskId]: true }, minutes } } }
// words   = { [id]: { id, word, ar, ex, box: 0-5, due: 'YYYY-MM-DD', seen } }
import { addDays, dayKey, lastDays, streak } from './dates.js';

export const LEVELS = [
  { id: 'A1', name: { en: 'Beginner (A1)', ar: 'مبتدئ (A1)' } },
  { id: 'A2', name: { en: 'Elementary (A2)', ar: 'أساسي (A2)' } },
  { id: 'B1', name: { en: 'Intermediate (B1)', ar: 'متوسط (B1)' } },
  { id: 'B2', name: { en: 'Upper intermediate (B2)', ar: 'فوق المتوسط (B2)' } },
];

export const SKILLS = {
  vocab: { name: { en: 'Vocabulary', ar: 'المفردات' }, icon: '🗂️' },
  listening: { name: { en: 'Listening', ar: 'الاستماع' }, icon: '🎧' },
  reading: { name: { en: 'Reading', ar: 'القراءة' }, icon: '📖' },
  speaking: { name: { en: 'Speaking', ar: 'المحادثة' }, icon: '🗣️' },
  writing: { name: { en: 'Writing', ar: 'الكتابة' }, icon: '✍️' },
  grammar: { name: { en: 'Grammar', ar: 'القواعد' }, icon: '🧩' },
  shadowing: { name: { en: 'Shadowing', ar: 'المحاكاة الصوتية' }, icon: '🎙️' },
  communication: { name: { en: 'Communication', ar: 'التواصل' }, icon: '💬' },
};

const TASKS = {
  vocab: {
    en: 'Review your due words, then learn new ones',
    ar: 'راجع الكلمات المستحقة ثم تعلّم كلمات جديدة',
  },
  listening: {
    A1: { en: 'Listen to a slow, short dialogue twice; repeat each sentence aloud', ar: 'استمع لحوار قصير وبطيء مرتين وكرر كل جملة بصوت عالٍ' },
    A2: { en: 'Listen to a short story or easy podcast; write 5 words you caught', ar: 'استمع لقصة قصيرة أو بودكاست سهل واكتب 5 كلمات التقطتها' },
    B1: { en: 'Listen to a 6-minute podcast episode; summarise it in 3 sentences', ar: 'استمع لحلقة بودكاست من 6 دقائق ولخّصها في 3 جمل' },
    B2: { en: 'Watch a talk without subtitles; note the main argument and 5 new phrases', ar: 'شاهد محاضرة بدون ترجمة ودوّن الفكرة الرئيسية و5 عبارات جديدة' },
  },
  reading: {
    A1: { en: 'Read a short graded text; underline the words you do not know', ar: 'اقرأ نصاً قصيراً مبسطاً وضع خطاً تحت الكلمات التي لا تعرفها' },
    A2: { en: 'Read a simple news story or a page of a graded reader', ar: 'اقرأ خبراً مبسطاً أو صفحة من كتاب مبسط' },
    B1: { en: 'Read one news article; add 5 new words to your list', ar: 'اقرأ مقالاً إخبارياً وأضف 5 كلمات جديدة إلى قائمتك' },
    B2: { en: 'Read a long article in your field; note how the argument is built', ar: 'اقرأ مقالاً طويلاً في مجالك ولاحظ طريقة بناء الفكرة' },
  },
  speaking: {
    A1: { en: 'Introduce yourself aloud: name, job, family, city. Record and listen', ar: 'عرّف بنفسك بصوت عالٍ: الاسم والعمل والأسرة والمدينة. سجّل واستمع' },
    A2: { en: 'Describe your day aloud for 2 minutes; record and listen', ar: 'صِف يومك بصوت عالٍ لمدة دقيقتين، سجّل واستمع' },
    B1: { en: 'Shadow a speaker for 5 minutes, then tell the story in your own words', ar: 'ردّد خلف متحدث لمدة 5 دقائق ثم احكِ القصة بكلماتك' },
    B2: { en: 'Speak for 3 minutes on an opinion question without stopping; record it', ar: 'تحدث 3 دقائق عن سؤال رأي دون توقف وسجّل ذلك' },
  },
  writing: {
    A1: { en: 'Write 5 simple sentences about your day', ar: 'اكتب 5 جمل بسيطة عن يومك' },
    A2: { en: 'Write a short message to a friend (50 words)', ar: 'اكتب رسالة قصيرة لصديق (50 كلمة)' },
    B1: { en: 'Write a paragraph (100 words) about something you learned today', ar: 'اكتب فقرة (100 كلمة) عن شيء تعلمته اليوم' },
    B2: { en: 'Write 200 words giving and defending an opinion', ar: 'اكتب 200 كلمة تعرض فيها رأياً وتدافع عنه' },
  },
  grammar: {
    A1: { en: 'Present simple: am / is / are, do / does. Write 6 examples', ar: 'المضارع البسيط: am / is / are و do / does. اكتب 6 أمثلة' },
    A2: { en: 'Past simple and common irregular verbs. Write 6 examples', ar: 'الماضي البسيط والأفعال الشاذة الشائعة. اكتب 6 أمثلة' },
    B1: { en: 'Present perfect against past simple. Write 6 examples', ar: 'المضارع التام مقابل الماضي البسيط. اكتب 6 أمثلة' },
    B2: { en: 'Conditionals and the passive. Rewrite 6 sentences', ar: 'الجمل الشرطية والمبني للمجهول. أعد كتابة 6 جمل' },
  },
  shadowing: {
    A1: { en: 'Shadow a slow dialogue line by line: listen, pause, copy the sounds', ar: 'حاكِ حواراً بطيئاً سطراً بسطر: استمع وتوقّف وقلّد الأصوات' },
    A2: { en: 'Shadow a short story recording for 5 minutes, whispering along with the speaker', ar: 'حاكِ تسجيل قصة قصيرة لمدة 5 دقائق وأنت تهمس مع المتحدث' },
    B1: { en: 'Shadow a podcast segment for 8 minutes; keep the rhythm, not just the words', ar: 'حاكِ مقطعاً من بودكاست لمدة 8 دقائق وحافظ على الإيقاع لا الكلمات فقط' },
    B2: { en: 'Shadow a talk or news clip at full speed; record yourself and compare the melody', ar: 'حاكِ مقطعاً من محاضرة أو نشرة أخبار بالسرعة الكاملة وسجّل نفسك وقارن النغمة' },
  },
  communication: {
    A1: { en: 'Practise greetings and small talk aloud: hello, how are you, where are you from', ar: 'تدرّب على التحية والحديث القصير بصوت عالٍ: مرحباً، كيف حالك، من أين أنت' },
    A2: { en: 'Role-play ordering food and asking for the bill, aloud, twice', ar: 'مثّل طلب الطعام وطلب الفاتورة بصوت عالٍ مرتين' },
    B1: { en: 'Give your opinion on a simple topic, then ask one follow-up question', ar: 'أعطِ رأيك في موضوع بسيط ثم اسأل سؤال متابعة واحداً' },
    B2: { en: 'Discuss a question for 5 minutes: an opinion, a reason, an example, and an invitation to reply', ar: 'ناقش سؤالاً لمدة 5 دقائق: رأي وسبب ومثال ودعوة للرد' },
  },
};

// Which two skills join vocabulary on each weekday (0 = Sunday). Every
// skill comes up twice a week; shadowing rides with listening and
// speaking, communication with the writing days.
const ROTATION = [
  ['listening', 'shadowing'],
  ['reading', 'grammar'],
  ['writing', 'communication'],
  ['reading', 'speaking'],
  ['listening', 'grammar'],
  ['speaking', 'shadowing'],
  ['writing', 'communication'],
];

/**
 * The tasks of one day. Vocabulary takes a third of the time (at least 5
 * minutes) and the two skills of the day share the rest. Under 15 minutes a
 * day only one skill is given, so no task is shorter than 5 minutes.
 */
export function dayPlan(plan = {}, date = new Date()) {
  const level = TASKS.listening[plan.level] ? plan.level : 'A2';
  const minutes = Math.max(10, Number(plan.minutes) || 20);
  const weekday = date.getDay();
  const skills = minutes < 15 ? ROTATION[weekday].slice(0, 1) : ROTATION[weekday];
  const vocab = Math.max(5, Math.round(minutes / 3));
  const each = Math.max(5, Math.round((minutes - vocab) / skills.length));
  return [
    { id: 'vocab', skill: 'vocab', minutes: vocab, text: TASKS.vocab },
    ...skills.map((skill) => ({ id: skill, skill, minutes: each, text: TASKS[skill][level] })),
  ];
}

export function dayProgress(plan, log, date = new Date()) {
  const tasks = dayPlan(plan, date);
  const done = log?.[dayKey(date)]?.done || {};
  const finished = tasks.filter((t) => done[t.id]);
  return {
    tasks,
    done: finished.length,
    total: tasks.length,
    minutes: finished.reduce((s, t) => s + t.minutes, 0),
    share: finished.length / tasks.length,
  };
}

export const studyStreak = (log, today = dayKey()) =>
  streak((key) => Object.values(log?.[key]?.done || {}).some(Boolean), today);

export function weekMinutes(log, days = 7, today = dayKey()) {
  return lastDays(days, today).map((key) => ({ key, minutes: Number(log?.[key]?.minutes) || 0 }));
}

// --- Vocabulary: Leitner boxes -------------------------------------------
// A word moves up a box each time it is known and back to box 1 when it is
// not. The box decides how many days pass before it is shown again.
export const INTERVALS = [0, 1, 2, 4, 7, 15, 30];

export function reviewWord(card, known, today = dayKey()) {
  const box = known ? Math.min(INTERVALS.length - 1, (card.box || 0) + 1) : 1;
  return { ...card, box, due: addDays(today, INTERVALS[box]), seen: (card.seen || 0) + 1 };
}

export const dueWords = (words, today = dayKey()) =>
  Object.values(words || {})
    .filter((w) => w.due && w.due <= today)
    .sort((a, b) => (a.box || 0) - (b.box || 0) || (a.due < b.due ? -1 : 1));

/** Words of the level's list not started yet. */
export function newWords(list, words, limit = 5) {
  return (list || []).filter((w) => !words?.[w.id]).slice(0, limit);
}

export function wordStats(words) {
  const all = Object.values(words || {});
  return {
    total: all.length,
    learning: all.filter((w) => (w.box || 0) < 4).length,
    known: all.filter((w) => (w.box || 0) >= 4).length,
    mastered: all.filter((w) => (w.box || 0) >= 6).length,
  };
}
