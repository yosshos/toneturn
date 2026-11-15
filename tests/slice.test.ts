// Loop the spot (COURSE-FEEDBACK-UI slice 3): sliceDrill re-bases a few bars of a drill to beat 0 — notes, chart,
// drums, band and the meter plan — and staffLines of the slice matches the sliced bars.
import { describe, expect, it } from 'vitest';
import { barOfBeat, drillBars, LOOP_PASSES, loopBpm, sliceDrill } from '../src/engine/drills/slice';
import { staffLines, withBarPlan } from '../src/engine/drills/timeline';
import { generate } from '../src/engine/drills/generate';
import type { Drill, ExpNote } from '../src/engine/drills/types';

const mk = (notes: ExpNote[], o: Partial<Drill> = {}): Drill => ({
  spec: { family: 'b-time', kind: 'slice-test', key: 0, hands: 'R', instrument: 'bass' },
  itemId: 'slice:test',
  title: { en: 't', he: 't' },
  notes,
  beats: o.beats ?? Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur))),
  meter: 4,
  keySig: 'C',
  goal: { evenness: false, hands: false },
  startBpm: 100,
  ...o,
});
const N = (beat: number, pitch = 36, dur = 1): ExpNote => ({ beat, pitch, dur, hand: 'R' });

describe('sliceDrill', () => {
  it('re-bases the notes of the chosen bars to beat 0 (constant 4/4)', () => {
    const d = mk(Array.from({ length: 16 }, (_, i) => N(i, 36 + i)), { chart: ['C', 'F', 'G', 'C'], drums: { groove: 'rock', fills: [1, 3], sections: [{ bar: 0, groove: 'rock' }, { bar: 2, groove: 'half' }] } });
    const s = sliceDrill(d, 2, 3);
    expect(s.beats).toBe(8);
    expect(s.notes.map((n) => n.beat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(s.notes[0].pitch).toBe(36 + 8);
    expect(s.chart).toEqual(['G', 'C']);
    expect(s.drums?.fills).toEqual([1]);
    expect(s.drums?.sections).toEqual([{ bar: 0, groove: 'half' }]);
    expect(s.itemId).toBe('slice:test~loop2-3');
    expect(s.meter).toBe(4);
  });
  it('orders the bars and clamps them to the drill', () => {
    const d = mk(Array.from({ length: 8 }, (_, i) => N(i)));
    expect(sliceDrill(d, 5, 1).beats).toBe(4);
    expect(sliceDrill(d, 1, 0).notes.length).toBe(8);
  });
  it('a mixed-meter drill: the meter in force becomes bar 0, staffLines of the slice = the sliced bars', () => {
    const d = withBarPlan(mk([N(0, 36, 1), N(7), N(14), N(21), N(29)], { pulse: 8, beats: 30 }), [['7/8', 2], ['4/4', 2]]);
    expect(drillBars(d).map((b) => b.start)).toEqual([0, 7, 14, 22]);
    const s = sliceDrill(d, 1, 2);
    expect(s.meter).toBe(7);
    expect(s.meters).toEqual([{ bar: 0, meter: { num: 7, den: 8 } }, { bar: 1, meter: { num: 4, den: 4 } }]);
    expect(s.beats).toBe(15);
    expect(s.notes.map((n) => n.beat)).toEqual([0, 7, 14]);
    const full = staffLines(d, 8).flatMap((l) => l.bars).slice(1, 3).map((b) => b.cur);
    expect(staffLines(s, 8).flatMap((l) => l.bars).map((b) => b.cur)).toEqual(full);
  });
  it('a generated scale: the slice keeps the bar\'s own notes', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', octaves: 2 } as never);
    const bars = drillBars(d);
    expect(bars.length).toBeGreaterThan(1);
    const s = sliceDrill(d, 1, 1);
    const want = d.notes.filter((n) => barOfBeat(d, n.beat) === 1);
    expect(s.notes.map((n) => n.pitch)).toEqual(want.map((n) => n.pitch));
    expect(Math.min(...s.notes.map((n) => n.beat))).toBeGreaterThanOrEqual(0);
  });
  it('the loop tempo is 10 % slower, two clean passes', () => {
    expect(loopBpm(80)).toBe(72);
    expect(loopBpm(31)).toBe(30);
    expect(LOOP_PASSES).toBe(2);
  });
});
