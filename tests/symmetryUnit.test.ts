// Symmetry unit (owner 2026-11-19): the three topics' items (every answer derived from src/engine/symmetry.ts), their
// registrations (lesson, name, mark, coach, tags, group, path order), and the Tonnetz game's engine and its links
// (rated events, XP, tiers, path step, workout, badges, glyphs).
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { asChoice, genTopic, TOPIC_GEN } from '../src/engine/topicKit';
import { TOPIC_TAGS, SUB_BY_ID } from '../src/engine/taxonomy';
import { applyChain, applyOp, distance, divisionSet, hasClass, intervalVector, IV_SETS, mod12, OPS, sameTriad, shortestChains, transpositions, triadName, triadPcs, vectorText, ALL_TRIADS } from '../src/engine/symmetry';
import { DIM7S, IV_PAIRS, lowerDimNote, MEDIANT_WORDS, sharesTritone } from '../src/engine/topicsSymmetry';
import { baseFor, isTzSave, neighbourCell, newTzSave, tzCells, tzCurrent, tzItem, tzLimit, tzMove, tzOver, tzResult, TZ_ITEMS, TZ_LEVELS } from '../src/engine/tonnetz';
import { courseInput } from '../src/engine/courses';
import { eligible, GAME_PREREQ, GAME_STEPS, gameForArea, STEP_PREREQ, stepCatalogue, type PathInput } from '../src/engine/path';
import { lessonForUnit } from '../src/content/minilessons';
import { hasShortName } from '../src/engine/pathNames';
import { TOPIC_MARK } from '../src/ui/stepMarks';
import { GAME_STEP_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { PAPER } from '../src/ui/paper';
import { TOPIC_GROUPS } from '../src/engine/topicGroups';
import { revealCoach } from '../src/engine/coach';
import { gameEvents } from '../src/engine/gameRating';
import { clearsRun, gameXp, tierSpec } from '../src/engine/gameTiers';
import { GAME_BADGE_GAMES } from '../src/engine/gameBadges';
import { WORKOUT_GAMES } from '../src/engine/workout2';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { walkPath } from './helpers/flowWalk';

const TOPICS = ['octave-division', 'neo-riemann', 'interval-vector'];
const items = (t: string, l: number, n = 60) => Array.from({ length: n }, (_, k) => asChoice(genTopic(t, 1000 + k * 7919, l, 'x')));
const pcOf: Record<string, number> = { C: 0, 'D♭': 1, 'C♯': 1, D: 2, 'E♭': 3, E: 4, F: 5, 'F♯': 6, 'G♭': 6, G: 7, 'A♭': 8, 'G♯': 8, A: 9, 'B♭': 10, B: 11 };
const parseTriad = (s: string) => ({ root: pcOf[s.replace(/m$/, '')], minor: s.endsWith('m') });

describe('the three topics: every item well formed and its answer derived', () => {
  for (const t of TOPICS)
    it(`${t}: answer offered, unique labels, tags = rated skill`, () => {
      for (let l = 1; l <= TOPIC_GEN[t].levels.length; l++) {
        const answers = new Set<string>();
        for (const q of items(t, l)) {
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices.map((c) => q.names[c].en)).size).toBe(q.choices.length);
          expect(new Set(q.choices.map((c) => q.names[c].he)).size).toBe(q.choices.length);
          const tags = TOPIC_TAGS[t];
          expect((typeof tags === 'function' ? tags(l) : tags)[0].skill).toBe(q.skill);
          answers.add(q.answer);
        }
        expect(answers.size, `${t}:${l}`).toBeGreaterThan(1);
      }
    });

  it('octave-division: parts, transpositions, tritone subs and the dim7\'s dominants', () => {
    for (const q of items('octave-division', 1)) {
      const m = /^12 ÷ (\d+)/.exec(q.text!.en);
      if (m) expect(q.answer).toBe(`i${12 / Number(m[1])}`);
      else expect(['n2', 'n3', 'n4', 'n6']).toContain(q.answer);
    }
    for (const q of items('octave-division', 2)) expect(q.choices).toEqual(['n2', 'n3', 'n4', 'n6']);
    const sizes: Record<string, number> = { 'Tritone (two notes)': 2, 'Augmented triad': 3, 'Diminished 7th': 4, 'Whole-tone scale': 6 };
    for (const q of items('octave-division', 3)) {
      const name = q.ask.en.split(':')[0];
      expect(q.answer).toBe(`t${transpositions(divisionSet(sizes[name]))}`);
    }
    // only the dominant a tritone away shares the tritone
    for (let r = 0; r < 12; r++) for (let s = 0; s < 12; s++) expect(sharesTritone(r, s)).toBe(mod12(s - r) === 0 || mod12(s - r) === 6);
    // lowering any note of a dim7 gives a dominant 7th on the lowered note
    for (const d of DIM7S) {
      expect(divisionSet(4, d.pc).map((p) => p)).toEqual(d.notes.map((n) => pcOf[n]));
      for (let k = 0; k < 4; k++) {
        const { pcs, root } = lowerDimNote(d.pc, k);
        expect(pcs).toEqual([root, root + 4, root + 7, root + 10].map(mod12).sort((a, b) => a - b));
      }
    }
    expect([0, 1, 2, 3].map((k) => triadName({ root: lowerDimNote(11, k).root, minor: false }))).toEqual(['B♭', 'D♭', 'E', 'G']);
  });

  it('neo-riemann: the move, two-step landings, cycles, mediant chains', () => {
    for (const q of items('neo-riemann', 1)) {
      const [a, b] = q.text!.en.split(' → ').map(parseTriad);
      expect(sameTriad(applyOp(a, q.answer as 'P'), b)).toBe(true);
    }
    for (const q of items('neo-riemann', 3)) {
      const m = /^(\S+), then ([PLR]), then ([PLR])/.exec(q.ask.en);
      if (m) expect(q.answer).toBe(triadName(applyChain(parseTriad(m[1]), [m[2], m[3]] as ('P' | 'L' | 'R')[])));
      if (/how many different triads/.test(q.ask.en)) expect(q.answer).toBe(q.ask.en.startsWith('PL') ? 'c6' : 'c8');
      if (/fits in one scale/.test(q.ask.en)) expect(q.answer).toBe(q.ask.en.includes('PLPL') ? 'aug' : 'dim');
    }
    // every mediant chain is the only shortest way, from every triad
    for (const t of ALL_TRIADS) for (const w of MEDIANT_WORDS) expect(shortestChains(t, applyChain(t, w))).toEqual([w]);
    for (const q of items('neo-riemann', 4)) {
      const [a, b] = q.text!.en.split(' → ? → ').map(parseTriad);
      expect(q.answer).toBe(shortestChains(a, b)[0].join(' → '));
    }
  });

  it('interval-vector: classes, vectors, the ear pairs', () => {
    for (const q of items('interval-vector', 2)) {
      const k = Object.keys(IV_SETS).find((x) => q.ask.en.startsWith(IV_SETS[x].en))!;
      expect(q.answer).toBe(vectorText(intervalVector(IV_SETS[k].pcs)));
    }
    for (const p of IV_PAIRS) {
      expect(hasClass(IV_SETS[p.a].pcs, p.ic)).toBe(true);
      expect(hasClass(IV_SETS[p.b].pcs, p.ic)).toBe(false);
    }
    expect(items('interval-vector', 3).every((q) => q.choices.join() === 'first,second')).toBe(true);
  });
});

describe('registrations', () => {
  it('lesson, path name, mark, glyph, coach hint, group, sub-skills', () => {
    for (const t of TOPICS) {
      expect(lessonForUnit(`topic:${t}`)?.id).toBe(t);
      expect(hasShortName(t)).toBe(true);
      expect(TOPIC_MARK[t]).toBeTruthy();
      expect(GLYPHS[TOPIC_GLYPH[t]]).toBeDefined();
      expect(TOPIC_GROUPS.find((g) => g.id === 'symmetry')!.topics).toContain(t);
      const q = items(t, 1, 1)[0];
      const wrong = q.choices.find((c) => c !== q.answer)!;
      expect(revealCoach(q, wrong, 'en') ?? '').not.toMatch(/listen for what changes/);
    }
    expect(SUB_BY_ID['theory/symmetry']).toBeTruthy();
    expect(SUB_BY_ID['chords/symmetry']).toBeTruthy();
    expect(GLYPHS.tonnetz && PAPER.tonnetz && GAME_STEP_GLYPH.tonnetz === 'tonnetz').toBeTruthy();
    expect(lessonForUnit('game:tonnetz')?.id).toBe('neo-riemann');
  });

  it('in the Ear course (not Jazz), right after the symmetric scales, each topic after the one before', () => {
    const base = { track: 'student', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-19T10:00:00Z') } as unknown as PathInput;
    const cat = stepCatalogue();
    for (const t of TOPICS) {
      const s = cat.find((x) => x.id === `topic:${t}:1`)!;
      expect(eligible(s, courseInput(base, 'ear')), t).toBe(true);
      expect(eligible(s, courseInput(base, 'jazz')), t).toBe(false);
    }
    expect(STEP_PREREQ['topic:octave-division:1']).toContain('topic:scale-types:4');
    expect(STEP_PREREQ['topic:neo-riemann:1']).toContain('topic:octave-division:1');
    expect(STEP_PREREQ['topic:interval-vector:1']).toContain('topic:neo-riemann:1');
    expect(GAME_PREREQ.tonnetz).toContain('topic:neo-riemann:1');
    const d = (id: string) => cat.find((x) => x.id === id)!.difficulty;
    expect(d('topic:octave-division:1')).toBeGreaterThan(d('topic:scale-types:4'));
  });

  it('a walk of the Ear path meets the unit after scale-types 4, in order, with the Tonnetz after P / L / R (the game rotation shares units with the newer games)', () => {
    const w = walkPath('ear', 'student', 'strong', 75, { placeAt: 1300 });
    const at = (re: RegExp) => w.units.findIndex((u) => u.ids.some((x) => re.test(x)));
    const sc = at(/^topic:scale-types:4$/);
    const od = at(/^topic:octave-division:1$/);
    const nr = at(/^topic:neo-riemann:1$/);
    const iv = at(/^topic:interval-vector:1$/);
    const tz = at(/^game:u\d+:tonnetz$/);
    expect(sc).toBeGreaterThanOrEqual(0);
    expect(od).toBeGreaterThan(sc);
    expect(nr).toBeGreaterThan(od);
    expect(iv).toBeGreaterThan(nr);
    expect(tz).toBeGreaterThan(nr);
  }, 120_000);
});

describe('the Tonnetz game', () => {
  it('the grid: the centre triangle is the current triad; P, L, R land on its three neighbours', () => {
    for (const t of ALL_TRIADS) {
      const cells = tzCells(baseFor(t));
      const centre = cells.find((c) => c.i === 0 && c.j === 0 && c.up === !t.minor)!;
      expect(sameTriad(centre.triad, t)).toBe(true);
      for (const op of OPS) {
        const n = neighbourCell(t, op);
        const cell = cells.find((c) => c.i === n.i && c.j === n.j && c.up === n.up)!;
        expect(sameTriad(cell.triad, applyOp(t, op)), `${triadName(t)} ${op}`).toBe(true);
        // neighbours share an edge: two corners
        expect(cell.nodes.filter(([a, b]) => centre.nodes.some(([x, y]) => x === a && y === b)).length).toBe(2);
        // and the two shared notes are the ones the move keeps
        expect(triadPcs(cell.triad).filter((p) => triadPcs(t).includes(p)).length).toBe(2);
      }
    }
  });

  it('rounds: the target lies at the level\'s distance; ear levels hide it', () => {
    for (let lv = 1; lv <= 6; lv++)
      for (let i = 0; i < TZ_ITEMS; i++)
        for (const seed of [1, 99, 4242]) {
          const it = tzItem(seed, lv, i);
          expect(distance(it.start, it.target)).toBe(it.par);
          expect(TZ_LEVELS[lv - 1].dist).toContain(it.par);
          expect(it.ear).toBe(lv >= 4);
        }
  });

  it('a run: a shortest chain is right, a detour is reached but wrong, running out ends the round; saves resume', () => {
    let s = newTzSave(7, 3, 'mp');
    // round 1 at par
    const it0 = tzItem(7, 3, 0);
    for (const op of shortestChains(it0.start, it0.target)[0]) s = tzMove(s, op).save;
    expect(s).toMatchObject({ i: 1, right: 1, wrong: 0 });
    // round 2: P P (back where we started) then the shortest way
    const it1 = tzItem(7, 3, 1);
    s = tzMove(tzMove(s, 'P').save, 'P').save;
    expect(isTzSave(s) && tzCurrent(s)).toEqual(it1.start);
    let last = tzMove(s, shortestChains(it1.start, it1.target)[0][0]);
    for (const op of shortestChains(it1.start, it1.target)[0].slice(1)) last = tzMove(last.save, op);
    expect(last).toMatchObject({ ended: true, reached: true, perfect: false });
    s = last.save;
    // round 3: run out of moves
    const it2 = tzItem(7, 3, 2);
    let st = tzMove(s, 'P');
    for (let k = 1; k < tzLimit(it2.par) && !st.ended; k++) st = tzMove(st.save, st.save.moves.length % 2 ? 'P' : 'P');
    expect(st.ended && !st.reached).toBe(true);
    s = st.save;
    while (!tzOver(s)) {
      const it = tzItem(s.seed, s.level, s.i);
      for (const op of shortestChains(it.start, it.target)[0]) s = tzMove(s, op).save;
    }
    const r = tzResult(s);
    expect(r.detail).toMatchObject({ right: 4, wrong: 2, items: 6, tier: 'mp' });
    expect(clearsRun('tonnetz', 'mp', r.score, r.detail)).toBe(true);
    expect(gameXp('tonnetz', 'mp', r.score, r.detail)).toBeGreaterThan(0);
    const ev = gameEvents('tonnetz', r.score, r.detail, '2026-11-19T10:00:00Z', 's1');
    expect(ev.length).toBe(6);
    expect(ev[0].tags?.map((t) => t.sub)).toEqual(['chords/symmetry', 'theory/symmetry']);
  });

  it('connected: path step in the Ear pitch units, workout, Practice games, tiers, badges', () => {
    expect(GAME_STEPS.tonnetz).toMatchObject({ domain: 'pitch', skill: 'chords', sub: 'symmetry' });
    const inp = { noMic: false, noSing: false, plays: [], packs: [], course: 'ear' as const };
    expect(Array.from({ length: 30 }, (_, n) => gameForArea('pitch', n, inp, 1600)).includes('tonnetz')).toBe(true);
    expect(Array.from({ length: 30 }, (_, n) => gameForArea('pitch', n, inp, 1300)).includes('tonnetz')).toBe(false);
    expect(WORKOUT_GAMES.ear).toContain('tonnetz');
    expect(COURSE_GAMES.ear).toContain('tonnetz');
    expect(tierSpec('tonnetz')?.tiers.ff.levels).toEqual([6]);
    expect(GAME_BADGE_GAMES.find((g) => g.game === 'tonnetz')?.course).toBe('ear');
  });
});
