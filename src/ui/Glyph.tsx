// The note-head symbol set (0.61, SPEC-REDESIGN): every exercise type and domain sits inside a tilted note head
// on its domain colour, with an ink outline. Same drawings as the design canvas ("What makes it ours").
import type { ReactNode } from 'react';

const I = '#1E1033';
const sw = { stroke: I, strokeWidth: 3.2, strokeLinecap: 'round' as const, fill: 'none' };
const head = (cx: number, cy: number, rx = 6.5, ry = 4.6) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-20 ${cx} ${cy})`} fill={I} />;

export const DOMAIN_COLOR = { ear: '#3AB8FF', rhythm: '#FF5FA2', voice: '#12C9B4', play: '#FFD43B', harmony: '#A78BFA', theory: '#FF8A3D', purple: '#6D28D9', none: '#EDE6F7' } as const;

export const GLYPHS: Record<string, ReactNode> = {
  intervals: (
    <>
      {head(-11, 10, 7, 5.2)}
      {head(11, -9, 7, 5.2)}
    </>
  ),
  chords: (
    <>
      {head(-3, 13)}
      {head(-3, 3)}
      {head(-3, -7)}
      <path d="M4 12V-24" {...sw} />
    </>
  ),
  contour: <path d="M-24 8 L-13 -4 L-3 4 L8 -13 L22 -6" {...sw} strokeLinejoin="round" />,
  rhythm: (
    <>
      {head(-13, 13)}
      {head(9, 13)}
      <path d="M-7 11V-15M15 11V-15" {...sw} />
      <path d="M-7 -15H15" stroke={I} strokeWidth={6.5} />
    </>
  ),
  sing: <path d="M-24 0 C-19 -15 -13 -15 -8 0 S2 15 7 0 S17 -15 23 -5" {...sw} strokeWidth={3.4} />,
  tune: (
    <>
      <path d="M-20 10 A22 22 0 0 1 20 10" {...sw} />
      <path d="M0 12 L7 -12" {...sw} />
      <circle cx={0} cy={12} r={3.5} fill={I} />
    </>
  ),
  sight: (
    <>
      <path d="M-26 -8H26M-26 0H26M-26 8H26" stroke={I} strokeWidth={1.8} />
      <path d="M-19 0 Q0 -17 19 0 Q0 17 -19 0Z" fill="#FFFFFF" stroke={I} strokeWidth={3.2} />
      <circle r={5.5} fill={I} />
    </>
  ),
  scales: (
    <>
      {head(-18, 14, 5.5, 4)}
      {head(-6, 5, 5.5, 4)}
      {head(6, -4, 5.5, 4)}
      {head(18, -13, 5.5, 4)}
    </>
  ),
  prog: (
    <text x={0} y={8} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={22} fill={I} direction="ltr">
      ii V I
    </text>
  ),
  improv: <path d="M-24 10 C-16 -20 -6 20 2 -2 S14 -18 18 -8 S24 4 20 8" {...sw} />,
  tempo: (
    <>
      <path d="M-13 17 L-5 -19 H5 L13 17Z" {...sw} strokeLinejoin="round" />
      <path d="M0 11 L10 -11" {...sw} />
    </>
  ),
  theory: <path d="M-6 -18V18M6 -20V16M-15 -4L15 -10M-15 10L15 4" {...sw} strokeWidth={4} />,
  keys: (
    <g {...sw} strokeWidth={3}>
      <rect x={-22} y={-12} width={44} height={26} rx={3} />
      <path d="M-11 -12v14M0 -12v14M11 -12v14" />
    </g>
  ),
  guitar: (
    <g {...sw}>
      <path d="M6 -18l12 12M12 -12 -4 4" />
      <circle cx={-10} cy={10} r={8} />
    </g>
  ),
  echo: (
    <g {...sw}>
      <path d="M-14 -10a14 14 0 0 1 0 20" />
      <path d="M-4 -16a22 22 0 0 1 0 32" />
      <path d="M6 -22a30 30 0 0 1 0 44" />
    </g>
  ),
  book: <path d="M-20 -14h16a4 4 0 0 1 4 4v24a4 4 0 0 0-4-4h-16zM20 -14H4a4 4 0 0 0-4 4v24a4 4 0 0 1 4-4h16z" {...sw} strokeWidth={3} strokeLinejoin="round" />,
  puzzle: <path d="M-16 -14h12a5 5 0 1 1 8 0h12v12a5 5 0 1 0 0 8v12h-32z" {...sw} strokeLinejoin="round" />,
  memory: (
    <g fill={I}>
      <rect x={-20} y={-14} width={14} height={14} rx={3} />
      <rect x={6} y={-14} width={14} height={14} rx={3} fill="none" stroke={I} strokeWidth={3} />
      <rect x={-20} y={6} width={14} height={14} rx={3} fill="none" stroke={I} strokeWidth={3} />
      <rect x={6} y={6} width={14} height={14} rx={3} />
    </g>
  ),
};
export type GlyphKind = keyof typeof GLYPHS;

/** A symbol inside a tilted note head. `shadow` adds the hard offset shadow used for big, tappable ones. */
export function Glyph({ kind, color = DOMAIN_COLOR.ear, size = 46, shadow = false, label }: { kind: GlyphKind; color?: string; size?: number; shadow?: boolean; label?: string }) {
  const h = Math.round(size * 0.78);
  return (
    <span className="glyph" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width={size} height={h} viewBox="0 0 120 94">
        {shadow && <ellipse cx={55} cy={51} rx={50} ry={36} transform="rotate(-14 55 51)" fill={I} />}
        <ellipse cx={60} cy={46} rx={50} ry={36} transform="rotate(-14 60 46)" fill={color} stroke={I} strokeWidth={size < 70 ? 6 : 3.5} />
        <g transform="translate(60 46)">{GLYPHS[kind]}</g>
      </svg>
    </span>
  );
}
