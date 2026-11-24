// Kokoro in a translated locale's voice, offline (scripts/voice/render.mjs --lang, scripts/voice/sample-locales.mjs).
// kokoro-js knows only its English voices and English phonemes, so this calls the same model directly: our own
// phonemes (locale-g2p.mjs), the locale voice's style vectors (downloaded once to scripts/voice/.voices/).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import { Tensor } from '@huggingface/transformers';
import { phonemize } from './locale-g2p.mjs';

export const LOCALE_VOICES = { es: 'ef_dora', fr: 'ff_siwis', it: 'if_sara', pt: 'pf_dora' };
const VOICES = path.resolve('scripts/voice/.voices');

export async function loadKokoro(dtype = 'fp32', device = 'cpu') {
  return KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype, device });
}

const styles = new Map();
function style(voice) {
  if (!styles.has(voice)) {
    const f = path.join(VOICES, `${voice}.bin`);
    if (!existsSync(f)) throw new Error(`missing ${f}: download voices/${voice}.bin from onnx-community/Kokoro-82M-v1.0-ONNX`);
    const b = readFileSync(f);
    styles.set(voice, new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4));
  }
  return styles.get(voice);
}

/** Symbols the model never saw (dropped by its tokenizer): reported so a language's phonemes can be checked. */
export function unknownSymbols(tts, phonemes) {
  const vocab = tts.tokenizer.model?.tokens_to_ids ?? tts.tokenizer.model?.vocab;
  if (!vocab) return [];
  const has = (c) => (vocab instanceof Map ? vocab.has(c) : c in vocab);
  return [...new Set([...phonemes].filter((c) => !has(c)))];
}

/** One piece of text (≤ ~220 characters) → { audio: Float32Array, sr, phonemes }. */
export async function speakLocale(tts, text, locale, speed = 1) {
  const voice = LOCALE_VOICES[locale];
  const phonemes = await phonemize(text, locale);
  const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
  const n = input_ids.dims.at(-1);
  const off = 256 * Math.min(Math.max(n - 2, 0), 509);
  const s = style(voice).slice(off, off + 256);
  const { waveform } = await tts.model({
    input_ids,
    style: new Tensor('float32', s, [1, 256]),
    speed: new Tensor('float32', [speed], [1]),
  });
  return { audio: waveform.data, sr: 24000, phonemes };
}
