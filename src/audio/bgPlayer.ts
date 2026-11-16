// The background player (SPEC-PHRASE-STUDIO §6.5): one plain media element for playlists, controlled from the lock
// screen, headphones and the notification through the Media Session API (title, "The 7th Sense", the playlist,
// artwork = the take's mini roll; play / pause / next / previous / seek). Repeat one / all / A–B (an A–B span is a
// bounced clip played with loop = true). Speed with playbackRate + preservesPitch.
//
// What the platforms allow (written into the UI briefly):
//  · iPhone / iPad: audio keeps playing with the screen locked only in the installed app (Add to Home Screen) or a
//    Safari tab that started playback with a tap; the Web Audio graph (the app's instruments) stops in the
//    background, which is why MIDI takes are rendered to audio first. Media Session controls work from iOS 15.
//  · Android Chrome (tab or installed): background playback and the full Media Session controls.
//  · Desktop: everything; media keys work through Media Session.

export interface BgItem {
  takeId: string;
  title: string;
  /** Playlist name (the "album" line) */
  album: string;
  /** A playable file (resolved lazily: rendering a MIDI take takes a moment) */
  source: () => Promise<Blob | null>;
  /** true: an A–B clip (loops gaplessly on the element) */
  clip?: boolean;
  /** Notes for the artwork's mini roll (pitch, onset ms) */
  roll?: { pitch: number; on: number }[];
}
export type BgLoop = 'off' | 'one' | 'all' | 'ab';
export interface BgState {
  items: BgItem[];
  index: number;
  playing: boolean;
  loading: boolean;
  loop: BgLoop;
  speed: number;
  pos: number;
  dur: number;
  error: string | null;
}

/** The lock-screen metadata of an item (pure). */
export function mediaMetadataOf(it: Pick<BgItem, 'title' | 'album' | 'clip'>, lang: 'en' | 'he', artwork?: string): { title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[] } {
  return {
    title: it.clip ? `${it.title} · A–B` : it.title,
    artist: 'The 7th Sense',
    album: it.album || (lang === 'he' ? 'ההקלטות שלי' : 'My recordings'),
    artwork: artwork ? [{ src: artwork, sizes: '256x256', type: 'image/png' }] : [],
  };
}
/** Next index (null = stop). */
export function bgNext(i: number, n: number, loop: BgLoop, dir: 1 | -1): number | null {
  if (n <= 0) return null;
  const j = i + dir;
  if (j >= 0 && j < n) return j;
  return loop === 'all' ? (j + n) % n : null;
}

/** Artwork: a flat, high-contrast square — ink notes on paper (the take's mini roll). */
export function artworkOf(roll: { pitch: number; on: number }[] | undefined): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    if (!g) return undefined;
    g.fillStyle = '#fbf7ff';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#1e1033';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 248, 248);
    const ns = (roll ?? []).slice(0, 80);
    if (ns.length) {
      const lo = Math.min(...ns.map((n) => n.pitch)) - 2;
      const hi = Math.max(...ns.map((n) => n.pitch)) + 2;
      const t0 = ns[0].on;
      const t1 = Math.max(t0 + 1, ns[ns.length - 1].on);
      g.fillStyle = '#6d28d9';
      g.strokeStyle = '#1e1033';
      g.lineWidth = 3;
      for (const n of ns) {
        const x = 28 + ((n.on - t0) / (t1 - t0)) * 190;
        const y = 228 - ((n.pitch - lo) / Math.max(1, hi - lo)) * 196;
        g.beginPath();
        g.roundRect?.(x, y - 7, 18, 14, 5);
        if (!g.roundRect) g.rect(x, y - 7, 18, 14);
        g.fill();
        g.stroke();
      }
    } else {
      g.fillStyle = '#1e1033';
      g.font = 'bold 120px serif';
      g.textAlign = 'center';
      g.fillText('7', 128, 170);
    }
    return c.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

type MS = MediaSession & { setPositionState?: (s: { duration: number; position: number; playbackRate: number }) => void };
const ms = (): MS | null => (typeof navigator !== 'undefined' && 'mediaSession' in navigator ? (navigator.mediaSession as MS) : null);

class BackgroundPlayer {
  private el: HTMLAudioElement | null = null;
  private url: string | null = null;
  private listeners = new Set<() => void>();
  lang: 'en' | 'he' = 'he';
  /** The last metadata handed to Media Session (tests and the UI read it). */
  lastMeta: ReturnType<typeof mediaMetadataOf> | null = null;
  state: BgState = { items: [], index: 0, playing: false, loading: false, loop: 'all', speed: 100, pos: 0, dur: 0, error: null };

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
  private set(p: Partial<BgState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((f) => f());
  }
  private element(): HTMLAudioElement {
    if (this.el) return this.el;
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.dataset.bgPlayer = '1';
    el.style.display = 'none';
    document.body.appendChild(el);
    el.addEventListener('timeupdate', () => {
      this.set({ pos: el.currentTime, dur: Number.isFinite(el.duration) ? el.duration : this.state.dur });
      this.position();
    });
    el.addEventListener('play', () => this.set({ playing: true }));
    el.addEventListener('pause', () => this.set({ playing: false }));
    el.addEventListener('ended', () => {
      const { index, items, loop } = this.state;
      const n = loop === 'one' ? index : bgNext(index, items.length, loop, 1);
      if (n === null) this.set({ playing: false, pos: 0 });
      else void this.go(n);
    });
    this.el = el;
    this.handlers();
    return el;
  }
  private handlers() {
    const m = ms();
    if (!m) return;
    const on = (a: MediaSessionAction, f: MediaSessionActionHandler | null) => {
      try {
        m.setActionHandler(a, f);
      } catch {
        /* not offered on this browser */
      }
    };
    on('play', () => void this.resume());
    on('pause', () => this.pause());
    on('nexttrack', () => void this.step(1));
    on('previoustrack', () => void this.step(-1));
    on('seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime));
    on('seekbackward', (d) => this.seek(this.state.pos - (d.seekOffset ?? 5)));
    on('seekforward', (d) => this.seek(this.state.pos + (d.seekOffset ?? 5)));
  }
  private position() {
    const m = ms();
    const el = this.el;
    if (!m?.setPositionState || !el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    try {
      m.setPositionState({ duration: el.duration, position: Math.min(el.currentTime, el.duration), playbackRate: el.playbackRate || 1 });
    } catch {
      /* ignore */
    }
  }
  private meta(it: BgItem) {
    const md = mediaMetadataOf(it, this.lang, artworkOf(it.roll));
    this.lastMeta = md;
    const m = ms();
    if (m && typeof MediaMetadata !== 'undefined') {
      try {
        m.metadata = new MediaMetadata(md);
      } catch {
        /* ignore */
      }
    }
  }
  /** Play a queue from `index` (call from a tap: iOS starts media only from a gesture). */
  async playQueue(items: BgItem[], index = 0, o: { loop?: BgLoop; speed?: number } = {}) {
    this.set({ items, loop: o.loop ?? this.state.loop, speed: o.speed ?? this.state.speed });
    const el = this.element();
    // unlock the element inside the gesture, before the (possibly slow) render
    try {
      el.muted = true;
      void el.play().catch(() => {});
      el.pause();
      el.muted = false;
    } catch {
      /* ignore */
    }
    await this.go(index);
  }
  async go(i: number): Promise<void> {
    const it = this.state.items[i];
    if (!it) return;
    const el = this.element();
    this.set({ index: i, loading: true, error: null, pos: 0 });
    this.meta(it);
    const blob = await it.source().catch(() => null);
    if (this.state.items[i] !== it) return;
    if (!blob) {
      this.set({ loading: false, error: 'source' });
      const n = bgNext(i, this.state.items.length, this.state.loop === 'all' ? 'all' : 'off', 1);
      if (n !== null && n !== i) return this.go(n);
      return;
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    el.src = this.url;
    el.loop = this.state.loop === 'one' || (this.state.loop === 'ab' && !!it.clip);
    el.playbackRate = this.state.speed / 100;
    (el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    this.set({ loading: false });
    try {
      await el.play();
      const m = ms();
      if (m) m.playbackState = 'playing';
    } catch {
      this.set({ playing: false, error: 'blocked' });
    }
  }
  async resume(): Promise<void> {
    if (!this.el?.src) return this.go(this.state.index);
    try {
      await this.el.play();
      const m = ms();
      if (m) m.playbackState = 'playing';
    } catch {
      /* blocked */
    }
  }
  pause() {
    this.el?.pause();
    const m = ms();
    if (m) m.playbackState = 'paused';
  }
  toggle() {
    if (this.state.playing) this.pause();
    else void this.resume();
  }
  async step(dir: 1 | -1): Promise<void> {
    // previous within the first 3 s restarts the item
    if (dir === -1 && this.state.pos > 3 && this.el) return this.seek(0);
    const n = bgNext(this.state.index, this.state.items.length, this.state.loop === 'one' || this.state.loop === 'ab' ? 'all' : this.state.loop, dir);
    if (n !== null) await this.go(n);
  }
  seek(t: number) {
    if (!this.el) return;
    try {
      this.el.currentTime = Math.max(0, Math.min(Number.isFinite(this.el.duration) ? this.el.duration : t, t));
    } catch {
      /* not seekable yet */
    }
    this.position();
  }
  setLoop(loop: BgLoop) {
    this.set({ loop });
    if (this.el) this.el.loop = loop === 'one' || (loop === 'ab' && !!this.state.items[this.state.index]?.clip);
  }
  setSpeed(speed: number) {
    this.set({ speed });
    if (this.el) this.el.playbackRate = speed / 100;
  }
  stop() {
    this.el?.pause();
    if (this.el) this.el.removeAttribute('src');
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.set({ items: [], index: 0, playing: false, pos: 0, dur: 0 });
    const m = ms();
    if (m) {
      m.metadata = null;
      m.playbackState = 'none';
    }
  }
}

export const bgPlayer = new BackgroundPlayer();
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __bgPlayer?: BackgroundPlayer }).__bgPlayer = bgPlayer;

/** Installed to the Home Screen (iOS: the way to keep listening with the screen locked). */
export const installedApp = () => {
  try {
    return (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true) || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  } catch {
    return false;
  }
};
export const isIOSDevice = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
