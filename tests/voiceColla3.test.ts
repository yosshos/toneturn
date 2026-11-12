// VOICE_CURRICULUM P3 follow-up: a free (colla voce) section in the MIDDLE of a song — free, in time, free again, in
// time — as the third item of the colla voce level (1408), the band following in each free part and the one-beat
// re-entry check at every return to tempo.
import { describe, expect, it } from 'vitest';
import { vocalLevelByRef } from '../src/engine/voiceFamilies';
import { collaSections, gradeCollaMulti, synthCollaSections } from '../src/engine/voiceGrade';
import { songPlan, voiceSong } from '../src/engine/voiceSongs';

const R = { low: 50, high: 74 };
const item = () => vocalLevelByRef(1408)!.items.find((x) => x.song?.freeAgain)!;
const plan = () => songPlan(voiceSong(item().song!.id)!, R);

describe('colla voce in the middle of a song (1408, item 3)', () => {
  it('is offered in the colla voce level: Lantern Street, A free, A in time, the bridge free, the last A in time', () => {
    const it3 = item();
    expect(it3).toBeDefined();
    expect(it3.song!.id).toBe('lantern-street');
    const p = plan();
    const secs = collaSections(p, 0, p.bars - 1, it3.song!.freeUntil!, it3.song!.freeAgain);
    expect(secs.map((s) => [s.free, s.fromBar, s.toBar])).toEqual([
      [true, 0, 7],
      [false, 8, 15],
      [true, 16, 23],
      [false, 24, 31],
    ]);
    // every note in exactly one section
    expect(secs.reduce((a, s) => a + s.notes.length, 0)).toBe(p.notes.length);
  });
  it('without freeAgain the sections are the old two (free, then in time)', () => {
    const p = plan();
    expect(collaSections(p, 0, p.bars - 1, 1).map((s) => s.free)).toEqual([true, false]);
    // free – tempo – free (to the end)
    expect(collaSections(p, 0, p.bars - 1, 1, { from: 2 }).map((s) => [s.free, s.fromBar])).toEqual([
      [true, 0],
      [false, 8],
      [true, 16],
    ]);
  });
  const run = (o: Parameters<typeof synthCollaSections>[2] = {}) => {
    const it3 = item();
    const p = plan();
    const secs = collaSections(p, 0, p.bars - 1, it3.song!.freeUntil!, it3.song!.freeAgain);
    const sc = synthCollaSections(secs, p, o);
    return { res: gradeCollaMulti(it3, sc.frames, p, 0, p.bars - 1, sc.rejoins), rejoins: sc.rejoins, beat: p.beat, pass: vocalLevelByRef(1408)!.pass };
  };
  it('free – in time – free – in time, back on the bar both times → passes; the band rejoins twice', () => {
    const ok = run();
    expect(ok.rejoins.length).toBe(2);
    expect(ok.res.reentries.length).toBe(2);
    for (const r of ok.res.reentries) expect(Math.abs(r!)).toBeLessThan(0.1);
    expect(ok.res.follow).toBeGreaterThanOrEqual(0.8);
    expect(ok.res.grade.score).toBeGreaterThanOrEqual(ok.pass);
  });
  it('late by a beat and a half at the SECOND return only → fails (each return is checked)', () => {
    const ok = run();
    const late = run({ late: [0, ok.beat * 1.6] });
    expect(Math.abs(late.res.reentries[0]!)).toBeLessThan(0.1);
    expect(late.res.reentries[1] === null || Math.abs(late.res.reentries[1]!) > ok.beat).toBe(true);
    expect(late.res.grade.score).toBeLessThan(late.pass);
  });
  it('out of tune → fails; nothing sung → not counted', () => {
    expect(run({ cents: 80 }).res.grade.score).toBeLessThan(run().pass);
    const p = plan();
    expect(gradeCollaMulti(item(), [], p, 0, p.bars - 1, []).grade.unclear).toBe(true);
  });
  it('the second free part is graded without a clock: a much slower bridge still passes', () => {
    expect(run({ slow: 1.6 }).res.grade.score).toBeGreaterThanOrEqual(run().pass);
  });
});
