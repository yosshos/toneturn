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
  'harris', 'jazz', 'voicings', 'accomp', 'k-sixdim', 'k-bebop', 'k-reharm', 'k-theory', 'k-vl', 'k-rhythm', 'k-ear', 'k-harrisline', 'k-ctone', 'k-lh', 'k-mediant', 'k-tex', 'k-organ', 'k-comp', 'k-impro', 'k-tpair', 'k-dimcol', 'k-cadlib', 'k-keylick', 'k-keyx',
  // guitar
  'g-arps', 'g-jazz', 'g-theory', 'g-impro', 'g-harris', 'g-vl', 'g-harrisline', 'g-ctone', 'g-color', 'g-tpair', 'g-cadlib',
  // bass (the jazz track)
  'b-barry', 'b-harrisline', 'b-counter', 'b-tpair', 'b-impro', 'b-walk', 'b-swing', 'b-jform', 'b-latin', 'b-std', 'b-cadlib',
  // AUDIT-7 #6: the bass's arpeggio and scale levels (they ran in 4–6 keys). Every key fits the 4-string range: the
  // generators start from the root in E1–D♯2 (bass.ts rootOf) and fold into the neck (fold), tests/audit7.test.ts.
  'b-chord', 'b-scale',
  // 0.97 leftovers: every other key-relative family on the three pitched instruments (technique too: the owner's rule
  // is "every technique and jazz drill"). First steps (k-first, g-first, b-first), the classical pieces (k-classic), the
  // flamenco family (open-string Phrygian shapes on E and A, played with a capo elsewhere) and fingerstyle (patterns over
  // open chords: in a key without open shapes they repeat another key's notes) keep their keys.
  // piano
  'fingers', 'control', 'cadences', 'advanced',
  // guitar
  'g-fretting', 'g-picking', 'g-legato', 'g-chords', 'g-rhythm', 'g-lead', 'g-reading', 'g-ear', 'g-prog', 'g-meter',
  // bass
  'b-pluck', 'b-fret', 'b-length', 'b-time', 'b-pocket', 'b-ghost', 'b-legato', 'b-pick', 'b-read', 'b-styles', 'b-posread', 'b-slap', 'b-ear',
  'b-odd', 'b-prog', 'b-poly', 'b-ext',
  'b-up-arco', 'b-up-pizz', 'b-up-scales', 'b-up-walk', 'b-up-read',
];
/** Single levels of other families that are key-relative jazz material (g-rhythm 6: bossa, Freddie Green, clave). */
export const TWELVE_KEY_LEVELS: string[] = ['g-rhythm-6'];
/**
 * Levels kept in their listed keys on purpose: open strings and natural harmonics (the key is the open string), fixed
 * positions, the open-chord vocabulary, position I reading, the upright's three-octave scales (only E, F, F♯, G reach
 * three octaves under the 24th place), standards (stdKey.ts moves them), and the first taste of a split ladder below.
 */
export const FIXED_KEY_LEVELS: string[] = [
  // piano: polyrhythm in C first (advanced-7 takes the other 11 keys)
  'advanced-2',
  // guitar
  'g-chords-1', 'g-chords-2', 'g-chords-3', 'g-reading-1',
  // positional stretches (the key only picks the fret: more keys repeat the same shapes) and the Mizrahi strum (its
  // open-chord version exists only in the open keys E, A, D, G)
  'g-fretting-6', 'g-rhythm-10',
  // HARMONY-REHARM: the open-string pedal exists only in the keys whose open strings carry it (E, A, D, G)
  'g-color-13', 'g-color-14', 'g-color-15',
  // drop D: the low open D as the pedal, in D and G only
  'g-color-16',
  // bass: open strings, one-string rhythm, natural harmonics
  'b-pluck-1', 'b-pluck-2', 'b-pluck-3', 'b-slap-1', 'b-ear-5', 'b-read-2', 'b-legato-5', 'b-ext-1', 'b-ext-2',
  // positional stretches (above fret 5 the high-register take would fold onto the low one)
  'b-fret-6',
  // upright: positions, open-string bowing, the three-octave scales, standards in their lead-sheet keys, and
  // one-octave scales and arpeggios in G, D, A, F first (b-up-scales-3 takes the other eight keys)
  'b-up-pos-1', 'b-up-pos-2', 'b-up-pos-3', 'b-up-pos-4', 'b-up-pos-5', 'b-up-pos-6', 'b-up-arco-1', 'b-up-arco-5',
  'b-up-scales-1', 'b-up-scales-2', 'b-up-scales-9', 'b-up-scales-10', 'b-up-walk-6',
];

/**
 * Split ladders: a level that continues the same items of earlier levels "in more keys" takes every key those levels
 * don't all have (its listed keys first), so each item of the ladder runs through all 12 keys.
 */
export const CONTINUES_LEVELS: Record<string, string[]> = {
  'advanced-7': ['advanced-2'],
  'b-up-scales-3': ['b-up-scales-1', 'b-up-scales-2'],
};

/** A level widened to all 12 keys when its family (or the level itself) is on the 12-key list. */
export function widenLevel<L extends { id: string; keys: 'major' | 'minor' | number[] }>(family: string, lv: L): L {
  if (!Array.isArray(lv.keys) || lv.keys.length >= 12 || FIXED_KEY_LEVELS.includes(lv.id)) return lv;
  if (!TWELVE_KEY_FAMILIES.includes(family) && !TWELVE_KEY_LEVELS.includes(lv.id)) return lv;
  return { ...lv, keys: all12(lv.keys) };
}
/** Every level of a family list widened (catalogue builders call this on their result). */
export function widenFamilies<F extends { id: string; levels: { id: string; keys: 'major' | 'minor' | number[] }[] }>(fams: F[]): F[] {
  return fams.map((f) => ({
    ...f,
    levels: f.levels.map((l) => {
      const before = CONTINUES_LEVELS[l.id];
      if (!before || !Array.isArray(l.keys)) return widenLevel(f.id, l);
      // Keys every earlier level of the ladder already has (b-up-scales: G, D, A, F): a key one of them lacks stays here.
      const prev = f.levels.filter((x) => before.includes(x.id)).map((x) => (Array.isArray(x.keys) ? x.keys.map(mod12) : []));
      const taken = (k: number) => prev.length > 0 && prev.every((ks) => ks.includes(k));
      return { ...l, keys: all12(l.keys).filter((k) => !taken(k)) };
    }),
  }));
}
