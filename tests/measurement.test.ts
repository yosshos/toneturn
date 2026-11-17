// MEASUREMENT-AUDIT (2026-11-17): every new touch measure on synthetic MIDI takes.
import { describe, expect, it } from 'vitest';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { generate } from '../src/engine/drills/generate';
import type { Drill, DrillSpec, ExpNote, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { swingBand, tempoDrift } from '../src/engine/drills/touch';
import { calFromPresses, checkLevels, refineCal } from '../src/engine/drills/velCal';
import { splitLatency } from '../src/engine/latency';
import { addTake, emptyModel, findings, fingerHypotheses, type PlayerModel } from '../src/engine/analysis/model';
import { swellOf, synthDynamic } from '../src/engine/vocal';

const CAL = { latencyMs: 0, velMin: 20, velMax: 110 };
const g = (o: Partial<DrillSpec>): Drill => generate({ family: 'control', kind: 'scale', key: 0, hands: 'R', octaves: 2, ...o } as DrillSpec);

/** A take of every written key, on time (`dt` ms per note), with velocities and releases from the given functions. */
function take(d: Drill, bpm: number, o: { vel?: (n: ExpNote, i: number) => number; dt?: (n: ExpNote, i: number) => number; off?: (n: ExpNote, on: number) => number; t?: (n: ExpNote) => number } = {}): PlayedNote[] {
  const beatMs = 60000 / bpm;
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  d.notes.forEach((n, i) => {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) return;
    seen.add(k);
    const on = (o.t ? o.t(n) : expTimeMs(d, n.beat, bpm)) + (o.dt ? o.dt(n, i) : 0);
    out.push({ pitch: n.pitch, on, off: o.off ? o.off(n, on) : on + n.dur * beatMs + 15, vel: Math.round(o.vel ? o.vel(n, i) : 70) });
  });
  return out.sort((a, b) => a.on - b.on);
}
const line = (m: TakeMetrics, id: string) => m.touch?.lines.find((l) => l.id === id);

describe('G2: crescendo and diminuendo as separate lines', () => {
  const d = g({ dynamics: 'cresc' });
  const turn = d.notes.reduce((b, n) => (n.pitch > b.pitch ? n : b)).beat;
  const pos = (n: ExpNote) => (n.beat <= turn ? n.beat / turn : (2 * turn - n.beat) / turn);
  it('a perfect crescendo up and diminuendo down is clean, both lines ok', () => {
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => 30 + 70 * pos(n) }), CAL);
    expect(m.verdict).toBe('clean');
    expect(line(m, 'cresc')?.ok).toBe(true);
    expect(line(m, 'dim')?.ok).toBe(true);
    expect(m.touch!.shape!.up!.r2).toBeGreaterThan(0.95);
    expect(m.touch!.shape!.down!.slope).toBeLessThan(0);
  });
  it('a stepped crescendo (terraces of +25) is caught as a jump and marked on the staff', () => {
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => 30 + 25 * Math.min(3, Math.floor(pos(n) * 3.999)) }), CAL);
    expect(m.verdict).not.toBe('clean');
    expect(line(m, 'cresc')!.ok).toBe(false);
    expect(line(m, 'cresc')!.text.en).toMatch(/jumped/);
    expect(line(m, 'cresc')!.why).toBeDefined();
    expect(m.touch!.marks.some((x) => x.mark === 'jump')).toBe(true);
  });
  it('a crescendo peaking early is named, with the peak marked', () => {
    // full loudness reached halfway up, held flat to the top
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => 30 + 70 * Math.min(1, pos(n) * 2) }), CAL);
    expect(m.verdict).not.toBe('clean');
    expect(line(m, 'cresc')!.text.en).toMatch(/peaked \d+ notes early/);
    expect(m.touch!.tags).toContain('cresc-early');
  });
  it('a diminuendo that falls all at once at the end is its own line', () => {
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => (n.beat <= turn ? 30 + 70 * pos(n) : pos(n) > 0.25 ? 100 : 30) }), CAL);
    expect(line(m, 'cresc')!.ok).toBe(true);
    expect(line(m, 'dim')!.ok).toBe(false);
    expect(line(m, 'dim')!.text.en).toMatch(/all at once|dropped/);
  });
  it('hands together: the LH flat under a RH crescendo is named', () => {
    const ht = g({ hands: 'RL', dynamics: 'cresc' });
    const m = analyzeTake(ht, 70, take(ht, 70, { vel: (n) => (n.hand === 'R' ? 30 + 70 * pos(n) : 60) }), CAL);
    expect(m.verdict).not.toBe('clean');
    expect(m.touch!.lines.some((l) => !l.ok && /LH/.test(l.text.en))).toBe(true);
    expect(m.touch!.tags).toContain('shape-L');
  });
  it('dim-cresc: soft at the top, loud at the ends', () => {
    const dc = g({ dynamics: 'dim-cresc' });
    const good = analyzeTake(dc, 70, take(dc, 70, { vel: (n) => 100 - 70 * pos(n) }), CAL);
    expect(good.verdict).toBe('clean');
    const wrongWay = analyzeTake(dc, 70, take(dc, 70, { vel: (n) => 30 + 70 * pos(n) }), CAL);
    expect(wrongWay.verdict).toBe('not');
  });
  it('contrary motion: both hands out louder, in softer, checked together', () => {
    const cm = g({ hands: 'RL', motion: 'contrary', dynamics: 'cresc' });
    const t2 = cm.notes.reduce((b, n) => (n.pitch > b.pitch ? n : b)).beat;
    const p2 = (n: ExpNote) => (n.beat <= t2 ? n.beat / t2 : (2 * t2 - n.beat) / t2);
    const m = analyzeTake(cm, 70, take(cm, 70, { vel: (n) => 30 + 70 * p2(n) }), CAL);
    expect(m.verdict).toBe('clean');
    expect(line(m, 'hands-dyn')!.ok).toBe(true);
    const apart = analyzeTake(cm, 70, take(cm, 70, { vel: (n) => (n.hand === 'R' ? 30 + 70 * p2(n) : 100 - 70 * p2(n)) }), CAL);
    expect(line(apart, 'hands-dyn')!.ok).toBe(false);
  });
  it('terraced chromatic: p then f zone by zone', () => {
    const tc = g({ scale: 'chromatic', dynamics: 'terraced' });
    expect(tc.notes.some((n) => n.dynMark === 'p') && tc.notes.some((n) => n.dynMark === 'f')).toBe(true);
    const ok = analyzeTake(tc, 70, take(tc, 70, { vel: (n) => (n.dynMark === 'f' ? 85 : 38) }), CAL);
    expect(ok.verdict).toBe('clean');
    const flat = analyzeTake(tc, 70, take(tc, 70, { vel: () => 65 }), CAL);
    expect(flat.verdict).not.toBe('clean');
    expect(line(flat, 'zones')!.ok).toBe(false);
  });
});

describe('E4: dynamics held across the tempo', () => {
  it('getting louder through a p take fails and says so', () => {
    const d = g({ dynamics: 'even-p', perBeat: 4 });
    const m = analyzeTake(d, 90, take(d, 90, { vel: (_n, i) => 35 + i * 1.3 }), CAL);
    expect(m.verdict).not.toBe('clean');
    expect(line(m, 'creep')?.ok).toBe(false);
    expect(m.why.en).toMatch(/louder|Too loud/);
  });
});

describe('G3: notes and places, never a finger per take', () => {
  it('a note that is soft every time is named by its note (not a finger)', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 10, hands: 'R', octaves: 2 } as DrillSpec); // B♭ major
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => (n.pitch % 12 === 5 ? 54 : 72) }), CAL);
    const l = line(m, 'finger')!;
    expect(l.ok).toBe(false);
    expect(l.text.en).toMatch(/^F soft every time/);
    expect(l.text.he).toContain('ה־F חלש');
    expect(l.text.en).not.toMatch(/finger/i);
    expect(m.touch!.marks.filter((x) => x.mark === 'soft').length).toBeGreaterThanOrEqual(3);
    // informational on a scale without a dynamics goal: the take itself stays clean
    expect(m.verdict).toBe('clean');
  });
  it('the note right after the crossing late is reported by place', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    const crossings = new Set<number>();
    d.notes.forEach((n, i) => i > 0 && n.finger === 1 && (d.notes[i - 1].finger === 3 || d.notes[i - 1].finger === 4) && n.pitch > d.notes[i - 1].pitch && crossings.add(i));
    const m = analyzeTake(d, 70, take(d, 70, { dt: (_n, i) => (crossings.has(i) ? 28 : 0) }), CAL);
    expect(m.touch!.lines.some((l) => /after the crossing/.test(l.text.en))).toBe(true);
  });
});

/** A model fed with synthetic notes: weakness by note pitch-class or by suggested finger, across keys. */
function feedModel(rule: 'note' | 'finger', takes = 40): PlayerModel {
  let model = emptyModel();
  const keys = [0, 7, 2, 9, 5, 10];
  for (let t = 0; t < takes; t++) {
    const d = generate({ family: 'scales', kind: 'scale', key: keys[t % keys.length], hands: 'R', octaves: 2 } as DrillSpec);
    const weak = (n: ExpNote) => (rule === 'note' ? n.pitch % 12 === 4 : n.finger === 4);
    const m = analyzeTake(d, 70, take(d, 70, { vel: (n, i) => (weak(n) ? 56 : 72) + ((i * 7) % 5) - 2 }), CAL);
    model = addTake(model, d, m, 70, `2026-11-${10 + (t % 7)}T10:00:00Z`);
  }
  return model;
}
describe('G3: the finger as a long-term hypothesis only', () => {
  it('a weakness that follows the suggested finger across notes and keys is named as a likely cause', () => {
    const hs = fingerHypotheses(feedModel('finger'));
    expect(hs.map((h) => h.ctx)).toContain('f:R4');
    const h = hs.find((x) => x.ctx === 'f:R4')!;
    expect(h.hypothesis).toBe(true);
    expect(h.text.he).toContain('ייתכן שזו אצבע 4');
  });
  it('a weakness that follows the note is attributed to the note, never to a finger', () => {
    const model = feedModel('note');
    expect(fingerHypotheses(model)).toEqual([]);
    expect(findings(model).some((f) => f.kind === 'soft-note' && f.ctx === 'p:R4')).toBe(true);
  });
  it('too few samples: no finger claim', () => {
    expect(fingerHypotheses(feedModel('finger', 3))).toEqual([]);
  });
  it('the player uses their own fingering: no finger claim', () => {
    expect(fingerHypotheses({ ...feedModel('finger'), ownFingering: true })).toEqual([]);
  });
});

describe('G4: lengths and releases', () => {
  it('a short release before a rest passes; ringing through the rest is caught and marked', () => {
    const d = generate({ family: 'control', kind: 'reading', key: 0, hands: 'R', option: 1 } as DrillSpec);
    expect(d.goal.lengths).toBe(true);
    // build a drill with a rest: take the reading drill's notes and drop one to leave a gap
    const notes = d.notes.filter((_, i) => i !== 3);
    const dr: Drill = { ...d, notes };
    const bpm = 80;
    const beatMs = 60000 / bpm;
    const clean = analyzeTake(dr, bpm, take(dr, bpm, { off: (n, on) => on + n.dur * beatMs * 0.92 }), CAL);
    expect(line(clean, 'release')?.ok).toBe(true);
    const ring = analyzeTake(dr, bpm, take(dr, bpm, { off: (n, on) => on + n.dur * beatMs + 0.8 * beatMs }), CAL);
    expect(line(ring, 'release')?.ok).toBe(false);
    expect(ring.touch!.marks.some((x) => x.mark === 'long')).toBe(true);
  });
});

describe('G5: tempo drift and swing', () => {
  it('a take that rushes from ♩100 to ♩108 is named', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    const bpm = 100;
    const beatMs = 60000 / bpm;
    // tempo rises linearly 100 → 108: position = integral of the beat length
    const t = (n: ExpNote) => {
      const T = d.beats;
      const r = 0.08 / T;
      return (beatMs * Math.log(1 + r * n.beat)) / r;
    };
    const m = analyzeTake(d, bpm, take(d, bpm, { t }), CAL);
    expect(m.touch!.drift!.to).toBeGreaterThan(m.touch!.drift!.from + 4);
    expect(line(m, 'drift')!.text.en).toMatch(/Rushed/);
    const steady = tempoDrift(d.notes.map((n) => ({ t: n.beat * beatMs, on: n.beat * beatMs })), bpm)!;
    expect(Math.abs(steady.to - steady.from)).toBeLessThan(0.5);
  });
  it('a steady swing of 0.58 at a fast tempo is accepted, and graded against the phrase ratio when given', () => {
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2, swing: true } as DrillSpec);
    const bpm = 220;
    const beatMs = 60000 / bpm;
    const t = (n: ExpNote) => (Math.floor(n.beat) + (n.beat % 1 > 0.25 ? 0.58 : 0)) * beatMs;
    const m = analyzeTake(d, bpm, take(d, bpm, { t }), CAL);
    expect(m.touch!.swing!.ratio).toBeCloseTo(0.58, 2);
    expect(line(m, 'swing')!.ok).toBe(true);
    expect(Math.abs(m.timingMean!)).toBeLessThan(5);
    expect(m.verdict).toBe('clean');
    // the same take against a phrase recorded at 0.72: too straight
    const m2 = analyzeTake({ ...d, swingRatio: 0.72 }, bpm, take(d, bpm, { t }), CAL);
    expect(line(m2, 'swing')!.ok).toBe(false);
    expect(swingBand(120).target).toBeCloseTo(2 / 3, 3);
  });
});

describe('G6: pedal changes kept per change', () => {
  it('legato pedal pressed before the new note is a miss at that change, marked', () => {
    const d = generate({ family: 'control', kind: 'pedal', key: 0, hands: 'RL', option: 1 } as DrillSpec);
    const bpm = 60;
    const beatMs = 60000 / bpm;
    const changes = d.goal.pedal!.changes;
    const good = changes.flatMap((b, i) => (i === 0 ? [{ at: b * beatMs + 100, down: true }] : [{ at: b * beatMs + 10, down: false }, { at: b * beatMs + 150, down: true }]));
    const m = analyzeTake(d, bpm, take(d, bpm), CAL, { pedal: good });
    expect(m.pedal?.pass).toBe(true);
    // the change at the 2nd chord: up and down again BEFORE the new chord sounds
    const bad = good.map((e, k) => (k === 1 ? { ...e, at: changes[1] * beatMs - 150 } : k === 2 ? { ...e, at: changes[1] * beatMs - 60 } : e));
    const mb = analyzeTake(d, bpm, take(d, bpm), CAL, { pedal: bad });
    expect(mb.pedal!.perChange!.find((c) => c.beat === changes[1])!.ok).toBe(false);
    expect(mb.touch!.marks.some((x) => x.mark === 'blur')).toBe(true);
  });
});

describe('B4 / G7: chords', () => {
  it('one rolled chord among clean ones is marked but does not fail the take', () => {
    const d = generate({ family: 'control', kind: 'voicing', key: 0, hands: 'R' } as DrillSpec);
    const firstChord = d.notes[0].chordId;
    const m = analyzeTake(d, 60, take(d, 60, { dt: (n) => (n.chordId === firstChord ? (n.pitch - d.notes[0].pitch) * 6 : 0), vel: (n) => (n.accent ? 95 : 65) }), CAL);
    expect(m.touch!.chords!.rolled).toBe(1);
    expect(m.touch!.marks.some((x) => x.mark === 'roll')).toBe(true);
    expect(m.verdict).toBe('clean');
    expect(line(m, 'voicing')!.ok).toBe(true);
  });
  it('voicing is counted per chord: 3 flat chords of 8 fail', () => {
    const d = generate({ family: 'control', kind: 'voicing', key: 0, hands: 'R' } as DrillSpec);
    const ids = [...new Set(d.notes.map((n) => n.chordId))];
    const flat = new Set(ids.slice(0, 3));
    const m = analyzeTake(d, 60, take(d, 60, { vel: (n) => (n.accent && !flat.has(n.chordId) ? 100 : 65) }), CAL);
    expect(line(m, 'voicing')!.text.en).toMatch(/5 of 8/);
    expect(m.verdict).not.toBe('clean');
  });
});

describe('B1 / B3 / G8', () => {
  it('a voicing take never feeds per-finger velocity; a guitar take never feeds the piano fingers', () => {
    const d = generate({ family: 'control', kind: 'voicing', key: 0, hands: 'R' } as DrillSpec);
    const m = analyzeTake(d, 60, take(d, 60, { vel: (n) => (n.accent ? 110 : 60) }), CAL);
    const model = addTake(emptyModel(), d, m, 60, '2026-11-17T10:00:00Z');
    expect(Object.values(model.stats).some((s) => s.vn > 0)).toBe(false);
  });
  it('velocity spread feeds the item only when graded; the control score is tracked', () => {
    const scale = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    const m = analyzeTake(scale, 70, take(scale, 70, { vel: (_n, i) => 40 + (i % 2) * 50 }), CAL);
    expect(m.vsdGraded).toBeUndefined();
    const st = applyTake(newItem(scale), m, 70, '2026-11-17T10:00:00Z').state;
    expect(st.ewma.vsd).toBe(0);
    const p = g({ dynamics: 'even-p' });
    const mp = analyzeTake(p, 70, take(p, 70, { vel: () => 45 }), CAL);
    expect(mp.vsdGraded).toBe(true);
    const sp = applyTake(newItem(p), mp, 70, '2026-11-17T10:00:00Z').state;
    expect(sp.ewma.ctl).toBeGreaterThan(0.9);
  });
  it('a crescendo missed the same way take after take becomes a profile pattern', () => {
    const d = g({ dynamics: 'cresc' });
    const turn = d.notes.reduce((b, n) => (n.pitch > b.pitch ? n : b)).beat;
    let model = emptyModel();
    for (let k = 0; k < 8; k++) {
      const m = analyzeTake(d, 70, take(d, 70, { vel: (n) => (n.beat <= turn ? 30 + 70 * Math.min(1, (n.beat / turn) * 2) : 100 - 70 * ((n.beat - turn) / turn)) }), CAL);
      model = addTake(model, d, m, 70, `2026-11-1${k}T10:00:00Z`);
    }
    const f = findings(model).find((x) => x.kind === 'control');
    expect(f?.text.en).toMatch(/peak early/);
  });
});

describe('B6 / B7: calibration', () => {
  it('the latency split: on MIDI with a known output time the habit is reported, not removed', () => {
    expect(splitLatency(-18, 'midi', true)).toEqual({ deviceMs: 3, biasMs: -21 });
    expect(splitLatency(140, 'midi', true)).toEqual({ deviceMs: 140, biasMs: null });
    expect(splitLatency(-18, 'midi', false)).toEqual({ deviceMs: -18, biasMs: null });
    expect(splitLatency(70, 'mic', true)).toEqual({ deviceMs: 70, biasMs: null });
  });
  it('a habitual lead shows as a profile finding once it is no longer calibrated away', () => {
    let model = emptyModel();
    const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', octaves: 2 } as DrillSpec);
    for (let k = 0; k < 6; k++) model = addTake(model, d, analyzeTake(d, 70, take(d, 70, { dt: (_n, i) => -20 + ((i * 7) % 5) - 2 }), CAL), 70, '2026-11-17T10:00:00Z');
    expect(findings(model).some((f) => f.ctx === 'sub:all' && f.kind === 'rush')).toBe(true);
  });
  it('velocity range from several presses: one stray press cannot move it', () => {
    expect(calFromPresses([22, 25, 24, 90, 23], [118, 120, 117, 121, 119])).toEqual({ velMin: 24, velMax: 119 });
    expect(calFromPresses([22], [118, 120, 117])).toBeNull();
    const cal = { latencyMs: 0, velMin: 20, velMax: 120 };
    expect(checkLevels(cal, [45, 47, 46], [75, 78, 76], [100, 102, 101]).apart).toBe(true);
    expect(checkLevels(cal, [60, 62, 61], [64, 63, 66], [100, 102, 101]).apart).toBe(false);
  });
  it('real takes widen the range a quarter step, never shrink it', () => {
    const cal = { latencyMs: 0, velMin: 40, velMax: 90 };
    const r = refineCal(cal, [...Array(20)].map((_, i) => 20 + i * 5))!;
    expect(r.velMin).toBeLessThan(40);
    expect(r.velMax).toBeGreaterThan(90);
    expect(refineCal(cal, [...Array(20)].map(() => 64))).toBeNull();
  });
});

describe('G1: written dynamics in pieces', () => {
  const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
<direction><direction-type><dynamics><p/></dynamics></direction-type></direction>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="start" number="1"/></notations></note>
<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="stop" number="1"/></notations></note></measure>
<measure number="2"><direction><direction-type><dynamics><f/></dynamics></direction-type></direction>
<direction><direction-type><wedge type="diminuendo"/></direction-type></direction>
<note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><articulations><staccato/></articulations></notations></note>
<direction><direction-type><wedge type="stop"/></direction-type></direction></measure></part></score-partwise>`;
  it('dynamics, hairpins, slurs and staccato reach the chunk; a p bar played loud is named by its bar, softly', async () => {
    const { parseMusicXml } = await import('../src/engine/piece/score');
    const { chunkDrill } = await import('../src/engine/piece/toDrill');
    const p = parseMusicXml(xml);
    const d = chunkDrill(p, 'x', 0, 1, 80);
    expect(d.goal.marks).toBe(true);
    expect(d.notes.filter((n) => n.dynMark === 'p').length).toBe(4);
    expect(d.notes.filter((n) => n.hair === 'dim').length).toBe(4);
    expect(d.notes.filter((n) => n.slur !== undefined).length).toBe(4);
    expect(d.notes.some((n) => n.stac)).toBe(true);
    const m = analyzeTake(d, 80, take(d, 80, { vel: (n) => (n.dynMark === 'p' ? 100 : 104 - n.beat) }), CAL);
    const z = line(m, 'zones')!;
    expect(z.ok).toBe(false);
    expect(z.text.en).toMatch(/^Bar 1: p played/);
    expect(line(m, 'hair')!.ok).toBe(false);
    expect(m.verdict).not.toBe('not');
  });
});

describe('B8: messa di voce needs the swell', () => {
  it('a plain crescendo is not a swell; a swell is', () => {
    const cresc = swellOf(synthDynamic('cresc', 60))!;
    const swell = swellOf(synthDynamic('swell', 60))!;
    expect(Math.min(cresc.rise, cresc.fall)).toBeLessThan(2);
    expect(Math.min(swell.rise, swell.fall)).toBeGreaterThan(4);
    expect(swell.peakAt).toBeGreaterThan(0.2);
    expect(swell.peakAt).toBeLessThan(0.8);
  });
});
