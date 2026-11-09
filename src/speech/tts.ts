// The narrator behind the PromptPlayer interface.
// 0.65 (owner): English is spoken by Kokoro (an open 82M voice model running on the device, see ./kokoro);
// Hebrew is never spoken — its text types itself out. Whenever the voice isn't ready (first download, offline,
// a device too slow for it) the line is read instead: the text stays on screen for a reading pause.

import { Cancelled, type PromptPlayer } from '../game/adapters';
import { shown, speakable } from './speakable';
import { automated, readingMs, talkOn } from './talk';
import { wantsKokoro } from './kokoro/decide';

/** What the player needs from the narrator engine (KokoroNarrator; a fake in tests). */
export interface Narrator {
  readonly isReady: boolean;
  readonly state: { state: 'off' | 'downloading' | 'ready' | 'unavailable' };
  speed: number;
  ensure(): Promise<boolean>;
  speak(text: string, signal: AbortSignal, shownText?: string): Promise<void>;
  prefetch(texts: string[]): void;
  stop(): void;
}

/** Reading mode: no voice, just a pause long enough to read the line (abortable). */
function readPause(text: string, signal: AbortSignal): Promise<void> {
  const ms = readingMs(shown(text));
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Cancelled());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export class BrowserPromptPlayer implements PromptPlayer {
  /** Narration speed (Settings: slow / normal / fast). */
  rate = 1.0;
  /** The English voice; set by the app (services.ts). Without one every line is read. */
  narrator: Narrator | null = null;
  /** Speak even in reading mode, waiting for the voice to load (the preview in Settings). */
  force = false;

  /** Would an English line be spoken now? (TypedText pops and paces on this.) */
  speaking(lang: 'he' | 'en'): boolean {
    return wantsKokoro(lang, talkOn(), automated()) && !!this.narrator?.isReady;
  }

  unlock() {
    // Start the download early when the narrator will be wanted (never for Hebrew, never in automated runs).
    if (this.narrator && wantsKokoro('en', talkOn(), automated()) && this.narrator.state.state === 'off') void this.narrator.ensure();
  }

  resolvedLang(lang: 'he' | 'en'): 'he' | 'en' | null {
    return lang;
  }

  cancel() {
    this.narrator?.stop();
  }

  /** Make the next lines while this one plays (mini-lesson steps, the lesson intro). */
  prefetch(raws: string[], lang: 'he' | 'en') {
    if (!this.narrator?.isReady || !wantsKokoro(lang, talkOn(), automated())) return;
    this.narrator.speed = this.rate;
    this.narrator.prefetch(raws.map((r) => speakable(r, lang)));
  }

  async speak(raw: string, lang: 'he' | 'en', signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new Cancelled();
    if (!raw.trim()) return;
    const n = this.narrator;
    const wanted = lang === 'en' && !automated() && (talkOn() || this.force);
    if (!wanted || !n) return readPause(raw, signal);
    n.speed = this.rate;
    const text = speakable(raw, lang);
    if (!text.trim()) return;
    if (!n.isReady) {
      // First use: start the download; meanwhile (and if it can't load) the line is read.
      const loading = n.ensure();
      if (!this.force || !(await loading)) return readPause(raw, signal);
    }
    try {
      await n.speak(text, signal, shown(raw));
    } catch (e) {
      if (e instanceof Cancelled || signal.aborted) throw new Cancelled();
      return readPause(raw, signal); // the voice gave up (too slow / failed): read this line
    }
  }
}
