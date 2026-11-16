// AUDIT-7 (docs/research/AUDIT-7-GAPS.md #2, #8, #9): path ratings of the new levels, plugged into levelPlacement's
// PLACEMENT_TABLES. Ratings from the grade formula G(grade) = 700 + 90 · grade (RSL / ABRSM / Trinity grade → rating).
// Pure data.

const G = (grade: number): number => Math.round(700 + 90 * grade);

/** The voice's new levels (key `vocal:<ref>`). */
export const AUDIT7_VOICE_PLACEMENT: Record<string, number> = {
  // v-first 4–7 (#8): RSL Vocals Debut–G1 — match a played note, sing back a two-bar rhythm on "da" (RSL ear test 2),
  // echo five notes, a four-bar song with the band. The family keeps opening the path before everything.
  'vocal:2104': 740,
  'vocal:2105': 780,
  'vocal:2106': G(1) + 30, // 820
  'vocal:2107': G(2) - 10, // 870
  // v-jazz1 (#2): the singer's jazz entry — scat calls (one bar), a blues head (the first phrase, then all of it),
  // guide tones on a blues. ABRSM Jazz G1–G3 / Aebersold Vol. 1 order: the blues by ear, the head, guide tones.
  'vocal:2301': G(2) - 10, // 870
  'vocal:2302': G(2) + 40, // 920
  'vocal:2303': G(3) - 10, // 960
  'vocal:2304': G(3) + 20, // 990
  // v-impro (#8): improvising outside jazz from ~900 (RSL Vocals G1–G3 improvisation option, Trinity "Improvising"):
  // call and response, answer phrases on I–IV–V, the major pentatonic, the minor pentatonic over a rock groove.
  'vocal:2311': 900,
  'vocal:2312': 1000,
  'vocal:2313': 1100,
  'vocal:2314': 1250,
  // v-pop (#9): pop and musical-theatre style at RSL Vocals G5–G7 (1150–1400): mix-voice basics, belt-safe range work,
  // riffs-lite, pop phrasing, theatre phrasing.
  'vocal:2321': G(5), // 1150
  'vocal:2322': G(5) + 70, // 1220
  'vocal:2323': G(6) + 60, // 1300
  'vocal:2324': G(7) + 20, // 1350
  'vocal:2325': G(7) + 70, // 1400
};

/** The jazz entry on guitar and bass (#2): g-jblues 1–4 and b-walk 21, all 12 keys. */
export const AUDIT7_INSTRUMENT_PLACEMENT: Record<string, number> = {
  // Guitar (ABRSM Jazz G1–G3, RSL G1–G3 grades): a blues head, shells four to the bar, guide tones, comping rhythms.
  'g-jblues-1': G(1) + 50, // 840
  'g-jblues-2': G(2), // 880
  'g-jblues-3': G(2) + 50, // 930
  'g-jblues-4': G(3), // 970
  // Bass: after roots and 5ths (b-walk 1–2) and the arpeggio walk (b-walk 3, 952): the first real walking line over a
  // blues — chord tones on 1–3 and a half step into each change on 4.
  'b-walk-21': 985,
};
