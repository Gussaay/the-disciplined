// One small illustration per goal, drawn for the coloured band at the top of
// its screen: white shapes with gold highlights on the goal's own colour.
const W = 'rgba(255,255,255,0.95)';
const W2 = 'rgba(255,255,255,0.35)';
const W3 = 'rgba(255,255,255,0.18)';
const GOLD = '#EBCB73';

function Gym() {
  return (
    <>
      <circle cx="96" cy="40" r="34" fill={W3} />
      {/* dumbbell */}
      <rect x="22" y="52" width="76" height="8" rx="4" fill={W} />
      <rect x="14" y="38" width="12" height="36" rx="4" fill={W} />
      <rect x="4" y="44" width="10" height="24" rx="3" fill={W2} />
      <rect x="94" y="38" width="12" height="36" rx="4" fill={W} />
      <rect x="106" y="44" width="10" height="24" rx="3" fill={W2} />
      {/* kettlebell */}
      <path d="M118 66a14 14 0 1 1 28 0v4a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" fill={GOLD} />
      <path d="M124 58c0-9 16-9 16 0" stroke={GOLD} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* spark */}
      <path d="M60 16l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={GOLD} />
    </>
  );
}

function Food() {
  return (
    <>
      <circle cx="90" cy="44" r="36" fill={W3} />
      {/* leaves */}
      <path d="M58 46c-10-22 6-34 22-30-2 16-8 26-22 30z" fill={W2} />
      <path d="M78 44c4-20 22-24 34-16-8 12-18 18-34 16z" fill={W2} />
      {/* bowl */}
      <path d="M30 50h100a50 30 0 0 1-100 0z" fill={W} />
      <rect x="62" y="80" width="36" height="6" rx="3" fill={W} />
      {/* food in bowl */}
      <circle cx="56" cy="48" r="9" fill={GOLD} />
      <circle cx="76" cy="44" r="10" fill="rgba(255,255,255,0.6)" />
      <circle cx="98" cy="47" r="9" fill={GOLD} />
      {/* apple */}
      <circle cx="140" cy="70" r="12" fill={GOLD} />
      <path d="M140 58c0-6 4-9 8-9" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  );
}

function Prayer() {
  return (
    <>
      {/* crescent and stars */}
      <circle cx="132" cy="22" r="12" fill={GOLD} />
      <circle cx="137" cy="18" r="11" fill="var(--hero-bg, #1D6059)" />
      <path d="M108 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={W} />
      <path d="M150 42l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill={W2} />
      {/* mosque */}
      <rect x="20" y="20" width="10" height="66" rx="2" fill={W} />
      <path d="M18 22l7-14 7 14z" fill={GOLD} />
      <path d="M40 60a40 34 0 0 1 80 0z" fill={W} />
      <rect x="44" y="58" width="72" height="28" fill={W} />
      <path d="M80 26v-8" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <path d="M72 86v-14a8 8 0 0 1 16 0v14z" fill="rgba(0,0,0,0.18)" />
      <rect x="124" y="56" width="8" height="30" rx="2" fill={W2} />
      <rect x="10" y="86" width="140" height="4" rx="2" fill={W2} />
    </>
  );
}

function Social() {
  return (
    <>
      <circle cx="80" cy="46" r="38" fill={W3} />
      {/* three people */}
      <circle cx="44" cy="40" r="11" fill={W2} />
      <path d="M24 84a20 22 0 0 1 40 0z" fill={W2} />
      <circle cx="116" cy="40" r="11" fill={W2} />
      <path d="M96 84a20 22 0 0 1 40 0z" fill={W2} />
      <circle cx="80" cy="36" r="14" fill={W} />
      <path d="M54 88a26 28 0 0 1 52 0z" fill={W} />
      {/* heart */}
      <path d="M80 18c-4-8-16-6-16 2 0 7 9 12 16 18 7-6 16-11 16-18 0-8-12-10-16-2z" fill={GOLD} transform="translate(0,-10) scale(1)" />
    </>
  );
}

function English() {
  return (
    <>
      <circle cx="70" cy="50" r="38" fill={W3} />
      {/* open book */}
      <path d="M20 34c14-6 30-6 44 2v48c-14-8-30-8-44-2z" fill={W} />
      <path d="M108 34c-14-6-30-6-44 2v48c14-8 30-8 44-2z" fill="rgba(255,255,255,0.8)" />
      <path d="M30 46h24M30 54h24M30 62h18M74 46h24M74 54h24M74 62h18" stroke="rgba(0,0,0,0.12)" strokeWidth="3" strokeLinecap="round" />
      {/* speech bubble */}
      <path d="M112 10h40a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-24l-10 9v-9h-6a8 8 0 0 1-8-8v-20a8 8 0 0 1 8-8z" fill={GOLD} />
      <text x="132" y="34" textAnchor="middle" fontFamily="Tajawal, sans-serif" fontWeight="800" fontSize="16" fill="#1f2937">Aa</text>
    </>
  );
}

function Weight() {
  return (
    <>
      <circle cx="80" cy="50" r="40" fill={W3} />
      {/* scale platform */}
      <rect x="34" y="40" width="92" height="46" rx="12" fill={W} />
      <rect x="40" y="46" width="80" height="34" rx="9" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
      {/* display */}
      <rect x="60" y="50" width="40" height="14" rx="4" fill="#1f2937" />
      <text x="80" y="61" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="10" fill={GOLD}>57.2</text>
      {/* electrodes */}
      <rect x="44" y="68" width="22" height="6" rx="3" fill="rgba(0,0,0,0.12)" />
      <rect x="94" y="68" width="22" height="6" rx="3" fill="rgba(0,0,0,0.12)" />
      {/* bluetooth waves */}
      <path d="M132 22a14 14 0 0 1 0 20M138 16a22 22 0 0 1 0 32" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="126" cy="32" r="3.5" fill={GOLD} />
    </>
  );
}

function Tasks() {
  return (
    <>
      <circle cx="78" cy="50" r="40" fill={W3} />
      {/* clipboard */}
      <rect x="44" y="16" width="64" height="76" rx="10" fill={W} />
      <rect x="62" y="10" width="28" height="12" rx="5" fill={GOLD} />
      {[34, 52, 70].map((y, i) => (
        <g key={y}>
          <rect x="54" y={y - 6} width="12" height="12" rx="3" fill={i < 2 ? GOLD : 'none'} stroke={i < 2 ? 'none' : 'rgba(0,0,0,0.2)'} strokeWidth="2" />
          {i < 2 && <path d={`M57 ${y}l3 3 5-6`} stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />}
          <path d={`M72 ${y}h26`} stroke="rgba(0,0,0,0.15)" strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}
      {/* spark */}
      <path d="M128 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={GOLD} />
    </>
  );
}

function Watch() {
  return (
    <>
      <circle cx="80" cy="50" r="40" fill={W3} />
      {/* strap */}
      <rect x="64" y="4" width="32" height="92" rx="10" fill="rgba(0,0,0,0.18)" />
      {/* face */}
      <rect x="52" y="22" width="56" height="58" rx="14" fill={W} />
      <rect x="58" y="28" width="44" height="46" rx="10" fill="#1f2937" />
      {/* heart line */}
      <path d="M62 54h8l4-10 6 18 4-8h14" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="80" y="42" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="8" fill="#fff">8,240</text>
      <rect x="108" y="44" width="5" height="12" rx="2" fill={W} />
      {/* bluetooth waves */}
      <path d="M128 22a14 14 0 0 1 0 20M134 16a22 22 0 0 1 0 32" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  );
}

const ART = { gym: Gym, food: Food, prayer: Prayer, social: Social, english: English, weight: Weight, tasks: Tasks, watch: Watch };

export default function Illustration({ goal, className = '' }) {
  const Art = ART[goal];
  if (!Art) return null;
  return (
    <svg viewBox="0 0 160 96" className={className} aria-hidden>
      <Art />
    </svg>
  );
}
