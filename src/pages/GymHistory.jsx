import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Empty, Page, Section } from '../components/ui';
import { EXERCISES, MUSCLES } from '../data/equipment';
import { dailyTotals, muscleBalance, personalRecords, sessionMinutes, sessionSets, sessionVolume } from '../lib/gym';
import { dayKey, fromKey, lastDays } from '../lib/dates';

const EMPTY = [];
const COLOR = goalById('gym').color;

export default function GymHistory() {
  const { L, pick, date, num } = useLang();
  const [sessions, setSessions] = useStore('gymSessions', EMPTY);
  const [open, setOpen] = useState(null);

  const today = dayKey();
  const days = dailyTotals(sessions, 14, today);
  const records = personalRecords(sessions);
  const recent = sessions.filter((s) => lastDays(30, today).includes(s.date));
  const balance = Object.entries(muscleBalance(recent, EXERCISES)).sort((a, b) => b[1] - a[1]);
  const totalSets = balance.reduce((s, [, n]) => s + n, 0) || 1;
  const name = (e) => (e.name ? (typeof e.name === 'string' ? e.name : pick(e.name)) : pick(EXERCISES[e.exerciseId]?.name) || e.exerciseId);
  const describe = (e, s) =>
    e.unit === 'cardio' ? L(`${s.minutes} min${s.km ? ` · ${s.km} km` : ''}`, `${s.minutes} د${s.km ? ` · ${s.km} كم` : ''}`)
      : e.unit === 'time' ? L(`${s.seconds} s`, `${s.seconds} ث`)
        : `${s.weight || 0}×${s.reps}`;

  if (!sessions.length) {
    return (
      <Page title={L('Training history', 'سجل التمرين')} back="/gym">
        <Empty icon="📒" title={L('No workouts yet', 'لا توجد تمارين بعد')}>
          {L('Finish a workout and it will appear here with your records.', 'أنهِ تمريناً وسيظهر هنا مع أرقامك القياسية.')}
        </Empty>
      </Page>
    );
  }

  return (
    <Page title={L('Training history', 'سجل التمرين')} back="/gym">
      <div className="card">
        <p className="mb-3 font-bold">{L('Weight moved, last 14 days (kg)', 'الوزن المرفوع، آخر 14 يوماً (كجم)')}</p>
        <Bars color={COLOR} data={days.map((d) => ({ label: String(fromKey(d.key).getDate()), value: d.volume }))} format={(v) => num(v)} />
      </div>

      {balance.length > 0 && (
        <Section title={L('Muscles trained, last 30 days', 'العضلات المدرَّبة، آخر 30 يوماً')}>
          <div className="card space-y-2">
            {balance.map(([muscle, sets]) => (
              <div key={muscle} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate">{MUSCLES[muscle] ? pick(MUSCLES[muscle]) : muscle}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(sets / totalSets) * 100}%`, background: COLOR }} />
                </div>
                <span className="muted tabular w-16 text-end">{L(`${sets} sets`, `${sets} مجموعة`)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={L('Personal records', 'الأرقام القياسية')}>
        <div className="card divide-y divide-brand-900/10 !py-1 dark:divide-white/10">
          {Object.entries(records)
            .filter(([, r]) => r.best1rm > 0)
            .sort((a, b) => b[1].best1rm - a[1].best1rm)
            .slice(0, 12)
            .map(([id, r]) => (
              <div key={id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium">{pick(EXERCISES[id]?.name) || id.replace('custom:', '')}</span>
                <span className="tabular shrink-0 text-end">
                  <b>{r.maxWeight} {L('kg', 'كجم')}</b>
                  <span className="muted"> · {L(`est. max ${r.best1rm}`, `الأقصى المقدَّر ${r.best1rm}`)}</span>
                </span>
              </div>
            ))}
          {!Object.values(records).some((r) => r.best1rm > 0) && (
            <p className="muted py-3 text-center text-sm">{L('Log a weighted set to see records.', 'سجّل مجموعة بأوزان لتظهر الأرقام القياسية.')}</p>
          )}
        </div>
      </Section>

      <Section title={L('Workouts', 'التمارين')}>
        {sessions.slice(0, 60).map((s) => (
          <div key={s.id} className="card !p-3">
            <button className="flex w-full items-center gap-3 text-start" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{s.name || L('Workout', 'تمرين')}</p>
                <p className="muted text-sm">{date(fromKey(s.date))}</p>
              </div>
              <p className="muted tabular shrink-0 text-end text-sm">
                {L(`${sessionMinutes(s)} min · ${sessionSets(s)} sets`, `${sessionMinutes(s)} د · ${sessionSets(s)} مجموعة`)}
                <br />
                {sessionVolume(s) > 0 && L(`${num(sessionVolume(s))} kg`, `${num(sessionVolume(s))} كجم`)}
                {s.hr && ` · ♥ ${s.hr.avg}`}
              </p>
            </button>
            {open === s.id && (
              <div className="mt-2 space-y-1 border-t border-brand-900/10 pt-2 text-sm dark:border-white/10">
                {s.exercises.map((e, i) => (
                  <p key={i}>
                    <b>{name(e)}</b>{' '}
                    <span className="muted tabular">{e.sets.map((set) => describe(e, set)).join(L(', ', '، '))}</span>
                  </p>
                ))}
                <button className="btn-danger mt-2 !min-h-[40px]" onClick={() => setSessions(sessions.filter((x) => x.id !== s.id))}>
                  <Trash2 size={16} /> {L('Delete this workout', 'حذف هذا التمرين')}
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>
    </Page>
  );
}
