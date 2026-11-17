import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bluetooth, ClipboardCopy, Pencil, Plus, Radar, Scale, Target, Trash2 } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Field, NumberInput, Page, Section, Segmented, Sheet, useConfirm, useToast } from '../components/ui';
import { band, bodyComposition, summary } from '../lib/bodyComp';
import { companyHex, createSettler, hex, learnFormat, parseAdvert, parseLearnt } from '../lib/scaleParse';
import { scaleSupported, scanAdverts } from '../lib/scale';
import { uid } from '../lib/dates';

const EMPTY = [];
const NONE = {};
const THEME = goalById('weight');
const DAY = 86400000;
const BAND_COLORS = ['#38BDF8', '#22C55E', '#F59E0B', '#DC2626'];

/** The metrics a body-fat scale shows, in the order OKOK shows them. */
function useMetrics() {
  const { L } = useLang();
  return [
    { id: 'weight', label: L('Weight', 'الوزن'), unit: L('kg', 'كجم'), digits: 1 },
    { id: 'bmi', label: L('BMI', 'مؤشر الكتلة'), unit: '', digits: 1 },
    { id: 'fat', label: L('Body fat', 'دهون الجسم'), unit: '%', digits: 1 },
    { id: 'muscle', label: L('Muscle', 'العضلات'), unit: L('kg', 'كجم'), digits: 1 },
    { id: 'water', label: L('Water', 'الماء'), unit: '%', digits: 1 },
    { id: 'visceral', label: L('Visceral fat', 'الدهون الحشوية'), unit: '', digits: 1 },
    { id: 'bone', label: L('Bone mass', 'كتلة العظام'), unit: L('kg', 'كجم'), digits: 1 },
    { id: 'bmr', label: L('Metabolism', 'الأيض الأساسي'), unit: L('kcal', 'سعرة'), digits: 0 },
    { id: 'protein', label: L('Protein', 'البروتين'), unit: '%', digits: 1 },
  ];
}

function useBandName() {
  const { L } = useLang();
  return (metric, b) => {
    if (b == null) return '';
    if (metric === 'bmi') return [L('Underweight', 'نحيف'), L('Healthy', 'صحي'), L('Overweight', 'زائد'), L('Obese', 'سمنة')][b];
    return [L('Low', 'منخفض'), L('Healthy', 'صحي'), L('High', 'مرتفع'), L('Very high', 'مرتفع جداً')][b];
  };
}

export default function Weight() {
  const { L, num, date, time } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const metrics = useMetrics();
  const bandName = useBandName();
  const [profile, setProfile] = useStore('profile', NONE);
  const [log, setLog] = useStore('weightLog', EMPTY);
  const [scales] = useStore('scales', EMPTY);
  const [weighing, setWeighing] = useState(false);
  const [manual, setManual] = useState(false);
  const [finder, setFinder] = useState(false);
  const [detail, setDetail] = useState(null);
  const [targetEdit, setTargetEdit] = useState(false);
  const [metric, setMetric] = useState('weight');
  const [range, setRange] = useState('90');

  const sorted = useMemo(() => [...log].sort((a, b) => a.at - b.at), [log]);
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  const needsProfile = !Number(profile.height) || !Number(profile.age);

  const save = (entry) => {
    const full = { id: uid(), ...entry };
    setLog([...log, full]);
    if (full.weight) setProfile({ ...profile, weight: full.weight });
    return full;
  };

  const shown = useMemo(() => {
    const from = range === 'all' ? 0 : Date.now() - Number(range) * DAY;
    return sorted.filter((e) => e.at >= from).map((e) => ({ at: e.at, value: e[metric] ?? null })).filter((p) => p.value != null);
  }, [sorted, range, metric]);
  const stats = summary(shown);
  const m = metrics.find((x) => x.id === metric);
  const fmt = (v, digits = 1) => (v == null ? '–' : num(v, digits));

  const target = Number(profile.targetWeight) || null;
  const start = sorted[0]?.weight;

  return (
    <Page goal="weight" title={L('Weight and body', 'الوزن والجسم')} subtitle={latest ? `${date(new Date(latest.at), { day: 'numeric', month: 'short' })} · ${time(new Date(latest.at))}` : undefined}>
      {needsProfile && (
        <Link to="/settings" className="card block border border-amber-300/60 bg-amber-50 text-sm dark:bg-amber-500/10">
          {L('Add your age, height and sex in Settings so body fat, muscle and the rest are worked out for you.', 'أضف عمرك وطولك وجنسك في الإعدادات ليُحسب لك الدهون والعضلات وغيرها.')}
        </Link>
      )}

      <div className="card space-y-3">
        {latest ? (
          <>
            <div className="flex items-end justify-center gap-1">
              <span className="tabular text-5xl font-extrabold">{fmt(latest.weight)}</span>
              <span className="muted mb-1.5 font-bold">{L('kg', 'كجم')}</span>
            </div>
            <BandBar metric="bmi" value={latest.bmi} label={`${L('BMI', 'مؤشر الكتلة')} ${fmt(latest.bmi)} · ${bandName('bmi', band('bmi', latest.bmi))}`} />
            <div className="flex justify-between text-sm">
              <span>
                <b className="tabular">{previous ? `${latest.weight - previous.weight >= 0 ? '+' : ''}${num(latest.weight - previous.weight, 1)}` : '–'}</b>{' '}
                <span className="muted">{L('since last time', 'منذ آخر مرة')}</span>
              </span>
              {latest.device && <span className="muted">{latest.device}</span>}
            </div>
          </>
        ) : (
          <p className="muted text-center text-sm">{L('No weighing yet. Step on your scale or add your weight by hand.', 'لا يوجد وزن بعد. قف على ميزانك أو أضف وزنك يدوياً.')}</p>
        )}
        <div className="flex gap-2">
          {scaleSupported() && (
            <button className="btn-primary flex-[2]" onClick={() => setWeighing(true)}>
              <Scale size={18} /> {L('Start weighing', 'ابدأ الوزن')}
            </button>
          )}
          <button className={`${scaleSupported() ? 'btn-soft' : 'btn-primary'} flex-1`} onClick={() => setManual(true)}>
            <Pencil size={16} /> {L('By hand', 'يدوياً')}
          </button>
        </div>
        {!scaleSupported() && (
          <p className="muted text-xs">{L('Reading the Bluetooth scale works in the Android app. Here you can add weight by hand and follow your trends.', 'قراءة الميزان بالبلوتوث تعمل في تطبيق أندرويد. هنا يمكنك إضافة الوزن يدوياً ومتابعة تقدمك.')}</p>
        )}
      </div>

      {latest?.fat != null && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.filter((x) => x.id !== 'weight').map((x) => {
            const b = band(x.id, latest[x.id], profile);
            return (
              <button key={x.id} className="card !p-3 text-start" onClick={() => setMetric(x.id)}>
                <p className="muted text-xs">{x.label}</p>
                <p className="tabular text-lg font-extrabold">
                  {fmt(latest[x.id], x.digits)} <span className="muted text-xs font-normal">{x.unit}</span>
                </p>
                {b != null && (
                  <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: BAND_COLORS[b] }}>
                    {bandName(x.id, b)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {latest && latest.fat == null && (
        <p className="muted px-1 text-xs">
          {L('Body fat and the rest need bare feet on the scale’s metal pads, so it can measure the body’s impedance.', 'الدهون وبقية القياسات تحتاج الوقوف حافياً على الأقطاب المعدنية للميزان ليقيس مقاومة الجسم.')}
        </p>
      )}

      <div className="card">
        <div className="flex items-center gap-3">
          <Target style={{ color: THEME.color }} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{L('Target weight', 'الوزن المستهدف')}</p>
            <p className="muted text-sm">
              {target
                ? latest
                  ? Math.abs(latest.weight - target) < 0.2
                    ? L('You are there. Keep it.', 'وصلت. حافظ عليه.')
                    : L(`${num(Math.abs(latest.weight - target), 1)} kg to ${latest.weight > target ? 'lose' : 'gain'}`, `${num(Math.abs(latest.weight - target), 1)} كجم ${latest.weight > target ? 'للنزول' : 'للزيادة'}`)
                  : L(`${target} kg`, `${target} كجم`)
                : L('Not set', 'غير محدد')}
            </p>
          </div>
          <button className="btn-soft !min-h-[40px] !px-3 text-sm" onClick={() => setTargetEdit(true)}>{target ? L('Change', 'تغيير') : L('Set', 'تحديد')}</button>
        </div>
        {target && latest && start && start !== target && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((start - latest.weight) / (start - target)) * 100))}%`, background: THEME.color }} />
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <Section title={L('Trends', 'التطور')}>
          <div className="card space-y-3">
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: L('Week', 'أسبوع') },
                { value: '30', label: L('Month', 'شهر') },
                { value: '90', label: L('3 months', '3 أشهر') },
                { value: 'all', label: L('All', 'الكل') },
              ]}
            />
            <LineChart points={shown} color={THEME.color} digits={m.digits} />
            {stats ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label={L(`Average ${m.label.toLowerCase()}`, `متوسط ${m.label}`)} value={`${fmt(stats.avg, m.digits)} ${m.unit}`} />
                <Stat label={L('Change', 'التغير')} value={`${stats.change > 0 ? '+' : ''}${fmt(stats.change, m.digits)} ${m.unit}`} />
                <Stat label={L('Highest', 'الأعلى')} value={`${fmt(stats.max.value, m.digits)} · ${date(new Date(stats.max.at), { day: 'numeric', month: 'short' })}`} />
                <Stat label={L('Lowest', 'الأدنى')} value={`${fmt(stats.min.value, m.digits)} · ${date(new Date(stats.min.at), { day: 'numeric', month: 'short' })}`} />
              </div>
            ) : (
              <p className="muted text-center text-sm">{L('No measurements of this in the period.', 'لا قياسات لهذا في الفترة.')}</p>
            )}
            <Segmented value={metric} onChange={setMetric} options={metrics.map((x) => ({ value: x.id, label: x.label }))} />
          </div>
        </Section>
      )}

      {sorted.length > 0 && (
        <Section title={L('History', 'السجل')}>
          <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
            {[...sorted].reverse().slice(0, 30).map((e) => (
              <button key={e.id} className="flex w-full items-center gap-3 py-3 text-start" onClick={() => setDetail(e)}>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{date(new Date(e.at), { weekday: 'short', day: 'numeric', month: 'short' })} · {time(new Date(e.at))}</span>
                  <span className="muted block text-xs">
                    {e.fat != null ? L(`Fat ${num(e.fat, 1)}% · muscle ${num(e.muscle, 1)} kg`, `دهون ${num(e.fat, 1)}٪ · عضلات ${num(e.muscle, 1)} كجم`) : e.source === 'manual' ? L('Added by hand', 'أضيف يدوياً') : L('Weight only', 'الوزن فقط')}
                  </span>
                </span>
                <span className="tabular font-extrabold">{fmt(e.weight)} {L('kg', 'كجم')}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {scaleSupported() && (
        <Section
          title={L('My scales', 'موازيني')}
          action={
            <button className="btn-soft !min-h-[36px] !px-3 text-sm" onClick={() => setFinder(true)}>
              <Radar size={16} /> {L('Find', 'بحث')}
            </button>
          }
        >
          <ScaleList onFind={() => setFinder(true)} />
        </Section>
      )}

      {weighing && <Weighing profile={profile} onClose={() => setWeighing(false)} onSave={save} />}

      <ManualSheet open={manual} onClose={() => setManual(false)} profile={profile} onSave={(e) => { save(e); setManual(false); toast(L('Saved', 'حُفظ')); }} />

      <TargetSheet open={targetEdit} value={target} onClose={() => setTargetEdit(false)} onSave={(v) => { setProfile({ ...profile, targetWeight: v || undefined }); setTargetEdit(false); }} />

      {finder && <Finder onClose={() => setFinder(false)} />}

      <Sheet open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `${date(new Date(detail.at), { day: 'numeric', month: 'long' })} · ${time(new Date(detail.at))}` : ''}>
        {detail && (
          <>
            <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
              {metrics.filter((x) => detail[x.id] != null).map((x) => (
                <div key={x.id} className="flex justify-between py-2.5 text-sm">
                  <span>{x.label}</span>
                  <b className="tabular">{fmt(detail[x.id], x.digits)} {x.unit}</b>
                </div>
              ))}
              {detail.impedance && (
                <div className="flex justify-between py-2.5 text-sm"><span>{L('Impedance', 'المقاومة')}</span><b className="tabular">{detail.impedance} Ω</b></div>
              )}
            </div>
            <button
              className="btn-soft w-full text-red-600"
              onClick={async () => {
                if (await confirm({ title: L('Delete this measurement?', 'حذف هذا القياس؟') })) {
                  setLog(log.filter((x) => x.id !== detail.id));
                  setDetail(null);
                }
              }}
            >
              <Trash2 size={16} /> {L('Delete', 'حذف')}
            </button>
          </>
        )}
      </Sheet>
    </Page>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="tabular text-lg font-extrabold">{value}</p>
      <p className="muted text-xs">{label}</p>
    </div>
  );
}

function BandBar({ metric, value, label }) {
  const b = band(metric, value);
  return (
    <div>
      <div className="flex gap-1">
        {BAND_COLORS.map((c, i) => (
          <div key={c} className="h-2 flex-1 rounded-full" style={{ background: c, opacity: b === i ? 1 : 0.3 }} />
        ))}
      </div>
      <p className="mt-1 text-center text-sm font-bold" style={{ color: b != null ? BAND_COLORS[b] : undefined }}>{label}</p>
    </div>
  );
}

/** A small line chart of one metric over time. */
function LineChart({ points, color, digits }) {
  const { num, date } = useLang();
  if (points.length < 2) {
    return <div className="muted flex h-32 items-center justify-center text-sm">{points.length ? num(points[0].value, digits) : '–'}</div>;
  }
  const W = 320;
  const H = 140;
  const pad = { l: 34, r: 10, t: 14, b: 20 };
  const xs = points.map((p) => p.at);
  const ys = points.map((p) => p.value);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || Math.max(1, hi * 0.02);
  const y0 = lo - span * 0.25;
  const y1 = hi + span * 0.25;
  const X = (t) => pad.l + ((t - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.at).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const ticks = [y0 + (y1 - y0) * 0.2, (y0 + y1) / 2, y0 + (y1 - y0) * 0.8];
  const labelEvery = Math.ceil(points.length / 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="trend">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={pad.l - 4} y={Y(t) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">{num(t, digits)}</text>
        </g>
      ))}
      <path d={`${d} L${X(x1)},${H - pad.b} L${X(x0)},${H - pad.b} Z`} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.at}>
          <circle cx={X(p.at)} cy={Y(p.value)} r="3" fill="white" stroke={color} strokeWidth="2" />
          {(i % labelEvery === 0 || i === points.length - 1) && (
            <>
              <text x={X(p.at)} y={Y(p.value) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">{num(p.value, digits)}</text>
              <text x={X(p.at)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">{date(new Date(p.at), { day: 'numeric', month: 'numeric' })}</text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Listens to the scale until the measurement is done, then saves it. */
function Weighing({ profile, onClose, onSave }) {
  const { L, num } = useLang();
  const [scales, setScales] = useStore('scales', EMPTY);
  const [live, setLive] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [waited, setWaited] = useState(false);
  const settler = useRef(createSettler());
  const stopRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const known = new Map(scales.map((s) => [s.id, s]));
    const timer = setTimeout(() => alive && setWaited(true), 25000);
    scanAdverts(({ id, name, mfr }) => {
      if (!alive || result) return;
      const saved = known.get(id);
      if (known.size && !saved) return;
      const reading = saved?.learnt ? parseLearnt(mfr, saved.learnt) : parseAdvert(mfr, { mac: id });
      if (!reading) return;
      setLive({ ...reading, id, name });
      const { settled } = settler.current.push(reading);
      if (!settled) return;
      const comp = bodyComposition({ weight: reading.weight, impedance: reading.impedance, height: profile.height, age: profile.age, sex: profile.sex });
      const device = saved?.name || name || id;
      const entry = onSave({ at: Date.now(), ...comp, source: 'scale', device, format: reading.format });
      setResult(entry);
      if (!saved) setScales([...scales, { id, name: name || L('Bluetooth scale', 'ميزان بلوتوث'), format: reading.format, added: Date.now() }]);
      stopRef.current?.();
    })
      .then((stop) => {
        stopRef.current = stop;
        if (!alive) stop();
      })
      .catch((e) => alive && setError(e.code === 'scale-bt-off' ? L('Turn Bluetooth on and try again.', 'شغّل البلوتوث وحاول مجدداً.') : e.message || L('Bluetooth could not start', 'تعذر تشغيل البلوتوث')));
    return () => {
      alive = false;
      clearTimeout(timer);
      stopRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet open onClose={onClose} title={L('Weighing', 'الوزن')}>
      {error ? (
        <p className="card text-center text-sm text-red-600">{error}</p>
      ) : result ? (
        <div className="space-y-3">
          <div className="card text-center">
            <p className="tabular text-5xl font-extrabold">{num(result.weight, 1)} <span className="muted text-lg">{L('kg', 'كجم')}</span></p>
            <p className="muted mt-1 text-sm">{result.fat != null ? L(`Body fat ${num(result.fat, 1)}% · muscle ${num(result.muscle, 1)} kg · water ${num(result.water, 1)}%`, `الدهون ${num(result.fat, 1)}٪ · العضلات ${num(result.muscle, 1)} كجم · الماء ${num(result.water, 1)}٪`) : L('Weight saved. Bare feet on the pads also gives body fat.', 'حُفظ الوزن. الوقوف حافياً على الأقطاب يعطي الدهون أيضاً.')}</p>
          </div>
          <button className="btn-primary w-full" onClick={onClose}>{L('Done', 'تم')}</button>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <div className="card">
            <Bluetooth className="mx-auto animate-pulse" style={{ color: THEME.color }} />
            <p className="tabular mt-2 text-5xl font-extrabold">{live ? num(live.weight, 1) : '--.-'} <span className="muted text-lg">{L('kg', 'كجم')}</span></p>
            <p className="muted mt-2 text-sm">
              {live
                ? live.final === false || live.final === null
                  ? L('Stand still, barefoot… measuring', 'اثبت حافياً… جارٍ القياس')
                  : L('Done', 'تم')
                : L('Step on the scale barefoot. The app reads it directly; the OKOK app is not needed.', 'قف على الميزان حافياً. التطبيق يقرأه مباشرة دون حاجة لتطبيق OKOK.')}
            </p>
          </div>
          {waited && !live && (
            <p className="muted text-sm">
              {L('Nothing yet. Make sure the scale shows a weight, that Location is on for Bluetooth, and try “Find” under My scales to check what the phone sees.', 'لا شيء بعد. تأكد أن الميزان يعرض وزناً وأن الموقع مفعّل للبلوتوث، وجرّب «بحث» في موازيني لترى ما يلتقطه الهاتف.')}
            </p>
          )}
          <button className="btn-soft w-full" onClick={onClose}>{L('Cancel', 'إلغاء')}</button>
        </div>
      )}
    </Sheet>
  );
}

function ManualSheet({ open, onClose, onSave, profile }) {
  const { L } = useLang();
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  useEffect(() => {
    if (open) {
      setWeight(profile.weight || '');
      setFat('');
    }
  }, [open, profile.weight]);
  return (
    <Sheet open={open} onClose={onClose} title={L('Add weight', 'إضافة وزن')}>
      <Field label={L('Weight, kg', 'الوزن، كجم')}>
        <NumberInput value={weight} onChange={setWeight} />
      </Field>
      <Field label={L('Body fat %, if you know it', 'نسبة الدهون إن كنت تعرفها')}>
        <NumberInput value={fat} onChange={setFat} />
      </Field>
      <button
        className="btn-primary w-full"
        disabled={!(Number(weight) > 2)}
        onClick={() => {
          const comp = bodyComposition({ weight: Number(weight), height: profile.height });
          onSave({ at: Date.now(), ...comp, ...(Number(fat) > 0 ? { fat: Number(fat) } : {}), source: 'manual' });
        }}
      >
        <Plus size={18} /> {L('Save', 'حفظ')}
      </button>
    </Sheet>
  );
}

function TargetSheet({ open, value, onClose, onSave }) {
  const { L } = useLang();
  const [v, setV] = useState('');
  useEffect(() => {
    if (open) setV(value || '');
  }, [open, value]);
  return (
    <Sheet open={open} onClose={onClose} title={L('Target weight', 'الوزن المستهدف')}>
      <Field label={L('Target, kg', 'الهدف، كجم')}>
        <NumberInput value={v} onChange={setV} />
      </Field>
      <button className="btn-primary w-full" onClick={() => onSave(Number(v) || null)}>{L('Save', 'حفظ')}</button>
    </Sheet>
  );
}

function ScaleList({ onFind }) {
  const { L } = useLang();
  const confirm = useConfirm();
  const [scales, setScales] = useStore('scales', EMPTY);
  if (!scales.length) {
    return (
      <button className="card muted w-full text-center text-sm" onClick={onFind}>
        {L('No scale saved yet. Your scale is saved the first time you weigh, or tap Find.', 'لا يوجد ميزان محفوظ. يُحفظ ميزانك عند أول وزن، أو اضغط بحث.')}
      </button>
    );
  }
  return (
    <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
      {scales.map((s) => (
        <div key={s.id} className="flex items-center gap-3 py-3">
          <Scale className="shrink-0" style={{ color: THEME.color }} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.name}</p>
            <p className="muted tabular text-xs">{s.id}{s.format ? ` · ${s.learnt ? L('taught', 'مُعلَّم') : s.format}` : ''}</p>
          </div>
          <button
            className="muted flex h-10 w-10 items-center justify-center"
            aria-label={L('Remove', 'حذف')}
            onClick={async () => {
              if (await confirm({ title: L(`Remove ${s.name}?`, `حذف ${s.name}؟`), body: L('Measurements already saved stay.', 'القياسات المحفوظة تبقى.') })) setScales(scales.filter((x) => x.id !== s.id));
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Shows every Bluetooth device the phone hears with manufacturer data, what
 * the app makes of it, and lets the person save a scale, teach the app an
 * unknown one, or copy a capture to send for support.
 */
function Finder({ onClose }) {
  const { L, num } = useLang();
  const toast = useToast();
  const [scales, setScales] = useStore('scales', EMPTY);
  const [devices, setDevices] = useState({});
  const [error, setError] = useState('');
  const [teach, setTeach] = useState(null);
  const [known, setKnown] = useState('');
  const capture = useRef({});

  useEffect(() => {
    let alive = true;
    let stop;
    let pending = {};
    const flush = setInterval(() => {
      if (!alive || !Object.keys(pending).length) return;
      const batch = pending;
      pending = {};
      setDevices((prev) => ({ ...prev, ...batch }));
    }, 500);
    scanAdverts((ad) => {
      const parsed = parseAdvert(ad.mfr, { mac: ad.id });
      const lines = capture.current[ad.id] || (capture.current[ad.id] = []);
      const line = Object.entries(ad.mfr).map(([k, v]) => `${companyHex(k)}: ${hex(v)}`).join(' | ');
      if (lines.at(-1)?.line !== line) lines.push({ at: Date.now(), line, mfr: ad.mfr });
      if (lines.length > 60) lines.shift();
      pending[ad.id] = { ...ad, parsed, seen: Date.now(), count: (devices[ad.id]?.count || 0) + 1 };
    })
      .then((s) => {
        stop = s;
        if (!alive) s();
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
      clearInterval(flush);
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = Object.values(devices)
    .sort((a, b) => (b.parsed ? 1 : 0) - (a.parsed ? 1 : 0) || /scale|adv|chipsea|okok/i.test(b.name) - /scale|adv|chipsea|okok/i.test(a.name) || b.rssi - a.rssi)
    .slice(0, 25);
  const saved = new Set(scales.map((s) => s.id));

  const copy = async (id) => {
    const d = devices[id];
    const text = [`The Disciplined scale capture`, `device ${id} "${d?.name || ''}"`, ...(capture.current[id] || []).map((l) => `${new Date(l.at).toISOString().slice(11, 23)}  ${l.line}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast(L('Copied. Paste it in the chat with Claude.', 'نُسخ. الصقه في المحادثة مع Claude.'));
    } catch {
      toast(L('Could not copy', 'تعذر النسخ'), 'error');
    }
  };

  return (
    <Sheet open onClose={onClose} title={L('Find my scale', 'ابحث عن ميزاني')}>
      <p className="muted text-sm">
        {L('Step on the scale so it wakes up. Devices the phone hears appear below; a recognised scale shows its weight.', 'قف على الميزان ليستيقظ. تظهر أدناه الأجهزة التي يلتقطها الهاتف، والميزان المعروف يظهر وزنه.')}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!list.length && !error && <p className="muted py-6 text-center text-sm">{L('Listening…', 'جارٍ الاستماع…')}</p>}
      {list.map((d) => (
        <div key={d.id} className="card space-y-2 !p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{d.name || L('(no name)', '(بلا اسم)')}</p>
              <p className="muted tabular text-xs">{d.id} · {d.rssi} dBm</p>
            </div>
            {d.parsed && (
              <span className="tabular rounded-full px-2 py-1 text-sm font-extrabold text-white" style={{ background: THEME.color }}>
                {num(d.parsed.weight, 1)} {L('kg', 'كجم')}
              </span>
            )}
          </div>
          <p className="muted break-all font-mono text-[11px]">{Object.entries(d.mfr).map(([k, v]) => `${companyHex(k)}: ${hex(v)}`).join(' | ')}</p>
          <div className="flex flex-wrap gap-2">
            {saved.has(d.id) ? (
              <span className="text-sm font-bold" style={{ color: THEME.color }}>{L('Saved as my scale', 'محفوظ كميزاني')}</span>
            ) : (
              <button className="btn-soft !min-h-[36px] !px-3 text-sm" onClick={() => setScales([...scales, { id: d.id, name: d.name || L('Bluetooth scale', 'ميزان بلوتوث'), format: d.parsed?.format || null, added: Date.now() }])}>
                <Plus size={14} /> {L('This is my scale', 'هذا ميزاني')}
              </button>
            )}
            {!d.parsed && (
              <button className="btn-soft !min-h-[36px] !px-3 text-sm" onClick={() => { setTeach(d.id); setKnown(''); }}>
                <Scale size={14} /> {L('Teach the weight', 'علّمه الوزن')}
              </button>
            )}
            <button className="btn-ghost !min-h-[36px] !px-3 text-sm" onClick={() => copy(d.id)}>
              <ClipboardCopy size={14} /> {L('Copy capture', 'انسخ الالتقاط')}
            </button>
          </div>
          {teach === d.id && (
            <div className="space-y-2 rounded-2xl bg-brand-50/60 p-3 dark:bg-white/5">
              <p className="text-sm">{L('Stand on the scale and type the weight its display shows now.', 'قف على الميزان واكتب الوزن الذي تعرضه شاشته الآن.')}</p>
              <div className="flex gap-2">
                <NumberInput className="flex-1" value={known} onChange={setKnown} aria-label={L('Weight on the display', 'الوزن على الشاشة')} />
                <button
                  className="btn-primary"
                  disabled={!(Number(known) > 2)}
                  onClick={() => {
                    const recent = (capture.current[d.id] || []).filter((l) => Date.now() - l.at < 20000).map((l) => l.mfr);
                    const cfg = learnFormat(recent, Number(known));
                    if (!cfg) {
                      toast(L('That number is not in what the scale sends. Copy the capture and send it to Claude.', 'هذا الرقم غير موجود فيما يرسله الميزان. انسخ الالتقاط وأرسله إلى Claude.'), 'error');
                      return;
                    }
                    const rest = scales.filter((s) => s.id !== d.id);
                    setScales([...rest, { id: d.id, name: d.name || L('Bluetooth scale', 'ميزان بلوتوث'), format: 'learnt', learnt: cfg, added: Date.now() }]);
                    setTeach(null);
                    toast(L('Learnt. Weighing will read this scale from now on.', 'تم التعلّم. سيُقرأ هذا الميزان من الآن.'));
                  }}
                >
                  {L('Learn', 'تعلّم')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </Sheet>
  );
}
