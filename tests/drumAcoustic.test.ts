// Acoustic kit by microphone (DRUMS_AUDIT §5): synthetic drum sounds → band powers → onsets → templates → the take.
import { describe, expect, it } from 'vitest';
import { acousticHits, acousticOk, drillAcousticVoices, acousticOnsets, ACOUSTIC_LEVELS, bandPowers, buildCal, classifyOnset, kitHiddenLevels, kitLevels, N_BANDS, type AFrame } from '../src/engine/drumAcoustic';
import { analyzeDrumTake, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { drumFamilies, drumProbes, generateDrums } from '../src/engine/drills/drums';
import { expTimeMs } from '../src/engine/drills/analyze';
import { drumMicOf, kitKind, type AcousticVoice } from '../src/engine/drumKit';
import type { Drill, DrumVoice } from '../src/engine/drills/types';

const SR = 32000;
const WIN = 1024;
const HOP_MS = 25;

/** Seeded noise. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

/** One synthetic stroke (amplitude `g`): a pitch-dropping sine kick, a tone + noise snare, a low tom, a bright hat. */
function stroke(voice: AcousticVoice, g: number, seed: number): Float32Array {
  const r = rng(seed);
  const n = Math.round(SR * 0.4);
  const out = new Float32Array(n);
  let ph = 0;
  let lp = 0;
  let prev = 0;
  let prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    if (voice === 'kick') {
      const f = 50 + 80 * Math.exp(-t / 0.03);
      ph += (2 * Math.PI * f) / SR;
      v = Math.sin(ph) * Math.exp(-t / 0.12) + 0.05 * r() * Math.exp(-t / 0.004);
    } else if (voice === 'tom') {
      const f = 110 + 25 * Math.exp(-t / 0.05);
      ph += (2 * Math.PI * f) / SR;
      lp += 0.08 * (r() - lp);
      v = 0.8 * Math.sin(ph) * Math.exp(-t / 0.25) + 0.25 * lp * Math.exp(-t / 0.05);
    } else if (voice === 'snare') {
      ph += (2 * Math.PI * 190) / SR;
      const x = r();
      v = 0.5 * Math.sin(ph) * Math.exp(-t / 0.06) + 0.6 * (x - 0.6 * prev) * Math.exp(-t / 0.12);
      prev = x;
    } else {
      // hat: noise high-passed twice (differences), short
      const x = r();
      v = 0.9 * (x - 2 * prev + prev2) * Math.exp(-t / 0.035);
      prev2 = prev;
      prev = x;
    }
    // A short fade at the end (a cut-off tail would be a click).
    out[i] = g * v * Math.min(1, (n - i) / (SR * 0.05));
  }
  return out;
}

/** A recording: strokes at times (ms) mixed with a little room noise. */
function record(hits: { t: number; v: AcousticVoice; g?: number }[], lengthMs: number, seed = 7): Float32Array {
  const n = Math.round((SR * lengthMs) / 1000);
  const out = new Float32Array(n);
  const r = rng(seed);
  for (let i = 0; i < n; i++) out[i] = 0.0005 * r();
  hits.forEach((h, k) => {
    const s = stroke(h.v, h.g ?? 0.5, seed * 1000 + k + 1);
    const i0 = Math.round((SR * h.t) / 1000);
    for (let i = 0; i < s.length && i0 + i < n; i++) if (i0 + i >= 0) out[i0 + i] += s[i];
  });
  return out;
}

/** Frames as the browser makes them: every 25 ms the band powers of the newest window. */
function framesOf(sig: Float32Array): AFrame[] {
  const hop = Math.round((SR * HOP_MS) / 1000);
  const out: AFrame[] = [];
  for (let end = WIN; end <= sig.length; end += hop) out.push({ t: (end / SR) * 1000, bands: bandPowers(sig.subarray(end - WIN, end), SR) });
  return out;
}

/** The calibration: 4 strokes of each drum, a second apart, at slightly different strengths. */
function calibrate(voices: AcousticVoice[] = ['kick', 'snare', 'tom', 'hat']) {
  const samples: Partial<Record<AcousticVoice, number[][]>> = {};
  for (const v of voices) {
    const sig = record([0, 1, 2, 3].map((k) => ({ t: 500 + k * 600, v, g: 0.45 + 0.05 * k })), 3000, voices.indexOf(v) + 11);
    samples[v] = acousticOnsets(framesOf(sig)).map((o) => o.x);
  }
  return { samples, ...buildCal(samples) };
}

describe('acoustic kit: band powers and onsets', () => {
  it('each synthetic drum puts its energy where expected (kick low, hat high)', () => {
    const k = bandPowers(stroke('kick', 0.5, 1).subarray(0, WIN), SR);
    const h = bandPowers(stroke('hat', 0.5, 2).subarray(0, WIN), SR);
    expect(k.length).toBe(N_BANDS);
    expect(k.indexOf(Math.max(...k))).toBeLessThanOrEqual(2);
    expect(h.indexOf(Math.max(...h))).toBeGreaterThanOrEqual(6);
  });
  it('room noise alone (10 s, several seeds) makes no onsets', () => {
    for (const seed of [1, 2, 3, 4, 5]) expect(acousticOnsets(framesOf(record([], 10000, seed))).length).toBe(0);
  });
  it('finds every stroke of a recording once, within a frame of where it was', () => {
    const at = [300, 700, 1000, 1150, 1600];
    const vs: AcousticVoice[] = ['kick', 'snare', 'hat', 'hat', 'snare'];
    const os = acousticOnsets(framesOf(record(at.map((t, i) => ({ t, v: vs[i] })), 2200)));
    expect(os.length).toBe(at.length);
    os.forEach((o, i) => expect(Math.abs(o.t - at[i])).toBeLessThanOrEqual(HOP_MS + 1));
  });
});

describe('acoustic kit: calibration and classification', () => {
  it('learns a template per drum and tells all four apart', () => {
    const { cal, ok, acc, samples } = calibrate();
    expect(ok).toBe(true);
    expect(acc).toBeGreaterThanOrEqual(0.9);
    expect(Object.keys(cal.tpl).sort()).toEqual(['hat', 'kick', 'snare', 'tom']);
    for (const v of ['kick', 'snare', 'tom', 'hat'] as const) expect(samples[v]!.length, v).toBe(4);
  });
  it('splits two drums on the same 8th (kick + hat, snare + hat) and reports both as sure', () => {
    const { cal } = calibrate();
    const two = (a: AcousticVoice, b: AcousticVoice) => {
      const os = acousticOnsets(framesOf(record([{ t: 400, v: a }, { t: 400, v: b }], 900, 3)));
      expect(os.length).toBe(1);
      return classifyOnset(os[0].x, cal);
    };
    for (const [a, b] of [['kick', 'hat'], ['snare', 'hat']] as [AcousticVoice, AcousticVoice][]) {
      const r = two(a, b);
      const sure = r.hits.filter((h) => h.sure).map((h) => h.voice);
      expect(sure).toContain(a);
      expect(sure).toContain(b);
    }
  });
  it('a soft snare alone is still the snare, much weaker than a normal one', () => {
    const { cal } = calibrate();
    const os = acousticOnsets(framesOf(record([{ t: 400, v: 'snare', g: 0.5 }, { t: 1000, v: 'snare', g: 0.1 }], 1500, 5)));
    const [loud, soft] = os.map((o) => classifyOnset(o.x, cal).hits[0]);
    expect(loud.voice).toBe('snare');
    expect(soft.voice).toBe('snare');
    expect(soft.a).toBeLessThan(0.15 * loud.a);
  });
  it('a sound unlike the calibrated drums is unsure, never a sure wrong drum', () => {
    const { cal } = calibrate(['kick', 'snare', 'hat']);
    // A 1 kHz tone burst (a cowbell-like sound) — not in the templates.
    const n = 16000;
    const sig = record([], 1000, 9);
    for (let i = 0; i < n; i++) sig[8000 + i] += 0.4 * Math.sin((2 * Math.PI * 1000 * i) / SR) * Math.exp(-i / 2000);
    const os = acousticOnsets(framesOf(sig));
    expect(os.length).toBe(1);
    const r = classifyOnset(os[0].x, cal);
    expect(r.hits.every((h) => !h.sure)).toBe(true);
  });
  it('a calibration on one drum only (the same sound for every step) is refused', () => {
    const same = calibrate(['snare']).samples.snare!;
    expect(buildCal({ kick: same, snare: same, hat: same }).ok).toBe(false);
  });
  it('a tom that sounds like the snare is dropped (toms then count as the snare)', () => {
    const { samples } = calibrate(['kick', 'snare', 'hat']);
    const r = buildCal({ ...samples, tom: samples.snare });
    expect(r.droppedTom).toBe(true);
    expect(r.cal.tpl.tom).toBeUndefined();
  });
});

/** Play a drill on the synthetic kit: each note a stroke (ride / crash as the hat, toms as the tom), seeded jitter. */
function playDrill(drill: Drill, bpm: number, o: { jitter?: number; swap?: [DrumVoice, AcousticVoice]; seed?: number } = {}): AFrame[] {
  const r = rng(o.seed ?? 3);
  const AS: Record<string, AcousticVoice> = { kick: 'kick', snare: 'snare', rim: 'snare', tom1: 'tom', tom2: 'tom', tom3: 'tom', hihat: 'hat', hhOpen: 'hat', ride: 'hat', crash: 'hat' };
  const lead = 1000;
  const hits = drill.notes.map((n) => {
    const v = o.swap && n.voice === o.swap[0] ? o.swap[1] : AS[n.voice!];
    return { t: lead + expTimeMs(drill, n.beat, bpm) + (o.jitter ?? 4) * r(), v, g: n.ghost ? 0.12 : n.accent ? 0.6 : 0.45 };
  });
  const len = lead + expTimeMs(drill, drill.beats, bpm) + 800;
  // Minus half a hop: the mic latency calibration (same frame grid) takes out the detector's average lateness.
  return framesOf(record(hits, len, o.seed ?? 3)).map((f) => ({ ...f, t: f.t - lead - HOP_MS / 2 }));
}

describe('acoustic kit: a whole take', () => {
  const { cal } = calibrate();
  const take = (d: Drill, bpm: number, o: Parameters<typeof playDrill>[2] = {}) => analyzeDrumTake(d, bpm, acousticHits(acousticOnsets(playDrill(d, bpm, o)), cal, drillAcousticVoices(d, cal)), { acoustic: { toms: !!cal.tpl.tom } });
  it('a steady basic rock beat (hat 8ths, snare 2 & 4, kick 1 & 3) is clean', () => {
    const d = generateDrums({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const m = take(d, 90);
    expect(m.drum!.unsure ?? 0).toBeLessThanOrEqual(0.2);
    expect(m.drum!.wrongVoice).toBe(0);
    expect(m.verdict).toBe('clean');
  });
  it('other seeds and denser grooves (16th hat at ♩80, the Mizrahi kit groove at ♩100, shuffle) are clean too', () => {
    const cases: [string, string, number, number][] = [
      ['d-rock', '1:rock', 90, 11],
      ['d-rock', '1:rock', 100, 12],
      ['d-rock', '4:hat16', 80, 13],
      ['d-mideast', '4:kit', 100, 14],
      ['d-shuffle', '2:shuffle', 100, 15],
    ];
    for (const [family, kind, bpm, seed] of cases) {
      const d = generateDrums({ family, kind, option: 0, key: 0, hands: 'RL', instrument: 'drums' } as Parameters<typeof generateDrums>[0]);
      const m = take(d, bpm, { seed });
      expect(m.verdict, `${family} ${kind}: ${m.why.en}`).toBe('clean');
    }
  });
  it('the snare where the kick is due is the wrong drum (not clean)', () => {
    const d = generateDrums({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const m = take(d, 90, { swap: ['kick', 'snare'] });
    expect(m.verdict).not.toBe('clean');
    expect(m.drum!.missed[0]).toBe('wrong');
  });
  it('a fill into a crash + kick landing is measured (toms as the tom)', () => {
    const d = generateDrums({ family: 'd-fills', kind: '3:fill4', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const m = take(d, 80);
    expect(m.drum!.landing.every((x) => x !== null && Math.abs(x) <= 30)).toBe(true);
    expect(m.verdict).toBe('clean');
  });
  it('funk ghosts between the hat strokes: soft ghosts pass, loud "ghosts" do not', () => {
    const d = generateDrums({ family: 'd-funk', kind: '2:hat', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(take(d, 80).drum!.ghost).toBeGreaterThanOrEqual(0.85);
    // The same take with the ghosts played as loud as the backbeat.
    const loud = { ...d, notes: d.notes.map((n) => ({ ...n, ghost: undefined })) };
    const hits = acousticHits(acousticOnsets(playDrill(loud, 80)), cal, drillAcousticVoices(d, cal));
    const m = analyzeDrumTake(d, 80, hits, { acoustic: { toms: true } });
    expect(m.drum!.ghost).toBeLessThan(0.5);
    expect(m.verdict).not.toBe('clean');
  });
  it('a take whose drums are mostly unsure is flagged "unsure" (DrillTake drops it: no pass, no fail)', () => {
    const d = generateDrums({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const hits: DrumTakeHit[] = d.notes.map((n) => ({ voice: 'snare', on: expTimeMs(d, n.beat, 90), vel: 80, unsure: true }));
    const m = analyzeDrumTake(d, 90, hits, { acoustic: { toms: true } });
    expect(m.drum!.unsure).toBe(1);
    expect(m.drum!.missed).toContain('unsure');
    expect(m.verdict).toBe('not');
    expect(m.wrong).toBe(0);
  });
  it('unsure hits never count as the wrong drum; a few of them do not stop a clean take', () => {
    const d = generateDrums({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const hits: DrumTakeHit[] = d.notes.map((n, i) => ({ voice: n.voice === 'kick' && i % 8 === 0 ? 'snare' : n.voice!, on: expTimeMs(d, n.beat, 90), vel: 80, ...(n.voice === 'kick' && i % 8 === 0 ? { unsure: true } : {}) }));
    const m = analyzeDrumTake(d, 90, hits, { acoustic: { toms: true } });
    expect(m.drum!.unsure!).toBeGreaterThan(0);
    expect(m.drum!.unsure!).toBeLessThanOrEqual(0.2);
    expect(m.verdict).toBe('clean');
  });
  it('a level with the hi-hat foot or open hat never passes by microphone', () => {
    const d = generateDrums({ family: 'd-feet', kind: '1:chick', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const hits: DrumTakeHit[] = d.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(d, n.beat, 80), vel: 80 }));
    expect(analyzeDrumTake(d, 80, hits, { acoustic: { toms: true } }).verdict).not.toBe('clean');
  });
});

describe('acoustic kit: which levels', () => {
  const fams = drumFamilies();
  const levels = fams.flatMap((f) => f.levels);
  it('every listed level exists, has no hi-hat foot, no open hat, and no loudness goal but ghost notes', () => {
    for (const id of ACOUSTIC_LEVELS) {
      const lv = levels.find((l) => l.id === id);
      expect(lv, id).toBeDefined();
      for (const sp of lv!.specs) {
        const d = generateDrums({ ...sp, key: 0 } as Parameters<typeof generateDrums>[0]);
        expect(acousticOk(d)).toBe(true);
        expect(d.notes.some((n) => n.voice === 'hhPedal' || n.voice === 'hhOpen'), id).toBe(false);
        const g = d.goal.drum ?? {};
        expect(g.hat, id).toBeFalsy();
        expect(Object.keys(g).filter((k) => !['ghost', 'landing', 'gapMs'].includes(k)), id).toEqual([]);
        // Ghosts only where they sound alone: never on the same step as a hat / ride stroke.
        const cym = new Set(d.notes.filter((n) => n.voice === 'hihat' || n.voice === 'ride').map((n) => n.beat));
        expect(d.notes.filter((n) => n.ghost && cym.has(n.beat)).length, id).toBe(0);
      }
    }
  });
  it('setups: MIDI shows everything, a pad the single-surface levels, an acoustic kit those + the grooves', () => {
    const all = levels.length;
    const pad = kitLevels(fams, 'pad').flatMap((f) => f.levels);
    const ac = kitLevels(fams, 'acoustic').flatMap((f) => f.levels);
    expect(kitLevels(fams, false).flatMap((f) => f.levels).length).toBe(all);
    expect(pad.every((l) => l.mic)).toBe(true);
    expect(ac.length).toBe(pad.length + ACOUSTIC_LEVELS.size);
    expect(ac.some((l) => l.id === 'd-rock-1')).toBe(true);
    expect(kitLevels(fams, true).length).toBe(kitLevels(fams, 'pad').length);
    expect(kitHiddenLevels(fams, 'acoustic')).toContain('d-rock-3');
    expect(kitHiddenLevels(fams, 'acoustic')).not.toContain('d-rock-1');
    expect(kitHiddenLevels(fams, false)).toEqual([]);
  });
  it('kit kind: old profiles keep working; an acoustic kit counts only once calibrated', () => {
    expect(kitKind(undefined)).toBe('midi');
    expect(kitKind({ preset: 'gm', map: {}, mic: true })).toBe('pad');
    expect(kitKind({ preset: 'gm', map: {}, mic: true, kind: 'acoustic' })).toBe('pad');
    const tpl = { kick: Array(N_BANDS).fill(1), snare: Array(N_BANDS).fill(1), hat: Array(N_BANDS).fill(1) };
    expect(kitKind({ preset: 'gm', map: {}, mic: true, kind: 'acoustic', acoustic: { tpl } })).toBe('acoustic');
    expect(drumMicOf({ preset: 'gm', map: {}, mic: true, kind: 'acoustic', acoustic: { tpl } })).toBe('acoustic');
    expect(drumMicOf({ preset: 'gm', map: {} })).toBe(false);
  });
  it('the placement probe on an acoustic kit adds the groove steps it can measure', () => {
    const pad = drumProbes(true).map((p) => p.slot);
    const ac = drumProbes(true, true).map((p) => p.slot);
    expect(pad).not.toContain('groove');
    expect(ac).toContain('groove');
    expect(ac).toContain('fill');
    expect(ac).toContain('funk');
    expect(ac).not.toContain('feet');
  });
});

