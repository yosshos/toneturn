import { describe, expect, it } from 'vitest';
import { GLOSSARY, termsIn } from '../src/content/glossary';
import { MINI_LESSONS } from '../src/content/minilessons';
import { renderStimulus } from '../src/engine/lesson';

describe('plain-language glossary (spec AC)', () => {
  it('every word is bilingual, explained and playable', () => {
    for (const t of GLOSSARY) {
      expect(t.explain.en.length, t.id).toBeGreaterThan(20);
      expect(t.explain.he.length, t.id).toBeGreaterThan(15);
      expect(renderStimulus(t.play).events.length, t.id).toBeGreaterThan(0);
    }
  });
  it('finds the words in a sentence, in reading order, in both languages', () => {
    expect(termsIn('The tonic and the fifth make a chord.', 'en').map((t) => t.id)).toEqual(['tonic', 'fifth', 'chord']);
    expect(termsIn('המרווח בין הטוניקה לקווינטה', 'he').map((t) => t.id)).toEqual(['interval', 'tonic', 'fifth']);
    expect(termsIn('בסיס', 'he').map((t) => t.id)).not.toContain('bass'); // not inside other words
  });
  it('the first path lessons get explained words', () => {
    for (const id of ['degrees-135', 'major-minor', 'intervals', 'notes-degrees']) {
      const l = MINI_LESSONS[id];
      const words = new Set(l.steps.flatMap((s) => [...termsIn(s.say.en, 'en'), ...termsIn(s.say.he, 'he')].map((t) => t.id)));
      expect(words.size, id).toBeGreaterThanOrEqual(2);
    }
  });
});
