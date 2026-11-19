// AUDIT-6 Stage B, Ear (docs/research/AUDIT-6-LEVELS-EAR-JAZZ-VOICE.md §1.4 priorities 3–6): the beginner band of the
// Ear course had no rhythm clap-back, descending intervals only at 1450, the triad member only in the jazz pack, and
// "which note changed" only at 1300. Four general Ear topics:
//
//   rhythm-echo     hear a rhythm on the snare, then tap it back without seeing it (ABRSM / RCM clap-back), 720–1200:
//                   one bar of quarters and halves → two bars, 3/4 or 4/4 → 8ths → two bars of 8ths → dotted rhythms →
//                   3/4 and 6/8 → syncopation. Graded like reading (gradeReading), the notation shown with the result.
//   intervals-down  descending intervals from 800, mirroring the ascending ladder: 3rds → 4th and 5th → 3rds, 4th, 5th,
//                   octave → adding 2nds and 6ths → all twelve
//   chord-member    root, 3rd or 5th of the chord? (RCM level 3), ~950–1100: root position → inversions → the top note
//   melody-change   where did the melody change? ~820–1080: near the start or the end → which note → which note in a
//                   longer tune → which note, and was it higher or lower
//
// Every item is generated from its seed (key, register, rhythm): nothing to learn by heart. Pure.

import type { ChoiceQuestion, RhythmReadQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, chordStim, notesStim, nm, pcName, pcNameHe } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { rhythmAt, type Meter, type RhythmLevel } from './rhythm';

const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
const MAJ = [0, 2, 4, 5, 7, 9, 11];

// ---------------------------------------------------------------- rhythm-echo

/** The echo ladder: reading level, bars, meters, tempos, rating. */
export const ECHO_LADDER: { rlevel: RhythmLevel; bars: number; meters: Meter[]; bpm: number[]; difficulty: number; en: string; he: string }[] = [
  { rlevel: 1, bars: 1, meters: ['4/4'], bpm: [72, 80], difficulty: 720, en: 'One bar: quarters and halves', he: 'תיבה אחת: רבעים וחצאים' },
  { rlevel: 1, bars: 2, meters: ['4/4', '3/4'], bpm: [76, 84], difficulty: 800, en: 'Two bars, 3/4 or 4/4', he: 'שתי תיבות, 3/4 או 4/4' },
  { rlevel: 2, bars: 1, meters: ['4/4'], bpm: [72, 80], difficulty: 880, en: 'Eighth notes', he: 'שמיניות' },
  { rlevel: 2, bars: 2, meters: ['4/4', '3/4'], bpm: [76, 84], difficulty: 960, en: 'Two bars with eighths', he: 'שתי תיבות עם שמיניות' },
  { rlevel: 3, bars: 2, meters: ['4/4'], bpm: [72, 80], difficulty: 1050, en: 'Dotted rhythms', he: 'מקצבים מנוקדים' },
  { rlevel: 7, bars: 2, meters: ['3/4', '6/8'], bpm: [60, 66], difficulty: 1130, en: '3/4 and 6/8', he: '3/4 ו־6/8' },
  { rlevel: 5, bars: 2, meters: ['4/4'], bpm: [72, 80], difficulty: 1200, en: 'Syncopation', he: 'סינקופה' },
];

TOPIC_GEN['rhythm-echo'] = {
  title: { en: 'Rhythm echo: hear it, tap it back', he: 'הד קצבי: שומעים ומקישים בחזרה' },
  skill: 'rhythm-dictation',
  levels: ECHO_LADDER.map((x) => ({ en: x.en, he: x.he })),
  gen(seed, level, id): RhythmReadQuestion {
    const L = ECHO_LADDER[Math.min(ECHO_LADDER.length, Math.max(1, level)) - 1];
    const rnd = rng(seed);
    const meter = pickR(rnd, L.meters);
    const rhythm = rhythmAt(L.rlevel, L.bars, (seed >>> 0) ^ 0x9e3779b9, meter);
    return {
      id,
      kind: 'rhythm-read',
      level: L.rlevel,
      rhythm,
      bpm: pickR(rnd, L.bpm),
      show: 'notation',
      byEar: true,
      choices: [],
      answer: 'accurate',
      stimulus: [],
      difficulty: L.difficulty,
      prompt: { en: 'Hear the rhythm, then tap it back', he: 'שמעו את הקצב, ואז הקישו אותו בחזרה' },
      skillAs: 'rhythm-dictation',
      topic: { id: 'rhythm-echo', level, seed },
    };
  },
};
TOPIC_TAGS['rhythm-echo'] = tg(['rhythm-dictation', 'dictate', 0.6], ['rhythm', 'memory', 0.4]);

// ---------------------------------------------------------------- intervals-down

const IV_DOWN = [
  { s: 1, en: 'minor 2nd', he: 'סקונדה קטנה', say: ['m2', 'half step'] },
  { s: 2, en: 'major 2nd', he: 'סקונדה גדולה', say: ['M2', 'whole step'] },
  { s: 3, en: 'minor 3rd', he: 'טרצה קטנה', say: ['m3'] },
  { s: 4, en: 'major 3rd', he: 'טרצה גדולה', say: ['M3'] },
  { s: 5, en: 'perfect 4th', he: 'קוורטה זכה', say: ['P4', 'fourth'] },
  { s: 6, en: 'tritone', he: 'טריטון', say: ['tritone', 'טריטון'] },
  { s: 7, en: 'perfect 5th', he: 'קווינטה זכה', say: ['P5', 'fifth'] },
  { s: 8, en: 'minor 6th', he: 'סקסטה קטנה', say: ['m6'] },
  { s: 9, en: 'major 6th', he: 'סקסטה גדולה', say: ['M6'] },
  { s: 10, en: 'minor 7th', he: 'ספטימה קטנה', say: ['m7'] },
  { s: 11, en: 'major 7th', he: 'ספטימה גדולה', say: ['M7'] },
  { s: 12, en: 'octave', he: 'אוקטבה', say: ['octave'] },
];
/** The descending ladder: the intervals of each level (semitones) and its rating. */
// AUDIT-7 #5: the descending ladder opens at 830, after the ascending one (intervals-all 1, 780).
export const DOWN_LADDER: { pool: number[]; difficulty: number; en: string; he: string }[] = [
  { pool: [3, 4], difficulty: 830, en: 'Down: minor or major 3rd', he: 'יורדים: טרצה קטנה או גדולה' },
  { pool: [5, 7], difficulty: 880, en: 'Down: 4th or 5th', he: 'יורדים: קוורטה או קווינטה' },
  { pool: [3, 4, 5, 7, 12], difficulty: 960, en: 'Down: 3rds, 4th, 5th, octave', he: 'יורדים: טרצות, קוורטה, קווינטה, אוקטבה' },
  { pool: [1, 2, 3, 4, 5, 7, 8, 9, 12], difficulty: 1060, en: 'Down: adding 2nds and 6ths', he: 'יורדים: עם סקונדות וסקסטות' },
  { pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], difficulty: 1150, en: 'Down: all twelve', he: 'יורדים: כל השנים־עשר' },
];

TOPIC_GEN['intervals-down'] = {
  title: { en: 'Intervals going down', he: 'מרווחים יורדים' },
  skill: 'intervals',
  levels: DOWN_LADDER.map((x) => ({ en: x.en, he: x.he })),
  gen(seed, level, id): ChoiceQuestion {
    const L = DOWN_LADDER[Math.min(DOWN_LADDER.length, Math.max(1, level)) - 1];
    const rnd = rng(seed);
    const pool = IV_DOWN.filter((x) => L.pool.includes(x.s));
    const ans = pickR(rnd, pool);
    const choices = pool.length <= 5 ? pool : shuffleR(rnd, [ans, ...pool.filter((x) => x !== ans).sort((a, b) => Math.abs(a.s - ans.s) - Math.abs(b.s - ans.s)).slice(0, 3)]);
    const top = 64 + Math.floor(rnd() * 8);
    const play = (s: number): Stimulus[] => [notesStim([top, top - s], 0.8)];
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const c of choices) {
      names[`d${c.s}`] = nm(c.en, c.he, ...c.say);
      choiceStim[`d${c.s}`] = play(c.s);
    }
    return {
      kind: 'choice', id, topic: 'intervals-down', level, seed, skill: 'intervals', difficulty: L.difficulty,
      ask: { en: 'The second note is lower. Which interval?', he: 'הצליל השני נמוך יותר. איזה מרווח?' },
      names, answer: `d${ans.s}`, choices: choices.map((c) => `d${c.s}`), stimulus: play(ans.s), choiceStim,
    };
  },
};
TOPIC_TAGS['intervals-down'] = tg(['intervals', 'melodic', 1]);

// ---------------------------------------------------------------- chord-member

export const MEMBER_LADDER: { difficulty: number; en: string; he: string }[] = [
  { difficulty: 950, en: 'Root, 3rd or 5th? Root position', he: 'שורש, טרצה או קווינטה? מצב יסודי' },
  { difficulty: 1030, en: 'Root, 3rd or 5th? Inversions', he: 'שורש, טרצה או קווינטה? היפוכים' },
  { difficulty: 1100, en: 'The top note: root, 3rd or 5th?', he: 'הצליל העליון: שורש, טרצה או קווינטה?' },
];

TOPIC_GEN['chord-member'] = {
  title: { en: 'Root, 3rd or 5th of the chord?', he: 'שורש, טרצה או קווינטה של האקורד?' },
  skill: 'chords',
  levels: MEMBER_LADDER.map((x) => ({ en: x.en, he: x.he })),
  gen(seed, level, id): ChoiceQuestion {
    const L = MEMBER_LADDER[Math.min(MEMBER_LADDER.length, Math.max(1, level)) - 1];
    const rnd = rng(seed);
    const root = 55 + Math.floor(rnd() * 8);
    const minor = rnd() < 0.5;
    const tones = [0, minor ? 3 : 4, 7];
    const which = Math.floor(rnd() * 3);
    // Level 1: root position; 2: an inversion (the bass is the 3rd or the 5th); 3: the note asked is the chord's top.
    const inv = level === 1 ? 0 : 1 + Math.floor(rnd() * 2);
    const voiced = tones.map((x, i) => root + x + (i < inv ? 12 : 0)).sort((a, b) => a - b);
    const memberIn = (k: number) => voiced.find((p) => (((p - root) % 12) + 12) % 12 === tones[k])!;
    // Level 3: a block chord with the member on top, the other two close under it, the root in the bass.
    const topVoicing = (k: number) => {
      const top = root + tones[k] + 12;
      return [root - 12, ...tones.filter((_, i) => i !== k).map((x) => root + x + (root + x + 12 < top ? 12 : 0)), top];
    };
    const sound = (k: number, len = 1.4): Stimulus[] => (level >= 3 ? [chordStim(topVoicing(k), 1.6)] : [chordStim(voiced, len), rest(0.35), notesStim([memberIn(k)], 1.0)]);
    const ids = ['r1', 'r3', 'r5'];
    const names: ChoiceQuestion['names'] = { r1: nm('Root', 'שורש', 'root', 'one'), r3: nm('3rd', 'טרצה', 'third', 'three'), r5: nm('5th', 'קווינטה', 'fifth', 'five') };
    const stimulus = sound(which);
    const choiceStim: Record<string, Stimulus[]> = Object.fromEntries([0, 1, 2].map((k) => [ids[k], sound(k, 1.2)]));
    const chord = `${pcName(root)}${minor ? 'm' : ''}`;
    const chordHe = `${pcNameHe(root)}${minor ? ' מינור' : ''}`;
    return {
      kind: 'choice', id, topic: 'chord-member', level, seed, skill: 'chords', difficulty: L.difficulty,
      ask: level >= 3 ? { en: 'The top note of the chord: root, 3rd or 5th?', he: 'הצליל העליון באקורד: שורש, טרצה או קווינטה?' } : { en: 'A chord, then one of its notes: root, 3rd or 5th?', he: 'אקורד, ואז אחד מצליליו: שורש, טרצה או קווינטה?' },
      text: { en: chord, he: chordHe },
      names, answer: ids[which], choices: ids, stimulus, choiceStim,
    };
  },
};
TOPIC_TAGS['chord-member'] = tg(['chords', 'quality', 0.6], ['degrees', 'diatonic', 0.4]);

// ---------------------------------------------------------------- melody-change

export const CHANGE_LADDER: { n: number; difficulty: number; en: string; he: string }[] = [
  { n: 6, difficulty: 820, en: 'Near the start or near the end?', he: 'קרוב להתחלה או קרוב לסוף?' },
  { n: 4, difficulty: 900, en: 'Which note changed? (4 notes)', he: 'איזה צליל השתנה? (4 צלילים)' },
  { n: 6, difficulty: 1000, en: 'Which note changed? (6 notes)', he: 'איזה צליל השתנה? (6 צלילים)' },
  { n: 4, difficulty: 1080, en: 'Which note, higher or lower?', he: 'איזה צליל, גבוה או נמוך יותר?' },
];
/** A diatonic tune of n notes from the tonic (steps and small skips), as MIDI. */
export function changeTune(rnd: () => number, n: number, tonic: number): number[] {
  const ds = [0];
  for (let i = 1; i < n; i++) {
    let d = ds[i - 1] + pickR(rnd, [-2, -1, 1, 1, 2, 2, -1]);
    d = Math.max(-2, Math.min(7, d));
    if (d === ds[i - 1]) d += 1;
    ds.push(d);
  }
  return ds.map((d) => tonic + 12 * Math.floor(d / 7) + MAJ[((d % 7) + 7) % 7]);
}

TOPIC_GEN['melody-change'] = {
  title: { en: 'Where did the melody change?', he: 'איפה המנגינה השתנתה?' },
  skill: 'sequences',
  levels: CHANGE_LADDER.map((x) => ({ en: x.en, he: x.he })),
  gen(seed, level, id): ChoiceQuestion {
    const L = CHANGE_LADDER[Math.min(CHANGE_LADDER.length, Math.max(1, level)) - 1];
    const rnd = rng(seed);
    const tonic = 60 + Math.floor(rnd() * 7);
    const a = changeTune(rnd, L.n, tonic);
    // The changed note: never the first (the tune must start the same); a step or a skip away, never the same pitch.
    const pos = 1 + Math.floor(rnd() * (L.n - 1));
    const up = rnd() < 0.5;
    const b = a.slice();
    b[pos] = a[pos] + (up ? pickR(rnd, [2, 3, 4]) : -pickR(rnd, [2, 3, 4]));
    const play = (x: number[]): Stimulus[] => [notesStim(a, 0.45), rest(0.8), notesStim(x, 0.45)];
    const base = { kind: 'choice' as const, id, topic: 'melody-change', level, seed, skill: 'sequences' as const, difficulty: L.difficulty, stimulus: play(b) };
    if (level === 1) {
      const half = pos < L.n / 2 ? 'start' : 'end';
      return {
        ...base,
        ask: { en: 'The tune again, one note changed: near the start or near the end?', he: 'המנגינה שוב, צליל אחד השתנה: קרוב להתחלה או קרוב לסוף?' },
        names: { start: nm('Near the start', 'קרוב להתחלה', 'start', 'beginning'), end: nm('Near the end', 'קרוב לסוף', 'end') },
        answer: half,
        choices: ['start', 'end'],
      };
    }
    const noteIds = Array.from({ length: L.n - 1 }, (_, i) => `n${i + 2}`);
    if (level <= 3)
      return {
        ...base,
        ask: { en: 'The tune again, one note changed: which one?', he: 'המנגינה שוב, צליל אחד השתנה: איזה?' },
        names: Object.fromEntries(noteIds.map((k, i) => [k, nm(`Note ${i + 2}`, `צליל ${i + 2}`, String(i + 2))])),
        answer: `n${pos + 1}`,
        choices: noteIds,
      };
    const ids = noteIds.flatMap((k) => [`${k}u`, `${k}d`]);
    return {
      ...base,
      ask: { en: 'Which note changed, and did it go higher or lower?', he: 'איזה צליל השתנה, והאם עלה או ירד?' },
      names: Object.fromEntries(noteIds.flatMap((k, i) => [[`${k}u`, nm(`${i + 2} ↑`, `${i + 2} ↑`, `${i + 2} higher`)], [`${k}d`, nm(`${i + 2} ↓`, `${i + 2} ↓`, `${i + 2} lower`)]])),
      answer: `n${pos + 1}${up ? 'u' : 'd'}`,
      choices: ids,
    };
  },
};
TOPIC_TAGS['melody-change'] = tg(['sequences', 'melody', 1]);
