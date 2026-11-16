// The one renderer of the Paper icon language (see kit.ts). Every glyph, badge face, course and nav icon goes through
// paperParts(): sheets get their edge copy 1.9 units below, strokes get their tone, and all colour comes from CSS
// variables so the same drawing re-tones per theme / surface (src/paper.css): light cards, dark cards, the dark bar,
// and the two filled surfaces (lemon "now", purple "done").
import { createElement, type CSSProperties, type ReactNode } from 'react';
import { HUES, TONE_KEYS, tones, type Art, type Cut, type Part, type Role } from './kit';
import '../../paper.css';

const SOLID: Partial<Record<Role, [string, string]>> = {
  body: ['b', 'bE'],
  accent: ['a', 'aE'],
  light: ['l', 'lE'],
  ink: ['d', 'dE'],
  mark: ['f', 'fE'],
};
const STROKE: Partial<Record<Role, [string, number]>> = {
  line: ['d', 1.3],
  inkline: ['d', 2],
  wire: ['f', 2],
  accentline: ['a', 2.2],
  tube: ['b', 6],
  dash: ['l', 1.4],
  shine: ['l', 1.2],
};
/** A tone as a CSS value: the surface's variable, falling back to the icon's own light-surface value. */
export const tv = (k: string) => `var(--p${k}, var(--${k}))`;

const TEXT = { fontFamily: "'Secular One', Rubik, 'Noto Music', sans-serif", textAnchor: 'middle', direction: 'ltr' } as const;

/** The drawing's parts with the Paper treatment applied, for the given cut. */
export function paperParts(art: Art, cut: Cut = 'full', keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = [];
  const maxLod = cut === 'small' ? 0 : cut === 'full' ? 1 : 2;
  const edge = cut === 'small' ? 2.2 : 1.9;
  const bump = cut === 'small' ? 0.5 : 0;
  art.parts.forEach((p: Part, i) => {
    if ((p.lod ?? 0) > maxLod) return;
    const k = `${keyPrefix}${i}`;
    const base = p.t === 'text' ? { ...TEXT, ...p.a } : p.a;
    const solid = SOLID[p.role];
    if (solid) {
      const [f, e] = solid;
      // Letters get a thinner edge (none in the small cut) so they stay crisp.
      const dy = p.t === 'text' ? (cut === 'small' ? 0 : 0.9) : edge;
      if (dy) out.push(createElement(p.t, { key: `${k}e`, ...base, transform: shift(p.a.transform, dy), style: { fill: tv(e) } }, p.text));
      out.push(createElement(p.t, { key: k, ...base, style: { fill: tv(f) } }, p.text));
      return;
    }
    const st = STROKE[p.role];
    if (!st) return;
    const [tone, w0] = st;
    const w = (p.w ?? w0) + (p.role === 'accentline' ? 0.6 : p.role === 'line' ? 0.2 : 0) + bump;
    const common = { fill: 'none', strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (p.role === 'tube') out.push(createElement(p.t, { key: `${k}e`, ...base, ...common, transform: shift(p.a.transform, edge), style: { stroke: tv('bE') } }));
    out.push(createElement(p.t, { key: k, ...base, ...common, ...(p.role === 'dash' ? { strokeDasharray: '2.6 3' } : {}), style: { stroke: tv(tone) } }));
  });
  return out;
}
/** Prepend a downward translate to an existing transform (edges sit below their sheet). */
const shift = (tr: string | number | undefined, dy: number) => (tr ? `translate(0 ${dy}) ${tr}` : `translate(0 ${dy})`);

/** The CSS variables of one icon: its light-surface tones (--b …) and dark-surface tones (--kb …). */
export function paperVars(art: Pick<Art, 'hue' | 'hue2'>): CSSProperties {
  const L = tones(HUES[art.hue], HUES[art.hue2], 'light');
  const K = tones(HUES[art.hue], HUES[art.hue2], 'dark');
  // No inherited outline / fill from the surroundings (some wrappers style `svg { stroke: currentColor }`).
  const v: Record<string, string> = { stroke: 'none', fill: 'none' };
  for (const k of TONE_KEYS) {
    v[`--${k}`] = L[k];
    v[`--k${k}`] = K[k];
  }
  return v as CSSProperties;
}

export interface PaperSvgProps {
  art: Art;
  cut?: Cut;
  width?: number;
  height?: number;
  className?: string;
  /** Accessible name; without it the icon is decorative. */
  label?: string;
}
/** One Paper icon as an <svg> on the 48 grid. */
export function PaperSvg({ art, cut = 'full', width = 48, height, className, label }: PaperSvgProps) {
  return (
    <svg
      className={`pp pp-${cut}${className ? ` ${className}` : ''}`}
      viewBox="0 0 48 48"
      width={width}
      height={height ?? width}
      style={paperVars(art)}
      overflow="visible"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' })}
    >
      {paperParts(art, cut)}
    </svg>
  );
}
/** The cut for a rendered size: the simplified drawing at ≤ 24 px, the badge detail at ≥ 64 px. */
export const cutFor = (px: number): Cut => (px <= 24 ? 'small' : px >= 64 ? 'badge' : 'full');
