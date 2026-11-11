// Single-player games count (product owner, 0.38): every finished game becomes rated answers in the skills it
// trains, so ratings, sub-skills, stats — and, after a few games, the path (✓ evidence, the frontier) — move.
// Each game gives a handful of events (not one per frame): right / wrong answers where the game counts them,
// otherwise its accuracy spread over a few rounds. Events carry the game's tags; ids start with "g:" (game
// events survive a cloud rebuild, spec AD). Pure.

import type { RatingEvent } from './rating';
import type { SkillId } from './lesson';
import { isTier, runDifficulty } from './gameTiers';

/** The topic level a Rush run ended on (tiered runs report it as "topic#level"), as [topic, level]. */
const rungOf = (d: Record<string, unknown>): [string, number] | null => {
  const m = typeof d.rung === 'string' ? /^(.+)#(\d+)$/.exec(d.rung) : null;
  return m ? [m[1], Number(m[2])] : null;
};

type Tag = { skill: SkillId; sub: string; w: number };
const T = (skill: SkillId, sub: string): Tag[] => [{ skill, sub: `${skill}/${sub}`, w: 1 }];
const T2 = (a: [SkillId, string, number], b: [SkillId, string, number]): Tag[] => [
  { skill: a[0], sub: `${a[0]}/${a[1]}`, w: a[2] },
  { skill: b[0], sub: `${b[0]}/${b[1]}`, w: b[2] },
];

/** The skills each game trains (primary first) and its difficulty by level. */
const GAMES: Record<string, { tags: (d: Record<string, unknown>) => Tag[]; diff: (d: Record<string, unknown>) => number }> = {
  highway: { tags: () => T2(['rhythm-reading', 'read', 0.7], ['timing', 'precision', 0.3]), diff: (d) => 850 + 90 * (Number(d.level) || 1) },
  flight: { tags: (d) => (d.input === 'instrument' || d.input === 'midi' ? T('instrument', 'echo') : T('singing', 'match')), diff: (d) => 900 + 120 * (Number(d.level) || Number(d.startLevel) || 1) },
  'melodypuzzle': { tags: () => T2(['dictation', 'melodic', 0.6], ['sequences', 'melody', 0.4]), diff: (d) => 950 + 90 * (Number(d.topLevel) || Number(d.startLevel) || 1) },
  'melody-puzzle': { tags: () => T2(['dictation', 'melodic', 0.6], ['sequences', 'melody', 0.4]), diff: (d) => 950 + 90 * (Number(d.topLevel) || Number(d.startLevel) || 1) },
  nametune: { tags: () => T2(['sequences', 'melody', 0.7], ['intervals', 'songs', 0.3]), diff: () => 1050 },
  tuneup: { tags: () => T('pitch', 'in-tune'), diff: () => 1300 },
  pitchmemory: { tags: () => T('absolute', 'name'), diff: () => 1400 },
  peakhunter: { tags: () => T('timbre', 'eq'), diff: (d) => 1000 + 150 * (Number(d.level) || 1) },
  'rush-chord': { tags: (d) => ((rungOf(d)?.[1] ?? Number(d.level)) >= 4 ? T('chords', 'inversion') : T('chords', 'quality')), diff: (d) => 900 + 100 * (Number(d.level) || 1) },
  'rush-note': { tags: () => T('notes', 'staff'), diff: (d) => 900 + 120 * (Number(d.level) || 1) },
  'rush-fretboard': { tags: () => T('instrument', 'fretboard'), diff: (d) => 850 + 120 * (Number(d.level) || 1) },
  'rush-interval': { tags: (d) => { const r = rungOf(d); return (r ? (r[0] === 'intervals-all' && r[1] === 3) || (r[0] === 'compound-intervals' && r[1] === 3) : Number(d.level) === 3) ? T('intervals', 'harmonic') : T('intervals', 'melodic'); }, diff: (d) => 950 + 120 * (Number(d.level) || 1) },
  'rush-keysig': { tags: () => T('theory', 'keys'), diff: (d) => 900 + 130 * (Number(d.level) || 1) },
  'rush-progression': { tags: () => T2(['cadences', 'progression', 0.7], ['cadences', 'dictation', 0.3]), diff: (d) => 1050 + 120 * (Number(d.level) || 1) },
};

/** Normalised accuracy 0..1 of a finished game from what it reports. */
export function gameAccuracy(game: string, score: number, d: Record<string, unknown>): number {
  const n = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : null);
  if (n('right') !== null && n('wrong') !== null) return n('right')! / Math.max(1, n('right')! + n('wrong')!);
  if (game === 'highway') return Math.max(0, Math.min(1, score / 100));
  if (game === 'tuneup') return n('meanCents') === null ? 0.5 : Math.max(0, Math.min(1, 1 - (n('meanCents')! - 3) / 30));
  if (game === 'pitchmemory') return Math.max(0, Math.min(1, score / 100));
  if (game === 'peakhunter') return n('meanOctaves') === null ? Math.max(0, Math.min(1, score / 1000)) : Math.max(0, Math.min(1, 1 - n('meanOctaves')!));
  if (game === 'nametune') return Math.max(0, Math.min(1, score / (n('max') ?? 1000)));
  if (game === 'flight') {
    const g = n('gates') ?? 0;
    const miss = n('misses') ?? n('crashes') ?? Math.max(0, 3 - (n('lives') ?? 3));
    return g + miss ? g / (g + miss) : 0;
  }
  if (game === 'melodypuzzle' || game === 'melody-puzzle') return Math.max(0, Math.min(1, score / (n('max') ?? Math.max(1, (n('puzzles') ?? 6) * 100))));
  return Math.max(0, Math.min(1, score / 100));
}

/**
 * The rating events of a finished single-player game (none for touch-steered Flight, which trains no pitch, or
 * when the game is unknown). Right / wrong counts become that many events (at most 12); otherwise the accuracy
 * is spread over `rounds` events (3–6), each graded with the accuracy as its score.
 */
export function gameEvents(game: string, score: number, detail: unknown, at: string, sessionId: string): RatingEvent[] {
  const d = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  const g = GAMES[game];
  if (!g) return [];
  if (game === 'flight' && d.input === 'touch') return [];
  const tags = g.tags(d);
  const skill = tags[0].skill;
  // Tiered runs (engine/gameTiers.ts): the tier's rating band, so an ff run is ff evidence.
  const difficulty = isTier(d.tier) ? runDifficulty(game, d.tier, d) : Math.round(g.diff(d));
  const out: RatingEvent[] = [];
  const right = typeof d.right === 'number' ? (d.right as number) : null;
  const wrong = typeof d.wrong === 'number' ? (d.wrong as number) : null;
  if (right !== null && wrong !== null && right + wrong > 0) {
    const total = Math.min(12, right + wrong);
    const r = Math.round((right / (right + wrong)) * total);
    for (let i = 0; i < total; i++) out.push({ id: `g:${game}:${sessionId}:${i}`, skill, difficulty, correct: i < r, tags, at });
    return out;
  }
  const acc = gameAccuracy(game, score, d);
  const rounds = Math.max(3, Math.min(6, Number(d.rounds) || Number(d.puzzles) || 4));
  for (let i = 0; i < rounds; i++) out.push({ id: `g:${game}:${sessionId}:${i}`, skill, difficulty, correct: acc >= 0.7, score: Math.round(acc * 1000) / 1000, tags, at });
  return out;
}
