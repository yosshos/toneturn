// Synthetic area catalogues for the harness (SPEC-HOLISTIC-2 §9.1). Pure. The real-catalogue counts are derived in
// realCatalogue.ts (it imports the app's ladder, so this file stays dependency-free).

import type { Exercise } from './rank';

export interface AreaCatalogue {
  name: string;
  exercises: Exercise[];
  /** Tempo area (§1.3 placement correction by paceTier) vs non-tempo. */
  tempo: boolean;
}

/** A catalogue with `perTier[t]` exercises at tier t (0 = an empty tier), each in `keys` keys (0 = keyless). */
export function syntheticCatalogue(name: string, perTier: number[], keys = 12, tempo = true): AreaCatalogue {
  const exercises: Exercise[] = [];
  perTier.forEach((n, t) => {
    for (let i = 0; i < n; i++) exercises.push({ id: `${name}:T${t}:${i}`, tier: t, keys, available: true });
  });
  return { name, exercises, tempo };
}

/**
 * The default synthetic area: realistic counts (the real piano areas hold 1–9 exercises per tier), with one empty tier
 * (T5) and one 2-exercise tier (T7), the cases §1.3 / §1.7 name.
 */
export const DEFAULT_PER_TIER = [3, 4, 4, 5, 4, 0, 3, 2, 3];
export const defaultCatalogue = (): AreaCatalogue => syntheticCatalogue('synthetic', DEFAULT_PER_TIER);

/** The top non-empty tier. */
export const topTier = (c: AreaCatalogue): number => Math.max(...c.exercises.filter((e) => e.available).map((e) => e.tier));
