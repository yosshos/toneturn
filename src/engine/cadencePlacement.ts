// The jazz cadence chart library (drills/cadenceLibrary.ts): where each level sits on its course path — plugged into
// levelPlacement's PLACEMENT_TABLES. The library is jazz-voicing work: the piano's shells and guide tones start with the
// key-change levels (~1250, after the voicing family's shells and rootless levels), drop 2 / drop 3, four-way close and
// two hands follow up to ~1850; the bass walks the ii–V family from ~1150. The guitar levels sit by their grade.
// Pure data (no engine imports: levelPlacement is read by the path, which the drill catalogues import).

export const CADENCE_PLACEMENT: Record<string, number> = {
  // keys (k-cadlib)
  'k-cadlib-1': 1250, // shells · ii–V family
  'k-cadlib-2': 1280, // guide tones · ii–V family
  'k-cadlib-3': 1330, // shells · substitutes
  'k-cadlib-4': 1360, // guide tones · substitutes
  'k-cadlib-5': 1400, // shells and guide tones · longer progressions
  'k-cadlib-6': 1440, // rootless · ii–V family
  'k-cadlib-7': 1460, // walking left hand · ii–V family
  'k-cadlib-8': 1490, // rootless · substitutes
  'k-cadlib-9': 1530, // rootless · longer
  'k-cadlib-10': 1560, // drop 2 · ii–V family
  'k-cadlib-11': 1580, // stride with tenths · ii–V family
  'k-cadlib-12': 1600, // drop 2 · substitutes
  'k-cadlib-13': 1620, // walking left hand · substitutes
  'k-cadlib-14': 1630, // drop 3 · ii–V family
  'k-cadlib-15': 1660, // drop 3 · substitutes
  'k-cadlib-16': 1700, // drop 2 and drop 3 · longer
  'k-cadlib-17': 1720, // four-way close · ii–V family
  'k-cadlib-18': 1750, // four-way close · substitutes
  'k-cadlib-19': 1760, // walking left hand and stride · longer
  'k-cadlib-20': 1770, // two hands · ii–V family
  'k-cadlib-21': 1800, // two hands · substitutes
  'k-cadlib-22': 1840, // four-way close and two hands · longer
  // bass (b-cadlib, the jazz track)
  'b-cadlib-1': 1150, // approach notes · ii–V family
  'b-cadlib-2': 1250, // approach notes · substitutes
  'b-cadlib-3': 1300, // free walking · ii–V family
  'b-cadlib-4': 1330, // approach notes · longer
  'b-cadlib-5': 1400, // free walking · substitutes
  'b-cadlib-6': 1480, // free walking · longer, and the dominant pedal
};
