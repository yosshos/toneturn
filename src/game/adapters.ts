// Adapter interfaces between the musical engine/controller and platform APIs.
// Browser implementations live in src/audio and src/speech; fakes in src/game/fakes.ts.

import type { NoteEvent } from '../engine/lesson';
import type { SungFrame } from '../engine/sing';

export type CueKind = 'ready' | 'correct' | 'wrong' | 'complete';

export interface AudioEngine {
  /** Create/resume the AudioContext. Must be called from a user gesture. */
  unlock(): Promise<void>;
  /** Play timed note events; resolves when the last note has rung, rejects/ends early on abort. */
  play(events: NoteEvent[], length: number, signal: AbortSignal): Promise<void>;
  cue(kind: CueKind): void;
  stopAll(): void;
  /** Subscribe to note-on/off for audio-synced visuals. */
  onNotes(cb: (active: number[]) => void): () => void;
}

export interface PromptPlayer {
  unlock(): void;
  speak(text: string, lang: 'he' | 'en', signal: AbortSignal): Promise<void>;
  cancel(): void;
  /** Which language the voice actually used (falls back when no voice exists). */
  resolvedLang(lang: 'he' | 'en'): 'he' | 'en' | null;
}

/** Where a voice failure happened — capture and recognition are probed independently. */
export type AccessStage = 'capture' | 'recognition';

export type AccessErrorCode =
  | 'insecure-context'
  | 'iframe-policy'
  | 'permission-denied' // site permission blocked / dismissed
  | 'os-blocked' // OS privacy setting blocks the browser
  | 'no-device'
  | 'device-busy'
  | 'unsupported' // no SpeechRecognition / no getUserMedia
  | 'service-denied' // recognizer refused although capture works
  | 'network'
  | 'language-unsupported'
  | 'unknown';

export interface AccessError {
  stage: AccessStage;
  code: AccessErrorCode;
  /** Raw browser error name/code and message, shown verbatim for diagnosis. */
  raw: string;
}

export interface MicAccess {
  /** Open capture once to obtain permission, then release it immediately. */
  request(): Promise<{ ok: true } | { ok: false; error: AccessError }>;
}

export type ListenResult =
  | { kind: 'result'; alternatives: string[] }
  | { kind: 'silence' }
  | { kind: 'aborted' }
  | { kind: 'error'; error: AccessError };

export interface ListenOptions {
  lang: string; // BCP-47, e.g. 'he-IL' / 'en-US'
  signal: AbortSignal;
  /** Fired when the recognizer actually starts capturing audio. */
  onCapturing?: () => void;
  onSpeech?: () => void;
  onInterim?: (text: string) => void;
  /** Hint words/phrases for the recognizer when supported. */
  phrases?: string[];
}

export interface SpeechTranscriber {
  readonly name: string;
  isSupported(): boolean;
  listen(opts: ListenOptions): Promise<ListenResult>;
  abort(): void;
}

export interface SingOptions {
  signal: AbortSignal;
  /** Hard cap on capture length. */
  maxMs?: number;
  /** Give up (silence) when no voiced frame arrives within this time. */
  silenceMs?: number;
  /** Sequence mode: stop this long after the last voiced frame (instead of after one held note). */
  endSilenceMs?: number;
  /** Analysis hop in ms (shorter for fast runs, spec K.3). Default 33. */
  hopMs?: number;
  onCapturing?: () => void;
  onFrame?: (f: SungFrame) => void;
  /** Also record the take (for "listen back"; kept in memory only). */
  record?: boolean;
  /** Treat the first ms after the microphone opens as silence (the reference's tail and the "ready" chime still ring). */
  ignoreFirstMs?: number;
}

export type SingCaptureResult =
  | { kind: 'frames'; frames: SungFrame[]; audio?: Blob }
  | { kind: 'silence' }
  | { kind: 'aborted' }
  | { kind: 'error'; error: AccessError };

/** Monophonic pitch capture for singing tasks (mic only during the capture window). */
export interface PitchCapture {
  sing(opts: SingOptions): Promise<SingCaptureResult>;
}

export interface RhythmTimelineLike {
  clicks: { t: number; accent: boolean }[];
  wood: number[];
  /** Kick ('k') or snare ('s') for each `wood` hit (Drum Echo); otherwise woodblock. */
  drums?: ('k' | 's')[];
  responseAt: number;
  responseEnd: number;
}

/** Sample-accurate rhythm playback mapped to the performance.now() clock used by input events. */
export interface RhythmAudio {
  /**
   * Schedule the timeline. Resolves when the response window has ended, with the
   * performance.now() time at which the response's beat 1 is heard (output latency included).
   */
  playTimeline(
    tl: RhythmTimelineLike,
    signal: AbortSignal,
    onBeat?: (i: number, accent: boolean) => void,
    onResponseStart?: (perfMs: number) => void,
  ): Promise<number>;
}

/** Microphone onset detection for knocking on a table. */
export interface KnockInput {
  listen(opts: {
    signal: AbortSignal;
    onKnock: (perfMs: number) => void;
    onReady?: () => void;
  }): Promise<{ ok: true } | { ok: false; error: AccessError }>;
}

export interface Clock {
  sleep(ms: number, signal: AbortSignal): Promise<void>;
  /** Monotonic ms (performance.now in the browser); used for response times. */
  now?(): number;
}

export interface Adapters {
  audio: AudioEngine & RhythmAudio;
  /** Microphone onsets ("ta" / knocks) for rhythm reading in Voice mode. Optional. */
  knock?: KnockInput;
  tts: PromptPlayer;
  stt: SpeechTranscriber;
  mic: MicAccess;
  pitch: PitchCapture;
  clock: Clock;
  simulated: boolean;
}

export class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new Cancelled();
}

export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Cancelled());
      const t = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(new Cancelled());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }),
};
