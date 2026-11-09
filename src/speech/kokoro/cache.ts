// Generated narrator lines, kept on the device so each line is generated once (0.65, Kokoro).
// An LRU over a small key-value store: IndexedDB in the browser, a Map in tests. Audio is kept as 16-bit PCM
// (half the size of float, no audible loss for speech): 50 MB ≈ 17 minutes of speech at 24 kHz.

export interface Clip {
  /** Mono 16-bit samples. */
  pcm: Int16Array;
  sr: number;
}
export interface ClipMeta {
  key: string;
  bytes: number;
  /** Last time it was played or made (ms). */
  used: number;
}
export interface ClipStore {
  get(key: string): Promise<Clip | null>;
  put(key: string, clip: Clip, meta: ClipMeta): Promise<void>;
  touch(meta: ClipMeta): Promise<void>;
  delete(key: string): Promise<void>;
  metas(): Promise<ClipMeta[]>;
}

export const CACHE_CAP_BYTES = 50 * 1024 * 1024;

export function toPcm16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
export function fromPcm16(p: Int16Array): Float32Array {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) out[i] = p[i] / (p[i] < 0 ? 0x8000 : 0x7fff);
  return out;
}

export class ClipCache {
  private index: Map<string, ClipMeta> | null = null;
  private loading: Promise<Map<string, ClipMeta>> | null = null;
  constructor(
    private store: ClipStore,
    readonly cap = CACHE_CAP_BYTES,
    private now: () => number = () => Date.now(),
  ) {}

  private async idx(): Promise<Map<string, ClipMeta>> {
    if (this.index) return this.index;
    this.loading ??= this.store
      .metas()
      .catch(() => [] as ClipMeta[])
      .then((ms) => (this.index = new Map(ms.map((m) => [m.key, m]))));
    return this.loading;
  }

  async bytes(): Promise<number> {
    let n = 0;
    for (const m of (await this.idx()).values()) n += m.bytes;
    return n;
  }

  async get(key: string): Promise<Clip | null> {
    const idx = await this.idx();
    if (!idx.has(key)) return null;
    const clip = await this.store.get(key).catch(() => null);
    if (!clip) {
      idx.delete(key);
      return null;
    }
    const m = { ...idx.get(key)!, used: this.now() };
    idx.set(key, m);
    void this.store.touch(m).catch(() => {});
    return clip;
  }

  async put(key: string, clip: Clip): Promise<void> {
    const idx = await this.idx();
    const bytes = clip.pcm.byteLength;
    if (bytes > this.cap) return;
    const m: ClipMeta = { key, bytes, used: this.now() };
    idx.set(key, m);
    // Evict the least recently used lines until the new one fits.
    let total = 0;
    for (const x of idx.values()) total += x.bytes;
    if (total > this.cap) {
      const old = [...idx.values()].filter((x) => x.key !== key).sort((a, b) => a.used - b.used);
      for (const x of old) {
        if (total <= this.cap) break;
        idx.delete(x.key);
        total -= x.bytes;
        await this.store.delete(x.key).catch(() => {});
      }
    }
    await this.store.put(key, clip, m).catch(() => {});
  }
}

/** In-memory store (tests; and the fallback when IndexedDB isn't available, e.g. private mode). */
export function memoryClipStore(): ClipStore & { clips: Map<string, Clip> } {
  const clips = new Map<string, Clip>();
  const meta = new Map<string, ClipMeta>();
  return {
    clips,
    get: async (k) => clips.get(k) ?? null,
    put: async (k, c, m) => {
      clips.set(k, c);
      meta.set(k, m);
    },
    touch: async (m) => void meta.set(m.key, m),
    delete: async (k) => {
      clips.delete(k);
      meta.delete(k);
    },
    metas: async () => [...meta.values()],
  };
}

/** IndexedDB store: 'clips' holds the audio, 'meta' the small LRU index (read once per session). */
export function idbClipStore(name = 'toneturn-voice'): ClipStore {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () =>
    (dbp ??= new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('clips');
        r.result.createObjectStore('meta', { keyPath: 'key' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const tx = async <T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> => {
    const d = await db();
    return new Promise<T>((res, rej) => {
      const t = d.transaction(stores, mode);
      const req = fn(t);
      t.oncomplete = () => res((req ? req.result : undefined) as T);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  return {
    get: async (k) => ((await tx<Clip | undefined>(['clips'], 'readonly', (t) => t.objectStore('clips').get(k))) ?? null),
    put: (k, c, m) =>
      tx<void>(['clips', 'meta'], 'readwrite', (t) => {
        t.objectStore('clips').put(c, k);
        t.objectStore('meta').put(m);
      }),
    touch: (m) => tx<void>(['meta'], 'readwrite', (t) => void t.objectStore('meta').put(m)),
    delete: (k) =>
      tx<void>(['clips', 'meta'], 'readwrite', (t) => {
        t.objectStore('clips').delete(k);
        t.objectStore('meta').delete(k);
      }),
    metas: () => tx<ClipMeta[]>(['meta'], 'readonly', (t) => t.objectStore('meta').getAll()),
  };
}
