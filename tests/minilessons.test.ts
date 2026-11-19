import { describe, expect, it } from 'vitest';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { renderStimulus } from '../src/engine/lesson';

const words = (s: string) => s.replace(/\{name\}/g, '').split(/\s+/).filter(Boolean).length;
const AREAS = ['ear', 'harmony', 'rhythm', 'theory', 'voice', 'jazz', 'world', 'play'];
/** Short on purpose (owner 2026-11-18, few words per screen): a first look at a concept, not the 60–90 s lesson. */
const SHORT = new Set(['chord-intro',
  // CURRICULUM-AUDIT-VOICE-DRUMS B3–B11 (owner 2026-11-19): one idea a screen.
  'drum-values', 'drum-strokes', 'drum-accents', 'drum-flams', 'drum-shuffle', 'drum-swing-ride', 'drum-brazil', 'drum-clave', 'drum-mideast', 'drum-fills', 'drum-rolls', 'drum-indep', 'drum-echo', 'drum-styles-ear', 'voice-jazz-start', 'voice-guide-tones', 'voice-ear', 'sevenths', 'chord-numbers', 'scales-mm', 'mode-colours', 'beyond-octave', 'six-dim', 'jazz-welcome', 'blues-ear', 'voicing-type', 'chart-analysis', 'jazz-chains', 'chorale-rn']);

describe('mini-lessons (spec X)', () => {
  const all = Object.values(MINI_LESSONS);
  it('every unit has its lesson', () => {
    const missing = [...new Set(Object.values(UNIT_LESSON))].filter((id) => !MINI_LESSONS[id]);
    expect(missing).toEqual([]);
  });
  for (const l of all)
    it(`${l.id}: 60–90 s, bilingual, examples that play`, () => {
      expect(AREAS).toContain(l.area);
      expect(l.steps.length).toBeGreaterThanOrEqual(5);
      expect(l.steps.length).toBeLessThanOrEqual(10);
      const en = l.steps.reduce((a, s) => a + words(s.say.en), 0);
      // ~2.6 spoken words per second plus the examples ≈ 60–90 s
      expect(en, `${l.id} English words`).toBeGreaterThanOrEqual(SHORT.has(l.id) ? 40 : 100);
      if (SHORT.has(l.id)) for (const s of l.steps) expect(words(s.say.en), `${l.id} short screens`).toBeLessThanOrEqual(16);
      expect(en, `${l.id} English words`).toBeLessThanOrEqual(240);
      expect(l.title.he && l.takeaway.he && l.title.en && l.takeaway.en).toBeTruthy();
      let examples = 0;
      for (const s of l.steps) {
        expect(s.say.en.trim() && s.say.he.trim(), l.id).toBeTruthy();
        expect(/[א-ת]/.test(s.say.he), `${l.id} Hebrew text`).toBe(true);
        if (s.play?.length) {
          examples++;
          expect(renderStimulus(s.play).length, l.id).toBeGreaterThan(0);
          expect(renderStimulus(s.play).length, `${l.id} example too long`).toBeLessThan(14);
        }
        if (s.show?.notes) for (const m of s.show.notes) expect(m >= 28 && m <= 96, `${l.id} note ${m}`).toBe(true);
      }
      expect(examples, `${l.id} examples`).toBeGreaterThanOrEqual(3);
    });
});

describe('mini-lessons in depth (SPEC-0.48 §L)', () => {
  for (const l of Object.values(MINI_LESSONS))
    it(`${l.id}: in depth is full but light`, () => {
        expect(l.more, `${l.id} has no in-depth part`).toBeTruthy();
        const more = l.more!;
        expect(more.length, l.id).toBeGreaterThanOrEqual(5);
        expect(more.length, l.id).toBeLessThanOrEqual(12);
        const en = more.reduce((a, s) => a + words(s.say.en), 0);
        expect(en, `${l.id} in-depth words`).toBeGreaterThanOrEqual(150);
        expect(en, `${l.id} in-depth words`).toBeLessThanOrEqual(420);
        let examples = 0;
        for (const s of more) {
          expect(words(s.say.en), `${l.id} step too long`).toBeLessThanOrEqual(60);
          expect(/[א-ת]/.test(s.say.he), `${l.id} Hebrew text`).toBe(true);
          if (s.play?.length) {
            examples++;
            expect(renderStimulus(s.play).length).toBeGreaterThan(0);
            expect(renderStimulus(s.play).length, `${l.id} example too long`).toBeLessThan(16);
          }
          if (s.show?.notes) for (const m of s.show.notes) expect(m >= 28 && m <= 96, `${l.id} note ${m}`).toBe(true);
        }
        expect(examples, `${l.id} in-depth examples`).toBeGreaterThanOrEqual(2);
      });
});
