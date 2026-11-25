// The Kokoro narrator on the main thread (0.65, owner: a free, high-quality English voice; lines keep changing,
// so nothing is pre-recorded). Loads lazily in a worker the first time an English line is wanted, caches every
// generated line on the device (LRU, 50 MB), generates the next lines while the current one plays, and falls back
// to the reading mode for the session when it can't load.
//
// Speed (SPEC-KEY-SESSION-2 §6, 2026-11-25): a slow line never switches the voice off. Every generation is timed; while
// the rolling real-time factor of the recent lines is above SLOW_FACTOR, a line that isn't made yet is read (the caller
// reads on Error('slow')), one line at a time is still generated in the background as a probe (spaced out, longer
// while it stays slow), and when the recent lines are fast again the voice speaks them. Lines already made still play.

import { Cancelled } from '../../game/adapters';
import { ClipCache, fromPcm16, idbClipStore, memoryClipStore, toPcm16, type Clip } from './cache';
import { clipKey, normText } from './hash';
import { KOKORO_MB, KOKORO_MODEL, KOKORO_VOICE, pickBackend, SLOW_FACTOR, type KokoroDevice, type KokoroDtype, type KokoroStatus } from './decide';
import type { FromWorker, ToWorker } from './protocol';

/** How many recent generations the rolling real-time factor averages. */
export const RTF_WINDOW = 3;
/** While slow: the first background probe waits this long after the last one, doubling up to PROBE_MAX_MS. */
export const PROBE_GAP_MS = 10_000;
export const PROBE_MAX_MS = 120_000;

export interface WorkerLike {
  postMessage(m: ToWorker): void;
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null;
  onerror: ((e: unknown) => void) | null;
  terminate(): void;
}
export interface PlayOut {
  /** Play mono PCM; resolves when it ends; the returned stop() ends it early. */
  play(pcm: Float32Array, sr: number): { done: Promise<void>; stop(): void };
}

export interface KokoroDeps {
  makeWorker: () => WorkerLike;
  cache: ClipCache;
  out: () => PlayOut | null;
  /** A usable WebGPU adapter (not just navigator.gpu). */
  hasWebGpu: () => Promise<boolean>;
  /** The player asked the browser to save data (Data Saver): take the small graph. */
  saveData: () => boolean;
  online: () => boolean;
}

type Pending = { id: number; key: string; resolve: (c: Clip) => void; reject: (e: Error) => void; urgent: boolean };

export class KokoroNarrator {
  voice = KOKORO_VOICE;
  speed = 1;
  private status: KokoroStatus = { state: 'off', pct: 0 };
  private listeners = new Set<(s: KokoroStatus) => void>();
  private worker: WorkerLike | null = null;
  private ready: Promise<boolean> | null = null;
  private readyResolve: ((ok: boolean) => void) | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  /** Real-time factors (generation time / audio time) of the recent generations, newest last. */
  private rtfs: number[] = [];
  /** Lines generated (or found in the device cache) this session: they play even while the voice is slow. */
  private made = new Set<string>();
  private probing = false;
  private nextProbeAt = 0;
  private probeGap = PROBE_GAP_MS;
  private backend: { device: KokoroDevice; dtype: KokoroDtype } | null = null;
  /** In-flight or finished lines this session, by cache key. */
  private lines = new Map<string, Promise<Clip>>();
  private playing: { stop(): void } | null = null;
  private lineListeners = new Set<(l: { text: string; ms: number }) => void>();

  constructor(
    private deps: KokoroDeps,
    private now: () => number = () => Date.now(),
  ) {}

  /** The rolling real-time factor of the recent generations (undefined before the first). */
  get rollingRtf(): number | undefined {
    if (!this.rtfs.length) return undefined;
    return this.rtfs.reduce((a, x) => a + x, 0) / this.rtfs.length;
  }
  /** Recent lines were made slower than SLOW_FACTOR × real time: a line not made yet is read for now. */
  get slow(): boolean {
    const r = this.rollingRtf;
    return r !== undefined && r > SLOW_FACTOR;
  }
  private measure(genMs: number, audioMs: number) {
    const rtf = audioMs > 0 ? genMs / audioMs : Infinity;
    this.rtfs.push(Number.isFinite(rtf) ? rtf : 10);
    if (this.rtfs.length > RTF_WINDOW) this.rtfs.shift();
    if (!this.slow) this.probeGap = PROBE_GAP_MS;
    this.set({ rtf: this.rollingRtf });
  }

  get state(): KokoroStatus {
    return this.status;
  }
  onStatus(cb: (s: KokoroStatus) => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
  /** A line starts playing; `ms` is its length (TypedText keeps pace with it). */
  onLine(cb: (l: { text: string; ms: number }) => void): () => void {
    this.lineListeners.add(cb);
    return () => void this.lineListeners.delete(cb);
  }
  private set(s: Partial<KokoroStatus>) {
    this.status = { ...this.status, ...s };
    this.listeners.forEach((l) => l(this.status));
  }

  /** Ready to speak right now (no waiting for a download). */
  get isReady(): boolean {
    return this.status.state === 'ready';
  }

  /**
   * Worth loading here? Only with a usable WebGPU adapter and no Data Saver (0.66): on the CPU (WASM) it runs
   * several times slower than real time on phones, and the pre-recorded lines already cover the lessons.
   */
  async worthLoading(): Promise<boolean> {
    if (this.deps.saveData()) return false;
    return this.deps.hasWebGpu().catch(() => false);
  }

  /** Start loading (once). Resolves true when the voice can speak, false when it fell back to reading. */
  ensure(): Promise<boolean> {
    if (this.ready) return this.ready;
    this.ready = new Promise<boolean>((res) => (this.readyResolve = res));
    this.set({ state: 'downloading', pct: 0, why: undefined });
    void (async () => {
      const gpu = await this.deps.hasWebGpu().catch(() => false);
      this.start(pickBackend(gpu, this.deps.saveData()));
    })();
    return this.ready;
  }

  private start(be: { device: KokoroDevice; dtype: KokoroDtype }) {
    try {
      const w = this.deps.makeWorker();
      this.worker = w;
      this.backend = be;
      w.onmessage = (e) => this.onMessage(e.data);
      w.onerror = () => this.loadFailed();
      this.set({ state: 'downloading', pct: 0, device: be.device, mb: KOKORO_MB[be.dtype] });
      w.postMessage({ type: 'load', model: KOKORO_MODEL, dtype: be.dtype, device: be.device, voice: this.voice });
    } catch {
      this.fail('unsupported');
    }
  }

  /** WebGPU can fail to start on some GPUs / drivers: try once more on the CPU (WASM, q8) before giving up. */
  private loadFailed() {
    if (this.backend?.device === 'webgpu' && this.status.state === 'downloading' && this.deps.online()) {
      try {
        this.worker?.terminate();
      } catch {
        /* ignore */
      }
      return this.start({ device: 'wasm', dtype: 'q8' });
    }
    this.fail(this.deps.online() ? 'error' : 'offline');
  }

  private fail(why: NonNullable<KokoroStatus['why']>) {
    this.set({ state: 'unavailable', why });
    this.readyResolve?.(false);
    for (const p of this.pending.values()) p.reject(new Error('unavailable'));
    this.pending.clear();
    this.lines.clear();
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
  }

  private onMessage(m: FromWorker) {
    if (m.type === 'progress') {
      if (this.status.state === 'downloading') this.set({ pct: m.pct });
    } else if (m.type === 'ready') {
      // the calibration sentence is the first measurement; a slow one only means the next lines are read until the
      // voice proves fast (never off for the session)
      this.measure(m.genMs, m.audioMs);
      this.set({ state: 'ready', pct: 100 });
      this.readyResolve?.(true);
    } else if (m.type === 'error') {
      this.loadFailed();
    } else if (m.type === 'audio') {
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      // every line is timed: a slow one still plays, and the rolling factor decides the next lines
      this.measure(m.genMs, (1000 * m.pcm.length) / m.sr);
      p.resolve({ pcm: toPcm16(m.pcm), sr: m.sr });
    } else if (m.type === 'failed') {
      const p = this.pending.get(m.id);
      this.pending.delete(m.id);
      p?.reject(new Error(m.message));
    }
  }

  private key(text: string) {
    return clipKey(this.voice, this.speed, text);
  }

  /** The audio for a line: this session's copy, the device cache, or a fresh generation. */
  private clip(text: string, urgent: boolean): Promise<Clip> {
    const key = this.key(text);
    const have = this.lines.get(key);
    if (have) {
      if (urgent) this.bump(key);
      return have;
    }
    const p = (async () => {
      const cached = await this.deps.cache.get(key);
      if (cached) return cached;
      if (!(await this.ensure()) || !this.worker) throw new Error('unavailable');
      const clip = await new Promise<Clip>((resolve, reject) => {
        const id = this.nextId++;
        this.pending.set(id, { id, key, resolve, reject, urgent });
        this.worker!.postMessage({ type: 'gen', id, text: normText(text), voice: this.voice, speed: this.speed, urgent });
      });
      void this.deps.cache.put(key, clip);
      return clip;
    })();
    this.lines.set(key, p);
    p.then(
      () => void this.made.add(key),
      () => this.lines.delete(key),
    );
    return p;
  }

  /** Is this line made already (this session or in the device cache)? */
  private async isMade(key: string): Promise<boolean> {
    if (this.made.has(key)) return true;
    const c = await this.deps.cache.get(key);
    if (!c) return false;
    this.made.add(key);
    return true;
  }

  /** While slow: make one line in the background now and then, to learn when the voice is fast again. */
  private probe(text: string) {
    if (this.probing || this.now() < this.nextProbeAt || this.status.state !== 'ready') return;
    this.probing = true;
    this.clip(text, false)
      .catch(() => {})
      .finally(() => {
        this.probing = false;
        this.nextProbeAt = this.now() + this.probeGap;
        if (this.slow) this.probeGap = Math.min(PROBE_MAX_MS, this.probeGap * 2);
      });
  }

  /** A prefetched line that is now wanted moves to the front of the worker's queue. */
  private bump(key: string) {
    for (const p of this.pending.values())
      if (p.key === key && !p.urgent) {
        p.urgent = true;
        this.worker?.postMessage({ type: 'urgent', id: p.id });
      }
  }

  /** Generate lines ahead (the next steps of a mini-lesson, the lesson intro) while the current one plays. */
  prefetch(texts: string[]) {
    if (this.status.state === 'unavailable') return;
    const want = texts.filter((t) => t.trim());
    // slow right now: no queue of lines that would be read anyway, only the occasional probe
    if (this.slow) {
      if (want.length) this.probe(want[0]);
      return;
    }
    for (const t of want) this.clip(t, false).catch(() => {});
  }

  /** Is this line ready to play without waiting? */
  async has(text: string): Promise<boolean> {
    const key = this.key(text);
    return (await this.deps.cache.get(key)) !== null;
  }

  /**
   * Speak a line (already cleaned by speakable()). Rejects with Cancelled on abort, with Error('unavailable')
   * when the voice can't be used, with Error('slow') when recent lines were made too slowly and this one isn't made
   * yet — the caller then reads this line instead. `shownText` is what's on screen (for the pace).
   */
  async speak(text: string, signal: AbortSignal, shownText = text): Promise<void> {
    if (signal.aborted) throw new Cancelled();
    if (this.slow && this.status.state === 'ready' && !(await this.isMade(this.key(text)))) {
      this.probe(text);
      throw new Error('slow');
    }
    if (signal.aborted) throw new Cancelled();
    const clip = await abortable(this.clip(text, true), signal);
    const out = this.deps.out();
    if (!out) throw new Error('unavailable');
    this.stop();
    const pcm = fromPcm16(clip.pcm);
    const ms = (1000 * pcm.length) / clip.sr;
    this.lineListeners.forEach((l) => l({ text: shownText, ms }));
    const h = out.play(pcm, clip.sr);
    this.playing = h;
    const onAbort = () => h.stop();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      await h.done;
    } finally {
      signal.removeEventListener('abort', onAbort);
      if (this.playing === h) this.playing = null;
    }
    if (signal.aborted) throw new Cancelled();
  }

  stop() {
    this.playing?.stop();
    this.playing = null;
  }
}

function abortable<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((res, rej) => {
    const onAbort = () => rej(new Cancelled());
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) rej(new Cancelled());
        else res(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        rej(signal.aborted ? new Cancelled() : e);
      },
    );
  });
}

/** Web Audio playback through the app's audio context (dry into the master), else a standalone context. */
export function webAudioOut(get: () => { ctx: AudioContext; out: AudioNode } | null): () => PlayOut | null {
  let own: AudioContext | null = null;
  return () => {
    let g = get();
    if (!g) {
      if (typeof window === 'undefined' || !window.AudioContext) return null;
      own ??= new AudioContext();
      g = { ctx: own, out: own.destination };
    }
    const { ctx, out } = g;
    return {
      play(pcm, sr) {
        if (ctx.state === 'suspended') void ctx.resume();
        const buf = ctx.createBuffer(1, pcm.length, sr);
        buf.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 1.15;
        src.connect(gain).connect(out);
        let end!: () => void;
        const done = new Promise<void>((r) => (end = r));
        src.onended = () => end();
        src.start();
        return {
          done,
          stop() {
            try {
              gain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
              src.stop(ctx.currentTime + 0.06);
            } catch {
              end();
            }
          },
        };
      },
    };
  };
}

/** The real dependencies in a browser. */
export function browserKokoroDeps(voiceOut: () => { ctx: AudioContext; out: AudioNode } | null): KokoroDeps {
  const idb = typeof indexedDB !== 'undefined';
  return {
    makeWorker: () => new Worker(new URL('./kokoroWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
    cache: new ClipCache(idb ? idbClipStore() : memoryClipStore()),
    out: webAudioOut(voiceOut),
    hasWebGpu: async () => {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    },
    saveData: () => !!(navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData,
    online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  };
}
