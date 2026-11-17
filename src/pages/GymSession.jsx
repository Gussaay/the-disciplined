// The workout in progress: sets to tick off, a rest timer, what was done last
// time, and the live heart rate from a watch.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, HeartPulse, Info, Plus, Timer, Trash2, Trophy, X } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { NumberInput, useToast } from '../components/ui';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseGuide from '../components/ExerciseGuide';
import { EXERCISES, MUSCLES } from '../data/equipment';
import { estimateBurn, isRecord, lastPerformance, nextTarget, personalRecords, sessionMinutes, sessionSets, sessionVolume } from '../lib/gym';
import { addSet, finishSession, makeExercise, setComplete } from '../lib/gymSession';
import { hrStats } from '../lib/hrParse';
import { connectHeartRate, heartRateSupported } from '../lib/heartRate';

const NONE = {};
const EMPTY = [];
const COLOR = goalById('gym').color;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function SetRow({ index, set, unit, onChange, onToggle, onRemove, record }) {
  const { L } = useLang();
  const ready = setComplete(set, unit);
  return (
    <div className={`flex items-center gap-2 rounded-xl px-1 py-1 ${set.done ? 'bg-brand-50 dark:bg-white/5' : ''}`}>
      <span className="muted tabular w-6 text-center text-sm font-bold">{index + 1}</span>
      {unit === 'cardio' ? (
        <>
          <NumberInput className="!min-h-[40px] flex-1 text-center" placeholder={L('min', 'دقيقة')} aria-label={L('Minutes', 'الدقائق')} value={set.minutes} onChange={(minutes) => onChange({ minutes })} />
          <NumberInput className="!min-h-[40px] flex-1 text-center" placeholder={L('km', 'كم')} aria-label={L('Kilometres', 'الكيلومترات')} value={set.km} onChange={(km) => onChange({ km })} />
        </>
      ) : unit === 'time' ? (
        <NumberInput className="!min-h-[40px] flex-1 text-center" placeholder={L('seconds', 'ثانية')} aria-label={L('Seconds', 'الثواني')} value={set.seconds} onChange={(seconds) => onChange({ seconds })} />
      ) : (
        <>
          <NumberInput className="!min-h-[40px] flex-1 text-center" placeholder={unit === 'bw' ? L('+kg', '+كجم') : L('kg', 'كجم')} aria-label={L('Weight in kg', 'الوزن بالكيلوجرام')} value={set.weight} onChange={(weight) => onChange({ weight })} />
          <span className="muted">×</span>
          <NumberInput className="!min-h-[40px] flex-1 text-center" placeholder={L('reps', 'تكرار')} aria-label={L('Repetitions', 'التكرارات')} value={set.reps} onChange={(reps) => onChange({ reps })} />
        </>
      )}
      {record && <Trophy size={18} className="shrink-0 text-gold-500" aria-label={L('New record', 'رقم قياسي جديد')} />}
      <button
        onClick={onToggle}
        disabled={!ready && !set.done}
        aria-pressed={set.done}
        aria-label={L('Set done', 'تم إنجاز المجموعة')}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${set.done ? 'text-white' : 'bg-brand-900/10 text-slate-500 disabled:opacity-40 dark:bg-white/10'}`}
        style={set.done ? { background: COLOR } : undefined}
      >
        <Check size={20} />
      </button>
      <button onClick={onRemove} aria-label={L('Remove set', 'حذف المجموعة')} className="muted flex h-10 w-8 shrink-0 items-center justify-center">
        <X size={16} />
      </button>
    </div>
  );
}

export default function GymSession() {
  const { L, pick, num } = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const [active, setActive] = useStore('gymActive', null);
  const [sessions, setSessions] = useStore('gymSessions', EMPTY);
  const [profile] = useStore('profile', NONE);
  const [settings, setSettings] = useStore('settings', NONE);
  const [plan, setPlan] = useStore('gymPlan', null);
  const [adding, setAdding] = useState(false);
  const [howFor, setHowFor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [restUntil, setRestUntil] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [watch, setWatch] = useState(null);
  const hr = useRef(null);
  const link = useRef(null);
  const now = useNow();
  const rest = Number(settings.rest) || 90;

  const records = useMemo(() => personalRecords(sessions), [sessions]);

  useEffect(() => () => link.current?.disconnect(), []);

  // The rest is over: a short buzz, then the bar goes away.
  useEffect(() => {
    if (restUntil && now >= restUntil) {
      setRestUntil(0);
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [now, restUntil]);

  if (summary) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-6xl" aria-hidden>💪</div>
        <h1 className="text-2xl font-extrabold">{L('Workout done', 'أنهيت التمرين')}</h1>
        <div className="grid w-full grid-cols-2 gap-3">
          {[
            [L(`${summary.minutes} min`, `${summary.minutes} دقيقة`), L('Time', 'المدة')],
            [summary.sets, L('Sets', 'المجموعات')],
            [L(`${num(summary.volume)} kg`, `${num(summary.volume)} كجم`), L('Weight moved', 'الوزن المرفوع')],
            [L(`${summary.burn} kcal`, `${summary.burn} سعرة`), L('Burned (estimate)', 'السعرات المحروقة (تقدير)')],
            ...(summary.hr ? [[`${summary.hr.avg} / ${summary.hr.max}`, L('Heart rate avg / max', 'النبض متوسط / أقصى')]] : []),
            ...(summary.records ? [[summary.records, L('New records', 'أرقام قياسية جديدة')]] : []),
          ].map(([value, label]) => (
            <div key={label} className="card">
              <p className="tabular text-xl font-extrabold">{value}</p>
              <p className="muted text-sm">{label}</p>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={() => navigate('/gym', { replace: true })}>
          {L('Done', 'تم')}
        </button>
      </div>
    );
  }

  if (!active) return <Navigate to="/gym" replace />;

  const patchExercise = (i, fn) =>
    setActive({ ...active, exercises: active.exercises.map((e, j) => (j === i ? fn(e) : e)) });
  const patchSet = (i, k, patch) =>
    patchExercise(i, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === k ? { ...s, ...patch } : s)) }));

  const toggle = (i, k) => {
    const set = active.exercises[i].sets[k];
    patchSet(i, k, { done: !set.done });
    if (!set.done) setRestUntil(Date.now() + rest * 1000);
  };

  const connect = async () => {
    try {
      const device = await connectHeartRate(
        (value) => {
          setBpm(value);
          hr.current = hrStats(hr.current, value);
        },
        () => {
          setWatch(null);
          setBpm(0);
        },
      );
      link.current = device;
      setWatch(device.name);
    } catch (error) {
      if (error?.name !== 'NotFoundError') {
        toast(error?.message || L('Could not connect', 'تعذر الاتصال'), 'error');
      }
    }
  };

  const finish = () => {
    const done = finishSession(active, hr.current);
    link.current?.disconnect();
    if (!done.exercises.length) {
      setActive(null);
      toast(L('Nothing was logged, so nothing was saved', 'لم يُسجَّل شيء فلم يُحفظ شيء'));
      navigate('/gym', { replace: true });
      return;
    }
    let newRecords = 0;
    for (const e of done.exercises) if (e.sets.some((s) => isRecord(records, e.exerciseId, s))) newRecords += 1;
    setSessions([done, ...sessions]);
    if (plan && done.planDay !== undefined) setPlan({ ...plan, next: done.planDay + 1 });
    setSummary({
      minutes: sessionMinutes(done),
      sets: sessionSets(done),
      volume: sessionVolume(done),
      burn: estimateBurn(done, Number(profile.weight) || 70),
      hr: done.hr,
      records: newRecords,
    });
    setActive(null);
  };

  const elapsed = Math.max(0, (now - active.startedAt) / 1000);
  const restLeft = restUntil ? Math.max(0, (restUntil - now) / 1000) : 0;
  const nameOf = (e) => (e.name ? (typeof e.name === 'string' ? e.name : pick(e.name)) : pick(EXERCISES[e.exerciseId]?.name) || e.exerciseId);
  const howOf = (e) => (e.how ? (typeof e.how === 'string' ? e.how : pick(e.how)) : pick(EXERCISES[e.exerciseId]?.how));

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-40">
      <header className="pt-safe sticky top-0 z-20 text-white" style={{ background: COLOR }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/80">{active.name}</p>
            <p className="tabular text-2xl font-extrabold leading-none">{clock(elapsed)}</p>
          </div>
          {heartRateSupported() && (
            <button
              onClick={watch ? undefined : connect}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/15 px-3 font-bold"
              aria-label={watch ? L(`Heart rate ${bpm}`, `النبض ${bpm}`) : L('Connect a watch for heart rate', 'اربط الساعة لقياس النبض')}
            >
              <HeartPulse size={18} className={bpm ? 'animate-pulse' : ''} />
              <span className="tabular">{watch ? bpm || '…' : L('Watch', 'الساعة')}</span>
            </button>
          )}
          <button className="min-h-[44px] rounded-xl bg-white px-4 font-extrabold" style={{ color: COLOR }} onClick={finish}>
            {L('Finish', 'إنهاء')}
          </button>
        </div>
      </header>

      <main className="space-y-3 px-4 pt-3">
        {active.exercises.map((e, i) => {
          const last = lastPerformance(sessions, e.exerciseId, active.id);
          const target = e.unit === 'kg' ? nextTarget(last) : null;
          const muscle = MUSCLES[e.muscle] ? pick(MUSCLES[e.muscle]) : e.muscle;
          return (
            <div key={`${e.exerciseId}-${i}`} className="card !p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{nameOf(e)}</p>
                  {muscle && <p className="muted text-sm">{muscle}</p>}
                </div>
                {howOf(e) && (
                  <button className="muted flex h-10 w-10 items-center justify-center" aria-label={L('How to do it', 'طريقة الأداء')} onClick={() => setHowFor(howFor === i ? null : i)}>
                    <Info size={18} />
                  </button>
                )}
                <button
                  className="muted flex h-10 w-10 items-center justify-center"
                  aria-label={L('Remove exercise', 'حذف التمرين')}
                  onClick={() => setActive({ ...active, exercises: active.exercises.filter((_, j) => j !== i) })}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {howFor === i && (
                <div className="mt-1 rounded-xl bg-brand-50/50 p-3 dark:bg-white/5">
                  <ExerciseGuide exercise={{ ...e, how: howOf(e) }} />
                </div>
              )}
              {last && (
                <p className="muted mt-1 text-sm">
                  {L('Last time: ', 'المرة السابقة: ')}
                  <span className="tabular">
                    {last.sets
                      .map((s) => (e.unit === 'cardio' ? L(`${s.minutes} min`, `${s.minutes} د`) : e.unit === 'time' ? L(`${s.seconds} s`, `${s.seconds} ث`) : `${s.weight || 0}×${s.reps}`))
                      .join(L(', ', '، '))}
                  </span>
                </p>
              )}
              {target && (
                <p className="text-sm font-bold" style={{ color: COLOR }}>
                  {target.raise
                    ? L(`Today: go up to ${target.weight} kg × ${target.reps}`, `اليوم: ارفع إلى ${target.weight} كجم × ${target.reps}`)
                    : L(`Today: aim for ${target.weight} kg × ${target.reps}`, `اليوم: استهدف ${target.weight} كجم × ${target.reps}`)}
                </p>
              )}
              <div className="mt-2 space-y-1">
                {e.sets.map((s, k) => (
                  <SetRow
                    key={k}
                    index={k}
                    set={s}
                    unit={e.unit}
                    record={s.done && isRecord(records, e.exerciseId, s)}
                    onChange={(patch) => patchSet(i, k, patch)}
                    onToggle={() => toggle(i, k)}
                    onRemove={() => patchExercise(i, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== k) }))}
                  />
                ))}
              </div>
              <button className="btn-ghost mt-1 w-full !min-h-[40px]" onClick={() => patchExercise(i, addSet)}>
                <Plus size={16} /> {L('Add set', 'إضافة مجموعة')}
              </button>
            </div>
          );
        })}

        <button className="btn-soft w-full" onClick={() => setAdding(true)}>
          <Plus size={18} /> {L('Add exercise', 'إضافة تمرين')}
        </button>
        <button
          className="btn-danger w-full"
          onClick={() => {
            link.current?.disconnect();
            setActive(null);
            navigate('/gym', { replace: true });
          }}
        >
          {L('Discard workout', 'إلغاء التمرين')}
        </button>
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-brand-900/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0F1B1A]/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-2">
          <Timer size={20} className={restLeft ? '' : 'muted'} style={restLeft ? { color: COLOR } : undefined} />
          {restLeft ? (
            <>
              <div className="flex-1">
                <p className="tabular text-xl font-extrabold leading-none">{clock(restLeft)}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(restLeft / rest) * 100}%`, background: COLOR, transition: 'width 1s linear' }} />
                </div>
              </div>
              <button className="btn-soft !min-h-[40px]" onClick={() => setRestUntil(restUntil + 30000)}>+30</button>
              <button className="btn-soft !min-h-[40px]" onClick={() => setRestUntil(0)}>{L('Skip', 'تخطي')}</button>
            </>
          ) : (
            <>
              <p className="muted flex-1 text-sm">{L('Rest between sets', 'الراحة بين المجموعات')}</p>
              {[60, 90, 120, 180].map((s) => (
                <button key={s} className={`chip !min-h-[36px] !px-2.5 ${rest === s ? 'chip-on' : ''}`} onClick={() => setSettings({ ...settings, rest: s })}>
                  {s}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <ExercisePicker
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(exercise) => {
          setActive({ ...active, exercises: [...active.exercises, makeExercise(exercise, sessions)] });
          setAdding(false);
        }}
      />
    </div>
  );
}
