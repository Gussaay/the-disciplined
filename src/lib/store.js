// Everything the person records lives on the device first (localStorage), so
// the app works with no account and no connection. When cloud backup is turned
// on, lib/sync.js mirrors the same keys to the person's own database node.
const PREFIX = 'td:';
const META = 'td~times';

const memory = new Map();
function storage() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch { /* blocked */ }
  return {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  };
}

const cache = new Map();
const listeners = new Map();
const changeListeners = new Set();

/** Keys that are copied to the cloud. `settings` and `device` stay on the device. */
export const SYNC_KEYS = [
  'profile', 'gymSessions', 'gymPlan', 'foodLog', 'foodCustom', 'foodPlan', 'foodMeals', 'foodMemory', 'weightLog', 'scales', 'tasks', 'taskSettings', 'watch', 'watchLog', 'watchSettings', 'water',
  'prayerLog', 'prayerSettings', 'quran', 'azkarLog', 'contacts', 'english', 'words', 'gymKeywords',
];

export function read(key) {
  if (cache.has(key)) return cache.get(key);
  let value;
  try {
    const raw = storage().getItem(PREFIX + key);
    value = raw == null ? undefined : JSON.parse(raw);
  } catch {
    value = undefined;
  }
  cache.set(key, value);
  return value;
}

function times() {
  try {
    return JSON.parse(storage().getItem(META) || '{}');
  } catch {
    return {};
  }
}

export const changedAt = (key) => times()[key] || 0;

/**
 * Saves a value. `remoteTime` is given only by the sync layer when the value
 * came from the cloud: it keeps that timestamp and does not echo back.
 */
export function write(key, value, remoteTime) {
  cache.set(key, value);
  const t = remoteTime || Date.now();
  try {
    if (value === undefined) storage().removeItem(PREFIX + key);
    else storage().setItem(PREFIX + key, JSON.stringify(value));
    storage().setItem(META, JSON.stringify({ ...times(), [key]: t }));
  } catch { /* storage full or blocked: the value still lives in memory */ }
  listeners.get(key)?.forEach((fn) => fn());
  if (!remoteTime) changeListeners.forEach((fn) => fn(key, value, t));
  return value;
}

export function update(key, fn, fallback) {
  const current = read(key);
  return write(key, fn(current === undefined ? fallback : current));
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

/** Called for every local change (not for values arriving from the cloud). */
export function onLocalChange(fn) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/** Everything the person recorded, as one object (backup file). */
export function exportAll() {
  const data = {};
  for (const key of [...SYNC_KEYS, 'settings']) {
    const v = read(key);
    if (v !== undefined) data[key] = v;
  }
  return { app: 'the-disciplined', version: 1, exportedAt: new Date().toISOString(), data };
}

export function importAll(file) {
  if (!file || file.app !== 'the-disciplined' || typeof file.data !== 'object') {
    throw new Error('Not a backup file of this app');
  }
  let n = 0;
  for (const key of [...SYNC_KEYS, 'settings']) {
    if (file.data[key] !== undefined) {
      write(key, file.data[key]);
      n += 1;
    }
  }
  return n;
}

/** Decides what to do with one key. Used by lib/sync.js. */
export function resolve(localTime, hasLocal, remote) {
  const remoteTime = Number(remote?.t) || 0;
  if (remote && remoteTime > localTime) return 'pull';
  if (hasLocal && localTime > remoteTime) return 'push';
  return 'same';
}

/**
 * Whose data the synced keys on this device belong to. Signing in for the
 * first time adopts what was recorded on the device; a different account
 * signing in later must not inherit (or upload) the previous person's data.
 */
export function ownerAction(previous, uid) {
  if (!previous) return 'adopt';
  return previous === uid ? 'same' : 'reset';
}

const OWNER = 'td~owner';

/** Called by the sync layer before it starts for `uid`. Returns the action taken. */
export function claimFor(uid) {
  let previous = null;
  try {
    previous = storage().getItem(OWNER);
  } catch { /* blocked */ }
  const action = ownerAction(previous, uid);
  if (action === 'reset') {
    for (const key of [...SYNC_KEYS, 'gymActive']) {
      cache.set(key, undefined);
      try {
        storage().removeItem(PREFIX + key);
      } catch { /* blocked */ }
      listeners.get(key)?.forEach((fn) => fn());
    }
    try {
      const kept = times();
      for (const key of SYNC_KEYS) delete kept[key];
      storage().setItem(META, JSON.stringify(kept));
    } catch { /* blocked */ }
  }
  try {
    storage().setItem(OWNER, uid);
  } catch { /* blocked */ }
  return action;
}

/** Tests only. */
export function resetStore() {
  cache.clear();
  memory.clear();
}
