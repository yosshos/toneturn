import { describe, expect, it } from 'vitest';
import { keyboardIsHint, noHints, withHint } from '../src/engine/aids';
import { noteNameQuestion, singQuestion } from '../src/engine/lesson';
import { pc } from '../src/engine/pitch';

describe('the keyboard is a hint on degree ↔ name questions (0.50.2)', () => {
  it('asking for it marks the question and lowers its difficulty, once', () => {
    const q = noteNameQuestion('b', pc('Eb'), 6, false);
    expect(keyboardIsHint(q)).toBe(true);
    const h = withHint(q);
    expect(h.aid).toBe('lookup');
    expect(h.difficulty).toBeLessThan(q.difficulty);
    expect(withHint(h)).toBe(h);
  });
  it('singing targets are not counting hints; measuring lessons give no hints', () => {
    expect(keyboardIsHint(singQuestion('c', pc('C'), 5))).toBe(false);
    expect(noHints('placement')).toBe(true);
    expect(noHints('degrees-1')).toBe(false);
  });
});
