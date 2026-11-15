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

/** The grade formula (levelPlacement.ts G): Debut / Initial 700, +90 a grade. Local, so this file stays import-free. */
const G = (grade: number): number => Math.round(700 + 90 * grade);

/**
 * Path rating of every new level (and the staggered bass / drum openers), plugged into levelPlacement.ts
 * PLACEMENT_TABLES. Grades: RSL / ABRSM / Trinity (Debut / Initial = 0).
 */
export const FIRST_STEPS_DIFF: Record<string, number> = {
  // k-first: Initial (Faber / Alfred primer) — posture, C position, the thumb, black keys, C/G/F, both hands, clefs.
  'k-first-1': G(0) - 10, // 690: Initial, the very first step (before the five-finger patterns at 700)
  'k-first-2': G(0) + 12, // 712
  'k-first-3': G(0) + 24, // 724
  'k-first-4': G(0) + 36, // 736
  'k-first-5': G(0) + 50, // 750
  'k-first-6': G(0) + 64, // 764
  'k-first-7': G(0) + 78, // 778
  'k-first-8': G(1) + 2, // 792: bass clef reading, Initial–G1
  // A first piece (G1), chord symbols (RSL keys G1), LH root + RH triad (RSL keys G1–G2).
  'k-first-9': G(1) + 40, // 830
  'k-first-10': G(1) + 75, // 865
  'k-first-11': G(2) + 20, // 900
  // k-read: ABRSM sight-reading Initial (five fingers) → G7 (quick study), one level every ~70.
  'k-read-1': G(1) + 10, // 800: Initial–G1
  'k-read-2': G(1) + 70, // 860: G1–G2, 8ths and rests
  'k-read-3': G(2) + 50, // 930: G2–G3, position shifts
  'k-read-4': G(3) + 30, // 1000: G3, hands together over held notes
  'k-read-5': G(4) + 10, // 1070: G4, a moving bass
  'k-read-6': G(4) + 80, // 1140: G4–G5, sharps, flats, accidentals
  'k-read-7': G(5) + 60, // 1210: G5–G6, minor keys
  'k-read-8': G(6) + 40, // 1280: G6, LH chords
  'k-read-9': G(7) + 10, // 1340: G7, RH double notes
  'k-read-10': G(7) + 70, // 1400: G7–G8, quick study with the 30-second look
  // g-first: RSL guitar Debut — tuning, holding, open strings, first notes, changes, strumming, TAB, rhythm reading.
  'g-first-1': G(0), // 700
  'g-first-2': G(0) + 15, // 715
  'g-first-3': G(0) + 30, // 730
  'g-first-4': G(0) + 50, // 750
  'g-first-5': G(0) + 75, // 775
  'g-first-6': G(0) + 88, // 788: Debut, under every grade-1 level (the path keeps grades in order)
  'g-first-7': G(1) + 45, // 835: grade 1, read TAB at tempo (RSL Debut identifies TAB; reading it in time is G1)
  'g-first-8': G(1) + 80, // 870: grade 1, rhythm sight-reading
  // g-riff: RSL group C, one riff per grade: 700 + 90 × grade + 8 (the chords' rank).
  'g-riff-1': G(1) + 8, // 798
  'g-riff-2': G(2) + 8, // 888
  'g-riff-3': G(3) + 8, // 978
  'g-riff-4': G(4) + 8, // 1068
  'g-riff-5': G(5) + 8, // 1158
  // b-first: RSL bass Debut / Hal Leonard Book 1 — hold, tune, alternate, open strings, roots, a riff, TAB, rhythm.
  'b-first-1': G(0), // 700
  'b-first-2': G(0) + 10, // 710
  'b-time-1': G(0) + 18, // 718: Debut, quarters with the click (staggered: the four bass openers all sat at 700)
  'b-first-3': G(0) + 26, // 726
  'b-pluck-1': G(0) + 34, // 734: Debut, rest strokes
  'b-first-4': G(0) + 42, // 742
  'b-first-5': G(0) + 52, // 752
  'b-chord-1': G(0) + 60, // 760: Debut, roots on the beat
  'b-pocket-1': G(0) + 66, // 766: Debut, lock with the kick
  'b-first-6': G(1) + 10, // 800: Debut–G1 riff
  'b-first-7': G(1) + 40, // 830
  'b-first-8': G(1) + 70, // 860
  // d-first: RSL drums Debut — grip, rebound, singles, counting, rock beat, 8th paradiddle (♩70), reading, buzz.
  'd-first-1': G(0), // 700
  'd-first-2': G(0) + 12, // 712
  'd-time-1': G(0) + 22, // 722: Debut, quarters with the click, after grip and rebound
  'd-first-3': G(0) + 30, // 730
  'd-first-4': G(0) + 45, // 745
  'd-first-5': G(0) + 60, // 760
  'd-rock-1': G(0) + 66, // 766: Debut, the 8th-note rock beat after the quarter-hat version
  'd-first-6': G(1) + 10, // 800: Debut 8th paradiddle at ♩70 (Debut ends at the top of its tempo ladder)
  'd-first-7': G(1) + 50, // 840: Debut–G1 snare reading; 2/4, 3/4, 6/8 (Alfred book 1)
  'd-first-8': G(2), // 880: G1–G2, buzz roll (Alfred)
};
