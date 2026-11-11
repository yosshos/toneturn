import { describe, expect, it } from 'vitest';
import { backing, chordPcs, eighthMs, gradeTake, isBhSave, makeTake, pitchOk, runResult, scalePcs, slotMs, SLOTS_PER_BAR, LOW, HIGH, takeSeed, windows, type BhLevel, type Onset } from '../src/engine/bhInTime';
import { clearsRun, GAME_TIERS, tierDef } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const perfectTake = (t: ReturnType<typeof makeTake>): Onset[] => t.bars.flatMap((b, bi) => b.line.map((m, k) => ({ ms: slotMs(t.bpm, bi * SLOTS_PER_BAR + k), midi: m })));

describe('Barry Harris in Time', () => {
  it('every suggested line keeps the rule: chord tones on the beats, scale or chromatic approach between, in range', () => {
    for (const level of [1, 2, 3, 4] as BhLevel[]) {
      for (let s = 1; s < 60; s++) {
        const t = makeTake(level, 120, s * 977);
        expect(t.bars.length).toBe(level === 4 ? 8 : 4);
        const all = t.bars.flatMap((b) => b.line);
        all.forEach((m, i) => {
          expect(m).toBeGreaterThanOrEqual(LOW);
          expect(m).toBeLessThanOrEqual(HIGH);
          expect(pitchOk(t, i, m, i > 0 ? all[i - 1] : null, i < all.length - 1 ? all[i + 1] : null)).toBe(true);
        });
        for (const b of t.bars) {
          expect(b.line.length).toBe(8);
          expect(chordPcs(b)).toContain(mod12(b.line[0]));
        }
      }
    }
  });

  it('level content: one major 6 from the root at mp; dominants become the minor 6 on the 5th; ff has a minor ii–V–i', () => {
    const t1 = makeTake(1, 90, 5);
    expect(new Set(t1.bars.map((b) => b.root)).size).toBe(1);
    expect(t1.bars.every((b) => b.six.kind === 'maj6' && mod12(b.line[0]) === b.six.root)).toBe(true);
    const t2 = makeTake(2, 110, 5);
    const dom = t2.bars.find((b) => b.kind === '7')!;
    expect(dom.six).toEqual({ kind: 'm6', root: mod12(dom.root + 7) });
    const t4 = makeTake(4, 200, 9);
    expect(t4.bars.some((b) => b.kind === '7alt')).toBe(true);
    expect(t4.bars.some((b) => b.kind === 'm7' && b.six.kind === 'm6' && b.six.root === b.root)).toBe(true);
  });

  it('a perfect take scores 100; a late take loses perfects; wrong notes on the beats are caught', () => {
    const t = makeTake(2, 110, 77);
    const ok = gradeTake(t, perfectTake(t));
    expect(ok.accuracy).toBe(100);
    expect(ok.bars.every((b) => b.verdict === 'good')).toBe(true);
    expect(ok.beatShare).toBe(1);

    const w = windows(t.bpm);
    const late = gradeTake(t, perfectTake(t).map((o) => ({ ...o, ms: o.ms + w.perfect + 5 })));
    expect(late.slots.every((s) => s === 'good')).toBe(true);
    expect(late.accuracy).toBe(80);
    expect(late.meanOffsetMs).toBe(w.perfect + 5);

    // latency correction: the same late take with the delay known is perfect again
    expect(gradeTake(t, perfectTake(t).map((o) => ({ ...o, ms: o.ms + 60 })), 60).accuracy).toBe(100);

    // every beat a half step off (not a chord tone)
    const wrong = perfectTake(t).map((o, i) => (i % 2 === 0 ? { ...o, midi: o.midi + 1 } : o));
    const g = gradeTake(t, wrong);
    expect(g.slots.filter((s, i) => i % 2 === 0 && s === 'wrong').length).toBeGreaterThan(t.bars.length * 3);
    expect(g.accuracy).toBeLessThan(65);
    expect(g.bars.every((b) => b.verdict !== 'good')).toBe(true);
  });

  it('missing bars and stray notes cost; nothing played scores 0', () => {
    const t = makeTake(1, 90, 3);
    const half = perfectTake(t).filter((o) => o.ms < slotMs(t.bpm, 2 * SLOTS_PER_BAR));
    expect(gradeTake(t, half).accuracy).toBe(50);
    const stray = [...perfectTake(t), { ms: slotMs(t.bpm, 3) + eighthMs(t.bpm) / 2, midi: 61 }];
    expect(gradeTake(t, stray).extra).toBe(1);
    expect(gradeTake(t, stray).accuracy).toBeLessThan(100);
    expect(gradeTake(t, []).accuracy).toBe(0);
  });

  it('your own line counts: any chord tone on the beat, any scale note between', () => {
    const t = makeTake(1, 90, 12);
    const b = t.bars[0];
    const cps = chordPcs(b);
    const sps = scalePcs(b).filter((p) => !cps.includes(p));
    const own: Onset[] = [];
    for (let i = 0; i < t.bars.length * 8; i++) {
      const pcs = i % 2 === 0 ? cps : sps;
      own.push({ ms: slotMs(t.bpm, i), midi: 60 + pcs[(i * 7) % pcs.length] });
    }
    expect(gradeTake(t, own).accuracy).toBe(100);
  });

  it('chromatic notes between count only from f up, and only a half step from a neighbour', () => {
    const t1 = makeTake(1, 90, 4);
    const t3 = makeTake(3, 140, 4);
    for (const t of [t1, t3]) {
      const b = t.bars[0];
      const chromatic = [...Array(12).keys()].find((p) => !scalePcs(b).includes(p))!;
      const m = 60 + chromatic;
      expect(pitchOk(t, 1, m, m - 1, null)).toBe(t.level >= 3);
      expect(pitchOk(t, 1, m, m - 3, m + 4)).toBe(false);
    }
  });

  it('backing: count-in, bass on 1 and 3 of every bar, length covers the take', () => {
    const t = makeTake(3, 140, 2);
    const b = backing(t);
    expect(b.startSec).toBeCloseTo(4 * (60 / 140));
    expect(b.events.filter((e) => e.inst === 'bass').length).toBe(2 * t.bars.length);
    expect(b.length).toBeGreaterThan(b.startSec + t.bars.length * 4 * (60 / 140));
  });

  it('tiers: advanced (opens at mp), levels 1–4 mp → ff, tempo rises, cleared at accuracy 85; rated in the tier band', () => {
    expect(GAME_TIERS.bhtime.minTier).toBe('mp');
    const lv = (['mp', 'mf', 'f', 'ff'] as const).map((x) => tierDef('bhtime', x)!.levels![0]);
    expect(lv).toEqual([1, 2, 3, 4]);
    const bpm = (['mp', 'mf', 'f', 'ff'] as const).map((x) => Number(tierDef('bhtime', x)!.params!.bpm));
    expect([...bpm].sort((a, b) => a - b)).toEqual(bpm);
    expect(clearsRun('bhtime', 'f', 900, { tier: 'f', accuracy: 90 })).toBe(true);
    expect(clearsRun('bhtime', 'f', 700, { tier: 'f', accuracy: 70 })).toBe(false);
    const ev = gameEvents('bhtime', 900, { tier: 'ff', accuracy: 90 }, '2026-11-11T10:00:00Z', 's1');
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.every((e) => e.difficulty >= 1400 && e.correct)).toBe(true);
  });

  it('a run: three takes, resumable save, mean accuracy', () => {
    const s = { v: 1 as const, game: 'bhtime' as const, seed: 42, level: 2 as BhLevel, bpm: 110, input: 'midi' as const, takes: [90, 80] };
    expect(isBhSave(s)).toBe(true);
    expect(isBhSave({ ...s, takes: [1, 2, 3] })).toBe(false);
    expect(runResult(s)).toEqual({ score: 850, accuracy: 85 });
    expect(takeSeed(42, 0)).not.toBe(takeSeed(42, 1));
  });
});
