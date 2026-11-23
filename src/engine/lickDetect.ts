// "Use it" (docs/SPEC-LICKS-TRANSCRIPTION.md §4): did the lick — or its rhythm and contour — appear in the player's
// improvisation, transposed anywhere, and over the right chord? Pure.

import { chordAt, LICK_Q, type Lick, type LickChord } from './licks';
import { tierTiming } from './drills/tierBounds';

/** A note of the improvisation: beat from the chart's first beat, MIDI. */
export interface ImpNote {
  beat: number;
  midi: number;
}
/** A chord of the chart the player improvised over: root pitch class, quality (licks.ts LICK_Q key), start beat, beats. */
export interface ChartSpan {
  root: number;
  q: string;
  at: number;
  beats: number;
}
export interface LickHit {
  /** Index of the first improvised note of the match, its beat, and the transposition (semitones from C). */
  index: number;
  beat: number;
  transpose: number;
  /** exact = the same intervals (a few notes may differ); shape = the same contour and rhythm; varied = at least 60 %
   *  of the notes in order (a note dropped or changed, the start displaced) — SPEC-LICKS-IN-IMPROV §3. */
  kind: 'exact' | 'shape' | 'varied';
  /** Every lick chord fell on a chart chord with the same root (after transposing) and a matching family. */
  overChord: boolean;
  /** Share of the lick's notes matched. */
  share: number;
  /** The matched notes' mean distance from the lick's rhythm (beats), and whether that is within the tolerance. */
  timing?: number;
  tight?: boolean;
  /** Played over the tritone substitute of the lick's dominant (the same notes, another bass). */
  viaSub?: boolean;
  /** The beat of the last matched note (the debrief replays beat … end from the take). */
  end?: number;
  /** An approach cell: the chord it landed on and the chord tone it targeted (semitones above the root). */
  target?: { root: number; q: string; deg: number };
}

/** Rhythm tolerance for a use to count as clean (beats; SPEC-LICKS-IN-IMPROV §3). */
export const LICK_TIMING_TOL = 0.2;

const mod = (n: number, m = 12) => ((n % m) + m) % m;
/** Chord families: minor-ish, dominant-ish, major-ish, half-diminished / diminished. */
const famOf = (q: string): string => (q === 'm7' || q === 'm6' ? 'm' : q === 'maj7' || q === '6' ? 'M' : q === 'hd7' ? 'hd' : q === 'dim7' ? 'd' : '7');
/** Chart chord symbols → the families of licks.ts (from the parsed intervals). */
export function qualityOfIntervals(iv: number[]): string {
  const has = (x: number) => iv.some((i) => mod(i) === x);
  if (has(4) && has(10) && (has(1) || has(8) || has(3))) return 'alt';
  if (has(4) && has(10)) return '7';
  if (has(3) && has(6) && has(9) && !has(10)) return 'dim7';
  if (has(3) && has(6)) return 'hd7';
  if (has(3) && has(9) && !has(10)) return 'm6';
  if (has(3)) return 'm7';
  if (has(4) && has(11)) return 'maj7';
  if (has(4) && has(9) && !has(10)) return '6';
  if (has(4) && has(10) && (has(1) || has(8) || has(3))) return 'alt';
  if (has(4) && has(10)) return '7';
  return 'maj7';
}

export function chartSpanAt(chart: ChartSpan[], beat: number): ChartSpan | null {
  for (const c of chart) if (beat >= c.at - 1e-6 && beat < c.at + c.beats - 1e-6) return c;
  return null;
}

/** The options of a search: the shares, which kinds count, the timing tolerance (beats) and the meter. */
export interface FindOpts {
  minShare?: number;
  shape?: boolean;
  varied?: boolean;
  /** The timing tolerance for a clean use (beats; lickTimingTol by the tier). Default LICK_TIMING_TOL. */
  tol?: number;
  /** Beats per bar: a lick moved off its place in the bar is "displaced" (varied, not exact). Default 4. */
  meter?: number;
}

/** A use moved this far (beats) from the lick's own place in the bar is displaced in rhythm (a variation). */
const DISPLACED = 0.4;
const KIND_RANK: Record<LickHit['kind'], number> = { exact: 3, varied: 2, shape: 1 };

/**
 * Find the lick in an improvisation. For every start note, and every anchor among the lick's first notes (the first
 * one or two may be dropped, SPEC-LICKS-IN-IMPROV §7): walk the lick note by note, matching improvised notes in order
 * (skipping at most one passing note between two lick notes), each within ¾ beat of its place. The lick's placement
 * in time is then fitted to the matched notes (their mean offset), so the timing is measured against the best fit,
 * not against the first note.
 * - "exact": from its first note, ≥ 80 % of the notes with the same intervals, the last one included, in its own place
 *   in the bar;
 * - "varied": ≥ 60 % of the notes in order (≥ 3) but not exact: a note dropped or changed, the first note(s) dropped,
 *   the ending altered, or the whole lick displaced in the bar (started a beat later, say);
 * - "shape": every step goes the same way (up / down / same) and the onsets keep the lick's rhythm within a quarter beat.
 * Over the chord: the lick's chords, moved by the same transposition and the same shift in time, land on chart chords
 * with the same root and family (the dominant family takes 7, 7♭9, alt, blues; or the tritone substitute).
 * Approach cells (l.cell) are found by their pattern instead (findCells).
 */
export function findLick(l: Lick, imp: ImpNote[], chart: ChartSpan[], o: FindOpts = {}): LickHit[] {
  if (l.cell) return findCells(l.cell, imp, chart, o);
  const notes = [...imp].sort((a, b) => a.beat - b.beat);
  const L = l.notes;
  const minShare = o.minShare ?? 0.8;
  const tol = o.tol ?? LICK_TIMING_TOL;
  const meter = o.meter ?? 4;
  const maxDrop = L.length >= 6 ? 2 : L.length >= 4 ? 1 : 0;
  const hits: LickHit[] = [];
  let skipUntil = -1;
  type Cand = { kind: LickHit['kind']; t: number; shift: number; got: { k: number; i: number }[]; share: number; timing: number };
  const matchFrom = (s: number, a: number): Cand | null => {
    const t = notes[s].midi - L[a][0];
    const shift0 = notes[s].beat - L[a][1];
    let j = s;
    const got: { k: number; i: number }[] = [{ k: s, i: a }];
    for (let i = a + 1; i < L.length; i++) {
      const want = L[i][0] + t;
      let found = -1;
      for (let k = j + 1; k <= Math.min(notes.length - 1, j + 2); k++) {
        if (notes[k].midi === want && Math.abs(notes[k].beat - (L[i][1] + shift0)) <= 0.75) {
          found = k;
          break;
        }
      }
      if (found >= 0) {
        got.push({ k: found, i });
        j = found;
      } else if (j + 1 < notes.length && Math.abs(notes[j + 1].beat - (L[i][1] + shift0)) <= 0.3) j = j + 1; // a wrong note in the lick's place still advances (one slip)
    }
    // the placement fitted to the matched notes; the timing against it
    const shift = got.reduce((x, g) => x + notes[g.k].beat - L[g.i][1], 0) / got.length;
    const timing = got.reduce((x, g) => x + Math.abs(notes[g.k].beat - L[g.i][1] - shift), 0) / got.length;
    const share = got.length / L.length;
    const lastOk = got.length > 1 && got[got.length - 1].i === L.length - 1;
    const off = Math.abs(shift - Math.round(shift / meter) * meter);
    const displaced = off > Math.max(DISPLACED, tol);
    let kind: LickHit['kind'] | null = a === 0 && share >= minShare && lastOk && !displaced ? 'exact' : null;
    if (!kind && o.varied !== false && share >= 0.6 && got.length >= 3) kind = 'varied';
    if (!kind && a === 0 && o.shape !== false && s + L.length - 1 < notes.length && L.length >= 3) {
      // Shape: the next L notes, same contour, same rhythm.
      const seg = notes.slice(s, s + L.length);
      const contour = (x: number, y: number) => Math.sign(y - x);
      const sameDir = seg.every((n, i) => i === 0 || contour(seg[i - 1].midi, n.midi) === contour(L[i - 1][0], L[i][0]));
      const sameRhythm = seg.every((n, i) => Math.abs(n.beat - shift0 - L[i][1]) <= 0.26);
      if (sameDir && sameRhythm) return { kind: 'shape', t, shift: shift0, got: seg.map((_, i) => ({ k: s + i, i })), share: 0, timing: seg.reduce((x, n, i) => x + Math.abs(n.beat - shift0 - L[i][1]), 0) / seg.length };
    }
    return kind ? { kind, t, shift, got, share, timing } : null;
  };
  for (let s = 0; s < notes.length; s++) {
    if (s <= skipUntil) continue;
    let best: Cand | null = null;
    for (let a = 0; a <= maxDrop && a < L.length; a++) {
      const c = matchFrom(s, a);
      if (c && (!best || KIND_RANK[c.kind] > KIND_RANK[best.kind] || (c.kind === best.kind && c.share > best.share))) best = c;
      if (best?.kind === 'exact') break;
    }
    if (!best) continue;
    const { t, shift } = best;
    let viaSub = false;
    const overChord = l.chords.every((c, ci) => {
      const at = l.chords.slice(0, ci).reduce((x, y) => x + y[2], 0);
      // Only chords the lick's notes actually sound over count (a final long chord is entered on its first note).
      if (!L.some((n) => chordAt(l.chords, n[1]) === ci)) return true;
      const sp = chartSpanAt(chart, at + shift + 0.01) ?? chartSpanAt(chart, L.find((n) => chordAt(l.chords, n[1]) === ci)![1] + shift);
      if (!sp) return false;
      if (mod(sp.root) === mod(c[0] + t) && famOf(sp.q) === famOf(c[1])) return true;
      // a dominant lick over the tritone substitute of its dominant: the same notes over another bass
      if (famOf(c[1]) === '7' && famOf(sp.q) === '7' && mod(sp.root) === mod(c[0] + t + 6)) return (viaSub = true);
      return false;
    });
    const last = best.got[best.got.length - 1];
    hits.push({ index: s, beat: notes[s].beat, end: notes[last.k].beat, transpose: mod(t), kind: best.kind, overChord, share: best.kind === 'shape' ? 0 : best.share, timing: best.timing, tight: best.timing <= tol, ...(viaSub ? { viaSub } : {}) });
    // one hit per occurrence: overlapping starts are merged into this one
    skipUntil = Math.max(s, last.k - 1, s + Math.max(1, Math.floor(L.length * 0.6)) - 1);
  }
  return hits;
}

/**
 * The approach licks as cells (SPEC-LICKS-IN-IMPROV §1, §3; the owner's rules, keyLicks.ts): found by their pattern
 * against a target that is a chord tone of the chart chord it lands on — in any key, any octave:
 * - lick 1: a half step below → target;
 * - lick 2 (the enclosure): below, then a step above (a half or whole step) → target; or above, then below;
 * - lick 3 (the long enclosure): below, a whole step above, a half step above, below → target; on a target with only a
 *   half step above it (E, B in C) the turn-over: the half step above, the whole step below, the half step below → target.
 * Consecutive notes, at most a beat apart. One cell per target (the longest). Clean: the onsets even (each within the
 * tolerance of an even line from the first to the target).
 */
export function findCells(cell: 1 | 2 | 3, imp: ImpNote[], chart: ChartSpan[], o: FindOpts = {}): LickHit[] {
  const notes = [...imp].sort((a, b) => a.beat - b.beat);
  const tol = o.tol ?? LICK_TIMING_TOL;
  const hits: LickHit[] = [];
  const patterns: Record<1 | 2 | 3, number[][]> = {
    1: [[-1]],
    2: [[-1, 1], [-1, 2], [1, -1], [2, -1]],
    3: [[-1, 2, 1, -1], [1, -2, -1]],
  };
  const longer = (cs: number): number[][] => (cs >= 3 ? [] : [...(cs < 3 ? patterns[3] : []), ...(cs < 2 ? patterns[2] : [])]);
  const matches = (ti: number, pat: number[]): boolean => {
    if (ti - pat.length < 0) return false;
    const T = notes[ti].midi;
    for (let q = 0; q < pat.length; q++) {
      const n = notes[ti - pat.length + q];
      if (n.midi - T !== pat[q]) return false;
    }
    for (let q = ti - pat.length + 1; q <= ti; q++) if (notes[q].beat - notes[q - 1].beat > 1 + 1e-6 || notes[q].beat - notes[q - 1].beat < 0.05) return false;
    return true;
  };
  let lastUsed = -1;
  for (let ti = 1; ti < notes.length; ti++) {
    const sp = chartSpanAt(chart, notes[ti].beat + 0.01);
    if (!sp) continue;
    const ct = (LICK_Q[sp.q] ?? LICK_Q.maj7).ct;
    if (!ct.includes(mod(notes[ti].midi - sp.root))) continue;
    // the longest cell at this target wins: a lick 1 inside a lick 2 or 3 is not a lick 1
    if (longer(cell).some((p) => matches(ti, p))) continue;
    const pat = patterns[cell].find((p) => matches(ti, p));
    if (!pat) continue;
    const from = ti - pat.length;
    if (from <= lastUsed) continue;
    lastUsed = ti;
    const span = notes[ti].beat - notes[from].beat;
    const step = span / pat.length;
    const timing = pat.length > 1 ? notes.slice(from, ti + 1).reduce((x, n, q) => x + Math.abs(n.beat - (notes[from].beat + q * step)), 0) / (pat.length + 1) : 0;
    hits.push({ index: from, beat: notes[from].beat, end: notes[ti].beat, transpose: mod(notes[ti].midi), kind: 'exact', overChord: true, share: 1, timing, tight: timing <= tol, target: { root: mod(sp.root), q: sp.q, deg: mod(notes[ti].midi - sp.root) } });
  }
  return hits;
}

/**
 * The timing tolerance of a clean use by the improvisation tier (T1–3; SPEC-LICKS-IN-IMPROV §3 "within the tier's
 * tolerance"): the technique tiers' onset limits (tierTiming: T1 ≈ grade 1, T2 ≈ grades 2–3, T3 ≈ grade 4+) scaled so
 * that T2 keeps the 0.2 beat of the first version — T1 0.27, T2 0.2, T3 0.16 beats.
 */
export function lickTimingTol(tier: number | undefined): number {
  if (!tier) return LICK_TIMING_TOL;
  const tech = tier <= 1 ? 1 : tier === 2 ? 2 : 4;
  return Math.round((LICK_TIMING_TOL * tierTiming(tech).sd) / tierTiming(2).sd * 1000) / 1000;
}

/** The challenge rule: the lick (exact, or its shape) over the right chord at least `times` times. */
export function useItPassed(hits: LickHit[], times = 2): { ok: boolean; exact: number; shape: number; good: number } {
  const good = hits.filter((h) => h.overChord);
  return { ok: good.length >= times, exact: good.filter((h) => h.kind === 'exact').length, shape: good.filter((h) => h.kind === 'shape').length, good: good.length };
}

/**
 * The chart for a lick's challenge: its chords cycled through four keys a whole step down (C, B♭, A♭, G♭ for a C
 * lick), so the lick has to be transposed on the fly. Returns the text for the band and the spans for the detector.
 */
export function useItChart(l: Lick, key: number, keys = 4): { text: string; spans: ChartSpan[]; beats: number } {
  const spans: ChartSpan[] = [];
  const bars: string[] = [];
  let beat = 0;
  const lickLen = Math.ceil(l.chords.reduce((a, c) => a + c[2], 0) / 4) * 4;
  for (let k = 0; k < keys; k++) {
    const kk = mod(key - 2 * k);
    const startBeat = beat;
    for (const c of l.chords) {
      spans.push({ root: mod(c[0] + kk), q: c[1], at: beat, beats: c[2] });
      beat += c[2];
    }
    // Fill to whole bars with the last chord.
    const pad = startBeat + lickLen - beat;
    if (pad > 0) {
      spans[spans.length - 1].beats += pad;
      beat += pad;
    }
    bars.push(...barsOf(l.chords, kk, lickLen));
  }
  return { text: bars.join(' | '), spans, beats: beat };
}
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
function barsOf(chords: LickChord[], key: number, len: number): string[] {
  const out: string[][] = Array.from({ length: len / 4 }, () => []);
  let beat = 0;
  for (const c of chords) {
    const bar = Math.floor(beat / 4 + 1e-6);
    if (bar < out.length) out[bar].push(FLAT[mod(c[0] + key)] + LICK_Q[c[1]].sym);
    beat += c[2];
  }
  return out.map((b, i) => (b.length ? b.join(' ') : i > 0 ? '%' : 'C'));
}
