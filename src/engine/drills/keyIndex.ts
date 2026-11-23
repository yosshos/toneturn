// Practice by key (docs/SPEC-PRACTICE-KEYS.md, SPEC-COACH-2 §6): the shown families folded into pages — a root (0–11),
// its group tabs (major · minor · melodic/harmonic-minor modes · symmetric), and on each tab its rows (scale, arpeggio,
// cadence …), each row a list of (family, level) entries with that level's drills in this root and group. Key-neutral
// families go to "General technique". Pure: the screen asks for one page; mastery reuses keyMastery's item measure.

import type { Drill, DrillSettings, ItemState } from './types';
import type { FamilyDef, LevelDef } from './generate';
import { itemTargetBpm, specDrills } from './plan';
import { coolingDown, itemStatus } from './itemStatus';
import { tpDec } from './tpairDrills';
import { FACET_GROUPS, FAMILY_FACETS, keyFacet, type FacetGroup, type FacetRole } from './keyFacet';
import { itemMastery, MIN_TAKES, STRONG_FROM, WEAK_BELOW, type KeyStatus } from '../analysis/keyMastery';
import type { Lick } from '../licks';
import { lickGroup, lickRungLevel } from './lickRungs';
import { styleOfLevel, type StyleId } from '../styles';
import { styleTier, type StyleFocus, type StyleTier } from '../styleFocus';

type Order = DrillSettings['keyOrder'];

/** The rows of a key page, in teaching order (technique first, then application). */
export const ROLE_ORDER: FacetRole[] = ['scale', 'arpeggio', 'cadence', 'pattern', 'control', 'harris', 'harmony', 'voicing', 'line', 'colour', 'comping', 'apply'];

export interface KeyEntry {
  family: FamilyDef;
  level: LevelDef;
  /** The level's drills in this root and group. */
  drills: Drill[];
}

export interface KeyIndex {
  /** pages[root][group][role] */
  pages: Record<number, Record<FacetGroup, Partial<Record<FacetRole, KeyEntry[]>>>>;
  /** Families with no key page (rhythm, independence, mechanics): General technique. */
  general: FamilyDef[];
}

/** Fold families into key pages. */
export function buildKeyIndex(fams: FamilyDef[], order: Order): KeyIndex {
  const pages: KeyIndex['pages'] = {};
  for (let r = 0; r < 12; r++) pages[r] = { major: {}, minor: {}, mmhm: {}, symmetric: {} };
  const general: FamilyDef[] = [];
  for (const f of fams) {
    if (FAMILY_FACETS[f.id]?.scope === 'neutral') {
      general.push(f);
      continue;
    }
    for (const l of f.levels) {
      // (root, group, role) → this level's entry
      const at = new Map<string, KeyEntry>();
      for (let k = 0; k < l.specs.length; k++)
        for (const d of specDrills(l, k, order)) {
          const fc = keyFacet(d);
          if (!fc || fc.scope === 'neutral') continue;
          const key = `${fc.root}|${fc.group}|${fc.role}`;
          let e = at.get(key);
          if (!e) {
            e = { family: f, level: l, drills: [] };
            at.set(key, e);
            const row = (pages[fc.root][fc.group][fc.role] ??= []);
            row.push(e);
          }
          e.drills.push(d);
        }
    }
  }
  return { pages, general };
}

/** The groups a root has items in, in tab order. */
export const groupsOf = (idx: KeyIndex, root: number): FacetGroup[] => FACET_GROUPS.filter((g) => Object.keys(idx.pages[root][g]).length > 0);

/** Clean at the drill's own tempo (a slowed take never counts). */
/** Closed by the one rule (BUILD-PLAN D1, itemStatus.ts): 3 clean takes at ≥ 95 % of the target on 2 days. */
export const cleanAt = (st: ItemState | undefined, d: Drill): boolean => itemStatus(st, d.startBpm, itemTargetBpm(d)) === 'closed';

export interface Measure {
  /** Drills in the set / clean at tempo / tried. */
  total: number;
  clean: number;
  tried: number;
  /** 0..1 over the tried drills (keyMastery's item measure), and its status. */
  mastery: number;
  status: KeyStatus;
  /** Best clean tempo (♩) and the mean accuracy / timing evenness (IOI CV) of the tried drills. */
  bestBpm: number;
  accuracy: number | null;
  evenness: number | null;
}

/** Measures over a set of drills. */
export function measure(drills: Drill[], items: Record<string, ItemState>, now: number | string = Date.now()): Measure {
  let clean = 0;
  let tried = 0;
  let takes = 0;
  let m = 0;
  let best = 0;
  let acc = 0;
  let accN = 0;
  let cv = 0;
  let cvN = 0;
  for (const d of drills) {
    const st = items[d.itemId];
    if (cleanAt(st, d)) clean++;
    if (!st || !st.takes) continue;
    tried++;
    takes += st.takes;
    m += itemMastery(st, 0, now);
    best = Math.max(best, st.cleanBpm);
    if (st.ewma?.acc !== undefined) (acc += st.ewma.acc), accN++;
    if (st.ewma?.cv !== undefined) (cv += st.ewma.cv), cvN++;
  }
  const mastery = tried ? m / tried : 0;
  const status: KeyStatus = takes < MIN_TAKES ? 'untried' : mastery < WEAK_BELOW ? 'weak' : mastery >= STRONG_FROM ? 'strong' : 'ok';
  return { total: drills.length, clean, tried, mastery, status, bestBpm: best, accuracy: accN ? acc / accN : null, evenness: cvN ? cv / cvN : null };
}

/** Every drill on a page tab (technique rows only, or with the application rows). */
export function tabDrills(idx: KeyIndex, root: number, group: FacetGroup, withApply = false): Drill[] {
  const rows = idx.pages[root][group];
  return ROLE_ORDER.filter((r) => withApply || r !== 'apply').flatMap((r) => (rows[r] ?? []).flatMap((e) => e.drills));
}

/** The level worked on in a row: the first entry (lowest level) not all clean. */
export function currentEntry(entries: KeyEntry[], items: Record<string, ItemState>): KeyEntry | null {
  const sorted = [...entries].sort((a, b) => a.level.level - b.level.level);
  return sorted.find((e) => !e.drills.every((d) => cleanAt(items[d.itemId], d))) ?? sorted[sorted.length - 1] ?? null;
}

/**
 * The key's continuous session (owner 2026-11-21: continuous practice is the default): one drill from the current
 * level of each technique row — scale, arpeggio, cadence, pattern, control (dynamics) … — then the round again, so the
 * session interleaves the key's exercises (SPEC-COACH-2 §4.2). At most `rows` rows a round.
 */
export function keySession(idx: KeyIndex, root: number, group: FacetGroup, items: Record<string, ItemState>, rows = 6, rounds = 2): Drill[] {
  const tab = idx.pages[root][group];
  const picks: Drill[] = [];
  for (const r of ROLE_ORDER) {
    if (r === 'apply' || picks.length >= rows) continue;
    const e = currentEntry(tab[r] ?? [], items);
    if (!e) continue;
    const d = e.drills.find((x) => !cleanAt(items[x.itemId], x)) ?? e.drills[0];
    if (d) picks.push(d);
  }
  const out: Drill[] = [];
  for (let k = 0; k < rounds; k++) out.push(...picks);
  return out;
}

/** The ISO-ish week number of a date (Monday weeks), for the key of the week. */
export function weekOf(now: number | string = Date.now()): string {
  const d = new Date(typeof now === 'number' ? now : Date.parse(now));
  const day = (d.getUTCDay() + 6) % 7;
  const mon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return new Date(mon).toISOString().slice(0, 10);
}

/**
 * The key of the week (owner 2026-11-21): a weak key first (the weakest), else the first key in the player's order not
 * played yet, else the key played least well. Kept for the week by the screen (it asks once a week).
 */
export function pickWeekKey(idx: KeyIndex, group: FacetGroup, items: Record<string, ItemState>, order: number[], now: number | string = Date.now()): number | null {
  const ms = order
    .map((r) => {
      const d = tabDrills(idx, r, group);
      return d.length ? { r, m: measure(d, items, now) } : null;
    })
    .filter((x): x is { r: number; m: Measure } => x !== null);
  if (!ms.length) return null;
  const weak = ms.filter((x) => x.m.status === 'weak').sort((a, b) => a.m.mastery - b.m.mastery);
  if (weak.length) return weak[0].r;
  const fresh = ms.find((x) => x.m.status === 'untried');
  if (fresh) return fresh.r;
  return ms.slice().sort((a, b) => a.m.mastery - b.m.mastery)[0].r;
}

/**
 * Dynamics as a lens (owner 2026-11-21): any single-line exercise (a scale, an arpeggio, a finger pattern) played with
 * a shape or a touch the take then measures — crescendo out and diminuendo back, accents every 4th, even piano, even
 * forte, staccato. The lens is its own item (the id gets a suffix), so its progress is kept apart; MIDI measures it
 * (the microphone can't hear velocity — the take says so, as for the control family).
 */
export type Lens = 'none' | 'cresc' | 'accent4' | 'even-p' | 'even-f' | 'staccato';
export const LENSES: Lens[] = ['none', 'cresc', 'accent4', 'even-p', 'even-f', 'staccato'];
export const LENS_NAME: Record<Lens, { en: string; he: string }> = {
  none: { en: 'As written', he: 'כמו שכתוב' },
  cresc: { en: 'Crescendo out, diminuendo back', he: 'קרשנדו בעלייה, דימינואנדו בירידה' },
  accent4: { en: 'Accent every 4th', he: 'הטעמה כל 4' },
  'even-p': { en: 'Even piano', he: 'פיאנו אחיד' },
  'even-f': { en: 'Even forte', he: 'פורטה אחיד' },
  staccato: { en: 'Staccato', he: 'סטקטו' },
};
/** The lens chips' short names (the full name is the tooltip and the take's title). */
export const LENS_SHORT: Record<Lens, { en: string; he: string }> = {
  none: { en: 'As written', he: 'כמו שכתוב' },
  cresc: { en: 'Cresc.', he: 'קרשנדו' },
  accent4: { en: 'Accents', he: 'הטעמות' },
  'even-p': { en: 'p', he: 'p' },
  'even-f': { en: 'f', he: 'f' },
  staccato: { en: 'Staccato', he: 'סטקטו' },
};
const LENS_ROLES = new Set(['scale', 'arpeggio', 'pattern']);

/**
 * A drill through a lens; unchanged for 'none', for chords and for items with their own dynamics already. `keepId`: the
 * coach's takes stay on the item (it follows the item's climb), a crescendo take counting as a take of the item.
 */
export function withLens(d: Drill, lens: Lens, keepId = false): Drill {
  if (lens === 'none') return d;
  const fc = keyFacet(d);
  if (!fc || !LENS_ROLES.has(fc.role) || d.spec.dynamics || d.goal.dynamics) return d;
  // one note at a time only (a lens on block chords would grade the wrong thing)
  const beats = new Map<number, number>();
  for (const n of d.notes) beats.set(n.beat, (beats.get(n.beat) ?? 0) + 1);
  if ([...beats.values()].some((c) => c > 2)) return d;
  const name = LENS_NAME[lens];
  const steps = [...beats.keys()].sort((a, b) => a - b);
  const notes = lens === 'accent4' ? d.notes.map((n) => (steps.indexOf(n.beat) % 4 === 0 ? { ...n, accent: true } : n)) : d.notes;
  const dynamics = lens === 'staccato' ? undefined : lens;
  return {
    ...d,
    itemId: keepId ? d.itemId : `${d.itemId}:lens-${lens}`,
    notes,
    spec: { ...d.spec, ...(dynamics ? { dynamics } : { articulation: 'staccato' as const }) },
    goal: { ...d.goal, ...(dynamics ? { dynamics } : { articulation: 'staccato' as const }) },
    title: { en: `${d.title.en} · ${name.en}`, he: `${d.title.he} · ${name.he}` },
  };
}

/**
 * The key's continuous session as a coach ladder (owner 2026-11-22, docs/SPEC-KEY-SESSION.md): the scale at the
 * player's tier as the warm-up, then the rungs open at the tier — the scale in contrary motion / apart / in rhythms, two
 * hands at different dynamics, the scale harmonised along its whole length (3rds, triads, 7th chords, block, drop 2),
 * the approach licks, Hanon and hand independence in the key, octaves and double notes, a cadence at the tier, and the
 * jazz top (6th-diminished, colours) — the ones the player needs most first: never played at this tier, then the lowest
 * share of their target tempo, then the longest since played. The coach climbs each rung's tempo to its target or the
 * player's limit, then moves on; a closing visit returns to the first harmonised rung, faster.
 */
export interface LadderRung {
  fam: string;
  id: string;
  min: number;
  max?: number;
  pick?: (sp: LevelDef['specs'][number]) => boolean;
  jazz?: boolean;
  /** A the scale, S the harmonised spine (3rds, triads, 7ths), B its other forms, C licks, D fingers/hands, E cadence, F jazz,
   *  G language in the key (the player's licks, phase 4), H the style block (SPEC-STYLE-FOCUS §5: comping patterns and
   *  grooves of the styles, in the key). */
  block: 'A' | 'S' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  /**
   * BUILD-PLAN phase 7 (matrix breadth): a later rung inside the row — the Aeolian of a major key (from its 6th degree),
   * melodic minor in a minor row, a mode from the root in a major row. Not a new key family: the cell stays in its row.
   */
  mode?: KeyMode;
  /** Makes the rung's id unique in the row (`aeolian:k-sharm-3`); a tag with a name (RUNG_TAG_NAME) starts the title. */
  tag?: string;
  /** The rung's tonic in semitones above the row's root (the Aeolian: 9, the major key's 6th degree). */
  off?: number;
  /** The rung's own title (after the mode's name); else the level's. */
  title?: { en: string; he: string };
  /** Block H: the rung's style and its tier in the player's focus (main / also / rest — the rest only for exposure). */
  style?: StyleId;
  tier?: StyleTier;
}

/** SPEC-STYLE-FOCUS §5: a styled level opens as a style rung at this technique tier (beginner style rungs from T0). */
export const styleRungTier = (l: Pick<LevelDef, 'level'>): number => Math.max(0, Math.min(5, Math.floor((l.level - 1) / 3)));
/** Style rungs per style in a key: the two closest to the player's tier (the matrix stays a manageable size). */
export const STYLE_RUNGS_PER_STYLE = 2;
/**
 * A styled level that is practised in every key ('major' / 'minor', or all 12 listed), so every key has the same rungs
 * — and the key's cell items are the level's own catalogue items and a take counts for the cell, the level,
 * the path and the level test at once (never a key the level doesn't have).
 */
const keyable = (l: LevelDef, root?: number): boolean => l.keys === 'major' || l.keys === 'minor' || (Array.isArray(l.keys) && l.keys.length === 12 && (root === undefined || l.keys.includes(root)));

/**
 * Block H (SPEC-STYLE-FOCUS §5): the style rungs of the families given, open at the tier — every styled level that can
 * be played in any key (tagged on the level / family, styles.ts), the two nearest the tier per style. With a focus,
 * each rung carries its tier; "rest" styles stay in (the workout's 10 % exposure) unless `focusOnly`.
 */
export function styleRungs(fams: FamilyDef[], tier: number, focus?: StyleFocus, o: { focusOnly?: boolean; /** Only levels practised in this key. */ root?: number } = {}): LadderRung[] {
  const t = Math.max(0, tier);
  const by = new Map<StyleId, { f: FamilyDef; l: LevelDef }[]>();
  for (const f of fams)
    for (const l of f.levels) {
      const st = styleOfLevel(l, f);
      if (!st || !keyable(l, o.root) || styleRungTier(l) > t) continue;
      if (focus && o.focusOnly && styleTier(focus, st) === 'rest') continue;
      by.set(st, [...(by.get(st) ?? []), { f, l }]);
    }
  const out: LadderRung[] = [];
  for (const [st, xs] of by)
    for (const { f, l } of xs.sort((a, b) => a.l.level - b.l.level).slice(-STYLE_RUNGS_PER_STYLE))
      out.push({ fam: f.id, id: l.id, min: styleRungTier(l), block: 'H', style: st, ...(focus ? { tier: styleTier(focus, st) } : {}) });
  return out;
}

/** The instruments with a per-key ladder (drums have no keys: their 70/30 is technique / grooves, fills, trading). */
export type LadderInst = 'piano' | 'guitar' | 'bass';
export type KeyMode = 'aeolian' | 'melodic' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
/** The Aeolian inside every major key opens just past the first steps (SPEC-DAILY-WORKOUT §1). */
export const AEOLIAN_FROM_TIER = 1;
/** Melodic minor (the minor rows) and the modes from the root (the major rows) open at T4 (SPEC-DAILY-WORKOUT §1). */
export const MELODIC_FROM_TIER = 4;
export const MODES_FROM_TIER = 4;
/** The name a later rung's title starts with. */
export const RUNG_TAG_NAME: Record<string, { en: string; he: string }> = {
  aeolian: { en: 'Aeolian, from the 6th degree', he: 'איאולי, מהדרגה השישית' },
  melodic: { en: 'Melodic minor', he: 'מינור מלודי' },
  m6dim: { en: 'Minor 6th-diminished', he: 'מינור שישית-מוקטן' },
  dorian: { en: 'Dorian', he: 'דורי' },
  phrygian: { en: 'Phrygian', he: 'פריגי' },
  lydian: { en: 'Lydian', he: 'לידי' },
  mixolydian: { en: 'Mixolydian', he: 'מיקסולידי' },
  locrian: { en: 'Locrian', he: 'לוקרי' },
};
/** A rung's id in its row (the cell's `rung`): the level id, prefixed by its tag. */
export const rungIdOf = (r: Pick<LadderRung, 'id' | 'tag'>): string => (r.tag ? `${r.tag}:${r.id}` : r.id);

type Spec = LevelDef['specs'][number];
const optIs = (o: number) => (sp: Spec) => ((sp as { option?: number }).option ?? 0) === o;
const kindIs = (re: RegExp) => (sp: Spec) => re.test((sp as { kind: string }).kind);
const scaleIs = (sc: string) => (sp: Spec) => (sp as { scale?: string }).scale === sc;
const isMinorSp = (sp: Spec) => !!(sp as { minor?: boolean }).minor;
const T = (en: string, he: string) => ({ en, he });

/** The warm-up scale of a key at a tier, per instrument (the first step of every session). */
function warmOf(inst: LadderInst, minor: boolean, t: number): { fam: string; id: string; pick?: (sp: Spec) => boolean } {
  if (inst === 'guitar') return minor ? (t <= 3 ? { fam: 'g-scales', id: 'g-scales-13', pick: optIs(7) } : { fam: 'g-scales', id: 'g-scales-17' }) : { fam: 'g-scales', id: t <= 1 ? 'g-scales-4' : t <= 3 ? 'g-scales-5' : t <= 5 ? 'g-scales-6' : 'g-scales-9' };
  if (inst === 'bass') return minor ? (t <= 3 ? { fam: 'b-scale', id: 'b-scale-7', pick: optIs(6) } : { fam: 'b-scale', id: 'b-scale-12', pick: optIs(1) }) : t <= 1 ? { fam: 'b-scale', id: 'b-scale-2' } : { fam: 'b-fret', id: 'b-fret-5' };
  const id = minor ? (t <= 1 ? 'scales-17' : t <= 3 ? 'scales-5' : t <= 5 ? 'scales-13' : 'scales-33') : t <= 1 ? 'scales-1' : t <= 3 ? 'scales-3' : t <= 5 ? 'scales-8' : 'scales-10';
  return { fam: 'scales', id, pick: minor ? undefined : (sp) => !isMinorSp(sp) };
}

/**
 * The guitar's ladder of one key (BUILD-PLAN §2 "ladders for guitar and bass", phase 7), the keys ladder's rung
 * structure from the guitar catalogue: A the scale's forms (3 notes per string, CAGED connected, interval sequences),
 * S the harmonised spine (g-harm: 3rds, triads, 7ths along the whole scale, in position), B its other forms (triad
 * shapes and inversions, double stops, block triads on string sets, drop 2), D the hands (finger permutations,
 * alternate picking, hammer-ons / pull-offs, string crossing, 3nps legato, string skipping, sweeps), E the ii–V–I on the
 * neck (shells, triads on string sets, drop 2, rootless), F jazz (Harris's 6th-diminished). No approach-lick block yet:
 * the owner's licks exist on the piano only. Minor: the harmonic-minor rows.
 */
function guitarRungs(minor: boolean): LadderRung[] {
  const h = minor ? 7 : 0;
  const harm = (n: number, min: number, block: 'S' | 'B'): LadderRung => ({ fam: 'g-harm', id: `g-harm-${n}`, min, pick: optIs(h), block });
  const cad = (n: number, min: number): LadderRung => ({ fam: 'g-cadlib', id: `g-cadlib-${n}`, min, pick: kindIs(minor ? /^cad~m-ii-v-i~/ : /^cad~ii-v-i~/), block: 'E' });
  return [
    ...(minor ? [] : [{ fam: 'g-picking', id: 'g-picking-3', min: 2, block: 'A' as const }, { fam: 'g-scales', id: 'g-scales-8', min: 3, block: 'A' as const }, { fam: 'g-scales', id: 'g-scales-10', min: 4, block: 'A' as const }]),
    harm(2, 0, 'S'),
    harm(4, 0, 'S'),
    harm(6, 1, 'S'),
    ...(minor ? [] : [{ fam: 'g-arps', id: 'g-arps-2', min: 1, block: 'B' as const }, { fam: 'g-arps', id: 'g-arps-3', min: 2, block: 'B' as const }]),
    harm(3, 3, 'B'),
    harm(5, 3, 'B'),
    harm(7, 4, 'B'),
    ...(minor ? [] : [harm(8, 5, 'B')]),
    // SPEC-KEY-SESSION §1 B2, B4, B5 (2026-11-23): triad inversions on string sets, 1-2-3-5 cells, 9th arpeggios
    harm(15, 3, 'B'),
    harm(14, 4, 'B'),
    harm(16, 5, 'B'),
    ...(minor
      ? [{ fam: 'g-picking', id: 'g-picking-6', min: 5, pick: isMinorSp, block: 'D' as const }]
      : [
          { fam: 'g-fretting', id: 'g-fretting-2', min: 0, block: 'D' as const },
          { fam: 'g-picking', id: 'g-picking-1', min: 0, block: 'D' as const },
          { fam: 'g-legato', id: 'g-legato-1', min: 1, block: 'D' as const },
          { fam: 'g-legato', id: 'g-legato-2', min: 1, block: 'D' as const },
          { fam: 'g-picking', id: 'g-picking-2', min: 1, block: 'D' as const },
          { fam: 'g-legato', id: 'g-legato-5', min: 3, block: 'D' as const },
          { fam: 'g-picking', id: 'g-picking-4', min: 3, block: 'D' as const },
          { fam: 'g-picking', id: 'g-picking-6', min: 5, pick: (sp: Spec) => !isMinorSp(sp), block: 'D' as const },
        ]),
    cad(1, 2),
    ...(minor ? [] : [{ fam: 'g-vl', id: 'g-vl-1', min: 3, block: 'E' as const }]),
    cad(4, 4),
    ...(minor ? [] : [cad(9, 6), { fam: 'g-harris', id: 'g-harris-1', min: 5, jazz: true, block: 'F' as const }, { fam: 'g-harris', id: 'g-harris-2', min: 5, jazz: true, block: 'F' as const }]),
    // F2 triad pairs over the I (the ionian and lydian pairs on the key's root), F3 the bebop dominant on the key's V
    ...(minor
      ? []
      : [
          { fam: 'g-tpair', id: 'g-tpair-1', min: 5, jazz: true, pick: tpairOver(['ionian', 'lydian']), block: 'F' as const },
          { fam: 'g-scales', id: 'g-scales-21', off: 7, min: 5, jazz: true, pick: optIs(24), block: 'F' as const, title: T('the bebop dominant on the V, in position', 'ביבופ דומיננטי על ה־V, במצב') },
        ]),
  ];
}

/** Triad-pair specs (k-tpair / g-tpair / b-tpair options) whose pair is one of these, on the key's root (over the I). */
const tpairOver = (ids: string[]) => (sp: LevelDef['specs'][number]): boolean => ids.includes(tpDec((sp as { option?: number }).option ?? 0).c.id);

/**
 * The bass's ladder of one key (phase 7), from the bass catalogue: A the scale's forms (octaves and 10ths, the scale in
 * 4ths), S the spine (the scale in diatonic 3rds, diatonic 7th arpeggios through the scale), B the arpeggios (triads,
 * 7ths, inversions, two octaves, 9ths), D the hands (finger permutations, string skipping, shifts, 16th stamina, accents,
 * the upper register), E the changes (chord tones through a progression, the nearest chord tone, walking a ii–V–I with
 * approach notes, then freely), F jazz (Harris: the 6th-diminished scale, the half-step rules). No approach-lick block.
 */
function bassRungs(minor: boolean): LadderRung[] {
  const cad = (n: number, min: number): LadderRung => ({ fam: 'b-cadlib', id: `b-cadlib-${n}`, min, pick: kindIs(minor ? /^cad~m-ii-v-i~/ : /^cad~ii-v-i~/), block: 'E' });
  if (minor)
    return [
      { fam: 'b-chord', id: 'b-chord-16', min: 2, pick: optIs(7), block: 'S' },
      { fam: 'b-chord', id: 'b-chord-4', min: 2, pick: isMinorSp, block: 'B' },
      { fam: 'b-chord', id: 'b-chord-17', min: 3, pick: isMinorSp, block: 'B' },
      { fam: 'b-chord', id: 'b-chord-18', min: 5, pick: isMinorSp, block: 'B' },
      cad(1, 4),
      cad(3, 5),
    ];
  return [
    { fam: 'b-fret', id: 'b-fret-7', min: 3, block: 'A' },
    { fam: 'b-scale', id: 'b-scale-6', tag: '4ths', min: 3, pick: optIs(1), block: 'A', title: T('The major scale in 4ths', 'הסולם המז׳ורי בקוורטות') },
    { fam: 'b-scale', id: 'b-scale-6', min: 1, pick: (sp) => !(sp as { option?: number }).option, block: 'S', title: T('The major scale in diatonic 3rds', 'הסולם המז׳ורי בטרצות דיאטוניות') },
    { fam: 'b-chord', id: 'b-chord-15', min: 2, block: 'S' },
    { fam: 'b-chord', id: 'b-chord-4', min: 0, pick: (sp) => !isMinorSp(sp), block: 'B' },
    { fam: 'b-chord', id: 'b-chord-6', min: 1, block: 'B' },
    { fam: 'b-chord', id: 'b-chord-5', min: 2, block: 'B' },
    { fam: 'b-chord', id: 'b-chord-7', min: 3, block: 'B' },
    { fam: 'b-chord', id: 'b-chord-11', min: 4, block: 'B' },
    { fam: 'b-chord', id: 'b-chord-12', min: 5, block: 'B' },
    // SPEC-KEY-SESSION §1 B4, B5 (2026-11-23): the 1-2-3-5 cells and the 9th arpeggios through the scale
    { fam: 'b-chord', id: 'b-chord-17', min: 3, pick: (sp) => !isMinorSp(sp), block: 'B' },
    { fam: 'b-chord', id: 'b-chord-18', min: 5, pick: (sp) => !isMinorSp(sp), block: 'B' },
    { fam: 'b-fret', id: 'b-fret-2', min: 0, block: 'D' },
    { fam: 'b-pluck', id: 'b-pluck-4', min: 1, block: 'D' },
    { fam: 'b-fret', id: 'b-fret-4', min: 2, block: 'D' },
    { fam: 'b-pluck', id: 'b-pluck-5', min: 2, block: 'D' },
    { fam: 'b-pluck', id: 'b-pluck-6', min: 3, block: 'D' },
    { fam: 'b-fret', id: 'b-fret-8', min: 4, block: 'D' },
    { fam: 'b-chord', id: 'b-chord-8', min: 1, block: 'E' },
    { fam: 'b-chord', id: 'b-chord-9', min: 2, block: 'E' },
    cad(1, 4),
    cad(3, 5),
    { fam: 'b-barry', id: 'b-barry-1', min: 5, jazz: true, block: 'F' },
    { fam: 'b-barry', id: 'b-barry-3', min: 5, jazz: true, block: 'F' },
    // F2 triad pairs over the I (the arpeggiated lydian / ionian pair lines on the key's root)
    { fam: 'b-tpair', id: 'b-tpair-1', min: 5, jazz: true, pick: tpairOver(['ionian', 'lydian']), block: 'F' },
    { fam: 'b-tpair', id: 'b-tpair-2', min: 6, jazz: true, pick: tpairOver(['ionian', 'lydian']), block: 'F' },
  ];
}

/**
 * The later rungs of a row (BUILD-PLAN phase 7, after the row's own ladder; behind the tier, so a beginner never sees
 * them):
 * - major rows: the Aeolian of the key, played from its 6th degree (A Aeolian in C major: the C major scale, the
 *   relative major's signature) — the scale, the harmonised spine and its forms, the approach licks (piano) — from T1;
 *   then (T4+) the modes from the root: each mode only its scale, its 7th chords along it and lick 1 into them (piano);
 * - minor rows (harmonic minor): melodic minor on the same tonic (T4+) — the scale, its harmonisation, the licks; the
 *   minor 6th-diminished (Harris) at the jazz top.
 * The items are the catalogue's own (k-sharm / g-harm / b-chord options, the scales families, k-keylick 16–20), so a
 * take counts once for the cell, the level, the path and the level test.
 */
export function laterRungs(group: 'major' | 'minor', inst: LadderInst = 'piano'): LadderRung[] {
  const A = AEOLIAN_FROM_TIER;
  const M = MELODIC_FROM_TIER;
  const D = MODES_FROM_TIER;
  const aeol = (r: Omit<LadderRung, 'mode' | 'tag' | 'off'>): LadderRung => ({ ...r, min: Math.max(A, r.min), mode: 'aeolian', tag: 'aeolian', off: 9 });
  const mel = (r: Omit<LadderRung, 'mode' | 'tag'>, tag = 'melodic'): LadderRung => ({ ...r, min: Math.max(M, r.min), mode: 'melodic', tag });
  const MODES: [KeyMode, number, number][] = [['dorian', 1, D], ['mixolydian', 4, D], ['lydian', 3, D], ['phrygian', 2, D + 1], ['locrian', 6, D + 1]];
  const scaleT = { one: T('the scale, one octave, each hand', 'הסולם, אוקטבה אחת, כל יד'), ht: T('the scale, hands together, parallel and contrary', 'הסולם, ידיים יחד, מקבילה ונגדית'), four: T('the scale, 4 octaves hands together', 'הסולם, 4 אוקטבות ידיים יחד'), pos: T('the scale in position', 'הסולם במצב'), all: T('the scale in all five positions', 'הסולם בכל חמשת המצבים'), two: T('the scale over two octaves', 'הסולם בשתי אוקטבות'), it: T('the scale', 'הסולם') };
  if (inst === 'guitar') {
    if (group === 'minor')
      return [
        mel({ fam: 'g-scales', id: 'g-scales-15', min: M, max: 5, pick: optIs(8), block: 'A', title: scaleT.pos }),
        mel({ fam: 'g-scales', id: 'g-scales-18', min: 6, block: 'A', title: scaleT.all }),
        ...[2, 4, 6].map((n) => mel({ fam: 'g-harm', id: `g-harm-${n}`, min: M, pick: optIs(8), block: 'S' })),
        mel({ fam: 'g-harm', id: 'g-harm-7', min: 5, pick: optIs(8), block: 'B' }),
      ];
    return [
      aeol({ fam: 'g-scales', id: 'g-scales-13', min: A, max: 3, pick: optIs(5), block: 'A', title: scaleT.pos }),
      aeol({ fam: 'g-scales', id: 'g-scales-16', min: 4, block: 'A', title: scaleT.all }),
      ...([[2, 1, 'S'], [4, 1, 'S'], [6, 1, 'S'], [3, 3, 'B'], [5, 3, 'B'], [7, 4, 'B']] as const).map(([n, min, block]) => aeol({ fam: 'g-harm', id: `g-harm-${n}`, min, pick: optIs(5), block })),
      ...MODES.flatMap(([mode, o, min]): LadderRung[] => [
        { fam: 'g-scales', id: o === 6 ? 'g-scales-7' : o === 1 || o === 4 ? 'g-scales-14' : 'g-scales-15', min, pick: o === 6 ? (sp) => kindIs(/^mode$/)(sp) && optIs(6)(sp) : optIs(o), block: 'A', mode, tag: mode, title: scaleT.pos },
        { fam: 'g-harm', id: 'g-harm-6', min, pick: optIs(o), block: 'S', mode, tag: mode },
      ]),
    ];
  }
  if (inst === 'bass') {
    if (group === 'minor')
      return [mel({ fam: 'b-scale', id: 'b-scale-7', min: M, max: 5, pick: optIs(7), block: 'A', title: scaleT.pos }), mel({ fam: 'b-scale', id: 'b-scale-12', min: 6, pick: optIs(2), block: 'A', title: scaleT.two })];
    return [
      aeol({ fam: 'b-scale', id: 'b-scale-3', min: A, max: 2, pick: optIs(5), block: 'A', title: scaleT.pos }),
      aeol({ fam: 'b-scale', id: 'b-scale-12', min: 3, pick: optIs(0), block: 'A', title: scaleT.two }),
      aeol({ fam: 'b-chord', id: 'b-chord-16', min: 2, pick: optIs(5), block: 'S', title: T('diatonic 7th arpeggios through the scale', 'ארפג׳יו ספטאקורדים דיאטוניים לאורך הסולם') }),
      ...MODES.map(([mode, o, min]): LadderRung => ({ fam: 'b-scale', id: o === 6 ? 'b-scale-13' : o === 1 || o === 4 ? 'b-scale-4' : 'b-scale-8', min, pick: optIs(o === 6 ? 14 : o), block: 'A', mode, tag: mode, title: scaleT.pos })),
    ];
  }
  if (group === 'minor')
    return [
      mel({ fam: 'scales', id: 'scales-18', min: M, max: 5, pick: scaleIs('melodic'), block: 'A', title: scaleT.ht }),
      mel({ fam: 'scales', id: 'scales-35', min: 5, block: 'A' }),
      mel({ fam: 'scales', id: 'scales-33', min: 6, pick: scaleIs('melodic'), block: 'A', title: scaleT.four }),
      ...[4, 8, 12].map((n) => mel({ fam: 'k-sharm', id: `k-sharm-${n}`, min: M, pick: optIs(8), block: 'S' })),
      mel({ fam: 'k-sharm', id: 'k-sharm-14', min: 5, pick: optIs(8), block: 'B' }),
      mel({ fam: 'k-sharm', id: 'k-sharm-16', min: 6, pick: optIs(8), block: 'B' }),
      mel({ fam: 'k-keylick', id: 'k-keylick-20', min: M, block: 'C', title: T('licks 1 and 2 into the triads and 7th chords', 'ליקים 1 ו־2 אל המשולשים והספטאקורדים') }),
      // Harris's minor 6th-diminished at the jazz top (a jazz focus opens it two tiers earlier, never below T4)
      mel({ fam: 'scales', id: 'scales-31', min: 6, jazz: true, block: 'F', title: scaleT.it }, 'm6dim'),
      mel({ fam: 'k-sharm', id: 'k-sharm-12', min: 6, jazz: true, pick: optIs(10), block: 'F', title: T('the chord and the diminished in turn, arpeggiated', 'האקורד והמוקטן לסירוגין, בארפג׳יו') }, 'm6dim'),
    ];
  return [
    aeol({ fam: 'scales', id: 'scales-17', min: A, max: 1, pick: scaleIs('natural'), block: 'A', title: scaleT.one }),
    aeol({ fam: 'scales', id: 'scales-18', min: 2, max: 5, pick: scaleIs('natural'), block: 'A', title: scaleT.ht }),
    aeol({ fam: 'scales', id: 'scales-33', min: 6, pick: scaleIs('natural'), block: 'A', title: scaleT.four }),
    ...([[3, 1, 'S'], [7, 1, 'S'], [11, 1, 'S'], [5, 3, 'B'], [9, 3, 'B'], [13, 4, 'B'], [15, 5, 'B']] as const).map(([n, min, block]) => aeol({ fam: 'k-sharm', id: `k-sharm-${n}`, min, pick: optIs(5), block })),
    aeol({ fam: 'k-keylick', id: 'k-keylick-16', min: 2, block: 'C', title: T('approach lick 1 into 3rds, triads and 7th chords', 'ליק גישה 1 אל הטרצות, המשולשים והספטאקורדים') }),
    aeol({ fam: 'k-keylick', id: 'k-keylick-17', min: 3, block: 'C', title: T('lick 2, the enclosure, into triads and 7th chords', 'ליק 2, כיתור, אל המשולשים והספטאקורדים') }),
    aeol({ fam: 'k-keylick', id: 'k-keylick-18', min: 4, block: 'C', title: T('lick 3, the long enclosure, into triads and 7th chords', 'ליק 3, הכיתור הארוך, אל המשולשים והספטאקורדים') }),
    ...MODES.flatMap(([mode, o, min]): LadderRung[] => [
      { fam: 'scales', id: ({ 1: 'scales-19', 2: 'scales-24', 3: 'scales-22', 4: 'scales-21', 6: 'scales-26' } as Record<number, string>)[o], min, block: 'A', mode, tag: mode, title: scaleT.it },
      { fam: 'k-sharm', id: 'k-sharm-11', min, pick: optIs(o), block: 'S', mode, tag: mode },
      { fam: 'k-keylick', id: 'k-keylick-19', min, pick: optIs(o), block: 'C', mode, tag: mode, title: T('approach lick 1 into the 7th chords', 'ליק גישה 1 אל הספטאקורדים') },
    ]),
  ];
}

/** The candidate rungs of a key, in teaching order (minor: the harmonic-minor rows), per instrument. */
export function ladderRungs(group: 'major' | 'minor', inst: LadderInst = 'piano'): LadderRung[] {
  if (inst === 'guitar') return guitarRungs(group === 'minor');
  if (inst === 'bass') return bassRungs(group === 'minor');
  const minor = group === 'minor';
  const opt = (o: number) => (sp: LevelDef['specs'][number]) => (sp as { option?: number }).option === o;
  const sharm = (n: number) => `k-sharm-${minor ? n + 1 : n}`;
  const so = minor ? 7 : 0;
  const notMinor = (sp: LevelDef['specs'][number]) => !(sp as { minor?: boolean }).minor;
  const isMinor = (sp: LevelDef['specs'][number]) => !!(sp as { minor?: boolean }).minor;
  return [
    ...(minor ? [] : [{ fam: 'scales', id: 'scales-4', min: 2, block: 'A' as const }]),
    { fam: 'scales', id: minor ? 'scales-13' : 'scales-8', min: 4, block: 'A' as const },
    ...(minor ? [] : [{ fam: 'control', id: 'control-8', min: 3, block: 'A' as const }, { fam: 'scales', id: 'scales-11', min: 3, block: 'A' as const }]),
    { fam: 'k-sharm', id: sharm(3), min: 0, pick: opt(so), block: 'S' as const },
    { fam: 'k-sharm', id: sharm(5), min: 3, pick: opt(so), block: 'B' as const },
    { fam: 'k-sharm', id: sharm(7), min: 0, pick: opt(so), block: 'S' as const },
    { fam: 'k-sharm', id: sharm(9), min: 3, pick: opt(so), block: 'B' as const },
    { fam: 'k-sharm', id: sharm(11), min: 1, pick: opt(so), block: 'S' as const },
    { fam: 'k-sharm', id: sharm(13), min: 4, pick: opt(so), block: 'B' as const },
    { fam: 'k-sharm', id: sharm(15), min: 5, pick: opt(so), block: 'B' as const },
    // SPEC-KEY-SESSION §1 B2 (T4+), B4 (T3+), B5 (T5+), 2026-11-23: triad inversions on every degree, the 1-2-3-5 cells,
    // the 9th arpeggios (k-sharm 43–48: odd major, even harmonic minor)
    { fam: 'k-sharm', id: sharm(45), min: 3, pick: opt(so), block: 'B' as const },
    { fam: 'k-sharm', id: sharm(43), min: 4, pick: opt(so), block: 'B' as const },
    { fam: 'k-sharm', id: sharm(47), min: 5, pick: opt(so), block: 'B' as const },
    // the owner's approach licks (k-keylick, SPEC-KEY-SESSION §C): lick 1, 2, 3 into the scale degrees, 3rds, triads and 7ths (each hand), then hands together
    ...([[1, 0], [2, 1], [3, 1], [4, 2], [5, 2], [6, 3], [7, 3], [8, 3], [9, 4], [10, 4], [11, 4], [12, 4], [13, 5], [14, 5], [15, 6]] as const).map(([n, min]) => ({ fam: 'k-keylick', id: `k-keylick-${n}`, min, pick: minor ? isMinor : notMinor, block: 'C' as const })),
    // more in the key (k-keyx): broken octaves, octave leaps, the canon, bass leaps, the scale over an ostinato
    ...(minor
      ? [{ fam: 'k-keyx', id: 'k-keyx-6', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-7', min: 3, block: 'D' as const }]
      : [{ fam: 'k-keyx', id: 'k-keyx-5', min: 2, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-3', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-1', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-4', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-2', min: 4, block: 'D' as const }]),
    ...(minor ? [] : [
      { fam: 'fingers', id: 'fingers-15', min: 2, block: 'D' as const },
      { fam: 'fingers', id: 'fingers-16', min: 4, block: 'D' as const },
      // D1 Hanon Part I in the key, the number by the tier (fingers-15…18); D2 two voices in one hand (§1b)
      { fam: 'fingers', id: 'fingers-17', min: 5, block: 'D' as const },
      { fam: 'fingers', id: 'fingers-18', min: 6, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-1', min: 1, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-3', min: 2, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-6', min: 3, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-7', min: 3, block: 'D' as const },
      { fam: 'advanced', id: 'advanced-1', min: 5, block: 'D' as const },
      { fam: 'advanced', id: 'advanced-4', min: 6, pick: (sp: LevelDef['specs'][number]) => (sp as { option?: number }).option === 0, block: 'D' as const },
    ]),
    ...(minor ? [{ fam: 'advanced', id: 'advanced-9', min: 5, block: 'D' as const }] : []),
    { fam: 'cadences', id: minor ? 'cadences-3' : 'cadences-1', min: 0, max: 1, pick: minor ? isMinor : undefined, block: 'E' as const },
    { fam: 'cadences', id: minor ? 'cadences-7' : 'cadences-2', min: 2, max: 3, pick: minor ? isMinor : undefined, block: 'E' as const },
    { fam: 'k-cadlib', id: 'k-cadlib-6', min: 4, pick: (sp) => /cad:(m-)?ii-v-i~/.test((sp as { kind: string }).kind) && /m-ii/.test((sp as { kind: string }).kind) === minor, block: 'E' as const },
    // E1 at T6+: the So What voicing (Bill Evans's on "So What", Kind of Blue, 1959: three perfect 4ths and a major 3rd,
    // D-G-C-F-A on Dm7) and the Kenny Barron voicing (stacked 5ths per hand, LH 1-5-9, RH ♭3-♭7-11) on the key's
    // ii–V–I — the canonical stacks in chartDrills.ts soWhatOffsets / barronOffsets, with their published sources.
    // Stated only for the major ii–V–I (no minor So What or Barron is published), so major rows only.
    ...(minor
      ? []
      : [
          { fam: 'k-cadlib', id: 'k-cadlib-23', min: 6, pick: kindIs(/cad:ii-v-i~/), block: 'E' as const },
          { fam: 'k-cadlib', id: 'k-cadlib-24', min: 6, pick: kindIs(/cad:ii-v-i~/), block: 'E' as const },
          { fam: 'k-cadlib', id: 'k-cadlib-26', min: 6, pick: kindIs(/cad:ii-v-i~/), block: 'E' as const },
        ]),
    ...(minor ? [] : [{ fam: 'harris', id: 'harris-1', min: 5, jazz: true, block: 'F' as const }, { fam: 'k-dimcol', id: 'k-dimcol-1', min: 5, jazz: true, block: 'F' as const }]),
    // F2 triad pairs over the I (the lydian pair in root position, then the ionian pair's 5-1-3 permutation, on the key's
    // root); F3 the bebop scale — the bebop dominant on the key's V (G7 in C), each hand
    ...(minor
      ? []
      : [
          { fam: 'k-tpair', id: 'k-tpair-1', min: 5, jazz: true, pick: tpairOver(['lydian']), block: 'F' as const },
          { fam: 'k-tpair', id: 'k-tpair-2', min: 6, jazz: true, pick: tpairOver(['ionian']), block: 'F' as const },
          { fam: 'k-modes', id: 'k-modes-3', off: 7, min: 5, jazz: true, block: 'F' as const, title: T('the bebop dominant on the V, each hand, one and two octaves', 'ביבופ דומיננטי על ה־V, כל יד, אוקטבה ושתיים') },
        ]),
  ];
}

/**
 * How much a rung of the key needs work: s 0 never played in this key, 1 played below its target, 2 at its target;
 * share = the slowest item's best clean tempo over its target; last = when it was last played.
 */
export function rungNeed(l: LevelDef, items: Record<string, ItemState>): { s: 0 | 1 | 2; share: number; last: string } {
  const ds = l.specs.flatMap((_, k) => specDrills(l, k, 'fifths-up'));
  const sts = ds.map((d) => items[d.itemId]).filter((x): x is ItemState => !!x && x.takes > 0);
  if (!sts.length) return { s: 0, share: 0, last: '' };
  const share = Math.min(...ds.map((d) => (items[d.itemId]?.cleanBpm ?? 0) / Math.max(1, itemTargetBpm(d))));
  const last = sts.map((x) => x.last ?? '').sort()[0] ?? '';
  const closed = ds.every((d) => itemStatus(items[d.itemId], d.startBpm, itemTargetBpm(d)) === 'closed');
  return { s: closed ? 2 : 1, share, last };
}

/** The rung a key's session leans on: the played one furthest below its target, else the first new one past the warm-up. */
export function ladderFocus(fam: FamilyDef, items: Record<string, ItemState>): LevelDef | null {
  const ls = fam.levels.slice(1).filter((l) => !l.id.endsWith('-again'));
  const played = ls.map((l) => ({ l, n: rungNeed(l, items) })).filter((x) => x.n.s === 1).sort((a, b) => a.n.share - b.n.share);
  return played[0]?.l ?? ls.find((l) => rungNeed(l, items).s === 0) ?? null;
}

/** A rung's title for one key: no "and the modes" / "in C, G, F" / "all keys" (the session is in one key). */
const ONE_KEY_TITLE: Record<string, { en: string; he: string }> = {
  'cadences-1': { en: 'I–IV–V–I', he: 'I–IV–V–I' },
  'cadences-3': { en: 'Minor cadence: i–iv–i6/4–V–i', he: 'קדנצה במינור: i–iv–i6/4–V–i' },
  'cadences-7': { en: 'Minor: deceptive, plagal, Picardy 3rd', he: 'מינור: מטעה, פלגאלית, טרצה פיקרדית' },
  'advanced-9': { en: 'Scales in octaves, double 3rds in the left hand', he: 'סולם באוקטבות, טרצות כפולות ביד שמאל' },
  'scales-13': { en: 'Contrary motion, a 3rd / 6th / 10th apart', he: 'תנועה נגדית, בהפרש טרצה / סקסטה / דצימה' },
};
const oneKeyTitle = (l: LevelDef): { en: string; he: string } => {
  const o = ONE_KEY_TITLE[l.id];
  if (o) return o;
  if (!l.id.startsWith('k-sharm-')) return l.title;
  const cut = (t: string) => t.replace(/[:;] *(מז׳ור והמודוסים|מינור וסולמות האריס|major and the modes|minor and the Harris scales|מינור|minor)(?![A-Za-z]).*$/u, '').replace(/[:;] *(מינור הרמוני|harmonic).*$/u, '');
  return { en: cut(l.title.en), he: cut(l.title.he) };
};

/** Every rung of a key open at the tier, built for that key: the warm-up scale, then the ladder's rungs (teaching order i). */
export function openKeyRungs(fams: FamilyDef[], root: number, group: 'major' | 'minor', tier: number, opts: { jazz?: boolean; /** The player's lick pool (vocab.lickPool): block G (piano). */ licks?: Lick[]; /** The instrument's ladder (default the piano's). */ instrument?: LadderInst; /** SPEC-STYLE-FOCUS: the course's style focus — block H's tiers. */ focus?: StyleFocus } = {}): { warm: LevelDef | null; built: { i: number; rung: LadderRung; lvl: LevelDef }[] } {
  const minor = group === 'minor';
  const inst = opts.instrument ?? 'piano';
  const t = Math.max(0, tier);
  const byId = (fam: string, id: string) => fams.find((f) => f.id === fam)?.levels.find((l) => l.id === id);
  const w = warmOf(inst, minor, t);
  const make = (fam: string, id: string, pick?: LadderRung['pick'], r?: LadderRung): LevelDef | null => {
    const l = byId(fam, id);
    if (!l) return null;
    const specs = pick ? l.specs.filter(pick) : l.specs;
    if (!specs.length) return null;
    // a later rung (phase 7): its tag in the level id, its tonic from the row's root (the Aeolian: the 6th degree)
    const tag = r?.tag;
    const base = r?.title ?? oneKeyTitle(l);
    const name = tag ? RUNG_TAG_NAME[tag] : undefined;
    const title = name ? { en: `${name.en}: ${base.en}`, he: `${name.he}: ${base.he}` } : base;
    return { ...l, id: `key-${root}-${tag ? `${tag}-` : ''}${l.id}`, title, level: 0, specs, keys: [(((root + (r?.off ?? 0)) % 12) + 12) % 12] };
  };
  const warm = make(w.fam, w.id, w.pick);
  // the rungs open at this tier (a jazz rung for a jazz focus a tier earlier); the later rungs (phase 7) after the row's own
  const open = [...ladderRungs(group, inst), ...laterRungs(group, inst)].filter((r) => (r.tag || r.id !== w.id) && t >= r.min - (r.jazz && opts.jazz ? 2 : 0) && (r.max === undefined || t <= r.max) && (!r.jazz || opts.jazz || t >= r.min));
  const built = open.map((r, i) => ({ i, rung: r, lvl: make(r.fam, r.id, r.pick, r) })).filter((x): x is { i: number; rung: LadderRung; lvl: LevelDef } => !!x.lvl);
  // block G, language in the key (SPEC-DAILY-WORKOUT §6, phase 4): every lick of the pool in this key, after the ladder (piano)
  if (inst === 'piano')
    for (const l of (opts.licks ?? []).filter((x) => lickGroup(x) === group))
      built.push({ i: open.length + built.length, rung: { fam: 'licks', id: `lick-${l.id}`, min: 0, block: 'G' }, lvl: lickRungLevel(l, root) });
  // block H, the style block (SPEC-STYLE-FOCUS §5): comping patterns / grooves of the styles in this key (major rows)
  if (!minor)
    for (const r of styleRungs(fams, t, opts.focus, { root })) {
      const lvl = make(r.fam, r.id);
      if (lvl) built.push({ i: open.length + built.length, rung: r, lvl });
    }
  return { warm, built };
}

// ───────────────────────────── the week, the rung just passed, the ceilings (SPEC-KEY-SESSION §1c, §2, §3) ─────────────────────────────

/** §3: by the end of the week every rung open at the player's tier has been visited at least this many times. */
export const WEEK_VISITS = 2;
const rungDrills = (l: LevelDef): Drill[] => l.specs.flatMap((_, k) => specDrills(l, k, 'fifths-up'));
/** The local day ('YYYY-MM-DD') of a time. */
const localDay = (now: number | string = Date.now()): string => {
  const d = new Date(typeof now === 'number' ? now : Date.parse(now));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** §3: the days of this week (Monday weeks, weekOf) the rung was played in this key — clean days and the last take's day. */
export function rungWeekVisits(l: LevelDef, items: Record<string, ItemState>, now: number | string = Date.now()): number {
  const wk = weekOf(now);
  const days = new Set<string>();
  for (const d of rungDrills(l)) {
    const st = items[d.itemId];
    if (!st || !st.takes) continue;
    for (const at of [...(st.history ?? []).map((h) => h.at), st.last]) if (at && weekOf(at) === wk) days.add(at.slice(0, 10));
  }
  return days.size;
}

export interface WeekCoverage {
  /** Rungs open at the tier in this key (the warm-up and the style block's rest tier left out). */
  open: number;
  /** Visited at least WEEK_VISITS times this week. */
  done: number;
  /** The rungs still short of WEEK_VISITS, in teaching order, with their visits so far. */
  short: { rung: LadderRung; lvl: LevelDef; visits: number }[];
}

/** §3 the week: how many of the key's open rungs were visited twice this week, and which are short. */
export function keyWeekCoverage(fams: FamilyDef[], root: number, group: 'major' | 'minor', tier: number, items: Record<string, ItemState>, opts: Parameters<typeof openKeyRungs>[4] = {}, now: number | string = Date.now()): WeekCoverage {
  const { built } = openKeyRungs(fams, root, group, tier, opts);
  const rows = built.filter((b) => b.rung.block !== 'H' || b.rung.tier !== 'rest').map((b) => ({ rung: b.rung, lvl: b.lvl, visits: rungWeekVisits(b.lvl, items, now) }));
  return { open: rows.length, done: rows.filter((r) => r.visits >= WEEK_VISITS).length, short: rows.filter((r) => r.visits < WEEK_VISITS) };
}

/**
 * §1c "the rung that was just passed is not picked again": its every item reached its target tempo (or its ceiling for
 * now, the limit rule) and its last take was today. The coach moved on from it; the next session takes another rung.
 */
export function justPassed(l: LevelDef, items: Record<string, ItemState>, day: string = localDay()): boolean {
  const ds = rungDrills(l);
  if (!ds.length) return false;
  let last = '';
  for (const d of ds) {
    const st = items[d.itemId];
    if (!st || !st.takes) return false;
    if ((st.cleanBpm ?? 0) < itemTargetBpm(d) - 0.5 && !coolingDown(st, day)) return false;
    if (st.last > last) last = st.last;
  }
  return localDay(last) === day;
}

export interface RungCeiling {
  /** The rung's source level id (as the matrix cell's rung). */
  rung: string;
  title: { en: string; he: string };
  /** The ceiling for now (♩): the lowest among the rung's items at their limit. */
  bpm: number;
  /** That item's target tempo (♩). */
  target: number;
}

/**
 * §1c / §2: the key page shows each rung's ceiling — where the coach's limit rule stopped the climb in this key (the
 * best clean tempo saved as "a ceiling for now", BUILD-PLAN §0.2), until a faster clean take beats it. Teaching order.
 */
export function keyCeilings(fams: FamilyDef[], root: number, group: 'major' | 'minor', tier: number, items: Record<string, ItemState>, opts: Parameters<typeof openKeyRungs>[4] = {}): RungCeiling[] {
  const { warm, built } = openKeyRungs(fams, root, group, tier, opts);
  const out: RungCeiling[] = [];
  for (const { rung, lvl } of [...(warm ? [{ rung: null, lvl: warm }] : []), ...built.map((b) => ({ rung: b.rung as LadderRung | null, lvl: b.lvl }))]) {
    let best: RungCeiling | null = null;
    for (const d of rungDrills(lvl)) {
      const st = items[d.itemId];
      const c = st?.ceiling;
      if (!st || !c || (st.cleanBpm ?? 0) > c.bpm + 0.5) continue;
      if (!best || c.bpm < best.bpm) best = { rung: rung ? rungIdOf(rung) : lvl.id.replace(`key-${root}-`, ''), title: lvl.title, bpm: c.bpm, target: itemTargetBpm(d) };
    }
    if (best) out.push(best);
  }
  return out;
}

export function keyLadder(fams: FamilyDef[], root: number, group: FacetGroup, tier: number, items: Record<string, ItemState> = {}, opts: { jazz?: boolean; rungs?: number; licks?: Lick[]; instrument?: LadderInst; focus?: StyleFocus; /** The time now (the week's visits, "just passed" today); default now. */ now?: number | string } = {}): FamilyDef | null {
  if (group !== 'major' && group !== 'minor') return null;
  const { warm, built } = openKeyRungs(fams, root, group, tier, opts);
  const now = opts.now ?? Date.now();
  const day = localDay(now);
  const score = (l: LevelDef) => rungNeed(l, items);
  // block H in a key session: the focus styles only (the rest's exposure is the daily workout's), main before also
  const tierRank = (r: LadderRung) => (r.block !== 'H' ? 0 : r.tier === 'main' ? 0 : r.tier === 'also' ? 1 : 2);
  // §3: among the rungs played below their target, those not yet visited twice this week come first
  const weekShort = (l: LevelDef, s: number) => (s === 1 && rungWeekVisits(l, items, now) >= WEEK_VISITS ? 1 : 0);
  const all = built
    .filter((b) => b.rung.block !== 'H' || b.rung.tier !== 'rest')
    .map((b) => ({ ...b, sc: score(b.lvl) }))
    .map((b) => ({ ...b, wk: weekShort(b.lvl, b.sc.s) }));
  // §1c: the rung just passed today is not picked again (unless nothing else is open)
  const fresh = all.filter((b) => !justPassed(b.lvl, items, day));
  const ranked = (fresh.length ? fresh : all).sort((a, b) => a.sc.s - b.sc.s || tierRank(a.rung) - tierRank(b.rung) || a.wk - b.wk || a.sc.share - b.sc.share || a.sc.last.localeCompare(b.sc.last) || a.i - b.i);
  // the spine (3rds, triads, 7ths along the whole scale) every session; from each other block the one needed most
  // (two from the harmonised forms and the fingers/hands block when the session is long); then back in teaching order.
  // The later rungs (the Aeolian, melodic minor, the modes: phase 7) give one rung a session between them (M).
  const per: Record<string, number> = { S: 9, B: 1, A: 1, C: 2, D: 2, E: 1, F: 1, G: 1, M: 1, H: 1 };
  const taken: Record<string, number> = {};
  const pickd = ranked.filter((x) => {
    const b = x.rung.mode ? 'M' : x.rung.block;
    taken[b] = (taken[b] ?? 0) + 1;
    return taken[b] <= (per[b] ?? 1);
  });
  const chosenR = pickd.slice(0, opts.rungs ?? 99).sort((a, b) => a.i - b.i);
  const chosen = chosenR.map((x) => x.lvl);
  const steps: LevelDef[] = [];
  if (warm) steps.push(warm);
  steps.push(...chosen);
  // a closing visit to the first harmonised rung: it starts just under the best clean tempo just reached
  const back = chosenR.find((x) => x.rung.block === 'S' && !x.rung.mode)?.lvl;
  if (back) steps.push({ ...back, id: `${back.id}-again`, title: { en: `${back.title.en}: again, from your best tempo`, he: `${back.title.he}: שוב, מהטמפו הכי טוב שלך` } });
  steps.forEach((l, k) => (l.level = k + 1));
  if (steps.length < 2) return null;
  return { id: 'scales' as FamilyDef['id'], title: { en: 'Continuous practice in the key', he: 'אימון רציף בסולם' }, style: 'both', levels: steps };
}
