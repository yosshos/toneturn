// The Barry Harris way (docs/SPEC-RBI-ROTATION.md §6, track B; tiers from docs/research/CHORD-SCALE-ROTATION.md §5.3;
// BUILD-PLAN-2026-11 phase 8). The same lead sheet as the scale rotation, but over each chord a THOUGHT CHORD or a
// starting degree — never a mode name, never "half-whole" (Harris rejected mode thinking, Smithsonian oral history p.26).
//
// ONLY what docs/BARRY-HARRIS-THEORY.md holds as verified is used:
// - H1, the starting degree: the chord's scale down from the root, then the 3rd, the 5th, the 7th (§8 the dominant rule
//   from every degree, switched on; §11);
// - H2, the thought chord over V7: the chord itself, the important minor (the m6 on its 5th, Dm6 over G7) and the
//   tritone's minor (A♭m6 over G7, "the perfect altered scale") (§4 Harris's names, sourced);
// - H3, the conversion: ii is played as its V (§9 "ii is V"); ø as the dominant a major 3rd below (§9 "seven down to
//   the 3rd", switched on);
// - the 6-chord view: a major chord is its 6 chord (§5, §8 "6-chord tones 1 3 5 6"); a minor 7th that is not converted
//   is the 6 chord a minor 3rd up (§3 "Dm7 = F6"); the tonic minor is the m6 chord, its scale "as major with ♭3" (§8);
// - the grader: thought-chord tones on the beat; any half step off the beat that resolves is allowed (SPEC-RBI §6).
//
// LEFT OUT until the owner confirms (THEORY-QUESTIONS): H6 "3 to ♭9" as a line device (§12 still open), H7 the family
// movement inside one V and the full family + Fm6 / Bm6 over the V (not in BARRY-HARRIS-THEORY.md as Harris devices;
// Bm6 marked verify) — so tier H-5 (standards, H2 full family + H4 rule sets + H7) is not built, and H-4 has the
// conversion only (no 3-to-♭9). Pure.

import { parseChart, transposeChart } from './charts';
import { spansOfChart } from './ruleCards';
import { qualityOf, type Quality } from './rotation';
import { prettySym } from './rotationSheet';

type L = { en: string; he: string };
export type HarrisTier = 1 | 2 | 3 | 4;
export const HARRIS_TIERS: HarrisTier[] = [1, 2, 3, 4];

/** A thought chord: its root and kind (a dominant 7th, a minor 6th, a major 6th, the tonic minor 6th). */
export type ThoughtKind = 'dom7' | 'm6' | 'maj6' | 'min6';
export interface Thought {
  root: number;
  kind: ThoughtKind;
  /** Over a V: which of Harris's names (the plain dominant, the important minor, the tritone's minor). */
  name?: 'dominant' | 'important-minor' | 'tritone-minor';
}

const mod = (n: number) => ((n % 12) + 12) % 12;
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const TONES: Record<ThoughtKind, number[]> = { dom7: [0, 4, 7, 10], m6: [0, 3, 7, 9], maj6: [0, 4, 7, 9], min6: [0, 3, 7, 9] };

export const thoughtTones = (t: Thought): number[] => TONES[t.kind].map((x) => mod(t.root + x));
/**
 * The scale under a thought chord (for the off-beat notes): a dominant's 7 notes (1 2 3 4 5 6 ♭7, §8); a minor 6th
 * thought over a V is that dominant's 9th chord without the root (§3), so its scale is the dominant's (Dm6 → G, A♭m6 →
 * D♭); a major 6 → the major scale (§8); the tonic minor 6 → "as major, with ♭3" (§8).
 */
export function thoughtScale(t: Thought): number[] {
  if (t.kind === 'dom7') return [0, 2, 4, 5, 7, 9, 10].map((x) => mod(t.root + x));
  if (t.kind === 'm6') return [0, 2, 4, 5, 7, 9, 10].map((x) => mod(t.root + 5 + x));
  if (t.kind === 'maj6') return [0, 2, 4, 5, 7, 9, 11].map((x) => mod(t.root + x));
  return [0, 2, 3, 5, 7, 9, 11].map((x) => mod(t.root + x));
}
export const thoughtLabel = (t: Thought): string => `${FLAT[mod(t.root)]}${t.kind === 'dom7' ? '7' : t.kind === 'maj6' ? '6' : 'm6'}`;
export const thoughtName: Record<NonNullable<Thought['name']>, L> = {
  dominant: { en: 'the dominant itself', he: 'הדומיננטה עצמה' },
  'important-minor': { en: 'the important minor', he: 'המינור החשוב' },
  'tritone-minor': { en: "the tritone's minor", he: 'המינור של הטריטון' },
};

/** The starting degrees of H1, in their order (§8: from the root, then the 3rd, the 5th, the 7th). */
export const START_DEGREES = ['1', '3', '5', '7'] as const;
export type StartDeg = (typeof START_DEGREES)[number];
export const DEGREE_WORD: Record<StartDeg, L> = {
  '1': { en: 'from the root', he: 'מהשורש' },
  '3': { en: 'from the 3rd', he: 'מהטרצה' },
  '5': { en: 'from the 5th', he: 'מהקווינטה' },
  '7': { en: 'from the 7th', he: 'מהספטימה' },
};
/** The pitch class of a degree of a thought chord (its 7th: ♭7 of a dominant, the 6th standing for it on a 6 chord). */
export const degreePc = (t: Thought, d: StartDeg): number => thoughtTones(t)[START_DEGREES.indexOf(d)];

export interface TierDef {
  tier: HarrisTier;
  /** The progression in C (moved to the key of the day). */
  chart: string;
  choruses: number;
  /** Bars per rotation window (0 = nothing rotates). */
  every: number;
  title: L;
  how: L;
}
export const TIERS: Record<HarrisTier, TierDef> = {
  1: { tier: 1, chart: 'G7 | G7 | G7 | G7 | G7 | G7 | G7 | G7', choruses: 2, every: 4, title: { en: 'One dominant: the starting degree', he: 'דומיננטה אחת: צליל הפתיחה' }, how: { en: 'Over the dominant, run its scale down with the half-step rules — from the root, then from the 3rd, the 5th and the 7th, every 4 bars. Chord tones on the beat.', he: 'מעל הדומיננטה, הסולם שלה כלפי מטה עם חוקי חצי הטון — מהשורש, אחר כך מהטרצה, מהקווינטה ומהספטימה, כל 4 תיבות. צלילי האקורד על הפעמה.' } },
  2: { tier: 2, chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', choruses: 4, every: 4, title: { en: 'ii–V–I: ii is V', he: 'ii–V–I: ה־ii הוא ה־V' }, how: { en: 'Play the ii as its V (one sound over both bars), the I as its 6 chord. Each chorus starts from another degree.', he: 'נגנו את ה־ii כמו ה־V שלו (צליל אחד על שתי התיבות), ואת ה־I כאקורד ה־6 שלו. כל כורוס מתחיל מצליל אחר.' } },
  3: { tier: 3, chart: 'Dm7 | G7 | Cmaj7 | Cmaj7 | Cmaj7 Am7 | Dm7 G7 | Cmaj7 Am7 | Dm7 G7', choruses: 3, every: 8, title: { en: 'The V: the important minor, the tritone’s minor', he: 'ה־V: המינור החשוב, המינור של הטריטון' }, how: { en: 'Over the V think another chord every 8 bars: the dominant itself, the important minor (the m6 on its 5th), the tritone’s minor. Play its notes on the beat.', he: 'מעל ה־V חשבו אקורד אחר כל 8 תיבות: הדומיננטה עצמה, המינור החשוב (ה־m6 על הקווינטה שלה), המינור של הטריטון. נגנו את הצלילים שלו על הפעמה.' } },
  4: { tier: 4, chart: 'Dm7b5 | G7 | Cm6 | Cm6', choruses: 4, every: 0, title: { en: 'Minor ii–V–i: seven down to the 3rd', he: 'ii–V–i מינורי: שבע למטה אל הטרצה' }, how: { en: 'Over the half-diminished play the dominant a major 3rd below, up and down, and land on the 3rd of the V. The i is its m6 chord.', he: 'מעל החצי־מוקטן נגנו את הדומיננטה טרצה גדולה מתחת, למעלה ולמטה, ונחתו על הטרצה של ה־V. ה־i הוא אקורד ה־m6 שלו.' } },
};

export interface HarrisCell {
  at: number;
  beats: number;
  chorus: number;
  bar: number;
  sym: string;
  /** The written chord. */
  root: number;
  iv: number[];
  q: Quality;
  think: Thought;
  /** The rotation window this cell is in. */
  window: number;
  /** H1: the degree the line starts from (on the first cell of a window). */
  start?: StartDeg;
}
export interface HarrisSheet {
  tier: HarrisTier;
  tonic: number;
  meter: number;
  bars: number;
  choruses: number;
  cells: HarrisCell[];
}

/**
 * The sheet for a tier in a key: the thought chord over every span by the tier's rules, the starting degree on each
 * window (H-1, H-2), the V's thought rotating every 8 bars (H-3: the dominant, the important minor, the tritone's minor).
 */
export function buildHarrisSheet(tier: HarrisTier, key: number, meter = 4): HarrisSheet {
  const def = TIERS[tier];
  const text = mod(key) ? transposeChart(def.chart, mod(key)) : def.chart;
  const p = parseChart(text, meter);
  const bars = p.bars;
  const spans = spansOfChart(p, meter, bars);
  const cells: HarrisCell[] = [];
  const winBeats = (def.every || bars * def.choruses) * meter;
  const V_ROT: Thought['name'][] = ['dominant', 'important-minor', 'tritone-minor'];
  for (let c = 0; c < def.choruses; c++)
    spans.forEach((s, i) => {
      const at = c * bars * meter + s.at;
      const q = qualityOf(s.iv);
      const next = spans[i + 1] ?? spans[0];
      const nq = qualityOf(next.iv);
      const window = Math.floor(at / winBeats + 1e-6);
      let think: Thought;
      if (q === 'dom') {
        const name = tier === 3 ? V_ROT[window % V_ROT.length]! : 'dominant';
        think = name === 'important-minor' ? { root: mod(s.root + 7), kind: 'm6', name } : name === 'tritone-minor' ? { root: mod(s.root + 1), kind: 'm6', name } : { root: s.root, kind: 'dom7', name };
      } else if (q === 'm7' && tier >= 2 && nq === 'dom' && mod(next.root - s.root) === 5) think = { root: next.root, kind: 'dom7', name: 'dominant' };
      else if (q === 'm7') think = { root: mod(s.root + 3), kind: 'maj6' };
      else if (q === 'hd7') think = { root: mod(s.root - 4), kind: 'dom7' };
      else if (q === 'mtonic') think = { root: s.root, kind: 'min6' };
      else think = { root: s.root, kind: q === 'maj' ? 'maj6' : 'dom7' };
      const sym = prettySym(p.chords.find((x) => x.bar * meter + x.at === s.at)?.sym ?? text.split('|')[Math.floor(s.at / meter)]?.trim() ?? '');
      const first = !cells.length || cells[cells.length - 1].window !== window;
      const start: StartDeg | undefined = (tier === 1 || tier === 2) && first ? START_DEGREES[window % START_DEGREES.length] : undefined;
      cells.push({ at, beats: s.beats, chorus: c, bar: Math.floor(s.at / meter + 1e-6), sym, root: s.root, iv: s.iv, q, think, window, ...(start ? { start } : {}) });
    });
  return { tier, tonic: mod(key), meter, bars, choruses: def.choruses, cells };
}

export const harrisCellAt = (sh: HarrisSheet, beat: number): number => {
  if (beat < 0) return -1;
  for (let i = sh.cells.length - 1; i >= 0; i--) if (beat >= sh.cells[i].at - 1e-6) return beat < sh.cells[i].at + sh.cells[i].beats ? i : -1;
  return -1;
};

export interface HNote {
  beat: number;
  dur: number;
  midi: number;
}
export interface HarrisGrade {
  /** On-beat notes that are tones of the thought chord ÷ on-beat notes. */
  onBeat: number;
  /** Off-beat notes in the thought chord's scale, or a half step that resolves ÷ off-beat notes. */
  offBeat: number;
  /** Spans whose thought differs from the written chord: those where an identity note was played ÷ such spans with notes. */
  identity: number | null;
  /** H-1 / H-2: windows whose first note is the asked degree ÷ windows with notes. */
  start: number | null;
  /** H-4: ø → V pairs whose first note over the V is its 3rd ÷ such pairs with notes. */
  landing: number | null;
  score: number;
  /** Per cell: an identity note / the start degree hit (true / false), null where nothing was asked or played. */
  hits: (boolean | null)[];
  notes: number;
}

/** The notes that make a thought chord audible over the written one (A♭m6 over G7: A♭ and E♭ — its C♭ is G's 3rd). */
export const identityPcs = (c: Pick<HarrisCell, 'root' | 'iv' | 'think'>): number[] => {
  const written = new Set(c.iv.map((x) => mod(c.root + x)));
  return thoughtTones(c.think).filter((p) => !written.has(p));
};

export function gradeHarris(sh: HarrisSheet, notes: HNote[]): HarrisGrade {
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  const cellOf = (b: number) => harrisCellAt(sh, b);
  let on = 0, onOk = 0, off = 0, offOk = 0;
  ns.forEach((n, i) => {
    const frac = n.beat - Math.round(n.beat);
    const onBeat = Math.abs(frac) < 0.15;
    // an anticipation an eighth early belongs to the next chord
    let k = cellOf(Math.round(n.beat) > n.beat && onBeat ? Math.round(n.beat) : n.beat);
    const k2 = cellOf(n.beat + 0.5);
    if (k < 0) k = k2;
    if (k < 0) return;
    const c = sh.cells[k];
    const pc = mod(n.midi);
    const tones = thoughtTones(c.think);
    if (onBeat) {
      on++;
      if (tones.includes(pc) || (k2 >= 0 && k2 !== k && thoughtTones(sh.cells[k2].think).includes(pc))) onOk++;
    } else {
      off++;
      const nx = ns[i + 1];
      if (thoughtScale(c.think).includes(pc) || tones.includes(pc) || (nx && Math.abs(nx.midi - n.midi) === 1)) offOk++;
    }
  });
  const inCell = (k: number) => ns.filter((n) => n.beat >= sh.cells[k].at - 1e-6 && n.beat < sh.cells[k].at + sh.cells[k].beats - 1e-6);
  const hits: (boolean | null)[] = sh.cells.map(() => null);
  // identity
  let idN = 0, idHit = 0;
  sh.cells.forEach((c, k) => {
    const id = identityPcs(c);
    if (!id.length || c.beats < 2) return;
    const xs = inCell(k);
    if (!xs.length) return;
    idN++;
    const h = xs.some((n) => id.includes(mod(n.midi)));
    if (h) idHit++;
    hits[k] = h;
  });
  // the starting degree
  let stN = 0, stHit = 0;
  const windows = [...new Set(sh.cells.map((c) => c.window))];
  for (const w of windows) {
    const ks = sh.cells.map((c, k) => (c.window === w ? k : -1)).filter((k) => k >= 0);
    const first = sh.cells[ks[0]];
    if (!first.start) continue;
    const from = first.at, to = sh.cells[ks[ks.length - 1]].at + sh.cells[ks[ks.length - 1]].beats;
    const n = ns.find((x) => x.beat >= from - 0.25 && x.beat < to);
    if (!n) continue;
    stN++;
    const h = mod(n.midi) === degreePc(first.think, first.start);
    if (h) stHit++;
    hits[ks[0]] = h;
  }
  // H-4: landing on the V's 3rd after the half-diminished
  let laN = 0, laHit = 0;
  if (sh.tier === 4)
    sh.cells.forEach((c, k) => {
      const prev = sh.cells[k - 1];
      if (c.q !== 'dom' || !prev || prev.q !== 'hd7') return;
      const n = inCell(k)[0];
      if (!n) return;
      laN++;
      const h = mod(n.midi) === mod(c.root + 4);
      if (h) laHit++;
      hits[k] = h;
    });
  const r = (a: number, b: number) => (b ? a / b : 0);
  const identity = idN ? r(idHit, idN) : null;
  const start = stN ? r(stHit, stN) : null;
  const landing = laN ? r(laHit, laN) : null;
  const parts = [r(onOk, on), r(offOk, off), identity, start, landing].filter((x, i): x is number => x !== null && (i > 1 || (i === 0 ? on > 0 : off > 0)));
  const score = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  return { onBeat: r(onOk, on), offBeat: r(offOk, off), identity, start, landing, score, hits, notes: ns.length };
}

/** The tier the player starts at: what they chose, else from the rotation tier (T1 → H-1 … T3 → H-3). */
export const harrisTierOf = (rbi: number, chosen?: number | null): HarrisTier => (chosen && chosen >= 1 && chosen <= 4 ? (chosen as HarrisTier) : (Math.max(1, Math.min(3, rbi)) as HarrisTier));
