// Mirror (negative harmony game): the theory note for note, every item in every tier spelled cleanly, the run, and the
// six links (rated events, XP, path step in the Jazz course, workout, games list / boards, badge and glyph).
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { CADENCES, MIRROR_ITEMS, MIRROR_KEYS, chordOf, chordPcs, isMirrorSave, mirrorAnswer, mirrorChord, mirrorItem, mirrorOver, mirrorPc, mirrorResult, mirrorSp, newMirrorSave, niceName, roundMs, spName, kindOf } from '../src/engine/mirrorGame';
import { mirror } from '../src/engine/topicsHarmony3';
import { GAME_STEPS, GAME_PREREQ } from '../src/engine/path';
import { BONUS_GAMES, bonusSteps } from '../src/engine/pathBonus';
import { COURSE_GAMES, courseGames } from '../src/ui/courseRows';
import { inCourse } from '../src/engine/courses';
import { JAZZ_WORKOUT_GAMES } from '../src/engine/workout2';
import { gameEvents } from '../src/engine/gameRating';
import { clearsRun, gameXp, tierSpec, TIERS } from '../src/engine/gameTiers';
import { boardGames } from '../src/engine/gameBoard';
import { GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { GAMES2, GAME_GLYPH } from '../src/ui/Arcade';
import { UNIT_LESSON } from '../src/content/units';

const C = { l: 0, a: 0 };
const set = (xs: number[]) => [...new Set(xs.map((x) => ((x % 12) + 12) % 12))].sort((a, b) => a - b);

describe('the theory (axis between ♭3 and 3 of the tonic)', () => {
  it('notes: in C, C ↔ G, D ↔ F, E ↔ E♭, A ↔ B♭, B ↔ A♭ — spelled by letter; the same as the topic', () => {
    const n = (l: number, a: number) => spName(mirrorSp(C, { l, a }));
    expect([n(0, 0), n(4, 0), n(1, 0), n(3, 0), n(2, 0), n(2, -1), n(5, 0), n(6, -1), n(6, 0), n(5, -1)]).toEqual(['G', 'C', 'F', 'D', 'E♭', 'E', 'B♭', 'A', 'A♭', 'B']);
    for (let k = 0; k < 12; k++) for (let p = 0; p < 12; p++) expect(mirrorPc(k, p)).toBe(mirror(k, p));
  });
  it('chords: G7 → Fm6, Dm7 → Gm7, Cmaj7 → A♭maj7, Fmaj7 → E♭maj7, Am7 → Cm7, Em7 → Fm7, Bø7 → B♭7; C → Cm, F → Gm, G → Fm', () => {
    const m = (root: { l: number; a: number }, q: Parameters<typeof chordOf>[1]) => mirrorChord(C, chordOf(root, q)).name;
    expect(m({ l: 4, a: 0 }, '7')).toBe('Fm6');
    expect(m({ l: 1, a: 0 }, 'm7')).toBe('Gm7');
    expect(m({ l: 0, a: 0 }, 'maj7')).toBe('A♭maj7');
    expect(m({ l: 3, a: 0 }, 'maj7')).toBe('E♭maj7');
    expect(m({ l: 5, a: 0 }, 'm7')).toBe('Cm7');
    expect(m({ l: 2, a: 0 }, 'm7')).toBe('Fm7');
    expect(m({ l: 6, a: 0 }, 'm7b5')).toBe('B♭7');
    expect(m({ l: 0, a: 0 }, 'maj')).toBe('Cm');
    expect(m({ l: 3, a: 0 }, 'maj')).toBe('Gm');
    expect(m({ l: 4, a: 0 }, 'maj')).toBe('Fm');
    expect(m({ l: 6, a: 0 }, 'dim')).toBe('D°');
    // the mirror's notes really are the reflection, in every key
    for (const K of MIRROR_KEYS)
      for (const q of ['maj', 'm', 'maj7', 'm7', '7', 'm7b5'] as const) {
        const c = chordOf(K.sp, q);
        expect(set(chordPcs(mirrorChord(K.sp, c))), `${c.name}`).toEqual(set(chordPcs(c).map((p) => mirrorPc(K.pc, p))));
      }
  });
});

describe('items', () => {
  it('every tier: the answer is among the options, the options are distinct, every name reads cleanly', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let seed = 1; seed < 60; seed++)
        for (let i = 0; i < MIRROR_ITEMS; i++) {
          const q = mirrorItem(seed * 7919, lv, i);
          expect(q.kind).toBe(kindOf(lv, i));
          for (const n of [q.keyName, ...q.axis, ...q.axis2, ...q.cells]) expect(niceName(n), `${n} (${q.keyName})`).toBe(true);
          if (q.kind === 'note') {
            expect(q.answer).toBe(`n${mirrorPc(q.key, q.src.pcs[0])}`);
            continue;
          }
          expect(q.choices.length).toBe(4);
          expect(new Set(q.choices.map((c) => c.id)).size).toBe(4);
          expect(q.choices.map((c) => c.id)).toContain(q.answer);
          for (const c of q.choices) for (const part of c.label.split(' · ')) expect(niceName(part.replace(/(maj7|m7♭5|m7|m6|7|m|°)$/, '')), `${part} in ${q.keyName}`).toBe(true);
          // the mirror is the reflection of what sounded, chord by chord
          const a = q.src.chords!;
          const b = q.mir.chords!;
          expect(a.length).toBe(b.length);
          a.forEach((c, j) => {
            if (q.kind === 'cadence' && j === a.length - 1) expect(b[j].pcs).toEqual(c.pcs); // the tonic stays I
            else expect(set(b[j].pcs)).toEqual(set(c.pcs.map((p) => mirrorPc(q.key, p))));
          });
        }
  });
  it('pp asks the seven notes of C, G and F; p any note in eight keys', () => {
    const keys1 = new Set<string>();
    for (let s = 0; s < 80; s++) for (let i = 0; i < MIRROR_ITEMS; i++) keys1.add(mirrorItem(s, 1, i).keyName);
    expect([...keys1].sort()).toEqual(['C', 'F', 'G']);
    const keys2 = new Set<string>();
    for (let s = 0; s < 80; s++) for (let i = 0; i < MIRROR_ITEMS; i++) keys2.add(mirrorItem(s, 2, i).keyName);
    expect(keys2.size).toBe(8);
  });
  it('cadences: ii–V–I in C mirrors to Gm7 · Fm6 → C', () => {
    expect(CADENCES.map((c) => c.id)).toEqual(['V7-I', 'ii-V-I', 'IV-V-I', 'vi-ii-V-I']);
    let found = false;
    for (let s = 0; s < 400 && !found; s++)
      for (let i = 0; i < MIRROR_ITEMS; i++) {
        const q = mirrorItem(s, 5, i);
        if (q.keyName === 'C' && q.src.label === 'Dm7 · G7') {
          expect(q.answer).toBe('Gm7 · Fm6');
          found = true;
        }
      }
    expect(found).toBe(true);
  });
});

describe('the run', () => {
  it('rounds speed up; a right answer scores more when fast; late or wrong costs a life', () => {
    expect(roundMs(3, 5)).toBeLessThan(roundMs(3, 0));
    expect(roundMs(3, 11)).toBeGreaterThanOrEqual(Math.round(8000 * 0.55));
    let s = newMirrorSave(42, 3, 'mp');
    expect(isMirrorSave(s)).toBe(true);
    const q = mirrorItem(s.seed, s.level, 0);
    const fast = mirrorAnswer(s, q.answer, 300);
    const slow = mirrorAnswer(s, q.answer, roundMs(3, 0) - 100);
    expect(fast.ok && slow.ok).toBe(true);
    expect(fast.gained).toBeGreaterThan(slow.gained);
    expect(mirrorAnswer(s, q.answer, roundMs(3, 0) + 50).ok).toBe(false);
    expect(mirrorAnswer(s, null, 99999).save.lives).toBe(2);
    for (let i = 0; i < MIRROR_ITEMS; i++) s = mirrorAnswer(s, mirrorItem(s.seed, s.level, s.i).answer, 500).save;
    expect(mirrorOver(s)).toBe(true);
    const r = mirrorResult(s);
    expect(r.detail).toMatchObject({ right: MIRROR_ITEMS, wrong: 0, level: 3, tier: 'mp' });
  });
});

describe('Mirror connects to everything', () => {
  const at = '2026-11-19T10:00:00Z';
  it('rated events (theory/harmony; cadences at f+), XP, tiers in Hebrew, clears', () => {
    const spec = tierSpec('mirror')!;
    for (const t of TIERS) expect(spec.tiers[t].label.he, t).toMatch(/[א-ת]/);
    const d = { right: 10, wrong: 2, level: 3, tier: 'mp' };
    const ev = gameEvents('mirror', 150, d, at, 's');
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.every((e) => e.tags?.some((t) => t.sub === 'theory/harmony') ?? true)).toBe(true);
    const ev5 = gameEvents('mirror', 150, { ...d, level: 5, tier: 'f' }, at, 's');
    expect(JSON.stringify(ev5)).toContain('cadences/cadence');
    expect(gameXp('mirror', 'mf', 150, d)).toBeGreaterThan(0);
    expect(clearsRun('mirror', 'mf', 150, d)).toBe(true);
    expect(clearsRun('mirror', 'mf', 50, { right: 5, wrong: 5 })).toBe(false);
  });
  it('a jazz bonus step of the Ear course after negative harmony 1; workout; games list; boards (SPEC-JAZZ-FOLD)', () => {
    expect(GAME_STEPS.mirror).toBeDefined();
    expect(BONUS_GAMES.find((b) => b.game === 'mirror')?.course).toBe('jazz');
    const st = bonusSteps().find((s) => s.id === 'bonus:jazz:mirror')!;
    expect(st.pack).toBe('jazz');
    expect(inCourse(st, 'ear')).toBe(true);
    expect(GAME_PREREQ.mirror).toEqual(['topic:negative-harmony:1']);
    expect(JAZZ_WORKOUT_GAMES.ear).toContain('mirror');
    expect(COURSE_GAMES.ear).toContain('mirror');
    // Jazz content: in Ear's list only with the jazz pack open.
    expect(courseGames('ear', false)).not.toContain('mirror');
    expect(courseGames('ear', true)).toContain('mirror');
    expect(boardGames(COURSE_GAMES.ear)).toContain('mirror');
    expect(GAMES2.some((g) => g.id === 'mirror' && /[א-ת]/.test(g.he[0]))).toBe(true);
  });
  it('its own glyph, badge and intro lesson', () => {
    expect(GAME_STEP_GLYPH.mirror).toBe('mirror');
    expect(GAME_GLYPH.mirror).toBe('mirror');
    expect(GLYPHS.mirror).toBeDefined();
    expect(GAME_BADGE_GAMES.some((b) => b.game === 'mirror')).toBe(true);
    expect(UNIT_LESSON['game:mirror']).toBe('negative-harmony');
  });
});
