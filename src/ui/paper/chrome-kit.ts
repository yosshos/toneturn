// Builders for the Paper chrome cut (art-chrome*.ts), on the 48 grid.
import { E, L, P, type Part } from './kit';

/** A thick strip of paper (chevrons, crosses, arcs): a stroke with its own edge. */
export const S = (d: string, w = 6.5): Part => P(d, 'tube', w);
export const SL = (x1: number, y1: number, x2: number, y2: number, w = 6.5): Part => L(x1, y1, x2, y2, 'tube', w);
/** A cut-out line in the surface colour. */
export const cut = (d: string, w = 2.6): Part => P(d, 'line', w);
/** The motif: a tilted (−20°) note head as a sheet. */
export const head = (cx: number, cy: number, s: number, role: 'body' | 'accent' = 'body'): Part => E(cx, cy, s, +(s * 0.74).toFixed(2), -20, role);

/** A rounded play-style triangle from x0 (its flat side) to x1 (its point), between y0 and y1. */
export const tri = (x0: number, x1: number, y0 = 9.5, y1 = 34.5) => {
  const ym = (y0 + y1) / 2;
  const dir = Math.sign(x1 - x0);
  return `M${x0} ${y0 + 2.6} Q${x0} ${y0} ${x0 + 2.2 * dir} ${y0 + 1.3} L${x1 - 1.6 * dir} ${ym - 1.1} Q${x1} ${ym} ${x1 - 1.6 * dir} ${ym + 1.1} L${x0 + 2.2 * dir} ${y1 - 1.3} Q${x0} ${y1} ${x0} ${y1 - 2.6} Z`;
};
