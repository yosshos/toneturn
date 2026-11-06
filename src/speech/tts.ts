// Browser speechSynthesis behind the PromptPlayer interface.

import { Cancelled, type PromptPlayer } from '../game/adapters';
import { chooseVoice, type GenderPref } from './voices';
import { shown, speakable } from './speakable';
import { readingMs, talkOn } from './talk';

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

export function listVoices(): SpeechSynthesisVoice[] {
  return typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
}

export function voicesReady(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = listVoices();
    if (v.length || typeof speechSynthesis === 'undefined') return resolve(v);
    const t = setTimeout(() => resolve(listVoices()), timeoutMs);
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(t);
        resolve(listVoices());
      },
      { once: true },
    );
  });
}

export interface VoicePrefs {
  gender: GenderPref;
  voices: { he: string | null; en: string | null };
}

export function pickVoice(lang: 'he' | 'en', prefs?: VoicePrefs): SpeechSynthesisVoice | null {
  return chooseVoice(listVoices(), lang, prefs?.voices[lang] ?? null, prefs?.gender ?? 'any');
}

export class BrowserPromptPlayer implements PromptPlayer {
  rate = 1.0;
  prefs: VoicePrefs = { gender: 'any', voices: { he: null, en: null } };

  unlock() {
    if (typeof speechSynthesis === 'undefined') return;
    // A silent utterance inside the Start gesture unlocks speech on stricter browsers.
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    void voicesReady();
  }

  resolvedLang(lang: 'he' | 'en'): 'he' | 'en' | null {
    if (typeof speechSynthesis === 'undefined') return null;
    if (pickVoice(lang, this.prefs)) return lang;
    if (pickVoice('en', this.prefs)) return 'en';
    return null;
  }

  cancel() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Speak even in reading mode (the voice preview in Settings). */
  force = false;

  speak(raw: string, lang: 'he' | 'en', signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new Cancelled());
    if (!raw.trim()) return Promise.resolve();
    if (!talkOn() && !this.force) return readPause(raw, signal);
    const text = speakable(raw, lang);
    if (typeof speechSynthesis === 'undefined' || !text.trim()) return Promise.resolve();
    const voice = pickVoice(lang, this.prefs);
    if (!voice) return Promise.resolve(); // caller shows the text; no voice for this language
    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = this.rate;
      let done = false;
      // Chrome occasionally never fires onend; bound the wait by text length.
      const guard = setTimeout(() => finish(), 2500 + text.length * 120);
      const finish = (err?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        signal.removeEventListener('abort', onAbort);
        if (err) reject(err);
        else resolve();
      };
      const onAbort = () => {
        speechSynthesis.cancel();
        finish(new Cancelled());
      };
      signal.addEventListener('abort', onAbort, { once: true });
      u.onend = () => finish();
      u.onerror = () => finish();
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }
}
