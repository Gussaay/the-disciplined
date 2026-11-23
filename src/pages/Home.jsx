import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, BookOpen, ChevronRight, Droplets, Dumbbell, Flame, Footprints, Languages, ListChecks,
  MoonStar, Scale, Settings as SettingsIcon, Sparkles, Users, UtensilsCrossed, Watch as WatchIcon,
} from 'lucide-react';
import UpdateBanner from '../components/UpdateBanner';
import { useAuth } from '../hooks/useAuth';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { GOALS, goalById } from '../config';
import { Sheet } from '../components/ui';
import ProfileForm from '../components/ProfileForm';
import { commitment } from '../lib/score';
import { dayKey, lastDays, streak, fromKey } from '../lib/dates';
import { sessionsThisWeek, trainedOn } from '../lib/gym';
import { dailyTargets, totals } from '../lib/nutrition';
import { PRAYERS, countdown, daySummary, prayerNow, prayerTimes } from '../lib/prayer';
import { needsContact, sortByDue } from '../lib/social';
import { dayProgress, studyStreak } from '../lib/english';

const NONE = {};
const EMPTY = [];

/** Five arcs, one per goal, each filled by how far that goal went today. */
function CommitmentRing({ parts, overall, label }) {
  const size = 168;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 10;
  const arc = c / parts.length - gap;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        {parts.map((p, i) => {
          const offset = -(i * (arc + gap) + gap / 2);
          return (
            <g key={p.id}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${c - arc}`} strokeDashoffset={offset} />
              {p.value > 0.02 && (
                <circle
                  cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.value >= 0.999 ? '#EBCB73' : '#FFFFFF'} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${arc * Math.min(1, p.value)} ${c}`} strokeDashoffset={offset}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-4xl font-extrabold leading-none">{Math.round(overall * 100)}<span className="text-xl">%</span></span>
      </div>
    </div>
  );
}

export default function Home() {
  const { L, pick, date, hijri, time, num } = useLang();
  const [profile, setProfile] = useStore('profile', NONE);
  const [settings] = useStore('settings', NONE);
  const [gymSessions] = useStore('gymSessions', EMPTY);
  const [foodLog] = useStore('foodLog', NONE);
  const [water] = useStore('water', NONE);
  const [prayerLog] = useStore('prayerLog', NONE);
  const [weightLog] = useStore('weightLog', EMPTY);
  const [tasks] = useStore('tasks', EMPTY);
  const [watch] = useStore('watch', null);
  const [watchLog] = useStore('watchLog', NONE);
  const [prayerSettings] = useStore('prayerSettings', NONE);
  const [contacts] = useStore('contacts', EMPTY);
  const [english] = useStore('english', NONE);
  const [draft, setDraft] = useState(null);
  const { user } = useAuth();
  const name = profile.name || user?.displayName || '';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const today = dayKey(now);
  const data = { profile, settings, gymSessions, foodLog, prayerLog, contacts, english };
  const score = commitment(data, today);

  // Days in a row with at least 60% commitment.
  const days = useMemo(
    () => streak((key) => commitment(data, key).overall >= 0.6, today, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, gymSessions, foodLog, prayerLog, contacts, english, profile],
  );

  const times = prayerTimes(prayerSettings, now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const state = prayerNow(times, now, prayerTimes(prayerSettings, tomorrow).fajr);
  const nextPrayer = state.next && PRAYERS.find((p) => p.id === state.next.id);

  const targets = dailyTargets(profile);
  const eaten = totals(foodLog[today] || EMPTY);
  const prayed = daySummary(prayerLog[today]);
  const due = sortByDue(contacts, today).filter((x) => needsContact(x.info));
  const study = dayProgress(english, english.log, fromKey(today));

  const status = {
    gym: trainedOn(gymSessions, today)
      ? L('Trained today', 'تمرّنت اليوم')
      : L(`${sessionsThisWeek(gymSessions, today)} of ${Number(profile.gymDays) || 3} sessions this week`, `${sessionsThisWeek(gymSessions, today)} من ${Number(profile.gymDays) || 3} حصص هذا الأسبوع`),
    food: eaten.kcal
      ? L(`${num(eaten.kcal)} of ${num(targets.kcal)} kcal · protein ${Math.round(eaten.protein)} g`, `${num(eaten.kcal)} من ${num(targets.kcal)} سعرة · بروتين ${Math.round(eaten.protein)} جم`)
      : L('Nothing logged yet today', 'لم تسجل شيئاً اليوم'),
    prayer: L(`${prayed.prayed} of 5 prayed · ${prayed.mosque} in the mosque`, `${prayed.prayed} من 5 صلوات · ${prayed.mosque} في المسجد`),
    social: !contacts.length
      ? L('Add the people you want to stay close to', 'أضف من تحب أن تبقى على صلة بهم')
      : due.length
        ? L(`${due.length} waiting to hear from you`, `${due.length} بانتظار تواصلك`)
        : L('Everyone is up to date', 'تواصلت مع الجميع'),
    english: L(`${study.done} of ${study.total} tasks · ${studyStreak(english.log, today)} day streak`, `${study.done} من ${study.total} مهام · ${studyStreak(english.log, today)} أيام متتالية`),
  };

  const goals = GOALS.filter((g) => score.active.includes(g.id));
  const lastWeight = weightLog.reduce((a, b) => (!a || b.at > a.at ? b : a), null);
  const week = lastDays(7, today).map((key) => ({ key, value: commitment(data, key).overall }));
  const firstRun = !profile.setup;

  // The services grid: every section one tap from Home, one icon language
  // (Lucide line icons at a fixed stroke, each in its goal's colour).
  const services = [
    { to: '/gym', g: 'gym', Icon: Dumbbell },
    { to: '/food', g: 'food', Icon: UtensilsCrossed },
    { to: '/prayer', g: 'prayer', Icon: MoonStar },
    { to: '/prayer/quran', label: L('Quran', 'القرآن'), color: goalById('prayer').color, Icon: BookOpen },
    { to: '/prayer/azkar', label: L('Azkar', 'الأذكار'), color: goalById('prayer').color, Icon: Sparkles },
    { to: '/social', g: 'social', Icon: Users },
    { to: '/english', g: 'english', Icon: Languages },
    { to: '/tasks', g: 'tasks', Icon: ListChecks },
    { to: '/weight', g: 'weight', Icon: Scale },
    { to: '/watch', g: 'watch', Icon: WatchIcon },
    { to: '/dashboard', label: L('Dashboard', 'لوحة المتابعة'), color: '#0F3D3E', Icon: BarChart3 },
    { to: '/settings', label: L('Settings', 'الإعدادات'), color: '#0F3D3E', Icon: SettingsIcon },
  ].map((s) => (s.g ? { ...s, label: pick(goalById(s.g).short || goalById(s.g).name), color: goalById(s.g).color } : s));

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <div className="pt-safe hero rounded-b-[2rem] text-white">
        <div className="px-5 pb-6 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-white/70">{date(now)}</p>
              <p className="text-sm text-gold-300">{hijri(now)}</p>
              <h1 className="mt-2 text-2xl font-extrabold">
                {name ? L(`Peace be upon you, ${name}`, `السلام عليكم، ${name}`) : L('Peace be upon you', 'السلام عليكم')}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to="/dashboard" aria-label={L('Dashboard', 'لوحة المتابعة')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <BarChart3 size={20} />
              </Link>
              <Link to="/settings" aria-label={L('Settings', 'الإعدادات')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <SettingsIcon size={20} />
              </Link>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <CommitmentRing
              parts={goals.map((g) => ({ id: g.id, value: score[g.id] }))}
              overall={score.overall}
              label={L(`Today's commitment ${Math.round(score.overall * 100)}%`, `التزام اليوم ${Math.round(score.overall * 100)}٪`)}
            />
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-sm text-white/70">{L('Today’s commitment', 'التزام اليوم')}</p>
                <p className="flex items-center gap-1.5 text-lg font-bold">
                  <Flame size={18} className="text-gold-300" />
                  {L(`${days} day streak`, `${days} أيام متتالية`)}
                </p>
              </div>
              {nextPrayer && (
                <Link to="/prayer" className="block rounded-2xl bg-white/10 px-3 py-2 hover:bg-white/15">
                  <p className="text-xs text-white/70">{L('Next prayer', 'الصلاة القادمة')}</p>
                  <p className="font-bold">
                    {pick(nextPrayer.name)} · <span className="tabular">{time(state.next.at)}</span>
                  </p>
                  <p className="tabular text-xs text-gold-300">
                    {state.msLeft >= 3600000 ? L(`in ${countdown(state.msLeft)} h`, `بعد ${countdown(state.msLeft)} ساعة`) : L(`in ${countdown(state.msLeft)} min`, `بعد ${countdown(state.msLeft)} دقيقة`)}
                  </p>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-end gap-1.5" aria-label={L('Last 7 days', 'آخر 7 أيام')}>
            {week.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-8 w-full items-end">
                  <div className="w-full rounded-sm" style={{ height: `${Math.max(8, d.value * 100)}%`, background: d.value >= 0.6 ? '#EBCB73' : 'rgba(255,255,255,0.3)' }} />
                </div>
                <span className={`text-[11px] ${d.key === today ? 'font-bold text-white' : 'text-white/60'}`}>
                  {date(fromKey(d.key), { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <Link to="/watch" className="glass flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
              <Footprints size={17} className="text-gold-300" />
              <span className="tabular max-w-full truncate text-sm font-extrabold">{watchLog[today]?.steps != null ? num(watchLog[today].steps) : '—'}</span>
              <span className="text-[11px] text-white/70">{L('Steps', 'خطوات')}</span>
            </Link>
            <Link to="/food" className="glass flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
              <Flame size={17} className="text-gold-300" />
              <span className="tabular max-w-full truncate text-sm font-extrabold">{num(Math.round(eaten.kcal))}</span>
              <span className="text-[11px] text-white/70">{L(`of ${num(targets.kcal)} kcal`, `من ${num(targets.kcal)} سعرة`)}</span>
            </Link>
            <Link to="/food" className="glass flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
              <Droplets size={17} className="text-gold-300" />
              <span className="tabular max-w-full truncate text-sm font-extrabold">{(water[today] || 0) >= 1000 ? `${num((water[today] || 0) / 1000, 1)} ${L('L', 'لتر')}` : `${num(water[today] || 0)} ${L('ml', 'مل')}`}</span>
              <span className="text-[11px] text-white/70">{L('Water', 'الماء')}</span>
            </Link>
            <Link to="/weight" className="glass flex flex-col items-center gap-0.5 px-1 py-2.5 text-center">
              <Scale size={17} className="text-gold-300" />
              <span className="tabular max-w-full truncate text-sm font-extrabold">{lastWeight ? num(lastWeight.weight, 1) : '—'}</span>
              <span className="text-[11px] text-white/70">{L('kg · weight', 'كجم · الوزن')}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        <UpdateBanner />
        {goals.map((g) => (
          <Link key={g.id} to={g.path} className="card flex animate-rise items-center gap-3 active:scale-[0.99]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${g.color}1F` }} aria-hidden>
              {g.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-bold">{pick(g.name)}</p>
                <span className="tabular text-sm font-bold" style={{ color: g.color }}>{Math.round(score[g.id] * 100)}%</span>
              </div>
              <p className="muted truncate text-sm">{status[g.id]}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score[g.id] * 100}%`, background: g.color }} />
              </div>
            </div>
            <ChevronRight size={18} className="muted flip-rtl shrink-0" />
          </Link>
        ))}
        <ModuleLink
          id="tasks"
          status={(() => {
            const open = tasks.filter((t) => !t.done && t.due && t.due <= today).length;
            return open ? L(`${open} of your tasks for today`, `${open} من مهامك لليوم`) : L('Your goals and your own tasks in one list', 'أهدافك ومهامك في قائمة واحدة');
          })()}
        />
        <ModuleLink id="weight" status={lastWeight ? L(`${num(lastWeight.weight, 1)} kg${lastWeight.fat != null ? ` · fat ${num(lastWeight.fat, 1)}%` : ''}`, `${num(lastWeight.weight, 1)} كجم${lastWeight.fat != null ? ` · دهون ${num(lastWeight.fat, 1)}٪` : ''}`) : L('Read your Bluetooth scale', 'اقرأ ميزانك بالبلوتوث')} />
        <ModuleLink
          id="watch"
          status={watch ? (watchLog[today]?.steps != null ? L(`${num(watchLog[today].steps)} steps today${watchLog[today].bpm ? ` · ${watchLog[today].bpm} bpm` : ''}`, `${num(watchLog[today].steps)} خطوة اليوم${watchLog[today].bpm ? ` · ${watchLog[today].bpm} نبضة` : ''}`) : L(`${watch.name || 'Watch'} linked`, `${watch.name || 'الساعة'} مرتبطة`)) : L('Link your watch without its app', 'اربط ساعتك بدون تطبيقها')}
        />
        <Link to="/dashboard" className="card flex items-center gap-3 active:scale-[0.99]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-white/10 dark:text-white" aria-hidden>
            <BarChart3 />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{L('Dashboard', 'لوحة المتابعة')}</p>
            <p className="muted truncate text-sm">{L('Every goal over the week, month or three months', 'كل الأهداف خلال أسبوع أو شهر أو ثلاثة أشهر')}</p>
          </div>
          <ChevronRight size={18} className="muted flip-rtl shrink-0" />
        </Link>

        <div className="pt-2">
          <p className="eyebrow px-1 pb-2">{L('All sections', 'كل الأقسام')}</p>
          <div className="grid grid-cols-4 gap-2">
            {services.map((s) => (
              <Link key={s.to} to={s.to} className="card flex flex-col items-center gap-1.5 px-1 py-3 text-center active:scale-[0.97]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${s.color}1F`, color: s.color }} aria-hidden>
                  <s.Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="w-full truncate text-xs font-bold">{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Sheet
        open={firstRun}
        onClose={() => setProfile({ ...profile, ...(draft || {}), setup: true })}
        title={L('Welcome to The Disciplined', 'مرحباً بك في الملتزم')}
        footer={
          <button className="btn-primary w-full" onClick={() => setProfile({ ...profile, ...(draft || {}), setup: true })}>
            {L('Start', 'ابدأ')}
          </button>
        }
      >
        <p className="muted text-sm">
          {L(
            'Five goals, one place: training, food, prayer, the people you love, and English. A few details set your daily targets; you can change them later in Settings.',
            'خمسة أهداف في مكان واحد: التمرين، الغذاء، الصلاة، صلة من تحب، والإنجليزية. بعض البيانات تحدد أهدافك اليومية، ويمكنك تغييرها لاحقاً من الإعدادات.',
          )}
        </p>
        <ProfileForm value={draft || profile} onChange={setDraft} />
      </Sheet>
    </div>
  );
}

function ModuleLink({ id, status }) {
  const { pick } = useLang();
  const m = goalById(id);
  return (
    <Link to={m.path} className="card flex items-center gap-3 active:scale-[0.99]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${m.color}1F` }} aria-hidden>
        {m.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{pick(m.name)}</p>
        <p className="muted truncate text-sm">{status}</p>
      </div>
      <ChevronRight size={18} className="muted flip-rtl shrink-0" />
    </Link>
  );
}
