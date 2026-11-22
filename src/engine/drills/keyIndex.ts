// Practice by key (docs/SPEC-PRACTICE-KEYS.md, SPEC-COACH-2 §6): the shown families folded into pages — a root (0–11),
// its group tabs (major · minor · melodic/harmonic-minor modes · symmetric), and on each tab its rows (scale, arpeggio,
// cadence …), each row a list of (family, level) entries with that level's drills in this root and group. Key-neutral
// families go to "General technique". Pure: the screen asks for one page; mastery reuses keyMastery's item measure.

import type { Drill, DrillSettings, ItemState } from './types';
import type { FamilyDef, LevelDef } from './generate';
import { itemTargetBpm, specDrills } from './plan';
import { itemStatus } from './itemStatus';
import { FACET_GROUPS, FAMILY_FACETS, keyFacet, type FacetGroup, type FacetRole } from './keyFacet';
import { itemMastery, MIN_TAKES, STRONG_FROM, WEAK_BELOW, type KeyStatus } from '../analysis/keyMastery';

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
  /** A the scale, S the harmonised spine (3rds, triads, 7ths), B its other forms, C licks, D fingers/hands, E cadence, F jazz. */
  block: 'A' | 'S' | 'B' | 'C' | 'D' | 'E' | 'F';
}

/** The candidate rungs of a key, in teaching order (minor: the harmonic-minor rows). */
export function ladderRungs(group: 'major' | 'minor'): LadderRung[] {
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
    // the owner's approach licks (k-keylick, SPEC-KEY-SESSION §C): lick 1, 2, 3 into the scale degrees, 3rds, triads and 7ths (each hand), then hands together
    ...([[1, 0], [2, 1], [3, 1], [4, 2], [5, 2], [6, 3], [7, 3], [8, 3], [9, 4], [10, 4], [11, 4], [12, 4], [13, 5], [14, 5], [15, 6]] as const).map(([n, min]) => ({ fam: 'k-keylick', id: `k-keylick-${n}`, min, pick: minor ? isMinor : notMinor, block: 'C' as const })),
    // more in the key (k-keyx): broken octaves, octave leaps, the canon, bass leaps, the scale over an ostinato
    ...(minor
      ? [{ fam: 'k-keyx', id: 'k-keyx-6', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-7', min: 3, block: 'D' as const }]
      : [{ fam: 'k-keyx', id: 'k-keyx-5', min: 2, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-3', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-1', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-4', min: 3, block: 'D' as const }, { fam: 'k-keyx', id: 'k-keyx-2', min: 4, block: 'D' as const }]),
    ...(minor ? [] : [
      { fam: 'fingers', id: 'fingers-15', min: 2, block: 'D' as const },
      { fam: 'fingers', id: 'fingers-16', min: 4, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-1', min: 1, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-6', min: 3, block: 'D' as const },
      { fam: 'k-indep', id: 'k-indep-7', min: 3, block: 'D' as const },
      { fam: 'advanced', id: 'advanced-1', min: 5, block: 'D' as const },
      { fam: 'advanced', id: 'advanced-4', min: 6, pick: (sp: LevelDef['specs'][number]) => (sp as { option?: number }).option === 0, block: 'D' as const },
    ]),
    ...(minor ? [{ fam: 'advanced', id: 'advanced-9', min: 5, block: 'D' as const }] : []),
    { fam: 'cadences', id: minor ? 'cadences-3' : 'cadences-1', min: 0, max: 1, pick: minor ? isMinor : undefined, block: 'E' as const },
    { fam: 'cadences', id: minor ? 'cadences-7' : 'cadences-2', min: 2, max: 3, pick: minor ? isMinor : undefined, block: 'E' as const },
    { fam: 'k-cadlib', id: 'k-cadlib-6', min: 4, pick: (sp) => /cad:(m-)?ii-v-i~/.test((sp as { kind: string }).kind) && /m-ii/.test((sp as { kind: string }).kind) === minor, block: 'E' as const },
    ...(minor ? [] : [{ fam: 'harris', id: 'harris-1', min: 5, jazz: true, block: 'F' as const }, { fam: 'k-dimcol', id: 'k-dimcol-1', min: 5, jazz: true, block: 'F' as const }]),
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
export function openKeyRungs(fams: FamilyDef[], root: number, group: 'major' | 'minor', tier: number, opts: { jazz?: boolean } = {}): { warm: LevelDef | null; built: { i: number; rung: LadderRung; lvl: LevelDef }[] } {
  const minor = group === 'minor';
  const t = Math.max(0, tier);
  const byId = (fam: string, id: string) => fams.find((f) => f.id === fam)?.levels.find((l) => l.id === id);
  const scale = minor ? (t <= 1 ? 'scales-17' : t <= 3 ? 'scales-5' : t <= 5 ? 'scales-13' : 'scales-33') : t <= 1 ? 'scales-1' : t <= 3 ? 'scales-3' : t <= 5 ? 'scales-8' : 'scales-10';
  const make = (fam: string, id: string, pick?: LadderRung['pick'], n = 0): LevelDef | null => {
    const l = byId(fam, id);
    if (!l) return null;
    const specs = pick ? l.specs.filter(pick) : l.specs;
    return specs.length ? { ...l, id: `key-${root}-${l.id}${n ? `-${n}` : ''}`, title: oneKeyTitle(l), level: 0, specs, keys: [root] } : null;
  };
  const warm = make('scales', scale, minor ? undefined : (sp) => !(sp as { minor?: boolean }).minor);
  // the rungs open at this tier (a jazz rung for a jazz focus a tier earlier)
  const open = ladderRungs(group).filter((r) => r.id !== scale && t >= r.min - (r.jazz && opts.jazz ? 2 : 0) && (r.max === undefined || t <= r.max) && (!r.jazz || opts.jazz || t >= r.min));
  const built = open.map((r, i) => ({ i, rung: r, lvl: make(r.fam, r.id, r.pick) })).filter((x): x is { i: number; rung: LadderRung; lvl: LevelDef } => !!x.lvl);
  return { warm, built };
}

export function keyLadder(fams: FamilyDef[], root: number, group: FacetGroup, tier: number, items: Record<string, ItemState> = {}, opts: { jazz?: boolean; rungs?: number } = {}): FamilyDef | null {
  if (group !== 'major' && group !== 'minor') return null;
  const { warm, built } = openKeyRungs(fams, root, group, tier, opts);
  const score = (l: LevelDef) => rungNeed(l, items);
  const ranked = built.map((b) => ({ ...b, sc: score(b.lvl) })).sort((a, b) => a.sc.s - b.sc.s || a.sc.share - b.sc.share || a.sc.last.localeCompare(b.sc.last) || a.i - b.i);
  // the spine (3rds, triads, 7ths along the whole scale) every session; from each other block the one needed most
  // (two from the harmonised forms and the fingers/hands block when the session is long); then back in teaching order
  const per: Record<string, number> = { S: 9, B: 1, A: 1, C: 2, D: 2, E: 1, F: 1 };
  const taken: Record<string, number> = {};
  const pickd = ranked.filter((x) => {
    const b = x.rung.block;
    taken[b] = (taken[b] ?? 0) + 1;
    return taken[b] <= (per[b] ?? 1);
  });
  const chosen = pickd.slice(0, opts.rungs ?? 99).sort((a, b) => a.i - b.i).map((x) => x.lvl);
  const steps: LevelDef[] = [];
  if (warm) steps.push(warm);
  steps.push(...chosen);
  // a closing visit to the first harmonised rung: it starts just under the best clean tempo just reached
  const back = chosen.find((l) => /k-sharm/.test(l.id));
  if (back) steps.push({ ...back, id: `${back.id}-again`, title: { en: `${back.title.en}: again, from your best tempo`, he: `${back.title.he}: שוב, מהטמפו הכי טוב שלך` } });
  steps.forEach((l, k) => (l.level = k + 1));
  if (steps.length < 2) return null;
  return { id: 'scales' as FamilyDef['id'], title: { en: 'Continuous practice in the key', he: 'אימון רציף בסולם' }, style: 'both', levels: steps };
}
