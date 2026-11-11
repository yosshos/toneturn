import { describe, expect, it } from 'vitest';
import { addTake, barEighths, barGroups, eighthMs, gradeTake, isRiffSave, makeRiff, newRiffSave, riffAt, riffClicks, riffEvents, riffInstrument, riffOver, riffResult, riffWindow, RIFF_METERS, type PlayedNote, type Riff } from '../src/engine/riffEcho';
import { clearsRun, tierDef, TIERS } from '../src/engine/gameTiers';
import { gameEvents } from '../src/engine/gameRating';

const perfect = (r: Riff, bpm: number, shift = 0): PlayedNote[] => r.notes.map((n) => ({ ms: n.at * eighthMs(bpm) + shift, midi: n.midi }));

describe('odd-meter riff echo', () => {
  it('tiers mp..ff are levels 1..4 with grouping shown only at mp / mf', () => {
    expect(TIERS.slice(2).map((t) => tierDef('riffecho', t)?.levels?.[0])).toEqual([1, 2, 3, 4]);
    expect(tierDef('riffecho', 'mf')?.params?.grouping).toBe(true);
    expect(tierDef('riffecho', 'f')?.params?.grouping).toBe(false);
  });

  it('riffs use the level meters, groups sum to the bar, at most 16 eighths, and are seeded', () => {
    for (let lv = 1; lv <= 4; lv++) {
      for (let s = 1; s < 60; s++) {
        const r = makeRiff(s * 7919, lv, 'guitar');
        const meters = r.bars.map((b) => b.meter).join('+');
        expect(RIFF_METERS[lv - 1].some((m) => meters === m || meters === `${m}+${m}`)).toBe(true);
        for (const b of r.bars) expect(barEighths(b)).toBe(b.meter.endsWith('/4') ? Number(b.meter.split('/')[0]) * 2 : Number(b.meter.split('/')[0]));
        expect(r.eighths).toBeLessThanOrEqual(16);
        expect(r.notes.length).toBeGreaterThanOrEqual(r.bars.reduce((a, b) => a + b.groups.length, 0));
        // no repeated pitch in a row (the mic hears every note)
        r.notes.forEach((n, i) => i && expect(n.midi).not.toBe(r.notes[i - 1].midi));
      }
    }
    expect(makeRiff(42, 3, 'keys')).toEqual(makeRiff(42, 3, 'keys'));
  });

  it('bass riffs sit low, keys and guitar higher; the bass sounds on the bass samples', () => {
    const b = makeRiff(5, 2, 'bass');
    const k = makeRiff(5, 2, 'keys');
    expect(Math.max(...b.notes.map((n) => n.midi))).toBeLessThan(60);
    expect(Math.min(...k.notes.map((n) => n.midi))).toBeGreaterThanOrEqual(57);
    expect(riffEvents(b, 100, 'bass').every((e) => e.inst === 'bass')).toBe(true);
    expect(riffInstrument('drums')).toBe('keys');
    expect(riffInstrument('bass')).toBe('bass');
  });

  it('groupings: 7/8 rotations, 3/4 in quarters, ff displaced accents', () => {
    expect(barGroups('7/8')).toEqual([2, 2, 3]);
    expect(barGroups('3/4')).toEqual([2, 2, 2]);
    expect(barGroups('6/8')).toEqual([3, 3]);
    let displaced = 0;
    for (let s = 1; s < 80; s++) {
      const r = makeRiff(s * 31, 4, 'guitar');
      if (r.displaced) {
        displaced++;
        const starts: number[] = [];
        let k = 0;
        for (const b of r.bars) for (const g of b.groups) (starts.push(k), (k += g));
        expect(r.notes.filter((n) => n.accent).every((n) => starts.includes(n.at - 1))).toBe(true);
      }
    }
    expect(displaced).toBeGreaterThan(0);
  });

  it('clicks: a count-in bar on its group starts, then each bar group', () => {
    const r = makeRiff(9, 2, 'keys');
    const c = riffClicks(r, 100);
    expect(c.clicks.filter((k) => k.count)).toHaveLength(r.bars[0].groups.length);
    expect(c.clicks.filter((k) => !k.count)).toHaveLength(r.bars.reduce((a, b) => a + b.groups.length, 0));
    expect(c.endAt - c.startAt).toBeCloseTo((r.eighths * eighthMs(100)) / 1000, 5);
  });

  it('grading: perfect 100, late inside the window still right, past it missed, wrong pitch partial, extra costs', () => {
    const bpm = 100;
    const r = makeRiff(77, 2, 'guitar');
    const w = riffWindow(bpm);
    expect(gradeTake(r, perfect(r, bpm), bpm).score).toBe(100);
    expect(gradeTake(r, perfect(r, bpm, w - 5), bpm).score).toBe(100);
    expect(gradeTake(r, perfect(r, bpm, w + 30), bpm).marks.every((m) => m === 'miss')).toBe(true);
    const wrong = perfect(r, bpm).map((p) => ({ ...p, midi: p.midi + 1 }));
    const g = gradeTake(r, wrong, bpm);
    expect(g.marks.every((m) => m === 'pitch')).toBe(true);
    expect(g.score).toBe(40);
    // the octave does not matter
    expect(gradeTake(r, perfect(r, bpm).map((p) => ({ ...p, midi: p.midi + 12 })), bpm).score).toBe(100);
    const missingOne = perfect(r, bpm).slice(1);
    expect(gradeTake(r, missingOne, bpm).marks[0]).toBe('miss');
    const extra = [...perfect(r, bpm), { ms: r.eighths * eighthMs(bpm) + 500, midi: 60 }];
    expect(gradeTake(r, extra, bpm).extra).toBe(1);
    expect(gradeTake(r, extra, bpm).score).toBeLessThan(100);
    expect(gradeTake(r, [], bpm).score).toBe(0);
  });

  it('a run: 3 lives (under 70 costs one), up to 6 riffs, resumes, reports accuracy and clears at 85', () => {
    let s = newRiffSave(123, 2, 100, 'bass', 'mf');
    expect(isRiffSave(s)).toBe(true);
    expect(riffAt(s, 0)).toEqual(riffAt(s, 0));
    expect(riffAt(s, 0)).not.toEqual(riffAt(s, 1));
    s = addTake(s, 50);
    expect(s.lives).toBe(2);
    s = addTake(addTake(s, 95), 90);
    expect(s.lives).toBe(2);
    expect(riffOver(s)).toBe(false);
    s = addTake(addTake(s, 60), 65);
    expect(riffOver(s)).toBe(true);
    expect(isRiffSave(s)).toBe(false);
    const res = riffResult(s, 'mic');
    expect(res.detail.accuracy).toBe(72);
    expect(res.detail.tier).toBe('mf');
    expect(clearsRun('riffecho', 'mf', res.score, res.detail)).toBe(false);
    expect(clearsRun('riffecho', 'mf', res.score, { ...res.detail, accuracy: 90 })).toBe(true);
    expect(gameEvents('riffecho', res.score, res.detail, '2026-11-11T10:00:00Z', 's').length).toBeGreaterThan(0);
  });
});
