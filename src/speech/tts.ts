// The narrator behind the PromptPlayer interface.
// English is spoken in one voice, Kokoro af_heart; Hebrew is never spoken — its text types itself out.
// 0.66 (owner: no narration on an Android phone): each English line plays, in this order,
//   1. its pre-recorded file (rendered offline, public/voice/en) — every phone just plays a file;
//   2. on-device Kokoro, only where it's fast (WebGPU) — lines built per question;
//   3. reading: the text stays on screen for a reading pause (with the pop per word).

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
  /** Worth loading on this device (WebGPU): elsewhere it's too slow, and pre-recorded lines cover the lessons. */
  worthLoading(): Promise<boolean>;
}

/** Pre-recorded lines (VoiceFiles; a fake in tests). */
export interface Recordings {
  readonly loaded: boolean;
  load(): Promise<boolean>;
  has(raw: string): boolean;
  prefetch(raws: string[]): void;
  speak(raw: string, rate: number, signal: AbortSignal, shownText?: string): Promise<boolean>;
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
  /** On-device Kokoro; set by the app (services.ts). */
  narrator: Narrator | null = null;
  /** Pre-recorded lines; set by the app (services.ts). */
  recordings: Recordings | null = null;
  /** Speak even in reading mode, waiting for the voice to load (the preview in Settings). */
  force = false;

  private wanted(lang: 'he' | 'en'): boolean {
    return wantsKokoro(lang, talkOn() || this.force, automated());
  }

  /** Would English lines be spoken now (some voice is available)? */
  speaking(lang: 'he' | 'en'): boolean {
    return this.wanted(lang) && (!!this.recordings?.loaded || !!this.narrator?.isReady);
  }

  /**
   * Will this line be spoken (true) or read (false)? `variant` is the line as recorded when the shown text is
   * personalised (recordings leave the player's name out).
   */
  speaksLine(raw: string, lang: 'he' | 'en', variant?: string): boolean {
    if (!this.wanted(lang)) return false;
    return !!this.recordings?.has(raw) || (!!variant && !!this.recordings?.has(variant)) || !!this.narrator?.isReady;
  }

  /** Wait (briefly, once) for the list of recordings so the first line can be judged spoken or read. */
  async prepare(lang: 'he' | 'en'): Promise<void> {
    const rec = this.recordings;
    if (!rec || rec.loaded || !this.wanted(lang)) return;
    await Promise.race([rec.load(), new Promise((r) => setTimeout(r, 1500))]);
  }

  unlock() {
    // The recordings' manifest is small: fetch it as soon as English narration may be wanted.
    if (this.recordings && this.wanted('en') && !this.recordings.loaded) void this.recordings.load();
  }

  resolvedLang(lang: 'he' | 'en'): 'he' | 'en' | null {
    return lang;
  }

  cancel() {
    this.recordings?.stop();
    this.narrator?.stop();
  }

  /** Get the next lines ready while this one plays (mini-lesson steps, the lesson intro). */
  prefetch(raws: string[], lang: 'he' | 'en') {
    if (!this.wanted(lang)) return;
    this.recordings?.prefetch(raws);
    const missing = raws.filter((r) => !this.recordings?.has(r));
    if (!missing.length || !this.narrator?.isReady) return;
    this.narrator.speed = this.rate;
    this.narrator.prefetch(missing.map((r) => speakable(r, lang)));
  }

  private decisions = new Map<string, boolean>();
  /** Was this shown line (as on screen) last sent to a voice (true) or read (false)? Captions pop only when read. */
  decided(shownText: string): boolean | undefined {
    return this.decisions.get(shownText);
  }

  async speak(raw: string, lang: 'he' | 'en', signal: AbortSignal, variant?: string): Promise<void> {
    if (signal.aborted) throw new Cancelled();
    if (!raw.trim()) return;
    if (this.recordings?.loaded !== false) this.decisions.set(shown(raw), this.speaksLine(raw, lang, variant));
    if (this.decisions.size > 30) this.decisions.delete(this.decisions.keys().next().value!);
    if (!this.wanted(lang)) return readPause(raw, signal);
    // 1. a recording (the manifest is tiny; on the very first line wait for it briefly)
    const rec = this.recordings;
    if (rec) {
      if (!rec.loaded) await Promise.race([rec.load(), new Promise((r) => setTimeout(r, 1500))]);
      for (const v of variant && variant !== raw ? [raw, variant] : [raw]) if (rec.has(v) && (await rec.speak(v, this.rate, signal, shown(raw)))) return;
    }
    // 2. on-device Kokoro, only where it's fast
    const n = this.narrator;
    const text = speakable(raw, lang);
    if (!n || !text.trim()) return readPause(raw, signal);
    n.speed = this.rate;
    if (!n.isReady) {
      if (n.state.state === 'unavailable' || (n.state.state === 'off' && !(await n.worthLoading()))) return readPause(raw, signal);
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

