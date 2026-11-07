// Songs as exercises (owner 2026-11-07): sing and play phrases of public-domain songs instead of only scales.
// "Sing the song" (singing) and "Play the song" (instrument): hear a phrase of a song — in a key that fits the
// player — and sing it / play it back; higher levels grade the rhythm too and use longer phrases and harder songs.

import type { SingSeqQuestion, Stimulus } from './lesson';
import { placeInRange } from './lesson';
import { pc, type PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { SONGBOOK, songPhrases, songRange, type SongDef, type SongNote } from '../content/songbook';

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
