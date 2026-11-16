import { NavLink } from 'react-router-dom';
import { BookA, Dumbbell, HeartHandshake, Home, MoonStar, Salad } from 'lucide-react';
import { useLang } from '../i18n';

const ITEMS = [
  { to: '/', icon: Home, en: 'Today', ar: 'اليوم', end: true },
  { to: '/gym', icon: Dumbbell, en: 'Gym', ar: 'التمرين' },
  { to: '/food', icon: Salad, en: 'Food', ar: 'الغذاء' },
  { to: '/prayer', icon: MoonStar, en: 'Prayer', ar: 'الصلاة' },
  { to: '/social', icon: HeartHandshake, en: 'People', ar: 'الصلة' },
  { to: '/english', icon: BookA, en: 'English', ar: 'الإنجليزية' },
];

export default function BottomNav() {
  const { L } = useLang();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-brand-900/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0F1B1A]/95">
      <div className="mx-auto grid max-w-2xl grid-cols-6">
        {ITEMS.map(({ to, icon: Icon, en, ar, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-0.5 pt-1.5 text-[11px] font-bold ${
                isActive ? 'text-brand-800 dark:text-gold-300' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-brand-100 dark:bg-white/10' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate">{L(en, ar)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
