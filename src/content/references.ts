// Reference recordings (owner 2026-11-11): every standard the app practises (standards.ts) links out to one or two
// leading recordings on Spotify and YouTube, so the player can go from the app straight to the original.
// Linking out only — the app never embeds or plays their audio. Research and sources: docs/research/STANDARDS_REFERENCES.md.
//
// Links are search deep-links ("title artist"): robust when a catalogue changes, and they open the Spotify / YouTube app
// on phones. Keys are concert keys of that recording; `sure` says how well the key is sourced.

export type KeySure = 'verified' | 'likely' | 'uncertain';

export interface RecKey {
  /** Tonic pitch class 0–11. */
  pc: number;
  minor?: boolean;
  /** A modal / vamp tune named by its mode instead of major / minor (e.g. dorian, sus). */
  mode?: { en: string; he: string };
}

export interface Recording {
  artist: string;
  album: string;
  year: number;
  key: RecKey;
  /** How well the key is sourced: verified (transcription database / two sources), likely (one source or the standard key), uncertain. */
  sure: KeySure;
  spotify: string;
  youtube: string;
  /** One line about this recording (e.g. the form differs a little), he + en. */
  note?: { en: string; he: string };
}

export interface StandardRef {
  /** standards.ts id. */
  id: string;
  /** The tune searched for (a form links to a famous tune on it). */
  title: string;
  /** 'tune' = the standard itself; 'form' = a generic form (blues, rhythm changes…) and a famous tune built on it. */
  kind: 'tune' | 'form';
  /** The app's default practice key for this chart (as written in standards.ts; the bass levels use the same). */
  appKey: RecKey;
  recordings: Recording[];
}

const enc = (s: string) => encodeURIComponent(s);
export const spotifySearch = (q: string) => `https://open.spotify.com/search/${enc(q)}`;
export const youtubeSearch = (q: string) => `https://www.youtube.com/results?search_query=${enc(q)}`;

const DORIAN = { en: 'dorian', he: 'דורי' };
const SUS = { en: 'sus', he: 'sus' };

type RecIn = Omit<Recording, 'spotify' | 'youtube'> & { q?: string };
const rec = (title: string, r: RecIn): Recording => {
  const q = r.q ?? `${title} ${r.artist}`;
  const { q: _q, ...rest } = r;
  void _q;
  return { ...rest, spotify: spotifySearch(q), youtube: youtubeSearch(q) };
};
const tune = (id: string, title: string, appKey: RecKey, recs: RecIn[], kind: 'tune' | 'form' = 'tune'): StandardRef => ({ id, title, kind, appKey, recordings: recs.map((r) => rec(title, r)) });

const MAJ = (pc: number): RecKey => ({ pc });
const MIN = (pc: number): RecKey => ({ pc, minor: true });

const OLEO = { artist: 'Miles Davis Quintet', album: "Relaxin' with the Miles Davis Quintet", year: 1956, key: MAJ(10), sure: 'verified' as const };
const GIANT = { artist: 'John Coltrane', album: 'Giant Steps', year: 1959, key: MAJ(11), sure: 'verified' as const, note: { en: 'Moves through B, G and E♭ (starts in B).', he: 'עובר בין B,‏ G ו־E♭ (מתחיל ב־B).' } };

export const REFERENCES: Record<string, StandardRef> = Object.fromEntries(
  [
    // ---- blues forms: a famous tune on the form
    tune('blues-f', "Billie's Bounce", MAJ(5), [{ artist: 'Charlie Parker', album: "Billie's Bounce (Savoy 78)", year: 1945, key: MAJ(5), sure: 'verified' }, { artist: 'Charlie Parker', album: "Now's the Time (Savoy 78)", year: 1945, key: MAJ(5), sure: 'likely', q: "Now's the Time Charlie Parker" }], 'form'),
    tune('blues-bb', 'Tenor Madness', MAJ(10), [{ artist: 'Sonny Rollins', album: 'Tenor Madness', year: 1956, key: MAJ(10), sure: 'verified' }, { artist: 'Thelonious Monk', album: 'Thelonious Monk Trio', year: 1954, key: MAJ(10), sure: 'likely', q: 'Blue Monk Thelonious Monk' }], 'form'),
    tune('minor-blues', 'Mr. P.C.', MIN(0), [{ artist: 'John Coltrane', album: 'Giant Steps', year: 1959, key: MIN(0), sure: 'verified' }], 'form'),
    tune('bird-blues', 'Blues for Alice', MAJ(5), [{ artist: 'Charlie Parker', album: 'Swedish Schnapps', year: 1951, key: MAJ(5), sure: 'verified' }], 'form'),
    tune('blues-waltz', 'All Blues', MAJ(5), [{ artist: 'Miles Davis', album: 'Kind of Blue', year: 1959, key: MAJ(7), sure: 'verified', note: { en: 'A 6/8 blues in G with its own turnaround: the closest famous blues waltz.', he: 'בלוז ב־6/8 ב־G עם טרנאראונד משלו: בלוז הוואלס המפורסם הקרוב.' } }], 'form'),
    // ---- rhythm changes: Oleo
    tune('rhythm-full', 'Oleo', MAJ(10), [OLEO], 'form'),
    tune('rhythm-a', 'Oleo', MAJ(10), [OLEO], 'form'),
    tune('rhythm-bridge', 'Oleo', MAJ(10), [OLEO], 'form'),
    // ---- swing standards
    tune('autumn', 'Autumn Leaves', MIN(7), [{ artist: 'Cannonball Adderley', album: "Somethin' Else", year: 1958, key: MIN(7), sure: 'verified' }]),
    tune('fly', 'Fly Me to the Moon', MAJ(0), [{ artist: 'Frank Sinatra & Count Basie', album: 'It Might as Well Be Swing', year: 1964, key: MAJ(0), sure: 'likely', q: 'Fly Me to the Moon Frank Sinatra Count Basie' }]),
    tune('a-train', 'Take the A Train', MAJ(0), [{ artist: 'Duke Ellington Orchestra', album: 'Take the "A" Train (Victor 78)', year: 1941, key: MAJ(0), sure: 'verified', note: { en: 'Starts in C, the last choruses move up to E♭.', he: 'מתחיל ב־C, הסבבים האחרונים עולים ל־E♭.' }, q: 'Take the A Train Duke Ellington' }]),
    tune('satin', 'Satin Doll', MAJ(0), [{ artist: 'Duke Ellington Orchestra', album: 'Satin Doll (Capitol)', year: 1953, key: MAJ(0), sure: 'likely', q: 'Satin Doll Duke Ellington' }]),
    tune('attya', 'All the Things You Are', MAJ(8), [{ artist: 'Modern Jazz Quartet (Milt Jackson)', album: 'M.J.Q. (Prestige)', year: 1952, key: MAJ(8), sure: 'verified', q: 'All the Things You Are Modern Jazz Quartet' }]),
    tune('tune-up', 'Tune Up', MAJ(2), [{ artist: 'Miles Davis', album: "Cookin' with the Miles Davis Quintet", year: 1956, key: MAJ(2), sure: 'likely' }]),
    tune('never-another', 'There Will Never Be Another You', MAJ(3), [{ artist: 'Chet Baker', album: 'Chet Baker Sings', year: 1954, key: MAJ(5), sure: 'verified' }]),
    tune('miss-jones', 'Have You Met Miss Jones?', MAJ(5), [{ artist: 'McCoy Tyner Trio', album: 'Reaching Fourth', year: 1962, key: MAJ(5), sure: 'uncertain', q: 'Have You Met Miss Jones McCoy Tyner' }]),
    tune('stella', 'Stella by Starlight', MAJ(10), [{ artist: 'Miles Davis', album: "'58 Sessions (1958 Miles)", year: 1958, key: MAJ(10), sure: 'likely' }]),
    // ---- ballads
    tune('misty', 'Misty', MAJ(3), [{ artist: 'Erroll Garner', album: 'Contrasts', year: 1954, key: MAJ(3), sure: 'verified' }]),
    tune('valentine', 'My Funny Valentine', MIN(0), [{ artist: 'Miles Davis Quintet', album: "Cookin' with the Miles Davis Quintet", year: 1956, key: MIN(0), sure: 'verified' }]),
    // ---- bossa / latin
    tune('blue-bossa', 'Blue Bossa', MIN(0), [{ artist: 'Joe Henderson', album: 'Page One', year: 1963, key: MIN(0), sure: 'verified' }]),
    tune('ipanema', 'The Girl from Ipanema', MAJ(5), [{ artist: 'Stan Getz & João Gilberto', album: 'Getz/Gilberto', year: 1964, key: MAJ(1), sure: 'verified', q: 'The Girl from Ipanema Stan Getz Joao Gilberto Astrud Gilberto' }]),
    tune('song-father', 'Song for My Father', MIN(5), [{ artist: 'Horace Silver Quintet', album: 'Song for My Father', year: 1964, key: MIN(5), sure: 'likely', q: 'Song for My Father Horace Silver' }]),
    tune('minor-bossa', 'Manhã de Carnaval (Black Orpheus)', MIN(9), [{ artist: 'Luiz Bonfá', album: 'Orfeu Negro (soundtrack)', year: 1959, key: MIN(9), sure: 'likely', q: 'Manha de Carnaval Luiz Bonfa', note: { en: 'A famous minor bossa on close changes, not the same form.', he: 'בוסה מינורית מפורסמת על הרמוניה קרובה, לא אותה צורה.' } }], 'form'),
    // ---- modal / jazz-funk
    tune('so-what', 'So What', { pc: 2, minor: true, mode: DORIAN }, [{ artist: 'Miles Davis', album: 'Kind of Blue', year: 1959, key: { pc: 2, minor: true, mode: DORIAN }, sure: 'verified' }, { artist: 'John Coltrane', album: 'Impressions', year: 1961, key: { pc: 2, minor: true, mode: DORIAN }, sure: 'verified', q: 'Impressions John Coltrane' }]),
    tune('cantaloupe', 'Cantaloupe Island', MIN(5), [{ artist: 'Herbie Hancock', album: 'Empyrean Isles', year: 1964, key: MIN(5), sure: 'verified' }]),
    tune('maiden', 'Maiden Voyage', { pc: 2, mode: SUS }, [{ artist: 'Herbie Hancock', album: 'Maiden Voyage', year: 1965, key: { pc: 2, mode: SUS }, sure: 'verified' }]),
    tune('chameleon', 'Chameleon', { pc: 10, minor: true, mode: DORIAN }, [{ artist: 'Herbie Hancock', album: 'Head Hunters', year: 1973, key: { pc: 10, minor: true, mode: DORIAN }, sure: 'likely' }]),
    // ---- bebop / post-bop
    tune('solar', 'Solar', MIN(0), [{ artist: 'Miles Davis', album: "Walkin'", year: 1954, key: MIN(0), sure: 'verified' }]),
    tune('ladybird', 'Lady Bird', MAJ(0), [{ artist: 'Tadd Dameron & Fats Navarro', album: 'The Fabulous Fats Navarro (Blue Note)', year: 1948, key: MAJ(0), sure: 'likely', q: 'Lady Bird Tadd Dameron Fats Navarro' }]),
    // ---- Coltrane
    tune('giant', 'Giant Steps', MAJ(11), [GIANT]),
    tune('giant-slow', 'Giant Steps', MAJ(11), [GIANT]),
  ].map((r) => [r.id, r]),
);

/**
 * Charts in standards.ts that are practice forms, not tunes: there is no "original" to link to, so they carry no reference
 * (a test keeps this list and REFERENCES covering every chart).
 */
export const NO_REFERENCE: Record<string, string> = {
  'blues-basic': 'generic 12-bar blues drill',
  'ballad-ii-v': 'turnaround study',
  'two-five-keys': 'ii–V–I cycle through the keys',
  'minor-two-five-keys': 'minor ii–V–i cycle',
  'turnarounds-f': 'I–vi–ii–V study',
  'backdoor-g': 'backdoor ii–V study',
  'sec-dominants-c': 'secondary dominants study',
  'modal-a': 'two-mode practice form',
  'dorian-vamp': 'two-chord vamp',
};

export const referenceOf = (id: string | undefined | null): StandardRef | null => (id ? REFERENCES[id] ?? null : null);

const KEY_EN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const pcMod = (n: number) => ((n % 12) + 12) % 12;
/** A key's short name: "G minor" / "G מינור", "D dorian" / "D דורי", "E♭ major" / "E♭ מז׳ור". */
export function keyLabel(k: RecKey, lang: 'en' | 'he'): string {
  const n = KEY_EN[pcMod(k.pc)];
  if (k.mode) return `${n} ${k.mode[lang]}`;
  return `${n} ${k.minor ? (lang === 'he' ? 'מינור' : 'minor') : lang === 'he' ? 'מז׳ור' : 'major'}`;
}
/** The note name of a pitch class (for "practise in E♭"). */
export const keyName = (pc: number): string => KEY_EN[pcMod(pc)];
/** Same tonic (major / minor / mode don't count: the reference is the same tune). */
export const sameKey = (a: RecKey, b: RecKey): boolean => pcMod(a.pc) === pcMod(b.pc);
