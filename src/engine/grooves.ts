// The metronome's groove bank (owner, 2026-11-07): drum patterns to practise with instead of a click, sorted by
// style. A pattern is one bar on a grid of `sub` steps per beat; each lane is a string, one character per step:
//   x = hit, o = soft (ghost) hit, . = rest.   Lanes: k kick, s snare, h hi-hat, r rim / side-stick (soft snare).
// Original patterns written for the app (common textbook grooves, no recordings). Pure data + helpers.

export type GrooveStyle = 'rock' | 'pop' | 'funk' | 'hiphop' | 'jazz' | 'blues' | 'latin' | 'world' | 'ballad' | 'electronic' | 'odd';

export interface Groove {
  id: string;
  name: { en: string; he: string };
  style: GrooveStyle;
  /** Beats per bar and the beat's note value (4 = quarter, 8 = dotted-quarter feel for 6/8 etc.). */
  beats: number;
  den: 4 | 8;
  /** Steps per beat: 4 = sixteenths, 2 = eighths, 3 = triplets (swing / shuffle / 6/8 pulse). */
  sub: 2 | 3 | 4;
  k: string;
  s: string;
  h: string;
  r?: string;
  /** A comfortable tempo to start at. */
  bpm: number;
  /** What the lanes play (defaults: hat, snare, rim). */
  hatAs?: 'hat' | 'hat-open' | 'ride' | 'shaker' | 'cowbell';
  snareAs?: 'snare' | 'clap';
  rimAs?: 'rim' | 'hat' | 'clap' | 'cowbell';
}

export const STYLE_NAME: Record<GrooveStyle, { en: string; he: string }> = {
  rock: { en: 'Rock', he: 'רוק' },
  pop: { en: 'Pop', he: 'פופ' },
  funk: { en: 'Funk & soul', he: 'פאנק וסול' },
  hiphop: { en: 'Hip-hop & R&B', he: 'היפ־הופ ו־R&B' },
  jazz: { en: 'Jazz', he: 'ג׳אז' },
  blues: { en: 'Blues & shuffle', he: 'בלוז ושאפל' },
  latin: { en: 'Latin', he: 'לטיני' },
  world: { en: 'World & Middle East', he: 'עולם ומזרח' },
  ballad: { en: 'Ballad', he: 'בלדה' },
  electronic: { en: 'Electronic', he: 'אלקטרוני' },
  odd: { en: 'Odd meters', he: 'משקלים אי־זוגיים' },
};

const G = (id: string, en: string, he: string, style: GrooveStyle, beats: number, den: 4 | 8, sub: 2 | 3 | 4, bpm: number, k: string, s: string, h: string, r?: string, as: Pick<Groove, 'hatAs' | 'snareAs' | 'rimAs'> = {}): Groove => ({ id, name: { en, he }, style, beats, den, sub, bpm, k, s, h, r, ...as });
const RIDE = { hatAs: 'ride', rimAs: 'hat' } as const;

export const GROOVES: Groove[] = [
  // rock
  G('rock-8', 'Basic rock', 'רוק בסיסי', 'rock', 4, 4, 2, 100, 'x...x...', '..x...x.', 'xxxxxxxx'),
  G('rock-8b', 'Rock, busy kick', 'רוק, בס עסוק', 'rock', 4, 4, 2, 110, 'x..xx.x.', '..x...x.', 'xxxxxxxx'),
  G('rock-16', 'Rock 16ths', 'רוק שש־עשריות', 'rock', 4, 4, 4, 92, 'x.......x.x.....', '....x.......x...', 'xxxxxxxxxxxxxxxx'),
  G('rock-4floor', 'Driving quarter hats', 'רבעים דוהרים', 'rock', 4, 4, 2, 128, 'x.x.x.x.', '..x...x.', 'x.x.x.x.'),
  G('punk', 'Punk', 'פאנק־רוק', 'rock', 4, 4, 2, 170, 'x.x.x.x.', '.x.x.x.x', 'xxxxxxxx'),
  G('half-time', 'Half-time', 'חצי זמן', 'rock', 4, 4, 2, 140, 'x.....x.', '....x...', 'xxxxxxxx'),
  // pop
  G('pop-1', 'Pop', 'פופ', 'pop', 4, 4, 4, 104, 'x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('pop-2', 'Pop with a lift', 'פופ עם קפיצה', 'pop', 4, 4, 4, 116, 'x..x..x...x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('motown', 'Motown', 'מוטאון', 'pop', 4, 4, 2, 120, 'x.x.x.x.', '..x...x.', 'xxxxxxxx'),
  G('disco', 'Disco', 'דיסקו', 'pop', 4, 4, 4, 118, 'x...x...x...x...', '....x.......x...', '..x...x...x...x.', undefined, { hatAs: 'hat-open' }),
  G('reggae', 'Reggae one-drop', 'רגאיי וואן־דרופ', 'pop', 4, 4, 3, 76, '......x.....', '......x.....', 'x.xx.xx.xx.x'),
  // funk
  G('funk-1', 'Funk', 'פאנק', 'funk', 4, 4, 4, 96, 'x.x.......x..x..', '....x..o.o..x..o', 'xxxxxxxxxxxxxxxx'),
  G('funk-2', 'Funk, open', 'פאנק פתוח', 'funk', 4, 4, 4, 100, 'x..x..x...x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('soul', 'Soul', 'סול', 'funk', 4, 4, 3, 84, 'x.....x.x...', '...x.....x..', 'x.xx.xx.xx.x'),
  G('purdie', 'Half-time shuffle', 'שאפל חצי זמן', 'funk', 4, 4, 3, 86, 'x.....x.x...', '.o.oox.o..o.', 'x.xx.xx.xx.x'.replace(/o/g, 'x')),
  // hip-hop / R&B
  G('boombap', 'Boom bap', 'בום באפ', 'hiphop', 4, 4, 4, 90, 'x......x..x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('trap', 'Trap', 'טראפ', 'hiphop', 4, 4, 4, 70, 'x.........x.....', '........x.......', 'xxxxxxxxxxxx.xxx', undefined, { snareAs: 'clap' }),
  G('rnb', 'R&B', 'R&B', 'hiphop', 4, 4, 4, 80, 'x.....x...x.....', '....x.......x...', 'x.xxx.x.x.xxx.x.'),
  // jazz
  G('swing', 'Swing', 'סווינג', 'jazz', 4, 4, 3, 140, 'x.....x.....', '............', 'x..x.xx..x.x', '...x.....x..', RIDE),
  G('swing-fast', 'Up-tempo swing', 'סווינג מהיר', 'jazz', 4, 4, 3, 220, 'x.....x.....', '............', 'x..x.xx..x.x', '...x.....x..', RIDE),
  G('jazz-waltz', 'Jazz waltz', 'ואלס ג׳אזי', 'jazz', 3, 4, 3, 150, 'x........', '.....o...', 'x..x.xx..', '...x...x.', RIDE),
  G('bossa', 'Bossa nova', 'בוסה נובה', 'latin', 4, 4, 2, 130, 'x..xx..x', '........', 'xxxxxxxx', 'x..x..x...x..x..'.slice(0, 8)),
  G('ballad-brush', 'Brush ballad', 'בלדת מברשות', 'jazz', 4, 4, 3, 66, 'x.....x.....', '...o.....o..', 'x..x.xx..x.x', undefined, RIDE),
  // blues
  G('shuffle', 'Shuffle', 'שאפל', 'blues', 4, 4, 3, 110, 'x.....x.....', '...x.....x..', 'x.xx.xx.xx.x'),
  G('slow-blues', 'Slow blues 12/8', 'בלוז איטי 12/8', 'blues', 4, 4, 3, 58, 'x.....x.....', '...x.....x..', 'xxxxxxxxxxxx', undefined, { hatAs: 'ride' }),
  G('texas', 'Texas shuffle', 'שאפל טקסס', 'blues', 4, 4, 3, 130, 'x.xx.xx.xx.x', '...x.....x..', 'x.xx.xx.xx.x'),
  // latin
  G('samba', 'Samba', 'סמבה', 'latin', 4, 4, 4, 100, 'x..xx..xx..xx..x', '..x...x...x..x..'.replace(/x/g, 'o'), 'xxxxxxxxxxxxxxxx', undefined, { hatAs: 'shaker' }),
  G('songo', 'Songo', 'סונגו', 'latin', 4, 4, 4, 110, '...x..x....x..x.', '..o.x..o..x..o..', 'x.x.x.x.x.x.x.x.', undefined, { rimAs: 'cowbell' }),
  G('cha-cha', 'Cha-cha', 'צ׳ה־צ׳ה', 'latin', 4, 4, 2, 120, 'x...x...', '..x...xx', 'x.x.x.x.', undefined, { hatAs: 'cowbell' }),
  G('clave-32', 'Son clave 3-2', 'קלאבה 3-2', 'latin', 4, 4, 4, 100, 'x.......x.......', '................', 'x.x.x.x.x.x.x.x.', 'x..x...x..x.x...'),
  G('tumbao', 'Tumbao (bass drum)', 'טומבאו', 'latin', 4, 4, 4, 100, '......x.......x.', '................', 'x.x.x.x.x.x.x.x.', '..x.x.....x.x...'),
  // world
  G('maqsum', 'Maqsum', 'מקסום', 'world', 4, 4, 4, 100, 'x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('baladi', 'Baladi', 'בלדי', 'world', 4, 4, 4, 92, 'x.x...x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('saidi', "Sa'idi", 'סעידי', 'world', 4, 4, 4, 104, 'x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.'.replace(/^x/, 'x')),
  G('ayub', 'Ayoub', 'איוב', 'world', 2, 4, 4, 120, 'x..x....', '......x.', 'x.x.x.x.'),
  G('wahda', 'Wahda', 'וואחדה', 'world', 4, 4, 2, 90, 'x.......', '..x.x.x.', 'x.x.x.x.'),
  G('afrobeat', 'Afrobeat', 'אפרוביט', 'world', 4, 4, 4, 110, 'x.....x...x.....', '....x..o.o..x...', 'x.xxx.xxx.xxx.xx', undefined, { hatAs: 'shaker' }),
  G('6-8-afro', 'Afro 6/8', 'אפרו 6/8', 'world', 2, 8, 3, 80, 'x.....', '...x..', 'x.xx.x', undefined, { hatAs: 'cowbell' }),
  // ballad
  G('ballad', 'Ballad', 'בלדה', 'ballad', 4, 4, 2, 70, 'x...x.x.', '..x...x.', 'xxxxxxxx', '..x...x.'),
  G('ballad-68', 'Ballad 6/8', 'בלדה 6/8', 'ballad', 2, 8, 3, 56, 'x.....', '...x..', 'xxxxxx'),
  G('waltz', 'Waltz', 'ואלס', 'ballad', 3, 4, 2, 120, 'x.....', '..x.x.', 'x.x.x.'),
  // electronic
  G('house', 'House', 'האוס', 'electronic', 4, 4, 4, 124, 'x...x...x...x...', '....x.......x...', '..x...x...x...x.', undefined, { hatAs: 'hat-open' }),
  G('dnb', 'Drum & bass', 'דראם אנד בייס', 'electronic', 4, 4, 4, 172, 'x.........x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.'),
  G('dembow', 'Dembow / reggaeton', 'דמבו / רגאטון', 'electronic', 4, 4, 4, 96, 'x...x...x...x...', '...x..x....x..x.', 'x.x.x.x.x.x.x.x.', undefined, { snareAs: 'clap' }),
  // odd meters
  G('five-4', '5/4', '5/4', 'odd', 5, 4, 2, 120, 'x.....x...', '..x.....x.', 'xxxxxxxxxx'),
  G('seven-8', '7/8 (2+2+3)', '7/8 (2+2+3)', 'odd', 7, 8, 2, 220, 'x...x..', '..x...x', 'xxxxxxx'),
  G('seven-4', '7/4', '7/4', 'odd', 7, 4, 2, 110, 'x...x...x.x...', '..x...x...x..x', 'xxxxxxxxxxxxxx'),
  G('nine-8', '9/8 (2+2+2+3)', '9/8 (2+2+2+3)', 'odd', 9, 8, 2, 240, 'x.x.x.x..', '.........', 'xxxxxxxxx'),
];

/** Steps in one bar. For den 8 grooves with sub 2 the "beat" is the eighth itself (one char per eighth). */
export const grooveSteps = (g: Groove) => (g.den === 8 && g.sub === 2 ? g.beats : g.beats * g.sub);

/** Normalise a lane to the bar length (pads with rests / trims). */
export const lane = (s: string | undefined, n: number) => (s ?? '').slice(0, n).padEnd(n, '.');

export type HitKind = 'kick' | 'snare' | 'snare-soft' | 'hat' | 'hat-open' | 'ride' | 'rim' | 'clap' | 'cowbell' | 'shaker';
export interface Hit {
  /** Step index in the bar. */
  step: number;
  kind: HitKind;
  vel: number;
}

/** The hits of one bar, in step order. */
export function grooveHits(g: Groove): Hit[] {
  const n = grooveSteps(g);
  const out: Hit[] = [];
  const add = (str: string | undefined, kind: Hit['kind'], loud: number, soft: number) => {
    const l = lane(str, n);
    for (let i = 0; i < n; i++) {
      if (l[i] === 'x') out.push({ step: i, kind, vel: loud });
      else if (l[i] === 'o') out.push({ step: i, kind: kind === 'snare' ? 'snare-soft' : kind, vel: soft });
    }
  };
  add(g.k, 'kick', 0.95, 0.5);
  add(g.s, g.snareAs ?? 'snare', 0.9, 0.35);
  add(g.h, g.hatAs ?? 'hat', 0.6, 0.32);
  add(g.r, g.rimAs ?? 'rim', 0.7, 0.35);
  return out.sort((a, b) => a.step - b.step);
}

/** Seconds per step at a tempo (the tempo counts the groove's beat; den-8 grooves with sub 2 count eighths). */
export const stepSeconds = (g: Groove, bpm: number) => (g.den === 8 && g.sub === 2 ? 60 / bpm : 60 / bpm / g.sub);

/** Grooves of a style (all when null), in bank order. */
export const groovesOf = (style: GrooveStyle | null) => (style ? GROOVES.filter((g) => g.style === style) : GROOVES);

// ---------------------------------------------------------------- drum kits

/** Recorded kits (CC0 libraries) + a synthesised drum machine. Missing pieces fall back to the classic kit. */
export type DrumKit = 'classic' | 'jazz' | 'club' | 'rock' | 'brush' | 'body' | 'electro';
export const DRUM_KITS: DrumKit[] = ['jazz', 'classic', 'club', 'rock', 'brush', 'electro', 'body'];
export const KIT_NAME: Record<DrumKit, { en: string; he: string }> = {
  jazz: { en: 'Jazz kit (recorded, full dynamics)', he: 'ערכת ג׳אז (מוקלטת, כל הדינמיקות)' },
  classic: { en: 'Classic', he: 'קלאסי' },
  club: { en: 'Jazz club', he: 'מועדון ג׳אז' },
  rock: { en: 'Rock', he: 'רוק' },
  brush: { en: 'Brushes', he: 'מברשות' },
  electro: { en: 'Drum machine', he: 'מכונת תופים' },
  body: { en: 'Body', he: 'גוף' },
};
const KIT_ALL = ['kick', 'snare', 'snare_soft', 'rim', 'hat', 'hat_open', 'ride', 'clap', 'cowbell', 'shaker'];
const KIT_CORE = ['kick', 'snare', 'snare_soft', 'rim', 'hat', 'hat_open', 'ride'];
/** The sample files each recorded kit has (public/samples/kits/<kit>/<id>.wav). */
export const KIT_FILES: Partial<Record<DrumKit, string[]>> = {
  club: [...KIT_CORE, 'cowbell', 'shaker'],
  rock: KIT_CORE,
  brush: KIT_CORE,
  body: KIT_ALL,
};

// ---------------------------------------------------------------- the click metronome

export interface MetroSettings {
  bpm: number;
  beats: number;
  den: 4 | 8;
  /** Per beat: 2 = accent, 1 = normal, 0 = silent. */
  accents: number[];
  /** Clicks between beats: 1 none, 2 eighths, 3 triplets, 4 sixteenths. */
  sub: 1 | 2 | 3 | 4;
  sound: 'click' | 'wood' | 'hat' | 'kit' | 'bell';
  /** The drum kit for grooves and the "kit" click (0.43). */
  kit?: DrumKit;
  /** Groove instead of the click (id), or null. */
  groove: string | null;
  /** Speed trainer: +step BPM every `bars` bars, up to `to`. */
  trainer?: { step: number; bars: number; to: number } | null;
}

export const DEFAULT_METRO: MetroSettings = { bpm: 90, beats: 4, den: 4, accents: [2, 1, 1, 1], sub: 1, sound: 'click', groove: null, trainer: null };

export const clampBpm = (b: number) => Math.max(30, Math.min(260, Math.round(b)));

/** Accent pattern for a meter: accent on 1, and on each group start of compound / odd meters. */
export function defaultAccents(beats: number, den: 4 | 8): number[] {
  const a = Array.from({ length: beats }, () => 1);
  if (beats) a[0] = 2;
  if (den === 8 && beats % 3 === 0) for (let i = 3; i < beats; i += 3) a[i] = 2;
  else if (den === 8 && beats === 7) a[4] = 2; // 2+2+3
  else if (den === 8 && beats === 5) a[3] = 2; // 3+2
  return a;
}

/** Italian tempo name for a BPM. */
export function tempoName(bpm: number): string {
  const T: [number, string][] = [
    [40, 'Grave'],
    [55, 'Largo'],
    [66, 'Adagio'],
    [76, 'Andante'],
    [108, 'Moderato'],
    [120, 'Allegretto'],
    [156, 'Allegro'],
    [176, 'Vivace'],
    [200, 'Presto'],
  ];
  for (const [max, n] of T) if (bpm < max) return n;
  return 'Prestissimo';
}

/** Tap tempo: the BPM from recent tap times (ms), ignoring a stale gap. */
export function tapBpm(taps: number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i > 0 && recent.length < 6; i--) {
    const d = taps[i] - taps[i - 1];
    if (d > 2000) break;
    recent.push(d);
  }
  if (!recent.length) return null;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return clampBpm(60000 / avg);
}
