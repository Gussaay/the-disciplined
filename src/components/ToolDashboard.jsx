// One tool's dashboard: the muscles it trains (on the body map), how the
// machine is set up, and what the person has done on it - sessions, sets,
// weight moved (or minutes and distance for cardio), when it was last used,
// and the best numbers on each of its exercises.
import { useMemo } from 'react';
import { useLang } from '../i18n';
import { goalById } from '../config';
import { DESC, REGIONS, SETUP, targetsOf } from '../data/exerciseGuide';
import { personalRecords, toolStats } from '../lib/gym';
import { fromKey } from '../lib/dates';
import MuscleMap from './MuscleMap';

const COLOR = goalById('gym')?.color || '#DC2626';

/** Main and helping muscle regions over all of a tool's exercises. */
export function toolMuscles(equipment) {
  const primary = [];
  const secondary = [];
  const seenP = new Set();
  const seenS = new Set();
  for (const x of equipment?.exercises || []) {
    const t = targetsOf(x.id, x.muscle);
    for (const r of t.primary) if (!seenP.has(r)) { seenP.add(r); primary.push(r); }
    for (const r of t.secondary) if (!seenS.has(r)) { seenS.add(r); secondary.push(r); }
  }
  return { primary, secondary: secondary.filter((r) => !seenP.has(r)) };
}

export default function ToolDashboard({ equipment, sessions }) {
  const { L, pick, num, date } = useLang();
  const stats = useMemo(
    () => toolStats(sessions, equipment.exercises.map((x) => x.id)),
    [sessions, equipment],
  );
  const records = useMemo(() => personalRecords(sessions), [sessions]);
  const { primary, secondary } = useMemo(() => toolMuscles(equipment), [equipment]);
  const setup = SETUP[equipment.id] || [];
  const desc = DESC[equipment.id];
  const used = equipment.exercises.filter((x) => stats.perExercise[x.id]);

  const bestLine = (x) => {
    const r = records[x.id];
    const p = stats.perExercise[x.id];
    if (!p) return null;
    if (x.unit === 'cardio') return L(`${num(p.minutes)} min · ${num(p.km, 1)} km in total`, `المجموع ${num(p.minutes)} دقيقة · ${num(p.km, 1)} كم`);
    if (x.unit === 'time') return r?.maxSeconds ? L(`best ${num(r.maxSeconds)} seconds`, `الأفضل ${num(r.maxSeconds)} ثانية`) : null;
    if (x.unit === 'bw') return r?.maxReps ? L(`best ${num(r.maxReps)} reps`, `الأفضل ${num(r.maxReps)} عدة`) : null;
    return r?.best1rm ? L(`best ${num(r.maxWeight)} kg · 1RM ≈ ${num(r.best1rm)} kg`, `الأفضل ${num(r.maxWeight)} كجم · الحد الأقصى ≈ ${num(r.best1rm)} كجم`) : null;
  };

  return (
    <div className="space-y-3">
      {desc && (
        <div className="card">
          <p className="mb-1 font-bold">{L('About this machine', 'عن هذا الجهاز')}</p>
          <p className="text-sm leading-relaxed">{L(desc[0], desc[1])}</p>
        </div>
      )}
      <div className="card space-y-2">
        <p className="font-bold">{L('Muscles trained', 'العضلات المُدرَّبة')}</p>
        <MuscleMap primary={primary} secondary={secondary} color={COLOR} className="mx-auto h-44" />
        {primary.length > 0 && (
          <p className="text-sm">
            <span className="me-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR }} />
            <span className="font-bold">{L('Main: ', 'الأساسية: ')}</span>
            {primary.map((r) => pick(REGIONS[r])).join(L(', ', '، '))}
          </p>
        )}
        {secondary.length > 0 && (
          <p className="text-sm">
            <span className="me-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR, opacity: 0.4 }} />
            <span className="font-bold">{L('Helping: ', 'المساعدة: ')}</span>
            {secondary.map((r) => pick(REGIONS[r])).join(L(', ', '، '))}
          </p>
        )}
      </div>

      {setup.length > 0 && (
        <div className="card">
          <p className="mb-1 font-bold">{L('Set up the machine', 'اضبط الجهاز')}</p>
          <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed">
            {setup.map(([en, ar]) => <li key={en}>{L(en, ar)}</li>)}
          </ul>
        </div>
      )}

      <div className="card space-y-2">
        <p className="font-bold">{L('Your training on this tool', 'تدريبك على هذا الجهاز')}</p>
        {stats.sessions > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                [num(stats.sessions), L('sessions', 'حصص')],
                [num(stats.sets), L('sets', 'مجموعات')],
                stats.volume > 0
                  ? [num(stats.volume), L('kg lifted', 'كجم مرفوعة')]
                  : [num(stats.minutes), L('minutes', 'دقيقة')],
                stats.lastDate ? date(fromKey(stats.lastDate), { day: 'numeric', month: 'short' }) : '–',
              ].map(([value, label], i) => (
                <div key={i}>
                  <p className="tabular text-lg font-extrabold">{value}</p>
                  <p className="muted text-xs">{label || L('last used', 'آخر استخدام')}</p>
                </div>
              ))}
            </div>
            {used.map((x) => {
              const line = bestLine(x);
              return (
                <div key={x.id} className="flex items-baseline justify-between gap-2 border-t border-brand-900/5 pt-1.5 text-sm dark:border-white/5">
                  <span className="min-w-0">{pick(x.name)}</span>
                  <span className="muted tabular shrink-0 text-xs">
                    {L(`${num(stats.perExercise[x.id].sets)} sets`, `${num(stats.perExercise[x.id].sets)} مجموعات`)}
                    {line ? ` · ${line}` : ''}
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          <p className="muted text-sm">
            {L('Nothing logged on this tool yet. When you train on it, your sessions, sets, best weights and totals appear here.', 'لا شيء مسجل على هذا الجهاز بعد. عندما تتدرب عليه تظهر هنا حصصك ومجموعاتك وأفضل أوزانك ومجاميعك.')}
          </p>
        )}
      </div>
    </div>
  );
}
