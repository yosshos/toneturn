// Ladder steps in the course path (0.61, owner): technique family levels and vocal program levels are path steps,
// passed only by measured playing / singing. Pure: facts are derived from drill items and vocal progress, never stored.

import type { CourseId } from './courses';
import { catalog, type LevelDef } from './drills/generate';
import { guitarCatalog } from './drills/guitar';
import { styleOfLevel } from './styles';
import { pathStyleRank, type StyleFocus } from './styleFocus';
import { guitarAddOnsOf } from './drills/guitarMeta';
import { drumFamilies } from './drills/drums';
import { kitHiddenLevels } from './drumAcoustic';
import { hiddenBassLevels, pianoMicHiddenLevels, type DrumMic, levelDrills, levelStars, shownFamilies, targetBpmOf } from './drills/plan';
import { itemPass } from './drills/ladder';
import type { Drill, DrillSettings, FamilyId, ItemState } from './drills/types';
import { stepCatalogue, stepStars, VOCAL_PROGRAMS, type PathFacts } from './path';
import { testedLevelIds } from './drills/levelTest';
import { voiceStartNow } from './voiceFamilies';

let DIFFS: Map<string, number> | null = null;
/** A technique level's path rating (its placement by difficulty, levelPlacement.ts / path.ts). */
export function techDifficulty(levelId: string): number | undefined {
  if (!DIFFS) {
    DIFFS = new Map();
    for (const s of stepCatalogue()) if (s.kind === 'tech' && s.ladder) DIFFS.set(s.ladder.ref, s.difficulty);
  }
  return DIFFS.get(levelId);
}

let LEVELS: Map<string, LevelDef> | null = null;
/** A technique level by its id ("scales-3", "g-bass-2"). */
export function techLevel(id: string): LevelDef | undefined {
  if (!LEVELS) {
    LEVELS = new Map();
    for (const f of [...catalog(), ...guitarCatalog()]) for (const lv of f.levels) LEVELS.set(lv.id, lv);
  }
  return LEVELS.get(id);
}

/**
 * The guitar add-ons the old settings imply (read-only for one version, SPEC-STYLE-FOCUS §6): the player's choice once
 * made, else the jazz add-on. The path no longer reads it (every family is open; the style focus weighs them).
 */
export function pathGuitarAddOns(ds: Pick<DrillSettings, 'guitarAddOns' | 'guitarStyle'>): NonNullable<DrillSettings['guitarAddOns']> {
  if (ds.guitarAddOns) return ds.guitarAddOns;
  const a = guitarAddOnsOf(ds);
  return a.includes('jazz') ? a : ['jazz', ...a];
}

/**
 * The families / programs a course's path teaches, in teaching order. Other courses: none. SPEC-STYLE-FOCUS §2: every
 * family (no emphasis / add-on / track lock); the style focus decides which STYLED levels the path pushes
 * (ladderHiddenFor), the rest stay open in Practice.
 */
export function ladderFamiliesFor(course: CourseId, _ds: DrillSettings, bassTuning?: string, drumMic?: DrumMic): string[] {
  if (course === 'voice') return VOCAL_PROGRAMS.map((p) => p.id);
  const instrument = course === 'keys' ? 'piano' : course === 'guitar' ? 'guitar' : course === 'bass' ? 'bass' : course === 'drums' ? 'drums' : null;
  if (!instrument) return [];
  // The upright track only for an upright / fretless bass (BASS_AUDIT B16); its families otherwise stay in Drills.
  const upright = bassTuning === 'upright' || bassTuning === 'bass-fretless';
  return shownFamilies({ emphasis: 'both', instrument, drumMic })
    .filter((f) => upright || !(f as { upright?: boolean }).upright)
    .map((f) => f.id);
}

/** Piano levels the course path teaches (every family; the level test offers their steps too — owner 2026-11-19). */
export function pathPianoLevels(_ds?: Pick<DrillSettings, 'emphasis'>): string[] {
  const fams = new Set(ladderFamiliesFor('keys', DEFAULT_PATH_DS));
  return catalog()
    .filter((f) => fams.has(f.id))
    .flatMap((f) => f.levels.map((l) => l.id));
}
const DEFAULT_PATH_DS = { emphasis: 'both' } as DrillSettings;

/**
 * SPEC-STYLE-FOCUS §4: the styled levels a course's path leaves out — those of a style outside the focus (neither the
 * main style nor an "also" style; the jazz core is never styled out). They stay open in Practice.
 */
const styleHiddenCache = new Map<string, string[]>();
export function styleHiddenLevels(course: CourseId, focus: StyleFocus): string[] {
  const key = `${course}|${focus.main}|${focus.also.join('+')}`;
  const hit = styleHiddenCache.get(key);
  if (hit) return hit;
  const out = styleHiddenUncached(course, focus);
  styleHiddenCache.set(key, out);
  return out;
}
function styleHiddenUncached(course: CourseId, focus: StyleFocus): string[] {
  const inst = course === 'keys' ? 'piano' : course === 'guitar' ? 'guitar' : course === 'bass' ? 'bass' : course === 'drums' ? 'drums' : null;
  if (!inst) return [];
  const fams = inst === 'piano' ? catalog() : guitarCatalog().filter((f) => f.instruments.includes(inst));
  return fams.flatMap((f) => f.levels.filter((l) => pathStyleRank(focus, styleOfLevel(l, f)) < 0).map((l) => l.id));
}

/**
 * Ladder levels the course's path leaves out (N10): the low-B levels on a bass without a low B; on drums played by
 * microphone, the levels that need an e-kit (a practice pad: grooves, fills, kit reading — DRUMS_CURRICULUM §3.8; an
 * acoustic kit: all but ACOUSTIC_LEVELS); the MIDI-only piano levels on a microphone-only keyboard; and, with a style
 * focus, the styled levels outside it (styleHiddenLevels).
 */
export function ladderHiddenFor(course: CourseId, bassTuning?: string, drumMic?: DrumMic, pianoMicOnly?: boolean, _ds?: unknown, focus?: StyleFocus): string[] {
  const byStyle = focus ? styleHiddenLevels(course, focus) : [];
  if (course === 'drums') return [...kitHiddenLevels(drumFamilies(), drumMic), ...byStyle];
  if (course === 'keys') return [...(pianoMicOnly ? pianoMicHiddenLevels() : []), ...byStyle];
  return [...(course === 'bass' ? hiddenBassLevels(bassTuning) : []), ...byStyle];
}

/**
 * Stars of a technique level from measured takes (every instrument, plan.levelStars): 1 = three items clean at the start
 * tempo, 2 = a first item passed at the level's target tempo (3 clean takes on 2 days), 3 = three passed (the level is
 * done), 4 = half, 5 = all.
 */
export function techStars(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): number {
  return levelStars(level, items, order);
}

/**
 * A technique step is OPENED (✓ on the path) at this many stars: three keys clean at the base tempo (SPEC-PATH-ROLE
 * §2, §8, owner 2026-11-14). The path teaches what is new; stars 2–5 (keys at the target tempo) are the depth the
 * workout's strengthen block builds. The Drills hub keeps its own level rule (plan.LEVEL_DONE_STARS).
 */
export const TECH_DONE_STARS = 1;
/** Mastered: every key at the target tempo. */
export const TECH_MASTER_STARS = 5;

/**
 * N12: does a finished session credit its path step to the workout block (W2)? A technique step only when its level's
 * measured rule has passed (≥ TECH_DONE_STARS from the drill items) — one session's first-try share never does. Other
 * steps by the session's stars, as before. A session started from the workout counts its MINUTES either way.
 */
export function workoutCreditsStep(step: { id: string; kind: string }, firstTry: number, total: number, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): boolean {
  if (step.kind === 'tech') {
    const lv = techLevel(step.id.replace(/^tech:/, ''));
    return !!lv && techStars(lv, items, order) >= TECH_DONE_STARS;
  }
  return stepStars(step.kind as Parameters<typeof stepStars>[0], firstTry, total) > 0;
}

/**
 * The path facts plus what the drills and the vocal programs measured (like lessons finished elsewhere).
 *
 * N13 (grandfathered, 0.64): builds before 0.64 recorded technique steps (`steps['tech:*']`) from one session's
 * first-try share, some at 1 star. Those facts are KEPT — the path counts any stars > 0 as done, and a player keeps
 * what they were given — and this function only ever raises stars. New technique facts are created only here, from the
 * level rule (≥ TECH_DONE_STARS, SPEC-PATH-ROLE: three keys clean at the base tempo): App.notePathResult returns early for tech steps and the workout credits a tech step only
 * through workoutCreditsStep. So no new 1-star technique fact can appear.
 */
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
    // Levels the playing test proved are ✓ by test (they stay open to practice): below the start by number, and by
    // difficulty every level at or below the hardest of them (levels put in front later count too).
    const tested = testedLevelIds(fam.levels, start, techDifficulty);
    for (const lv of fam.levels) {
      const id = `tech:${lv.id}`;
      if (tested.has(lv.id) && !tests[id]) tests[id] = opts.at;
      // SPEC-PATH-ROLE: a step is opened at 1 star (three keys clean at the base tempo). Facts only rise, so a ✓ given
      // under the old rule (three keys at the target tempo) is never taken away.
      const st = techStars(lv, opts.items, opts.order);
      if (st >= TECH_DONE_STARS) set(id, st);
    }
  }
  for (const pr of VOCAL_PROGRAMS) {
    if (!opts.families.includes(pr.id)) continue;
    // The voice placement probe (VOICE_CURRICULUM §8) saves a start per family in the same drillStart map.
    // P3: levels put in front of a family since the start was saved count too (voiceStartNow).
    const start = voiceStartNow(pr.id, (opts.start as Record<string, number | undefined>)[pr.id]);
    pr.refs.forEach((n, i) => {
      if (i + 1 < start && !tests[`vocal:${n}`]) tests[`vocal:${n}`] = opts.at;
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
