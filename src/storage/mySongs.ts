// "My songs" (SPEC-MY-SONG §2): the player's own recordings and their analysis, kept on this device (IndexedDB) and
// never uploaded — own audio only (docs/research/STANDARDS_LEGAL.md). One library for every course; each course keeps
// its last score on the song. Behind an interface so tests (and the simulator) use the in-memory store. Everything
// fails soft: no IndexedDB (private mode) → the songs simply are not kept.

import type { CourseId } from '../engine/courses';
import type { SongAnalysis, TakeLog } from '../engine/mySong';

export interface SongMeta {
  id: string;
  name: string;
  addedAt: string;
  /** Seconds. */
  duration: number;
  /** Bytes of the file. */
  size: number;
  type: string;
  analysis: SongAnalysis | null;
  /** Each course's last score (0..1) on this song. */
  scores?: Partial<Record<CourseId, { score: number; at: string }>>;
}
export interface StoredSong extends SongMeta {
  blob: Blob;
}
export type PutResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export interface SongStore {
  /** Newest first, without the audio. */
  list(): Promise<SongMeta[]>;
  get(id: string): Promise<StoredSong | null>;
  put(s: StoredSong): Promise<PutResult>;
  /** Change the name, analysis or scores; false when the song is gone. */
  update(id: string, patch: Partial<Omit<SongMeta, 'id'>>): Promise<boolean>;
  remove(id: string): Promise<void>;
}

/** Longest name kept. */
export const NAME_MAX = 60;
/** A name from a file name: no extension, no underscores, trimmed, at most NAME_MAX characters. */
export function songName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (base || 'My song').slice(0, NAME_MAX);
}
/** A typed name, cleaned (empty → keep the old one). */
export const cleanName = (typed: string, old: string) => typed.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || old;

export const newSongId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

const metaOf = (s: StoredSong): SongMeta => {
  const { blob: _b, ...m } = s;
  void _b;
  return m;
};
const byNewest = (a: SongMeta, b: SongMeta) => b.addedAt.localeCompare(a.addedAt);

/** The in-memory store (tests, the simulator, no IndexedDB). `quota` (bytes) makes it refuse like a full device. */
export function memorySongStore(quota = Infinity): SongStore {
  const m = new Map<string, StoredSong>();
  const used = () => [...m.values()].reduce((a, s) => a + s.size, 0);
  return {
    list: async () => [...m.values()].map(metaOf).sort(byNewest),
    get: async (id) => m.get(id) ?? null,
    put: async (s) => {
      if (used() - (m.get(s.id)?.size ?? 0) + s.size > quota) return { ok: false, reason: 'quota' };
      m.set(s.id, s);
      return { ok: true };
    },
    update: async (id, patch) => {
      const s = m.get(id);
      if (!s) return false;
      m.set(id, { ...s, ...patch, id });
      return true;
    },
    remove: async (id) => {
      m.delete(id);
    },
  };
}

const STORE = 'songs';
const isQuota = (e: unknown) => {
  const n = (e as { name?: string } | null)?.name ?? '';
  return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED';
};

/** The IndexedDB store. */
export function indexedSongStore(dbName = 'toneturn-mysongs'): SongStore {
  let dbp: Promise<IDBDatabase | null> | null = null;
  const open = () =>
    (dbp ??= new Promise((resolve) => {
      try {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    }));
  /** One transaction: `done` with the request's result on completion, `fail` (or `full` on a quota error) otherwise. */
  const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest, done: (r: unknown) => T, fail: T, full: T = fail): Promise<T> => {
    const db = await open();
    if (!db) return fail;
    return new Promise<T>((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        let result: unknown;
        req.onsuccess = () => (result = req.result);
        tx.oncomplete = () => resolve(done(result));
        tx.onerror = () => resolve(isQuota(tx.error) ? full : fail);
        tx.onabort = () => resolve(isQuota(tx.error) ? full : fail);
      } catch (e) {
        resolve(isQuota(e) ? full : fail);
      }
    });
  };
  const write = (song: StoredSong) => run<PutResult>('readwrite', (s) => s.put(song), () => ({ ok: true }), { ok: false, reason: 'unavailable' }, { ok: false, reason: 'quota' });
  const read = (id: string) => run('readonly', (s) => s.get(id), (r) => (r as StoredSong | undefined) ?? null, null as StoredSong | null);
  return {
    list: () => run('readonly', (s) => s.getAll(), (r) => ((r as StoredSong[] | undefined) ?? []).map(metaOf).sort(byNewest), [] as SongMeta[]),
    get: read,
    put: write,
    update: async (id, patch) => {
      const cur = await read(id);
      if (!cur) return false;
      return (await write({ ...cur, ...patch, id })).ok;
    },
    remove: async (id) => {
      await run('readwrite', (s) => s.delete(id), () => true, false);
    },
  };
}

/** The device store when IndexedDB exists, else memory. */
export function deviceSongStore(): SongStore {
  try {
    if (typeof indexedDB !== 'undefined') return indexedSongStore();
  } catch {
    /* fall through */
  }
  return memorySongStore();
}

// ───────────────────────────── room on the device ─────────────────────────────

export type Room = 'ok' | 'low' | 'full';
/** Whether a file of `extra` bytes fits: full when it would pass the quota, low when less than 10 % (or 50 MB) would be left. */
export function roomFor(usage: number, quota: number, extra: number): Room {
  if (!Number.isFinite(quota) || quota <= 0) return 'ok';
  const left = quota - usage - extra;
  if (left < 0) return 'full';
  if (left < Math.min(quota * 0.1, 50e6)) return 'low';
  return 'ok';
}
/** The browser's estimate (null when it cannot tell). */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || typeof e.quota !== 'number') return null;
    return { usage: e.usage ?? 0, quota: e.quota };
  } catch {
    return null;
  }
}
/** Largest file opened (bytes) and longest recording (s): a phone has to decode it whole. */
export const MAX_FILE_BYTES = 60e6;
export const MAX_SECONDS = 10 * 60;

// ───────────────────────────── a half-done session (never lose progress) ─────────────────────────────

export interface MySession {
  songId: string;
  sessionId: string;
  section: number;
  speed: number;
  takes: TakeLog[];
  startedAt: string;
}
const SESSION_KEY = (course: CourseId) => `toneturn.mysong.${course}`;
/** Minimal storage (localStorage, or a map in tests). */
export interface SessionKV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
const kvOr = (kv?: SessionKV): SessionKV | null => {
  if (kv) return kv;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};
export function saveMySession(course: CourseId, s: MySession, kv?: SessionKV): void {
  try {
    kvOr(kv)?.setItem(SESSION_KEY(course), JSON.stringify(s));
  } catch {
    /* full or blocked: the session just will not resume */
  }
}
export function loadMySession(course: CourseId, kv?: SessionKV): MySession | null {
  try {
    const raw = kvOr(kv)?.getItem(SESSION_KEY(course));
    if (!raw) return null;
    const s = JSON.parse(raw) as MySession;
    return s && typeof s.songId === 'string' && Array.isArray(s.takes) ? s : null;
  } catch {
    return null;
  }
}
export function clearMySession(course: CourseId, kv?: SessionKV): void {
  try {
    kvOr(kv)?.removeItem(SESSION_KEY(course));
  } catch {
    /* ignore */
  }
}
