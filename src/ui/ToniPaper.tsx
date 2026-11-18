// Toni in the Paper language ("טוני המוזיקאי", owner 2026-11-17, sketch B): the eighth note rebuilt from tonal sheets
// with a darker edge copy just below each one, no outlines, no cheeks, no feet. Lilac head and stem, teal headphones
// (band + two cups), a small calm face (ink eyes with a highlight, soft lids, brows only when they say something, a small
// mouth). The flag is his hand and his mood signal. Emotion lives in the pose, the flag-hand, the eyes / lids / brows and
// small Paper effect sheets (sparkles, sound arcs, thought dots, rests). Motion per state: src/toni.css (.toni-p.s-*).
// src/ui/Toni.tsx shows it (or a partner build's teacher frame).
import '../toni.css';
import type { ToniState } from './Toni';

/** The twelve base states (every call site, and the partner TeacherFrame set). */
export type ToniBaseState = ToniState;
/** Extra moods of the Paper Toni, for real moments: lesson done / rank up, counting in / playing, after two misses,
 * a new best / streak milestone, a new topic. */
export type ToniExtraState = 'proud' | 'focused' | 'encouraging' | 'celebrating' | 'curious';
export type ToniMood = ToniBaseState | ToniExtraState;

export const TONI_BASE_STATES: ToniBaseState[] = ['idle', 'listen', 'think', 'hint', 'correct', 'streak', 'wrong', 'close', 'wow', 'sleepy', 'draw', 'bye'];
export const TONI_EXTRA_STATES: ToniExtraState[] = ['proud', 'focused', 'encouraging', 'celebrating', 'curious'];
export const TONI_MOODS: ToniMood[] = [...TONI_BASE_STATES, ...TONI_EXTRA_STATES];
/** The nearest base state for an extra mood (the partner frame knows only the twelve). */
export const BASE_OF: Record<ToniExtraState, ToniBaseState> = { proud: 'correct', focused: 'listen', encouraging: 'close', celebrating: 'streak', curious: 'wow' };
export const toBase = (s: ToniMood): ToniBaseState => (s in BASE_OF ? BASE_OF[s as ToniExtraState] : (s as ToniBaseState));

// ---------------------------------------------------------------- palette
export const TONI_INK = '#1e1033';
const HEAD = '#b39af8';
const HEAD_E = '#5d3fbf';
const STEM = '#9f84f5';
const HI = '#ddd0ff';
const PHONES = '#12c9b4';
const PHONES_E = '#0d6f64';
const PHONES_HI = '#7ee9da';
/** Flag sheets [fill, edge]. Correct = teal, wrong = raspberry red (also the app's new "wrong" feedback colour). */
export const FLAG_COLORS = {
  sun: ['#ffd43b', '#c98a00'],
  correct: ['#3fe0c9', '#0d8f80'],
  wrong: ['#e23a5a', '#9c1d3a'],
  amber: ['#ff8a3d', '#b4531a'],
  sky: ['#3ab8ff', '#1a6fa8'],
  rest: ['#c9b8fb', '#7a62c9'],
} as const;
type FlagColor = keyof typeof FLAG_COLORS;
const EDGE = 3.6; // the edge copy sits this far below its sheet (viewBox units)

// ---------------------------------------------------------------- poses
type Eyes = 'open' | 'soft' | 'wide' | 'focus' | 'half' | 'happy' | 'closed';
type Brows = '' | 'raised' | 'worried' | 'one' | 'soft' | 'firm' | 'high';
type Mouth = 'smile' | 'wide' | 'open' | 'o' | 'oo' | 'flat' | 'side' | 'press' | 'frown' | 'smirk' | 'soft' | 'sleep';
type Fx = '' | 'arcs' | 'dots' | 'spark' | 'sparkles' | 'confetti' | 'burst' | 'rests' | 'waves' | 'star' | 'beat' | 'note' | 'lift' | 'tick';
interface Pose {
  flag: FlagColor;
  /** Flag-hand angle about the stem top: negative = raised, positive = lowered. */
  rot: number;
  /** Body tilt (deg, about the base) and lift (px, negative = up). */
  tilt: number;
  dy: number;
  eyes: Eyes;
  /** Where the pupils look (face frame). */
  look: [number, number];
  /** Lid slant: + inner corners raised (worried, soft), - inner corners lowered (firm, focused). */
  lid: number;
  brows: Brows;
  mouth: Mouth;
  phones: boolean;
  fx: Fx;
}
export const POSES: Record<ToniMood, Pose> = {
  idle: { flag: 'sun', rot: 0, tilt: 0, dy: 0, eyes: 'open', look: [1, 1], lid: 0, brows: '', mouth: 'smile', phones: true, fx: '' },
  listen: { flag: 'sun', rot: -62, tilt: -4, dy: 0, eyes: 'open', look: [-2, -2], lid: 1, brows: 'raised', mouth: 'o', phones: true, fx: 'arcs' },
  think: { flag: 'sun', rot: 38, tilt: -3, dy: 0, eyes: 'open', look: [-3, -4], lid: 0, brows: 'one', mouth: 'side', phones: true, fx: 'dots' },
  hint: { flag: 'sun', rot: -96, tilt: 3, dy: -1, eyes: 'open', look: [3, -3], lid: 0, brows: 'raised', mouth: 'smile', phones: true, fx: 'spark' },
  correct: { flag: 'correct', rot: -72, tilt: 0, dy: -3, eyes: 'happy', look: [0, 0], lid: 0, brows: '', mouth: 'wide', phones: true, fx: 'sparkles' },
  streak: { flag: 'amber', rot: -82, tilt: 2, dy: -3, eyes: 'happy', look: [0, 0], lid: 0, brows: 'raised', mouth: 'wide', phones: true, fx: 'sparkles' },
  wrong: { flag: 'wrong', rot: 36, tilt: -3, dy: 4, eyes: 'open', look: [-1, 3], lid: 3, brows: 'worried', mouth: 'frown', phones: true, fx: '' },
  close: { flag: 'amber', rot: 18, tilt: 2, dy: 0, eyes: 'open', look: [2, 0], lid: 0, brows: 'one', mouth: 'smirk', phones: true, fx: 'tick' },
  wow: { flag: 'sky', rot: -40, tilt: -6, dy: -2, eyes: 'wide', look: [0, -1], lid: 0, brows: 'high', mouth: 'oo', phones: true, fx: 'burst' },
  sleepy: { flag: 'rest', rot: 42, tilt: -3, dy: 3, eyes: 'closed', look: [0, 0], lid: 0, brows: '', mouth: 'sleep', phones: false, fx: 'rests' },
  draw: { flag: 'sun', rot: 0, tilt: 0, dy: 0, eyes: 'open', look: [2, -1], lid: 0, brows: 'raised', mouth: 'smile', phones: true, fx: 'lift' },
  bye: { flag: 'sun', rot: -34, tilt: 3, dy: 0, eyes: 'happy', look: [0, 0], lid: 0, brows: '', mouth: 'smile', phones: true, fx: 'waves' },
  proud: { flag: 'sun', rot: -90, tilt: -4, dy: -4, eyes: 'soft', look: [0, -1], lid: 1, brows: 'soft', mouth: 'smile', phones: true, fx: 'star' },
  focused: { flag: 'sun', rot: 12, tilt: 3, dy: 2, eyes: 'focus', look: [2, 1], lid: -2, brows: 'firm', mouth: 'press', phones: true, fx: 'beat' },
  encouraging: { flag: 'sky', rot: -52, tilt: 3, dy: 0, eyes: 'soft', look: [1, 0], lid: 2, brows: 'soft', mouth: 'soft', phones: true, fx: 'lift' },
  celebrating: { flag: 'sun', rot: -104, tilt: 0, dy: -6, eyes: 'happy', look: [0, 0], lid: 0, brows: 'raised', mouth: 'open', phones: true, fx: 'confetti' },
  curious: { flag: 'sky', rot: -20, tilt: 8, dy: 0, eyes: 'open', look: [-3, -3], lid: 0, brows: 'high', mouth: 'o', phones: true, fx: 'note' },
};

// ---------------------------------------------------------------- parts
/** A Paper sheet: the edge copy (shifted down) and the sheet on top. No stroke, ever. */
function Sheet({ el: El, a, fill, edge, tr }: { el: 'rect' | 'ellipse' | 'path' | 'circle'; a: Record<string, string | number>; fill: string; edge: string; tr?: string }) {
  const Tag = El as 'rect';
  return (
    <>
      <Tag className="tp-sheet" {...(a as object)} fill={edge} transform={`translate(0 ${EDGE})${tr ? ` ${tr}` : ''}`} />
      <Tag className="tp-sheet" {...(a as object)} fill={fill} transform={tr} />
    </>
  );
}

const FLAG_D = 'M139 30 C 182 44, 192 80, 164 112 C 170 85, 158 68, 139 64 Z';
const line = { fill: 'none', stroke: TONI_INK, strokeLinecap: 'round' as const };
// Face frame: features drawn level, then turned with the -20° note head.
const FACE_TR = 'rotate(-18 89 132)';
const EYE_AT: [number, number][] = [
  [74, 132],
  [104, 132],
];

function EyesPart({ p }: { p: Pose }) {
  const [lx, ly] = p.look;
  if (p.eyes === 'happy')
    return <g className="tp-eyes">{EYE_AT.map(([x, y]) => <path key={x} d={`M${x - 8} ${y + 3} Q${x} ${y - 7} ${x + 8} ${y + 3}`} {...line} strokeWidth={4.6} />)}</g>;
  if (p.eyes === 'closed')
    return <g className="tp-eyes">{EYE_AT.map(([x, y]) => <path key={x} d={`M${x - 8} ${y} Q${x} ${y + 6} ${x + 8} ${y}`} {...line} strokeWidth={4} />)}</g>;
  const [rx, ry] = p.eyes === 'wide' ? [6.4, 8.8] : p.eyes === 'focus' ? [5.6, 5.4] : p.eyes === 'half' ? [5.6, 4] : [5.6, 7.4];
  return (
    <>
      <g className="tp-eyes">
        {EYE_AT.map(([x, y]) => (
          <g key={x}>
            <ellipse cx={x + lx} cy={y + ly} rx={rx} ry={ry} fill={TONI_INK} />
            <circle cx={x + lx + 2} cy={y + ly - ry * 0.4} r={1.9} fill="#ffffff" />
            {p.eyes === 'soft' && <ellipse cx={x + lx} cy={y + ly + ry + 1.2} rx={rx + 3} ry={ry * 0.62} fill={HEAD} />}
          </g>
        ))}
      </g>
      {/* soft lids: give the face age and attention */}
      {p.eyes !== 'wide' &&
        EYE_AT.map(([x, y], i) => {
          const s = i === 0 ? 1 : -1; // toward the inner corner
          const top = y + ly - ry - 1.5;
          const inner = top - p.lid;
          const outer = top + p.lid * 0.4;
          const x1 = x - 8 * s;
          const x2 = x + 8 * s;
          return <path key={`l${x}`} className="tp-lid" d={`M${x1} ${outer} Q${x} ${top - 4} ${x2} ${inner}`} {...line} strokeWidth={3} />;
        })}
    </>
  );
}

const BROW: Record<Exclude<Brows, ''>, [number, number, number][]> = {
  // per eye: [lift, inner raise, arch]
  raised: [[4, 0, 3], [4, 0, 3]],
  worried: [[1, 4, 1], [1, 4, 1]],
  one: [[-1, -1, 1], [6, 0, 3]],
  soft: [[1, 1.5, 2], [1, 1.5, 2]],
  firm: [[-1, -3, 1], [-1, -3, 1]],
  high: [[7, 0, 4], [7, 0, 4]],
};
function BrowsPart({ kind }: { kind: Brows }) {
  if (!kind) return null;
  return (
    <g className="tp-brows">
      {EYE_AT.map(([x, y], i) => {
        const [lift, inner, arch] = BROW[kind][i];
        const s = i === 0 ? 1 : -1;
        const y0 = y - 17 - lift;
        return <path key={x} d={`M${x - 7 * s} ${y0} Q${x} ${y0 - arch - inner / 2} ${x + 7 * s} ${y0 - inner}`} {...line} strokeWidth={3.2} />;
      })}
    </g>
  );
}

function MouthPart({ kind }: { kind: Mouth }) {
  const w = { ...line, strokeWidth: 4 };
  switch (kind) {
    case 'wide':
      return <path d="M76 151 Q87 163 99 149" {...w} />;
    case 'open':
      return <path d="M77 150 Q87 165 99 148 Q88 153 77 150 Z" fill={TONI_INK} />;
    case 'o':
      return <ellipse cx={87} cy={155} rx={3.6} ry={4.2} fill={TONI_INK} />;
    case 'oo':
      return <ellipse cx={87} cy={156} rx={4.6} ry={5.8} fill={TONI_INK} />;
    case 'flat':
      return <path d="M80 155 L94 154" {...w} />;
    case 'side':
      return <path d="M84 156 Q89 154 95 155" {...w} />;
    case 'press':
      return <path d="M82 155 L92 155" {...w} />;
    case 'frown':
      return <path d="M79 157 Q87 152 95 156" {...w} />;
    case 'smirk':
      return <path d="M79 155 Q89 158 96 150" {...w} />;
    case 'soft':
      return <path d="M80 153 Q87 158 94 152" {...w} />;
    case 'sleep':
      return <ellipse cx={87} cy={155} rx={4} ry={2.6} fill={TONI_INK} />;
    default:
      return <path d="M78 152 Q87 159 96 151" {...w} />;
  }
}

function Phones() {
  const band = 'M44 128 C 40 78, 112 58, 132 96';
  return (
    <g className="tp-phones">
      <path d={band} transform={`translate(0 ${EDGE})`} fill="none" stroke={PHONES_E} strokeWidth={7} strokeLinecap="round" />
      <path d={band} fill="none" stroke={PHONES} strokeWidth={7} strokeLinecap="round" />
      <g className="tp-cup tp-cup-l">
        <Sheet el="rect" a={{ x: 34, y: 118, width: 20, height: 30, rx: 9 }} fill={PHONES} edge={PHONES_E} tr="rotate(-18 44 133)" />
        <rect x={38} y={124} width={7} height={18} rx={3.5} fill={PHONES_HI} transform="rotate(-18 44 133)" />
      </g>
      <g className="tp-cup tp-cup-r">
        <Sheet el="rect" a={{ x: 124, y: 92, width: 18, height: 28, rx: 8 }} fill={PHONES} edge={PHONES_E} tr="rotate(-18 133 106)" />
      </g>
    </g>
  );
}

/** A four-point sparkle sheet centred at (x, y), radius r. */
const sparkD = (x: number, y: number, r: number) => {
  const k = r * 0.28;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
};
const starD = (x: number, y: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + ' Z';
/** A small eighth note as sheets (head + stem + flag). */
function MiniNote({ x, y, s = 1, fill, edge }: { x: number; y: number; s?: number; fill: string; edge: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Sheet el="rect" a={{ x: 6, y: -24, width: 4, height: 24, rx: 2 }} fill={fill} edge={edge} />
      <Sheet el="path" a={{ d: 'M10 -24 C 18 -20, 20 -12, 16 -6 C 16 -12, 13 -15, 10 -16 Z' }} fill={fill} edge={edge} />
      <Sheet el="ellipse" a={{ cx: 3, cy: 0, rx: 7, ry: 5 }} fill={fill} edge={edge} tr="rotate(-20 3 0)" />
    </g>
  );
}

const [SUN, SUN_E] = FLAG_COLORS.sun;
const [TEAL, TEAL_E] = FLAG_COLORS.correct;
const [SKY, SKY_E] = FLAG_COLORS.sky;
const LIGHT = '#e7defe';
const LIGHT_E = '#a58ff0';

function FxPart({ kind }: { kind: Fx }) {
  const fx = (i: number, child: React.ReactNode) => (
    <g key={i} className={`tp-fx tp-fx-${i}`}>
      {child}
    </g>
  );
  const wire = { fill: 'none', stroke: 'var(--tp-wire)', strokeLinecap: 'round' as const, strokeWidth: 4.5 };
  switch (kind) {
    case 'arcs': // sound coming into the left cup
      return (
        <>
          {fx(1, <path d="M22 118 Q13 133 24 148" {...wire} opacity={0.8} />)}
          {fx(2, <path d="M9 108 Q-6 133 12 158" {...wire} opacity={0.5} />)}
        </>
      );
    case 'dots': // thought dots, rising to the upper left
      return (
        <>
          {fx(1, <Sheet el="circle" a={{ cx: 46, cy: 66, r: 5 }} fill={LIGHT} edge={LIGHT_E} />)}
          {fx(2, <Sheet el="circle" a={{ cx: 30, cy: 44, r: 7 }} fill={LIGHT} edge={LIGHT_E} />)}
          {fx(3, <Sheet el="circle" a={{ cx: 8, cy: 16, r: 10 }} fill={LIGHT} edge={LIGHT_E} />)}
        </>
      );
    case 'spark': // the idea, at the raised flag-hand
      return fx(1, <Sheet el="path" a={{ d: sparkD(206, -26, 12) }} fill={SUN} edge={SUN_E} />);
    case 'sparkles':
      return (
        <>
          {fx(1, <Sheet el="path" a={{ d: sparkD(30, 50, 13) }} fill={SUN} edge={SUN_E} />)}
          {fx(2, <Sheet el="path" a={{ d: sparkD(196, 108, 9) }} fill={TEAL} edge={TEAL_E} />)}
          {fx(3, <Sheet el="path" a={{ d: sparkD(56, 18, 7) }} fill={TEAL} edge={TEAL_E} />)}
        </>
      );
    case 'confetti': // a new best: sparkles and notes in the air
      return (
        <>
          {fx(1, <Sheet el="path" a={{ d: sparkD(26, 52, 14) }} fill={SUN} edge={SUN_E} />)}
          {fx(2, <Sheet el="path" a={{ d: sparkD(204, 112, 10) }} fill={TEAL} edge={TEAL_E} />)}
          {fx(3, <MiniNote x={48} y={18} s={0.9} fill={TEAL} edge={TEAL_E} />)}
          {fx(4, <MiniNote x={196} y={160} s={0.75} fill={SKY} edge={SKY_E} />)}
          {fx(5, <Sheet el="path" a={{ d: sparkD(-6, 118, 8) }} fill={SKY} edge={SKY_E} />)}
        </>
      );
    case 'burst': // surprise: three short lines off the head
      return (
        <>
          {fx(1, <path d="M22 82 L8 70" {...wire} />)}
          {fx(2, <path d="M16 104 L-2 102" {...wire} />)}
          {fx(3, <path d="M38 64 L32 48" {...wire} />)}
        </>
      );
    case 'rests': // sleepy: two quarter rests drifting up
      return (
        <>
          {fx(1, <path d="M168 56 l8 9 l-7 8 l9 10 q-10 -4 -10 4 q0 6 5 8" {...wire} strokeWidth={4.2} />)}
          {fx(2, <path d="M194 14 l6 7 l-5 6 l7 8 q-8 -3 -8 3 q0 5 4 6" {...wire} strokeWidth={3.6} opacity={0.75} />)}
        </>
      );
    case 'waves': // bye: motion lines beside the waving hand
      return (
        <>
          {fx(1, <path d="M206 18 Q214 30 206 42" {...wire} opacity={0.7} />)}
          {fx(2, <path d="M190 -10 Q202 -4 204 8" {...wire} opacity={0.5} />)}
        </>
      );
    case 'star': // proud: a star sheet over the raised hand
      return fx(1, <Sheet el="path" a={{ d: starD(146, -26, 16) }} fill={SUN} edge={SUN_E} />);
    case 'beat': // focused: the count-in, four beat dots
      return (
        <>
          {[0, 1, 2, 3].map((i) => fx(i + 1, <Sheet el="circle" a={{ cx: 20 + i * 18, cy: 206, r: i === 0 ? 5.5 : 4.5 }} fill={i === 0 ? TEAL : LIGHT} edge={i === 0 ? TEAL_E : LIGHT_E} />))}
        </>
      );
    case 'note': // curious: a little note he is looking at (a new topic)
      return fx(1, <MiniNote x={14} y={58} s={1.1} fill={SKY} edge={SKY_E} />);
    case 'lift': // welcome / encouraging: two small sparkles
      return (
        <>
          {fx(1, <Sheet el="path" a={{ d: sparkD(206, 4, 9) }} fill={SUN} edge={SUN_E} />)}
          {fx(2, <Sheet el="path" a={{ d: sparkD(22, 70, 7) }} fill={TEAL} edge={TEAL_E} />)}
        </>
      );
    case 'tick': // close: a short "almost" mark by the flag
      return fx(1, <path d="M190 96 l6 6 l12 -14" {...wire} opacity={0.75} />);
    default:
      return null;
  }
}

/** The Paper Toni. Same props as Toni; `state` also takes the extra moods. */
export function ToniPaper({ state = 'idle', size = 120, label }: { state?: ToniMood; size?: number; label?: string }) {
  const p = POSES[state] ?? POSES.idle;
  const [flag, flagE] = FLAG_COLORS[p.flag];
  return (
    <span className={`toni toni-p s-${state}`} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="-24 -48 266 266" width={size} height={size}>
        <ellipse className="tp-shadow" cx={94} cy={192} rx={46} ry={6} fill={TONI_INK} opacity={0.1} />
        <g transform={`translate(0 ${p.dy}) rotate(${p.tilt} 94 188)`}>
          <g className="tp-body">
            <Sheet el="rect" a={{ x: 123, y: 24, width: 16, height: 114, rx: 8 }} fill={STEM} edge={HEAD_E} />
            <g className="tp-flag">
              <g transform={`rotate(${p.rot} 139 30)`}>
                <Sheet el="path" a={{ d: FLAG_D }} fill={flag} edge={flagE} />
              </g>
            </g>
            <g className="tp-head">
              <Sheet el="ellipse" a={{ cx: 88, cy: 134, rx: 51, ry: 39 }} fill={HEAD} edge={HEAD_E} tr="rotate(-20 88 134)" />
              <ellipse cx={66} cy={113} rx={17} ry={7} transform="rotate(-28 66 113)" fill={HI} />
              {p.phones && <Phones />}
              <g className="tp-face" transform={FACE_TR}>
                <EyesPart p={p} />
                <BrowsPart kind={p.brows} />
                <g className="tp-mouth">
                  <MouthPart kind={p.mouth} />
                </g>
              </g>
            </g>
          </g>
        </g>
        <FxPart kind={p.fx} />
      </svg>
    </span>
  );
}
