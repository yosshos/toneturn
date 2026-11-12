// Songs as exercises (owner 2026-11-07): sing and play phrases of public-domain songs instead of only scales.
// "Sing the song" (singing) and "Play the song" (instrument): hear a phrase of a song — in a key that fits the
// player — and sing it / play it back; higher levels grade the rhythm too and use longer phrases and harder songs.

import type { ChoiceQuestion, NoteEvent, SingSeqQuestion, Stimulus } from './lesson';
import { placeInRange } from './lesson';
import { pc, type PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { SONGBOOK, songChords, songNotes, songPhrases, songRange, type SongChord, type SongDef, type SongNote } from '../content/songbook';

const KEYS: PitchClass[] = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'].map(pc);
const PC_OF: Record<string, number> = { C: 0, D: 2, Eb: 3, E: 4, F: 5, G: 7, A: 9, Bb: 10 };

/** Major-key songs (the cadence before each phrase is major) at or below a level. */
const songsUpTo = (maxLevel: number) => SONGBOOK.filter((s) => !s.minor && s.level <= maxLevel);

/** A phrase as a playable melody: rests dropped (their time added to the note before), leading rests trimmed. */
export function phraseMelody(notes: SongNote[]): { semis: number[]; beats: number[]; degrees: number[] } {
  const semis: number[] = [];
  const beats: number[] = [];
  const degrees: number[] = [];
  for (const n of notes) {
    if (n.semi === null) {
      if (beats.length) beats[beats.length - 1] += n.beats;
      continue;
    }
    semis.push(n.semi);
    beats.push(n.beats);
    degrees.push(n.degree ?? 1);
  }
  return { semis, beats, degrees };
}

/** A key where the song sits in a comfortable middle range (lowest note ≥ A3-ish for singing, ≥ C4 for playing). */
function placeTonic(s: SongDef, key: PitchClass, lowest: number): number {
  const [lo] = songRange(s);
  const t = placeInRange(PC_OF[key.letter + (key.acc < 0 ? 'b' : '')] ?? 0, 55, 66);
  return t + lo < lowest ? t + 12 : t;
}

/** Phrase count by level: one phrase (1–2), two phrases joined (3–4). */
function pickPhrase(rnd: () => number, s: SongDef, level: number): SongNote[] {
  const ps = songPhrases(s);
  if (level >= 4 && ps.length >= 2) {
    const i = Math.floor(rnd() * (ps.length - 1));
    return [...ps[i], ...ps[i + 1]];
  }
  return pickR(rnd, ps);
}

function songItem(id: string, topic: 'song-sing' | 'song-play', level: number, seed: number): SingSeqQuestion {
  const rnd = rng(seed);
  const maxSong = [1, 1, 2, 3, 4, 4][level - 1] ?? 4;
  const pool = songsUpTo(maxSong).filter((s) => level < 3 || s.level >= Math.max(1, maxSong - 1));
  const s = pickR(rnd, pool.length ? pool : songsUpTo(2));
  const key = pickR(rnd, KEYS);
  const tonic = placeTonic(s, key, topic === 'song-sing' ? 55 : 57);
  const ph = phraseMelody(pickPhrase(rnd, s, level));
  // Short phrases on the first levels: at most 8 notes.
  const cut = level <= 2 ? Math.min(ph.semis.length, level === 1 ? 6 : 8) : ph.semis.length;
  const midis = ph.semis.slice(0, cut).map((x) => tonic + x);
  const beats = ph.beats.slice(0, cut);
  const degrees = ph.degrees.slice(0, cut);
  const bpm = level <= 2 ? 80 : level <= 4 ? 92 : 104;
  const withRhythm = level >= 3;
  const stimulus: Stimulus[] = [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.4 }, { kind: 'melody', midis, beats, bpm }];
  const play = topic === 'song-play' ? (withRhythm ? { beats, bpm } : {}) : undefined;
  return {
    id,
    kind: 'sing-seq',
    key,
    degrees,
    midis,
    choices: [],
    answer: 'accurate',
    stimulus,
    difficulty: 950 + 90 * level + 25 * s.level,
    song: s.id,
    prompt:
      topic === 'song-sing'
        ? { en: `Sing it back — a phrase of “${s.title.en}”`, he: `שירו בחזרה — משפט מתוך „${s.title.he}”` }
        : { en: `Play it back — a phrase of “${s.title.en}”`, he: `נגנו בחזרה — משפט מתוך „${s.title.he}”` },
    ...(topic === 'song-play' ? { skillAs: 'instrument' as const, play } : {}),
    topic: { id: topic, level, seed },
  } as SingSeqQuestion;
}

const LEVELS = [
  { en: 'Easy songs · the opening', he: 'שירים קלים · הפתיחה' },
  { en: 'Easy songs · a whole phrase', he: 'שירים קלים · משפט שלם' },
  { en: 'Folk & classics · with the rhythm', he: 'עממיים וקלאסיים · עם המקצב' },
  { en: 'Two phrases in a row', he: 'שני משפטים ברצף' },
  { en: 'Harder songs, faster', he: 'שירים קשים יותר, מהר יותר' },
];

TOPIC_GEN['song-sing'] = {
  title: { en: 'Sing the song', he: 'לשיר את השיר' },
  skill: 'singing',
  levels: LEVELS,
  gen: (seed, level, id) => songItem(id, 'song-sing', level, seed),
};
TOPIC_TAGS['song-sing'] = (l) => (l >= 3 ? tg(['singing', 'songs', 0.6], ['sequences', 'melody', 0.25], ['timing', 'precision', 0.15]) : tg(['singing', 'songs', 0.7], ['sequences', 'melody', 0.3]));

TOPIC_GEN['song-play'] = {
  title: { en: 'Play the song', he: 'לנגן את השיר' },
  skill: 'instrument',
  forPlays: ['guitar', 'bass', 'keys', 'strings', 'winds'],
  levels: LEVELS,
  gen: (seed, level, id) => songItem(id, 'song-play', level, seed),
};
TOPIC_TAGS['song-play'] = (l) => (l >= 3 ? tg(['instrument', 'songs', 0.6], ['sequences', 'melody', 0.25], ['timing', 'precision', 0.15]) : tg(['instrument', 'songs', 0.7], ['sequences', 'melody', 0.3]));

// ---------------------------------------------------------------- song chords, strummed (guitar)
// GUITAR_DEEPENING (song-play had no step whose answer is a chord): hear a bar of a public-domain song's melody and
// strum the chord under it (levels 1–2), or hear the song with its chords up to a bar and strum the chord that comes
// next under that bar's melody (level 3). The guitar answers by strumming (the recognizer, closed set over the
// choices); the buttons stay as the fallback. Songbook melodies and chord charts only (public domain), in guitar keys.

/** Guitar keys (open chords for I, IV, V and vi): G, C, D, A, E. */
const STRUM_KEYS: { pc: number; key: PitchClass }[] = [7, 0, 2, 9, 4].map((n) => ({ pc: n, key: pc(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][n]) }));
const CHORD_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
/** The diatonic chords a song bar can be asked as (V7 counts as V: the triad is strummed). */
const DEGREES: { id: string; root: number; quality: 'M' | 'm' }[] = [
  { id: 'I', root: 0, quality: 'M' },
  { id: 'ii', root: 2, quality: 'm' },
  { id: 'iii', root: 4, quality: 'm' },
  { id: 'IV', root: 5, quality: 'M' },
  { id: 'V', root: 7, quality: 'M' },
  { id: 'vi', root: 9, quality: 'm' },
];
const degreeOf = (c: SongChord) => DEGREES.find((d) => d.root === c.root && (d.quality === 'M' ? c.quality === 'maj' || c.quality === 'dom7' : c.quality === 'min' || c.quality === 'min7'));
/** The choices per level: I or V; I, IV or V; the four of I–IV–V–vi (ii / iii replace vi when they are the answer). */
const LEVEL_CHOICES = [['I', 'V'], ['I', 'IV', 'V'], ['I', 'IV', 'V', 'vi']];

export interface SongStrumBar {
  song: SongDef;
  bar: number;
  degree: string;
}
/** Bars of the songbook that can be asked at a level: one chord in the bar, among the level's chords, ≥ 2 melody notes. */
export function songStrumBars(level: number): SongStrumBar[] {
  const maxSong = [2, 3, 5][level - 1] ?? 5;
  const out: SongStrumBar[] = [];
  for (const s of SONGBOOK) {
    if (s.minor || s.level > maxSong) continue;
    const cs = songChords(s);
    const notes = songNotes(s);
    const bars = Math.max(...notes.map((n) => n.bar)) + 1;
    for (let b = level === 3 ? 1 : 0; b < bars; b++) {
      const inBar = cs.filter((c) => Math.floor(c.at / s.meter + 1e-9) === b);
      if (inBar.length !== 1) continue;
      const d = degreeOf(inBar[0]);
      if (!d) continue;
      if (level < 3 && !LEVEL_CHOICES[level - 1].includes(d.id)) continue;
      if (notes.filter((n) => n.bar === b && n.semi !== null).length < 2) continue;
      out.push({ song: s, bar: b, degree: d.id });
    }
  }
  return out;
}

function songStrumItem(id: string, level: number, seed: number): ChoiceQuestion {
  const rnd = rng(seed);
  const pool = songStrumBars(level);
  const it = pickR(rnd, pool);
  const s = it.song;
  const k = pickR(rnd, STRUM_KEYS);
  const [lo, hi] = songRange(s);
  let tonic = 60 + k.pc;
  if (tonic + lo < 55) tonic += 12;
  if (tonic + hi > 84) tonic -= 12;
  const notes = songNotes(s);
  const cs = songChords(s);
  const beatS = 60 / (level === 3 ? 92 : 84);
  // Choices (ii / iii take vi's place when they are the answer on level 3).
  const ids = level === 3 && !LEVEL_CHOICES[2].includes(it.degree) ? ['I', it.degree, 'IV', 'V'] : LEVEL_CHOICES[level - 1];
  const choices = DEGREES.filter((d) => ids.includes(d.id)).map((d) => d.id);
  const deg = (x: string) => DEGREES.find((d) => d.id === x)!;
  const symbol = (x: string) => CHORD_NAMES[(k.pc + deg(x).root) % 12] + (deg(x).quality === 'm' ? 'm' : '');
  const names: ChoiceQuestion['names'] = {};
  const strum: NonNullable<ChoiceQuestion['strum']> = {};
  for (const c of choices) {
    names[c] = { en: symbol(c), he: symbol(c) };
    strum[c] = { root: (k.pc + deg(c).root) % 12, quality: deg(c).quality };
  }
  // The heard bars: the target bar's melody (levels 1–2); from the phrase's start (≤ 3 bars before) with the chords, then the target bar's melody alone (level 3).
  const from = level === 3 ? Math.max([0, ...s.phrases].filter((p) => p <= it.bar - 1).pop() ?? 0, it.bar - 3) : it.bar;
  const t0 = from * s.meter;
  const melody = (b0: number, b1: number): NoteEvent[] =>
    notes.filter((n) => n.bar >= b0 && n.bar <= b1 && n.semi !== null).map((n) => ({ midi: tonic + n.semi!, start: (n.at - t0) * beatS, duration: n.beats * beatS * 0.95, velocity: 0.75 }));
  const pad = (root: number, quality: 'M' | 'm', at: number, beats: number): NoteEvent[] => {
    const r = 48 + ((((k.pc + root) % 12) - 48) % 12 + 12) % 12;
    return [0, quality === 'm' ? 3 : 4, 7].map((x) => ({ midi: r + x, start: (at - t0) * beatS, duration: beats * beatS * 0.9, velocity: 0.42 }));
  };
  const context: NoteEvent[] = [];
  for (const c of cs) {
    const b = Math.floor(c.at / s.meter + 1e-9);
    if (b < from || b >= it.bar) continue;
    const d = DEGREES.find((x) => x.root === c.root);
    context.push(...pad(c.root, d?.quality ?? (c.quality === 'min' || c.quality === 'min7' ? 'm' : 'M'), c.at, c.beats));
  }
  const tune = melody(from, it.bar);
  const length = (it.bar + 1 - from) * s.meter * beatS + 0.3;
  const stimulus: Stimulus[] = [{ kind: 'cadence', key: k.key }, { kind: 'rest', duration: 0.4 }, { kind: 'events', events: [...context, ...tune], length }];
  // Compare: the bar with each choice's chord under it.
  const choiceStim: NonNullable<ChoiceQuestion['choiceStim']> = {};
  for (const c of choices) choiceStim[c] = [{ kind: 'events', events: [...context, ...tune, ...pad(deg(c).root, deg(c).quality, it.bar * s.meter, s.meter)], length }];
  const title = s.title;
  // 2026-11-12: guitar strums it, bass plays its root, keys play it (MIDI) or tap — one wording for all three.
  const ask =
    level === 3
      ? { en: `“${title.en}”: which chord comes next? Play it.`, he: `„${title.he}”: איזה אקורד בא עכשיו? נגנו אותו.` }
      : { en: `“${title.en}”: which chord is under this bar? Play it.`, he: `„${title.he}”: איזה אקורד מתחת לתיבה הזו? נגנו אותו.` };
  return {
    id,
    kind: 'choice',
    topic: 'song-strum',
    level,
    seed,
    skill: 'instrument',
    ask,
    names,
    answer: it.degree,
    choices,
    choiceStim,
    strum,
    stimulus,
    difficulty: 1000 + 110 * level + 20 * s.level,
  };
}

TOPIC_GEN['song-strum'] = {
  title: { en: 'Play the song’s chords', he: 'לנגן את אקורדי השיר' },
  skill: 'instrument',
  // Guitar strums (StrumChoice); bass plays the root and keys the chord (ChordPlayChoice, 2026-11-12).
  forPlays: ['guitar', 'bass', 'keys', 'piano'],
  levels: [
    { en: 'Under this bar: I or V', he: 'מתחת לתיבה: I או V' },
    { en: 'Under this bar: I, IV or V', he: 'מתחת לתיבה: I‏, IV או V' },
    { en: 'The next chord of the song', he: 'האקורד הבא בשיר' },
  ],
  gen: (seed, level, id) => songStrumItem(id, level, seed),
};
TOPIC_TAGS['song-strum'] = () => tg(['instrument', 'songs', 0.6], ['cadences', 'progression', 0.4]);
