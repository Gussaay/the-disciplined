// Updates for the Android app, two kinds:
//
//   over the air  CI publishes the built web app as a zip with a manifest,
//                 https://<site>/latest/update.json
//                 { version, url, checksum, nativeHash, minNativeBuild, notes }.
//                 The app downloads it in the background (Capgo updater) and
//                 switches to it the next time it starts, or at once when the
//                 person presses "Restart now". A few hundred KB, no install.
//   APK           https://<site>/native-version.json
//                 { version, versionCode, apkUrl, notes }.
//                 Needed when the native side changed (a new plugin,
//                 permissions). The app offers the download; Android installs it.
//
// The safety rule (the Easy Pedia method): a web bundle is installed only on
// an APK with build >= its minNativeBuild, which CI sets to the build where the
// native side last changed (or when the native fingerprint matches). Web code
// that calls a plugin the installed APK lacks would crash on start.
import { App as CapApp } from '@capacitor/app';
// The updater plugin is imported with the app, not loaded lazily when a
// check runs: the lazy load stalled on a real phone (the check died with
// "updater did not answer" before it even looked for an update, every time),
// while the app itself - this file included - had loaded fine.
import { CapacitorUpdater } from '@capgo/capacitor-updater';
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
  apk: null,         // { version, versionCode, apkUrl, notes } when this APK is too old for the updates
  latestApk: null,   // the newest published APK, for a manual download
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

const withTimeout = (promise, ms, what) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not answer`)), ms))]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn` until it answers, up to `times` tries with a growing pause.
 * Every step that can stall is retried before the check gives up: one
 * stalled call used to fail the whole check for the rest of the session.
 */
async function tryTimes(times, fn) {
  let last;
  for (let i = 0; i < times; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < times - 1) await sleep(1500 * (i + 1));
    }
  }
  throw last;
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
    // Every plugin call has a time limit and is retried: one call that
    // never answered used to fail the whole check, so no update was ever
    // looked for again.
    const info = await tryTimes(2, () => withTimeout(CapApp.getInfo(), 8000, 'app info'));
    set({ native: { version: info.version, build: info.build }, bundle: state.bundle || info.version });

    // The manifests are plain web fetches, so they are read BEFORE anything
    // touches the updater plugin: even if the plugin stalls, the page can
    // still offer the newest APK and its manual download link.
    const [apk, manifest] = await Promise.all([
      getJson('/native-version.json').catch(() => null),
      getJson('/latest/update.json').catch(() => null),
    ]);
    if (!apk && !manifest) throw new Error('The update site did not answer');

    // Which bundle is running? The APK's own version is the fallback when
    // the plugin does not answer; that can only delay an update, never
    // install a wrong one, because the fit test below still applies.
    let running = info.version;
    try {
      const current = await tryTimes(2, () => withTimeout(CapacitorUpdater.current(), 10000, 'current bundle'));
      if (current?.bundle?.version && current.bundle.version !== 'builtin') running = current.bundle.version;
    } catch { /* keep the APK version */ }
    set({ native: { version: info.version, build: info.build }, bundle: running });

    // As in Easy Pedia: the APK is offered only when this one is too old for
    // the over-the-air update; otherwise every build would ask for an install.
    const fit = bundleFits(manifest, { running, nativeHash: NATIVE_HASH, build: info.build });
    const newer = newerApk(apk, info.build) ? apk : null;
    set({ needsApk: fit === 'needs-apk', apk: fit === 'needs-apk' || (!manifest && newer) ? newer : null, latestApk: newer });
    if (state.apk) notifyOnce(`apk-${state.apk.version}`, {
      title: 'New version of the app',
      titleAr: 'إصدار جديد من التطبيق',
      body: `Version ${state.apk.version} is ready. Open the app and tap Download and install.`,
      bodyAr: `الإصدار ${state.apk.version} جاهز. افتح التطبيق واضغط تنزيل وتثبيت.`,
    });
    if (fit === 'install' && state.ready !== manifest.version) {
      set({ downloading: true });
      const bundle = await tryTimes(2, async () => {
        const { bundles = [] } = await withTimeout(CapacitorUpdater.list(), 10000, 'list').catch(() => ({ bundles: [] }));
        let found = bundles.find((b) => b.version === manifest.version && b.status !== 'error');
        if (!found) found = await withTimeout(CapacitorUpdater.download({ url: manifest.url, version: manifest.version, checksum: manifest.checksum }), 180_000, 'download');
        await withTimeout(CapacitorUpdater.next({ id: found.id }), 10000, 'next');
        return found;
      });
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
  await CapacitorUpdater.set({ id: state.readyId });
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
  withTimeout(CapacitorUpdater.notifyAppReady(), 10000, 'ready').catch(() => {});
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
