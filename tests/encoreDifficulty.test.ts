// Encore difficulty and XP (SPEC-PHRASE-STUDIO §10): the worked examples, the property tests, and the calibration
// against the placed difficulty of built-in technique levels (LEVEL_PLACEMENT, grade-cited).
import { describe, expect, it } from 'vitest';
import { baseXp, badge, capXp, completionBonus, dailyCap, difficultyOf, drillInput, effectiveLength, fingerprint, gradeOf, keyBonus, novelty, phraseDifficulty, similarity, takeXp, whyLine, xpPreview, PHRASE_DIFF_V, type DNote } from '../src/engine/encore/difficulty';
import { keyOrder, planOf } from '../src/engine/encore/phrase';
import { catalog } from '../src/engine/drills/generate';
import { itemTargetBpm, levelDrills } from '../src/engine/drills/plan';
import { LEVEL_PLACEMENT } from '../src/engine/levelPlacement';
import { LICKS } from '../src/engine/licks';
import { lickToPhrase } from '../src/engine/encore/library';
import { BEBOP, BEBOP2, CDE, CDE16, phrase } from './encoreFixtures';

const cleanAt = (l: ReturnType<typeof BEBOP>, key = l.homeKey ?? 0, bpm = planOf(l).goalBpm) => {
  const d = phraseDifficulty(l, key, bpm);
  return takeXp({ d, stage: 'tempo', verdict: 'clean', keyPassed: false, novelty: d.f.trivial ? 0.3 : 1 });
};

describe('worked examples (§10.5)', () => {
  it('C–D–E in quarters: ≈ 715 at ♩100, 1 XP a clean take, flagged trivial', () => {
    const l = CDE(80);
    const d = phraseDifficulty(l, 0, 100);
    expect(d.f.trivial).toBe(true);
    expect(d.D).toBeGreaterThanOrEqual(700);
    expect(d.D).toBeLessThanOrEqual(740);
    expect(cleanAt(l, 0, 100)).toBe(1);
    // in all 12 keys it stays 1 XP a take
    for (let k = 0; k < 12; k++) expect(cleanAt(l, k, 100)).toBe(1);
  });
  it('C–D–E as 16ths at ♩150: a moderate amount (≈ grade 1–2), still ~1 XP', () => {
    const d = phraseDifficulty(CDE16(), 0, 150);
    expect(d.D).toBeGreaterThan(780);
    expect(d.D).toBeLessThan(900);
    expect(cleanAt(CDE16(), 0, 150)).toBeLessThanOrEqual(2);
  });
  it('a 4-bar RH bebop line over ii–V–I at ♩200: grade 6–7', () => {
    const l = BEBOP(160);
    expect(planOf(l).goalBpm).toBe(200);
    const d = phraseDifficulty(l, 0, 200);
    expect(d.f.enclosures).toBeGreaterThanOrEqual(2);
    expect(d.f.pivots).toBeGreaterThanOrEqual(1);
    expect(d.D).toBeGreaterThan(1200);
    expect(d.D).toBeLessThan(1400);
    expect(cleanAt(l)).toBeGreaterThanOrEqual(4);
  });
  it('the same line with an independent left hand at ♩180: ≈ G8+, ≈ 10 XP a clean take', () => {
    const l = BEBOP2(144);
    const d = phraseDifficulty(l, 0, planOf(l).goalBpm);
    expect(d.D).toBeGreaterThan(1420);
    expect(d.D).toBeLessThan(1650);
    const xp = cleanAt(l);
    expect(xp).toBeGreaterThanOrEqual(8);
    expect(xp).toBeLessThanOrEqual(12);
  });
  it('the two-hand line in three keys earns more than C–D–E in all twelve (the owner\'s requirement)', () => {
    const two = BEBOP2();
    const cde = CDE();
    const twoKeys = keyOrder(two).slice(0, 3);
    const d0two = phraseDifficulty(two, two.homeKey ?? 0, null).D0;
    const d0cde = phraseDifficulty(cde, 0, null).D0;
    const threeTwo = twoKeys.reduce((a, k) => a + 3 * cleanAt(two, k) + 0, 0) + [1, 2, 3].reduce((a, n) => a + keyBonus(d0two, n), 0);
    const allCde = Array.from({ length: 12 }, (_, k) => 3 * cleanAt(cde, k, 100)).reduce((a, b) => a + b, 0) + Array.from({ length: 12 }, (_, i) => keyBonus(d0cde, i + 1)).reduce((a, b) => a + b, 0) + completionBonus(d0cde);
    expect(threeTwo).toBeGreaterThan(allCde);
  });
});

describe('properties (§10.8.4)', () => {
  it('adding notes never lowers M', () => {
    const a = phrase('enc-a', '0 2 4 5 7 9 11 12');
    const b = phrase('enc-b', '0 2 4 5 7 9 11 12 | 14 12 11 9 7 5 4 2');
    expect(phraseDifficulty(b, 0, null).M).toBeGreaterThanOrEqual(phraseDifficulty(a, 0, null).M);
  });
  it('a faster tempo never lowers D', () => {
    const l = BEBOP();
    let prev = 0;
    for (const bpm of [60, 90, 120, 160, 200, 260, 320]) {
      const D = phraseDifficulty(l, 0, bpm).D;
      expect(D).toBeGreaterThanOrEqual(prev);
      prev = D;
    }
  });
  it('replacing new material by a repeat of a cell lowers M', () => {
    const fresh = phrase('enc-f', '0 4 7 11 9 5 2 -1 | 0 3 8 10 6 1 -2 4');
    const seq = phrase('enc-s', '0 4 7 11 9 5 2 -1 | 0 4 7 11 9 5 2 -1');
    expect(phraseDifficulty(seq, 0, null).M).toBeLessThan(phraseDifficulty(fresh, 0, null).M);
    expect(effectiveLength([0, 4, 7, 0, 4, 7].map((m, i): DNote => ({ midi: 60 + m, beat: i * 0.5, dur: 0.5, hand: 'R' })))).toBeLessThan(6);
  });
  it('C–D–E at any tempo stays at or under the easiest built-in lick at its target tempo', () => {
    const easiest = LICKS.filter((l) => l.level === 1).map((l) => lickToPhrase(l, `enc-${l.id}`)).map((l) => phraseDifficulty(l, 0, planOf(l).goalBpm).D);
    const cdeMax = Math.max(...[60, 120, 200, 300].map((b) => phraseDifficulty(CDE(), 0, b).D));
    expect(cdeMax).toBeLessThanOrEqual(Math.min(...easiest));
  });
  it('two hands ≥ one hand of the same notes', () => {
    const one = BEBOP();
    const two = BEBOP2();
    expect(phraseDifficulty(two, 0, 160).D).toBeGreaterThanOrEqual(phraseDifficulty(one, 0, 160).D);
  });
  it('a black-key-heavy phrase costs more on the piano in the keys that put it on black keys', () => {
    const l = phrase('enc-w', '0 2 4 5 7 5 4 2 | 0 4 7 12 7 4 0h');
    const inC = phraseDifficulty(l, 0, 120).P;
    const inFs = phraseDifficulty(l, 6, 120).P;
    expect(inFs).toBeGreaterThan(inC);
  });
  it('the scale is 700–1900 and grades invert G()', () => {
    expect(gradeOf(700)).toBe(0);
    expect(gradeOf(1330)).toBe(7);
    expect(baseXp(700)).toBe(1);
    expect(Math.round(baseXp(1900))).toBe(12);
    expect(dailyCap(700)).toBe(20);
    expect(dailyCap(1900)).toBe(70);
    expect(PHRASE_DIFF_V).toBe(2);
  });
});

describe('XP rules (§10.5, §10.7)', () => {
  it('stages: free 0.3 · quarters 0.4 · tempo; almost and not earn less; maintenance halves', () => {
    const d = phraseDifficulty(BEBOP2(), 0, 180);
    const x = (o: Partial<Parameters<typeof takeXp>[0]>) => takeXp({ d, stage: 'tempo', verdict: 'clean', keyPassed: false, novelty: 1, ...o });
    expect(x({ stage: 'free' })).toBeLessThan(x({}));
    expect(x({ stage: 'quarters' })).toBeLessThan(x({}));
    expect(x({ verdict: 'almost' })).toBeLessThan(x({}));
    expect(x({ verdict: 'not' })).toBeLessThan(x({ verdict: 'almost' }));
    expect(x({ keyPassed: true })).toBeLessThan(x({}));
  });
  it('the cap: never more than the day allows; the n-th key bonus diminishes', () => {
    expect(capXp(30, 10, 35)).toBe(5);
    expect(capXp(40, 10, 35)).toBe(0);
    expect(keyBonus(1300, 1)).toBeGreaterThan(keyBonus(1300, 9));
  });
  it('near-duplicates of a phrase already passed in a key earn little', () => {
    const a = BEBOP();
    const b = { ...BEBOP(), id: 'enc-copy' };
    expect(similarity(fingerprint(a), fingerprint(b))).toBe(1);
    expect(novelty(b, 0, [{ l: a, passed: [0] }], false)).toBe(0.1);
    expect(novelty(b, 5, [{ l: a, passed: [0] }], false)).toBe(1);
    expect(novelty(CDE(), 0, [], true)).toBe(0.3);
  });
  it('the badge, the one-line why and the XP preview', () => {
    const b = badge(BEBOP2());
    expect(b.grade).toBeGreaterThanOrEqual(8);
    expect(whyLine(b.d, 'he')).toContain('שתי ידיים');
    expect(whyLine(phraseDifficulty(CDE(), 0, 100), 'en')).toMatch(/little XP/);
    const p = xpPreview(BEBOP());
    expect(p.tempi.length).toBe(3);
    expect(p.tempi[2].xp).toBeGreaterThanOrEqual(p.tempi[0].xp);
    expect(p.perKey.length).toBe(12);
    expect(p.all12).toBeGreaterThan(0);
  });
});

describe('calibration against the built-in levels (§10.8)', () => {
  // A level's model difficulty = the median D of its items (every key, every variant) at their target tempo; the placed
  // difficulty = LEVEL_PLACEMENT (grade-cited). Improvisation, pedalling and gig skills (accompanying, stamina) are
  // placed by what they ask besides the notes, so they stay out.
  const rows: { id: string; fam: string; placed: number; D: number }[] = [];
  for (const fam of catalog())
    for (const lv of fam.levels) {
      const placed = LEVEL_PLACEMENT[lv.id];
      if (!placed || /impro|pedal|gig/.test(lv.id)) continue;
      let ds;
      try {
        ds = levelDrills(lv, 'fifths-up');
      } catch {
        continue;
      }
      if (!ds[0]?.notes.length) continue;
      const Ds = ds.filter((d) => d.notes.length).map((d) => difficultyOf(drillInput(d), itemTargetBpm(d)).D).sort((a, b) => a - b);
      rows.push({ id: lv.id, fam: fam.id, placed, D: Ds[Ds.length >> 1] });
    }
  const rank = (xs: number[]) => {
    const s = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(xs.length);
    s.forEach(([, i], k) => (r[i] = k));
    return r as number[];
  };
  const spearman = (rs: typeof rows) => {
    const a = rank(rs.map((r) => r.placed));
    const b = rank(rs.map((r) => r.D));
    const n = rs.length;
    return 1 - (6 * a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)) / (n * (n * n - 1));
  };
  const mae = (rs: typeof rows) => rs.reduce((s, r) => s + Math.abs(r.placed - r.D), 0) / rs.length;
  it('v2 keeps the order of the placed levels: ρ ≈ 0.84, mean error ≈ 144 over the grade-cited piano levels (v1: 0.59 / 240)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(70);
    const rho = spearman(rows);
    console.log(`encore difficulty calibration v${PHRASE_DIFF_V}: n=${rows.length} spearman=${rho.toFixed(3)} mae=${mae(rows).toFixed(0)}`);
    expect(PHRASE_DIFF_V).toBe(2);
    expect(rho).toBeGreaterThanOrEqual(0.83);
    expect(mae(rows)).toBeLessThanOrEqual(150);
  });
  it('per family (the locked v2 numbers; families of ≥ 3 levels)', () => {
    // [family, ρ at least, mean error at most] — v2: k-classic 0.93 / 104, k-read 0.84 / 232, k-pop 0.71 / 117,
    // k-first 0.68 / 126, k-tpair 0.61 / 147, scales 0.36 / 85, control 0.50 / 59.
    const locked: [string, number, number][] = [
      ['k-classic', 0.9, 115],
      ['k-read', 0.8, 245],
      ['k-pop', 0.65, 130],
      ['k-first', 0.6, 140],
      ['k-tpair', 0.55, 160],
      ['scales', 0.3, 95],
      ['control', 0.45, 70],
    ];
    for (const [fam, rho, err] of locked) {
      const rs = rows.filter((r) => r.fam === fam);
      expect(rs.length, fam).toBeGreaterThanOrEqual(3);
      expect(spearman(rs), fam).toBeGreaterThanOrEqual(rho);
      expect(mae(rs), fam).toBeLessThanOrEqual(err);
    }
  });
});
