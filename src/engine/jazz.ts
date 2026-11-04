// Jazz track: seventh-chord colours and the ii–V–I family, voiced like a pianist's shells
// (root in the bass; 3rd, 7th and a colour tone above, moving smoothly).

export type SeventhQuality = 'maj7' | '7' | 'm7' | 'm7b5';
export const SEVENTHS: SeventhQuality[] = ['maj7', '7', 'm7', 'm7b5'];

/** Upper-structure intervals above the root (3rd, 7th, colour). */
const UPPER: Record<SeventhQuality, number[]> = {
  maj7: [4, 11, 14], // 3, 7, 9
  '7': [4, 10, 14], // 3, ♭7, 9
  m7: [3, 10, 14], // ♭3, ♭7, 9
  m7b5: [3, 6, 10], // ♭3, ♭5, ♭7
};

export function jazzVoicing(rootPc: number, q: SeventhQuality, prev?: number[]): number[] {
  const bass = 36 + (((rootPc % 12) + 12) % 12);
  const center = prev && prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 62;
  const upper = UPPER[q].map((i) => {
    const p = (((rootPc + i) % 12) + 12) % 12;
    let best = 52 + ((((p - 52) % 12) + 12) % 12);
    for (let m = best; m <= 74; m += 12) if (Math.abs(m - center) < Math.abs(best - center)) best = m;
    return best;
  });
  return [bass, ...upper.sort((a, b) => a - b)];
}

/** A chord in a progression: root as semitones above the key's tonic. */
export interface JazzChord {
  root: number;
  q: SeventhQuality;
}

export type ProgressionId = 'ii-V-I' | 'V-I' | 'I-vi-ii-V' | 'iii-vi-ii-V';
export const PROGRESSIONS: Record<ProgressionId, JazzChord[]> = {
  'ii-V-I': [
    { root: 2, q: 'm7' },
    { root: 7, q: '7' },
    { root: 0, q: 'maj7' },
  ],
  'V-I': [
    { root: 7, q: '7' },
    { root: 0, q: 'maj7' },
  ],
  'I-vi-ii-V': [
    { root: 0, q: 'maj7' },
    { root: 9, q: 'm7' },
    { root: 2, q: 'm7' },
    { root: 7, q: '7' },
  ],
  'iii-vi-ii-V': [
    { root: 4, q: 'm7' },
    { root: 9, q: 'm7' },
    { root: 2, q: 'm7' },
    { root: 7, q: '7' },
  ],
};

/** Voice a whole progression with smooth voice leading. */
export function voiceProgression(tonicPc: number, chords: JazzChord[]): number[][] {
  let prev: number[] | undefined;
  return chords.map((c) => {
    const v = jazzVoicing(tonicPc + c.root, c.q, prev);
    prev = v.slice(1);
    return v;
  });
}
