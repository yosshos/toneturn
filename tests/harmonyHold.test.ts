import { describe, expect, it } from 'vitest';
import { addHoldTake, centsToPc, gradeHold, holdEvents, holdOver, holdResult, holdTakeAt, inRange, isHoldSave, makeHoldTake, newHoldSave, segmentScore, HOLD_TAKES } from '../src/engine/harmonyHold';
import { clearsRun, tierDef } from '../src/engine/gameTiers';

const pc = (x: number) => ((x % 12) + 12) % 12;

describe('harmony hold: targets per tier', () => {
  it('is deterministic and gives four chords at every level', () => {
    for (let lv = 1; lv <= 6; lv++) {
      for (let s = 0; s < 30; s++) {
        const a = makeHoldTake(s * 977 + 1, lv);
        expect(a).toEqual(makeHoldTake(s * 977 + 1, lv));
        expect(a.chords).toHaveLength(4);
        for (const c of a.chords) expect(c.pc).toBe(pc(c.pc));
      }
    }
  });
  it('level 1 holds one note that belongs to every chord', () => {
    for (let s = 0; s < 40; s++) {
      const t = makeHoldTake(s + 3, 1);
      expect(new Set(t.chords.map((c) => c.pc)).size).toBe(1);
      for (const c of t.chords) expect(c.ints.map((x) => pc(c.root + x))).toContain(c.pc);
    }
  });
  it('levels 2–5 ask chord tones; 3–5 only 3rds and 7ths; 4–5 alternate them', () => {
    for (let s = 0; s < 40; s++) {
      for (const c of makeHoldTake(s, 2).chords) expect(['root', '3', '5']).toContain(c.tone);
      for (const lv of [3, 4, 5]) {
        const t = makeHoldTake(s, lv);
        for (const c of t.chords) {
          expect(['3', '7']).toContain(c.tone);
          expect(c.ints.map((x) => pc(c.root + x))).toContain(c.pc);
        }
        if (lv >= 4) for (let i = 1; i < 4; i++) expect(t.chords[i].tone).not.toBe(t.chords[i - 1].tone);
      }
    }
  });
  it('level 6 asks upper extensions over dominants', () => {
    const want: Record<string, number> = { '9': 2, '#11': 6, '13': 9, b9: 1 };
    for (let s = 0; s < 40; s++) {
      for (const c of makeHoldTake(s, 6).chords) {
        expect(Object.keys(want)).toContain(c.tone);
        expect(c.ints).toEqual([0, 4, 7, 10]);
        expect(pc(c.pc - c.root)).toBe(want[c.tone]);
      }
    }
  });
  it('the piano never plays the sung pitch class', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let s = 0; s < 20; s++) {
        const t = makeHoldTake(s, lv);
        const ev = holdEvents(t, 80);
        t.chords.forEach((c, i) => {
          const mine = ev.filter((e) => Math.abs(e.start - i * 3) < 1e-6);
          expect(mine.length).toBeGreaterThan(0);
          for (const e of mine) expect(pc(e.midi)).not.toBe(c.pc);
        });
      }
  });
});

describe('harmony hold: folding and scoring', () => {
  it('folds cents to the nearest octave of the pitch class', () => {
    expect(centsToPc(60, 0)).toBe(0);
    expect(centsToPc(72.3, 0)).toBe(30);
    expect(centsToPc(47.8, 0)).toBe(-20);
    expect(centsToPc(66, 0)).toBe(600);
    expect(inRange(4, 55, 67)).toBe(64);
    expect(inRange(1, 48, 60)).toBe(49);
  });
  it('scores a segment by its median: full in the window, none at 3×', () => {
    expect(segmentScore([10, -5, 12, 8, 300], 30).score).toBe(1);
    expect(segmentScore([60, 60, 60, 60], 30).score).toBe(0.5);
    expect(segmentScore([95, 95, 95, 95], 30).score).toBe(0);
    expect(segmentScore([0, 0], 30)).toEqual({ score: 0, err: null });
    const g = gradeHold([[0, 0, 0, 0], [60, 60, 60, 60], [], [5, 5, 5, 5]], 30);
    expect(g.score).toBe(63);
    expect(g.errs[2]).toBeNull();
  });
});

describe('harmony hold: the run', () => {
  it('five takes, resumable, result clears at 85', () => {
    let s = newHoldSave(42, 4, 30, 'mf');
    expect(isHoldSave(s)).toBe(true);
    expect(holdTakeAt(s)).toEqual(holdTakeAt({ ...s }));
    for (let i = 0; i < HOLD_TAKES; i++) s = addHoldTake(s, 90);
    expect(holdOver(s)).toBe(true);
    expect(isHoldSave(s)).toBe(false);
    const r = holdResult(s);
    expect(r.detail).toMatchObject({ accuracy: 90, rounds: 5, level: 4, tier: 'mf', input: 'mic' });
    expect(clearsRun('harmonyhold', 'mf', r.score, r.detail)).toBe(true);
    expect(clearsRun('harmonyhold', 'mf', 0, { ...r.detail, accuracy: 70 })).toBe(false);
    expect(tierDef('harmonyhold', 'ff')?.levels).toEqual([6]);
  });
});
