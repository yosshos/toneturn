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
import { courseBase, flowReport, walkPath, type Model } from './helpers/flowWalk';

const COURSES: CourseId[] = ['ear', 'jazz', 'keys', 'guitar', 'bass', 'voice', 'drums'];
const CONFIGS: [('explorer' | 'hobby' | 'student'), Model][] = [['explorer', 'steady'], ['hobby', 'steady'], ['student', 'steady'], ['explorer', 'strong'], ['hobby', 'placed']];
const UNITS = 45;

const reports = new Map<string, ReturnType<typeof flowReport>>();
const report = (c: CourseId, t: 'explorer' | 'hobby' | 'student', m: Model) => {
  const k = `${c}/${t}/${m}`;
  if (!reports.has(k)) reports.set(k, flowReport(walkPath(c, t, m, UNITS, { placeAt: 1250 }), c));
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
  for (const c of COURSES)
    it(`${c}: prerequisites first, one new idea and one level per unit, no dead end`, () => {
      for (const [t, m] of CONFIGS) {
        const r = report(c, t, m);
        const tag = `${c} ${t} ${m}`;
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
    });
});

describe('jazz', () => {
  it('the Jazz path no longer dead-ends for an explorer or a hobbyist, and opens with its own on-ramp', () => {
    for (const t of ['explorer', 'hobby'] as const) {
      const w = walkPath('jazz', t, 'steady', 50);
      expect(w.units.length, t).toBe(50);
      // The first unit is jazz (the swing / blues / comping on-ramp), not a bridged ear lesson.
      const first = w.units[0].ids.filter((x) => !x.startsWith('check:'));
      expect(first.some((id) => /swing-ratio|blues-ear|comping|call-response|comp-rhythm-ear/.test(id)), first.join(' ')).toBe(true);
      // The entry gate: 7th-chord colours and ii–V–I before the guide tones and voicings.
      const at = (id: string) => w.units.findIndex((u) => u.ids.includes(id));
      expect(at('lesson:jazz-1'), t).toBeGreaterThanOrEqual(0);
      for (const id of ['topic:guide-tones:1', 'topic:voicing-type:1', 'topic:bh-three-dim:1']) if (at(id) >= 0) expect(at(id), `${t}: ${id}`).toBeGreaterThan(at('lesson:jazz-1'));
    }
  });

  it('a prerequisite of another course is a bridge step in this one (Ear\'s cadence lesson before lesson:jazz-1)', () => {
    const inp = courseBase('jazz', 'hobby');
    const by = new Map(stepCatalogue().map((s) => [s.id, s] as const));
    const own = stepCatalogue().filter((s) => eligible(s, inp));
    expect(own.some((s) => s.id === 'lesson:cadences')).toBe(false);
    const all = withBridges(own, inp, by);
    expect(all.some((s) => s.id === 'lesson:cadences')).toBe(true);
    expect(all.some((s) => s.id === 'topic:voicings:2')).toBe(true);
    // Shared credit: passed in the Ear course, it is passed here too.
    const v = buildPath({ ...inp, otherDone: ['lesson:cadences'] });
    expect(v.units.flatMap((u) => u.steps.map((x) => x.step.id))).not.toContain('lesson:cadences');
  });
});

describe('keys emphasis', () => {
  it('a jazz pianist keeps the core scales / arpeggios below 1100; a classical pianist keeps the Alberti bass', () => {
    const jazz = { ...DEFAULT_DRILL_SETTINGS, emphasis: 'jazz' as const };
    expect(ladderFamiliesFor('keys', jazz)).toEqual(expect.arrayContaining(['scales', 'arpeggios', 'fingers']));
    const hid = ladderHiddenFor('keys', undefined, undefined, false, jazz);
    expect(hid).not.toContain('scales-1');
    expect(hid).toContain('scales-30');
    const cl = { ...DEFAULT_DRILL_SETTINGS, emphasis: 'classical' as const };
    expect(ladderFamiliesFor('keys', cl)).toContain('accomp');
    const hc = ladderHiddenFor('keys', undefined, undefined, false, cl);
    expect(hc).not.toContain('accomp-1');
    expect(hc).toContain('accomp-3');
  });
});

describe('question steps stay near the technique road', () => {
  for (const c of ['keys', 'guitar', 'bass', 'voice', 'drums'] as CourseId[])
    it(`${c}: no question step more than 150 above the unit's technique`, () => {
      for (const [t, m] of CONFIGS.filter(([, m]) => m !== 'placed')) expect(report(c, t, m).farAbove, `${c} ${t} ${m}`).toEqual([]);
    });
});
