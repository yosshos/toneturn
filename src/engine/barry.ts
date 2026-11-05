// Barry Harris (spec T), as documented in his workshops and in students' transcriptions:
//  - the diminished chord moves: lower one note → a dominant 7 (on the lowered note); raise one → a minor 6
//    (root = the raised note + a fourth); raise two neighbours → a major 6; lower two neighbours → a major 6;
//  - chords from 6th-diminished scales: m7 → the major 6 a minor third up, m7♭5 → the minor 6 a minor third
//    up, dominant → the minor 6 on the 5th, altered → the minor 6 a half step up, sus → the major 6 a half
//    step down, maj7 → the major 6 on the tonic (or on the 5th);
//  - extra half steps on the dominant scale descending (chord tones land on the downbeats): from a chord
//    tone one half step between 1 and ♭7; from a non-chord tone none; from 3, 5 or 7 three (3–2, 2–1,
//    1–♭7); from 2, 4 or 6 two (2–1, 1–♭7);
//  - pivot: break a line by moving the next note an octave (up or down).
// Sources: "Exploring the Diminished" (Hague workshop transcription, 2003); Josh Walsh, "Half Step Rules for
// Dominant Chords" (jazz-library.com); Jens Larsen on the chromatic scale and pivots; Barry Harris Workshop
// video part 2 (jazzworkshops.com).

export const DIM7 = (root: number) => [root, root + 3, root + 6, root + 9];

export type DimMove = { notes: number[]; dir: 'down' | 'up' };
export type DimResult = { midis: number[]; kind: 'dom7' | 'm6' | 'maj6'; root: number };

/** Move one or two neighbouring notes of a dim7 (indexes into DIM7, ascending) by a half step. */
export function moveDim(root: number, m: DimMove): DimResult {
  const d = DIM7(root);
  const out = d.map((x, i) => (m.notes.includes(i) ? x + (m.dir === 'down' ? -1 : 1) : x));
  if (m.notes.length === 1) {
    const moved = out[m.notes[0]];
    return m.dir === 'down' ? { midis: out, kind: 'dom7', root: moved } : { midis: out, kind: 'm6', root: moved + 5 };
  }
  // Two neighbours: a major 6. Raised (i, i+1): root = raised upper note − 3 … e.g. C dim, raise C and E♭ → A6.
  // Lowered (i, i+1): root = lowered upper note … e.g. C dim, lower C and E♭ → D6 (B D G♭ A).
  const [a, b] = m.notes.slice().sort((x, y) => x - y);
  const upper = out[b];
  const lowerOf = out[a];
  return m.dir === 'up' ? { midis: out, kind: 'maj6', root: lowerOf - 4 } : { midis: out, kind: 'maj6', root: upper };
}

/** Pitch classes of a chord kind on a root (for checking). */
export function chordPcs(kind: DimResult['kind'], root: number): number[] {
  const iv = kind === 'dom7' ? [0, 4, 7, 10] : kind === 'm6' ? [0, 3, 7, 9] : [0, 4, 7, 9];
  return iv.map((x) => (((root + x) % 12) + 12) % 12).sort((a, b) => a - b);
}
export const pcsOf = (midis: number[]) => [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);

/** Barry's 6 chord over a chord (chord-to-scale mapping). Returns [kind, interval of its root above the chord root]. */
export const SIX_OVER: Record<'maj7' | 'm7' | 'm7b5' | '7' | '7alt' | '7sus', { kind: 'maj6' | 'm6'; up: number }> = {
  maj7: { kind: 'maj6', up: 0 },
  m7: { kind: 'maj6', up: 3 },
  m7b5: { kind: 'm6', up: 3 },
  '7': { kind: 'm6', up: 7 },
  '7alt': { kind: 'm6', up: 1 },
  '7sus': { kind: 'maj6', up: 10 },
};

/** The dominant scale (mixolydian) degrees in semitones from the root. */
const DOM = [0, 2, 4, 5, 7, 9, 10];
export type HalfStepRule = 'none' | 'one' | 'two' | 'three';

/** The rule Barry's students list for a starting degree (1–7) — the default line from that note. */
export const ruleFor = (deg: number, extended = false): HalfStepRule => ([1, 3, 5, 7].includes(deg) ? (extended && deg !== 1 ? 'three' : 'one') : extended ? 'two' : 'none');

/**
 * The worksheet lines in full (two bars, ending on the root): from a chord tone or a non-chord tone, the
 * dominant scale descending from `deg` one octave, with the rule's half steps, landing on the root.
 */
export function barryLine(deg: number, rule: HalfStepRule): number[] {
  // Start in the octave above the root and run down an octave past the root to the root an octave lower
  // when the start is above the 5th, like the worksheet's examples.
  const start = deg === 1 ? 12 : DOM[deg - 1] + 12;
  const notes: number[] = [];
  const all = [...DOM.map((s) => s + 12), 24, ...DOM].filter((s) => s <= start).sort((a, b) => b - a);
  const uniq = [...new Set(all)];
  const used = new Set<string>();
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i];
    notes.push(a);
    const b = uniq[i + 1];
    if (b === undefined) break;
    const pcA = ((a % 12) + 12) % 12;
    const pcB = ((b % 12) + 12) % 12;
    const between = a - 1;
    // Each extra half step is used once — on its first occurrence (the worksheets' lines).
    const pair = pcA === 0 && pcB === 10 ? '1-7' : pcA === 2 && pcB === 0 ? '2-1' : pcA === 4 && pcB === 2 ? '3-2' : '';
    const wanted = pair === '1-7' ? rule !== 'none' : pair === '2-1' ? rule === 'two' || rule === 'three' : pair === '3-2' ? rule === 'three' : false;
    if (wanted && !used.has(pair)) {
      used.add(pair);
      notes.push(between);
    }
    if (b === 0) {
      notes.push(0);
      break;
    }
  }
  return notes;
}

/** Positions (0-based, in eighth notes) of the chord tones of a line: Barry's goal is that they fall on downbeats. */
export function chordTonesOnBeats(line: number[]): boolean {
  return line.every((s, i) => {
    const pc = ((s % 12) + 12) % 12;
    const chordTone = [0, 4, 7, 10].includes(pc);
    return i % 2 === 0 ? chordTone || ![2, 5, 9].includes(pc) : true;
  });
}

/** Pivot: the note at `at` moves an octave (direction keeps the line inside the singer's reach). */
export function pivot(line: number[], at: number, dir: 1 | -1): number[] {
  return line.map((s, i) => (i >= at ? s + 12 * dir : s));
}
