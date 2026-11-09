/// <reference lib="webworker" />
// The Kokoro narrator runs here, off the main thread, so lessons never stutter while a line is made (0.65).
// Model files come from Hugging Face and are kept by transformers.js in the Cache API ('transformers-cache');
// the voice style vectors in 'kokoro-voices'. Both are cross-origin, so the app's service worker never touches them.

import { env, KokoroTTS } from 'kokoro-js';
// onnxruntime's WASM binary (≈21 MB) is served from our own origin, not a CDN: the service worker keeps it in the
// voice cache across app versions (the package doesn't export the file, hence the relative path).
import ortWasm from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url';
import type { FromWorker, ToWorker } from './protocol';

try {
  env.wasmPaths = { wasm: new URL(ortWasm, self.location.href).href };
} catch {
  /* tests: no location */
}

type Tts = {
  generate(text: string, o: { voice: string; speed: number }): Promise<{ audio: Float32Array; sampling_rate: number }>;
};

const post = (m: FromWorker, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m, transfer);

let tts: Tts | null = null;
const queue: Extract<ToWorker, { type: 'gen' }>[] = [];
let busy = false;

async function load(m: Extract<ToWorker, { type: 'load' }>) {
  try {
    const files = new Map<string, { loaded: number; total: number }>();
    let lastPct = -1;
    const model = await KokoroTTS.from_pretrained(m.model, {
      dtype: m.dtype,
      device: m.device,
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status !== 'progress' || !p.file || !p.total) return;
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
        let a = 0;
        let b = 0;
        for (const f of files.values()) {
          a += f.loaded;
          b += f.total;
        }
        const pct = Math.floor((100 * a) / b);
        if (pct !== lastPct) post({ type: 'progress', pct: (lastPct = pct) });
      },
    });
    tts = model as unknown as Tts;
    // Calibrate on a typical sentence (the first run also warms the graph up, so time a second one).
    await tts.generate('Hello.', { voice: m.voice, speed: 1 });
    const t0 = performance.now();
    const a = await tts.generate('Listen to the chord, then tell me how it feels.', { voice: m.voice, speed: 1 });
    const genMs = performance.now() - t0;
    post({ type: 'ready', genMs, audioMs: (1000 * a.audio.length) / a.sampling_rate });
  } catch (e) {
    post({ type: 'error', message: String((e as Error)?.message ?? e) });
  }
}

async function pump() {
  if (busy || !tts) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift()!;
    try {
      const t0 = performance.now();
      const a = await tts.generate(job.text, { voice: job.voice, speed: job.speed });
      const pcm = a.audio instanceof Float32Array ? a.audio : Float32Array.from(a.audio);
      post({ type: 'audio', id: job.id, pcm, sr: a.sampling_rate, genMs: performance.now() - t0 }, [pcm.buffer]);
    } catch (e) {
      post({ type: 'failed', id: job.id, message: String((e as Error)?.message ?? e) });
    }
  }
  busy = false;
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === 'load') void load(m);
  else if (m.type === 'gen') {
    // A line wanted now goes before the prefetched ones.
    if (m.urgent) queue.unshift(m);
    else queue.push(m);
    void pump();
  } else if (m.type === 'cancel') {
    const i = queue.findIndex((j) => j.id === m.id);
    if (i >= 0) queue.splice(i, 1);
  } else if (m.type === 'urgent') {
    const i = queue.findIndex((j) => j.id === m.id);
    if (i > 0) queue.unshift(...queue.splice(i, 1));
  }
};
