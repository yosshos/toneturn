// STAGE C (docs/research/AUDIT-6-LEVELS-EAR-JAZZ-VOICE.md §3.3–3.5): the voice course's top ladder. No vocal item was
// rated above 1700 and ten of seventeen families ended by 1400; these eight families (level numbers 2201–2273) carry
// the advanced singer to the top of the path, every item measured by the existing graders (melody, sight, song, scat,
// edge):
//
//  v-arp2   diminished, augmented, dim7 and half-diminished arpeggios; chains that resolve (RSL G6–8)
//  v-leaps  wide-interval melodies: sixths and sevenths, ninths and tenths, tritones and chromatic leaps
//  v-runs   advanced runs: a pentatonic run in 16ths, chromatic runs, a blues melisma at tempo
//  v-quick  the RSL Quick Study: read four bars over the band, vary them, then improvise over their chords
//  v-part   one part from the score (sung) while the app plays the other(s) (ABRSM G7–8 aural B)
//  v-style  style studies outside jazz: pop / R&B, soul, musical theatre (own melodies)
//  v-scat2  scat over rhythm changes at tempo: landing, approach, trading fours
//  v-top    the top of the range: the edge above the top note, then a top-floor goal reached in a phrase
//
// Key-relative items (arpeggios, leaps, runs, the score parts) carry `more.key12`: every session sets the key of the
// first note (`more.key`) from the session seed, so the twelve keys come round in turn; itemTargets keeps the figure
// inside the singer's range by octaves. Every sung item keeps the course's rules: sung on a pulse with a count-in, a
// loose timing grade, the cents pass of its grader, and a miss waits for Continue (the session runner). Pure data.

import type { VocalItem, VocalLevel } from './vocal';
import { VOICE_TOP_PLACEMENT } from './stageCPlacement';

type Bi = { en: string; he: string };
type Item = Omit<VocalItem, 'id' | 'level'>;

function lv(n: number, pass: number, items: Item[]): VocalLevel {
  return { level: n, pass, kind: [...new Set(items.map((i) => i.kind))], items: items.map((it, k) => ({ ...it, id: `vt${n}-${k + 1}`, level: n })) };
}
/** A key-relative melody on a pulse (bpm, notes a beat), placed at `at` in the range, its key set per session. */
const MEL = (steps: number[], bpm: number, perBeat: number, difficulty: number, at = 0.3): Item => ({
  kind: 'melody',
  seconds: Math.ceil((steps.length / perBeat) * (60 / bpm)) + 2,
  reference: 'before',
  at,
  steps,
  bpm,
  perBeat,
  more: { key12: true },
  difficulty,
});
const SONG = (id: string, s: Omit<NonNullable<VocalItem['song']>, 'id'>, difficulty: number, seconds = 30): Item => ({ kind: 'song', seconds, reference: 'before', song: { id, ...s }, difficulty });
const SCAT = (sc: NonNullable<VocalItem['scat']>, difficulty: number): Item => ({ kind: 'scat', seconds: 40, reference: 'before', scat: sc, difficulty });
/** One part read from the score while the app plays the others (in time with the take's pulse). */
const PART = (steps: number[], durs: number[], parts: { steps: number[]; durs: number[] }[], bpm: number, difficulty: number, at = 0.4): Item => ({
  kind: 'sight',
  seconds: Math.ceil((durs.reduce((a, b) => a + b, 0) * 60) / bpm) + 2,
  reference: 'before',
  at,
  steps,
  durs,
  bpm,
  more: { key12: true, parts },
  difficulty,
});
const EDGE = (above: number, difficulty: number, seconds = 3): Item => ({ kind: 'edge', seconds, reference: 'before', more: { above }, difficulty });

// ---------------------------------------------------------------- v-arp2 (2201–2203)

export const ARP2_LEVELS: VocalLevel[] = [
  lv(2201, 0.6, [MEL([0, 3, 6, 12, 6, 3, 0], 72, 2, 1720), MEL([0, 4, 8, 12, 8, 4, 0], 72, 2, 1730), MEL([0, 3, 6, 3, 0, 4, 8, 4, 0], 76, 2, 1750)]),
  lv(2202, 0.58, [MEL([0, 3, 6, 9, 12, 9, 6, 3, 0], 72, 2, 1760), MEL([0, 3, 6, 10, 12, 10, 6, 3, 0], 72, 2, 1770), MEL([0, 3, 6, 9, 6, 3, 0, -3, 0], 76, 2, 1790, 0.4)]),
  lv(2203, 0.56, [MEL([0, 3, 6, 9, 8, 5, 1], 80, 2, 1800), MEL([0, 4, 8, 9, 5, 0], 80, 2, 1810), MEL([0, 3, 6, 9, 10, 13, 16, 13, 10], 84, 2, 1840, 0.2)]),
];

// ---------------------------------------------------------------- v-leaps (2211–2213), our own melodies

export const LEAP_LEVELS: VocalLevel[] = [
  lv(2211, 0.58, [MEL([0, 9, 7, 2, 11, 9, 5, 4], 66, 1, 1720), MEL([7, -2, 0, 9, 5, 7, -1, 0], 66, 1, 1750, 0.35)]),
  lv(2212, 0.56, [MEL([0, 14, 12, 7, 16, 14, 9, 11, 12], 60, 1, 1780, 0.15), MEL([12, -2, 0, 14, 4, 5, 15, 12], 60, 1, 1810, 0.2)]),
  lv(2213, 0.55, [MEL([0, 6, 1, 7, 11, 5, 10, 4, 5], 60, 1, 1840), MEL([0, 11, 5, -1, 6, 13, 7, 0], 60, 1, 1870, 0.25)]),
];

// ---------------------------------------------------------------- v-runs (2221–2223)

export const RUN_LEVELS: VocalLevel[] = [
  // Ten notes each (one phone screen): a run is a gesture, sung in 16ths on the click.
  lv(2221, 0.58, [MEL([12, 9, 7, 4, 2, 0, 2, 4, 7, 9], 72, 4, 1730), MEL([0, 3, 5, 7, 10, 12, 10, 7, 5, 3], 76, 4, 1760)]),
  lv(2222, 0.56, [MEL([12, 11, 10, 9, 8, 7, 6, 5, 4, 0], 66, 4, 1790, 0.35), MEL([0, 1, 2, 3, 4, 5, 6, 7, 6, 5], 72, 4, 1820)]),
  lv(2223, 0.55, [MEL([15, 12, 10, 9, 7, 5, 3, 0, 3, 5], 84, 4, 1850, 0.25), MEL([12, 10, 9, 7, 9, 7, 5, 3, 2, 0], 92, 4, 1880, 0.3)]),
];

// ---------------------------------------------------------------- v-quick (2231–2233): read, vary, improvise

const QUICK = (id: string, chart: string, style: 'swing' | 'bossa' | 'ballad', bpm: number, d: number): Item[] => [
  SONG(id, { band: true, rhythm: true, need: 0.6, read: 'band' }, d, 16),
  SONG(id, { band: true, rhythm: true, need: 0.55, interpret: true }, d + 20, 16),
  SCAT({ mode: 'landing', chart, style, bpm, loops: 2 }, d + 40),
];
export const QUICK_LEVELS: VocalLevel[] = [
  lv(2231, 0.6, QUICK('qs-harbour', 'C | Am | F | G', 'ballad', 84, 1720)),
  lv(2232, 0.58, QUICK('qs-lamplight', 'Cmaj7 | Am7 | Dm7 | G7', 'swing', 120, 1800)),
  lv(2233, 0.56, QUICK('qs-river', 'Cm7 | Fm7 | G7 | Cm7', 'bossa', 132, 1860)),
];

// ---------------------------------------------------------------- v-part (2241–2243): one part from the score

export const PART_LEVELS: VocalLevel[] = [
  // The upper part sung, the lower played (thirds and sixths, note against note).
  lv(2241, 0.58, [
    PART([4, 5, 7, 5, 4, 2, 4], [1, 1, 1, 1, 1, 1, 2], [{ steps: [0, 2, 4, 2, 0, -1, 0], durs: [1, 1, 1, 1, 1, 1, 2] }], 72, 1720),
    PART([7, 9, 7, 5, 4, 2, 0], [1, 1, 2, 1, 1, 1, 1], [{ steps: [0, 5, 4, 2, 0, -1, -5], durs: [1, 1, 2, 1, 1, 1, 1] }], 72, 1740),
  ]),
  // The lower part sung under a moving upper part, with rhythm.
  lv(2242, 0.56, [
    PART([0, -1, 0, 2, 4, 2, -1, 0], [1, 1, 1, 1, 1.5, 0.5, 1, 1], [{ steps: [4, 5, 7, 9, 7, 5, 2, 4], durs: [1, 1, 1, 1, 1.5, 0.5, 1, 1] }], 76, 1780),
    PART([0, 4, 2, 5, 4, 2, 0], [2, 1, 1, 1, 1, 1, 1], [{ steps: [7, 9, 11, 12, 12, 11, 12], durs: [2, 1, 1, 1, 1, 1, 1] }], 76, 1800),
  ]),
  // Three parts: the middle sung, the upper and lower played.
  lv(2243, 0.55, [
    PART([4, 5, 4, 2, 4, 5, 4], [1, 1, 1, 1, 1, 1, 2], [{ steps: [7, 9, 7, 7, 7, 9, 7], durs: [1, 1, 1, 1, 1, 1, 2] }, { steps: [0, -3, 0, -5, 0, 2, 0], durs: [1, 1, 1, 1, 1, 1, 2] }], 66, 1860),
    PART([2, 4, 5, 4, 2, 0, -1, 0], [1, 1, 1, 1, 1, 1, 1, 1], [{ steps: [5, 7, 9, 7, 5, 4, 2, 4], durs: [1, 1, 1, 1, 1, 1, 1, 1] }, { steps: [-5, 0, -3, 0, -5, -3, -5, -12], durs: [1, 1, 1, 1, 1, 1, 1, 1] }], 66, 1880),
  ]),
];

// ---------------------------------------------------------------- v-style (2251–2253): outside jazz

export const STYLE_LEVELS: VocalLevel[] = [
  lv(2251, 0.66, [SONG('st-velvet', { band: true, rhythm: true, need: 0.66, tol: 45 }, 1720), SONG('st-midnight', { band: true, rhythm: true, need: 0.66, tol: 45 }, 1740)]),
  lv(2252, 0.66, [SONG('st-lowlight', { band: true, rhythm: true, need: 0.66, falls: true }, 1770), SONG('st-sunday', { band: true, rhythm: true, need: 0.66 }, 1790)]),
  lv(2253, 0.68, [SONG('st-opendoor', { band: true, rhythm: true, need: 0.68, chorus: true, longNotes: 'steady' }, 1820), SONG('st-lanterns', { band: true, rhythm: true, need: 0.68, chorus: true }, 1840)]),
];

// ---------------------------------------------------------------- v-scat2 (2261–2263): rhythm changes at tempo

const RC_A = 'Cmaj7 Am7 | Dm7 G7 | Em7 A7 | Dm7 G7 | C7 C7 | Fmaj7 Fm7 | Cmaj7 G7 | C6 C6';
const RC_B = 'E7 | E7 | A7 | A7 | D7 | D7 | G7 | G7';
export const SCAT2_LEVELS: VocalLevel[] = [
  lv(2261, 0.56, [SCAT({ mode: 'landing', chart: RC_A, style: 'swing', bpm: 180, loops: 2 }, 1760), SCAT({ mode: 'guide', chart: `${RC_A} | ${RC_B}`, style: 'swing', bpm: 180 }, 1780)]),
  lv(2262, 0.55, [SCAT({ mode: 'approach', chart: `${RC_A} | ${RC_B}`, style: 'swing', bpm: 200 }, 1830), SCAT({ mode: 'tensions', chart: RC_A, style: 'swing', bpm: 200, loops: 2 }, 1850)]),
  lv(2263, 0.55, [SCAT({ mode: 'trade', chart: `${RC_A} | ${RC_A} | ${RC_B} | ${RC_A}`, style: 'swing', bpm: 220, turn: 4 }, 1890)]),
];

// ---------------------------------------------------------------- v-top (2271–2273): the top of the range

export const TOP_LEVELS: VocalLevel[] = [
  lv(2271, 0.58, [EDGE(1, 1720), EDGE(2, 1750)]),
  lv(2272, 0.56, [EDGE(3, 1790), MEL([0, 4, 7, 12, 7, 4, 0], 66, 1, 1800, 1)]),
  // The top-floor goal: a held note four semitones above the top, then a phrase that climbs to the new top.
  lv(2273, 0.55, [EDGE(4, 1860, 4), MEL([0, 2, 4, 7, 9, 12, 14, 16, 12], 60, 1, 1880, 1)]),
];

/** Every Stage C vocal level. */
export const VOICE_TOP_LEVELS: VocalLevel[] = [...ARP2_LEVELS, ...LEAP_LEVELS, ...RUN_LEVELS, ...QUICK_LEVELS, ...PART_LEVELS, ...STYLE_LEVELS, ...SCAT2_LEVELS, ...TOP_LEVELS];

/** The eight families (appended to VOICE_FAMILIES; stage D, after everything they build on). */
export const VOICE_TOP_FAMILIES: { id: string; title: Bi; refs: number[]; stage: 'D' }[] = [
  { id: 'v-arp2', title: { en: 'Altered arpeggios', he: 'ארפג׳ים מוקטנים ומוגדלים' }, refs: ARP2_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-leaps', title: { en: 'Wide leaps', he: 'קפיצות רחבות' }, refs: LEAP_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-runs', title: { en: 'Advanced runs', he: 'ראנים מתקדמים' }, refs: RUN_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-quick', title: { en: 'Quick study', he: 'לימוד מהיר' }, refs: QUICK_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-part', title: { en: 'One part from the score', he: 'קול אחד מהתווים' }, refs: PART_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-style', title: { en: 'Style studies', he: 'לימודי סגנון' }, refs: STYLE_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-scat2', title: { en: 'Scat on rhythm changes', he: 'סקאט על ריתם צ׳יינג׳ס' }, refs: SCAT2_LEVELS.map((l) => l.level), stage: 'D' },
  { id: 'v-top', title: { en: 'Top of the range', he: 'פסגת המנעד' }, refs: TOP_LEVELS.map((l) => l.level), stage: 'D' },
];

/** Level names (he + en). */
export const VOICE_TOP_NAMES: Record<number, Bi> = {
  2201: { en: 'Diminished and augmented triads', he: 'משולשים מוקטנים ומוגדלים' },
  2202: { en: 'Diminished 7th and half-diminished', he: 'ספטאקורד מוקטן וחצי מוקטן' },
  2203: { en: 'Arpeggios that resolve', he: 'ארפג׳ים שנפתרים' },
  2211: { en: 'Sixths and sevenths', he: 'סקסטות וספטימות' },
  2212: { en: 'Ninths and tenths', he: 'נונות ודצימות' },
  2213: { en: 'Tritones and chromatic leaps', he: 'טריטונים וקפיצות כרומטיות' },
  2221: { en: 'A pentatonic run in 16ths', he: 'ראן פנטטוני בשש-עשריות' },
  2222: { en: 'Chromatic runs', he: 'ראנים כרומטיים' },
  2223: { en: 'A blues melisma at tempo', he: 'מליסמה בלוזית בטמפו' },
  2231: { en: 'Read, vary, improvise', he: 'לקרוא, לגוון, לאלתר' },
  2232: { en: 'Quick study in swing', he: 'לימוד מהיר בסווינג' },
  2233: { en: 'Quick study, minor bossa', he: 'לימוד מהיר, בוסה במינור' },
  2241: { en: 'The top part', he: 'הקול העליון' },
  2242: { en: 'The lower part', he: 'הקול התחתון' },
  2243: { en: 'The middle part of three', he: 'הקול האמצעי מבין שלושה' },
  2251: { en: 'Pop and R&B', he: 'פופ ו-R&B' },
  2252: { en: 'Soul', he: 'סול' },
  2253: { en: 'Musical theatre', he: 'תיאטרון מוזיקלי' },
  2261: { en: 'Landing at ♩ 180', he: 'נחיתה ב-♩ 180' },
  2262: { en: 'Approach and tensions at ♩ 200', he: 'גישה ומתחים ב-♩ 200' },
  2263: { en: 'Trading fours at ♩ 220', he: 'חילופי ארבע ב-♩ 220' },
  2271: { en: 'The edge, held steady', he: 'הקצה, מוחזק יציב' },
  2272: { en: 'Above the top, then a phrase to it', he: 'מעל הפסגה, ואז משפט אליה' },
  2273: { en: 'The top-floor goal', he: 'יעד הקומה העליונה' },
};


/** The same ratings by level number. */
export const VOICE_TOP_DIFF: Record<number, number> = Object.fromEntries(Object.entries(VOICE_TOP_PLACEMENT).map(([k, v]) => [Number(k.slice(6)), v]));

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
/**
 * An item in this session's key: key-relative items get `more.key` (the first note's pitch class) from the seed, a
 * different key for each item of the level, so twelve sessions pass every key.
 */
export function sessionKeyItem(it: VocalItem, seed: number, idx = 0): VocalItem {
  if (!it.more?.key12) return it;
  return { ...it, more: { ...it.more, key: mod12(seed + idx * 5) } };
}

/**
 * The base note of a keyed item: the note of pitch class `key` nearest `base`, moved by octaves so the figure (steps
 * from `lo` to `hi`) fits between `low` and `high` when it can.
 */
export function keyedBase(base: number, key: number, lo: number, hi: number, low: number, high: number): number {
  let b = base + ((((key - base) % 12) + 18) % 12) - 6;
  while (b + hi > high && b + lo - 12 >= low) b -= 12;
  while (b + lo < low && b + hi + 12 <= high) b += 12;
  return b;
}

/** The other parts of a score item (v-part) as notes the app plays in time: `lead` = the count-in (s), `beat` (s). */
export function partEvents(item: VocalItem, targets: number[], lead: number, beat: number): { midi: number; start: number; duration: number; velocity: number }[] {
  const base = targets[0] - (item.steps?.[0] ?? 0);
  return (item.more?.parts ?? []).flatMap((p) => {
    let at = 0;
    return p.steps.map((st, i) => {
      const e = { midi: base + st, start: lead + at * beat, duration: p.durs[i] * beat * 0.95, velocity: 0.55 };
      at += p.durs[i];
      return e;
    });
  });
}

