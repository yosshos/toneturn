// Which standard a drill is built on (reference recordings, owner 2026-11-11): piano chart drills ("chart~std:<id>~…")
// and the bass walking levels ("standard", option = BASS_STD index). Also the key the drill is practised in.
import { referenceOf, type RecKey, type StandardRef } from '../../content/references';
import { BASS_STD } from './bass';
import type { DrillSpec } from './types';

/** The standards.ts id a drill spec practises, or null. */
export function standardIdOfSpec(s: Pick<DrillSpec, 'family' | 'kind' | 'option'>): string | null {
  const m = /^chart~std:([^~]+)~/.exec(s.kind);
  if (m) return m[1];
  if (s.kind === 'standard' && s.family === 'b-walk') {
    const op = s.option ?? 0;
    return BASS_STD[((op % BASS_STD.length) + BASS_STD.length) % BASS_STD.length]?.id ?? null;
  }
  return null;
}

/** The reference and the key this drill is practised in (bass: the tune's own key; piano: the written key + the spec's key). */
export function standardOfSpec(s: Pick<DrillSpec, 'family' | 'kind' | 'option' | 'key'>): { ref: StandardRef; key: RecKey } | null {
  const ref = referenceOf(standardIdOfSpec(s));
  if (!ref) return null;
  if (s.kind === 'standard') return { ref, key: ref.appKey };
  return { ref, key: { ...ref.appKey, pc: (((ref.appKey.pc + (s.key ?? 0)) % 12) + 12) % 12 } };
}
