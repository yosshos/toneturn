// The app's brand mark as a component (owner, 2026-11-17: the "Paper" logo). Geometry: ./mark.ts.

import { COMPACT, compactAt, MARK, PALETTES, barLine, type MarkVariant } from './mark';

const H = MARK.head;

/** The 7 + note head (one colour), optionally shifted down (the paper edge). */
export function SevenShape({ color, stroke = MARK.stroke, dy = 0 }: { color: string; stroke?: number; dy?: number }) {
  return (
    <g transform={dy ? `translate(0 ${dy})` : undefined}>
      <path d={MARK.top} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <path d={MARK.stem} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <ellipse cx={H.cx} cy={H.cy} rx={H.rx} ry={H.ry} transform={`rotate(${H.rotate} ${H.cx} ${H.cy})`} fill={color} />
    </g>
  );
}

/** The three sound bars (one colour). */
export function BarsShape({ color, stroke = MARK.barStroke, dy = 0 }: { color: string; stroke?: number; dy?: number }) {
  return (
    <g>
      {MARK.bars.map((b) => {
        const l = barLine(b, dy);
        return <line key={l.x} x1={l.x} y1={l.y1} x2={l.x} y2={l.y2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />;
      })}
    </g>
  );
}

export interface LogoProps {
  /** Rendered size in px (square). */
  size?: number;
  /** 'paper' (the approved mark, dark tile) or 'light' (only on light surfaces that need it). */
  variant?: MarkVariant;
  /** Draw the rounded tile behind the mark (default). Without it the mark sits on the surface. */
  tile?: boolean;
  /** An accessible name; without it the mark is decorative (aria-hidden). */
  title?: string;
  className?: string;
}

/** The brand mark. Small sizes (≤ 24 px) drop the edge copies and thicken the strokes so it still reads. */
export function Logo({ size = 44, variant = 'paper', tile = true, title, className }: LogoProps) {
  const p = PALETTES[variant];
  const compact = size <= compactAt;
  const sw = compact ? COMPACT.stroke : MARK.stroke;
  const bw = compact ? COMPACT.barStroke : MARK.barStroke;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`brand-logo${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`}
      data-logo={variant}
      {...a11y}
    >
      {tile && <rect width="120" height="120" rx={MARK.radius} fill={p.bg} />}
      <g transform={compact ? `translate(60 60) scale(${COMPACT.scale}) translate(-60 -60)` : undefined}>
        {!compact && <BarsShape color={p.barsEdge} dy={MARK.barEdgeDy} />}
        <BarsShape color={p.bars} stroke={bw} />
        {!compact && <SevenShape color={p.edge} dy={MARK.edgeDy} />}
        <SevenShape color={p.fill} stroke={sw} />
      </g>
    </svg>
  );
}
