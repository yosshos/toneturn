// Deterministic adapters for tests and the clearly-labelled simulator mode.

import type { NoteEvent } from '../engine/lesson';
import {
  Cancelled,
  type AccessError,
  type AudioEngine,
  type Clock,
  type CueKind,
  type ListenOptions,
  type ListenResult,
  type MicAccess,
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
  | ((expected: number) => string);

export class ScriptedTranscriber implements SpeechTranscriber {
  readonly name = 'scripted';
  listens = 0;
  aborts = 0;
  /** Set by the host so function steps can answer "correctly" in demo mode. */
  expected: () => number = () => 1;
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
