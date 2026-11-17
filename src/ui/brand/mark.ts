// The brand mark (owner, 2026-11-17: the "Paper" logo): a yellow 7 whose stem falls into a tilted note head (an
// eighth note), three lilac sound bars on its left, on a dark purple rounded square. 120 grid. One source of truth for
// the in-app Logo, the splash and public/icon.svg (scripts/render-brand.mjs writes the static files from these numbers).

export const MARK = {
  /** The 7's curved top bar. */
  top: 'M33 33 C47 24 72 22 87 31',
  /** The stem, falling into the note head. */
  stem: 'M87 31 C77 51 68 68 62 82',
  head: { cx: 51, cy: 87, rx: 15.5, ry: 11, rotate: -22 },
  /** Sound bars: [x, height], centred on y = 66. */
  bars: [
    [13, 12],
    [22.5, 28],
    [32, 17],
  ] as const,
  barY: 66,
  stroke: 13,
  barStroke: 6.5,
  /** The "paper" edge: a darker copy just below each layer. */
  edgeDy: 3.2,
  barEdgeDy: 2.6,
  radius: 26,
} as const;

export interface MarkPalette {
  bg: string;
  fill: string;
  edge: string;
  bars: string;
  barsEdge: string;
}

export const PALETTES = {
  /** The approved mark: on dark purple. */
  paper: { bg: '#2b0d5e', fill: '#ffd43b', edge: '#c98a00', bars: '#c4b5fd', barsEdge: '#7c4ddb' },
  /** Only where a light surface needs it. */
  light: { bg: '#f3ecff', fill: '#6d28d9', edge: '#3b1585', bars: '#12c9b4', barsEdge: '#0b8a7c' },
} as const satisfies Record<string, MarkPalette>;

export type MarkVariant = keyof typeof PALETTES;

/** The bar segment [x, y1, y2] for one sound bar. */
export const barLine = ([x, h]: readonly [number, number], dy = 0) => ({ x, y1: MARK.barY - h / 2 + dy, y2: MARK.barY + h / 2 + dy });

/**
 * At small sizes (≤ 24 px) thin details turn to mush: the edge copies go, the strokes get heavier and the mark grows
 * a little inside the tile (checked at 16 / 29 / 48 px, docs/brand-shots/).
 */
export const compactAt = 24;
export const COMPACT = { stroke: 15.5, barStroke: 7.5, scale: 1.08 } as const;
