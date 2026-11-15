// AUDIT-GAMES (games fix, owner-approved): connections, all 12 keys, Hebrew parity bits, the duel's record, the
// retired / moved cards. Pure engine checks; the screens are covered by e2e/gamesFix.spec.ts.
import { describe, expect, it } from 'vitest';
import { GAME_STEPS, gameForArea } from '../src/engine/path';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { INST_KEYS, changeChords, changeKeyOf, rootsItem, walkChart } from '../src/engine/instGames';
import { RIFF_ROOTS, makeRiff } from '../src/engine/riffEcho';
import { WORKOUT_GAMES, suggestWorkout, workoutGame } from '../src/engine/workout2';
import { addGameKeyTakes, gameKeyFamily, gameKeyTitle, keyTakesOf, withGameKeys } from '../src/engine/gameKeys';
import { instrumentKeys, keyMastery } from '../src/engine/analysis/keyMastery';
import { NTS_TUNES } from '../src/engine/topicsAdvGames';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topicsAdvGames';
import { firstAwardsLine } from '../src/engine/achievements';
import { gameEvents } from '../src/engine/gameRating';
import { boardGames } from '../src/engine/gameBoard';
import { duelOutcome } from '../src/engine/tournament';
import { isoSegments } from '../src/ui/Iso';
import { makeTake } from '../src/engine/bhInTime';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import type { CourseId } from '../src/engine/courses';

const NEW_PATH_GAMES: [string, CourseId, string[]][] = [
  ['playback', 'keys', ['keys']],
  ['voicingsprint', 'keys', ['keys']],
  ['changerace', 'guitar', ['guitar']],
  ['rootsear', 'bass', ['bass']],
  ['walkchanges', 'bass', ['bass']],
  ['tuneup', 'guitar', ['guitar']],
  ['kitread', 'drums', ['drums']],
  ['namegroove', 'drums', ['drums']],
  ['singinterval', 'voice', []],
  ['harmonyhold', 'voice', []],
];

describe('the games that never reached the path are path games now', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[] };
  for (const [g, course, plays] of NEW_PATH_GAMES)
    it(`${g} sits in ${course} units (from its difficulty floor)`, () => {
      const area = GAME_STEPS[g].domain;
      const seen = new Set<string>();
      for (let n = 0; n < 40; n++) {
        const x = gameForArea(area, n, { ...base, plays, course }, 1400);
        if (x) seen.add(x);
      }
      expect([...seen]).toContain(g);
      expect(GLYPHS[GAME_STEP_GLYPH[g]], g).toBeDefined();
      // never in another course
      for (const c of ['ear', 'jazz'] as const) for (let n = 0; n < 20; n++) expect(gameForArea(area, n, { ...base, plays: [], course: c }, 1400)).not.toBe(g);
    });
  it('a harder game waits for its difficulty', () => {
    for (let n = 0; n < 30; n++) {
      expect(gameForArea('voice', n, { ...base, plays: [], course: 'voice' }, 800)).toBe('flight');
      expect(gameForArea('instrument', n, { ...base, plays: ['bass'], course: 'bass' }, 800)).not.toBe('walkchanges');
    }
  });
});

describe('the workout game rotates through the course', () => {
  it('a game of the course per day, Highway without a course', () => {
    expect(workoutGame()).toBe('highway');
    for (const c of Object.keys(WORKOUT_GAMES) as CourseId[]) {
      const days = Array.from({ length: 14 }, (_, i) => workoutGame(c, `2026-11-${String(i + 1).padStart(2, '0')}`));
      expect(new Set(days).size).toBe(WORKOUT_GAMES[c].length);
      for (const g of days) expect(COURSE_GAMES[c].includes(g) || g === 'highway', `${c} ${g}`).toBe(true);
    }
  });
  it('suggestWorkout uses it', () => {
    const view = { units: [], history: [], current: null, progress: { done: 0, checked: 0, total: 0 }, sections: [], freeze: null } as never;
    const bs = suggestWorkout({ total: 20, goal: 'general', priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, course: 'ear', day: '2026-11-16' });
    const g = bs.find((b) => b.target.kind === 'game');
    expect(g && g.target.kind === 'game' && g.target.game).toBe(workoutGame('ear', '2026-11-16'));
  });
});

describe('all 12 keys', () => {
  const pcs = (xs: number[]) => new Set(xs.map((k) => ((k % 12) + 12) % 12)).size;
  it('the shared pool has 12 keys', () => expect(pcs(INST_KEYS)).toBe(12));
  it('Walk the Changes: blues and rhythm changes in every key', () => {
    for (const lv of [1, 2, 4, 5]) expect(pcs(Array.from({ length: 400 }, (_, s) => walkChart(s, lv).key)), `level ${lv}`).toBe(12);
  });
  it('Roots by Ear and Chord Change Race use all 12', () => {
    expect(pcs(Array.from({ length: 400 }, (_, s) => rootsItem(s, 2).key))).toBe(12);
    const keys = Array.from({ length: 400 }, (_, s) => changeKeyOf(s, 4)!);
    expect(pcs(keys)).toBe(12);
    // changeKeyOf is the key the items are built in (level 4 starts on Imaj7 or ii7)
    for (let s = 0; s < 30; s++) expect([0, 2]).toContain((changeChords(s, 4)[0].root - changeKeyOf(s, 4)! + 12) % 12);
    expect(changeKeyOf(5, 2)).toBeNull();
  });
  it('Riff Echo: 12 roots per instrument', () => {
    for (const inst of ['bass', 'guitar', 'keys'] as const) {
      expect(pcs(RIFF_ROOTS[inst])).toBe(12);
      expect(makeRiff(3, 2, inst).bars.length).toBeGreaterThan(0);
    }
  });
});

describe('key-relative games feed key mastery', () => {
  it('takes become key cells per game and instrument', () => {
    const at = '2026-11-15T10:00:00Z';
    let cells = addGameKeyTakes(undefined, 'walkchanges', 'bass', [{ key: 1, acc: 90, bpm: 120 }, { key: 1, acc: 85, bpm: 120 }, { key: 1, acc: 95, bpm: 120 }], at);
    cells = addGameKeyTakes(cells, 'walkchanges', 'bass', [{ key: 6, acc: 30, bpm: 120 }, { key: 6, acc: 40 }, { key: 6, acc: 20 }], at);
    const sk = keyMastery(cells, at).find((s) => s.family === gameKeyFamily('walkchanges', 'bass'))!;
    expect(sk.cells[1].status).not.toBe('untried');
    expect(sk.cells[6].status).toBe('weak');
    const inst = instrumentKeys(withGameKeys({}, cells), at);
    expect(inst.map((i) => i.instrument)).toEqual(['bass']);
    expect(inst[0].weakest).toContain(6);
    expect(gameKeyTitle(sk.family)?.he).toBe('ללכת על המהלך');
  });
  it('a result detail carries them (keyInst + keyTakes)', () => {
    expect(keyTakesOf({ keyInst: 'piano', keyTakes: [{ key: 2, acc: 80 }] })?.takes).toHaveLength(1);
    expect(keyTakesOf({ accuracy: 80 })).toBeNull();
  });
  it('Barry Harris in Time takes know their key', () => {
    const t = makeTake(1 as never, 120, 77);
    expect(t.key).toBeGreaterThanOrEqual(0);
    expect(t.key).toBeLessThan(12);
  });
});

describe('Hebrew parity', () => {
  it('Name That Standard: Hebrew names for the forms, "Bird blues" short', () => {
    const he = Object.fromEntries(NTS_TUNES.filter((t) => t.he).map((t) => [t.id, t.he]));
    expect(he['blues-f']).toBe('בלוז ג׳אז');
    expect(he['minor-blues']).toBe('בלוז מינורי');
    expect(he['rhythm-full']).toBe('ריתם צ׳יינג׳ס');
    expect(NTS_TUNES.find((t) => t.id === 'bird-blues')!.name).toBe('Bird blues');
    for (let s = 0; s < 30; s++) {
      const q = TOPIC_GEN['name-standard'].gen(s, 1, `q${s}`) as { names: Record<string, { en: string; he: string }> };
      if (q.names['blues-f']) expect(q.names['blues-f'].he).toBe('בלוז ג׳אז');
    }
  });
  it('mixed text isolates its Latin runs', () => {
    expect(isoSegments('ii במקום IV')).toEqual([{ ltr: 'ii' }, ' במקום ', { ltr: 'IV' }]);
    expect(isoSegments('I – IV – I – V')).toEqual([{ ltr: 'I – IV – I – V' }]);
    expect(isoSegments('בלוז ג׳אז')).toEqual(['בלוז ג׳אז']);
    // a Hebrew prefix glued to a Latin word keeps the prefix outside the isolate
    expect(isoSegments('תופים ב-MIDI, או פד')).toEqual(['תופים ב-', { ltr: 'MIDI,' }, ' או פד']);
    expect(isoSegments('במקלדת ה־MIDI — הוא')).toEqual(['במקלדת ה־', { ltr: 'MIDI' }, ' — הוא']);
  });
  it('the first-launch awards toast: language and plural', () => {
    expect(firstAwardsLine(1, 'en')).not.toMatch(/1 awards/);
    expect(firstAwardsLine(3, 'en')).toMatch(/^3 awards/);
    expect(firstAwardsLine(1, 'he')).toMatch(/פרס אחד/);
    expect(firstAwardsLine(2, 'he')).not.toMatch(/[A-Za-z]/);
  });
});

describe('the duel records like every game', () => {
  it('the owner side: score, right / wrong, tier; rating events; a board', () => {
    const v = {
      standings: [{ player: 0, points: 300 }, { player: 1, points: 200 }],
      results: [{ answers: [{ correct: true }, { correct: false }] }, { answers: [{ correct: false }, { correct: true }] }, { answers: [{ correct: true }, { correct: true }] }],
    } as never;
    const o = duelOutcome(v, 'chords', 'mf', 42);
    expect(o.score).toBe(300);
    expect(o.detail).toMatchObject({ right: 2, wrong: 1, tier: 'mf', won: true, kind: 'chords' });
    const evs = gameEvents('duel', o.score, o.detail, '2026-11-15T10:00:00Z', 's1');
    expect(evs.length).toBe(3);
    expect(evs[0].skill).toBe('chords');
    expect(boardGames(['duel', 'daily'])).toEqual(['duel']);
  });
});

describe('retired and moved cards', () => {
  it('no Technique card, no Odd-meter Echo card, Pitch Memory and the groove trainer off the lists', () => {
    for (const c of Object.keys(COURSE_GAMES) as CourseId[]) {
      expect(COURSE_GAMES[c]).not.toContain('drills');
      expect(COURSE_GAMES[c]).not.toContain('odd-echo');
      expect(COURSE_GAMES[c]).not.toContain('pitchmemory');
      expect(COURSE_GAMES[c]).not.toContain('groove');
    }
    expect(COURSE_GAMES.drums).toContain('groove-echo');
    expect(COURSE_GAMES.drums).not.toContain('rhythm');
    // the odd-meter path step still opens (its route is Groove Echo's odd mode)
    expect(GAME_STEPS['odd-echo']).toBeDefined();
  });
});
