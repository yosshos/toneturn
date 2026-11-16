// Triad pairs, deep (owner-approved 2026-11-16): the performed side. The music is in ../triadPairs.ts.
//
//   keys    k-tpair  16 levels ~1350–1840: patterns (root position, the other two permutations, alternating
//                    inversions, two-note and open-triad cells, the hexatonic scale over 2–3 octaves, triplets and
//                    3-over-4 in 16ths), voicings (close triads over a bass, spread across two hands, block chords with
//                    the melody on top, comping a chart with alternating pair triads), lines over a vamp, ii–V–I, a jazz
//                    blues and an 8-bar form, side-slip and symmetric pairs (advanced)
//   guitar  g-tpair  7 levels: shapes and lines on the top 3 and middle 3 strings, the hexatonic in position, comping
//                    a ii–V–I with pair shapes, lines over ii–V–I, side-slip
//   bass    b-tpair  5 levels: arpeggiated pair lines, alternating inversions over two octaves, ii–V–I, a jazz blues,
//                    side-slip
//
// Every item runs in all 12 keys from C round the cycle of 4ths (the key is in the item id → key mastery). Items without
// the band start in free time, then quarters, then the tempo ladder (rubato.ts); lines over a chart are played with the
// band (count-in, click, now-cue). Pair voicings on the keys are graded by chord sets plus the voicing check
// (goal.pairVoicing: the named triad on top, the bass / lower triad below) — MIDI only.
//
// NOTE: generate.ts, guitar.ts and bass.ts import this module and it imports theirs: nothing here calls their exports at
// module top level (only inside functions).

import type { Drill, DrillGoal, DrillSpec, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { chordDrill, isoLatin, lineDrill, pianoTitle } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import type { Ev, GuitarFamilyDef, GuitarLevelDef, GuitarStyle } from './guitar';
import { finish as gFinish } from './guitar';
import { alt, drillOf, type BN } from './bass';
import {
  CORE, KEY_NAME, PAT_NAME, PER_BEAT, chordChartIn, chordNameIn, closeTriadLed, closeTriadNear, coreById, coreTriads, mod12, motion, patternRun, patternUpDown, pairNameIn,
  rhythmize, rootIn, spellTriad, spreadPair, tpScale, triadUnderTop, type CoreId, type CorePair, type Grouping, type PatId, type TPScaleId,
} from '../triadPairs';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** All 12 keys round the cycle of 4ths, C first. */
export const TP_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const ci = (id: CoreId): number => CORE.findIndex((c) => c.id === id);
/** An option: the core pair (index) and a variant. */
export const tpOp = (id: CoreId, v = 0): number => v * 20 + ci(id);
export const tpDec = (op: number): { c: CorePair; v: number } => ({ c: CORE[op % 20] ?? CORE[0], v: Math.floor(op / 20) });
/** The lowest pitch of pitch class pc at or above lo. */
const pin = (pc: number, lo: number): number => lo + mod12(pc - lo);

/** The key signature of a chord scale over `key`: its parent major key (modes), its minor key (melodic / harmonic). */
export function sigOf(scale: TPScaleId, key: number): string {
  const major: Partial<Record<TPScaleId, number>> = { ionian: 0, dorian: 10, phrygian: 8, lydian: 7, mixolydian: 5, aeolian: 3, locrian: 1 };
  const minorTonic: Partial<Record<TPScaleId, number>> = { 'mel-minor': 0, 'dorian-b2': 10, 'lydian-aug': 9, 'lydian-dom': 7, 'mixo-b6': 5, 'locrian-n2': 3, altered: 1, 'harm-minor': 0, 'phryg-dom': 5 };
  if (major[scale] !== undefined) return SIG[mod12(key + major[scale]!)];
  if (minorTonic[scale] !== undefined) return SIG[mod12(key + minorTonic[scale]! + 3)];
  return SIG[mod12(key)];
}
const pairT = (c: CorePair, key: number): T2 => {
  const nm = pairNameIn(c, key);
  const ch = chordNameIn(c, key);
  const sc = tpScale(c.scale).n;
  return t(`${nm} over ${ch} (${sc.en})`, `${nm} מעל ${ch} (${sc.he})`);
};

// ───────────────────────────── keys: patterns ─────────────────────────────

/** Pattern variants: the pattern, the grouping and the range in octaves. */
export const TP_VARIANTS: { pat: PatId; g: Grouping; oct: number }[] = [
  { pat: 'root', g: 'eighths', oct: 2 }, // 0
  { pat: 'perm1', g: 'eighths', oct: 2 }, // 1
  { pat: 'perm2', g: 'eighths', oct: 2 }, // 2
  { pat: 'inv', g: 'eighths', oct: 2 }, // 3
  { pat: 'cell2', g: 'eighths', oct: 2 }, // 4
  { pat: 'spread', g: 'eighths', oct: 2 }, // 5
  { pat: 'hex', g: 'eighths', oct: 2 }, // 6
  { pat: 'hex', g: 'sixteenths', oct: 3 }, // 7
  { pat: 'inv', g: 'triplets', oct: 2 }, // 8
  { pat: 'root', g: 'sixteenths', oct: 3 }, // 9: three-note groups in 16ths — 3 over 4
];
const GROUP_T: Record<Grouping, T2> = {
  quarters: t('quarters', 'רבעים'),
  eighths: t('8ths', 'שמיניות'),
  triplets: t('triplets', 'טריולות'),
  sixteenths: t('16ths: groups of 3 across the beat', 'שש־עשריות: קבוצות של 3 על פני הפעמה'),
};
/** The keys range of a pattern (right hand): the first triad's root from about F3 (2 octaves) or B2 (3 octaves, to B♭6 at most). */
export function keysRange(c: CorePair, key: number, oct: number): [number, number] {
  const lo = pin(mod12(key + c.a.iv), oct >= 3 ? 47 : 53);
  return [lo, lo + 12 * oct + (oct >= 3 ? 0 : 2)];
}

function genPattern(s: DrillSpec, key: number): Drill {
  const { c, v } = tpDec(s.option ?? 0);
  const V = TP_VARIANTS[Math.min(TP_VARIANTS.length - 1, v)];
  const [A, B] = coreTriads(c, key);
  const [lo, hi] = keysRange(c, key, V.oct);
  const ps = patternUpDown(A, B, V.pat, lo, hi);
  const line = rhythmize(ps, V.g, 0, 2);
  const sp: DrillSpec = { ...s, key, hands: 'R', ...(V.g === 'triplets' ? { perBeat: 3 } : V.g === 'sixteenths' ? { perBeat: 4 } : {}) };
  const ttl = pianoTitle([pairT(c, key), PAT_NAME[V.pat], t(`${V.oct} octaves`, `${V.oct} אוקטבות`), V.g === 'eighths' ? null : GROUP_T[V.g]], { ...sp, perBeat: undefined });
  const d = lineDrill(sp, line, ttl, {}, sigOf(c.scale, key), 60);
  return { ...d, chart: [chordChartIn(c, key)] };
}

// ───────────────────────────── keys: voicings ─────────────────────────────

type PV = NonNullable<DrillGoal['pairVoicing']>[number];
interface VEv {
  beat: number;
  dur: number;
  rh: number[];
  lh: number[];
  top: number[];
  low?: number[];
  bass?: number;
}
function voicingDrill(s: DrillSpec, key: number, evs: VEv[], ttl: T2, sig: string, more: Partial<Drill> = {}): Drill {
  const ce = evs.map((e) => ({
    beat: e.beat,
    dur: e.dur,
    notes: [...e.lh.map((p) => ({ pitch: p, hand: 'L' as const })), ...e.rh.map((p) => ({ pitch: p, hand: 'R' as const }))],
    required: [...e.lh, ...e.rh],
    allowed: [...e.lh, ...e.rh],
  }));
  const sp: DrillSpec = { ...s, key, hands: evs.some((e) => e.lh.length) ? 'RL' : 'R' };
  const d = chordDrill(sp, ce, ttl, 60, {}, sig);
  // chordDrill gives each event its own chordId, 1, 2, 3 … in order
  const set = (xs: number[]) => [...new Set(xs.map(mod12))].sort((a, b) => a - b);
  const pv: PV[] = evs.map((e, k) => ({ chordId: k + 1, top: set(e.top), ...(e.low ? { low: set(e.low) } : {}), ...(e.bass !== undefined ? { bass: mod12(e.bass) } : {}) }));
  return { ...d, goal: { ...d.goal, pairVoicing: pv }, ...more };
}
/** The LH shell under a pair: the root and the 7th (maj7 family: major 7th) above it, in the bass register. */
function shell(c: CorePair, key: number): number[] {
  const r = pin(key, 36);
  const sc = tpScale(c.scale);
  const seventh = sc.q === 'maj' || sc.chord.includes('maj7') ? 11 : 10;
  return [r, r + seventh];
}

function genClose(s: DrillSpec, key: number): Drill {
  // Close triads alternating over the LH shell (upper-structure use): A, B, A, B … two beats each, voice-led, 4 bars.
  const { c } = tpDec(s.option ?? 0);
  const [A, B] = coreTriads(c, key);
  const lh = shell(c, key);
  const evs: VEv[] = [];
  let prev = closeTriadNear(A, 72, 60, 79);
  for (let k = 0; k < 8; k++) {
    const T = k % 2 === 0 ? A : B;
    const v = k === 0 ? prev : closeTriadLed(T, prev, 60, 79);
    prev = v;
    evs.push({ beat: k * 2, dur: k === 7 ? 4 : 2, rh: v, lh: k % 4 === 0 ? lh : [], top: T, ...(k % 4 === 0 ? { bass: key } : {}) });
  }
  const ttl = pianoTitle([pairT(c, key), t('close triads over the root and 7th, voice-led', 'משולשים צפופים מעל היסוד והספטימה, בהובלת קולות')], { ...s, hands: 'RL' });
  return { ...voicingDrill(s, key, evs, ttl, sigOf(c.scale, key)), chart: [chordChartIn(c, key), chordChartIn(c, key), chordChartIn(c, key)] };
}

function genSpread(s: DrillSpec, key: number): Drill {
  // The pair as the whole harmony: one triad spread across the hands (root and 5th in the LH, its 3rd as the 10th),
  // the other close on top; then they swap. Two beats each, 4 bars.
  const { c } = tpDec(s.option ?? 0);
  const [A, B] = coreTriads(c, key);
  const evs: VEv[] = [];
  for (let k = 0; k < 8; k++) {
    const [lower, upper] = k % 2 === 0 ? [B, A] : [A, B];
    const v = spreadPair(lower, upper, 38);
    evs.push({ beat: k * 2, dur: k === 7 ? 4 : 2, rh: v.rh, lh: v.lh, top: upper, low: [lower[0], lower[2]] });
  }
  const ttl = pianoTitle([pairT(c, key), t('one triad spread across the hands, the other on top', 'משולש אחד פרוש בין הידיים, השני מעליו')], { ...s, hands: 'RL' });
  return { ...voicingDrill(s, key, evs, ttl, sigOf(c.scale, key)), chart: Array.from({ length: 4 }, () => chordChartIn(c, key)) };
}

function genBlock(s: DrillSpec, key: number): Drill {
  // Block chords: a pair melody (the six notes up an octave and back) in quarters, each note on top of its own triad,
  // the LH doubling the melody an octave down (locked hands).
  const { c } = tpDec(s.option ?? 0);
  const [A, B] = coreTriads(c, key);
  const lo = pin(A[0], 60);
  const six = [...A, ...B];
  const up: number[] = [];
  for (let p = lo; up.length < 7; p++) if (six.includes(mod12(p))) up.push(p);
  const mel = [...up, ...up.slice(0, -1).reverse()];
  const evs: VEv[] = mel.map((m, k) => {
    const T = A.includes(mod12(m)) ? A : B;
    return { beat: k, dur: k === mel.length - 1 ? 3 : 1, rh: triadUnderTop(T, m), lh: [m - 12], top: T };
  });
  const ttl = pianoTitle([pairT(c, key), t('block chords: each melody note on top of its own triad, the LH an octave below', 'אקורדי בלוק: כל צליל של המנגינה מעל המשולש שלו, יד שמאל אוקטבה מתחת')], { ...s, hands: 'RL' });
  return { ...voicingDrill(s, key, evs, ttl, sigOf(c.scale, key)), chart: Array.from({ length: 4 }, () => chordChartIn(c, key)) };
}

/** A chart of chords for lines and comping: [interval above the key, the core pair, bars]. */
type Prog = [number, CoreId, number][];
export const TP_PROGS: { id: string; prog: Prog; n: T2 }[] = [
  { id: 'iivi', prog: [[2, 'dorian', 1], [7, 'mixo-no11', 1], [0, 'ionian', 2]], n: t('ii–V–I', 'ii–V–I') },
  { id: 'iivi-col', prog: [[2, 'dorian', 1], [7, 'altered', 1], [0, 'lydian', 2]], n: t('ii–V–I with colours (altered V, lydian I)', 'ii–V–I עם צבעים (V אלטרד, I לידי)') },
  { id: 'iivi-min', prog: [[2, 'half-dim', 1], [7, 'phryg-dom', 1], [0, 'mel-minor', 2]], n: t('minor iiø–V–i', 'iiø–V–i במינור') },
  {
    id: 'blues',
    prog: [[0, 'mixo-no11', 1], [5, 'mixo-no11', 1], [0, 'mixo-no11', 2], [5, 'mixo-no11', 2], [0, 'mixo-no11', 1], [9, 'phryg-dom', 1], [2, 'dorian', 1], [7, 'altered', 1], [0, 'mixo-no11', 1], [7, 'altered', 1]],
    n: t('a jazz blues', 'בלוז ג׳אז'),
  },
  { id: 'form', prog: [[2, 'dorian', 1], [7, 'lydian-dom', 1], [0, 'lydian', 1], [0, 'ionian', 1], [2, 'half-dim', 1], [7, 'phryg-dom', 1], [0, 'mel-minor', 2]], n: t('an 8-bar form: ii–V–I in major, then in minor', 'צורה של 8 תיבות: ii–V–I במז׳ור ואז במינור') },
];
const progById = (id: string) => TP_PROGS.find((p) => p.id === id)!;
/** One chord of a chart: its root (pitch class and name spelled in the key), its core pair, chart symbol and bars. */
export interface TPBar {
  r: number;
  rn: string;
  c: CorePair;
  bars: number;
  sym: string;
  name: string;
  pair: string;
}
const barOf = (key: number, d: number, c: CorePair, bars: number): TPBar => {
  const r = mod12(key + d);
  const rn = rootIn(key, d);
  return { r, rn, c, bars, sym: chordChartIn(c, r, rn), name: chordNameIn(c, r, rn), pair: pairNameIn(c, r, rn) };
};
/** The bars of a progression in a key (roots spelled in the key: ii in B is C♯m7). */
export function barsOf(key: number, prog: Prog): TPBar[] {
  return prog.map(([d, id, bars]) => barOf(key, d, coreById(id), bars));
}
/** A one-chord vamp of `n` bars. */
const vampBars = (key: number, c: CorePair, n: number, each = false): TPBar[] => (each ? Array.from({ length: n }, () => barOf(key, 0, c, 1)) : [barOf(key, 0, c, n)]);
const chartOfBars = (bs: { sym: string; bars: number }[]): string[] => bs.flatMap((b) => Array.from({ length: b.bars }, (_, i) => (i === 0 ? b.sym : '%')));

function genComp(s: DrillSpec, key: number): Drill {
  // Comping a chart with the pair: the LH shell on 1, the pair's first triad on 1, the second on the "and" of 2
  // (a Charleston), voice-led; the band plays bass and drums.
  const P = progById(['iivi', 'iivi-col', 'iivi-min', 'blues'][Math.min(3, s.option ?? 0)]);
  const bs = barsOf(key, P.prog);
  const evs: VEv[] = [];
  let prev: number[] | null = null;
  let bar = 0;
  for (const b of bs) {
    const [A, B] = coreTriads(b.c, b.r);
    const lh = shell(b.c, b.r);
    for (let k = 0; k < b.bars; k++) {
      const vA: number[] = prev ? closeTriadLed(A, prev, 60, 79) : closeTriadNear(A, 72, 60, 79);
      const vB = closeTriadLed(B, vA, 60, 79);
      prev = vB;
      evs.push({ beat: bar * 4, dur: 1.5, rh: vA, lh, top: A, bass: b.r });
      evs.push({ beat: bar * 4 + 1.5, dur: 2.5, rh: vB, lh: [], top: B });
      bar++;
    }
  }
  const sp: DrillSpec = { ...s, key, hands: 'RL', swing: true };
  const ttl = pianoTitle([t(`Comping ${P.n.en} in ${KEY_NAME[key]} with triad pairs`, `ליווי ${P.n.he} ב־${KEY_NAME[key]} עם זוגות משולשים`), t('shell on 1, pair triads on 1 and the "and" of 2', 'שלד על 1, משולשי הזוג על 1 ועל ה"וְ" של 2')], sp);
  const d = voicingDrill(sp, key, evs, ttl, SIG[key]);
  return { ...d, chart: chartOfBars(bs), band: { style: 'swing', bass: true }, drums: { groove: 'swing' } };
}

// ───────────────────────────── keys: lines over a chart ─────────────────────────────

/** A pair line through bars of chords: 8 swung 8ths a bar from the note nearest the last one, the last note held. */
function linesOver(bs: { r: number; c: CorePair; bars: number }[], pat: PatId, lo: number, hi: number, shift: number[] = []): { p: number; beat: number; dur: number }[] {
  const out: { p: number; beat: number; dur: number }[] = [];
  let near = (lo + hi) / 2 - 4;
  let bar = 0;
  bs.forEach((b, i) => {
    const [A0, B0] = coreTriads(b.c, b.r);
    const sh = shift[i] ?? 0;
    const A = A0.map((x) => mod12(x + sh));
    const B = B0.map((x) => mod12(x + sh));
    const n = 8 * b.bars;
    const ps = patternRun(A, B, pat, lo, hi, near, n);
    ps.forEach((p, k) => out.push({ p, beat: bar * 4 + k / 2, dur: 0.5 }));
    near = ps[ps.length - 1];
    bar += b.bars;
  });
  // land: the next chord's (or the first chord's) first-triad note nearest the last note, held a bar
  const last = bs[bs.length - 1];
  const [A] = coreTriads(last.c, last.r);
  let land = near;
  for (let d = 0; d < 12; d++) {
    if (A.includes(mod12(near - d)) && near - d >= lo) {
      land = near - d;
      break;
    }
    if (A.includes(mod12(near + d)) && near + d <= hi) {
      land = near + d;
      break;
    }
  }
  out.push({ p: land, beat: bar * 4, dur: 4 });
  return out;
}

function genLines(s: DrillSpec, key: number): Drill {
  const op = s.option ?? 0;
  let bs: TPBar[];
  let what: T2;
  let shift: number[] = [];
  let pat: PatId = 'inv';
  const slipName = (c: CorePair, d: number) => `${spellTriad(key + d, c.a, c.scale).name} + ${spellTriad(key + d, c.b, c.scale).name}`;
  if (s.kind === 'tpk-vamp') {
    const { c, v } = tpDec(op);
    pat = (['inv', 'root', 'cell2'] as PatId[])[Math.min(2, v)];
    bs = vampBars(key, c, 4);
    what = t(`${pairT(c, key).en} over a vamp: ${PAT_NAME[pat].en}`, `${pairT(c, key).he} מעל וואמפ: ${PAT_NAME[pat].he}`);
  } else if (s.kind === 'tpk-slip') {
    // Side-slip: the pair inside, a half step up (outside), inside, a half step down (outside), home.
    const c = coreById('dorian');
    bs = vampBars(key, c, 4, true);
    shift = [0, 1, 0, -1];
    what = t(`Side-slip over ${chordNameIn(c, key)}: ${pairNameIn(c, key)} in, ${slipName(c, 1)} out, in, ${slipName(c, -1)} out, home`, `החלקה הצידה מעל ${chordNameIn(c, key)}: ${pairNameIn(c, key)} בפנים, ${slipName(c, 1)} בחוץ, בפנים, ${slipName(c, -1)} בחוץ, הביתה`);
  } else if (s.kind === 'tpk-sym') {
    if (op === 0) {
      // the tritone pair moved up a minor 3rd each bar — all four inside the half-whole scale of the dominant
      const c = coreById('hw-tritone');
      bs = vampBars(key, c, 4, true);
      shift = [0, 3, 6, 9];
      const seq = [0, 3, 6, 9].map((d) => slipName(c, d)).join(', ');
      what = t(`The tritone pair in minor 3rds over ${chordNameIn(c, key)} (half-whole): ${seq}`, `זוג הטריטון בטרצות קטנות מעל ${chordNameIn(c, key)} (חצי-שלם): ${seq}`);
    } else {
      const c = coreById(op === 1 ? 'augmented' : 'whole-tone');
      bs = vampBars(key, c, 4);
      what = t(`${pairT(c, key).en}: alternating inversions`, `${pairT(c, key).he}: היפוכים מתחלפים`);
    }
  } else {
    const P = progById(s.kind === 'tpk-blues' ? 'blues' : s.kind === 'tpk-form' ? 'form' : ['iivi', 'iivi-col', 'iivi-min'][Math.min(2, op)]);
    bs = barsOf(key, P.prog);
    const list = (w: string) => bs.map((b) => `${b.pair} ${w} ${b.name}`).filter((x, i, a) => a.indexOf(x) === i).join(', ');
    // ii–V–I names its three pairs; the blues and the form name the chart only (a title that fits one screen; the
    // brief page's lesson and the written notes carry the pairs)
    what = P.prog.length <= 3
      ? t(`Triad-pair lines through ${P.n.en} in ${KEY_NAME[key]}: ${list('over')}`, `קווי זוגות משולשים לאורך ${P.n.he} ב־${KEY_NAME[key]}: ${list('מעל')}`)
      : t(`Triad-pair lines through ${P.n.en} in ${KEY_NAME[key]}`, `קווי זוגות משולשים לאורך ${P.n.he} ב־${KEY_NAME[key]}`);
  }
  const line = linesOver(bs, pat, 55, 81, shift);
  const sp: DrillSpec = { ...s, key, hands: 'R', swing: true };
  const d = lineDrill(sp, line, pianoTitle([what], sp), {}, s.kind === 'tpk-vamp' || s.kind === 'tpk-slip' ? sigOf(bs[0].c.scale, key) : SIG[key], 80);
  const chart = [...chartOfBars(bs), bs[bs.length - 1].sym];
  return { ...d, chart, band: { style: 'swing', bass: true }, drums: { groove: 'swing' } };
}

/** The keys entry (generate.ts). */
export function genTpairKeys(s: DrillSpec): Drill {
  const key = mod12(s.key);
  switch (s.kind) {
    case 'tpk-pat':
      return genPattern(s, key);
    case 'tpk-close':
      return genClose(s, key);
    case 'tpk-spread':
      return genSpread(s, key);
    case 'tpk-block':
      return genBlock(s, key);
    case 'tpk-comp':
      return genComp(s, key);
    case 'tpk-vamp':
    case 'tpk-iivi':
    case 'tpk-blues':
    case 'tpk-form':
    case 'tpk-slip':
    case 'tpk-sym':
      return genLines(s, key);
  }
  throw new Error(`Unknown k-tpair kind ${s.kind}`);
}

// ───────────────────────────── keys catalogue ─────────────────────────────

type Row = { kind: string; ops: number[]; rating: number; en: string; he: string; tempo: [number, number]; hands?: 'R' | 'RL' };
const o = tpOp;
export const KTP_ROWS: Row[] = [
  { kind: 'tpk-pat', ops: [o('dorian', 0), o('lydian', 0), o('mixo-no11', 0)], rating: 1350, en: 'Pairs in root position, 1-3-5 up and back', he: 'זוגות במצב יסודי, 1-3-5 למעלה ובחזרה', tempo: [60, 120], hands: 'R' },
  { kind: 'tpk-pat', ops: [o('dorian', 1), o('ionian', 2), o('aeolian', 1), o('mixo-no11', 2)], rating: 1400, en: 'The other permutations: 3-5-1 and 5-1-3', he: 'הפרמוטציות האחרות: 3-5-1 ו־5-1-3', tempo: [60, 120], hands: 'R' },
  { kind: 'tpk-close', ops: [o('dorian'), o('lydian'), o('mixolydian'), o('altered')], rating: 1420, en: 'Pair triads over the root and 7th', he: 'משולשי הזוג מעל היסוד והספטימה', tempo: [60, 100], hands: 'RL' },
  { kind: 'tpk-pat', ops: [o('lydian-dom', 3), o('half-dim', 3), o('lydian', 3)], rating: 1450, en: 'Alternating inversions', he: 'היפוכים מתחלפים', tempo: [60, 120], hands: 'R' },
  { kind: 'tpk-pat', ops: [o('dorian', 4), o('lydian', 4), o('half-dim', 5), o('altered', 5)], rating: 1500, en: 'Intervallic cells: two-note cells and open triads', he: 'תאים אינטרוולים: תאים של שני צלילים ומשולשים פתוחים', tempo: [60, 112], hands: 'R' },
  { kind: 'tpk-pat', ops: [o('altered', 6), o('lydian', 6), o('phryg-dom', 7)], rating: 1540, en: 'The hexatonic scale over two and three octaves', he: 'הסולם ההקסטוני על שתיים ושלוש אוקטבות', tempo: [60, 120], hands: 'R' },
  { kind: 'tpk-spread', ops: [o('dorian'), o('lydian'), o('half-dim')], rating: 1560, en: 'Spread across two hands', he: 'פרוש בין שתי הידיים', tempo: [56, 96], hands: 'RL' },
  { kind: 'tpk-pat', ops: [o('mixo-no11', 8), o('dorian', 8), o('altered', 9)], rating: 1580, en: 'Groupings: triplets, and 3 over 4 in 16ths', he: 'חלוקות: טריולות, ו־3 על 4 בשש־עשריות', tempo: [50, 96], hands: 'R' },
  { kind: 'tpk-vamp', ops: [o('dorian', 0), o('lydian-dom', 1), o('altered', 2)], rating: 1600, en: 'Pair lines over a vamp with the band', he: 'קווי זוגות מעל וואמפ עם הלהקה', tempo: [70, 140], hands: 'R' },
  { kind: 'tpk-block', ops: [o('dorian'), o('ionian'), o('mixo-no11')], rating: 1640, en: 'Block chords: the melody on top of its triad', he: 'אקורדי בלוק: המנגינה מעל המשולש שלה', tempo: [56, 100], hands: 'RL' },
  { kind: 'tpk-iivi', ops: [0, 1, 2], rating: 1660, en: 'Pair lines through ii–V–I, major and minor', he: 'קווי זוגות לאורך ii–V–I, מז׳ור ומינור', tempo: [70, 140], hands: 'R' },
  { kind: 'tpk-comp', ops: [0, 1, 2], rating: 1700, en: 'Comping a chart with pair triads', he: 'ליווי מהלך עם משולשי זוגות', tempo: [70, 130], hands: 'RL' },
  { kind: 'tpk-blues', ops: [0], rating: 1740, en: 'Pair lines over a jazz blues', he: 'קווי זוגות על בלוז ג׳אז', tempo: [80, 150], hands: 'R' },
  { kind: 'tpk-slip', ops: [0], rating: 1760, en: 'Advanced: side-slip, a half step out and back', he: 'מתקדם: החלקה הצידה, חצי טון החוצה ובחזרה', tempo: [70, 140], hands: 'R' },
  { kind: 'tpk-form', ops: [0], rating: 1800, en: 'Pair lines through an 8-bar form', he: 'קווי זוגות לאורך צורה של 8 תיבות', tempo: [80, 150], hands: 'R' },
  { kind: 'tpk-sym', ops: [0, 1, 2], rating: 1840, en: 'Advanced: symmetric pairs, the tritone pair in minor 3rds', he: 'מתקדם: זוגות סימטריים, זוג הטריטון בטרצות קטנות', tempo: [70, 140], hands: 'R' },
];
export function keysTpairFamily(): FamilyDef {
  return {
    id: 'k-tpair',
    title: t('Triad pairs', 'זוגות משולשים'),
    style: 'jazz',
    levels: KTP_ROWS.map((r, i): LevelDef => ({ id: `k-tpair-${i + 1}`, level: i + 1, title: t(r.en, r.he), specs: r.ops.map((op) => ({ family: 'k-tpair' as FamilyId, kind: r.kind, hands: r.hands ?? 'R', option: op, tempo: r.tempo[0] })), keys: TP_KEYS, tempo: r.tempo })),
  };
}

// ───────────────────────────── guitar ─────────────────────────────

type P = { s: number; f: number };
/** Place pitches on a set of strings with the least hand motion (frets 0–maxFret). */
export function placeOnSet(tu: Tuning, ps: number[], strings: number[], maxFret = 15): P[] {
  const cands = ps.map((m) =>
    strings
      .filter((s) => s <= tu.open.length)
      .map((s) => ({ s, f: m - tu.open[s - 1] }))
      .filter((x) => x.f >= 0 && x.f <= maxFret),
  );
  if (cands.some((c) => !c.length)) throw new Error('triad pair: a note does not fit the string set');
  const cost: number[][] = cands.map((c) => c.map(() => Infinity));
  const from: number[][] = cands.map((c) => c.map(() => -1));
  cands[0].forEach((x, j) => (cost[0][j] = Math.abs(x.f - 5) * 0.2));
  for (let i = 1; i < cands.length; i++)
    cands[i].forEach((x, j) => {
      cands[i - 1].forEach((y, k) => {
        const c = cost[i - 1][k] + (x.f && y.f ? Math.abs(x.f - y.f) : 1) + (x.s !== y.s ? 0.3 : 0) + (Math.abs(x.f - y.f) > 4 ? 3 : 0);
        if (c < cost[i][j]) {
          cost[i][j] = c;
          from[i][j] = k;
        }
      });
    });
  const n = cands.length;
  let j = cost[n - 1].indexOf(Math.min(...cost[n - 1]));
  const out: P[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.unshift(cands[i][j]);
    j = from[i][j];
  }
  return out;
}
/** Close triad shapes on a fixed string set (one note a string, rising, fretted notes within 4 frets). */
export function setShapes(tu: Tuning, pcs: number[], strings: number[]): P[][] {
  const want = new Set(pcs.map(mod12));
  const out: P[][] = [];
  const rec = (i: number, acc: P[]) => {
    if (i === strings.length) {
      const ms = acc.map((p) => noteAt(tu, p.s, p.f));
      if (!ms.every((m, k) => k === 0 || m > ms[k - 1])) return;
      if (new Set(ms.map(mod12)).size !== want.size) return;
      const fr = acc.map((p) => p.f).filter((f) => f > 0);
      if (fr.length && Math.max(...fr) - Math.min(...fr) > 4) return;
      out.push(acc.slice());
      return;
    }
    for (let f = 0; f <= 15; f++) if (want.has(mod12(noteAt(tu, strings[i], f)))) rec(i + 1, [...acc, { s: strings[i], f }]);
  };
  rec(0, []);
  return out;
}
const topOf = (tu: Tuning, v: P[]): number => Math.max(...v.map((p) => noteAt(tu, p.s, p.f)));
const lowFret = (v: P[]): number => Math.min(...v.map((p) => p.f));
const strum = (v: P[]) => v.map((x) => ({ ...x, tech: 'strum-down' as const, stroke: 'D' as const }));
const pick8 = (ps: P[], start = 0): Ev[] => ps.map((p, i) => ({ beat: start + i * 0.5, dur: i === ps.length - 1 ? 2 : 0.5, notes: [{ ...p, stroke: i % 2 === 0 ? ('D' as const) : ('U' as const) }] }));
const SETS: Record<'top' | 'mid', { strings: number[]; en: string; he: string }> = {
  top: { strings: [3, 2, 1], en: 'strings 3–1', he: 'מיתרים 3–1' },
  mid: { strings: [4, 3, 2], en: 'strings 4–2', he: 'מיתרים 4–2' },
};
const gTitle = (en: string, he: string): T2 => t(en, isoLatin(he));
export function genTpairGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const { c, v } = tpDec(s.option ?? 0);
  const [A, B] = coreTriads(c, key);
  const sig = sigOf(c.scale, key);
  switch (s.kind) {
    case 'gtp-shapes': {
      // The pair's shapes on one string set: A, B, A, B … each the next shape up, then back down (quarters).
      const set = SETS[v === 1 ? 'mid' : 'top'];
      const up: P[][] = [];
      let top = 0;
      for (let i = 0; i < 6; i++) {
        const cands = setShapes(tu, i % 2 === 0 ? A : B, set.strings).filter((x) => topOf(tu, x) > top && lowFret(x) <= 13);
        if (!cands.length) break;
        const x = cands.reduce((p, q) => (topOf(tu, q) < topOf(tu, p) ? q : p));
        up.push(x);
        top = topOf(tu, x);
      }
      const seq = [...up, ...up.slice(0, -1).reverse()];
      const evs: Ev[] = seq.map((x, i) => ({ beat: i, dur: i === seq.length - 1 ? 2 : 1, notes: strum(x) }));
      const d = gFinish({ ...s, key }, tu, evs, { title: gTitle(`${pairT(c, key).en}: shapes up the neck on ${set.en}`, `${pairT(c, key).he}: צורות לאורך הצוואר על ${set.he}`), bpm: 60, evenness: false, keySig: sig });
      return { ...d, chart: Array.from({ length: Math.ceil(d.beats / 4) }, () => chordChartIn(c, key)) };
    }
    case 'gtp-line': {
      // A pair line on one string set: v 0 root position on the top three, 1 alternating inversions on the middle three.
      const set = SETS[v === 1 ? 'mid' : 'top'];
      // the set's whole compass to fret 17 (G3–A5 on 3–1, D3–E5 on 4–2), starting on whichever triad lies lower; on the
      // top three the one-shape permutation (1-3-5, 3-5-1 or 5-1-3) that covers the most of the set in this key
      const base = tu.open[set.strings[0] - 1];
      const hi = tu.open[set.strings[set.strings.length - 1] - 1] + 17;
      const pats: PatId[] = v === 1 ? ['inv'] : ['root', 'perm1', 'perm2'];
      const tries = pats.flatMap((p) => [
        { p, ps: patternUpDown(A, B, p, p === 'root' || p === 'inv' ? pin(A[0], base) : base + 7, hi) },
        { p, ps: patternUpDown(B, A, p, p === 'root' || p === 'inv' ? pin(B[0], base) : base + 7, hi) },
      ]).filter((x) => x.ps.every((m) => m >= base));
      const best = tries.reduce((x, y) => (y.ps.length > x.ps.length ? y : x));
      const pat = best.p;
      const ps = best.ps;
      const evs = pick8(placeOnSet(tu, ps, set.strings, 17));
      const d = gFinish({ ...s, key }, tu, evs, { title: gTitle(`${pairT(c, key).en}: ${PAT_NAME[pat].en} on ${set.en}`, `${pairT(c, key).he}: ${PAT_NAME[pat].he} על ${set.he}`), bpm: 60, evenness: true, keySig: sig });
      return { ...d, chart: Array.from({ length: Math.ceil(d.beats / 4) }, () => chordChartIn(c, key)) };
    }
    case 'gtp-hex': {
      // The hexatonic scale in one position, two octaves up and back.
      const lo = pin(A[0], 43);
      const ps = patternUpDown(A, B, 'hex', lo, lo + 24);
      const evs = pick8(placeOnSet(tu, ps, [6, 5, 4, 3, 2, 1]));
      const d = gFinish({ ...s, key }, tu, evs, { title: gTitle(`${pairT(c, key).en}: the hexatonic scale, two octaves`, `${pairT(c, key).he}: הסולם ההקסטוני, שתי אוקטבות`), bpm: 60, evenness: true, keySig: sig });
      return { ...d, chart: Array.from({ length: Math.ceil(d.beats / 4) }, () => chordChartIn(c, key)) };
    }
    case 'gtp-comp': {
      // Comping ii–V–I with the pair shapes on strings 3–1: the first triad on 1, the second on the "and" of 2, voice-led.
      const P = progById(['iivi', 'iivi-col', 'iivi-min'][Math.min(2, s.option ?? 0)]);
      const bs = barsOf(key, P.prog);
      const evs: Ev[] = [];
      let prevTop = -1;
      let bar = 0;
      for (const b of bs) {
        const [X, Y] = coreTriads(b.c, b.r);
        for (let k = 0; k < b.bars; k++) {
          const pickNear = (T: number[]) => {
            const cs = setShapes(tu, T, [3, 2, 1]).filter((x) => lowFret(x) >= 1 && lowFret(x) <= 12);
            return cs.reduce((p, q) => (Math.abs(topOf(tu, q) - (prevTop < 0 ? 70 : prevTop)) < Math.abs(topOf(tu, p) - (prevTop < 0 ? 70 : prevTop)) ? q : p));
          };
          const vX = pickNear(X);
          prevTop = topOf(tu, vX);
          const vY = pickNear(Y);
          prevTop = topOf(tu, vY);
          evs.push({ beat: bar * 4, dur: 1.5, notes: strum(vX) }, { beat: bar * 4 + 1.5, dur: 2.5, notes: strum(vY) });
          bar++;
        }
      }
      const d = gFinish({ ...s, key, swing: true }, tu, evs, { title: gTitle(`Comping ${P.n.en} in ${KEY_NAME[key]} with pair shapes on strings 3–1`, `ליווי ${P.n.he} ב־${KEY_NAME[key]} עם צורות זוג על מיתרים 3–1`), bpm: 70, evenness: false, keySig: SIG[key] });
      return { ...d, chart: chartOfBars(bs), band: { style: 'swing', bass: true }, drums: { groove: 'swing' } };
    }
    case 'gtp-iivi':
    case 'gtp-slip': {
      let bs: TPBar[];
      let shift: number[] = [];
      let ttl: T2;
      if (s.kind === 'gtp-slip') {
        const cd = coreById('dorian');
        bs = vampBars(key, cd, 4, true);
        shift = [0, 1, 0, -1];
        ttl = gTitle(`Side-slip over ${chordNameIn(cd, key)}: ${pairNameIn(cd, key)} in, a half step up, in, a half step down`, `החלקה הצידה מעל ${chordNameIn(cd, key)}: ${pairNameIn(cd, key)} בפנים, חצי טון למעלה, בפנים, חצי טון למטה`);
      } else {
        const P = progById(['iivi', 'iivi-col', 'iivi-min'][Math.min(2, s.option ?? 0)]);
        bs = barsOf(key, P.prog);
        ttl = gTitle(`Triad-pair lines through ${P.n.en} in ${KEY_NAME[key]}`, `קווי זוגות משולשים לאורך ${P.n.he} ב־${KEY_NAME[key]}`);
      }
      const line = linesOver(bs, 'inv', 50, 74, shift);
      const pl = placeOnSet(tu, line.map((n) => n.p), [6, 5, 4, 3, 2, 1]);
      const evs: Ev[] = line.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...pl[i], stroke: i % 2 === 0 ? ('D' as const) : ('U' as const) }] }));
      const d = gFinish({ ...s, key, swing: true }, tu, evs, { title: ttl, bpm: 80, evenness: true, keySig: SIG[key] });
      return { ...d, chart: [...chartOfBars(bs), bs[bs.length - 1].sym], band: { style: 'swing', bass: true }, drums: { groove: 'swing' } };
    }
  }
  throw new Error(`Unknown g-tpair kind ${s.kind}`);
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
export const GTP_ROWS: { kind: string; ops: number[]; grade: number; rating: number; en: string; he: string; sub: string; tempo: [number, number] }[] = [
  { kind: 'gtp-shapes', ops: [o('dorian', 1), o('lydian', 1), o('mixo-no11', 0), o('ionian', 0)], grade: 7, rating: 1380, en: 'Pair shapes on strings 4–2 and 3–1', he: 'צורות זוג על מיתרים 4–2 ו־3–1', sub: 'quarters', tempo: [60, 100] },
  { kind: 'gtp-line', ops: [o('dorian', 0), o('ionian', 0), o('mixo-no11', 0)], grade: 7, rating: 1420, en: 'Pair lines on strings 3–1', he: 'קווי זוגות על מיתרים 3–1', sub: '8ths', tempo: [60, 110] },
  { kind: 'gtp-line', ops: [o('lydian-dom', 1), o('half-dim', 1), o('lydian', 1)], grade: 8, rating: 1480, en: 'Alternating inversions on strings 4–2', he: 'היפוכים מתחלפים על מיתרים 4–2', sub: '8ths', tempo: [60, 110] },
  { kind: 'gtp-hex', ops: [o('altered'), o('lydian'), o('phryg-dom')], grade: 8, rating: 1540, en: 'The hexatonic scale in position', he: 'הסולם ההקסטוני במצב אחד', sub: '8ths', tempo: [60, 120] },
  { kind: 'gtp-comp', ops: [0, 1, 2], grade: 9, rating: 1650, en: 'Comping ii–V–I with pair shapes', he: 'ליווי ii–V–I עם צורות זוג', sub: 'Charleston', tempo: [70, 130] },
  { kind: 'gtp-iivi', ops: [0, 1, 2], grade: 9, rating: 1700, en: 'Pair lines through ii–V–I', he: 'קווי זוגות לאורך ii–V–I', sub: 'swung 8ths', tempo: [70, 140] },
  { kind: 'gtp-slip', ops: [0], grade: 10, rating: 1780, en: 'Advanced: side-slip pairs', he: 'מתקדם: זוגות בהחלקה הצידה', sub: 'swung 8ths', tempo: [70, 140] },
];
export function guitarTpairFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  return fam('g-tpair', 'Triad pairs on guitar', 'זוגות משולשים בגיטרה', 'jazz', ['jazz'], GTP_ROWS.map((r, i) => LT('g-tpair', i + 1, r.en, r.he, r.ops.map((op) => ({ family: 'g-tpair' as FamilyId, kind: r.kind, hands: 'R' as const, instrument: 'guitar' as const, option: op, tempo: r.tempo[0] })), TP_KEYS, r.tempo, r.sub, r.grade)));
}

// ───────────────────────────── bass ─────────────────────────────

/** The bass range of a pair line from a triad root: the lowest such root from E1 up, `oct` octaves (to G3 at most). */
export const bassRange = (rootPc: number, oct: number): [number, number] => {
  const lo = pin(rootPc, 28);
  return [lo, Math.min(lo + Math.round(12 * oct) + 2, 62)];
};
export function genTpairBass(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const { c } = tpDec(s.option ?? 0);
  const fix = (d: Drill): Drill => ({ ...d, title: { en: d.title.en, he: isoLatin(d.title.he) } });
  switch (s.kind) {
    case 'btp-arp':
    case 'btp-inv': {
      const inv = s.kind === 'btp-inv';
      const [A, B] = coreTriads(c, key);
      // from whichever triad's root lies lower on the neck (the line starts on a chord sound either way)
      const line2 = (X: number[], Y: number[]) => {
        const [lo, hi] = bassRange(X[0], inv ? 2 : 1.75);
        return patternUpDown(X, Y, inv ? 'inv' : 'root', lo, hi);
      };
      const a = line2(A, B);
      const b = line2(B, A);
      const ps = b.length > a.length ? b : a;
      const line: BN[] = ps.map((p, i) => ({ b: i / 2, d: i === ps.length - 1 ? 2 : 0.5, p, ct: true }));
      const nm = pairT(c, key);
      return fix({ ...drillOf({ ...s, key }, tu, alt(line), { en: `${nm.en}: ${inv ? PAT_NAME.inv.en + ', two octaves' : 'arpeggiated, root position'}`, he: `${nm.he}: ${inv ? PAT_NAME.inv.he + ', שתי אוקטבות' : 'ארפג׳יו, מצב יסודי'}`, chart: Array.from({ length: Math.ceil(line.length / 8) }, () => chordChartIn(c, key)), keySig: sigOf(c.scale, key), evenness: true }), keySig: sigOf(c.scale, key) });
    }
    case 'btp-iivi':
    case 'btp-blues':
    case 'btp-slip': {
      let bs: TPBar[];
      let shift: number[] = [];
      let en: string;
      let he: string;
      if (s.kind === 'btp-slip') {
        const cd = coreById('dorian');
        bs = vampBars(key, cd, 4, true);
        shift = [0, 1, 0, -1];
        en = `Side-slip over ${chordNameIn(cd, key)}: ${pairNameIn(cd, key)} in, a half step up, in, a half step down`;
        he = `החלקה הצידה מעל ${chordNameIn(cd, key)}: ${pairNameIn(cd, key)} בפנים, חצי טון למעלה, בפנים, חצי טון למטה`;
      } else {
        const P = progById(s.kind === 'btp-blues' ? 'blues' : ['iivi', 'iivi-col', 'iivi-min'][Math.min(2, s.option ?? 0)]);
        bs = barsOf(key, P.prog);
        en = `Triad-pair lines through ${P.n.en}`;
        he = `קווי זוגות משולשים לאורך ${P.n.he}`;
      }
      const line = linesOver(bs, 'root', 33, 57, shift);
      const bn: BN[] = line.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: true }));
      return fix(drillOf({ ...s, key, swing: true }, tu, alt(bn), { en, he, chart: [...chartOfBars(bs), bs[bs.length - 1].sym], drums: { groove: 'swing' }, evenness: true, keySig: SIG[key] }));
    }
  }
  throw new Error(`Unknown b-tpair kind ${s.kind}`);
}
type BLFn = (fam: 'b-tpair', level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: 'b-tpair', en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
export const BTP_ROWS: { kind: string; ops: number[]; rating: number; en: string; he: string; tempo: [number, number]; sub: string }[] = [
  { kind: 'btp-arp', ops: [o('dorian'), o('lydian'), o('mixo-no11')], rating: 1400, en: 'Arpeggiated pair lines', he: 'קווי זוגות בארפג׳יו', tempo: [60, 110], sub: '8ths' },
  { kind: 'btp-inv', ops: [o('mixo-no11'), o('altered'), o('ionian')], rating: 1460, en: 'Alternating inversions over two octaves', he: 'היפוכים מתחלפים על שתי אוקטבות', tempo: [60, 110], sub: '8ths' },
  { kind: 'btp-iivi', ops: [0, 1, 2], rating: 1580, en: 'Pair lines through ii–V–I', he: 'קווי זוגות לאורך ii–V–I', tempo: [70, 130], sub: 'swung 8ths' },
  { kind: 'btp-blues', ops: [0], rating: 1640, en: 'Pair lines over a jazz blues', he: 'קווי זוגות על בלוז ג׳אז', tempo: [80, 140], sub: 'swung 8ths' },
  { kind: 'btp-slip', ops: [0], rating: 1720, en: 'Advanced: side-slip pair lines', he: 'מתקדם: קווי זוגות בהחלקה הצידה', tempo: [70, 130], sub: 'swung 8ths' },
];
export function bassTpairFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  return fam('b-tpair', 'Triad pairs on bass', 'זוגות משולשים בבס', BTP_ROWS.map((r, i) => L('b-tpair', i + 1, r.en, r.he, r.ops.map((op) => ({ family: 'b-tpair' as FamilyId, kind: r.kind, hands: 'R' as const, instrument: 'bass' as const, option: op, tempo: r.tempo[0] })), TP_KEYS, r.tempo, r.sub)));
}

// ───────────────────────────── path ─────────────────────────────

/** The rows' ratings by level id (must equal ../tpairPlacement.ts, which the path reads; tests check it). */
export const TPAIR_ROW_RATINGS: Record<string, number> = {
  ...Object.fromEntries(KTP_ROWS.map((r, i) => [`k-tpair-${i + 1}`, r.rating])),
  ...Object.fromEntries(GTP_ROWS.map((r, i) => [`g-tpair-${i + 1}`, r.rating])),
  ...Object.fromEntries(BTP_ROWS.map((r, i) => [`b-tpair-${i + 1}`, r.rating])),
};
export const TPAIR_LEVEL_IDS = {
  keys: KTP_ROWS.map((_, i) => `k-tpair-${i + 1}`),
  guitar: GTP_ROWS.map((_, i) => `g-tpair-${i + 1}`),
  bass: BTP_ROWS.map((_, i) => `b-tpair-${i + 1}`),
};
/** Grouping helper for tests: notes a beat of a pattern variant. */
export const variantPerBeat = (v: number): number => PER_BEAT[TP_VARIANTS[v].g];
export { motion as tpMotion };
