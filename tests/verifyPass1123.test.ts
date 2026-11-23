// Verification pass 2026-11-23: neighbour-style moments for every player (SPEC-STYLE-FOCUS §9) and on bass / drums;
// the b-latin and songo leaks gated by their claims; the Ear course's charts by its own areas; the snapshot store's
// writes in turn; comping by ear ("chords on time", SPEC-EAR-AND-READING §3.3); the key page's "now improvise with it"
// on guitar and bass (SPEC-LICKS-IN-IMPROV §5.4).
import { describe, expect, it } from 'vitest';
import { courseInput, type CourseId } from '../src/engine/courses';
import { buildPath, eligible, momentInput, stepCatalogue, type PathFacts, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { NEIGHBOUR_MOMENTS, neighbourMoments } from '../src/engine/pathBonus';
import { isVerified, itemIdVerified, BASS_KIND_LEVEL, UNVERIFIED_CLAIMS, SWITCHED_ON } from '../src/engine/verifiedContent';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { MINI_LESSONS } from '../src/content/minilessons';
import { GROOVES } from '../src/engine/grooves';
import { GROOVE_STYLES } from '../src/engine/nameGroove';
import { DRUM_STYLES, LOOK_ALIKES, STYLE_POOL } from '../src/engine/topicsDrumStyle';
import { ladderByWeek, weekTiles } from '../src/engine/progressSeries';
import type { Snapshot } from '../src/engine/snapshot';
import { loadSnapshots, noteImprovTake, recordSnapshot, resetSnapshotStore } from '../src/storage/snapshots';
import type { KV } from '../src/storage/kv';
import { compOnTime, isVoicingOf } from '../src/engine/compByEar';
import { freshInKey } from '../src/ui/PracticeKeys';
import { lickDrill, LICKS } from '../src/engine/licks';
import { itemTargetBpm } from '../src/engine/drills/plan';
import type { ItemState } from '../src/engine/drills/types';
import '../src/engine/topics';

const JAZZ = { main: 'jazz' as const, also: [] };
const base: PathInput = { track: 'student', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-23T10:00:00Z') };
const inputOf = (course: CourseId, facts: PathFacts = {}): PathInput => ({
  ...courseInput(base, course),
  ladderFamilies: ladderFamiliesFor(course, DEFAULT_DRILL_SETTINGS),
  ladderHidden: ladderHiddenFor(course, undefined, undefined, false, DEFAULT_DRILL_SETTINGS, JAZZ),
  styleFocus: JAZZ,
  facts,
});

describe('neighbour-style moments reach the default jazz player (§9)', () => {
  const byId = new Map(stepCatalogue().map((s) => [s.id, s]));
  it('every moment is a verified level of the catalogue; bass and drums have theirs', () => {
    for (const m of NEIGHBOUR_MOMENTS.flatMap((x) => x.moments)) {
      expect(byId.has(m.level), m.level).toBe(true);
      expect(isVerified(`level:${m.level.replace(/^tech:/, '')}`), m.level).toBe(true);
    }
    expect(neighbourMoments(['tech:b-walk-1'], byId).map((m) => m.ladder?.ref)).toEqual(['b-styles-7']);
    expect(neighbourMoments(['tech:d-jazz-1'], byId).map((m) => m.ladder?.ref)).toEqual(['d-latin-1']);
  });
  it('a jazz focus hides the styled levels, but not their moments', () => {
    for (const [course, core] of [['keys', 'tech:voicings-3'], ['guitar', 'tech:g-jazz-1'], ['bass', 'tech:b-walk-1'], ['drums', 'tech:d-jazz-1']] as const) {
      const inp = inputOf(course);
      for (const m of neighbourMoments([core], byId)) {
        expect(inp.ladderHidden, `${course} ${m.id}`).toContain(m.ladder!.ref);
        expect(eligible(m, inp), m.id).toBe(false);
        expect(eligible(m, momentInput(m, inp)), m.id).toBe(true);
      }
    }
  });
  it('another reason to hide the level stays (listed once per reason)', () => {
    const m = neighbourMoments(['tech:d-jazz-1'], byId)[0];
    const inp = { ...inputOf('drums'), ladderHidden: ['d-latin-1', ...inputOf('drums').ladderHidden!] };
    expect(eligible(m, momentInput(m, inp))).toBe(false);
  });
  it('a path unit holding the core ii–V–I shows its moments to the jazz player', () => {
    let facts: PathFacts = {};
    let seen = false;
    for (let u = 0; u < 60 && !seen; u++) {
      const v = buildPath({ ...inputOf('keys', facts), packs: ['jazz'] });
      const cur = v.units.find((x) => x.status === 'current');
      if (!cur) break;
      const ids = cur.steps.map((x) => x.step.id);
      if (ids.includes('tech:voicings-3')) {
        seen = true;
        expect(ids).toContain('moment:keys:iivi-bossa');
      }
      const steps = { ...(facts.steps ?? {}) };
      for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-23T10:00:00Z' };
      facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-23T10:00:00Z' }] : [])] };
    }
    expect(seen).toBe(true);
  }, 120_000);
});

describe('the bass Latin cells stay out ("bass-latin-cells")', () => {
  it('saved b-latin 4–7 items do not count; the tumbao and baião do', () => {
    expect(itemIdVerified('b-latin:chacha:0:R:pb1')).toBe(false);
    expect(itemIdVerified('b-latin:songo:9:R:m:pb4')).toBe(false);
    expect(itemIdVerified('b-latin:mozambique:2:R:m:pb4')).toBe(false);
    expect(itemIdVerified('b-latin:afro68:4:R:m:pb3')).toBe(false);
    expect(itemIdVerified('b-latin:tumbao:9:R:m')).toBe(true);
    expect(itemIdVerified('b-latin:brazil:0:R:op1:pb4')).toBe(true);
    expect(itemIdVerified('b-latin:brazil:0:R:op0:pb4')).toBe(false);
  });
  it('every hidden bass level is mapped from its kinds', () => {
    const claim = UNVERIFIED_CLAIMS.find((c) => c.id === 'bass-latin-cells')!;
    const levels = claim.hides.filter((h) => h.startsWith('level:b-')).map((h) => h.slice(6));
    expect(Object.values(BASS_KIND_LEVEL).sort()).toEqual(levels.sort());
  });
  it('b-latin 8 is titled "Baião" while the partido-alto cell is hidden', () => {
    const lv = guitarCatalog().find((f) => f.id === 'b-latin')!.levels.find((l) => l.id === 'b-latin-8')!;
    expect(lv.title.en).toBe('Baião');
    expect(lv.title.he).toBe('באיון');
  });
  it('the tumbao mini-lesson no longer teaches cha-cha, songo, Mozambique, 6/8 or partido alto', () => {
    const ml = MINI_LESSONS['bass-tumbao'];
    expect(ml).toBeDefined();
    const text = JSON.stringify(ml);
    for (const w of ['Cha-cha', 'Songo', 'Mozambique', 'six-eight', 'partido']) expect(text, w).not.toContain(w);
    expect(text).toContain('tumbao');
  });
});

describe('the unverified songo kit stays out ("latin-kit-patterns")', () => {
  it('not in the groove bank, Name the Groove or the drum-style topic', () => {
    expect(SWITCHED_ON.has('latin-kit-patterns')).toBe(false);
    expect(GROOVES.map((g) => g.id)).not.toContain('songo');
    expect(GROOVES.map((g) => g.id)).toContain('cha-cha');
    expect(GROOVE_STYLES.map((g) => g.id)).not.toContain('songo');
    expect(DRUM_STYLES.map((s) => s.id)).not.toContain('songo');
    expect(STYLE_POOL.flat()).not.toContain('songo');
    expect(LOOK_ALIKES.flat()).not.toContain('songo');
    expect(LOOK_ALIKES.every((g) => g.length === 3)).toBe(true);
  });
});

describe('the Ear course charts count its own areas', () => {
  const snap = (day: string, o: Partial<Snapshot>): Snapshot => ({ day, status: {}, tempo: {}, minutes: {}, keys: {}, vocab: { played: 0, closed: 0 }, practised: true, channels: { ear: null, reading: null }, ...o }) as Snapshot;
  const days: Record<string, Snapshot> = {
    '2026-11-16': snap('2026-11-16', { status: { 'ear:pitch': { learning: 2 }, 'keys:technique': { closed: 5 } }, ladder: { 'keys:technique': { keys12: 3 } }, minutes: { ear: 10, technique: 30 }, tempo: { 'keys:technique': 0.8 } }),
    '2026-11-23': snap('2026-11-23', { status: { 'ear:pitch': { learning: 1, closed: 2 }, 'keys:technique': { closed: 9 } }, ladder: { 'keys:technique': { keys12: 5 } }, minutes: { ear: 12, games: 3, technique: 40 }, tempo: { 'keys:technique': 0.9 } }),
  };
  const ear = (a: string) => a.startsWith('ear:');
  it('items move up the ladder: only the course areas', () => {
    const w = ladderByWeek(Object.values(days), ear).at(-1)!;
    expect(w.by).toMatchObject({ learning: 1, closed: 2, keys12: 0 });
    expect(ladderByWeek(Object.values(days)).at(-1)!.by.keys12).toBe(5);
  });
  it('the tiles: closed and tempo of the course areas, the ear and games minutes', () => {
    const t = Object.fromEntries(weekTiles(days, '2026-11-23', ear, ['ear', 'games']).map((x) => [x.id, x.now]));
    expect(t.minutes).toBe(15);
    expect(t.tempo).toBe(0);
    const all = Object.fromEntries(weekTiles(days, '2026-11-23').map((x) => [x.id, x.now]));
    expect(all.minutes).toBe(55);
  });
});

describe('the snapshot store writes in turn', () => {
  it('an improvisation take noted while a snapshot is written is not lost', async () => {
    const m = new Map<string, unknown>();
    const slow: KV = {
      get: async <T,>(k: string) => {
        await new Promise((r) => setTimeout(r, 15));
        return structuredClone(m.get(k)) as T | undefined;
      },
      set: async <T,>(k: string, v: T) => {
        await new Promise((r) => setTimeout(r, 15));
        m.set(k, structuredClone(v));
      },
    };
    resetSnapshotStore(slow);
    await Promise.all([recordSnapshot('2026-11-23', {}, {}), noteImprovTake('2026-11-23', 0.5), noteImprovTake('2026-11-23', 1)]);
    const stored = m.get('all') as { improv?: { n: number; inSet: number }; days: Record<string, Snapshot> };
    expect(stored.improv).toMatchObject({ n: 2, inSet: 1.5 });
    expect(Object.keys(await loadSnapshots())).toContain('2026-11-23');
    resetSnapshotStore();
  });
});

describe('comping by ear: chords on time', () => {
  const ii = { root: 2, iv: [0, 3, 7, 10], at: 0, beats: 4 };
  const v = { root: 7, iv: [0, 4, 7, 10], at: 4, beats: 4 };
  const i = { root: 0, iv: [0, 4, 7, 11], at: 8, beats: 8 };
  const chord = (beat: number, ms: number[]) => ms.map((midi, k) => ({ beat: beat + k * 0.02, midi }));
  it('a voicing holds the chord tones with a guide tone and only usual tensions', () => {
    expect(isVoicingOf([5, 9, 0, 4], ii)).toBe(true); // F A C E: Dm9 rootless
    expect(isVoicingOf([11, 4, 5, 9], v)).toBe(true); // B E F A: G13 rootless
    expect(isVoicingOf([2, 7], ii)).toBe(false); // root and 5th: no guide tone
    expect(isVoicingOf([11, 5, 0], v)).toBe(false); // the 4th over G7
  });
  it('the rate: right chords struck on an eighth, from a push before the change to its first bar', () => {
    const notes = [...chord(0, [53, 57, 60, 64]), ...chord(3.5, [59, 64, 65, 69]), ...chord(9.3, [64, 67, 71, 74])];
    const r = compOnTime(notes, [ii, v, i]);
    expect(r.hits).toEqual([true, true, false]); // the last one is off the eighths
    expect(r.rate).toBeCloseTo(2 / 3);
    expect(compOnTime([], [ii]).rate).toBe(0);
  });
});

describe('the key page on guitar and bass: "now improvise with it"', () => {
  it('a lick closed in this key on the instrument in the last three days', () => {
    const l = LICKS[0];
    const now = Date.parse('2026-11-23T12:00:00Z');
    const d = lickDrill(l, 5, 'guitar');
    const t = itemTargetBpm(d);
    const st = { itemId: d.itemId, family: d.spec.family, key: 5, takes: 6, cleanBpm: t, targetBpm: t, last: '2026-11-23T09:00:00Z', history: [], passLog: ['2026-11-21', '2026-11-22', '2026-11-23'].map((at) => ({ at, bpm: t })) } as unknown as ItemState;
    expect(freshInKey([l], 5, { [d.itemId]: st }, 'guitar', now)?.id).toBe(l.id);
    expect(freshInKey([l], 5, { [d.itemId]: st }, 'bass', now)).toBeNull();
    expect(freshInKey([l], 7, { [d.itemId]: st }, 'guitar', now)).toBeNull();
  });
});
