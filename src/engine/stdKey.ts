// A tune in all 12 keys (AUDIT-GAPS-2 High #4, owner rule: every jazz exercise in every key). Standards, improvisation
// levels and chart templates are written in their lead-sheet keys; a drill on one takes its `key` as an OFFSET from
// that key (0 = the lead sheet, so saved progress keeps its item id). This module knows each chart's home key, spells
// a moved chart for its new key (sharps in G D A E B F♯ and their relative minors, flats elsewhere, never a double
// accidental) and names the key in a drill's title. Pure.

type T2 = { en: string; he: string };
export interface Home {
  /** Tonic pitch class. */
  key: number;
  minor?: boolean;
}

const pc = (x: number) => ((x % 12) + 12) % 12;
const M = (key: number): Home => ({ key });
const m = (key: number): Home => ({ key, minor: true });

/** The lead-sheet key of every standard in standards.ts (the tune's tonic; minor tunes by their minor tonic). */
export const STANDARD_HOME: Record<string, Home> = {
  'blues-f': M(5), 'blues-bb': M(10), 'blues-basic': M(7), 'minor-blues': m(0), 'bird-blues': M(5), 'blues-waltz': M(5),
  'rhythm-full': M(10), 'rhythm-a': M(10), 'rhythm-bridge': M(10),
  autumn: m(7), fly: M(0), 'a-train': M(0), satin: M(0), attya: M(8), 'tune-up': M(2), 'never-another': M(3), 'miss-jones': M(5), stella: M(10),
  misty: M(3), valentine: m(0), 'ballad-ii-v': M(3), 'ballad-cliche': m(2), 'ballad-backcycle': M(3),
  'blue-bossa': m(0), ipanema: M(5), 'song-father': m(5), 'minor-bossa': m(9),
  'so-what': m(2), cantaloupe: m(5), maiden: M(2), chameleon: m(10), 'dorian-vamp': m(2), 'modal-a': m(9),
  solar: m(0), ladybird: M(0), 'two-five-keys': M(0), 'minor-two-five-keys': m(0), 'fast-aaba-cycle': M(10), 'bebop-form': M(5),
  giant: M(11), 'giant-slow': M(11), 'coltrane-subs': M(0),
  'turnarounds-f': M(5), 'backdoor-g': M(7), 'sec-dominants-c': M(0),
};
/** The improvisation levels (charts.ts IMPROV_LEVELS) and chart templates (CHART_TEMPLATES) by their reference. */
const REF_HOME: Record<string, Home> = {
  'lv:vamp-dorian': m(2), 'lv:two-chords': m(2), 'lv:blues': M(5), 'lv:two-five-one': M(0), 'lv:minor-two-five': m(0), 'lv:turnaround': M(0),
  'lv:tritone-subs': M(0), 'lv:extensions': M(0), 'lv:rhythm-changes': M(10), 'lv:backdoor': M(0), 'lv:keys-cycle': M(0), 'lv:altered-chain': M(0),
  'lv:coltrane': M(0), 'lv:coltrane-fast': M(11),
  'tpl:blues-f': M(5), 'tpl:jazz-blues': M(10), 'tpl:minor-blues': m(0), 'tpl:rhythm-a': M(10), 'tpl:two-five-cycle': M(0), 'tpl:minor-two-five': m(0),
  'tpl:turnaround': M(0), 'tpl:pop-four': M(0), 'tpl:fifties': M(0), 'tpl:andalusian': m(9), 'tpl:rock-mixo': M(2), 'tpl:bossa': M(0), 'tpl:canon': M(2), 'tpl:waltz': M(7),
};

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const symRoot = (s: string): number | null => {
  const r = /^([A-G])([#♯b♭]?)/.exec(s);
  return r ? pc(LETTER[r[1]] + (r[2] === '#' || r[2] === '♯' ? 1 : r[2] ? -1 : 0)) : null;
};

/** A chart text's home when no table has it (an own chart): its first chord, minor when that chord is minor. */
export function chartHome(text: string): Home {
  const first = text.split(/[\s|]+/).find((x) => symRoot(x) !== null) ?? 'C';
  const minor = /^[A-G][#♯b♭]?(m(?!aj)|-|min)/.test(first);
  return { key: symRoot(first) ?? 0, ...(minor ? { minor: true } : {}) };
}
/** The home key of a standard id. */
export const standardHome = (id: string): Home => STANDARD_HOME[id] ?? M(0);
/** The home key of a chart reference ("std:<id>", "lv:<id>", "tpl:<id>"); `text` is the fallback for others. */
export function refHome(ref: string, text = ''): Home {
  if (ref.startsWith('std:')) return STANDARD_HOME[ref.slice(4)] ?? chartHome(text);
  return REF_HOME[ref] ?? chartHome(text);
}
/** The home moved by `offset` semitones. */
export const moved = (h: Home, offset: number): Home => ({ key: pc(h.key + offset), ...(h.minor ? { minor: true } : {}) });

/** Major keys written with sharps (G D A E B F♯); the rest with flats. A minor key uses its relative major. */
const SHARP_MAJORS = [7, 2, 9, 4, 11, 6];
export const sharpKey = (h: Home): boolean => SHARP_MAJORS.includes(pc(h.key + (h.minor ? 3 : 0)));
const ASCII_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ASCII_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const UNI_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const UNI_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A pitch class named for a key (ASCII b / #, as chart texts are written). */
export const noteIn = (p: number, h: Home): string => (sharpKey(h) ? ASCII_SHARP : ASCII_FLAT)[pc(p)];

/** A pitch class named for a key, with ♭ / ♯ (for titles and rebuilt chord names). */
export const noteNameIn = (p: number, h: Home): string => (sharpKey(h) ? UNI_SHARP : UNI_FLAT)[pc(p)];

const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
/**
 * A note name (root or bass of a chord symbol, ASCII) moved by `n` semitones into the key `to`: by letter, as a
 * musician transposes (in D♭ the iii of C's Em becomes Fm, in B♭ minor the ♭VI of G minor's E♭ becomes G♭), so each
 * chord keeps its function in its spelling. A name that would need a double accidental, or C♭ / F♭ / E♯ / B♯, takes the
 * key's plain spelling instead (B♭♭ → A, C♭ → B).
 */
export function rootIn(name: string, n: number, to: Home): string {
  const p0 = symRoot(name);
  if (p0 === null) return name;
  if (pc(n) === 0) return name.slice(0, /^[A-G][#♯b♭]/.test(name) ? 2 : 1).replace('♯', '#').replace('♭', 'b');
  const from = moved(to, -n);
  const shift = LETTERS.indexOf(keyLabel(to)[0]) - LETTERS.indexOf(keyLabel(from)[0]);
  const li = (((LETTERS.indexOf(name[0]) + shift) % 7) + 7) % 7;
  const target = pc(p0 + n);
  let acc = target - NATURAL[li];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  const out = acc === 0 ? LETTERS[li] : acc === 1 ? LETTERS[li] + '#' : acc === -1 ? LETTERS[li] + 'b' : '';
  // A double accidental, or C♭ / F♭ / E♯ / B♯ (hard to read on a chart): the key's plain name instead.
  return !out || ['Cb', 'Fb', 'E#', 'B#'].includes(out) ? noteIn(target, to) : out;
}
/** rootIn with ♭ / ♯ (titles, rebuilt chord names). */
export const rootNameIn = (name: string, n: number, to: Home): string => rootIn(name, n, to).replace('#', '♯').replace(/(?<=^[A-G])b/, '♭');

/** One chord symbol moved by `n` semitones and spelled for the key `to` (root and slash bass). */
export function transposeSymIn(sym: string, n: number, to: Home): string {
  // The lead sheet itself keeps its own spelling.
  if (pc(n) === 0) return sym;
  return sym.replace(/^([A-G][#♯b♭]?)/, (r) => rootIn(r, n, to)).replace(/\/([A-G][#♯b♭]?)$/, (_, b: string) => '/' + rootIn(b, n, to));
}
/** A whole chart text ("|" between bars, spaces between chords, "%" repeats) moved and spelled for `to`. */
export function transposeTextIn(text: string, n: number, to: Home): string {
  if (pc(n) === 0) return text;
  return text
    .split('|')
    .map((bar) => {
      const lead = /^\s*/.exec(bar)![0];
      const trail = /\s*$/.exec(bar)![0];
      return lead + bar.trim().split(/\s+/).map((c) => (symRoot(c) === null ? c : transposeSymIn(c, n, to))).join(' ') + trail;
    })
    .join('|');
}

/** The key's display name: "B♭", "F♯", minor "Gm", "C♯m" (spelled by the relative major). */
export function keyLabel(h: Home): string {
  const names = h.minor ? (sharpKey(h) ? UNI_SHARP : UNI_FLAT) : UNI_FLAT.map((x, i) => (i === 6 ? 'F♯' : x));
  return names[pc(h.key)] + (h.minor ? 'm' : '');
}
const tonicName = (h: Home): string => keyLabel(h).replace(/m$/, '');

const EN_KEY = / in [A-G][♭♯b#]?(?=$|[\s,)·:])/;
const HE_LATIN = /(^|\s)ב־?[A-G][♭♯b#]?(?=$|[\s,)·:])/;
const HE_SOLFEGE = /(^|\s)ב(?:דו|רה|מי|פה|סול|לה|סי)(?: במול| דיאז)?(?=$|[\s,)·:])/;
/** A tune name with the key it states ("Jazz blues in F", "בלוז בפה", "ב־F") moved to the tonic of `h`; else as is. */
export function restateKey(name: T2, h: Home): T2 {
  const tn = tonicName(h);
  return { en: name.en.replace(EN_KEY, ` in ${tn}`), he: name.he.replace(EN_KEY, ` in ${tn}`).replace(HE_LATIN, `$1ב־${tn}`).replace(HE_SOLFEGE, `$1ב־${tn}`) };
}
/** A tune name in a key: the key it states is moved; a name without one gets " · <key>" (the header always shows the key). */
export function nameInKey(name: T2, h: Home): T2 {
  const r = restateKey(name, h);
  const heHas = EN_KEY.test(name.he) || HE_LATIN.test(name.he) || HE_SOLFEGE.test(name.he);
  return { en: EN_KEY.test(name.en) ? r.en : `${name.en} · ${keyLabel(h)}`, he: heHas ? r.he : `${name.he} · ${keyLabel(h)}` };
}

/** The other keys after the home key: the offsets 1–11 in the player's key order of the tonics they make. */
export function offsetsInOrder(home: Home, tonicOrder: number[]): number[] {
  const out = [0];
  for (const k of tonicOrder) {
    const o = pc(k - home.key);
    if (!out.includes(o)) out.push(o);
  }
  for (let o = 1; o < 12; o++) if (!out.includes(o)) out.push(o);
  return out;
}
