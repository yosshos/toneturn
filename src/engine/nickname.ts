// Nicknames (SPEC-SOCIAL §1.1, owner 2026-11-07): playful musical suggestions + a number, chosen on first entry and
// changeable later. Latin letters / digits / "_" only, 3–20 characters, case-insensitive unique (checked by the
// server), and an offensive-word filter on suggestions and on names people type. Pure.

/** A musical word (tempo, form, harmony, ornaments, genres, instrument parts, notation). */
export const MUSIC_WORDS = [
  'Allegro', 'Adagio', 'Andante', 'Presto', 'Vivace', 'Largo', 'Lento', 'Moderato', 'Rubato', 'Tempo',
  'Coda', 'Fermata', 'Cadenza', 'Fugue', 'Canon', 'Sonata', 'Rondo', 'Minuet', 'Waltz', 'Bolero',
  'Tango', 'Mambo', 'Samba', 'Bossa', 'Salsa', 'Polka', 'Gigue', 'Gavotte', 'Etude', 'Prelude',
  'Nocturne', 'Scherzo', 'Ballad', 'Anthem', 'Chorale', 'Motet', 'Aria', 'Overture', 'Encore', 'Reprise',
  'Bridge', 'Chorus', 'Verse', 'Riff', 'Lick', 'Groove', 'Swing', 'Shuffle', 'Backbeat', 'Downbeat',
  'Upbeat', 'Offbeat', 'Syncopated', 'Staccato', 'Legato', 'Pizzicato', 'Tremolo', 'Vibrato', 'Glissando', 'Trill',
  'Mordent', 'Turn', 'Grace', 'Accent', 'Forte', 'Piano', 'Mezzo', 'Crescendo', 'Sforzando', 'Dolce',
  'Cantabile', 'Agitato', 'Maestoso', 'Giocoso', 'Scherzando', 'Espressivo', 'Tutti', 'Solo', 'Duet', 'Trio',
  'Quartet', 'Octave', 'Fifth', 'Fourth', 'Third', 'Seventh', 'Ninth', 'Tritone', 'Unison', 'Interval',
  'Chord', 'Triad', 'Arpeggio', 'Scale', 'Mode', 'Dorian', 'Lydian', 'Mixolydian', 'Phrygian', 'Aeolian',
  'Ionian', 'Major', 'Minor', 'Sharp', 'Flat', 'Natural', 'Tonic', 'Dominant', 'Cadence', 'Harmony',
  'Melody', 'Rhythm', 'Meter', 'Measure', 'Staff', 'Clef', 'Treble', 'Bass', 'Alto', 'Tenor',
  'Soprano', 'Baritone', 'Falsetto', 'Bluesy', 'Jazzy', 'Funky', 'Soulful', 'Mellow', 'Lofi', 'Bebop',
  'Ragtime', 'Boogie', 'Disco', 'Reggae', 'Ska', 'Klezmer', 'Flamenco', 'Maqam', 'Raga', 'Tabla',
  'Metronome', 'Tuning', 'Harmonic', 'Overtone', 'Resonant', 'Acoustic', 'Electric', 'Analog', 'Echo', 'Reverb',
] as const;

/** A playful noun (animals, fruit, small objects) — paired with a musical word. */
export const PLAYFUL_NOUNS = [
  'Fox', 'Panda', 'Otter', 'Llama', 'Owl', 'Koala', 'Tiger', 'Lynx', 'Badger', 'Beaver',
  'Bison', 'Camel', 'Cobra', 'Crane', 'Dingo', 'Dolphin', 'Eagle', 'Falcon', 'Ferret', 'Finch',
  'Gecko', 'Gibbon', 'Heron', 'Hippo', 'Ibis', 'Jackal', 'Jaguar', 'Kiwi', 'Lemur', 'Lion',
  'Lobster', 'Macaw', 'Manatee', 'Marmot', 'Meerkat', 'Mole', 'Moose', 'Narwhal', 'Newt', 'Ocelot',
  'Orca', 'Osprey', 'Parrot', 'Pelican', 'Penguin', 'Pigeon', 'Platypus', 'Puffin', 'Puma', 'Quail',
  'Rabbit', 'Raccoon', 'Raven', 'Robin', 'Salmon', 'Seal', 'Shark', 'Sloth', 'Sparrow', 'Squid',
  'Stork', 'Swan', 'Tapir', 'Toucan', 'Turtle', 'Walrus', 'Wombat', 'Wolf', 'Yak', 'Zebra',
  'Mango', 'Lemon', 'Peach', 'Plum', 'Cherry', 'Melon', 'Papaya', 'Fig', 'Olive', 'Pepper',
  'Pickle', 'Muffin', 'Waffle', 'Pretzel', 'Noodle', 'Taco', 'Biscuit', 'Cookie', 'Bagel', 'Dumpling',
  'Comet', 'Rocket', 'Pixel', 'Robot', 'Wizard', 'Ninja', 'Pirate', 'Captain', 'Ranger', 'Pilot',
  'Lantern', 'Compass', 'Anchor', 'Kite', 'Balloon', 'Teapot', 'Marble', 'Button', 'Feather', 'Acorn',
  'Cactus', 'Maple', 'Willow', 'Pebble', 'Meteor', 'Nebula', 'Orbit', 'Galaxy', 'Thunder', 'Breeze',
] as const;

export const NICK_MIN = 3;
export const NICK_MAX = 20;

/** Small deterministic PRNG (mulberry32) so suggestions can be reproduced in tests. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` distinct suggestions like "CodaFox42" (musical word + noun + 1–3 digits), all ≤ 20 chars and clean. */
export function suggestNicknames(count = 4, seed = Date.now(), taken: (n: string) => boolean = () => false): string[] {
  const r = rng(seed);
  const out = new Set<string>();
  for (let tries = 0; out.size < count && tries < 500; tries++) {
    const w = MUSIC_WORDS[Math.floor(r() * MUSIC_WORDS.length)];
    const n = PLAYFUL_NOUNS[Math.floor(r() * PLAYFUL_NOUNS.length)];
    const digits = String(1 + Math.floor(r() * (r() < 0.5 ? 99 : 999)));
    const name = `${w}${n}${digits}`;
    if (name.length > NICK_MAX || checkNickname(name).ok === false || taken(name.toLowerCase())) continue;
    out.add(name);
  }
  return [...out];
}

// ---------------------------------------------------------------- offensive-word filter
// Normalise look-alikes (leetspeak, repeated letters, separators) and search for blocked roots inside the name.
// English and transliterated Hebrew / Arabic / Russian / Spanish / French roots; short roots only match whole tokens.
const BLOCK_ROOTS = [
  'fuck', 'fuk', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'bastard', 'asshole', 'nigg',
  'fag', 'retard', 'rape', 'nazi', 'hitler', 'kkk', 'porn', 'sex', 'penis', 'vagina', 'boob', 'tits', 'anal',
  'kill', 'suicide', 'terror', 'jihad',
  'zayin', 'kus', 'kusem', 'manyak', 'maniak', 'koos', 'sharmuta', 'sharmouta', 'zubi', 'ars', 'homo',
  'kahba', 'kalb', 'blyat', 'blyad', 'suka', 'pizda', 'hui', 'khuy', 'puta', 'puto', 'mierda', 'cabron',
  'merde', 'salope', 'connard', 'putain',
];
/** Roots of ≤ 3 letters only count as a whole token (so "Arsenal", "Kusama", "Huitzil" stay fine). */
const SHORT = new Set(BLOCK_ROOTS.filter((w) => w.length <= 3));

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', $: 's', '!': 'i', '|': 'l' };

export function normaliseForFilter(name: string, one: 'i' | 'l' = 'i'): string {
  return name
    .toLowerCase()
    .split('')
    .map((c) => (c === '1' ? one : (LEET[c] ?? c)))
    .join('')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

export function isOffensive(name: string): boolean {
  // Per token (CamelCase / _ parts), so two innocent words never form a root across their boundary; "1" may be i or l.
  // Alternating capitals ("PuTaMadre") are a disguise, not CamelCase: check those names as one word.
  const letters = name.replace(/[^A-Za-z]/g, '');
  let switches = 0;
  for (let i = 1; i < letters.length; i++) if ((letters[i] === letters[i].toUpperCase()) !== (letters[i - 1] === letters[i - 1].toUpperCase())) switches++;
  const camel = letters.length > 0 && switches / letters.length <= 0.4;
  const parts = (camel ? name.replace(/([a-z])([A-Z])/g, '$1 $2') : name).split(/[\s_]+/).filter(Boolean);
  const variants = (['i', 'l'] as const).flatMap((one) => parts.map((p) => normaliseForFilter(p, one)));
  return variants.some((flat) => offensiveToken(flat));
}

function offensiveToken(flat: string): boolean {
  for (const root of BLOCK_ROOTS) {
    if (SHORT.has(root)) {
      if (flat === root) return true;
    } else if (flat.includes(root)) {
      // Allow a few innocent words that contain a long root.
      if (root === 'sex' && /(sextet|sextant|sussex|essex)/.test(flat)) continue;
      if (root === 'anal' && /(analog|analys|canal|banal)/.test(flat)) continue;
      if (root === 'kill' && /skill/.test(flat)) continue;
      if (root === 'dick' && /(dickens|dickinson)/.test(flat)) continue;
      if (root === 'cock' && /(cockatoo|cockatiel|peacock|hancock)/.test(flat)) continue;
      if (root === 'homo' && /(homophon|homogen)/.test(flat)) continue;
      if (root === 'boob' && /booby/.test(flat)) continue;
      return true;
    }
  }
  return false;
}

export type NickCheck = { ok: true } | { ok: false; why: 'short' | 'long' | 'chars' | 'offensive' };

/** Local rules (the server checks uniqueness). */
export function checkNickname(name: string): NickCheck {
  if (name.length < NICK_MIN) return { ok: false, why: 'short' };
  if (name.length > NICK_MAX) return { ok: false, why: 'long' };
  if (!/^[A-Za-z0-9_]+$/.test(name)) return { ok: false, why: 'chars' };
  if (isOffensive(name)) return { ok: false, why: 'offensive' };
  return { ok: true };
}

export const NICK_WHY: Record<Exclude<NickCheck, { ok: true }>['why'], { en: string; he: string }> = {
  short: { en: 'At least 3 characters', he: 'לפחות 3 תווים' },
  long: { en: 'At most 20 characters', he: 'עד 20 תווים' },
  chars: { en: 'English letters, digits and _ only', he: 'אותיות באנגלית, ספרות ו־_ בלבד' },
  offensive: { en: 'Please pick a friendlier name', he: 'בחרו שם ידידותי יותר' },
};
