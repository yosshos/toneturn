// Encore's thin adapter over a take (SPEC-PHRASE-STUDIO §12.2). Encore never reads a recordings store directly: it asks
// this module for an EncoreTake — the fields of RecTake it needs, with the notes unpacked to milliseconds.
//
// Two sources:
//   1. The Recordings store (part A, src/storage/recordings.ts: listTakes / getTake). TODO(merge): when that module is on
//      the branch, `fromStore` reads RecTake through it (unpacking `notes`), and `recentFreeTakes` lists the shelf. Until
//      then both return nothing, and nothing here competes with that store.
//   2. In-memory takes handed over by a take review ("Keep this phrase"): kept in localStorage (small: notes only, the
//      last few), so Back or a reload returns to the same take (owner rule "never lose progress").
//
// The route `#/encore/new?take=<id>&from=<beat>&to=<beat>` (encoreBridge's openEncoreFromTake) resolves through
// `getEncoreTake(id)`. `from` / `to` are beats from the take's beat 0 when the tempo is known, else seconds × 2 at ♩120
// (the same thing: a beat of a ♩120 grid), so a span always means one thing.

import type { LickInstrument } from '../licks';

type T2 = { en: string; he: string };

/** One played note: MIDI pitch, onset / release in ms from the take's start, velocity 1–127. */
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
  kind: 'drill' | 'lick' | 'phrase' | 'chart' | 'improv' | 'guided' | 'record' | 'piece' | 'vocal' | 'song' | 'level-test';
  instrument: LickInstrument | 'drums';
  title: T2 | string;
  source: 'midi' | 'mic' | 'screen';
  notes: RawNote[];
  /** Known tempo (a click / band was playing): no tempo detection. */
  bpm?: number;
  meter?: number;
  /** Beat 0 in ms from the take's start, when the tempo is known. */
  t0?: number;
  /** The chord chart it was played over: bars separated by "|" (a bar may hold two chords, space separated). */
  chart?: string;
  /** Graded against written notes (a drill, a piece): Keep defaults to the looped / worst bars. */
  graded?: boolean;
  itemId?: string;
}

const MEM_KEY = 'tt.encore.takes.v1';
const MEM_MAX = 6;

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

/** Hand a take to Encore (from a review screen). Returns its id (prefixed "mem:"). */
export function putMemoryTake(t: Omit<EncoreTake, 'id' | 'at'> & { id?: string; at?: string }): string {
  const id = t.id && t.id.startsWith('mem:') ? t.id : `mem:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const take: EncoreTake = { ...t, id, at: t.at ?? new Date().toISOString() } as EncoreTake;
  live.set(id, take);
  writeMem([take, ...readMem().filter((x) => x.id !== id)]);
  return id;
}

/** TODO(merge, part A): read RecTake from src/storage/recordings.ts (getTake) and unpack its notes. */
async function fromStore(_id: string): Promise<EncoreTake | null> {
  return null;
}

/** A take by id: in memory first, then the Recordings store. */
export async function getEncoreTake(id: string): Promise<EncoreTake | null> {
  if (live.has(id)) return live.get(id)!;
  const m = readMem().find((x) => x.id === id);
  if (m) return m;
  return fromStore(id);
}
export const getEncoreTakeSync = (id: string): EncoreTake | null => live.get(id) ?? readMem().find((x) => x.id === id) ?? null;

/** The shelf "from your recent playing": the last free takes (improv, record, guided). TODO(merge): listTakes from part A. */
export function recentFreeTakes(n = 10): EncoreTake[] {
  return readMem()
    .filter((t) => t.kind === 'improv' || t.kind === 'record' || t.kind === 'guided' || t.kind === 'chart')
    .slice(0, n);
}

/** The Encore address for a take and an optional span (beats). */
export function encoreTakeHash(takeId: string, span?: { from: number; to: number } | null): string {
  const q = new URLSearchParams({ take: takeId });
  if (span) {
    q.set('from', String(Math.round(span.from * 100) / 100));
    q.set('to', String(Math.round(span.to * 100) / 100));
  }
  return `#/encore/new?${q.toString()}`;
}

/** "Keep this phrase" from any review: the take goes to Encore, which opens the trim screen on it. */
export function keepPhrase(t: Omit<EncoreTake, 'id' | 'at'>, span?: { from: number; to: number } | null): void {
  const id = putMemoryTake(t);
  if (typeof location !== 'undefined') location.hash = encoreTakeHash(id, span).slice(1);
}

/** Parse the Encore route (`encore/new?take=…&from=…&to=…`, `encore/record`, `encore/phrase/<id>` …). */
export function parseEncoreHash(hash: string): { view: string; id?: string; take?: string; from?: number; to?: number } {
  const h = hash.replace(/^#\/?/, '');
  if (!h.startsWith('encore')) return { view: 'home' };
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').slice(1);
  const q = new URLSearchParams(query);
  const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
  return { view: parts[0] || 'home', ...(parts[1] ? { id: decodeURIComponent(parts[1]) } : {}), ...(q.get('take') ? { take: q.get('take')! } : {}), ...(num('from') !== undefined ? { from: num('from') } : {}), ...(num('to') !== undefined ? { to: num('to') } : {}) };
}
