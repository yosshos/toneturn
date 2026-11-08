import { describe, expect, it } from 'vitest';
import { checkPhraseRule, developmentScore, judgeVariation, motifReturns, phraseToVary, phrasesOf, phrasingReport, tradeAnswer, type PNote } from '../src/engine/improvPhrasing';

const line = (xs: [number, number][], dur = 0.5): PNote[] => xs.map(([beat, midi]) => ({ beat, dur, midi }));

describe('phrasing', () => {
  const two = line([[0, 60], [0.5, 62], [1, 64], [1.5, 67], [6, 65], [6.5, 64], [7, 62]]);
  it('splits phrases at rests and measures arcs, space and density', () => {
    const ps = phrasesOf(two);
    expect(ps).toHaveLength(2);
    expect(ps[0].peakAt).toBe(1); // builds to the end
    const r = phrasingReport(two, 8);
    expect(r.phrases).toBe(2);
    expect(r.space).toBeGreaterThan(0.4);
    expect(r.buildingArcs).toBe(1);
  });
  it('checks rules: max density, a bar of rest', () => {
    expect(checkPhraseRule(two, 8, { kind: 'max-density', perBeat: 2 }).ok).toBe(true);
    expect(checkPhraseRule(two, 8, { kind: 'max-density', perBeat: 1 }).ok).toBe(false);
    expect(checkPhraseRule(two, 8, { kind: 'rest-bar', meter: 4 }).ok).toBe(true);
    expect(checkPhraseRule(line([[0, 60], [1, 62], [3, 64], [3.5, 65]]), 4, { kind: 'rest-bar', meter: 4 }).ok).toBe(false);
  });
});

describe('motif development', () => {
  it('finds a sequence, an inversion and a displaced return', () => {
    const m = [[0, 60], [0.5, 62], [1, 64]] as [number, number][];
    const seq = m.map(([b, p]) => [b + 4, p + 2]) as [number, number][];
    const inv = m.map(([b, p], i) => [b + 8, 64 - (p - 60) + (i ? 0 : 0)]) as [number, number][];
    const disp = m.map(([b, p]) => [b + 13, p]) as [number, number][];
    const r = motifReturns(line([...m, ...seq, ...inv, ...disp]));
    expect(r.returns.map((x) => x.how)).toEqual(['sequence', 'inversion', 'displaced']);
    expect(developmentScore(r.returns)).toBeGreaterThan(0.6);
    expect(developmentScore([])).toBe(0);
  });
});

describe('vary this phrase', () => {
  const g = line([[0, 60], [0.5, 64], [1, 67], [2, 65]]);
  it('hears the same phrase, a displacement, a transposition and an ornament', () => {
    expect(judgeVariation(g, g, 'displace').heard).toBe('same');
    const d = g.map((n) => ({ ...n, beat: n.beat + 1 }));
    expect(judgeVariation(g, d, 'displace')).toMatchObject({ heard: 'displace', ok: true });
    const t = g.map((n) => ({ ...n, midi: n.midi + 5 }));
    expect(judgeVariation(g, t, 'transpose')).toMatchObject({ heard: 'transpose', ok: true });
    const o = line([[0, 60], [0.25, 62], [0.5, 64], [1, 67], [1.5, 69], [2, 65]]);
    expect(judgeVariation(g, o, 'ornament')).toMatchObject({ heard: 'ornament', ok: true });
    expect(judgeVariation(g, line([[0, 80], [0.5, 50]]), 'answer').heard).toBe('unrelated');
  });
  it('makes phrases to vary and answers in trading fours', () => {
    const p = phraseToVary(7);
    expect(p.length).toBeGreaterThanOrEqual(4);
    const a = tradeAnswer(p, 60, 16);
    expect(a[0].beat).toBe(16);
    expect(a[a.length - 1].midi).toBe(72);
  });
});
