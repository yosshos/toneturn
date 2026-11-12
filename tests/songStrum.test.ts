// Song chords, strummed (GUITAR_DEEPENING): a song question whose answer is a chord — the chord under a bar of a
// public-domain song's melody, or the chord that comes next — answered by strumming (buttons as the fallback).
import { describe, expect, it } from 'vitest';
import { songStrumBars } from '../src/engine/topicsSongs';
import { TOPIC_GEN } from '../src/engine/topicKit';
import type { ChoiceQuestion } from '../src/engine/lesson';
import { songChords } from '../src/content/songbook';
import { strumAmong, type StrumFrame } from '../src/engine/chordFinder';
import { stepCatalogue } from '../src/engine/path';
import { inCourse } from '../src/engine/courses';
import { TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { hasShortName } from '../src/engine/pathNames';

const pc = (n: number) => ((n % 12) + 12) % 12;
/** Live-style frames: quiet, then a strum of `pcs` (as the chord finder's tests). */
function frames(pcs: number[]): StrumFrame[] {
  const out: StrumFrame[] = [];
  for (let t = 0; t < 900; t += 25) {
    const on = t >= 200;
    const chroma = on ? Array.from({ length: 12 }, (_, i) => (pcs.includes(i) ? 1 : 0.05)) : Array(12).fill(0.02);
    out.push({ t, hz: null, conf: 0.9, rms: on ? 0.2 : 0.004, chroma });
  }
  return out;
}
const gen = (seed: number, level: number) => TOPIC_GEN['song-strum'].gen(seed, level, `t${seed}`) as ChoiceQuestion;

describe('song chords, strummed', () => {
  it('every level has songbook bars to ask; level 1 asks I or V, level 2 I, IV or V', () => {
    for (const l of [1, 2, 3]) expect(songStrumBars(l).length, `level ${l}`).toBeGreaterThan(5);
    expect(new Set(songStrumBars(1).map((b) => b.degree))).toEqual(new Set(['I', 'V']));
    expect([...new Set(songStrumBars(2).map((b) => b.degree))].every((d) => ['I', 'IV', 'V'].includes(d))).toBe(true);
  });

  it("the answer is the song's chord under that bar; every choice is a chord to strum, named in the key", () => {
    for (const level of [1, 2, 3])
      for (let seed = 1; seed <= 60; seed++) {
        const q = gen(seed, level);
        expect(q.kind).toBe('choice');
        expect(q.choices).toContain(q.answer);
        expect(q.choices.length).toBe([2, 3, 4][level - 1]);
        for (const c of q.choices) {
          expect(q.strum?.[c], `${q.id} ${c}`).toBeDefined();
          expect(q.names[c].en).toMatch(/^[A-G][♯♭]?m?$/);
          expect(q.choiceStim?.[c]?.length).toBe(1);
        }
        expect(new Set(q.choices.map((c) => q.names[c].en)).size).toBe(q.choices.length);
        expect(q.ask.en.length > 0 && /[֐-׿]/.test(q.ask.he)).toBe(true);
        // The heard music: a cadence, then the bar(s) — on level 3 with the chords before the asked bar only.
        const ev = q.stimulus.find((s) => s.kind === 'events');
        expect(ev).toBeDefined();
      }
  });

  it('the asked chord is the song chord (key-relative root and quality)', () => {
    for (const level of [1, 2, 3])
      for (const b of songStrumBars(level)) {
        const c = songChords(b.song).find((x) => Math.floor(x.at / b.song.meter + 1e-9) === b.bar)!;
        const want = { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9 }[b.degree];
        expect(c.root, `${b.song.id} bar ${b.bar}`).toBe(want);
      }
  });

  it('a strum is named among the choices only: the right chord answers right, another choice answers wrong', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q = gen(seed, 2);
      const chords = q.choices.map((c) => q.strum![c]);
      const pcsOf = (x: { root: number; quality: string }) => [0, x.quality === 'm' ? 3 : 4, 7].map((i) => pc(x.root + i));
      const right = strumAmong(frames(pcsOf(q.strum![q.answer])), chords);
      expect(right.verdict).toBe('ok');
      expect(q.choices[right.index!]).toBe(q.answer);
      const other = q.choices.find((c) => c !== q.answer)!;
      const wrong = strumAmong(frames(pcsOf(q.strum![other])), chords);
      expect(q.choices[wrong.index!]).toBe(other);
    }
    // Silence (no onset) is "again", never an answer.
    const quiet: StrumFrame[] = Array.from({ length: 30 }, (_, i) => ({ t: i * 25, hz: null, conf: 0, rms: 0.003, chroma: Array(12).fill(0.02) }));
    expect(strumAmong(quiet, [{ root: 0, quality: 'M' }, { root: 7, quality: 'M' }]).verdict).toBe('again');
  });

  it('a step of the guitar, bass and keys paths (2026-11-12), with its own symbol and short name', () => {
    const steps = stepCatalogue().filter((s) => s.topic === 'song-strum');
    expect(steps.map((s) => s.level)).toEqual([1, 2, 3]);
    for (const s of steps) {
      for (const c of ['guitar', 'bass', 'keys'] as const) expect(inCourse(s, c), c).toBe(true);
      for (const c of ['ear', 'jazz', 'voice', 'drums'] as const) expect(inCourse(s, c), c).toBe(false);
      expect(s.choices).toBeGreaterThan(1);
    }
    expect(GLYPHS[TOPIC_GLYPH['song-strum']]).toBeDefined();
    expect(hasShortName('song-strum')).toBe(true);
  });
});
