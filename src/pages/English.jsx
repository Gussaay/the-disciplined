import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ExternalLink, Flame, Plus, Send, Sparkles, Volume2 } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Field, Page, Section, Segmented, useToast } from '../components/ui';
import { AiSetupNote, useAiError } from '../components/Ai';
import { RESOURCES, WORDS } from '../data/words';
import { LESSONS } from '../data/lessons';
import { LEVELS, SKILLS, dayProgress, dueWords, newWords, reviewWord, studyStreak, weekMinutes, wordStats } from '../lib/english';
import { dayKey, fromKey } from '../lib/dates';
import { openUrl } from '../lib/native';
import { askAI, aiAvailable } from '../lib/ai';
import { correctionPrompt, readCorrection, tutorSystem } from '../lib/aiPrompts';

const NONE = {};
const COLOR = goalById('english').color;

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* no speech on this device */ }
}

function Setup({ english, setEnglish }) {
  const { L, pick } = useLang();
  const [level, setLevel] = useState(english.level || 'A2');
  const [minutes, setMinutes] = useState(english.minutes || 20);
  return (
    <div className="card space-y-4">
      <p className="text-lg font-extrabold">{L('Set up your plan', 'جهّز خطتك')}</p>
      <Field label={L('Your level now', 'مستواك الحالي')}>
        <Segmented value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l.id, label: pick(l.name) }))} />
      </Field>
      <Field label={L('Minutes a day', 'دقائق في اليوم')}>
        <Segmented value={minutes} onChange={setMinutes} options={[10, 20, 30, 45, 60].map((n) => ({ value: n, label: String(n) }))} />
      </Field>
      <button className="btn-primary w-full" onClick={() => setEnglish({ ...english, level, minutes, startedAt: english.startedAt || dayKey() })}>
        {L('Build my plan', 'ابنِ خطتي')}
      </button>
    </div>
  );
}

function Today({ english, setEnglish }) {
  const { L, pick } = useLang();
  const today = dayKey();
  const progress = dayProgress(english, english.log, new Date());
  const done = english.log?.[today]?.done || NONE;

  const toggle = (task) => {
    const nextDone = { ...done, [task.id]: !done[task.id] };
    const minutes = progress.tasks.filter((t) => nextDone[t.id]).reduce((s, t) => s + t.minutes, 0);
    setEnglish({ ...english, log: { ...(english.log || {}), [today]: { done: nextDone, minutes } } });
  };

  return (
    <>
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white" style={{ background: COLOR }}>
          <span className="tabular text-2xl font-extrabold leading-none">{progress.done}/{progress.total}</span>
        </div>
        <div>
          <p className="font-extrabold">{progress.done === progress.total ? L('Today is complete', 'أتممت مهام اليوم') : L('Today’s plan', 'خطة اليوم')}</p>
          <p className="muted text-sm">{L(`${progress.minutes} of ${english.minutes} minutes · level ${english.level}`, `${progress.minutes} من ${english.minutes} دقيقة · المستوى ${english.level}`)}</p>
        </div>
      </div>
      {progress.tasks.map((task) => {
        const skill = SKILLS[task.skill];
        const links = RESOURCES.filter((r) => r.skill === task.skill);
        return (
          <div key={task.id} className="card !p-3">
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggle(task)}
                aria-pressed={Boolean(done[task.id])}
                aria-label={pick(skill.name)}
                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${done[task.id] ? 'text-white' : 'bg-brand-900/5 text-slate-400 dark:bg-white/10'}`}
                style={done[task.id] ? { background: COLOR } : undefined}
              >
                <Check size={22} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  <span aria-hidden>{skill.icon}</span> {pick(skill.name)} <span className="muted tabular text-sm font-normal">· {L(`${task.minutes} min`, `${task.minutes} دقيقة`)}</span>
                </p>
                <p className={`text-sm leading-relaxed ${done[task.id] ? 'muted line-through' : ''}`}>{pick(task.text)}</p>
                {links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {links.map((r) => (
                      <button key={r.url} className="chip !min-h-[36px] text-xs" onClick={() => openUrl(r.url)}>
                        {r.name} <ExternalLink size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Lessons({ english, setEnglish }) {
  const { L, pick } = useLang();
  const [open, setOpen] = useState(null);
  const today = dayKey();
  const done = english.log?.[today]?.done || NONE;

  // A finished exercise goes into the day's log like any other task, so
  // the streak, the dashboard and the progress bars all see it. The day's
  // minutes are the plan minutes plus the minutes of finished exercises.
  const toggleExercise = (exercise) => {
    const nextDone = { ...done, [exercise.id]: !done[exercise.id] };
    const planMinutes = dayProgress(english, { [today]: { done: nextDone } }, new Date()).minutes;
    const lessonMinutes = LESSONS.flatMap((l) => l.exercises).filter((e) => nextDone[e.id]).reduce((s, e) => s + e.minutes, 0);
    setEnglish({ ...english, log: { ...(english.log || {}), [today]: { done: nextDone, minutes: planMinutes + lessonMinutes } } });
  };

  return (
    <Section title={L('Lessons · B2', 'الدروس · B2')}>
      {english.level !== 'B2' && (
        <p className="muted text-sm">{L('These lessons are written for level B2. Work through them when you feel ready — they are the fastest way to sound natural.', 'هذه الدروس مكتوبة للمستوى B2. اعمل عليها عندما تشعر أنك مستعد — فهي أسرع طريق لتبدو طبيعياً.')}</p>
      )}
      {LESSONS.map((lesson) => {
        const skill = SKILLS[lesson.skill];
        const isOpen = open === lesson.id;
        return (
          <div key={lesson.id} className="card space-y-3">
            <button className="flex w-full items-center gap-3 text-start" onClick={() => setOpen(isOpen ? null : lesson.id)} aria-expanded={isOpen}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl text-white" style={{ background: COLOR }} aria-hidden>{skill.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{pick(lesson.title)}</span>
                <span className="muted block text-sm">{pick(skill.name)} · {L(`${lesson.minutes} min`, `${lesson.minutes} دقيقة`)} · B2</span>
              </span>
              <ChevronDown size={20} className={`shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <>
                <p className="text-sm leading-relaxed">{pick(lesson.intro)}</p>
                <div>
                  <p className="eyebrow mb-1">{L('How it works', 'كيف تعمل')}</p>
                  <ol className="list-decimal space-y-1 ps-5 text-sm leading-relaxed">
                    {lesson.steps.map((s, i) => <li key={i}>{pick(s)}</li>)}
                  </ol>
                </div>
                <div>
                  <p className="eyebrow mb-1">{L('Useful phrases', 'عبارات مفيدة')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.phrases.map((p, i) => (
                      <span key={i} className="chip text-xs"><b dir="ltr" lang="en">{p.en}</b> · {p.ar}</span>
                    ))}
                  </div>
                </div>
                {lesson.exercises.map((exercise) => (
                  <div key={exercise.id} className="rounded-xl bg-brand-900/5 p-3 dark:bg-white/5">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleExercise(exercise)}
                        aria-pressed={Boolean(done[exercise.id])}
                        aria-label={L('Mark done', 'وضع علامة منجز')}
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${done[exercise.id] ? 'text-white' : 'bg-white text-slate-400 dark:bg-white/10'}`}
                        style={done[exercise.id] ? { background: COLOR } : undefined}
                      >
                        <Check size={20} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">{pick(exercise.title)} <span className="muted tabular text-sm font-normal">· {L(`${exercise.minutes} min`, `${exercise.minutes} دقيقة`)}</span></p>
                        <p className="text-sm leading-relaxed">{pick(exercise.instructions)}</p>
                      </div>
                    </div>
                    {exercise.lines && (
                      <div className="mt-2 space-y-2">
                        {exercise.lines.map((line, i) => (
                          <div key={i} className="rounded-lg bg-white p-2.5 dark:bg-[#12201F]">
                            <div className="flex items-start gap-2">
                              <p className="min-w-0 flex-1 leading-relaxed" dir="ltr" lang="en">{line.en}</p>
                              <button className="muted flex h-9 w-9 shrink-0 items-center justify-center" aria-label={L('Listen', 'استمع')} onClick={() => speak(line.en)}>
                                <Volume2 size={16} />
                              </button>
                            </div>
                            <p className="muted text-sm" dir="rtl" lang="ar">{line.ar}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {exercise.prompts && (
                      <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-relaxed">
                        {exercise.prompts.map((prompt, i) => (
                          <li key={i}><span dir="ltr" lang="en">{prompt.en}</span><br /><span className="muted" dir="rtl" lang="ar">{prompt.ar}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </Section>
  );
}

function Words({ english, setEnglish }) {
  const { L } = useLang();
  const toast = useToast();
  const [words, setWords] = useStore('words', NONE);
  const [shown, setShown] = useState(false);
  const [form, setForm] = useState({ word: '', ar: '' });
  const today = dayKey();

  const due = useMemo(() => dueWords(words, today), [words, today]);
  const fresh = useMemo(() => newWords(WORDS[english.level] || WORDS.A2, words, 5), [english.level, words]);
  const stats = wordStats(words);
  const card = due[0];

  const answer = (known) => {
    const next = { ...words, [card.id]: reviewWord(card, known, today) };
    setWords(next);
    setShown(false);
    // The last due word of the day ticks the vocabulary task.
    if (!dueWords(next, today).length) {
      const done = { ...(english.log?.[today]?.done || {}), vocab: true };
      const minutes = dayProgress(english, { [today]: { done } }, new Date()).minutes;
      setEnglish({ ...english, log: { ...(english.log || {}), [today]: { done, minutes } } });
      toast(L('All due words reviewed', 'راجعت كل الكلمات المستحقة'));
    }
  };

  const learn = (list) => {
    const next = { ...words };
    for (const w of list) next[w.id] = { ...w, box: 0, due: today, seen: 0 };
    setWords(next);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[due.length, L('due today', 'مستحقة اليوم')], [stats.known, L('known', 'تعرفها')], [stats.total, L('in your list', 'في قائمتك')]].map(([value, label]) => (
          <div key={label} className="card !p-3">
            <p className="tabular text-2xl font-extrabold" style={{ color: COLOR }}>{value}</p>
            <p className="muted text-xs">{label}</p>
          </div>
        ))}
      </div>

      {card ? (
        <div className="card space-y-4 text-center">
          <p className="muted text-sm">{L(`${due.length} to review`, `${due.length} للمراجعة`)}</p>
          <div className="flex items-center justify-center gap-2" dir="ltr">
            <p className="text-3xl font-extrabold" lang="en">{card.word}</p>
            <button className="muted flex h-11 w-11 items-center justify-center" aria-label={L('Listen', 'استمع')} onClick={() => speak(card.word)}>
              <Volume2 size={20} />
            </button>
          </div>
          {shown ? (
            <>
              <p className="text-2xl font-bold" lang="ar" dir="rtl">{card.ar}</p>
              {card.ex && <p className="muted text-sm" dir="ltr" lang="en">{card.ex}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-danger" onClick={() => answer(false)}>{L('Not yet', 'ليس بعد')}</button>
                <button className="btn text-white" style={{ background: COLOR }} onClick={() => answer(true)}>{L('I knew it', 'عرفتها')}</button>
              </div>
            </>
          ) : (
            <button className="btn-soft w-full" onClick={() => setShown(true)}>{L('Show the meaning', 'أظهر المعنى')}</button>
          )}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-3xl" aria-hidden>✅</p>
          <p className="font-bold">{L('No words due right now', 'لا توجد كلمات مستحقة الآن')}</p>
          <p className="muted text-sm">{L('Learn a few new ones below; they come back tomorrow.', 'تعلّم كلمات جديدة بالأسفل وستعود إليك غداً.')}</p>
        </div>
      )}

      {fresh.length > 0 && (
        <Section title={L(`New words · level ${english.level}`, `كلمات جديدة · المستوى ${english.level}`)}>
          <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
            {fresh.map((w) => (
              <div key={w.id} className="flex items-center gap-2 py-2.5">
                <button className="muted flex h-10 w-10 shrink-0 items-center justify-center" aria-label={L('Listen', 'استمع')} onClick={() => speak(w.word)}>
                  <Volume2 size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <p><b lang="en" dir="ltr">{w.word}</b> <span className="muted">·</span> <span lang="ar">{w.ar}</span></p>
                  <p className="muted truncate text-sm" dir="ltr" lang="en">{w.ex}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => learn(fresh)}>
            <Plus size={18} /> {L(`Start learning these ${fresh.length}`, `ابدأ تعلّم هذه الـ ${fresh.length}`)}
          </button>
        </Section>
      )}

      <Section title={L('Add your own word', 'أضف كلمتك')}>
        <div className="card space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="input" dir="ltr" lang="en" placeholder="word" aria-label={L('English word', 'الكلمة بالإنجليزية')} value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} />
            <input className="input" dir="rtl" lang="ar" placeholder="المعنى" aria-label={L('Arabic meaning', 'المعنى بالعربية')} value={form.ar} onChange={(e) => setForm({ ...form, ar: e.target.value })} />
          </div>
          <button
            className="btn-soft w-full"
            disabled={!form.word.trim() || !form.ar.trim()}
            onClick={() => {
              const word = form.word.trim();
              learn([{ id: `my:${word.toLowerCase()}`, word, ar: form.ar.trim(), ex: '' }]);
              setForm({ word: '', ar: '' });
              toast(L('Added to your list', 'أضيفت إلى قائمتك'));
            }}
          >
            <Plus size={16} /> {L('Add', 'إضافة')}
          </button>
        </div>
      </Section>
    </>
  );
}

function Tutor({ english }) {
  const { L, lang } = useLang();
  const aiError = useAiError();
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState(null);
  const end = useRef();

  const send = async () => {
    const mine = text.trim();
    if (!mine || busy) return;
    const next = [...messages, { role: 'user', text: mine }];
    setMessages(next);
    setText('');
    setBusy(true);
    try {
      const reply = await askAI({ system: tutorSystem(english.level, lang), messages: next.slice(-12) });
      setMessages([...next, { role: 'assistant', text: reply }]);
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (error) {
      aiError(error);
      setMessages(messages);
      setText(mine);
    } finally {
      setBusy(false);
    }
  };

  const correct = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(readCorrection(await askAI({ ...correctionPrompt(essay.trim(), english.level, lang), json: true })));
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!aiAvailable() && <AiSetupNote />}
      <Segmented
        value={mode}
        onChange={setMode}
        options={[{ value: 'chat', label: L('Conversation', 'محادثة'), icon: '💬' }, { value: 'write', label: L('Correct my writing', 'صحّح كتابتي'), icon: '✍️' }]}
      />
      {mode === 'chat' ? (
        <>
          <div className="space-y-2">
            {!messages.length && (
              <div className="card text-sm">
                <p className="font-bold">{L('Practise with your tutor', 'تدرّب مع معلمك')}</p>
                <p className="muted mt-1">{L('Write anything in English. The tutor answers at your level and gently corrects mistakes.', 'اكتب أي شيء بالإنجليزية. يجيبك المعلم بمستواك ويصحح أخطاءك بلطف.')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Hello! Can we talk about my day?', 'Ask me questions about my job.', 'Let’s practise ordering food.'].map((s) => (
                    <button key={s} className="chip text-xs" dir="ltr" onClick={() => setText(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} dir="ltr" className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[15px] leading-relaxed ${m.role === 'user' ? 'text-white' : 'bg-white dark:bg-[#12201F]'}`}
                  style={m.role === 'user' ? { background: COLOR } : undefined}
                  dir="auto"
                >
                  {m.text}
                  {m.role === 'assistant' && (
                    <button className="muted ms-1 inline-flex align-middle" aria-label={L('Listen', 'استمع')} onClick={() => speak(m.text)}>
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="muted text-sm">{L('The tutor is writing…', 'المعلم يكتب…')}</p>}
            <div ref={end} />
          </div>
          <div className="flex gap-2">
            <input
              className="input" dir="ltr" lang="en" placeholder="Write in English…" aria-label={L('Your message', 'رسالتك')}
              value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn text-white" style={{ background: COLOR }} disabled={busy || !text.trim()} onClick={send} aria-label={L('Send', 'إرسال')}>
              <Send size={18} className="flip-rtl" />
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea className="input min-h-[140px]" dir="ltr" lang="en" placeholder="Write a few sentences in English…" aria-label={L('Your text', 'نصك')} value={essay} onChange={(e) => setEssay(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy || essay.trim().length < 10} onClick={correct}>
            <Sparkles size={18} /> {busy ? L('Reading…', 'جارٍ القراءة…') : L('Correct it', 'صحّحه')}
          </button>
          {result && (
            <div className="space-y-3">
              <div className="card">
                <div className="flex items-baseline justify-between">
                  <p className="eyebrow">{L('Corrected', 'النص المصحّح')}</p>
                  <p className="tabular font-extrabold" style={{ color: COLOR }}>{result.score}/10</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed" dir="ltr" lang="en">{result.corrected}</p>
                {result.praise && <p className="mt-2 text-sm font-bold text-brand-700 dark:text-brand-200">👍 {result.praise}</p>}
              </div>
              {result.mistakes.map((m, i) => (
                <div key={i} className="card !p-3 text-sm">
                  <p dir="ltr" lang="en"><span className="text-red-600 line-through dark:text-red-400">{m.wrong}</span> → <b className="text-brand-700 dark:text-brand-200">{m.right}</b></p>
                  {m.why && <p className="muted mt-1">{m.why}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function Progress({ english, setEnglish }) {
  const { L, pick, date } = useLang();
  const [words] = useStore('words', NONE);
  const today = dayKey();
  const week = weekMinutes(english.log, 14, today);
  const stats = wordStats(words);
  const days = Object.values(english.log || {}).filter((d) => Object.values(d.done || {}).some(Boolean)).length;
  const total = Object.values(english.log || {}).reduce((s, d) => s + (Number(d.minutes) || 0), 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          [studyStreak(english.log, today), L('day streak', 'أيام متتالية'), true],
          [days, L('days studied', 'أيام دراسة')],
          [L(`${Math.round(total / 60 * 10) / 10} h`, `${Math.round(total / 60 * 10) / 10} س`), L('total time', 'إجمالي الوقت')],
          [`${stats.known} / ${stats.total}`, L('words known', 'كلمات تعرفها')],
        ].map(([value, label, flame]) => (
          <div key={label} className="card !p-3">
            <p className="tabular flex items-center justify-center gap-1 text-2xl font-extrabold" style={{ color: COLOR }}>
              {flame && <Flame size={20} className="text-gold-500" />}{value}
            </p>
            <p className="muted text-xs">{label}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <p className="mb-3 font-bold">{L('Minutes a day, last 14 days', 'الدقائق يومياً، آخر 14 يوماً')}</p>
        <Bars color={COLOR} data={week.map((d) => ({ label: String(fromKey(d.key).getDate()), value: d.minutes, mark: d.minutes >= english.minutes }))} format={(v) => L(`${v} min`, `${v} دقيقة`)} />
        <p className="muted mt-2 text-xs">{L(`Solid bars reached your ${english.minutes}-minute goal. Started ${date(fromKey(english.startedAt || today), { day: 'numeric', month: 'long', year: 'numeric' })}.`, `الأعمدة الداكنة بلغت هدفك (${english.minutes} دقيقة). البداية ${date(fromKey(english.startedAt || today), { day: 'numeric', month: 'long', year: 'numeric' })}.`)}</p>
      </div>
      <Section title={L('Change the plan', 'تغيير الخطة')}>
        <div className="card space-y-3">
          <Field label={L('Level', 'المستوى')}>
            <Segmented value={english.level} onChange={(level) => setEnglish({ ...english, level })} options={LEVELS.map((l) => ({ value: l.id, label: pick(l.name) }))} />
          </Field>
          <Field label={L('Minutes a day', 'دقائق في اليوم')}>
            <Segmented value={english.minutes} onChange={(minutes) => setEnglish({ ...english, minutes })} options={[10, 20, 30, 45, 60].map((n) => ({ value: n, label: String(n) }))} />
          </Field>
          <p className="muted text-xs">{L('Move up a level when most of its words are known and the tasks feel easy.', 'انتقل إلى المستوى التالي عندما تعرف أغلب كلماته وتشعر أن المهام سهلة.')}</p>
        </div>
      </Section>
    </>
  );
}

export default function English() {
  const { L } = useLang();
  const [english, setEnglish] = useStore('english', NONE);
  const [tab, setTab] = useState('today');
  const ready = Boolean(english.level);

  return (
    <Page goal="english" title={L('English', 'اللغة الإنجليزية')} subtitle={ready ? L(`${studyStreak(english.log)} day streak`, `${studyStreak(english.log)} أيام متتالية`) : undefined}>
      {!ready ? (
        <Setup english={english} setEnglish={setEnglish} />
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: L('Today', 'اليوم'), icon: '🎯' },
              { value: 'words', label: L('Words', 'الكلمات'), icon: '🗂️' },
              { value: 'tutor', label: L('Tutor', 'المعلم'), icon: '💬' },
              { value: 'progress', label: L('Progress', 'التقدم'), icon: '📈' },
            ]}
          />
          {tab === 'today' && (
            <>
              <Today english={english} setEnglish={setEnglish} />
              <Lessons english={english} setEnglish={setEnglish} />
            </>
          )}
          {tab === 'words' && <Words english={english} setEnglish={setEnglish} />}
          {tab === 'tutor' && <Tutor english={english} />}
          {tab === 'progress' && <Progress english={english} setEnglish={setEnglish} />}
        </>
      )}
    </Page>
  );
}
