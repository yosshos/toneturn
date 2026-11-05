import { describe, expect, it } from 'vitest';
import { AID_DISCOUNT, aidFor, aidsOn, contentNotes, guitarPosition, guitarPositions, spellMidi, withAids } from '../src/engine/aids';
import { degreeQuestion, LESSON_ORDER, makeLesson, noteNameQuestion, singQuestion } from '../src/engine/lesson';
import { placementLesson } from '../src/engine/adaptive';
import { pc } from '../src/engine/pitch';
import { xpFor } from '../src/engine/scoring';
import { keysGiveAway } from '../src/game/content';

describe('visual aids (spec M)', () => {
  it('heard degree → key map (no sounding note); name → degree → lookup; singing → target', () => {
    const q = degreeQuestion('a', pc('Eb'), 5, [1, 3, 5]);
    expect(aidFor(q)!.kind).toBe('keymap');
    expect(aidFor(q)!.notes).not.toContain(q.targetMidi + 0.5); // just the scale
    expect(aidFor(noteNameQuestion('b', pc('Eb'), 6, false))!.kind).toBe('lookup');
    expect(aidFor(singQuestion('c', pc('C'), 5))).toMatchObject({ kind: 'target', notes: [67] });
  });
  it('an aid never shows the answer of a listening item: key maps hold the whole scale, not one marked note', () => {
    for (const id of LESSON_ORDER)
      for (const q of makeLesson(id, 3).questions) {
        const a = aidFor(q);
        if (a && a.kind === 'keymap') expect(a.notes).toHaveLength(7);
        if (a && a.kind === 'target') expect(keysGiveAway(q)).toBe(false); // targets only where the sound is context
      }
  });
  it('auto: on below Solid, off from Solid; always / never', () => {
    expect(aidsOn('auto', 'degrees', {})).toBe(true);
    expect(aidsOn('auto', 'degrees', { degrees: { r: 1150, n: 10, correct: 8, recent: [] } })).toBe(false);
    expect(aidsOn('always', 'degrees', { degrees: { r: 1500, n: 10, correct: 8, recent: [] } })).toBe(true);
    expect(aidsOn('never', 'degrees', {})).toBe(false);
  });
  it('aided items are easier (difficulty) and give 80 % XP; placement never gets aids', () => {
    const l = makeLesson('degrees-135', 2);
    const a = withAids(l, 'always', {});
    expect(a.questions[0].aid).toBe('keymap');
    expect(a.questions[0].difficulty).toBe(l.questions[0].difficulty - AID_DISCOUNT.keymap);
    const o = { correctOn: 1, attempts: 1, timeMs: null, timed: false } as never;
    expect(xpFor(a.questions[0], o, 20)).toBeLessThan(xpFor(l.questions[0], o, 20));
    const p = placementLesson(1);
    expect(withAids(p, 'always', {})).toBe(p);
  });
  it('content notes for the views after answering', () => {
    expect(contentNotes(degreeQuestion('a', pc('C'), 5, [1, 5]))!.notes).toHaveLength(1);
    const chord = makeLesson('major-minor', 1).questions[0];
    expect(contentNotes(chord)!.chord).toBe(true);
  });
  it('spells notes in the key and places them on the guitar in first position', () => {
    expect(spellMidi(70, pc('Eb'))).toEqual({ letter: 'B', acc: -1, octave: 4 });
    expect(spellMidi(66, pc('G'))).toEqual({ letter: 'F', acc: 1, octave: 4 });
    expect(spellMidi(61, pc('C'))).toEqual({ letter: 'D', acc: -1, octave: 4 });
    expect(guitarPosition(60)).toEqual({ str: 2, fret: 1 }); // C4 on the B string
    expect(guitarPosition(64)).toEqual({ str: 1, fret: 0 }); // open high E
    expect(guitarPosition(40)).toEqual({ str: 6, fret: 0 });
    expect(guitarPosition(72)).toEqual({ str: 1, fret: 8 }); // above first position: high E string
  });

  it('a lookup never labels the answer: only the tonic is numbered', () => {
    const a = aidFor(noteNameQuestion('b', pc('Eb'), 6, false))!;
    expect(a.labels!.filter(Boolean)).toEqual(['1']);
  });
  it('a passage is tabbed in one hand position (≤ 5 frets apart)', () => {
    const scale = [63, 65, 67, 68, 70, 72, 74];
    const pos = guitarPositions(scale);
    const frets = pos.map((p) => p.fret).filter((f) => f > 0);
    expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
    const opens = [64, 59, 55, 50, 45, 40];
    pos.forEach((p, i) => expect(opens[p.str - 1] + p.fret).toBe(scale[i]));
  });
});
