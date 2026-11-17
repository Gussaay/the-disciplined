import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, History, Play, Sparkles, Watch } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Page, Section, Sheet, useToast } from '../components/ui';
import ExercisePicker from '../components/ExercisePicker';
import { useAiError } from '../components/Ai';
import { EXERCISES, PROGRAMS } from '../data/equipment';
import { dailyTotals, personalRecords, sessionsThisWeek } from '../lib/gym';
import { newSession } from '../lib/gymSession';
import { dayKey, fromKey } from '../lib/dates';
import { askAI, aiAvailable } from '../lib/ai';
import { readWorkout, workoutPrompt } from '../lib/aiPrompts';
import { healthSupported, readHealthToday } from '../lib/health';

const NONE = {};
const EMPTY = [];
const COLOR = goalById('gym').color;

export default function Gym() {
  const { L, pick, date, num, lang } = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const aiError = useAiError();
  const [sessions] = useStore('gymSessions', EMPTY);
  const [active, setActive] = useStore('gymActive', null);
  const [plan, setPlan] = useStore('gymPlan', null);
  const [profile, setProfile] = useStore('profile', NONE);
  const [health, setHealth] = useStore('healthToday', null);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState('');

  const today = dayKey();
  const week = dailyTotals(sessions, 7, today);
  const done = sessionsThisWeek(sessions, today);
  const goal = Number(profile.gymDays) || 3;
  const records = Object.keys(personalRecords(sessions)).length;

  // `planDay` rides on the workout so the programme moves on only once the
  // workout is really saved (GymSession), not when it is merely started.
  const start = (name, exercises, planDay) => {
    setActive({ ...newSession(name, exercises, sessions), ...(planDay === undefined ? {} : { planDay }) });
    navigate('/gym/session');
  };

  // The programme day to do next: the one after the last finished day.
  const nextDay = plan ? plan.days[(Number(plan.next) || 0) % plan.days.length] : null;
  const nextIndex = plan ? (Number(plan.next) || 0) % plan.days.length : 0;

  const askProgram = async () => {
    setBusy('plan');
    try {
      const ids = Object.keys(EXERCISES);
      const json = await askAI({
        ...workoutPrompt({ profile, equipment: ids, days: goal, minutes: 50, lang }),
        json: true,
      });
      setPlan({ ...readWorkout(json, ids), id: 'ai', next: 0 });
      setChoosing(false);
      toast(L('Your programme is ready', 'برنامجك جاهز'));
    } catch (error) {
      aiError(error);
    } finally {
      setBusy('');
    }
  };

  const loadHealth = async () => {
    setBusy('health');
    try {
      const data = await readHealthToday();
      setHealth({ ...data, day: today });
      if (data.weight && data.weight !== Number(profile.weight)) setProfile({ ...profile, weight: data.weight });
    } catch (error) {
      toast(
        error?.code === 'health-unavailable'
          ? L('Install Health Connect from Google Play, then try again', 'ثبّت Health Connect من متجر Google Play ثم حاول مجدداً')
          : error?.message || L('Could not read health data', 'تعذرت قراءة البيانات الصحية'),
        'error',
      );
    } finally {
      setBusy('');
    }
  };

  const healthNow = health?.day === today ? health : null;

  return (
    <Page
      goal="gym"
      title={L('Training', 'التمرين')}
      subtitle={L(`${done} of ${goal} sessions this week`, `${done} من ${goal} حصص هذا الأسبوع`)}
      action={
        <Link to="/gym/history" className="btn-ghost !px-3" aria-label={L('History', 'السجل')}>
          <History size={20} />
        </Link>
      }
    >
      {active && (
        <Link to="/gym/session" className="flex items-center gap-3 rounded-2xl p-4 text-white" style={{ background: COLOR }}>
          <Activity />
          <div className="flex-1">
            <p className="font-bold">{L('Workout in progress', 'تمرين جارٍ')}</p>
            <p className="text-sm text-white/80">{active.name}</p>
          </div>
          <span className="font-bold">{L('Continue', 'متابعة')}</span>
        </Link>
      )}

      <div className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-bold">{L('This week', 'هذا الأسبوع')}</p>
          <p className="muted tabular text-sm">
            {L(`${num(week.reduce((s, d) => s + d.volume, 0))} kg lifted · ${records} records`, `${num(week.reduce((s, d) => s + d.volume, 0))} كجم مرفوعة · ${records} أرقام قياسية`)}
          </p>
        </div>
        <Bars
          color={COLOR}
          data={week.map((d) => ({ label: date(fromKey(d.key), { weekday: 'short' }), value: d.minutes }))}
          format={(v) => L(`${v} min`, `${v} دقيقة`)}
        />
      </div>

      {!active && (
        <Section title={L('Start', 'ابدأ')}>
          {nextDay && (
            <div className="card">
              <p className="eyebrow">{plan.name?.en ? pick(plan.name) : plan.name}</p>
              <p className="mt-1 text-lg font-extrabold">{nextDay.name?.en ? pick(nextDay.name) : nextDay.name}</p>
              <p className="muted mt-1 text-sm">
                {nextDay.exercises.map((id) => pick(EXERCISES[id]?.name)).filter(Boolean).join(L(' · ', ' · '))}
              </p>
              <button
                className="btn-primary mt-3 w-full"
                onClick={() => {
                  start(nextDay.name?.en ? pick(nextDay.name) : nextDay.name, nextDay.exercises.map((id) => EXERCISES[id]).filter(Boolean), nextIndex);
                }}
              >
                <Play size={18} /> {L('Start this day', 'ابدأ هذا اليوم')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft" onClick={() => start(L('Free workout', 'تمرين حر'), [])}>
              <Play size={18} /> {L('Free workout', 'تمرين حر')}
            </button>
            <button className="btn-soft" onClick={() => setChoosing(true)}>
              {plan ? L('Change programme', 'تغيير البرنامج') : L('Choose a programme', 'اختر برنامجاً')}
            </button>
          </div>
        </Section>
      )}

      <Section title={L('Smartwatch and health', 'الساعة الذكية والصحة')}>
        <div className="card space-y-3">
          {healthNow ? (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                [num(healthNow.steps), L('steps', 'خطوة')],
                [num(healthNow.calories), L('kcal', 'سعرة')],
                [num(healthNow.km, 1), L('km', 'كم')],
                [healthNow.hrAvg || '–', L('avg bpm', 'متوسط النبض')],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="tabular text-lg font-extrabold">{value}</p>
                  <p className="muted text-xs">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">
              {healthSupported
                ? L(
                  'Read today’s steps, calories and heart rate that your watch saved to Health Connect. During a workout you can also show your live heart rate.',
                  'اقرأ خطوات اليوم والسعرات والنبض التي حفظتها ساعتك في Health Connect. ويمكنك أثناء التمرين عرض نبضك مباشرة.',
                )
                : L(
                  'During a workout, connect a watch or strap over Bluetooth to see your live heart rate (Chrome or Edge). Daily steps and calories from the watch are read in the Android app.',
                  'أثناء التمرين، اربط ساعتك أو حزام النبض عبر البلوتوث لعرض نبضك مباشرة (متصفح Chrome أو Edge). أما خطوات اليوم والسعرات من الساعة فتُقرأ في تطبيق أندرويد.',
                )}
            </p>
          )}
          {healthSupported && (
            <button className="btn-soft w-full" onClick={loadHealth} disabled={busy === 'health'}>
              <Watch size={18} />
              {busy === 'health' ? L('Reading…', 'جارٍ القراءة…') : healthNow ? L('Refresh', 'تحديث') : L('Read from my watch', 'اقرأ من ساعتي')}
            </button>
          )}
        </div>
      </Section>

      <Section
        title={L('Equipment and exercises', 'الأجهزة والتمارين')}
      >
        <p className="muted px-1 text-sm">
          {L(
            'Pick a machine, or take a photo of it, to see what to do on it and how.',
            'اختر جهازاً أو التقط صورة له لتعرف ماذا تتمرن عليه وكيف.',
          )}
        </p>
        <ExercisePicker
          addLabel={active ? L('Add', 'إضافة') : L('Start', 'ابدأ')}
          onAdd={(exercise) => {
            if (active) {
              setActive({ ...active, exercises: [...active.exercises, ...newSession('', [exercise], sessions).exercises] });
              navigate('/gym/session');
            } else {
              start(exercise.custom ? exercise.name : pick(exercise.name), [exercise]);
            }
          }}
        />
      </Section>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title={L('Training programme', 'برنامج التمرين')}>
        {PROGRAMS.map((p) => (
          <button
            key={p.id}
            className={`card block w-full text-start ${plan?.id === p.id ? 'ring-2 ring-brand-600' : ''}`}
            onClick={() => {
              setPlan({ ...p, next: 0 });
              setChoosing(false);
            }}
          >
            <p className="font-bold">{pick(p.name)}</p>
            <p className="muted text-sm">{pick(p.about)}</p>
          </button>
        ))}
        <button className="btn-primary w-full" onClick={askProgram} disabled={busy === 'plan' || !aiAvailable()}>
          <Sparkles size={18} />
          {busy === 'plan' ? L('Writing your programme…', 'جارٍ كتابة برنامجك…') : L('Let the AI write one for me', 'دع الذكاء الاصطناعي يكتب لي برنامجاً')}
        </button>
        {!aiAvailable() && <p className="muted text-center text-sm">{L('Needs AI, see Settings.', 'يحتاج إلى الذكاء الاصطناعي، راجع الإعدادات.')}</p>}
        {plan && (
          <button className="btn-danger w-full" onClick={() => { setPlan(null); setChoosing(false); }}>
            {L('Train without a programme', 'التمرين بدون برنامج')}
          </button>
        )}
      </Sheet>

    </Page>
  );
}
