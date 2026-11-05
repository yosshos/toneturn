// Pure pitch / naming utilities. No browser APIs.

export type Lang = 'he' | 'en';
export type Naming = 'letter' | 'solfege';

/** Spelled pitch class: letter + accidental (-2..2). Spelling matters for display. */
export interface PitchClass {
  letter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  acc: -2 | -1 | 0 | 1 | 2;
}

const LETTER_PC: Record<PitchClass['letter'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS: PitchClass['letter'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const pcValue = (p: PitchClass): number => (((LETTER_PC[p.letter] + p.acc) % 12) + 12) % 12;

export const midiToHz = (midi: number, a4 = 440): number => a4 * Math.pow(2, (midi - 69) / 12);
export const hzToMidi = (hz: number, a4 = 440): number => 69 + 12 * Math.log2(hz / a4);
/** Signed cents difference: 1200 × log2(measured / target). */
export const centsOff = (measuredHz: number, targetHz: number): number => 1200 * Math.log2(measuredHz / targetHz);

export function pc(name: string): PitchClass {
  const m = /^([A-G])(bb|b|##|#|♭|♯)?$/.exec(name.trim());
  if (!m) throw new Error(`Bad pitch class: ${name}`);
  const accMap: Record<string, PitchClass['acc']> = { '': 0, b: -1, '♭': -1, bb: -2, '#': 1, '♯': 1, '##': 2 };
  return { letter: m[1] as PitchClass['letter'], acc: accMap[m[2] ?? ''] };
}

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

/** Spelled major scale starting from a tonic (7 notes, correct letters). */
export function majorScale(tonic: PitchClass): PitchClass[] {
  const start = LETTERS.indexOf(tonic.letter);
  const tonicPc = pcValue(tonic);
  return MAJOR_STEPS.map((step, i) => {
    const letter = LETTERS[(start + i) % 7];
    const target = (tonicPc + step) % 12;
    let acc = target - LETTER_PC[letter];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    return { letter, acc: acc as PitchClass['acc'] };
  });
}

/** Degree (1-based) of a pitch class within a major key, or null if not diatonic. */
export function degreeInMajor(tonic: PitchClass, note: PitchClass): number | null {
  const scale = majorScale(tonic);
  const i = scale.findIndex((s) => s.letter === note.letter && s.acc === note.acc);
  return i < 0 ? null : i + 1;
}

const SOLFEGE: Record<PitchClass['letter'], { en: string; he: string }> = {
  C: { en: 'Do', he: 'דו' },
  D: { en: 'Re', he: 'רה' },
  E: { en: 'Mi', he: 'מי' },
  F: { en: 'Fa', he: 'פה' },
  G: { en: 'Sol', he: 'סול' },
  A: { en: 'La', he: 'לה' },
  B: { en: 'Si', he: 'סי' },
};
const LETTER_HE: Record<PitchClass['letter'], string> = {
  C: 'סי', D: 'די', E: 'אי', F: 'אף', G: "ג'י", A: 'איי', B: 'בי',
};
const ACC_SYMBOL: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** Compact visual label, e.g. "B♭" or "Si♭". */
export function displayNote(p: PitchClass, naming: Naming, lang: Lang = 'en'): string {
  const base = naming === 'letter' ? p.letter : SOLFEGE[p.letter][lang];
  return base + ACC_SYMBOL[p.acc];
}

/** Text meant for speech synthesis, e.g. "B flat", "Si flat", "בי פלאט", "סי במול". */
export function spokenNote(p: PitchClass, naming: Naming, lang: Lang): string {
  if (lang === 'en') {
    const base = naming === 'letter' ? p.letter : SOLFEGE[p.letter].en;
    const acc = { [-2]: ' double flat', [-1]: ' flat', 0: '', 1: ' sharp', 2: ' double sharp' }[p.acc];
    return base + acc;
  }
  // Hebrew always uses דיאז / במול, also with letter names.
  const acc = { [-2]: ' דאבל במול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דאבל דיאז' }[p.acc];
  return (naming === 'letter' ? LETTER_HE[p.letter] : SOLFEGE[p.letter].he) + acc;
}

export function spokenMajorKey(tonic: PitchClass, naming: Naming, lang: Lang): string {
  return spokenNote(tonic, naming, lang) + (lang === 'en' ? ' major' : ' מז׳ור');
}

// ---------- Chords & voicing ----------

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'dom7';
const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  dom7: [0, 4, 7, 10],
};

/**
 * Voice a chord: bass note in [36, 47] (C2–B2), upper voices placed in
 * [55, 72] (G3–C5) as close as possible to `prev` for smooth voice leading.
 */
export function voiceChord(rootPc: number, quality: ChordQuality, prev?: number[]): number[] {
  const bass = 36 + ((rootPc % 12) + 12) % 12;
  const tones = QUALITY_INTERVALS[quality].map((i) => (rootPc + i) % 12);
  // Upper structure: for triads use all three tones, for 7ths drop the fifth.
  const upperPcs = quality === 'dom7' ? [tones[0], tones[1], tones[3]] : tones;
  const center = prev && prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 64;
  const upper = upperPcs.map((p) => {
    let best = 55 + ((p - 55) % 12 + 12) % 12;
    for (let m = best; m <= 72; m += 12) if (Math.abs(m - center) < Math.abs(best - center)) best = m;
    return best;
  });
  upper.sort((a, b) => a - b);
  return [bass, ...upper];
}

/** I – IV – V7 – I cadence that establishes a major key. */
export function majorCadence(tonic: PitchClass): number[][] {
  const t = pcValue(tonic);
  const I = voiceChord(t, 'maj');
  const IV = voiceChord(t + 5, 'maj', I.slice(1));
  const V = voiceChord(t + 7, 'dom7', IV.slice(1));
  const I2 = voiceChord(t, 'maj', V.slice(1));
  return [I, IV, V, I2];
}
