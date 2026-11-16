// The extra mark (COURSE-FEEDBACK-UI §4.1): played notes not in the score keep their pitch and time in the take, so the
// staff draws a small ✕ above it where they were played (drums: a pink ✕ in the lane); live and in the review.
import { describe, expect, it } from 'vitest';
import { analyzeTake, beatAtMs } from '../src/engine/drills/analyze';
import { analyzeDrumTake } from '../src/engine/drills/drumAnalyze';
import { liveGrade } from '../src/engine/drills/liveGrade';
import { extraIndex } from '../src/engine/noteMarks';
import type { Drill, ExpNote, PlayedNote } from '../src/engine/drills/types';

const mk = (notes: ExpNote[], o: Partial<Drill> = {}): Drill => ({
  spec: { family: 'scales', kind: 'extras-test', key: 0, hands: 'R', instrument: 'piano' },
  itemId: 'extras:test',
  title: { en: 't', he: 't' },
  notes,
  beats: 8,
  meter: 4,
  keySig: 'C',
  goal: { evenness: false, hands: false },
  startBpm: 60,
  ...o,
});
const N = (beat: number, pitch: number): ExpNote => ({ beat, pitch, dur: 1, hand: 'R' });
const P = (beatAt: number, pitch: number, bpm = 60): PlayedNote => ({ pitch, on: (beatAt * 60000) / bpm, off: (beatAt * 60000) / bpm + 400, vel: 70 });

describe('extras: played notes not in the score', () => {
  const d = mk([N(0, 60), N(1, 62), N(2, 64), N(3, 65)]);
  it('a note between the written ones is kept with its pitch and beat; a clean take has none', () => {
    const clean = analyzeTake(d, 60, [P(0, 60), P(1, 62), P(2, 64), P(3, 65)]);
    expect(clean.extras).toBeUndefined();
    const m = analyzeTake(d, 60, [P(0, 60), P(1, 62), P(1.5, 70), P(2, 64), P(3, 65)]);
    expect(m.extras).toHaveLength(1);
    expect(m.extras![0].pitch).toBe(70);
    expect(m.extras![0].beat).toBeCloseTo(1.5, 3);
    // the written notes are untouched; the extra is counted in "wrong" as before
    expect(m.perNote.every((r) => r.ok)).toBe(true);
    expect(m.wrong).toBe(1);
  });
  it('a wrong pitch on a written note: the note is missed and the played one is an extra at its time', () => {
    const m = analyzeTake(d, 60, [P(0, 60), P(1, 63), P(2, 64), P(3, 65)]);
    expect(m.perNote[1].played).toBeNull();
    expect(m.extras?.map((e) => [e.pitch, Math.round(e.beat * 100) / 100])).toEqual([[63, 1]]);
  });
  it('live: an extra shows once it has settled (80 ms after it was played)', () => {
    const m = analyzeTake(d, 60, [P(0, 60), P(1.5, 70)]);
    expect(liveGrade(d, m, 60, 1500 + 20).extras).toHaveLength(0);
    expect(liveGrade(d, m, 60, 1500 + 200).extras).toHaveLength(1);
  });
  it('drums: an extra hit keeps its drum', () => {
    const dd = mk([{ beat: 0, pitch: 38, dur: 1, hand: 'R', voice: 'snare' }, { beat: 1, pitch: 38, dur: 1, hand: 'R', voice: 'snare' }], { spec: { family: 'd-rock', kind: 'x', key: 0, hands: 'R', instrument: 'drums' } });
    const m = analyzeDrumTake(dd, 60, [{ voice: 'snare', on: 0, vel: 80 }, { voice: 'crash', on: 500, vel: 90 }, { voice: 'snare', on: 1000, vel: 80 }]);
    expect(m.extras?.map((e) => e.voice)).toEqual(['crash']);
    expect(m.extras![0].beat).toBeCloseTo(0.5, 3);
  });
  it('beatAtMs inverts the plain clock', () => {
    expect(beatAtMs(d, 2500, 60)).toBeCloseTo(2.5, 6);
    expect(beatAtMs(d, 750, 120)).toBeCloseTo(1.5, 6);
  });
});

describe('extraIndex: where the ✕ goes on a drawn line', () => {
  it('between items, at an item, before the first, past the end', () => {
    expect(extraIndex([0, 1, 2, 3], 1.5, 4)).toBeCloseTo(1.5);
    expect(extraIndex([0, 1, 2, 3], 2, 4)).toBe(2);
    expect(extraIndex([0, 1, 2, 3], 3.5, 4)).toBeCloseTo(3.5);
    expect(extraIndex([0, 1, 2, 3], 4, 4)).toBeNull();
    expect(extraIndex([1, 2], 0.7, 4)).toBe(0);
    expect(extraIndex([1, 2], 0.2, 4)).toBeNull();
  });
  it('items starting together (two voices) share a position: the index is the group\'s first', () => {
    // voice 1 and voice 2 start together at 0 and 2
    const ats = [0, 0, 1, 2, 2];
    expect(extraIndex(ats, 0.5, 4)).toBeCloseTo(0.5);
    expect(extraIndex(ats, 2.5, 4)).toBeCloseTo(3.25);
  });
});
