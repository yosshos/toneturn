// Browser SpeechRecognition behind the SpeechTranscriber interface.
// One recognizer instance per listen() call: Chrome rejects restarting an instance
// that has not fully ended, which is a common source of flaky hands-free loops.

import type { ListenOptions, ListenResult, SpeechTranscriber } from '../game/adapters';
import { classifyRecognitionError, gatherEnv } from './errors';
import { captureOk } from './mic';

/* Minimal typings — SpeechRecognition is not in lib.dom for all TS versions. */
interface SRAlternative { transcript: string; confidence: number }
interface SRResult { isFinal: boolean; length: number; [i: number]: SRAlternative }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRErrorEvent { error: string; message: string }
export interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SRCtor = (new () => SRInstance) & {
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

export function getRecognitionCtor(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WebSpeechTranscriber implements SpeechTranscriber {
  readonly name = 'web-speech';
  private current: SRInstance | null = null;
  private ended: Promise<void> = Promise.resolve();
  /** Max time to wait for an answer once capture has started (bounded silence). */
  answerTimeoutMs = 7000;

  isSupported() {
    return getRecognitionCtor() !== null;
  }

  abort() {
    try {
      this.current?.abort();
    } catch {
      /* ignore */
    }
  }

  async listen(opts: ListenOptions): Promise<ListenResult> {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return { kind: 'error', error: { stage: 'recognition', code: 'unsupported', raw: 'SpeechRecognition is not available in this browser' } };
    // Wait for the previous instance to end before starting a new one.
    await this.ended;
    if (opts.signal.aborted) return { kind: 'aborted' };
    const env = await gatherEnv();

    const rec = new Ctor();
    rec.lang = opts.lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    this.current = rec;

    let resolveEnded!: () => void;
    this.ended = new Promise((r) => (resolveEnded = r));

    return new Promise<ListenResult>((resolve) => {
      let settled = false;
      let finalAlts: string[] | null = null;
      let lastInterim = '';
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (r: ListenResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        opts.signal.removeEventListener('abort', onAbort);
        resolve(r);
      };
      const onAbort = () => {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
        finish({ kind: 'aborted' });
      };
      opts.signal.addEventListener('abort', onAbort, { once: true });

      rec.onaudiostart = () => {
        opts.onCapturing?.();
        timer = setTimeout(() => {
          try {
            rec.stop(); // ask for a final result; onend resolves
          } catch {
            /* ignore */
          }
        }, this.answerTimeoutMs);
      };
      rec.onspeechstart = () => opts.onSpeech?.();
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            const alts: string[] = [];
            for (let j = 0; j < res.length; j++) alts.push(res[j].transcript);
            finalAlts = alts;
          } else {
            lastInterim = res[0]?.transcript ?? '';
            opts.onInterim?.(lastInterim);
          }
        }
      };
      rec.onerror = (e) => {
        if (e.error === 'aborted') return finish({ kind: 'aborted' });
        if (e.error === 'no-speech') return finish({ kind: 'silence' });
        finish({ kind: 'error', error: classifyRecognitionError(e.error, e.message, env, captureOk()) });
      };
      rec.onend = () => {
        resolveEnded();
        if (this.current === rec) this.current = null;
        if (finalAlts && finalAlts.some((a) => a.trim())) finish({ kind: 'result', alternatives: finalAlts });
        else if (lastInterim.trim()) finish({ kind: 'result', alternatives: [lastInterim] });
        else finish({ kind: 'silence' });
      };
      try {
        rec.start();
      } catch (err) {
        resolveEnded();
        const name = (err as Error)?.name ?? 'Error';
        finish({ kind: 'error', error: { stage: 'recognition', code: 'unknown', raw: `${name}: ${(err as Error)?.message ?? ''} (start() threw)` } });
      }
    });
  }
}
