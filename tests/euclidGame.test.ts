// Euclid (owner 2026-11-19): the game's items, grading and run, and its links to everything (path, bonus step, games
// list, workout, glyph, badge, tiers, ratings, XP), plus where the three new topics sit.
import { describe, expect, it } from 'vitest';
import { EUCLID_CYCLES, EUCLID_ITEMS, bjorklund, euclidAnswer, euclidItem, euclidResult, isEuclidSave, isRotation, judgeSlots, judgeTaps, newEuclidSave, onsetsOf, rotate } from '../src/engine/euclid';
import { GAME_PREREQ, GAME_STEPS, STEP_PREREQ, gameForArea, stepCatalogue } from '../src/engine/path';
import { BONUS_GAMES, bonusSteps } from '../src/engine/pathBonus';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { gameEvents } from '../src/engine/gameRating';
import { clearsRun, gameXp, tierSpec, TIERS } from '../src/engine/gameTiers';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { inCourse } from '../src/engine/courses';
import { lessonForUnit } from '../src/content/minilessons';
import { TOPIC_MARK } from '../src/ui/stepMarks';
import { hasShortName, shortName } from '../src/engine/pathNames';

const SEEDS = Array.from({ length: 30 }, (_, i) => 500 + i * 7919);

describe('Euclid: items and grading', () => {
  it('items: E(k, n) or a rotation of it, the mode by level', () => {
    for (const s of SEEDS)
      for (let lv = 1; lv <= 6; lv++)
        for (let i = 0; i < EUCLID_ITEMS; i++) {
          const it = euclidItem(s, lv, i);
          expect(it.pattern).toBe(rotate(bjorklund(it.k, it.n), it.rot));
          expect(it.pattern[0]).toBe('x');
          if (lv <= 3) expect(it.rot).toBe(0);
          expect(it.mode).toBe(lv === 6 ? 'tap' : lv >= 2 && lv <= 3 && i % 3 === 2 ? 'spread' : 'match');
        }
    const rotated = SEEDS.flatMap((s) => Array.from({ length: EUCLID_ITEMS }, (_, i) => euclidItem(s, 4, i))).filter((x) => x.rot > 0);
    expect(rotated.length).toBeGreaterThan(SEEDS.length * 4);
    for (const x of rotated) expect(x.pattern).not.toBe(bjorklund(x.k, x.n));
  });
  it('slots: match needs the exact circle; spread takes any rotation of E(k, n)', () => {
    const m = { k: 3, n: 8, rot: 0, pattern: 'x..x..x.', mode: 'match' as const };
    expect(judgeSlots(m, 'x..x..x.').exact).toBe(true);
    expect(judgeSlots(m, 'x..x.x..').exact).toBe(false);
    expect(judgeSlots(m, 'x..x....').accuracy).toBeCloseTo(2 / 3);
    const sp = { ...m, mode: 'spread' as const };
    expect(judgeSlots(sp, '.x..x..x').exact).toBe(true);
    expect(isRotation('x..x..x.', '.x..x..x')).toBe(true);
    expect(judgeSlots(sp, 'xx.x....').exact).toBe(false);
  });
  it('taps: every hit within 0.4 pulse over both cycles; misses and extras count', () => {
    const it = { k: 3, n: 8, rot: 0, pattern: 'x..x..x.', mode: 'tap' as const };
    const on = onsetsOf(it.pattern);
    const all = Array.from({ length: EUCLID_CYCLES }, (_, c) => on.map((o) => c * 8 + o + 0.15)).flat();
    expect(judgeTaps(it, all).exact).toBe(true);
    expect(judgeTaps(it, all.slice(1)).exact).toBe(false);
    expect(judgeTaps(it, all.map((x) => x + 0.6)).hits).toBe(0);
    expect(judgeTaps(it, [...all, 1.5, 4.5]).exact).toBe(false);
  });
  it('a run: rights clear the tier, wrongs do not; saved runs resume', () => {
    let s = newEuclidSave(9, 2, 'p');
    expect(isEuclidSave(s)).toBe(true);
    for (let i = 0; i < EUCLID_ITEMS; i++) s = euclidAnswer(s, true, 3).save;
    expect(isEuclidSave(s)).toBe(false);
    const r = euclidResult(s);
    expect(r.detail.right).toBe(EUCLID_ITEMS);
    expect(r.score).toBeGreaterThan(EUCLID_ITEMS * 10);
    expect(clearsRun('euclid', 'p', r.score, r.detail)).toBe(true);
    let w = newEuclidSave(9, 2, 'p');
    for (let i = 0; i < EUCLID_ITEMS; i++) w = euclidAnswer(w, false, 3).save;
    expect(clearsRun('euclid', 'p', euclidResult(w).score, euclidResult(w).detail)).toBe(false);
    // faster scores more
    expect(euclidAnswer(newEuclidSave(1, 3), true, 2).gained).toBeGreaterThan(euclidAnswer(newEuclidSave(1, 3), true, 15).gained);
  });
});

describe('Euclid connects to everything', () => {
  const base = { noMic: false, noSing: false, packs: [] as never[], plays: [] as string[] };
  it('path: the Ear course\'s time units from its floor, after the topic; the Ear bonus step; games list; workout', () => {
    expect(GAME_STEPS.euclid.domain).toBe('time');
    const got = new Set<string>();
    for (let n = 0; n < 20; n++) got.add(gameForArea('time', n, { ...base, course: 'ear' }, 1450) ?? '');
    expect(got.has('euclid')).toBe(true);
    for (let n = 0; n < 20; n++) expect(gameForArea('time', n, { ...base, course: 'ear' }, 1100)).not.toBe('euclid');
    expect(GAME_PREREQ.euclid).toContain('topic:euclid-rhythms:1');
    const b = bonusSteps().find((x) => x.game === 'euclid')!;
    expect(b && inCourse(b, 'ear')).toBe(true);
    expect(BONUS_GAMES.some((x) => x.game === 'euclid' && x.course === 'ear')).toBe(true);
    expect(COURSE_GAMES.ear).toContain('euclid');
    expect(WORKOUT_GAMES.ear).toContain('euclid');
  });
  it('its own glyph, a badge, tiers in Hebrew, ratings, XP, clears', () => {
    const g = GAME_STEP_GLYPH.euclid;
    expect(GLYPHS[g]).toBeDefined();
    expect(Object.entries(GAME_STEP_GLYPH).filter(([, v]) => v === g).map(([k]) => k)).toEqual(['euclid']);
    expect(GAME_BADGE_GAMES.some((x) => x.game === 'euclid')).toBe(true);
    const spec = tierSpec('euclid')!;
    for (const t of TIERS) expect(spec.tiers[t].label.he, t).toMatch(/[א-ת]/);
    const at = '2026-11-19T10:00:00Z';
    for (const [tier, level] of [['mf', 4], ['ff', 6]] as const) {
      const d = { right: 7, wrong: 1, tier, level };
      const ev = gameEvents('euclid', 140, d, at, 's');
      expect(ev.length).toBeGreaterThan(0);
      expect(ev[0].skill).toBe('rhythm-dictation');
      expect(gameXp('euclid', tier, 140, d)).toBeGreaterThan(0);
      expect(clearsRun('euclid', tier, 140, d)).toBe(true);
    }
    expect(lessonForUnit('game:euclid')?.id).toBe('euclid-rhythms');
  });
});

describe('the three topics on the path', () => {
  const cat = stepCatalogue();
  it('post-tonal pack for Messiaen and rows; Euclid in the Ear course with the rhythm ear', () => {
    for (const t of ['messiaen-modes', 'twelve-tone']) for (let l = 1; l <= 4; l++) expect(cat.find((s) => s.id === `topic:${t}:${l}`)?.pack).toBe('post-tonal');
    for (let l = 1; l <= 4; l++) {
      const s = cat.find((x) => x.id === `topic:euclid-rhythms:${l}`)!;
      expect(s.pack).toBeUndefined();
      expect(s.domain).toBe('time');
      expect(inCourse(s, 'ear')).toBe(true);
    }
  });
  it('order: after set-classes, then rows; Euclid after the tresillo and syncopation, rotations after displacement', () => {
    expect(STEP_PREREQ['topic:messiaen-modes:1']).toEqual(expect.arrayContaining(['topic:set-classes:1', 'topic:scale-types:4']));
    expect(STEP_PREREQ['topic:twelve-tone:1']).toEqual(expect.arrayContaining(['topic:messiaen-modes:1', 'topic:melodic-transform:1']));
    expect(STEP_PREREQ['topic:euclid-rhythms:1']).toEqual(expect.arrayContaining(['lesson:rhythm-r3', 'topic:syncopation:1']));
    expect(STEP_PREREQ['topic:euclid-rhythms:4']).toContain('topic:displacement:1');
    const d = (id: string) => cat.find((s) => s.id === id)!.difficulty;
    expect(d('topic:messiaen-modes:1')).toBeGreaterThan(d('topic:set-classes:1'));
    expect(d('topic:twelve-tone:1')).toBeGreaterThan(d('topic:messiaen-modes:1'));
  });
  it('each opens with its own lesson, name and mark', () => {
    for (const t of ['messiaen-modes', 'twelve-tone', 'euclid-rhythms']) {
      expect(lessonForUnit(`topic:${t}`)?.id).toBe(t);
      expect(TOPIC_MARK[t]).toBeTruthy();
      expect(hasShortName(t)).toBe(true);
      expect(shortName(t, { en: '', he: '' }, 'he')).toMatch(/[א-ת]/);
    }
  });
});
