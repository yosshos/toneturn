// The bass placement probe (BASS_CURRICULUM §6): ≈ 2½ minutes of short tempo staircases in the technique level test.
// Each probe places its own family and seeds the families listed in `seeds` at the same level. Families without a
// probe get the inferred start (one below the mean of the probed ones), as for guitar. Pure data (no runtime imports:
// guitar.ts spreads this list at module load).

import type { TechProbe } from './guitar';

export const BASS_PROBES: TechProbe[] = [
  {
    // Task 1: a rock groove, the root on every kick, on a G–C–D chart (time, pocket, roots).
    family: 'b-pocket',
    spec: { family: 'b-pocket', kind: 'kick-chart', key: 7, hands: 'R', option: 1, instrument: 'bass', tempo: 80 },
    title: { en: 'Rock groove: roots on the kick (G–C–D)', he: 'גרוב רוק: יסודות עם הבס-דראם (G–C–D)' },
    instruments: ['bass'],
    seeds: ['b-time', 'b-chord'],
  },
  {
    // Task 2: G major, one octave in 8ths, as fast as it stays clean (scales, fretting hand).
    family: 'b-scale',
    spec: { family: 'b-scale', kind: 'scale', key: 7, hands: 'R', option: 0, instrument: 'bass', tempo: 80 },
    title: { en: 'G major scale, one octave', he: 'סולם סול מז׳ור, אוקטבה אחת' },
    instruments: ['bass'],
    seeds: ['b-fret', 'b-read'],
  },
  {
    // Task 3: 16ths on one note (plucking evenness and stamina).
    family: 'b-pluck',
    spec: { family: 'b-pluck', kind: 'accent16', key: 4, hands: 'R', option: 0, perBeat: 4, instrument: 'bass', tempo: 70 },
    title: { en: '16ths on one note', he: 'שש-עשריות על צליל אחד' },
    instruments: ['bass'],
    seeds: ['b-length'],
  },
  {
    // Task 4: walking over Dm7–G7–Cmaj7 (chord tones on 1–3, a chromatic approach on 4).
    family: 'b-walk',
    spec: { family: 'b-walk', kind: 'chrom', key: 0, hands: 'R', perBeat: 1, instrument: 'bass', tempo: 100 },
    title: { en: 'Walking: Dm7 – G7 – Cmaj7', he: 'ווקינג: Dm7 – G7 – Cmaj7' },
    instruments: ['bass'],
  },
];
