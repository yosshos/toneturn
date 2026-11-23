// SPEC-STYLE-FOCUS §5 on the drums: "Drums have no keys. On drums the style block is the grooves by tempo, under the
// same weighting." The daily workout's style block for the drum kit: the styled groove levels open at the player's
// tier (d-latin bossa / samba / clave grooves, d-funk soul grooves and the second line, d-jazz, d-prog …), drawn about
// 60 % from the main style, 30 % from the "also" styles and 10 % from the rest (never zero; the rest by taste when the
// focus carries THE weights — styleFocus.weightedFocus), each groove at its next tempo on its own ladder (the
// neediest first; a closed groove at its target tempo, as maintenance). Pure.
//
// For the workout agent: `drumStyleBlock(families('drums'), items, weightedFocus(settings, 'drums', day), tier,
// minutes, day)` returns the picks; each pick's `drill` (with `startBpm` set to the tempo to play) runs like any drill.

import type { FamilyDef, LevelDef } from './generate';
import type { Drill, ItemState } from './types';
import { levelDrills, itemTargetBpm } from './plan';
import { itemStatus } from './itemStatus';
import { styleOfLevel, type StyleId } from '../styles';
import { allocateSlots, drawStyle, seedOf, styleTier, tierShares, type StyleTier, type WeightedFocus } from '../styleFocus';
import { styleRungTier } from './keyIndex';

export interface DrumStylePick {
  level: LevelDef;
  style: StyleId;
  tier: StyleTier;
  /** The groove's item to play (the level's first groove not yet closed, else its first). */
  drill: Drill;
  /** The tempo to play today: the next rung of the groove's own ladder (start → target), the target once closed. */
  tempo: number;
  target: number;
}

/** About two minutes a groove (a few takes up its tempo ladder). */
export const DRUM_GROOVE_MINUTES = 2;
/** The tempo ladder's step (♩) between days. */
export const DRUM_TEMPO_STEP = 4;

/** A groove's tempo today: its clean tempo plus one step (from the start), capped at the target; closed → the target. */
export function grooveTempo(st: ItemState | undefined, start: number, target: number): number {
  if (!st || !st.takes) return start;
  if (itemStatus(st, start, target) === 'closed') return target;
  return Math.min(target, Math.max(start, Math.round((st.cleanBpm ?? 0) + DRUM_TEMPO_STEP)));
}

/** The styled drum levels open at the tier, each with its groove to play and its need (share of target; closed last). */
function candidates(fams: FamilyDef[], items: Record<string, ItemState>, tier: number) {
  const out: { level: LevelDef; style: StyleId; drill: Drill; tempo: number; target: number; need: number }[] = [];
  for (const f of fams)
    for (const l of f.levels) {
      const style = styleOfLevel(l, f);
      if (!style || styleRungTier(l) > Math.max(0, tier)) continue;
      const ds = levelDrills(l, 'fifths-up');
      if (!ds.length) continue;
      const scored = ds.map((d) => {
        const target = itemTargetBpm(d) || d.startBpm;
        const st = items[d.itemId];
        const closed = !!st && st.takes > 0 && itemStatus(st, d.startBpm, target) === 'closed';
        return { d, target, st, need: closed ? 2 : (st?.cleanBpm ?? 0) / Math.max(1, target) };
      });
      const best = scored.sort((a, b) => a.need - b.need)[0];
      out.push({ level: l, style, drill: best.d, tempo: grooveTempo(best.st, best.d.startBpm, best.target), target: best.target, need: best.need });
    }
  return out;
}

/**
 * Today's drum style block within `minutes`: n = minutes ÷ 2 grooves, split 60 / 30 / 10 by the focus (the rest's 10 %
 * never starves: the day's seed rounds the fractions), the style of each slot drawn by THE weights when the focus
 * carries them, and inside a style the neediest groove (lowest share of its target; closed grooves last).
 */
export function drumStyleBlock(fams: FamilyDef[], items: Record<string, ItemState>, focus: WeightedFocus, tier: number, minutes: number, day: string): DrumStylePick[] {
  const cands = candidates(fams, items, tier);
  if (!cands.length || minutes <= 0) return [];
  const n = Math.max(1, Math.round(minutes / DRUM_GROOVE_MINUTES));
  const present = [...new Set(cands.map((c) => c.style))];
  const slots = allocateSlots(n, tierShares(focus, present), seedOf(`${day}|drumstyle`));
  const out: DrumStylePick[] = [];
  const used = new Set<string>();
  for (const t of ['main', 'also', 'rest'] as StyleTier[]) {
    const pool = cands.filter((c) => styleTier(focus, c.style) === t).sort((a, b) => a.need - b.need);
    let k = 0;
    while (slots[t] > 0 && pool.some((c) => !used.has(c.level.id))) {
      const left = [...new Set(pool.filter((c) => !used.has(c.level.id)).map((c) => c.style))];
      const st = drawStyle(left, (x) => focus.w?.[x] ?? 1, seedOf(`${day}|drum|${t}|${k++}`)) ?? left[0];
      const c = pool.find((x) => x.style === st && !used.has(x.level.id))!;
      used.add(c.level.id);
      out.push({ level: c.level, style: c.style, tier: t, drill: { ...c.drill, startBpm: c.tempo }, tempo: c.tempo, target: c.target });
      slots[t]--;
    }
  }
  return out;
}
