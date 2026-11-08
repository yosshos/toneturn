import { describe, expect, it } from 'vitest';
import { addTake, emptyModel, findings, type PlayerModel } from '../src/engine/analysis/model';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

/** A simulated player: plays every expected note, with a personal flaw. */
function play(d: Drill, bpm: number, flaw: { soft?: string; lateL?: number; missKey?: number; seed: number }): PlayedNote[] {
  let x = flaw.seed;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    if (flaw.missKey !== undefined && d.spec.key === flaw.missKey && rnd() < 0.25) {
      out.push({ pitch: n.pitch + 1, on: expTimeMs(d, n.beat, bpm), off: null, vel: 70 });
      continue;
    }
    const soft = flaw.soft && n.finger && `${n.hand}${n.finger}` === flaw.soft;
    const on = expTimeMs(d, n.beat, bpm) + (n.hand === 'L' ? flaw.lateL ?? 0 : 0) + (rnd() - 0.5) * 16;
    out.push({ pitch: n.pitch, on, off: on + 200, vel: Math.round((soft ? 52 : 74) + (rnd() - 0.5) * 8) });
  }
  return out;
}

describe('player analysis (0.49)', () => {
  it('finds a soft finger, a late left hand and a weak key from simulated takes — and nothing for a clean player', () => {
    let m: PlayerModel = emptyModel();
    let clean: PlayerModel = emptyModel();
    let seed = 11;
    for (let k = 0; k < 40; k++) {
      const key = [0, 7, 5, 2, 11][k % 5];
      for (const spec of [{ family: 'fingers', kind: 'five', hands: 'RL' }, { family: 'scales', kind: 'scale', hands: 'RL', scale: 'major' }] as const) {
        const d = generate({ ...spec, key } as never);
        const bpm = 80;
        const takeA = analyzeTake(d, bpm, play(d, bpm, { soft: 'R4', lateL: 25, missKey: 11, seed: seed++ }));
        m = addTake(m, d, takeA, bpm, `t${k}`);
        const takeB = analyzeTake(d, bpm, play(d, bpm, { seed: seed++ }));
        clean = addTake(clean, d, takeB, bpm, `t${k}`);
      }
    }
    const f = findings(m);
    const kinds = f.map((x) => `${x.kind}:${x.ctx}`);
    expect(kinds).toContain('soft-finger:f:R4');
    expect(kinds).toContain('hand-balance:h:L');
    expect(kinds).toContain('weak-key:k:11');
    expect(f.find((x) => x.ctx === 'f:R4')!.size).toBeLessThan(-15);
    for (const x of f) expect(x.text.he.length).toBeGreaterThan(5);
    expect(findings(clean).filter((x) => x.kind !== 'uneven')).toEqual([]);
  });
});
