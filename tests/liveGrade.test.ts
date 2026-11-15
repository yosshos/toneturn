// Live marks and the pocket meter (COURSE-FEEDBACK-UI slice 5): the take's own analysis run on what was played so far;
// a note shows once settled, and the settled marks agree with the review's marks of the whole take.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { analyzeDrumTake } from '../src/engine/drills/drumAnalyze';
import { LIVE_LAG_MS, liveGrade, liveMarkable, liveMarksOn, markWindow } from '../src/engine/drills/liveGrade';
import { markOf } from '../src/engine/noteMarks';
import { fakeTake } from '../src/ui/fakeTake';
import type { Drill, DrillCalibration, NoteResult, TakeMetrics } from '../src/engine/drills/types';

const DEFAULT_CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };

const keyOf = (r: NoteResult) => `${r.exp.hand}:${r.exp.voice ?? ''}:${r.exp.beat}:${r.exp.pitch}`;

/** Re-run the analysis at moments through the take, as the run screen does, and compare with the final marks. */
function replay(drill: Drill, bpm: number, pattern: 'mixed' | 'clean' | 'weak') {
  const f = fakeTake(drill, bpm, DEFAULT_CAL, pattern);
  const final = new Map(f.m.perNote.map((r) => [keyOf(r), markOf(r, markWindow(f.m))]));
  const end = expTimeMs(drill, drill.beats, bpm) + 2000;
  const steps: { now: number; live: ReturnType<typeof liveGrade> }[] = [];
  for (let now = 0; now <= end; now += 150) {
    const m: TakeMetrics = f.hits
      ? analyzeDrumTake(drill, bpm, f.hits.filter((h) => h.on <= now))
      : analyzeTake(drill, bpm, f.played.filter((p) => p.on <= now), DEFAULT_CAL);
    steps.push({ now, live: liveGrade(drill, m, bpm, now) });
  }
  return { f, final, steps, end };
}

const keys = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'RL', scale: 'major', octaves: 1 } as never);
const drums = generate({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' } as never);

describe('liveGrade', () => {
  for (const [name, drill] of [['keys hands together', keys], ['drums rock groove', drums]] as const)
    it(`${name}: the settled marks agree with the final marks; at the end every note is settled`, () => {
      const { final, steps } = replay(drill, 80, 'mixed');
      let disagree = 0;
      let shown = 0;
      for (const s of steps)
        for (const r of s.live.perNote) {
          shown++;
          if (markOf(r, s.live.win) !== final.get(keyOf(r))) disagree++;
        }
      expect(shown).toBeGreaterThan(0);
      // the analysis of a part of a take may judge a note differently for a moment; it must be rare
      expect(disagree / shown).toBeLessThan(0.05);
      const last = steps[steps.length - 1].live;
      expect(last.done).toBe(last.total);
      for (const r of last.perNote) expect(markOf(r, last.win)).toBe(final.get(keyOf(r)));
    });

  it('marks appear in order through the take; a missed note waits for its window', () => {
    const { steps } = replay(keys, 80, 'mixed');
    const counts = steps.map((s) => s.live.done);
    for (let k = 1; k < counts.length; k++) expect(counts[k]).toBeGreaterThanOrEqual(counts[k - 1] - 1);
    // at the downbeat only an early note (played before it) can already show
    expect(counts[0]).toBeLessThanOrEqual(2);
    // nothing is "missed" before half a beat (+ lag) after it was due
    for (const s of steps)
      for (const r of s.live.perNote)
        if (!r.played) expect(s.now).toBeGreaterThanOrEqual(expTimeMs(keys, r.exp.beat, 80) + 30000 / 80 + LIVE_LAG_MS);
  });

  it('a played note shows about 80 ms after its onset, not before', () => {
    const m = analyzeTake(keys, 80, [{ pitch: keys.notes[0].pitch, on: 5, off: 300, vel: 70 }], DEFAULT_CAL);
    expect(liveGrade(keys, m, 80, 40).done).toBe(0);
    expect(liveGrade(keys, m, 80, 5 + LIVE_LAG_MS).perNote.map((r) => r.exp)).toContainEqual(keys.notes[0]);
  });

  it('the meter: the needle is the mean of the last onsets, hands get a row each, the streak counts clean notes in a row', () => {
    const { steps } = replay(keys, 80, 'clean');
    const last = steps[steps.length - 1].live;
    expect(last.rows.map((r) => r.key)).toEqual(['R', 'L']);
    expect(Math.abs(last.mean ?? 99)).toBeLessThan(5);
    expect(last.streak).toBe(last.total);
    const mixed = replay(keys, 80, 'mixed').steps.at(-1)!.live;
    expect(mixed.streak).toBeLessThan(mixed.total);
  });

  it('drums: one row per limb the groove uses', () => {
    const last = replay(drums, 80, 'clean').steps.at(-1)!.live;
    expect(last.rows.length).toBeGreaterThan(1);
    expect(last.rows.map((r) => r.key)).toContain('RF');
  });

  it('what can be marked live: written items yes; improvised, phrase-by-ear and voicing-choice items no', () => {
    expect(liveMarkable(keys)).toBe(true);
    expect(liveMarkable({ ...keys, phrase: {} as never })).toBe(false);
    expect(liveMarkable({ ...keys, show: 'none' })).toBe(false);
    expect(liveMarkable({ ...keys, goal: { ...keys.goal, vl: {} as never } })).toBe(false);
  });

  it('practice or calm: live marks while learning, the meter only after 2 clean takes and in a level test', () => {
    expect(liveMarksOn(undefined, { learningStep: true, cleanTakes: 5 })).toBe(true);
    expect(liveMarksOn(undefined, { learningStep: false, cleanTakes: 1 })).toBe(true);
    expect(liveMarksOn(undefined, { learningStep: false, cleanTakes: 2 })).toBe(false);
    expect(liveMarksOn('always', { learningStep: false, cleanTakes: 9 })).toBe(true);
    expect(liveMarksOn('never', { learningStep: true, cleanTakes: 0 })).toBe(false);
    expect(liveMarksOn('always', { learningStep: true, cleanTakes: 0, levelTest: true })).toBe(false);
  });
});
