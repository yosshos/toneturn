import { describe, expect, it } from 'vitest';
import { dailyPuzzle, puzzleNumber, puzzlePoints, scoreGuess, shareText, solvedBy } from '../src/engine/progPuzzle';

describe('daily progression puzzle', () => {
  it('is the same for a day and changes between days', () => {
    expect(dailyPuzzle('2026-11-09')).toEqual(dailyPuzzle('2026-11-09'));
    const days = Array.from({ length: 30 }, (_, i) => dailyPuzzle(`2026-12-${String(i + 1).padStart(2, '0')}`).chords.join());
    expect(new Set(days).size).toBeGreaterThan(8);
    expect(puzzleNumber('2026-01-01')).toBe(1);
  });
  it('scores like the word game, duplicates included', () => {
    expect(scoreGuess(['I', 'V', 'vi', 'IV'], ['I', 'V', 'vi', 'IV'])).toEqual(['right', 'right', 'right', 'right']);
    expect(scoreGuess(['I', 'IV', 'V', 'vi'], ['I', 'V', 'vi', 'IV'])).toEqual(['right', 'present', 'present', 'present']);
    // target has one I: only the first unmatched I is present
    expect(scoreGuess(['V', 'I', 'I', 'ii'], ['I', 'V', 'vi', 'IV'])).toEqual(['present', 'present', 'absent', 'absent']);
    // target I–IV–V–I: guess I–I–I–I → right, absent, absent, right
    expect(scoreGuess(['I', 'I', 'I', 'I'], ['I', 'IV', 'V', 'I'])).toEqual(['right', 'absent', 'absent', 'right']);
  });
  it('shares a grid without the answer, and gives points by tries', () => {
    const rows = [scoreGuess(['I', 'IV', 'V', 'vi'], ['I', 'V', 'vi', 'IV']), scoreGuess(['I', 'V', 'vi', 'IV'], ['I', 'V', 'vi', 'IV'])];
    expect(solvedBy(rows)).toBe(true);
    expect(puzzlePoints(rows)).toBe(5);
    const t = shareText(42, rows, 'en');
    expect(t).toContain('#42');
    expect(t).toContain('2/6');
    expect(t).not.toMatch(/IV|vi/);
  });
});
