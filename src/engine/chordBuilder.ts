// Chord and cadence builder (guitar roadmap "Next"; a Tools page of the keys and guitar courses).
//   Chord: pick a root and a quality, or tap notes on the keys / the neck → the chord's name, its notes, how it sounds,
//   and where it sits on both instruments (chordFinder.identifyChord / shapesFor).
//   Cadence: pick a key (major or minor) and a cadence — authentic, plagal, half, deceptive, ii–V–I, backdoor — and get
//   its chords with voicings that move as little as possible (a root in the bass, the upper voices in close position by
//   the nearest move; on the guitar the shape nearest the last one), then play it: each chord is measured by MIDI (the
//   keys held) or by the microphone (the strum recognizer, chordFinder.judgeStrum).
// Pure: no audio, no UI.

import { QUALITY_INTS, type ChordCandidate, type ChordQuality } from './chordRecognize';
import { chordSymbol, shapesFor, type ChordShape } from './chordFinder';

type Bi = { en: string; he: string };
const pc12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;

/** Qualities the builder offers (the recognizer's and the shapes' set; '5' = power chord left out). */
export const BUILD_QUALITIES: ChordQuality[] = ['M', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'sus2', 'sus4', '9', 'add9'];

/** A chord in root position from the root's octave at or above `lo` (default C3 = 48). */
export function buildChord(root: number, quality: ChordQuality, lo = 48): number[] {
  const r = lo + pc12(root - lo);
  // An interval listed after a higher one is the compound one (the 9th of a 9 or add9 chord).
  let top = -1;
  return QUALITY_INTS[quality]
    .map((i) => {
      const x = i <= top ? i + 12 : i;
      top = Math.max(top, x);
      return r + x;
    })
    .sort((a, b) => a - b);
}

// ───────────────────────────── cadences ─────────────────────────────

export type CadenceId = 'authentic' | 'plagal' | 'half' | 'deceptive' | 'two-five-one' | 'backdoor';
export interface CadenceDef {
  id: CadenceId;
  name: Bi;
  /** Roman numerals per mode. */
  roman: { major: string; minor: string };
  /** Chords per mode: [semitones above the tonic, quality]. */
  chords: { major: [number, ChordQuality][]; minor: [number, ChordQuality][] };
  /** One line on what it does. */
  what: Bi;
}

export const CADENCES: CadenceDef[] = [
  {
    id: 'authentic',
    name: { en: 'Authentic', he: 'אותנטית' },
    roman: { major: 'IV – V7 – I', minor: 'iv – V7 – i' },
    chords: { major: [[5, 'M'], [7, '7'], [0, 'M']], minor: [[5, 'm'], [7, '7'], [0, 'm']] },
    what: { en: 'Dominant to tonic: the full stop.', he: 'מהדומיננטה לטוניקה: הנקודה בסוף המשפט.' },
  },
  {
    id: 'plagal',
    name: { en: 'Plagal', he: 'פלגלית' },
    roman: { major: 'I – IV – I', minor: 'i – iv – i' },
    chords: { major: [[0, 'M'], [5, 'M'], [0, 'M']], minor: [[0, 'm'], [5, 'm'], [0, 'm']] },
    what: { en: 'Subdominant to tonic: the "amen".', he: 'מהסובדומיננטה לטוניקה: ה"אמן".' },
  },
  {
    id: 'half',
    name: { en: 'Half', he: 'חצי קדנצה' },
    roman: { major: 'I – ii – V', minor: 'i – iv – V' },
    chords: { major: [[0, 'M'], [2, 'm'], [7, 'M']], minor: [[0, 'm'], [5, 'm'], [7, 'M']] },
    what: { en: 'Ends on the dominant: a comma, not a full stop.', he: 'נגמרת על הדומיננטה: פסיק, לא נקודה.' },
  },
  {
    id: 'deceptive',
    name: { en: 'Deceptive', he: 'מתעתעת' },
    roman: { major: 'ii – V7 – vi', minor: 'iv – V7 – ♭VI' },
    chords: { major: [[2, 'm'], [7, '7'], [9, 'm']], minor: [[5, 'm'], [7, '7'], [8, 'M']] },
    what: { en: 'The dominant goes to vi instead of I: a surprise.', he: 'הדומיננטה הולכת ל-vi במקום ל-I: הפתעה.' },
  },
  {
    id: 'two-five-one',
    name: { en: 'ii–V–I', he: 'ii–V–I' },
    roman: { major: 'ii7 – V7 – Imaj7', minor: 'iiø7 – V7 – i' },
    chords: { major: [[2, 'm7'], [7, '7'], [0, 'maj7']], minor: [[2, 'm7b5'], [7, '7'], [0, 'm']] },
    what: { en: 'The jazz cadence: the 7th of each chord falls a half step to the next 3rd.', he: 'קדנצת הג׳אז: הספטימה של כל אקורד יורדת חצי טון לטרצה של הבא.' },
  },
  {
    id: 'backdoor',
    name: { en: 'Backdoor', he: 'דלת אחורית' },
    roman: { major: 'iv7 – ♭VII7 – Imaj7', minor: 'iv7 – ♭VII7 – i' },
    chords: { major: [[5, 'm7'], [10, '7'], [0, 'maj7']], minor: [[5, 'm7'], [10, '7'], [0, 'm']] },
    what: { en: 'Home through the back door: ♭VII7 instead of V7.', he: 'הביתה בדלת האחורית: ♭VII7 במקום V7.' },
  },
];

export interface CadenceChord {
  chord: ChordCandidate;
  symbol: string;
  /** The bass (the root, C2–B2) and the upper voices (close position), low to high. */
  bass: number;
  upper: number[];
  /** The guitar shape nearest the previous one (null when the chord has none in standard tuning). */
  shape: ChordShape | null;
}

/** Close-position voicings of a chord's pitch classes with the lowest note in [lo, lo + 11]. */
export function closeVoicings(pcs: number[], lo = 55): number[][] {
  const set = [...new Set(pcs.map(pc12))];
  const out: number[][] = [];
  for (let start = lo; start < lo + 12; start++) {
    if (!set.includes(pc12(start))) continue;
    const v = [start];
    for (let k = 1; k < set.length; k++) {
      let m = v[k - 1] + 1;
      while (!set.includes(pc12(m)) || v.some((x) => pc12(x) === pc12(m))) m++;
      v.push(m);
    }
    out.push(v);
  }
  return out;
}

/** How far the voices move (each new voice from the nearest old one, both ways). */
export function voiceMove(a: number[], b: number[]): number {
  const near = (x: number, ys: number[]) => Math.min(...ys.map((y) => Math.abs(x - y)));
  return b.reduce((s, x) => s + near(x, a), 0) + a.reduce((s, x) => s + near(x, b), 0);
}

/** The upper voices: a 7th chord's four tones, a triad's three; the 9th of a 9 chord replaces the 5th. */
function upperPcs(c: ChordCandidate): number[] {
  const ints = QUALITY_INTS[c.quality];
  const use = c.quality === '9' ? ints.filter((i) => i !== 7) : ints;
  return use.map((i) => pc12(c.root + i));
}

/** The cadence's chords in a key, voiced with the smallest moves. */
export function voiceCadence(id: CadenceId, tonic: number, minor = false): CadenceChord[] {
  const def = CADENCES.find((c) => c.id === id)!;
  const list = def.chords[minor ? 'minor' : 'major'];
  let prev: number[] | null = null;
  let prevPos: number | null = null;
  return list.map(([off, q]) => {
    const chord: ChordCandidate = { root: pc12(tonic + off), quality: q };
    const cands = closeVoicings(upperPcs(chord));
    const upper: number[] = prev
      ? cands.reduce((best, v) => (voiceMove(prev!, v) < voiceMove(prev!, best) ? v : best), cands[0])
      : cands.reduce((best, v) => (Math.abs(v[0] + v[v.length - 1] - 128) < Math.abs(best[0] + best[best.length - 1] - 128) ? v : best), cands[0]);
    prev = upper;
    const bass = 36 + pc12(chord.root - 36);
    const shapes = shapesFor(chord.root, q);
    const shape = shapes.length ? (prevPos === null ? shapes.reduce((b, s) => (s.pos < b.pos ? s : b), shapes[0]) : shapes.reduce((b, s) => (Math.abs(s.pos - prevPos!) < Math.abs(b.pos - prevPos!) ? s : b), shapes[0])) : null;
    if (shape) prevPos = shape.pos;
    return { chord, symbol: chordSymbol(chord), bass, upper, shape };
  });
}

/** Sum of the upper voices' moves over the cadence (smaller = smoother). */
export const cadenceMotion = (cs: CadenceChord[]): number => cs.slice(1).reduce((s, c, i) => s + voiceMove(cs[i].upper, c.upper), 0);

// ───────────────────────────── measuring a played chord (MIDI) ─────────────────────────────

export interface HeldCheck {
  ok: boolean;
  /** Chord tones not held (pitch classes). */
  missing: number[];
  /** Held notes outside the chord (pitch classes). */
  extra: number[];
}

/**
 * Keys held against a chord: every chord tone held (a 7th chord may leave out its 5th) and no note outside it.
 * Needs at least three keys (two for a power chord). Any voicing, any octave.
 */
export function checkHeld(held: number[], c: ChordCandidate): HeldCheck {
  const ints = QUALITY_INTS[c.quality];
  const want = ints.map((i) => pc12(c.root + i));
  const have = new Set(held.map(pc12));
  const missing = want.filter((p, k) => !have.has(p) && !(ints[k] === 7 && ints.length >= 4));
  const extra = [...have].filter((p) => !want.includes(p));
  const enough = held.length >= Math.min(3, want.length);
  return { ok: enough && !missing.length && !extra.length, missing, extra };
}

/** The rating band a played cadence counts at (triads p, the deceptive mp, the 7th-chord jazz cadences mf). */
export const CADENCE_TIER: Record<CadenceId, 'p' | 'mp' | 'mf'> = { authentic: 'p', plagal: 'p', half: 'p', deceptive: 'mp', 'two-five-one': 'mf', backdoor: 'mf' };

/** The run's result for the game record: chords right at the first try / not. */
export function cadenceRunDetail(firstTry: boolean[], input: 'midi' | 'mic', id: CadenceId, tonic: number, minor: boolean): { score: number; detail: Record<string, unknown> } {
  const right = firstTry.filter(Boolean).length;
  const wrong = firstTry.length - right;
  return { score: Math.round((100 * right) / Math.max(1, firstTry.length)), detail: { right, wrong, accuracy: Math.round((100 * right) / Math.max(1, firstTry.length)), input, cadence: id, key: tonic, minor, tier: CADENCE_TIER[id] } };
}
