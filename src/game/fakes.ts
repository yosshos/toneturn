// Deterministic adapters for tests and the clearly-labelled simulator mode.

import type { Answer, NoteEvent } from '../engine/lesson';
import { syntheticFrames } from '../engine/sing';
import {
  Cancelled,
  type AccessError,
  type AudioEngine,
  type Clock,
  type CueKind,
  type ListenOptions,
  type ListenResult,
  type MicAccess,
  type PitchCapture,
  type SingCaptureResult,
  type SingOptions,
  type PromptPlayer,
  type SpeechTranscriber,
} from './adapters';

export class FakeAudio implements AudioEngine {
  log: string[] = [];
  unlocked = false;
  async unlock() {
    this.unlocked = true;
  }
  async play(events: NoteEvent[], _length: number, signal: AbortSignal) {
    if (signal.aborted) throw new Cancelled();
    this.log.push(`play:${events.length}`);
    await Promise.resolve();
    if (signal.aborted) throw new Cancelled();
  }
  cue(kind: CueKind) {
    this.log.push(`cue:${kind}`);
  }
  stopAll() {
    this.log.push('stop');
  }
  onNotes() {
    return () => {};
  }
}

export class FakeTTS implements PromptPlayer {
  spoken: string[] = [];
  unlock() {}
  cancel() {}
  resolvedLang(l: 'he' | 'en') {
    return l;
  }
  /** Texts matching this predicate block until aborted (to test switching mid-feedback). */
  holdIf: (text: string) => boolean = () => false;
  async speak(text: string, _l: 'he' | 'en', signal: AbortSignal) {
    if (signal.aborted) throw new Cancelled();
    this.spoken.push(text);
    if (this.holdIf(text)) {
      await new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(new Cancelled()), { once: true }));
    }
    await Promise.resolve();
    if (signal.aborted) throw new Cancelled();
  }
}

export class FakeMic implements MicAccess {
  calls = 0;
  constructor(public error: AccessError | null = null) {}
  async request() {
    this.calls++;
    return this.error ? { ok: false as const, error: this.error } : { ok: true as const };
  }
}

/** Script step: a transcript, silence, an error, or a function of the expected answer. */
export type ScriptStep =
  | string
  | { silence: true }
  | { error: AccessError }
  | { hang: true } // never resolves until aborted (to test switching while listening)
  | ((expected: Answer) => string);

export class ScriptedTranscriber implements SpeechTranscriber {
  readonly name = 'scripted';
  listens = 0;
  aborts = 0;
  /** Set by the host so function steps can answer "correctly" in demo mode. */
  expected: () => Answer = () => 1;
  constructor(
    public script: ScriptStep[],
    private delayMs = 0,
    public supported = true,
  ) {}
  isSupported() {
    return this.supported;
  }
  abort() {
    this.aborts++;
  }
  async listen(opts: ListenOptions): Promise<ListenResult> {
    this.listens++;
    if (opts.signal.aborted) return { kind: 'aborted' };
    opts.onCapturing?.();
    const step = this.script.shift();
    const wait = (ms: number) =>
      new Promise<boolean>((resolve) => {
        if (ms <= 0) return void Promise.resolve().then(() => resolve(!opts.signal.aborted));
        const t = setTimeout(() => resolve(true), ms);
        opts.signal.addEventListener('abort', () => {
          clearTimeout(t);
          resolve(false);
        }, { once: true });
      });
    if (step && typeof step === 'object' && 'hang' in step) {
      await new Promise<void>((r) => opts.signal.addEventListener('abort', () => r(), { once: true }));
      return { kind: 'aborted' };
    }
    if (!(await wait(this.delayMs))) return { kind: 'aborted' };
    if (step === undefined || (typeof step === 'object' && 'silence' in step)) return { kind: 'silence' };
    if (typeof step === 'object' && 'error' in step) return { kind: 'error', error: step.error };
    const text = typeof step === 'function' ? step(this.expected()) : step;
    opts.onSpeech?.();
    return { kind: 'result', alternatives: [text] };
  }
}

export const immediateClock: Clock = {
  sleep: async (_ms, signal) => {
    if (signal.aborted) throw new Cancelled();
    await Promise.resolve();
    if (signal.aborted) throw new Cancelled();
  },
};

/** Script step for singing: cents off target, or silence / an access error / hang until aborted. */
export type SingStep = number | { silence: true } | { error: AccessError } | { hang: true } | { noise: true };

export class ScriptedPitch implements PitchCapture {
  calls = 0;
  /** MIDI of the current target (set by the host). */
  target: () => number = () => 60;
  constructor(
    public script: SingStep[],
    private delayMs = 0,
  ) {}
  async sing(opts: SingOptions): Promise<SingCaptureResult> {
    this.calls++;
    if (opts.signal.aborted) return { kind: 'aborted' };
    opts.onCapturing?.();
    const step = this.script.shift() ?? { silence: true };
    if (typeof step === 'object' && 'hang' in step) {
      await new Promise<void>((r) => opts.signal.addEventListener('abort', () => r(), { once: true }));
      return { kind: 'aborted' };
    }
    if (this.delayMs) {
      const ok = await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(true), this.delayMs);
        opts.signal.addEventListener('abort', () => {
          clearTimeout(t);
          resolve(false);
        }, { once: true });
      });
      if (!ok) return { kind: 'aborted' };
    } else await Promise.resolve();
    if (opts.signal.aborted) return { kind: 'aborted' };
    if (typeof step === 'object' && 'silence' in step) return { kind: 'silence' };
    if (typeof step === 'object' && 'error' in step) return { kind: 'error', error: step.error };
    if (typeof step === 'object' && 'noise' in step) {
      // unstable glide → unclear
      const frames = syntheticFrames(this.target(), 0, 1.5).map((f, i) => ({ ...f, hz: f.hz! * Math.pow(2, ((i % 10) - 5) / 4) }));
      return { kind: 'frames', frames };
    }
    const frames = syntheticFrames(this.target(), step as number, 1.5, 30, -1);
    frames.forEach((f) => opts.onFrame?.(f));
    return { kind: 'frames', frames };
  }
}
