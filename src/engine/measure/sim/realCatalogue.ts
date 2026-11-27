// Area catalogues derived from the real key ladder (src/engine/drills/keyIndex.ts LadderRung.min), for SPEC-HOLISTIC-2
// §9.1 "calendar time per tier per area from the real catalogue". Pure (reads only static ladder definitions).
//
// Mapping (an assumption; see report): block A → scales; B → arpeggios (the harmonised scale's other forms);
// S + E → harmony/voicing (harmonised spine, cadences); D → independence/finger; F → line-jazz. Blocks C, G (licks:
// memorised material, coverage only), H (style rungs, player-dependent) and R (by ear) are left out.
// Exercise identity = group (major/minor row) + rung id (with tag). A scale rung with a max spans one exercise per nps
// tier min…max (§1.7: each nps rung is its own exercise); other rungs sit at their min. Every rung is keyed (12 keys).

import { ladderRungs, laterRungs, rungIdOf, type LadderInst, type LadderRung } from '../../drills/keyIndex';
import type { AreaCatalogue } from './catalogue';
import type { Exercise } from './rank';

const AREA_OF: Partial<Record<LadderRung['block'], string>> = { A: 'scales', B: 'arpeggios', S: 'harmony', E: 'harmony', D: 'independence', F: 'line-jazz' };

export function realCatalogues(inst: LadderInst): AreaCatalogue[] {
  const by = new Map<string, Map<string, Exercise>>();
  for (const g of ['major', 'minor'] as const) {
    for (const r of [...ladderRungs(g, inst), ...laterRungs(g, inst)]) {
      const area = AREA_OF[r.block];
      if (!area) continue;
      const m = by.get(area) ?? new Map<string, Exercise>();
      by.set(area, m);
      const tiers = r.block === 'A' && r.max !== undefined ? Array.from({ length: r.max - r.min + 1 }, (_, i) => r.min + i) : [r.min];
      for (const t of tiers) {
        const id = `${g}:${rungIdOf(r)}${tiers.length > 1 ? `@T${t}` : ''}`;
        m.set(id, { id, tier: t, keys: 12, available: true });
      }
    }
  }
  return [...by.entries()].map(([area, m]) => ({ name: `${inst}/${area}`, exercises: [...m.values()], tempo: area === 'scales' || area === 'arpeggios' || area === 'independence' || area === 'line-jazz' }));
}

/** Exercises per tier, for the report. */
export const perTierCounts = (c: AreaCatalogue): number[] => {
  const top = Math.max(0, ...c.exercises.map((e) => e.tier));
  const out = Array.from({ length: top + 1 }, () => 0);
  for (const e of c.exercises) if (e.available) out[e.tier]++;
  return out;
};
