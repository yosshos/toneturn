// Messages between the app and the Kokoro worker.

export type ToWorker =
  | { type: 'load'; model: string; dtype: 'q8' | 'fp32'; device: 'wasm' | 'webgpu'; voice: string }
  | { type: 'gen'; id: number; text: string; voice: string; speed: number; urgent: boolean }
  | { type: 'urgent'; id: number }
  | { type: 'cancel'; id: number };

export type FromWorker =
  | { type: 'progress'; pct: number }
  | { type: 'ready'; genMs: number; audioMs: number }
  | { type: 'error'; message: string }
  | { type: 'audio'; id: number; pcm: Float32Array; sr: number; genMs: number }
  | { type: 'failed'; id: number; message: string };
