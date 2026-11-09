// Toni, the eighth-note mascot (0.61, SPEC-REDESIGN). The flag is his hand and his mood meter; the face is built
// from parts (5 eyes, 4 brows, 7 mouths). Each state has its own motion in v2.css (.toni.s-*), and reduced motion
// keeps only the pose. Pure SVG, no images.

export type ToniState = 'idle' | 'listen' | 'think' | 'hint' | 'correct' | 'streak' | 'wrong' | 'close' | 'wow' | 'sleepy' | 'draw' | 'bye';
type Eyes = 'open' | 'happy' | 'wide' | 'half' | 'closed';
type Brows = '' | 'raised' | 'worried' | 'one' | 'determined';
type Mouth = 'smile' | 'grin' | 'o' | 'small-o' | 'flat' | 'wobble' | 'smirk' | 'sleep';

const INK = '#1E1033';
const LILAC = '#A78BFA';
const POSE: Record<ToniState, { flag: string; rot: number; eyes: Eyes; dx?: number; dy?: number; brows: Brows; mouth: Mouth }> = {
  idle: { flag: '#FFD43B', rot: 0, eyes: 'open', brows: '', mouth: 'smile' },
  listen: { flag: '#FFD43B', rot: -58, eyes: 'open', dx: 3, dy: -4, brows: 'raised', mouth: 'small-o' },
  think: { flag: '#FFD43B', rot: 40, eyes: 'open', dx: -5, dy: -4, brows: 'one', mouth: 'flat' },
  hint: { flag: '#FFD43B', rot: -95, eyes: 'open', dx: 4, dy: 2, brows: 'raised', mouth: 'smile' },
  correct: { flag: '#12C9B4', rot: -70, eyes: 'happy', brows: '', mouth: 'grin' },
  streak: { flag: '#FFD43B', rot: -80, eyes: 'happy', brows: 'raised', mouth: 'grin' },
  wrong: { flag: '#FF5FA2', rot: 62, eyes: 'open', dy: 3, brows: 'worried', mouth: 'wobble' },
  close: { flag: '#FF8A3D', rot: 20, eyes: 'open', dx: 2, brows: 'one', mouth: 'smirk' },
  wow: { flag: LILAC, rot: -40, eyes: 'wide', brows: 'raised', mouth: 'o' },
  sleepy: { flag: '#FFD43B', rot: 48, eyes: 'half', brows: '', mouth: 'sleep' },
  draw: { flag: '#FFD43B', rot: 0, eyes: 'open', brows: 'determined', mouth: 'smile' },
  bye: { flag: '#FFD43B', rot: 0, eyes: 'happy', brows: '', mouth: 'smile' },
};
const S = { fill: 'none', stroke: INK, strokeWidth: 4.5, strokeLinecap: 'round' as const };

function EyesPart({ kind, dx = 0, dy = 0 }: { kind: Eyes; dx?: number; dy?: number }) {
  const at: [number, number][] = [
    [74, 140],
    [106, 130],
  ];
  if (kind === 'happy') return <>{at.map(([x, y]) => <path key={x} d={`M${x - 10} ${y + 3} Q${x} ${y - 10} ${x + 10} ${y + 3}`} {...S} strokeWidth={5} />)}</>;
  if (kind === 'closed') return <>{at.map(([x, y]) => <path key={x} d={`M${x - 9} ${y + 2} Q${x} ${y + 7} ${x + 9} ${y + 2}`} {...S} />)}</>;
  const [r, pr] = kind === 'wide' ? [14, 4.5] : [12, 5.5];
  return (
    <>
      {at.map(([x, y]) => (
        <g key={x}>
          <g className="t-eye">
            <circle cx={x} cy={y} r={r} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
            <circle cx={x + 3 + dx} cy={y + 2 + dy} r={pr} fill={INK} />
            <circle cx={x + 5 + dx} cy={y - 1 + dy} r={1.8} fill="#FFFFFF" />
          </g>
          {kind === 'half' && <path d={`M${x - 13} ${y} A13 13 0 0 1 ${x + 13} ${y} Z`} fill={LILAC} stroke={INK} strokeWidth={3.5} />}
        </g>
      ))}
    </>
  );
}

function BrowsPart({ kind }: { kind: Brows }) {
  const d: Record<Exclude<Brows, ''>, [string, string]> = {
    raised: ['M62 116 Q72 108 84 112', 'M96 104 Q106 96 118 100'],
    worried: ['M62 120 Q72 112 84 112', 'M96 102 Q108 102 116 110'],
    one: ['M62 122 Q72 118 84 120', 'M96 100 Q106 92 118 98'],
    determined: ['M62 116 Q74 118 84 124', 'M96 114 Q106 106 118 106'],
  };
  if (!kind) return null;
  return (
    <>
      <path d={d[kind][0]} {...S} />
      <path d={d[kind][1]} {...S} />
    </>
  );
}

function MouthPart({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'grin':
      return (
        <>
          <path d="M80 154 Q96 176 114 150 Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M90 164 Q98 170 106 160" fill="#FF5FA2" />
        </>
      );
    case 'o':
      return <ellipse cx={98} cy={160} rx={7} ry={9} fill={INK} />;
    case 'small-o':
      return <ellipse cx={98} cy={158} rx={4.5} ry={5} fill={INK} />;
    case 'flat':
      return <path d="M88 158 L106 154" {...S} />;
    case 'wobble':
      return <path d="M84 162 Q90 154 96 160 Q102 166 110 156" {...S} />;
    case 'smirk':
      return <path d="M86 160 Q100 164 112 150" {...S} />;
    case 'sleep':
      return <ellipse cx={98} cy={158} rx={5} ry={3.5} fill={INK} />;
    default:
      return <path d="M84 158 Q96 166 108 154" {...S} strokeWidth={5} />;
  }
}

/** Toni in a given state. `size` is the box in CSS px; the drawing keeps room around it for hops and spins. */
export function Toni({ state = 'idle', size = 120, label }: { state?: ToniState; size?: number; label?: string }) {
  const p = POSE[state];
  return (
    <span className={`toni s-${state}`} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="-30 -40 260 260" width={size} height={size}>
        <ellipse cx={96} cy={190} rx={50} ry={7} fill={INK} opacity={0.12} />
        <g className="t-body">
          <rect x={124} y={26} width={18} height={118} rx={9} fill={LILAC} stroke={INK} strokeWidth={6} />
          <g className="t-flag">
            <path transform={`rotate(${p.rot} 142 30)`} d="M142 30 C 186 46, 194 82, 166 114 C 172 86, 160 68, 142 66 Z" fill={p.flag} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          </g>
          <ellipse cx={88} cy={138} rx={52} ry={40} transform="rotate(-20 88 138)" fill={LILAC} stroke={INK} strokeWidth={6} />
          <ellipse cx={66} cy={118} rx={14} ry={7} transform="rotate(-30 66 118)" fill="#FFFFFF" opacity={0.5} />
          <EyesPart kind={p.eyes} dx={p.dx} dy={p.dy} />
          <BrowsPart kind={p.brows} />
          <MouthPart kind={p.mouth} />
          <ellipse cx={62} cy={158} rx={7} ry={4} fill="#FF5FA2" opacity={0.8} />
          <ellipse cx={122} cy={148} rx={7} ry={4} fill="#FF5FA2" opacity={0.8} />
          <ellipse cx={72} cy={180} rx={11} ry={6} fill={INK} />
          <ellipse cx={106} cy={178} rx={11} ry={6} fill={INK} />
        </g>
        {state === 'listen' && (
          <g className="t-fx" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round">
            <path d="M176 24 Q184 34 176 44" />
            <path d="M186 16 Q198 34 186 52" />
          </g>
        )}
        {state === 'think' && (
          <g className="t-fx" fill={INK}>
            <circle cx={40} cy={40} r={5} />
            <circle cx={58} cy={30} r={6} />
            <circle cx={80} cy={24} r={7} />
          </g>
        )}
        {state === 'sleepy' && (
          <g className="t-fx" fontFamily="'Noto Music', serif" fill={INK}>
            <text x={150} y={48} fontSize={30}>
              𝄽
            </text>
            <text x={172} y={22} fontSize={22}>
              𝄽
            </text>
          </g>
        )}
      </svg>
    </span>
  );
}
