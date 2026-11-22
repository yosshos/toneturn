import { afterEach, describe, expect, it } from 'vitest';
import { sinceLesson, sinceLine } from '../src/engine/sinceLesson';
import type { Snapshot } from '../src/engine/snapshot';
import { classMedian, classMedianOn, classSnapshots, setClassMedian, setSnapshotsBackend, snapshotsOn, SNAPSHOTS_SYNCED } from '../src/cloud/snapshots';
import { mockSnapshotRpc } from '../src/cloud/snapshotsMock';

const snap = (day: string, closed: number, tempo: number, mins: number): Snapshot => ({ day, status: { 'keys:technique': { closed, learning: 3 } }, tempo: { 'keys:technique': tempo }, minutes: mins ? { technique: mins } : {}, channels: { ear: null, reading: null }, keys: {}, vocab: { played: 0, closed: 0 }, practised: mins > 0 });

describe('since the last lesson (SPEC-PROGRESS-CHARTS §3)', () => {
  const all = { '2026-11-10': snap('2026-11-10', 2, 0.6, 20), '2026-11-12': snap('2026-11-12', 3, 0.64, 0), '2026-11-15': snap('2026-11-15', 5, 0.7, 30), '2026-11-16': snap('2026-11-16', 6, 0.72, 15) };
  it('compares the lesson day (or the last day before it) with today, and sums the minutes after it', () => {
    const s = sinceLesson(all, '2026-11-13', '2026-11-16');
    expect(s.rows).toEqual([{ area: 'keys:technique', closedThen: 3, closedNow: 6, tempoThen: 0.64, tempoNow: 0.72 }]);
    expect(s.minutes).toBe(45);
    expect(s.days).toBe(2);
    expect(sinceLine(s.rows[0], 'en')).toBe('+3 closed · tempo 64% → 72%');
    expect(sinceLine({ ...s.rows[0], closedNow: 3, tempoNow: 0.64 }, 'he')).toBe('בלי שינוי');
  });
});

describe('teacher charts: only while the summaries sync (or a test backend answers)', () => {
  afterEach(() => setSnapshotsBackend(null));
  it('off until the migration is applied; the injected backend answers the class RPCs', async () => {
    expect(SNAPSHOTS_SYNCED).toBe(false);
    expect(snapshotsOn()).toBe(false);
    expect(await classSnapshots('demo-class', '2000-01-01')).toEqual({});
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] };
    setSnapshotsBackend(mockSnapshotRpc);
    expect(snapshotsOn()).toBe(true);
    const by = await classSnapshots('demo-class', '2000-01-01');
    expect(Object.keys(by).sort()).toEqual(['s1', 's2', 's3', 's4']);
    expect(Object.keys(by.s1).length).toBe(28);
    // the median stays private until the teacher turns it on
    await setClassMedian('demo-class', false);
    expect(await classMedianOn('demo-class')).toBe(false);
    expect(await classMedian('demo-class', '2000-01-01')).toEqual([]);
    await setClassMedian('demo-class', true);
    expect(await classMedianOn('demo-class')).toBe(true);
    const med = await classMedian('demo-class', '2000-01-01');
    expect(med.length).toBe(28);
    expect(med[0]).toEqual({ day: expect.any(String), tempo: expect.any(Number), minutes: expect.any(Number) });
  });
});
