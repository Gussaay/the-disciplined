// The dashboard: every goal over the last week, month or three months.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { GOALS, goalById } from '../config';
import { Bars, Page, Segmented } from '../components/ui';
import { dashboard } from '../lib/dashboard';
import { dayKey, fromKey } from '../lib/dates';
import { PRAYERS } from '../lib/prayer';

const NONE = {};
const EMPTY = [];
const pct = (v) => `${Math.round((v || 0) * 100)}%`;

function Tile({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl bg-brand-50 p-3 dark:bg-white/5">
      <p className="muted text-xs">{label}</p>
      <p className="tabular text-xl font-extrabold" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="muted text-xs">{sub}</p>}
    </div>
  );
}

function GoalCard({ goal, children, to }) {
  const { pick } = useLang();
  return (
    <section className="card space-y-3">
      <Link to={to || goal.path} className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: `${goal.color}1F` }} aria-hidden>{goal.icon}</span>
        <h2 className="text-lg font-extrabold">{pick(goal.name)}</h2>
      </Link>
      {children}
    </section>
  );
}

/** One row per goal, one cell per day, darker for a fuller day. */
function CommitmentGrid({ daily, goals }) {
  const { L, pick, date } = useLang();
  return (
    <div className="space-y-1.5" role="img" aria-label={L('Commitment by goal and day', 'الالتزام حسب الهدف واليوم')}>
      {goals.map((g) => (
        <div key={g.id} className="flex items-center gap-2">
          <span className="w-16 shrink-0 truncate text-xs">{pick(g.short)}</span>
          <div className="flex flex-1 gap-[3px]">
            {daily.map((d) => (
              <span
                key={d.key}
                className="h-4 min-w-0 flex-1 rounded-[3px]"
                title={`${date(fromKey(d.key), { day: 'numeric', month: 'short' })}: ${pct(d[g.id])}`}
                style={{ background: d[g.id] > 0.02 ? g.color : 'rgba(120,130,130,0.18)', opacity: d[g.id] > 0.02 ? 0.25 + 0.75 * Math.min(1, d[g.id]) : 1 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { L, pick, date, num } = useLang();
  const [days, setDays] = useState(7);
  const [profile] = useStore('profile', NONE);
  const [settings] = useStore('settings', NONE);
  const [gymSessions] = useStore('gymSessions', EMPTY);
  const [foodLog] = useStore('foodLog', NONE);
  const [water] = useStore('water', NONE);
  const [prayerLog] = useStore('prayerLog', NONE);
  const [contacts] = useStore('contacts', EMPTY);
  const [english] = useStore('english', NONE);
  const [words] = useStore('words', NONE);

  const today = dayKey();
  const d = useMemo(
    () => dashboard({ profile, settings, gymSessions, foodLog, water, prayerLog, contacts, english, words }, days, today),
    [profile, settings, gymSessions, foodLog, water, prayerLog, contacts, english, words, days, today],
  );
  const goals = GOALS.filter((g) => d.overall.byGoal[g.id] !== undefined);
  const on = (id) => d.overall.byGoal[id] !== undefined;

  // Day labels: every day for a week, about six labels otherwise.
  const every = days <= 7 ? 1 : Math.ceil(days / 6);
  const bars = (series, mark) =>
    series.map((s, i) => ({
      label: (d.keys.length - 1 - i) % every === 0 ? date(fromKey(s.key), days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'numeric' }) : '',
      value: s.value,
      mark: mark ? mark(s) : undefined,
    }));

  const typeName = { call: L('Calls', 'اتصالات'), visit: L('Visits', 'زيارات'), message: L('Messages', 'رسائل') };

  return (
    <Page back="/" title={L('Dashboard', 'لوحة المتابعة')} subtitle={L(`The last ${days} days`, `آخر ${days} يوماً`)}>
      <Segmented
        value={days}
        onChange={setDays}
        options={[
          { value: 7, label: L('Week', 'أسبوع') },
          { value: 30, label: L('Month', 'شهر') },
          { value: 90, label: L('3 months', '3 أشهر') },
        ]}
      />

      <section className="card space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Tile label={L('Average commitment', 'متوسط الالتزام')} value={pct(d.overall.average)} />
          <Tile label={L('Good days (60%+)', 'أيام جيدة (60%+)')} value={`${num(d.overall.goodDays)}/${num(days)}`} />
          <Tile
            label={L('Best day', 'أفضل يوم')}
            value={d.overall.best && d.overall.best.overall > 0 ? pct(d.overall.best.overall) : '–'}
            sub={d.overall.best && d.overall.best.overall > 0 ? date(fromKey(d.overall.best.key), { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
          />
        </div>
        <Bars
          color="#1D6059"
          data={bars(d.daily.map((x) => ({ key: x.key, value: Math.round(x.overall * 100) })), (s) => s.value >= 60)}
          format={(v) => `${v}%`}
        />
        <CommitmentGrid daily={d.daily} goals={goals} />
        <div className="space-y-2 border-t border-brand-900/10 pt-3 dark:border-white/10">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 truncate">{g.icon} {pick(g.short)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                <div className="h-full rounded-full" style={{ width: pct(d.overall.byGoal[g.id]), background: g.color }} />
              </div>
              <span className="tabular w-10 shrink-0 text-end font-bold">{pct(d.overall.byGoal[g.id])}</span>
            </div>
          ))}
        </div>
      </section>

      {on('gym') && (
        <GoalCard goal={goalById('gym')} to="/gym/history">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={L('Sessions', 'الحصص')} value={`${num(d.gym.sessions)}`} sub={L(`goal ${Math.round(d.gym.goal)}`, `الهدف ${Math.round(d.gym.goal)}`)} />
            <Tile label={L('Minutes', 'الدقائق')} value={num(d.gym.minutes)} />
            <Tile label={L('Sets', 'المجموعات')} value={num(d.gym.sets)} />
            <Tile label={L('New records', 'أرقام قياسية جديدة')} value={num(d.gym.newRecords)} color={d.gym.newRecords ? '#A67C12' : undefined} />
          </div>
          <p className="muted text-xs">{L(`Volume lifted: ${num(d.gym.volume)} kg`, `مجموع الأوزان: ${num(d.gym.volume)} كجم`)}</p>
          <Bars color={goalById('gym').color} data={bars(d.gym.series)} format={(v) => L(`${v} min`, `${v} دقيقة`)} />
        </GoalCard>
      )}

      {on('food') && (
        <GoalCard goal={goalById('food')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={L('Calories a day', 'السعرات يومياً')} value={num(d.food.kcalAvg)} sub={L(`target ${num(d.food.target)}`, `الهدف ${num(d.food.target)}`)} />
            <Tile label={L('Protein a day', 'البروتين يومياً')} value={`${num(d.food.proteinAvg)} ${L('g', 'جم')}`} sub={L(`target ${d.food.proteinTarget} g`, `الهدف ${d.food.proteinTarget} جم`)} />
            <Tile label={L('Days logged', 'أيام مسجلة')} value={`${num(d.food.daysLogged)}/${num(days)}`} />
            <Tile label={L('Days on target', 'أيام ضمن الهدف')} value={num(d.food.onTarget)} sub={L('within 10%', 'بفارق 10%')} />
          </div>
          {d.food.daysLogged > 0 && (
            <div>
              <p className="muted mb-1 text-xs">{L('Where the calories came from', 'مصدر السعرات')}</p>
              <div className="flex h-3 overflow-hidden rounded-full">
                <div style={{ width: pct(d.food.split.protein), background: '#B8436B' }} />
                <div style={{ width: pct(d.food.split.carbs), background: '#C99A22' }} />
                <div style={{ width: pct(d.food.split.fat), background: '#4B5FC4' }} />
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span style={{ color: '#B8436B' }}>{L('Protein', 'بروتين')} {pct(d.food.split.protein)}</span>
                <span style={{ color: '#A67C12' }}>{L('Carbs', 'كربوهيدرات')} {pct(d.food.split.carbs)}</span>
                <span style={{ color: '#4B5FC4' }}>{L('Fat', 'دهون')} {pct(d.food.split.fat)}</span>
              </div>
            </div>
          )}
          <p className="muted text-xs">
            {L(
              `A day: sugar ${d.food.sugarAvg} g · fibre ${d.food.fiberAvg} g · water ${num(d.food.waterAvg)} of ${num(d.food.waterTarget)} ml`,
              `يومياً: سكر ${d.food.sugarAvg} جم · ألياف ${d.food.fiberAvg} جم · ماء ${num(d.food.waterAvg)} من ${num(d.food.waterTarget)} مل`,
            )}
          </p>
          <Bars
            color={goalById('food').color}
            data={bars(d.food.series, (s) => s.value > 0 && Math.abs(s.value - d.food.target) <= d.food.target * 0.1)}
            format={(v) => L(`${v} kcal`, `${v} سعرة`)}
          />
        </GoalCard>
      )}

      {on('prayer') && (
        <GoalCard goal={goalById('prayer')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={L('Prayed', 'صُلّيت')} value={`${num(d.prayer.prayed)}/${num(d.prayer.total)}`} />
            <Tile label={L('On time', 'في وقتها')} value={pct(d.prayer.ontime / d.prayer.total)} />
            <Tile label={L('In the mosque', 'في المسجد')} value={pct(d.prayer.mosque / d.prayer.total)} />
            <Tile label={L('All five prayed', 'الخمس كاملة')} value={L(`${num(d.prayer.fullDays)} days`, `${num(d.prayer.fullDays)} أيام`)} />
          </div>
          <div className="space-y-1.5">
            {PRAYERS.map((p) => {
              const row = d.prayer.byPrayer[p.id];
              return (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0">{pick(p.name)}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                    <div className="absolute inset-y-0 start-0 rounded-full opacity-40" style={{ width: pct(row.prayed / days), background: goalById('prayer').color }} />
                    <div className="absolute inset-y-0 start-0 rounded-full" style={{ width: pct(row.ontime / days), background: goalById('prayer').color }} />
                  </div>
                  <span className="tabular w-20 shrink-0 text-end text-xs">
                    {num(row.ontime)}/{num(days)} · 🕌 {num(row.mosque)}
                  </span>
                </div>
              );
            })}
            <p className="muted text-xs">{L('Dark: on time · light: prayed late · 🕌 in the mosque', 'الداكن: في وقتها · الفاتح: متأخرة · 🕌 في المسجد')}</p>
          </div>
          <Bars color={goalById('prayer').color} data={bars(d.prayer.series, (s) => s.value === 5)} format={(v) => `${v}/5`} />
        </GoalCard>
      )}

      {on('social') && (
        <GoalCard goal={goalById('social')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={L('People reached', 'من تواصلت معهم')} value={`${num(d.social.reached)}/${num(d.social.contacts)}`} />
            <Tile label={L('Times in touch', 'مرات التواصل')} value={num(d.social.touches)} />
            <Tile label={L('Waiting now', 'بانتظارك الآن')} value={num(d.social.overdue)} color={d.social.overdue ? '#B8436B' : undefined} />
            <Tile
              label={L('How', 'الطريقة')}
              value={Object.keys(d.social.byType).length ? '' : '–'}
              sub={Object.entries(d.social.byType).map(([t, n]) => `${typeName[t] || t} ${num(n)}`).join(' · ')}
            />
          </div>
          <Bars color={goalById('social').color} data={bars(d.social.series)} format={(v) => num(v)} />
        </GoalCard>
      )}

      {on('english') && (
        <GoalCard goal={goalById('english')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={L('Minutes studied', 'دقائق الدراسة')} value={num(d.english.minutes)} />
            <Tile label={L('Days studied', 'أيام الدراسة')} value={`${num(d.english.daysStudied)}/${num(days)}`} />
            <Tile label={L('Words known', 'كلمات تعرفها')} value={num(d.english.words.known)} />
            <Tile label={L('Words learning', 'كلمات قيد التعلم')} value={num(d.english.words.learning)} />
          </div>
          <Bars color={goalById('english').color} data={bars(d.english.series)} format={(v) => L(`${v} min`, `${v} دقيقة`)} />
        </GoalCard>
      )}
    </Page>
  );
}
