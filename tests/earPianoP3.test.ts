// Leftovers (2026-11-12): EAR_THEORY_AUDIT §6 — upper structures and rootless voicings as their own topic, a whole
// 32-bar AABA in jazz-form; PIANO_AUDIT §5 P3 — two-part playback, grand-staff two-hand reading, a solo phrase by ear.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { asChoice, genTopic, TOPIC_GEN } from '../src/engine/topicKit';
import { AABA_FORMS, rootless251, UST5, ustVoicing } from '../src/engine/topicsJazzEar';
import { stepCatalogue, eligible, MEASURED_STEP_LEVELS } from '../src/engine/path';
import { courseInput } from '../src/engine/courses';
import { MINI_LESSONS } from '../src/content/minilessons';
import { hasShortName } from '../src/engine/pathNames';
import { TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { catalog, generate } from '../src/engine/drills/generate';
import { drillEvents } from '../src/engine/drills/events';
import { analyzeTake } from '../src/engine/drills/analyze';
import { humanTake } from './pianoTake';
import { comparePhrase, phraseFor, TX_LEVELS } from '../src/engine/transcribe';
import type { NoteEvent, PlaceQuestion, Stimulus } from '../src/engine/lesson';

const pc = (m: number) => ((m % 12) + 12) % 12;
const events = (s: Stimulus): NoteEvent[] => (s.kind === 'events' ? s.events : []);

describe('upper structures and rootless voicings (Ear & theory)', () => {
  it('four levels, harder each time; on the ear path with a symbol, a short name and a quick lesson', () => {
    const T = TOPIC_GEN['upper-rootless'];
    expect(T.levels.length).toBe(4);
    const d = [1, 2, 3, 4].map((l) => genTopic('upper-rootless', 7, l, 'x').difficulty);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    const base = { track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: ['jazz'], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-12T10:00:00Z') } as never;
    const steps = stepCatalogue().filter((s) => s.topic === 'upper-rootless');
    expect(steps.length).toBe(4);
    expect(steps.every((s) => eligible(s, courseInput(base, 'ear')))).toBe(true);
    expect(GLYPHS[TOPIC_GLYPH['upper-rootless']]).toBeDefined();
    expect(hasShortName('upper-rootless')).toBe(true);
    expect(MINI_LESSONS['upper-rootless']).toBeDefined();
  });
  it('rootless A / B through a ii–V–I alternate (the lowest voice of the ii is its ♭3 in A, its ♭7 in B) and move little', () => {
    for (const key of [0, 5, 10]) {
      const a = rootless251(key, true);
      const b = rootless251(key, false);
      expect(pc(a[0][0] - (key + 2))).toBe(3);
      expect(pc(b[0][0] - (key + 2))).toBe(10);
      for (const v of [a, b]) for (let i = 1; i < 3; i++) expect(Math.abs(v[i][0] - v[i - 1][0])).toBeLessThanOrEqual(5);
    }
  });
  it('upper-structure triads sit above the 3rd and ♭7 and spell the named tensions', () => {
    const v = ustVoicing(7, UST5.II.at); // G7 + A triad
    expect(v.slice(0, 2).map(pc)).toEqual([11, 5]);
    expect(new Set(v.slice(2).map(pc))).toEqual(new Set([9, 1, 4])); // A C♯ E = 9 ♯11 13
    const q = asChoice(genTopic('upper-rootless', 11, 4, 'x'));
    expect(q.choices.length).toBe(5);
    // the five candidates differ only over the V
    const over = q.choices.map((k) => JSON.stringify(events(q.choiceStim![k][0]).map((e) => e.midi).sort()));
    expect(new Set(over).size).toBe(5);
  });
});

describe('jazz-form 4: a whole 32-bar AABA, where does the bell ring?', () => {
  it('each form is 32 bars (A A B A of 8 bars each)', () => {
    for (const F of Object.values(AABA_FORMS)) for (const s of [F.a1, F.a2, F.b, F.a3]) expect(s.reduce((a, [, , b]) => a + b, 0)).toBe(32);
  });
  it('the whole form plays and the bell marks the answer’s bar', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const q = asChoice(genTopic('jazz-form', seed * 31, 4, 'x'));
      seen.add(q.answer);
      const ev = events(q.stimulus[0]);
      const bell = ev.filter((e) => e.perc === 'bell');
      expect(bell.length).toBe(2);
      const ride = ev.filter((e) => e.perc === 'ride');
      const beat = (Math.max(...ride.map((e) => e.start)) - Math.min(...ride.map((e) => e.start))) / (32 * 4 - 1 - 1 / 3);
      const bar = Math.round(bell[0].start / (4 * beat)) + 1;
      const want: Record<string, number[]> = { a2: [9], bridge: [17], lastA: [25], mid: [5, 13, 21, 29] };
      expect(want[q.answer], `${q.answer} at bar ${bar}`).toContain(bar);
    }
    expect(seen.size).toBe(4);
  });
});

describe("the pianist's ear 9: two parts, melody and bass", () => {
  const EAR = catalog().find((f) => f.id === 'k-ear')!;
  const lv = EAR.levels[8];
  it('answers both voices: the RH plays the call’s upper line, the LH its bass, beat for beat', () => {
    for (const op of [0, 1])
      for (const key of [0, 7, 10]) {
        const d = generate({ family: 'k-ear', kind: 'two-part', key, hands: 'RL', option: op, tempo: 72 });
        const rh = d.notes.filter((n) => n.hand === 'R').map((n) => n.pitch);
        const lh = d.notes.filter((n) => n.hand === 'L').map((n) => n.pitch);
        expect(rh.length).toBeGreaterThan(4);
        expect(lh.length).toBeGreaterThan(4);
        expect(Math.min(...rh)).toBeGreaterThan(Math.max(...lh));
        const calls = d.listen!.notes.filter((n) => n.beat >= 4).flatMap((n) => n.midi);
        for (const p of [...rh, ...lh]) expect(calls).toContain(p);
      }
    expect(lv.title.en).toMatch(/Two parts/);
  });
  it('a steady two-hand answer is clean; a wrong note is not; the ear share is two-part dictation', () => {
    const d = generate({ family: 'k-ear', kind: 'two-part', key: 0, hands: 'RL', option: 0, tempo: 72 });
    expect(analyzeTake(d, 72, humanTake(d, 72, 9, 3)).verdict).toBe('clean');
    const take = humanTake(d, 72, 6, 2);
    take[3] = { ...take[3], pitch: take[3].pitch + 1 };
    expect(analyzeTake(d, 72, take).verdict).not.toBe('clean');
    const evs = drillEvents(d, analyzeTake(d, 72, humanTake(d, 72, 9, 3)), new Date().toISOString(), 's', 0);
    expect(JSON.stringify(evs)).toContain('dictation/two-part');
  });
});

describe('reading both hands on a grand staff (key-read 6–7)', () => {
  it('level 6: one note per hand; level 7: a LH root + 5th/octave and a RH triad of the key', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const q6 = genTopic('key-read', seed, 6, 'x') as PlaceQuestion;
      expect(q6.given?.grand).toBe(true);
      expect(q6.target.filter((m) => m < 60).length).toBe(1);
      expect(q6.target.filter((m) => m >= 60).length).toBe(1);
      const q7 = genTopic('key-read', seed, 7, 'x') as PlaceQuestion;
      const lh = q7.target.filter((m) => m < 60);
      const rh = q7.target.filter((m) => m >= 60);
      expect(lh.length).toBeGreaterThanOrEqual(1);
      expect(rh.length).toBe(3);
      expect(Math.max(...rh)).toBeLessThanOrEqual(79);
      expect(q7.difficulty).toBeGreaterThan(q6.difficulty);
    }
  });
});

describe('a solo phrase by ear (transcription level 9, on the keys path)', () => {
  it('a ii–V–I line: chord tones of the V on its beats, ending on a chord tone of I, never a repeated note', () => {
    expect(TX_LEVELS.length).toBe(9);
    for (let seed = 1; seed <= 40; seed++) {
      const p = phraseFor(9, seed);
      expect(p.level).toBe(9);
      expect(p.swing).toBe(true);
      expect(p.chords).toEqual([[2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]]);
      const rel = p.notes.map((n) => pc(n.midi - p.key));
      expect(p.notes.length).toBe(9);
      for (const i of [4, 6]) expect([7, 11, 2, 5]).toContain(rel[i]);
      expect([0, 4, 7, 11]).toContain(rel[8]);
      for (let i = 1; i < p.notes.length; i++) expect(p.notes[i].midi).not.toBe(p.notes[i - 1].midi);
      // compared like every transcription: played back exactly → clean
      const heard = p.notes.map((n) => ({ midi: n.midi, start: (n.beat * 60) / p.bpm, end: ((n.beat + n.dur) * 60) / p.bpm }));
      expect(comparePhrase(p, heard).verdict).toBe('clean');
    }
    expect(MEASURED_STEP_LEVELS.transcribe.keys).toContain(9);
  });
});
