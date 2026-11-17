// GUITAR-AUDIT B1 (2026-11-17): a partial or muted strum is not a full chord. The drill alternates A (x02220: A E A C♯ E)
// and D (xx0232: D A D F♯) — C♯ is the A chord's only note on its string class (string 2), E and A are doubled.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { expTimeMs } from '../src/engine/drills/analyze';
import { analyzeGuitarTake, UNPITCHED, type GFrame } from '../src/engine/drills/guitarAnalyze';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const d: Drill = generate({ family: 'g-chords', kind: 'one-minute', key: 0, hands: 'R', option: 0, perBeat: 0.25 } as never);
const bpm = 60;
const beats = [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b);
const chordAt = (b: number) => d.notes.filter((n) => n.beat === b);
const isA = (b: number) => chordAt(b).some((n) => n.pitch === 61);

/** MIDI guitar: every string a note-on; `drop(beat)` = pitches left out of that strum. */
function midiTake(drop: (b: number) => number[] = () => []): PlayedNote[] {
  const out: PlayedNote[] = [];
  for (const b of beats) {
    const t0 = expTimeMs(d, b, bpm);
    chordAt(b)
      .filter((n) => !drop(b).includes(n.pitch))
      .forEach((n, k) => out.push({ pitch: n.pitch, on: t0 + 4 * k, off: null, vel: 70 }));
  }
  return out;
}

/** Microphone: one onset per strum (the pitch tracker reads one pitch, or none), chroma frames for what rang. */
function micTake(pitch: (b: number) => number, chroma: (b: number) => number[] | null): { played: PlayedNote[]; frames: GFrame[] } {
  const played = beats.map((b) => ({ pitch: pitch(b), on: expTimeMs(d, b, bpm), off: null, vel: 70 }));
  const frames: GFrame[] = [];
  const end = expTimeMs(d, d.beats, bpm);
  for (let t = 0; t < end; t += 20) {
    const b = [...beats].reverse().find((x) => expTimeMs(d, x, bpm) <= t) ?? beats[0];
    frames.push({ t, hz: null, rms: 0.2, chroma: chroma(b) ?? undefined });
  }
  return { played, frames };
}
/** A chroma with the chord's pitch classes at 1 except `low` (pc → level). */
const chromaOf = (b: number, low: Record<number, number> = {}) => {
  const pcs = new Set(chordAt(b).map((n) => n.pitch % 12));
  return Array.from({ length: 12 }, (_, i) => (i in low ? low[i] : pcs.has(i) ? 1 : 0.03));
};

describe('chord completeness (B1)', () => {
  it('the drill is the A / D pair the cases assume', () => {
    expect(beats.length).toBe(8);
    expect(chordAt(0).map((n) => n.pitch).sort()).toEqual([45, 52, 57, 61, 64]);
    expect(chordAt(0).find((n) => n.pitch === 61)).toMatchObject({ string: 2, fret: 2 });
  });

  it('MIDI: every string sounding is clean', () => {
    const m = analyzeGuitarTake(d, bpm, midiTake());
    expect(m.verdict).toBe('clean');
    expect(m.guitar.chordMiss).toMatchObject({ checked: 8, missed: 0 });
  });

  it('MIDI: a dead string is not credited — "almost", the note and its string named', () => {
    const m = analyzeGuitarTake(d, bpm, midiTake((b) => (isA(b) ? [61] : [])));
    expect(m.verdict).toBe('almost');
    expect(m.why.en).toBe("The C♯ didn't sound in 4 of 8 chords — string 2 (B)");
    expect(m.why.he).toBe('ה־C♯ לא נשמע ב־4 מתוך 8 אקורדים — מיתר 2 (B)');
    expect(m.perNote.filter((r) => r.exp.pitch === 61).every((r) => !r.ok)).toBe(true);
    expect(m.accuracy).toBeLessThan(1);
    // One strum short of a string: still only "almost".
    expect(analyzeGuitarTake(d, bpm, midiTake((b) => (b === 0 ? [61] : []))).verdict).toBe('almost');
  });

  it('MIDI: notes missing in most strums → not', () => {
    const m = analyzeGuitarTake(d, bpm, midiTake((b) => (isA(b) ? [61] : [66])));
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/^The (C♯ and F♯|F♯ and C♯) didn't sound in 8 of 8 chords$/);
  });

  it('a stray note just before the strum does not stand for the whole chord', () => {
    const played = midiTake((b) => (isA(b) ? [61] : []));
    for (const b of beats.filter(isA)) played.push({ pitch: 57, on: expTimeMs(d, b, bpm) - 200, off: null, vel: 70 });
    played.sort((a, b) => a.on - b.on);
    const m = analyzeGuitarTake(d, bpm, played);
    expect(m.guitar.chordMiss!.notes[0]).toMatchObject({ pitch: 61, string: 2 });
  });

  it('mic: a muted chuck (no pitch, no chroma) is never a right chord', () => {
    const { played } = micTake(() => UNPITCHED, () => null);
    const m = analyzeGuitarTake(d, bpm, played, undefined, []);
    expect(m.verdict).not.toBe('clean');
    expect(m.guitar.unclear).toBeGreaterThan(0);
    expect(m.perNote.every((r) => !r.ok)).toBe(true);
  });

  it('mic: an unpitched strum whose chroma has every note is clean', () => {
    const { played, frames } = micTake(() => UNPITCHED, (b) => chromaOf(b));
    const m = analyzeGuitarTake(d, bpm, played, undefined, frames);
    expect(m.verdict).toBe('clean');
    expect(m.guitar.chordMiss).toMatchObject({ checked: 8, missed: 0 });
  });

  it('mic: a unique note missing in some strums → almost, named with its string', () => {
    const { played, frames } = micTake((b) => chordAt(b)[0].pitch, (b) => (isA(b) ? chromaOf(b, { 1: 0.02 }) : chromaOf(b)));
    const m = analyzeGuitarTake(d, bpm, played, undefined, frames);
    expect(m.verdict).toBe('almost');
    expect(m.why.he).toBe('ה־C♯ לא נשמע ב־4 מתוך 8 אקורדים — מיתר 2 (B)');
  });

  it('mic: a doubled pitch class is never named (which string was dead is unknowable)', () => {
    // E is on strings 4 and 1 of the A chord: even a missing E class is not reported as a dead string.
    const { played, frames } = micTake((b) => chordAt(b)[0].pitch, (b) => (isA(b) ? chromaOf(b, { 4: 0.02 }) : chromaOf(b)));
    const m = analyzeGuitarTake(d, bpm, played, undefined, frames);
    expect(m.guitar.chordMiss!.missed).toBe(0);
    expect(m.verdict).toBe('clean');
  });

  it('mic: lenient — a weak (not clearly absent) note in every strum is almost; clearly absent in most is not', () => {
    const weak = micTake((b) => chordAt(b)[0].pitch, (b) => chromaOf(b, isA(b) ? { 1: 0.12 } : { 6: 0.12 }));
    expect(analyzeGuitarTake(d, bpm, weak.played, undefined, weak.frames).verdict).toBe('almost');
    const gone = micTake((b) => chordAt(b)[0].pitch, (b) => chromaOf(b, isA(b) ? { 1: 0.01 } : { 6: 0.01 }));
    expect(analyzeGuitarTake(d, bpm, gone.played, undefined, gone.frames).verdict).toBe('not');
    // One strum in eight with a weak note: under the mic's 25% bar, no line at all.
    const one = micTake((b) => chordAt(b)[0].pitch, (b) => chromaOf(b, b === 0 ? { 1: 0.12 } : {}));
    expect(analyzeGuitarTake(d, bpm, one.played, undefined, one.frames).verdict).toBe('clean');
  });
});
