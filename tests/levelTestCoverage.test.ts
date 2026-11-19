// Owner 2026-11-19: "the level test must check everything the course covers". Every family an instrument course
// teaches is placed by some step of its sectioned test (measured, or by a step that asks the same at that level), every
// radar axis has a measured step, every step of a section can be reached in its four takes, and every axis of the
// voice radar has a section of the voice test.
import { describe, expect, it } from 'vitest';
import { advance, jumpOf, recordTake, startState, STRAND_TAKES, strandsFor, type Strand } from '../src/engine/drills/levelTest';
import { shownFamilies } from '../src/engine/drills/plan';
import { ladderFamiliesFor, pathGuitarAddOns, pathPianoLevels } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from '../src/engine/drills/types';
import type { CourseId } from '../src/engine/courses';
import { DEFAULT_RANGE } from '../src/engine/vocal';
import { voiceStrands, withRelatedStarts } from '../src/engine/voiceLevelTest';
import { VOICE_FAMILIES } from '../src/engine/voiceFamilies';

type Inst = NonNullable<DrillSettings['instrument']>;
interface Setup {
  name: string;
  course: CourseId;
  inst: Inst;
  ds: DrillSettings;
  tuning?: string;
}
const ds = (o: Partial<DrillSettings>): DrillSettings => ({ ...DEFAULT_DRILL_SETTINGS, ...o });
const SETUPS: Setup[] = [
  ...(['both', 'jazz', 'classical'] as const).map((e): Setup => ({ name: `keys ${e}`, course: 'keys', inst: 'piano', ds: ds({ emphasis: e, instrument: 'piano' }) })),
  { name: 'guitar (path default)', course: 'guitar', inst: 'guitar', ds: ds({ instrument: 'guitar' }) },
  { name: 'guitar, every add-on', course: 'guitar', inst: 'guitar', ds: ds({ instrument: 'guitar', guitarAddOns: ['jazz', 'prog', 'flamenco', 'fingerstyle'] }) },
  ...([undefined, 'jazz', 'prog'] as const).flatMap((track) =>
    [undefined, 'upright'].map((tuning): Setup => ({ name: `bass ${track ?? 'both'} ${tuning ?? 'electric'}`, course: 'bass', inst: 'bass', ds: ds({ instrument: 'bass', bassTrack: track }), tuning })),
  ),
  { name: 'drums', course: 'drums', inst: 'drums', ds: ds({ instrument: 'drums' }) },
];

/** The test as this player's setup shows it (SectionLevelTest: only steps of shown levels). */
function shownStrands(s: Setup): Strand[] {
  const upright = s.tuning === 'upright' || s.tuning === 'bass-fretless';
  const settings = { ...s.ds, guitarAddOns: s.inst === 'guitar' ? pathGuitarAddOns(s.ds) : s.ds.guitarAddOns, bassTuning: s.tuning };
  const shown = new Set(shownFamilies(settings).flatMap((f) => f.levels.map((l) => l.id)));
  if (s.inst === 'piano') for (const id of pathPianoLevels(s.ds)) shown.add(id);
  return strandsFor(s.inst, s.ds.emphasis, { upright })
    .map((st) => ({ ...st, rungs: st.rungs.filter((r) => shown.has(r.level)) }))
    .filter((st) => st.rungs.length > 0);
}
const placedBy = (strands: Strand[]) => new Set(strands.flatMap((st) => st.rungs.flatMap((r) => Object.keys(r.places))));

describe('every family a course teaches is placed by its level test', () => {
  for (const s of SETUPS)
    it(s.name, () => {
      const placed = placedBy(shownStrands(s));
      const missing = ladderFamiliesFor(s.course, s.ds, s.tuning).filter((f) => !placed.has(f));
      expect(missing).toEqual([]);
    });
});

describe('every radar axis of an instrument course is placed by a measured section', () => {
  // Stats.tsx courseAxes: RADAR_FAMILIES for keys and bass; guitar the first six path families, drums the first seven.
  const AXES: Partial<Record<CourseId, string[]>> = {
    keys: ['scales', 'arpeggios', 'fingers', 'control', 'cadences', 'k-ear'],
    bass: ['b-pluck', 'b-fret', 'b-time', 'b-chord', 'b-walk', 'b-read'],
    guitar: ladderFamiliesFor('guitar', DEFAULT_DRILL_SETTINGS).slice(0, 6),
    drums: ladderFamiliesFor('drums', DEFAULT_DRILL_SETTINGS).slice(0, 7),
  };
  for (const s of SETUPS)
    it(s.name, () => {
      const placed = placedBy(shownStrands(s));
      const fams = AXES[s.course]!.filter((f) => ladderFamiliesFor(s.course, s.ds, s.tuning).includes(f));
      expect(fams.filter((f) => !placed.has(f))).toEqual([]);
    });
});

describe('every step of a section can be reached', () => {
  it('a clean run climbs to the top step within the four takes, for any section length', () => {
    for (let n = 1; n <= 16; n++) {
      let s = startState(n);
      const seen: number[] = [];
      while (s.at >= 0) {
        seen.push(s.at);
        s = advance(recordTake(s, 'clean'), n);
      }
      expect(seen.length, `n=${n}`).toBeLessThanOrEqual(STRAND_TAKES);
      expect(s.lo, `n=${n}`).toBe(n - 1);
    }
    expect(jumpOf(5)).toBe(2);
    expect(jumpOf(8)).toBe(2);
  });
  it('the sections stay short: at most four takes each, and the new ones three or four', () => {
    for (const s of SETUPS) for (const st of shownStrands(s)) expect(Math.min(STRAND_TAKES, st.rungs.length)).toBeLessThanOrEqual(4);
  });
});

describe('the voice test covers every axis of the voice radar', () => {
  // Stats.tsx courseAxes (voice): the six axes and their families.
  const AXES: [string, string[]][] = [
    ['Pitch', ['v-pitch', 'v-ear', 'v-harmony']],
    ['Time', ['v-time', 'v-agility']],
    ['Breath', ['v-breath', 'v-range']],
    ['Shape', ['v-dyn', 'v-vib', 'v-inflect']],
    ['Songs', ['v-songs', 'v-sight', 'v-scale']],
    ['Jazz', ['v-standards', 'v-scat', 'v-barry']],
  ];
  const sections = voiceStrands(DEFAULT_RANGE).map((s) => s.family);
  for (const [axis, fams] of AXES)
    it(`${axis} has a section`, () => {
      expect(fams.some((f) => sections.includes(f)), `${axis}: ${sections.join(',')}`).toBe(true);
    });
  it('the new sections are real takes: two or more steps, rising through the family', () => {
    for (const f of ['v-breath', 'v-dyn', 'v-standards']) {
      const st = voiceStrands(DEFAULT_RANGE).find((x) => x.family === f)!;
      expect(st.rungs.length, f).toBeGreaterThanOrEqual(3);
      expect(st.rungs.map((r) => r.pos)).toEqual([...st.rungs.map((r) => r.pos)].sort((a, b) => a - b));
      for (const r of st.rungs) expect(['range', 'vibrato-register', 'scat']).not.toContain(r.item.kind);
      if (f === 'v-standards') for (const r of st.rungs) expect(r.item.song?.freeUntil).toBeUndefined();
    }
  });
  it('harmony singing is placed by the ear section’s harmony steps, never above them', () => {
    const ear = VOICE_FAMILIES.find((x) => x.id === 'v-ear')!;
    const posOf = (ref: number) => ear.refs.indexOf(ref) + 1;
    expect(withRelatedStarts({})['v-harmony']).toBeUndefined();
    // the ear's steps before its first harmony step: nothing about harmony proved
    expect(withRelatedStarts({ 'v-ear': posOf(1201) })['v-harmony']).toBeUndefined();
    // the first harmony-hold step passed: the first two held-part levels
    expect(withRelatedStarts({ 'v-ear': posOf(1201) + 1 })['v-harmony']).toBe(3);
    // the harder one passed: all held parts, never the moving lines (harmony-line)
    expect(withRelatedStarts({ 'v-ear': posOf(1202) + 1 })['v-harmony']).toBe(4);
    expect(withRelatedStarts({ 'v-ear': 9, 'v-harmony': 6 })['v-harmony']).toBe(6);
  });
});
