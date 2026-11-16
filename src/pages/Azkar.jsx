import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, RotateCcw, Search } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { Empty, Page, Section, Spinner } from '../components/ui';
import { asset } from '../lib/native';
import { dayKey } from '../lib/dates';

const NONE = {};

// The collections people return to every day, with English names. The rest of
// Hisn al-Muslim is listed in Arabic below them.
const FEATURED = [
  { id: 1, icon: '🌅', en: 'Morning and evening' },
  { id: 27, icon: '🤲', en: 'After the prayer' },
  { id: 2, icon: '🌙', en: 'Before sleep' },
  { id: 3, icon: '☀️', en: 'On waking' },
  { id: 10, icon: '🚶', en: 'Going to the mosque' },
  { id: 11, icon: '🕌', en: 'Entering the mosque' },
  { id: 12, icon: '🚪', en: 'Leaving the mosque' },
];

let cache = null;
function useAzkar() {
  const [data, setData] = useState(cache);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    fetch(asset('azkar.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        cache = d;
        if (alive) setData(d);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  return { data, failed };
}

function Tasbih() {
  const { L } = useLang();
  const [state, setState] = useStore('tasbih', NONE);
  const count = Number(state.count) || 0;
  const target = Number(state.target) || 33;
  return (
    <div className="card flex items-center gap-4">
      <button
        className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-brand-800 text-white shadow-lg transition active:scale-95 dark:bg-brand-500"
        aria-label={L(`Count, now ${count}`, `عدّ، الآن ${count}`)}
        onClick={() => {
          const next = count + 1;
          if (next % target === 0) navigator.vibrate?.(120);
          setState({ ...state, count: next });
        }}
      >
        <span className="tabular text-3xl font-extrabold leading-none">{count}</span>
        <span className="mt-1 text-[11px] text-white/70">{L('tap', 'اضغط')}</span>
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-extrabold">{L('Tasbih counter', 'عدّاد التسبيح')}</p>
        <p className="muted text-sm">{L(`Round ${Math.floor(count / target) + 1} · ${count % target} of ${target}`, `الدورة ${Math.floor(count / target) + 1} · ${count % target} من ${target}`)}</p>
        <div className="flex flex-wrap gap-2">
          {[33, 100].map((n) => (
            <button key={n} className={`chip !min-h-[36px] ${target === n ? 'chip-on' : ''}`} onClick={() => setState({ ...state, target: n })}>{n}</button>
          ))}
          <button className="chip !min-h-[36px]" aria-label={L('Reset', 'تصفير')} onClick={() => setState({ ...state, count: 0 })}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Collection({ collection, title }) {
  const { L } = useLang();
  const [log, setLog] = useStore('azkarLog', NONE);
  const today = dayKey();
  // Counts for today live in memory; finishing the collection is what is saved.
  const [counts, setCounts] = useState({});
  const total = collection.i.length;
  const finished = collection.i.filter(([, need], i) => (counts[i] || 0) >= need).length;
  const allDone = finished === total;

  useEffect(() => {
    if (allDone && !log[today]?.[collection.id]) {
      setLog({ ...log, [today]: { ...(log[today] || {}), [collection.id]: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return (
    <Page title={title} subtitle={L(`${finished} of ${total} done`, `أتممت ${finished} من ${total}`)} back="/prayer/azkar">
      {(log[today]?.[collection.id] || allDone) && (
        <p className="flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-800 dark:bg-white/10 dark:text-brand-100">
          <Check size={18} /> {L('Completed today. May Allah accept it.', 'أتممتها اليوم. تقبّل الله منك.')}
        </p>
      )}
      {collection.i.map(([text, need], i) => {
        const done = counts[i] || 0;
        const complete = done >= need;
        return (
          <button
            key={i}
            className={`card block w-full text-start transition active:scale-[0.99] ${complete ? 'opacity-60' : ''}`}
            onClick={() => {
              if (complete) return;
              if (done + 1 >= need) navigator.vibrate?.(60);
              setCounts({ ...counts, [i]: done + 1 });
            }}
            aria-label={L(`Zikr ${i + 1}, ${done} of ${need}`, `الذكر ${i + 1}، ${done} من ${need}`)}
          >
            <p className="text-[1.15rem] leading-loose" lang="ar" dir="rtl">{text}</p>
            <div className="mt-3 flex items-center gap-3" dir="ltr">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, (done / need) * 100)}%` }} />
              </div>
              <span className={`tabular flex h-9 min-w-[3.5rem] items-center justify-center rounded-full px-2 text-sm font-extrabold ${complete ? 'bg-brand-700 text-white' : 'bg-gold-100 text-brand-900 dark:bg-gold-500/20 dark:text-gold-300'}`}>
                {complete ? <Check size={18} /> : `${done} / ${need}`}
              </span>
            </div>
          </button>
        );
      })}
      <button className="btn-soft w-full" onClick={() => setCounts({})}>
        <RotateCcw size={16} /> {L('Start again', 'ابدأ من جديد')}
      </button>
    </Page>
  );
}

export default function Azkar() {
  const { id } = useParams();
  const { L, lang } = useLang();
  const { data, failed } = useAzkar();
  const [log] = useStore('azkarLog', NONE);
  const [query, setQuery] = useState('');
  const today = dayKey();

  const others = useMemo(() => {
    if (!data) return [];
    const featured = new Set(FEATURED.map((f) => f.id));
    const q = query.trim();
    return data.filter((c) => !featured.has(c.id) && (!q || c.c.includes(q)));
  }, [data, query]);

  if (failed) {
    return (
      <Page title={L('Azkar', 'الأذكار')} back="/prayer">
        <Empty icon="📡" title={L('Could not load the azkar', 'تعذر تحميل الأذكار')}>
          {L('Open this page once with a connection and it stays on your device.', 'افتح هذه الصفحة مرة واحدة مع اتصال بالإنترنت وستبقى على جهازك.')}
        </Empty>
      </Page>
    );
  }
  if (!data) return <Page title={L('Azkar', 'الأذكار')} back="/prayer"><Spinner /></Page>;

  if (id) {
    const collection = data.find((c) => c.id === Number(id));
    if (!collection) return <Page title={L('Azkar', 'الأذكار')} back="/prayer/azkar"><Empty icon="🤲" title={L('Not found', 'غير موجود')} /></Page>;
    const featured = FEATURED.find((f) => f.id === collection.id);
    return <Collection key={collection.id} collection={collection} title={lang === 'ar' || !featured ? collection.c : featured.en} />;
  }

  return (
    <Page title={L('Azkar', 'الأذكار')} subtitle={L('From Hisn al-Muslim', 'من حصن المسلم')} back="/prayer">
      <Tasbih />
      <Section title={L('Every day', 'كل يوم')}>
        <div className="grid grid-cols-2 gap-2">
          {FEATURED.map((f) => {
            const c = data.find((x) => x.id === f.id);
            if (!c) return null;
            const done = log[today]?.[f.id];
            return (
              <Link key={f.id} to={`/prayer/azkar/${f.id}`} className="card relative !p-3 active:scale-[0.98]">
                {done && <Check size={18} className="absolute end-3 top-3 text-brand-600 dark:text-gold-300" />}
                <span className="text-2xl" aria-hidden>{f.icon}</span>
                <p className="mt-1 font-bold leading-tight">{lang === 'ar' ? c.c : f.en}</p>
                <p className="muted text-xs">{L(`${c.i.length} azkar`, `${c.i.length} أذكار`)}</p>
              </Link>
            );
          })}
        </div>
      </Section>
      <Section title={L('All of Hisn al-Muslim', 'حصن المسلم كاملاً')}>
        <label className="relative block">
          <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
          <input className="input !ps-10" dir="rtl" placeholder="ابحث في الأذكار" aria-label={L('Search azkar (Arabic)', 'ابحث في الأذكار')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
          {others.map((c) => (
            <Link key={c.id} to={`/prayer/azkar/${c.id}`} className="flex items-center justify-between gap-3 py-3" dir="rtl" lang="ar">
              <span className="font-medium">{c.c}</span>
              <span className="muted tabular shrink-0 text-sm">{c.i.length}</span>
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  );
}
