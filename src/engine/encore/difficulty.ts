// Phrase difficulty and XP (SPEC-PHRASE-STUDIO §10). A deterministic, versioned model puts a phrase on the app's own
// rating scale (700–1900, G(grade) = 700 + 90·grade, levelPlacement.ts):
//
//   D(phrase, instrument, hands, key, bpm) = clamp(700, 1900, 700 + M(material) + P(physical, key) + T(tempo))
//
// M (0–600) is what the notes ask in any key at any tempo; P (0–250) the physical cost on this instrument in this key
// (piano in v1); T (0–450) the tempo demand, scaled by the material — trivial material at an extreme tempo earns only
// a moderate amount. XP per measured take, promotion bonuses, a daily cap per phrase and the anti-gaming factor follow.
// No AI. Weights change only with a release (PHRASE_DIFF_V).
//
// Calibration (v1, tests/encoreDifficulty.test.ts): C–D–E in quarters ≈ 715 and ~1 XP a take; a 4-bar right-hand
// bebop line over a ii–V–I at ♩200 ≈ G7; the same line with an independent left hand ≈ G8+ and ~10 XP a clean take;
// against the placed difficulty of built-in technique levels (LEVEL_PLACEMENT) the model keeps the order (Spearman ρ
// reported by the test).

import type { Drill } from '../drills/types';
import { LICK_Q, chordAt, type Lick, type LickChord, type LickInstrument } from '../licks';
import { finalHand, phraseNeck, phrasePitches, planOf, type Hand } from './phrase';
import { neckStats, singerRange, voiceStats, type Placed, type Range } from './placement';

export const PHRASE_DIFF_V = 1;
const mod = (n: number, m = 12) => ((n % m) + m) % m;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sat = (x: number, x95: number) => clamp(x / x95, 0, 1);

/** One note of the model's input: sounding pitch, onset and length in beats, hand. */
export interface DNote {
  midi: number;
  beat: number;
  dur: number;
  hand: 'R' | 'L';
  /** Guitar / bass: where the note is played (§7.4) — the physical cost reads it. */
  string?: number;
  fret?: number;
}
export interface DInput {
  notes: DNote[];
  /** Chords relative to `tonic` (LickChord), [] = none (the key's scale is the reference). */
  chords: LickChord[];
  tonic: number;
  minor?: boolean;
  meter: number;
  /** Voice: the singer's range (§10.3). */
  range?: Range & { brk?: number };
}

// ───────────────────────────── features (§10.2) ─────────────────────────────

export interface Features {
  n: number;
  nEff: number;
  bars: number;
  longestRun: number;
  density: number;
  syncopation: number;
  switches: number;
  meanInterval: number;
  leapShare: number;
  range: number;
  chromatic: number;
  approaches: number;
  enclosures: number;
  pivots: number;
  nctStrong: number;
  /** 0 one hand … 1 fully independent hands. */
  handsIndep: number;
  twoHands: boolean;
  trivial: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10, 11];

/** Chord context at a beat: chord tones and scale (pitch classes, absolute). */
function contextAt(inp: DInput, beat: number): { ct: number[]; sc: number[] } {
  if (!inp.chords.length) {
    const sc = (inp.minor ? MINOR : MAJOR).map((x) => mod(x + inp.tonic));
    const ct = (inp.minor ? [0, 3, 7] : [0, 4, 7]).map((x) => mod(x + inp.tonic));
    return { ct, sc };
  }
  const c = inp.chords[chordAt(inp.chords, beat)];
  const q = LICK_Q[c[1]] ?? LICK_Q.maj7;
  const root = mod(inp.tonic + c[0]);
  return { ct: q.ct.map((x) => mod(x + root)), sc: q.sc.map((x) => mod(x + root)) };
}

/** The main line: right-hand notes (or the left hand when there are none), top note of a chord, in time order. */
function lineOf(ns: DNote[]): DNote[] {
  const by = new Map<number, DNote>();
  for (const n of ns) {
    const k = Math.round(n.beat * 1000);
    const cur = by.get(k);
    if (!cur || n.midi > cur.midi) by.set(k, n);
  }
  return [...by.values()].sort((a, b) => a.beat - b.beat);
}

/** Effective length: a cell (2–6 notes) repeating exactly or transposed (same intervals and rhythm) counts ¼ after the first time. */
export function effectiveLength(line: DNote[]): number {
  const tok = line.map((n, i) => (i ? `${n.midi - line[i - 1].midi}/${Math.round((n.beat - line[i - 1].beat) * 12)}` : 'start'));
  let rep = 0;
  let i = 1;
  while (i < tok.length) {
    let hit = 0;
    for (let len = Math.min(6, tok.length - i); len >= 2; len--) {
      const cell = tok.slice(i, i + len).join(' ');
      const before = tok.slice(1, i).join(' ');
      if (before.includes(cell)) {
        hit = len;
        break;
      }
    }
    if (hit) {
      rep += hit;
      i += hit;
    } else i++;
  }
  return line.length - rep + 0.25 * rep;
}

export function features(inp: DInput): Features {
  const ns = [...inp.notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  const rh = ns.filter((n) => n.hand === 'R');
  const lh = ns.filter((n) => n.hand === 'L');
  const main = lineOf(rh.length ? rh : lh);
  const n = ns.length;
  const end = Math.max(0, ...ns.map((x) => x.beat + x.dur));
  const bars = Math.max(1, Math.ceil(end / inp.meter - 1e-6));
  const nEff = effectiveLength(main) + (lh.length && rh.length ? effectiveLength(lineOf(lh)) * 0.6 : 0);
  // onsets per beat (both hands, chords once): the median over beats that have notes
  const onsets = [...new Set(ns.map((x) => Math.round(x.beat * 1000)))].map((x) => x / 1000).sort((a, b) => a - b);
  const perBeat = new Map<number, number>();
  for (const o of onsets) perBeat.set(Math.floor(o + 1e-6), (perBeat.get(Math.floor(o + 1e-6)) ?? 0) + 1);
  const pb = [...perBeat.values()].sort((a, b) => a - b);
  const density = pb.length ? pb[pb.length >> 1] : 0;
  // longest run without a rest (beats)
  let run = 0;
  let longestRun = 0;
  for (let i = 1; i < main.length; i++) {
    const gap = main[i].beat - (main[i - 1].beat + main[i - 1].dur);
    if (gap < 0.5) run += main[i].beat - main[i - 1].beat;
    else run = 0;
    longestRun = Math.max(longestRun, run);
  }
  // syncopation: onsets off the beat not followed by an onset on the next stronger position
  let sync = 0;
  for (let i = 0; i < onsets.length; i++) {
    const f = onsets[i] - Math.floor(onsets[i] + 1e-6);
    if (f < 0.01) continue;
    const nextBeat = Math.floor(onsets[i] + 1e-6) + 1;
    const hasNext = onsets.some((o) => Math.abs(o - nextBeat) < 0.01);
    if (!hasNext) sync++;
  }
  const syncopation = onsets.length ? sync / onsets.length : 0;
  // subdivision switches between beats (duple ↔ triplet)
  const kind = new Map<number, 'd' | 't'>();
  for (const o of onsets) {
    const f = o - Math.floor(o + 1e-6);
    if (f < 0.01) continue;
    const t = Math.abs(f * 3 - Math.round(f * 3)) < 0.03 && Math.abs(f * 4 - Math.round(f * 4)) > 0.03;
    kind.set(Math.floor(o + 1e-6), t ? 't' : 'd');
  }
  const ks = [...kind.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  let switches = 0;
  for (let i = 1; i < ks.length; i++) if (ks[i] !== ks[i - 1]) switches++;
  // intervals and range (main line)
  const iv = main.slice(1).map((x, i) => Math.abs(x.midi - main[i].midi));
  const meanInterval = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : 0;
  const leapShare = iv.length ? iv.filter((x) => x > 4).length / iv.length : 0;
  const range = main.length ? Math.max(...main.map((x) => x.midi)) - Math.min(...main.map((x) => x.midi)) : 0;
  // harmony: chromatic notes, approach notes, enclosures, pivots, non-chord tones on strong beats
  let chrom = 0;
  let approaches = 0;
  let enclosures = 0;
  let pivots = 0;
  let strong = 0;
  let nct = 0;
  const onBeat = (b: number) => Math.abs(b - Math.round(b)) < 0.01;
  for (let i = 0; i < main.length; i++) {
    const x = main[i];
    const c = contextAt(inp, x.beat);
    const pc = mod(x.midi);
    if (!c.sc.includes(pc)) chrom++;
    if (onBeat(x.beat)) {
      strong++;
      if (inp.chords.length && !c.ct.includes(pc)) nct++;
    }
    const isTarget = onBeat(x.beat) && c.ct.includes(pc);
    if (isTarget && i >= 1) {
      const p = main[i - 1];
      if (Math.abs(p.midi - x.midi) <= 2 && Math.abs(p.midi - x.midi) >= 1 && !onBeat(p.beat)) approaches++;
      if (i >= 2) {
        const w = main.slice(Math.max(0, i - 4), i).map((y) => y.midi - x.midi);
        const above = w.some((d) => d > 0 && d <= 2);
        const below = w.some((d) => d < 0 && d >= -2);
        if (above && below) enclosures++;
      }
    }
    if (i >= 2 && i + 2 < main.length) {
      const d1 = Math.sign(x.midi - main[i - 1].midi);
      const d0 = Math.sign(main[i - 1].midi - main[i - 2].midi);
      const d2 = Math.sign(main[i + 1].midi - x.midi);
      const d3 = Math.sign(main[i + 2].midi - main[i + 1].midi);
      if (d0 && d0 === d1 && d2 && d2 === d3 && d2 !== d1 && c.ct.includes(pc)) pivots++;
    }
  }
  const chromatic = main.length ? chrom / main.length : 0;
  const nctStrong = strong ? nct / strong : 0;
  // hands: independence from the rhythm (onsets shared vs not) and contrary motion
  let handsIndep = 0;
  const twoHands = rh.length > 0 && lh.length > 0;
  if (twoHands) {
    // Independence = onsets of one hand while the other hand sounds, not on its onsets (hands taking turns are not
    // independent; hands striking together are coordination, not independence).
    const ro = new Set(rh.map((x) => Math.round(x.beat * 12)));
    const lo = new Set(lh.map((x) => Math.round(x.beat * 12)));
    const sounding = (ns: DNote[], b: number) => ns.some((x) => x.beat < b - 1e-6 && x.beat + x.dur > b + 1e-6);
    let against = 0;
    for (const x of rh) if (!lo.has(Math.round(x.beat * 12)) && sounding(lh, x.beat)) against++;
    for (const x of lh) if (!ro.has(Math.round(x.beat * 12)) && sounding(rh, x.beat)) against++;
    const rhythmDiff = Math.min(1, against / Math.max(1, Math.min(rh.length, lh.length) * 1.2));
    const parallelOct = rh.length === lh.length && rh.every((x, i) => mod(x.midi - lh[i].midi) === 0 && Math.abs(x.beat - lh[i].beat) < 0.01);
    handsIndep = parallelOct ? 0.25 : clamp(0.35 + 0.65 * rhythmDiff, 0, 1);
  }
  const trivial = !twoHands && nEff <= 6 && (isStepRun(main) || new Set(main.map((x) => x.midi)).size <= 1);
  return { n, nEff, bars, longestRun, density, syncopation, switches, meanInterval, leapShare, range, chromatic, approaches, enclosures, pivots, nctStrong, handsIndep, twoHands, trivial };
}
function isStepRun(line: DNote[]): boolean {
  let changes = 0;
  let dir = 0;
  for (let i = 1; i < line.length; i++) {
    const d = line[i].midi - line[i - 1].midi;
    if (Math.abs(d) > 2) return false;
    const s = Math.sign(d);
    if (s && dir && s !== dir) changes++;
    if (s) dir = s;
  }
  return changes <= 1;
}

// ───────────────────────────── M, P, T (§10.2–10.4) ─────────────────────────────

/** Material weights (points at saturation), fitted by hand against the built-in corpus (v1). */
export const W = {
  length: 230,
  density: 70,
  syncopation: 45,
  switches: 30,
  interval: 40,
  leaps: 35,
  range: 35,
  chromatic: 70,
  approaches: 25,
  enclosures: 60,
  pivots: 40,
  nct: 35,
  hands: 200,
};

/** Contributions of each feature to M, in points (the "Why?" list). */
export function materialParts(f: Features): Record<keyof typeof W, number> {
  // Slow material (a melody in quarters, block chords under it): length and hands weigh less (calibration v1: the
  // first-steps and pop levels sat a grade too high without it).
  const slow = 0.5 + 0.5 * clamp((f.density - 0.5) / 1.5, 0, 1);
  const parts = {
    length: W.length * slow * clamp(Math.log2(Math.max(1, f.nEff / 2)) / Math.log2(24), 0, 1),
    density: W.density * sat(Math.max(0, f.density - 1), 3),
    syncopation: W.syncopation * sat(f.syncopation, 0.4),
    switches: W.switches * sat(f.switches / Math.max(1, f.bars), 1),
    interval: W.interval * sat(Math.max(0, f.meanInterval - 2), 6),
    leaps: W.leaps * sat(f.leapShare, 0.4),
    range: W.range * sat(Math.max(0, f.range - 5), 19),
    chromatic: W.chromatic * sat(f.chromatic, 0.3),
    approaches: W.approaches * sat(f.approaches, 4),
    enclosures: W.enclosures * sat(f.enclosures, 3),
    pivots: W.pivots * sat(f.pivots, 3),
    nct: W.nct * sat(f.nctStrong, 0.4),
    hands: f.twoHands ? W.hands * (0.35 + 0.65 * f.handsIndep * slow) : 0,
  };
  // a trivial cell (C–D–E): half weight (it is still notes, but not material)
  if (f.trivial) for (const k of Object.keys(parts) as (keyof typeof parts)[]) parts[k] *= 0.5;
  return parts;
}
export const material = (f: Features): number => clamp(Object.values(materialParts(f)).reduce((a, b) => a + b, 0), 0, 600);

const BLACK = new Set([1, 3, 6, 8, 10]);
/**
 * Piano physical cost (0–250) of the notes as placed: black keys weighted by where they fall (turning points and run
 * ends, where a thumb or 5th lands), crossings (direction runs longer than five notes need a thumb under), stretches
 * beyond an octave inside a beat, and fast repeated notes; both hands summed with a coordination term.
 */
export function pianoCost(notes: DNote[]): number {
  const hand = (ns: DNote[]) => {
    const line = lineOf(ns);
    if (line.length < 2) return 0;
    let black = 0;
    let edgeBlack = 0;
    let cross = 0;
    let stretch = 0;
    let rep = 0;
    let runLen = 1;
    let dir = 0;
    for (let i = 0; i < line.length; i++) {
      const b = BLACK.has(mod(line[i].midi));
      if (b) black++;
      const turn = i === 0 || i === line.length - 1 || Math.sign(line[i].midi - line[i - 1].midi) !== Math.sign((line[i + 1]?.midi ?? line[i].midi) - line[i].midi);
      if (turn && b) edgeBlack++;
      if (i) {
        const d = Math.sign(line[i].midi - line[i - 1].midi);
        if (d && d === dir) runLen++;
        else runLen = 1;
        if (d) dir = d;
        if (runLen > 5 && (runLen - 5) % 4 === 1) cross += b ? 1.6 : 1;
        if (Math.abs(line[i].midi - line[i - 1].midi) > 12 && line[i].beat - line[i - 1].beat <= 1) stretch++;
        if (line[i].midi === line[i - 1].midi && line[i].beat - line[i - 1].beat < 0.5) rep++;
      }
    }
    const n = line.length;
    const chords = ns.length - line.length;
    return 70 * (black / n) + 45 * sat(edgeBlack, Math.max(2, n * 0.3)) + 50 * sat(cross, Math.max(2, n / 8)) + 25 * sat(stretch, 3) + 15 * sat(rep, 4) + 15 * sat(chords, 8);
  };
  const r = notes.filter((x) => x.hand === 'R');
  const l = notes.filter((x) => x.hand === 'L');
  const both = r.length && l.length ? 30 : 0;
  return clamp(hand(r) + hand(l) * 0.8 + both, 0, 250);
}

/** The instrument's reference note rate (notes / s): a graded G8 player's running lines. */
export const NPS_REF: Record<LickInstrument, number> = { piano: 6, guitar: 5.5, bass: 4.5, voice: 3 };

/** Notes per second at a tempo (onsets of both hands, chords once). */
export const npsAt = (f: Pick<Features, 'density'>, bpm: number, onsetRate?: number) => ((onsetRate ?? Math.max(1, f.density)) * bpm) / 60;

/** Tempo demand T (0–450): saturating in r = nps / nps_ref, scaled by the material (m̂^0.6, floor 0.15). */
export function tempoDemand(M: number, nps: number, inst: LickInstrument, trivial = false): number {
  const r = nps / NPS_REF[inst];
  const m = Math.max(0.15, M / 600);
  const t = 450 * Math.pow(m, 0.6) * ((r * r) / (1 + r * r));
  return trivial ? Math.min(t, 110) : t;
}

// ───────────────────────────── D for a phrase, a drill ─────────────────────────────

/** The model's input for a phrase in a key (one hand or both), as transposed and placed (§7.4). */
export function phraseInput(l: Lick, key: number, hand: Hand = finalHand(l), inst: LickInstrument = 'piano'): DInput {
  const p = phrasePitches(l, key, inst);
  const notes: DNote[] = [];
  if (hand !== 'L') l.notes.forEach((n, i) => notes.push({ midi: p.rh[i], beat: n[1], dur: n[2], hand: 'R' }));
  if (hand !== 'R') (l.lh ?? []).forEach((n, i) => notes.push({ midi: p.lh[i], beat: n[1], dur: n[2], hand: 'L' }));
  if (hand === 'L' && !l.lh?.length) l.notes.forEach((n, i) => notes.push({ midi: p.rh[i] - 12, beat: n[1], dur: n[2], hand: 'L' }));
  if (inst !== 'piano') {
    // off the piano a phrase is its main line, placed on the neck (guitar / bass) or in the singer's range (voice)
    const line = notes.filter((n) => n.hand === 'R');
    const nk = inst === 'guitar' || inst === 'bass' ? phraseNeck(l, key, inst) : null;
    const neck = nk?.placed;
    const out = (line.length ? line : notes).map((n, i) => ({ ...n, midi: n.midi + (nk?.shift ?? 0), hand: 'R' as const, ...(neck?.[i] ? { string: neck[i].string, fret: neck[i].fret } : {}) }));
    return { notes: out, chords: l.chords, tonic: mod(key), minor: l.minor, meter: l.meter ?? 4, ...(inst === 'voice' ? { range: singerRange() } : {}) };
  }
  return { notes, chords: l.chords, tonic: mod(key), minor: l.minor, meter: l.meter ?? 4 };
}
/** The model's input for a built-in drill (calibration). */
export function drillInput(d: Drill): DInput {
  const notes: DNote[] = d.notes.filter((n) => n.pitch > 0).map((n) => ({ midi: n.pitch, beat: n.beat, dur: n.dur, hand: n.hand === 'L' ? 'L' : 'R' }));
  return { notes, chords: [], tonic: d.tonic ? d.tonic.key : d.spec.key, minor: d.tonic ? !!d.tonic.minor : !!d.spec.minor, meter: d.meter || 4 };
}

/** Onsets per beat over the whole phrase (the note rate behind T). */
function onsetRate(inp: DInput): number {
  const on = [...new Set(inp.notes.map((n) => Math.round(n.beat * 1000)))].map((x) => x / 1000).sort((a, b) => a - b);
  if (on.length < 2) return 1;
  // the busiest stretch decides: onsets per beat over the longest run without a rest of a beat or more
  let best = 0;
  let s = 0;
  for (let i = 1; i <= on.length; i++) {
    if (i === on.length || on[i] - on[i - 1] >= 1.01) {
      const span = on[i - 1] - on[s];
      if (i - s >= 3 && span > 0) best = Math.max(best, (i - s - 1) / span);
      s = i;
    }
  }
  return Math.max(1, best || on.length / Math.max(1, on[on.length - 1] - on[0]));
}

export interface Difficulty {
  D: number;
  /** Without tempo (XP's base): 700 + M + P. */
  D0: number;
  M: number;
  P: number;
  T: number;
  nps: number;
  f: Features;
  parts: Record<keyof typeof W, number>;
}
export function difficultyOf(inp: DInput, bpm: number | null, inst: LickInstrument = 'piano'): Difficulty {
  const f = features(inp);
  const parts = materialParts(f);
  const M = material(f);
  const P = physicalCost(inp, inst, bpm) * (f.trivial ? 0.5 : 1);
  const nps = bpm ? (onsetRate(inp) * bpm) / 60 : 0;
  const T = bpm ? tempoDemand(M, nps, inst, f.trivial) : 0;
  return { D: Math.round(clamp(700 + M + P + T, 700, 1900)), D0: Math.round(clamp(700 + M + P, 700, 1900)), M: Math.round(M), P: Math.round(P), T: Math.round(T), nps: Math.round(nps * 10) / 10, f, parts };
}
export const phraseDifficulty = (l: Lick, key: number, bpm: number | null, hand: Hand = finalHand(l), inst: LickInstrument = 'piano') => difficultyOf(phraseInput(l, key, hand, inst), bpm, inst);
/** The badge: D in the home key at the target tempo, and its grade (G⁻¹). */
export function badge(l: Lick, inst: LickInstrument = 'piano'): { D: number; grade: number; d: Difficulty } {
  const d = phraseDifficulty(l, l.homeKey ?? 0, planOf(l).goalBpm, finalHand(l), inst);
  return { D: d.D, grade: gradeOf(d.D), d };
}
/** G⁻¹: the grade of a rating (0 … 8; 9+ beyond). */
export const gradeOf = (D: number): number => Math.max(0, Math.round((D - 700) / 90));

/** The three biggest contributors, in words (the one-line why, §10.9). */
export function whyLine(d: Difficulty, lang: 'en' | 'he'): string {
  if (d.f.trivial) return lang === 'he' ? 'כמה צלילים בסולם — שווה מעט נקודות' : 'A few scale notes — worth little XP';
  const names: Record<string, [string, string]> = {
    length: ['long', 'ארוך'],
    density: ['dense', 'צפוף'],
    syncopation: ['off the beat', 'מחוץ לפעמה'],
    switches: ['mixed rhythms', 'מקצבים מתחלפים'],
    interval: ['wide steps', 'צעדים רחבים'],
    leaps: ['leaps', 'קפיצות'],
    range: ['wide range', 'מנעד רחב'],
    chromatic: ['chromatic', 'כרומטי'],
    approaches: ['approach notes', 'צלילי גישה'],
    enclosures: ['enclosures', 'עטיפות'],
    pivots: ['pivots', 'פיבוטים'],
    nct: ['tensions on the beat', 'מתחים על הפעמה'],
    hands: ['two hands', 'שתי ידיים'],
  };
  const top = Object.entries(d.parts)
    .filter(([, v]) => v >= 8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => names[k][lang === 'he' ? 1 : 0]);
  const rate = lang === 'he' ? `${d.nps} צלילים לשנייה` : `${d.nps} notes/s`;
  return [...top, ...(d.nps ? [rate] : [])].join(' · ');
}

// ───────────────────────────── XP (§10.5) ─────────────────────────────

/** base(D₀) = 1 + 11·x^1.2, x = (D₀ − 700) / 1200: 1 XP at 700 … 12 at 1900. */
export const baseXp = (D0: number): number => 1 + 11 * Math.pow(clamp((D0 - 700) / 1200, 0, 1), 1.2);

export type Stage = 'free' | 'quarters' | 'tempo';
export interface TakeXpIn {
  d: Difficulty;
  stage: Stage;
  verdict: 'clean' | 'almost' | 'not';
  /** The key is already passed at the target (maintenance: × 0.5). */
  keyPassed: boolean;
  /** The anti-gaming factor (0.1 … 1). */
  novelty: number;
}
/**
 * XP of one measured take = round(base(D₀) × tempo × key × clean × novelty). Tempo: free 0.3 · quarters 0.4 · at tempo
 * min(1.5, 0.5 + T/225) (calibrated: 1.5 is reached at the middle of the tempo curve), trivial material capped at
 * 1 + m̂. Key: 1 + P/500, × 0.5 once passed. Clean 1 · almost 0.4 · not 0.15. A clean take at tempo earns ≥ 1; a trivial
 * take at free / quarters never more than 1.
 */
export function takeXp(x: TakeXpIn): number {
  const { d } = x;
  const m = Math.max(0.15, d.M / 600);
  let tf = x.stage === 'free' ? 0.3 : x.stage === 'quarters' ? 0.4 : Math.min(1.5, 0.5 + d.T / 225);
  if (d.f.trivial && x.stage === 'tempo') tf = Math.min(tf, 1 + m);
  const kf = (1 + d.P / 500) * (x.keyPassed ? 0.5 : 1);
  const cf = x.verdict === 'clean' ? 1 : x.verdict === 'almost' ? 0.4 : 0.15;
  let xp = Math.round(baseXp(d.D0) * tf * kf * cf * clamp(x.novelty, 0.1, 1));
  if (x.verdict === 'clean' && x.stage === 'tempo') xp = Math.max(1, xp);
  if (d.f.trivial && x.stage !== 'tempo') xp = Math.min(1, xp);
  return Math.max(0, xp);
}
/** The n-th key passed (1-based): B · base / √n, B = 3. */
export const keyBonus = (D0: number, n: number): number => Math.round((3 * baseXp(D0)) / Math.sqrt(Math.max(1, n)));
/** All 12 keys: 6 · base, paid once and in full (outside the cap). */
export const completionBonus = (D0: number): number => Math.round(6 * baseXp(D0));
/** Daily cap per phrase = 20 + 50·x (20 trivial … 70 hardest). */
export const dailyCap = (D0: number): number => Math.round(20 + 50 * clamp((D0 - 700) / 1200, 0, 1));

/** Apply the daily cap: the XP that may still be paid today (completion bonuses bypass the cap). */
export function capXp(earnedToday: number, xp: number, cap: number): number {
  return Math.max(0, Math.min(xp, cap - earnedToday));
}

// ───────────────────────────── anti-gaming (§10.7) ─────────────────────────────

/** A transposition- and tempo-invariant fingerprint: (interval, duration ratio) tokens of the main line. */
export function fingerprint(l: Lick): string[] {
  const ns = [...l.notes].sort((a, b) => a[1] - b[1]);
  const out: string[] = [];
  for (let i = 1; i < ns.length; i++) out.push(`${ns[i][0] - ns[i - 1][0]}:${Math.round((ns[i][1] - ns[i - 1][1]) * 12)}`);
  return out;
}
/** Similarity 0..1: 1 − banded edit distance / longer length. */
export function similarity(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[n][m] / Math.max(n, m);
}
/**
 * Novelty of a take of `l` in `key`: 0.3 for trivial material; vs another of the player's phrases already passed in
 * that key, similarity ≥ 0.85 gives 1 − sim (min 0.1); 1 otherwise.
 */
export function novelty(l: Lick, key: number, others: { l: Lick; passed: number[] }[], trivial: boolean): number {
  let v = trivial ? 0.3 : 1;
  const fp = fingerprint(l);
  for (const o of others) {
    if (o.l.id === l.id || !o.passed.includes(mod(key))) continue;
    const s = similarity(fp, fingerprint(o.l));
    if (s >= 0.85) v = Math.min(v, Math.max(0.1, 1 - s));
  }
  return v;
}

/** The XP preview (§10.9): a clean take at three tempi, per key at the target, and the completion bonus. */
export function xpPreview(l: Lick, inst: LickInstrument = 'piano', keys?: number[]): { tempi: { bpm: number; xp: number }[]; perKey: { key: number; xp: number; P: number }[]; all12: number; cap: number } {
  const p = planOf(l);
  const home = l.homeKey ?? 0;
  const mid = Math.round((p.startBpm + p.goalBpm) / 2);
  const tempi = [p.startBpm, mid, p.goalBpm].map((bpm) => {
    const d = phraseDifficulty(l, home, bpm, finalHand(l), inst);
    return { bpm, xp: takeXp({ d, stage: 'tempo', verdict: 'clean', keyPassed: false, novelty: d.f.trivial ? 0.3 : 1 }) };
  });
  const perKey = (keys ?? Array.from({ length: 12 }, (_, k) => k)).map((key) => {
    const d = phraseDifficulty(l, key, p.goalBpm, finalHand(l), inst);
    return { key, xp: takeXp({ d, stage: 'tempo', verdict: 'clean', keyPassed: false, novelty: d.f.trivial ? 0.3 : 1 }), P: d.P };
  });
  const d0 = phraseDifficulty(l, home, null, finalHand(l), inst).D0;
  return { tempi, perKey, all12: completionBonus(d0), cap: dailyCap(d0) };
}

// ───────────────────────────── physical cost off the piano (v2, §10.3) ─────────────────────────────
//
// Separate terms per instrument; the piano's pianoCost and its calibration are untouched. Each is 0–250 points on the
// phrase as placed in that key (phrase.ts phraseNeck for guitar / bass, the singer's range for the voice).

/** Guitar / bass weights (points at saturation). The bass's wider frets make stretches and low positions dearer. */
export const W_NECK = {
  guitar: { shifts: 70, shiftSize: 30, skips: 55, stretch: 45, high: 25, low: 0 },
  bass: { shifts: 70, shiftSize: 30, skips: 50, stretch: 65, high: 15, low: 20 },
};
/** Neck cost parts (the "Why?" list): shifts per bar and their size, string skips per note, stretches per bar, frets. */
export function neckParts(placed: Placed[], bars: number, inst: 'guitar' | 'bass'): Record<keyof (typeof W_NECK)['guitar'], number> {
  const w = W_NECK[inst];
  const st = neckStats(placed);
  const b = Math.max(1, bars);
  return {
    shifts: w.shifts * sat(st.shifts / b, 2),
    shiftSize: st.shifts ? w.shiftSize * sat(st.shiftFrets / st.shifts, 7) : 0,
    skips: w.skips * sat(st.skips / Math.max(1, st.n), 0.4),
    stretch: w.stretch * sat(st.stretch / b, 2),
    high: w.high * st.high,
    low: w.low * st.low,
  };
}
/** Guitar / bass physical cost (0–250) of a line with its strings and frets. Notes without a place cost nothing. */
export function neckCost(notes: DNote[], meter: number, inst: 'guitar' | 'bass'): number {
  const line = lineOf(notes.filter((n) => n.string !== undefined && n.fret !== undefined));
  if (line.length < 2) return 0;
  const end = Math.max(...notes.map((n) => n.beat + n.dur));
  const parts = neckParts(line.map((n) => ({ string: n.string!, fret: n.fret! })), Math.ceil(end / meter - 1e-6), inst);
  return clamp(Object.values(parts).reduce((a, x) => a + x, 0), 0, 250);
}

/** Voice weights (points at saturation). */
export const W_VOICE = { tess: 60, top: 45, leap: 40, leapRate: 35, breath: 50, breaks: 20 };
/**
 * Voice cost parts against the singer's range at a tempo: tessitura (distance from the comfortable middle) and time in
 * the top quarter, the largest leap and leaps per second, breath length (the longest stretch without a rest, beyond 6 s),
 * register-break crossings when known. Notes outside the range are not scored here: that key is "out of range" (§7.4).
 */
export function voiceParts(notes: DNote[], range: Range & { brk?: number }, bpm: number): Record<keyof typeof W_VOICE, number> {
  const st = voiceStats(lineOf(notes), range, bpm);
  return {
    tess: W_VOICE.tess * sat(Math.max(0, st.tess - 0.2), 0.7),
    top: W_VOICE.top * sat(st.top, 0.5),
    leap: W_VOICE.leap * sat(Math.max(0, st.maxLeap - 4), 8),
    leapRate: W_VOICE.leapRate * sat(st.leapsPerSec, 1.5),
    breath: W_VOICE.breath * sat(Math.max(0, st.breath - 6), 8),
    breaks: W_VOICE.breaks * sat(st.breaks, 4),
  };
}
/** The voice's tempo for the breath term when a difficulty is asked without one (D₀ for XP): a moderate ♩90. */
export const VOICE_BREATH_BPM = 90;
export function voiceCost(notes: DNote[], range: Range & { brk?: number }, bpm: number | null): number {
  if (notes.length < 2) return 0;
  return clamp(Object.values(voiceParts(notes, range, bpm ?? VOICE_BREATH_BPM)).reduce((a, x) => a + x, 0), 0, 250);
}

/** P per instrument (§10.3): piano (v1, pianoCost), guitar / bass on the neck, the voice in the singer's range. */
export function physicalCost(inp: DInput, inst: LickInstrument, bpm: number | null = null): number {
  if (inst === 'piano') return pianoCost(inp.notes);
  if (inst === 'guitar' || inst === 'bass') return neckCost(inp.notes, inp.meter, inst);
  return voiceCost(inp.notes, inp.range ?? singerRange(), bpm);
}
