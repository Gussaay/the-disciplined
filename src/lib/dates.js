// Day keys are local calendar days ("2026-03-09"): a prayer or a meal belongs
// to the day the person lived it, not to the UTC day.
const pad = (n) => String(n).padStart(2, '0');

export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** The last `n` day keys, oldest first, ending on `end`. */
export function lastDays(n, end = dayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function daysBetween(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

/**
 * Consecutive days ending today for which `ok(key)` holds. Today not being done
 * yet does not break a streak: it only stops counting until it is done.
 */
export function streak(ok, today = dayKey(), max = 3650) {
  let n = 0;
  let k = today;
  if (!ok(k)) k = addDays(k, -1);
  while (n < max && ok(k)) {
    n += 1;
    k = addDays(k, -1);
  }
  return n;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
