// Curriculum-flow rules (owner 2026-11-19; docs/research/CURRICULUM-AUDIT-EAR-JAZZ.md, -INSTRUMENTS.md, -VOICE-DRUMS.md):
// no step before what it builds on, one new idea per unit, one level of a topic per unit, the first steps played on the
// path, and no course that dead-ends. Every course × explorer / hobby / student (steady learner) + a strong learner +
// a placed player, walked unit by unit with the ratings moving (tests/helpers/flowWalk.ts).
import { describe, expect, it } from 'vitest';
import type { CourseId } from '../src/engine/courses';
import { buildPath, eligible, GAME_PREREQ, LADDER_AFTER, NON_MONOTONE_FAMILIES, PREREQ_TARGETS, STEP_PREREQ, stepCatalogue, playsPastFirstSteps, withBridges } from '../src/engine/path';
import { FLOW_GAME_PREREQ, FLOW_PREREQ, LADDER_WAITS, REP_PREREQ } from '../src/engine/pathPrereq';
import { GAME_STEPS } from '../src/engine/path';
import { BONUS_GAMES } from '../src/engine/pathBonus';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { courseBase, flowReport, walkPath, type JazzMode, type Model } from './helpers/flowWalk';

// SPEC-JAZZ-FOLD: no Jazz course — every course is walked with the jazz pack closed (a beginner) and, where it holds
// jazz, open (an intermediate / advanced background: the Ear course's jazz top levels, the instruments' jazz families).
const COURSES: CourseId[] = ['ear', 'keys', 'guitar', 'bass', 'voice', 'drums'];
const JAZZ_COURSES: CourseId[] = ['ear', 'keys', 'guitar', 'bass', 'voice'];
const CONFIGS: [('explorer' | 'hobby' | 'student'), Model][] = [['explorer', 'steady'], ['hobby', 'steady'], ['student', 'steady'], ['explorer', 'strong'], ['hobby', 'placed']];
const UNITS = 45;

const reports = new Map<string, ReturnType<typeof flowReport>>();
const report = (c: CourseId, t: 'explorer' | 'hobby' | 'student', m: Model, jazz: JazzMode = 'off') => {
  const k = `${c}/${t}/${m}/${jazz}`;
  if (!reports.has(k)) reports.set(k, flowReport(walkPath(c, t, m, UNITS, { placeAt: 1250, jazz }), c));
  return reports.get(k)!;
};

describe('prerequisite tables', () => {
  const ids = new Set(stepCatalogue().map((s) => s.id));
  it('every id in the flow tables is a real step (or a known game)', () => {
    const missing: string[] = [];
    for (const [k, vs] of Object.entries({ ...FLOW_PREREQ, ...LADDER_WAITS, ...REP_PREREQ })) for (const id of [k, ...vs]) if (!ids.has(id)) missing.push(id);
    for (const [g, vs] of Object.entries(FLOW_GAME_PREREQ)) {
      if (!GAME_STEPS[g] && !BONUS_GAMES.some((b) => b.game === g)) missing.push(`game ${g}`);
      for (const id of vs) if (!ids.has(id)) missing.push(id);
    }
    expect(missing).toEqual([]);
  });

  it('the engine reads them (step, game and ladder waits)', () => {
    for (const [k, vs] of Object.entries(FLOW_PREREQ)) for (const v of vs) expect(STEP_PREREQ[k]).toContain(v);
    for (const [k, vs] of Object.entries(FLOW_GAME_PREREQ)) for (const v of vs) expect(GAME_PREREQ[k]).toContain(v);
    for (const [k, vs] of Object.entries(LADDER_WAITS)) expect(LADDER_AFTER[k]).toEqual(vs);
    expect(PREREQ_TARGETS.has('lesson:jazz-1')).toBe(true);
  });

  it('a ladder wait never names a level of its own family (ladderPrev would deadlock, Voice-Drums audit R10)', () => {
    const by = new Map(stepCatalogue().map((s) => [s.id, s] as const));
    for (const [k, vs] of Object.entries(LADDER_AFTER)) for (const v of vs) expect(by.get(k)?.ladder?.family, `${k} → ${v}`).not.toBe(by.get(v)?.ladder?.family);
    expect(NON_MONOTONE_FAMILIES).toContain('d-read');
  });

  it('Barry Harris follows the canonical order: three dims → brothers / m6 family → the scale → harmonization → borrowing → eight expressions', () => {
    expect(STEP_PREREQ['topic:bh-convert:1']).toContain('topic:bh-three-dim:1');
    expect(STEP_PREREQ['topic:bh-brothers:1']).toContain('topic:bh-convert:1');
    expect(STEP_PREREQ['topic:bh-scale:1']).toEqual(expect.arrayContaining(['topic:bh-brothers:1', 'topic:bh-family:1']));
    expect(STEP_PREREQ['topic:bh-tone:1']).toContain('topic:bh-scale:1');
    expect(STEP_PREREQ['topic:bh-block:1']).toContain('topic:bh-tone:1');
    expect(STEP_PREREQ['topic:bh-sixfive:1']).toEqual(expect.arrayContaining(['topic:bh-brothers:1', 'topic:bh-m6-bass:1', 'topic:bh-borrow:1']));
    expect(STEP_PREREQ['topic:bh-three-dim:1']).toContain('lesson:jazz-1');
  });
});

describe('first steps are finished on the path', () => {
  it('the path\'s own unit-3 levels never tick the rest of the first steps off', () => {
    const k1 = stepCatalogue().find((s) => s.id === 'tech:k-first-5')!;
    const facts = { steps: { 'tech:k-first-1': { stars: 1, at: 'x' }, 'tech:fingers-3': { stars: 1, at: 'x' } }, units: [{ id: 'u3', n: 3, steps: ['tech:fingers-3'], checked: [], at: 'x' }] };
    expect(playsPastFirstSteps(k1, facts)).toBe(false);
    // A level test does.
    expect(playsPastFirstSteps(k1, { tests: { 'tech:fingers-3': 'x' } })).toBe(true);
    // So does a level played in the Drills hub (never scheduled by the path) before any first step.
    expect(playsPastFirstSteps(k1, { steps: { 'tech:fingers-3': { stars: 1, at: 'x' } } })).toBe(true);
  });

  for (const c of ['keys', 'guitar', 'bass', 'voice', 'drums'] as CourseId[])
    it(`${c}: every first-steps level is played, in order`, () => {
      for (const [t, m] of CONFIGS.filter(([, m]) => m !== 'placed')) expect(report(c, t, m).firstSkipped, `${c} ${t} ${m}`).toEqual([]);
    });
});

describe('the flow rules hold on every course walk', () => {
  const variants: [CourseId, JazzMode][] = [...COURSES.map((c): [CourseId, JazzMode] => [c, 'off']), ...JAZZ_COURSES.map((c): [CourseId, JazzMode] => [c, 'on'])];
  for (const [c, jazz] of variants)
    it(`${c} (jazz ${jazz}): prerequisites first, one new idea and one level per unit, no dead end`, () => {
      // With the jazz pack open the walk is a student / pro's (an intermediate background), plus the placed player.
      for (const [t, m] of jazz === 'off' ? CONFIGS : CONFIGS.filter(([t, m]) => t === 'student' || m === 'placed' || m === 'strong')) {
        const r = report(c, t, m, jazz);
        const tag = `${c} ${t} ${m} jazz-${jazz}`;
        expect(r.gaps, `${tag}: a step before what it builds on`).toEqual([]);
        expect(r.crossGaps, `${tag}: a topic level whose lower levels live in another course and were not bridged`).toEqual([]);
        // A placed player's first unit may hold a catch-up of a skipped teaching level next to a new topic.
        const hops = m === 'placed' ? r.hops.filter((h) => !h.startsWith('U1 ')) : r.hops;
        expect(hops, `${tag}: more than one new topic in a unit`).toEqual([]);
        expect(r.familyHops, `${tag}: more than one new technique family in a unit`).toEqual([]);
        expect(r.doubles, `${tag}: a topic climbing two levels in one unit below 1150`).toEqual([]);
        // No dead end: the path continues to the walk's end, or to the end of the content.
        if (r.ended) expect(r.left, `${tag}: ended after ${r.units} units with ${r.left} steps left`).toBeLessThanOrEqual(10);
        else expect(r.units).toBe(UNITS);
      }
    }, 180_000);
});

describe('jazz in the Ear course (SPEC-JAZZ-FOLD)', () => {
  it('with the jazz pack open, the Ear path climbs into jazz: the jazz welcome before the 7th-chord jazz lessons, and those before guide tones, voicing types and Harris', () => {
    const w = walkPath('ear', 'student', 'steady', 70, { jazz: 'on' });
    const at = (id: string) => w.units.findIndex((u) => u.ids.includes(id));
    expect(at('lesson:jazz-1'), 'jazz-1 on the path').toBeGreaterThanOrEqual(0);
    for (const id of ['topic:guide-tones:1', 'topic:voicing-type:1', 'topic:bh-three-dim:1']) if (at(id) >= 0) expect(at(id), id).toBeGreaterThan(at('lesson:jazz-1'));
    // Its prerequisites are Ear's own steps now (no bridge needed): the cadence lesson comes first.
    expect(at('lesson:cadences')).toBeGreaterThanOrEqual(0);
    expect(at('lesson:cadences')).toBeLessThan(at('lesson:jazz-1'));
  });

  it('with the jazz pack closed (a beginner), no jazz step is on the Ear path', () => {
    const w = walkPath('ear', 'explorer', 'steady', 45);
    const ids = w.units.flatMap((u) => u.ids);
    const by = new Map(stepCatalogue().map((s) => [s.id, s] as const));
    expect(ids.filter((id) => by.get(id)?.pack === 'jazz')).toEqual([]);
    expect(w.left.filter((id) => by.get(id)?.pack === 'jazz')).toEqual([]);
  });

  it('the Ear path bridges nothing for jazz: jazz-1 prerequisites are on the same path', () => {
    const inp = courseBase('ear', 'student', [], 'on');
    const by = new Map(stepCatalogue().map((s) => [s.id, s] as const));
    const own = stepCatalogue().filter((s) => eligible(s, inp));
    for (const id of ['lesson:cadences', 'lesson:jazz-1', 'topic:voicings:2', 'topic:voicings:3']) expect(own.some((s) => s.id === id), id).toBe(true);
    expect(withBridges(own, inp, by).length).toBe(own.length);
    // Shared credit still works: a step passed in another course is passed here.
    const v = buildPath({ ...inp, otherDone: ['lesson:cadences'] });
    expect(v.units.flatMap((u) => u.steps.map((x) => x.step.id))).not.toContain('lesson:cadences');
  });
});

describe('keys emphasis', () => {
  it('SPEC-STYLE-FOCUS §2: the old emphasis hides nothing — every pianist keeps the scales, arpeggios and the accompaniment hand', () => {
    for (const emphasis of ['jazz', 'classical', 'both'] as const) {
      const d = { ...DEFAULT_DRILL_SETTINGS, emphasis };
      expect(ladderFamiliesFor('keys', d)).toEqual(expect.arrayContaining(['scales', 'arpeggios', 'fingers', 'accomp', 'harris']));
      const hid = ladderHiddenFor('keys', undefined, undefined, false, d);
      for (const id of ['scales-1', 'scales-30', 'accomp-1', 'accomp-3']) expect(hid, `${emphasis} ${id}`).not.toContain(id);
    }
    // the style focus leaves out only the styled levels of other styles (they stay open in Practice)
    expect(ladderHiddenFor('keys', undefined, undefined, false, undefined, { main: 'jazz', also: [] })).toContain('accomp-5');
    expect(ladderHiddenFor('keys', undefined, undefined, false, undefined, { main: 'neworleans', also: [] })).not.toContain('accomp-5');
  });
});

describe('question steps stay near the technique road', () => {
  for (const c of ['keys', 'guitar', 'bass', 'voice', 'drums'] as CourseId[])
    it(`${c}: no question step more than 150 above the unit's technique`, () => {
      for (const [t, m] of CONFIGS.filter(([, m]) => m !== 'placed')) expect(report(c, t, m).farAbove, `${c} ${t} ${m}`).toEqual([]);
    });
});
