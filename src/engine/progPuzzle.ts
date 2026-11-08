// The daily progression puzzle (0.53): one four-chord progression a day, the same for everyone. Hear it, guess it in
// Roman numerals, six tries; each slot comes back right (the chord in that place), present (in the progression but
// elsewhere) or absent — the rules of the word game everyone knows, on harmony. Pure.

export const PUZZLE_CHORDS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII'] as const;
export type PChord = (typeof PUZZLE_CHORDS)[number];
export type Slot = 'right' | 'present' | 'absent';

/** Real progressions (songs use them by the thousand); the daily one is drawn from these. */
export const PUZZLE_PROGS: PChord[][] = [
  ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'vi', 'IV', 'V'], ['I', 'IV', 'V', 'I'], ['I', 'IV', 'vi', 'V'],
  ['ii', 'V', 'I', 'vi'], ['I', 'iii', 'IV', 'V'], ['IV', 'V', 'iii', 'vi'], ['I', 'bVII', 'IV', 'I'], ['vi', 'V', 'IV', 'V'],
  ['I', 'V', 'IV', 'V'], ['IV', 'I', 'V', 'vi'], ['I', 'ii', 'IV', 'V'], ['vi', 'ii', 'V', 'I'], ['I', 'IV', 'ii', 'V'],
  ['I', 'vi', 'ii', 'V'], ['IV', 'V', 'I', 'I'], ['I', 'bVII', 'vi', 'V'], ['ii', 'IV', 'V', 'I'], ['I', 'iii', 'vi', 'IV'],
];
export const MAX_GUESSES = 6;

/** Days since 2026-01-01 (local date string yyyy-mm-dd) — the puzzle number. */
export function puzzleNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000) + 1;
}

/** The day's progression and key (deterministic). */
export function dailyPuzzle(day: string): { n: number; chords: PChord[]; key: number } {
  const n = puzzleNumber(day);
  let h = (n * 2654435761) >>> 0;
  const pick = (k: number) => {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return h % k;
  };
  return { n, chords: PUZZLE_PROGS[pick(PUZZLE_PROGS.length)], key: pick(12) };
}

/** Score a guess against the target (duplicates handled like the word game: a present mark only for unmatched copies). */
export function scoreGuess(guess: PChord[], target: PChord[]): Slot[] {
  const out: Slot[] = guess.map(() => 'absent');
  const left = new Map<PChord, number>();
  target.forEach((c, i) => {
    if (guess[i] === c) out[i] = 'right';
    else left.set(c, (left.get(c) ?? 0) + 1);
  });
  guess.forEach((c, i) => {
    if (out[i] === 'right') return;
    const k = left.get(c) ?? 0;
    if (k > 0) {
      out[i] = 'present';
      left.set(c, k - 1);
    }
  });
  return out;
}

export const solvedBy = (rows: Slot[][]) => rows.some((r) => r.every((s) => s === 'right'));

/** The share text: number, tries, and a grid of squares (no chord names — no spoilers). */
export function shareText(n: number, rows: Slot[][], lang: 'en' | 'he'): string {
  const won = solvedBy(rows);
  const head = lang === 'he' ? `החוש השביעי · מהלך היום #${n} · ${won ? rows.length : 'X'}/${MAX_GUESSES}` : `The 7th Sense · Progression #${n} · ${won ? rows.length : 'X'}/${MAX_GUESSES}`;
  const sq: Record<Slot, string> = { right: '🟩', present: '🟨', absent: '⬛' };
  return [head, ...rows.map((r) => r.map((s) => sq[s]).join(''))].join('\n');
}

/** Points for the day: 6 for a first-try solve down to 1 on the sixth; 0 when not solved. */
export const puzzlePoints = (rows: Slot[][]) => (solvedBy(rows) ? MAX_GUESSES + 1 - rows.length : 0);
