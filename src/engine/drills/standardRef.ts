// Which standard a drill is built on (reference recordings, owner 2026-11-11), and the key it is practised in:
//   piano chart drills "chart~std:<id>~…" (written key + spec key) · bass walking "standard" (BASS_STD, own key) ·
//   bass solo chorus "std-solo" (STD_SOLO, own key) · bass Latin jazz "latin-jazz" (own key) · bass rhythm-changes
//   lines (uptempo / bebop odd options, rhythm-solo: moved to the spec key) · guitar comping "comp-std" and chord-scale
//   lines "chord-scale" (written key + spec key).
import { referenceOf, type RecKey, type StandardRef } from '../../content/references';
import { STANDARD_CHANGES } from '../standards';
import { BASS_STD } from './bass';
import { STD_SOLO } from './bassNiche';
import { JAZZ_STANDARDS } from './guitarJazz';
import { CORE2_STANDARDS } from './guitarCore2';
import type { DrillSpec } from './types';

type SpecLike = Pick<DrillSpec, 'family' | 'kind' | 'option'>;
const at = <T,>(xs: T[], i: number): T | undefined => (xs.length ? xs[((i % xs.length) + xs.length) % xs.length] : undefined);
const pcMod = (n: number) => ((n % 12) + 12) % 12;

/** How the drill's key relates to the standard: 'own' = the tune's key always; 'shift' = written key + spec key; 'abs' = the spec key is the tonic. */
type KeyMode = 'own' | 'shift' | 'abs';

function resolve(s: SpecLike): { id: string; mode: KeyMode } | null {
  const fam = String(s.family);
  const op = s.option ?? 0;
  const m = /^chart~std:([^~]+)~/.exec(s.kind);
  if (m) return { id: m[1], mode: 'shift' };
  if (fam === 'b-walk' && s.kind === 'standard') return at(BASS_STD, op) ? { id: at(BASS_STD, op)!.id, mode: 'own' } : null;
  if (fam.startsWith('b-')) {
    if (s.kind === 'std-solo') return at(STD_SOLO, op) ? { id: at(STD_SOLO, op)!.id, mode: 'own' } : null;
    if (s.kind === 'latin-jazz') return { id: op % 2 ? 'song-father' : 'blue-bossa', mode: 'own' };
    if (s.kind === 'rhythm-solo' || ((s.kind === 'uptempo' || s.kind === 'bebop') && op % 2)) return { id: 'rhythm-a', mode: 'abs' };
  }
  if (fam === 'g-jazz' && s.kind === 'comp-std') {
    const ids = JAZZ_STANDARDS.filter((id) => STANDARD_CHANGES.some((x) => x.id === id));
    const id = at(ids, Math.floor(op / 2));
    return id ? { id, mode: 'shift' } : null;
  }
  if (fam === 'g-impro' && s.kind === 'chord-scale') {
    const id = at(CORE2_STANDARDS, op);
    return id ? { id, mode: 'shift' } : null;
  }
  return null;
}

/** The standards.ts id a drill spec practises, or null. */
export function standardIdOfSpec(s: SpecLike): string | null {
  return resolve(s)?.id ?? null;
}

/** The reference and the key this drill is practised in. */
export function standardOfSpec(s: SpecLike & Pick<DrillSpec, 'key'>): { ref: StandardRef; key: RecKey } | null {
  const r = resolve(s);
  const ref = referenceOf(r?.id);
  if (!r || !ref) return null;
  if (r.mode === 'own') return { ref, key: ref.appKey };
  if (r.mode === 'abs') return { ref, key: { ...ref.appKey, pc: pcMod(s.key ?? ref.appKey.pc) } };
  return { ref, key: { ...ref.appKey, pc: pcMod(ref.appKey.pc + (s.key ?? 0)) } };
}
