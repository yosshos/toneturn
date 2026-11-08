// Songbook by the chords you know (0.53, PLAN §11): a song's Roman numerals become chord names in a key; with the
// player's chord vocabulary we find the keys in which every chord is known, or the key that needs just one new chord.
// Pure.
import type { SongDef } from '../content/songbook';

const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** Keys that read in flats (major tonic pitch classes). */
const FLAT_KEYS = new Set([5, 10, 3, 8, 1, 6]);
const mod = (n: number) => ((n % 12) + 12) % 12;

/** Roman numeral → [semitones above the tonic, quality suffix]. Upper case = major, lower = minor. */
function roman(r: string, minorKey: boolean): [number, string] | null {
  const m = /^(b|♭)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(7|°|dim)?$/.exec(r.trim());
  if (!m) return null;
  const flat = !!m[1];
  const num = m[2];
  const up = num === num.toUpperCase();
  const base: Record<string, number> = minorKey
    ? { i: 0, ii: 2, iii: 3, iv: 5, v: 7, vi: 8, vii: 10 }
    : { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };
  let semi = base[num.toLowerCase()] - (flat ? 1 : 0);
  // in a major key a major III / VI / VII is the chromatic chord a semitone up from the scale's minor one only when written so;
  // in minor, VII is the subtonic (10) — both already in the table
  if (!minorKey && flat) semi = base[num.toLowerCase()] - 1;
  const suffix = m[3] === '7' ? (up ? '7' : 'm7') : m[3] === '°' || m[3] === 'dim' ? 'dim' : up ? '' : 'm';
  return [mod(semi), suffix];
}

/** The chord names of a song in a key (tonic pitch class). */
export function songChordNames(song: Pick<SongDef, 'chords' | 'minor'>, key: number): string[] {
  const names = key === 0 ? SHARP : FLAT_KEYS.has(mod(key + (song.minor ? 3 : 0))) ? FLAT : SHARP;
  const out = new Set<string>();
  for (const tok of song.chords.split(/[\s|]+/).filter(Boolean)) {
    const r = roman(tok, !!song.minor);
    if (r) out.add(names[mod(key + r[0])] + r[1]);
  }
  return [...out];
}

/** A dominant 7th counts as known when its triad is known (the 7th is an easy addition), and vice versa for a sus. */
const covered = (c: string, known: Set<string>) => known.has(c) || (c.endsWith('7') && !c.endsWith('m7') && known.has(c.slice(0, -1))) || (c.endsWith('m7') && known.has(c.slice(0, -1)));

/** Every key with what is missing, best first (fewest missing, then the song's own key). */
export function keysForChords(song: Pick<SongDef, 'chords' | 'minor' | 'key'>, known: Set<string>): { key: number; chords: string[]; missing: string[] }[] {
  return Array.from({ length: 12 }, (_, key) => {
    const chords = songChordNames(song, key);
    return { key, chords, missing: chords.filter((c) => !covered(c, known)) };
  }).sort((a, b) => a.missing.length - b.missing.length || Number(b.key === song.key) - Number(a.key === song.key) || a.key - b.key);
}

/** Playable now (a key with nothing missing), or one new chord away, or further. */
export function songFit(song: Pick<SongDef, 'chords' | 'minor' | 'key'>, known: Set<string>): { kind: 'playable' | 'one-new' | 'far'; key: number; missing: string[] } {
  const best = keysForChords(song, known)[0];
  return { kind: best.missing.length === 0 ? 'playable' : best.missing.length === 1 ? 'one-new' : 'far', key: best.key, missing: best.missing };
}

/** The usual first chords, for the "chords I know" picker. */
export const COMMON_CHORDS: { guitar: string[]; piano: string[] } = {
  guitar: ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em', 'F', 'B7', 'E7', 'A7', 'D7', 'G7', 'C7', 'Bm', 'F♯m', 'B♭'],
  piano: ['C', 'F', 'G', 'D', 'A', 'E', 'B♭', 'E♭', 'Am', 'Dm', 'Em', 'Bm', 'Gm', 'Cm', 'Fm', 'G7', 'C7', 'D7'],
};
export const keyName = (k: number, minor = false) => (FLAT_KEYS.has(mod(k + (minor ? 3 : 0))) ? FLAT : SHARP)[mod(k)] + (minor ? 'm' : '');
