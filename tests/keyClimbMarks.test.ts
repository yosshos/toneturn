// Owner 2026-11-26 ("key session must develop"): never the same take twice at one tempo - every clean take rises at least
// one metronome mark. At about 6.6 notes a second and up (sixteenths from ♩120) the step limit (stepCap, ~4 %) was smaller
// than one Maelzel mark (120 → 126 is 5 %): gradedUp / markUp gave an off-grid pulse, setPulse snapped it back down to the
// same mark, and every clean take was held there until the session ran out (spec review 2026-11-28).
// These tests climb with the key session's own functions: gradedUp (the graded step), markUp (the probe's flow and the
// challenge), and pulseBpm (setPulse's snapping and step limit).
import { describe, expect, it } from 'vitest';
import { MAELZEL, markUp, snapDown, stepCap, upLimit } from '../src/engine/drills/stages';
import { gradedUp, MIN_BPM, pulseBpm } from '../src/engine/drills/keyCoach';

const TOP = MAELZEL[MAELZEL.length - 1];
const npsOf = (bpm: number, per: number) => (bpm * per) / 60;

/** One clean take at ♩`bpm` (note value `per`) in the speed stage: the graded step, then setPulse's ♩ at `nextPer`. */
function next(bpm: number, per: number, q: number, o: { target?: number; best?: number; ceil?: number; start?: number } = {}, nextPer = per): number {
  const at = npsOf(bpm, per);
  return pulseBpm(gradedUp(at, nextPer, q, o), nextPer, at);
}

/** Climb from ♩`from` until the target (or the top mark): every ♩ played. */
function climb(from: number, per: number, q: number, target: number): number[] {
  const out = [from];
  let bpm = from;
  const tBpm = snapDown((target * 60) / per + 0.5);
  for (let k = 0; k < 60 && bpm < tBpm && bpm < TOP; k++) {
    bpm = next(bpm, per, q, { target });
    out.push(bpm);
  }
  return out;
}

describe('the climb at fast tempi: every clean take one mark or more', () => {
  it('sixteenths from ♩112 to ♩184: a perfect take and a barely-clean take both rise every take, on the marks', () => {
    for (const q of [1, 0.6, 0.15]) {
      const seq = climb(112, 4, q, npsOf(184, 4));
      for (let k = 1; k < seq.length; k++) {
        expect(seq[k], `q=${q} take ${k}: ${seq.join(' ')}`).toBeGreaterThan(seq[k - 1]);
        expect(MAELZEL).toContain(seq[k]);
      }
      expect(seq[seq.length - 1]).toBe(184);
    }
  });

  it('the reviewed tempi (sixteenths at ♩120, 126, 132, 138) each rise exactly one mark', () => {
    for (const [a, b] of [[120, 126], [126, 132], [132, 138], [138, 144]]) expect(next(a, 4, 1)).toBe(b);
  });

  it('other note values at fast tempi: eighths, triplets, quarters up to the top mark', () => {
    for (const per of [1, 2, 3]) {
      const seq = climb(160, per, 1, npsOf(TOP, per));
      for (let k = 1; k < seq.length; k++) expect(seq[k], `per=${per}: ${seq.join(' ')}`).toBeGreaterThan(seq[k - 1]);
      expect(seq[seq.length - 1]).toBe(TOP);
    }
  });

  it('markUp (the probe’s flow, the challenge’s two marks) is always a whole mark up, below the top', () => {
    for (const per of [1, 2, 3, 4])
      for (const m of MAELZEL.slice(0, -1)) {
        const up = Math.round((markUp(npsOf(m, per), per) * 60) / per);
        expect(up, `♩${m} per=${per}`).toBe(MAELZEL[MAELZEL.indexOf(m) + 1]);
        expect(pulseBpm(markUp(npsOf(m, per), per), per, npsOf(m, per))).toBe(up);
      }
  });

  it('slow tempi keep the step limit: no jump past stepCap where the marks are finer than it', () => {
    for (const per of [1, 2])
      for (const m of MAELZEL.filter((x) => npsOf(x, per) <= 3)) {
        const at = npsOf(m, per);
        expect(upLimit(at, per)).toBeCloseTo(at * (1 + stepCap(at)), 9);
        expect(npsOf(next(m, per, 1), per)).toBeLessThanOrEqual(at * (1 + stepCap(at)) + 1e-9);
      }
  });
});

describe('guard: no clean take is followed by the same tempo (♩40–240, 1–4 notes a beat, triplets)', () => {
  const pers: [number, number][] = [[1, 1], [2, 2], [3, 3], [4, 4], [2, 3], [3, 2]];
  it('below the target and the top mark, the next pulse is faster; never past the target', () => {
    const bad: string[] = [];
    for (let raw = 40; raw <= 240; raw++)
      for (const [per, nextPer] of pers) {
        const bpm = pulseBpm(npsOf(raw, per), per, 0);
        const at = npsOf(bpm, per);
        // triplets only from ♩40 (setPulse falls back to eighths below)
        if (nextPer === 3 && (at * 60) / 3 < MIN_BPM - 0.5) continue;
        for (const q of [0.15, 0.5, 1])
          for (const o of [{}, { best: at * 1.05 }, { ceil: at * 1.04 }, { start: at / 1.4 }, { target: at * 1.02 }, { target: at * 1.3 }, { best: at * 1.03, ceil: at * 1.06, start: at / 1.3, target: at * 1.08 }]) {
            const nb = next(bpm, per, q, o, nextPer);
            const nn = npsOf(nb, nextPer);
            const target = (o as { target?: number }).target;
            const tBpm = target ? snapDown((target * 60) / nextPer + 0.5) : Infinity;
            // the target's mark: the speed stage's own (snapDown(target ♩ + 0.5))
            if (target && nb > Math.max(tBpm, MIN_BPM)) bad.push(`past target ♩${bpm}/${per}→♩${nb}/${nextPer} ${JSON.stringify(o)}`);
            // a hold is legitimate only at the top mark (the metronome's ceiling) or the target's mark
            const atTop = (at * 60) / nextPer >= TOP - 0.5;
            const atTarget = (at * 60) / nextPer >= tBpm - 0.5;
            if (nn <= at + 1e-9 && !atTop && !atTarget) bad.push(`held ♩${bpm}/${per}→♩${nb}/${nextPer} q=${q} ${JSON.stringify(o)}`);
          }
      }
    expect(bad.slice(0, 10), `${bad.length} holds`).toEqual([]);
  });
});
