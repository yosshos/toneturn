// "I use a different fingering": an item marked as the player's own never feeds a finger hypothesis against the
// suggested fingering; the player's numbers are used where entered; the keyboard's next-key finger follows the take.
import { describe, expect, it } from 'vitest';
import type { Drill, ExpNote } from '../src/engine/drills/types';
import { analysisDrill, anyOwn, cycleFinger, isOwn, nextFingers, resetOwn, setOwn, shownDrill } from '../src/engine/drills/ownFingering';
import { contextsOf, emptyModel, fingerHypotheses } from '../src/engine/analysis/model';
import { newBestOf } from '../src/ui/studio/NewBestTempo';

const note = (pitch: number, beat: number, finger?: number, hand: 'R' | 'L' = 'R'): ExpNote => ({ pitch, beat, dur: 1, hand, ...(finger ? { finger } : {}) });
const drill = (notes: ExpNote[]): Drill => ({ itemId: 'scale:C:R', notes, spec: { family: 'scales', key: 0, instrument: 'piano' } } as unknown as Drill);
const D = drill([note(60, 0, 1), note(62, 1, 2), note(64, 2, 3), note(65, 3, 1)]);

describe('own fingering', () => {
  it('marks and unmarks an item', () => {
    let own = setOwn(undefined, D.itemId, true);
    expect(isOwn(own, D.itemId)).toBe(true);
    expect(anyOwn(own)).toBe(true);
    own = setOwn(own, D.itemId, false);
    expect(isOwn(own, D.itemId)).toBe(false);
    expect(anyOwn(own)).toBe(false);
  });

  it('cycles a finger from what is shown, and shows the player numbers', () => {
    let own = setOwn(undefined, D.itemId, true);
    own = cycleFinger(own, D, 3); // suggested 1 -> 2
    expect(own[D.itemId]).toEqual([0, 0, 0, 2]);
    own = cycleFinger(own, D, 3);
    expect(own[D.itemId][3]).toBe(3);
    expect(shownDrill(D, own).notes.map((n) => n.finger)).toEqual([1, 2, 3, 3]);
    expect(resetOwn(own, D.itemId)[D.itemId]).toEqual([]);
  });

  it('feeds the model the player numbers only (no suggested finger where none was entered)', () => {
    const own = cycleFinger(setOwn(undefined, D.itemId, true), D, 3);
    const a = analysisDrill(D, own);
    expect(a.notes.map((n) => n.finger)).toEqual([undefined, undefined, undefined, 2]);
    expect(contextsOf(a, 0, 90).some((c) => c.startsWith('f:'))).toBe(false);
    expect(contextsOf(a, 3, 90)).toContain('f:R2');
    // an unmarked item is untouched
    expect(analysisDrill(D, {})).toBe(D);
  });

  it('the model flag silences finger hypotheses', () => {
    const m = { ...emptyModel(), ownFingering: true };
    expect(fingerHypotheses(m)).toEqual([]);
  });

  it('names the next key and its finger', () => {
    expect(nextFingers(D, -1)).toEqual([{ pitch: 60, finger: 1, hand: 'R' }]);
    expect(nextFingers(D, 1.5)).toEqual([{ pitch: 64, finger: 3, hand: 'R' }]);
    expect(nextFingers(D, 3)).toEqual([]);
    const hands = drill([note(60, 0, 1), note(48, 0, 5, 'L'), note(62, 1, 2)]);
    expect(nextFingers(hands, -1).map((x) => x.finger)).toEqual([1, 5]);
  });
});

describe('new best tempo', () => {
  it('is a clean take above the previous best clean tempo', () => {
    expect(newBestOf(100, 108, true)).toEqual({ bpm: 108, prev: 100 });
    expect(newBestOf(100, 108, false)).toBeNull();
    expect(newBestOf(0, 80, true)).toBeNull(); // the first clean take is not a record
    expect(newBestOf(100, 100, true)).toBeNull();
  });
});
