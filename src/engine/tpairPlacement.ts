// Triad pairs, deep (owner 2026-11-16): where every new level sits on its course path — plugged into levelPlacement's
// PLACEMENT_TABLES. Triad pairs are advanced material (RSL / Trinity grade 7–8 and beyond, ABRSM jazz grade 5): the
// whole curriculum lives between ~1350 and ~1850, patterns first, voicings interleaved, lines over changes and the
// advanced side-slip / symmetric pairs last. The level rows in drills/tpairDrills.ts read their ratings from here.
// Pure data (no engine imports: levelPlacement is read by the path, which the drill catalogues import).

export const TPAIR_PLACEMENT: Record<string, number> = {
  // keys (k-tpair): patterns 1350–1580, voicings 1420–1700, lines over changes 1600–1800, advanced 1760–1840
  'k-tpair-1': 1350, // root position
  'k-tpair-2': 1400, // the other permutations
  'k-tpair-3': 1420, // close triads over the shell
  'k-tpair-4': 1450, // alternating inversions
  'k-tpair-5': 1500, // intervallic cells
  'k-tpair-6': 1540, // the hexatonic scale, 2–3 octaves
  'k-tpair-7': 1560, // spread across two hands
  'k-tpair-8': 1580, // triplets, 3 over 4
  'k-tpair-9': 1600, // over a vamp with the band
  'k-tpair-10': 1640, // block chords
  'k-tpair-11': 1660, // ii–V–I, major and minor
  'k-tpair-12': 1700, // comping a chart
  'k-tpair-13': 1740, // a jazz blues
  'k-tpair-14': 1760, // side-slip (advanced)
  'k-tpair-15': 1800, // an 8-bar form
  'k-tpair-16': 1840, // symmetric pairs (advanced)
  // guitar (g-tpair): grades 7–10
  'g-tpair-1': 1380,
  'g-tpair-2': 1420,
  'g-tpair-3': 1480,
  'g-tpair-4': 1540,
  'g-tpair-5': 1650,
  'g-tpair-6': 1700,
  'g-tpair-7': 1780,
  // bass (b-tpair, the jazz track)
  'b-tpair-1': 1400,
  'b-tpair-2': 1460,
  'b-tpair-3': 1580,
  'b-tpair-4': 1640, // a jazz blues
  'b-tpair-5': 1720, // side-slip (advanced)
};
