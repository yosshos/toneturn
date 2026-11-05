// Sing-along (spec S.10): public-domain song openings with a scrolling note roll and live pitch scoring.
// Pure: the timeline of a song in the player's range, and the score of a take against it.

import { hzToMidi } from './pitch';
import type { SungFrame } from './sing';
import type { SongOpening } from './songs';
import type { VoiceRange } from './vocal';

export interface RollNote {
  midi: number;
  start: number; // seconds from the first note
  dur: number;
  degree: number;
}

const STEPS = [0, 2, 4, 5, 7, 9, 11];

/** The song's notes in a key that sits inside the range (tonic chosen so the whole opening fits). */
export function songTimeline(song: SongOpening, range: VoiceRange, bpm: number): { notes: RollNote[]; tonic: number } {
  const offs = song.degrees.map((d) => STEPS[(d - 1) % 7] + 12 * Math.floor((d - 1) / 7));
  const lo = Math.min(...offs);
  const hi = Math.max(...offs);
  const minT = range.low - lo;
  const maxT = range.high - hi;
  const tonic = minT <= maxT ? Math.round((minT + maxT) / 2) : Math.round((range.low + range.high) / 2 - (lo + hi) / 2);
  const beat = 60 / bpm;
  let t = 0;
  const notes = song.degrees.map((d, i) => {
    const n = { midi: tonic + offs[i], start: t, dur: song.beats[i] * beat, degree: d };
    t += song.beats[i] * beat;
    return n;
  });
  return { notes, tonic };
}

export interface SingAlongGrade {
  /** Per note: share of its frames within ±50 ¢ (octave-folded); null when no voice. */
  notes: (number | null)[];
  total: number; // 0..1, unsung notes count as 0
}

/** Score a take: frames are timed from the first note's start (t = 0). */
export function gradeSingAlong(frames: SungFrame[], notes: RollNote[], tolCents = 50): SingAlongGrade {
  const per = notes.map((n) => {
    const inNote = frames.filter((f) => f.t >= n.start + Math.min(0.12, n.dur * 0.25) && f.t <= n.start + n.dur - 0.04 && f.hz && f.confidence >= 0.8);
    if (inNote.length < 3) return null;
    const ok = inNote.filter((f) => {
      const c = (hzToMidi(f.hz!) - n.midi) * 100;
      const folded = ((((c + 600) % 1200) + 1200) % 1200) - 600;
      return Math.abs(folded) <= tolCents;
    }).length;
    return ok / inNote.length;
  });
  const total = per.reduce<number>((a, x) => a + (x ?? 0), 0) / Math.max(1, notes.length);
  return { notes: per, total: Math.round(total * 1000) / 1000 };
}
