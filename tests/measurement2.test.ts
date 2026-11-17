// MEASUREMENT-AUDIT, second round (2026-11-17): G9–G15, B9–B15, melody over accompaniment, the piano's touch by
// microphone and the honest level test — each new measure on synthetic takes, including the "no claim" cases.
import { describe, expect, it } from 'vitest';
import { analyzeTake, expTimeMs, legatoOverlapLimit, micUnmeasurable } from '../src/engine/drills/analyze';
import { generate } from '../src/engine/drills/generate';
import type { Drill, DrillGoal, DrillSpec, ExpNote, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import { analyzeMicTouch, micTouchGoal, MIC_TOUCH, type EnvFrame } from '../src/engine/drills/micTouch';
import { melodyTexture } from '../src/engine/drills/touch';
import { softTick } from '../src/engine/noteMarks';
import { finishPlaces, MIC_TOUCH_PROVES, strandsFor } from '../src/engine/drills/levelTest';
import { families } from '../src/engine/drills/plan';
import { addTake, emptyModel, findings, type PlayerModel } from '../src/engine/analysis/model';
import { parseMusicXml } from '../src/engine/piece/score';
import { chunkDrill } from '../src/engine/piece/toDrill';
import { makePhrase, phraseDrill } from '../src/engine/encore/phrase';
import { brightnessChange, gradeTake } from '../src/engine/vocal';
import type { SungFrame } from '../src/engine/sing';

const CAL = { latencyMs: 0, velMin: 20, velMax: 110 };

/** A take of every written note on time (`dt` ms off), with velocities and releases from the given functions. */
function take(d: Drill, bpm: number, o: { vel?: (n: ExpNote, i: number) => number; dt?: (n: ExpNote, i: number) => number; off?: (n: ExpNote, on: number) => number; skip?: (n: ExpNote, i: number) => boolean } = {}): PlayedNote[] {
  const beatMs = 60000 / bpm;
  const out: PlayedNote[] = [];
  const seen = new Set<string>();
  d.notes.forEach((n, i) => {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k) || o.skip?.(n, i)) return;
    seen.add(k);
    const on = expTimeMs(d, n.beat, bpm) + (o.dt ? o.dt(n, i) : 0);
    out.push({ pitch: n.pitch, on, off: o.off ? o.off(n, on) : on + n.dur * beatMs + 15, vel: Math.round(o.vel ? o.vel(n, i) : 70) });
  });
  return out.sort((a, b) => a.on - b.on);
}
const lines = (m: TakeMetrics, id: string) => m.touch?.lines.filter((l) => l.id === id) ?? [];
const line = (m: TakeMetrics, id: string) => lines(m, id)[0];
/** A hand-made drill (a piece chunk, a test passage). */
function custom(notes: ExpNote[], goal: Partial<DrillGoal> = {}, o: Partial<Drill> = {}): Drill {
  const both = notes.some((n) => n.hand === 'L') && notes.some((n) => n.hand === 'R');
  return {
    spec: { family: 'custom', kind: 'piece:test:0-3', key: 0, hands: both ? 'RL' : notes[0]?.hand === 'L' ? 'L' : 'R' },
    itemId: 'piece:test:0-3',
    title: { en: 'Test', he: 'Test' },
    notes: notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch),
    beats: Math.max(...notes.map((n) => n.beat + n.dur)),
    meter: 4,
    keySig: 'C',
    goal: { evenness: false, hands: both, ...goal },
    startBpm: 80,
    ...o,
  };
}

describe('G9 / B11: accents on their notes, the others not accented', () => {
  const d = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, dynamics: 'accent3', perBeat: 3 } as DrillSpec);
  it('accents where written: clean, a count line', () => {
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => (n.accent ? 95 : 60) }), CAL);
    expect(m.verdict).toBe('clean');
    expect(line(m, 'accents')!.ok).toBe(true);
    expect(line(m, 'accents')!.text.he).toMatch(/ההטעמות במקום/);
  });
  it('accents dropped on a third of the marks: named, marked hollow on the staff', () => {
    let k = 0;
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => (n.accent ? (k++ % 3 === 0 ? 62 : 95) : 60) }), CAL);
    const l = lines(m, 'accents').find((x) => !x.ok)!;
    expect(l.text.en).toMatch(/Accents missing/);
    expect(l.why).toBeDefined();
    expect(m.touch!.tags).toContain('accent-miss');
    expect(m.touch!.marks.some((x) => x.mark === 'flat')).toBe(true);
    expect(m.verdict).not.toBe('clean');
  });
  it('B11: unmarked notes accented too (the mean gap alone would pass) — caught', () => {
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n, i) => (n.accent ? 100 : i % 3 === 1 ? 98 : 55) }), CAL);
    expect(m.accentGap!).toBeGreaterThan(15);
    expect(m.touch!.tags).toContain('accent-extra');
    expect(m.touch!.marks.some((x) => x.mark === 'extra')).toBe(true);
    expect(m.verdict).not.toBe('clean');
  });
  it('no claim by microphone (no velocity) and none without accents', () => {
    const mic = analyzeTake(d, 70, take(d, 70, { vel: () => 64 }), CAL, { mic: true });
    expect(line(mic, 'accents')).toBeUndefined();
    const plain = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    expect(line(analyzeTake(plain, 70, take(plain, 70), CAL), 'accents')).toBeUndefined();
  });
});

describe('G10: trills and repeated notes', () => {
  const d = generate({ family: 'fingers', kind: 'trill', key: 0, hands: 'R', option: 1, perBeat: 4 } as DrillSpec);
  const n = d.notes.length;
  it('an even trill: its speed in notes a second, nothing else', () => {
    const m = analyzeTake(d, 90, take(d, 90), CAL);
    expect(m.touch!.trill!.nps).toBeCloseTo(6, 0);
    expect(line(m, 'trill')!.text.en).toMatch(/notes a second/);
    expect(lines(m, 'trill').every((l) => l.ok)).toBe(true);
  });
  it('slowing in the last third is named and graded', () => {
    const m = analyzeTake(d, 90, take(d, 90, { dt: (_x, i) => (i > (2 * n) / 3 ? (i - (2 * n) / 3) * 22 : 0) }), CAL);
    expect(m.touch!.tags).toContain('trill-slow');
    expect(m.verdict).not.toBe('clean');
  });
  it('fading and one note softer: soft lines by note, never a finger', () => {
    const m = analyzeTake(d, 90, take(d, 90, { vel: (x, i) => (i > (2 * n) / 3 ? 50 : 80) - (x.pitch % 12 === d.notes[1].pitch % 12 ? 14 : 0) }), CAL);
    expect(m.touch!.tags).toContain('trill-fade');
    expect(m.touch!.tags).toContain('trill-pair');
    const pair = lines(m, 'trill').find((l) => /softer than/.test(l.text.en))!;
    expect(pair.text.en).not.toMatch(/finger/i);
  });
  it('by microphone: speed and slowing only — no claim on velocity', () => {
    const m = analyzeTake(d, 90, take(d, 90, { vel: () => 64 }), CAL, { mic: true });
    expect(m.touch!.trill!.fade).toBeNull();
    expect(m.touch!.tags ?? []).not.toContain('trill-pair');
  });
});

/** Steps with a leap of a 10th up every 4th note (the leap's landing measured against the note before it). */
const leapLine = (): Drill => {
  const ns: ExpNote[] = [];
  let p = 60;
  for (let i = 0; i < 24; i++) {
    p = i % 4 === 0 && i > 0 ? p + 16 : i % 4 === 1 && i > 1 ? p - 15 : p + (i % 2 ? 2 : -1);
    ns.push({ pitch: p, beat: i * 0.5, dur: 0.5, hand: 'R' });
  }
  return custom(ns, { evenness: true }, { spec: { family: 'advanced', kind: 'leaps', key: 0, hands: 'R' } });
};
describe('G11: leaps and octaves', () => {
  const d = leapLine();
  const leapIdx = new Set<number>();
  const rh = d.notes.map((x, i) => ({ x, i })).filter((y) => y.x.hand === 'R');
  rh.forEach((y, k) => k > 0 && Math.abs(y.x.pitch - rh[k - 1].x.pitch) >= 8 && leapIdx.add(y.i));
  it('the drill has leaps to measure', () => expect(leapIdx.size).toBeGreaterThanOrEqual(3));
  it('landing on time: an ok line', () => {
    const m = analyzeTake(d, 72, take(d, 72), CAL);
    expect(line(m, 'leaps')!.ok).toBe(true);
  });
  it('landing 40 ms late after each leap: named with the delay, marked', () => {
    const m = analyzeTake(d, 72, take(d, 72, { dt: (_x, i) => (leapIdx.has(i) ? 40 : 0) }), CAL);
    const l = line(m, 'leaps')!;
    expect(l.ok).toBe(false);
    expect(l.text.en).toMatch(/Late after leaps \(\+40 ms/);
    expect(m.touch!.marks.some((x) => x.mark === 'land')).toBe(true);
  });
  it('no leaps, no claim', () => {
    const s = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 1 } as DrillSpec);
    expect(line(analyzeTake(s, 72, take(s, 72), CAL), 'leaps')).toBeUndefined();
  });
  it('octaves rolled are named as octaves', () => {
    const o = generate({ family: 'advanced', kind: 'octaves', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    const m = analyzeTake(o, 60, take(o, 60, { dt: (x) => (x.pitch % 24 === 0 ? 0 : 0) + (o.notes.indexOf(x) % 4 === 1 ? 45 : 0) }), CAL);
    expect(m.touch!.lines.some((l) => /Octaves not together/.test(l.text.en))).toBe(true);
    expect(m.touch!.tags).toContain('octaves');
  });
});

describe('G12: sf and fp from the score', () => {
  const mk = (sub: 'sf' | 'fp') =>
    custom(
      Array.from({ length: 12 }, (_, i): ExpNote => ({ pitch: 60 + (i % 5), beat: i, dur: 1, hand: 'R', ...(i === 6 ? { sub } : {}), dynMark: 'p' })),
      { marks: true },
    );
  it('sf heard', () => {
    const d = mk('sf');
    const m = analyzeTake(d, 90, take(d, 90, { vel: (x) => (x.sub ? 95 : 45) }), CAL);
    expect(line(m, 'subito')!.ok).toBe(true);
  });
  it('sf not heard: named by its bar', () => {
    const d = mk('sf');
    const m = analyzeTake(d, 90, take(d, 90, { vel: () => 45 }), CAL);
    expect(line(m, 'subito')!.text.en).toBe('Bar 2: sf not heard');
    expect(line(m, 'subito')!.text.he).toContain('ה־sf לא בלט');
  });
  it('fp without the drop after it', () => {
    const d = mk('fp');
    const m = analyzeTake(d, 90, take(d, 90, { vel: (x) => (x.beat >= 6 ? 90 : 45) }), CAL);
    expect(line(m, 'subito')!.text.en).toMatch(/fp without the drop/);
  });
  it('MusicXML: sf is momentary, fp leaves p, una corda … tre corde', () => {
    const note = (step: string) => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`;
    const dir = (inner: string) => `<direction><direction-type>${inner}</direction-type></direction>`;
    const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">
      <measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        ${dir('<dynamics><f/></dynamics>')}${note('C')}${dir('<dynamics><sf/></dynamics>')}${note('D')}${note('E')}${dir('<dynamics><fp/></dynamics>')}${note('F')}</measure>
      <measure number="2">${dir('<words>una corda</words>')}${note('G')}${note('A')}${dir('<words>tre corde</words>')}${note('B')}${note('C')}</measure>
    </part></score-partwise>`;
    const p = parseMusicXml(xml);
    expect(p.notes.map((x) => x.sub ?? '-')).toEqual(['-', 'sf', '-', 'fp', '-', '-', '-', '-']);
    expect(p.notes.map((x) => x.dyn)).toEqual(['f', 'f', 'f', 'p', 'p', 'p', 'p', 'p']);
    expect(p.notes.map((x) => !!x.uc)).toEqual([false, false, false, false, true, true, false, false]);
    const dr = chunkDrill(p, 'x', 0, 1, 80);
    expect(dr.notes.filter((x) => x.sub).length).toBe(2);
    expect(dr.notes.filter((x) => x.uc).length).toBe(2);
  });
});

describe('G13: the soft pedal where una corda is written', () => {
  const d = custom(Array.from({ length: 8 }, (_, i): ExpNote => ({ pitch: 60 + i, beat: i, dur: 1, hand: 'R', ...(i >= 2 && i < 6 ? { uc: true } : {}) })), { marks: true });
  const beat = 60000 / 80;
  it('down under una corda, up after: ok', () => {
    const m = analyzeTake(d, 80, take(d, 80), CAL, { softPedal: [{ at: 2 * beat - 50, down: true }, { at: 6 * beat - 50, down: false }] });
    expect(line(m, 'una-corda')!.ok).toBe(true);
  });
  it('never pressed (the keyboard sends CC67 elsewhere): missing', () => {
    const m = analyzeTake(d, 80, take(d, 80), CAL, { softPedal: [{ at: 7 * beat + 100, down: true }] });
    expect(line(m, 'una-corda')!.text.en).toMatch(/Soft pedal missing/);
  });
  it('no CC67 at all in the take: no claim (most keyboards have no soft pedal)', () => {
    expect(line(analyzeTake(d, 80, take(d, 80), CAL, { softPedal: [] }), 'una-corda')).toBeUndefined();
    expect(line(analyzeTake(d, 80, take(d, 80), CAL), 'una-corda')).toBeUndefined();
  });
});

describe('G14: an Encore phrase against its model take', () => {
  const shape = [50, 60, 70, 95, 70, 60, 55, 50, 60, 70];
  const mk = (model: number[]) => custom(model.map((v, i): ExpNote => ({ pitch: 60 + (i % 7), beat: i * 0.5, dur: 0.5, hand: 'R', modelVel: v })), { model: true }, { spec: { family: 'licks', kind: 'lick:x', key: 0, hands: 'R' } });
  it('the same contour (on another scale): ok', () => {
    const d = mk(shape);
    const m = analyzeTake(d, 90, take(d, 90, { vel: (_x, i) => 30 + shape[i] * 0.6 }), CAL);
    expect(line(m, 'model')!.ok).toBe(true);
  });
  it('the reverse contour, and the model\'s leaning note missed: named by bar and beat', () => {
    const d = mk(shape);
    const m = analyzeTake(d, 90, take(d, 90, { vel: (_x, i) => 130 - shape[i] }), CAL);
    expect(lines(m, 'model').some((l) => /unlike the model/.test(l.text.en))).toBe(true);
    expect(lines(m, 'model').some((l) => l.text.en === 'The model leans on bar 1, beat 2')).toBe(true);
    // soft information: the notes and time pass the take
    expect(m.verdict).toBe('clean');
  });
  it('an even model: no claim', () => {
    const d = mk(shape.map(() => 64));
    expect(line(analyzeTake(d, 90, take(d, 90, { vel: (_x, i) => 40 + i * 5 }), CAL), 'model')).toBeUndefined();
  });
  it('makePhrase keeps the source velocity and detached notes; the phrase drill carries them', () => {
    const l = makePhrase({ id: 'p1', name: { en: 'x', he: 'x' }, rh: shape.map((v, i) => ({ midi: 60 + (i % 5), beat: i * 0.5, dur: 0.5, vel: v, held: i === 3 ? 0.4 : 0.95 })), lh: [], key: 0, minor: false, chords: [], ctx: 'free', meter: 4, swing: 0.5, instrument: 'piano', playedBpm: 90 });
    expect(l.marks?.[3]).toEqual({ vel: 95, stac: true });
    const d = phraseDrill(l, 0, 'R');
    expect(d.goal.model).toBe(true);
    expect(d.notes.filter((n) => n.modelVel !== undefined).length).toBe(shape.length);
    expect(d.notes.filter((n) => n.stac).length).toBe(1);
  });
});

describe('Melody over accompaniment (pieces)', () => {
  // 8 bars: a RH melody in quarters, a LH broken-chord accompaniment in eighths
  const notes: ExpNote[] = [];
  for (let b = 0; b < 8; b++) {
    for (let q = 0; q < 4; q++) notes.push({ pitch: 72 + ((b + q) % 5), beat: b * 4 + q, dur: 1, hand: 'R' });
    for (let e = 0; e < 8; e++) notes.push({ pitch: [48, 55, 52, 55][e % 4], beat: b * 4 + e / 2, dur: 0.5, hand: 'L' });
  }
  const d = custom(notes, { marks: true });
  it('above in 6 of 8 bars: the per-passage count', () => {
    const m = analyzeTake(d, 80, take(d, 80, { vel: (x) => (x.hand === 'R' ? (Math.floor(x.beat / 4) < 6 ? 85 : 60) : 60) }), CAL);
    const l = line(m, 'melody')!;
    expect(l.text.he).toBe('המנגינה בלטה ב־6 מתוך 8 תיבות');
    expect(l.ok).toBe(true);
    expect(m.touch!.melody).toEqual({ bars: 6, of: 8 });
  });
  it('above in 3 of 8 bars: a miss with Why?, the bars marked', () => {
    const m = analyzeTake(d, 80, take(d, 80, { vel: (x) => (x.hand === 'R' ? (Math.floor(x.beat / 4) < 3 ? 85 : 62) : 62) }), CAL);
    const l = line(m, 'melody')!;
    expect(l.ok).toBe(false);
    expect(l.why).toBeDefined();
    expect(m.touch!.tags).toContain('melody');
    expect(m.touch!.marks.filter((x) => x.mark === 'flat').length).toBe(5);
  });
  it('two equal single lines (counterpoint) are not melody and accompaniment: no claim', () => {
    const inv: ExpNote[] = [];
    for (let i = 0; i < 16; i++) inv.push({ pitch: 72 + (i % 5), beat: i, dur: 1, hand: 'R' }, { pitch: 48 + (i % 7), beat: i + 0.5, dur: 1, hand: 'L' });
    const c = custom(inv, { marks: true });
    expect(melodyTexture(c)).toBeNull();
    expect(line(analyzeTake(c, 80, take(c, 80), CAL), 'melody')).toBeUndefined();
  });
  it('a long-term pattern after repeated misses', () => {
    let model: PlayerModel = emptyModel();
    for (let t = 0; t < 8; t++) model = addTake(model, d, analyzeTake(d, 80, take(d, 80, { vel: () => 62 }), CAL), 80, `2026-11-1${t}T10:00:00Z`);
    const f = findings(model).find((x) => x.ctx === 'ctl:melody');
    expect(f).toBeDefined();
    expect(f!.text.he).toMatch(/המנגינה שלכם לא בולטת/);
    expect(f!.confidence).toBeGreaterThan(0);
  });
});

describe('B10: legato per hand, the overlap limit by tempo', () => {
  const ht = generate({ family: 'control', kind: 'scale', key: 0, hands: 'RL', octaves: 2, articulation: 'legato' } as DrillSpec);
  it('LH detached under a legato RH is named (no longer hidden in a pooled median)', () => {
    const beat = 60000 / 70;
    const m = analyzeTake(ht, 70, take(ht, 70, { off: (x, on) => (x.hand === 'R' ? on + x.dur * beat + 20 : on + x.dur * beat - 60) }), CAL);
    expect(m.verdict).not.toBe('clean');
    expect(m.why.en).toMatch(/^LH: Not legato/);
  });
  it('slow legato with an 80 ms overlap passes; the limit scales with the IOI', () => {
    expect(legatoOverlapLimit(200)).toBe(60);
    expect(legatoOverlapLimit(800)).toBe(200);
    const r = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 1, articulation: 'legato' } as DrillSpec);
    const slow = analyzeTake(r, 50, take(r, 50, { off: (x, on) => on + x.dur * 1200 + 80 }), CAL);
    expect(slow.verdict).toBe('clean');
  });
});

describe('B12 / B15: hesitations and the faint tick on the staff', () => {
  it('a hesitation is marked at its note', () => {
    const s = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 1 } as DrillSpec);
    const m = analyzeTake(s, 80, take(s, 80, { dt: (_x, i) => (i >= 5 ? 250 : 0) }), CAL);
    expect(m.hesitations).toBeGreaterThan(0);
    expect(m.touch!.marks.some((x) => x.mark === 'gap' && x.i === 5)).toBe(true);
  });
  it('softTick: only between one and two SD limits', () => {
    expect(softTick(10, 50)).toBeNull();
    expect(softTick(-30, 50)).toBe('early');
    expect(softTick(40, 50)).toBe('late');
    expect(softTick(60, 50)).toBeNull();
    expect(softTick(null, 50)).toBeNull();
  });
});

// ───────────────────────────── the piano by microphone ─────────────────────────────

/** Energy frames for a take: each note an attack at `peakDb` decaying at `decay` dB/s, cut to `-60` dB at `cut` ms. */
function env(ons: { on: number; peakDb: number; cut?: number; decay?: number }[], end: number, floorDb = -60): EnvFrame[] {
  const out: EnvFrame[] = [];
  for (let t = -1000; t < end; t += 25) {
    let db = floorDb;
    for (const o of ons) {
      if (t < o.on - 5) continue;
      const age = t - o.on;
      let x = o.peakDb - ((o.decay ?? 8) * age) / 1000;
      if (o.cut !== undefined && t > o.on + o.cut) x -= ((t - o.on - o.cut) / 25) * 12;
      db = Math.max(db, x);
    }
    out.push({ t, rms: 10 ** (db / 20) });
  }
  return out;
}
const micTake = (d: Drill, bpm: number) => take(d, bpm, { vel: () => 64, off: () => null as unknown as number }).map((p) => ({ ...p, off: null }));

describe('the piano by microphone: what a phone can hear', () => {
  const cresc = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 1, dynamics: 'cresc' } as DrillSpec);
  const stac = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 1, articulation: 'staccato' } as DrillSpec);
  const leg = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 1, articulation: 'legato' } as DrillSpec);
  const terr = generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, scale: 'chromatic', dynamics: 'terraced' } as DrillSpec);
  it('micUnmeasurable: one hand\'s shape, p / f steps and legato / staccato are measured; levels, accents, HT are not', () => {
    expect(micUnmeasurable(cresc)).toEqual([]);
    expect(micUnmeasurable(stac)).toEqual([]);
    expect(micUnmeasurable(terr)).toEqual([]);
    expect(micUnmeasurable(generate({ family: 'control', kind: 'scale', key: 0, hands: 'RL', octaves: 2, dynamics: 'cresc' } as DrillSpec))).toContain('dynamics');
    expect(micUnmeasurable(generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, dynamics: 'even-p' } as DrillSpec))).toContain('dynamics');
    expect(micUnmeasurable(generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, articulation: 'portato' } as DrillSpec))).toContain('articulation');
    expect(micUnmeasurable(generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, dynamics: 'accent3', perBeat: 3 } as DrillSpec))).toContain('dynamics');
  });
  const bpm = 60;
  const ons = (d: Drill) => [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b).map((b) => expTimeMs(d, b, bpm));
  it('a crescendo up and diminuendo down by the attacks\' dB: both halves ok, the take clean', () => {
    const o = ons(cresc);
    const t = Math.floor((o.length - 1) / 2);
    const fr = env(o.map((on, i) => ({ on, peakDb: -34 + 16 * (i <= t ? i / t : (o.length - 1 - i) / (o.length - 1 - t)) })), o[o.length - 1] + 800);
    const m = analyzeTake(cresc, bpm, micTake(cresc, bpm), CAL, { mic: true, frames: fr });
    expect(line(m, 'cresc')!.ok).toBe(true);
    expect(line(m, 'dim')!.ok).toBe(true);
    expect(m.verdict).toBe('clean');
  });
  it('a flat line: no crescendo', () => {
    const o = ons(cresc);
    const m = analyzeTake(cresc, bpm, micTake(cresc, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -25 })), o[o.length - 1] + 800) });
    expect(line(m, 'cresc')!.text.en).toBe('No crescendo');
    expect(m.verdict).toBe('not');
  });
  it('no claim: too quiet over the room, or no energy recorded — the take does not pass on the notes', () => {
    const o = ons(cresc);
    const quiet = analyzeTake(cresc, bpm, micTake(cresc, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -55 })), o[o.length - 1] + 800, -60) });
    expect(line(quiet, 'mic')!.text.en).toBe(MIC_NO.quiet);
    expect(quiet.verdict).toBe('not');
    const none = analyzeTake(cresc, bpm, micTake(cresc, bpm), CAL, { mic: true });
    expect(none.verdict).toBe('not');
    expect(none.unmeasured).toBeUndefined();
  });
  it('p and f zones: a step of 10 dB ok, 2 dB too close', () => {
    const tb = 90;
    const o = [...new Set(terr.notes.map((n) => n.beat))].sort((a, b) => a - b);
    const lvl = (b: number, f: number, p: number) => (terr.notes.find((n) => n.beat === b)!.dynMark === 'f' ? f : p);
    const fr = (f: number, p: number) => env(o.map((b) => ({ on: expTimeMs(terr, b, tb), peakDb: lvl(b, f, p) })), expTimeMs(terr, o[o.length - 1], tb) + 600);
    const good = analyzeTake(terr, tb, micTake(terr, tb), CAL, { mic: true, frames: fr(-18, -28) });
    expect(line(good, 'zones')!.text.en).toBe('p and f apart (10 dB)');
    const close = analyzeTake(terr, tb, micTake(terr, tb), CAL, { mic: true, frames: fr(-24, -26) });
    expect(line(close, 'zones')!.ok).toBe(false);
    expect(close.touch!.tags).toContain('mic-step');
  });
  it('staccato: damped notes ok; ringing notes too long', () => {
    const o = ons(stac);
    const end = o[o.length - 1] + 800;
    const short = analyzeTake(stac, bpm, micTake(stac, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -25, cut: 250 })), end) });
    expect(line(short, 'stac')!.ok).toBe(true);
    const ring = analyzeTake(stac, bpm, micTake(stac, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -25 })), end) });
    expect(line(ring, 'stac')!.ok).toBe(false);
  });
  it('legato: ringing to the next note ok; detached notes are gaps', () => {
    const o = ons(leg);
    const end = o[o.length - 1] + 800;
    const joined = analyzeTake(leg, bpm, micTake(leg, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -25 })), end) });
    expect(line(joined, 'legato')!.ok).toBe(true);
    const gaps = analyzeTake(leg, bpm, micTake(leg, bpm), CAL, { mic: true, frames: env(o.map((on) => ({ on, peakDb: -25, cut: 200 })), end) });
    expect(line(gaps, 'legato')!.text.en).toMatch(/Gaps in the legato/);
    expect(gaps.touch!.tags).toContain('mic-legato');
  });
  it('legato too fast to hear the release: no claim', () => {
    const fast = 200;
    const o = [...new Set(leg.notes.map((n) => n.beat))].sort((a, b) => a - b).map((b) => expTimeMs(leg, b, fast));
    const r = analyzeMicTouch(leg, analyzeTake(leg, fast, micTake(leg, fast), CAL, { mic: true, frames: [] }).perNote, env(o.map((on) => ({ on, peakDb: -25 })), o[o.length - 1] + 600));
    expect(r!.lines[0].line.id).toBe('mic');
    expect(r!.lines[0].line.text.en).toBe(MIC_NO.fast);
    expect(MIC_TOUCH.minIoiMs).toBe(250);
  });
  it('micTouchGoal: nothing for hands together, chords, accents or a pedal', () => {
    expect(micTouchGoal(cresc)).toBe('cresc');
    expect(micTouchGoal(generate({ family: 'control', kind: 'pedal', key: 0, hands: 'RL', option: 0 } as DrillSpec))).toBeNull();
    expect(micTouchGoal(generate({ family: 'control', kind: 'voicing', key: 0, hands: 'R' } as DrillSpec))).toBeNull();
  });
});
const MIC_NO = { quiet: 'Too quiet to measure the loudness', fast: 'Too fast to hear the release' };

describe('the level test: a touch section by microphone, inferred places flagged', () => {
  it('by microphone the touch section has only steps a phone can measure, each in its own item', () => {
    const cat = families('piano');
    const touch = strandsFor('piano', 'both', { mic: true }).find((s) => s.id === 'touch')!;
    expect(touch.rungs.length).toBeGreaterThanOrEqual(3);
    for (const r of touch.rungs) {
      const lv = cat.flatMap((f) => f.levels).find((l) => l.id === r.level)!;
      const d = generate({ ...lv.specs[r.spec ?? 0], key: r.key });
      expect(micTouchGoal(d), r.level).not.toBeNull();
      expect(micUnmeasurable(d), r.level).toEqual([]);
    }
    // MIDI keeps its own section
    expect(strandsFor('piano', 'both').find((s) => s.id === 'touch')!.rungs.map((r) => r.level)).toContain('control-6');
  });
  it('control comes from the touch section when it ran: a hands step no longer lifts it', () => {
    const f = finishPlaces([{ strand: 'hands', places: { scales: 8, control: 7 } }, { strand: 'touch', places: { control: 4 } }]);
    expect(f.places.control).toBe(4);
    expect(f.places.scales).toBe(8);
    expect(f.inferred).toEqual([]);
  });
  it('a touch section that proved nothing leaves control at the start', () => {
    expect(finishPlaces([{ strand: 'hands', places: { control: 7 } }, { strand: 'touch', places: {} }]).places.control).toBeUndefined();
  });
  it('without a touch section, control is inferred from the hands steps — and flagged', () => {
    const f = finishPlaces([{ strand: 'hands', places: { control: 7 } }]);
    expect(f.places.control).toBe(7);
    expect(f.inferred).toContain('control');
  });
  it('by microphone: the pedal is always inferred; control above what the mic proves is flagged', () => {
    const f = finishPlaces([{ strand: 'hands', places: { 'k-pedal': 2, control: 7 } }, { strand: 'touch', places: { control: 5 } }], true);
    expect(f.places.control).toBe(5);
    expect(f.inferred).toEqual(expect.arrayContaining(['control', 'k-pedal']));
    const low = finishPlaces([{ strand: 'touch', places: { control: MIC_TOUCH_PROVES } }], true);
    expect(low.inferred).toEqual([]);
  });
});

describe('profile: fingers only as hypotheses; leaps landing late', () => {
  it('a late suggested finger is a hypothesis, and silent with the player\'s own fingering', () => {
    let model: PlayerModel = emptyModel();
    for (let t = 0; t < 30; t++) {
      const d = generate({ family: 'scales', kind: 'scale', key: [0, 7, 2][t % 3], hands: 'R', octaves: 2 } as DrillSpec);
      model = addTake(model, d, analyzeTake(d, 70, take(d, 70, { dt: (x, i) => (x.finger === 4 ? 24 : 0) + ((i * 7) % 5) - 2 }), CAL), 70, '2026-11-15T10:00:00Z');
    }
    const late = findings(model).filter((f) => f.kind === 'late-finger');
    expect(late.length).toBeGreaterThan(0);
    expect(late.every((f) => f.hypothesis)).toBe(true);
    expect(late[0].text.en).toMatch(/^Possibly finger 4/);
    expect(findings({ ...model, ownFingering: true }).some((f) => f.kind === 'late-finger')).toBe(false);
  });
  it('leaps landing late, over many takes: a pattern', () => {
    let model: PlayerModel = emptyModel();
    const d = leapLine();
    const rh = d.notes.map((x, i) => ({ x, i })).filter((y) => y.x.hand === 'R');
    const big = new Set(rh.filter((y, k) => k > 0 && Math.abs(y.x.pitch - rh[k - 1].x.pitch) > 7).map((y) => y.i));
    for (let t = 0; t < 30; t++) model = addTake(model, d, analyzeTake(d, 72, take(d, 72, { dt: (_x, i) => (big.has(i) ? 35 : 0) + ((i * 7) % 5) }), CAL), 72, '2026-11-15T10:00:00Z');
    const f = findings(model).find((x) => x.kind === 'late-leap');
    expect(f).toBeDefined();
    expect(f!.text.he).toMatch(/נוחתים באיחור/);
  });
});

describe('G15: voice brightness, relative within the note', () => {
  const frames = (c0: number, c1: number, n = 90): SungFrame[] => Array.from({ length: n }, (_, i) => ({ t: i * 0.02, hz: 220, confidence: 0.95, rms: 0.1, centroid: c0 + ((c1 - c0) * i) / (n - 1) }) as SungFrame);
  it('brighter at the end: + %, darker: − %', () => {
    expect(brightnessChange(frames(1000, 1300))).toBeGreaterThan(15);
    expect(brightnessChange(frames(1300, 1000))).toBeLessThan(-15);
  });
  it('no centroid frames (or too few): no claim', () => {
    expect(brightnessChange(frames(1000, 1300, 20))).toBeNull();
    expect(brightnessChange(frames(1000, 1300).map((f) => ({ ...f, centroid: undefined })))).toBeNull();
  });
  it('shown but never scored: the same score with and without it', () => {
    const item = { id: 'v-hold', kind: 'hold', seconds: 1.5 } as unknown as Parameters<typeof gradeTake>[0];
    const range = { low: 48, high: 72 } as unknown as Parameters<typeof gradeTake>[2];
    const a = gradeTake(item, frames(1000, 1300), range);
    const b = gradeTake(item, frames(1000, 1300).map((f) => ({ ...f, centroid: undefined })), range);
    expect(a.score).toBeCloseTo(b.score, 6);
    const br = a.metrics.find((m) => m.key === 'brightness');
    if (br) expect(br.weight).toBe(0);
  });
});
