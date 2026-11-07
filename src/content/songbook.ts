// Songbook (owner 2026-11-07): public-domain songs to practise as real music — sing the phrases, play the melody,
// play the chords. Only melodies and harmonies that are free to use everywhere: traditional / folk tunes and
// composers who died long ago (see docs/research/MUSIC_SOURCES_LEGAL.md). No lyrics are stored (some lyrics or
// translations are still protected); titles only.
//
// Notation (one bar per "|", tokens separated by spaces), in scale degrees of the song's key:
//   degree 1–7, then an optional accidental ("#" / "b"), then octave marks ("," = down, "'" = up), then a length:
//   w = 4 beats, h = 2, q = 1 (default), e = ½, s = ¼; a "." after the length makes it dotted (×1.5).
//   "r" + length = a rest. Beats are quarter notes. Every bar must add up to the meter (pickup bars start with rests).
// Chords: one entry per bar ("|"), several chords in a bar split the bar evenly. Roman numerals of the key:
//   I ii iii IV V vi vii° (upper = major, lower = minor), optional "7"; in minor songs i III iv v V VI VII.

export interface SongDef {
  id: string;
  title: { en: string; he: string };
  /** Who wrote it / where it comes from (public domain). */
  credit: string;
  /** Beats per bar (quarter-note beats; 6/8 = 3). */
  meter: number;
  minor?: boolean;
  /** Written key (tonic pitch class 0–11) — exercises transpose freely. */
  key: number;
  melody: string;
  chords: string;
  /** Bar indices (0-based) where a new phrase starts, after bar 0. */
  phrases: number[];
  /** 1 easy … 5 hard (range, leaps, rhythm). */
  level: number;
  /** Genre / style tag. */
  style: 'folk' | 'classical' | 'children' | 'holiday' | 'spiritual' | 'dance';
}

export interface SongNote {
  /** Semitones from the tonic (can be negative / above the octave); null = rest. */
  semi: number | null;
  /** Scale degree 1–7 (for display), null for a rest. */
  degree: number | null;
  beats: number;
  /** Beat position from the start of the song. */
  at: number;
  bar: number;
}

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const LEN: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

/** Parse one token; throws with the token on a typo. */
export function parseToken(tok: string, minor = false): { semi: number | null; degree: number | null; beats: number } {
  const m = /^(r|[1-7])([#b]?)([,']*)([whqes])?(\.)?$/.exec(tok);
  if (!m) throw new Error(`bad token "${tok}"`);
  const beats = (LEN[m[4] ?? 'q'] ?? 1) * (m[5] ? 1.5 : 1);
  if (m[1] === 'r') return { semi: null, degree: null, beats };
  const d = Number(m[1]);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const oct = [...m[3]].reduce((a, c) => a + (c === "'" ? 12 : -12), 0);
  return { semi: (minor ? MIN : MAJ)[d - 1] + acc + oct, degree: d, beats };
}

/** All notes of a song, with their positions; checks that every bar fills the meter. */
export function songNotes(s: Pick<SongDef, 'melody' | 'meter' | 'minor' | 'id'>): SongNote[] {
  const out: SongNote[] = [];
  let at = 0;
  s.melody
    .split('|')
    .map((b) => b.trim())
    .forEach((bar, bi) => {
      let sum = 0;
      for (const tok of bar.split(/\s+/).filter(Boolean)) {
        const n = parseToken(tok, s.minor);
        out.push({ ...n, at, bar: bi });
        at += n.beats;
        sum += n.beats;
      }
      if (Math.abs(sum - s.meter) > 1e-6) throw new Error(`${s.id}: bar ${bi + 1} has ${sum} beats, meter ${s.meter}`);
    });
  return out;
}

export interface SongChord {
  /** Root in semitones from the tonic. */
  root: number;
  quality: 'maj' | 'min' | 'dim' | 'dom7' | 'min7' | 'maj7';
  at: number;
  beats: number;
  label: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Chords of a song (one or more per bar). */
export function songChords(s: Pick<SongDef, 'chords' | 'meter' | 'minor' | 'id'>): SongChord[] {
  const out: SongChord[] = [];
  s.chords.split('|').forEach((bar, bi) => {
    const cs = bar.trim().split(/\s+/).filter(Boolean);
    cs.forEach((c, i) => {
      const m = /^(b?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o)?(7|maj7)?$/.exec(c);
      if (!m) throw new Error(`${s.id}: bad chord "${c}"`);
      const deg = ROMAN.indexOf(m[2].toUpperCase());
      const scale = s.minor ? MIN : MAJ;
      // In minor songs a major V (raised 7th) is written "V"; the scale degree root comes from natural minor.
      const root = (scale[deg] + (m[1] ? -1 : 0) + 12) % 12;
      const lower = m[2] === m[2].toLowerCase();
      const dim = !!m[3];
      const quality: SongChord['quality'] = dim ? 'dim' : m[4] === 'maj7' ? 'maj7' : m[4] === '7' ? (lower ? 'min7' : 'dom7') : lower ? 'min' : 'maj';
      const beats = s.meter / cs.length;
      out.push({ root, quality, at: bi * s.meter + i * beats, beats, label: c });
    });
  });
  return out;
}

const QUAL: Record<SongChord['quality'], number[]> = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] };
export const chordTones = (c: SongChord) => QUAL[c.quality].map((x) => c.root + x);

/** Chord name in a key, e.g. "Am", "G7", "F#dim". */
export function chordName(c: SongChord, tonic: number, flats = false): string {
  const names = flats ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const n = names[(tonic + c.root) % 12];
  return n + { maj: '', min: 'm', dim: 'dim', dom7: '7', min7: 'm7', maj7: 'maj7' }[c.quality];
}

/** Phrases as note lists (for sing-back / play-back items). */
export function songPhrases(s: SongDef): SongNote[][] {
  const notes = songNotes(s);
  const starts = [0, ...s.phrases];
  return starts.map((b, i) => notes.filter((n) => n.bar >= b && n.bar < (starts[i + 1] ?? Infinity)));
}

/** Lowest and highest semitone of the melody. */
export function songRange(s: SongDef): [number, number] {
  const ss = songNotes(s)
    .map((n) => n.semi)
    .filter((x): x is number => x !== null);
  return [Math.min(...ss), Math.max(...ss)];
}

// ---------------------------------------------------------------- the songs (public domain)

export const SONGBOOK: SongDef[] = [
  {
    id: 'twinkle',
    title: { en: 'Twinkle, Twinkle, Little Star', he: 'כוכב קטן' },
    credit: 'French folk tune (18th c.)',
    meter: 4,
    key: 0,
    melody: '1 1 5 5 | 6 6 5h | 4 4 3 3 | 2 2 1h | 5 5 4 4 | 3 3 2h | 5 5 4 4 | 3 3 2h | 1 1 5 5 | 6 6 5h | 4 4 3 3 | 2 2 1h',
    chords: 'I | IV I | IV I | V I | I IV | I V | I IV | I V | I | IV I | IV I | V I',
    phrases: [4, 8],
    level: 1,
    style: 'children',
  },
  {
    id: 'mary',
    title: { en: 'Mary Had a Little Lamb', he: 'למרי היה כבש קטן' },
    credit: 'Lowell Mason (1830s)',
    meter: 4,
    key: 0,
    melody: '3q. 2e 1 2 | 3 3 3h | 2 2 2h | 3 5 5h | 3q. 2e 1 2 | 3 3 3 3 | 2 2 3 2 | 1w',
    chords: 'I | I | V | I | I | I | V | I',
    phrases: [4],
    level: 1,
    style: 'children',
  },
  {
    id: 'yonatan',
    title: { en: 'Hänschen klein (Yonatan HaKatan)', he: 'יונתן הקטן (המנגינה)' },
    credit: 'German folk tune',
    meter: 4,
    key: 0,
    melody: '5 3 3h | 4 2 2h | 1 2 3 4 | 5 5 5h | 5 3 3h | 4 2 2h | 1 3 5 5 | 1w',
    chords: 'I | V | I | I | I | V | I V | I',
    phrases: [4],
    level: 1,
    style: 'children',
  },
  {
    id: 'jacques',
    title: { en: 'Frère Jacques', he: 'האח יעקב' },
    credit: 'French traditional',
    meter: 4,
    key: 0,
    melody: "1 2 3 1 | 1 2 3 1 | 3 4 5h | 3 4 5h | 5e 6e 5e 4e 3 1 | 5e 6e 5e 4e 3 1 | 1 5, 1h | 1 5, 1h",
    chords: 'I | I | I | I | I | I | I V I | I V I',
    phrases: [2, 4, 6],
    level: 1,
    style: 'folk',
  },
  {
    id: 'london',
    title: { en: 'London Bridge', he: 'גשר לונדון' },
    credit: 'English traditional',
    meter: 4,
    key: 0,
    melody: '5q. 6e 5 4 | 3 4 5h | 2 3 4h | 3 4 5h | 5q. 6e 5 4 | 3 4 5h | 2h 5h | 3 1h.',
    chords: 'I | I | V | I | I | I | V | I',
    phrases: [4],
    level: 1,
    style: 'children',
  },
  {
    id: 'ode',
    title: { en: 'Ode to Joy', he: 'האודה לשמחה' },
    credit: 'Ludwig van Beethoven (1824)',
    meter: 4,
    key: 0,
    melody: '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3q. 2e 2h | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2q. 1e 1h',
    chords: 'I | V | I | I V | I | V | I | V I',
    phrases: [4],
    level: 2,
    style: 'classical',
  },
  {
    id: 'old-macdonald',
    title: { en: 'Old MacDonald', he: 'לדוד משה הייתה חווה (המנגינה)' },
    credit: 'Traditional',
    meter: 4,
    key: 0,
    melody: '1 1 1 5, | 6, 6, 5,h | 3 3 2 2 | 1h. 5, | 1 1 1 5, | 6, 6, 5,h | 3 3 2 2 | 1w',
    chords: 'I | IV I | I V | I | I | IV I | I V | I',
    phrases: [4],
    level: 2,
    style: 'children',
  },
  {
    id: 'yankee',
    title: { en: 'Yankee Doodle', he: 'יאנקי דודל' },
    credit: 'Traditional (18th c.)',
    meter: 4,
    key: 0,
    melody: '1 1 2 3 | 1 3 2 5, | 1 1 2 3 | 1h 7,h | 1 1 2 3 | 4 3 2 1 | 7, 5, 6, 7, | 1h 1h',
    chords: 'I | I V | I | I V | I | IV | V | I',
    phrases: [4],
    level: 2,
    style: 'folk',
  },
  {
    id: 'row',
    title: { en: 'Row, Row, Row Your Boat', he: 'חתירה בסירה' },
    credit: 'Traditional (1852)',
    meter: 3,
    key: 0,
    melody: "1q. 1q. | 1q 2e 3q. | 3q 2e 3q 4e | 5h. | 1'e 1'e 1'e 5e 5e 5e | 3e 3e 3e 1e 1e 1e | 5q 4e 3q 2e | 1h.",
    chords: 'I | I | I | I | I | I | V | I',
    phrases: [4, 6],
    level: 2,
    style: 'children',
  },
  {
    id: 'happy-birthday',
    title: { en: 'Happy Birthday', he: 'יום הולדת שמח (המנגינה)' },
    credit: 'Mildred & Patty Hill (1893), public domain',
    meter: 3,
    key: 0,
    melody: "rh 5,e. 5,s | 6, 5, 1 | 7,h 5,e. 5,s | 6, 5, 2 | 1h 5,e. 5,s | 5 3 1 | 7, 6, 4e. 4s | 3 1 2 | 1h.",
    chords: 'V | I | V | V | I | I | IV | I V | I',
    phrases: [3, 5, 7],
    level: 3,
    style: 'holiday',
  },
  {
    id: 'jingle',
    title: { en: 'Jingle Bells (chorus)', he: "ג'ינגל בלס (פזמון)" },
    credit: 'James Lord Pierpont (1857)',
    meter: 4,
    key: 0,
    melody: '3 3 3h | 3 3 3h | 3 5 1q. 2e | 3w | 4 4 4q. 4e | 4 3 3 3e 3e | 3 2 2 3 | 2h 5h | 3 3 3h | 3 3 3h | 3 5 1q. 2e | 3w | 4 4 4 4 | 4 3 3 3e 3e | 5 5 4 2 | 1w',
    chords: 'I | I | I | I | IV | I | II7 | V | I | I | I | I | IV | I | V | I',
    phrases: [4, 8, 12],
    level: 3,
    style: 'holiday',
  },
  {
    id: 'auld',
    title: { en: 'Auld Lang Syne', he: 'אולד לאנג סיין' },
    credit: 'Scottish traditional',
    meter: 4,
    key: 0,
    melody: "rh. 5, | 1q. 1e 1 3 | 2q. 1e 2 3 | 1q. 1e 3 5 | 6h. 6 | 5q. 3e 3 1 | 2q. 1e 2 3e 2e | 1q. 6,e 6, 5, | 1h. r",
    chords: 'V | I | V | I | IV | I | V | IV V | I',
    phrases: [5],
    level: 3,
    style: 'folk',
  },
  {
    id: 'amazing',
    title: { en: 'Amazing Grace (first half)', he: 'אמייזינג גרייס (חציה הראשון)' },
    credit: 'Traditional American melody (1835)',
    meter: 3,
    key: 0,
    melody: 'rh 5, | 1h 3e 1e | 3h 2 | 1h 6, | 5,h 5, | 1h 3e 1e | 3h 2 | 5h. | 5h.',
    chords: 'V | I | I | IV | I | I | I | V | V',
    phrases: [5],
    level: 3,
    style: 'spiritual',
  },
  {
    id: 'minuet-g',
    title: { en: 'Minuet in G', he: 'מנואט בסול מז׳ור' },
    credit: 'Christian Petzold (Notebook for Anna Magdalena Bach, 1725)',
    meter: 3,
    key: 7,
    melody: "5 1e 2e 3e 4e | 5 1 1 | 6 4e 5e 6e 7e | 1' 1 1 | 4 5e 4e 3e 2e | 3 4e 3e 2e 1e | 7, 1e 2e 3e 1e | 2h. | 5 1e 2e 3e 4e | 5 1 1 | 6 4e 5e 6e 7e | 1' 1 1 | 4 5e 4e 3e 2e | 3 4e 3e 2e 1e | 2 3e 2e 1e 7,e | 1h.",
    chords: 'I | I | IV | I | IV | I | V | V | I | I | IV | I | IV | I | V | I',
    phrases: [4, 8, 12],
    level: 4,
    style: 'classical',
  },
  {
    id: 'greensleeves',
    title: { en: 'Greensleeves', he: 'גרינסליבס' },
    credit: 'English traditional (16th c.)',
    meter: 3,
    minor: true,
    key: 9,
    melody: 'rh 1 | 3h 4 | 5q. 6e 5 | 4h 2 | 7,q. 1e 2 | 3h 1 | 1q. 7#,e 1 | 2h 7#, | 5,h 1 | 3h 4 | 5q. 6e 5 | 4h 2 | 7,q. 1e 2 | 3q. 2e 1 | 7#,q. 6#,e 7#, | 1h.',
    chords: 'i | III | VII | v | VI | III | i | V | i | III | VII | v | VI | i V | V | i',
    phrases: [8],
    level: 4,
    style: 'folk',
  },
  {
    id: 'canon-d',
    title: { en: 'Canon in D (the progression)', he: 'הקאנון ברה מז׳ור (מהלך האקורדים)' },
    credit: 'Johann Pachelbel (c. 1700)',
    meter: 4,
    key: 2,
    melody: "3'h 2'h | 1'h 7h | 6h 5h | 6h 7h | 3'h 2'h | 1'h 7h | 6h 5h | 6h 7h",
    chords: 'I V | vi iii | IV I | IV V | I V | vi iii | IV I | IV V',
    phrases: [4],
    level: 3,
    style: 'classical',
  },
];

export const songbookById = (id: string) => SONGBOOK.find((s) => s.id === id);
