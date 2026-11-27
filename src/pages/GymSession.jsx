// The workout in progress: every machine in the gym, grouped under
// collapsible muscle headers, each with its state (not started, ongoing,
// finished). Tapping a machine opens its pop-up to add the numbers; every
// keystroke is saved on the device at once, so closing the app — or the app
// dying — loses nothing, and every pop-up reopens exactly as it was left.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, HeartPulse, Info, Plus, Search, Timer, Trash2, Trophy, X } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { NumberInput, Sheet, useToast } from '../components/ui';
import ExercisePicker, { useMachinePhotos } from '../components/ExercisePicker';
import ExerciseGuide from '../components/ExerciseGuide';
import KeywordsEditor from '../components/KeywordsEditor';
import { EQUIPMENT, EXERCISES, MUSCLES, equipmentById } from '../data/equipment';
import { estimateBurn, isRecord, lastPerformance, nextTarget, personalRecords, sessionMinutes, sessionSets, sessionVolume } from '../lib/gym';
import { addSet, finishSession, makeExercise, setComplete } from '../lib/gymSession';
import { groupTools, looseEntries, toolDoneSets, toolEntries, toolMatches, toolStatus } from '../lib/gymTools';
import { hrStats } from '../lib/hrParse';
import { connectHeartRate, heartRateSupported } from '../lib/heartRate';
import { watchSupported } from '../lib/watch';
import { link as linkWatch, live as watchLive, notifyWatch, onHeart, subscribe as watchSubscribe } from '../lib/watchLive';

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

const STATUS_STYLE = {
  todo: 'bg-brand-900/10 text-slate-500 dark:bg-white/10 dark:text-slate-300',
  doing: 'text-white',
  done: 'text-white',
};

export default function GymSession() {
  const { L, pick, num } = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const [active, setActive] = useStore('gymActive', null);
  const [sessions, setSessions] = useStore('gymSessions', EMPTY);
  const [profile] = useStore('profile', NONE);
  const [settings, setSettings] = useStore('settings', NONE);
  const [plan, setPlan] = useStore('gymPlan', null);
  const [keywords, setKeywords] = useStore('gymKeywords', NONE);
  const [adding, setAdding] = useState(false);
  const [howFor, setHowFor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [restUntil, setRestUntil] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [watch, setWatch] = useState(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(NONE);
  const [openTool, setOpenTool] = useState(null);
  const [popEx, setPopEx] = useState(null);
  const [openLoose, setOpenLoose] = useState(null);
  const hr = useRef(null);
  const link = useRef(null);
  const now = useNow();
  const rest = Number(settings.rest) || 90;
  const { photoOf } = useMachinePhotos();

  const records = useMemo(() => personalRecords(sessions), [sessions]);

  useEffect(() => () => link.current?.disconnect(), []);

  // The linked watch: connect when the workout opens, keep its heart sensor
  // measuring (a fresh measurement every minute) and collect the readings.
  const [savedWatch] = useStore('watch', null);
  const useMyWatch = Boolean(savedWatch?.id && watchSupported() && active);
  const [watchState, setWatchState] = useState(watchLive.status);
  useEffect(() => watchSubscribe(() => setWatchState(watchLive.status)), []);
  useEffect(() => {
    if (!useMyWatch) return undefined;
    if (watchLive.status !== 'connected' && watchLive.status !== 'connecting') linkWatch(savedWatch, profile);
    const off = onHeart((h) => {
      setBpm(h.bpm);
      hr.current = hrStats(hr.current, h.bpm);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMyWatch]);
  // Tell the watch the workout is on, once per workout.
  const greeted = useRef('');
  useEffect(() => {
    if (!useMyWatch || watchState !== 'connected' || greeted.current === active?.id) return;
    greeted.current = active?.id;
    const sess = watchLive.session;
    notifyWatch(sess?.canStartHeart?.() ? `Workout on: ${active?.name || 'gym'}` : 'Workout on. Start Training on the watch for live heart rate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMyWatch, watchState]);
  useEffect(() => {
    if (!useMyWatch || watchState !== 'connected') return undefined;
    const measure = () => watchLive.session?.measureHeart?.().catch(() => {});
    measure();
    const t = setInterval(measure, 60000);
    return () => {
      clearInterval(t);
      watchLive.session?.stopHeart?.().catch(() => {});
    };
  }, [useMyWatch, watchState]);

  // What the watch shows when the rest is over: the next set to do.
  const nextSetText = () => {
    for (const e of active?.exercises || []) {
      const k = e.sets.findIndex((x) => !x.done);
      if (k < 0) continue;
      const name = typeof e.name === 'string' ? e.name : e.name?.en || EXERCISES[e.exerciseId]?.name?.en || 'next exercise';
      const x = e.sets[k];
      return `Rest over. ${name}: set ${k + 1}${x.reps ? `, ${x.reps} reps` : ''}${x.weight ? ` x ${x.weight} kg` : ''}`;
    }
    return 'Rest over. All sets done!';
  };

  // The rest is over: a short buzz, then the bar goes away.
  useEffect(() => {
    if (restUntil && now >= restUntil) {
      setRestUntil(0);
      navigator.vibrate?.([200, 100, 200]);
      if (useMyWatch) notifyWatch(nextSetText());
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

  const doneTools = active.doneTools || EMPTY;
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
    if (useMyWatch) notifyWatch(`Done! ${sessionMinutes(done)} min, ${sessionSets(done)} sets`);
    setActive(null);
  };

  const elapsed = Math.max(0, (now - active.startedAt) / 1000);
  const restLeft = restUntil ? Math.max(0, (restUntil - now) / 1000) : 0;
  const nameOf = (e) => (e.name ? (typeof e.name === 'string' ? e.name : pick(e.name)) : pick(EXERCISES[e.exerciseId]?.name) || e.exerciseId);
  const howOf = (e) => (e.how ? (typeof e.how === 'string' ? e.how : pick(e.how)) : pick(EXERCISES[e.exerciseId]?.how));

  // --- The device list: every tool, grouped, searchable, with its state ---
  const searching = query.trim().length > 0;
  const groups = groupTools(EQUIPMENT, Object.keys(MUSCLES))
    .map((g) => ({
      ...g,
      tools: g.tools
        .filter((t) => toolMatches(t, EXERCISES, keywords, query, MUSCLES))
        .sort((a, b) => {
          const rank = { doing: 0, todo: 1, done: 2 };
          return rank[toolStatus(active, a, doneTools)] - rank[toolStatus(active, b, doneTools)];
        }),
    }))
    .filter((g) => g.tools.length);
  const loose = looseEntries(active, EQUIPMENT);
  const counts = EQUIPMENT.reduce(
    (acc, t) => {
      acc[toolStatus(active, t, doneTools)] += 1;
      return acc;
    },
    { todo: 0, doing: 0, done: 0 },
  );

  const statusChip = (tool) => {
    const st = toolStatus(active, tool, doneTools);
    const label =
      st === 'done'
        ? L('Finished', 'انتهى')
        : st === 'doing'
          ? L(`Ongoing · ${toolDoneSets(active, tool)} ✓`, `جارٍ · ${toolDoneSets(active, tool)} ✓`)
          : L('Not started', 'لم يبدأ');
    return (
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[st]}`}
        style={st === 'doing' ? { background: '#B97F10' } : st === 'done' ? { background: '#2F7D4F' } : undefined}
      >
        {label}
      </span>
    );
  };

  // Opening a machine starts its main exercise (the one most trained on it,
  // else its first) when the workout has none of its exercises yet.
  const openToolPop = (tool) => {
    const mine = toolEntries(active, tool);
    if (mine.length) {
      setPopEx(mine[0].exerciseId);
    } else {
      const per = {};
      for (const s of sessions) for (const e of s.exercises || []) if (tool.exercises.some((x) => x.id === e.exerciseId)) per[e.exerciseId] = (per[e.exerciseId] || 0) + 1;
      const first = [...tool.exercises].sort((a, b) => (per[b.id] || 0) - (per[a.id] || 0))[0];
      const entry = makeExercise(EXERCISES[first.id], sessions);
      setActive({ ...active, exercises: [...active.exercises, entry] });
      setPopEx(first.id);
    }
    setHowFor(null);
    setOpenTool(tool.id);
  };

  const toggleDoneTool = (tool) => {
    const has = doneTools.includes(tool.id);
    setActive({ ...active, doneTools: has ? doneTools.filter((id) => id !== tool.id) : [...doneTools, tool.id] });
  };

  const setEditor = (i, e) => {
    const last = lastPerformance(sessions, e.exerciseId, active.id);
    const target = e.unit === 'kg' ? nextTarget(last) : null;
    return (
      <div>
        {howOf(e) && (
          <button className="btn-ghost !min-h-[36px] !px-2 text-sm" onClick={() => setHowFor(howFor === i ? null : i)}>
            <Info size={16} /> {L('How to do it', 'طريقة الأداء')}
          </button>
        )}
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
  };

  const tool = openTool ? equipmentById(openTool) : null;
  const toolMine = tool ? toolEntries(active, tool) : EMPTY;
  const selId = toolMine.some((e) => e.exerciseId === popEx) ? popEx : toolMine[0]?.exerciseId;
  const selIdx = selId ? active.exercises.findIndex((e) => e.exerciseId === selId) : -1;
  const looseEntry = openLoose != null ? active.exercises[openLoose] : null;
  const looseValid = looseEntry && !EQUIPMENT.some((t) => t.exercises.some((x) => x.id === looseEntry.exerciseId));

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-40">
      <header className="pt-safe sticky top-0 z-20 text-white" style={{ background: COLOR }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/80">{active.name}</p>
            <p className="tabular text-2xl font-extrabold leading-none">{clock(elapsed)}</p>
          </div>
          {useMyWatch ? (
            <button
              onClick={() => {
                const sess = watchLive.session;
                if (watchState !== 'connected') linkWatch(savedWatch, profile);
                else if (sess?.canStartHeart?.() === false && sess.promptHeart) sess.promptHeart().catch(() => {});
                else sess?.measureHeart?.().catch(() => {});
              }}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/15 px-3 font-bold"
              aria-label={L(`Heart rate from my watch ${bpm || ''}`, `النبض من ساعتي ${bpm || ''}`)}
            >
              <HeartPulse size={18} className={bpm ? 'animate-pulse' : ''} />
              <span className="tabular">{watchState === 'connected' ? bpm || '…' : watchState === 'connecting' ? '…' : '⌚'}</span>
            </button>
          ) : heartRateSupported() && (
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
        <label className="relative block">
          <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            className="input !ps-10"
            placeholder={L('Search a device — Arabic, English, or your words', 'ابحث عن جهاز — بالعربية أو الإنجليزية أو بكلماتك')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="muted px-1 text-sm">
          {L(
            `${counts.done} finished · ${counts.doing} ongoing · ${counts.todo} not started — everything saves automatically on this device.`,
            `${counts.done} منتهية · ${counts.doing} جارية · ${counts.todo} لم تبدأ — كل شيء يُحفظ تلقائياً على هذا الجهاز.`,
          )}
        </p>

        {groups.map((g) => {
          const isCollapsed = !searching && collapsed[g.muscle];
          const gDone = g.tools.filter((t) => toolStatus(active, t, doneTools) === 'done').length;
          return (
            <section key={g.muscle} className="overflow-hidden rounded-2xl border border-brand-900/10 dark:border-white/10">
              <button
                className="flex w-full items-center gap-2 bg-brand-50/70 px-4 py-3 text-start dark:bg-white/5"
                onClick={() => setCollapsed({ ...collapsed, [g.muscle]: !collapsed[g.muscle] })}
                aria-expanded={!isCollapsed}
              >
                <span className="flex-1 font-extrabold">{MUSCLES[g.muscle] ? pick(MUSCLES[g.muscle]) : g.muscle}</span>
                <span className="muted text-xs">
                  {gDone > 0 ? L(`${gDone}/${g.tools.length} finished`, `${gDone}/${g.tools.length} منتهية`) : L(`${g.tools.length} devices`, `${g.tools.length} أجهزة`)}
                </span>
                <ChevronDown size={18} className={`muted transition ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-brand-900/5 dark:divide-white/5">
                  {g.tools.map((t) => (
                    <button key={t.id} className="flex w-full items-center gap-3 px-3 py-2.5 text-start active:bg-brand-50/60 dark:active:bg-white/5" onClick={() => openToolPop(t)}>
                      {photoOf(t.id)
                        ? <img src={photoOf(t.id)} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                        : <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50/70 text-2xl dark:bg-white/5" aria-hidden>{t.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold leading-tight">{pick(t.name)}</span>
                        <span className="muted block text-xs">
                          {L(`${t.exercises.length} exercises`, `${t.exercises.length} تمارين`)}
                          {(keywords[t.id] || []).length > 0 && ` · ${(keywords[t.id] || []).join('، ')}`}
                        </span>
                      </span>
                      {statusChip(t)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {searching && !groups.length && !loose.length && (
          <p className="muted card text-center text-sm">{L('No device matches. Try another word, or add it as a keyword on the machine you mean.', 'لا يوجد جهاز مطابق. جرّب كلمة أخرى، أو أضفها ككلمة خاصة على الجهاز الذي تقصده.')}</p>
        )}

        {loose.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-brand-900/10 dark:border-white/10">
            <p className="bg-brand-50/70 px-4 py-3 font-extrabold dark:bg-white/5">{L('Added exercises', 'تمارين مضافة')}</p>
            <div className="divide-y divide-brand-900/5 dark:divide-white/5">
              {loose.map(({ entry, index }) => {
                const doneCount = (entry.sets || []).filter((s) => s.done).length;
                return (
                  <button key={`${entry.exerciseId}-${index}`} className="flex w-full items-center gap-3 px-3 py-2.5 text-start" onClick={() => { setHowFor(null); setOpenLoose(index); }}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold leading-tight">{nameOf(entry)}</span>
                      <span className="muted block text-xs">{L(`${(entry.sets || []).length} sets`, `${(entry.sets || []).length} مجموعات`)}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${doneCount ? 'text-white' : STATUS_STYLE.todo}`}
                      style={doneCount ? { background: '#B97F10' } : undefined}
                    >
                      {doneCount ? L(`Ongoing · ${doneCount} ✓`, `جارٍ · ${doneCount} ✓`) : L('Not started', 'لم يبدأ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button className="btn-soft w-full" onClick={() => setAdding(true)}>
          <Plus size={18} /> {L('Add your own exercise', 'أضف تمريناً خاصاً')}
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

      {/* The machine pop-up: its exercises, the numbers, its own Save. */}
      <Sheet
        open={Boolean(tool)}
        onClose={() => setOpenTool(null)}
        title={tool ? `${tool.icon} ${pick(tool.name)}` : ''}
        footer={
          tool && (
            <div className="flex gap-2">
              <button
                className={`btn-soft flex-1 ${doneTools.includes(tool.id) ? '!bg-[#2F7D4F] !text-white' : ''}`}
                onClick={() => toggleDoneTool(tool)}
                aria-pressed={doneTools.includes(tool.id)}
              >
                <Check size={18} />
                {doneTools.includes(tool.id) ? L('Finished — tap to undo', 'انتهى — اضغط للتراجع') : L('Mark finished', 'وضع علامة انتهى')}
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  setOpenTool(null);
                  toast(L('Saved on this device', 'حُفظ على هذا الجهاز'));
                }}
              >
                {L('Save', 'حفظ')}
              </button>
            </div>
          )
        }
      >
        {tool && (
          <div className="space-y-3">
            {photoOf(tool.id) && <img src={photoOf(tool.id)} alt="" className="max-h-44 w-full rounded-2xl object-cover" />}
            <div className="flex flex-wrap gap-1.5">
              {tool.exercises.map((x) => {
                const inSession = toolMine.some((e) => e.exerciseId === x.id);
                const selected = selId === x.id;
                return (
                  <button
                    key={x.id}
                    className={`rounded-full px-3 py-2 text-sm font-bold ${selected ? 'text-white' : inSession ? 'bg-brand-100 dark:bg-white/15' : 'bg-brand-50/70 dark:bg-white/5'}`}
                    style={selected ? { background: COLOR } : undefined}
                    onClick={() => {
                      if (!inSession) setActive({ ...active, exercises: [...active.exercises, makeExercise(EXERCISES[x.id], sessions)] });
                      setPopEx(x.id);
                    }}
                  >
                    {pick(EXERCISES[x.id].name)}
                    {!inSession && ' +'}
                  </button>
                );
              })}
            </div>
            {selIdx >= 0 && setEditor(selIdx, active.exercises[selIdx])}
            {selIdx >= 0 && (
              <button
                className="btn-ghost w-full !min-h-[40px] text-sm"
                onClick={() => {
                  const wasLast = toolMine.length <= 1;
                  setActive({
                    ...active,
                    exercises: active.exercises.filter((_, j) => j !== selIdx),
                    ...(wasLast ? { doneTools: doneTools.filter((id) => id !== tool.id) } : {}),
                  });
                  setPopEx(null);
                }}
              >
                <Trash2 size={16} /> {L('Remove this exercise from the workout', 'حذف هذا التمرين من الحصة')}
              </button>
            )}
            <KeywordsEditor toolId={tool.id} keywords={keywords} onChange={setKeywords} />
            <p className="muted text-center text-xs">{L('Saves automatically as you type — reopen any time, even after closing the app.', 'يُحفظ تلقائياً أثناء الكتابة — أعد الفتح في أي وقت، حتى بعد إغلاق التطبيق.')}</p>
          </div>
        )}
      </Sheet>

      {/* A custom exercise's pop-up: the same editor, without a machine. */}
      <Sheet
        open={Boolean(looseValid)}
        onClose={() => setOpenLoose(null)}
        title={looseValid ? nameOf(looseEntry) : ''}
        footer={
          <button
            className="btn-primary w-full"
            onClick={() => {
              setOpenLoose(null);
              toast(L('Saved on this device', 'حُفظ على هذا الجهاز'));
            }}
          >
            {L('Save', 'حفظ')}
          </button>
        }
      >
        {looseValid && (
          <div className="space-y-3">
            {setEditor(openLoose, looseEntry)}
            <button
              className="btn-ghost w-full !min-h-[40px] text-sm"
              onClick={() => {
                setActive({ ...active, exercises: active.exercises.filter((_, j) => j !== openLoose) });
                setOpenLoose(null);
              }}
            >
              <Trash2 size={16} /> {L('Remove this exercise from the workout', 'حذف هذا التمرين من الحصة')}
            </button>
          </div>
        )}
      </Sheet>

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
