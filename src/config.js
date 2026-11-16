export const APP_VERSION = import.meta.env.VITE_RELEASE_VERSION || '1.0';
export const BUILD_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// The five goals. `color` is the goal's own accent, used for its ring, bars
// and icon so a glance at any screen says which goal it belongs to.
export const GOALS = [
  { id: 'gym', path: '/gym', icon: '🏋️', color: '#D9622B', name: { en: 'Training', ar: 'التمرين' }, short: { en: 'Gym', ar: 'التمرين' } },
  { id: 'food', path: '/food', icon: '🥗', color: '#5E8C2A', name: { en: 'Healthy food', ar: 'الغذاء الصحي' }, short: { en: 'Food', ar: 'الغذاء' } },
  { id: 'prayer', path: '/prayer', icon: '🕌', color: '#1D6059', name: { en: 'Prayer', ar: 'الصلاة' }, short: { en: 'Prayer', ar: 'الصلاة' } },
  { id: 'social', path: '/social', icon: '🤝', color: '#B8436B', name: { en: 'Keeping in touch', ar: 'صلة الرحم والتواصل' }, short: { en: 'People', ar: 'الصلة' } },
  { id: 'english', path: '/english', icon: '🔤', color: '#4B5FC4', name: { en: 'English', ar: 'اللغة الإنجليزية' }, short: { en: 'English', ar: 'الإنجليزية' } },
];

export const goalById = (id) => GOALS.find((g) => g.id === id);
