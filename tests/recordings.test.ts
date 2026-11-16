import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AUDIO_BUDGET,
  BIN_DAYS,
  PRUNE_DAYS,
  SESSION_GAP_MS,
  _resetRecordings,
  budgetPlan,
  cleanupPlan,
  deleteTake,
  emptyBin,
  getTake,
  getTakeAudio,
  groupBySession,
  indexedRecordingStore,
  listFolders,
  listSessions,
  listTakes,
  matchesFilter,
  memoryRecordingStore,
  migrateVocalTakes,
  packNotes,
  purgeTake,
  renameTake,
  restoreTake,
  runCleanup,
  saveTake,
  sessionFor,
  setRecordingContext,
  setRecordingPrefs,
  setRecordingStore,
  setTakeFolder,
  starTake,
  storageUsage,
  takeTitle,
  thenAndNowOf,
  unpackNotes,
  updateTakes,
  type NewTake,
  type RecTake,
} from '../src/storage/recordings';
import type { PlayedNote } from '../src/engine/drills/types';

const DAY = 86_400_000;
const T0 = Date.parse('2026-11-16T08:00:00Z');
const notes = (n: number, step = 250): PlayedNote[] => Array.from({ length: n }, (_, i) => ({ pitch: 60 + (i % 12), on: i * step, off: i * step + 200, vel: 70 }));
const drill = (over: Partial<NewTake> = {}): NewTake => ({ durationMs: 4000, course: 'keys', instrument: 'piano', kind: 'drill', itemId: 'scales:C', title: { en: 'C major', he: 'דו מז׳ור' }, sung: false, source: 'midi', played: notes(8), bpm: 100, meter: 4, t0: 0, result: { verdict: 'clean', acc: 0.97, bpm: 100 }, ...over });
const blob = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'audio/webm' });

beforeEach(() => {
  _resetRecordings();
  setRecordingStore(memoryRecordingStore());
});
afterEach(() => _resetRecordings());

describe('packed notes', () => {
  it('round-trips pitch, onset, duration, velocity, held notes and negative onsets', () => {
    const ns: PlayedNote[] = [
      { pitch: 60, on: -120, off: 100, vel: 64 },
      { pitch: 64, on: 0, off: null, vel: 90 },
      { pitch: 127, on: 70_000, off: 70_500, vel: 1 },
      { pitch: 0, on: 70_000, off: 70_001, vel: 127 },
    ];
    const back = unpackNotes(packNotes(ns));
    expect(back).toEqual([...ns].sort((a, b) => a.on - b.on));
  });
  it('keeps the band instrument byte and stays near 6 bytes a note', () => {
    const ns = notes(3000, 200).map((n, i) => ({ ...n, inst: i % 3 }));
    const p = packNotes(ns, true);
    expect(unpackNotes(p)[5].inst).toBe(2);
    expect(p.byteLength / 3000).toBeLessThan(7.2);
    expect(packNotes(notes(3000, 200)).byteLength).toBeLessThan(3000 * 6.2);
  });
  it('a bad pack reads as no notes', () => {
    expect(unpackNotes(new Uint8Array([9, 0, 0]))).toEqual([]);
    expect(unpackNotes(undefined)).toEqual([]);
  });
});

describe('saveTake and sessions', () => {
  it('keeps a take with packed notes, in a session that takes the next take within the gap', async () => {
    setRecordingContext(() => ({ route: 'drills', course: 'keys', measuredMs: 60_000 }));
    const a = await saveTake(drill(), null, { now: T0 });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(unpackNotes(a.take.notes)).toHaveLength(8);
    setRecordingContext(() => ({ route: 'drills', course: 'keys', measuredMs: 300_000 }));
    const b = await saveTake(drill({ itemId: 'scales:G' }), null, { now: T0 + 5 * 60_000 });
    const c = await saveTake(drill(), null, { now: T0 + 5 * 60_000 + SESSION_GAP_MS + 1 });
    expect(b.ok && c.ok).toBe(true);
    if (!b.ok || !c.ok) return;
    expect(b.take.sessionId).toBe(a.take.sessionId);
    expect(c.take.sessionId).not.toBe(a.take.sessionId);
    const ses = await listSessions();
    expect(ses).toHaveLength(2);
    const first = ses.find((s) => s.id === a.take.sessionId)!;
    expect(first.takeIds).toEqual([a.take.id, b.take.id]);
    expect(first.measuredMs).toBe(240_000);
    expect(first.route).toBe('drills');
  });
  it('a session holding two courses has no single course', async () => {
    const a = await saveTake(drill(), null, { now: T0 });
    await saveTake(drill({ course: 'guitar', instrument: 'guitar' }), null, { now: T0 + 1000 });
    const s = (await listSessions())[0];
    expect(a.ok && s.id === a.take.sessionId).toBe(true);
    expect(s.course).toBeNull();
  });
  it('drops very short takes and respects the notes switch (starred / Encore takes still kept)', async () => {
    expect(await saveTake(drill({ played: notes(2) }), null, { now: T0 })).toEqual({ ok: false, reason: 'short' });
    // a sung take with two seconds of audio and no notes is kept
    const sung = await saveTake(drill({ played: [], kind: 'vocal', sung: true, source: 'mic', durationMs: 2500 }), blob(20_000), { now: T0 });
    expect(sung.ok && sung.audio).toBe('kept');
    setRecordingPrefs({ keepNotes: false });
    expect(await saveTake(drill(), null, { now: T0 })).toEqual({ ok: false, reason: 'off' });
    expect((await saveTake(drill({ star: true }), null, { now: T0 })).ok).toBe(true);
    expect((await saveTake(drill({ kind: 'phrase' }), null, { now: T0 })).ok).toBe(true);
  });
  it('audio: kept by default, off with the switch, notes only when the device is full', async () => {
    const a = await saveTake(drill({ source: 'mic' }), blob(5000), { now: T0 });
    expect(a.ok && a.audio).toBe('kept');
    if (a.ok) expect((await getTakeAudio(a.take.id))?.size).toBe(5000);
    setRecordingPrefs({ keepAudio: false });
    const b = await saveTake(drill({ source: 'mic' }), blob(5000), { now: T0 });
    expect(b.ok && b.audio).toBe('off');
    if (b.ok) expect(b.take.audioId).toBeUndefined();
    setRecordingPrefs({ keepAudio: true });
    setRecordingStore(memoryRecordingStore(1000));
    const c = await saveTake(drill({ source: 'mic' }), blob(5000), { now: T0 });
    expect(c.ok && c.audio).toBe('quota');
    if (c.ok) expect(c.take.notes).toBeDefined();
    expect((await storageUsage()).quotaAt).toBeTruthy();
  });
});

describe('library actions', () => {
  it('rename (trimmed, 60 chars, empty keeps), star, folders, delete to the bin, restore, purge', async () => {
    const r = await saveTake(drill(), blob(100), { now: T0 });
    if (!r.ok) throw new Error('not kept');
    const id = r.take.id;
    await renameTake(id, '   My   best   run  ');
    expect(takeTitle((await getTake(id))!, 'he')).toBe('My best run');
    await renameTake(id, '   ');
    expect(takeTitle((await getTake(id))!, 'en')).toBe('My best run');
    await renameTake(id, 'x'.repeat(80));
    expect(takeTitle((await getTake(id))!, 'en')).toHaveLength(60);
    await starTake(id, true);
    expect((await listTakes({ starred: true })).map((t) => t.id)).toEqual([id]);
    await starTake(id, false);
    expect(await listTakes({ starred: true })).toHaveLength(0);
    await setTakeFolder(id, ' Best solos ');
    expect(await listFolders()).toEqual([{ name: 'Best solos', count: 1 }]);
    await deleteTake(id, T0);
    expect(await listTakes()).toHaveLength(0);
    expect((await listTakes({ bin: true })).map((t) => t.id)).toEqual([id]);
    await restoreTake(id);
    expect(await listTakes()).toHaveLength(1);
    await purgeTake(id);
    expect(await getTake(id)).toBeNull();
    expect(await listSessions()).toHaveLength(0);
    expect((await storageUsage()).audioBytes).toBe(0);
  });
  it('bulk star, move and delete; empty the bin', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await saveTake(drill(), null, { now: T0 + i * 1000 });
      if (r.ok) ids.push(r.take.id);
    }
    await updateTakes(ids.slice(0, 2), { star: true, folder: 'For my teacher' });
    expect(await listTakes({ starred: true, folder: 'For my teacher' })).toHaveLength(2);
    await updateTakes(ids, { deleted: true });
    expect(await listTakes()).toHaveLength(0);
    expect(await emptyBin()).toBe(3);
    expect(await listTakes({ bin: true })).toHaveLength(0);
  });
});

describe('filters and search', () => {
  const t = (o: Partial<RecTake>): RecTake => ({ id: 'x', sessionId: 's', at: '2026-11-16T08:00:00.000Z', durationMs: 1, course: 'keys', instrument: 'piano', kind: 'drill', title: { en: 'Scale in A♭ major', he: 'סולם לה♭ מז׳ור' }, sung: false, source: 'midi', ...o });
  it('course, kind, sung, media, starred, folder, item, dates and the bin', () => {
    expect(matchesFilter(t({}), { course: 'keys' })).toBe(true);
    expect(matchesFilter(t({}), { course: 'voice' })).toBe(false);
    expect(matchesFilter(t({ kind: 'vocal' }), { kind: ['drill', 'lick'] })).toBe(false);
    expect(matchesFilter(t({ sung: true }), { sung: true })).toBe(true);
    expect(matchesFilter(t({ source: 'mic' }), { media: 'midi' })).toBe(false);
    expect(matchesFilter(t({ source: 'screen' }), { media: 'midi' })).toBe(true);
    expect(matchesFilter(t({}), { media: 'audio' })).toBe(false);
    expect(matchesFilter(t({ audioId: 'a' }), { media: 'audio' })).toBe(true);
    expect(matchesFilter(t({ folder: 'A' }), { folder: 'A' })).toBe(true);
    expect(matchesFilter(t({}), { from: '2026-11-17' })).toBe(false);
    expect(matchesFilter(t({ deletedAt: 'x' }), {})).toBe(false);
    expect(matchesFilter(t({ deletedAt: 'x' }), { bin: true })).toBe(true);
  });
  it('search: either language, tags, folder, month names, words in any order', () => {
    expect(matchesFilter(t({}), { q: 'major a♭' })).toBe(true);
    expect(matchesFilter(t({}), { q: 'מז׳ור' })).toBe(true);
    expect(matchesFilter(t({}), { q: 'נובמבר' })).toBe(true);
    expect(matchesFilter(t({}), { q: 'november' })).toBe(true);
    expect(matchesFilter(t({ tags: ['bebop'] }), { q: 'BEBOP' })).toBe(true);
    expect(matchesFilter(t({}), { q: 'guitar' })).toBe(false);
  });
  it('groups takes into sessions, newest first', () => {
    const g = groupBySession([t({ id: 'a', sessionId: 's1', at: '2026-11-15T08:00:00Z' }), t({ id: 'b', sessionId: 's2', at: '2026-11-16T08:00:00Z' }), t({ id: 'c', sessionId: 's1', at: '2026-11-15T08:10:00Z' })], []);
    expect(g.map((x) => x.session.id)).toEqual(['s2', 's1']);
    expect(g[1].takes.map((x) => x.id)).toEqual(['c', 'a']);
  });
  it('sessionFor joins only within the gap', () => {
    const s = { id: 's', startedAt: new Date(T0).toISOString(), endedAt: new Date(T0 + 60_000).toISOString(), course: null, route: '', measuredMs: 0, takeIds: [] };
    expect(sessionFor([s], T0 + 60_000 + SESSION_GAP_MS)).toBe(s);
    expect(sessionFor([s], T0 + 60_001 + SESSION_GAP_MS)).toBeNull();
    expect(sessionFor([], T0)).toBeNull();
  });
});

describe('retention and budget', () => {
  const t = (id: string, daysAgo: number, o: Partial<RecTake> = {}): RecTake => ({ id, sessionId: 's', at: new Date(T0 - daysAgo * DAY).toISOString(), durationMs: 1, course: 'voice', instrument: 'voice', kind: 'vocal', title: 'x', sung: true, source: 'mic', audioId: `a-${id}`, audioBytes: 100, ...o });
  it('the plan: bin older than 30 days purged; unstarred audio older than 60 days pruned; protected never', () => {
    const p = cleanupPlan(
      [t('old', PRUNE_DAYS + 1), t('young', PRUNE_DAYS - 1), t('star', 200, { star: true }), t('folder', 200, { folder: 'f' }), t('phrase', 200, { phraseIds: ['p'] }), t('binOld', 1, { deletedAt: new Date(T0 - (BIN_DAYS + 1) * DAY).toISOString() }), t('binNew', 1, { deletedAt: new Date(T0 - 2 * DAY).toISOString() }), t('notesOnly', 400, { audioId: undefined })],
      T0,
    );
    expect(p.purge).toEqual(['binOld']);
    expect(p.prune).toEqual(['old']);
  });
  it('runCleanup turns old audio into notes only and keeps the take', async () => {
    const r = await saveTake(drill({ source: 'mic' }), blob(500), { now: T0 - (PRUNE_DAYS + 2) * DAY });
    const s = await saveTake(drill({ source: 'mic', star: true }), blob(500), { now: T0 - (PRUNE_DAYS + 2) * DAY + 1000 });
    if (!r.ok || !s.ok) throw new Error('not kept');
    await deleteTake(s.take.id, T0 - (BIN_DAYS + 1) * DAY);
    const res = await runCleanup(T0);
    expect(res).toEqual({ purged: 1, pruned: 1 });
    const kept = await getTake(r.take.id);
    expect(kept?.audioId).toBeUndefined();
    expect(kept?.prunedAt).toBeTruthy();
    expect(kept?.notes).toBeDefined();
    expect(await getTake(s.take.id)).toBeNull();
  });
  it('budget math: bin audio first, then the oldest unprotected; null when it cannot fit', () => {
    const takes = [t('a', 10), t('b', 5), t('c', 1, { star: true }), t('d', 20, { deletedAt: 'x' })];
    expect(budgetPlan(takes, 50, 1000)).toEqual([]);
    expect(budgetPlan(takes, 150, 400)).toEqual(['d', 'a']);
    expect(budgetPlan(takes, 350, 400)).toBeNull();
    expect(AUDIO_BUDGET).toBe(500e6);
  });
  it('saving over the budget makes room from old unprotected audio and says so', async () => {
    setRecordingPrefs({ budget: 1000 });
    const a = await saveTake(drill({ source: 'mic' }), blob(600), { now: T0 });
    const b = await saveTake(drill({ source: 'mic', star: true }), blob(300), { now: T0 + 1000 });
    const c = await saveTake(drill({ source: 'mic' }), blob(600), { now: T0 + 2000 });
    if (!a.ok || !b.ok || !c.ok) throw new Error('not kept');
    expect(c.audio).toBe('kept');
    expect((await getTake(a.take.id))?.audioId).toBeUndefined();
    expect((await getTake(b.take.id))?.audioId).toBeDefined();
    const u = await storageUsage();
    expect(u.audioBytes).toBe(900);
    expect(u.autoPrune?.n).toBe(1);
    const d = await saveTake(drill({ source: 'mic' }), blob(2000), { now: T0 + 3000 });
    expect(d.ok && d.audio).toBe('budget');
  });
});

describe('then and now, migration', () => {
  it('then-and-now pairs need audio in two different weeks', () => {
    const t = (id: string, at: string): RecTake => ({ id, sessionId: 's', at, durationMs: 1, course: 'voice', instrument: 'voice', kind: 'vocal', itemId: 'hold-1', title: 'x', sung: true, source: 'mic', audioId: 'a' + id });
    expect(thenAndNowOf([t('a', '2026-11-02T10:00:00Z'), t('b', '2026-11-03T10:00:00Z')])).toHaveLength(0);
    const p = thenAndNowOf([t('a', '2026-10-01T10:00:00Z'), t('c', '2026-11-16T10:00:00Z'), t('b', '2026-11-03T10:00:00Z')]);
    expect(p.map((x) => [x.then.id, x.now.id])).toEqual([['a', 'c']]);
  });
  it('copies the old vocal takes once, with audio, as vocal takes of the voice course', async () => {
    const old = [
      { item: 'hold-2', week: '2026-W40', score: 0.7, at: '2026-10-01T10:00:00Z', blob: blob(300) },
      { item: 'range-1#2', week: '2026-W46', score: 0.9, at: '2026-11-12T10:00:00Z', blob: blob(400) },
    ];
    expect(await migrateVocalTakes(async () => old)).toBe(2);
    expect(await migrateVocalTakes(async () => old)).toBe(0);
    const ts = await listTakes({ kind: 'vocal' });
    expect(ts).toHaveLength(2);
    expect(ts[0]).toMatchObject({ itemId: 'range-1', course: 'voice', sung: true, source: 'mic', audioBytes: 400 });
    expect((await getTakeAudio(ts[1].id))?.size).toBe(300);
    expect((await storageUsage()).withAudio).toBe(2);
  });
});

describe('IndexedDB store (fake-indexeddb)', () => {
  it('survives a reopen (a reload): takes, sessions, audio, stars', async () => {
    const name = `rec-test-${Math.random()}`;
    setRecordingStore(indexedRecordingStore(name));
    const r = await saveTake(drill({ source: 'mic' }), blob(1234), { now: T0 });
    if (!r.ok) throw new Error('not kept');
    await starTake(r.take.id, true);
    // a fresh store on the same database = the page reloaded
    setRecordingStore(indexedRecordingStore(name));
    const back = await getTake(r.take.id);
    expect(back?.star).toBe(true);
    expect(unpackNotes(back?.notes)).toHaveLength(8);
    expect((await getTakeAudio(r.take.id))?.size).toBe(1234);
    expect(await listSessions()).toHaveLength(1);
  });
});
