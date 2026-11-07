// Sound & production ear (spec AE §4.4): a description of processed sound. Pure data — audio/fx.ts renders it with
// Web Audio (a synthesised source through an effect chain). Loudness matching (R1): when `matchTo` is set, the
// renderer scales this sound to the RMS of the same source through `matchTo` (usually the dry chain), so a boost,
// drive or reverb is never answered by level.

export type FxSource =
  /** Pink noise. */
  | 'pink'
  /** A synthesised band loop: drums + bass + keys (deterministic from seed / bpm). */
  | 'loop'
  /** The loop's drums only. */
  | 'drums'
  /** A vowel-filtered sawtooth line, voice-like. */
  | 'voice'
  /** A pure sine at `sineHz`. */
  | 'sine';

export type FxPart = 'drums' | 'bass' | 'keys';

export interface FxFilter {
  type: 'peaking' | 'lowshelf' | 'highshelf' | 'highpass' | 'lowpass';
  freq: number;
  /** dB (peaking / shelves). */
  gain?: number;
  q?: number;
}

export interface FxChain {
  eq?: FxFilter[];
  /** −1 (left) … 1 (right). */
  pan?: number;
  /** Stereo width of the source: 0 = mono, 1 = normal, 1.5 = wide. */
  width?: number;
  reverb?: { decay: number; mix: number; predelay?: number };
  delay?: { time: number; feedback: number; mix: number };
  comp?: { threshold: number; ratio: number; attack?: number; release?: number };
  /** Wave-shaper drive, 0 (clean) … 1 (fuzz). */
  drive?: number;
  /** Output level in dB. */
  gainDb?: number;
}

export interface FxSpec {
  source: FxSource;
  seconds: number;
  seed: number;
  bpm?: number;
  sineHz?: number;
  /** Loop parts to play (default all) and their pan positions (pan-ear L3). */
  parts?: FxPart[];
  partPan?: Partial<Record<FxPart, number>>;
  chain: FxChain;
  /** Loudness-match to the same source through this chain (R1). Absent = play as is (level items). */
  matchTo?: FxChain;
}

/** True when the sound has energy that phone speakers can't play (R2): asks for headphones. */
export function needsHeadphones(spec: FxSpec): boolean {
  if (spec.source === 'sine') return (spec.sineHz ?? 1000) < 300;
  if ((spec.chain.eq ?? []).some((f) => f.freq < 300)) return true;
  if (spec.chain.pan !== undefined || spec.chain.width !== undefined || spec.partPan) return true;
  return false;
}

/** True when the sound is fine on a phone speaker: no stereo cue, nothing below 500 Hz carries the answer (R2). */
export function speakerSafe(spec: FxSpec): boolean {
  if (needsHeadphones(spec)) return false;
  if (spec.source === 'sine') return (spec.sineHz ?? 1000) >= 500;
  return (spec.chain.eq ?? []).every((f) => f.freq >= 500);
}

/** Seconds of tail the chain adds after the source stops (reverb decay + pre-delay, delay repeats to −60 dB). */
export function fxTail(chain: FxChain): number {
  let t = 0;
  if (chain.reverb && chain.reverb.mix > 0) t = Math.max(t, (chain.reverb.predelay ?? 0) + chain.reverb.decay);
  if (chain.delay && chain.delay.mix > 0) {
    const fb = Math.min(0.9, Math.max(0.01, chain.delay.feedback));
    t = Math.max(t, Math.min(3, chain.delay.time * Math.ceil(Math.log(0.001) / Math.log(fb))));
  }
  return Math.round(t * 100) / 100;
}

/** How long the source itself plays: `seconds` minus the chain's tail (generators set seconds = source + tail). */
export function sourceSeconds(spec: FxSpec): number {
  return Math.max(0.3, Math.round((spec.seconds - fxTail(spec.chain)) * 100) / 100);
}

/** A spec whose `seconds` covers the source and the chain's tail. */
export function fxSpec(p: Omit<FxSpec, 'seconds'> & { src: number }): FxSpec {
  const { src, ...rest } = p;
  return { ...rest, seconds: Math.round((src + fxTail(p.chain)) * 100) / 100 };
}

/** Stable cache key of a render. */
export const fxKey = (spec: FxSpec): string => JSON.stringify(spec);

/** Every fx spec in a list of stimuli (structural, so lesson.ts and this file don't import each other's values). */
export function fxSpecsIn(stims: readonly { kind: string }[]): FxSpec[] {
  return stims.filter((s): s is { kind: 'fx'; fx: FxSpec } => s.kind === 'fx').map((s) => s.fx);
}

/** An item (stimulus + every choice's sound) needs headphones when any of its sounds does (R2). */
export function itemNeedsHeadphones(q: { stimulus: readonly { kind: string }[]; choiceStim?: Record<string, readonly { kind: string }[]> }): boolean {
  const all = [q.stimulus, ...Object.values(q.choiceStim ?? {})].flatMap((s) => fxSpecsIn(s));
  return all.some(needsHeadphones);
}
