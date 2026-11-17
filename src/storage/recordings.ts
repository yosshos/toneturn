// My recordings — "ההקלטות שלי" (SPEC-PHRASE-STUDIO §6, §12.2, §15; owner decisions §20, 2026-11-16).
//
// Every measured take keeps its notes (packed, ~6 bytes a note) and, for a microphone take, its audio (the capture's
// own MediaRecorder stream, ~48 kbps — never a second getUserMedia on iOS). Takes are grouped into practice sessions
// (a gap of more than SESSION_GAP_MS starts a new one; the session's measured minutes come from the practice clock's
// ledger, engine/practiceTime.ts). Everything stays on this device: IndexedDB 'toneturn-recordings' (stores sessions,
// takes, audio, playlists, meta), audio blobs in OPFS where the browser has it (not iOS, where IndexedDB blobs are
// the reliable choice), and an in-memory store for private mode and tests. Everything fails soft: a full device keeps
// the take's notes and says so; nothing is ever deleted silently — deleted takes wait 30 days in the bin; unstarred
// audio older than 60 days (and, to stay under the 500 MB budget, the oldest unprotected audio) becomes notes only.
//
// Encore part B imports the types and listTakes / getTake / saveTake — keep the names.

import type { CourseId } from '../engine/courses';
import type { LickInstrument } from '../engine/licks';
import type { PlayedNote, Verdict } from '../engine/drills/types';

type T2 = { en: string; he: string };

// ───────────────────────────── the data model (§12.2) ─────────────────────────────

export interface RecSession {
  id: string;
  startedAt: string;
  endedAt: string;
  course: CourseId | null;
  route: string;
  measuredMs: number;
  takeIds: string[];
  audioId?: string /* session recording (v2) */;
  /** The practice ledger's measured ms of the day when the session began (measuredMs = now − this). */
  measuredBase?: number;
}

export interface RecTake {
  id: string;
  sessionId: string;
  at: string;
  durationMs: number;
  course: CourseId | null;
  instrument: LickInstrument | 'drums';
  kind: 'drill' | 'lick' | 'phrase' | 'chart' | 'improv' | 'guided' | 'record' | 'piece' | 'vocal' | 'song' | 'level-test' | 'lesson' | 'game';
  /** drills / licks / phrases: the ItemState id */
  itemId?: string;
  /** auto title or the player's name */
  title: T2 | string;
  sung: boolean;
  source: 'midi' | 'mic' | 'screen';
  /** packed (pitch, Δonset, dur, vel) — packNotes; absent for pure-audio takes without pitch */
  notes?: Uint8Array;
  bpm?: number;
  meter?: number;
  /** beat 0 in seconds when the tempo is known */
  t0?: number;
  /** chord chart text when played over one */
  chart?: string;
  /** to re-render the band; `notes` (an extension): the band's own events, packed with an instrument byte */
  backing?: { kind: 'chart' | 'drill' | 'song'; ref: string; bpm: number; notes?: Uint8Array; style?: string };
  result?: { verdict?: Verdict; acc?: number; bpm?: number; score?: number };
  audioId?: string;
  audioBytes?: number;
  audioType?: string;
  star?: boolean;
  folder?: string;
  tags?: string[];
  deletedAt?: string;
  prunedAt?: string;
  phraseIds?: string[];
  sharedTo?: ('teacher' | 'friends' | 'public')[];
  /** Waveform peaks (0..255, one per PEAK_MS) — computed once the audio is first decoded (§15). */
  peaks?: Uint8Array;
  /** §6.2: the notes came from another of the player's devices (opt-in note sync); this device has no audio of it. */
  fromCloud?: boolean;
}

export interface RecPlaylist {
  id: string;
  name: T2 | string;
  takeIds: string[];
  loop: 'one' | 'all' | 'ab';
  ab?: [number, number];
  /** v2: the take the A–B span belongs to (loop 'ab'); the playlist's order is takeIds. */
  abTake?: string;
  createdAt?: string;
}

export type RecKind = RecTake['kind'];

// ───────────────────────────── rules (owner decisions §20) ─────────────────────────────

export const REC_DB = 'toneturn-recordings';
/** Audio budget (bytes): 500 MB ≈ 23 hours at 48 kbps. */
export const AUDIO_BUDGET = 500e6;
/** Notes budget (practically unlimited). */
export const NOTES_BUDGET = 50e6;
/** Deleted takes stay restorable this long. */
export const BIN_DAYS = 30;
/** Unstarred audio older than this becomes notes only. */
export const PRUNE_DAYS = 60;
/** A pause longer than this between takes starts a new session. */
export const SESSION_GAP_MS = 20 * 60_000;
/** Shorter takes are not kept: fewer notes than this and less than MIN_AUDIO_MS of sound. */
export const MIN_NOTES = 3;
export const MIN_AUDIO_MS = 2000;
/** MediaRecorder target (bits per second): mono Opus / AAC. */
export const AUDIO_BPS = 48_000;
/** Longest name kept (like My song). */
export const NAME_MAX = 60;
/** Waveform peaks: one value per this many ms. */
export const PEAK_MS = 50;
/** Ask for persistent storage once the library passes this. */
export const PERSIST_AT = 50e6;
const DAY = 86_400_000;

// ───────────────────────────── packed notes ─────────────────────────────

/** A packed note back as a PlayedNote (ms from beat 0), with the band's instrument byte when the pack has one. */
export type UnpackedNote = PlayedNote & { inst?: number };

const zig = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzig = (n: number) => (n % 2 ? -(n + 1) / 2 : n / 2);

/**
 * Notes → bytes: [version 1][flags: 1 = an instrument byte per note][count][first onset, zigzag], then per note (by
 * onset) pitch u8, Δonset ms (varint), duration ms + 1 (varint; 0 = still held), velocity u8, [instrument u8].
 * About 5–6 bytes a note: a 10-minute improvisation of 3 000 notes ≈ 18 KB.
 */
export function packNotes(notes: readonly (PlayedNote & { inst?: number })[], withInst = false): Uint8Array {
  const ns = notes
    .filter((n) => Number.isFinite(n.on) && Number.isFinite(n.pitch))
    .map((n) => ({ p: Math.max(0, Math.min(127, Math.round(n.pitch))), on: Math.round(n.on), d: n.off === null || !Number.isFinite(n.off) ? -1 : Math.max(0, Math.round(n.off - n.on)), v: Math.max(0, Math.min(127, Math.round(n.vel))), i: Math.max(0, Math.min(255, n.inst ?? 0)) }))
    .sort((a, b) => a.on - b.on);
  const out: number[] = [1, withInst ? 1 : 0];
  const vint = (x: number) => {
    let v = Math.max(0, Math.floor(x));
    while (v >= 0x80) {
      out.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    out.push(v);
  };
  vint(ns.length);
  vint(zig(ns[0]?.on ?? 0));
  let prev = ns[0]?.on ?? 0;
  for (const n of ns) {
    out.push(n.p);
    vint(n.on - prev);
    prev = n.on;
    vint(n.d + 1);
    out.push(n.v);
    if (withInst) out.push(n.i);
  }
  return Uint8Array.from(out);
}

export function unpackNotes(b: Uint8Array | null | undefined): UnpackedNote[] {
  if (!b || b.length < 3 || b[0] !== 1) return [];
  let i = 2;
  const withInst = (b[1] & 1) === 1;
  const vint = () => {
    let v = 0;
    let mul = 1;
    while (i < b.length) {
      const x = b[i++];
      v += (x & 0x7f) * mul;
      if (x < 0x80) break;
      mul *= 128;
    }
    return v;
  };
  const n = vint();
  let on = unzig(vint());
  const out: UnpackedNote[] = [];
  for (let k = 0; k < n && i < b.length; k++) {
    const pitch = b[i++];
    on += vint();
    const d = vint() - 1;
    const vel = b[i++] ?? 64;
    const note: UnpackedNote = { pitch, on, off: d < 0 ? null : on + d, vel };
    if (withInst) note.inst = b[i++];
    out.push(note);
  }
  return out;
}

/** The notes' span in ms: [first onset, last release]. */
export function notesSpan(ns: readonly PlayedNote[]): [number, number] {
  if (!ns.length) return [0, 0];
  let a = Infinity;
  let z = -Infinity;
  for (const n of ns) {
    a = Math.min(a, n.on);
    z = Math.max(z, n.off ?? n.on + 250);
  }
  return [a, z];
}

// ───────────────────────────── the store behind an interface ─────────────────────────────

export type StoreName = 'sessions' | 'takes' | 'audio' | 'playlists' | 'meta';
export type PutResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };
export interface AudioRow {
  id: string;
  blob?: Blob;
  bytes: number;
  type: string;
  /** The blob lives in OPFS (recordings/<id>). */
  opfs?: boolean;
}
type Row = { id: string };

export interface RecordingStore {
  get<T extends Row>(s: StoreName, id: string): Promise<T | null>;
  all<T extends Row>(s: StoreName): Promise<T[]>;
  put<T extends Row>(s: StoreName, value: T): Promise<PutResult>;
  del(s: StoreName, id: string): Promise<void>;
  /**
   * The takes' light index rows (TakeHead), newest first, within `o`'s bounds on `at`; `visit` returns false to stop.
   * Optional: without it the store's takes are read whole and indexed on the fly (the memory store, tests).
   */
  heads?(o: ScanOpts, visit: (h: TakeHead) => boolean | void): Promise<void>;
  /** IndexedDB opened (false: private mode or blocked — the device store then keeps takes in memory). */
  ready?(): Promise<boolean>;
}

/** Bounds on `at` (ISO): from inclusive; to exclusive unless `toInclusive`. */
export interface ScanOpts {
  from?: string;
  to?: string;
  toInclusive?: boolean;
}

/**
 * A take's light index row (the 'heads' store): everything the library's filters, search, counts, the diary, cleanup
 * and the budget need — without the notes, band, peaks. `q` is the take's search text (searchText), `nb` its notes bytes.
 */
export type TakeHead = Pick<
  RecTake,
  'id' | 'sessionId' | 'at' | 'durationMs' | 'course' | 'instrument' | 'kind' | 'itemId' | 'title' | 'sung' | 'source' | 'result' | 'audioId' | 'audioBytes' | 'star' | 'folder' | 'tags' | 'deletedAt' | 'prunedAt' | 'phraseIds' | 'sharedTo' | 'fromCloud'
> & { q: string; nb: number };

const HEAD_KEYS = ['id', 'sessionId', 'at', 'durationMs', 'course', 'instrument', 'kind', 'itemId', 'title', 'sung', 'source', 'result', 'audioId', 'audioBytes', 'star', 'folder', 'tags', 'deletedAt', 'prunedAt', 'phraseIds', 'sharedTo', 'fromCloud'] as const;
export function headOf(t: RecTake): TakeHead {
  const h = { q: searchText(t), nb: (t.notes?.byteLength ?? 0) + (t.backing?.notes?.byteLength ?? 0) } as TakeHead;
  for (const k of HEAD_KEYS) if (t[k] !== undefined) (h as unknown as Record<string, unknown>)[k] = t[k];
  return h;
}
const inBounds = (at: string, o: ScanOpts) => (!o.from || at >= o.from) && (!o.to || (o.toInclusive ? at <= o.to : at < o.to));

/** The in-memory store (tests, private mode). `quota` (bytes of audio) makes it refuse like a full device. */
export function memoryRecordingStore(quota = Infinity): RecordingStore {
  const m: Record<StoreName, Map<string, Row>> = { sessions: new Map(), takes: new Map(), audio: new Map(), playlists: new Map(), meta: new Map() };
  const audioUsed = () => [...m.audio.values()].reduce((a, r) => a + ((r as AudioRow).bytes ?? 0), 0);
  return {
    get: async <T extends Row>(s: StoreName, id: string) => (m[s].get(id) as T | undefined) ?? null,
    all: async <T extends Row>(s: StoreName) => [...m[s].values()] as T[],
    put: async (s, v) => {
      if (s === 'audio' && audioUsed() - ((m.audio.get(v.id) as AudioRow | undefined)?.bytes ?? 0) + ((v as unknown as AudioRow).bytes ?? 0) > quota) return { ok: false, reason: 'quota' };
      m[s].set(v.id, v);
      return { ok: true };
    },
    del: async (s, id) => void m[s].delete(id),
  };
}

const STORES: StoreName[] = ['sessions', 'takes', 'audio', 'playlists', 'meta'];
const isQuota = (e: unknown) => {
  const n = (e as { name?: string } | null)?.name ?? '';
  return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED';
};

/** The IndexedDB store (v2: a 'heads' store — the takes' light index rows, by date — kept in step with 'takes'). */
export function indexedRecordingStore(dbName = REC_DB): RecordingStore {
  let dbp: Promise<IDBDatabase | null> | null = null;
  const open = () =>
    (dbp ??= new Promise((resolve) => {
      try {
        const req = indexedDB.open(dbName, 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
          if (!db.objectStoreNames.contains('heads')) {
            const hs = db.createObjectStore('heads', { keyPath: 'id' });
            hs.createIndex('at', 'at');
            // v1 → v2: index the takes already kept.
            const cur = req.transaction!.objectStore('takes').openCursor();
            cur.onsuccess = () => {
              const c = cur.result;
              if (!c) return;
              hs.put(headOf(c.value as RecTake));
              c.continue();
            };
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    }));
  const run = async <T,>(s: StoreName, mode: IDBTransactionMode, fn: (st: IDBObjectStore, tx: IDBTransaction) => IDBRequest, done: (r: unknown) => T, fail: T, full: T = fail): Promise<T> => {
    const db = await open();
    if (!db) return fail;
    return new Promise<T>((resolve) => {
      try {
        // A take's write also writes its index row, in the same transaction.
        const both = s === 'takes' && mode === 'readwrite' && db.objectStoreNames.contains('heads');
        const tx = db.transaction(both ? ['takes', 'heads'] : s, mode);
        const req = fn(tx.objectStore(s), tx);
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
  const hasHeads = (tx: IDBTransaction) => tx.objectStoreNames.contains('heads');
  return {
    get: <T extends Row>(s: StoreName, id: string) => run(s, 'readonly', (st) => st.get(id), (r) => (r as T | undefined) ?? null, null as T | null),
    all: <T extends Row>(s: StoreName) => run(s, 'readonly', (st) => st.getAll(), (r) => (r as T[] | undefined) ?? [], [] as T[]),
    put: (s, v) =>
      run<PutResult>(
        s,
        'readwrite',
        (st, tx) => {
          if (s === 'takes' && hasHeads(tx)) tx.objectStore('heads').put(headOf(v as unknown as RecTake));
          return st.put(v);
        },
        () => ({ ok: true }),
        { ok: false, reason: 'unavailable' },
        { ok: false, reason: 'quota' },
      ),
    del: async (s, id) =>
      void (await run(
        s,
        'readwrite',
        (st, tx) => {
          if (s === 'takes' && hasHeads(tx)) tx.objectStore('heads').delete(id);
          return st.delete(id);
        },
        () => true,
        false,
      )),
    heads: async (o, visit) => {
      const db = await open();
      if (!db || !db.objectStoreNames.contains('heads')) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction('heads', 'readonly');
          const range = o.from && o.to ? IDBKeyRange.bound(o.from, o.to, false, !o.toInclusive) : o.from ? IDBKeyRange.lowerBound(o.from) : o.to ? IDBKeyRange.upperBound(o.to, !o.toInclusive) : null;
          const req = tx.objectStore('heads').index('at').openCursor(range, 'prev');
          req.onsuccess = () => {
            const c = req.result;
            if (!c) return;
            if (visit(c.value as TakeHead) === false) return;
            c.continue();
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resolve();
        }
      });
    },
    ready: async () => !!(await open()),
  };
}

/** iPhone / iPad (also iPadOS asking for the desktop site): IndexedDB blobs are the reliable place there. */
const isIOS = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Audio blobs in the origin-private file system (Chromium, Firefox), the rows in the base store. Falls back per take. */
export function withOpfsAudio(base: RecordingStore): RecordingStore {
  type Dir = FileSystemDirectoryHandle;
  let dirp: Promise<Dir | null> | null = null;
  const dir = () =>
    (dirp ??= (async () => {
      try {
        const root = await navigator.storage.getDirectory();
        return await root.getDirectoryHandle('recordings', { create: true });
      } catch {
        return null;
      }
    })());
  const writeFile = async (id: string, blob: Blob): Promise<boolean | 'quota'> => {
    const d = await dir();
    if (!d) return false;
    try {
      const fh = await d.getFileHandle(id, { create: true });
      const w = await (fh as FileSystemFileHandle & { createWritable?: () => Promise<FileSystemWritableFileStream> }).createWritable?.();
      if (!w) return false;
      await w.write(blob);
      await w.close();
      return true;
    } catch (e) {
      return isQuota(e) ? 'quota' : false;
    }
  };
  return {
    ...base,
    get: async <T extends Row>(s: StoreName, id: string) => {
      const r = await base.get<T>(s, id);
      if (s !== 'audio' || !r || !(r as unknown as AudioRow).opfs) return r;
      try {
        const d = await dir();
        const f = await (await d!.getFileHandle(id)).getFile();
        return { ...r, blob: new Blob([f], { type: (r as unknown as AudioRow).type }) } as T;
      } catch {
        return null;
      }
    },
    put: async (s, v) => {
      const a = v as unknown as AudioRow;
      if (s !== 'audio' || !a.blob) return base.put(s, v);
      const w = await writeFile(a.id, a.blob);
      if (w === 'quota') return { ok: false, reason: 'quota' };
      if (!w) return base.put(s, v);
      const { blob: _b, ...meta } = a;
      void _b;
      return base.put(s, { ...meta, opfs: true });
    },
    del: async (s, id) => {
      if (s === 'audio') {
        try {
          await (await dir())?.removeEntry(id);
        } catch {
          /* not in OPFS */
        }
      }
      return base.del(s, id);
    },
  };
}

/** True once the device store found no IndexedDB (private mode, blocked): takes then live only until the tab closes. */
let volatileStore = false;
export const recordingsVolatile = () => volatileStore;

/** A store that switches to memory on its first use when the primary cannot open (private browsing). */
export function fallbackStore(primary: RecordingStore): RecordingStore {
  let pick: Promise<RecordingStore> | null = null;
  const use = () =>
    (pick ??= (async () => {
      try {
        if (!primary.ready || (await primary.ready())) return primary;
      } catch {
        /* fall through */
      }
      volatileStore = true;
      return memoryRecordingStore();
    })());
  return {
    get: async <T extends Row>(s: StoreName, id: string) => (await use()).get<T>(s, id),
    all: async <T extends Row>(s: StoreName) => (await use()).all<T>(s),
    put: async (s, v) => (await use()).put(s, v),
    del: async (s, id) => (await use()).del(s, id),
    heads: async (o, visit) => {
      const u = await use();
      return u.heads ? u.heads(o, visit) : headsOf(u, o, visit);
    },
    ready: async () => (await use()) === primary,
  };
}

/** The device store: IndexedDB (+ OPFS audio off iOS) when it opens, else memory (private mode). */
export function deviceRecordingStore(): RecordingStore {
  try {
    if (typeof indexedDB !== 'undefined') {
      const idb = indexedRecordingStore();
      const opfs = typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function' && typeof FileSystemFileHandle !== 'undefined' && 'createWritable' in FileSystemFileHandle.prototype && !isIOS();
      return fallbackStore(opfs ? { ...withOpfsAudio(idb), heads: idb.heads, ready: idb.ready } : idb);
    }
  } catch {
    /* fall through */
  }
  volatileStore = true;
  return memoryRecordingStore();
}

/** A store's heads without an index: its takes read whole, newest first. */
async function headsOf(s: RecordingStore, o: ScanOpts, visit: (h: TakeHead) => boolean | void): Promise<void> {
  const all = (await s.all<RecTake>('takes')).filter((t) => inBounds(t.at, o)).sort((a, b) => b.at.localeCompare(a.at));
  for (const t of all) if (visit(headOf(t)) === false) return;
}

// ───────────────────────────── module state: store, prefs, context, listeners ─────────────────────────────

let store: RecordingStore | null = null;
const st = () => (store ??= deviceRecordingStore());
/** The current store's heads (newest first). */
const scanHeads = (o: ScanOpts, visit: (h: TakeHead) => boolean | void): Promise<void> => {
  const s = st();
  return s.heads ? s.heads(o, visit) : headsOf(s, o, visit);
};
/** Every head in bounds (cleanup, the budget, usage, counts): light rows only. */
async function allHeads(o: ScanOpts = {}): Promise<TakeHead[]> {
  const out: TakeHead[] = [];
  await scanHeads(o, (h) => void out.push(h));
  return out;
}
/** Tests (and the simulator): another store. */
export function setRecordingStore(s: RecordingStore | null) {
  store = s;
  migrated = null;
}

export interface RecordingPrefs {
  /** Settings.keepTakeNotes !== false */
  keepNotes: boolean;
  /** Settings.keepTakes !== false */
  keepAudio: boolean;
  budget: number;
}
let prefs: RecordingPrefs = { keepNotes: true, keepAudio: true, budget: AUDIO_BUDGET };
export const recordingPrefs = () => prefs;
/** The app mirrors the player's settings here (App, on every settings change). */
export function setRecordingPrefs(p: Partial<RecordingPrefs>) {
  prefs = { ...prefs, ...p };
}

export interface RecordingContext {
  route: string;
  course: CourseId | null;
  /** The practice ledger's measured ms today (sessions show what part of it they hold). */
  measuredMs?: number;
}
let contextOf: () => RecordingContext = () => ({ route: '', course: null });
/** Where takes are made (the practice clock's route and course): App wires it once. */
export function setRecordingContext(fn: () => RecordingContext) {
  contextOf = fn;
}

const listeners = new Set<() => void>();
/** Called after every change (the library refreshes). */
export function subscribeRecordings(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
const changed = () => listeners.forEach((f) => f());

/** The newest take's id (the take reviews' "this take" link). */
let lastTakeId: string | null = null;
export const lastSavedTakeId = () => lastTakeId;

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ───────────────────────────── pure helpers (tested) ─────────────────────────────

/** A take that cleanup and the budget never touch. */
export const isProtected = (t: Pick<RecTake, 'star' | 'folder' | 'phraseIds' | 'sharedTo'>) => !!t.star || !!t.folder || !!t.phraseIds?.length || !!t.sharedTo?.length;

/** The take's title in a language. */
export const takeTitle = (t: Pick<RecTake, 'title'>, lang: 'en' | 'he') => (typeof t.title === 'string' ? t.title : t.title[lang] || t.title.en);

/** A typed name, cleaned (empty → keep the old one). */
export const cleanName = (typed: string, old: RecTake['title']) => typed.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || old;

/** Which session a take made at `at` joins: the newest one when the gap is short, else a new one (null). */
export function sessionFor(sessions: readonly RecSession[], at: number, gapMs = SESSION_GAP_MS): RecSession | null {
  let best: RecSession | null = null;
  for (const s of sessions) if (!best || s.endedAt > best.endedAt) best = s;
  if (!best) return null;
  const end = Date.parse(best.endedAt);
  return at - end <= gapMs && at >= Date.parse(best.startedAt) - 1000 ? best : null;
}

const MONTHS = {
  en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
};
/** Everything a search may match: names in both languages, tags, folder, item, chart, kind, month and date. */
export function searchText(t: RecTake): string {
  const d = new Date(t.at);
  const title = typeof t.title === 'string' ? t.title : `${t.title.en} ${t.title.he}`;
  const date = Number.isFinite(d.getTime()) ? `${MONTHS.en[d.getMonth()]} ${MONTHS.he[d.getMonth()]} ${d.getDate()}.${d.getMonth() + 1} ${t.at.slice(0, 10)}` : '';
  return [title, ...(t.tags ?? []), t.folder ?? '', t.itemId ?? '', t.chart ?? '', t.kind, t.course ?? '', t.instrument, date].join(' ').toLowerCase();
}

export interface TakeFilter {
  course?: CourseId;
  kind?: RecKind | RecKind[];
  sung?: boolean;
  /** 'midi' = played on MIDI or the on-screen keys; 'audio' = has its audio. */
  media?: 'midi' | 'audio';
  starred?: boolean;
  folder?: string;
  itemId?: string;
  sessionId?: string;
  q?: string;
  /** ISO bounds on `at` (inclusive from, exclusive to). */
  from?: string;
  to?: string;
  /** true = only deleted takes (the bin); otherwise deleted takes are left out. */
  bin?: boolean;
  limit?: number;
}

/** A take or its index row (the heads carry the search text already). */
type Matchable = RecTake | TakeHead;
export function matchesFilter(t: Matchable, f: TakeFilter): boolean {
  if (f.bin ? !t.deletedAt : !!t.deletedAt) return false;
  if (f.course && t.course !== f.course) return false;
  if (f.kind && !(Array.isArray(f.kind) ? f.kind.includes(t.kind) : t.kind === f.kind)) return false;
  if (f.sung !== undefined && t.sung !== f.sung) return false;
  if (f.media === 'audio' && !t.audioId) return false;
  if (f.media === 'midi' && t.source === 'mic') return false;
  if (f.starred && !t.star) return false;
  if (f.folder !== undefined && (t.folder ?? '') !== f.folder) return false;
  if (f.itemId && t.itemId !== f.itemId) return false;
  if (f.sessionId && t.sessionId !== f.sessionId) return false;
  if (f.from && t.at < f.from) return false;
  if (f.to && t.at >= f.to) return false;
  if (f.q) {
    const hay = 'q' in t && typeof t.q === 'string' ? t.q : searchText(t as RecTake);
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** What cleanup does now: purge bin takes older than BIN_DAYS; prune unprotected audio older than PRUNE_DAYS. */
export function cleanupPlan(takes: readonly Pick<RecTake, 'id' | 'at' | 'deletedAt' | 'audioId' | 'star' | 'folder' | 'phraseIds' | 'sharedTo'>[], now: number): { purge: string[]; prune: string[] } {
  const purge: string[] = [];
  const prune: string[] = [];
  for (const t of takes) {
    if (t.deletedAt) {
      if (now - Date.parse(t.deletedAt) > BIN_DAYS * DAY) purge.push(t.id);
      continue;
    }
    if (t.audioId && !isProtected(t) && now - Date.parse(t.at) > PRUNE_DAYS * DAY) prune.push(t.id);
  }
  return { purge, prune };
}

/** Audio bytes held by takes (the bin too: it is still on the device). */
export const audioBytesOf = (takes: readonly Pick<RecTake, 'audioId' | 'audioBytes'>[]) => takes.reduce((a, t) => a + (t.audioId ? (t.audioBytes ?? 0) : 0), 0);
/** Notes bytes (the packed notes plus a small row). */
export const notesBytesOf = (takes: readonly (RecTake | TakeHead)[]) => takes.reduce((a, t) => a + ('nb' in t ? t.nb : ((t as RecTake).notes?.byteLength ?? 0) + ((t as RecTake).backing?.notes?.byteLength ?? 0)) + 300, 0);

/**
 * Room for `need` more bytes of audio under `budget`: the takes whose audio becomes notes only — bin first, then the
 * oldest unprotected — or null when even that is not enough (the new take then keeps its notes only).
 */
export function budgetPlan(takes: readonly Pick<RecTake, 'id' | 'at' | 'deletedAt' | 'audioId' | 'audioBytes' | 'star' | 'folder' | 'phraseIds' | 'sharedTo'>[], need: number, budget: number): string[] | null {
  let used = audioBytesOf(takes);
  if (used + need <= budget) return [];
  const order = takes.filter((t) => t.audioId && (t.deletedAt || !isProtected(t))).sort((a, b) => (a.deletedAt ? 0 : 1) - (b.deletedAt ? 0 : 1) || a.at.localeCompare(b.at));
  const out: string[] = [];
  for (const t of order) {
    if (used + need <= budget) break;
    used -= t.audioBytes ?? 0;
    out.push(t.id);
  }
  return used + need <= budget ? out : null;
}

/** Sessions with their (filtered) takes, newest first; a session without a matching take is left out. */
export function groupBySession<T extends Pick<RecTake, 'id' | 'at' | 'sessionId' | 'course'>>(takes: readonly T[], sessions: readonly RecSession[]): { session: RecSession; takes: T[] }[] {
  const by = new Map<string, T[]>();
  for (const t of takes) by.set(t.sessionId, [...(by.get(t.sessionId) ?? []), t]);
  const known = new Map(sessions.map((s) => [s.id, s]));
  const out: { session: RecSession; takes: T[] }[] = [];
  for (const [id, ts] of by) {
    ts.sort((a, b) => b.at.localeCompare(a.at));
    const s = known.get(id) ?? { id, startedAt: ts[ts.length - 1].at, endedAt: ts[0].at, course: ts[0].course, route: '', measuredMs: 0, takeIds: ts.map((t) => t.id) };
    out.push({ session: s, takes: ts });
  }
  return out.sort((a, b) => b.takes[0].at.localeCompare(a.takes[0].at));
}

// ───────────────────────────── the API ─────────────────────────────

/** What a screen hands over for a take; the store adds id, session, time and audio fields. */
export type NewTake = Omit<RecTake, 'id' | 'sessionId' | 'at' | 'audioId' | 'audioBytes' | 'audioType' | 'deletedAt' | 'prunedAt' | 'notes'> & {
  id?: string;
  at?: string;
  /** The notes as played (ms from beat 0); packed by the store. */
  played?: readonly PlayedNote[];
  notes?: Uint8Array;
};
export type AudioKept = 'kept' | 'none' | 'off' | 'quota' | 'budget';
export type SaveResult = { ok: true; take: RecTake; audio: AudioKept } | { ok: false; reason: 'short' | 'off' | 'quota' | 'unavailable' };

const audioRows = async () => st().all<AudioRow>('audio');

/** Keep a take (and its audio when given and allowed). Never throws. */
export async function saveTake(input: NewTake, audio?: Blob | null, opts: { now?: number } = {}): Promise<SaveResult> {
  try {
    const now = opts.now ?? Date.now();
    const { played, ...rest } = input;
    const notes = input.notes ?? (played?.length ? packNotes(played) : undefined);
    const count = played?.length ?? unpackNotes(notes).length;
    const hasAudio = !!audio && audio.size > 0;
    const audioOk = hasAudio && (input.durationMs >= MIN_AUDIO_MS || audio!.size > 12_000);
    if (count < MIN_NOTES && !audioOk) return { ok: false, reason: 'short' };
    if (!prefs.keepNotes && !input.star && input.kind !== 'phrase' && !input.phraseIds?.length) return { ok: false, reason: 'off' };
    const s = st();
    const at = input.at ?? new Date(now).toISOString();
    const ctx = contextOf();
    // The session: the newest one when the last take was a moment ago, else a new one.
    const sessions = await s.all<RecSession>('sessions');
    let session = sessionFor(sessions, now);
    if (!session) session = { id: uid('ses'), startedAt: at, endedAt: at, course: input.course ?? ctx.course, route: ctx.route, measuredMs: 0, takeIds: [], measuredBase: ctx.measuredMs };
    const id = input.id ?? uid('take');
    const take: RecTake = { ...(rest as Omit<RecTake, 'id' | 'sessionId' | 'at'>), id, sessionId: session.id, at, ...(notes ? { notes } : {}) };
    if (!notes) delete take.notes;
    // Audio: allowed, under the budget (older unprotected audio makes room), and the device has room.
    let kept: AudioKept = hasAudio ? (prefs.keepAudio ? 'kept' : 'off') : 'none';
    if (kept === 'kept') {
      const takes = await allHeads();
      // v2: rendered MIDI audio, bounced A–B clips and session recordings hold part of the budget (recExtras.ts)
      const plan = budgetPlan(takes, audio!.size, prefs.budget - reservedBytes);
      if (!plan) kept = 'budget';
      else {
        if (plan.length) {
          for (const pid of plan) await pruneAudio(takes.find((t) => t.id === pid)!, now);
          await setMeta('autoPrune', { at: new Date(now).toISOString(), n: plan.length });
        }
        const aid = `a-${id}`;
        const r = await s.put('audio', { id: aid, blob: audio!, bytes: audio!.size, type: audio!.type || 'audio/webm' } as AudioRow);
        if (r.ok) Object.assign(take, { audioId: aid, audioBytes: audio!.size, audioType: audio!.type || 'audio/webm' });
        else {
          kept = r.reason === 'quota' ? 'quota' : 'none';
          if (r.reason === 'quota') await setMeta('quotaAt', { at: new Date(now).toISOString() });
        }
      }
    }
    const w = await s.put('takes', take);
    if (!w.ok) return { ok: false, reason: w.reason };
    const course = session.takeIds.length && session.course !== (take.course ?? ctx.course) ? null : session.course;
    const measured = ctx.measuredMs !== undefined && session.measuredBase !== undefined ? Math.max(0, ctx.measuredMs - session.measuredBase) : session.measuredMs;
    await s.put('sessions', { ...session, course, endedAt: at > session.endedAt ? at : session.endedAt, takeIds: [...session.takeIds.filter((x) => x !== id), id], measuredMs: Math.max(session.measuredMs, measured) });
    lastTakeId = id;
    changed();
    void maybePersist();
    return { ok: true, take, audio: kept };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** The matching index rows, newest first (scans the light 'heads' index, not the takes). */
export async function listHeads(f: TakeFilter = {}): Promise<TakeHead[]> {
  await migrateOnce();
  const out: TakeHead[] = [];
  await scanHeads({ from: f.from, to: f.to }, (h) => {
    if (matchesFilter(h, f)) out.push(h);
    if (f.limit && out.length >= f.limit) return false;
  });
  return out;
}

/** Full takes for index rows (in the rows' order; a row whose take vanished is left out). */
async function takesFor(hs: readonly Pick<TakeHead, 'id'>[]): Promise<RecTake[]> {
  const s = st();
  return (await Promise.all(hs.map((h) => s.get<RecTake>('takes', h.id)))).filter((t): t is RecTake => !!t);
}

/** Takes, newest first (deleted ones only with `bin`). Use listTakesPage for the library's long lists. */
export async function listTakes(f: TakeFilter = {}): Promise<RecTake[]> {
  return takesFor(await listHeads(f));
}

/** How many takes match (the index only). */
export async function countTakes(f: TakeFilter = {}): Promise<number> {
  await migrateOnce();
  let n = 0;
  await scanHeads({ from: f.from, to: f.to }, (h) => void (matchesFilter(h, f) && n++));
  return n;
}

/** Where the next page starts: the last page's oldest time, and the ids already shown at that time. */
export interface PageCursor {
  at: string;
  ids: string[];
}
/** The library's page size. */
export const TAKE_PAGE = 30;

/**
 * One page of matching takes, newest first: `limit` takes after `after` (the cursor of the page before), read from
 * the date index — only the page's takes are read whole. `next` is null on the last page.
 */
export async function listTakesPage(f: TakeFilter = {}, o: { after?: PageCursor | null; limit?: number } = {}): Promise<{ takes: RecTake[]; next: PageCursor | null }> {
  await migrateOnce();
  const limit = Math.max(1, o.limit ?? TAKE_PAGE);
  const after = o.after ?? null;
  const seen = new Set(after?.ids ?? []);
  const to = after ? (f.to && f.to <= after.at ? f.to : after.at) : f.to;
  const inclusive = !!after && to === after.at;
  const got: TakeHead[] = [];
  let more = false;
  await scanHeads({ from: f.from, to, toInclusive: inclusive }, (h) => {
    if (after && h.at === after.at && seen.has(h.id)) return;
    if (!matchesFilter(h, f)) return;
    if (got.length >= limit) {
      more = true;
      return false;
    }
    got.push(h);
  });
  const takes = await takesFor(got);
  if (!more || !got.length) return { takes, next: null };
  const last = got[got.length - 1].at;
  const ids = got.filter((h) => h.at === last).map((h) => h.id);
  return { takes, next: { at: last, ids: after && after.at === last ? [...after.ids, ...ids] : ids } };
}

/** What the library's chips need to know about everything kept (the index only, never the takes). */
export interface TakeFacets {
  total: number;
  bin: number;
  courses: CourseId[];
  sung: boolean;
  played: boolean;
  midi: boolean;
  audio: boolean;
  levelTest: boolean;
}
export async function takeFacets(): Promise<TakeFacets> {
  await migrateOnce();
  const f: TakeFacets = { total: 0, bin: 0, courses: [], sung: false, played: false, midi: false, audio: false, levelTest: false };
  const courses = new Set<CourseId>();
  await scanHeads({}, (h) => {
    if (h.deletedAt) return void f.bin++;
    f.total++;
    if (h.course) courses.add(h.course);
    if (h.sung) f.sung = true;
    else f.played = true;
    if (h.source !== 'mic') f.midi = true;
    if (h.audioId) f.audio = true;
    if (h.kind === 'level-test') f.levelTest = true;
  });
  f.courses = [...courses];
  return f;
}

/** Sessions by id (the loaded page's sessions). */
export async function getSessions(ids: readonly string[]): Promise<RecSession[]> {
  const s = st();
  return (await Promise.all([...new Set(ids)].map((id) => s.get<RecSession>('sessions', id)))).filter((x): x is RecSession => !!x);
}

/** Sessions that hold at least one matching take, newest first. */
export async function listSessions(f: TakeFilter = {}): Promise<RecSession[]> {
  const heads = await listHeads({ ...f, limit: undefined });
  const sessions = await getSessions(heads.map((h) => h.sessionId));
  return groupBySession(heads, sessions).map((g) => g.session);
}

/** The diary (§6.7): each local day's kept takes in [from, to) (ISO), newest first, as light rows. */
export async function takesByDay(from: string, to: string, dayOf: (iso: string) => string): Promise<Map<string, TakeHead[]>> {
  const out = new Map<string, TakeHead[]>();
  for (const h of await listHeads({ from, to })) {
    const d = dayOf(h.at);
    out.set(d, [...(out.get(d) ?? []), h]);
  }
  return out;
}

export async function getSession(id: string): Promise<RecSession | null> {
  return st().get<RecSession>('sessions', id);
}

export async function getTake(id: string): Promise<RecTake | null> {
  await migrateOnce();
  return st().get<RecTake>('takes', id);
}

/** The take's audio (null when it has none, or it was pruned to notes). */
export async function getTakeAudio(id: string): Promise<Blob | null> {
  const t = await getTake(id);
  if (!t?.audioId) return null;
  const a = await st().get<AudioRow>('audio', t.audioId);
  return a?.blob ?? null;
}

async function patch(id: string, p: Partial<RecTake> | ((t: RecTake) => Partial<RecTake>)): Promise<RecTake | null> {
  const s = st();
  const t = await s.get<RecTake>('takes', id);
  if (!t) return null;
  const next = { ...t, ...(typeof p === 'function' ? p(t) : p), id };
  for (const k of Object.keys(next) as (keyof RecTake)[]) if (next[k] === undefined) delete next[k];
  const r = await s.put('takes', next);
  return r.ok ? next : null;
}

export async function renameTake(id: string, name: string): Promise<RecTake | null> {
  const r = await patch(id, (t) => ({ title: cleanName(name, t.title) }));
  changed();
  return r;
}

export async function starTake(id: string, on: boolean): Promise<RecTake | null> {
  const r = await patch(id, { star: on || undefined });
  if (on) void maybePersist(true);
  changed();
  return r;
}

/** Into a folder (null / '' = out of any). */
export async function setTakeFolder(id: string, folder: string | null): Promise<RecTake | null> {
  const f = (folder ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  const r = await patch(id, { folder: f || undefined });
  changed();
  return r;
}

export async function setTakeTags(id: string, tags: string[]): Promise<RecTake | null> {
  const clean = [...new Set(tags.map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 30)).filter(Boolean))].slice(0, 12);
  const r = await patch(id, { tags: clean.length ? clean : undefined });
  changed();
  return r;
}

/** The player's folders with their take counts (deleted takes left out). */
export async function listFolders(): Promise<{ name: string; count: number }[]> {
  const m = new Map<string, number>();
  for (const t of await listHeads()) if (t.folder) m.set(t.folder, (m.get(t.folder) ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Into the bin (restorable for BIN_DAYS). */
export async function deleteTake(id: string, now = Date.now()): Promise<void> {
  await patch(id, { deletedAt: new Date(now).toISOString() });
  changed();
}
export async function restoreTake(id: string): Promise<void> {
  await patch(id, { deletedAt: undefined });
  changed();
}

/** Gone for good: the row, its audio, and its place in the session. */
export async function purgeTake(id: string): Promise<void> {
  const s = st();
  const t = await s.get<RecTake>('takes', id);
  if (!t) return;
  if (t.audioId) await s.del('audio', t.audioId);
  await s.del('takes', id);
  const ses = await s.get<RecSession>('sessions', t.sessionId);
  if (ses) {
    const ids = ses.takeIds.filter((x) => x !== id);
    if (ids.length || ses.audioId) await s.put('sessions', { ...ses, takeIds: ids });
    else await s.del('sessions', ses.id);
  }
  changed();
}

export async function emptyBin(): Promise<number> {
  const bin = await listHeads({ bin: true });
  for (const t of bin) await purgeTake(t.id);
  return bin.length;
}

/** Bulk actions (the library's select mode). */
export async function updateTakes(ids: string[], p: { star?: boolean; folder?: string | null; deleted?: boolean }): Promise<void> {
  const now = new Date().toISOString();
  for (const id of ids)
    await patch(id, {
      ...(p.star !== undefined ? { star: p.star || undefined } : {}),
      ...(p.folder !== undefined ? { folder: (p.folder ?? '').trim().slice(0, NAME_MAX) || undefined } : {}),
      ...(p.deleted !== undefined ? { deletedAt: p.deleted ? now : undefined } : {}),
    });
  if (p.star) void maybePersist(true);
  changed();
}

/** The take's audio becomes notes only (the take stays in the timeline, marked). */
async function pruneAudio(t: Pick<RecTake, 'id' | 'audioId'>, now: number): Promise<void> {
  if (!t.audioId) return;
  await st().del('audio', t.audioId);
  await patch(t.id, { audioId: undefined, audioBytes: undefined, prunedAt: new Date(now).toISOString() });
}

/** Store waveform peaks once computed (the player). */
export async function setTakePeaks(id: string, peaks: Uint8Array): Promise<void> {
  await patch(id, { peaks });
}

// ───────────────────────────── synced notes (§6.2, cloud/takeNotes.ts) ─────────────────────────────

/** The fields a second device takes over from the cloud (metadata only; notes and audio never change here). */
export type SyncedMeta = Pick<RecTake, 'title' | 'star' | 'folder' | 'phraseIds' | 'deletedAt'>;

/**
 * A take that arrived from another device (notes, no audio): stored in a session of its own ("ses-cloud-<id>") so the
 * timeline groups it by its date. An existing take with that id is left alone.
 */
export async function putSyncedTake(t: RecTake): Promise<boolean> {
  await migrateOnce();
  const s = st();
  if (await s.get<RecTake>('takes', t.id)) return false;
  const sid = `ses-cloud-${t.id}`.slice(0, 96);
  const take: RecTake = { ...t, sessionId: sid, fromCloud: true };
  for (const k of ['audioId', 'audioBytes', 'audioType', 'peaks'] as const) delete take[k];
  const w = await s.put('takes', take);
  if (!w.ok) return false;
  await s.put('sessions', { id: sid, startedAt: t.at, endedAt: t.at, course: t.course ?? null, route: 'cloud', measuredMs: 0, takeIds: [t.id] } satisfies RecSession);
  changed();
  return true;
}
/** The takes the note sync looks at: protected ones with notes, and every take it synced before (bin included). */
export async function syncCandidates(known: ReadonlySet<string>): Promise<RecTake[]> {
  await migrateOnce();
  const hs = await allHeads();
  return takesFor(hs.filter((h) => known.has(h.id) || (!h.deletedAt && h.nb > 0 && isProtected(h))));
}
/** Apply another device's change of a synced take's metadata (a deletion goes to the bin, as on this device). */
export async function applySyncedMeta(id: string, m: SyncedMeta): Promise<RecTake | null> {
  const r = await patch(id, { title: m.title, star: m.star || undefined, folder: m.folder || undefined, phraseIds: m.phraseIds?.length ? m.phraseIds : undefined, deletedAt: m.deletedAt || undefined });
  changed();
  return r;
}

/** Run the retention policy: purge the bin's old takes, prune old unstarred audio. */
export async function runCleanup(now = Date.now()): Promise<{ purged: number; pruned: number }> {
  try {
    const takes = await allHeads();
    const plan = cleanupPlan(takes, now);
    for (const id of plan.purge) await purgeTake(id);
    for (const id of plan.prune) await pruneAudio(takes.find((t) => t.id === id)!, now);
    if (plan.purge.length || plan.prune.length) changed();
    // Orphan audio (a crash between the two writes): removed.
    const used = new Set(takes.map((t) => t.audioId).filter(Boolean));
    for (const a of await audioRows()) if (!used.has(a.id)) await st().del('audio', a.id);
    return { purged: plan.purge.length, pruned: plan.prune.length };
  } catch {
    return { purged: 0, pruned: 0 };
  }
}

export interface StorageUsage {
  audioBytes: number;
  notesBytes: number;
  takes: number;
  withAudio: number;
  bin: number;
  budget: number;
  /** The browser's estimate for the whole app (null when it cannot tell). */
  device: { usage: number; quota: number } | null;
  /** The last time older audio was turned into notes to stay under the budget. */
  autoPrune?: { at: string; n: number };
  /** The last time the device refused to keep audio (full). */
  quotaAt?: string;
  /** No IndexedDB (private browsing): takes are kept only until the tab closes. */
  volatile?: boolean;
  /** v2: bytes of rendered MIDI audio, bounced clips and session recordings (inside the budget). */
  extraBytes?: number;
  /** navigator.storage.persisted() (null when the browser cannot tell). */
  persisted?: boolean | null;
  /** iPhone / iPad Safari, not installed to the Home Screen: storage may be cleared after 7 days unused. */
  iosBrowser?: boolean;
}
export async function storageUsage(): Promise<StorageUsage> {
  await st().ready?.();
  const takes = await allHeads();
  let device: StorageUsage['device'] = null;
  try {
    const e = await navigator.storage?.estimate?.();
    if (e && typeof e.quota === 'number') device = { usage: e.usage ?? 0, quota: e.quota };
  } catch {
    /* unknown */
  }
  const ap = await getMeta<{ at: string; n: number }>('autoPrune');
  const q = await getMeta<{ at: string }>('quotaAt');
  return {
    audioBytes: audioBytesOf(takes),
    notesBytes: notesBytesOf(takes),
    takes: takes.filter((t) => !t.deletedAt).length,
    withAudio: takes.filter((t) => t.audioId && !t.deletedAt).length,
    bin: takes.filter((t) => t.deletedAt).length,
    budget: prefs.budget,
    device,
    ...(ap ? { autoPrune: ap } : {}),
    ...(q ? { quotaAt: q.at } : {}),
    volatile: recordingsVolatile(),
    extraBytes: reservedBytes,
    persisted: await persistedNow(),
    iosBrowser: isIOS() && !standalone(),
  };
}

async function persistedNow(): Promise<boolean | null> {
  try {
    return typeof navigator !== 'undefined' && navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}
/** Running as the installed app (Home Screen PWA). */
const standalone = () => {
  try {
    return (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true) || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  } catch {
    return false;
  }
};

async function getMeta<T>(key: string): Promise<T | null> {
  const r = await st().get<{ id: string; v: T }>('meta', key);
  return r?.v ?? null;
}
async function setMeta(key: string, v: unknown) {
  await st().put('meta', { id: key, v } as Row);
}

/** navigator.storage.persist(), once: on the first star, or when the library passes PERSIST_AT. */
async function maybePersist(starred = false): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    if (await getMeta('persistAsked')) return;
    if (!starred && audioBytesOf(await allHeads()) < PERSIST_AT) return;
    await setMeta('persistAsked', true);
    await navigator.storage.persist();
  } catch {
    /* not offered */
  }
}

// ───────────────────────────── item history ─────────────────────────────

/** Every kept take of one item, oldest first (the "all takes of this" list). */
export async function takesOfItem(itemId: string): Promise<RecTake[]> {
  return (await listTakes({ itemId })).reverse();
}

/** Per item with audio kept in two different weeks: the first and the newest take ("then and now"). */
export function thenAndNowOf(takes: readonly RecTake[]): { item: string; then: RecTake; now: RecTake }[] {
  const by = new Map<string, RecTake[]>();
  for (const t of takes) if (t.itemId && t.audioId && !t.deletedAt) by.set(t.itemId, [...(by.get(t.itemId) ?? []), t]);
  const week = (iso: string) => Math.floor((Date.parse(iso) + 3 * DAY) / (7 * DAY));
  return [...by.entries()]
    .map(([item, ts]) => {
      ts.sort((a, b) => a.at.localeCompare(b.at));
      return { item, then: ts[0], now: ts[ts.length - 1] };
    })
    .filter((x) => week(x.then.at) !== week(x.now.at));
}

// ───────────────────────────── migration (§12.4) ─────────────────────────────

/** An old vocal kept take (storage/takes.ts). */
export interface OldVocalTake {
  item: string;
  week: string;
  score: number;
  at: string;
  blob: Blob;
}

/** Copy the old "one vocal take a week" database into the library, once (ids are stable, so a rerun adds nothing). */
export async function migrateVocalTakes(read: () => Promise<OldVocalTake[]>): Promise<number> {
  const s = st();
  if (await getMeta('vocalMigrated')) return 0;
  let n = 0;
  try {
    const old = await read();
    for (const o of old) {
      const id = `vocal-${o.item}|${o.week}`;
      if (await s.get('takes', id)) continue;
      const at = Number.isFinite(Date.parse(o.at)) ? o.at : new Date().toISOString();
      const sesId = `ses-vocal-${o.week}`;
      const aid = `a-${id}`;
      const a = await s.put('audio', { id: aid, blob: o.blob, bytes: o.blob.size, type: o.blob.type || 'audio/webm' } as AudioRow);
      const base = o.item.split('#')[0];
      const take: RecTake = {
        id,
        sessionId: sesId,
        at,
        durationMs: 0,
        course: 'voice',
        instrument: 'voice',
        kind: 'vocal',
        itemId: base,
        title: { en: `Voice · ${base}`, he: `קול · ${base}` },
        sung: true,
        source: 'mic',
        result: { score: o.score },
        tags: ['then-and-now'],
        ...(a.ok ? { audioId: aid, audioBytes: o.blob.size, audioType: o.blob.type || 'audio/webm' } : {}),
      };
      await s.put('takes', take);
      const ses = (await s.get<RecSession>('sessions', sesId)) ?? { id: sesId, startedAt: at, endedAt: at, course: 'voice' as CourseId, route: 'vocal', measuredMs: 0, takeIds: [] };
      await s.put('sessions', { ...ses, startedAt: at < ses.startedAt ? at : ses.startedAt, endedAt: at > ses.endedAt ? at : ses.endedAt, takeIds: [...new Set([...ses.takeIds, id])] });
      n++;
    }
    await setMeta('vocalMigrated', { at: new Date().toISOString(), n });
  } catch {
    /* try again next time */
  }
  if (n) changed();
  return n;
}

let migrated: Promise<void> | null = null;
let oldReader: (() => Promise<OldVocalTake[]>) | null = null;
/** The app hands over the old database's reader; the first list / get runs the copy. */
export function setVocalMigrationSource(read: () => Promise<OldVocalTake[]>) {
  oldReader = read;
}
function migrateOnce(): Promise<void> {
  if (!oldReader) return Promise.resolve();
  return (migrated ??= migrateVocalTakes(oldReader).then(() => undefined));
}

/** Tests. */
export function _resetRecordings() {
  store = null;
  migrated = null;
  oldReader = null;
  lastTakeId = null;
  volatileStore = false;
  prefs = { keepNotes: true, keepAudio: true, budget: AUDIO_BUDGET };
  contextOf = () => ({ route: '', course: null });
  listeners.clear();
}

// ───────────────────────────── v2 extensions (recExtras.ts) ─────────────────────────────

/** Bytes of the budget held by v2 extras (rendered MIDI audio, bounced clips, session recordings). */
let reservedBytes = 0;
export function setAudioReserve(bytes: number) {
  reservedBytes = Math.max(0, bytes);
}
export const audioReserve = () => reservedBytes;
/** The current store (recExtras.ts keeps playlists, renders and session audio in it). */
export const recStore = (): RecordingStore => st();
/** Tell the library something changed (recExtras.ts). */
export const notifyRecordings = () => changed();
/** Every take head (recExtras.ts: the starred playlist, budget checks). */
export const allTakeHeads = (): Promise<TakeHead[]> => allHeads();
