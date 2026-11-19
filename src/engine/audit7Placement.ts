// AUDIT-7 (docs/research/AUDIT-7-GAPS.md §10, holes #4, #6, #7, #10, #11, #12, #15): where the new and moved levels sit
// on their course paths. Pure data, no imports (levelPlacement.ts merges this table last, so it wins). Ratings use the
// grade formula G(grade) = 700 + 90 · grade (levelPlacement.G): Debut / Initial 700 · G1 790 · … · G8 1420.
// The guitar's new scale levels (g-scales 13–15) are placed by their grade in guitarMeta.ts (5, 6, 7), not here.

const G = (grade: number): number => Math.round(700 + 90 * grade);

export const AUDIT7_PLACEMENT: Record<string, number> = {
  // #4 keys sight-reading past 1400: ABRSM G8 reading (four voices, ornaments, changing metres), RSL G8 lead sheet and
  // quick study, and the diploma-level quick study.
  'k-read-11': G(8) + 30, // 1450: four voices (ABRSM G8 sight-reading: chordal textures)
  'k-read-12': G(8) + 100, // 1520: written-out ornaments (Baroque reading, G8)
  'k-read-13': G(9) + 90, // 1600: changing metres (G8 and beyond)
  'k-read-14': G(10) + 100, // 1700: a lead sheet with band hits (RSL G8 quick study, the session reader)
  'k-read-15': G(11) + 110, // 1800: the quick study, any key, a 30-second look
  // #10 pop accompaniment (RSL keys G2–G6: chord charts, styles) and pedalling (RCM G3–G7 pieces).
  'k-pop-1': G(2) + 50, // 930: block chords in the pop rhythm (G2)
  'k-pop-2': G(3) + 30, // 1000: broken patterns (G3)
  'k-pop-3': G(4), // 1060: the pop ballad (G4)
  'k-pop-4': G(4) + 60, // 1120: rock (G4–G5)
  'k-pop-5': G(5) + 30, // 1180: reggae (G5)
  'k-pop-6': G(6) + 10, // 1250: a lead sheet, tune and accompaniment (G6)
  'k-pedal-1': G(3) + 50, // 1020: legato pedal through broken chords (after control-10, 940)
  'k-pedal-2': G(5), // 1150: syncopated pedal, with the harmony (G5)
  'k-pedal-3': G(6) + 60, // 1300: half-pedal over a held bass (G6–G7)
  // #11 the public-domain classical tier, one level a piece by its ABRSM grade.
  'k-classic-1': G(1) - 20, // 770: Ode to Joy, the theme (Initial–G1)
  'k-classic-2': G(1) + 40, // 830: Petzold, Minuet in G (G1)
  'k-classic-3': G(2) + 30, // 910: Burgmüller, La Candeur, bars 1–8 (G2)
  'k-classic-4': G(3) + 20, // 990: Beethoven, Für Elise, the opening (G3)
  'k-classic-5': G(4) + 30, // 1090: Clementi, Sonatina Op. 36 No. 1, bars 1–15 (G4)
  'k-classic-6': G(5) + 40, // 1190: Bach, Prelude in C, bars 1–19 (G5)
  'k-classic-7': G(6) + 30, // 1270: Bach, Invention No. 8 in F, bars 1–12 (G6)
  'k-classic-8': G(7) + 30, // 1360: Bach, Invention No. 13 in A minor, bars 1–6 (G7)
  'k-classic-9': G(8) + 30, // 1450: Bach, Prelude in C minor BWV 847, bars 1–8 (G8)
  // #12 drums: the RSL I&I task (develop a groove, a solo break, back) at G4–G5; the triple-stroke roll and the triple
  // paradiddle at G4–G5 (they sat at 1450–1470), the 10- and 11-stroke rolls at G6, a grade after the 5/7/9 (d-rolls 6).
  // Curriculum flow (Voice-Drums audit R10): developing the groove, a solo and coming back after d-fills 8 (your own fill, 1372).
  'd-fills-9': 1380,
  'd-pas-2': G(4) + 40, // 1100: triple-stroke roll
  'd-pas-3': G(4) + 70, // 1130: triple paradiddle (RSL G4–G5)
  'd-pas-4': G(6) + 20, // 1260: 10- and 11-stroke rolls
  // #15 bass riffs by grade (RSL group C: one per grade, + 12 for the riff's rank inside the grade) and the feels.
  'b-riff-1': G(1) + 12, // 802
  'b-riff-2': G(2) + 12, // 892
  'b-riff-3': G(3) + 12, // 982
  'b-riff-4': G(4) + 12, // 1072
  'b-riff-5': G(5) + 12, // 1162
  'b-feel-1': G(6) + 10, // 1250: two-feel (G6)
  'b-feel-2': G(6) + 80, // 1320: half-time (G6–G7)
  'b-feel-3': G(8), // 1420: broken feel (G8)
  'b-feel-4': G(8) + 80, // 1500: the ballad in 2 (G8 and beyond)
  'b-feel-5': G(8) + 140, // 1560: stop-time, then back in two
};
