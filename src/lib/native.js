// Platform helpers: one API for the web and the Capacitor (Android) app.
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const isNative = Capacitor.isNativePlatform();

/** Opens an external link (WhatsApp, a phone call, a web page). */
export async function openUrl(url) {
  if (!url) return;
  if (/^(mailto|tel|sms):/i.test(url)) {
    window.location.href = url;
  } else if (isNative && /^https?:/i.test(url)) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/** A file in public/ (the Quran, the azkar), whatever path the app is served from. */
export const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export function downloadText(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
