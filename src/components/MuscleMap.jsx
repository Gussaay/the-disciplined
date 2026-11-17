// A front and back body map with the worked muscles coloured: main muscles
// solid, helping muscles light.
import { useLang } from '../i18n';

const E = (cx, cy, rx, ry, rot = 0) => ({ cx, cy, rx, ry, rot });
const pair = (cx, d, cy, rx, ry, rot = 0) => [E(cx - d, cy, rx, ry, rot), E(cx + d, cy, rx, ry, -rot)];

// Ellipses per region; x 0-100 is the front view, 100-200 the back view.
const FRONT = {
  traps: [E(43, 37, 5, 2.5, 25), E(57, 37, 5, 2.5, -25)],
  front_delt: pair(50, 15, 43, 4.5, 5.5),
  side_delt: pair(50, 20, 45, 3, 5.5),
  chest: pair(50, 8, 50, 8.5, 6.5),
  biceps: pair(50, 22, 61, 3.8, 8.5, 6),
  forearms: pair(50, 26, 80, 3.2, 10, 8),
  abs: [E(50, 75, 6, 15)],
  obliques: pair(50, 11, 76, 3.5, 11),
  abductors: pair(50, 15, 98, 3.5, 6),
  quads: pair(50, 8, 118, 6, 17),
  adductors: pair(50, 3, 112, 2, 10),
  calves: pair(50, 8, 158, 3.5, 12),
};
const BACK = {
  traps: [{ path: 'M150 32 L138 42 L150 66 L162 42 Z' }],
  rear_delt: pair(150, 15, 43, 4.5, 5.5),
  side_delt: pair(150, 20, 45, 3, 5.5),
  mid_back: pair(150, 5, 52, 3.5, 7),
  lats: pair(150, 10, 64, 5.5, 13, -10),
  triceps: pair(150, 22, 61, 3.8, 9, 6),
  forearms: pair(150, 26, 80, 3.2, 10, 8),
  lower_back: [E(150, 84, 6, 8)],
  abductors: pair(150, 13, 96, 4, 5),
  glutes: pair(150, 6.5, 102, 6.5, 8),
  hamstrings: pair(150, 7.5, 126, 5.5, 15),
  calves: pair(150, 8, 156, 4.5, 11),
};

function Silhouette({ x }) {
  return (
    <g fill="currentColor" opacity="0.13">
      <circle cx={x} cy="20" r="9" />
      <rect x={x - 4} y="27" width="8" height="8" rx="3" />
      <path d={`M${x - 20} 38 Q${x} 33 ${x + 20} 38 L${x + 15} 92 Q${x} 98 ${x - 15} 92 Z`} />
      <path d={`M${x - 15} 88 L${x + 15} 88 L${x + 13} 140 L${x + 3} 140 L${x} 104 L${x - 3} 140 L${x - 13} 140 Z`} />
      <path d={`M${x - 13} 138 L${x - 3} 138 L${x - 4} 178 L${x - 11} 178 Z M${x + 3} 138 L${x + 13} 138 L${x + 11} 178 L${x + 4} 178 Z`} />
      <path d={`M${x - 20} 38 L${x - 27} 40 L${x - 31} 92 L${x - 24} 93 L${x - 18} 56 Z M${x + 20} 38 L${x + 27} 40 L${x + 31} 92 L${x + 24} 93 L${x + 18} 56 Z`} />
      <ellipse cx={x - 28} cy="97" rx="3.5" ry="5" />
      <ellipse cx={x + 28} cy="97" rx="3.5" ry="5" />
      <ellipse cx={x - 8} cy="181" rx="5" ry="3" />
      <ellipse cx={x + 8} cy="181" rx="5" ry="3" />
    </g>
  );
}

function Shapes({ map, primary, secondary, color }) {
  return Object.entries(map).flatMap(([id, shapes]) => {
    const on = primary.includes(id) ? 1 : secondary.includes(id) ? 0.4 : 0;
    const fill = on ? color : 'currentColor';
    const opacity = on || 0.1;
    return shapes.map((s, i) =>
      s.path ? (
        <path key={`${id}${i}`} d={s.path} fill={fill} opacity={opacity} />
      ) : (
        <ellipse key={`${id}${i}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined} fill={fill} opacity={opacity} />
      ),
    );
  });
}

export default function MuscleMap({ primary = [], secondary = [], color = '#DC2626', className = '' }) {
  const { L } = useLang();
  const heart = primary.includes('heart') || secondary.includes('heart');
  return (
    <svg viewBox="0 0 200 196" className={className} role="img" aria-label={L('Muscles worked', 'العضلات المستهدفة')}>
      <Silhouette x={50} />
      <Silhouette x={150} />
      <Shapes map={FRONT} primary={primary} secondary={secondary} color={color} />
      <Shapes map={BACK} primary={primary} secondary={secondary} color={color} />
      {heart && <path d="M54 48c0-3 4-4 5-1 1-3 5-2 5 1 0 3-5 6-5 6s-5-3-5-6z" fill="#DC2626" className="animate-pulse" />}
      <text x="50" y="194" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">{L('Front', 'أمام')}</text>
      <text x="150" y="194" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">{L('Back', 'خلف')}</text>
    </svg>
  );
}
