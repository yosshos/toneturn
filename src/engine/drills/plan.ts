// Technique drills: where the player is in each family, and which drills are candidates for Today / the workout
// block / the path's drill steps. Pure.

import type { CustomDrill, Drill, DrillSettings, FamilyId, ItemState } from './types';
import { catalog, generate, keysInOrder, type FamilyDef, type LevelDef } from './generate';
import { customIncluded, customKeys, customToDrill } from './custom';
import { itemPass, todaysItems, type TodayItem } from './ladder';
import { guitarCatalog, guitarStyleMatch, type GuitarFamilyDef } from './guitar';
import { tuningById } from '../fretboard';

type Instrument = NonNullable<DrillSettings['instrument']>;
const CAT = catalog();
const GCAT = guitarCatalog();
/** The catalogue of an instrument (default piano). */
export const families = (instrument: Instrument = 'piano'): FamilyDef[] => (instrument === 'piano' ? CAT : GCAT.filter((f) => f.instruments.includes(instrument)));
export const familyById = (id: FamilyId): FamilyDef | undefined => CAT.find((f) => f.id === id) ?? GCAT.find((f) => f.id === id);

/** What the hub filters by: the piano emphasis, or the guitar instrument + style (genre); bass: the bass tuning. */
export type ShowSettings = Pick<DrillSettings, 'emphasis'> & Partial<Pick<DrillSettings, 'instrument' | 'guitarStyle'>> & { bassTuning?: string };

/** Levels written for a low B string (B13): on a bass without one (lowest open string above B0) they are hidden (N10). */
export const LOW_B_LEVELS = ['b-walk-17', 'b-styles-14'];
/** The bass tuning has a low B (B0 = 23; the default 4-string E1 = 28 and drop D's D1 = 26 don't). */
export const hasLowB = (bassTuning?: string): boolean => {
  const tu = tuningById(bassTuning ?? 'bass');
  return tu.instrument === 'bass' && Math.min(...tu.open) <= 24;
};
/** Level ids hidden on this bass tuning (path and hub). */
export const hiddenBassLevels = (bassTuning?: string): string[] => (hasLowB(bassTuning) ? [] : LOW_B_LEVELS);

/**
 * The families the player's settings show. Piano (default): the emphasis (classical / jazz / both). Guitar / bass:
 * the families of that instrument whose genres match the guitar style, each with only its matching levels.
 */
export function shownFamilies(settings: ShowSettings): FamilyDef[] {
  const inst = settings.instrument ?? 'piano';
  if (inst === 'piano') return CAT.filter((f) => settings.emphasis === 'both' || f.style === settings.emphasis);
  const style = settings.guitarStyle;
  const hidden = inst === 'bass' ? hiddenBassLevels(settings.bassTuning) : [];
  // Retired families (the old g-bass starter) keep their ids for progress but are not shown.
  return GCAT.filter((f) => f.instruments.includes(inst) && !f.retired && guitarStyleMatch(f.genres, style))
    .map((f): GuitarFamilyDef => ({ ...f, levels: f.levels.filter((l) => guitarStyleMatch(l.genres, style) && !hidden.includes(l.id)) }))
    .filter((f) => f.levels.length > 0);
}

/** Keys of a level in the player's order. */
export function levelKeys(level: LevelDef, order: DrillSettings['keyOrder']): number[] {
  if (Array.isArray(level.keys)) return level.keys;
  return keysInOrder(order, level.keys === 'minor');
}

const genCache = new Map<string, Drill>();
const gen = (spec: Parameters<typeof generate>[0]): Drill => {
  const k = JSON.stringify(spec);
  let d = genCache.get(k);
  if (!d) {
    d = generate(spec);
    genCache.set(k, d);
  }
  return d;
};

/** Every drill of a level: key by key, each spec (e.g. RH then LH). */
export function levelDrills(level: LevelDef, order: DrillSettings['keyOrder']): Drill[] {
  const out: Drill[] = [];
  for (const key of levelKeys(level, order)) for (const s of level.specs) out.push(gen({ ...s, key }));
  return out;
}

/** One spec of a level through all its keys. */
export function specDrills(level: LevelDef, specIndex: number, order: DrillSettings['keyOrder']): Drill[] {
  return levelKeys(level, order).map((key) => gen({ ...level.specs[specIndex], key }));
}

/** Levels without a stated tempo range: the target is the start tempo + 25 % (about one tempo band). */
export const DEFAULT_TARGET_FACTOR = 1.25;

/** The level a drill belongs to: the level of its family with a spec template the drill was made from. */
export function levelOfDrill(drill: Drill): LevelDef | undefined {
  const fam = familyById(drill.spec.family);
  if (!fam) return undefined;
  const sp = drill.spec as unknown as Record<string, unknown>;
  // Every template whose keys all equal the drill's spec matches; a template that is a subset of a later level's
  // (b-pluck-1 ⊂ b-pluck-2, b-up-pizz-1 ⊂ 2 ⊂ 3 …) would match first, so take the most specific one: the template
  // with the most matching keys. Generation adds keys of its own (instrument, tuning, hands), so an exact match on
  // the union of keys can't be used. Levels that list their keys (b-up-scales-3 = scales-1/2's specs in B♭, E♭, E)
  // match only their own keys.
  let best: LevelDef | undefined;
  let bestN = -1;
  for (const lv of fam.levels) {
    if (Array.isArray(lv.keys) && !lv.keys.includes(drill.spec.key)) continue;
    for (const t of lv.specs) {
      const es = Object.entries(t).filter(([k]) => k !== 'tempo' && k !== 'key');
      if (!es.every(([k, v]) => JSON.stringify(sp[k]) === JSON.stringify(v))) continue;
      if (es.length > bestN) {
        best = lv;
        bestN = es.length;
      }
    }
  }
  return best;
}

/**
 * The level's target tempo for one of its items (A4): the level's stated target (bass levels: `tempo[1]`, never below
 * the item's own start), else the start tempo × DEFAULT_TARGET_FACTOR.
 */
export function targetBpmOf(level: LevelDef | undefined, drill: Drill): number {
  // Untimed items (B10 note finding, N3) have no tempo: they are off the tempo ladder (target = start), so they pass on
  // 3 clean takes on 2 days and never move a goal tempo.
  if (drill.untimed) return drill.startBpm;
  const range = (level as (LevelDef & { tempo?: [number, number] }) | undefined)?.tempo;
  // Eighth-pulse items (7/8, 10/8: ♪ = bpm, N9) start in eighths while the level's range is in quarters: they climb
  // the same ratio as the range from their own start, so they have a ladder too.
  if (range && drill.pulse === 8 && range[0] > 0) return Math.max(drill.startBpm, Math.round((drill.startBpm * range[1]) / range[0]));
  if (range) return Math.max(drill.startBpm, range[1]);
  return Math.round(drill.startBpm * DEFAULT_TARGET_FACTOR);
}

/** The target tempo of an item (pass it to ladder.applyTake as opts.targetBpm). */
export const itemTargetBpm = (drill: Drill): number => targetBpmOf(levelOfDrill(drill), drill);

/**
 * Stars of a level from measured takes (A4): 1 = min(3, items) items clean at the start tempo, 2 = half the items
 * passed at the target tempo (3 clean on 2 days, ladder.itemPass), 3 = 75 % passed. Self-report never counts.
 */
export function levelStars(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): number {
  const ds = levelDrills(level, order);
  if (!ds.length) return 0;
  const ps = ds.map((d) => itemPass(items[d.itemId], d.startBpm, targetBpmOf(level, d)));
  const passed = ps.filter((p) => p.target).length / ds.length;
  if (passed >= 0.75 - 1e-9) return 3;
  if (passed >= 0.5 - 1e-9) return 2;
  return ps.filter((p) => p.start).length >= Math.min(3, ds.length) ? 1 : 0;
}

/** A level counts as done at 2 stars: half its items passed at the level's target tempo (the path's rule too). */
export function levelDone(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): boolean {
  return levelStars(level, items, order) >= 2;
}

/** The level the player works on in a family: the first not-done level, never below the level test's start. */
export function currentLevel(fam: FamilyDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder'], start?: number): LevelDef {
  const from = Math.max(1, start ?? 1);
  const lv = fam.levels.find((l) => l.level >= from && !levelDone(l, items, order));
  return lv ?? fam.levels[fam.levels.length - 1];
}

/** Families the player has started (any take) — Today prefers them; new players get scales + fingers (+ harris for jazz). */
export function activeFamilies(settings: DrillSettings & { bassTuning?: string }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}): FamilyDef[] {
  const shown = shownFamilies(settings);
  const used = shown.filter((f) => Object.values(items).some((s) => s.family === f.id && s.takes > 0) || start[f.id] !== undefined);
  if (used.length) return used;
  const inst = settings.instrument ?? 'piano';
  if (inst !== 'piano') {
    const firstG: FamilyId[] = inst === 'bass' ? ['b-pluck', 'b-time'] : ['g-fretting', 'g-chords', 'g-scales'];
    const fs = shown.filter((f) => firstG.includes(f.id));
    return fs.length ? fs : shown.slice(0, 2);
  }
  const first: FamilyId[] = settings.emphasis === 'jazz' ? ['harris', 'voicings'] : settings.emphasis === 'classical' ? ['scales', 'fingers'] : ['scales', 'fingers', 'harris'];
  return shown.filter((f) => first.includes(f.id));
}

/** Candidates for Today: the current level of each active family, plus the player's own drills (first 3 keys). */
export function candidates(settings: DrillSettings & { bassTuning?: string }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}, customs: CustomDrill[] = []): Drill[] {
  const out: Drill[] = [];
  for (const f of activeFamilies(settings, items, start)) out.push(...levelDrills(currentLevel(f, items, settings.keyOrder, start[f.id]), settings.keyOrder));
  // The player's own drills (drill creator), for this instrument and included in Today: their first 3 keys.
  for (const c of customs) if (customIncluded(c, 'today', settings.instrument ?? 'piano')) for (const k of customKeys(c, settings.keyOrder).slice(0, 3)) out.push(customToDrill(c, k));
  return out;
}

/** Today's technique items (spec AI §9) for the hub, the workout block and the path's drill steps. */
export function todayDrills(settings: DrillSettings & { bassTuning?: string }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}, customs: CustomDrill[] = [], n = 5, now: number | string = Date.now()): TodayItem[] {
  return todaysItems(items, candidates(settings, items, start, customs), n, now);
}

/** Best tempo band reached per key for a family (heat map): 0 = not played. */
export function keyHeat(family: FamilyId, items: Record<string, ItemState>): number[] {
  const out = Array<number>(12).fill(0);
  for (const s of Object.values(items)) {
    if (s.family !== family || s.cleanBpm <= 0) continue;
    const band = Math.min(3, 1 + Math.floor(s.cleanBpm / 60));
    out[s.key] = Math.max(out[s.key], band);
  }
  return out;
}

/**
 * The player's bass tuning on a run of drills (5-string, 6-string, drop D): bass-course drills without a tuning of
 * their own are rebuilt on it. Their item ids ignore the tuning, so progress is the same item on any bass.
 */
export function withBassTuning(drills: Drill[], tuning: string | undefined): Drill[] {
  if (!tuning || tuning === 'bass' || !tuningById(tuning) || tuningById(tuning).instrument !== 'bass' || tuningById(tuning).id !== tuning) return drills;
  return drills.map((d) => (d.spec.family.startsWith('b-') && !d.spec.tuning ? gen({ ...d.spec, tuning }) : d));
}