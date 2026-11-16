// Phrase boundaries and the phrases worth keeping (SPEC-PHRASE-STUDIO §14.4), and the trim handles' snapping (§5.2).
// Works on notes already on the beat grid (beats from the take's beat 0). Pure.

import type { BeatNote } from './detect';

export const MAX_BARS = 8;
/** Teacher assignments (owner decision 5): up to 16 bars. */
export const MAX_BARS_TEACHER = 16;

export interface Boundary {
  /** Beat of the boundary (a bar line or a beat). */
  beat: number;
  /** 0..1, how strongly it ends / starts a phrase. */
  strength: number;
}

const ends = (n: BeatNote) => n.beat + n.dur;

/**
 * Candidate boundaries: a rest (≥ a quarter is strong), a long note then a rest (a cadence), near a bar line. The
 * boundary sits at the bar line (or beat) at or before the next phrase's first note.
 */
export function boundaries(notes: BeatNote[], meter = 4): Boundary[] {
  const s = [...notes].sort((a, b) => a.beat - b.beat);
  if (!s.length) return [];
  const out: Boundary[] = [];
  const at = (b: number) => {
    const bar = Math.floor(b / meter + 0.15) * meter;
    return Math.abs(b - bar) <= 1.01 ? bar : Math.floor(b + 0.15);
  };
  out.push({ beat: at(s[0].beat), strength: 1 });
  for (let i = 1; i < s.length; i++) {
    const prevEnd = Math.max(...s.slice(Math.max(0, i - 4), i).map(ends));
    const gap = s[i].beat - prevEnd;
    const ioi = s[i].beat - s[i - 1].beat;
    const longBefore = s[i - 1].dur >= 1.5;
    let st = 0;
    if (gap >= 2) st = 1;
    else if (gap >= 1) st = 0.8;
    else if (gap >= 0.5) st = 0.45;
    else if (ioi >= 1.5 && longBefore) st = 0.55;
    if (st <= 0) continue;
    const b = at(s[i].beat);
    const nearBar = Math.abs(s[i].beat - Math.round(s[i].beat / meter) * meter) <= 1.01;
    out.push({ beat: b, strength: Math.min(1, st + (nearBar ? 0.1 : 0)) });
  }
  const last = Math.max(...s.map(ends));
  out.push({ beat: Math.ceil(last / meter - 0.1) * meter, strength: 1 });
  // one boundary per beat position, the strongest
  const by = new Map<number, Boundary>();
  for (const b of out) if (!by.has(b.beat) || by.get(b.beat)!.strength < b.strength) by.set(b.beat, b);
  return [...by.values()].sort((a, b) => a.beat - b.beat);
}

export interface Candidate {
  from: number;
  to: number;
  bars: number;
  score: number;
}

/** A simple scale run: steps of 1–2 semitones in one direction (≤ 1 change), or repeated notes. */
export function isScaleRun(ns: BeatNote[]): boolean {
  if (ns.length < 3) return true;
  let changes = 0;
  let dir = 0;
  for (let i = 1; i < ns.length; i++) {
    const d = ns[i].midi - ns[i - 1].midi;
    if (Math.abs(d) > 2) return false;
    const sd = Math.sign(d);
    if (sd && dir && sd !== dir) changes++;
    if (sd) dir = sd;
  }
  return changes <= 1;
}

/** "Worth keeping": enough notes, rhythmic variety, contour, landing on a long note, not a plain scale run. */
export function worth(ns: BeatNote[], bars: number): number {
  if (ns.length < 3) return 0;
  const iois = new Set<number>();
  for (let i = 1; i < ns.length; i++) iois.add(Math.round((ns[i].beat - ns[i - 1].beat) * 6));
  const density = ns.length / Math.max(1, bars * 4);
  const dens = Math.exp(-Math.pow((density - 1.6) / 1.2, 2));
  const range = Math.max(...ns.map((n) => n.midi)) - Math.min(...ns.map((n) => n.midi));
  const lands = ns[ns.length - 1].dur >= 1 ? 0.15 : 0;
  const len = Math.min(1, ns.length / 10);
  return Math.round((0.3 * len + 0.25 * Math.min(1, iois.size / 4) + 0.2 * dens + 0.15 * Math.min(1, range / 10) + lands - (isScaleRun(ns) ? 0.3 : 0)) * 1000) / 1000;
}

/** Up to `n` candidate phrases (1–`max` bars, between strong boundaries), best first, not overlapping. */
export function candidates(notes: BeatNote[], meter = 4, n = 3, max = MAX_BARS): Candidate[] {
  const bs = boundaries(notes, meter).filter((b) => b.strength >= 0.45);
  const all: Candidate[] = [];
  for (let i = 0; i < bs.length; i++)
    for (let j = i + 1; j < bs.length; j++) {
      const from = Math.floor(bs[i].beat / meter + 1e-6) * meter;
      const to = Math.ceil(bs[j].beat / meter - 1e-6) * meter;
      const bars = Math.round((to - from) / meter);
      if (bars < 1 || bars > max) continue;
      const ns = notes.filter((x) => x.beat >= bs[i].beat - 1e-6 && x.beat < bs[j].beat - 1e-6);
      if (ns.length < 3) continue;
      const strength = (bs[i].strength + bs[j].strength) / 2;
      all.push({ from, to, bars, score: worth(ns, bars) * (0.7 + 0.3 * strength) });
    }
  all.sort((a, b) => b.score - a.score || a.from - b.from);
  const out: Candidate[] = [];
  for (const c of all) {
    if (out.some((o) => c.from < o.to && o.from < c.to)) continue;
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Snap a handle: to bars by default, to beats when held (300 ms), to the 8th with Shift. A soft magnet pulls within a
 * quarter of a beat to a suggested boundary. The span stays 1 unit … `max` bars.
 */
export function snapHandle(beat: number, mode: 'bar' | 'beat' | 'eighth', meter = 4, magnets: number[] = []): number {
  const unit = mode === 'bar' ? meter : mode === 'beat' ? 1 : 0.5;
  const s = Math.round(beat / unit) * unit;
  const m = magnets.find((x) => Math.abs(x - beat) <= 0.25 && mode !== 'bar');
  return m ?? s;
}
export function clampSpan(from: number, to: number, meter = 4, max = MAX_BARS, moved: 'from' | 'to' = 'to'): { from: number; to: number; capped: boolean } {
  let f = Math.min(from, to);
  let t = Math.max(from, to);
  const unit = 0.5;
  if (t - f < unit) t = f + unit;
  const maxB = max * meter;
  const capped = t - f > maxB + 1e-6;
  if (capped) {
    if (moved === 'to') t = f + maxB;
    else f = t - maxB;
  }
  return { from: f, to: t, capped };
}
export const spanBars = (from: number, to: number, meter = 4) => Math.max(1, Math.ceil((to - from) / meter - 1e-6));
