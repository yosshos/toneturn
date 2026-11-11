// "Use it" (docs/SPEC-LICKS-TRANSCRIPTION.md §4): did the lick — or its rhythm and contour — appear in the player's
// improvisation, transposed anywhere, and over the right chord? Pure.

import { chordAt, LICK_Q, type Lick, type LickChord } from './licks';

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
  /** exact = the same intervals (a few notes may differ); shape = the same contour and rhythm. */
  kind: 'exact' | 'shape';
  /** Every lick chord fell on a chart chord with the same root (after transposing) and a matching family. */
  overChord: boolean;
  /** Share of the lick's notes matched. */
  share: number;
}

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

/**
 * Find the lick in an improvisation. For every start note: walk the lick note by note, matching improvised notes in
 * order (skipping at most one passing note between two lick notes). "exact" = the interval from the start note equals
 * the lick's for ≥ 80 % of the lick's notes (and the first and last match); "shape" = every step goes the same way
 * (up / down / same) and the onsets keep the lick's rhythm within a quarter beat (after moving the whole lick in
 * time). Over the chord: the lick's chords, moved by the same transposition and the same shift in time, land on chart
 * chords with the same root and family (the dominant family takes 7, 7♭9, alt, blues).
 */
export function findLick(l: Lick, imp: ImpNote[], chart: ChartSpan[], o: { minShare?: number; shape?: boolean } = {}): LickHit[] {
  const notes = [...imp].sort((a, b) => a.beat - b.beat);
  const L = l.notes;
  const minShare = o.minShare ?? 0.8;
  const hits: LickHit[] = [];
  let skipUntil = -1;
  for (let s = 0; s < notes.length; s++) {
    if (s <= skipUntil) continue;
    const t = notes[s].midi - L[0][0];
    const shift = notes[s].beat - L[0][1];
    // Exact: in-order matching by pitch (transposed).
    let j = s;
    const got: number[] = [s];
    let matched = 1;
    for (let i = 1; i < L.length; i++) {
      const want = L[i][0] + t;
      let found = -1;
      for (let k = j + 1; k <= Math.min(notes.length - 1, j + 2); k++) {
        if (notes[k].midi === want && Math.abs(notes[k].beat - (L[i][1] + shift)) <= 0.75) {
          found = k;
          break;
        }
      }
      if (found >= 0) {
        matched++;
        got.push(found);
        j = found;
      } else {
        // A wrong note in the lick's place still advances (one slip).
        if (j + 1 < notes.length && Math.abs(notes[j + 1].beat - (L[i][1] + shift)) <= 0.3) j = j + 1;
      }
    }
    const lastOk = got.length > 1 && notes[got[got.length - 1]].midi === L[L.length - 1][0] + t;
    const share = matched / L.length;
    let kind: LickHit['kind'] | null = share >= minShare && lastOk ? 'exact' : null;
    if (!kind && o.shape !== false && s + L.length - 1 < notes.length) {
      // Shape: the next L notes, same contour, same rhythm.
      const seg = notes.slice(s, s + L.length);
      const contour = (a: number, b: number) => Math.sign(b - a);
      const sameDir = seg.every((n, i) => i === 0 || contour(seg[i - 1].midi, n.midi) === contour(L[i - 1][0], L[i][0]));
      const sameRhythm = seg.every((n, i) => Math.abs(n.beat - shift - L[i][1]) <= 0.26);
      if (sameDir && sameRhythm && L.length >= 3) kind = 'shape';
    }
    if (!kind) continue;
    const overChord = l.chords.every((c, ci) => {
      const at = l.chords.slice(0, ci).reduce((a, x) => a + x[2], 0);
      // Only chords the lick's notes actually sound over count (a final long chord is entered on its first note).
      if (!L.some((n) => chordAt(l.chords, n[1]) === ci)) return true;
      const sp = chartSpanAt(chart, at + shift + 0.01) ?? chartSpanAt(chart, L.find((n) => chordAt(l.chords, n[1]) === ci)![1] + shift);
      return !!sp && mod(sp.root) === mod(c[0] + t) && famOf(sp.q) === famOf(c[1]);
    });
    hits.push({ index: s, beat: notes[s].beat, transpose: mod(t), kind, overChord, share: kind === 'exact' ? share : 0 });
    skipUntil = s + Math.max(1, Math.floor(L.length * 0.6)) - 1;
  }
  return hits;
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
