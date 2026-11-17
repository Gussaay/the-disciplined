// Small building blocks shared by every screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { useLang } from '../i18n';
import { goalById } from '../config';
import Illustration from './Illustrations';

/** A screen: sticky title bar with an optional back button and action. */
export function Page({ title, subtitle, back, action, children, tone = 'plain', goal }) {
  const navigate = useNavigate();
  const { L, pick } = useLang();
  const dark = tone === 'brand';
  const g = goal ? goalById(goal) : null;
  const vars = g ? { '--accent': g.color, '--accent-dark': g.dark, '--hero-bg': g.dark } : undefined;
  return (
    <div className={`mx-auto min-h-screen max-w-2xl pb-28 ${g ? 'themed' : ''}`} style={vars}>
      <header
        className={`pt-safe sticky top-0 z-20 ${dark ? 'bg-brand-800 text-white' : 'bg-paper/95 backdrop-blur dark:bg-[#0B1413]/95'}`}
      >
        <div className="flex min-h-[56px] items-center gap-2 px-4">
          {back && (
            <button
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
              aria-label={L('Back', 'رجوع')}
              className="-ms-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronLeft className="flip-rtl" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{title}</h1>
            {subtitle && <p className={`truncate text-sm ${dark ? 'text-white/70' : 'muted'}`}>{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className="space-y-4 px-4 pt-2">
        {g && (
          <div
            className="relative flex items-center gap-3 overflow-hidden rounded-3xl px-5 py-4 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${g.color}, ${g.dark})` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">{pick(g.name)}</p>
              <p className="mt-1 text-lg font-extrabold leading-snug">{pick(g.motto)}</p>
            </div>
            <Illustration goal={g.id} className="h-20 w-32 shrink-0" />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function Section({ title, action, children }) {
  return (
    <section className="space-y-2">
      {(title || action) && (
        <div className="flex items-end justify-between gap-2 px-1">
          <h2 className="eyebrow">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A panel that slides up from the bottom; closes on the backdrop or Escape. */
export function Sheet({ open, onClose, title, children, footer }) {
  const { L } = useLang();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/50" aria-label={L('Close', 'إغلاق')} onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl animate-sheet flex-col rounded-t-3xl bg-paper shadow-2xl dark:bg-[#0F1B1A] sm:rounded-3xl">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label={L('Close', 'إغلاق')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <X />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="pb-safe border-t border-brand-900/10 px-4 pt-3 dark:border-white/10">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

/** A row of choices where one is selected. */
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`chip ${value === o.value ? 'chip-on' : ''}`}
        >
          {o.icon && <span aria-hidden>{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A progress ring. `value` 0-1. */
export function Ring({ value = 0, size = 72, stroke = 8, color = '#1D6059', children, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-brand-900/10 dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{children}</div>
    </div>
  );
}

/** A thin progress bar with a label and "value / target". */
export function Meter({ label, value, target, unit = '', color = '#1D6059', warnOver = false }) {
  const share = target ? value / target : 0;
  const over = warnOver && share > 1;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={`tabular ${over ? 'font-bold text-red-600 dark:text-red-400' : 'muted'}`}>
          {Math.round(value)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, share * 100)}%`, background: over ? '#DC2626' : color }}
        />
      </div>
    </div>
  );
}

/** Small bar chart: [{ label, value, mark? }]. */
export function Bars({ data, color = '#1D6059', height = 72, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.label}: ${format(d.value)}`}>
          <div className="flex w-full items-end" style={{ height }}>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{ height: Math.max(d.value ? 5 : 2, Math.round((d.value / max) * height)), background: d.value ? color : 'rgba(120,130,130,0.25)', opacity: d.mark === false ? 0.45 : 1 }}
            />
          </div>
          <span className="muted w-full truncate text-center text-[11px]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center">
      {icon && <div className="text-4xl" aria-hidden>{icon}</div>}
      <p className="font-bold">{title}</p>
      {children && <p className="muted max-w-sm text-sm">{children}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-700" />
      {label && <span className="muted text-sm">{label}</span>}
    </div>
  );
}

/** Number input that keeps what was typed (so "7." or "" are possible while typing). */
export function NumberInput({ value, onChange, className = '', ...rest }) {
  const [text, setText] = useState(value === 0 || value ? String(value) : '');
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value === 0 || value ? String(value) : '');
    }
  }, [value]);
  return (
    <input
      inputMode="decimal"
      className={`input tabular ${className}`}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
        setText(t);
        const n = t === '' ? '' : Number(t);
        last.current = n;
        onChange(Number.isNaN(n) ? '' : n);
      }}
      {...rest}
    />
  );
}

// --- Toasts ----------------------------------------------------------------
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, kind = 'info') => {
    clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4" role="status" aria-live="polite">
          <div className={`animate-rise rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg ${toast.kind === 'error' ? 'bg-red-600' : 'bg-brand-900'}`}>
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
