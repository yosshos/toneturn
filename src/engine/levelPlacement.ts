// Where each technique and vocal level sits on its course path (AUDIT-6, Stage A, 2026-11-15). Pure data + formulas.
//
// ONE MECHANISM, three sources, in this order of precedence (path.ts `ladderSteps` reads `placeLevel`):
//   1. LEVEL_PLACEMENT — an explicit rating per level id, curated against a graded syllabus. Every entry cites its
//      grade; `G(grade)` is the guitar formula used for every instrument (RSL / ABRSM / Trinity grade → rating):
//          Debut/Initial 700 · G1 790 · G2 880 · G3 970 · G4 1060 · G5 1150 · G6 1240 · G7 1330 · G8 1420 · beyond 1510+
//      The tables of each instrument are below; other work streams plug theirs in by adding one spread to
//      PLACEMENT_TABLES (see "How to plug in").
//   2. Vocal levels without an entry: their items' own ratings (`voiceItemRating`), so a level is placed by what it
//      asks, not by its index in the family. A family stays monotone on the path (`monotoneFamily`).
//   3. Otherwise the old index placement (700 + 70 · (index + later), path.ts), with a small per-family stagger for the
//      drums (DRUM_STAGGER) so their families no longer share the same 70-point rungs.
//
// How to plug in (Stage B / C and later): export a `Record<levelId, number>` from your own module (ratings from G(),
// with a comment per entry citing the grade), import it here and add it to PLACEMENT_TABLES. Vocal levels use the key
// `vocal:<ref>`. A later table wins over an earlier one. If an entry makes a family's level numbers go down on the path,
// add the family to NON_MONOTONE_FAMILIES (path.ts) — the path follows difficulty, never the number.
// Keep every rating ≤ PATH_CAP (1900); tests/pathShape.test.ts checks gaps, density and the known misplacements.

/** RSL / ABRSM / Trinity grade (0 = Debut / Initial … 8; 9+ = beyond grade 8) → path rating: the guitar formula. */
import { FIRST_STEPS_DIFF } from './drills/firstStepsDiff';

export const G = (grade: number): number => Math.round(700 + 90 * grade);

/**
 * STAGE C (AUDIT-6 GA-4): a guitar grade's base rating — G(grade) to grade 8, then the diploma grades a hundred apart
 * from 1590 so their top rank (+ 8 · 10, path.ts guitarPathDifficulty) stays under PATH_CAP: grade 9 ≈ 1590–1670,
 * 10 ≈ 1690–1770, 11 ≈ 1790–1870. A curated LEVEL_PLACEMENT entry still overrides a guitar level's grade.
 */
export const guitarGradeBase = (grade: number): number => (grade <= 8 ? G(grade) : 1590 + 100 * (Math.min(11, grade) - 9));

import { DRUM_TOP_PLACEMENT, VOICE_TOP_PLACEMENT } from './stageCPlacement';
import { AUDIT7_PLACEMENT } from './audit7Placement';
import { AUDIT7_INSTRUMENT_PLACEMENT, AUDIT7_VOICE_PLACEMENT } from './audit7PlacementB';
import { GIG_PLACEMENT } from './gigPlacement';
import { TPAIR_PLACEMENT } from './tpairPlacement';

// ---------------------------------------------------------------- keys (AUDIT-6-LEVELS-INSTRUMENTS §1.5 pri 1)

export const KEYS_PLACEMENT: Record<string, number> = {
  // RSL keys G2 / ABRSM G2–G3: the chromatic scale, one octave.
  'scales-7': 900,
  // RSL keys G1–G2: C / G major pentatonic (after hands together, 840).
  'scales-28': G(2), // 880
  // RSL keys G3: C blues.
  'scales-29': G(3) - 10, // 960
  // RSL keys G1–G2: A Dorian — each hand, then hands together (a grade later). The other modes keep the owner's
  // AUDIT-SCALES order after the jazz scales; Mixolydian moves to G6 with Dorian's hands-together level ahead of it.
  'scales-19': 1000,
  'scales-20': G(4), // 1060
  'scales-21': G(6), // 1240
  // Melodic and natural minor, each hand (two octaves): the step before minor hands together (scales-6, 1050) — it
  // sat at 1680, after scales-6 / scales-18 had taught the same.
  'scales-15': 1020,
  // Minor triads in inversions, each hand: right after the major inversions (arpeggios-2, 840), not at 1330.
  // Curriculum flow (Instruments audit K7): after the major and minor triads hands together (arpeggios-3, 910), so minor
  // triads are played in root position before their inversions.
  'arpeggios-9': 930,
  // Minor broken and blocked chords: with the broken chords through the inversions (arpeggios-8, 1260).
  'arpeggios-14': 1300,
  // RCM G2–G3 pieces: direct and legato pedal (the only pedal level sat at 1400).
  'control-10': 940,
  // ABRSM / RSL Initial–G1: sight-reading five-finger melodies (sat at 1470).
  'control-11': 780,
  // ABRSM G3: wider range, mixed rhythms, hands together.
  'control-12': 1000,
  // MEASUREMENT-AUDIT §7 (dynamics as shapes): ABRSM / Trinity ask for a crescendo / diminuendo through a scale from
  // G3–G4; contrary motion with dynamics G4; the chromatic scale with dynamics G5; p at speed in 16ths G6.
  'control-13': G(4), // 1060: diminuendo up, crescendo down (against the scale's pull)
  'control-14': 1100, // contrary motion: louder out, softer in
  'control-15': G(5), // 1150: chromatic with dynamics (cresc / terraced)
  'control-16': G(6), // 1240: soft at speed (p, pp in 16ths)
  // Theory G2–G5: plagal and deceptive cadences before the Neapolitan and augmented 6th (G7–G8).
  'cadences-6': 1050,
  'cadences-5': G(7), // 1330
  // ABRSM G5–G6: 3 against 2 and 4 against 3 (the same content as advanced-2, 1190) — not at 980.
  'k-rhythm-2': 1150,
  // A performed first improvisation over a blues with a click (Jazz beginner band, AUDIT-6 J-W2): play one / rest
  // one, then two / two, then the hands answering — RSL I&I G1–G3; the family no longer jumps 900 → 1150.
  'k-impro-4': 950,
  'k-impro-5': 1000,
  'k-impro-6': 1080,
  'k-impro-7': 1120,
  // TECHNIQUE-COVERAGE-AUDIT §4.6. Hanon Part I in all 12 keys, hands together in 16ths at up to ♩ = 80: ABRSM / Trinity
  // G6–G7 study speed, after Hanon No. 1 in 16ths (fingers-6); the notes' difficulty agrees (encore model ~1270–1320).
  'fingers-15': G(6), // 1240
  'fingers-16': G(6) + 30, // 1270
  'fingers-17': G(6) + 60, // 1300
  'fingers-18': G(7), // 1330
  // Contrary-motion minor, dominant and diminished 7th arpeggios: ABRSM G5; 7ths at 4 octaves hands together: ABRSM G6.
  'arpeggios-15': G(5), // 1150
  'arpeggios-16': G(6), // 1240
};

// ---------------------------------------------------------------- bass (§3.5 pri 2)

export const BASS_PLACEMENT: Record<string, number> = {
  // The titles say the grade: rock study Grades 1–3, funk and slap 4–6, jazz upper register 6–8.
  'b-styles-15': 930, // G2–G3
  'b-styles-16': 1250, // G5–G6 (after slap 1–3, 1120–1260)
  'b-styles-17': G(8), // 1420
  // RSL G5–G6 funk stylistic study (sat at 1436).
  'b-styles-10': 1200,
  // The five pentatonic positions one by one (sat at 1470) before linking them (b-scale-5, 1120).
  'b-scale-10': 1085,
  // Friedland: the jazz waltz is intermediate walking — after rhythm changes (b-walk-10, 1342); a blues-waltz chorus
  // after up-tempo walking (b-walk-12, 1454).
  'b-walk-19': 1350,
  'b-walk-20': 1480,
  // 3–7 shells (root, 7th and 10th) before 10ths and shells as double stops (b-ext-6, 1680).
  'b-ext-9': 1650,
};

// ---------------------------------------------------------------- drums (§4.5 pri 1; RSL Drums 2018)

export const DRUM_PLACEMENT: Record<string, number> = {
  // RSL Debut–G1: paradiddles (ours in 16ths, so G1–G2), the accented paradiddle, then flams (G2).
  'd-diddles-1': 850,
  'd-diddles-2': 900,
  'd-diddles-5': 920, // flams, G2 (sat at 1260)
  'd-diddles-3': G(3) + 30, // 1000: inverted and reverse paradiddles
  'd-diddles-10': G(4), // 1060: the paradiddle around the kit, G4 (sat at 1610)
  'd-diddles-6': 1100, // flam accent, flam tap: G4–G5
  'd-diddles-7': G(5), // 1150: drags, single drag tap (G5)
  'd-diddles-4': 1190, // double paradiddle, paradiddle-diddle (G6 in sextuplets)
  'd-diddles-9': G(6), // 1240: single ratamacue (G6)
  'd-diddles-8': G(7), // 1330: flam paradiddle (G6) and the Swiss army triplet (G8)
  // 7/8 groupings: RSL asks for odd meters first at G6–G8 (sat at 980).
  'd-count-3': G(6) + 60, // 1300
  // Odd meters, prog and fusion: G7–G8 and beyond (d-prog-1 sat at 1120, d-prog-2 at 1190).
  'd-prog-1': G(7), // 1330
  'd-prog-2': G(8), // 1420
  'd-prog-3': 1450,
  'd-prog-4': 1480,
  'd-prog-5': G(9), // 1510
  'd-prog-6': 1540,
  'd-prog-7': 1570, // linear grooves: G8 funk study, linear 32nds
  // d-prog-8 … 11 keep 1610 … 1820.
  // Double pedal: metal material, G7–G8 (sat at 1190–1330).
  'd-feet-6': G(7), // 1330
  'd-feet-7': G(8) - 20, // 1400
  'd-feet-8': 1470,
  // RSL G4–G5: 8-bar whole-kit sight-reading (sat at 1540).
  // Curriculum flow (Voice-Drums audit R10): after d-read 8 (tom fills, 1379) — the unseen 8 bars use 16th kick, ride,
  // tom fills and dynamics, which d-read 5–8 teach; at G5 it came before all of them.
  'd-read-11': 1390,
};

/**
 * Drums: families placed by index share the same rungs (700, 770, 840 …), 11–21 steps on a rung and none between. A
 * teaching-rank stagger (as the guitar's 8 · rank inside a grade) spreads them; < 70 so a family's order never changes.
 */
export const DRUM_STAGGER: Record<string, number> = {
  'd-time': 0, 'd-rock': 7, 'd-jazz': 7, 'd-strokes': 14, 'd-funk': 14, 'd-notation': 21, 'd-indep': 21, 'd-latin': 21,
  'd-ear': 28, 'd-shuffle': 28, 'd-rolls': 35, 'd-form': 35, 'd-fills': 42, 'd-mideast': 42, 'd-read': 49, 'd-count': 56, 'd-song': 56, 'd-feet': 63,
};

// ---------------------------------------------------------------- voice (AUDIT-6-EAR-JAZZ-VOICE V-W1)

/**
 * A vocal level's path rating from its items' mean rating. Item ratings are compressed (a first song ≈ 1000, bebop at
 * 160 ≈ 1575), so the map stretches them over the path: 880 → 700, 1000 → 856, 1475 → 1474, 1650 → 1701.
 */
export const voiceItemRating = (mean: number): number => Math.round(700 + (mean - 880) * 1.3);

/** Vocal levels whose items' rating doesn't say where the syllabus puts them (key `vocal:<ref>`). */
export const VOICE_PLACEMENT: Record<string, number> = {
  // RSL Vocals G1–G3: major and minor arpeggios (items rated 1150–1350, the level sat at 1400).
  'vocal:2001': 980,
  // The first steps (posture, a held note, the glide) open the path before everything, as k-first does on the keys.
  'vocal:2101': 560,
  'vocal:2102': 630,
  'vocal:2103': 700,
};

// ---------------------------------------------------------------- the table

/** Every curated table, merged (a later one wins). Stage B / C: add your exported table here. */
// STAGE C: the drums past 1400 and the voice's top ladder (stageCPlacement.ts); guitar grades 9–11 in guitarGradeBase.
// AUDIT-6 Stage B: the first steps (keys, guitar, bass, drums), riffs by grade, graded sight-reading (firstStepsDiff.ts).
// AUDIT-7: k-read 11–15, k-pop, k-pedal, k-classic, b-riff, b-feel, d-fills 9 and the d-pas re-placements (audit7Placement.ts); voice first steps, jazz entry, improvising, pop style, guitar/bass jazz entry (audit7PlacementB.ts).
// AUDIT-DEPTH-3 #11, #12, C8: on the bandstand, keys and bass (gigPlacement.ts); guitar by grade.
const PLACEMENT_TABLES: Record<string, number>[] = [KEYS_PLACEMENT, BASS_PLACEMENT, DRUM_PLACEMENT, VOICE_PLACEMENT, FIRST_STEPS_DIFF, DRUM_TOP_PLACEMENT, VOICE_TOP_PLACEMENT, AUDIT7_PLACEMENT, AUDIT7_VOICE_PLACEMENT, AUDIT7_INSTRUMENT_PLACEMENT, GIG_PLACEMENT, TPAIR_PLACEMENT];
export const LEVEL_PLACEMENT: Record<string, number> = Object.assign({}, ...PLACEMENT_TABLES);

/**
 * Keep a family's ratings rising in its teaching order: each level at least `step` above the one before (a vocal level
 * whose items rate a little below its predecessor's still comes after it).
 */
export function monotoneFamily(ds: number[], step = 15): number[] {
  const out: number[] = [];
  for (const d of ds) out.push(out.length ? Math.max(d, out[out.length - 1] + step) : d);
  return out;
}
