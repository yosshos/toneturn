// AUDIT-SCALES (owner 2026-11-14): the piano scale coverage matrix — every scale type × right hand, left hand, hands
// together in parallel motion (an octave apart), hands together in contrary motion (from one shared note, outward and
// back) × 1, 2 and 4 octaves × 12 keys — read from the live catalogue, so docs/AUDIT-SCALES.md and the tests never drift.
//
// What the matrix asks for: 1 and 2 octaves in all four ways; 4 octaves hands together in parallel (the exam form).
// Contrary motion over 4 octaves would run off an 88-key keyboard, and separate hands over 4 octaves train nothing the
// 2-octave separate-hands items and the 4-octave hands-together item don't — those cells are "n/a" by design.

import { catalog, scaleTypeOf, type FamilyDef } from './generate';
import type { DrillSpec, ScaleType } from './types';

export type HandsMode = 'R' | 'L' | 'HT' | 'contrary';
export const MATRIX_MODES: HandsMode[] = ['R', 'L', 'HT', 'contrary'];
export const MATRIX_OCTAVES = [1, 2, 4] as const;
export const MATRIX_SCALES: { type: ScaleType; en: string }[] = [
  { type: 'major', en: 'Major (Ionian)' },
  { type: 'dorian', en: 'Dorian' },
  { type: 'phrygian', en: 'Phrygian' },
  { type: 'lydian', en: 'Lydian' },
  { type: 'mixolydian', en: 'Mixolydian' },
  { type: 'natural', en: 'Natural minor (Aeolian)' },
  { type: 'locrian', en: 'Locrian' },
  { type: 'harmonic', en: 'Harmonic minor' },
  { type: 'melodic', en: 'Melodic minor' },
  { type: 'pentatonic', en: 'Major pentatonic' },
  { type: 'blues', en: 'Blues' },
  { type: 'six-dim', en: '6th-diminished (Harris)' },
  { type: 'six-dim-m', en: 'Minor 6th-diminished (Harris)' },
];

/** Is this cell part of the matrix (false = n/a by design)? */
export const cellRequired = (mode: HandsMode, oct: number): boolean => oct !== 4 || mode === 'HT';

/** The scale type a spec plays as a straight scale (genScale or the Harris h1 6th-diminished line), else null. */
function scaleOfSpec(sp: Omit<DrillSpec, 'key'>): ScaleType | null {
  if (sp.kind === 'scale') return scaleTypeOf({ ...sp, key: 0 });
  if (sp.kind === 'h1-linear') return sp.option === 1 ? 'six-dim-m' : (sp.option ?? 0) === 0 ? 'six-dim' : null;
  return null;
}
const modeOf = (sp: Omit<DrillSpec, 'key'>): HandsMode | null => {
  if (sp.hands !== 'RL') return sp.hands;
  if (!sp.motion || sp.motion === 'parallel') return 'HT';
  return sp.motion === 'contrary' ? 'contrary' : null;
};

export interface Cell {
  /** Levels with an item for this cell in all 12 keys. */
  levels: string[];
}
export function scaleCoverage(cat: FamilyDef[] = catalog()): Map<string, Cell> {
  const out = new Map<string, Cell>();
  for (const { type } of MATRIX_SCALES) for (const m of MATRIX_MODES) for (const o of MATRIX_OCTAVES) out.set(`${type}|${m}|${o}`, { levels: [] });
  for (const f of cat)
    for (const lv of f.levels) {
      const twelve = !Array.isArray(lv.keys) || new Set(lv.keys).size >= 12;
      if (!twelve) continue;
      for (const sp of lv.specs) {
        const type = scaleOfSpec(sp);
        const m = modeOf(sp);
        if (!type || !m) continue;
        const oct = sp.kind === 'h1-linear' ? 2 : (sp.octaves ?? 2);
        const c = out.get(`${type}|${m}|${oct}`);
        if (c && !c.levels.includes(lv.id)) c.levels.push(lv.id);
      }
    }
  return out;
}

/** Cells the matrix asks for that no 12-key level covers (should be empty). */
export function missingCells(cat?: FamilyDef[]): string[] {
  const cov = scaleCoverage(cat);
  const miss: string[] = [];
  for (const { type } of MATRIX_SCALES) for (const m of MATRIX_MODES) for (const o of MATRIX_OCTAVES) if (cellRequired(m, o) && !cov.get(`${type}|${m}|${o}`)!.levels.length) miss.push(`${type}|${m}|${o}`);
  return miss;
}

/** The matrix as a Markdown table (docs/AUDIT-SCALES.md): one row per scale, a column per hands mode × octaves. */
export function matrixMarkdown(cat?: FamilyDef[]): string {
  const cov = scaleCoverage(cat);
  const cols = MATRIX_OCTAVES.flatMap((o) => MATRIX_MODES.map((m) => ({ m, o })));
  const name = (m: HandsMode) => ({ R: 'RH', L: 'LH', HT: 'HT par', contrary: 'HT contr' })[m];
  const head = `| Scale | ${cols.map((c) => `${name(c.m)} ${c.o} oct`).join(' | ')} |`;
  const sep = `|---|${cols.map(() => '---').join('|')}|`;
  const rows = MATRIX_SCALES.map(({ type, en }) => `| ${en} | ${cols.map((c) => (cellRequired(c.m, c.o) ? cov.get(`${type}|${c.m}|${c.o}`)!.levels.join(', ') || '**missing**' : 'n/a')).join(' | ')} |`);
  return [head, sep, ...rows].join('\n');
}
