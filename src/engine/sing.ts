// Sung-pitch scoring over YIN frames. Pure and deterministic.

import { centsOff, hzToMidi, midiToHz } from './pitch';

export interface SungFrame {
  t: number; // seconds since capture start
  hz: number | null;
  confidence: number;
  rms: number;
}

export type SungStatus = 'accurate' | 'sharp' | 'flat' | 'wrong' | 'unclear';

export interface SungResult {
  status: SungStatus;
  /** Signed cents from the target (octave-folded when octave-insensitive); null when unclear. */
  cents: number | null;
  detectedMidi: number | null;
  voicedSeconds: number;
}

export interface SungOptions {
  toleranceCents?: number; // accurate within ±tolerance (default 35)
  nearCents?: number; // sharp/flat up to this distance (default 100), beyond = wrong note
  octaveSensitive?: boolean;
  minConfidence?: number;
  minVoicedSeconds?: number;
  attackSeconds?: number; // ignored at the start of each voiced run
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function evaluateSung(frames: SungFrame[], targetMidi: number, opts: SungOptions = {}): SungResult {
  const { toleranceCents = 35, nearCents = 100, octaveSensitive = false, minConfidence = 0.8, minVoicedSeconds = 0.6, attackSeconds = 0.15 } = opts;
  const voiced = frames.filter((f) => f.hz && f.confidence >= minConfidence && f.hz > 60 && f.hz < 1200);
  if (voiced.length < 2) return { status: 'unclear', cents: null, detectedMidi: null, voicedSeconds: 0 };
  // Drop the attack: frames within attackSeconds of the first voiced frame.
  const start = voiced[0].t;
  const stable = voiced.filter((f) => f.t - start >= attackSeconds);
  const dt = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / (frames.length - 1) : 0.033;
  const voicedSeconds = stable.length * dt;
  if (voicedSeconds < minVoicedSeconds || stable.length < 4) return { status: 'unclear', cents: null, detectedMidi: null, voicedSeconds };
  const midis = stable.map((f) => hzToMidi(f.hz!));
  const med = median(midis);
  // Unstable glide / noise: spread of the middle half wider than a whole tone.
  const s = midis.slice().sort((a, b) => a - b);
  const iqr = s[Math.floor(s.length * 0.75)] - s[Math.floor(s.length * 0.25)];
  if (iqr > 2) return { status: 'unclear', cents: null, detectedMidi: med, voicedSeconds };
  let cents = centsOff(midiToHz(med), midiToHz(targetMidi));
  if (!octaveSensitive) cents = ((((cents + 600) % 1200) + 1200) % 1200) - 600;
  const abs = Math.abs(cents);
  const status: SungStatus = abs <= toleranceCents ? 'accurate' : abs <= nearCents ? (cents > 0 ? 'sharp' : 'flat') : 'wrong';
  return { status, cents: Math.round(cents), detectedMidi: med, voicedSeconds };
}

/** Synthetic frames for tests and the simulator: a steady tone `cents` away from target. */
export function syntheticFrames(targetMidi: number, cents: number, seconds = 1.5, fps = 30, octave = 0): SungFrame[] {
  const hz = midiToHz(targetMidi + 12 * octave) * Math.pow(2, cents / 1200);
  const out: SungFrame[] = [];
  for (let i = 0; i < seconds * fps; i++) out.push({ t: i / fps, hz, confidence: 0.95, rms: 0.1 });
  return out;
}
