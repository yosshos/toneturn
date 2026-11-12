import { describe, expect, it } from 'vitest';
import { FRET_LEVELS, fretAnswers, fretTarget, ladderOf, shiftPair } from '../src/engine/rush';
import { noteAt, tuningById } from '../src/engine/fretboard';
import { tierDef } from '../src/engine/gameTiers';

describe('Fretboard ff levels 8–9 (0.76)', () => {
  it('drop-2 / drop-3 tones and G–B shift intervals are always reachable', () => {
    for (const tn of ['standard', 'drop-d', 'dadgad', 'bass', 'bass5', 'bass6'])
      for (const lv of [8, 9])
        for (let s = 0; s < 80; s++) {
          const tuning = tuningById(tn);
          const t = fretTarget(s * 7919 + 13, lv, tuning);
          expect(t.strings.length).toBe(1);
          expect(fretAnswers(t, tuning).length).toBeGreaterThan(0);
          expect(t.name.he.length).toBeGreaterThan(3);
        }
  });
  it('level 8 on a guitar names a drop grip; on a bass it falls back to chord tones', () => {
    const g = fretTarget(42, 8, tuningById('standard'));
    expect(g.name.en).toMatch(/^Drop [23] /);
    const b = fretTarget(42, 8, tuningById('bass'));
    expect(b.name.en).not.toMatch(/^Drop/);
  });
  it('drop 2 root on string 5: the asked degree is the grip note near the root', () => {
    const tu = tuningById('standard');
    for (let s = 0; s < 60; s++) {
      const t = fretTarget(s * 31 + 1, 8, tu);
      const [lo, hi] = t.frets;
      expect(hi - lo).toBeLessThanOrEqual(6);
      // exactly one place: the grip's note
      expect(fretAnswers(t, tu)).toHaveLength(1);
    }
  });
  it('the G–B pair is strings 3 → 2 on a guitar; the exact pitch is asked', () => {
    expect(shiftPair(tuningById('standard'))).toEqual([3, 2]);
    expect(shiftPair(tuningById('bass'))).toHaveLength(2);
    const tu = tuningById('standard');
    for (let s = 0; s < 40; s++) {
      const t = fretTarget(s * 101 + 7, 9, tu);
      expect(t.midi).toBeDefined();
      expect([2, 3]).toContain(t.strings[0]);
      const a = fretAnswers(t, tu)[0];
      expect(noteAt(tu, a.str, a.fret)).toBe(t.midi);
    }
  });
  it('the ff tier ladder names levels 6–9', () => {
    const rungs = tierDef('rush-fretboard', 'ff')!.rungs!;
    const lad = ladderOf({ mode: 'fretboard', rungs });
    expect(lad.map((r) => r.name.en)).toEqual([FRET_LEVELS[5].en, FRET_LEVELS[6].en, FRET_LEVELS[7].en, FRET_LEVELS[8].en]);
    expect(FRET_LEVELS).toHaveLength(9);
  });
});
