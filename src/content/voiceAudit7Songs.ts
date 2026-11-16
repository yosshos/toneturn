// AUDIT-7 #2 (docs/research/AUDIT-7-GAPS.md §7): the singer's first blues head. A riff blues in the oldest blues form
// (AAB: the riff, the same riff over the IV chord, an answer), so the first jazz head a singer meets is short, repeats,
// and sits in a fifth. Written for The 7th Sense (2026-11-16); it quotes no existing head. Notation as
// src/content/voiceSongs.ts (scale degrees of the key, charts in C).

import type { VoiceSong } from './voiceSongs';

const OWN = { en: 'Written for The 7th Sense', he: 'נכתב עבור החוש השביעי' };

export const AUDIT7_SONGS: VoiceSong[] = [
  {
    id: 'riff-blues',
    title: { en: 'Riff Blues', he: 'בלוז ריף' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '5 5 3b 1 | 4h 3b 1 | rh 5 3b | 1w | 5 5 3b 1 | 4h 3b 1 | rh 5 3b | 1w | 2 2 7, 5, | 4 4 3b 1 | rh 5 3b | 1w',
    chart: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | C7',
    phrases: [4, 8],
    level: 2,
    style: 'swing',
    bpm: 92,
    form: { en: '12-bar blues, AAB', he: 'בלוז של 12 תיבות, AAB' },
  },
];
