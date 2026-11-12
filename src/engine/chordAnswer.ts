// Answering a chord-choice question on an instrument other than the guitar's strum (song-strum on bass and keys,
// 2026-11-12): a bass plays the chord's root (microphone or MIDI), a keyboard plays the chord (MIDI). Closed set: the
// answer is judged among the question's choices only. Pure.

export interface ChordOpt {
  root: number;
  quality: 'M' | 'm' | '7';
}

const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;
const thirdOf = (q: ChordOpt['quality']) => (q === 'm' ? 3 : 4);

/** The choice whose root is pitch class `p` (null if none). */
export function choiceByRoot(p: number, choices: string[], opts: Record<string, ChordOpt>): string | null {
  return choices.find((c) => opts[c] && opts[c].root % 12 === pc(p)) ?? null;
}

/**
 * The choice a played chord names (MIDI notes held together): its root and its 3rd must sound; when several fit, the one
 * whose root is the lowest note wins. A single note answers by its root (a bass line on a MIDI keyboard).
 */
export function choiceByChord(midis: number[], choices: string[], opts: Record<string, ChordOpt>): string | null {
  if (!midis.length) return null;
  const low = Math.min(...midis);
  if (midis.length === 1) return choiceByRoot(low, choices, opts);
  const pcs = new Set(midis.map(pc));
  const fit = choices.filter((c) => opts[c] && pcs.has(opts[c].root % 12) && pcs.has((opts[c].root + thirdOf(opts[c].quality)) % 12));
  if (!fit.length) return null;
  return fit.find((c) => opts[c].root % 12 === pc(low)) ?? fit[0];
}

/** Hz → MIDI (A4 = 440). */
export const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/**
 * The pitch class of one plucked bass note from microphone frames: the median of the confident, voiced frames once at
 * least `min` of them agree within a semitone; null when it is not clear yet.
 */
export function bassRootOf(frames: { hz: number | null; confidence: number; rms: number }[], min = 5): number | null {
  const ms = frames.filter((f) => f.hz !== null && f.hz > 20 && f.confidence >= 0.8 && f.rms >= 0.008).map((f) => hzToMidi(f.hz!));
  if (ms.length < min) return null;
  const sorted = [...ms].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const near = ms.filter((m) => Math.abs(m - med) <= 0.6);
  if (near.length < min) return null;
  return pc(med);
}
