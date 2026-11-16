// My recordings v2 (SPEC-PHRASE-STUDIO §6.5–6.6): the playlist model, the queue and lock-screen metadata, the render
// cache inside the audio budget, A/B alignment and measured deltas, the progress points, the .mid writer, the
// whole-session recording's bookkeeping, normalisation and the loop seam.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetRecordings, getSession, memoryRecordingStore, saveTake, setAudioReserve, setRecordingPrefs, setRecordingStore, storageUsage, type NewTake } from '../src/storage/recordings';
import {
  addToPlaylist, folderPlaylists, getRender, listPlaylists, moveInPlaylist, newPlaylist, nextIndex, putRender, putSessionAudio, refreshReserve, removeFromPlaylist, renderEvictPlan, renderKey, renderRoom, savePlaylist, sessionAudioOf, setLoop, starredPlaylist, RENDER_CAP, type RenderEntry,
} from '../src/storage/recExtras';
import { bgNext, mediaMetadataOf } from '../src/audio/bgPlayer';
import { alignTakes, compareDeltas, comparePlan, progressPoints, takeTempo, timingSpread, type CmpTake } from '../src/engine/recCompare';
import { midiFileOf, readMidiNotes, PPQ } from '../src/engine/midiFile';
import { markTake, sessionBytes, shouldStop, startBook, takeAt, SESSION_REC_MAX_MS } from '../src/storage/sessionRec';
import { fadeEnds, normGain, renderedBytes, TARGET_RMS } from '../src/audio/renderTake';
import { SESSION_GAP_MS } from '../src/storage/recordings';

const blob = (bytes: number, type = 'audio/wav') => new Blob([new Uint8Array(bytes)], { type });
const take = (over: Partial<NewTake> = {}): NewTake => ({ durationMs: 4000, course: 'keys', instrument: 'piano', kind: 'drill', itemId: 'x', title: 'C major', sung: false, source: 'midi', played: Array.from({ length: 8 }, (_, i) => ({ pitch: 60 + i, on: i * 250, off: i * 250 + 200, vel: 70 })), bpm: 120, ...over });

beforeEach(() => {
  _resetRecordings();
  setAudioReserve(0);
  setRecordingStore(memoryRecordingStore());
});
afterEach(() => {
  _resetRecordings();
  setAudioReserve(0);
});

describe('playlists', () => {
  it('create, add without duplicates, reorder, remove, loop one / all / A–B', () => {
    let p = newPlaylist('  Commute  ', ['a', 'b', 'a']);
    expect(p.name).toBe('Commute');
    expect(p.takeIds).toEqual(['a', 'b']);
    p = addToPlaylist(p, ['b', 'c', 'd']);
    expect(p.takeIds).toEqual(['a', 'b', 'c', 'd']);
    p = moveInPlaylist(p, 3, 0);
    expect(p.takeIds).toEqual(['d', 'a', 'b', 'c']);
    p = moveInPlaylist(p, 0, 9);
    expect(p.takeIds).toEqual(['a', 'b', 'c', 'd']);
    p = setLoop(p, 'ab', { take: 'c', span: [1, 3] });
    expect(p).toMatchObject({ loop: 'ab', ab: [1, 3], abTake: 'c' });
    expect(setLoop(p, 'ab', { take: 'c', span: [3, 1] })).toBe(p); // an empty span changes nothing
    p = removeFromPlaylist(p, 'c');
    expect(p.loop).toBe('all');
    expect(p.abTake).toBeUndefined();
    expect(setLoop(p, 'one').loop).toBe('one');
  });
  it('starred and folders are automatic playlists', () => {
    const hs = [
      { id: 'a', at: '2026-11-10', star: true },
      { id: 'b', at: '2026-11-12', star: true },
      { id: 'c', at: '2026-11-13', star: true, deletedAt: '2026-11-14' },
      { id: 'd', at: '2026-11-11', folder: 'Solos' },
    ];
    expect(starredPlaylist(hs).takeIds).toEqual(['b', 'a']);
    expect(folderPlaylists(hs)).toEqual([{ id: 'pl-folder:Solos', name: 'Solos', takeIds: ['d'], loop: 'all' }]);
  });
  it('are kept in the store and drop takes that are gone', async () => {
    const r = await saveTake(take());
    expect(r.ok).toBe(true);
    const id = r.ok ? r.take.id : '';
    await savePlaylist(newPlaylist('Mine', [id, 'gone']));
    const all = await listPlaylists();
    const mine = all.find((p) => p.name === 'Mine')!;
    expect(mine.takeIds).toEqual([id]);
    expect(all[0].id).toBe('pl-starred');
  });
  it('the queue: next / previous with repeat one, all, off', () => {
    expect(nextIndex(2, 3, 'all')).toBe(0);
    expect(nextIndex(2, 3, 'off')).toBeNull();
    expect(nextIndex(1, 3, 'one')).toBe(1);
    expect(bgNext(0, 3, 'all', -1)).toBe(2);
    expect(bgNext(0, 3, 'off', -1)).toBeNull();
    expect(bgNext(0, 0, 'all', 1)).toBeNull();
  });
  it('lock-screen metadata: title (A–B marked), the app as artist, the playlist as album, artwork', () => {
    const m = mediaMetadataOf({ title: 'Solo on ii–V', album: 'Starred on a loop', clip: true }, 'en', 'data:image/png;base64,x');
    expect(m).toEqual({ title: 'Solo on ii–V · A–B', artist: 'The 7th Sense', album: 'Starred on a loop', artwork: [{ src: 'data:image/png;base64,x', sizes: '256x256', type: 'image/png' }] });
    expect(mediaMetadataOf({ title: 't', album: '' }, 'he').album).toBe('ההקלטות שלי');
  });
});

describe('the render cache inside the budget', () => {
  const e = (key: string, bytes: number, used: string): RenderEntry => ({ key, takeId: key, bytes, type: 'audio/wav', used, seconds: 10 });
  it('evicts the least recently used to make room, refuses what can never fit', () => {
    const es = [e('a', 30, '2026-11-01'), e('b', 30, '2026-11-03'), e('c', 30, '2026-11-02')];
    expect(renderEvictPlan(es, 20, 100)).toEqual(['a']);
    expect(renderEvictPlan(es, 50, 100)).toEqual(['a', 'c']);
    expect(renderEvictPlan(es, 5, 100)).toEqual([]);
    expect(renderEvictPlan(es, 101, 100)).toBeNull();
    expect(renderRoom(500e6, 100e6, 0)).toBe(RENDER_CAP);
    expect(renderRoom(500e6, 480e6, 10e6)).toBe(10e6);
    expect(renderRoom(500e6, 600e6, 0)).toBe(0);
    expect(renderKey('t1', 'band')).toBe('t:t1:band');
    expect(renderKey('t1', 'audio', [1, 2.5])).toBe('c:t1:1.00:2.50:audio');
    expect(renderedBytes(60)).toBe(44 + 22050 * 60 * 2);
  });
  it('kept renders count in the budget: takes make room for them, and they for takes', async () => {
    setRecordingPrefs({ budget: 1000 });
    const r1 = await saveTake(take({ kind: 'improv', itemId: undefined }), blob(600, 'audio/webm'));
    expect(r1.ok && r1.audio).toBe('kept');
    // 400 left: a 300-byte render fits, a 500-byte one does not
    expect(await putRender('t:x:band', 'x', blob(300), 5)).toBe(true);
    expect(await putRender('t:y:band', 'y', blob(500), 5)).toBe(false);
    expect((await getRender('t:x:band'))?.size).toBe(300);
    expect(await refreshReserve()).toBe(300);
    expect((await storageUsage()).extraBytes).toBe(300);
    // a new 300-byte take: 600 + 300 + 300 > 1000 → the older unprotected audio is pruned to notes to make room
    const r2 = await saveTake(take({ kind: 'improv', itemId: undefined, star: true }), blob(300, 'audio/webm'));
    expect(r2.ok && r2.audio).toBe('kept');
    const u = await storageUsage();
    expect(u.audioBytes + (u.extraBytes ?? 0)).toBeLessThanOrEqual(1000);
  });
});

describe('A/B compare', () => {
  const line = (bpm: number, jitter: (i: number) => number = () => 0, wrong = -1): CmpTake => ({
    bpm,
    meter: 4,
    notes: Array.from({ length: 16 }, (_, i) => ({ pitch: i === wrong ? 61 : 60 + ((i * 2) % 12), on: (i * 0.5 * 60000) / bpm + jitter(i) })),
  });
  it('aligns two tempo-known takes bar by bar and measures the change', () => {
    const A = { ...line(120, (i) => (i % 3 === 1 ? 30 : i % 4 === 2 ? -25 : 0), 5), result: { acc: 0.82, bpm: 120 } };
    const B = { ...line(152), result: { acc: 0.97, bpm: 152 } };
    const al = alignTakes(A, B);
    expect(al.method).toBe('bars');
    expect(al.barLen).toBe(4);
    expect(al.matchA.filter((j) => j < 0)).toHaveLength(1); // the wrong note in A
    expect(al.matchA[0]).toBe(0);
    const d = compareDeltas(A, B, al);
    expect(d.tempo).toEqual([120, 152]);
    expect(d.acc).toEqual([0.82, 0.97]);
    expect(d.spread[0]!).toBeGreaterThan(d.spread[1]!);
    expect(d.spread[1]).toBe(0);
  });
  it('aligns free takes by onsets (different tempo and start)', () => {
    const A: CmpTake = { notes: line(100).notes };
    const B: CmpTake = { notes: line(130).notes.map((n) => ({ ...n, on: n.on + 2000 })) };
    const al = alignTakes(A, B);
    expect(al.method).toBe('onsets');
    expect(al.matchA.filter((j) => j >= 0).length).toBeGreaterThanOrEqual(14);
    expect(takeTempo(A)).toBe(200);
    expect(timingSpread(A)).toBe(0);
  });
  it('progress points oldest first; the play plan alternates or plays in a row', () => {
    const pts = progressPoints([
      { id: 'b', at: '2026-11-20', notes: [], result: { bpm: 150, acc: 0.95 } },
      { id: 'a', at: '2026-11-10', notes: [], bpm: 120 },
    ]);
    expect(pts.map((p) => [p.id, p.bpm, p.acc])).toEqual([['a', 120, null], ['b', 150, 0.95]]);
    expect(comparePlan('alt', [0, 4], [0, 3], 2).map((x) => x.take).join('')).toBe('ABAB');
    expect(comparePlan('row', [0, 4], [0, 3]).map((x) => x.take).join('')).toBe('AB');
  });
});

describe('export as .mid', () => {
  it('writes a format-0 file that reads back on the take tempo grid', () => {
    const b = midiFileOf([{ pitch: 60, on: 0, off: 500, vel: 90 }, { pitch: 64, on: 500, off: 1000, vel: 80 }, { pitch: 67, on: 1000, off: null, vel: 70 }], { bpm: 120, name: 'C major' });
    expect(String.fromCharCode(...b.slice(0, 4))).toBe('MThd');
    expect(b[9]).toBe(0); // format 0
    const ns = readMidiNotes(b);
    expect(ns.map((n) => n.pitch)).toEqual([60, 64, 67]);
    expect(ns[1].onTick).toBe(PPQ); // 500 ms at ♩120 = one beat
    expect(ns[0].offTick).toBe(PPQ);
    expect(ns[2].offTick).toBeGreaterThan(ns[2].onTick);
  });
  it('shifts a pickup before beat 0 so nothing is negative', () => {
    const ns = readMidiNotes(midiFileOf([{ pitch: 60, on: -250, off: 0, vel: 90 }, { pitch: 62, on: 0, off: 250, vel: 90 }], { bpm: 120 }));
    expect(ns[0].onTick).toBe(0);
    expect(ns[1].onTick).toBe(PPQ / 2);
  });
});

describe('whole-session recording bookkeeping', () => {
  it('marks each take once, finds the take at a moment, stops after 90 min or 20 idle', () => {
    let b = startBook(1000);
    b = markTake(b, 't1', 61_000, 'ses-1');
    b = markTake(b, 't1', 70_000);
    b = markTake(b, 't2', 181_000);
    expect(b.marks).toEqual([{ takeId: 't1', at: 60_000 }, { takeId: 't2', at: 180_000 }]);
    expect(b.sessionId).toBe('ses-1');
    expect(takeAt(b, 100_000)).toBe('t1');
    expect(takeAt(b, 30_000)).toBeNull();
    expect(shouldStop(b, 181_000 + SESSION_GAP_MS - 1)).toBeNull();
    expect(shouldStop(b, 181_000 + SESSION_GAP_MS)).toBe('idle');
    expect(shouldStop({ ...b, lastActivity: 1000 + SESSION_REC_MAX_MS }, 1000 + SESSION_REC_MAX_MS)).toBe('max');
    expect(sessionBytes(60_000)).toBe(360_000); // 48 kbps ≈ 0.36 MB a minute
  });
  it('keeps the file on the takes\' session, in the budget', async () => {
    const r = await saveTake(take());
    const sid = r.ok ? r.take.sessionId : '';
    const id = await putSessionAudio(blob(5000, 'audio/webm'), { startedAt: '2026-11-16T08:00:00Z', endedAt: '2026-11-16T08:30:00Z', marks: [{ takeId: 'x', at: 0 }] }, sid);
    expect(id).toBe(sid);
    expect((await getSession(sid))?.audioId).toBe(`s-${sid}`);
    expect((await sessionAudioOf(sid))?.entry.marks).toHaveLength(1);
    expect(await refreshReserve()).toBe(5000);
    setRecordingPrefs({ budget: 6000 });
    expect(await putSessionAudio(blob(7000, 'audio/webm'), { startedAt: 'a', endedAt: 'b', marks: [] }, null)).toBeNull();
  });
});

describe('normalisation and the loop seam', () => {
  it('brings quiet audio up to the target without clipping peaks', () => {
    const quiet = Float32Array.from({ length: 1000 }, (_, i) => 0.03 * Math.sin(i / 5));
    const g = normGain(quiet);
    const rms = Math.sqrt(quiet.reduce((a, x) => a + (x * g) ** 2, 0) / quiet.length);
    expect(rms).toBeCloseTo(TARGET_RMS, 2);
    const spiky = new Float32Array(1000);
    spiky[10] = 0.9;
    expect(normGain(spiky) * 0.9).toBeLessThanOrEqual(0.95);
    expect(normGain(new Float32Array(100))).toBe(1);
    const x = fadeEnds(new Float32Array(1000).fill(1), 22050);
    expect(x[0]).toBe(0);
    expect(x[999]).toBe(0);
    expect(x[500]).toBe(1);
  });
});
