// Ladder steps in the course path (0.61, owner): technique family levels and vocal program levels are path steps,
// passed only by measured playing / singing. Pure: facts are derived from drill items and vocal progress, never stored.

import type { CourseId } from './courses';
import { catalog, type LevelDef } from './drills/generate';
import { guitarCatalog } from './drills/guitar';
import { hiddenBassLevels, levelDrills, levelStars, shownFamilies, targetBpmOf } from './drills/plan';
import { itemPass } from './drills/ladder';
import type { Drill, DrillSettings, FamilyId, ItemState } from './drills/types';
import { VOCAL_PROGRAMS, type PathFacts } from './path';

let LEVELS: Map<string, LevelDef> | null = null;
/** A technique level by its id ("scales-3", "g-bass-2"). */
export function techLevel(id: string): LevelDef | undefined {
  if (!LEVELS) {
    LEVELS = new Map();
    for (const f of [...catalog(), ...guitarCatalog()]) for (const lv of f.levels) LEVELS.set(lv.id, lv);
  }
  return LEVELS.get(id);
}

/** The families / programs a course's path teaches, in teaching order. Other courses: none. */
export function ladderFamiliesFor(course: CourseId, ds: DrillSettings, bassTuning?: string): string[] {
  if (course === 'voice') return VOCAL_PROGRAMS.map((p) => p.id);
  const instrument = course === 'keys' ? 'piano' : course === 'guitar' ? 'guitar' : course === 'bass' ? 'bass' : null;
  if (!instrument) return [];
  // The upright track only for an upright / fretless bass (BASS_AUDIT B16); its families otherwise stay in Drills.
  const upright = bassTuning === 'upright' || bassTuning === 'bass-fretless';
  return shownFamilies({ emphasis: ds.emphasis, instrument, guitarStyle: ds.guitarStyle })
    .filter((f) => upright || !(f as { upright?: boolean }).upright)
    .map((f) => f.id);
}

/** Ladder levels the course's path leaves out (N10): the low-B levels on a bass without a low B. */
export function ladderHiddenFor(course: CourseId, bassTuning?: string): string[] {
  return course === 'bass' ? hiddenBassLevels(bassTuning) : [];
}

/**
 * Stars of a technique level from measured takes (BASS_AUDIT A4, every instrument): 1 = three items clean at the start
 * tempo, 2 = half the items passed at the level's target tempo (3 clean takes on 2 days), 3 = 75 % passed.
 */
export function techStars(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): number {
  return levelStars(level, items, order);
}

/** A technique step is done on the path at this many stars (1 star only shows progress). */
export const TECH_DONE_STARS = 2;

/** The path facts plus what the drills and the vocal programs measured (like lessons finished elsewhere). */
export function withLadderFacts(
  f: PathFacts,
  opts: { families: string[]; items: Record<string, ItemState>; order: DrillSettings['keyOrder']; start: Partial<Record<FamilyId, number>>; vocalPassed: number[]; at: string },
): PathFacts {
  if (!opts.families.length) return f;
  const steps = { ...(f.steps ?? {}) };
  const tests = { ...(f.tests ?? {}) };
  const set = (id: string, stars: number) => {
    if (stars > (steps[id]?.stars ?? 0)) steps[id] = { stars, at: steps[id]?.at ?? opts.at, times: Math.max(1, steps[id]?.times ?? 0), firstAt: steps[id]?.firstAt ?? opts.at };
  };
  for (const fam of [...catalog(), ...guitarCatalog()]) {
    if (!opts.families.includes(fam.id)) continue;
    const start = opts.start[fam.id as FamilyId] ?? 1;
    for (const lv of fam.levels) {
      const id = `tech:${lv.id}`;
      // Levels below the playing test's start are ✓ by test (they stay open to practise).
      if (lv.level < start && !tests[id]) tests[id] = opts.at;
      // The path marks a step done at any stars > 0, so a technique step's facts exist only from 2 stars.
      const st = techStars(lv, opts.items, opts.order);
      if (st >= TECH_DONE_STARS) set(id, st);
    }
  }
  for (const pr of VOCAL_PROGRAMS) {
    if (!opts.families.includes(pr.id)) continue;
    pr.levels.forEach((_, i) => {
      const n = pr.base + i + 1;
      if (opts.vocalPassed.includes(n)) set(`vocal:${n}`, 3);
    });
  }
  return { ...f, steps, tests };
}

/**
 * A path step's session for a technique level: its items not yet passed at the target tempo first (started ones before
 * fresh ones, key order), then the passed ones, least secure first.
 */
export function techQueue(levelId: string, items: Record<string, ItemState>, order: DrillSettings['keyOrder'], n = 5): Drill[] {
  const lv = techLevel(levelId);
  if (!lv) return [];
  const ds = levelDrills(lv, order);
  const passed = (d: Drill) => itemPass(items[d.itemId], d.startBpm, targetBpmOf(lv, d)).target;
  const open = ds.filter((d) => !passed(d));
  const started = open.filter((d) => (items[d.itemId]?.cleanBpm ?? 0) > 0);
  const fresh = open.filter((d) => !((items[d.itemId]?.cleanBpm ?? 0) > 0));
  const known = ds.filter(passed).sort((a, b) => (items[a.itemId]?.cleanBpm ?? 0) - (items[b.itemId]?.cleanBpm ?? 0));
  return [...started, ...fresh, ...known].slice(0, n);
}
