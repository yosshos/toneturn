// Stage B of AUDIT-6 (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md, AUDIT-6-LEVELS-EAR-JAZZ-VOICE.md): where the new
// beginnings sit on the course paths. Pure data with no imports, so path.ts can spread it into KEYS_LEVEL_DIFF without
// an import cycle. Ratings follow the audit's grade formula (700 = Debut / Initial, +90 a grade).
//
//   k-first  1–11  700–900   the first steps at the piano (posture → black keys → C/G/F positions → both clefs → a
//                            first piece → chord symbols: block chords, then LH root + RH triad over I–V–vi–IV)
//   k-read   1–10  800–1400  graded sight-reading: five-finger → shifts → both hands → sharps and flats → chords
//   g-first  1–8   700–870   tuning, holding, open strings, first notes, two-chord changes, strumming, TAB, rhythm
//   g-riff   1–5   798–1158  one original riff per grade, grades 1–5 (RSL group C)
//   b-first  1–8   700–860   holding and the strap, tuning, alternation, open strings, roots, a 2-note riff, TAB, rhythm
//   d-first  1–8   700–880   grip, rebound, singles, counting, a rock beat, the 8th-note paradiddle, 2/4–3/4–6/8, buzz
//
// The four bass families that all opened at 700 (time, pluck, chord, pocket) are staggered between the bass first
// steps; the drums' quarters with the click and the 8th-note rock beat move just past their first-steps versions.

/** Families that are a course's first steps: ✓ once the player plays past them (path.ts FIRST_STEP_FAMILIES). */
export const NEW_FIRST_FAMILIES = ['g-first', 'b-first', 'd-first'];

/** Tie rank on the path (path.ts LADDER_RANK): the first steps before anything else at the same rating. */
export const FIRST_RANK: Record<string, number> = { 'g-first': -1, 'b-first': -1, 'd-first': -1 };

const seq = (fam: string, ratings: number[]): Record<string, number> => Object.fromEntries(ratings.map((r, i) => [`${fam}-${i + 1}`, r]));

/** Path rating of every new level (and the staggered bass / drum openers). */
export const FIRST_STEPS_DIFF: Record<string, number> = {
  ...seq('k-first', [700, 712, 724, 736, 750, 764, 778, 792, 830, 865, 900]),
  ...seq('k-read', [800, 860, 930, 1000, 1070, 1140, 1210, 1280, 1340, 1400]),
  ...seq('g-first', [700, 715, 730, 750, 775, 800, 835, 870]),
  // One riff level per grade: 700 + 90 × grade + 8 (the chords' rank).
  ...seq('g-riff', [798, 888, 978, 1068, 1158]),
  ...seq('b-first', [700, 710, 726, 742, 752, 800, 830, 860]),
  'b-time-1': 718,
  'b-pluck-1': 734,
  'b-chord-1': 760,
  'b-pocket-1': 766,
  ...seq('d-first', [700, 712, 730, 745, 760, 800, 840, 880]),
  'd-time-1': 722,
  'd-rock-1': 766,
};
