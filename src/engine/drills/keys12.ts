// The owner's rule (2026-11-14): every technique and jazz exercise in all 12 keys, on piano, guitar and bass. A level
// that listed a few keys keeps them first, in its order (the first takes and the saved item ids stay the same); the
// keys it lacked follow, up the cycle of 4ths from its last listed key. No imports: catalogues call this at build time.

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A level's keys widened to all 12: the listed keys first, then the missing ones up the cycle of 4ths. */
export function all12(keys: number[]): number[] {
  const out = keys.map(mod12).filter((k, i, a) => a.indexOf(k) === i);
  let k = out.length ? out[out.length - 1] : 0;
  for (let i = 0; i < 12 && out.length < 12; i++) {
    k = mod12(k + 5);
    if (!out.includes(k)) out.push(k);
  }
  // A cycle of 4ths from any start visits every key, so the list is complete here.
  return out;
}

/**
 * The families whose material is key-relative (jazz, harmony, bebop lines, voicings, comping, theory you play, the
 * pianist's played ear, pitched rhythm work): every level of them runs through all 12 keys, except FIXED_KEY_LEVELS.
 * Tune-based levels (standards, charts) take the key as an offset from the lead sheet (stdKey.ts).
 */
export const TWELVE_KEY_FAMILIES: string[] = [
  // piano
  'harris', 'jazz', 'voicings', 'accomp', 'k-sixdim', 'k-bebop', 'k-reharm', 'k-theory', 'k-vl', 'k-rhythm', 'k-ear', 'k-harrisline', 'k-ctone', 'k-lh', 'k-mediant', 'k-tex', 'k-organ', 'k-comp', 'k-impro',
  // guitar
  'g-arps', 'g-jazz', 'g-theory', 'g-impro', 'g-harris', 'g-vl', 'g-harrisline', 'g-ctone', 'g-color',
  // bass (the jazz track)
  'b-barry', 'b-harrisline', 'b-counter', 'b-impro', 'b-walk', 'b-swing', 'b-jform', 'b-latin', 'b-std',
  // AUDIT-7 #6: the bass's arpeggio and scale levels (they ran in 4–6 keys). Every key fits the 4-string range: the
  // generators start from the root in E1–D♯2 (bass.ts rootOf) and fold into the neck (fold), tests/audit7.test.ts.
  'b-chord', 'b-scale',
];
/** Single levels of other families that are key-relative jazz material (g-rhythm 6: bossa, Freddie Green, clave). */
export const TWELVE_KEY_LEVELS: string[] = ['g-rhythm-6'];
/** Levels kept in their listed keys on purpose (none in the families above today; first steps etc. are elsewhere). */
export const FIXED_KEY_LEVELS: string[] = [];

/** A level widened to all 12 keys when its family (or the level itself) is on the 12-key list. */
export function widenLevel<L extends { id: string; keys: 'major' | 'minor' | number[] }>(family: string, lv: L): L {
  if (!Array.isArray(lv.keys) || lv.keys.length >= 12 || FIXED_KEY_LEVELS.includes(lv.id)) return lv;
  if (!TWELVE_KEY_FAMILIES.includes(family) && !TWELVE_KEY_LEVELS.includes(lv.id)) return lv;
  return { ...lv, keys: all12(lv.keys) };
}
/** Every level of a family list widened (catalogue builders call this on their result). */
export function widenFamilies<F extends { id: string; levels: { id: string; keys: 'major' | 'minor' | number[] }[] }>(fams: F[]): F[] {
  return fams.map((f) => ({ ...f, levels: f.levels.map((l) => widenLevel(f.id, l)) }));
}
