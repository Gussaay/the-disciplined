import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Search } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { Meter, Page, Segmented } from '../components/ui';
import { dayKey, lastDays, streak } from '../lib/dates';
import surahs from '../data/surahs.json';

const NONE = {};

export default function Quran() {
  const { L, lang } = useLang();
  const [quran, setQuran] = useStore('quran', NONE);
  const [query, setQuery] = useState('');
  const today = dayKey();
  const goal = Number(quran.goal) || 20;
  const read = Number(quran.log?.[today]) || 0;
  const last = quran.last && surahs[quran.last.s - 1];
  const days = streak((key) => (Number(quran.log?.[key]) || 0) >= goal, today);
  const weekTotal = lastDays(7, today).reduce((s, key) => s + (Number(quran.log?.[key]) || 0), 0);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter((s) => `${s.id} ${s.name} ${s.tr} ${s.en}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <Page title={L('The Noble Quran', 'القرآن الكريم')} back="/prayer">
      <div className="card space-y-3">
        <Meter label={L('Today’s reading', 'ورد اليوم')} value={read} target={goal} unit={L('verses', 'آية')} color="#1D6059" />
        <p className="muted text-sm">
          {L(`${weekTotal} verses this week · ${days} days at your goal in a row`, `${weekTotal} آية هذا الأسبوع · ${days} أيام متتالية على هدفك`)}
        </p>
        <div>
          <p className="label">{L('Daily goal, verses', 'الهدف اليومي، بالآيات')}</p>
          <Segmented value={goal} onChange={(g) => setQuran({ ...quran, goal: g })} options={[10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))} />
        </div>
        {last && (
          <Link to={`/prayer/quran/${quran.last.s}`} className="btn-primary w-full">
            <Bookmark size={18} />
            {L(`Continue: ${last.tr}, verse ${quran.last.a}`, `تابع: سورة ${last.name}، الآية ${quran.last.a}`)}
          </Link>
        )}
      </div>

      <label className="relative block">
        <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        <input className="input !ps-10" placeholder={L('Search by name or number', 'ابحث بالاسم أو الرقم')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
        {list.map((s) => (
          <Link key={s.id} to={`/prayer/quran/${s.id}`} className="flex items-center gap-3 py-3">
            <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-800 dark:bg-white/10 dark:text-brand-100">{s.id}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{lang === 'ar' ? `سورة ${s.name}` : s.tr}</span>
              <span className="muted block text-sm">
                {lang === 'ar' ? '' : `${s.en} · `}
                {s.type === 'meccan' ? L('Meccan', 'مكية') : L('Medinan', 'مدنية')} · {L(`${s.n} verses`, `${s.n} آية`)}
              </span>
            </span>
            {lang !== 'ar' && <span className="quran shrink-0 text-xl" lang="ar">{s.name}</span>}
            {quran.last?.s === s.id && <Bookmark size={16} className="shrink-0 fill-gold-400 text-gold-500" />}
          </Link>
        ))}
      </div>
      <p className="muted px-1 text-xs">
        {L(
          'Text: Uthmani script from the Noble Qur’an Encyclopedia (quranenc.com). Translation: Saheeh International, via tanzil.net.',
          'النص: الرسم العثماني من موسوعة القرآن الكريم (quranenc.com). الترجمة: صحيح إنترناشيونال عن tanzil.net.',
        )}
      </p>
    </Page>
  );
}
