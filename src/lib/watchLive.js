// The watch connection, shared by the whole app: the watch page, the
// workout screen and Home all see the same link and the same readings.
import { connectWatch } from './watch';
import { dayKey } from './dates';
import { read, write } from './store';

// One connection for the whole app, so leaving the page keeps the watch linked.
export const live = { status: 'idle', error: '', battery: null, heart: null, session: null, log: [], firmware: '', lastAck: null, sport: null };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const set = (patch) => {
  Object.assign(live, patch);
  live.version = (live.version || 0) + 1;
  emit();
};
export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const minuteNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Adds heart points [minute of day, bpm] to today's record, one per minute. */
function addHeartPoints(points) {
  if (!points.length) return;
  const day = (read('watchLog') || {})[dayKey()] || {};
  const byMinute = new Map((day.hr || []).map(([m, b]) => [m, b]));
  for (const [m, b] of points) byMinute.set(m, b);
  saveDay({ hr: [...byMinute.entries()].sort((a, b) => a[0] - b[0]).slice(-300) });
}

function saveDay(patch) {
  const today = dayKey();
  const log = read('watchLog') || {};
  write('watchLog', { ...log, [today]: { ...(log[today] || {}), ...patch, updated: Date.now() } });
}

export async function link(watch, profile) {
  if (live.status === 'connecting' || live.status === 'connected') return;
  set({ status: 'connecting', error: '' });
  try {
    const session = await connectWatch(watch, {
      profile,
      watchSettings: read('watchSettings') || {},
      onEvent: (e) => {
        if (e.type === 'log') {
          live.log = [...live.log.slice(-80), `${new Date().toISOString().slice(11, 19)} ${e.dir === 'out' ? '→' : e.dir === 'info' ? '·' : '←'} ${e.hex}`];
          return;
        }
        if (e.type === 'battery') set({ battery: e.level });
        if (e.type === 'firmware') set({ firmware: e.text });
        if (e.type === 'ack') set({ lastAck: { what: e.what, at: Date.now() } });
        if (e.type === 'heartHistory') addHeartPoints(e.points);
        if (e.type === 'sport') {
          if (e.on) set({ sport: { kind: e.kind, start: Date.now(), bpm: [] } });
          else if (live.sport) {
            const s = live.sport;
            const bpm = s.bpm;
            const workout = {
              kind: s.kind,
              start: s.start,
              end: Date.now(),
              ...(bpm.length ? { bpmAvg: Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length), bpmMax: Math.max(...bpm) } : {}),
            };
            const day = (read('watchLog') || {})[dayKey()] || {};
            saveDay({ workouts: [...(day.workouts || []), workout] });
            set({ sport: null });
          }
        }
        if (e.type === 'day') saveDay({ steps: e.steps, distance: e.distance, kcal: e.kcal });
        if (e.type === 'heart' && e.bpm) {
          set({ heart: { ...e, at: Date.now() } });
          if (live.sport) live.sport.bpm.push(e.bpm);
          addHeartPoints([[e.minute ?? minuteNow(), e.bpm]]);
          const today = dayKey();
          const day = (read('watchLog') || {})[today] || {};
          saveDay({
            bpm: e.bpm,
            bpmMin: Math.min(day.bpmMin || 999, e.bpm),
            bpmMax: Math.max(day.bpmMax || 0, e.bpm),
            ...(e.spo2 ? { spo2: e.spo2 } : {}),
            ...(e.systolic && e.diastolic ? { systolic: e.systolic, diastolic: e.diastolic } : {}),
          });
        }
        if (e.type === 'findPhone') navigator.vibrate?.([400, 200, 400]);
      },
      onEnd: () => set({ status: 'disconnected', session: null }),
    });
    set({ status: 'connected', session });
    write('watch', { ...watch, protocol: session.protocol });
  } catch (e) {
    set({ status: 'error', error: e.message || String(e), session: null });
  }
}


/** Calls `fn(heart)` for each new heart reading; returns the unsubscribe. */
export function onHeart(fn) {
  let last = live.heart?.at || 0;
  return subscribe(() => {
    if (live.heart?.at && live.heart.at !== last) {
      last = live.heart.at;
      fn(live.heart);
    }
  });
}

/** Shows a short message on the watch (it vibrates), when the watch can. */
export function notifyWatch(text) {
  if (live.status !== 'connected' || !live.session?.notify) return Promise.resolve(false);
  return live.session.notify(text).then(() => true, () => false);
}

/** Drops the link and everything read from it (the saved days stay). */
export function resetLive() {
  set({ status: 'idle', session: null, battery: null, heart: null, log: [], firmware: '', lastAck: null, sport: null });
}
