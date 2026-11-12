import { describe, expect, it } from 'vitest';
import { grooveAnswer, grooveOver, groovePoints, grooveResult, grooveRound, grooveSound, isGrooveSave, newGrooveSave, roundOf, styleById, stylesAt, GROOVE_ROUNDS, GROOVE_STYLES } from '../src/engine/nameGroove';
import { clearsRun, tierDef, TIERS } from '../src/engine/gameTiers';

describe('Name That Groove', () => {
  it('every tier has a level with new styles; ids unique; patterns well formed', () => {
    TIERS.forEach((t, i) => {
      const lv = tierDef('namegroove', t)?.levels?.[0];
      expect(lv).toBe(i + 1);
      expect(GROOVE_STYLES.filter((s) => s.level === lv).length).toBeGreaterThanOrEqual(3);
    });
    expect(new Set(GROOVE_STYLES.map((s) => s.id)).size).toBe(GROOVE_STYLES.length);
    for (const s of GROOVE_STYLES) {
      expect(s.bar.groups.reduce((a, b) => a + b, 0)).toBe(s.bar.steps);
      for (const v of Object.values(s.bar.lanes)) if (v) expect(v.length).toBe(s.bar.steps);
      for (const l of s.like) expect(styleById(l)).toBeTruthy();
    }
  });

  it('rounds: deterministic, up to 4 distinct options from open styles, the answer among them', () => {
    for (let lv = 1; lv <= 6; lv++) {
      const open = new Set(stylesAt(lv).map((s) => s.id));
      for (let i = 0; i < 30; i++) {
        const r = grooveRound(77, i, lv);
        expect(grooveRound(77, i, lv)).toEqual(r);
        // pp has three styles (rock, pop, half-time): three options there
        expect(r.options).toHaveLength(Math.min(4, open.size));
        expect(new Set(r.options).size).toBe(r.options.length);
        expect(r.options).toContain(r.answer);
        for (const o of r.options) expect(open.has(o)).toBe(true);
      }
    }
  });

  it('the newest tier is asked often; from f the decoys are look-alikes', () => {
    let newest = 0;
    for (let i = 0; i < 200; i++) if (styleById(grooveRound(5, i, 4).answer)!.level === 4) newest++;
    expect(newest).toBeGreaterThan(60);
    for (let i = 0; i < 40; i++) {
      const r = grooveRound(11, i, 6);
      const like = styleById(r.answer)!.like.filter((l) => stylesAt(6).some((s) => s.id === l));
      for (const l of like.slice(0, 3)) expect(r.options).toContain(l);
    }
  });

  it('two bars of sound', () => {
    const r = grooveRound(3, 0, 1);
    const snd = grooveSound(r);
    expect(snd.events.length).toBeGreaterThan(8);
    expect(snd.length).toBeGreaterThan(2);
  });

  it('points fall with time; a run of 10 rounds and its result', () => {
    expect(groovePoints(1000)).toBe(10);
    expect(groovePoints(12000)).toBe(5);
    let s = newGrooveSave(99, 3, 'mp');
    for (let i = 0; i < GROOVE_ROUNDS; i++) {
      expect(isGrooveSave(s)).toBe(true);
      const r = roundOf(s);
      s = grooveAnswer(s, i < 8 ? r.answer : r.options.find((o) => o !== r.answer)!, 1500).state;
    }
    expect(grooveOver(s)).toBe(true);
    const res = grooveResult(s);
    expect(res.score).toBe(80);
    expect(res.detail).toMatchObject({ right: 8, wrong: 2, accuracy: 80, tier: 'mp', rounds: 10 });
    expect(clearsRun('namegroove', 'mp', res.score, res.detail)).toBe(true);
  });
});
