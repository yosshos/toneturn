// Plays pre-rendered narrator lines (0.66). The manifest loads once (small, runtime-cached by the service worker);
// each line's MP3 is fetched only when it's spoken or about to be (prefetch), never precached.

import { Cancelled } from '../../game/adapters';
import { lookup, voiceUrl, type VoiceManifest } from './manifest';

export interface FilesDeps {
  /** Fetch public/voice/en/manifest.json (null when missing / offline). */
  loadManifest: () => Promise<VoiceManifest | null>;
  /** Play a file at a speed (pitch kept); resolves when it ends; rejects on failure. Abort stops it. */
  play: (url: string, rate: number, signal: AbortSignal) => Promise<void>;
  /** Warm the cache for a file. */
  warm: (url: string) => void;
  /** Stop whatever is playing. */
  stop: () => void;
  base: string;
}

export class VoiceFiles {
  private manifest: VoiceManifest | null = null;
  private loading: Promise<VoiceManifest | null> | null = null;
  private listeners = new Set<() => void>();
  private lineListeners = new Set<(l: { text: string; ms: number }) => void>();
  constructor(private deps: FilesDeps) {}

  /** Load the manifest (once); resolves with whether it's there. */
  load(): Promise<boolean> {
    this.loading ??= this.deps
      .loadManifest()
      .catch(() => null)
      .then((m) => {
        this.manifest = m;
        if (!m) this.loading = null; // try again later (offline now)
        this.listeners.forEach((l) => l());
        return m;
      });
    return this.loading.then((m) => !!m);
  }
  get loaded(): boolean {
    return !!this.manifest;
  }
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
  onLine(cb: (l: { text: string; ms: number }) => void): () => void {
    this.lineListeners.add(cb);
    return () => void this.lineListeners.delete(cb);
  }

  /** Is there a recording of this line? (false until the manifest has loaded) */
  has(raw: string): boolean {
    return !!lookup(this.manifest, raw);
  }

  prefetch(raws: string[]) {
    for (const r of raws) {
      const hit = lookup(this.manifest, r);
      if (hit) this.deps.warm(voiceUrl(this.deps.base, hit.id));
    }
  }

  stop() {
    this.deps.stop();
  }

  /** Play the recording of a line. False when there is none (the caller falls back); throws Cancelled on abort. */
  async speak(raw: string, rate: number, signal: AbortSignal, shownText = raw): Promise<boolean> {
    if (signal.aborted) throw new Cancelled();
    const hit = lookup(this.manifest, raw);
    if (!hit) return false;
    this.lineListeners.forEach((l) => l({ text: shownText, ms: hit.ms / rate }));
    try {
      await this.deps.play(voiceUrl(this.deps.base, hit.id), rate, signal);
    } catch (e) {
      if (signal.aborted || e instanceof Cancelled) throw new Cancelled();
      return false;
    }
    if (signal.aborted) throw new Cancelled();
    return true;
  }
}

/**
 * Browser playback: one shared <audio> element (playbackRate with preservesPitch, so Slow / Fast keep the voice's
 * pitch); if the browser refuses to play it (autoplay rules), the file is decoded and played through Web Audio.
 */
export function browserFilesDeps(base: string, webAudio: () => { ctx: AudioContext; out: AudioNode } | null, volume: () => number): FilesDeps {
  let el: HTMLAudioElement | null = null;
  const audio = () => {
    if (!el) {
      el = new Audio();
      el.preload = 'auto';
      (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
    return el;
  };
  const viaWebAudio = async (url: string, rate: number, signal: AbortSignal) => {
    const g = webAudio();
    if (!g) throw new Error('no audio');
    if (g.ctx.state !== 'running') {
      await Promise.race([g.ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
      if (g.ctx.state !== 'running') throw new Error('audio locked'); // never wait on a line that can't sound
    }
    const buf = await g.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    if (signal.aborted) throw new Cancelled();
    const src = g.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate; // (pitch moves a little at Slow / Fast on this path only)
    src.connect(g.out);
    await new Promise<void>((res) => {
      src.onended = () => res();
      signal.addEventListener('abort', () => {
        try {
          src.stop();
        } catch {
          /* ended */
        }
        res();
      }, { once: true });
      src.start();
    });
  };
  return {
    base,
    loadManifest: async () => {
      const r = await fetch(`${base}voice/en/manifest.json`);
      return r.ok ? ((await r.json()) as VoiceManifest) : null;
    },
    stop: () => el?.pause(),
    warm: (url) => void fetch(url, { priority: 'low' } as RequestInit).catch(() => {}),
    play: async (url, rate, signal) => {
      const a = audio();
      a.src = url;
      a.playbackRate = rate;
      a.volume = Math.max(0, Math.min(1, volume()));
      try {
        await a.play();
      } catch (e) {
        if ((e as Error)?.name === 'NotAllowedError') return viaWebAudio(url, rate, signal);
        throw e;
      }
      await new Promise<void>((res, rej) => {
        const done = () => {
          a.removeEventListener('ended', done);
          a.removeEventListener('error', fail);
          res();
        };
        const fail = () => {
          a.removeEventListener('ended', done);
          rej(new Error('audio error'));
        };
        a.addEventListener('ended', done);
        a.addEventListener('error', fail);
        signal.addEventListener('abort', () => {
          a.pause();
          done();
        }, { once: true });
      });
    },
  };
}
