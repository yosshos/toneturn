// Practice by key (docs/SPEC-PRACTICE-KEYS.md, SPEC-COACH-2 §6): the shown families folded into pages — a root (0–11),
// its group tabs (major · minor · melodic/harmonic-minor modes · symmetric), and on each tab its rows (scale, arpeggio,
// cadence …), each row a list of (family, level) entries with that level's drills in this root and group. Key-neutral
// families go to "General technique". Pure: the screen asks for one page; mastery reuses keyMastery's item measure.

import type { Drill, DrillSettings, ItemState } from './types';
import type { FamilyDef, LevelDef } from './generate';
import { specDrills } from './plan';
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
export const cleanAt = (st: ItemState | undefined, d: Drill): boolean => !!st && st.cleanBpm > 0 && st.cleanBpm >= d.startBpm - 0.5;

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
