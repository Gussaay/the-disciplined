// Cloud backup: each saved key is mirrored to users/<uid>/data/<key> as
// { json, t }. The newer side wins per key, so two devices converge on the
// last change. Values travel as JSON text because the Realtime Database drops
// empty arrays and refuses some key characters (dates with dots, etc.).
import { onValue, ref, set } from 'firebase/database';
import { db } from '../firebase';
import { SYNC_KEYS, changedAt, onLocalChange, read, resolve, write } from './store';

export function startSync(uid) {
  if (!db || !uid) return () => {};
  const node = (key) => ref(db, `users/${uid}/data/${key}`);
  const push = (key, value, t) =>
    set(node(key), value === undefined ? null : { json: JSON.stringify(value), t }).catch(() => {});

  const stops = SYNC_KEYS.map((key) =>
    onValue(node(key), (snap) => {
      const remote = snap.val();
      const action = resolve(changedAt(key), read(key) !== undefined, remote);
      if (action === 'pull') {
        try {
          write(key, JSON.parse(remote.json), Number(remote.t));
        } catch { /* a damaged record is ignored; the local copy stays */ }
      } else if (action === 'push') {
        push(key, read(key), changedAt(key));
      }
    }, () => {}),
  );
  const stopLocal = onLocalChange((key, value, t) => {
    if (SYNC_KEYS.includes(key)) push(key, value, t);
  });
  return () => {
    stops.forEach((stop) => stop());
    stopLocal();
  };
}
