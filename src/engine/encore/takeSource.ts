// Encore's thin adapter over a take (SPEC-PHRASE-STUDIO §12.2). Encore asks this module for an EncoreTake — the fields
// of RecTake it needs, with the notes unpacked to milliseconds.
//
// Two sources:
//   1. My recordings (src/storage/recordings.ts): `getTake` + `unpackNotes` for the route, `listTakes` of recent free
//      takes (improv, record, guided, chart) for the shelf "from your recent playing".
//   2. In-memory takes handed over by a take review ("Keep this phrase"): kept in localStorage (small: notes only, the
//      last few), so Back or a reload returns to the same take (owner rule "never lose progress"). Every measured take is
//      also in My recordings already (part A keeps them); the memory copy only makes Keep instant and offline-safe.
//
// The route `#/encore/new?take=<id>&from=<s>&to=<s>` (encoreBridge's openEncoreFromTake): `from` / `to` are SECONDS on
// the take's timeline (notes' ms / 1000; beat 0 = 0 for takes with a known tempo; `from` may be negative — a pickup).

import type { LickInstrument } from '../licks';
import { getTake, listTakes, unpackNotes, type RecTake } from '../../storage/recordings';

type T2 = { en: string; he: string };

/** One played note: MIDI pitch, onset / release in ms on the take's timeline, velocity 1–127. */
export interface RawNote {
  pitch: number;
  on: number;
  off: number | null;
  vel: number;
}

/** What Encore reads of a take (RecTake, §12.2, with `notes` unpacked). */
export interface EncoreTake {
  id: string;
  at: string;
  kind: RecTake['kind'];
  instrument: LickInstrument | 'drums';
  title: T2 | string;
  source: 'midi' | 'mic' | 'screen';
  notes: RawNote[];
  /** Known tempo (a click / band was playing): no tempo detection. */
  bpm?: number;
  meter?: number;
  /** Beat 0 in ms on the take's timeline, when the tempo is known. */
  t0?: number;
  /** The chord chart it was played over: bars separated by "|" (a bar may hold two chords, space separated). */
  chart?: string;
  /** Graded against written notes (a drill, a piece): Keep defaults to the looped / worst bars. */
  graded?: boolean;
  itemId?: string;
  /** v2 audio takes (record mode by microphone, §14.2): each note's confidence 0..1, parallel to `notes`. */
  conf?: number[];
  /** Share of the take that sounded polyphonic (> 0.4: too polyphonic — chords by mic are v3). */
  poly?: number;
  /** Piano by microphone: only the top line was caught. */
  topLine?: boolean;
}

const MEM_KEY = 'tt.encore.takes.v1';
const MEM_MAX = 6;
const FREE_KINDS: RecTake['kind'][] = ['improv', 'record', 'guided', 'chart'];

const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

function readMem(): EncoreTake[] {
  try {
    const v = JSON.parse(ls()?.getItem(MEM_KEY) ?? '[]') as EncoreTake[];
    return Array.isArray(v) ? v.filter((t) => t && typeof t.id === 'string' && Array.isArray(t.notes)) : [];
  } catch {
    return [];
  }
}
function writeMem(list: EncoreTake[]) {
  try {
    ls()?.setItem(MEM_KEY, JSON.stringify(list.slice(0, MEM_MAX)));
  } catch {
    /* storage full or blocked: the take stays for this page only */
  }
}
const live = new Map<string, EncoreTake>();
const fromRec = new Map<string, EncoreTake>();

/** Hand a take to Encore (from a review screen). Returns its id (prefixed "mem:"). */
export function putMemoryTake(t: Omit<EncoreTake, 'id' | 'at'> & { id?: string; at?: string }): string {
  const at = t.at ?? new Date().toISOString();
  // Keep pressed twice on one take: the same copy, not a second one.
  const prior = t.id ? null : [...live.values(), ...readMem()].find((x) => x.id.startsWith('mem:') && sameTake(x, { id: '', at, instrument: t.instrument, notes: t.notes }));
  const id = t.id && t.id.startsWith('mem:') ? t.id : (prior?.id ?? `mem:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  const take: EncoreTake = { ...t, id, at } as EncoreTake;
  live.set(id, take);
  writeMem([take, ...readMem().filter((x) => x.id !== id)]);
  return id;
}

/** A RecTake from My recordings as an EncoreTake (notes unpacked; t0 seconds → ms). */
export function encoreTakeOf(r: RecTake): EncoreTake {
  const notes: RawNote[] = unpackNotes(r.notes).map((n) => ({ pitch: n.pitch, on: n.on, off: n.off, vel: n.vel }));
  return {
    id: r.id,
    at: r.at,
    kind: r.kind,
    instrument: r.instrument,
    title: r.title,
    source: r.source,
    notes,
    ...(r.bpm ? { bpm: r.bpm, meter: r.meter ?? 4, t0: (r.t0 ?? 0) * 1000 } : {}),
    ...(r.chart ? { chart: r.chart } : {}),
    ...(r.kind === 'drill' || r.kind === 'piece' || r.kind === 'lick' || r.kind === 'phrase' ? { graded: true } : {}),
    ...(r.itemId ? { itemId: r.itemId } : {}),
  };
}

async function fromStore(id: string): Promise<EncoreTake | null> {
  try {
    const r = await getTake(id);
    if (!r) return null;
    const t = encoreTakeOf(r);
    fromRec.set(id, t);
    return t;
  } catch {
    return null;
  }
}

/** A take by id: in memory first, then My recordings. */
export async function getEncoreTake(id: string): Promise<EncoreTake | null> {
  if (live.has(id)) return live.get(id)!;
  const m = readMem().find((x) => x.id === id);
  if (m) return m;
  return fromStore(id);
}
/** Synchronously, when already loaded (memory, or a store take read before). */
export const getEncoreTakeSync = (id: string): EncoreTake | null => live.get(id) ?? fromRec.get(id) ?? readMem().find((x) => x.id === id) ?? null;

/** The shelf "from your recent playing": the last free takes in My recordings (improv, record, guided, chart) with notes. */
export async function recentFreeTakes(n = 10): Promise<EncoreTake[]> {
  let rec: EncoreTake[] = [];
  try {
    rec = (await listTakes({ kind: FREE_KINDS, limit: n * 2 })).filter((t) => (t.notes?.byteLength ?? 0) > 3).map(encoreTakeOf).filter((t) => t.notes.length >= 3);
  } catch {
    rec = [];
  }
  for (const t of rec) fromRec.set(t.id, t);
  const mem = readMem().filter((t) => FREE_KINDS.includes(t.kind));
  return dedupeTakes([...rec, ...mem]).sort((a, b) => b.at.localeCompare(a.at)).slice(0, n);
}

/**
 * The same take twice: a review hands it to Encore (a "mem:" copy) while the recordings keeper saves it to My
 * recordings. Same id, or the same notes (pitches in order, onsets relative to the first within 25 ms — the keeper may
 * re-base the clock) on the same instrument within 30 minutes (the copy is stamped when Keep is pressed).
 */
export function sameTake(a: Pick<EncoreTake, 'id' | 'at' | 'instrument' | 'notes'>, b: Pick<EncoreTake, 'id' | 'at' | 'instrument' | 'notes'>): boolean {
  if (a.id === b.id) return true;
  if (a.instrument !== b.instrument || a.notes.length !== b.notes.length || !a.notes.length) return false;
  const dt = Math.abs(Date.parse(a.at) - Date.parse(b.at));
  if (!(dt <= 30 * 60000)) return false;
  const sa = [...a.notes].sort((x, y) => x.on - y.on);
  const sb = [...b.notes].sort((x, y) => x.on - y.on);
  const a0 = sa[0].on;
  const b0 = sb[0].on;
  return sa.every((n, i) => n.pitch === sb[i].pitch && Math.abs(n.on - a0 - (sb[i].on - b0)) <= 25);
}
/** The clock offset (ms) between two copies of one take (0 when they share a clock), or null when not the same take. */
export function twinOffset(a: Pick<EncoreTake, 'id' | 'at' | 'instrument' | 'notes'>, b: Pick<EncoreTake, 'id' | 'at' | 'instrument' | 'notes'>): number | null {
  if (!sameTake(a, b)) return null;
  if (!a.notes.length) return 0;
  return Math.min(...a.notes.map((n) => n.on)) - Math.min(...b.notes.map((n) => n.on));
}
/**
 * A review's copy ("mem:") whose take the recordings keeper also stored, on the same clock: the stored take's id, so a
 * phrase kept from it points at My recordings (one take, kept by the library's rules) and the copy can go.
 */
export async function storedTwin(t: EncoreTake): Promise<string | null> {
  if (!t.id.startsWith('mem:')) return null;
  try {
    const rec = (await listTakes({ limit: 30 })).filter((r) => (r.notes?.byteLength ?? 0) > 3).map(encoreTakeOf);
    const hit = rec.find((r) => {
      const off = twinOffset(t, r);
      return off !== null && Math.abs(off) <= 25;
    });
    return hit?.id ?? null;
  } catch {
    return null;
  }
}
/** Forget a review's copy (after its phrase points at the stored take). */
export function dropMemoryTake(id: string): void {
  live.delete(id);
  writeMem(readMem().filter((x) => x.id !== id));
}
/** One entry per take: a stored take (My recordings) wins over its review copy; otherwise the first seen. */
export function dedupeTakes<T extends Pick<EncoreTake, 'id' | 'at' | 'instrument' | 'notes'>>(list: readonly T[]): T[] {
  const out: T[] = [];
  for (const t of list) {
    const i = out.findIndex((o) => sameTake(o, t));
    if (i < 0) out.push(t);
    else if (out[i].id.startsWith('mem:') && !t.id.startsWith('mem:')) out[i] = t;
  }
  return out;
}

/** The Encore address for a take and an optional span (seconds on the take's timeline). */
export function encoreTakeHash(takeId: string, span?: { from: number; to: number } | null): string {
  const q = new URLSearchParams({ take: takeId });
  if (span) {
    q.set('from', String(Math.round(Math.min(span.from, span.to) * 1000) / 1000));
    q.set('to', String(Math.round(Math.max(span.from, span.to) * 1000) / 1000));
  }
  return `#/encore/new?${q.toString()}`;
}

/**
 * "Keep this phrase" from any review: the take goes to Encore, which opens the trim screen on it. `beats` (optional) is
 * the span in beats of the take's grid (the looped / worst bars); it travels as seconds like every span.
 */
export function keepPhrase(t: Omit<EncoreTake, 'id' | 'at'>, beats?: { from: number; to: number } | null): void {
  const id = putMemoryTake(t);
  const P = t.bpm ? 60000 / t.bpm : 500;
  const span = beats ? { from: ((t.t0 ?? 0) + beats.from * P) / 1000, to: ((t.t0 ?? 0) + beats.to * P) / 1000 } : null;
  if (typeof location !== 'undefined') location.hash = encoreTakeHash(id, span).slice(1);
}

/** Parse the Encore route (`encore/new?take=…&from=…&to=…`, `encore/record`, `encore/phrase/<id>` …). */
export function parseEncoreHash(hash: string): { view: string; id?: string; take?: string; from?: number; to?: number } {
  const h = hash.replace(/^#\/?/, '');
  if (!h.startsWith('encore')) return { view: 'home' };
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').slice(1);
  const q = new URLSearchParams(query);
  const num = (k: string) => (q.has(k) && q.get(k) !== '' && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
  return { view: parts[0] || 'home', ...(parts[1] ? { id: decodeURIComponent(parts[1]) } : {}), ...(q.get('take') ? { take: q.get('take')! } : {}), ...(num('from') !== undefined ? { from: num('from') } : {}), ...(num('to') !== undefined ? { to: num('to') } : {}) };
}
