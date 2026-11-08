// My charts (SPEC-0.48 §P2): type a chord chart, get a backing track in a style, any key and tempo. Pure.
// Chart text: bars split by "|", chords in a bar split the bar evenly, "%" repeats the previous bar, "/" (alone) repeats
// the previous chord inside a bar (e.g. "C / F /" = C for 2 beats, F for 2). Symbols: C, Cm, C7, Cmaj7 (CΔ), Cm7, Cm7b5
// (Cø), Cdim (C°), Cdim7 (C°7), Caug (C+), C6, Cm6, C9, Cmaj9, Cm9, C11, C13, C7b9, C7#9, C7#11, C7alt, Csus4, Csus2,
// C7sus4, Cadd9, C5, with an optional slash bass (C/E).

import type { NoteEvent } from './lesson';

export interface ChartChordEv {
  /** Root pitch class 0–11. */
  root: number;
  /** Intervals above the root (semitones). */
  iv: number[];
  /** Bass pitch class (slash chord), else the root. */
  bass: number;
  /** The symbol as typed (normalised). */
  sym: string;
  beats: number;
  /** Bar index (0-based) and beat inside the bar where it starts. */
  bar: number;
  at: number;
}

export type ChartStyle = 'swing' | 'pop' | 'rock' | 'bossa' | 'ballad' | 'waltz';
export const CHART_STYLES: ChartStyle[] = ['swing', 'pop', 'rock', 'bossa', 'ballad', 'waltz'];
export const STYLE_NAME: Record<ChartStyle, { en: string; he: string }> = {
  swing: { en: 'Swing', he: 'סווינג' },
  pop: { en: 'Pop', he: 'פופ' },
  rock: { en: 'Rock', he: 'רוק' },
  bossa: { en: 'Bossa nova', he: 'בוסה נובה' },
  ballad: { en: 'Ballad', he: 'בלדה' },
  waltz: { en: 'Waltz (3/4)', he: 'ואלס (3/4)' },
};

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL: [RegExp, number[]][] = [
  [/^(maj13|Δ13)$/, [0, 4, 7, 11, 14, 21]],
  [/^(maj7#11|Δ7?#11|maj7♯11|maj9#11)$/, [0, 4, 7, 11, 18]],
  [/^(maj7#5|Δ7?#5|maj7\+5)$/, [0, 4, 8, 11]],
  [/^(13b9|13♭9)$/, [0, 4, 10, 13, 21]],
  [/^(7b13|7♭13)$/, [0, 4, 7, 10, 20]],
  [/^(7#5|7\+5?|aug7|\+7)$/, [0, 4, 8, 10]],
  [/^(7b9sus4?|7♭9sus4?)$/, [0, 5, 7, 10, 13]],
  [/^(9sus4?|13sus4?)$/, [0, 5, 7, 10, 14]],
  [/^(maj9|Δ9)$/, [0, 4, 7, 11, 14]],
  [/^(maj7|Δ7?|M7)$/, [0, 4, 7, 11]],
  [/^(m7b5|m7♭5|ø7?|-7b5)$/, [0, 3, 6, 10]],
  [/^(dim7|°7|o7)$/, [0, 3, 6, 9]],
  [/^(dim|°|o)$/, [0, 3, 6]],
  [/^(aug|\+)$/, [0, 4, 8]],
  [/^(m\(?maj7\)?|mΔ7?|mM7)$/, [0, 3, 7, 11]],
  [/^(m9|-9)$/, [0, 3, 7, 10, 14]],
  [/^(m11|-11)$/, [0, 3, 7, 10, 14, 17]],
  [/^(m7|-7|min7)$/, [0, 3, 7, 10]],
  [/^(m6|-6)$/, [0, 3, 7, 9]],
  [/^(m|-|min)$/, [0, 3, 7]],
  [/^(7sus4?|7sus)$/, [0, 5, 7, 10]],
  [/^sus4?$/, [0, 5, 7]],
  [/^sus2$/, [0, 2, 7]],
  [/^(7b9|7♭9)$/, [0, 4, 7, 10, 13]],
  [/^(7#9|7♯9)$/, [0, 4, 7, 10, 15]],
  [/^(7#11|7♯11)$/, [0, 4, 7, 10, 18]],
  [/^7alt$/, [0, 4, 10, 13, 15, 20]],
  [/^13$/, [0, 4, 7, 10, 14, 21]],
  [/^11$/, [0, 7, 10, 14, 17]],
  [/^9$/, [0, 4, 7, 10, 14]],
  [/^7$/, [0, 4, 7, 10]],
  [/^6\/?9$/, [0, 4, 7, 9, 14]],
  [/^6$/, [0, 4, 7, 9]],
  [/^add9$/, [0, 4, 7, 14]],
  [/^5$/, [0, 7]],
  [/^(maj|M)?$/, [0, 4, 7]],
];

const pcOf = (s: string): number | null => {
  const m = /^([A-Ga-g])([#♯b♭]?)$/.exec(s);
  if (!m) return null;
  const base = LETTER[m[1].toUpperCase()];
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return (base + acc + 12) % 12;
};

/** Parse one chord symbol; null when it is not one. */
export function parseChord(sym: string): { root: number; iv: number[]; bass: number } | null {
  const m = /^([A-G][#♯b♭]?)([^/]*)(?:\/([A-G][#♯b♭]?))?$/.exec(sym.trim());
  if (!m) return null;
  const root = pcOf(m[1]);
  if (root === null) return null;
  const q = QUAL.find(([re]) => re.test(m[2]));
  if (!q) return null;
  const bass = m[3] ? pcOf(m[3]) : root;
  if (bass === null) return null;
  return { root, iv: q[1], bass };
}

export interface ParsedChart {
  chords: ChartChordEv[];
  bars: number;
  /** Tokens that are not chords (shown to the user). */
  errors: string[];
}

/** Parse a whole chart in a meter (beats per bar). */
export function parseChart(text: string, meter = 4): ParsedChart {
  const bars = text
    .replace(/\n/g, '|')
    .split('|')
    .map((b) => b.trim())
    .filter((b) => b.length);
  const chords: ChartChordEv[] = [];
  const errors: string[] = [];
  let prevBar: string[] | null = null;
  bars.forEach((raw, bar) => {
    let toks = raw.split(/\s+/).filter(Boolean);
    if (toks.length === 1 && toks[0] === '%' && prevBar) toks = prevBar;
    prevBar = toks;
    const each = meter / Math.max(1, toks.length);
    let last: ChartChordEv | null = chords.length ? chords[chords.length - 1] : null;
    toks.forEach((tok, k) => {
      if (tok === '/' || tok === '%') {
        if (last) {
          // extend the previous chord (merge when it is in this bar, else repeat it here)
          if (last.bar === bar) last.beats += each;
          else {
            last = { ...last, bar, at: k * each, beats: each };
            chords.push(last);
          }
        }
        return;
      }
      const c = parseChord(tok);
      if (!c) {
        errors.push(tok);
        return;
      }
      last = { ...c, sym: tok, beats: each, bar, at: k * each };
      chords.push(last);
    });
  });
  return { chords, bars: bars.length, errors };
}

/** The chord at a beat of the loop (null for an empty chart). */
export function chordAtBeat(p: ParsedChart, meter: number, beat: number): ChartChordEv | null {
  const total = p.bars * meter;
  if (!total || !p.chords.length) return null;
  const b = ((beat % total) + total) % total;
  let cur: ChartChordEv | null = null;
  for (const c of p.chords) if (c.bar * meter + c.at <= b + 1e-6) cur = c;
  return cur ?? p.chords[0];
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Major keys written with sharps (G D A E B F#); the rest with flats (C has none). */
const SHARP_KEYS = new Set([7, 2, 9, 4, 11, 6]);
/** Transpose every chord symbol in a chart text by n semitones, spelled for the new key (taken from the first chord). */
export function transposeChart(text: string, n: number): string {
  const re = /(^|[\s|])([A-G][#♯b♭]?)([^\s|/]*)(?:\/([A-G][#♯b♭]?))?(?=$|[\s|])/g;
  const first = re.exec(text);
  re.lastIndex = 0;
  let names = FLATS;
  if (first) {
    const r0 = pcOf(first[2]);
    if (r0 !== null) {
      const minor = /^(m(?!aj)|-|min)/.test(first[3]);
      const home = (r0 + n + (minor ? 3 : 0) + 120) % 12;
      names = SHARP_KEYS.has(home) ? SHARPS : FLATS;
    }
  }
  return text.replace(re, (all, pre: string, r: string, q: string, b?: string) => {
    const rp = pcOf(r);
    if (rp === null) return all;
    const nb = b ? pcOf(b) : null;
    return `${pre}${names[(rp + n + 120) % 12]}${q}${nb !== null ? '/' + names[(nb + n + 120) % 12] : ''}`;
  });
}

// ---------------------------------------------------------------- backing tracks

const lowBass = (pc: number) => {
  const m = 36 + pc;
  return m < 40 ? m + 12 : m;
};
/** A close voicing of the chord's colour tones (3rd, 7th / 6th, upper tones) around middle C. */
function voicing(c: ChartChordEv): number[] {
  const tones = c.iv.length >= 4 ? c.iv.slice(1) : c.iv;
  const out = tones.map((x) => 53 + ((c.root + x - 53 + 120) % 12)).sort((a, b) => a - b);
  return [...new Set(out)].slice(0, 4);
}

export interface Backing {
  events: NoteEvent[];
  length: number;
  /** Count-in beats before the chart starts. */
  startBeat: number;
}

/** A backing track for `loops` times through the chart. */
export function chartBacking(p: ParsedChart, style: ChartStyle, bpm: number, loops: number, meterIn = 4, o: { countIn?: boolean; drums?: boolean } = {}): Backing {
  const meter = style === 'waltz' ? 3 : meterIn;
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  const startBeat = o.countIn === false ? 0 : meter;
  const drums = o.drums !== false;
  for (let k = 0; k < startBeat; k++) ev.push({ midi: k === 0 ? 96 : 91, start: k * beat, duration: 0.05, velocity: 0.5, perc: k === 0 ? 'accent' : 'click' });
  const total = p.bars * meter * loops;
  const swing = style === 'swing' ? 2 / 3 : 0.5;
  const N = (midi: number, b: number, dur: number, vel: number, perc?: NoteEvent['perc']) => ev.push({ midi, start: (startBeat + b) * beat, duration: Math.max(0.04, dur * beat), velocity: vel, ...(perc ? { perc } : {}) });
  /** A bass note (played on the upright bass samples). */
  const B = (midi: number, b: number, dur: number, vel: number) => ev.push({ midi, start: (startBeat + b) * beat, duration: Math.max(0.04, dur * beat), velocity: vel, inst: 'bass' });
  for (let b = 0; b < total; b++) {
    const c = chordAtBeat(p, meter, b);
    if (!c) continue;
    const next = chordAtBeat(p, meter, b + 1)!;
    const pos = b % meter;
    const isNew = c.bar * meter + c.at === b % (p.bars * meter);
    const root = lowBass(c.bass);
    const v = voicing(c);
    const fifth = lowBass((c.root + 7) % 12);
    switch (style) {
      case 'swing': {
        const third = root + (c.iv[1] ?? 4);
        const toNext = lowBass(next.bass) + (pos === meter - 1 ? (b % 2 ? 1 : -1) : 0);
        const walk = pos === 0 ? root : pos === 1 ? third : pos === 2 ? lowBass((c.root + (c.iv[2] ?? 7)) % 12) : toNext;
        B(walk, b, 0.9, 0.7);
        if (pos === 0 || pos === 1) for (const m of v) N(m, pos === 0 ? b : b + swing, pos === 0 ? 0.8 : 1.2, 0.4);
        if (drums) {
          N(93, b, 0.05, pos % 2 ? 0.33 : 0.26);
          if (pos % 2 === 1) N(93, b + swing, 0.04, 0.2);
          if (pos % 2 === 1) N(42, b, 0.05, 0.25, 'hat');
        }
        break;
      }
      case 'pop':
      case 'rock': {
        const eighths = style === 'rock';
        B(pos % 2 === 0 || eighths ? root : fifth, b, eighths ? 0.45 : 0.9, 0.7);
        if (eighths) B(root, b + 0.5, 0.45, 0.6);
        if (style === 'pop') {
          for (const m of v) N(m, b, 0.45, isNew && pos === 0 ? 0.45 : 0.32);
          for (const m of v) N(m, b + 0.5, 0.4, 0.26);
        } else for (const m of [c.root, c.root + 7].map((x) => 52 + ((x - 52 + 120) % 12))) N(m, b, 0.9, 0.38);
        if (drums) {
          N(36, b, 0.1, pos % 2 === 0 ? 0.85 : 0.0001, pos % 2 === 0 ? 'kick' : undefined);
          if (pos % 2 === 1) N(38, b, 0.1, 0.75, 'snare');
          N(42, b, 0.05, 0.35, 'hat');
          N(42, b + 0.5, 0.05, 0.25, 'hat');
        }
        break;
      }
      case 'bossa': {
        // Bass: root on 1, fifth on the "and" of 2 … (1, 2&→3); comping on the clave-like syncopation.
        if (pos === 0) B(root, b, 1.4, 0.7);
        if (pos === 1) B(fifth, b + 0.5, 0.45, 0.6);
        if (pos === 2) B(fifth, b, 1.4, 0.65);
        if (pos === 3) B(root, b + 0.5, 0.45, 0.6);
        const hits = (Math.floor(b / meter) % 2 === 0 ? [0, 1.5, 3] : [1, 2.5]).filter((h) => Math.floor(h) === pos);
        for (const h of hits) for (const m of v) N(m, b - pos + h, 0.4, 0.34);
        if (drums) {
          N(42, b, 0.04, 0.22, 'hat');
          N(42, b + 0.5, 0.04, 0.16, 'hat');
          if (pos === 0 || pos === 2) N(36, b, 0.1, 0.5, 'kick');
          if ((Math.floor(b / meter) % 2 === 0 ? [0, 1.5, 3] : [1, 2.5]).some((h) => Math.floor(h) === pos)) N(76, b - pos + ((Math.floor(b / meter) % 2 === 0 ? [0, 1.5, 3] : [1, 2.5]).find((h) => Math.floor(h) === pos) ?? pos), 0.05, 0.4, 'wood');
        }
        break;
      }
      case 'ballad': {
        if (pos === 0 || isNew) B(root, b, 1.9, 0.6);
        if (pos === 0 || isNew) v.forEach((m, k) => N(m, b + k * 0.25, 1.9 - k * 0.25, 0.32));
        if (drums && pos % 2 === 1) N(42, b, 0.05, 0.18, 'hat');
        break;
      }
      case 'waltz': {
        if (pos === 0) B(root, b, 0.9, 0.7);
        else for (const m of v) N(m, b, 0.6, 0.3);
        if (drums) N(42, b, 0.05, pos === 0 ? 0.3 : 0.18, pos === 0 ? 'kick' : 'hat');
        break;
      }
    }
  }
  return { events: ev, length: (startBeat + total) * beat + 0.4, startBeat };
}

// ---------------------------------------------------------------- templates (progressions are free to use)

export interface ChartTemplate {
  id: string;
  title: { en: string; he: string };
  text: string;
  style: ChartStyle;
  bpm: number;
}
export const CHART_TEMPLATES: ChartTemplate[] = [
  { id: 'blues-f', title: { en: 'Blues in F', he: 'בלוז בפה' }, text: 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'swing', bpm: 120 },
  { id: 'jazz-blues', title: { en: 'Jazz blues in Bb', he: 'בלוז ג׳אז בסי במול' }, text: 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | G7 | Cm7 | F7 | Bb7 G7 | Cm7 F7', style: 'swing', bpm: 132 },
  { id: 'minor-blues', title: { en: 'Minor blues in C', he: 'בלוז מינורי בדו' }, text: 'Cm7 | Fm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7', style: 'swing', bpm: 120 },
  { id: 'rhythm-a', title: { en: 'Rhythm changes, A section', he: 'ריתם צ׳יינג׳ס, חלק A' }, text: 'Bb G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Eb Edim7 | Dm7 G7 | Cm7 F7', style: 'swing', bpm: 160 },
  { id: 'two-five-cycle', title: { en: 'ii–V–I through the keys', he: 'ii–V–I בכל הסולמות' }, text: 'Dm7 | G7 | Cmaj7 | % | Cm7 | F7 | Bbmaj7 | % | Bbm7 | Eb7 | Abmaj7 | % | Abm7 | Db7 | Gbmaj7 | %', style: 'swing', bpm: 120 },
  { id: 'minor-two-five', title: { en: 'Minor ii–V–i', he: 'ii–V–i מינורי' }, text: 'Dm7b5 | G7b9 | Cm6 | % ', style: 'swing', bpm: 110 },
  { id: 'turnaround', title: { en: 'I–vi–ii–V', he: 'I–vi–ii–V' }, text: 'Cmaj7 Am7 | Dm7 G7 | Em7 A7 | Dm7 G7', style: 'swing', bpm: 140 },
  { id: 'pop-four', title: { en: 'Pop: I–V–vi–IV', he: 'פופ: I–V–vi–IV' }, text: 'C | G | Am | F', style: 'pop', bpm: 96 },
  { id: 'fifties', title: { en: "'50s: I–vi–IV–V", he: 'שנות ה־50: I–vi–IV–V' }, text: 'C | Am | F | G', style: 'pop', bpm: 84 },
  { id: 'andalusian', title: { en: 'Andalusian cadence', he: 'קדנצה אנדלוסית' }, text: 'Am | G | F | E', style: 'rock', bpm: 100 },
  { id: 'rock-mixo', title: { en: 'Rock: I–bVII–IV', he: 'רוק: I–bVII–IV' }, text: 'D | C | G | D', style: 'rock', bpm: 112 },
  { id: 'bossa', title: { en: 'Bossa vamp', he: 'ווּמפּ בוסה' }, text: 'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7b9 | Dm7 | G7', style: 'bossa', bpm: 128 },
  { id: 'canon', title: { en: 'Canon progression', he: 'מהלך הקאנון' }, text: 'D | A | Bm | F#m | G | D | G | A', style: 'ballad', bpm: 72 },
  { id: 'waltz', title: { en: 'Waltz in G', he: 'ואלס בסול' }, text: 'G | D7 | D7 | G | G | C | D7 | G', style: 'waltz', bpm: 150 },
];

// ---------------------------------------------------------------- improvisation levels (owner 2026-11-08)
// Progressions to improvise over, from one chord to fast-moving, substituted and altered changes. Each level suggests
// rules (improvRules.ts) that fit what it trains; the player can change them. Progressions only — free to use.

export interface ImprovLevel {
  n: number;
  id: string;
  title: { en: string; he: string };
  /** What is new at this level. */
  focus: { en: string; he: string };
  text: string;
  style: ChartStyle;
  bpm: number;
  rules: { note: 'scale' | 'chord-tones' | 'guide-beats' | 'target-3' | null; interval: 'steps' | 'thirds' | null; rhythm: 'eighths' | 'quarters' | 'triplets' | null };
}

export const IMPROV_LEVELS: ImprovLevel[] = [
  { n: 1, id: 'vamp-dorian', title: { en: 'One chord: D dorian vamp', he: 'אקורד אחד: ווּמפּ רה דורי' }, focus: { en: 'Stay in one scale; hear the colour of the 6th', he: 'להישאר בסולם אחד; לשמוע את הצבע של ה־6' }, text: 'Dm7 | % | % | % | Dm7 | % | % | %', style: 'swing', bpm: 100, rules: { note: 'scale', interval: null, rhythm: 'quarters' } },
  { n: 2, id: 'two-chords', title: { en: 'Two chords: Dm7 – G7', he: 'שני אקורדים: Dm7 – G7' }, focus: { en: 'Chord tones as the chord changes', he: 'צלילי אקורד כשהאקורד מתחלף' }, text: 'Dm7 | Dm7 | G7 | G7', style: 'bossa', bpm: 104, rules: { note: 'chord-tones', interval: null, rhythm: 'quarters' } },
  { n: 3, id: 'blues', title: { en: 'Blues in F', he: 'בלוז בפה' }, focus: { en: 'Twelve bars, three chords, the 3rd moving', he: 'שתים־עשרה תיבות, שלושה אקורדים, הטרצה זזה' }, text: 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'swing', bpm: 112, rules: { note: 'target-3', interval: null, rhythm: null } },
  { n: 4, id: 'two-five-one', title: { en: 'ii–V–I in C', he: 'ii–V–I בדו' }, focus: { en: 'Guide tones: 7 falls to 3', he: 'צלילים מנחים: 7 יורד ל־3' }, text: 'Dm7 | G7 | Cmaj7 | Cmaj7', style: 'swing', bpm: 116, rules: { note: 'guide-beats', interval: null, rhythm: 'eighths' } },
  { n: 5, id: 'minor-two-five', title: { en: 'Minor ii–V–i', he: 'ii–V–i מינורי' }, focus: { en: 'Locrian, altered, melodic minor', he: 'לוקרי, אלטרד, מינור מלודי' }, text: 'Dm7b5 | G7alt | Cm6 | Cm6', style: 'swing', bpm: 116, rules: { note: 'scale', interval: null, rhythm: 'eighths' } },
  { n: 6, id: 'turnaround', title: { en: 'I–vi–ii–V turnaround', he: 'טרנאראונד I–vi–ii–V' }, focus: { en: 'Two chords a bar', he: 'שני אקורדים בתיבה' }, text: 'Cmaj7 Am7 | Dm7 G7 | Cmaj7 Am7 | Dm7 G7', style: 'swing', bpm: 126, rules: { note: 'chord-tones', interval: null, rhythm: 'eighths' } },
  { n: 7, id: 'tritone-subs', title: { en: 'Tritone substitutes', he: 'תחליפי טריטון' }, focus: { en: 'Db7 for G7: the line falls by half steps', he: 'Db7 במקום G7: הקו יורד בחצאי טונים' }, text: 'Dm7 | Db7 | Cmaj7 | A7 | Dm7 Ab7 | Gm7 Gb7 | Fmaj7 | E7 A7', style: 'swing', bpm: 126, rules: { note: 'guide-beats', interval: 'steps', rhythm: null } },
  { n: 8, id: 'extensions', title: { en: 'Extensions and alterations', he: 'הרחבות ואלטרציות' }, focus: { en: '9, ♯11, 13, ♭9, ♯9: lydian, lydian dominant, altered', he: '9, ♯11, 13, ♭9, ♯9: לידי, לידי דומיננט, אלטרד' }, text: 'Cmaj9 | Cmaj7#11 | Bm7b5 | E7b9 | Am9 | D7#11 | Dm9 | G7alt', style: 'swing', bpm: 120, rules: { note: 'scale', interval: null, rhythm: 'eighths' } },
  { n: 9, id: 'rhythm-changes', title: { en: 'Rhythm changes (A)', he: 'ריתם צ׳יינג׳ס (A)' }, focus: { en: 'Fast ii–Vs, two a bar', he: 'ii–V מהירים, שניים בתיבה' }, text: 'Bb G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Eb Edim7 | Dm7 G7 | Cm7 F7', style: 'swing', bpm: 160, rules: { note: 'chord-tones', interval: null, rhythm: 'eighths' } },
  { n: 10, id: 'backdoor', title: { en: 'Backdoor and borrowed chords', he: 'בקדור ואקורדים שאולים' }, focus: { en: 'iv7 – ♭VII7 – I, ♭VI, the minor plagal', he: 'iv7 – ♭VII7 – I, ♭VI, הפלגלי המינורי' }, text: 'Cmaj7 | Fm7 Bb7 | Cmaj7 | Abmaj7 | Fm6 | Bb7 | Cmaj7 | Dm7 G7', style: 'ballad', bpm: 76, rules: { note: 'scale', interval: null, rhythm: null } },
  { n: 11, id: 'keys-cycle', title: { en: 'ii–V–Is down in whole steps', he: 'ii–V–I יורדים בטונים' }, focus: { en: 'A new key every two bars', he: 'סולם חדש כל שתי תיבות' }, text: 'Dm7 G7 | Cmaj7 | Cm7 F7 | Bbmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Gbmaj7', style: 'swing', bpm: 132, rules: { note: 'target-3', interval: null, rhythm: 'eighths' } },
  { n: 12, id: 'altered-chain', title: { en: 'Secondary dominants, altered', he: 'דומיננטות משניות, אלטרד' }, focus: { en: 'A chain of altered dominants falling in fifths', he: 'שרשרת דומיננטות אלטרד בקווינטות' }, text: 'E7alt | A7alt | D7alt | G7alt | Cmaj7 | A7b9 | Dm9 | G13', style: 'swing', bpm: 132, rules: { note: 'scale', interval: null, rhythm: 'eighths' } },
  { n: 13, id: 'coltrane', title: { en: 'Coltrane changes', he: 'קולטריין צ׳יינג׳ס' }, focus: { en: 'Three keys a major third apart', he: 'שלושה סולמות במרחק טרצה גדולה' }, text: 'Cmaj7 Eb7 | Abmaj7 B7 | Emaj7 G7 | Cmaj7 | Dm7 G7 | Cmaj7 Eb7 | Abmaj7 B7 | Emaj7', style: 'swing', bpm: 120, rules: { note: 'chord-tones', interval: null, rhythm: null } },
  { n: 14, id: 'coltrane-fast', title: { en: 'Coltrane changes at tempo', he: 'קולטריין צ׳יינג׳ס בטמפו' }, focus: { en: 'Keep the line going through the keys', he: 'להמשיך את הקו דרך הסולמות' }, text: 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7', style: 'swing', bpm: 176, rules: { note: 'guide-beats', interval: null, rhythm: 'eighths' } },
];
