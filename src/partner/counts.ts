// The depth page's numbers (docs/SPEC-PARTNER-PITCH.md §3.3), computed from the live catalogues — never typed in.
import { families, familyById, levelKeys } from '../engine/drills/plan';
import { VOICE_FAMILIES } from '../engine/voiceFamilies';
import { stepCatalogue } from '../engine/path';
import { TOPIC_GEN } from '../engine/topics';
import { MINI_LESSONS } from '../content/minilessons';
import { CARD_IDS } from '../engine/ruleCards';
import { TOPIC_GROUPS } from '../engine/topicGroups';
import { MATRIX_MODES, MATRIX_OCTAVES, MATRIX_SCALES, cellRequired, scaleCoverage, type HandsMode } from '../engine/drills/scaleMatrix';
import type { FamilyId } from '../engine/drills/types';
import type { DepthLink } from './types';

export type InstrumentId = 'piano' | 'guitar' | 'bass' | 'drums' | 'voice';
export interface InstrumentDepth {
  id: InstrumentId;
  families: number;
  levels: number;
  /** Items (each runs through its keys). */
  items: number;
  /** Item × key drills. */
  drills: number;
}
export interface DepthCounts {
  instruments: InstrumentDepth[];
  levels: number;
  items: number;
  drills: number;
  topics: number;
  pathSteps: number;
  lessons: number;
  ruleCards: number;
  /** Pitched technique levels (piano, guitar, bass) that run in all 12 keys, and their share. */
  twelveKeyLevels: number;
  pitchedLevels: number;
  twelveKeyShare: number;
}

let cached: DepthCounts | null = null;
export function depthCounts(): DepthCounts {
  if (cached) return cached;
  const instruments: InstrumentDepth[] = [];
  let tw = 0;
  let pitched = 0;
  for (const id of ['piano', 'guitar', 'bass', 'drums'] as const) {
    const fs = families(id);
    let levels = 0;
    let items = 0;
    let drills = 0;
    for (const f of fs)
      for (const lv of f.levels) {
        levels++;
        items += lv.specs.length;
        const keys = id === 'drums' ? 1 : new Set(levelKeys(lv, 'fifths-up')).size;
        drills += lv.specs.length * keys;
        if (id !== 'drums') {
          pitched++;
          if (keys >= 12) tw++;
        }
      }
    instruments.push({ id, families: fs.length, levels, items, drills });
  }
  let vLevels = 0;
  for (const f of VOICE_FAMILIES) vLevels += f.refs.length;
  instruments.push({ id: 'voice', families: VOICE_FAMILIES.length, levels: vLevels, items: vLevels, drills: vLevels });
  const cat = stepCatalogue();
  const topics = new Set(cat.filter((s) => s.topic).map((s) => s.topic as string));
  cached = {
    instruments,
    levels: instruments.reduce((n, x) => n + x.levels, 0),
    items: instruments.reduce((n, x) => n + x.items, 0),
    drills: instruments.reduce((n, x) => n + x.drills, 0),
    topics: topics.size,
    pathSteps: cat.length,
    lessons: Object.keys(MINI_LESSONS).length,
    ruleCards: CARD_IDS.length,
    twelveKeyLevels: tw,
    pitchedLevels: pitched,
    twelveKeyShare: pitched ? tw / pitched : 0,
  };
  return cached;
}

/** Levels in a drill family (0 = unknown id). */
export const familyLevels = (id: string): number => familyById(id as FamilyId)?.levels.length ?? 0;
/** Levels of a topic (0 = no such topic). */
export const topicLevels = (id: string): number => TOPIC_GEN[id]?.levels.length ?? 0;
/** The display name of a link's target. */
export function linkTitle(l: DepthLink, lang: 'en' | 'he'): string {
  if (l.kind === 'family') return familyById(l.id as FamilyId)?.title[lang] ?? l.id;
  return TOPIC_GEN[l.id]?.title[lang] ?? l.id;
}
/** Does a link point at something real? */
export const linkResolves = (l: DepthLink): boolean => (l.kind === 'family' ? familyLevels(l.id) > 0 : topicLevels(l.id) > 0);
/** The levels behind a set of links (families: levels; topics: path levels). */
export const linksLevels = (ls: DepthLink[]): number => ls.reduce((n, l) => n + (l.kind === 'family' ? familyLevels(l.id) : topicLevels(l.id)), 0);
/** A topic group's size (TOPIC_GROUPS). */
export const groupTopics = (id: string): number => TOPIC_GROUPS.find((g) => g.id === id)?.topics.length ?? 0;

export interface MatrixRow {
  type: string;
  en: string;
  /** Per mode: covered octaves / required octaves. */
  cells: { mode: HandsMode; covered: number; required: number }[];
}
/** The piano scale matrix (AUDIT-SCALES), read from the catalogue. */
export function scaleMatrix(): { rows: MatrixRow[]; covered: number; required: number } {
  const cov = scaleCoverage();
  let covered = 0;
  let required = 0;
  const rows = MATRIX_SCALES.map(({ type, en }) => ({
    type,
    en,
    cells: MATRIX_MODES.map((mode) => {
      let c = 0;
      let r = 0;
      for (const o of MATRIX_OCTAVES) {
        if (!cellRequired(mode, o)) continue;
        r++;
        if ((cov.get(`${type}|${mode}|${o}`)?.levels.length ?? 0) > 0) c++;
      }
      covered += c;
      required += r;
      return { mode, covered: c, required: r };
    }),
  }));
  return { rows, covered, required };
}
