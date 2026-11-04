// Deterministic adapters for tests and the clearly-labelled simulator mode.

import type { Answer, NoteEvent } from '../engine/lesson';
import { syntheticFrames, type SungFrame } from '../engine/sing';
import { midiToHz } from '../engine/pitch';
import {
  Cancelled,
  type AccessError,
  type AudioEngine,
  type Clock,
  type CueKind,
  type ListenOptions,
  type ListenResult,
  type MicAccess,
  type KnockInput,
  type PitchCapture,
  type RhythmAudio,
  type RhythmTimelineLike,
  type SingCaptureResult,
  type SingOptions,
  type PromptPlayer,
  type SpeechTranscriber,
} from './adapters';

export class FakeAudio implements AudioEngine, RhythmAudio {
  log: string[] = [];
  /** Called inside playTimeline once the response window opens (tests tap here). */
  respond: (responsePerfMs: number) => void = () => {};
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
  async playTimeline(tl: RhythmTimelineLike, signal: AbortSignal, onBeat?: (i: number, accent: boolean) => void, onResponseStart?: (perf: number) => void) {
    if (signal.aborted) throw new Cancelled();
    this.log.push(`timeline:${tl.wood.length}`);
    tl.clicks.forEach((c, i) => onBeat?.(i, c.accent));
    const start = 1000;
    onResponseStart?.(start);
    this.respond(start);
    await Promise.resolve();
    if (signal.aborted) throw new Cancelled();
    return start;
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
export type SingStep = number | { silence: true } | { error: AccessError } | { hang: true } | { noise: true } | { midis: number[] };

export class ScriptedPitch implements PitchCapture {
  calls = 0;
  /** MIDI of the current target (set by the host). */
  target: () => number = () => 60;
  /** Sequence targets (sung sequences / runs): a cents step then sings every note that far off. */
  targets: () => number[] | null = () => null;
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
    if (typeof step === 'object' && 'midis' in step) {
      return { kind: 'frames', frames: sungSequence(step.midis) };
    }
    if (typeof step === 'object' && 'noise' in step) {
      // unstable glide → unclear
      const frames = syntheticFrames(this.target(), 0, 1.5).map((f, i) => ({ ...f, hz: f.hz! * Math.pow(2, ((i % 10) - 5) / 4) }));
      return { kind: 'frames', frames };
    }
    const seq = this.targets();
    if (seq && seq.length > 1) return { kind: 'frames', frames: sungSequence(seq.map((m) => m + (step as number) / 100)) };
    const frames = syntheticFrames(this.target(), step as number, 1.5, 30, -1);
    frames.forEach((f) => opts.onFrame?.(f));
    return { kind: 'frames', frames };
  }
}

/** Synthetic sung melody: 0.45 s per note, 0.12 s gaps, 30 fps. */
export function sungSequence(midis: number[], fps = 30): SungFrame[] {
  const out: SungFrame[] = [];
  let t = 0;
  for (const m of midis) {
    for (let i = 0; i < 0.45 * fps; i++, t += 1 / fps) out.push({ t, hz: midiToHz(m), confidence: 0.95, rms: 0.1 });
    for (let i = 0; i < 0.12 * fps; i++, t += 1 / fps) out.push({ t, hz: null, confidence: 0, rms: 0.001 });
  }
  return out;
}

export class FakeKnock implements KnockInput {
  onKnock: ((perf: number) => void) | null = null;
  constructor(public error: AccessError | null = null) {}
  async listen(opts: Parameters<KnockInput['listen']>[0]) {
    if (this.error) return { ok: false as const, error: this.error };
    this.onKnock = opts.onKnock;
    opts.onReady?.();
    await new Promise<void>((r) => (opts.signal.aborted ? r() : opts.signal.addEventListener('abort', () => r(), { once: true })));
    this.onKnock = null;
    return { ok: true as const };
  }
}
