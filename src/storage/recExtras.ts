// My recordings v2 (SPEC-PHRASE-STUDIO §6.5, §12.2): playlists, the cache of rendered audio (MIDI takes rendered with
// the app's instruments, A–B spans bounced to short clips — for background / lock-screen playback), and whole-session
// recordings. All on this device, in the same IndexedDB store as the takes; all inside the audio budget.

import { allTakeHeads, audioBytesOf, notifyRecordings, recordingPrefs, recStore, setAudioReserve, takeTitle, type AudioRow, type RecPlaylist, type RecSession, type TakeHead } from './recordings';

type T2 = { en: string; he: string };
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ───────────────────────────── playlists (pure) ─────────────────────────────

export const STARRED_ID = 'pl-starred';
export const PLAYLIST_MAX = 200;
export type LoopMode = RecPlaylist['loop'] | 'off';

export function newPlaylist(name: string | T2, takeIds: string[] = [], now = new Date().toISOString()): RecPlaylist {
  return { id: uid('pl'), name: typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Playlist' : name, takeIds: [...new Set(takeIds)].slice(0, PLAYLIST_MAX), loop: 'all', createdAt: now };
}
/** Add takes at the end (no duplicates, capped). */
export const addToPlaylist = (p: RecPlaylist, ids: readonly string[]): RecPlaylist => ({ ...p, takeIds: [...new Set([...p.takeIds, ...ids])].slice(0, PLAYLIST_MAX) });
export const removeFromPlaylist = (p: RecPlaylist, id: string): RecPlaylist => ({ ...p, takeIds: p.takeIds.filter((x) => x !== id), ...(p.abTake === id ? { abTake: undefined, ab: undefined, loop: p.loop === 'ab' ? 'all' : p.loop } : {}) });
/** Move the take at `from` to `to` (reorder). */
export function moveInPlaylist(p: RecPlaylist, from: number, to: number): RecPlaylist {
  const ids = [...p.takeIds];
  if (from < 0 || from >= ids.length) return p;
  const [x] = ids.splice(from, 1);
  ids.splice(Math.max(0, Math.min(ids.length, to)), 0, x);
  return { ...p, takeIds: ids };
}
/** Loop one / all / A–B (the span of one take, in seconds on its timeline). */
export function setLoop(p: RecPlaylist, loop: RecPlaylist['loop'], ab?: { take: string; span: [number, number] }): RecPlaylist {
  if (loop === 'ab' && ab && ab.span[1] > ab.span[0]) return { ...p, loop, ab: ab.span, abTake: ab.take };
  if (loop === 'ab') return p;
  return { ...p, loop, ab: undefined, abTake: undefined };
}
/** "Starred on a loop" — automatic: every starred take, newest first. */
export function starredPlaylist(heads: readonly Pick<TakeHead, 'id' | 'at' | 'star' | 'deletedAt'>[]): RecPlaylist {
  const ids = heads.filter((h) => h.star && !h.deletedAt).sort((a, b) => b.at.localeCompare(a.at)).map((h) => h.id).slice(0, PLAYLIST_MAX);
  return { id: STARRED_ID, name: { en: 'Starred on a loop', he: 'המועדפים בלולאה' }, takeIds: ids, loop: 'all' };
}
/** Folders as playlists too (§6.5). */
export function folderPlaylists(heads: readonly Pick<TakeHead, 'id' | 'at' | 'folder' | 'deletedAt'>[]): RecPlaylist[] {
  const by = new Map<string, Pick<TakeHead, 'id' | 'at'>[]>();
  for (const h of heads) if (h.folder && !h.deletedAt) by.set(h.folder, [...(by.get(h.folder) ?? []), h]);
  return [...by.entries()].map(([f, hs]) => ({ id: `pl-folder:${f}`, name: f, takeIds: hs.sort((a, b) => a.at.localeCompare(b.at)).map((h) => h.id), loop: 'all' as const }));
}
/** The next index in a queue (null = stop): loop one stays, all wraps, off stops at the end. */
export function nextIndex(i: number, n: number, loop: LoopMode, dir: 1 | -1 = 1): number | null {
  if (n <= 0) return null;
  if (loop === 'one' || loop === 'ab') return i;
  const j = i + dir;
  if (j >= 0 && j < n) return j;
  return loop === 'all' ? (j + n) % n : null;
}
export const playlistName = (p: RecPlaylist, lang: 'en' | 'he') => takeTitle({ title: p.name }, lang);

// ───────────────────────────── playlists (store) ─────────────────────────────

export async function listPlaylists(): Promise<RecPlaylist[]> {
  const own = (await recStore().all<RecPlaylist>('playlists')).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const heads = await allTakeHeads();
  const alive = new Set(heads.filter((h) => !h.deletedAt).map((h) => h.id));
  return [starredPlaylist(heads), ...own.map((p) => ({ ...p, takeIds: p.takeIds.filter((id) => alive.has(id)) })), ...folderPlaylists(heads)];
}
export async function getPlaylist(id: string): Promise<RecPlaylist | null> {
  if (id === STARRED_ID || id.startsWith('pl-folder:')) return (await listPlaylists()).find((p) => p.id === id) ?? null;
  return recStore().get<RecPlaylist>('playlists', id);
}
/** Save an own playlist (the automatic ones keep only their loop mode, in meta). */
export async function savePlaylist(p: RecPlaylist): Promise<void> {
  if (p.id === STARRED_ID || p.id.startsWith('pl-folder:')) {
    await recStore().put('meta', { id: `loop:${p.id}`, v: { loop: p.loop, ab: p.ab, abTake: p.abTake } } as { id: string });
  } else await recStore().put('playlists', p);
  notifyRecordings();
}
export async function loopOf(p: RecPlaylist): Promise<RecPlaylist> {
  if (p.id !== STARRED_ID && !p.id.startsWith('pl-folder:')) return p;
  const m = await recStore().get<{ id: string; v: Pick<RecPlaylist, 'loop' | 'ab' | 'abTake'> }>('meta', `loop:${p.id}`);
  return m ? { ...p, ...m.v } : p;
}
export async function deletePlaylist(id: string): Promise<void> {
  await recStore().del('playlists', id);
  notifyRecordings();
}
export async function addTakesTo(playlistId: string | null, ids: string[], newName?: string): Promise<RecPlaylist> {
  const have = playlistId ? await recStore().get<RecPlaylist>('playlists', playlistId) : null;
  const p = have ? addToPlaylist(have, ids) : newPlaylist(newName ?? 'Playlist', ids);
  await savePlaylist(p);
  return p;
}

// ───────────────────────────── the render cache (pure) ─────────────────────────────

/** Rendered audio may hold at most this much (and never more than the budget left over by the takes' own audio). */
export const RENDER_CAP = 60e6;
export interface RenderEntry {
  /** cache key: `t:<takeId>:<mix>` (a whole take) or `c:<takeId>:<a>:<b>:<mix>` (a bounced A–B clip) */
  key: string;
  takeId: string;
  bytes: number;
  type: string;
  /** last used (ISO) — the least recently used goes first */
  used: string;
  seconds: number;
}
export const renderKey = (takeId: string, mix: string, span?: [number, number] | null) => (span ? `c:${takeId}:${span[0].toFixed(2)}:${span[1].toFixed(2)}:${mix}` : `t:${takeId}:${mix}`);
/**
 * Make room for `need` bytes: the least recently used entries to drop, or null when it cannot fit (larger than the
 * room at all). `room` = min(RENDER_CAP, budget − the takes' own audio − session recordings).
 */
export function renderEvictPlan(entries: readonly RenderEntry[], need: number, room: number): string[] | null {
  if (need > room) return null;
  let used = entries.reduce((a, e) => a + e.bytes, 0);
  const out: string[] = [];
  for (const e of [...entries].sort((a, b) => a.used.localeCompare(b.used))) {
    if (used + need <= room) break;
    out.push(e.key);
    used -= e.bytes;
  }
  return used + need <= room ? out : null;
}
export const renderRoom = (budget: number, takesAudio: number, sessionAudio: number) => Math.max(0, Math.min(RENDER_CAP, budget - takesAudio - sessionAudio));

// ───────────────────────────── the render cache (store) ─────────────────────────────

type Index<T> = { id: string; v: Record<string, T> };
const readIndex = async <T>(id: string): Promise<Record<string, T>> => (await recStore().get<Index<T>>('meta', id))?.v ?? {};
const writeIndex = async <T>(id: string, v: Record<string, T>) => recStore().put('meta', { id, v } as Index<T>);
export interface SessionAudioEntry {
  sessionId: string;
  bytes: number;
  type: string;
  startedAt: string;
  endedAt: string;
  /** Where each take of the session sits in the file (ms from its start). */
  marks: { takeId: string; at: number }[];
}

/** Recompute the reserve (renders + session recordings) and hand it to the budget. */
export async function refreshReserve(): Promise<number> {
  const r = Object.values(await readIndex<RenderEntry>('renders')).reduce((a, e) => a + e.bytes, 0);
  const s = Object.values(await readIndex<SessionAudioEntry>('sessionAudio')).reduce((a, e) => a + e.bytes, 0);
  setAudioReserve(r + s);
  return r + s;
}

export async function getRender(key: string): Promise<Blob | null> {
  const idx = await readIndex<RenderEntry>('renders');
  const e = idx[key];
  if (!e) return null;
  const row = await recStore().get<AudioRow>('audio', `r-${key}`);
  if (!row?.blob) {
    delete idx[key];
    await writeIndex('renders', idx);
    return null;
  }
  idx[key] = { ...e, used: new Date().toISOString() };
  await writeIndex('renders', idx);
  return row.blob;
}
/** Keep a rendered blob (false when it does not fit: it is still played, just not kept). */
export async function putRender(key: string, takeId: string, blob: Blob, seconds: number): Promise<boolean> {
  const idx = await readIndex<RenderEntry>('renders');
  const heads = await allTakeHeads();
  const sess = Object.values(await readIndex<SessionAudioEntry>('sessionAudio')).reduce((a, e) => a + e.bytes, 0);
  const others = Object.values(idx).filter((e) => e.key !== key);
  const plan = renderEvictPlan(others, blob.size, renderRoom(recordingPrefs().budget, audioBytesOf(heads), sess));
  if (!plan) return false;
  for (const k of plan) {
    await recStore().del('audio', `r-${k}`);
    delete idx[k];
  }
  const r = await recStore().put('audio', { id: `r-${key}`, blob, bytes: blob.size, type: blob.type || 'audio/wav' } as AudioRow);
  if (!r.ok) {
    await writeIndex('renders', idx);
    return false;
  }
  idx[key] = { key, takeId, bytes: blob.size, type: blob.type || 'audio/wav', used: new Date().toISOString(), seconds };
  await writeIndex('renders', idx);
  await refreshReserve();
  return true;
}
/** Drop the renders of takes that are gone (deleted for good). */
export async function pruneRenders(alive: ReadonlySet<string>): Promise<number> {
  const idx = await readIndex<RenderEntry>('renders');
  let n = 0;
  for (const [k, e] of Object.entries(idx))
    if (!alive.has(e.takeId)) {
      await recStore().del('audio', `r-${k}`);
      delete idx[k];
      n++;
    }
  if (n) {
    await writeIndex('renders', idx);
    await refreshReserve();
  }
  return n;
}
export async function renderBytes(): Promise<number> {
  return Object.values(await readIndex<RenderEntry>('renders')).reduce((a, e) => a + e.bytes, 0);
}

// ───────────────────────────── session recordings (store) ─────────────────────────────

/** Keep a whole-session recording on its session (the session the takes made in that time joined, else its own). */
export async function putSessionAudio(blob: Blob, e: Omit<SessionAudioEntry, 'bytes' | 'type' | 'sessionId'>, sessionId: string | null): Promise<string | null> {
  const s = recStore();
  const sessions = await s.all<RecSession>('sessions');
  let ses = sessionId ? sessions.find((x) => x.id === sessionId) : undefined;
  if (!ses) {
    ses = { id: uid('ses'), startedAt: e.startedAt, endedAt: e.endedAt, course: null, route: 'session', measuredMs: 0, takeIds: [] };
  }
  const heads = await allTakeHeads();
  const idx = await readIndex<SessionAudioEntry>('sessionAudio');
  const rend = await renderBytes();
  const sess = Object.values(idx).filter((x) => x.sessionId !== ses!.id).reduce((a, x) => a + x.bytes, 0);
  if (audioBytesOf(heads) + rend + sess + blob.size > recordingPrefs().budget) return null;
  const aid = `s-${ses.id}`;
  const r = await s.put('audio', { id: aid, blob, bytes: blob.size, type: blob.type || 'audio/webm' } as AudioRow);
  if (!r.ok) return null;
  await s.put('sessions', { ...ses, audioId: aid, endedAt: e.endedAt > ses.endedAt ? e.endedAt : ses.endedAt, startedAt: e.startedAt < ses.startedAt ? e.startedAt : ses.startedAt });
  idx[ses.id] = { sessionId: ses.id, bytes: blob.size, type: blob.type || 'audio/webm', startedAt: e.startedAt, endedAt: e.endedAt, marks: e.marks };
  await writeIndex('sessionAudio', idx);
  await refreshReserve();
  notifyRecordings();
  return ses.id;
}
export async function sessionAudioOf(sessionId: string): Promise<{ blob: Blob; entry: SessionAudioEntry } | null> {
  const idx = await readIndex<SessionAudioEntry>('sessionAudio');
  const entry = idx[sessionId];
  if (!entry) return null;
  const row = await recStore().get<AudioRow>('audio', `s-${sessionId}`);
  return row?.blob ? { blob: row.blob, entry } : null;
}
export async function deleteSessionAudio(sessionId: string): Promise<void> {
  const idx = await readIndex<SessionAudioEntry>('sessionAudio');
  delete idx[sessionId];
  await writeIndex('sessionAudio', idx);
  await recStore().del('audio', `s-${sessionId}`);
  const ses = await recStore().get<RecSession>('sessions', sessionId);
  if (ses) {
    const { audioId: _a, ...rest } = ses;
    void _a;
    await recStore().put('sessions', rest as RecSession);
  }
  await refreshReserve();
  notifyRecordings();
}
export async function sessionAudioIndex(): Promise<Record<string, SessionAudioEntry>> {
  return readIndex<SessionAudioEntry>('sessionAudio');
}
