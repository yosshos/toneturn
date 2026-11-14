import { describe, expect, it } from 'vitest';
import { buildProfile, emptyHistory, pairWeeks, profileDigest, profileItems, withSnapshot, type ProfileCounters, type ProfileItem } from '../src/engine/analysis/profile';
import { emptyGroove } from '../src/engine/analysis/groove';
import { emptyModel } from '../src/engine/analysis/model';
import type { Confusion } from '../src/storage/confusion';

const pair = (both: number, last: string): Confusion & { both: number } => ({
  topic: 'iv-asc', gen: { id: 'iv-asc', level: 2 }, right: { en: 'M6', he: 'סקסטה גדולה' }, given: { en: 'm7', he: 'ספטימה קטנה' }, n: both, both, last,
});
const day = (iso: string) => new Date(iso);
const C = (takes: number, misses: number): ProfileCounters => ({ takes, taps: 0, misses });

describe('player profile', () => {
  it('a confusion pair counts only when repeated and recent', () => {
    const now = day('2026-11-14T10:00:00Z');
    const base = { model: emptyModel(), groove: emptyGroove(), ear: [], now };
    expect(profileItems({ ...base, pairs: [pair(3, '2026-11-13T00:00:00Z')] })).toHaveLength(0);
    expect(profileItems({ ...base, pairs: [pair(6, '2026-09-01T00:00:00Z')] })).toHaveLength(0);
    const it1 = profileItems({ ...base, pairs: [pair(6, '2026-11-13T00:00:00Z')] });
    expect(it1).toHaveLength(1);
    expect(it1[0]).toMatchObject({ id: 'c:iv-asc|M6|m7', tone: 'pattern', action: { kind: 'topic', id: 'iv-asc', level: 2 } });
  });

  it('a clear Ear Index rise over four weeks is a strength', () => {
    const now = day('2026-11-14T10:00:00Z');
    const ear = [{ day: '2026-10-01', r: 1100 }, { day: '2026-10-15', r: 1110 }, { day: '2026-11-14', r: 1135 }];
    const items = profileItems({ model: null, groove: null, pairs: [], ear, now });
    expect(items).toEqual([expect.objectContaining({ id: 'e:up', tone: 'strength' })]);
    expect(items[0].text.en).toContain('25');
  });

  it('counts the weeks in a row a pattern shows, and calls it recurring from two', () => {
    const p: ProfileItem = { id: 'c:x|a|b', source: 'confusions', tone: 'pattern', text: { en: 'x', he: 'x' }, confidence: 1 };
    let h = emptyHistory();
    h = withSnapshot(h, [p], C(0, 10), day('2026-10-27T00:00:00Z'));
    let prof = buildProfile([p], h, C(0, 10));
    expect(prof.patterns[0]).toMatchObject({ status: 'new', weeks: 1 });
    h = withSnapshot(h, [p], C(0, 14), day('2026-11-03T00:00:00Z'));
    h = withSnapshot(h, [p], C(0, 18), day('2026-11-05T00:00:00Z')); // same week: replaced, not added
    expect(h.snaps).toHaveLength(2);
    h = withSnapshot(h, [p], C(0, 20), day('2026-11-12T00:00:00Z'));
    prof = buildProfile([p], h, C(0, 20));
    expect(prof.patterns[0]).toMatchObject({ status: 'recurring', weeks: 3 });
    expect(pairWeeks(h, 'x', 'b', 'a')).toBe(3);
  });

  it('a pattern is "gone" only after enough practice of the same kind', () => {
    const p: ProfileItem = { id: 't:rush:sub:16', source: 'technique', tone: 'pattern', text: { en: 'rush', he: 'ממהרים' }, confidence: 1 };
    let h = withSnapshot(emptyHistory(), [p], C(40, 0), day('2026-11-03T00:00:00Z'));
    // Next week it isn't showing, but only 5 takes were played: no claim.
    let h2 = withSnapshot(h, [], C(45, 0), day('2026-11-12T00:00:00Z'));
    expect(buildProfile([], h2, C(45, 0)).gone).toHaveLength(0);
    // With 20 more takes it counts as gone.
    h2 = withSnapshot(h, [], C(60, 0), day('2026-11-12T00:00:00Z'));
    const prof = buildProfile([], h2, C(60, 0));
    expect(prof.gone).toEqual([expect.objectContaining({ id: 't:rush:sub:16', since: '2026-W45' })]);
    expect(profileDigest(prof).resolved[0]).toMatchObject({ area: 'technique', finding: 'rush' });
  });

  it('is not ready before any measured practice', () => {
    expect(buildProfile([], emptyHistory(), { takes: 0, taps: 0, misses: 0 }).ready).toBe(false);
    expect(buildProfile([], emptyHistory(), { takes: 12, taps: 0, misses: 0 }).ready).toBe(true);
  });
});
