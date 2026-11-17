// Updates for the Android app, two kinds:
//
//   over the air  CI publishes the built web app as a zip with a manifest,
//                 https://<site>/latest/update.json
//                 { version, url, checksum, nativeHash, notes }.
//                 The app downloads it in the background (Capgo updater) and
//                 switches to it the next time it starts, or at once when the
//                 person presses "Restart now". A few hundred KB, no install.
//   APK           https://<site>/native-version.json
//                 { version, versionCode, apkUrl, notes }.
//                 Needed when the native side changed (a new plugin,
//                 permissions). The app offers the download; Android installs it.
//
// The safety rule: a web bundle is installed only when its nativeHash equals
// the one this app was built with. Web code that calls a plugin the installed
// APK lacks would crash on start. The running code always carries the hash of
// the APK under it, because a bundle with another hash is never installed.
import { App as CapApp } from '@capacitor/app';
import { isNative } from './native';
import { UPDATE_SITE } from '../config';
import { bundleFits, newerApk } from './updateRules';

export const NATIVE_HASH = import.meta.env.VITE_NATIVE_HASH || '';
const TIMEOUT = 15_000;
const RECHECK_MS = 2 * 60_000;      // on return to the app, at most every 2 minutes
const POLL_MS = 30 * 60_000;         // while the app stays open
const APPLY_AFTER_MS = 30_000;       // a waiting update is applied on return after this long away
const UPDATE_NOTE_ID = 4001;         // notification id, outside the reminder ranges

let state = {
  native: null,      // { version, build } of the installed APK
  bundle: null,      // version of the web code running
  checking: false,
  downloading: false,
  ready: null,       // version downloaded and queued for the next start
  apk: null,         // { version, versionCode, apkUrl, notes } when a newer APK exists
  upToDate: false,
  needsApk: false,   // an over-the-air update exists but this APK is too old for it
  error: null,
  checkedAt: null,
};
const listeners = new Set();
export const updateStore = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getSnapshot: () => state,
};
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${UPDATE_SITE}${path}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(timer);
  }
}

let updater = null;
async function getUpdater() {
  if (!updater) updater = (await import('@capgo/capacitor-updater')).CapacitorUpdater;
  return updater;
}

let checking = false;
export async function checkForUpdates() {
  if (!isNative || checking) return state;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    set({ error: 'offline' });
    return state;
  }
  checking = true;
  set({ checking: true, error: null });
  try {
    const U = await getUpdater();
    const info = await CapApp.getInfo();
    const current = await U.current().catch(() => null);
    const running = current?.bundle?.version && current.bundle.version !== 'builtin' ? current.bundle.version : info.version;
    set({ native: { version: info.version, build: info.build }, bundle: running });

    const [apk, manifest] = await Promise.all([
      getJson('/native-version.json').catch(() => null),
      getJson('/latest/update.json').catch(() => null),
    ]);
    set({ apk: newerApk(apk, info.build) ? apk : null });
    if (!apk && !manifest) throw new Error('The update site did not answer');

    const fit = bundleFits(manifest, { running, nativeHash: NATIVE_HASH });
    set({ needsApk: fit === 'needs-apk' });
    if (state.apk) notifyOnce(`apk-${state.apk.version}`, {
      title: 'New version of the app',
      titleAr: 'إصدار جديد من التطبيق',
      body: `Version ${state.apk.version} is ready. Open the app and press Download.`,
      bodyAr: `الإصدار ${state.apk.version} جاهز. افتح التطبيق واضغط تنزيل.`,
    });
    if (fit === 'install' && state.ready !== manifest.version) {
      set({ downloading: true });
      const { bundles = [] } = await U.list().catch(() => ({ bundles: [] }));
      let bundle = bundles.find((b) => b.version === manifest.version && b.status !== 'error');
      if (!bundle) bundle = await U.download({ url: manifest.url, version: manifest.version, checksum: manifest.checksum });
      await U.next({ id: bundle.id });
      set({ ready: manifest.version, downloading: false, readyId: bundle.id, notes: manifest.notes || null });
      notifyOnce(`ota-${manifest.version}`, {
        title: 'Update downloaded',
        titleAr: 'تم تنزيل تحديث',
        body: manifest.notes ? `${manifest.notes}. It is used next time you open the app.` : 'It is used next time you open the app.',
        bodyAr: 'سيُستخدم عند فتح التطبيق في المرة القادمة.',
      });
    }
    set({ upToDate: fit === 'current' && !state.apk, checkedAt: Date.now() });
  } catch (e) {
    set({ error: e?.message || 'failed', downloading: false });
  } finally {
    checking = false;
    set({ checking: false });
  }
  return state;
}

/** Switches to the downloaded web bundle now (the app reloads). */
export async function restartIntoUpdate() {
  if (!state.readyId) return;
  const U = await getUpdater();
  await U.set({ id: state.readyId });
}

/** A phone notification about an update, shown once per version. */
async function notifyOnce(key, { title, titleAr, body, bodyAr }) {
  try {
    const seen = localStorage.getItem('td:updateNotified');
    if (seen === key) return;
    localStorage.setItem('td:updateNotified', key);
    const ar = (document.documentElement.lang || '').startsWith('ar');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [{ id: UPDATE_NOTE_ID, title: ar ? titleAr : title, body: ar ? bodyAr : body, schedule: { at: new Date(Date.now() + 1500) } }],
    });
  } catch { /* notifications are a bonus */ }
}

/** Pages where switching code would interrupt the person. */
const busyNow = () => typeof location !== 'undefined' && /\/gym\/session/.test(location.pathname + location.hash);

let started = false;
/** Called once at start in the Android app. */
export function startUpdates() {
  if (!isNative || started) return;
  started = true;
  // Without this on every start, the updater thinks the new bundle is broken
  // and goes back to the previous one.
  getUpdater().then((U) => U.notifyAppReady()).catch(() => {});
  setTimeout(checkForUpdates, 3000);
  // Android keeps the app in memory for days, so "next start" can be far
  // away: check whenever the person comes back, and apply a downloaded
  // update then if they were away a while.
  let lastCheck = Date.now();
  let leftAt = 0;
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      leftAt = Date.now();
      return;
    }
    if (state.readyId && leftAt && Date.now() - leftAt > APPLY_AFTER_MS && !busyNow()) {
      restartIntoUpdate().catch(() => {});
      return;
    }
    if (Date.now() - lastCheck > RECHECK_MS) {
      lastCheck = Date.now();
      checkForUpdates();
    }
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      lastCheck = Date.now();
      checkForUpdates();
    }
  }, POLL_MS);
}
