// Technique drills: where the player is in each family, and which drills are candidates for Today / the workout
// block / the path's drill steps. Pure.

import type { CustomDrill, Drill, DrillSettings, FamilyId, ItemState } from './types';
import { catalog, generate, keysInOrder, type FamilyDef, type LevelDef } from './generate';
import { customIncluded, customKeys, customToDrill } from './custom';
import { drillKeyOf, itemPass, todaysItems, type TodayItem } from './ladder';
import { micUnmeasurable, notesPerBeat } from './analyze';
import { inBassTrack } from './bassNiche';
import { FRETLESS_LEVELS } from './bassNiche2';
import { guitarCatalog, guitarLevelShown, guitarStyleMatch, type GuitarFamilyDef } from './guitar';
import { tuningById } from '../fretboard';
import type { DrumFamilyDef } from './drums';
import { kitLevels } from '../drumAcoustic';
import { focusRank, keyMastery, type SkillKeys } from '../analysis/keyMastery';

type Instrument = NonNullable<DrillSettings['instrument']>;
const CAT = catalog();
const GCAT = guitarCatalog();
/** The catalogue of an instrument (default piano). */
export const families = (instrument: Instrument = 'piano'): FamilyDef[] => (instrument === 'piano' ? CAT : GCAT.filter((f) => f.instruments.includes(instrument)));
export const familyById = (id: FamilyId): FamilyDef | undefined => CAT.find((f) => f.id === id) ?? GCAT.find((f) => f.id === id);

/** What the hub filters by: the piano emphasis, or the guitar instrument + style (genre); bass: the bass tuning. */
export type ShowSettings = Pick<DrillSettings, 'emphasis'> & Partial<Pick<DrillSettings, 'instrument' | 'guitarStyle' | 'pianoMicOnly' | 'bassTrack' | 'guitarAddOns'>> & { bassTuning?: string; /** Drums by microphone: a practice pad (single-surface levels, DRUMS_CURRICULUM §3.8) or an acoustic kit (those + basic grooves). */ drumMic?: DrumMic };
/** The drums setup for the level filters (drumKit.drumMicOf): false / undefined = MIDI; true = a practice pad (old callers). */
export type DrumMic = boolean | 'pad' | 'acoustic';

/** Levels written for a low B string (B13): on a bass without one (lowest open string above B0) they are hidden (N10). */
export const LOW_B_LEVELS = ['b-walk-17', 'b-styles-14'];
/** The bass tuning has a low B (B0 = 23; the default 4-string E1 = 28 and drop D's D1 = 26 don't). */
export const hasLowB = (bassTuning?: string): boolean => {
  const tu = tuningById(bassTuning ?? 'bass');
  return tu.instrument === 'bass' && Math.min(...tu.open) <= 24;
};
/** Levels written for six strings (0.66: three notes per string across the neck): only on a 6-string bass. */
export const SIX_STRING_LEVELS = ['b-scale-11'];
/** The bass tuning has six strings. */
export const isSixString = (bassTuning?: string): boolean => {
  const tu = tuningById(bassTuning ?? 'bass');
  return tu.instrument === 'bass' && tu.open.length >= 6;
};
/** Level ids hidden on this bass tuning (path and hub). */
/** The old one-chorus standards levels, replaced by the standards ladder (b-std; owner 2026-11-11). Their ids and
 * progress stay; they are never shown. */
export const RETIRED_BASS_LEVELS = ['b-walk-11', 'b-walk-13', 'b-walk-14', 'b-walk-18'];
export const hiddenBassLevels = (bassTuning?: string): string[] => [...RETIRED_BASS_LEVELS, ...(hasLowB(bassTuning) ? [] : LOW_B_LEVELS), ...(isSixString(bassTuning) ? [] : SIX_STRING_LEVELS), ...(isFretlessBass(bassTuning) ? [] : FRETLESS_LEVELS)];
/** BASS_NICHE_PLAN P4: the fretless-intonation level shows only on a fretless bass or an upright (unfretted tunings). */
export const isFretlessBass = (bassTuning?: string): boolean => {
  const tu = tuningById(bassTuning ?? 'bass');
  return tu.instrument === 'bass' && tu.fretted === false;
};

/**
 * The families the player's settings show. Piano (default): the emphasis (classical / jazz / both). Guitar / bass:
 * the families of that instrument whose genres match the guitar style, each with only its matching levels.
 */
let micHiddenCache: string[] | null = null;
/** Piano levels a microphone can't measure (any item whose goal is loudness, release or the pedal — PIANO_AUDIT A2). */
export function pianoMicHiddenLevels(): string[] {
  if (micHiddenCache) return micHiddenCache;
  const out: string[] = [];
  for (const f of CAT)
    for (const l of f.levels) {
      let ds: Drill[] = [];
      try {
        ds = levelDrills(l, 'fifths-up');
      } catch {
        /* a level that can't generate here is not hidden */
      }
      if (ds.some((d) => micUnmeasurable(d).length > 0)) out.push(l.id);
    }
  return (micHiddenCache = out);
}

export function shownFamilies(settings: ShowSettings): FamilyDef[] {
  const inst = settings.instrument ?? 'piano';
  // The pianist's ear (style 'both') belongs to every emphasis. 0.67 (owner): "microphone only" hides the MIDI-only levels.
  if (inst === 'piano') {
    const fams = CAT.filter((f) => settings.emphasis === 'both' || f.style === 'both' || f.style === settings.emphasis);
    if (!settings.pianoMicOnly) return fams;
    const hidden = pianoMicHiddenLevels();
    return fams.map((f) => ({ ...f, levels: f.levels.filter((l) => !hidden.includes(l.id)) })).filter((f) => f.levels.length > 0);
  }
  // Drums: no genre filter (v1); by microphone a practice pad gets the single-surface levels, an acoustic kit those and the basic grooves.
  if (inst === 'drums') {
    const fams = GCAT.filter((f) => f.instruments.includes('drums'));
    return settings.drumMic ? kitLevels(fams as DrumFamilyDef[], settings.drumMic) : fams;
  }
  // Guitar (GUITAR_DEEPENING §5, owner 2026-11-11): the core always, add-on families / levels only when ticked
  // (guitarAddOns, migrated from the old single style); the old style no longer filters guitar genres.
  if (inst === 'guitar')
    return GCAT.filter((f) => f.instruments.includes('guitar') && !f.retired)
      .map((f): GuitarFamilyDef => ({ ...f, levels: f.levels.filter((l) => guitarLevelShown(f, l, settings)) }))
      .filter((f) => f.levels.length > 0);
  const style = settings.guitarStyle;
  const hidden = inst === 'bass' ? hiddenBassLevels(settings.bassTuning) : [];
  // Retired families (the old g-bass starter) keep their ids for progress but are not shown.
  // Bass (BASS_NICHE_PLAN): the jazz / prog families open by the player's track (jazz, prog or both).
  return GCAT.filter((f) => f.instruments.includes(inst) && !f.retired && guitarStyleMatch(f.genres, style) && (inst !== 'bass' || inBassTrack(f.id, settings.bassTrack)))
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

/** Each item once: a key-free item (guitar natural harmonics) generates the same item in every key of its level. */
const uniq = (ds: Drill[]): Drill[] => {
  const seen = new Set<string>();
  return ds.filter((d) => !seen.has(d.itemId) && !!seen.add(d.itemId));
};

/** Every drill of a level: key by key, each spec (e.g. RH then LH). */
export function levelDrills(level: LevelDef, order: DrillSettings['keyOrder']): Drill[] {
  const out: Drill[] = [];
  for (const key of levelKeys(level, order)) for (const s of level.specs) out.push(gen({ ...s, key }));
  return uniq(out);
}

/** One spec of a level through all its keys. */
export function specDrills(level: LevelDef, specIndex: number, order: DrillSettings['keyOrder']): Drill[] {
  return uniq(levelKeys(level, order).map((key) => gen({ ...level.specs[specIndex], key })));
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
      const es = Object.entries(t).filter(([k]) => k !== 'tempo' && k !== 'target' && k !== 'key');
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
  // GUITAR_DEEPENING §2.2: an item's own target (never below its start); equal to the start = off the ladder.
  if (drill.spec.target !== undefined) return Math.max(drill.startBpm, drill.spec.target);
  const range = (level as (LevelDef & { tempo?: [number, number] }) | undefined)?.tempo;
  // Eighth-pulse items (7/8, 10/8: ♪ = bpm, N9) start in eighths while the level's range is in quarters: they climb
  // the same ratio as the range from their own start, so they have a ladder too.
  if (range && drill.pulse === 8 && range[0] > 0) return Math.max(drill.startBpm, Math.round((drill.startBpm * range[1]) / range[0]));
  if (range) return Math.max(drill.startBpm, range[1]);
  // Piano levels with an exam speed (PIANO_AUDIT T1): the target in notes per second, whatever the item's note value.
  const nps = level?.nps;
  if (nps) return Math.max(drill.startBpm, Math.min(240, Math.round((nps[1] * 60) / notesPerBeat(drill))));
  return Math.round(drill.startBpm * DEFAULT_TARGET_FACTOR);
}

/** The target tempo of an item (pass it to ladder.applyTake as opts.targetBpm). */
export const itemTargetBpm = (drill: Drill): number => targetBpmOf(levelOfDrill(drill), drill);

/**
 * Stars of a level from measured takes (A4): 1 = min(3, items) items clean at the start tempo, 2 = half the items
 * passed at the target tempo (3 clean on 2 days, ladder.itemPass); see the five-star scale below. Self-report never counts.
 */
export function levelStars(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): number {
  const ds = levelDrills(level, order);
  if (!ds.length) return 0;
  const ps = ds.map((d) => itemPass(items[d.itemId], d.startBpm, targetBpmOf(level, d)));
  const n = ps.filter((p) => p.target).length;
  // 0.64 (owner): five stars. 5 = every key at the target tempo, 4 = half, 3 = three keys at target, 2 = a first key
  // at target. SPEC-PATH-ROLE §8 (owner 2026-11-14): 1 = three KEYS clean at the base tempo (every item of the key) —
  // the step is opened (✓ on the path); the stars above it are the depth the workout builds.
  if (n >= ds.length) return 5;
  if (n >= Math.ceil(ds.length / 2)) return 4;
  if (n >= Math.min(3, ds.length)) return 3;
  if (n >= 1) return 2;
  const kp = levelKeyProgress(level, items, order);
  return kp.keys.filter((k) => k.start).length >= Math.min(3, kp.keys.length) ? 1 : 0;
}

/** Per key of a level: every item of the key clean at the base tempo (`start`) / passed at the target tempo (`target`). */
export interface LevelKeyProgress {
  keys: { key: number; start: boolean; target: boolean }[];
  /** The level's target tempo (median over its items, ♩). */
  targetBpm: number;
  /** The level's base tempo (median start, ♩). */
  baseBpm: number;
}
export function levelKeyProgress(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): LevelKeyProgress {
  const ds = levelDrills(level, order);
  const by = new Map<number, { start: boolean; target: boolean }>();
  for (const d of ds) {
    const p = itemPass(items[d.itemId], d.startBpm, targetBpmOf(level, d));
    const k = ((d.spec.key % 12) + 12) % 12;
    const cur = by.get(k) ?? { start: true, target: true };
    by.set(k, { start: cur.start && (p.start || p.target), target: cur.target && p.target });
  }
  const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1] : 0);
  return { keys: [...by.entries()].map(([key, v]) => ({ key, ...v })), targetBpm: med(ds.map((d) => targetBpmOf(level, d))), baseBpm: med(ds.map((d) => d.startBpm)) };
}

/** The most stars a technique level shows. */
export const LEVEL_MAX_STARS = 5;
/** A level counts as done at 3 stars: three keys passed at the target tempo (the path's rule too, owner 0.64). */
export const LEVEL_DONE_STARS = 3;
export function levelDone(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): boolean {
  return levelStars(level, items, order) >= LEVEL_DONE_STARS;
}

/** The level the player works on in a family: the first not-done level, never below the level test's start. */
export function currentLevel(fam: FamilyDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder'], start?: number): LevelDef {
  const from = Math.max(1, start ?? 1);
  const lv = fam.levels.find((l) => l.level >= from && !levelDone(l, items, order));
  return lv ?? fam.levels[fam.levels.length - 1];
}

/** Families the player has started (any take) — Today prefers them; new players get scales + fingers (+ harris for jazz). */
export function activeFamilies(settings: DrillSettings & { bassTuning?: string; drumMic?: DrumMic }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}): FamilyDef[] {
  const shown = shownFamilies(settings);
  const used = shown.filter((f) => Object.values(items).some((s) => s.family === f.id && s.takes > 0) || start[f.id] !== undefined);
  if (used.length) return used;
  const inst = settings.instrument ?? 'piano';
  if (inst !== 'piano') {
    const firstG: FamilyId[] = inst === 'drums' ? ['d-strokes', 'd-time', 'd-rock'] : inst === 'bass' ? ['b-pluck', 'b-time'] : ['g-fretting', 'g-chords', 'g-scales'];
    const fs = shown.filter((f) => firstG.includes(f.id));
    return fs.length ? fs : shown.slice(0, 2);
  }
  // PIANO_AUDIT §3: the pianist's ear from day one, with every emphasis.
  const first: FamilyId[] = settings.emphasis === 'jazz' ? ['harris', 'voicings', 'k-ear'] : settings.emphasis === 'classical' ? ['scales', 'fingers', 'k-ear'] : ['scales', 'fingers', 'harris', 'k-ear'];
  return shown.filter((f) => first.includes(f.id));
}

/** Candidates for Today: the current level of each active family, plus the player's own drills (first 3 keys). */
export function candidates(settings: DrillSettings & { bassTuning?: string; drumMic?: DrumMic }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}, customs: CustomDrill[] = []): Drill[] {
  const out: Drill[] = [];
  for (const f of activeFamilies(settings, items, start)) out.push(...levelDrills(currentLevel(f, items, settings.keyOrder, start[f.id]), settings.keyOrder));
  // The player's own drills (drill creator), for this instrument and included in Today: their first 3 keys.
  const ci = settings.instrument ?? 'piano';
  if (ci !== 'drums') for (const c of customs) if (customIncluded(c, 'today', ci)) for (const k of customKeys(c, settings.keyOrder).slice(0, 3)) out.push(customToDrill(c, k));
  return out;
}

/** Today's technique items (spec AI §9) for the hub, the workout block and the path's drill steps. */
export function todayDrills(settings: DrillSettings & { bassTuning?: string; drumMic?: DrumMic }, items: Record<string, ItemState>, start: Partial<Record<FamilyId, number>> = {}, customs: CustomDrill[] = [], n = 5, now: number | string = Date.now()): TodayItem[] {
  return planWithFocus(items, candidates(settings, items, start, customs), n, now, settings.focusWeakKeys !== false);
}

/** At most this share of a session's slots goes to weak / untried keys, so no key is starved (owner 2026-11-14). */
export const WEAK_KEY_CAP = 0.6;
/** And at least this share, when there are weak keys to work on. */
export const WEAK_KEY_MIN = 0.4;

/**
 * Today's items with the weak-key emphasis (key mastery): the candidates in weak keys first, then untried keys of a
 * skill already known, then the rest in the player's key order; after the ladder's pick, between WEAK_KEY_MIN and
 * WEAK_KEY_CAP of the slots go to those keys, the others rotate through the remaining keys (longest unplayed first).
 * A skill with nothing measured keeps the key order. `focus` false = the plain ladder pick.
 */
export function planWithFocus(items: Record<string, ItemState>, pool: Drill[], n = 5, now: number | string = Date.now(), focus = true): TodayItem[] {
  if (!focus) return todaysItems(items, pool, n, now);
  const sk = new Map<FamilyId, SkillKeys>(keyMastery(items, now).map((s) => [s.family, s]));
  const rank = (d: Drill) => focusRank(sk.get(d.spec.family), drillKeyOf(d));
  const mastery = (d: Drill) => sk.get(d.spec.family)?.cells[((drillKeyOf(d) % 12) + 12) % 12].mastery ?? 0;
  // Stable: within the same rank the pool's (key-order) order stays.
  const ordered = pool.map((d, i) => ({ d, i, r: rank(d) })).sort((a, b) => a.r - b.r || (a.r === 0 ? mastery(a.d) - mastery(b.d) : 0) || a.i - b.i).map((x) => x.d);
  const picked = todaysItems(items, ordered, n, now);
  return emphasizeWeakKeys(picked, ordered, items, n, rank);
}

const lastOf = (items: Record<string, ItemState>, d: Drill) => items[d.itemId]?.last ?? '';

/** The share rule on a ladder pick: top up weak / untried keys to WEAK_KEY_MIN, cut them to WEAK_KEY_CAP. */
export function emphasizeWeakKeys(picked: TodayItem[], pool: Drill[], items: Record<string, ItemState>, n: number, rank: (d: Drill) => 0 | 1 | 2): TodayItem[] {
  const out = picked.slice();
  const isF = (d: Drill) => rank(d) < 2;
  const has = (d: Drill) => out.some((p) => p.drill.itemId === d.itemId);
  const known = (d: Drill) => (items[d.itemId] && items[d.itemId].takes > 0 ? items[d.itemId] : undefined);
  const maxF = Math.max(1, Math.floor(n * WEAK_KEY_CAP));
  const minF = Math.min(maxF, Math.ceil(n * WEAK_KEY_MIN));
  const count = () => out.filter((p) => isF(p.drill)).length;
  // Top up: weak keys first (pool order = weakest first), a key not yet in the session first.
  if (count() < minF) {
    const keysIn = () => new Set(out.map((p) => drillKeyOf(p.drill)));
    const extra = pool.filter((d) => isF(d) && !has(d));
    extra.sort((a, b) => rank(a) - rank(b) || Number(keysIn().has(drillKeyOf(a))) - Number(keysIn().has(drillKeyOf(b))));
    for (const d of extra) {
      if (count() >= minF) break;
      const item: TodayItem = { drill: d, role: known(d) ? 'weak' : 'new', state: known(d) };
      if (out.length < n) {
        out.push(item);
        continue;
      }
      // Replace the last slot that is not a focus key and not the warm-up.
      let j = -1;
      for (let i = out.length - 1; i >= 1; i--)
        if (!isF(out[i].drill)) {
          j = i;
          break;
        }
      if (j < 0) break;
      out[j] = item;
    }
  }
  // Cap: the least urgent focus items (untried before weak, from the end) give way to the other keys, longest unplayed first.
  if (count() > maxF) {
    const others = pool.filter((d) => !isF(d) && !has(d)).sort((a, b) => lastOf(items, a).localeCompare(lastOf(items, b)));
    while (count() > maxF && others.length) {
      let j = -1;
      for (const r of [1, 0] as const) {
        for (let i = out.length - 1; i >= 0 && j < 0; i--) if (rank(out[i].drill) === r) j = i;
        if (j >= 0) break;
      }
      if (j < 0) break;
      const d = others.shift()!;
      out[j] = { drill: d, role: known(d) ? 'maintenance' : 'new', state: known(d) };
    }
  }
  // Keys interleaved after the first item (as the ladder does).
  const res = out.slice(0, 1);
  const rest = out.slice(1);
  while (rest.length) {
    const prev = res.length ? drillKeyOf(res[res.length - 1].drill) : -1;
    const k = rest.findIndex((p) => drillKeyOf(p.drill) !== prev);
    res.push(rest.splice(k >= 0 ? k : 0, 1)[0]);
  }
  return res;
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
/**
 * A skill in one key (the key map's tap): the current level's drills in that key; when that level has no such key
 * (levels with listed keys), the nearest level below, then above, that has it. [] when no level of the family has it.
 */
export function skillDrillsInKey(fam: FamilyDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder'], key: number, start?: number): Drill[] {
  const cur = currentLevel(fam, items, order, start);
  const at = fam.levels.indexOf(cur);
  const byDist = fam.levels.map((l, i) => ({ l, d: i <= at ? at - i : 100 + i - at })).sort((a, b) => a.d - b.d);
  for (const { l } of byDist) {
    const ds = levelDrills(l, order).filter((d) => drillKeyOf(d) === key);
    if (ds.length) return ds;
  }
  return [];
}
