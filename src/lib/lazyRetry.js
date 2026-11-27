// Loading a page chunk can fail right after an update: the open app still
// points at the previous bundle's files, which no longer exist. Retrying
// rarely helps (the file is gone), so after a couple of tries the page
// reloads once to pick up the fresh bundle. A session flag stops a reload
// loop when the failure is real; a successful load clears the flag.
const KEY = 'td~chunk-reload';

function defaultStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `factory` (a dynamic import) with retries and a single guarded
 * reload. `reload` and `storage` are injectable for tests.
 */
export function retryImport(factory, { tries = 3, delay = 500, reload, storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;
  let attempt = 0;
  const go = () =>
    Promise.resolve()
      .then(factory)
      .then((mod) => {
        try {
          store?.removeItem(KEY);
        } catch { /* ignore */ }
        return mod;
      })
      .catch((error) => {
        attempt += 1;
        if (attempt < tries) return wait(delay).then(go);
        let already = false;
        try {
          already = Boolean(store?.getItem(KEY));
          if (!already) store?.setItem(KEY, '1');
        } catch { /* ignore */ }
        if (!already) {
          (reload || (() => globalThis.location?.reload()))();
          return new Promise(() => {}); // the reload is on its way
        }
        throw error;
      });
  return go();
}
