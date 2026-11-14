// AUDIT-CONTENT-THEORY §ב / §ז.1–2: the instrument paths open families by difficulty (not catalogue order), the first
// steps lead every instrument course, the beginner ear reads notes before reading from the staff, and progress made
// under the old order stays valid.
import { describe, expect, it } from 'vitest';
import { courseInput, type CourseId } from '../src/engine/courses';
import { buildPath, stepCatalogue, type PathFacts, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { lessonForUnit } from '../src/content/minilessons';
import { shortName } from '../src/engine/pathNames';
import { VOICE_FAMILIES } from '../src/engine/voiceFamilies';
import { guitarStrands, drumStrands } from '../src/engine/drills/levelTest';

const base: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-14T10:00:00Z') };
const inputFor = (c: CourseId, facts: PathFacts = {}): PathInput => ({ ...courseInput(base, c), ladderFamilies: ladderFamiliesFor(c, DEFAULT_DRILL_SETTINGS), ladderHidden: ladderHiddenFor(c, undefined, undefined, false, DEFAULT_DRILL_SETTINGS), facts });

/** The step ids of the first `n` units, each finished before the next is built (the player does everything). */
function walk(c: CourseId, n: number, facts0: PathFacts = {}): string[][] {
  let facts = facts0;
  const out: string[][] = [];
  for (let u = 0; u < n; u++) {
    const v = buildPath(inputFor(c, facts));
    const cur = v.units.find((x) => x.status === 'current');
    if (!cur) break;
    out.push(cur.steps.map((x) => x.step.id));
    const steps = { ...(facts.steps ?? {}) };
    for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-14T10:00:00Z' };
    facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-14T10:00:00Z' }] : [])] };
  }
  return out;
}
const unitOf = (units: string[][], id: string) => units.findIndex((u) => u.includes(id));

describe('instrument paths open families by difficulty (AUDIT-CONTENT-THEORY §ב)', () => {
  it('guitar: the first chord and strumming in the first unit, the picking hand after', () => {
    const u = walk('guitar', 3);
    expect(u[0]).toEqual(expect.arrayContaining(['tech:g-chords-1', 'tech:g-rhythm-1']));
    expect(unitOf(u, 'tech:g-picking-1')).toBeGreaterThan(0);
    // Jazz comping is on the default path (no add-on chosen yet), at its grade.
    expect(stepCatalogue().filter((s) => s.ladder && s.ladder.family === 'g-jazz').length).toBeGreaterThan(0);
    expect(inputFor('guitar').ladderFamilies).toEqual(expect.arrayContaining(['g-jazz', 'g-harris']));
  });

  it('drums: time and the rock beat first, single strokes next, paradiddles well after', () => {
    const u = walk('drums', 6);
    expect(u[0]).toEqual(expect.arrayContaining(['tech:d-time-1', 'tech:d-rock-1']));
    const strokes = unitOf(u, 'tech:d-strokes-1');
    expect(strokes).toBeGreaterThan(0);
    expect(strokes).toBeLessThanOrEqual(3);
    const para = unitOf(u, 'tech:d-diddles-1');
    expect(para === -1 || para > strokes).toBe(true);
  });

  it('bass: time and plucking first, the kick lock and roots by unit 3, muting by 5, walking by 8', () => {
    const u = walk('bass', 8);
    expect(u[0]).toEqual(expect.arrayContaining(['tech:b-time-1', 'tech:b-pluck-1']));
    expect(unitOf(u, 'tech:b-pocket-1')).toBeLessThanOrEqual(2);
    expect(unitOf(u, 'tech:b-length-1')).toBeLessThanOrEqual(4);
    expect(unitOf(u, 'tech:b-walk-1')).toBeGreaterThanOrEqual(0);
    expect(unitOf(u, 'tech:b-walk-1')).toBeLessThanOrEqual(7);
  });

  it('keys: the first steps lead, and one-octave scales wait for the thumb passing under', () => {
    const u = walk('keys', 6);
    expect(u[0][0]).toBe('tech:k-first-1');
    const thumb = unitOf(u, 'tech:k-first-3');
    expect(thumb).toBeGreaterThanOrEqual(0);
    const scales = unitOf(u, 'tech:scales-1');
    expect(scales === -1 || scales >= thumb).toBe(true);
  });

  it('voice: the first steps lead; time feel opens on the click, the 16ths after swing', () => {
    const u = walk('voice', 2);
    expect(u[0].find((id) => id.startsWith('vocal:'))).toBe('vocal:2101');
    const time = VOICE_FAMILIES.find((f) => f.id === 'v-time')!.refs;
    expect(time[0]).toBe(1101);
    expect(time.indexOf(9)).toBeGreaterThan(time.indexOf(1104));
    const d = (n: number) => stepCatalogue().find((s) => s.id === `vocal:${n}`)!.difficulty;
    for (let i = 1; i < time.length; i++) expect(d(time[i]), String(time[i])).toBeGreaterThan(d(time[i - 1]));
  });

  it('the level test sections follow the course path: guitar chords first, drums grooves first', () => {
    expect(guitarStrands()[0].id).toBe('chords');
    expect(drumStrands()[0].id).toBe('grooves');
  });
});

describe('progress made under the old order stays valid', () => {
  it('done steps stay done; an easier family the old order skipped opens next (the gap)', () => {
    // A guitar player who followed the old catalogue order: picking and fretting levels, no chord yet.
    const done = ['tech:g-picking-1', 'tech:g-picking-2', 'tech:g-picking-3', 'tech:g-fretting-1', 'tech:g-fretting-2', 'tech:g-fretting-3'];
    const facts: PathFacts = { steps: Object.fromEntries(done.map((id) => [id, { stars: 3, at: '2026-11-01T10:00:00Z' }])) };
    const v = buildPath(inputFor('guitar', facts));
    const cur = v.units.find((x) => x.status === 'current')!;
    const ids = cur.steps.map((x) => x.step.id);
    for (const id of done) expect(ids, id).not.toContain(id);
    expect(ids).toEqual(expect.arrayContaining(['tech:g-chords-1', 'tech:g-rhythm-1']));
  });

  it('a frozen current unit keeps its steps after the reorder', () => {
    const frozen = { id: 'u4', n: 4, steps: ['tech:d-strokes-3', 'tech:d-rolls-3'], checked: [], at: '2026-11-13T10:00:00Z' };
    const v = buildPath(inputFor('drums', { units: [frozen] }));
    expect(v.units.find((x) => x.status === 'current')!.steps.map((x) => x.step.id)).toEqual(frozen.steps);
  });

  it('the first steps are ✓ for a player who already plays past them', () => {
    const facts: PathFacts = { steps: { 'tech:scales-3': { stars: 3, at: '2026-11-01T10:00:00Z' } } };
    const v = buildPath(inputFor('keys', facts));
    const cur = v.units.find((x) => x.status === 'current')!;
    expect(cur.steps.map((x) => x.step.id)).not.toContain('tech:k-first-1');
    const voice = buildPath(inputFor('voice', { tests: { 'vocal:1102': '2026-11-01T10:00:00Z' } }));
    expect(voice.units.find((x) => x.status === 'current')!.steps.map((x) => x.step.id)).not.toContain('vocal:2101');
  });
});

describe('the beginner ear (AUDIT-CONTENT-THEORY §ז.1 item 6)', () => {
  it('note reading comes before staff dictation, chords read off the staff and scale spelling; key-notes 1–3 for everyone', () => {
    const u = walk('ear', 9);
    const nr = unitOf(u, 'topic:note-reading:1');
    expect(nr).toBeGreaterThanOrEqual(0);
    for (const id of ['topic:staff-dictation:1', 'topic:chord-read:2', 'topic:scale-spelling:1']) {
      const at = unitOf(u, id);
      expect(at === -1 || at >= nr, id).toBe(true);
    }
    for (const lv of [1, 2, 3]) expect(unitOf(u, `topic:key-notes:${lv}`), `key-notes ${lv}`).toBeGreaterThanOrEqual(0);
  });
});

describe('first steps and labels', () => {
  it('every first step opens with its quick lesson', () => {
    for (const unit of ['tech:k-first-1', 'tech:k-first-3', 'tech:g-chords-1', 'tech:g-rhythm-1', 'tech:d-time-1', 'tech:d-rock-1', 'vocal:2101']) expect(lessonForUnit(unit), unit).not.toBeNull();
  });

  it('Barry Harris 1…9 are numbered in the order the path opens them (#34)', () => {
    const d = (topic: string) => stepCatalogue().find((s) => s.id === `topic:${topic}:1`)!.difficulty;
    const topics = ['bh-convert', 'bh-tone', 'bh-scale', 'bh-pivot', 'bh-keys', 'bh-lines', 'bh-convert-2', 'bh-six-over', 'bh-brothers'];
    const numbered = topics.map((k) => ({ k, n: Number(shortName(k, { en: k, he: k }, 'en').replace('Barry Harris ', '')) })).sort((a, b) => a.n - b.n);
    expect(numbered.map((x) => x.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(numbered.length).toBe(9);
    for (let i = 1; i < numbered.length; i++) expect(d(numbered[i].k), numbered[i].k).toBeGreaterThanOrEqual(d(numbered[i - 1].k));
  });
});
