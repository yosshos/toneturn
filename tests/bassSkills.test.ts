// BASS_AUDIT A11 (bass takes feed the skills) and A14 (bass onsets feed the groove fingerprint).
import { describe, expect, it } from 'vitest';
import { drillEvents } from '../src/engine/drills/events';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { addPerformance, emptyGroove, feedsGroove, takeGroove } from '../src/engine/analysis/groove';
import { SUB_BY_ID } from '../src/engine/taxonomy';
import type { Drill, ExpNote, FamilyId } from '../src/engine/drills/types';

const mk = (family: FamilyId, more: Partial<Drill> = {}, evenness = true): Drill => {
  const notes: ExpNote[] = [28, 33, 35, 28, 31, 36, 38, 28].map((p, i) => ({ pitch: p, beat: i * 0.5, dur: 0.5, hand: 'R' }));
  return { spec: { family, kind: 'x', key: 4, hands: 'R' }, itemId: 'x', title: { en: 'x', he: 'x' }, notes, beats: 4, meter: 4, keySig: 'C', goal: { evenness, hands: false }, startBpm: 80, ...more };
};
const take = (d: Drill, late = (_i: number) => 0) => analyzeGuitarTake(d, 80, d.notes.map((n, i) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, 80) + late(i), off: null, vel: 80 })));
const tagsOf = (d: Drill) => drillEvents(d, take(d), '2026-11-09T10:00:00Z', 's', 0)[0].tags!;

describe('A11: bass takes feed the skills', () => {
  it('bass drills rate bass technique; time / pocket feed timing, walking / chord lines feed harmony', () => {
    expect(SUB_BY_ID['instrument/bass-tech']?.skill).toBe('instrument');
    expect(tagsOf(mk('b-pluck'))).toEqual([
      { skill: 'instrument', sub: 'instrument/bass-tech', w: 0.8 },
      { skill: 'timing', sub: 'timing/subdivide', w: 0.2 },
    ]);
    expect(tagsOf(mk('b-time', {}, false))[1]).toEqual({ skill: 'timing', sub: 'timing/subdivide', w: 0.4 });
    expect(tagsOf(mk('b-time', { click: '24' }))[1].sub).toBe('timing/backbeat');
    expect(tagsOf(mk('b-time', { click: 'fade' }))[1].sub).toBe('timing/gap');
    expect(tagsOf(mk('b-pocket', {}, false))[1].sub).toBe('timing/steady');
    expect(tagsOf(mk('b-walk', {}, false))[1]).toEqual({ skill: 'cadences', sub: 'cadences/progression', w: 0.3 });
    expect(tagsOf(mk('b-chord', {}, false))[1].sub).toBe('theory/harmony');
    for (const f of ['b-pluck', 'b-time', 'b-pocket', 'b-walk', 'b-chord', 'b-slap'] as FamilyId[]) {
      const ts = tagsOf(mk(f));
      expect(ts.reduce((a, t) => a + t.w, 0)).toBeCloseTo(1, 5);
      for (const t of ts) expect(SUB_BY_ID[t.sub ?? '']?.skill, t.sub).toBe(t.skill);
    }
    // guitar and piano unchanged
    expect(tagsOf(mk('g-fretting'))[0].sub).toBe('instrument/guitar-tech');
  });
});

describe('A14: bass onsets feed the groove fingerprint', () => {
  it('a take becomes a performance: one onset per beat position with its offset', () => {
    const d = mk('b-time');
    const g = takeGroove(d, take(d, (i) => (i % 2 ? 20 : 0)))!;
    expect(g.onsets).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(g.offsets).toEqual([0, 20, 0, 20, 0, 20, 0, 20]);
    const model = addPerformance(emptyGroove(), g.onsets, g.offsets, 80, g.beatsPerBar, new Date('2026-11-09'));
    expect(model.stats['sub:8'].mean).toBeCloseTo(20, 5);
    expect(model.stats['sub:beat'].mean).toBeCloseTo(0, 5);
    expect(feedsGroove(d)).toBe(true);
    expect(feedsGroove(mk('g-fretting'))).toBe(false);
  });
  it('too few timed notes → nothing', () => {
    const d = mk('b-time');
    const m = take(d);
    m.perNote.forEach((r, i) => (r.dev = i < 5 ? null : r.dev));
    expect(takeGroove(d, m)).toBeNull();
  });
});
