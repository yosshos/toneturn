// Pre-rendered narration (0.66): the same Kokoro voice (af_heart, speed 1), rendered offline for every line known
// ahead of time and shipped as small MP3 files in public/voice/en/ (MP3 decodes everywhere, iOS Safari included).
// public/voice/en/manifest.json lists what exists, so the app never asks for a file that isn't there.

import { KOKORO_VOICE } from '../kokoro/decide';
import { cyrb53, normText } from '../kokoro/hash';
import { speakable } from '../speakable';

export const VOICE_MODEL = 'k82m-v1';
export interface VoiceManifest {
  v: 1;
  voice: string;
  model: string;
  /** file id → duration in ms */
  files: Record<string, number>;
}

/** The file id of a line: a hash of the voice, the model and the cleaned text (the app passes the raw line). */
export function voiceKey(raw: string, voice = KOKORO_VOICE): string {
  return cyrb53(`${voice}|${VOICE_MODEL}|${normText(speakable(raw, 'en'))}`).toString(36);
}

export function voiceUrl(base: string, id: string): string {
  return `${base}voice/en/${id}.mp3`;
}

/** Which file plays a line (null: not pre-rendered — on-device voice or reading). */
export function lookup(m: VoiceManifest | null, raw: string): { id: string; ms: number } | null {
  if (!m || m.voice !== KOKORO_VOICE || m.model !== VOICE_MODEL) return null;
  const id = voiceKey(raw);
  const ms = m.files[id];
  return ms ? { id, ms } : null;
}
