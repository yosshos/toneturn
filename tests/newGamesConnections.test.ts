// AUDIT-GAMES §4.2 new games — "everything connects": path units and bonus steps (with their difficulty floors), the
// games lists, the workout rotation, boards, glyphs, badges, tiers, key mastery, ratings, XP and tier clears.
import { describe, expect, it } from 'vitest';
import { GAME_STEPS, gameForArea } from '../src/engine/path';
import { BONUS_GAMES, bonusSteps } from '../src/engine/pathBonus';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { isKeyGame, gameKeyTitle, gameKeyFamily } from '../src/engine/gameKeys';
import { gameEvents } from '../src/engine/gameRating';
import { clearsRun, gameXp, tierSpec, TIERS } from '../src/engine/gameTiers';
import { boardGames } from '../src/engine/gameBoard';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { inCourse, type CourseId } from '../src/engine/courses';
import { TAKES_PER_RUN } from '../src/engine/instGames';

const NEW = ['guidetone', 'call5432', 'enclosure', 'crossword', 'holdnote'];

describe('the new games connect to everything', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[] };
  it('path: the played games in the keys / guitar / bass units, the ear games in the Ear course, all five in Jazz as bonus steps', () => {
    for (const c of ['keys', 'guitar', 'bass'] as const) {
      const seen = new Set<string>();
      for (let n = 0; n < 60; n++) {
        const g = gameForArea('instrument', n, { ...base, plays: [c], course: c }, 1400);
        if (g) seen.add(g);
      }
      for (const g of ['guidetone', 'enclosure', 'call5432']) expect([...seen], `${c} ${g}`).toContain(g);
    }
    const ear = new Set<string>();
    for (let n = 0; n < 40; n++) ear.add(gameForArea('pitch', n, { ...base, plays: [], course: 'ear' }, 1400) ?? '');
    expect([...ear]).toEqual(expect.arrayContaining(['crossword', 'holdnote']));
    // difficulty floors: not in the first units
    for (let n = 0; n < 30; n++) {
      expect(gameForArea('pitch', n, { ...base, plays: [], course: 'ear' }, 900)).not.toMatch(/crossword|holdnote/);
      expect(gameForArea('instrument', n, { ...base, plays: ['keys'], course: 'keys' }, 950)).not.toMatch(/guidetone|enclosure|call5432/);
    }
    const jazz = bonusSteps().filter((s) => s.id.startsWith('bonus:jazz:'));
    for (const g of NEW) {
      const s = jazz.find((x) => x.game === g)!;
      expect(s, g).toBeDefined();
      expect((['ear', 'jazz', 'voice', 'keys', 'guitar', 'bass', 'drums'] as CourseId[]).filter((c) => inCourse(s, c))).toEqual(['jazz']);
      expect(!!GAME_STEPS[g] && BONUS_GAMES.some((b) => b.game === g)).toBe(true);
    }
  });
  it('games lists, workout rotation, boards, glyphs, badges, tiers', () => {
    expect(COURSE_GAMES.jazz).toEqual(expect.arrayContaining(NEW));
    expect(COURSE_GAMES.ear).toEqual(expect.arrayContaining(['crossword', 'holdnote']));
    for (const c of ['keys', 'guitar', 'bass'] as const) expect(COURSE_GAMES[c]).toEqual(expect.arrayContaining(['guidetone', 'call5432', 'enclosure']));
    expect(WORKOUT_GAMES.ear).toContain('crossword');
    expect(WORKOUT_GAMES.jazz).toEqual(expect.arrayContaining(['crossword', 'holdnote']));
    for (const c of ['keys', 'guitar', 'bass'] as const) expect(WORKOUT_GAMES[c]).toContain('guidetone');
    expect(boardGames(COURSE_GAMES.jazz)).toEqual(expect.arrayContaining(NEW));
    const glyphs = NEW.map((g) => GAME_STEP_GLYPH[g]);
    for (const g of glyphs) expect(GLYPHS[g], g).toBeDefined();
    expect(new Set(glyphs).size).toBe(5);
    for (const g of NEW) {
      expect(GAME_BADGE_GAMES.some((b) => b.game === g), g).toBe(true);
      const spec = tierSpec(g)!;
      expect(spec, g).toBeTruthy();
      for (const t of TIERS) expect(spec.tiers[t].label.he, `${g} ${t}`).toMatch(/[א-ת]/);
    }
    expect(TAKES_PER_RUN.call5432).toBe(6);
    expect(TAKES_PER_RUN.enclosure).toBe(8);
  });
  it('key mastery for the played games; ratings, XP and tier clears for all five', () => {
    for (const g of ['guidetone', 'call5432', 'enclosure']) {
      expect(isKeyGame(g)).toBe(true);
      expect(gameKeyTitle(gameKeyFamily(g, 'piano'))?.en).toBeTruthy();
    }
    expect(isKeyGame('crossword')).toBe(false);
    const at = '2026-11-15T10:00:00Z';
    const runs: [string, number, Record<string, unknown>][] = [
      ['guidetone', 120, { right: 12, wrong: 1, best: 12, tier: 'p' }],
      ['call5432', 500, { accuracy: 85, rounds: 6, tier: 'pp' }],
      ['enclosure', 600, { accuracy: 90, rounds: 8, tier: 'mp' }],
      ['crossword', 450, { right: 4, wrong: 1, accuracy: 88, tier: 'mf' }],
      ['holdnote', 140, { right: 9, wrong: 1, tier: 'f' }],
    ];
    for (const [g, score, d] of runs) {
      expect(gameEvents(g, score, d, at, 's').length, g).toBeGreaterThan(0);
      expect(gameXp(g, d.tier as never, score, d), g).toBeGreaterThan(0);
      expect(clearsRun(g, d.tier as never, score, d), g).toBe(true);
    }
    expect(clearsRun('guidetone', 'p', 50, { right: 5, wrong: 1, best: 5 })).toBe(false);
    expect(clearsRun('holdnote', 'f', 50, { right: 6, wrong: 3 })).toBe(false);
  });
});
