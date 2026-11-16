// Clean-up of a kept phrase (SPEC-PHRASE-STUDIO §5.4–5.6, §14.5–14.6): quantisation (grid / swing-aware / as played),
// the hands split, the one-tap wrong-note fix, ghost notes. Pure.

import type { BeatNote } from './detect';
import { LICK_Q } from '../licks';

export type QuantMode = 'grid' | 'swing' | 'played';

const DUPLE = [0, 0.25, 0.5, 0.75, 1];
const TRIPLET = [0, 1 / 3, 2 / 3, 1];
const near = (x: number, set: number[]) => set.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), set[0]);

/**
 * Quantise onsets to the beat grid. Per beat the simplest grid that fits (16ths or 8th-triplets; a switch inside a beat
 * is not allowed), with a small preference for duple. Swing-aware: an onset near the swung 8th (beat + swing) is the
 * 8th (stored straight; the drill plays it swung). As played: onsets kept (to the 1/100 beat). Durations snap to the
 * grid and never run into the next onset of the same hand; rests ≥ an 8th stay. Notes within 40 ms are one chord.
 */
export function quantise(notes: BeatNote[], mode: QuantMode, swing = 0.5): BeatNote[] {
  const s = [...notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  if (mode === 'played') return s.map((n) => ({ midi: n.midi, beat: Math.round(n.beat * 100) / 100, dur: Math.max(0.05, Math.round(n.dur * 100) / 100) }));
  const swung = mode === 'swing' && swing > 0.54;
  const byBeat = new Map<number, BeatNote[]>();
  for (const n of s) {
    const b = Math.floor(n.beat + 0.12);
    (byBeat.get(b) ?? byBeat.set(b, []).get(b)!).push(n);
  }
  const q: BeatNote[] = [];
  for (const [b, ns] of byBeat) {
    const fr = ns.map((n) => n.beat - b);
    // swing: the swung 8th position counts as the 8th
    const map = (f: number) => (swung && Math.abs(f - swing) < Math.abs(f - 0.5) + 0.04 && Math.abs(f - swing) < 0.12 ? 0.5 : f);
    const ff = fr.map(map);
    const errD = ff.reduce((a, f) => a + Math.abs(near(f, DUPLE) - f), 0);
    const errT = swung ? Infinity : ff.reduce((a, f) => a + Math.abs(near(f, TRIPLET) - f), 0) + 0.04;
    const set = errT < errD ? TRIPLET : DUPLE;
    ns.forEach((n, i) => q.push({ midi: n.midi, beat: b + near(ff[i], set), dur: n.dur }));
  }
  q.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  // merge onsets that landed on the same grid point into a chord (same beat), drop exact duplicates
  const out: BeatNote[] = [];
  for (const n of q) if (!out.some((o) => Math.abs(o.beat - n.beat) < 1e-6 && o.midi === n.midi)) out.push(n);
  const onsets = [...new Set(out.map((n) => Math.round(n.beat * 1000) / 1000))].sort((a, b) => a - b);
  return out.map((n) => {
    const next = onsets.find((o) => o > n.beat + 1e-6);
    const unit = Math.abs((n.beat * 3) % 1) < 1e-6 && Math.abs((n.beat * 4) % 1) > 1e-6 ? 1 / 3 : 0.25;
    let d = Math.max(unit, Math.round(n.dur / unit) * unit);
    if (next !== undefined) d = Math.min(d, next - n.beat);
    // a gap shorter than an 8th to the next onset is legato, not a rest
    if (next !== undefined && next - (n.beat + d) < 0.5 - 1e-6) d = next - n.beat;
    return { ...n, dur: Math.round(d * 1000) / 1000 };
  });
}

/**
 * Two hands from one line (§14.6): no split when the phrase sits in one hand's reach (range ≤ an octave and a 6th) or
 * entirely above G3; else the split point is the widest gap between C3 and E4 (≥ a 4th), else middle C — and in a chord
 * (simultaneous onsets) spread over more than an octave, the lowest note goes to the left hand. `split` overrides.
 */
export function splitHands(notes: BeatNote[], split?: number | null): { rh: BeatNote[]; lh: BeatNote[]; split: number | null } {
  if (!notes.length) return { rh: [], lh: [], split: null };
  const ps = notes.map((n) => n.midi);
  const lo = Math.min(...ps);
  const hi = Math.max(...ps);
  let sp: number | null = split ?? null;
  if (sp === null) {
    if (hi - lo <= 21 || lo >= 55) return { rh: [...notes], lh: [], split: null };
    const uniq = [...new Set(ps)].sort((a, b) => a - b);
    let gapAt = -1;
    let gap = 0;
    for (let i = 1; i < uniq.length; i++) {
      const g = uniq[i] - uniq[i - 1];
      const mid = (uniq[i] + uniq[i - 1]) / 2;
      if (mid >= 48 && mid <= 64 && g > gap) {
        gap = g;
        gapAt = uniq[i];
      }
    }
    sp = gap >= 5 ? gapAt : 60;
  }
  const rh: BeatNote[] = [];
  const lh: BeatNote[] = [];
  for (const n of notes) (n.midi < sp ? lh : rh).push(n);
  return { rh, lh, split: sp };
}

/** Ghost notes (§5.4): very soft (velocity < 25) or very short (< 40 ms). */
export const isGhost = (vel: number, durMs: number): boolean => vel < 25 || durMs < 40;

/**
 * The one-tap wrong-note fix: the nearest chord tone of the chord sounding there (or, with no chord, the nearest note
 * of the key's scale); ties go to the note below (a slipped finger usually lands a half step high). Semitones above
 * the tonic in, the same out.
 */
export function wrongNoteFix(semi: number, chord: [root: number, q: string] | null, minor = false): number {
  const tones = chord ? (LICK_Q[chord[1]]?.ct ?? [0, 4, 7]).map((x) => x + chord[0]) : minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const pcs = new Set(tones.map((t) => ((t % 12) + 12) % 12));
  for (let d = 1; d <= 6; d++) {
    if (pcs.has((((semi - d) % 12) + 12) % 12)) return semi - d;
    if (pcs.has((((semi + d) % 12) + 12) % 12)) return semi + d;
  }
  return semi;
}
