// Pure decisions for the Kokoro narrator (0.65): when to load it, how to run it, when to give up for the session.

/** Kokoro-82M v1.0 (ONNX, onnx-community). */
export const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
/** Download sizes (MB) of the two graphs we use: model_quantized.onnx (q8) and model.onnx (fp32). */
export const KOKORO_MB = { q8: 88, fp32: 311 } as const;
export type KokoroDtype = keyof typeof KOKORO_MB;
export type KokoroDevice = 'webgpu' | 'wasm';
/** af_heart: the only English voice graded A overall in Kokoro's VOICES.md (af_bella is A-); warm, clear, American. */
export const KOKORO_VOICE = 'af_heart';

/** Give up on the voice when the first sentence takes longer than this × its own length to make. */
export const SLOW_FACTOR = 1.5;

export type KokoroState = 'off' | 'downloading' | 'ready' | 'unavailable';
export interface KokoroStatus {
  state: KokoroState;
  /** 0..100 while downloading. */
  pct: number;
  /** Why it's unavailable (shown softly in Settings). */
  why?: 'offline' | 'unsupported' | 'slow' | 'error';
  /** Real-time factor of the calibration sentence (generation time / audio time). */
  rtf?: number;
  device?: KokoroDevice;
  /** Size of the download for the chosen graph. */
  mb?: number;
}

/** Should the narrator fall back to reading for this session? (generation slower than SLOW_FACTOR × real time) */
export function tooSlow(genMs: number, audioMs: number, factor = SLOW_FACTOR): boolean {
  if (!(audioMs > 0)) return true;
  return genMs > factor * audioMs;
}

/** Load the model only when an English narrator line is actually wanted (never for Hebrew, never in automated runs). */
export function wantsKokoro(lang: 'he' | 'en', voiceOn: boolean, automated: boolean): boolean {
  return lang === 'en' && voiceOn && !automated;
}

/**
 * How to run it (measured 2026-11-09 in Chrome on an i7-1165G7 / Iris Xe, calibration sentence, busy machine):
 * WebGPU fp32 RTF 0.9–1.3 · WebGPU fp16 1.9 · WebGPU q4f16 1.4–1.8 · WebGPU q8 9 (its quantised ops fall back) ·
 * WASM q8 single-thread 12. fp16 / q4f16 also came out twice as loud (an fp16 overflow in the decoder), so:
 * WebGPU → fp32 (311 MB); no WebGPU, or the player asked to save data → q8 on WASM (88 MB).
 */
export function pickBackend(webGpu: boolean, saveData = false): { device: KokoroDevice; dtype: KokoroDtype } {
  return webGpu && !saveData ? { device: 'webgpu', dtype: 'fp32' } : { device: 'wasm', dtype: 'q8' };
}

/** TypedText pace that lasts as long as the voice: ms per word, leaving room for the breaths at punctuation. */
export function paceFor(text: string, audioMs: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 120;
  const breaths = words.reduce((n, w) => n + (/[.!?:]$/.test(w) ? 380 : /[,;—]$/.test(w) ? 200 : 0), 0);
  return Math.max(60, Math.min(600, Math.round((audioMs - breaths) / words.length)));
}
