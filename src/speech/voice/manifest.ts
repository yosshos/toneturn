// Pre-rendered narration (0.66): the same Kokoro voice (af_heart, speed 1), rendered offline for every line known
// ahead of time and shipped as small MP3 files in public/voice/en/ (MP3 decodes everywhere, iOS Safari included).
// public/voice/en/manifest.json lists what exists, so the app never asks for a file that isn't there.

import { KOKORO_VOICE } from '../kokoro/decide';
import { cyrb53, normText } from '../kokoro/hash';
import { speakable, type SpeechLang } from '../speakable';

export const VOICE_MODEL = 'k82m-v1';
export interface VoiceManifest {
  v: 1;
  voice: string;
  model: string;
  /** file id → duration in ms */
  files: Record<string, number>;
}

/** The file id of a line: a hash of the voice, the model and the cleaned text (the app passes the raw line). */
export function voiceKey(raw: string, voice = KOKORO_VOICE, lang: SpeechLang = 'en'): string {
  return cyrb53(`${voice}|${VOICE_MODEL}|${normText(speakable(raw, lang))}`).toString(36);
}

export function voiceUrl(base: string, id: string, folder = 'en'): string {
  return `${base}voice/${folder}/${id}.mp3`;
}

/** The Kokoro voice each translated locale is recorded in (docs/SPEC-I18N.md §5): rendered offline like English
 *  (scripts/voice/render.mjs --lang), from the locale's own text, into public/voice/<locale>/. A locale without one
 *  reads its lines. Kokoro has no German or Korean voice; Japanese and Chinese need a pronouncer espeak lacks. */
export const LOCALE_VOICES: Partial<Record<SpeechLang, string>> = { es: 'ef_dora', fr: 'ff_siwis', it: 'if_sara', pt: 'pf_dora' };

/** Which file plays a line (null: not pre-rendered — on-device voice or reading). */
export function lookup(m: VoiceManifest | null, raw: string, voice = KOKORO_VOICE, lang: SpeechLang = 'en'): { id: string; ms: number } | null {
  if (!m || m.voice !== voice || m.model !== VOICE_MODEL) return null;
  const id = voiceKey(raw, voice, lang);
  const ms = m.files[id];
  return ms ? { id, ms } : null;
}
