// A path walk for the curriculum-flow rules (docs/research/CURRICULUM-AUDIT-*.md): a player passes every step of each
// current unit, and the ratings follow one of the audits' learner models.
//  - steady: each passed step lifts its skill by ≤ 40 (the projection rule buildUnit itself uses);
//  - strong: six real rating events per step through rate(), 5 of 6 right, tagged with the step's sub-skill;
//  - placed: a Find-my-level entry (placement `set` events on every skill), then the strong model.
import { courseInput, type CourseId } from '../../src/engine/courses';
import { buildPath, eligible, FIRST_STEP_FAMILIES, frontierOf, GAME_PREREQ, LADDER_AFTER, MEASURED_STEP_LEVELS, PREREQ_TARGETS, STEP_PREREQ, stepCatalogue, type PathFacts, type PathInput, type PathStep } from '../../src/engine/path';
import { FLOW_GAME_PREREQ, FLOW_PREREQ, LADDER_WAITS, REP_PREREQ } from '../../src/engine/pathPrereq';
import { PREREQ } from '../../src/engine/intake';
import { ladderFamiliesFor, ladderHiddenFor } from '../../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../../src/engine/drills/types';
import { rate, type RatingEvent, type Ratings } from '../../src/engine/rating';
import type { SkillId } from '../../src/engine/lesson';
import '../../src/engine/topics';

export type Model = 'steady' | 'strong' | 'placed';
export interface WalkUnit {
  ids: string[];
  /** Step ids passed or ✓ before this unit was built. */
  before: Set<string>;
  /** Catch-up quick checks (a skipped teaching step coming back). */
  quick?: Set<string>;
  /** The frontier of a skill when the unit was built. */
  fr: (skill: SkillId) => number;
}
export interface Walk {
  units: WalkUnit[];
  /** Eligible steps never done nor ✓ when the walk stopped. */
  left: string[];
  /** The walk stopped because the path gave no current unit (not the unit limit). */
  ended: boolean;
  inp: PathInput;
}

export const baseInput: PathInput = { track: 'explorer', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-18T10:00:00Z') };

export function courseBase(course: CourseId, track: PathInput['track'], plays: string[] = []): PathInput {
  return { ...courseInput({ ...baseInput, track, plays }, course), ladderFamilies: ladderFamiliesFor(course, DEFAULT_DRILL_SETTINGS), ladderHidden: ladderHiddenFor(course, undefined, undefined, false, DEFAULT_DRILL_SETTINGS) };
}

export function walkPath(course: CourseId, track: PathInput['track'], model: Model, maxUnits: number, opts: { plays?: string[]; placeAt?: number } = {}): Walk {
  const inp0 = courseBase(course, track, opts.plays);
  let facts: PathFacts = {};
  let ratings: Ratings = {};
  let events: RatingEvent[] = [];
  const at = (k: number) => new Date(Date.UTC(2026, 9, 1) + k * 3600_000).toISOString();
  let clock = 0;
  if (model === 'placed') {
    const skills = new Set(stepCatalogue().filter((s) => eligible(s, inp0)).map((s) => s.skill));
    for (const k of skills) {
      const e: RatingEvent = { id: `place:${k}`, skill: k, difficulty: opts.placeAt ?? 1300, correct: true, set: opts.placeAt ?? 1300, at: at(clock++) };
      events.push(e);
      ratings = { ...ratings, [k]: rate(ratings[k], e) };
    }
    // Ladder levels well below the placed level: ✓ by the playing test.
    const tests: Record<string, string> = {};
    for (const s of stepCatalogue()) if (s.ladder && eligible(s, inp0) && s.difficulty < (opts.placeAt ?? 1300) - 200) tests[s.id] = at(0);
    facts = { tests };
  }
  const units: WalkUnit[] = [];
  let ended = false;
  let last: ReturnType<typeof buildPath> | null = null;
  let inp = inp0;
  for (let u = 0; u < maxUnits; u++) {
    inp = { ...inp0, facts, ratings, events, now: new Date(Date.UTC(2026, 10, 18) + u * 86400_000) };
    const v = buildPath(inp);
    last = v;
    const cur = v.units.find((x) => x.status === 'current');
    if (!cur) {
      ended = true;
      break;
    }
    const before = new Set<string>([...Object.keys(facts.steps ?? {}), ...Object.keys(facts.tests ?? {}), ...v.history.flatMap((h) => h.steps.map((x) => x.step.id))]);
    for (const uu of v.units) for (const x of uu.steps) if (x.state === 'tested' && uu.status !== 'projected') before.add(x.step.id);
    const ids = cur.steps.map((x) => x.step.id);
    const snap = inp;
    units.push({ ids, before, quick: new Set(cur.steps.filter((x) => x.catchup).map((x) => x.step.id)), fr: (k) => frontierOf(k, snap) });
    const steps = { ...(facts.steps ?? {}) };
    const stamp = at(clock);
    for (const x of cur.steps) {
      steps[x.step.id] = { stars: 3, at: stamp };
      const s = x.step;
      if (s.kind === 'check' || s.kind === 'review') continue;
      if (model === 'steady') {
        const r0 = ratings[s.skill]?.r ?? startFor(track) - 150;
        const r = Math.max(r0, Math.min(r0 + 40, s.difficulty + 50));
        ratings = { ...ratings, [s.skill]: { r, n: 20, correct: 15, recent: [] } };
      } else {
        for (let i = 0; i < 6; i++) {
          const e: RatingEvent = { id: `${x.step.id}#${u}:${i}`, skill: s.skill as SkillId, difficulty: s.difficulty, correct: i !== 2, at: at(clock++), tags: [{ skill: s.skill as SkillId, sub: s.sub, w: 1 }] } as RatingEvent;
          events.push(e);
          ratings = { ...ratings, [s.skill]: rate(ratings[s.skill], e) };
        }
      }
    }
    clock += 24;
    facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: stamp }] : [])] };
  }
  const known = new Set<string>([...Object.keys(facts.steps ?? {}), ...Object.keys(facts.tests ?? {}), ...(last?.history.flatMap((h) => h.steps.map((x) => x.step.id)) ?? [])]);
  const left = stepCatalogue().filter((s) => eligible(s, inp0) && !known.has(s.id)).map((s) => s.id);
  return { units, left, ended, inp: inp0 };
}

const startFor = (t: PathInput['track']) => ({ explorer: 850, hobby: 950, student: 1100, pro: 1250 })[t];

export const byIdAll = (): Map<string, PathStep> => new Map(stepCatalogue().map((s) => [s.id, s] as const));

// ---------------------------------------------------------------- flow metrics

const arr = (x: string | string[] | undefined): string[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
/** Every prerequisite id of a step under the flow rules (the yardstick, whatever the engine does). */
export function flowPrereqs(s: PathStep, onPath: (id: string) => boolean, byId: Map<string, PathStep>): string[] {
  const out = new Set<string>([
    ...(s.kind === 'lesson' ? (PREREQ[s.lesson!] ?? []).map((p) => `lesson:${p}`) : []),
    ...(STEP_PREREQ[s.id] ?? []),
    ...(FLOW_PREREQ[s.id] ?? []),
    ...arr((LADDER_AFTER as Record<string, string | string[]>)[s.id]),
    ...(LADDER_WAITS[s.id] ?? []),
    ...(s.rep ? REP_PREREQ[s.id] ?? [] : []),
  ]);
  if (s.kind === 'topic' && (s.level ?? 1) > 1) {
    for (let l = s.level! - 1; l >= 1; l--) {
      const id = `topic:${s.topic}:${l}`;
      if (byId.has(id) && onPath(id)) {
        out.add(id);
        break;
      }
    }
  }
  if (s.game === 'licks' || s.game === 'transcribe') {
    const [, c, lv] = s.id.split(':');
    const ls = (MEASURED_STEP_LEVELS[s.game] as Record<string, number[]>)[c] ?? [];
    const i = ls.indexOf(Number(lv));
    if (i > 0) out.add(`${s.game}:${c}:${ls[i - 1]}`);
  }
  const g = s.id.startsWith('game:') ? s.id.split(':')[2] : s.bonus ? s.game : undefined;
  if (g) for (const p of [...(GAME_PREREQ[g] ?? []), ...(FLOW_GAME_PREREQ[g] ?? [])]) out.add(p);
  return [...out];
}

export interface FlowReport {
  units: number;
  ended: boolean;
  left: number;
  gaps: string[];
  crossGaps: string[];
  hops: string[];
  familyHops: string[];
  doubles: string[];
  farAbove: string[];
  firstSkipped: string[];
}

export function flowReport(w: Walk, course: CourseId): FlowReport {
  const byId = byIdAll();
  const elig = new Set(stepCatalogue().filter((s) => eligible(s, w.inp)).map((s) => s.id));
  const seenAny = new Set(w.units.flatMap((u) => u.ids));
  const onPath = (id: string) => elig.has(id) || seenAny.has(id);
  const r: FlowReport = { units: w.units.length, ended: w.ended, left: w.left.length, gaps: [], crossGaps: [], hops: [], familyHops: [], doubles: [], farAbove: [], firstSkipped: [] };
  const playing = ['keys', 'guitar', 'bass', 'voice', 'drums'].includes(course);
  const seenTopics = new Set<string>();
  const seenFams = new Set<string>();
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  w.units.forEach((u, i) => {
    const tag = `U${i + 1}`;
    for (const id of u.before) {
      const s = byId.get(id);
      if (s?.topic) seenTopics.add(s.topic);
      if (s?.ladder) seenFams.add(s.ladder.family);
    }
    const steps = u.ids.map((id) => byId.get(id) ?? (id.startsWith('game:') ? ({ id, kind: 'game', difficulty: 0 } as unknown as PathStep) : undefined)).filter((s): s is PathStep => !!s);
    steps.forEach((s) => {
      const k = u.ids.indexOf(s.id);
      for (const pid of flowPrereqs(s, onPath, byId)) {
        if (!onPath(pid) || u.before.has(pid)) continue;
        // A practice level (not a concept carrier) the player's rating had passed by more than 150: known, not a gap.
        const p = byId.get(pid);
        if (p && ((p.kind === 'topic' && (p.level ?? 1) > 1) || p.game === 'licks' || p.game === 'transcribe') && !PREREQ_TARGETS.has(pid) && p.difficulty < u.fr(p.skill) - 150) continue;
        const at = u.ids.indexOf(pid);
        if (at >= 0 && at < k && (s.difficulty ?? 0) >= 1150) continue;
        r.gaps.push(`${tag} ${s.id} <- ${pid}`);
      }
      if (s.kind === 'topic' && (s.level ?? 1) > 1) {
        const lower = Array.from({ length: s.level! - 1 }, (_, j) => `topic:${s.topic}:${j + 1}`).filter((x) => byId.has(x));
        if (lower.length && !lower.some((x) => onPath(x)) && !lower.some((x) => u.before.has(x))) r.crossGaps.push(`${tag} ${s.id}`);
      }
    });
    // Hops: new topics (a lesson + one topic of its sub = one concept); new families (first steps exempt).
    const quick = u.quick ?? new Set<string>();
    const lessons = steps.filter((s) => s.kind === 'lesson' && !quick.has(s.id) && !u.before.has(s.id));
    // A topic whose earlier level comes back as a catch-up quick check in this unit is started by it (not new).
    const quickTopics = new Set(steps.filter((s) => quick.has(s.id) && s.topic).map((s) => s.topic!));
    const newTopics = [...new Set(steps.filter((s) => s.kind === 'topic' && !quick.has(s.id) && !seenTopics.has(s.topic!) && !quickTopics.has(s.topic!)).map((s) => s.topic!))];
    let concepts = lessons.length;
    const paired = new Set<string>();
    for (const t of newTopics) {
      const sub = steps.find((s) => s.topic === t)!.sub;
      if (lessons.some((l) => l.sub === sub) && !paired.has(sub)) paired.add(sub);
      else concepts++;
    }
    if (concepts > 1) r.hops.push(`${tag} ${concepts}: ${[...lessons.map((s) => s.id), ...newTopics].join(' ')}`);
    const newFams = [...new Set(steps.filter((s) => s.ladder && !seenFams.has(s.ladder.family) && !FIRST_STEP_FAMILIES.includes(s.ladder.family)).map((s) => s.ladder!.family))];
    if (newFams.length > 1) r.familyHops.push(`${tag} ${newFams.join(' ')}`);
    const byTopic = new Map<string, PathStep[]>();
    for (const s of steps) if (s.kind === 'topic' && !quick.has(s.id)) byTopic.set(s.topic!, [...(byTopic.get(s.topic!) ?? []), s]);
    for (const [t, xs] of byTopic) if (xs.length > 1 && Math.min(...xs.map((x) => x.difficulty)) < 1150) r.doubles.push(`${tag} ${t}:${xs.map((x) => x.level).join('+')}`);
    const qs = steps.filter((s) => (s.kind === 'topic' || s.kind === 'lesson' || s.game === 'licks' || s.game === 'transcribe') && !quick.has(s.id));
    const road = steps.filter((s) => s.ladder).map((s) => s.difficulty);
    for (const s of qs) {
      if (playing && road.length && s.difficulty > Math.max(...road) + 150) r.farAbove.push(`${tag} ${s.id}(${s.difficulty}) road ${Math.max(...road)}`);
      else if (!playing && qs.length >= 3 && s.difficulty > med(qs.map((x) => x.difficulty)) + 250) r.farAbove.push(`${tag} ${s.id}(${s.difficulty}) unit ${med(qs.map((x) => x.difficulty))}`);
    }
    for (const s of steps) {
      if (s.topic) seenTopics.add(s.topic);
      if (s.ladder) seenFams.add(s.ladder.family);
    }
  });
  // First steps finished on the path: every first-steps level of this course was played (none ✓ by "past them").
  const played = new Set(w.units.flatMap((u) => u.ids));
  r.firstSkipped = [...elig].filter((id) => {
    const s = byId.get(id);
    return !!s?.ladder && FIRST_STEP_FAMILIES.includes(s.ladder.family) && !played.has(id);
  });
  return r;
}
