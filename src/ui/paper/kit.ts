// The "Paper" (׳ ׳™׳™׳¨) icon language (owner's choice, docs/icon-language-directions.html): no outlines ג€” every solid shape
// is a flat sheet with a darker edge copy ~1.9 units below it (paper thickness); one hue per icon in tones (body, light
// tint, deep details) plus one accent hue; the tilted גˆ’20ֲ° note head recurs as the motif. Everything is drawn on a 48
// grid as data (parts with roles); src/ui/paper/Paper.tsx is the one renderer that applies the treatment.
//
// Roles
//   body        sheet in the icon hue                         accent      sheet in the second hue
//   light       sheet in the light tint (hue + 78 % white)    ink         sheet in the deep tone (hue + 45 % ink), on a sheet
//   mark        a small solid sitting on the background (deep on light cards, lifted on dark ones)
//   line        thin deep stroke on a sheet (w ג‰ˆ 1.2)         inkline     a deep stroke on a sheet (w ג‰ˆ 2)
//   wire        a stroke over the background (deep on light, lifted on dark)
//   accentline  a stroke in the accent hue                    tube        a thick body-hue stroke with its own edge
//   dash        a dashed light stroke (paths, guides)        shine       a light-tint stroke (a highlight on a sheet)
// Level of detail (lod): 0 always ֲ· 1 full and badge cuts only (dropped in the ג‰₪ 24 px cut) ֲ· 2 badge cut only (ג‰¥ 64 px).

export type Role = 'body' | 'accent' | 'light' | 'ink' | 'mark' | 'line' | 'inkline' | 'wire' | 'accentline' | 'tube' | 'dash' | 'shine';
export type Shape = 'ellipse' | 'rect' | 'path' | 'circle' | 'line' | 'text' | 'polygon';
export interface Part {
  t: Shape;
  a: Record<string, string | number>;
  role: Role;
  /** Stroke width for stroke roles. */
  w?: number;
  /** Level of detail: 0 always, 1 dropped in the small cut, 2 badge cut only. */
  lod?: 0 | 1 | 2;
  /** Text content (t: 'text'). */
  text?: string;
  /** Its motion when the icon plays (on tap / on a progress event); see an() and src/ui/paper/motion.ts. */
  m?: Motion;
}
/**
 * The motion vocabulary (src/paper-motion.css). Every motion is a transform / opacity of the part's own group, short
 * (400–900 ms), small, eased without bounce. An icon without tagged parts plays the default "lift" (its sheets rise off
 * their edges and settle).
 *   vibrate / vibrate-x  a string trembling across its length (y / x), decaying     swing   a pendulum about its pivot
 *   flicker  a flame stretching and settling (origin: bottom)                        rise    a little note rising and fading (fx)
 *   pulse    a sound wave pushing out from its source and back                         spin    a full turn (reels, records)
 *   turn     a hand / dial turning a notch and back                                    press   a key going down and up
 *   strike   a stick lifting and striking (about its grip)                             dip     a drumhead giving under the stroke
 *   wave     a flag rippling from its pole                                             loop    the note travelling between the repeat signs
 *   nod      a note head tipping on its stem                                           hop     a part hopping up once
 *   slide    a fader sliding up and back
 */
export type Anim = 'vibrate' | 'vibrate-x' | 'swing' | 'flicker' | 'rise' | 'pulse' | 'spin' | 'turn' | 'press' | 'strike' | 'dip' | 'wave' | 'loop' | 'nod' | 'hop' | 'slide';
export interface Motion {
  k: Anim;
  /** The origin on the 48 grid (a pivot, a grip, a source). Without it: the part's own box (centre; bottom for flicker). */
  o?: [number, number];
  /** Start later, in steps of 80 ms (a stagger: waves one after another, two sticks, notes rising in turn). */
  d?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Mirror the direction (the second stick, a swing starting the other way). */
  r?: boolean;
  /** Only seen while playing (a note rising out of a microphone): invisible at rest, so the static drawing is unchanged. */
  fx?: boolean;
}
export type HueName = 'teal' | 'sky' | 'purple' | 'lilac' | 'pink' | 'tan' | 'green' | 'rose' | 'indigo' | 'slate';
export interface Art {
  hue: HueName;
  hue2: HueName;
  parts: Part[];
}
export type Cut = 'small' | 'full' | 'badge';

// ---------------------------------------------------------------- colour
export const INK = '#1e1033';
export const WHITE = '#ffffff';
/** The app's palette (v2 tokens). No lemon: it never carries an icon (owner contrast rule). */
export const HUES: Record<HueName, string> = {
  teal: '#12c9b4',
  sky: '#3ab8ff',
  purple: '#6d28d9',
  lilac: '#a78bfa',
  pink: '#ff5fa2',
  tan: '#ff8a3d',
  green: '#3cc475',
  rose: '#e8467c',
  indigo: '#4f5fd8',
  slate: '#7d8199',
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const ch = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
export const lum = (h: string) => {
  const [r, g, b] = hex(h);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
export const contrast = (a: string, b: string) => {
  const A = lum(a);
  const B = lum(b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};
/** The owner's lemon / pale-yellow test (scripts/yellow.mjs). */
export const isYellow = (h: string) => {
  const [r, g, b] = hex(h);
  return r > 225 && g > 190 && b < 200 && r - b > 60;
};
/** A hue lifted until it reads on the dark cards (#241540) and the dark bar (#07030f): luminance ג‰¥ 0.2. */
export const lift = (h: string) => {
  let t = 0;
  let c = h;
  while (lum(c) < 0.2 && t < 0.9) {
    t += 0.05;
    c = mix(h, WHITE, t);
  }
  return c;
};

/** The ten tones of one icon. Keys are the CSS variable suffixes the renderer paints with. */
export interface Tones {
  b: string; // body
  bE: string; // body edge
  a: string; // accent
  aE: string;
  l: string; // light tint
  lE: string;
  d: string; // deep (details on sheets)
  dE: string;
  f: string; // free: marks and wires over the background
  fE: string;
}
export function tones(hue: string, hue2: string, mode: 'light' | 'dark'): Tones {
  const H = mode === 'dark' ? lift(hue) : hue;
  const A = mode === 'dark' ? lift(hue2) : hue2;
  const d = mix(hue, INK, 0.45);
  const f = mode === 'dark' ? mix(hue, WHITE, 0.5) : d;
  return {
    b: H,
    bE: mix(H, INK, 0.3),
    a: A,
    aE: mix(A, INK, 0.3),
    l: mix(hue, WHITE, 0.78),
    lE: mix(hue, WHITE, 0.4),
    d,
    dE: mix(d, INK, 0.4),
    f,
    fE: mix(f, INK, 0.35),
  };
}
export const TONE_KEYS: (keyof Tones)[] = ['b', 'bE', 'a', 'aE', 'l', 'lE', 'd', 'dE', 'f', 'fE'];

// ---------------------------------------------------------------- builders (48 grid)
const r2 = (n: number) => Math.round(n * 100) / 100;
export const E = (cx: number, cy: number, rx: number, ry: number, rot: number, role: Role, lod?: 0 | 1 | 2): Part => ({
  t: 'ellipse',
  a: rot ? { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})` } : { cx, cy, rx, ry },
  role,
  lod,
});
export const R = (x: number, y: number, w: number, h: number, rx: number, role: Role, tr?: string, lod?: 0 | 1 | 2): Part => ({
  t: 'rect',
  a: { x, y, width: w, height: h, rx, ...(tr ? { transform: tr } : {}) },
  role,
  lod,
});
export const P = (d: string, role: Role, w?: number, lod?: 0 | 1 | 2): Part => ({ t: 'path', a: { d }, role, w, lod });
export const Ci = (cx: number, cy: number, r: number, role: Role, lod?: 0 | 1 | 2): Part => ({ t: 'circle', a: { cx, cy, r }, role, lod });
export const L = (x1: number, y1: number, x2: number, y2: number, role: Role = 'line', w?: number, lod?: 0 | 1 | 2): Part => ({ t: 'line', a: { x1, y1, x2, y2 }, role, w, lod });
/** Text drawn as a paper cut-out (Secular One). `fit` squeezes it into that width. */
export const T = (x: number, y: number, text: string, size: number, role: Role, fit?: number, lod?: 0 | 1 | 2): Part => ({
  t: 'text',
  a: { x, y, fontSize: size, ...(fit ? { textLength: fit, lengthAdjust: 'spacingAndGlyphs' } : {}) },
  role,
  text,
  lod,
});
/** The motif: the app's tilted note head (גˆ’20ֲ°). s = half width. */
export const H = (cx: number, cy: number, s: number, role: Role = 'ink', lod?: 0 | 1 | 2): Part => E(cx, cy, r2(s), r2(s * 0.72), -20, role, lod);
/** A note: tilted head + a stem going up from its right side (stem in the deep tone). */
export const N = (cx: number, cy: number, s: number, stem: number, role: Role = 'ink', w = 1.8, lod?: 0 | 1 | 2): Part[] => [
  H(cx, cy, s, role, lod),
  L(r2(cx + s * 0.9), r2(cy - s * 0.25), r2(cx + s * 0.9), r2(cy - s * 0.25 - stem), 'inkline', w, lod),
];
/** Mark parts as detail (dropped ג‰₪ 24 px) or badge-only. */
export const det = (...ps: (Part | Part[])[]): Part[] => ps.flat().map((p) => ({ ...p, lod: 1 as const }));
export const rich = (...ps: (Part | Part[])[]): Part[] => ps.flat().map((p) => ({ ...p, lod: 2 as const }));
/** A gear / star outline path. */
export const gear = (cx: number, cy: number, r1: number, r2_: number, n: number, rot = 0) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a0 = rot + (i / (n * 2)) * Math.PI * 2;
    const a1 = rot + ((i + 1) / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? r1 : r2_;
    const p = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
    d += (i ? 'L' : 'M') + p(a0 + 0.06, r) + 'L' + p(a1 - 0.06, r);
  }
  return d + 'Z';
};
export const star = (cx: number, cy: number, r: number, inner = 0.45, n = 5) => {
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r * inner : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join(' L')} Z`;
};
/** Tag parts with a motion: an('swing', { o: [24, 36] }, rod, weight). */
export const an = (k: Anim, opt: Omit<Motion, 'k'>, ...ps: (Part | Part[])[]): Part[] => ps.flat().map((p) => ({ ...p, m: { k, ...opt } }));
export const art = (hue: HueName, hue2: HueName, ...parts: (Part | Part[])[]): Art => ({ hue, hue2, parts: parts.flat() });

/** The size of a short music mark ("7/8", "iiג€“V", "R1") on the 48 grid, by its length. */
export const markSize = (text: string) => {
  const n = Array.from(text).length;
  return n <= 1 ? 28 : n === 2 ? 24 : n === 3 ? 20 : n === 4 ? 17 : 15;
};
/**
 * A short music mark as a paper plaque: a light sheet with a folded corner, the text cut from the deep tone, a note head
 * in the accent. `extra` adds drawn parts on top.
 */
export const markParts = (text: string, extra: Part[] = []): Part[] => {
  const n = Array.from(text).length;
  const size = markSize(text);
  const fit = n >= 4 ? 37 : undefined;
  return [
    P('M3 12 Q3 8 7 8 L38 8 L45 15 L45 37 Q45 41 41 41 L7 41 Q3 41 3 37 Z', 'light'),
    P('M38 8 L38 15 L45 15 Z', 'body'),
    T(24, r2(24.5 + size * 0.36), text, size, 'ink', fit),
    H(8.5, 41.5, 3.6, 'accent'),
    ...rich(L(8, 13, 30, 13, 'line', 0.7), L(8, 36.5, 40, 36.5, 'line', 0.7)),
    ...extra,
  ];
};
export const markArt = (text: string, hue: HueName = 'lilac', hue2: HueName = 'purple', extra: Part[] = []): Art => ({ hue, hue2, parts: markParts(text, extra) });
