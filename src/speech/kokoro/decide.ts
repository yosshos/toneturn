// Pure decisions for the Kokoro narrator (0.65): when to load it, how to run it, when to give up for the session.

/** Kokoro-82M v1.0 (ONNX, onnx-community). q8 ≈ 92 MB: the best quality per megabyte (fp32 326 MB, fp16 163 MB). */
export const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const KOKORO_DTYPE = 'q8' as const;
export const KOKORO_MB = 92;
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
  device?: 'webgpu' | 'wasm';
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
 * How to run it. WASM + q8 everywhere: the q8 graph is the small download, and on WebGPU it runs poorly (its
 * quantised ops fall back to the CPU, and onnxruntime-web's WebGPU path is only reliable for Kokoro in fp32 —
 * a 326 MB download). WebGPU is used only when the larger fp32 file is explicitly allowed.
 */
export function pickBackend(hasWebGpu: boolean, allowFp32 = false): { device: 'webgpu' | 'wasm'; dtype: 'q8' | 'fp32' } {
  return hasWebGpu && allowFp32 ? { device: 'webgpu', dtype: 'fp32' } : { device: 'wasm', dtype: KOKORO_DTYPE };
}

/** TypedText pace that lasts as long as the voice: ms per word, leaving room for the breaths at punctuation. */
export function paceFor(text: string, audioMs: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 120;
  const breaths = words.reduce((n, w) => n + (/[.!?:]$/.test(w) ? 380 : /[,;—]$/.test(w) ? 200 : 0), 0);
  return Math.max(60, Math.min(600, Math.round((audioMs - breaths) / words.length)));
}
