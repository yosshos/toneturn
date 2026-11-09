// Line drawings of the instrument sounds (0.61, SPEC-REDESIGN: "sound cards with a picture of the instrument").
// One 120×64 box each, ink outline + one flat accent, drawn here (no images, no downloads).
import type { ReactNode } from 'react';

const I = 'currentColor';
const L = { fill: 'none', stroke: I, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** White and black keys along a line — the keyboard every piano drawing sits on. */
function keys(x: number, y: number, w: number, n: number, h = 14): ReactNode {
  const kw = w / n;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#fff" {...{ stroke: I, strokeWidth: 2 }} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <path key={i} d={`M${x + kw * (i + 1)} ${y}v${h}`} stroke={I} strokeWidth={1.2} />
      ))}
      {Array.from({ length: n - 1 }, (_, i) => ([0, 1, 3, 4, 5].includes(i % 7) ? <rect key={`b${i}`} x={x + kw * (i + 1) - kw * 0.3} y={y} width={kw * 0.6} height={h * 0.6} fill={I} /> : null))}
    </g>
  );
}

const ART: Record<string, (accent: string) => ReactNode> = {
  grand: (a) => (
    <>
      <path d="M14 40 L14 22 Q14 12 30 12 L70 12 Q86 12 96 22 Q106 32 108 40 Z" {...L} fill={a} />
      <path d="M30 12 L60 2" {...L} />
      {keys(14, 40, 60, 12, 10)}
      <path d="M22 50v10M100 40v20M60 50v10" {...L} />
    </>
  ),
  upright: (a) => (
    <>
      <rect x={24} y={4} width={72} height={36} rx={4} {...L} fill={a} />
      <path d="M34 14h52" {...L} strokeWidth={1.6} opacity={0.6} />
      {keys(20, 40, 80, 14, 10)}
      <path d="M26 50v10M94 50v10" {...L} />
    </>
  ),
  classic: (a) => (
    <>
      <rect x={10} y={14} width={100} height={18} rx={4} {...L} fill={a} />
      <circle cx={24} cy={23} r={3.5} fill={I} />
      <circle cx={36} cy={23} r={3.5} fill={I} />
      <path d="M50 19v8M58 19v8M66 19v8" {...L} strokeWidth={2} />
      <path d="M78 23 Q84 15 90 23 T102 23" {...L} strokeWidth={2} />
      {keys(10, 32, 100, 15, 16)}
    </>
  ),
  wurli: (a) => (
    <>
      <path d="M12 18 Q12 10 22 10 H98 Q108 10 108 18 V34 H12 Z" {...L} fill={a} />
      {keys(16, 34, 88, 14, 10)}
      <path d="M26 44 L18 62M94 44 L102 62" {...L} />
    </>
  ),
  tine: (a) => (
    <>
      <rect x={10} y={10} width={100} height={22} rx={3} {...L} fill={a} />
      <path d="M18 18h44" {...L} strokeWidth={1.6} />
      <path d="M70 15v12M78 15v12M86 15v12M94 15v12" {...L} strokeWidth={1.6} />
      {keys(10, 32, 100, 15, 14)}
      <path d="M20 46v16M100 46v16" {...L} />
    </>
  ),
  tonewheel: (a) => (
    <>
      <rect x={12} y={8} width={96} height={44} rx={4} {...L} fill={a} />
      {[28, 36, 44, 52, 60].map((x, i) => (
        <path key={x} d={`M${x} 12v${6 + (i % 3) * 4}`} {...L} strokeWidth={3} />
      ))}
      {keys(18, 24, 84, 12, 9)}
      {keys(18, 36, 84, 12, 9)}
      <path d="M22 52v10M98 52v10" {...L} />
    </>
  ),
  organ: (a) => (
    <>
      {[16, 26, 36, 46, 56, 66, 76, 86, 96].map((x, i) => {
        const h = 40 - Math.abs(4 - i) * 6;
        return <rect key={x} x={x} y={46 - h} width={8} height={h} rx={4} {...L} fill={i % 2 ? '#fff' : a} strokeWidth={2} />;
      })}
      {keys(14, 48, 92, 14, 10)}
    </>
  ),
  vibraphone: (a) => (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={12 + i * 12.5} y={8 + i * 1.6} width={10} height={30 - i * 1.6} rx={2} {...L} fill={a} strokeWidth={2} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path key={`t${i}`} d={`M${17 + i * 12.5} 40v${14 - i}`} {...L} strokeWidth={2} />
      ))}
      <path d="M90 6 L106 -4" {...L} />
      <circle cx={88} cy={7} r={4} fill={I} />
    </>
  ),
  marimba: (a) => (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={12 + i * 12.5} y={10} width={10} height={34 - i * 2.5} rx={2} {...L} fill={i % 2 ? '#fff' : a} strokeWidth={2} />
      ))}
      <path d="M10 50 H112" {...L} />
      <path d="M18 50v12M104 50v12" {...L} />
    </>
  ),
  harp: (a) => (
    <>
      <path d="M26 60 L26 6 Q60 2 96 34 L96 44 Q70 30 26 60" {...L} fill={a} />
      {[34, 42, 50, 58, 66, 74, 82].map((x, i) => (
        <path key={x} d={`M${x} ${8 + i * 3.6} V${54 - i * 2.4}`} stroke={I} strokeWidth={1.3} />
      ))}
      <path d="M22 60 H44" {...L} />
    </>
  ),
  harpsichord: (a) => (
    <>
      <path d="M12 40 V18 H72 L108 30 V40 Z" {...L} fill={a} />
      <path d="M20 22 H70 L100 32" {...L} strokeWidth={1.4} opacity={0.6} />
      {keys(12, 40, 44, 7, 8)}
      {keys(12, 48, 44, 7, 8)}
      <path d="M18 56v6M102 40v22M60 56v6" {...L} />
    </>
  ),
};

const ACCENT: Record<string, string> = {
  grand: '#A78BFA', upright: '#FF8A3D', classic: '#3AB8FF', wurli: '#FF5FA2', tine: '#12C9B4', tonewheel: '#FFD43B',
  organ: '#A78BFA', vibraphone: '#3AB8FF', marimba: '#FF8A3D', harp: '#FFD43B', harpsichord: '#12C9B4',
};

export function InstrumentArt({ id }: { id: string }) {
  const draw = ART[id];
  if (!draw) return null;
  return (
    <svg className="inst-art" viewBox="0 -6 120 72" aria-hidden="true">
      {draw(ACCENT[id] ?? '#A78BFA')}
    </svg>
  );
}
