import { describe, expect, it } from 'vitest';
import { SIGHT_LEVELS, gradeTake, sessionSightItem, synthMelody, itemTargets } from '../src/engine/vocal';

const range = { low: 48, high: 72 };

describe('sight-singing (spec V.1)', () => {
  const sessions = (lv: (typeof SIGHT_LEVELS)[number], n: number) =>
    Array.from({ length: n }, (_, s) => lv.items.map((it) => sessionSightItem(it, 1000 + s * 7919))).flat();

  it('every melody starts on a tonic-triad note, ends on the tonic, and stays on the beat grid', () => {
    for (const lv of SIGHT_LEVELS)
      for (const it of [...lv.items, ...sessions(lv, 40)]) {
        expect(it.kind).toBe('sight');
        const minor = lv.level >= 4;
        expect(lv.level <= 2 ? [0, 4, 7] : minor ? [0, 3, 7, 12] : [0, 4, 7, 12]).toContain(it.steps![0]);
        expect([0, 12]).toContain(it.steps![it.steps!.length - 1]);
        expect(it.durs!.length).toBe(it.steps!.length);
        expect(it.durs![it.durs!.length - 1]).toBe(2);
        // Every note but the off-beat eighths starts on a beat; the last note starts on a beat.
        let pos = 0;
        it.durs!.forEach((d, i) => {
          if (pos % 1 !== 0) expect(d).toBe(0.5);
          if (i === it.durs!.length - 1) expect(pos % 1).toBe(0);
          pos += d;
        });
      }
  });

  it('a fresh melody every session: no repeats over 30 items (L1, the smallest space: at most one), and the id stays for scheduling', () => {
    const key = (it: { steps?: number[]; durs?: number[] }) => `${it.steps!.join(',')}|${it.durs!.join(',')}`;
    for (const lv of SIGHT_LEVELS) {
      const items = sessions(lv, 10); // 10 sessions × 3 items
      expect(new Set(items.map(key)).size).toBeGreaterThanOrEqual(lv.level === 1 ? 29 : 30);
      // Far more than the old 3 fixed melodies per level.
      expect(new Set(sessions(lv, 300).map(key)).size).toBeGreaterThan(lv.level === 1 ? 500 : 800);
      expect(items.slice(0, 3).map((it) => it.id)).toEqual(lv.items.map((it) => it.id));
      // The same seed gives the same melody (a take can be graded against what was shown).
      expect(sessionSightItem(lv.items[0], 42)).toEqual(sessionSightItem(lv.items[0], 42));
    }
  });

  it('no augmented 2nd or tritone in any line; minor lines are melodic (raised 6–7 only rising to the tonic)', () => {
    for (const lv of SIGHT_LEVELS)
      for (const it of sessions(lv, 200)) {
        const st = it.steps!;
        for (let i = 1; i < st.length; i++) {
          const pcA = ((st[i - 1] % 12) + 12) % 12;
          const pcB = ((st[i] % 12) + 12) % 12;
          const gap = Math.abs(st[i] - st[i - 1]);
          expect(gap).not.toBe(6);
          expect(gap).toBeGreaterThan(0);
          // ♭6 next to ♮7, in either direction
          if (lv.level >= 4) expect([pcA, pcB].sort().join()).not.toBe('11,8');
          if (gap === 3) expect(new Set([pcA, pcB])).not.toEqual(new Set([8, 11]));
        }
        if (lv.level >= 4) {
          expect(st.some((s) => ((s % 12) + 12) % 12 === 3)).toBe(true); // the minor 3rd names the key
          st.forEach((s, i) => {
            const pc = ((s % 12) + 12) % 12;
            if (pc === 11) expect(st[i + 1] - s).toBe(1); // the leading tone rises to the tonic
            if (pc === 9) expect(((st[i + 1] % 12) + 12) % 12).toBe(11); // the raised 6th rises to the leading tone
          });
        }
      }
  });

  it('sung in the written rhythm scores high; sung evenly (ignoring the rhythm) loses on timing', () => {
    const item = SIGHT_LEVELS[4].items[0];
    const targets = itemTargets(item, range);
    const beat = 60 / item.bpm!;
    const right = gradeTake(item, synthMelody(targets, 0.5, { noteSecs: item.durs!.map((d) => d * beat) }), range);
    const even = gradeTake(item, synthMelody(targets, beat), range);
    expect(right.score).toBeGreaterThan(0.85);
    const tRight = right.metrics.find((m) => m.key === 'timing')!;
    const tEven = even.metrics.find((m) => m.key === 'timing')!;
    expect(tRight.value).toBeLessThan(tEven.value);
  });

  it('wrong notes lose the hit metric', () => {
    const item = SIGHT_LEVELS[0].items[0];
    const targets = itemTargets(item, range);
    const g = gradeTake(item, synthMelody(targets.map((m) => m + 3), 0.8), range);
    expect(g.score).toBeLessThan(0.5);
  });
});
