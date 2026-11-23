// The SPEC-RBI-ROTATION audit (2026-11-23): each defect reproduced, then fixed. Track A, T1–3 (T4+ unreachable).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IMPROV_LEVELS, parseChart, parseChord } from '../src/engine/charts';
import { spansOfChart } from '../src/engine/ruleCards';
import { avoidPcs, classifyNotes, colourNotes, harmonyOf, insertSubs, MENUS, qualityOf, rotationMetrics, subFits, type ChordSpan, type HarmonySpan } from '../src/engine/rotation';
import { buildRotationSheet, cellNotes, FN_NAME, nextCell, nextChange, tonicOfChart, weakestLine } from '../src/engine/rotationSheet';

const lvl = (n: number) => IMPROV_LEVELS.find((x) => x.n === n)!.text;
const iv = (sym: string) => parseChord(`C${sym}`)!.iv;
const harm = (text: string, tonic?: number) => {
  const p = parseChart(text);
  return harmonyOf(spansOfChart(p, 4, p.bars), tonic ?? tonicOfChart(p));
};
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('1. a chord symbol’s quality comes from its 3rd and 7th, never from a ♯9', () => {
  it('7alt and 7♯9 are dominants; level 5 serves a V→minor scale over G7alt, never Dorian', () => {
    expect(qualityOf(iv('7alt'))).toBe('dom');
    expect(qualityOf(iv('7#9'))).toBe('dom');
    for (const tier of [1, 2, 3])
      for (const seed of [1, 2, 3, 4, 5]) {
        const g = buildRotationSheet(lvl(5), { tier, seed })!.cells.filter((c) => c.sym === 'G7alt');
        expect(g.length).toBeGreaterThan(0);
        for (const c of g) {
          expect(c.mode).not.toBe('dorian');
          if (!c.sub) expect(c.fn).toBe('V-min');
        }
      }
  });
  it('the other symbol forms', () => {
    const want: Record<string, string> = { '7b9': 'dom', '7#11': 'dom', '13': 'dom', '13b9': 'dom', '7b13': 'dom', '7#5': 'dom', '9': 'dom', '7sus4': 'sus', '9sus4': 'sus', '7b9sus4': 'sus', '11': 'sus', 'm(maj7)': 'mtonic', mM7: 'mtonic', '69': 'maj', '6': 'maj', maj7: 'maj', 'maj7#11': 'maj', ø: 'hd7', m7b5: 'hd7', '°7': 'dim7', dim7: 'dim7', m6: 'mtonic', m7: 'm7', m9: 'm7', m11: 'm7' };
    for (const [s, q] of Object.entries(want)) expect(qualityOf(iv(s)), s).toBe(q);
  });
});

describe('2. a V held over two bars resolves from its first bar', () => {
  it('Dm7 | G7 | G7 | Cmaj7: both G7 bars are V→major', () => {
    expect(harm('Dm7 | G7 | G7 | Cmaj7', 0).map((x) => x.fn)).toEqual(['ii', 'V-maj', 'V-maj', 'I']);
    expect(harm('Dm7b5 | G7 | G7 | Cm6', 0).map((x) => x.fn)).toEqual(['iiø', 'V-min', 'V-min', 'i']);
  });
});

describe('3. secondary dominants: D7 → G7 takes Mixolydian / Lydian dominant', () => {
  it('a dominant resolving to a dominant gets the secondary menu, not the V→major one', () => {
    const h = harm('Cmaj7 | D7 | G7 | Cmaj7', 0);
    expect(h[1].fn).toBe('V-sec');
    expect(MENUS['V-sec'].map((e) => e.mode)).toEqual(['mixolydian', 'lydian-dominant']);
    // A7 → Dm takes the minor-target menu (HM5 / altered)
    expect(harm('Cmaj7 | A7 | Dm7 | G7', 0)[1].fn).toBe('V-min');
  });
});

describe('4. the tritone sub’s own scale', () => {
  it('D♭7 for G7 defaults to Lydian dominant, its colour note the ♯11 (G), with the "same notes as G altered" note', () => {
    const sh = buildRotationSheet(lvl(4), { tier: 3 })!;
    const tt = sh.cells.find((c) => c.sub?.sym === 'D♭7')!;
    expect(tt.mode).toBe('lydian-dominant');
    expect(tt.same).toEqual({ rootName: 'G', mode: 'altered' });
    expect(colourNotes('V-sub', 'lydian-dominant', 1)).toEqual([7]);
    const ui = src('ui/ScaleRotation.tsx');
    expect(ui).toMatch(/tx\.sameNotes/);
  });
});

describe('5. the tritone sub: only on V→major below T4, on a whole bar by the meter', () => {
  it('never on V→minor at T1–3', () => {
    for (const tier of [1, 2, 3]) expect(insertSubs(harm('Dm7b5 | G7 | Cm6 | Cm6', 0), tier, 0).some((x) => x.sub?.label.en === 'Tritone sub')).toBe(false);
  });
  it('a whole bar in the meter: a 4-beat V in 6/4 is not a whole bar', () => {
    const p = parseChart('Dm7 | G7 / | Cmaj7 | Cmaj7', 6);
    const h = harmonyOf(spansOfChart(p, 6, p.bars), 0);
    expect(h[1].beats).toBe(6);
    expect(insertSubs(h, 3, 0, 6).find((x) => x.sub?.label.en === 'Tritone sub')!.at).toBe(9);
    const short: ChordSpan[] = [{ at: 0, beats: 6, root: 2, iv: [0, 3, 7, 10] }, { at: 6, beats: 4, root: 7, iv: [0, 4, 7, 10] }, { at: 10, beats: 2, root: 7, iv: [0, 4, 7, 10] }, { at: 12, beats: 6, root: 0, iv: [0, 4, 7, 11] }];
    expect(insertSubs(harmonyOf(short, 0), 3, 0, 6).some((x) => x.sub?.label.en === 'Tritone sub')).toBe(false);
  });
});

describe('6. the tonic minor: the menu by chord quality; minor tunes', () => {
  it('mMaj7 and m6 default to melodic minor; a tonic m7 never gets the ♮7 scales; no harmonic minor over m6', () => {
    const mM = harm('Dm7b5 | G7 | CmM7 | CmM7', 0)[2];
    expect(mM.fn).toBe('iM7');
    expect(MENUS[mM.fn][0].mode).toBe('melodic-minor');
    const m6 = harm('Dm7b5 | G7 | Cm6 | Cm6', 0)[2];
    expect(MENUS[m6.fn][0].mode).toBe('melodic-minor');
    expect(MENUS[m6.fn].map((e) => e.mode)).not.toContain('harmonic-minor');
    expect(MENUS.iM7.map((e) => e.mode)).not.toContain('dorian');
    const m7 = harm('Dm7b5 | G7 | Cm7 | Cm7')[2];
    expect(m7.fn).toBe('i7');
    expect(MENUS.i7.map((e) => e.mode)).not.toContain('melodic-minor');
    expect(MENUS.i7.map((e) => e.mode)).not.toContain('harmonic-minor');
  });
  it('a tune ending on a minor chord with a V into it takes that chord as its tonic', () => {
    expect(tonicOfChart(parseChart('Ebmaj7 | Am7b5 | D7 | Gm7'))).toBe(7);
    expect(tonicOfChart(parseChart('Bbmaj7 | Ebmaj7 | Am7b5 D7 | Gm6'))).toBe(7);
    expect(tonicOfChart(parseChart('Ebmaj7 | Cm7 | Fm7 | Bb7'))).toBe(3);
  });
  it('IV in major gets Lydian', () => {
    const h = harm('Cmaj7 | Fmaj7 | G7 | Cmaj7', 0);
    expect(h[1].fn).toBe('IV');
    expect(MENUS.IV[0].mode).toBe('lydian');
  });
});

const fits = (h: HarmonySpan[]) => {
  for (let i = 0; i < h.length; i++) if (h[i].sub) expect(subFits(h[i], h[i + 1]), h[i].sub!.label.en).toBe(true);
};

describe('7. the T1–3 subs in the spec', () => {
  it('T2 sus before a whole-bar V→major: | G7sus4 G7 |, the 4th resolving to the 3rd', () => {
    const h = insertSubs(harm('Dm7 | G7 | Cmaj7 | Cmaj7', 0), 2, 0);
    const sus = h.find((x) => x.sub?.label.en === 'Sus before V')!;
    expect(sus.at).toBe(4);
    expect(sus.beats).toBe(2);
    expect(sus.fn).toBe('sus');
    expect(h.find((x) => x.at === 6)!.fn).toBe('V-maj');
    expect(insertSubs(harm('Dm7 | G7 | Cmaj7 | Cmaj7', 0), 1, 0).some((x) => x.sub)).toBe(false);
    fits(h);
  });
  it('T2 iii for I before VI7: | Cmaj7 A7 | → | Em7 A7 |', () => {
    const h = insertSubs(harm('Cmaj7 A7 | Dm7 G7 | Cmaj7 | Cmaj7', 0), 2, 0);
    const iii = h.find((x) => x.sub?.label.en === 'iii for I')!;
    expect(iii.at).toBe(0);
    expect(iii.sub!.root).toBe(4);
    expect(iii.fn).toBe('iii');
    fits(h);
  });
  it('T2 minor iv: | Fmaj7 | → | F Fm6 | before C', () => {
    const h = insertSubs(harm('Cmaj7 | Fmaj7 | Cmaj7 | Cmaj7', 0), 2, 0);
    const iv4 = h.find((x) => x.sub?.label.en === 'Minor iv')!;
    expect(iv4.at).toBe(6);
    expect(iv4.sub!.iv).toEqual([0, 3, 7, 9]);
    expect(iv4.fn).toBe('iv');
    expect(MENUS.iv.map((e) => e.mode)).toEqual(['melodic-minor', 'dorian']);
    fits(h);
  });
  it('T3 backdoor ii–V: | Dm7 G7 | C → | Fm7 B♭7 | C (level 6)', () => {
    const sh = buildRotationSheet(lvl(6), { tier: 3 })!;
    const fm = sh.cells.find((c) => c.sub?.sym === 'Fm7')!;
    const bb = sh.cells.find((c) => c.sub?.sym === 'B♭7')!;
    expect(fm.sym).toBe('Dm7');
    expect(bb.sym).toBe('G7');
    expect(bb.fn).toBe('V-sub');
    expect(bb.at).toBe(fm.at + 2);
    fits(insertSubs(harm(lvl(6), 0), 3, 0));
  });
  it('T3 temporary ii–V into a minor target: | Cmaj7 Em7♭5 A7 | Dm7', () => {
    const h = insertSubs(harm('Cmaj7 | Dm7 | G7 | Cmaj7', 0), 3, 0);
    const ii = h.find((x) => x.sub?.label.en === 'Temporary ii–V')!;
    expect(ii.at).toBe(2);
    expect(ii.beats).toBe(1);
    expect(ii.sub!.root).toBe(4);
    expect(ii.fn).toBe('iiø');
    const v = h.find((x) => x.at === 3)!;
    expect(v.sub!.root).toBe(9);
    expect(v.fn).toBe('V-min');
    fits(h);
  });
  it('every sub any tier inserts on the levels and standards meets the spec’s criteria', () => {
    for (const t of [1, 2, 3]) for (const n of [4, 5, 6]) fits(insertSubs(harm(lvl(n)), t, 0));
  });
});

describe('8. the next-scale chip: 2 bars ahead at T1–2, 1 bar at T3', () => {
  it('nextChange warns of a new scale within the horizon', () => {
    const stats = { 'V-maj|mixolydian': { n: 9, cov: 0.95, last: 'a' } };
    const t2 = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 2, stats, choruses: 2 })!;
    const i = t2.cells.findIndex((c, k) => k > 0 && nextCell(t2, c.at - 0.5)!.changed);
    expect(i).toBeGreaterThan(0);
    const at = t2.cells[i].at;
    expect(nextChange(t2, at - 7.5)?.cell).toBe(t2.cells[i]);
    expect(nextChange(t2, at - 8.5)).toBeNull();
    const t3 = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 3, stats, choruses: 1 })!;
    const j = t3.cells.findIndex((c, k) => k > 0 && nextCell(t3, c.at - 0.5)!.changed);
    if (j > 0) {
      expect(nextChange(t3, t3.cells[j].at - 3.5)?.cell).toBe(t3.cells[j]);
      expect(nextChange(t3, t3.cells[j].at - 4.5)?.cell).not.toBe(t3.cells[j]);
    }
    expect(src('ui/ScaleRotation.tsx')).toContain('nextChange(');
  });
});

describe('9. grading: an avoid note that leaves by a leap; the resolution metric; avoid notes outlined', () => {
  const h = harmonyOf([{ at: 0, beats: 4, root: 0, iv: [0, 4, 7, 11] }, { at: 4, beats: 4, root: 7, iv: [0, 4, 7, 10] }, { at: 8, beats: 4, root: 0, iv: [0, 4, 7, 11] }], 0);
  const plan = [{ span: h[0], mode: 'ionian' as const }, { span: h[1], mode: 'mixolydian' as const }, { span: h[2], mode: 'ionian' as const }];
  it('F over Cmaj7, short and off the beat, leaving by a leap is a fault; by step it is not', () => {
    const leap = [{ beat: 1.5, dur: 0.5, midi: 65 }, { beat: 2, dur: 1, midi: 72 }];
    expect(classifyNotes(leap, plan)[0]).toBe('avoid');
    expect(rotationMetrics(leap, plan).avoidFaults).toBe(1);
    const step = [{ beat: 1.5, dur: 0.5, midi: 65 }, { beat: 2, dur: 1, midi: 64 }];
    expect(rotationMetrics(step, plan).avoidFaults).toBe(0);
  });
  it('resolution: the first note of the new chord a chord tone reached by step', () => {
    // C→G7: D (step) then B (ct of G7, from C by a half step) ✓; G7→C: F then E (ct, step) ✓ / then G by a leap ✗
    const good = [{ beat: 3, dur: 1, midi: 72 }, { beat: 4, dur: 1, midi: 71 }, { beat: 7, dur: 1, midi: 65 }, { beat: 8, dur: 1, midi: 64 }];
    expect(rotationMetrics(good, plan).resolution).toBe(1);
    expect(rotationMetrics(good, plan).changes).toBe(2);
    const half = [{ beat: 3, dur: 1, midi: 72 }, { beat: 4, dur: 1, midi: 71 }, { beat: 7, dur: 1, midi: 62 }, { beat: 8, dur: 1, midi: 67 }];
    expect(rotationMetrics(half, plan).resolution).toBe(0.5);
    expect(src('ui/ScaleRotation.tsx')).toMatch(/tier >= 3/);
  });
  it('the keyboard outlines avoid notes', () => {
    expect(avoidPcs(h[0], 'ionian')).toEqual([5]);
    const sh = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 1 })!;
    expect(cellNotes(sh.cells.find((c) => c.sym === 'Cmaj7')!, sh).avoid).toEqual([5]);
    expect(src('ui/ScaleRotation.tsx')).toContain('rs-avoid');
    expect(src('rotation.css')).toContain('.rs-avoid');
  });
});

describe('10. sus: the 3rd is an avoid note (Mixolydian without the 3rd)', () => {
  it('B over G7sus4 is an avoid note, not a tension', () => {
    const h = harmonyOf([{ at: 0, beats: 4, root: 7, iv: [0, 5, 7, 10] }, { at: 4, beats: 4, root: 7, iv: [0, 4, 7, 10] }], 0);
    expect(h[0].fn).toBe('sus');
    expect(classifyNotes([{ beat: 1, dur: 1, midi: 71 }], [{ span: h[0], mode: 'mixolydian' }])).toEqual(['avoid']);
    expect(avoidPcs(h[0], 'mixolydian')).toEqual([11]);
  });
});

describe('the mode × function stats on the skill map', () => {
  it('a line naming the weakest scale and function, en + he', () => {
    const st = { 'V-min|altered': { n: 3, cov: 0.4, last: 'x' }, 'I|lydian': { n: 2, cov: 0.9, last: 'x' } };
    expect(weakestLine(st, 'en')).toBe('Weakest: Altered over V→minor (40%)');
    expect(weakestLine(st, 'he')).toContain('אלטרד');
    expect(weakestLine({}, 'en')).toBeNull();
    for (const k of Object.keys(MENUS) as (keyof typeof MENUS)[]) expect(FN_NAME[k].he).toBeTruthy();
    expect(src('ui/SkillMap.tsx')).toContain('weakestLine(');
  });
});
