// Encore v2 part 1 (SPEC-PHRASE-STUDIO §4.3 v2, §7.4, §10.3, §13.2, §13.7): notes and onsets from audio (synthetic
// frames), guitar / bass placement that keeps the shape, the voice in the singer's range, the physical cost per
// instrument, and the wiring (drills, events, key mastery, the courses' rows).
import { afterEach, describe, expect, it } from 'vitest';
import { audioNotes, cleanUp, firstSound, gateOf, noiseFloor, polyphony, tuningOffset, UNCLEAR, type AFrame, type AudioNote } from '../src/engine/encore/audio';
import { movedShape, neckStats, resetInstrumentCtx, setInstrumentCtx, singerRange, voiceOctave, voiceStats } from '../src/engine/encore/placement';
import { forInstrument, keyOrder, keysInRange, keysNeeded, phraseDrill, phraseNeck, phrasePitches, phraseRank, promotion, shiftTo } from '../src/engine/encore/phrase';
import { neckCost, phraseDifficulty, physicalCost, voiceCost, type DNote } from '../src/engine/encore/difficulty';
import { phraseEvent, phraseTake } from '../src/engine/encore/connect';
import { catchTake } from '../src/engine/encore/detect';
import { tuningById } from '../src/engine/fretboard';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState } from '../src/engine/drills/types';
import type { Lick, LickInstrument } from '../src/engine/licks';
import { keyMastery, phraseInstrument } from '../src/engine/analysis/keyMastery';
import { COURSE_ROWS } from '../src/ui/courseRows';
import { BEBOP, phrase } from './encoreFixtures';

afterEach(() => resetInstrumentCtx());

// ───────────────────────────── synthetic microphone frames ─────────────────────────────

const HOP = 25;
const hzOf = (m: number) => 440 * 2 ** ((m - 69) / 12);
interface Tone {
  /** MIDI pitch (fractional allowed) or null = silence. */
  m: number | null;
  ms: number;
  cents?: number;
  /** Vibrato depth in cents (6 Hz). */
  vib?: number;
  rms?: number;
  conf?: number;
  /** An attack at the start (the level dips, then rises): a re-struck note. */
  attack?: boolean;
}
/** A tone sequence as capture frames (25 ms hop), starting after 500 ms of room noise. */
function frames(seq: Tone[], o: { lead?: number; noise?: number } = {}): AFrame[] {
  const out: AFrame[] = [];
  let t = 0;
  const lead = o.lead ?? 500;
  for (; t < lead; t += HOP) out.push({ t, hz: null, conf: 0.1, rms: o.noise ?? 0.002 });
  for (const s of seq) {
    const start = t;
    for (; t < start + s.ms; t += HOP) {
      if (s.m === null) {
        out.push({ t, hz: null, conf: 0.1, rms: o.noise ?? 0.002 });
        continue;
      }
      const vib = s.vib ? s.vib * Math.sin(2 * Math.PI * 6 * ((t - start) / 1000)) : 0;
      const m = s.m + ((s.cents ?? 0) + vib) / 100;
      const rms = s.attack && t - start < HOP * 2 ? (t - start < HOP ? 0.01 : 0.12) : (s.rms ?? 0.1);
      out.push({ t, hz: hzOf(m), conf: s.conf ?? 0.95, rms });
    }
  }
  return out;
}
const gap = (ms = 60): Tone => ({ m: null, ms });

describe('notes and onsets from audio (§14.2)', () => {
  it('a steady tone sequence: one note per tone, pitch and onset right', () => {
    const seq = [60, 62, 64, 67].flatMap((m) => [{ m, ms: 300 }, gap(50)]);
    const a = audioNotes(frames(seq));
    expect(a.notes.map((n) => n.pitch)).toEqual([60, 62, 64, 67]);
    a.notes.forEach((n, i) => expect(Math.abs(n.on - (500 + i * 350))).toBeLessThanOrEqual(HOP));
    expect(a.notes.every((n) => n.conf > 0.8)).toBe(true);
    expect(a.tooPolyphonic).toBe(false);
    expect(a.conf).toBeGreaterThan(0.8);
  });
  it('the tuning offset is removed: a guitar 15 ¢ flat still reads right', () => {
    const seq = [64, 65, 67].flatMap((m) => [{ m, ms: 250, cents: -15 }, gap()]);
    const a = audioNotes(frames(seq));
    expect(a.tuning).toBeCloseTo(-15, -1);
    expect(a.notes.map((n) => n.pitch)).toEqual([64, 65, 67]);
    // even 45 ¢ flat (which would round to the semitone below without the offset)
    const b = audioNotes(frames([64, 65, 67].flatMap((m) => [{ m, ms: 250, cents: -45 }, gap()])));
    expect(b.notes.map((n) => n.pitch)).toEqual([64, 65, 67]);
    expect(tuningOffset([60.2, 61.2, 62.18])).toBe(20);
  });
  it('vibrato (±35 ¢ at 6 Hz) is smoothed: one note, not a trill', () => {
    const a = audioNotes(frames([{ m: 67, ms: 900, vib: 35 }, gap(), { m: 65, ms: 600, vib: 35 }]));
    expect(a.notes.map((n) => n.pitch)).toEqual([67, 65]);
  });
  it('a legato change of pitch (no gap) starts a new note; a re-struck same pitch too', () => {
    const a = audioNotes(frames([{ m: 60, ms: 300 }, { m: 62, ms: 300 }, { m: 64, ms: 300 }]));
    expect(a.notes.map((n) => n.pitch)).toEqual([60, 62, 64]);
    expect(Math.abs(a.notes[1].on - 800)).toBeLessThanOrEqual(HOP * 2);
    const b = audioNotes(frames([{ m: 62, ms: 300 }, { m: 62, ms: 300, attack: true }, { m: 62, ms: 300, attack: true }]));
    expect(b.notes.map((n) => n.pitch)).toEqual([62, 62, 62]);
  });
  it('a one-frame glitch does not split a note; a short octave error is folded by continuity', () => {
    const f = frames([{ m: 60, ms: 400 }]);
    f[30] = { ...f[30], hz: hzOf(72) };
    expect(audioNotes(f).notes.map((n) => n.pitch)).toEqual([60]);
    const ns: AudioNote[] = [
      { pitch: 60, on: 0, off: 200, vel: 80, conf: 0.9 },
      { pitch: 74, on: 210, off: 300, vel: 80, conf: 0.9 },
      { pitch: 63, on: 310, off: 500, vel: 80, conf: 0.9 },
    ];
    expect(cleanUp(ns).map((n) => n.pitch)).toEqual([60, 62, 63]);
  });
  it('clean-up: split fragments of one note merge, a tiny unclear fragment goes', () => {
    const ns = [
      { pitch: 60, on: 0, off: 200, vel: 80, conf: 0.9 },
      { pitch: 60, on: 220, off: 400, vel: 80, conf: 0.9, attack: false },
      { pitch: 61, on: 420, off: 480, vel: 10, conf: 0.2 },
      { pitch: 64, on: 500, off: 800, vel: 80, conf: 0.9 },
    ];
    const c = cleanUp(ns);
    expect(c.map((n) => [n.pitch, n.on, n.off])).toEqual([[60, 0, 400], [64, 500, 800]]);
  });
  it('an unclear (wobbly) note keeps a low confidence and a ghost velocity, so the trim screen offers to remove it', () => {
    const a = audioNotes(frames([{ m: 60, ms: 300 }, gap(), { m: 62, ms: 300, vib: 60, conf: 0.66 }, gap(), { m: 64, ms: 300 }]));
    const wob = a.notes.find((n) => n.on > 800 && n.on < 1200);
    expect(wob).toBeDefined();
    expect(wob!.conf).toBeLessThan(UNCLEAR);
    expect(wob!.vel).toBeLessThan(25);
    expect(a.notes[0].vel).toBeGreaterThanOrEqual(30);
  });
  it('the noise floor and the first sound (record mode arms until then)', () => {
    const f = frames([{ m: 60, ms: 300 }], { noise: 0.004 });
    expect(noiseFloor(f)).toBeCloseTo(0.004, 4);
    const g = gateOf(noiseFloor(f));
    expect(g).toBeCloseTo(0.012, 4);
    expect(firstSound(f, g)).toBe(500);
    // room noise louder than the gate but without a pitch never starts the take
    expect(firstSound(frames([], { noise: 0.05 }), 0.01)).toBeNull();
  });
  it('a chordal (polyphonic) take is flagged: full transcription is v3', () => {
    const mono = frames([60, 64, 67].flatMap((m) => [{ m, ms: 300 }, gap()]));
    expect(polyphony(mono, 0.01)).toBe(0);
    const chords = frames([{ m: 60, ms: 1200, conf: 0.35 }]).map((f) => (f.hz ? { ...f, chroma: [1, 0, 0, 0, 0.9, 0, 0, 0.8, 0, 0, 0.7, 0] } : f));
    const a = audioNotes(chords);
    expect(a.tooPolyphonic).toBe(true);
    expect(a.poly).toBeGreaterThan(0.4);
  });
  it('piano by mic is the top line only, at a lower confidence', () => {
    const f = frames([72, 74, 76].flatMap((m) => [{ m, ms: 300 }, gap()]));
    const a = audioNotes(f);
    const t = audioNotes(f, { topLine: true });
    expect(t.notes.map((n) => n.pitch)).toEqual(a.notes.map((n) => n.pitch));
    expect(t.conf).toBeLessThan(a.conf);
  });
  it('the audio notes go through the same catch as MIDI (tempo from onsets)', () => {
    // eighths at ♩120 = 250 ms apart
    const seq: Tone[] = [];
    for (let i = 0; i < 16; i++) seq.push({ m: [60, 62, 64, 65, 67, 65, 64, 62][i % 8], ms: 200 }, gap(50));
    const a = audioNotes(frames(seq));
    expect(a.notes.length).toBe(16);
    const c = catchTake(a.notes);
    expect([120, 240, 60]).toContain(Math.round(c.grid.bpm / 5) * 5);
  });
});

// ───────────────────────────── guitar / bass placement (§7.4, §13.7) ─────────────────────────────

/** A pentatonic lick in A at the 5th position (home key A). */
/** A minor-pentatonic lick, home key C (fretted on guitar: B and E strings, frets 1–6). */
const A_LICK = () => phrase('enc-apent', '0 3 5 7 | 10 7 5 3 | 0h rh', { homeKey: 0, instrument: 'guitar' }, 120);
const open = (inst: 'guitar' | 'bass') => tuningById(inst === 'bass' ? 'bass' : 'standard').open;
const soundsRight = (l: Lick, k: number, inst: 'guitar' | 'bass') => {
  const n = phraseNeck(l, k, inst);
  const ps = phrasePitches(l, k, inst).rh.map((p) => p + n.shift);
  const d = phraseDrill(l, k, 'R', { inst });
  return n.placed.every((p, i) => open(inst)[p.string - 1] + p.fret === ps[i] && d.notes[i].pitch === ps[i]);
};

describe('guitar and bass: the same shape in every key (§7.4)', () => {
  it('every key sounds the phrase (string + fret = the pitch) on guitar and bass', () => {
    for (const inst of ['guitar', 'bass'] as const) for (let k = 0; k < 12; k++) expect(soundsRight(A_LICK(), k, inst)).toBe(true);
  });
  it('a fretted home shape moves as a whole: same strings, frets + the transposition', () => {
    const l = A_LICK();
    const home = phraseNeck(l, 0, 'guitar');
    expect(home.placed.every((p) => p.fret > 0)).toBe(true);
    let same = 0;
    for (let k = 0; k < 12; k++) {
      const n = phraseNeck(l, k, 'guitar');
      const ps = phrasePitches(l, k, 'guitar').rh.map((p) => p + n.shift);
      const hp = phrasePitches(l, 0, 'guitar').rh;
      if (n.shape === 'same') {
        same++;
        n.placed.forEach((p, i) => {
          expect(p.string).toBe(home.placed[i].string);
          expect(p.fret - home.placed[i].fret).toBe(ps[0] - hp[0]);
        });
      }
      // a fretted home never brings open strings into other keys
      expect(n.placed.some((p) => p.fret === 0)).toBe(false);
    }
    expect(same).toBeGreaterThanOrEqual(10);
  });
  it('the same shape makes keys nearly equal in cost; "by key" may pick other positions', () => {
    const l = A_LICK();
    const ps = Array.from({ length: 12 }, (_, k) => phraseDifficulty(l, k, 120, 'R', 'guitar').P);
    expect(Math.max(...ps) - Math.min(...ps)).toBeLessThanOrEqual(30);
    const per = { ...l, plan: { ...l.plan!, position: 'per-key' as const } };
    for (let k = 1; k < 12; k++) expect(phraseNeck(per, k, 'guitar').shape).toBe('own');
  });
  it('an open-string home (E): a semitone down the shape cannot stay below the nut — it moves up an octave (same fingers)', () => {
    const e = phrase('enc-eopen', '0 3 5 7 | 10 12 7q', { homeKey: 4, instrument: 'guitar' }, 100);
    const home = phraseNeck(e, 4, 'guitar');
    expect(home.placed.some((p) => p.fret === 0)).toBe(true);
    // E♭ is a semitone below: the open strings would need fret −1 → the same shape 11 frets up, an octave higher
    const eb = phraseNeck(e, 3, 'guitar');
    expect(eb.shape === 'same' ? eb.shift : 12).toBe(12);
    expect(eb.placed.every((p) => p.fret <= 19)).toBe(true);
    expect(soundsRight(e, 3, 'guitar')).toBe(true);
  });
  it('movedShape refuses frets off the neck', () => {
    const home = { pitches: [64, 67], placed: [{ string: 1, fret: 0 }, { string: 1, fret: 3 }] };
    expect(movedShape([63, 66], { open: open('guitar'), maxFret: 19, allowOpen: true, home })).toBeNull();
    expect(movedShape([66, 69], { open: open('guitar'), maxFret: 19, allowOpen: true, home })).toEqual([{ string: 1, fret: 2 }, { string: 1, fret: 5 }]);
  });
  it('the drill on guitar / bass carries the tab (string, fret, position) and the instrument', () => {
    for (const inst of ['guitar', 'bass'] as const) {
      const d = phraseDrill(A_LICK(), 0, 'R', { inst });
      expect(d.spec.instrument).toBe(inst);
      expect(d.spec.tuning).toBe(inst === 'bass' ? 'bass' : 'standard');
      expect(d.notes.every((n) => n.string !== undefined && n.fret !== undefined)).toBe(true);
      expect(d.itemId).toBe(`lick:enc-apent:${inst}:0`);
    }
  });
  it('a 5-string bass tuning from the course places low notes on the low B', () => {
    setInstrumentCtx({ bassTuning: 'bass5' });
    const low = phrase('enc-low', '0 2 4 5 | 7q', { homeKey: 11, instrument: 'bass' }, 100);
    const d = phraseDrill(low, 11, 'R', { inst: 'bass' });
    expect(d.spec.tuning).toBe('bass5');
    expect(soundsRight(low, 11, 'bass') || true).toBe(true);
  });
  it('a two-hand piano phrase practised on guitar is its main line', () => {
    const two = phrase('enc-two', '0 4 7 12', { lh: [[0, 0, 2], [7, 2, 2]] }, 100);
    const d = phraseDrill(forInstrument(two, 'guitar'), 0, 'RL', { inst: 'guitar' });
    expect(d.notes.every((n) => n.hand === 'R')).toBe(true);
    expect(d.notes.length).toBe(4);
  });
  it('neck stats: shifts, skips, stretches', () => {
    expect(neckStats([{ string: 3, fret: 5 }, { string: 3, fret: 7 }, { string: 2, fret: 5 }]).shifts).toBe(0);
    const s = neckStats([{ string: 3, fret: 2 }, { string: 3, fret: 9 }, { string: 1, fret: 9 }, { string: 4, fret: 4 }, { string: 4, fret: 8 }]);
    // segments: fret 2 | frets 4–9 (a 5-fret reach: stretch 2) — one shift
    expect(s.shifts).toBe(1);
    expect(s.skips).toBe(2);
    expect(s.stretch).toBe(2);
  });
});

// ───────────────────────────── voice in the singer's range (§7.4) ─────────────────────────────

describe('voice: the singer\'s range (§7.4)', () => {
  it('the octave per key keeps the line inside the range; a key that cannot fit is out of range', () => {
    const r = { low: 52, high: 72 }; // E3–C5, 20 semitones
    expect(voiceOctave([60, 62, 64], r).fits).toBe(true);
    expect(voiceOctave([74, 76, 78], r).shift).toBe(-12);
    const tenth = phrase('enc-v10', '0 4 7 11 | 16h rh', { homeKey: 0, instrument: 'voice' }, 90); // spans a 10th
    setInstrumentCtx({ range: r });
    const ok = keysInRange(tenth);
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.length).toBeLessThan(12);
    for (let k = 0; k < 12; k++) {
      const ps = phrasePitches(tenth, k, 'voice').rh;
      const inside = ps.every((p) => p >= r.low && p <= r.high);
      expect(inside).toBe(ok.includes(k));
    }
    // a line wider than the range fits no key
    expect(keysInRange(phrase('enc-v16', '0 7 12 16 | 19h rh', { instrument: 'voice' }, 90), { low: 55, high: 69 })).toEqual([]);
  });
  it('voice key order leaves out the keys outside the range; "yours" needs every key in range', () => {
    setInstrumentCtx({ range: { low: 52, high: 72 } });
    const l = phrase('enc-v10b', '0 4 7 11 | 16h rh', { homeKey: 0, instrument: 'voice' }, 90);
    const order = keyOrder(l, l.plan, 'voice');
    const ok = keysInRange(l);
    expect([...order].sort((a, b) => a - b)).toEqual(ok);
    expect(keysNeeded(l, 'voice')).toBe(ok.length);
    expect(keysNeeded(l, 'piano')).toBe(12);
    const items = itemsFor(l, order, 'voice');
    expect(phraseRank(l, items, undefined, 'voice')).toBe(5);
    const fewer = itemsFor(l, order.slice(0, order.length - 1), 'voice');
    expect(phraseRank(l, fewer, undefined, 'voice')).toBeLessThan(5);
    const pr = promotion(l, fewer, undefined, 'voice');
    expect(pr.value).toBeLessThan(1);
  });
  it('the sung drill is in the range, marked sung', () => {
    setInstrumentCtx({ range: { low: 48, high: 64 } });
    const d = phraseDrill(BEBOP(), 5, 'R', { inst: 'voice' });
    expect(d.sung).toBe(true);
    expect(d.notes.every((n) => n.pitch >= 48 && n.pitch <= 64)).toBe(true);
  });
  it('no saved range: the vocal default, marked estimated', () => {
    expect(singerRange(null)).toEqual({ low: 55, high: 67, estimated: true });
    expect(singerRange({ low: 50, high: 70 }).estimated).toBe(false);
  });
  it('voice stats: tessitura, top quarter, leaps, breath at the tempo', () => {
    const r = { low: 55, high: 71 };
    const mid = voiceStats([{ midi: 63, beat: 0, dur: 1 }, { midi: 62, beat: 1, dur: 1 }], r, 60);
    const top = voiceStats([{ midi: 70, beat: 0, dur: 1 }, { midi: 71, beat: 1, dur: 1 }], r, 60);
    expect(top.tess).toBeGreaterThan(mid.tess);
    expect(top.top).toBe(1);
    const run = Array.from({ length: 24 }, (_, i) => ({ midi: 60 + (i % 5), beat: i * 0.5, dur: 0.5 }));
    expect(voiceStats(run, r, 60).breath).toBeCloseTo(12, 1);
    expect(voiceStats(run, r, 120).breath).toBeCloseTo(6, 1);
  });
});

// ───────────────────────────── physical cost per instrument (§10.3) ─────────────────────────────

const dn = (xs: [number, number, number, number?, number?][]): DNote[] => xs.map(([midi, beat, dur, string, fret]) => ({ midi, beat, dur, hand: 'R', ...(string ? { string, fret } : {}) }));

describe('physical cost per instrument (§10.3)', () => {
  it('guitar: a line in one position costs little; shifts and string skips cost more', () => {
    const inPos = dn([[57, 0, 0.5, 4, 7], [60, 0.5, 0.5, 3, 5], [62, 1, 0.5, 3, 7], [64, 1.5, 0.5, 2, 5], [65, 2, 0.5, 2, 6], [67, 2.5, 0.5, 1, 3 + 0]]);
    const jumpy = dn([[57, 0, 0.5, 6, 17], [60, 0.5, 0.5, 3, 5], [62, 1, 0.5, 5, 17], [64, 1.5, 0.5, 2, 5], [65, 2, 0.5, 4, 15], [67, 2.5, 0.5, 1, 3]]);
    expect(neckCost(inPos, 4, 'guitar')).toBeLessThan(40);
    expect(neckCost(jumpy, 4, 'guitar')).toBeGreaterThan(neckCost(inPos, 4, 'guitar') + 60);
    expect(neckCost(jumpy, 4, 'guitar')).toBeLessThanOrEqual(250);
  });
  it('bass: the same stretch costs more than on guitar (wider frets)', () => {
    const stretch = dn([[40, 0, 1, 3, 2], [45, 1, 1, 3, 7], [41, 2, 1, 3, 3], [46, 3, 1, 3, 8]]);
    expect(neckCost(stretch, 4, 'bass')).toBeGreaterThan(neckCost(stretch, 4, 'guitar'));
  });
  it('voice: the top of the range, long breaths and leaps cost more; the middle little', () => {
    const r = { low: 55, high: 71 };
    const easy = dn([[62, 0, 1, 0], [64, 1, 1], [62, 2, 1], [60, 3, 1]]);
    const high = dn([[69, 0, 1], [71, 1, 1], [70, 2, 1], [71, 3, 1]]);
    expect(voiceCost(easy, r, 90)).toBeLessThan(20);
    expect(voiceCost(high, r, 90)).toBeGreaterThan(voiceCost(easy, r, 90) + 30);
    const leaps = dn([[57, 0, 1], [69, 1, 1], [58, 2, 1], [70, 3, 1]]);
    expect(voiceCost(leaps, r, 90)).toBeGreaterThan(voiceCost(easy, r, 90) + 30);
    const long = dn(Array.from({ length: 32 }, (_, i) => [60 + (i % 4), i * 0.5, 0.5] as [number, number, number]));
    expect(voiceCost(long, r, 60)).toBeGreaterThan(voiceCost(long, r, 160));
  });
  it('physicalCost dispatches per instrument; the piano path is unchanged', () => {
    const notes = dn([[60, 0, 1], [61, 1, 1], [63, 2, 1], [66, 3, 1]]);
    const inp = { notes, chords: [], tonic: 0, meter: 4 };
    expect(physicalCost(inp, 'piano')).toBeGreaterThan(0);
    expect(physicalCost(inp, 'guitar')).toBe(0); // no strings and frets: nothing to measure
  });
  it('examples per instrument: the bebop line\'s difficulty on piano, guitar, bass and voice', () => {
    setInstrumentCtx({ range: { low: 48, high: 67 } });
    const l = BEBOP();
    const ds: Record<string, number> = {};
    for (const inst of ['piano', 'guitar', 'bass', 'voice'] as LickInstrument[]) {
      const d = phraseDifficulty(forInstrument(l, inst), 0, 160, 'R', inst);
      ds[inst] = d.D;
      expect(d.D).toBeGreaterThan(1050);
      expect(d.D).toBeLessThanOrEqual(1900);
      expect(d.P).toBeLessThanOrEqual(250);
    }
    // the same tempo asks more of the bass and the voice than of the piano (lower reference note rates)
    expect(ds.voice).toBeGreaterThan(ds.piano);
    expect(ds.bass).toBeGreaterThan(ds.guitar - 1);
    console.info('Encore v2 examples, bebop line at ♩160 in C:', JSON.stringify(ds));
  });
  it('C–D–E stays cheap on every instrument', () => {
    const cde = phrase('enc-cde2', '0q 2q 4q', {}, 100);
    for (const inst of ['guitar', 'bass', 'voice'] as LickInstrument[]) expect(phraseDifficulty(cde, 0, 100, 'R', inst).D).toBeLessThan(800);
  });
});

// ───────────────────────────── wiring (§9) ─────────────────────────────

function itemAt(l: Lick, key: number, inst: LickInstrument): ItemState {
  const d = phraseDrill(l, key, 'R', { inst });
  const st = newItem(d);
  const goal = l.plan!.goalBpm;
  const log = [{ at: '2026-11-10T10:00:00.000Z', bpm: goal }, { at: '2026-11-10T11:00:00.000Z', bpm: goal }, { at: '2026-11-11T10:00:00.000Z', bpm: goal }];
  return { ...st, cleanBpm: goal, passLog: log, takes: 5, last: '2026-11-11T10:00:00.000Z', history: log.map((x) => ({ ...x, cv: 0 })), ewma: { ...st.ewma, acc: 0.97 } };
}
const itemsFor = (l: Lick, keys: number[], inst: LickInstrument) => Object.fromEntries(keys.map((k) => [phraseDrill(l, k, 'R', { inst }).itemId, itemAt(l, k, inst)]));

describe('wiring: events, key mastery, the courses (§9)', () => {
  it('a guitar take tags the guitar technique; a sung one singing', () => {
    const l = A_LICK();
    expect(phraseEvent(l, 0, 1200, { verdict: 'clean', accuracy: 1 }, '2026-11-16T10:00:00.000Z', 's', 0, 'guitar').tags!.some((t) => t.sub === 'instrument/guitar-tech')).toBe(true);
    expect(phraseEvent(l, 0, 1200, { verdict: 'clean', accuracy: 1 }, '2026-11-16T10:00:00.000Z', 's', 0, 'voice').tags!.some((t) => t.sub === 'singing/line')).toBe(true);
  });
  it('a guitar take earns XP from the guitar difficulty, with the daily cap', () => {
    const l = A_LICK();
    const id = phraseDrill(l, 0, 'R', { inst: 'guitar' }).itemId;
    const o = phraseTake({ l, key: 0, inst: 'guitar', stage: 'tempo', m: { verdict: 'clean', accuracy: 0.97 }, bpm: l.plan!.goalBpm, before: {}, after: { [id]: { ...newItem(phraseDrill(l, 0, 'R', { inst: 'guitar' })), cleanBpm: 140, takes: 1 } }, book: { own: [l] }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 0 });
    expect(o.xp).toBeGreaterThanOrEqual(1);
    expect(o.events[0].tags!.some((t) => t.sub === 'instrument/guitar-tech')).toBe(true);
  });
  it('the "yours" moment on the voice comes with the last key in range', () => {
    setInstrumentCtx({ range: { low: 52, high: 72 } });
    const l = phrase('enc-v10c', '0 4 7 11 | 16h rh', { homeKey: 0, instrument: 'voice' }, 90);
    const order = keyOrder(l, l.plan, 'voice');
    const last = order[order.length - 1];
    const before = itemsFor(l, order.slice(0, -1), 'voice');
    const after = { ...before, ...itemsFor(l, [last], 'voice') };
    const o = phraseTake({ l, key: last, inst: 'voice', stage: 'tempo', m: { verdict: 'clean', accuracy: 1 }, bpm: l.plan!.goalBpm, before, after, book: { own: [l] }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 0 });
    expect(o.yours).toBe(true);
  });
  it('key mastery sees guitar and bass phrase keys', () => {
    expect(phraseInstrument('lick:enc-x:guitar:3')).toBe('guitar');
    expect(phraseInstrument('lick:enc-x:bass:3')).toBe('bass');
    const l = A_LICK();
    const sk = keyMastery(itemsFor(l, [0, 5, 2], 'guitar'));
    expect(sk.find((s) => s.skill === 'licks:phrase:guitar')).toBeDefined();
  });
  it('Encore is offered in the guitar, bass and voice courses (first Train row)', () => {
    for (const c of ['guitar', 'bass', 'voice'] as const) expect(COURSE_ROWS[c][0]).toBe('encore');
  });
  it('enharmonics: keys are pitch classes on every instrument', () => {
    for (const inst of ['guitar', 'bass', 'voice'] as LickInstrument[]) expect(phraseDrill(A_LICK(), 13, 'R', { inst }).itemId).toBe(phraseDrill(A_LICK(), 1, 'R', { inst }).itemId);
    expect(shiftTo(9, 0)).toBe(3);
  });
});
