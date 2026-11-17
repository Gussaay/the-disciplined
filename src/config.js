export const APP_VERSION = import.meta.env.VITE_RELEASE_VERSION || '1.0';
export const BUILD_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// The five goals. `color` is the goal's own accent, used for its ring, bars
// and icon so a glance at any screen says which goal it belongs to.
export const GOALS = [
  {
    id: 'gym', path: '/gym', icon: '🏋️', color: '#D9622B', dark: '#9A3F16', name: { en: 'Training', ar: 'التمرين' }, short: { en: 'Gym', ar: 'التمرين' },
    motto: { en: 'Strong body, steady habits', ar: 'جسد قوي وعادات ثابتة' },
  },
  {
    id: 'food', path: '/food', icon: '🥗', color: '#5E8C2A', dark: '#3B5C17', name: { en: 'Healthy food', ar: 'الغذاء الصحي' }, short: { en: 'Food', ar: 'الغذاء' },
    motto: { en: 'Eat to live well', ar: 'كُل لتحيا بصحة' },
  },
  {
    id: 'prayer', path: '/prayer', icon: '🕌', color: '#1D6059', dark: '#0F3D3E', name: { en: 'Prayer', ar: 'الصلاة' }, short: { en: 'Prayer', ar: 'الصلاة' },
    motto: { en: 'Guard your prayers', ar: 'حافظوا على الصلوات' },
  },
  {
    id: 'social', path: '/social', icon: '🤝', color: '#B8436B', dark: '#7C2847', name: { en: 'Keeping in touch', ar: 'صلة الرحم والتواصل' }, short: { en: 'People', ar: 'الصلة' },
    motto: { en: 'Keep the ties of kinship', ar: 'صِلوا أرحامكم' },
  },
  {
    id: 'english', path: '/english', icon: '🔤', color: '#4B5FC4', dark: '#2E3C8A', name: { en: 'English', ar: 'اللغة الإنجليزية' }, short: { en: 'English', ar: 'الإنجليزية' },
    motto: { en: 'A little every day', ar: 'قليل دائم كل يوم' },
  },
];

export const goalById = (id) => GOALS.find((g) => g.id === id);

// Google sign-in inside the Android app uses the OAuth "Web client ID" of the
// Firebase project (Authentication > Sign-in method > Google > Web SDK
// configuration). It is an identifier, not a secret. The phone's Google
// account picker also checks the app's SHA-1, registered on the Android app
// com.the.disciplined in Firebase.
export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '180200171366-hlmjlvkpo4mk5v41jb1ber27rquplv7d.apps.googleusercontent.com';

// Where CI publishes the over-the-air bundle and the APK version file
// (Firebase Hosting of disciplined-3e309).
export const UPDATE_SITE = (import.meta.env.VITE_UPDATE_SITE || 'https://disciplined-3e309.web.app').replace(/\/$/, '');
export const APK_LATEST_URL = 'https://github.com/Gussaay/the-disciplined/releases/latest/download/the-disciplined.apk';
