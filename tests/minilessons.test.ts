import { describe, expect, it } from 'vitest';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { renderStimulus } from '../src/engine/lesson';

const words = (s: string) => s.replace(/\{name\}/g, '').split(/\s+/).filter(Boolean).length;
const AREAS = ['ear', 'harmony', 'rhythm', 'theory', 'voice', 'jazz', 'world', 'play'];

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
      expect(en, `${l.id} English words`).toBeGreaterThanOrEqual(100);
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
