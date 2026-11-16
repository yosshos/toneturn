import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _resetRecordings,
  countTakes,
  fallbackStore,
  getTakeAudio,
  headOf,
  indexedRecordingStore,
  listTakes,
  listTakesPage,
  matchesFilter,
  memoryRecordingStore,
  recordingsVolatile,
  saveTake,
  setRecordingStore,
  starTake,
  renameTake,
  deleteTake,
  storageUsage,
  takeFacets,
  takesByDay,
  REC_DB,
  type NewTake,
  type PageCursor,
  type RecTake,
  type RecordingStore,
} from '../src/storage/recordings';
import { announceSegment, makeSegment, addCaptureTap } from '../src/speech/captureTap';
import { armGameTap, gameAccuracy, keepGameTake, keepingPitch, keepVocalTake, layoutParts, setRecRoute, wavOf } from '../src/ui/recKeep';
import { midi } from '../src/speech/midi';
import type { PitchCapture, SingOptions } from '../src/game/adapters';
import type { SungFrame } from '../src/engine/sing';
import type { PlayedNote } from '../src/engine/drills/types';

const T0 = Date.parse('2026-11-16T08:00:00Z');
const notes = (n: number): PlayedNote[] => Array.from({ length: n }, (_, i) => ({ pitch: 60 + (i % 12), on: i * 250, off: i * 250 + 200, vel: 70 }));
const take = (i: number, over: Partial<NewTake> = {}): NewTake => ({
  durationMs: 4000,
  course: i % 3 ? 'keys' : 'guitar',
  instrument: 'piano',
  kind: 'drill',
  itemId: `scales:${i}`,
  title: { en: `Take ${i}`, he: `ניסיון ${i}` },
  sung: false,
  source: 'midi',
  played: notes(5),
  // one minute apart, newest last; takes 10..12 share one time (ties must page cleanly)
  at: new Date(T0 + (i >= 10 && i <= 12 ? 10 : i) * 60_000).toISOString(),
  ...over,
});
const blob = (bytes: number, type = 'audio/webm') => new Blob([new Uint8Array(bytes)], { type });
/** A sung note: frames at 30 fps holding one pitch for `sec`. */
const sungFrames = (midiNote: number, sec: number, from = 0): SungFrame[] =>
  Array.from({ length: Math.round(sec * 30) }, (_, k) => ({ t: from + k / 30, hz: 440 * 2 ** ((midiNote - 69) / 12), confidence: 0.95, rms: 0.1 }));
const flush = () => new Promise((r) => setTimeout(r, 30));

async function fill(n: number, over: (i: number) => Partial<NewTake> = () => ({})) {
  // saveTake joins sessions by `now`; each take gets its own clock so sessions stay apart.
  for (let i = 0; i < n; i++) await saveTake(take(i, over(i)), null, { now: T0 + i * 60_000 });
}

async function allPages(f = {}, limit = 30) {
  const pages: RecTake[][] = [];
  let after: PageCursor | null = null;
  for (let k = 0; k < 20; k++) {
    const r = await listTakesPage(f, { after, limit });
    pages.push(r.takes);
    if (!r.next) break;
    after = r.next;
  }
  return pages;
}

beforeEach(() => {
  _resetRecordings();
  setRecordingStore(memoryRecordingStore());
});
afterEach(() => _resetRecordings());

for (const kind of ['memory', 'indexeddb'] as const) {
  describe(`paging by date (${kind})`, () => {
    beforeEach(() => {
      if (kind === 'indexeddb') setRecordingStore(indexedRecordingStore(`paging-${Math.random()}`));
    });

    it('pages of 30, newest first, no take lost or repeated (ties in time too)', async () => {
      await fill(75);
      const pages = await allPages();
      expect(pages.map((p) => p.length)).toEqual([30, 30, 15]);
      const ids = pages.flat().map((t) => t.id);
      expect(new Set(ids).size).toBe(75);
      const ats = pages.flat().map((t) => t.at);
      expect([...ats].sort().reverse()).toEqual(ats);
      // small pages across the tie (3 takes at one time)
      const small = await allPages({}, 4);
      expect(new Set(small.flat().map((t) => t.id)).size).toBe(75);
    });

    it('filters and search page too; counts and chips read the index', async () => {
      await fill(40);
      const guitar = (await allPages({ course: 'guitar' }, 5)).flat();
      expect(guitar.length).toBe(14);
      expect(guitar.every((t) => t.course === 'guitar')).toBe(true);
      expect((await listTakesPage({ q: 'ניסיון 39' })).takes.map((t) => t.itemId)).toEqual(['scales:39']);
      expect(await countTakes()).toBe(40);
      expect(await countTakes({ course: 'keys' })).toBe(26);
      const f = await takeFacets();
      expect(f.total).toBe(40);
      expect(f.courses.sort()).toEqual(['guitar', 'keys']);
      expect(f.midi && f.played && !f.sung && !f.audio).toBe(true);
    });

    it('the index follows star, rename and delete', async () => {
      await fill(5);
      const [t] = (await listTakesPage({}, { limit: 1 })).takes;
      await starTake(t.id, true);
      await renameTake(t.id, 'Best solo');
      expect((await listTakesPage({ starred: true })).takes.map((x) => x.id)).toEqual([t.id]);
      expect((await listTakesPage({ q: 'best solo' })).takes.length).toBe(1);
      await deleteTake(t.id);
      expect(await countTakes()).toBe(4);
      expect((await takeFacets()).bin).toBe(1);
    });

    it("the diary: each local day's takes", async () => {
      await fill(3);
      const day = (iso: string) => iso.slice(0, 10);
      const m = await takesByDay('2026-11-16T00:00:00Z', '2026-11-17T00:00:00Z', day);
      expect([...m.keys()]).toEqual(['2026-11-16']);
      expect(m.get('2026-11-16')!.map((h) => h.title)).toHaveLength(3);
      expect((await takesByDay('2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', day)).size).toBe(0);
    });
  });
}

describe('IndexedDB v1 → v2', () => {
  it('indexes the takes a v1 database already holds', async () => {
    const name = `v1-${Math.random()}`;
    const t = { id: 'old-1', sessionId: 's', at: '2026-11-01T10:00:00.000Z', durationMs: 1000, course: 'keys', instrument: 'piano', kind: 'drill', title: 'Old take', sung: false, source: 'midi' };
    await new Promise<void>((res) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        for (const s of ['sessions', 'takes', 'audio', 'playlists', 'meta']) r.result.createObjectStore(s, { keyPath: 'id' });
      };
      r.onsuccess = () => {
        const tx = r.result.transaction('takes', 'readwrite');
        tx.objectStore('takes').put(t);
        tx.oncomplete = () => (r.result.close(), res());
      };
    });
    setRecordingStore(indexedRecordingStore(name));
    expect((await listTakesPage()).takes.map((x) => x.id)).toEqual(['old-1']);
    expect((await listTakesPage({ q: 'old take' })).takes.length).toBe(1);
    expect(REC_DB).toBe('toneturn-recordings');
  });
});

describe('private mode, quota, persistence', () => {
  it('a store that cannot open falls back to memory and says so', async () => {
    const broken: RecordingStore = { ...memoryRecordingStore(), ready: async () => false, put: async () => ({ ok: false, reason: 'unavailable' }) };
    setRecordingStore(fallbackStore(broken));
    const r = await saveTake(take(1));
    expect(r.ok).toBe(true);
    expect(recordingsVolatile()).toBe(true);
    expect((await storageUsage()).volatile).toBe(true);
    expect(await countTakes()).toBe(1);
  });

  it('a full device keeps the notes and leaves a calm notice', async () => {
    setRecordingStore(memoryRecordingStore(10_000));
    const r = await saveTake(take(1, { source: 'mic' }), blob(50_000));
    expect(r.ok && r.audio).toBe('quota');
    const u = await storageUsage();
    expect(u.quotaAt).toBeTruthy();
    expect(u.volatile).toBe(false);
  });

  it('matchesFilter works on the light index rows', async () => {
    await fill(1);
    const [t] = await listTakes();
    const h = headOf(t);
    expect(h).not.toHaveProperty('notes');
    expect(matchesFilter(h, { q: 'take 0' })).toBe(true);
    expect(matchesFilter(h, { course: 'keys' })).toBe(false);
  });
});

describe('wiring: lessons, games', () => {
  it('a lesson sung answer is kept as a lesson take with its audio; the screen still gets what it asked', async () => {
    setRecRoute('lesson', 'voice');
    let asked: SingOptions | null = null;
    const inner: PitchCapture = { sing: async (o) => ((asked = o), { kind: 'frames', frames: sungFrames(67, 2.4), audio: blob(20_000, 'audio/mp4') }) };
    const cap = keepingPitch(inner, () => ({ itemId: 'q-sing-5', title: { en: 'Lesson · sing', he: 'שיעור · שירה' }, sung: true, midi: false }));
    const r = await cap.sing({ signal: new AbortController().signal });
    expect(asked!.record).toBe(true);
    expect(r.kind === 'frames' && 'audio' in r).toBe(false);
    await flush();
    const [t] = await listTakes();
    expect(t).toMatchObject({ kind: 'lesson', itemId: 'q-sing-5', sung: true, source: 'mic', course: 'voice', instrument: 'voice' });
    expect(t.audioId).toBeTruthy();
    expect((await getTakeAudio(t.id))?.type).toBe('audio/mp4');
  });

  it('a question that is not sung keeps nothing; a MIDI answer keeps notes only', async () => {
    const inner: PitchCapture = { sing: async () => ({ kind: 'frames', frames: [...sungFrames(60, 0.5), ...sungFrames(62, 0.5, 0.6), ...sungFrames(64, 0.5, 1.2)] }) };
    await keepingPitch(inner, () => null).sing({ signal: new AbortController().signal });
    await flush();
    expect(await countTakes()).toBe(0);
    await keepingPitch(inner, () => ({ itemId: 'q-seq', title: { en: 'x', he: 'x' }, sung: false, midi: true })).sing({ signal: new AbortController().signal });
    await flush();
    const [t] = await listTakes();
    expect(t).toMatchObject({ kind: 'lesson', source: 'midi' });
    expect(t.audioId).toBeUndefined();
  });

  it('a mic game run: its captures become one game take (gaps shortened), with audio', async () => {
    setRecRoute('singinterval', 'voice');
    const off = armGameTap('singinterval', { en: 'Sing the Interval', he: 'שירו את המרווח' });
    // one capture, ended: kept as recorded
    const chunks = [blob(30_000)];
    const seg = makeSegment(1000, { state: 'inactive', mimeType: 'audio/webm' } as unknown as MediaRecorder, chunks);
    announceSegment(seg);
    seg.frames.push(...sungFrames(60, 1), ...sungFrames(64, 1, 1.1), ...sungFrames(67, 1, 2.2));
    seg.finish();
    keepGameTake('singinterval', { right: 3, wrong: 1 });
    await flush();
    const [t] = await listTakes();
    expect(t).toMatchObject({ kind: 'game', itemId: 'game:singinterval', sung: true, source: 'mic', result: { acc: 0.75 } });
    expect(t.title).toEqual({ en: 'Sing the Interval', he: 'שירו את המרווח' });
    expect(t.audioId).toBeTruthy();
    off();
  });

  it('a MIDI game run keeps its notes; a game that kept its own takes keeps no second one; pure tap games keep nothing', async () => {
    setRecRoute('voicingsprint', 'keys');
    const off = armGameTap('voicingsprint', { en: 'Voicing Sprint', he: 'ספרינט קולות' });
    keepGameTake('voicingsprint', {}); // nothing played: nothing kept
    for (const [i, m] of [60, 64, 67, 71].entries()) {
      midi.message([0x90, m, 90], 1000 + i * 200);
      midi.message([0x80, m, 0], 1150 + i * 200);
    }
    keepGameTake('voicingsprint', { accuracy: 0.9 });
    await flush();
    const takes = await listTakes();
    expect(takes).toHaveLength(1);
    expect(takes[0]).toMatchObject({ kind: 'game', source: 'midi', instrument: 'piano', result: { acc: 0.9 } });
    // a screen keeper ran during the run (a game built on DrillTake / a vocal take): no second take
    for (const m of [60, 62, 64]) midi.message([0x90, m, 90], 3000);
    keepVocalTake({ itemId: 'v', title: { en: 'v', he: 'v' }, frames: sungFrames(60, 2.5) });
    keepGameTake('voicingsprint', {});
    await flush();
    expect((await listTakes({ kind: 'game' })).length).toBe(1);
    off();
  });

  it('a running capture is read so far, and the next run continues from where the last one was kept', async () => {
    const off = armGameTap('flight', { en: 'Flight', he: 'טיסה' });
    let state: RecordingState = 'recording';
    const rec = { get state() { return state; }, mimeType: 'audio/webm', ondataavailable: null as ((e: { data: Blob }) => void) | null, requestData() { this.ondataavailable?.({ data: blob(1) }); } };
    const chunks = [blob(20_000)];
    const seg = makeSegment(0, rec as unknown as MediaRecorder, chunks);
    announceSegment(seg);
    seg.frames.push(...sungFrames(60, 1), ...sungFrames(62, 1, 1.1), ...sungFrames(64, 1, 2.2));
    keepGameTake('flight', {});
    await new Promise((r) => setTimeout(r, 1700));
    expect(await countTakes()).toBe(1);
    seg.frames.push(...sungFrames(65, 1, 3.4), ...sungFrames(67, 1, 4.5), ...sungFrames(69, 1, 5.6));
    state = 'inactive';
    seg.finish();
    keepGameTake('flight', {});
    await flush();
    const takes = await listTakes();
    expect(takes).toHaveLength(2);
    expect(takes.map((t) => t.notes && t.notes.length > 0)).toEqual([true, true]);
    off();
  });

  it('helpers: layout of parts, accuracy from a detail, WAV header, taps on and off', () => {
    const lay = layoutParts([{ startPerf: 0, from: 0, to: 2 }, { startPerf: 10_000, from: 0, to: 1 }, { startPerf: 11_200, from: 0, to: 1 }], 0.6);
    [0, 2.6, 3.8].forEach((x, i) => expect(lay[i]).toBeCloseTo(x, 6));
    expect(gameAccuracy({ accuracy: 0.8 })).toBe(0.8);
    expect(gameAccuracy({ accuracy: 80 })).toBe(0.8);
    expect(gameAccuracy({ right: 2, total: 8 })).toBe(0.25);
    expect(gameAccuracy({ tier: 3 })).toBeUndefined();
    const w = wavOf(new Float32Array(160), 16000);
    expect(w.size).toBe(44 + 320);
    expect(w.type).toBe('audio/wav');
    const seen: number[] = [];
    const offTap = addCaptureTap({ audio: false, onSegment: (s) => void seen.push(s.startPerf) });
    announceSegment(makeSegment(5, null, []));
    offTap();
    announceSegment(makeSegment(6, null, []));
    expect(seen).toEqual([5]);
  });
});
