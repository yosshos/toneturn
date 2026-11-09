// BASS_VALIDATION (second round) fixes: each test is a [run]-style check of one finding (N1 to N13).
import { describe, expect, it } from 'vitest';
import { applyTake, itemPass, newItem } from '../src/engine/drills/ladder';
import { itemTargetBpm, levelDrills, levelOfDrill, levelStars } from '../src/engine/drills/plan';
import { guitarCatalog, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { generate } from '../src/engine/drills/generate';
import { BASS_PROBES, placeWalk } from '../src/engine/drills/bassProbes';
import { chartAt, chartPcs, walkProbeReport, WALK_VARIETY } from '../src/engine/drills/bassAnalyze';
import { analyzeGuitarTake, captureOptsFor, onsetOptsFor, untimedPitch } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { yin } from '../src/engine/yin';
import { DEFAULT_DRILL_SETTINGS, type Drill, type ExpNote, type ItemState, type PlayedNote, type TakeMetrics } from '../src/engine/drills/types';

/** Every written note played on time (f may shift a note or drop it with null). */
const playAll = (d: Drill, bpm: number, f: (n: ExpNote, i: number) => Partial<PlayedNote> | null = () => ({})): PlayedNote[] =>
  d.notes.flatMap((n, i) => {
    const x = f(n, i);
    return x === null ? [] : [{ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: null, vel: 80, ...x }];
  });

const take = (verdict: TakeMetrics['verdict']): TakeMetrics => ({ verdict, accuracy: 1, cvR: 0.02, cvL: null, timingSD: 10, velSD: null, handsAbs: null } as unknown as TakeMetrics);
const order = DEFAULT_DRILL_SETTINGS.keyOrder;
const BASS = guitarCatalog().filter((f) => f.id.startsWith('b-'));
const levelById = (id: string) => BASS.flatMap((f) => f.levels).find((l) => l.id === id) as GuitarLevelDef;

/** An honest climb: clean takes at the ladder's goal, 6 a day, until the item passes at its target (or gives up). */
function climb(d: Drill, maxTakes = 2000): { st: ItemState; takes: number } {
  const t = itemTargetBpm(d);
  let st: ItemState = newItem(d);
  for (let k = 0; k < maxTakes; k++) {
    const at = new Date(Date.UTC(2026, 0, 1 + Math.floor(k / 6), 10, k % 6)).toISOString();
    st = applyTake(st, take('clean'), st.goalBpm, at, DEFAULT_DRILL_SETTINGS, { targetBpm: t }).state;
    if (itemPass(st, d.startBpm, t).target) return { st, takes: k + 1 };
  }
  return { st, takes: maxTakes };
}

describe('N1 levelOfDrill: every item maps back to its own level', () => {
  it('every bass level, every item', () => {
    const wrong: string[] = [];
    for (const f of BASS) for (const lv of f.levels) for (const d of levelDrills(lv, order)) if (levelOfDrill(d)?.id !== lv.id) wrong.push(`${d.itemId} -> ${levelOfDrill(d)?.id} (want ${lv.id})`);
    expect(wrong).toEqual([]);
  });

  it.each(['b-pluck-2', 'b-up-pizz-2', 'b-up-pizz-3', 'b-up-scales-3'])('%s: an honest climb, then 3 clean takes at the target on 2 days, passes every item', (id) => {
    const lv = levelById(id);
    expect(lv).toBeTruthy();
    const items: Record<string, ItemState> = {};
    for (const d of levelDrills(lv, order)) {
      expect(itemTargetBpm(d)).toBe(Math.max(d.startBpm, lv.tempo![1]));
      const { st } = climb(d);
      expect(itemPass(st, d.startBpm, itemTargetBpm(d)).target).toBe(true);
      items[d.itemId] = st;
    }
    expect(levelStars(lv, items, order)).toBe(3);
  });
});

describe('N2 / N2b walking placement', () => {
  const probe = BASS_PROBES.find((p) => p.spec.kind === 'probe-walk')!;
  const d = generate(probe.spec);
  const chart = d.goal.bass!.rules!.chart;
  const beats = chart.reduce((a, c) => a + c.beats, 0);
  const perBeat = (pick: (b: number) => number) => Array.from({ length: beats }, (_, b) => pick(b));
  const modelAt = (b: number) => (d.notes.find((n) => Math.abs(n.beat - b) < 1e-6) ?? d.notes[0]).pitch;
  const rootAt = (b: number) => {
    let at = 0;
    for (const c of chart) {
      if (b < at + c.beats) return 28 + ((((c.root - 4) % 12) + 12) % 12);
      at += c.beats;
    }
    return 28;
  };

  it("the probe's own model line places at walk L7 / chord L8", () => {
    const r = walkProbeReport(chart, perBeat(modelAt));
    expect(r.beat1Ct).toBeGreaterThanOrEqual(0.9);
    expect(placeWalk(r)).toEqual({ 'b-walk': 7, 'b-chord': 8 });
  });

  it('roots only (same octave or alternating octaves) is placed no higher than walk L2', () => {
    for (const line of [perBeat(rootAt), perBeat((b) => rootAt(b) + (b % 2 ? 12 : 0))]) {
      const r = walkProbeReport(chart, line);
      expect(r.approach).toBe(0);
      expect(r.rootShare).toBe(1);
      expect(placeWalk(r)['b-walk']).toBeLessThanOrEqual(2);
      expect(placeWalk(r)['b-chord'] ?? 1).toBeLessThan(8);
    }
  });

  it('roots plus a chromatic approach on every change still stays below L7 (rootShare >= 0.5)', () => {
    const r = walkProbeReport(chart, perBeat((b) => (b < beats - 1 && rootAt(b + 1) !== rootAt(b) ? rootAt(b + 1) - 1 : rootAt(b))));
    expect(r.rootShare).toBeGreaterThanOrEqual(0.5);
    expect(placeWalk(r)['b-walk']).toBeLessThan(7);
  });
});

describe('N3 untimed note finding (read L1)', () => {
  const SR = 48000;
  const hzOf = (m: number) => 440 * 2 ** ((m - 69) / 12);
  const tone = (midi: number, n: number) => {
    const b = new Float32Array(n);
    const amps = [1, 0.6, 0.4, 0.25, 0.15, 0.1];
    for (let i = 0; i < n; i++) b[i] = 0.25 * amps.reduce((s, a, k) => s + a * Math.sin(2 * Math.PI * hzOf(midi) * (k + 1) * (i / SR) + 0.3 * k), 0);
    return b;
  };
  const read1 = levelById('b-read-1');
  const untimed = levelDrills(read1, order).filter((d) => d.untimed);

  it('the untimed items exist and use the bass capture (28 Hz floor, 4096 window)', () => {
    expect(untimed.length).toBeGreaterThan(0);
    for (const d of untimed) expect(captureOptsFor(d)).toMatchObject({ minHz: 28, fftSize: 4096 });
  });

  it.each([28, 29, 31, 33, 36])('MIDI %i (E1 to C2) is answered through the untimed capture options; the guitar default hears nothing', (m) => {
    const o = captureOptsFor(untimed[0])!;
    const r = yin(tone(m, o.fftSize), SR, { minHz: o.minHz });
    const frames = Array.from({ length: 10 }, (_, k) => ({ t: 1000 + 16 * k, hz: r.hz, conf: r.hz ? 0.95 : 0 }));
    expect(untimedPitch(frames, { ...onsetOptsFor(untimed[0]) })?.midi).toBe(m);
    expect(yin(tone(m, 2048), SR).hz).toBeNull();
  });

  it('a held note does not answer the next prompt; a new note does', () => {
    const fr = (midi: number, t0: number) => Array.from({ length: 10 }, (_, k) => ({ t: t0 + 16 * k, hz: hzOf(midi), conf: 0.95 }));
    expect(untimedPitch(fr(33, 0), { pitchFrom: 40, pitchTo: 120, held: 33 })).toBeNull();
    expect(untimedPitch([...fr(33, 0), ...fr(36, 160)], { pitchFrom: 40, pitchTo: 120, held: 33 })?.midi).toBe(36);
    expect(untimedPitch(fr(33, 0).slice(0, 3), { pitchFrom: 40, pitchTo: 120 })).toBeNull();
  });

  it('untimed items are off the tempo ladder: target = start, the goal never moves, 3 clean takes on 2 days pass', () => {
    for (const d of untimed) {
      const t = itemTargetBpm(d);
      expect(t).toBe(d.startBpm);
      let st: ItemState = newItem(d);
      for (const at of ['2026-11-07T10:00:00Z', '2026-11-07T10:05:00Z', '2026-11-08T10:00:00Z']) st = applyTake(st, take('clean'), st.goalBpm, at, DEFAULT_DRILL_SETTINGS, { targetBpm: t }).state;
      expect(st.goalBpm).toBe(d.startBpm);
      expect(itemPass(st, d.startBpm, t).target).toBe(true);
    }
  });
});

describe('N4 kick lock against the drum kick lane', () => {
  const onLane = (d: Drill, n: ExpNote) => (d.goal.bass!.kickLane ?? []).some((k) => Math.abs(k - n.beat) < 1e-6);
  // A drill whose line has notes off the kick (styles / pocket grooves): the lane is not the line.
  const d = BASS.flatMap((f) => f.levels)
    .flatMap((lv) => levelDrills(lv, order).slice(0, 1))
    .find((x) => x.goal.bass?.kick && x.goal.bass.kickLane?.length && x.notes.some((n) => !onLane(x, n)) && x.notes.filter((n) => onLane(x, n)).length >= 4)!;
  const bpm = 90;

  it('a groove drill with a kick lane that is not its line exists', () => {
    expect(d).toBeTruthy();
  });

  it('follows the kick lane but not the notes: locked 100 % (the missing notes fail it, not the kick)', () => {
    const m = analyzeGuitarTake(d, bpm, playAll(d, bpm, (n) => (onLane(d, n) ? {} : null)));
    expect(m.guitar.bass?.kick?.lock).toBe(1);
    expect(m.verdict).not.toBe('clean');
  });

  it('follows the notes but not the kick: every kick note 60 ms late is lock 0 and a "Locked with the kick" reason', () => {
    const m = analyzeGuitarTake(d, bpm, playAll(d, bpm, (n) => (onLane(d, n) ? { on: expTimeMs(d, n.beat, bpm) + 60 } : {})));
    expect(m.guitar.bass?.kick?.lock).toBe(0);
    expect(m.verdict).not.toBe('clean');
    expect(JSON.stringify(m.why)).toMatch(/Locked with the kick on 0%/);
  });

  it('the whole line on time is locked with no strays', () => {
    const m = analyzeGuitarTake(d, bpm, playAll(d, bpm));
    expect(m.guitar.bass?.kick).toMatchObject({ lock: 1, stray: 0 });
  });
});

/** The chord sounding at a slot of a rule drill, and another chord tone of it nearest the written pitch. */
const otherChordTone = (d: Drill, n: ExpNote): number => {
  const c = chartAt(d.goal.bass!.rules!.chart, n.beat).c;
  const pcs = chartPcs(c).filter((p) => p !== ((n.pitch % 12) + 12) % 12);
  const cands = pcs.flatMap((p) => [-2, -1, 0, 1].map((o) => n.pitch - (((n.pitch % 12) + 12) % 12) + p + 12 * o));
  return cands.sort((a, b) => Math.abs(a - n.pitch) - Math.abs(b - n.pitch))[0];
};
const rootNear = (d: Drill, n: ExpNote): number => {
  const r = ((chartAt(d.goal.bass!.rules!.chart, n.beat).c.root % 12) + 12) % 12;
  const base = n.pitch - (((n.pitch % 12) + 12) % 12) + r;
  return [base - 12, base, base + 12].sort((a, b) => Math.abs(a - n.pitch) - Math.abs(b - n.pitch))[0];
};

describe('N5 read L8 / L12: written bars note for note, free bars by the rules', () => {
  for (const id of ['b-read-8', 'b-read-12']) {
    const d = levelDrills(levelById(id), order).find((x) => x.freeFrom !== undefined && x.goal.bass?.rules)!;
    const bpm = d.startBpm;
    const isWritten = (n: ExpNote) => n.beat < d.freeFrom! - 1e-6;

    it(`${id}: the written line is clean`, () => {
      expect(analyzeGuitarTake(d, bpm, playAll(d, bpm)).verdict).toBe('clean');
    });

    it(`${id}: other chord tones in the free bars are clean`, () => {
      expect(analyzeGuitarTake(d, bpm, playAll(d, bpm, (n) => (isWritten(n) ? {} : { pitch: otherChordTone(d, n) }))).verdict).toBe('clean');
    });

    it(`${id}: other chord tones in the WRITTEN bars are not`, () => {
      const m = analyzeGuitarTake(d, bpm, playAll(d, bpm, (n) => (isWritten(n) ? { pitch: otherChordTone(d, n) } : {})));
      expect(m.verdict).toBe('not');
    });
  }
});

describe('N6 free walking needs variety: roots in alternating octaves fail', () => {
  const ids = ['b-walk-7', 'b-walk-11', 'b-walk-13', 'b-walk-16', 'b-up-walk-5'];
  for (const id of ids) {
    const lv = levelById(id);
    it(`${id}: the model line is clean, roots in alternating octaves are not`, () => {
      expect(lv).toBeTruthy();
      for (const d of levelDrills(lv, order).filter((x) => x.goal.bass?.rules?.kind === 'walk').slice(0, 3)) {
        const bpm = d.startBpm;
        expect(analyzeGuitarTake(d, bpm, playAll(d, bpm)).verdict, d.itemId).toBe('clean');
        const roots = analyzeGuitarTake(d, bpm, playAll(d, bpm, (n, i) => ({ pitch: rootNear(d, n) + (i % 2 ? 12 : 0) })));
        expect(roots.verdict, d.itemId).not.toBe('clean');
        expect(JSON.stringify(roots.why) + JSON.stringify(roots.rules)).toMatch(/Mostly roots|another octave|"nonRoot":0[,}]/);
      }
    });
  }

  it('every free walking model line in the bass course keeps the variety rule', () => {
    const bad: string[] = [];
    for (const f of BASS)
      for (const lv of f.levels)
        for (const d of levelDrills(lv, order).filter((x) => x.goal.bass?.rules?.kind === 'walk')) {
          const R = analyzeGuitarTake(d, d.startBpm, playAll(d, d.startBpm)).rules!;
          if (R.nonRoot! < WALK_VARIETY.nonRoot || R.pcRepeats! > WALK_VARIETY.pcRepeats) bad.push(`${d.itemId} nonRoot ${R.nonRoot} pcRep ${R.pcRepeats}`);
        }
    expect(bad).toEqual([]);
  });
});
