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

/** Which outputs to try for a recording, in order (pure; tested). The app's Web Audio context is the path the piano
 *  already sounds through, so where it runs a Normal-speed line plays there first; Slow / Fast prefer the <audio>
 *  element (it keeps the voice's pitch) and fall back to Web Audio. Without a running context <audio> goes first. */
export function playOrder(rate: number, ctxRunning: boolean): ('webaudio' | 'element')[] {
  if (!ctxRunning) return ['element', 'webaudio'];
  return Math.abs(rate - 1) < 0.01 ? ['webaudio', 'element'] : ['element', 'webaudio'];
}

/** Give up on an <audio> element that neither starts nor fails within this long (then the next output is tried). */
export const ELEMENT_START_MS = 4000;

/** The last reason a recording could not play (Diagnostics). */
export let lastVoiceFailure: string | null = null;

/**
 * Browser playback (0.69, owner: no narration at all on an Android phone, while the piano sounds): a line plays
 * through the app's Web Audio context (fetched, decoded, into the master — the same path as the piano, so if the
 * piano is heard the narrator is heard) or through one shared <audio> element (playbackRate with preservesPitch).
 * An output that fails — refused (autoplay / WebView gesture rules), never starts, a missing file — hands over to
 * the next; when both fail the caller reads the line. 0.66–0.68 played the <audio> element only (Web Audio only
 * after a NotAllowedError), and an element that some Android browsers left silent or stuck took the voice away.
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
  // The bytes of the next lines (prefetch) and of lines just played, so a line starts at once (a few, ~30 KB each).
  const bytes = new Map<string, Promise<ArrayBuffer>>();
  const getBytes = (url: string): Promise<ArrayBuffer> => {
    let p = bytes.get(url);
    if (!p) {
      p = fetch(url).then((r) => {
        if (!r.ok) throw new Error(`voice file ${r.status}`); // a manifest entry without a file (0.68): next output / read
        return r.arrayBuffer();
      });
      p.catch(() => bytes.delete(url));
      bytes.set(url, p);
      while (bytes.size > 8) bytes.delete(bytes.keys().next().value!);
    }
    return p;
  };
  let src: AudioBufferSourceNode | null = null;
  const viaWebAudio = async (url: string, rate: number, signal: AbortSignal) => {
    const g = webAudio();
    if (!g) throw new Error('no audio context');
    if (g.ctx.state !== 'running') {
      await Promise.race([g.ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
      if ((g.ctx.state as string) !== 'running') throw new Error('audio locked'); // never wait on a line that can't sound
    }
    const buf = await g.ctx.decodeAudioData((await getBytes(url)).slice(0));
    if (signal.aborted) throw new Cancelled();
    const node = g.ctx.createBufferSource();
    node.buffer = buf;
    node.playbackRate.value = rate; // (pitch moves a little at Slow / Fast on this path only)
    node.connect(g.out);
    src = node;
    await new Promise<void>((res) => {
      const end = () => {
        if (src === node) src = null;
        res();
      };
      node.onended = end;
      signal.addEventListener(
        'abort',
        () => {
          try {
            node.stop();
          } catch {
            /* ended */
          }
          end();
        },
        { once: true },
      );
      node.start();
    });
  };
  const viaElement = async (url: string, rate: number, signal: AbortSignal) => {
    const a = audio();
    a.src = url;
    a.playbackRate = rate;
    a.volume = Math.max(0, Math.min(1, volume()));
    let timer = 0;
    try {
      await Promise.race([a.play(), new Promise((_, rej) => (timer = window.setTimeout(() => rej(new Error('audio never started')), ELEMENT_START_MS)))]);
    } catch (e) {
      a.pause();
      throw e;
    } finally {
      clearTimeout(timer);
    }
    await new Promise<void>((res, rej) => {
      const done = () => {
        a.removeEventListener('ended', done);
        a.removeEventListener('error', fail);
        res();
      };
      const fail = () => {
        a.removeEventListener('ended', done);
        a.removeEventListener('error', fail);
        rej(new Error('audio error'));
      };
      a.addEventListener('ended', done);
      a.addEventListener('error', fail);
      signal.addEventListener(
        'abort',
        () => {
          a.pause();
          done();
        },
        { once: true },
      );
    });
  };
  return {
    base,
    loadManifest: async () => {
      const r = await fetch(`${base}voice/en/manifest.json`);
      return r.ok ? ((await r.json()) as VoiceManifest) : null;
    },
    stop: () => {
      el?.pause();
      try {
        src?.stop();
      } catch {
        /* ended */
      }
      src = null;
    },
    warm: (url) => void getBytes(url).catch(() => {}),
    play: async (url, rate, signal) => {
      let last: unknown = null;
      for (const way of playOrder(rate, webAudio()?.ctx.state === 'running')) {
        if (signal.aborted) throw new Cancelled();
        try {
          return await (way === 'webaudio' ? viaWebAudio(url, rate, signal) : viaElement(url, rate, signal));
        } catch (e) {
          if (signal.aborted || e instanceof Cancelled) throw new Cancelled();
          last = e;
          lastVoiceFailure = `${way}: ${(e as Error)?.name ?? ''} ${(e as Error)?.message ?? String(e)}`.trim();
        }
      }
      throw last ?? new Error('no audio');
    },
  };
}
