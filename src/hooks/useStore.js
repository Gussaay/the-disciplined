import { useCallback, useSyncExternalStore } from 'react';
import { read, subscribe, write } from '../lib/store';

/**
 * A saved value and its setter, like useState but kept on the device (and in
 * the cloud when backup is on). `fallback` must be a stable reference.
 */
export function useStore(key, fallback) {
  const value = useSyncExternalStore(
    useCallback((fn) => subscribe(key, fn), [key]),
    () => read(key),
  );
  const set = useCallback(
    (next) => {
      const current = read(key);
      const base = current === undefined ? fallback : current;
      return write(key, typeof next === 'function' ? next(base) : next);
    },
    [key, fallback],
  );
  return [value === undefined ? fallback : value, set];
}
