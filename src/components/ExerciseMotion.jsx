// Animated stick figures showing how each exercise moves. A motion is a few
// poses (named joints in a 120×120 box) that the figure loops through; the
// limbs doing the work are drawn in the module colour.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../i18n';

// Joints, side view facing right: h head, s shoulder, e elbow, w hand,
// p hip, k knee, a ankle, t toe; e2 w2 k2 a2 t2 the far limbs.
const SIDE = [['p', 'k'], ['k', 'a'], ['a', 't'], ['s', 'p'], ['s', 'e'], ['e', 'w']];
const FAR = [['p', 'k2'], ['k2', 'a2'], ['a2', 't2'], ['s', 'e2'], ['e2', 'w2']];
// Front view: n neck, sl/sr shoulders, el/er elbows, wl/wr hands, pl/pr hips, kl/kr knees, al/ar ankles.
const FRONT = [['n', 'pm'], ['sl', 'sr'], ['pl', 'pr'], ['sl', 'el'], ['el', 'wl'], ['sr', 'er'], ['er', 'wr'], ['pl', 'kl'], ['kl', 'al'], ['pr', 'kr'], ['kr', 'ar']];

const ARM = [['s', 'e'], ['e', 'w']];
const FOREARM = [['e', 'w']];
const LEG = [['p', 'k'], ['k', 'a']];
const ALL_LEGS = [...LEG, ['p', 'k2'], ['k2', 'a2']];

const floor = { line: [10, 112, 110, 112] };
const seat = [{ line: [34, 84, 62, 84], w: 5 }, { line: [48, 84, 48, 110], w: 3 }];
const back = { line: [39, 86, 39, 40], w: 5 };
const bench = [{ line: [14, 96, 92, 96], w: 6 }, { line: [24, 96, 24, 112], w: 3 }, { line: [82, 96, 82, 112], w: 3 }];

const standing = { h: [56, 31], s: [55, 42], p: [55, 72], k: [56, 92], a: [55, 110], t: [63, 111] };
const seated = { h: [45, 39], s: [45, 50], p: [44, 80], k: [66, 80], a: [68, 104], t: [76, 106] };
const lying = { h: [88, 86], s: [78, 89], p: [48, 89], k: [30, 92], a: [28, 110], t: [36, 111] };

const MOTIONS = {
  curl: { props: [floor], frames: [{ ...standing, e: [55, 59], w: [57, 75] }, { w: [67, 48] }], work: FOREARM, hold: { w: 'db' } },
  preacher: {
    props: [...seat, { line: [52, 50, 70, 68], w: 6 }],
    frames: [{ h: [52, 40], s: [50, 50], p: [42, 80], k: [64, 80], a: [66, 104], t: [74, 106], e: [64, 62], w: [78, 74] }, { w: [66, 46] }],
    work: FOREARM, hold: { w: 'bar' },
  },
  pressUp: { props: [...seat, back], frames: [{ ...seated, e: [54, 60], w: [54, 44] }, { e: [48, 35], w: [48, 19] }], work: ARM, hold: { w: 'handle' } },
  chestPress: { props: [...seat, back], frames: [{ ...seated, e: [32, 58], w: [48, 55] }, { e: [61, 53], w: [77, 53] }], work: ARM, hold: { w: 'handle' } },
  fly: { props: [...seat, back], frames: [{ ...seated, e: [34, 52], w: [24, 56] }, { e: [61, 50], w: [76, 52] }], work: ARM, hold: { w: 'handle' } },
  reverseFly: { props: [floor], frames: [{ ...standing, e: [68, 46], w: [82, 46] }, { e: [40, 44], w: [26, 46] }], work: ARM, hold: { w: 'handle' } },
  pulldown: {
    props: [...seat, { rect: [62, 70, 10, 6] }],
    frames: [{ h: [48, 39], s: [48, 50], p: [48, 80], k: [70, 80], a: [70, 104], t: [78, 106], e: [52, 34], w: [54, 18] }, { e: [40, 62], w: [50, 48] }],
    work: ARM, hold: { w: 'bar' }, cable: { w: [54, 0] },
  },
  seatedRow: {
    props: [...seat, { line: [58, 44, 58, 64], w: 6 }],
    frames: [{ h: [44, 39], s: [44, 50], p: [42, 80], k: [64, 80], a: [66, 104], t: [74, 106], e: [61, 52], w: [77, 52] }, { e: [32, 56], w: [46, 52] }],
    work: ARM, hold: { w: 'handle' }, cable: { w: [112, 52] },
  },
  bentRow: {
    props: [floor],
    frames: [{ h: [83, 53], s: [74, 58], p: [46, 72], k: [54, 92], a: [52, 110], t: [60, 111], e: [75, 74], w: [76, 90] }, { e: [60, 66], w: [72, 76] }],
    work: ARM, hold: { w: 'bar' },
  },
  tbarRow: {
    props: [floor, { line: [44, 110, 64, 110], w: 5 }],
    frames: [{ h: [83, 53], s: [74, 58], p: [46, 72], k: [54, 92], a: [52, 108], t: [60, 109], e: [75, 74], w: [76, 90] }, { e: [60, 66], w: [72, 76] }],
    work: ARM, hold: { w: 'handle' }, lever: { w: [8, 110] },
  },
  pushdown: { props: [floor], frames: [{ ...standing, e: [57, 59], w: [68, 48] }, { w: [59, 75] }], work: FOREARM, hold: { w: 'bar' }, cable: { w: [72, 0] } },
  overheadExt: { props: [floor], frames: [{ ...standing, e: [58, 25], w: [48, 36] }, { w: [60, 9] }], work: FOREARM, hold: { w: 'db' } },
  legExt: {
    props: [...seat, back, { circle: [66, 80, 3] }],
    frames: [{ ...seated, e: [48, 64], w: [56, 78], a: [67, 102], t: [75, 104] }, { a: [88, 79], t: [89, 71] }],
    work: [['k', 'a']], hold: { a: 'pad' },
  },
  legCurl: {
    props: [{ line: [14, 80, 82, 80], w: 6 }, { line: [24, 80, 24, 112], w: 3 }, { line: [72, 80, 72, 112], w: 3 }],
    frames: [{ h: [18, 70], s: [28, 74], p: [58, 74], k: [80, 74], a: [102, 76], t: [104, 84], e: [30, 88], w: [38, 92] }, { a: [88, 53], t: [95, 50] }],
    work: [['k', 'a']], hold: { a: 'pad' },
  },
  legPress: {
    props: [{ line: [18, 98, 38, 58], w: 5 }, { line: [30, 98, 48, 98], w: 5 }],
    frames: [{ h: [22, 56], s: [27, 66], p: [40, 94], e: [36, 82], w: [46, 92], k: [48, 70], a: [66, 80], t: [70, 74] }, { k: [58, 79], a: [76, 66], t: [80, 60] }],
    work: LEG, hold: { a: 'plate' },
  },
  squat: {
    props: [floor],
    frames: [{ ...standing, e: [47, 50], w: [53, 41] }, { h: [63, 58], s: [58, 67], e: [50, 73], w: [56, 66], p: [40, 90], k: [62, 92] }],
    work: [...LEG, ['s', 'p']], hold: { s: 'bar' },
  },
  hinge: {
    props: [floor],
    frames: [{ ...standing, e: [56, 58], w: [57, 74] }, { h: [87, 56], s: [78, 62], e: [78, 78], w: [78, 94], p: [48, 74], k: [54, 94] }],
    work: [['s', 'p'], ['p', 'k']], hold: { w: 'bar' },
  },
  lunge: {
    props: [floor],
    frames: [
      { ...standing, e: [55, 58], w: [55, 74], k2: [55, 92], a2: [54, 110], t2: [62, 111] },
      { h: [54, 46], s: [53, 56], e: [53, 72], w: [53, 88], p: [52, 86], k: [72, 88], a: [72, 110], t: [80, 111], k2: [46, 106], a2: [26, 104], t2: [24, 111] },
    ],
    work: LEG, hold: { w: 'db' }, far: true,
  },
  hipThrust: {
    props: [{ rect: [8, 86, 26, 26] }, floor],
    frames: [{ h: [22, 80], s: [30, 84], e: [40, 98], w: [50, 104], p: [50, 104], k: [68, 88], a: [74, 110], t: [82, 111] }, { e: [44, 88], w: [54, 84], p: [54, 84], k: [74, 86] }],
    work: [['s', 'p'], ['p', 'k']], hold: { p: 'bar' },
  },
  calf: { props: [floor], frames: [{ ...standing, e: [55, 58], w: [55, 74], a: [55, 108] }, { h: [56, 25], s: [55, 36], e: [55, 52], w: [55, 68], p: [55, 66], k: [56, 86], a: [58, 101] }], work: [['k', 'a'], ['a', 't']] },
  benchPress: { props: bench, frames: [{ ...lying, e: [64, 84], w: [76, 76] }, { e: [78, 72], w: [78, 56] }], work: ARM, hold: { w: 'bar' } },
  skull: { props: bench, frames: [{ ...lying, e: [78, 72], w: [78, 56] }, { w: [92, 76] }], work: FOREARM, hold: { w: 'bar' } },
  pullup: {
    props: [{ line: [36, 10, 80, 10], w: 4 }],
    frames: [{ h: [57, 31], s: [57, 42], e: [58, 27], w: [58, 12], p: [56, 72], k: [52, 92], a: [40, 98], t: [36, 104] }, { h: [56, 17], s: [54, 28], e: [45, 18], p: [54, 58], k: [50, 78], a: [38, 84], t: [34, 90] }],
    work: [...ARM, ['s', 'p']], hold: { w: 'handle' },
  },
  dip: {
    props: [{ line: [40, 64, 82, 64], w: 4 }],
    frames: [{ h: [57, 20], s: [57, 30], e: [58, 46], w: [58, 62], p: [55, 60], k: [52, 82], a: [42, 94], t: [38, 100] }, { h: [61, 38], s: [60, 48], e: [44, 54], p: [57, 78], k: [53, 100], a: [43, 110], t: [39, 116] }],
    work: ARM, hold: { w: 'handle' },
  },
  pushup: {
    props: [floor],
    frames: [{ h: [88, 66], s: [80, 72], e: [80, 88], w: [80, 104], p: [50, 88], k: [35, 96], a: [20, 104], t: [16, 108] }, { h: [87, 90], s: [78, 94], e: [66, 100], p: [49, 99], k: [34, 102] }],
    work: [...ARM, ['s', 'p']],
  },
  plank: {
    props: [floor],
    frames: [{ h: [82, 84], s: [74, 89], e: [74, 105], w: [86, 106], p: [46, 95], k: [32, 100], a: [18, 105], t: [14, 108] }, { p: [46, 93] }],
    work: [['s', 'p']], speed: 1800,
  },
  crunch: {
    props: [floor],
    frames: [{ h: [13, 102], s: [22, 105], e: [24, 96], w: [14, 98], p: [50, 106], k: [64, 88], a: [78, 106], t: [84, 103] }, { h: [24, 85], s: [30, 93], e: [34, 82], w: [26, 82] }],
    work: [['s', 'p']],
  },
  legRaise: {
    props: [{ line: [36, 10, 80, 10], w: 4 }],
    frames: [{ h: [57, 31], s: [58, 40], e: [58, 26], w: [58, 12], p: [58, 70], k: [58, 92], a: [58, 112], t: [64, 114] }, { k: [80, 72], a: [102, 74], t: [104, 68] }],
    work: [...LEG, ['s', 'p']],
  },
  lateral: {
    props: [floor],
    frames: [
      { h: [60, 30], n: [60, 40], sl: [50, 42], sr: [70, 42], pm: [60, 72], pl: [54, 72], pr: [66, 72], kl: [54, 92], kr: [66, 92], al: [54, 110], ar: [66, 110], el: [47, 58], wl: [46, 74], er: [73, 58], wr: [74, 74] },
      { el: [34, 42], wl: [19, 44], er: [86, 42], wr: [101, 44] },
    ],
    work: [['sl', 'el'], ['el', 'wl'], ['sr', 'er'], ['er', 'wr']], front: true, hold: { wl: 'db', wr: 'db' },
  },
  abduction: {
    props: [{ line: [40, 76, 80, 76], w: 5 }],
    frames: [
      { h: [60, 30], n: [60, 40], sl: [50, 42], sr: [70, 42], pm: [60, 72], pl: [54, 72], pr: [66, 72], kl: [55, 92], kr: [65, 92], al: [55, 110], ar: [65, 110], el: [48, 58], wl: [46, 72], er: [72, 58], wr: [74, 72] },
      { kl: [42, 90], kr: [78, 90], al: [36, 108], ar: [84, 108] },
    ],
    work: [['pl', 'kl'], ['kl', 'al'], ['pr', 'kr'], ['kr', 'ar']], front: true, hold: { kl: 'pad', kr: 'pad' },
  },
  walk: {
    props: [{ line: [20, 112, 100, 112], w: 4 }],
    frames: [
      { ...standing, k: [62, 92], a: [60, 110], t: [68, 111], k2: [50, 92], a2: [42, 108], t2: [48, 112], e: [50, 58], w: [48, 72], e2: [60, 58], w2: [66, 70] },
      { k: [50, 92], a: [42, 108], t: [48, 112], k2: [62, 92], a2: [60, 110], t2: [68, 111], e: [60, 58], w: [66, 70], e2: [50, 58], w2: [48, 72] },
    ],
    work: ALL_LEGS, far: true, speed: 650,
  },
  rowErg: {
    props: [{ line: [14, 100, 96, 100], w: 4 }, { line: [80, 92, 84, 104], w: 4 }],
    frames: [
      { h: [64, 63], s: [58, 72], e: [70, 82], w: [82, 86], p: [46, 98], k: [64, 80], a: [80, 98], t: [84, 92] },
      { h: [20, 63], s: [26, 72], e: [22, 88], w: [40, 84], p: [36, 98], k: [58, 94] },
    ],
    work: [...LEG, ...ARM], hold: { w: 'handle' }, speed: 1000,
  },
};

// The bike: pedals go round, so its poses are worked out from the crank.
MOTIONS.bike = (() => {
  const solveKnee = (p, a, l1, l2) => {
    const dx = a[0] - p[0];
    const dy = a[1] - p[1];
    const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const up = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const ux = dx / d;
    const uy = dy / d;
    return [p[0] + ux * along + uy * up, p[1] + uy * along - ux * up];
  };
  const c = [60, 94];
  const p = [44, 70];
  const frames = [0, 1, 2, 3, 4, 5].map((i) => {
    const th = (i / 6) * Math.PI * 2;
    const a = [c[0] + 10 * Math.cos(th), c[1] + 10 * Math.sin(th)];
    const a2 = [c[0] - 10 * Math.cos(th), c[1] - 10 * Math.sin(th)];
    return { h: [64, 36], s: [58, 44], e: [66, 56], w: [78, 56], p, a, t: [a[0] + 7, a[1]], a2, t2: [a2[0] + 7, a2[1]], k: solveKnee(p, a, 24, 22), k2: solveKnee(p, a2, 24, 22) };
  });
  return {
    props: [{ line: [36, 70, 52, 70], w: 5 }, { line: [44, 72, 60, 94], w: 3 }, { line: [60, 94, 80, 56], w: 3 }, { line: [74, 56, 82, 56], w: 4 }, { circle: [60, 94, 10] }, { line: [34, 112, 86, 112], w: 4 }],
    frames, work: ALL_LEGS, far: true, speed: 260, linear: true,
  };
})();

const HOLD = {
  bar: (x, y, c) => <circle cx={x} cy={y} r="4.5" fill={c} />,
  db: (x, y, c) => <rect x={x - 5} y={y - 2.5} width="10" height="5" rx="1.5" fill={c} />,
  handle: (x, y, c) => <circle cx={x} cy={y} r="2.8" fill={c} />,
  pad: (x, y, c) => <circle cx={x} cy={y} r="4" fill={c} />,
  plate: (x, y, c) => <line x1={x - 6} y1={y - 8} x2={x + 8} y2={y + 6} stroke={c} strokeWidth="4" strokeLinecap="round" />,
};

const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

function usePose(motion, still) {
  const frames = useMemo(() => motion.frames.map((f) => ({ ...motion.frames[0], ...f })), [motion]);
  const [t, setT] = useState(0);
  const raf = useRef();
  useEffect(() => {
    if (still) return undefined;
    const speed = motion.speed || 1100;
    const start = performance.now();
    const tick = (now) => {
      setT((now - start) / speed);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [motion, still]);
  const n = frames.length;
  const i = Math.floor(t) % n;
  const f = t - Math.floor(t);
  const k = motion.linear ? f : ease(Math.min(1, f * 1.25));
  const from = frames[i];
  const to = frames[(i + 1) % n];
  return Object.fromEntries(Object.keys(from).map((j) => [j, [from[j][0] + (to[j][0] - from[j][0]) * k, from[j][1] + (to[j][1] - from[j][1]) * k]]));
}

const sameBone = (a, b) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

function Figure({ motion, pose, color, ghost }) {
  const bones = motion.front ? FRONT : SIDE;
  const working = (b) => motion.work.some((w) => sameBone(w, b));
  const line = (b, i, stroke, width, opacity = 1) =>
    pose[b[0]] && pose[b[1]] ? (
      <line key={i} x1={pose[b[0]][0]} y1={pose[b[0]][1]} x2={pose[b[1]][0]} y2={pose[b[1]][1]} stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} />
    ) : null;
  return (
    <g opacity={ghost ? 0.25 : 1}>
      {Object.entries(motion.cable || {}).map(([j, to]) => (
        <line key={`c${j}`} x1={pose[j][0]} y1={pose[j][1]} x2={to[0]} y2={to[1]} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      ))}
      {Object.entries(motion.lever || {}).map(([j, to]) => (
        <line key={`l${j}`} x1={pose[j][0]} y1={pose[j][1]} x2={to[0]} y2={to[1]} stroke="currentColor" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
      ))}
      {motion.far && FAR.map((b, i) => line(b, `f${i}`, working(b) ? color : 'currentColor', 5, 0.4))}
      {bones.map((b, i) => line(b, i, working(b) ? color : 'currentColor', 6, working(b) ? 1 : 0.8))}
      {pose.h && <circle cx={pose.h[0]} cy={pose.h[1]} r="6.5" fill="currentColor" opacity="0.8" />}
      {motion.front && pose.n && pose.h && line(['n', 'h'], 'neck', 'currentColor', 4, 0.8)}
      {Object.entries(motion.hold || {}).map(([j, kind]) => pose[j] && <g key={`h${j}`}>{HOLD[kind](pose[j][0], pose[j][1], kind === 'pad' ? '#9CA3AF' : '#374151')}</g>)}
    </g>
  );
}

function Props({ props }) {
  return props.map((p, i) => {
    if (p.line) return <line key={i} x1={p.line[0]} y1={p.line[1]} x2={p.line[2]} y2={p.line[3]} stroke="currentColor" strokeWidth={p.w || 2} strokeLinecap="round" opacity="0.3" />;
    if (p.rect) return <rect key={i} x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]} rx="3" fill="currentColor" opacity="0.25" />;
    if (p.circle) return <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />;
    return null;
  });
}

export const MOTION_IDS = () => Object.keys(MOTIONS);
export const hasMotion = (id) => Boolean(MOTIONS[id]);

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function ExerciseMotion({ motion: id, color = '#DC2626', className = '' }) {
  const { L } = useLang();
  const motion = MOTIONS[id];
  const [paused, setPaused] = useState(reducedMotion);
  const pose = usePose(motion || MOTIONS.curl, paused || !motion);
  if (!motion) return null;
  const first = { ...motion.frames[0] };
  const last = { ...motion.frames[0], ...motion.frames[Math.floor(motion.frames.length / 2)] };
  return (
    <button type="button" className={`block w-full ${className}`} onClick={() => setPaused(!paused)} aria-label={paused ? L('Play the movement', 'شغّل الحركة') : L('Pause the movement', 'أوقف الحركة')}>
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <Props props={motion.props || []} />
        {paused ? (
          <>
            <Figure motion={motion} pose={first} color={color} ghost />
            <Figure motion={motion} pose={last} color={color} />
          </>
        ) : (
          <Figure motion={motion} pose={pose} color={color} />
        )}
      </svg>
    </button>
  );
}
