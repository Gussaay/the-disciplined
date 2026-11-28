// Quick add: one box for everything. The person types or speaks a mixed
// note — training done, food eaten, prayers prayed, things to do — the AI
// sorts it into proposals for the four logs, and nothing is written until
// the person reviews the proposals and taps Save.
import { useState } from 'react';
import { Check, Dumbbell, ListTodo, Loader2, Mic, MoonStar, Sparkles, Square, Trash2, UtensilsCrossed } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { NumberInput, Sheet, useToast } from './ui';
import { AiSetupNote, useAiError } from './Ai';
import { askAI, aiAvailable, transcribe } from '../lib/ai';
import { recordingSupported, startRecording } from '../lib/voice';
import { applyFood, applyGym, applyPrayer, applyTasks, quickAddPrompt, readQuickAdd } from '../lib/quickAdd';
import { EXERCISES } from '../data/equipment';
import { FOODS, MEALS } from '../data/foods';
import { PRAYERS } from '../lib/prayer';
import { portion } from '../lib/nutrition';
import { dayKey } from '../lib/dates';

const NONE = {};
const EMPTY = [];

const KIND_META = {
  gym: { Icon: Dumbbell, color: goalById('gym').color, en: 'Training', ar: 'التمرين' },
  food: { Icon: UtensilsCrossed, color: goalById('food').color, en: 'Food', ar: 'الطعام' },
  prayer: { Icon: MoonStar, color: goalById('prayer').color, en: 'Prayer', ar: 'الصلاة' },
  task: { Icon: ListTodo, color: goalById('tasks').color, en: 'Tasks', ar: 'المهام' },
};

export default function QuickAddButton({ variant = 'button' }) {
  const { L, pick, lang } = useLang();
  const toast = useToast();
  const aiError = useAiError();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [recording, setRecording] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [gymActive, setGymActive] = useStore('gymActive', null);
  const [gymSessions, setGymSessions] = useStore('gymSessions', EMPTY);
  const [foodLog, setFoodLog] = useStore('foodLog', NONE);
  const [prayerLog, setPrayerLog] = useStore('prayerLog', NONE);
  const [tasks, setTasks] = useStore('tasks', EMPTY);
  const today = dayKey();

  const sort = async () => {
    const note = text.trim();
    if (!note) return;
    setBusy('sort');
    try {
      const json = await askAI({ ...quickAddPrompt(note, { today, lang, exercises: EXERCISES, foods: FOODS }), json: true });
      const found = readQuickAdd(json, { exercises: EXERCISES, foods: FOODS });
      if (!found.length) {
        toast(L('Nothing to log was found in it. Try again in other words.', 'لم أجد شيئاً لأسجّله فيه. حاول بكلمات أخرى.'), 'error');
        return;
      }
      setProposals(found);
    } catch (e) {
      aiError(e);
    } finally {
      setBusy('');
    }
  };

  const toggleVoice = async () => {
    if (recording) {
      const rec = recording;
      setRecording(null);
      setBusy('voice');
      try {
        const audio = await rec.stop();
        if (audio.seconds < 0.8) throw new Error(L('That was too short. Speak, then tap Stop.', 'كان قصيراً جداً. تحدث ثم اضغط إيقاف.'));
        const words = await transcribe(audio, lang);
        if (!words) throw new Error(L('Nothing was heard', 'لم يُسمع شيء'));
        setText((t) => (t.trim() ? `${t.trim()} ${words}` : words));
      } catch (e) {
        aiError(e);
      } finally {
        setBusy('');
      }
      return;
    }
    try {
      setRecording(await startRecording());
    } catch {
      toast(L('The microphone is not available. Allow it for the app and try again.', 'الميكروفون غير متاح. اسمح به للتطبيق وحاول مجدداً.'), 'error');
    }
  };

  const patch = (i, next) => setProposals((list) => list.map((p, j) => (j === i ? { ...p, ...next } : p)));
  const remove = (i) => setProposals((list) => list.filter((_, j) => j !== i));

  const save = () => {
    const gym = applyGym(proposals, { active: gymActive, sessions: gymSessions, today });
    if (gym.added) {
      if (gymActive) setGymActive(gym.active);
      else setGymSessions(gym.sessions);
    }
    const food = applyFood(proposals, { log: foodLog, today, hour: new Date().getHours() });
    if (food.added) setFoodLog(food.log);
    const prayer = applyPrayer(proposals, { log: prayerLog, today });
    if (prayer.added) setPrayerLog(prayer.log);
    const task = applyTasks(proposals, { tasks, today });
    if (task.added) setTasks(task.tasks);
    const parts = [
      gym.added && L(`${gym.added} training`, `${gym.added} تمرين`),
      food.added && L(`${food.added} food`, `${food.added} طعام`),
      prayer.added && L(`${prayer.added} prayers`, `${prayer.added} صلوات`),
      task.added && L(`${task.added} tasks`, `${task.added} مهام`),
    ].filter(Boolean);
    toast(L(`Saved: ${parts.join(' · ')}`, `حُفظ: ${parts.join(' · ')}`));
    setProposals(null);
    setText('');
    setOpen(false);
  };

  const setsText = (p) =>
    p.unit === 'cardio'
      ? p.sets.map((s) => L(`${s.minutes} min${s.km ? ` · ${s.km} km` : ''}`, `${s.minutes} دقيقة${s.km ? ` · ${s.km} كم` : ''}`)).join(L(', ', '، '))
      : p.sets.map((s) => `${s.weight || 0}×${s.reps}`).join(L(', ', '، '));

  const row = (p, i) => {
    if (p.kind === 'gym') {
      return (
        <>
          <p className="font-bold">{typeof p.name === 'string' ? p.name : pick(p.name)}</p>
          <p className="muted tabular text-sm">{setsText(p)}</p>
        </>
      );
    }
    if (p.kind === 'food') {
      const kcal = p.food ? portion(p.food, p.grams).kcal : Math.round(p.kcal);
      return (
        <>
          <p className="font-bold">{typeof p.name === 'string' ? p.name : pick(p.name)}</p>
          <div className="mt-1 flex items-center gap-2">
            <NumberInput className="!min-h-[36px] w-24 text-center" value={p.grams} onChange={(v) => patch(i, { grams: Number(v) || 0 })} aria-label={L('Grams', 'الجرامات')} />
            <span className="muted text-sm">
              {L('g', 'جم')} · {kcal} {L('kcal', 'سعرة')}
              {p.meal ? ` · ${pick(MEALS.find((m) => m.id === p.meal)?.name)}` : ''}
            </span>
          </div>
        </>
      );
    }
    if (p.kind === 'prayer') {
      const name = PRAYERS.find((x) => x.id === p.prayer);
      return (
        <>
          <p className="font-bold">{name ? pick(name.name) : p.prayer}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[
              ['ontime', L('On time', 'في الوقت')],
              ['late', L('Late', 'متأخرة')],
              ['missed', L('Missed', 'فاتت')],
            ].map(([id, label]) => (
              <button key={id} className={`chip !min-h-[32px] ${p.status === id ? 'chip-on' : ''}`} onClick={() => patch(i, { status: id, ...(id === 'missed' ? { mosque: false } : {}) })}>
                {label}
              </button>
            ))}
            {p.status !== 'missed' && (
              <button className={`chip !min-h-[32px] ${p.mosque ? 'chip-on' : ''}`} onClick={() => patch(i, { mosque: !p.mosque })} aria-pressed={p.mosque}>
                {L('In the mosque', 'في المسجد')}
              </button>
            )}
          </div>
        </>
      );
    }
    return (
      <>
        <input
          className="input !min-h-[40px] w-full font-bold"
          value={p.title}
          onChange={(e) => patch(i, { title: e.target.value })}
          aria-label={L('Task', 'المهمة')}
        />
        {(p.due || p.time) && (
          <p className="muted mt-1 text-sm">
            {p.due}
            {p.time ? ` · ${p.time}` : ''}
          </p>
        )}
      </>
    );
  };

  return (
    <>
      {variant === 'card' ? (
        <button className="btn-primary w-full" onClick={() => setOpen(true)}>
          <Sparkles size={18} />
          {L('Quick add — say it or type it', 'إضافة سريعة — قلها أو اكتبها')}
        </button>
      ) : (
        <button className="btn-soft !min-h-[40px] !px-3 text-sm" onClick={() => setOpen(true)}>
          <Sparkles size={16} /> {L('Quick add', 'إضافة سريعة')}
        </button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={L('Quick add', 'إضافة سريعة')}
        footer={
          proposals?.length ? (
            <button className="btn-primary w-full" onClick={save}>
              <Check size={18} /> {L(`Save ${proposals.length} items`, `حفظ ${proposals.length} عناصر`)}
            </button>
          ) : undefined
        }
      >
        {!aiAvailable() ? (
          <AiSetupNote />
        ) : proposals ? (
          <div className="space-y-3">
            <p className="muted text-sm">
              {L('The AI sorted your note like this. Check it, fix or remove anything, then Save — nothing is written before that.', 'رتّب الذكاء الاصطناعي ملاحظتك هكذا. راجعها وصحّح أو احذف ما تشاء ثم احفظ — لا يُكتب شيء قبل الحفظ.')}
            </p>
            {Object.entries(KIND_META).map(([kind, meta]) => {
              const mine = proposals.map((p, i) => [p, i]).filter(([p]) => p.kind === kind);
              if (!mine.length) return null;
              return (
                <div key={kind}>
                  <p className="flex items-center gap-1.5 px-1 pb-1 text-sm font-extrabold" style={{ color: meta.color }}>
                    <meta.Icon size={16} /> {L(meta.en, meta.ar)}
                  </p>
                  <div className="space-y-2">
                    {mine.map(([p, i]) => (
                      <div key={i} className="card flex items-start gap-2 !p-3">
                        <div className="min-w-0 flex-1">{row(p, i)}</div>
                        <button className="muted flex h-9 w-9 shrink-0 items-center justify-center" aria-label={L('Remove', 'حذف')} onClick={() => remove(i)}>
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <button className="btn-ghost w-full" onClick={() => setProposals(null)}>
              {L('Start over', 'ابدأ من جديد')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="muted text-sm">
              {L(
                'Write or say everything in one go, in Arabic or English: "Bench press 3 sets of 60×10, ate 200 g rice and two eggs, prayed Fajr and Dhuhr on time, remind me to call the bank tomorrow at 10."',
                'اكتب أو قل كل شيء مرة واحدة، بالعربية أو الإنجليزية: «ضغط صدر 3 مجموعات 60×10، أكلت 200 جم أرز وبيضتين، صليت الفجر والظهر في الوقت، ذكّرني أن أتصل بالبنك غداً الساعة 10».',
              )}
            </p>
            <textarea
              className="input min-h-[7rem] w-full"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={L('What did you do?', 'ماذا فعلت؟')}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={!text.trim() || Boolean(busy)} onClick={sort}>
                {busy === 'sort' ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {L('Sort it for me', 'رتّبها لي')}
              </button>
              {recordingSupported() && (
                <button className={`${recording ? 'btn bg-red-600 text-white' : 'btn-soft'} flex-1`} disabled={busy === 'sort'} onClick={toggleVoice}>
                  {busy === 'voice' ? <Loader2 size={18} className="animate-spin" /> : recording ? <Square size={18} /> : <Mic size={18} />}
                  {recording ? L('Stop', 'إيقاف') : L('Speak', 'تحدث')}
                </button>
              )}
            </div>
            {recording && <p className="text-center text-sm font-bold text-red-600">{L('Listening… tap Stop when you finish', 'جارٍ الاستماع… اضغط إيقاف عند الانتهاء')}</p>}
          </div>
        )}
      </Sheet>
    </>
  );
}
