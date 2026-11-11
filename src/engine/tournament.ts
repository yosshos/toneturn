// Tournament rules (spec addendum I): same item for every player at the same moment, scored on
// accuracy and speed (spec J tournament points). Pure: set generation, round scoring, standings, share text.

import {
  cadenceQuestion,
  DEGREE_KEYS,
  degreeQuestion,
  intervalQuestion,
  mulberry32,
  pick,
  qualityQuestion,
  ROOT_NAMES,
  type Question,
  type Quality,
} from './lesson';
import { pc } from './pitch';
import { degreeSeqQuestion, modeChoices, modeIdQuestion, MODE_ID_LEVELS, rhythmDictQuestion, singQuestion, tfQuestion, wrongNoteQuestion, WRONG_NOTE_LEVELS } from './lesson';
import type { RhythmLevel } from './rhythm';
import { MODE_STEPS } from './modes';
import { tfItem } from './truefalse';
import { factItem, factQuestion, factSeedInfo } from './theoryFacts';
import { tournamentPoints } from './scoring';
import { genTopic, TOPIC_GEN } from './topicKit';
import './topics';
import { bandTiers, seedTier, tierDifficulty, tierIndex, type DailyBand, type DynName } from './gameTiers';

export const ROUND_WINDOW_MS = 10_000;
export const MIN_HUMAN_MS = 150; // faster than this is not a reaction to the sound

export type SetKind = 'mixed' | 'degrees' | 'chords' | 'intervals' | 'modes' | 'wrong-notes' | 'truefalse' | 'echo' | 'beat' | 'vocal-hold' | 'jazz';

/** Answer window per kind (memory and vocal rounds need longer). */
export const WINDOW_MS: Record<SetKind, number> = { jazz: 12_000, mixed: 10_000, degrees: 10_000, chords: 10_000, intervals: 10_000, modes: 12_000, 'wrong-notes': 12_000, truefalse: 8_000, echo: 25_000, beat: 12_000, 'vocal-hold': 15_000 };

/** Kinds that work on one device with two players (split-screen buttons). */
export const DUEL_KINDS: SetKind[] = ['mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'beat', 'jazz'];

// ---------------------------------------------------------------- level tiers (GAMES_TIERS_PLAN §2.4 social sets)

/** A topic item for a duel button pad: at most 4 choices (the answer kept), the topic's own stimulus. */
function topicItem(topic: string, level: number, seed: number, id: string): Question | null {
  if (!TOPIC_GEN[topic]) return null;
  const q = genTopic(topic, seed >>> 0, Math.min(level, TOPIC_GEN[topic].levels.length), id);
  if (q.kind !== 'choice' || !q.stimulus.length) return null;
  if (q.choices.length <= 4) return q;
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const others = q.choices.filter((c) => c !== q.answer).sort(() => rnd() - 0.5).slice(0, 3);
  return { ...q, choices: q.choices.filter((c) => c === q.answer || others.includes(c)) };
}

/** Topic levels per tier and kind (pp keeps the original beginner items, except the jazz set). */
const TIER_TOPICS: Partial<Record<Exclude<SetKind, 'mixed'> | 'cadences', Partial<Record<DynName, [string, number][]>>>> = {
  chords: { p: [['triads', 2]], mp: [['seventh-chords', 1], ['seventh-chords', 2]], mf: [['seventh-chords', 3], ['seventh-chords', 4]], f: [['extensions', 1], ['extensions', 3]], ff: [['extensions', 2], ['extensions', 6]] },
  intervals: { p: [['intervals-all', 2]], mp: [['intervals-all', 4]], mf: [['intervals-all', 3]], f: [['compound-intervals', 1], ['compound-intervals', 2]], ff: [['compound-intervals', 3]] },
  degrees: { p: [['degrees-ext', 1]], mp: [['degrees-ext', 1], ['degrees-ext', 2]], mf: [['degrees-ext', 2], ['degrees-ext', 4]], f: [['degrees-ext', 3], ['degrees-ext', 4]], ff: [['degrees-ext', 3], ['degrees-ext', 4]] },
  cadences: { p: [['harmonic-dictation', 1]], mp: [['harmonic-dictation', 2], ['progressions', 1]], mf: [['harmonic-dictation', 5], ['turnarounds', 1]], f: [['turnarounds', 2], ['chromatic-harmony', 4]], ff: [['turnarounds', 3], ['chromatic-harmony', 6]] },
  modes: { ff: [['chord-scale', 3], ['chord-scale', 2]] },
  // The jazz set (EAR_THEORY_AUDIT): sevenths → extensions → changes → voicings → altered.
  jazz: { pp: [['seventh-chords', 1]], p: [['seventh-chords', 2], ['seventh-chords', 3]], mp: [['extensions', 1], ['turnarounds', 1]], mf: [['voicings', 1], ['turnarounds', 2], ['extensions', 5]], f: [['extensions', 6], ['chromatic-harmony', 4], ['voicings', 3]], ff: [['extensions', 2], ['turnarounds', 3], ['voicings', 4], ['extensions', 8]] },
};

/** A tournament item must be answerable by buttons (≤ 4 choices) and fair for everyone. */
export function tournamentItem(kind: Exclude<SetKind, 'mixed'> | 'cadences', seed: number, id: string, round = 0, tier: DynName = 'pp'): Question {
  const rnd = mulberry32(seed);
  const ti = tierIndex(tier);
  const pool = TIER_TOPICS[kind]?.[tier];
  if (pool?.length) {
    const [topic, level] = pool[Math.floor(rnd() * pool.length)];
    const q = topicItem(topic, level, seed, id);
    if (q) return q;
  }
  switch (kind) {
    case 'jazz':
      return tournamentItem('chords', seed, id, round, 'mp');
    case 'modes': {
      // pp keeps the original seven modes; p / mp start with fewer, mf+ all seven (ff: melodic-minor scales above).
      const L = MODE_ID_LEVELS[ti === 1 ? 1 : ti === 2 ? 2 : 3];
      const mode = pick(rnd, L.pool);
      return modeIdQuestion(id, pc(pick(rnd, ['C', 'D', 'F', 'G', 'A'])), mode, modeChoices(mode, L.pool, 4, rnd), 'updown', 0.34, 1200);
    }
    case 'wrong-notes': {
      for (let k = 0; k < 50; k++) {
        const L = WRONG_NOTE_LEVELS[ti === 0 ? 1 + Math.floor(rnd() * 3) : Math.min(3, 1 + Math.floor(ti / 2))];
        const mode = pick(rnd, L.pool);
        const n = MODE_STEPS[mode].length;
        const q = wrongNoteQuestion(id, pc(pick(rnd, ['C', 'D', 'F', 'G', 'A'])), mode, 2 + Math.floor(rnd() * (n - 2)), rnd() < 0.5 ? 1 : -1, 0.36, L.base);
        if (q) return q;
      }
      return wrongNoteQuestion(id, pc('C'), 'ionian', 3, -1, 0.4, 1000)!;
    }
    case 'truefalse':
      return tfQuestion(id, tfItem(ti === 0 ? 2 : ti <= 2 ? 1 : ti <= 3 ? 2 : 3, rnd), false, ti === 0 ? 1100 : tierDifficulty(tier));
    case 'echo': {
      // Echo Chain, together: the melody grows by a note every two rounds.
      const len = Math.min(9, 3 + Math.floor(ti / 2) + Math.floor(round / 2));
      const degrees = Array.from({ length: len }, () => pick(rnd, ti === 0 ? [1, 2, 3, 5] : ti === 1 ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5, 6, 7]));
      return degreeSeqQuestion(id, pick(rnd, DEGREE_KEYS), degrees, 1100 + 40 * len);
    }
    case 'beat':
      return rhythmDictQuestion(id, (ti === 0 ? Math.min(4, 1 + Math.floor(round / 3)) : Math.min(8, [0, 2, 3, 5, 6, 7][ti] + (round % 2))) as RhythmLevel, 1, (seed >>> 0) % 100000);
    case 'vocal-hold': {
      const q = singQuestion(id, pick(rnd, DEGREE_KEYS), 1);
      return { ...q, stimulus: [{ kind: 'note', midi: q.targetMidi, duration: 1.4 }] };
    }
    case 'degrees':
      return degreeQuestion(id, pick(rnd, DEGREE_KEYS), pick(rnd, [1, 3, 5]), [1, 3, 5], 1050);
    case 'chords':
      return qualityQuestion(id, pc(pick(rnd, ROOT_NAMES)), pick(rnd, ['maj', 'min', 'dim', 'aug'] as Quality[]), ['maj', 'min', 'dim', 'aug'], false, 1250);
    case 'intervals':
      return intervalQuestion(id, 53 + Math.floor(rnd() * 10), pick(rnd, ['M3', 'P5', 'P8'] as const), rnd() < 0.5 ? 'melodic' : 'harmonic');
    case 'cadences':
      return cadenceQuestion(id, pick(rnd, DEGREE_KEYS), pick(rnd, ['resolved', 'open'] as const));
  }
}

/** Choir rooms (spec V.3) are vocal-hold rooms whose seed is 2^32 or more (no server change needed). */
export const CHOIR_SEED = 2 ** 32;
export const isChoirSeed = (seed: number) => seed >= CHOIR_SEED;

/** A choir round: a chord; every player sings one of its notes (their part), all at once. */
function choirItem(seed: number, id: string, round: number): Question {
  const rnd = mulberry32(seed);
  const key = pick(rnd, DEGREE_KEYS);
  const q = singQuestion(id, key, 1);
  const r = q.targetMidi;
  const shapes = round < 2 ? [[0, 4, 7]] : round < 4 ? [[0, 4, 7], [0, 3, 7]] : [[0, 4, 7, 10], [0, 3, 7, 10], [0, 4, 7, 11]];
  const shape = pick(rnd, shapes);
  return { ...q, stimulus: [{ kind: 'chord', midis: shape.map((x) => r + x), duration: 2.2 }] };
}

export function tournamentSet(kind: SetKind, rounds: number, seed: number): Question[] {
  // Truth or Bluff with chosen topics and stage (carried in the seed's high bits).
  const facts = kind === 'truefalse' ? factSeedInfo(seed) : null;
  if (facts) return Array.from({ length: rounds }, (_, i) => factQuestion(`t${i + 1}`, factItem(facts.topics, facts.level, mulberry32(facts.base * 131 + i * 7919)), facts.base));
  if (kind === 'vocal-hold' && isChoirSeed(seed)) return Array.from({ length: rounds }, (_, i) => choirItem((seed % 2 ** 31) * 131 + i * 7919, `c${i + 1}`, i));
  const mix = ['degrees', 'chords', 'intervals', 'cadences'] as const;
  // A level tier rides in the seed (engine/gameTiers.ts tierSeed); every seed from before tiers is pp.
  const tier = seedTier(seed);
  return Array.from({ length: rounds }, (_, i) => tournamentItem(kind === 'mixed' ? mix[i % mix.length] : kind, seed * 131 + i * 7919, `t${i + 1}`, i, tier));
}

/** Daily challenge: one set per local calendar day, the same for everyone (versioned). */
export const DAILY_VERSION = 1;
export function dailySeed(day: string): number {
  let h = 2166136261;
  for (const ch of `${DAILY_VERSION}|${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** The daily set of a band (soft = the original set; mid / loud alternate their two tiers round by round). */
export function dailySet(day: string, band: DailyBand = 'soft'): Question[] {
  if (band === 'soft') return tournamentSet('mixed', 5, dailySeed(day));
  const seed = dailySeed(`${day}|${band}`);
  const tiers = bandTiers(band);
  const mix = ['degrees', 'chords', 'intervals', 'cadences'] as const;
  return Array.from({ length: 5 }, (_, i) => tournamentItem(mix[i % mix.length], seed * 131 + i * 7919, `t${i + 1}`, i, tiers[i % 2]));
}

export interface PlayerAnswer {
  player: number;
  answer: string | number | null; // null = no answer in time
  /** ms from the end of the stimulus as heard on this device. */
  timeMs: number | null;
}

export interface RoundResult {
  item: Question;
  answers: { player: number; answer: string | number | null; timeMs: number | null; correct: boolean; points: number }[];
  /** Fastest correct player (null when nobody was right). */
  fastest: number | null;
}

/** Score one round. Streaks are consecutive correct rounds before this one, per player. */
export function scoreRound(item: Question, answers: PlayerAnswer[], streaks: number[], windowMs = ROUND_WINDOW_MS): RoundResult {
  const scored = answers.map((a) => {
    const plausible = a.timeMs !== null && a.timeMs >= MIN_HUMAN_MS && a.timeMs <= windowMs;
    const correct = a.answer !== null && a.answer === item.answer && plausible;
    const points = correct ? tournamentPoints(1, a.timeMs!, windowMs, streaks[a.player] ?? 0) : 0;
    return { player: a.player, answer: a.answer, timeMs: a.timeMs, correct, points };
  });
  const right = scored.filter((s) => s.correct).sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
  return { item, answers: scored, fastest: right[0]?.player ?? null };
}

export interface Standing {
  player: number;
  points: number;
  correct: number;
  totalTimeMs: number;
  streak: number;
}

/** Totals after rounds; ties broken by total response time of correct answers (spec I). */
export function standings(players: number, rounds: RoundResult[]): Standing[] {
  const st: Standing[] = Array.from({ length: players }, (_, p) => ({ player: p, points: 0, correct: 0, totalTimeMs: 0, streak: 0 }));
  for (const r of rounds) {
    for (const a of r.answers) {
      const s = st[a.player];
      s.points += a.points;
      if (a.correct) {
        s.correct++;
        s.totalTimeMs += a.timeMs ?? 0;
        s.streak++;
      } else s.streak = 0;
    }
  }
  return [...st].sort((a, b) => b.points - a.points || a.totalTimeMs - b.totalTimeMs);
}

export const currentStreaks = (players: number, rounds: RoundResult[]) => {
  const st = standings(players, rounds);
  return Array.from({ length: players }, (_, p) => st.find((s) => s.player === p)!.streak);
};

/** Spoiler-free share text (Wordle-style): no answers, just how it went. */
export function shareText(day: string, round: RoundResult[], points: number, lang: 'he' | 'en'): string {
  const squares = round
    .map((r) => {
      const a = r.answers[0];
      if (!a.correct) return '⬜';
      return (a.timeMs ?? 99999) <= 2000 ? '🟩' : '🟨';
    })
    .join('');
  return lang === 'en' ? `The 7th Sense Daily ${day}\n${squares}  ${points.toLocaleString('en')} pts` : `החוש ה־7 · יומי ${day}\n${squares}  ${points.toLocaleString('he')} נק׳`;
}
