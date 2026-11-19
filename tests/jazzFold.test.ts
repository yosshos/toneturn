// SPEC-JAZZ-FOLD (owner 2026-11-19): the Jazz course is folded into the other courses — its ear and theory are Ear's
// top levels, its playing the instrument courses', gated by the jazz pack per course; climbing to mf opens it; "jazz
// focus" is a mode; old Jazz-course players move to Ear in jazz focus with everything kept.
import { describe, expect, it } from 'vitest';
import { COURSES, COURSE_IDS, courseInput, courseOf, inCourse, isJazzStep, JAZZ_FAMILIES, JAZZ_FREE_LEVELS, migrateJazzCourse, normCourse, type CourseId } from '../src/engine/courses';
import { backgroundPacks, coursePacks, coursesToOpen, JAZZ_OPEN_AT, jazzOpenIn, jazzOpenWhy, toggleJazzFocus } from '../src/engine/jazzFold';
import { DYN, courseOfResult, friendsInCourse } from '../src/engine/courseSocial';
import { buildPath, eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { catalog } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { BASS_TRACK } from '../src/engine/drills/bassNiche';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { ladderOf, LADDERS, placementLesson, planPlacement } from '../src/engine/placement';
import { courseGames, courseRows } from '../src/ui/courseRows';
import { workoutGame } from '../src/engine/workout2';
import { courseOpener, COURSE_OPENERS, JAZZ_LEG } from '../src/content/openers';
import { DEFAULT_SETTINGS, migrateSettings, type Settings } from '../src/storage/progress';
import type { Ratings } from '../src/engine/rating';
import '../src/engine/topics';

const base: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-19T10:00:00Z') };
const withLadders = (c: CourseId, inp: PathInput): PathInput => {
  const fams = ladderFamiliesFor(c, DEFAULT_DRILL_SETTINGS);
  return fams.length ? { ...inp, ladderFamilies: fams, ladderHidden: ladderHiddenFor(c, undefined, undefined, false, DEFAULT_DRILL_SETTINGS) } : inp;
};
const stepsOf = (c: CourseId, packs: PathInput['packs'], focus = false) => {
  const inp = withLadders(c, courseInput({ ...base, packs }, c, false, focus));
  return stepCatalogue().filter((s) => eligible(s, inp));
};

describe('no Jazz course any more', () => {
  it('the course list has no jazz; old ids read as Ear and never crash', () => {
    expect(COURSE_IDS as string[]).not.toContain('jazz');
    expect(COURSES.map((c) => c.id) as string[]).not.toContain('jazz');
    expect(normCourse('jazz')).toBe('ear');
    expect(courseOf('jazz').id).toBe('ear');
    expect(courseOfResult({ lessonId: 'practice-log', completedAt: '2026-11-01', xp: 10, course: 'jazz' as never })).toBe('ear');
    // A friend on an old app who sent only a jazz level shows on the Ear board.
    expect(friendsInCourse([{ name: 'Old', relation: 'friend', course_levels: { jazz: 'f' } }], 'ear', null).rows.map((r) => r.level)).toEqual(['f']);
  });
  it('every jazz step belongs to Ear or to the instrument / voice course that plays or sings it', () => {
    for (const s of stepCatalogue().filter((x) => isJazzStep(x))) {
      const homes = COURSE_IDS.filter((c) => inCourse(s, c));
      expect(homes.length, s.id).toBeGreaterThan(0);
      if (!s.forPlays?.length && !s.sung && s.domain !== 'voice') expect(homes, s.id).toContain('ear');
    }
  });
});

describe('the jazz families (instrument courses)', () => {
  it('cover the piano jazz style (but the accompaniment hand and generic improvising), the guitar jazz add-on and the bass jazz track', () => {
    for (const f of catalog().filter((x) => (x as { style?: string }).style === 'jazz' && x.id !== 'accomp' && x.id !== 'k-impro')) expect(JAZZ_FAMILIES, f.id).toContain(f.id);
    for (const f of guitarCatalog().filter((x) => (x as { addOn?: string }).addOn === 'jazz' && !(x as { retired?: boolean }).retired)) expect(JAZZ_FAMILIES, f.id).toContain(f.id);
    for (const [f, t] of Object.entries(BASS_TRACK)) if (t === 'jazz') expect(JAZZ_FAMILIES, f).toContain(f);
    for (const f of ['accomp', 'k-impro', 'g-impro', 'b-impro', 'scales']) expect(JAZZ_FAMILIES).not.toContain(f);
    expect(JAZZ_FREE_LEVELS).toEqual(['voicings-1', 'voicings-2']);
  });
});

describe('gating by background (SPEC-JAZZ-FOLD §2)', () => {
  it('a beginner (explorer / hobby) has no jazz in Ear, keys, guitar, bass or voice; a student / pro has it', () => {
    expect(backgroundPacks({ track: 'explorer' })).not.toContain('jazz');
    expect(backgroundPacks({ track: 'hobby' })).not.toContain('jazz');
    expect(backgroundPacks({ track: 'student' })).toContain('jazz');
    expect(backgroundPacks({ track: 'pro' })).toContain('jazz');
    for (const c of ['ear', 'keys', 'guitar', 'bass', 'voice'] as CourseId[]) {
      const closed = stepsOf(c, coursePacks({ track: 'hobby' }, c));
      const open = stepsOf(c, coursePacks({ track: 'student' }, c));
      expect(closed.filter((s) => isJazzStep(s)).map((s) => s.id), c).toEqual([]);
      expect(open.filter((s) => isJazzStep(s)).length, c).toBeGreaterThan(c === 'voice' ? 5 : 20);
    }
  });
  it('Ear holds the old Jazz ear: Barry Harris, reharm and colour, negative harmony, jazz forms, ii–V chains, voicing types, the jazz lessons', () => {
    const ids = new Set(stepsOf('ear', ['jazz']).map((s) => s.id));
    for (const id of ['topic:bh-convert:1', 'topic:reharm-spot:1', 'topic:negative-harmony:1', 'topic:jazz-form:1', 'topic:jazz-chains:1', 'topic:voicing-type:1', 'topic:swing-ratio:1', 'lesson:jazz-1', 'lesson:jazz-welcome', 'licks:jazz:1', 'bonus:jazz:reharm', 'rep:jazz:autumn']) expect(ids.has(id), id).toBe(true);
    // None of it for a beginner.
    const beginner = new Set(stepsOf('ear', []).map((s) => s.id));
    for (const id of ['topic:bh-convert:1', 'lesson:jazz-1', 'licks:jazz:1', 'bonus:jazz:reharm', 'rep:jazz:autumn']) expect(beginner.has(id), id).toBe(false);
  });
  it('the playing courses hold the performed jazz: comping, Harris, walking, scat', () => {
    expect(stepsOf('keys', ['jazz']).some((s) => s.ladder?.family === 'harris')).toBe(true);
    expect(stepsOf('keys', []).some((s) => s.ladder?.family === 'harris')).toBe(false);
    expect(stepsOf('bass', ['jazz']).some((s) => s.ladder?.family === 'b-walk')).toBe(true);
    expect(stepsOf('bass', []).some((s) => s.ladder?.family === 'b-walk')).toBe(false);
    expect(stepsOf('voice', ['jazz']).some((s) => s.ladder?.family === 'v-scat')).toBe(true);
    // The first voicings (triads, 7th chords) and generic improvising stay for everyone.
    expect(stepsOf('keys', []).some((s) => s.ladder?.ref === 'voicings-1')).toBe(true);
    expect(stepsOf('keys', []).some((s) => s.ladder?.family === 'k-impro')).toBe(true);
  });
  it('an explicit instrument choice opens jazz in that course (piano emphasis, guitar add-on, bass track)', () => {
    expect(jazzOpenWhy({ track: 'hobby', drills: { emphasis: 'jazz' } }, 'keys')).toBe('instrument');
    expect(jazzOpenWhy({ track: 'hobby', drills: { guitarAddOns: ['jazz'] } }, 'guitar')).toBe('instrument');
    expect(jazzOpenWhy({ track: 'hobby', drills: { bassTrack: 'jazz' } }, 'bass')).toBe('instrument');
    expect(jazzOpenIn({ track: 'hobby', drills: { emphasis: 'jazz' } }, 'ear')).toBe(false);
  });
  it('the Practice rows, games and workout follow the pack', () => {
    expect(courseGames('ear', false)).not.toContain('reharm');
    expect(courseGames('ear', true)).toContain('reharm');
    expect(courseRows('ear', false, 'off')).not.toContain('standards');
    expect(courseRows('ear', false, 'on')).toEqual(expect.arrayContaining(['standards', 'charts', 'improv']));
    expect(courseRows('ear', false, 'focus')[0]).toBe('standards');
    expect(courseRows('keys', false, 'on')).toContain('improv');
    expect(courseRows('ear', true, 'focus')[0]).toBe('exams');
    for (let d = 1; d <= 20; d++) expect(['reharm', 'mirror', 'rush-voicing', 'holdnote', 'whichpair']).not.toContain(workoutGame('ear', `2026-11-${String(d).padStart(2, '0')}`, 'off'));
  });
  it('the Find-my-level ladders drop their jazz rungs for a beginner', () => {
    expect(ladderOf('chords', true).length).toBeLessThan(LADDERS.chords!.length);
    expect(ladderOf('chords', true).every((r) => !r.jazz)).toBe(true);
    // A perfect beginner tops out below the jazz rungs.
    const answers: { skill: 'chords'; level: number; outcome: 'correct' }[] = [];
    for (let i = 0; i < 20; i++) {
      const p = planPlacement(answers, ['chords'], { noJazz: true });
      if (!p.next) break;
      answers.push({ skill: 'chords', level: p.next.level, outcome: 'correct' });
    }
    expect(Math.max(...answers.map((a) => a.level))).toBeLessThanOrEqual(ladderOf('chords', true).length);
    expect((placementLesson(1, { skills: ['chords'], noJazz: true }) as { placementNoJazz?: boolean }).placementNoJazz).toBe(true);
  });
});

describe('a beginner who climbs gets jazz opened (SPEC-JAZZ-FOLD §3)', () => {
  it('the threshold is the mf level, where the student track starts', () => {
    expect(JAZZ_OPEN_AT).toBe(DYN.find((d) => d.name === 'mf')!.from);
  });
  it('opens a course once its level reaches mf; never one that is open; never closes', () => {
    const low = { intervals: { r: 1000, n: 40, correct: 30, recent: [] }, degrees: { r: 1000, n: 40, correct: 30, recent: [] } } as unknown as Ratings;
    const high = { intervals: { r: 1250, n: 40, correct: 30, recent: [] }, degrees: { r: 1250, n: 40, correct: 30, recent: [] }, chords: { r: 1200, n: 40, correct: 30, recent: [] } } as unknown as Ratings;
    const s = { track: 'hobby' as const, courses: ['ear', 'keys'] as CourseId[] };
    expect(coursesToOpen(s, low)).toEqual([]);
    expect(coursesToOpen(s, high)).toEqual(['ear']);
    expect(coursesToOpen({ ...s, jazzOpen: ['ear'] }, high)).toEqual([]);
    expect(coursesToOpen({ ...s, track: 'student' }, high)).toEqual([]);
    expect(jazzOpenWhy({ ...s, jazzOpen: ['ear'] }, 'ear')).toBe('climbed');
  });
});

describe('jazz focus (SPEC-JAZZ-FOLD §4)', () => {
  it('opens the pack whatever the background, uses the jazz goal in Ear, and prefers jazz steps', () => {
    expect(jazzOpenWhy({ track: 'explorer', jazzFocus: ['keys'] }, 'keys')).toBe('focus');
    expect(toggleJazzFocus({ jazzFocus: ['ear'] }, 'keys', true)).toEqual(['ear', 'keys']);
    expect(toggleJazzFocus({ jazzFocus: ['ear', 'keys'] }, 'ear', false)).toEqual(['keys']);
    const inp = courseInput({ ...base, packs: [] }, 'ear', false, true);
    expect(inp.packs).toContain('jazz');
    expect(inp.goal).toBe('jazz');
    expect(inp.jazzFocus).toBe(true);
    // A student with the pack open: jazz focus brings more jazz into the first units.
    const units = (focus: boolean) => {
      const v = buildPath({ ...courseInput({ ...base, track: 'student', packs: ['jazz'] }, 'ear', false, focus), ratings: { degrees: { r: 1250, n: 30, correct: 25, recent: [] }, intervals: { r: 1250, n: 30, correct: 25, recent: [] }, chords: { r: 1250, n: 30, correct: 25, recent: [] }, cadences: { r: 1250, n: 30, correct: 25, recent: [] } } as never });
      return v.units.flatMap((u) => u.steps.map((x) => x.step)).filter((s) => isJazzStep(s)).length;
    };
    expect(units(true)).toBeGreaterThanOrEqual(units(false));
  });
});

describe('migration of an old Jazz-course player (SPEC-JAZZ-FOLD §5)', () => {
  const jazzFacts = { steps: { 'topic:bh-convert:1': { stars: 3, at: '2026-11-10' }, 'lesson:jazz-1': { stars: 2, at: '2026-11-09' }, 'tech:k-comp-1': { stars: 3, at: '2026-11-11' } }, units: [{ id: 'j1', n: 1, steps: ['lesson:jazz-1'], checked: [], at: '2026-11-09' }] };
  const earFacts = { steps: { 'topic:intervals-all:1': { stars: 3, at: '2026-11-01' } } };
  const keysFacts = { steps: { 'tech:scales-1': { stars: 3, at: '2026-11-02' } } };
  const old = (): Settings =>
    ({
      ...DEFAULT_SETTINGS,
      courses: ['ear', 'keys', 'jazz'],
      activeCourse: 'jazz',
      pathFacts: jazzFacts,
      pathKeep: ['topic:bh-convert:1'],
      pathFactsBy: { ear: earFacts, keys: keysFacts },
      pathKeepBy: { ear: ['x'] },
      courseStart: { jazz: { report: 'well', welcomeAt: '2026-11-08', setupAt: '2026-11-08' }, keys: { legacy: true } },
      openers: { course: { jazz: '2026-11-08' } },
    }) as unknown as Settings;
  it('lands in Ear with jazz focus on in Ear and the instrument course, every fact kept, a one-time notice', () => {
    const m = migrateSettings(old());
    expect(m.courses).toEqual(['ear', 'keys']);
    expect(m.activeCourse).toBe('ear');
    expect(m.jazzFocus).toEqual(expect.arrayContaining(['ear', 'keys']));
    expect(m.jazzNotice).toBe('fold');
    expect(m.jazzOpen).toEqual(expect.arrayContaining(['ear', 'keys']));
    // Ear's live facts: Ear's own and the jazz path's (the same step ids).
    for (const id of ['topic:intervals-all:1', 'topic:bh-convert:1', 'lesson:jazz-1', 'tech:k-comp-1']) expect(m.pathFacts?.steps?.[id], id).toBeTruthy();
    expect(m.pathKeep).toEqual(expect.arrayContaining(['x', 'topic:bh-convert:1']));
    expect(m.pathFactsBy?.keys).toEqual(keysFacts);
    expect((m.pathFactsBy as Record<string, unknown>).jazz).toBeUndefined();
    // The course start and the opener seen moved to Ear (Ear had none).
    expect(m.courseStart?.ear?.report).toBe('well');
    expect((m.courseStart as Record<string, unknown>).jazz).toBeUndefined();
    expect(m.openers?.course?.ear).toBe('2026-11-08');
    // And the jazz pack is open there, so the jazz steps are on the Ear path.
    expect(jazzOpenIn(m, 'ear')).toBe(true);
  });
  it('another course active: Ear waits parked with the jazz facts merged in; idempotent; nothing else touched', () => {
    const s = { ...old(), activeCourse: 'keys', pathFacts: keysFacts, pathFactsBy: { ear: earFacts, jazz: jazzFacts } } as unknown as Settings;
    const m = migrateSettings(s);
    expect(m.activeCourse).toBe('keys');
    expect(m.pathFacts).toEqual(keysFacts);
    expect(Object.keys(m.pathFactsBy?.ear?.steps ?? {})).toEqual(expect.arrayContaining(['topic:intervals-all:1', 'lesson:jazz-1']));
    expect(migrateSettings(m)).toEqual(m);
    // A player who never had Jazz is left alone.
    const plain = { ...DEFAULT_SETTINGS, courses: ['ear'], activeCourse: 'ear' } as Settings;
    expect(migrateJazzCourse(plain)).toBe(plain);
  });
  it('the jazz goal starts in Ear with jazz focus', () => {
    const m = migrateSettings({ ...DEFAULT_SETTINGS, goal: 'jazz', courses: undefined, activeCourse: undefined } as unknown as Settings);
    expect(m.activeCourse).toBe('ear');
    expect(m.jazzFocus).toEqual(['ear']);
  });
});

describe('course openers show the jazz goal only with the pack open', () => {
  it('a jazz station ends the road of Ear and each playing course; closed, the course\'s own five stops', () => {
    for (const c of ['ear', 'keys', 'guitar', 'bass', 'voice', 'drums'] as CourseId[]) {
      const leg = JAZZ_LEG[c]!;
      expect(leg, c).toBeDefined();
      expect(courseOpener(c, false)).toBe(COURSE_OPENERS[c]);
      const open = courseOpener(c, true).road.stations;
      expect(open.length, c).toBe(5);
      expect(open[4], c).toBe(leg.station);
      expect(leg.station.name.he.length).toBeGreaterThan(2);
      expect(leg.station.desc.en.split(/\s+/).length).toBeLessThanOrEqual(6);
    }
    expect((COURSE_OPENERS as Record<string, unknown>).jazz).toBeUndefined();
  });
});
