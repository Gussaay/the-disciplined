import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, ChevronLeft, ChevronRight, Languages } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { Empty, Page, Spinner, useToast } from '../components/ui';
import { asset } from '../lib/native';
import { dayKey } from '../lib/dates';
import { moveBookmark } from '../lib/quranProgress';
import surahs from '../data/surahs.json';

const NONE = {};
const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

export default function QuranSurah() {
  const { id } = useParams();
  const number = Number(id);
  const surah = surahs[number - 1];
  const { L, lang } = useLang();
  const toast = useToast();
  const [quran, setQuran] = useStore('quran', NONE);
  const [verses, setVerses] = useState(null);
  const [failed, setFailed] = useState(false);
  const [translate, setTranslate] = useState(quran.translate ?? lang !== 'ar');
  const marked = useRef(null);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setFailed(false);
    fetch(asset(`quran/${number}.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setVerses(d.v))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [number]);

  // Open at the bookmark.
  useEffect(() => {
    if (verses && quran.last?.s === number) marked.current?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses]);

  if (!surah) return <Page title={L('Quran', 'القرآن')} back="/prayer/quran"><Empty icon="📖" title={L('Surah not found', 'السورة غير موجودة')} /></Page>;

  const bookmark = quran.last?.s === number ? quran.last.a : 0;

  return (
    <Page
      title={lang === 'ar' ? `سورة ${surah.name}` : surah.tr}
      subtitle={`${surah.type === 'meccan' ? L('Meccan', 'مكية') : L('Medinan', 'مدنية')} · ${L(`${surah.n} verses`, `${surah.n} آية`)}`}
      back="/prayer/quran"
      action={
        <button
          className={`btn-ghost !px-3 ${translate ? 'text-gold-600 dark:text-gold-300' : ''}`}
          aria-pressed={translate}
          aria-label={L('Show translation', 'إظهار الترجمة')}
          onClick={() => {
            setTranslate(!translate);
            setQuran({ ...quran, translate: !translate });
          }}
        >
          <Languages size={20} />
        </button>
      }
    >
      {failed && (
        <Empty icon="📡" title={L('Could not load this surah', 'تعذر تحميل هذه السورة')}>
          {L('Open it once with a connection and it stays on your device.', 'افتحها مرة واحدة مع اتصال بالإنترنت وستبقى على جهازك.')}
        </Empty>
      )}
      {!verses && !failed && <Spinner />}
      {verses && (
        <>
          {number !== 1 && number !== 9 && <p className="quran py-2 text-center text-2xl" lang="ar" dir="rtl">{BASMALA}</p>}
          <div className="space-y-2">
            {verses.map(([text, translation], i) => {
              const n = i + 1;
              const here = bookmark === n;
              return (
                <div
                  key={n}
                  ref={here ? marked : null}
                  className={`card !p-3 ${here ? 'ring-2 ring-gold-400' : ''}`}
                >
                  <p className="quran text-[1.55rem]" lang="ar" dir="rtl">
                    {text} <span className="tabular inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-brand-600/40 px-1 align-middle font-sans text-xs font-bold text-brand-700 dark:text-brand-200">{n}</span>
                  </p>
                  {translate && <p className="muted mt-2 text-sm leading-relaxed" dir="ltr" lang="en">{translation}</p>}
                  <div className="mt-1 flex justify-end">
                    <button
                      className={`flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-xs font-bold ${here ? 'text-gold-600 dark:text-gold-300' : 'muted'}`}
                      onClick={() => {
                        setQuran(moveBookmark({ ...quran, translate }, number, n, dayKey()));
                        toast(L(`Bookmark at verse ${n}`, `العلامة عند الآية ${n}`));
                      }}
                    >
                      <Bookmark size={16} className={here ? 'fill-gold-400' : ''} />
                      {here ? L('You stopped here', 'توقفت هنا') : L('I read up to here', 'قرأت إلى هنا')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {number > 1 && (
              <Link to={`/prayer/quran/${number - 1}`} className="btn-soft flex-1">
                <ChevronLeft size={18} className="flip-rtl" /> {lang === 'ar' ? surahs[number - 2].name : surahs[number - 2].tr}
              </Link>
            )}
            {number < 114 && (
              <Link to={`/prayer/quran/${number + 1}`} className="btn-soft flex-1">
                {lang === 'ar' ? surahs[number].name : surahs[number].tr} <ChevronRight size={18} className="flip-rtl" />
              </Link>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
