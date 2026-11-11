// Tune-up (spec AE §8, review R7): a guitar string is detuned by ±5–50 ¢. A correctly tuned reference
// sounds TOGETHER with it — the lower string fretted at the 5th fret (4th for the B string), or the
// 5th-fret / 7th-fret harmonics — so the beats are audible. Turn the peg until the beats vanish.
// Score: the cents left per round; 8 rounds. Pure.

export const ROUNDS = 8;
/** Standard tuning, string 1 (high E) … 6 (low E), sounding MIDI. */
export const OPEN = [64, 59, 55, 50, 45, 40];
export const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];
/** How far the peg can turn either way (cents) — wider than any detune, so the answer is never at an end. */
export const PEG_RANGE = 70;

/** 'chord' (0.75, the ff tier): no unison — the string is tuned against a sounding chord it belongs to. */
export type RefKind = 'fret' | 'harmonic' | 'chord';

export interface TuneRound {
  /** The detuned string, 1–6. */
  string: number;
  /** Its detune in cents (±5…50). */
  detune: number;
  kind: RefKind;
  /** What sounds as the reference (MIDI) — always in tune. */
  refMidi: number;
  /** What the detuned string plays when in tune (MIDI) — the unison or harmonic pair is refMidi. */
  toneMidi: number;
  /** Description: which string / fret makes the reference. */
  refString: number;
  refFret: number;
  /** 'chord': the sounding chord (MIDI) and its name ("A", "Am"); the string is its root or its 5th. */
  chord?: number[];
  chordName?: string;
}

const PC_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/**
 * A round against a chord (ff): the string is the chord's root or its 5th; the chord holds the string's note an
 * octave up (octaves are exact, so its beats lead to the right pitch), never the same note — no unison reference.
 */
export function chordRound(string: number, detune: number, asFifth: boolean, minor: boolean, inst: TuneInst = 'guitar'): TuneRound {
  const t = openOf(inst)[string - 1];
  const root = asFifth ? t + 5 : t + 12;
  const chord = asFifth ? [root, root + (minor ? 3 : 4), t + 12] : [root, root + (minor ? 3 : 4), root + 7];
  return { string, detune, kind: 'chord', refMidi: t + 12, toneMidi: t, refString: string, refFret: 0, chord, chordName: `${PC_NAME[root % 12]}${minor ? 'm' : ''}` };
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which reference a string can be tuned against with harmonics (pairs a fourth apart, not G–B, not low E). */
export const harmonicOk = (s: number, inst: TuneInst = 'guitar') => (inst === 'bass' ? s >= 1 && s <= 3 : s === 1 || s === 3 || s === 4 || s === 5);

/** Final bass check: the bass course tunes a 4-string bass (G D A E, all fourths — no B-string exception). */
export type TuneInst = 'guitar' | 'bass';
export const BASS_OPEN = [43, 38, 33, 28];
export const BASS_STRING_NAMES = ['G', 'D', 'A', 'E'];
export const openOf = (inst: TuneInst) => (inst === 'bass' ? BASS_OPEN : OPEN);
export const stringNamesOf = (inst: TuneInst) => (inst === 'bass' ? BASS_STRING_NAMES : STRING_NAMES);

export function roundFor(string: number, detune: number, kind: RefKind, inst: TuneInst = 'guitar'): TuneRound {
  const s = string;
  const open = openOf(inst);
  const low = open.length;
  if (kind === 'harmonic' && harmonicOk(s, inst)) {
    // 5th-fret harmonic on the lower string (+2 octaves) = 7th-fret harmonic on this string (+octave + 5th).
    return { string: s, detune, kind, refMidi: open[s] + 24, toneMidi: open[s - 1] + 19, refString: s + 1, refFret: 5 };
  }
  if (s === low) {
    // The lowest string has no lower one: fret it at the 5th and match the open string above.
    return { string: s, detune, kind: 'fret', refMidi: open[low - 2], toneMidi: open[low - 1] + 5, refString: low - 1, refFret: 0 };
  }
  const fret = inst === 'guitar' && s === 2 ? 4 : 5;
  return { string: s, detune, kind: 'fret', refMidi: open[s] + fret, toneMidi: open[s - 1], refString: s + 1, refFret: fret };
}

/** 8 rounds: different strings in turn, detunes of 5–50 ¢ either way, harmonics on about a third. */
export function makeRounds(seed: number, n = ROUNDS, inst: TuneInst = 'guitar', range?: { lo: number; hi: number }, chords = false): TuneRound[] {
  const r = rng(seed);
  const out: TuneRound[] = [];
  let strings: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!strings.length) {
      strings = openOf(inst).map((_, i) => i + 1);
      for (let k = strings.length - 1; k > 0; k--) {
        const j = Math.floor(r() * (k + 1));
        [strings[k], strings[j]] = [strings[j], strings[k]];
      }
    }
    const s = strings.pop()!;
    // Harder as the game goes on: early rounds are far out, later ones closer.
    // A level tier fixes the detune range (GAMES_TIERS_PLAN: 30–50 ¢ at pp … 4–6 ¢ at ff).
    const lo = range ? range.lo : i < 3 ? 25 : 5;
    const hi = range ? range.hi : i < 3 ? 50 : 30;
    const mag = Math.round(lo + r() * (hi - lo));
    const detune = r() < 0.5 ? -mag : mag;
    if (chords) {
      out.push(chordRound(s, detune, r() < 0.5, r() < 0.4, inst));
      continue;
    }
    const kind: RefKind = harmonicOk(s, inst) && r() < 0.35 ? 'harmonic' : 'fret';
    out.push(roundFor(s, detune, kind, inst));
  }
  return out;
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The detuned string's frequency for a peg position (cents added by the player). */
export const toneHz = (r: TuneRound, peg: number) => midiHz(r.toneMidi) * 2 ** ((r.detune + peg) / 1200);

/** Beats per second between the reference and the string. */
export const beatRate = (r: TuneRound, peg: number) => Math.abs(toneHz(r, peg) - midiHz(r.refMidi));

/** Cents still off after the player's turn (signed: + = sharp). */
export const centsLeft = (r: TuneRound, peg: number) => Math.round((r.detune + peg) * 10) / 10;

/** 100 points in tune (≤ 1 ¢), losing 4 per cent beyond that; 0 from 26 ¢. */
export const roundPoints = (cents: number) => Math.max(0, Math.round(100 - 4 * Math.max(0, Math.abs(cents) - 1)));

export const MAX_SCORE = ROUNDS * 100;

export interface TuneUpSave {
  v: 1;
  seed: number;
  round: number;
  score: number;
  errors: number[];
  /** Level tier of the run (GAMES_TIERS_PLAN). */
  tier?: import('./courseSocial').DynName;
}

export function isTuneUpSave(v: unknown): v is TuneUpSave {
  const o = v as TuneUpSave | null;
  return !!o && o.v === 1 && typeof o.seed === 'number' && typeof o.round === 'number' && typeof o.score === 'number' && Array.isArray(o.errors);
}
