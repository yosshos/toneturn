import { describe, expect, it } from 'vitest';
import { scoreInformedNotes } from '../src/engine/drills/pianoMic';
import { generate } from '../src/engine/drills/generate';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { chromaFromSpectrum } from '../src/engine/chroma';
import type { GFrame } from '../src/engine/drills/guitarAnalyze';
import type { Drill } from '../src/engine/drills/types';

const SR = 48000;
const N = 8192;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function spectrum(notes: number[]): Float32Array {
  const lin = new Float32Array(N / 2);
  for (const m of notes)
    for (let k = 1; k <= 3; k++) {
      const bin = Math.round((hz(m) * k) / (SR / N));
      if (bin < lin.length) lin[bin] += 1 / k;
    }
  return lin.map((x) => (x > 0 ? 20 * Math.log10(x) : -140));
}

/** Microphone frames of a take: each chord sounds from its time (attack = a loudness jump), optionally without one pitch. */
function framesOf(d: Drill, bpm: number, drop?: number): GFrame[] {
  const groups = new Map<number, { beat: number; ps: number[] }>();
  for (const n of d.notes) {
    const k = n.chordId ?? -n.beat - 1000;
    const g = groups.get(k) ?? { beat: n.beat, ps: [] };
    g.ps.push(n.pitch);
    groups.set(k, g);
  }
  const evs = [...groups.values()].map((g) => ({ t: expTimeMs(d, g.beat, bpm), ps: g.ps }));
  evs.sort((a, b) => a.t - b.t);
  const end = evs[evs.length - 1].t + 1500;
  const out: GFrame[] = [];
  for (let t = -300; t < end; t += 20) {
    const cur = [...evs].reverse().find((e) => e.t <= t);
    const since = cur ? t - cur.t : 9999;
    const ps = cur ? cur.ps.filter((p) => p !== drop) : [];
    const rms = cur ? 0.02 + 0.2 * Math.exp(-since / 300) : 0.002;
    out.push({ t, hz: null, conf: 0, rms, chroma: ps.length ? chromaFromSpectrum(spectrum(ps), SR, N) : new Array(12).fill(0) });
  }
  return out;
}

describe('piano chords by microphone, score-informed (0.49)', () => {
  const d = generate({ family: 'cadences', kind: 'cadence-1', key: 0, hands: 'RL' } as never);
  const bpm = 60;
  it('a clean take of a cadence by microphone is clean', () => {
    const played = scoreInformedNotes(d, bpm, framesOf(d, bpm));
    const m = analyzeTake(d, bpm, played);
    expect(m.missing).toBe(0);
    expect(m.wrong).toBe(0);
  });
  it('a pitch that never sounds is reported missing', () => {
    const someR = d.notes.find((n) => n.hand === 'R')!.pitch;
    const played = scoreInformedNotes(d, bpm, framesOf(d, bpm, someR));
    const m = analyzeTake(d, bpm, played);
    expect(m.missing).toBeGreaterThan(0);
  });
  it('silence: everything missing, nothing invented', () => {
    const quiet: GFrame[] = Array.from({ length: 300 }, (_, i) => ({ t: i * 20, hz: null, conf: 0, rms: 0.002, chroma: new Array(12).fill(0) }));
    expect(scoreInformedNotes(d, bpm, quiet)).toEqual([]);
  });
});
