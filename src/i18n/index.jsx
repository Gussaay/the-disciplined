// Two languages, written side by side where they are used:
//   const { L } = useLang();  L('Start workout', 'ابدأ التمرين')
// Keeping both wordings on the same line means a screen can never ship with a
// missing translation. Data files use { en, ar } objects and `pick`.
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';

const LangContext = createContext({ lang: 'en', rtl: false, L: (en) => en, pick: (o) => o?.en });
const DEFAULTS = {};

export const deviceLang = () =>
  (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');

export function LangProvider({ children }) {
  const [settings, setSettings] = useStore('settings', DEFAULTS);
  const lang = settings.lang || deviceLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next) => setSettings((s) => ({ ...s, lang: next })), [setSettings]);

  const value = useMemo(() => {
    const ar = lang === 'ar';
    const locale = ar ? 'ar-u-nu-latn' : 'en';
    return {
      lang,
      rtl: ar,
      setLang,
      L: (en, arText) => (ar && arText != null ? arText : en),
      pick: (o) => (o == null ? '' : typeof o === 'string' ? o : (ar ? o.ar : o.en) || o.en || ''),
      num: (n, digits = 0) => Number(n || 0).toLocaleString('en', { maximumFractionDigits: digits }),
      date: (d, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
        new Intl.DateTimeFormat(locale, opts).format(d instanceof Date ? d : new Date(d)),
      time: (d) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d),
      hijri: (d = new Date()) => {
        try {
          return new Intl.DateTimeFormat(ar ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : 'en-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'long', year: 'numeric',
          }).format(d);
        } catch {
          return '';
        }
      },
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
