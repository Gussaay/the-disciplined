import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, Flame, LocateFixed, MapPin, Sparkles } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { Field, Page, Section, Sheet, useToast } from '../components/ui';
import {
  CITIES, DEFAULT_PLACE, METHODS, PRAYERS, countdown, daySummary, prayerNow, prayerStreak, prayerTimes, qiblaDirection, weekSummary,
} from '../lib/prayer';
import { addDays, dayKey, fromKey } from '../lib/dates';
import surahs from '../data/surahs.json';

const NONE = {};

const STATUS = {
  ontime: { en: 'On time', ar: 'في وقتها', dot: '#1D6059' },
  late: { en: 'Late', ar: 'متأخرة', dot: '#C99A22' },
  missed: { en: 'Missed', ar: 'فاتتني', dot: '#DC2626' },
};

export default function Prayer() {
  const { L, pick, time, date, hijri } = useLang();
  const toast = useToast();
  const [log, setLog] = useStore('prayerLog', NONE);
  const [settings, setSettings] = useStore('prayerSettings', NONE);
  const [quran] = useStore('quran', NONE);
  const [day, setDay] = useState(dayKey());
  const [open, setOpen] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const today = dayKey(now);
  const isToday = day === today;
  const times = prayerTimes(settings, fromKey(day));
  const todayTimes = prayerTimes(settings, now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const state = prayerNow(todayTimes, now, prayerTimes(settings, tomorrow).fajr);
  const next = state.next && PRAYERS.find((p) => p.id === state.next.id);
  const entries = log[day] || NONE;
  const summary = daySummary(entries);
  const week = weekSummary(log, 7, today);
  const place = settings.place || pick(DEFAULT_PLACE.name);
  const qibla = Math.round(qiblaDirection(settings));
  const last = quran.last && surahs[quran.last.s - 1];

  const mark = (id, patch) => {
    const current = entries[id] || {};
    const nextEntry = patch === null ? undefined : { ...current, ...patch };
    const dayLog = { ...entries, [id]: nextEntry };
    if (!nextEntry) delete dayLog[id];
    setLog({ ...log, [day]: dayLog });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast(L('Location is not available on this device', 'خدمة الموقع غير متاحة على هذا الجهاز'), 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings({
          ...settings,
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
          place: L('My location', 'موقعي'),
        });
        setLocating(false);
        toast(L('Prayer times updated for your location', 'تم تحديث مواقيت الصلاة لموقعك'));
      },
      () => {
        setLocating(false);
        toast(L('Could not get your location. Choose a city instead.', 'تعذر تحديد موقعك. اختر مدينة بدلاً من ذلك.'), 'error');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  return (
    <Page
      goal="prayer"
      title={L('Prayer', 'الصلاة')}
      subtitle={hijri(fromKey(day))}
      action={
        <button className="btn-ghost !px-3 text-sm" onClick={() => setPlacing(true)}>
          <MapPin size={18} /> <span className="max-w-[7rem] truncate">{place}</span>
        </button>
      }
    >
      {!settings.lat && (
        <button className="flex w-full items-center gap-3 rounded-2xl border border-gold-400/50 bg-gold-100/60 p-3 text-start text-sm dark:border-gold-500/30 dark:bg-gold-500/10" onClick={() => setPlacing(true)}>
          <MapPin size={18} className="shrink-0 text-gold-600 dark:text-gold-300" />
          {L(`Times are shown for ${pick(DEFAULT_PLACE.name)}. Tap to set your own place.`, `المواقيت معروضة لمدينة ${pick(DEFAULT_PLACE.name)}. اضغط لتحديد مكانك.`)}
        </button>
      )}

      {next && (
        <div className="rounded-3xl bg-brand-800 p-5 text-white">
          <p className="text-sm text-white/70">{state.current ? L(`It is time for ${pick(PRAYERS.find((p) => p.id === state.current).name)}`, `الآن وقت صلاة ${pick(PRAYERS.find((p) => p.id === state.current).name)}`) : L('Next prayer', 'الصلاة القادمة')}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-extrabold">{pick(next.name)}</p>
              <p className="tabular text-white/80">{time(state.next.at)}</p>
            </div>
            <div className="text-end">
              <p className="tabular text-4xl font-extrabold text-gold-300">{countdown(state.msLeft)}</p>
              <p className="text-sm text-white/70">{state.msLeft >= 3600000 ? L('hours left', 'ساعة متبقية') : L('minutes left', 'دقيقة متبقية')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button className="btn-ghost !px-3" aria-label={L('Previous day', 'اليوم السابق')} onClick={() => setDay(addDays(day, -1))}>
          <ChevronLeft className="flip-rtl" />
        </button>
        <button className="text-center font-bold" onClick={() => setDay(today)}>
          {isToday ? L('Today', 'اليوم') : date(fromKey(day), { weekday: 'long', day: 'numeric', month: 'short' })}
          <span className="muted block text-sm font-normal">{L(`${summary.prayed} of 5 prayed · ${summary.mosque} in the mosque`, `${summary.prayed} من 5 صلوات · ${summary.mosque} في المسجد`)}</span>
        </button>
        <button className="btn-ghost !px-3" aria-label={L('Next day', 'اليوم التالي')} disabled={day >= today} onClick={() => setDay(addDays(day, 1))}>
          <ChevronRight className="flip-rtl" />
        </button>
      </div>

      <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
        {PRAYERS.map((p) => {
          const entry = entries[p.id];
          const notYet = isToday && times[p.id] > now;
          const expanded = open === p.id;
          return (
            <div key={p.id} className="py-3">
              <div className="flex items-center gap-3">
                <button className="min-w-0 flex-1 text-start" onClick={() => setOpen(expanded ? null : p.id)} aria-expanded={expanded} disabled={notYet}>
                  <p className={`font-extrabold ${isToday && state.current === p.id ? 'text-brand-600 dark:text-gold-300' : ''}`}>{pick(p.name)}</p>
                  <p className="muted tabular text-sm">
                    {time(times[p.id])}
                    {entry && (
                      <>
                        {' · '}
                        <span style={{ color: STATUS[entry.s]?.dot }} className="font-bold">{pick(STATUS[entry.s])}</span>
                        {entry.m && entry.s !== 'missed' && ` · ${L('mosque', 'في المسجد')}`}
                      </>
                    )}
                  </p>
                </button>
                <button
                  disabled={notYet}
                  aria-pressed={Boolean(entry?.m)}
                  aria-label={L(`${p.name.en} in the mosque`, `${p.name.ar} في المسجد`)}
                  onClick={() => mark(p.id, { s: entry?.s && entry.s !== 'missed' ? entry.s : 'ontime', m: !entry?.m })}
                  className={`flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold transition disabled:opacity-30 ${entry?.m && entry.s !== 'missed' ? 'bg-gold-400 text-brand-900' : 'bg-brand-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}
                >
                  🕌
                </button>
                <button
                  disabled={notYet}
                  aria-pressed={entry?.s === 'ontime' || entry?.s === 'late'}
                  aria-label={L(`${p.name.en} prayed`, `صليت ${p.name.ar}`)}
                  onClick={() => (entry && entry.s !== 'missed' ? mark(p.id, null) : mark(p.id, { s: 'ontime' }))}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition disabled:opacity-30 ${entry?.s === 'ontime' ? 'bg-brand-700 text-white' : entry?.s === 'late' ? 'bg-gold-500 text-white' : entry?.s === 'missed' ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-brand-900/5 text-slate-400 dark:bg-white/10'}`}
                >
                  <Check size={22} />
                </button>
              </div>
              {expanded && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(STATUS).map(([id, s]) => (
                    <button key={id} className={`chip ${entry?.s === id ? 'chip-on' : ''}`} onClick={() => mark(p.id, { s: id, ...(id === 'missed' ? { m: false } : {}) })}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} /> {pick(s)}
                    </button>
                  ))}
                  {entry && <button className="chip" onClick={() => mark(p.id, null)}>{L('Clear', 'مسح')}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted px-1 text-xs">
        {L('Tap ✓ when you have prayed, 🕌 when it was in the mosque. Tap the name to mark it late or missed.', 'اضغط ✓ بعد أن تصلي، و🕌 إذا كانت في المسجد. اضغط على اسم الصلاة لتسجيلها متأخرة أو فائتة.')}
      </p>

      <Section title={L('Last 7 days', 'آخر 7 أيام')}>
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            {week.rows.map((r) => (
              <div key={r.key} className="flex flex-1 flex-col items-center gap-1">
                {PRAYERS.map((p) => {
                  const e = log[r.key]?.[p.id];
                  return <span key={p.id} className="h-2.5 w-full max-w-[1.75rem] rounded-full" style={{ background: e ? STATUS[e.s]?.dot : 'rgba(120,130,130,0.2)', outline: e?.m && e.s !== 'missed' ? '2px solid #E0B84A' : 'none', outlineOffset: 1 }} />;
                })}
                <span className={`mt-1 text-[11px] ${r.key === today ? 'font-bold' : 'muted'}`}>{date(fromKey(r.key), { weekday: 'narrow' })}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              [`${week.prayed}/${week.total}`, L('prayed', 'صلاة')],
              [week.ontime, L('on time', 'في وقتها')],
              [week.mosque, L('in mosque', 'في المسجد')],
              [prayerStreak(log, today), L('full days', 'أيام كاملة'), true],
            ].map(([value, label, flame]) => (
              <div key={label}>
                <p className="tabular flex items-center justify-center gap-1 text-lg font-extrabold">
                  {flame && <Flame size={16} className="text-gold-500" />}{value}
                </p>
                <p className="muted text-xs">{label}</p>
              </div>
            ))}
          </div>
          <p className="muted mt-3 text-xs">{L('A gold outline marks a prayer in the mosque.', 'الإطار الذهبي يعني صلاة في المسجد.')}</p>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <Link to={last ? `/prayer/quran/${quran.last.s}` : '/prayer/quran'} className="card active:scale-[0.98]">
          <BookOpen className="text-brand-600 dark:text-gold-300" />
          <p className="mt-2 font-extrabold">{L('Quran', 'القرآن الكريم')}</p>
          <p className="muted text-sm">
            {last ? L(`Continue ${last.tr}, verse ${quran.last.a}`, `تابع سورة ${last.name}، الآية ${quran.last.a}`) : L('Read and keep your place', 'اقرأ واحفظ موضعك')}
          </p>
        </Link>
        <Link to="/prayer/azkar" className="card active:scale-[0.98]">
          <Sparkles className="text-brand-600 dark:text-gold-300" />
          <p className="mt-2 font-extrabold">{L('Azkar', 'الأذكار')}</p>
          <p className="muted text-sm">{L('Morning, evening, after prayer, tasbih', 'الصباح والمساء وبعد الصلاة والتسبيح')}</p>
        </Link>
      </div>

      <div className="card flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-brand-900/15 dark:border-white/15" role="img" aria-label={L(`Qibla ${qibla} degrees from north`, `القبلة ${qibla} درجة من الشمال`)}>
          <span className="absolute top-0.5 text-[10px] font-bold text-red-500">N</span>
          <div className="h-12 w-1" style={{ transform: `rotate(${qibla}deg)` }}>
            <div className="mx-auto h-6 w-1 rounded-full bg-gold-500" />
          </div>
        </div>
        <div>
          <p className="font-extrabold">{L('Qibla', 'اتجاه القبلة')}</p>
          <p className="muted text-sm">
            {L(`${qibla}° clockwise from north, for ${place}`, `${qibla}° من الشمال باتجاه عقارب الساعة، لـ ${place}`)}
          </p>
        </div>
      </div>

      <Sheet open={placing} onClose={() => setPlacing(false)} title={L('Place and calculation', 'المكان وطريقة الحساب')}>
        <button className="btn-primary w-full" onClick={locate} disabled={locating}>
          <LocateFixed size={18} /> {locating ? L('Finding you…', 'جارٍ تحديد موقعك…') : L('Use my location', 'استخدم موقعي')}
        </button>
        <Field label={L('Or choose a city', 'أو اختر مدينة')}>
          <select
            className="input"
            value={CITIES.findIndex((c) => c.lat === settings.lat && c.lng === settings.lng)}
            onChange={(e) => {
              const city = CITIES[Number(e.target.value)];
              if (city) setSettings({ ...settings, lat: city.lat, lng: city.lng, place: pick(city.name), method: city.method });
            }}
          >
            <option value={-1}>{settings.lat ? place : L('Choose…', 'اختر…')}</option>
            {CITIES.map((c, i) => <option key={c.name.en} value={i}>{pick(c.name)}</option>)}
          </select>
        </Field>
        <Field label={L('Calculation method', 'طريقة الحساب')} hint={L('Use the one your local mosque follows.', 'اختر الطريقة التي يتبعها مسجد منطقتك.')}>
          <select className="input" value={settings.method || 'Egyptian'} onChange={(e) => setSettings({ ...settings, method: e.target.value })}>
            {METHODS.map((m) => <option key={m.id} value={m.id}>{pick(m.name)}</option>)}
          </select>
        </Field>
        <Field label={L('Asr time', 'وقت العصر')}>
          <select className="input" value={settings.madhab || 'shafi'} onChange={(e) => setSettings({ ...settings, madhab: e.target.value })}>
            <option value="shafi">{L('Standard (Shafi, Maliki, Hanbali)', 'الجمهور (الشافعي والمالكي والحنبلي)')}</option>
            <option value="hanafi">{L('Hanafi', 'الحنفي')}</option>
          </select>
        </Field>
        <div>
          <p className="label">{L('Fine adjustment, minutes', 'تعديل دقيق، بالدقائق')}</p>
          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map((p) => (
              <label key={p.id} className="text-center">
                <span className="muted text-xs">{pick(p.name)}</span>
                <input
                  type="number"
                  className="input tabular !px-1 text-center"
                  value={settings.adjust?.[p.id] ?? 0}
                  onChange={(e) => setSettings({ ...settings, adjust: { ...settings.adjust, [p.id]: Number(e.target.value) || 0 } })}
                />
              </label>
            ))}
          </div>
        </div>
        <p className="muted text-xs">
          {L('Times are calculated on your device from the sun’s position and can differ by a minute or two from the mosque’s timetable.', 'تُحسب المواقيت على جهازك من موقع الشمس، وقد تختلف دقيقة أو دقيقتين عن جدول المسجد.')}
        </p>
      </Sheet>
    </Page>
  );
}
