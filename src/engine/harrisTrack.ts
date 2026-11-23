// The Barry Harris way (docs/SPEC-RBI-ROTATION.md §6, track B; tiers from docs/research/CHORD-SCALE-ROTATION.md §5.3;
// BUILD-PLAN-2026-11 phase 8). The same lead sheet as the scale rotation, but over each chord a THOUGHT CHORD or a
// starting degree — never a mode name, never "half-whole" (Harris rejected mode thinking, Smithsonian oral history p.26).
//
// ONLY what docs/BARRY-HARRIS-THEORY.md holds as verified is used:
// - H1, the starting degree: the chord's scale down from the root, then the 3rd, the 5th, the 7th (§8 the dominant rule
//   from every degree, switched on; §11);
// - H2, the thought chord over V7: the chord itself, the important minor (the m6 on its 5th, Dm6 over G7) and the
//   tritone's minor (A♭m6 over G7, "the perfect altered scale") (§4 Harris's names, sourced); at H-5 only, now and then,
//   the backdoor's minor (the m6 on the ♭VII7's 5th, F over G7) and the ♭9 relative's minor (the m6 a major 3rd above,
//   B over G7, shown with "when the bass moves to E") — owner 2026-11-23: "rare but valid", so low weight, never the
//   default, never the first window;
// - H3, the conversion: ii is played as its V (§9 "ii is V"); ø as the dominant a major 3rd below (§9 "seven down to
//   the 3rd", switched on);
// - H4, the rule sets at H-5: the half-step rules (§8), the triplet rules (§8), Barry's chromatic scale (§9, switched on);
// - H6, 3 to ♭9 (§9: the dim on the 3rd, shared by the four related dominants; owner-confirmed 2026-11-23): at H-4 on the
//   V after the conversion, at H-5 as one of the rules;
// - the 6-chord view: a major chord is its 6 chord (§5, §8 "6-chord tones 1 3 5 6"); a minor 7th that is not converted
//   is the 6 chord a minor 3rd up (§3 "Dm7 = F6"); the tonic minor is the m6 chord, its scale "as major with ♭3" (§8);
// - the grader: thought-chord tones on the beat; any half step off the beat that resolves is allowed (SPEC-RBI §6).
//
// LEFT OUT: H7, the family movement inside one V (G7 B♭7 D♭7 E7 within one bar of G7) — owner 2026-11-23: he does not
// know it and finds it too dense in one bar. H-5 (a standard: How High the Moon's checked changes) is built without it.
// Pure.

import { parseChart, transposeChart } from './charts';
import { spansOfChart } from './ruleCards';
import { qualityOf, type Quality } from './rotation';
import { prettySym } from './rotationSheet';
import { TUNE_CHARTS } from './harrisLines';

type L = { en: string; he: string };
export type HarrisTier = 1 | 2 | 3 | 4 | 5;
export const HARRIS_TIERS: HarrisTier[] = [1, 2, 3, 4, 5];

/** A thought chord: its root and kind (a dominant 7th, a minor 6th, a major 6th, the tonic minor 6th). */
export type ThoughtKind = 'dom7' | 'm6' | 'maj6' | 'min6';
export type ThoughtName = 'dominant' | 'important-minor' | 'tritone-minor' | 'backdoor-minor' | 'relative-minor';
export interface Thought {
  root: number;
  kind: ThoughtKind;
  /** Over a V: which of Harris's names (the plain dominant, the important minor, the tritone's minor; the rare two). */
  name?: ThoughtName;
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
export const thoughtName: Record<ThoughtName, L> = {
  dominant: { en: 'the dominant itself', he: 'הדומיננטה עצמה' },
  'important-minor': { en: 'the important minor', he: 'המינור החשוב' },
  'tritone-minor': { en: "the tritone's minor", he: 'המינור של הטריטון' },
  'backdoor-minor': { en: "rare: the backdoor's minor", he: 'נדיר: המינור של הדלת האחורית' },
  'relative-minor': { en: "rare: the ♭9 relative's minor", he: 'נדיר: המינור של קרוב ה־♭9' },
};
/** The rare thoughts over a V (owner 2026-11-23: "rare but valid"). */
export const RARE_THOUGHTS: ThoughtName[] = ['backdoor-minor', 'relative-minor'];
/** The chance of a rare thought per window at H-5, at most one window per sheet (the rest: the dominant, the important minor, the tritone's minor). */
export const RARE_WEIGHT = 0.1;
/**
 * The m6 over a V, above the V's root, for each name — each the important minor of one of the four related dominants
 * (§4): on its own 5th (7), on the tritone sub's 5th (1), on the 5th of the dominant a minor 3rd up (10), on the 5th of
 * the ♭9 relative, a major 6th up (4).
 */
const M6_ON: Partial<Record<ThoughtName, number>> = { 'important-minor': 7, 'tritone-minor': 1, 'backdoor-minor': 10, 'relative-minor': 4 };
/** The ♭9 relative's minor suits when the bass moves to the relative's root (E under G7, §4): that root. */
export const relativeBass = (vRoot: number): number => mod(vRoot + 9);

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

/** H-5: the rule of a window (H4 rule sets + H6), in their order. */
export type HarrisRule = 'half-step' | 'triplets' | 'chromatic' | '3b9';
export const H5_RULES: HarrisRule[] = ['half-step', 'triplets', 'chromatic', '3b9'];
export const RULE_WORD: Record<HarrisRule, { short: L; long: L }> = {
  'half-step': { short: { en: 'half steps', he: 'חצאי טון' }, long: { en: 'the half-step rules: chord tones on the beat', he: 'חוקי חצי הטון: צלילי האקורד על הפעמה' } },
  triplets: { short: { en: 'a triplet', he: 'טריולה' }, long: { en: 'the triplet rules: at least one triplet', he: 'חוקי הטריולה: לפחות טריולה אחת' } },
  chromatic: { short: { en: 'chromatic', he: 'כרומטי' }, long: { en: "Barry's chromatic scale: scale notes on the beat, chromatic notes between", he: 'הסולם הכרומטי של בארי: צלילי הסולם על הפעמה, הכרומטיים ביניהם' } },
  '3b9': { short: { en: '3 to ♭9', he: '3 עד ♭9' }, long: { en: '3 to ♭9 on the V: 3 5 ♭7 ♭9, the dim on its 3rd', he: '3 עד ♭9 על הדומיננטה: ‏3 5 ♭7 ♭9, המוקטן על הטרצה' } },
};
/** 3 to ♭9 over a dominant on `root`: its 3rd, 5th, ♭7, ♭9 (§9; the same four notes on all four related dominants). */
export const threeToB9Pcs = (root: number): number[] => [4, 7, 10, 1].map((x) => mod(root + x));

/** How High the Moon's first 16 bars (harrisLines TUNE_CHARTS, checked 2026-11-15), moved to C. */
const STANDARD = TUNE_CHARTS.hhtm;
const STANDARD_IN_C = transposeChart(STANDARD.text, mod(-STANDARD.key));

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
  4: { tier: 4, chart: 'Dm7b5 | G7 | Cm6 | Cm6', choruses: 4, every: 0, title: { en: 'Minor ii–V–i: seven down to the 3rd, 3 to ♭9', he: 'ii–V–i מינורי: שבע למטה אל הטרצה, 3 עד ♭9' }, how: { en: 'Over the half-diminished play the dominant a major 3rd below, up and down, and land on the 3rd of the V. From there, 3 to ♭9 — the dim on its 3rd — and the ♭9 falls to the 5th of the i, its m6 chord.', he: 'מעל החצי־מוקטן נגנו את הדומיננטה טרצה גדולה מתחת, למעלה ולמטה, ונחתו על הטרצה של ה־V. משם 3 עד ♭9 — המוקטן על הטרצה — וה־♭9 יורד לקווינטה של ה־i, אקורד ה־m6 שלו.' } },
  5: { tier: 5, chart: STANDARD_IN_C, choruses: 2, every: 4, title: { en: `A standard: ${STANDARD.name.en}`, he: `שיר סטנדרט: ${STANDARD.name.he}` }, how: { en: 'Every 4 bars a new rule: the half-step rules, a triplet, the chromatic scale, 3 to ♭9 on the V. The thought chord over the V changes too — now and then a rare one.', he: 'כל 4 תיבות חוק חדש: חוקי חצי הטון, טריולה, הסולם הכרומטי, 3 עד ♭9 על הדומיננטה. גם האקורד שחושבים מעל הדומיננטה מתחלף — מדי פעם אחד נדיר.' } },
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
  /** H-5: the rule of the window (on its first cell). */
  rule?: HarrisRule;
  /** H6: 3 to ♭9 is asked over this V. */
  b9?: true;
}
export interface HarrisSheet {
  tier: HarrisTier;
  tonic: number;
  meter: number;
  bars: number;
  choruses: number;
  cells: HarrisCell[];
}

/** A small deterministic hash in [0, 1) (the rare thoughts' pick per key and window). */
function rnd01(a: number, b: number): number {
  let x = (Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * H-5: the thought over a V in window `w` of `windows` (key `key`): the dominant on the first window and on 3-to-♭9
 * windows; else the dominant, the important minor, the tritone's minor in turn — and at most ONE window of the sheet a
 * rare one (each eligible window has a RARE_WEIGHT chance; the lowest draw wins).
 */
export function h5VName(key: number, w: number, windows = (TIERS[5].choruses * parseChart(TIERS[5].chart).bars) / TIERS[5].every): ThoughtName {
  const eligible = (x: number) => x > 0 && H5_RULES[x % H5_RULES.length] !== '3b9';
  if (!eligible(w)) return 'dominant';
  const k = mod(key);
  let best = -1;
  for (let x = 0; x < windows; x++) if (eligible(x) && (best < 0 || rnd01(k, x) < rnd01(k, best))) best = x;
  if (best === w && rnd01(k, w) < RARE_WEIGHT) return rnd01(k + 12, w) < 0.5 ? 'backdoor-minor' : 'relative-minor';
  return (['dominant', 'important-minor', 'tritone-minor'] as const)[w % 3];
}

/**
 * The sheet for a tier in a key: the thought chord over every span by the tier's rules, the starting degree on each
 * window (H-1, H-2), the V's thought rotating every 8 bars (H-3: the dominant, the important minor, the tritone's minor),
 * 3 to ♭9 on the V after the half-diminished (H-4), and at H-5 a rule and a thought over the V every 4 bars.
 */
export function buildHarrisSheet(tier: HarrisTier, key: number, meter = 4): HarrisSheet {
  const def = TIERS[tier];
  const text = mod(key) ? transposeChart(def.chart, mod(key)) : def.chart;
  const p = parseChart(text, meter);
  const bars = p.bars;
  const spans = spansOfChart(p, meter, bars);
  const cells: HarrisCell[] = [];
  const winBeats = (def.every || bars * def.choruses) * meter;
  const V_ROT: ThoughtName[] = ['dominant', 'important-minor', 'tritone-minor'];
  for (let c = 0; c < def.choruses; c++)
    spans.forEach((s, i) => {
      const at = c * bars * meter + s.at;
      const q = qualityOf(s.iv);
      const next = spans[i + 1] ?? spans[0];
      const prevSpan = spans[i - 1] ?? (c > 0 ? spans[spans.length - 1] : undefined);
      const nq = qualityOf(next.iv);
      const window = Math.floor(at / winBeats + 1e-6);
      const rule = tier === 5 ? H5_RULES[window % H5_RULES.length] : undefined;
      let think: Thought;
      if (q === 'dom') {
        const name: ThoughtName = tier === 3 ? V_ROT[window % V_ROT.length]! : tier === 5 ? h5VName(key, window, Math.ceil((bars * def.choruses) / (def.every || 1))) : 'dominant';
        const on = M6_ON[name];
        think = on === undefined ? { root: s.root, kind: 'dom7', name } : { root: mod(s.root + on), kind: 'm6', name };
      } else if (q === 'm7' && tier >= 2 && nq === 'dom' && mod(next.root - s.root) === 5) think = { root: next.root, kind: 'dom7', name: 'dominant' };
      else if (q === 'm7') think = { root: mod(s.root + 3), kind: 'maj6' };
      else if (q === 'hd7') think = { root: mod(s.root - 4), kind: 'dom7' };
      else if (q === 'mtonic') think = { root: s.root, kind: 'min6' };
      else think = { root: s.root, kind: q === 'maj' ? 'maj6' : 'dom7' };
      const sym = prettySym(p.chords.find((x) => x.bar * meter + x.at === s.at)?.sym ?? text.split('|')[Math.floor(s.at / meter)]?.trim() ?? '');
      const first = !cells.length || cells[cells.length - 1].window !== window;
      const start: StartDeg | undefined = (tier === 1 || tier === 2) && first ? START_DEGREES[window % START_DEGREES.length] : undefined;
      // H6: 3 to ♭9 over the V after the half-diminished (H-4), over every V of a 3-to-♭9 window (H-5)
      const b9 = q === 'dom' && ((tier === 4 && !!prevSpan && qualityOf(prevSpan.iv) === 'hd7') || (tier === 5 && rule === '3b9'));
      cells.push({ at, beats: s.beats, chorus: c, bar: Math.floor(s.at / meter + 1e-6), sym, root: s.root, iv: s.iv, q, think, window, ...(start ? { start } : {}), ...(rule && first ? { rule } : {}), ...(b9 ? { b9: true as const } : {}) });
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
  /** H-4 / H-5: ø → V pairs whose first note over the V is its 3rd ÷ such pairs with notes. */
  landing: number | null;
  /** H6: Vs asking for 3 to ♭9 where 3 5 ♭7 ♭9 (or back down) was played in a row ÷ such Vs with notes. */
  b9: number | null;
  /** H-5: windows whose rule was kept ÷ windows with notes (3-to-♭9 windows count under b9). */
  rules: number | null;
  score: number;
  /** Per cell: an identity note / the start degree / the landing / 3 to ♭9 hit (true / false), null where nothing was asked or played. */
  hits: (boolean | null)[];
  /** H-5, per window: the rule kept (true / false), null where nothing was played or the rule is graded per V. */
  ruleHits: (boolean | null)[];
  notes: number;
}

/** The notes that make a thought chord audible over the written one (A♭m6 over G7: A♭ and E♭ — its C♭ is G's 3rd). */
export const identityPcs = (c: Pick<HarrisCell, 'root' | 'iv' | 'think'>): number[] => {
  const written = new Set(c.iv.map((x) => mod(c.root + x)));
  return thoughtTones(c.think).filter((p) => !written.has(p));
};

interface NoteInfo {
  n: HNote;
  k: number;
  onBeat: boolean;
  ok: boolean;
  /** Off the beat, out of the thought chord's scale, and the next note is a half step away (a chromatic passing note). */
  chromatic: boolean;
  /** On the beat and in the thought chord's scale (the chromatic scale's rule). */
  scaleOnBeat: boolean;
}

export function gradeHarris(sh: HarrisSheet, notes: HNote[]): HarrisGrade {
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  const cellOf = (b: number) => harrisCellAt(sh, b);
  let on = 0, onOk = 0, off = 0, offOk = 0;
  const info: (NoteInfo | null)[] = ns.map((n, i) => {
    const frac = n.beat - Math.round(n.beat);
    const onBeat = Math.abs(frac) < 0.15;
    // an anticipation an eighth early belongs to the next chord
    let k = cellOf(Math.round(n.beat) > n.beat && onBeat ? Math.round(n.beat) : n.beat);
    const k2 = cellOf(n.beat + 0.5);
    if (k < 0) k = k2;
    if (k < 0) return null;
    const c = sh.cells[k];
    const pc = mod(n.midi);
    const tones = thoughtTones(c.think);
    const scale = thoughtScale(c.think);
    const nx = ns[i + 1];
    const half = !!nx && Math.abs(nx.midi - n.midi) === 1;
    if (onBeat) {
      on++;
      const ok = tones.includes(pc) || (k2 >= 0 && k2 !== k && thoughtTones(sh.cells[k2].think).includes(pc));
      if (ok) onOk++;
      return { n, k, onBeat, ok, chromatic: false, scaleOnBeat: scale.includes(pc) || tones.includes(pc) };
    }
    off++;
    const inScale = scale.includes(pc) || tones.includes(pc);
    const ok = inScale || half;
    if (ok) offOk++;
    return { n, k, onBeat, ok, chromatic: !inScale && half, scaleOnBeat: false };
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
  const cellsOf = (w: number) => sh.cells.map((c, k) => (c.window === w ? k : -1)).filter((k) => k >= 0);
  for (const w of windows) {
    const ks = cellsOf(w);
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
  // H-4 / H-5: landing on the V's 3rd after the half-diminished
  let laN = 0, laHit = 0;
  if (sh.tier >= 4)
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
  // H6: 3 to ♭9 over the V — four notes in a row, 3 5 ♭7 ♭9 up (or ♭9 ♭7 5 3 down), starting over the V (or over the
  // ii played as that V just before it)
  let b9N = 0, b9Hit = 0;
  sh.cells.forEach((c, k) => {
    if (!c.b9) return;
    let from = c.at;
    for (let j = k - 1; j >= 0 && sh.cells[j].think.kind === 'dom7' && sh.cells[j].think.root === c.root && sh.cells[j].q === 'm7'; j--) from = sh.cells[j].at;
    const to = c.at + c.beats;
    const idx = ns.map((n, i) => (n.beat >= from - 0.25 && n.beat < to - 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return;
    b9N++;
    const want = threeToB9Pcs(c.root);
    const down = [...want].reverse();
    const h = idx.some((i) => {
      const xs = ns.slice(i, i + 4).map((n) => mod(n.midi));
      return xs.length === 4 && (xs.every((x, j) => x === want[j]) || xs.every((x, j) => x === down[j]));
    });
    if (h) b9Hit++;
    // over the V after a ø (H-4) the check mark stays the landing's
    if (sh.tier === 5) hits[k] = h;
  });
  // H-5: the rule of each window
  const ruleHits: (boolean | null)[] = [];
  let ruN = 0, ruHit = 0;
  if (sh.tier === 5)
    for (const w of windows) {
      const ks = cellsOf(w);
      const rule = sh.cells[ks[0]].rule;
      const xs = info.filter((x): x is NoteInfo => !!x && ks.includes(x.k));
      if (!rule || rule === '3b9' || !xs.length) {
        ruleHits[w] = null;
        continue;
      }
      const ons = xs.filter((x) => x.onBeat);
      const share = (f: (x: NoteInfo) => boolean) => (ons.length ? ons.filter(f).length / ons.length : 0);
      let h = false;
      if (rule === 'half-step') h = ons.length >= 2 && share((x) => x.ok) >= 0.75;
      else if (rule === 'chromatic') h = ons.length >= 2 && share((x) => x.scaleOnBeat) >= 0.75 && xs.some((x) => x.chromatic);
      else
        h = xs.some((_, j) => {
          const t = xs.slice(j, j + 3);
          if (t.length < 3) return false;
          const g1 = t[1].n.beat - t[0].n.beat, g2 = t[2].n.beat - t[1].n.beat;
          return Math.abs(g1 - 1 / 3) < 0.07 && Math.abs(g2 - 1 / 3) < 0.07 && t.every((y) => y.ok);
        });
      ruN++;
      if (h) ruHit++;
      ruleHits[w] = h;
    }
  const r = (a: number, b: number) => (b ? a / b : 0);
  const identity = idN ? r(idHit, idN) : null;
  const start = stN ? r(stHit, stN) : null;
  const landing = laN ? r(laHit, laN) : null;
  const b9 = b9N ? r(b9Hit, b9N) : null;
  const rules = ruN ? r(ruHit, ruN) : null;
  const parts = [r(onOk, on), r(offOk, off), identity, start, landing, b9, rules].filter((x, i): x is number => x !== null && (i > 1 || (i === 0 ? on > 0 : off > 0)));
  const score = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  return { onBeat: r(onOk, on), offBeat: r(offOk, off), identity, start, landing, b9, rules, score, hits, ruleHits, notes: ns.length };
}

/** The tier the player starts at: what they chose, else from the rotation tier (T1 → H-1 … T3 → H-3). */
export const harrisTierOf = (rbi: number, chosen?: number | null): HarrisTier => (chosen && chosen >= 1 && chosen <= 5 ? (chosen as HarrisTier) : (Math.max(1, Math.min(3, rbi)) as HarrisTier));
