// Generated sessions: adaptive placement, targeted review from past mistakes, and the weekly puzzle.

import {
  cadenceQuestion,
  degreeQuestion,
  degreeSeqQuestion,
  intervalQuestion,
  inversionQuestion,
  noteNameQuestion,
  singSeqQuestion,
  singRunQuestion,
  nameSeqQuestion,
  namesToDegreesQuestion,
  singNamesSeqQuestion,
  runIdQuestion,
  DEGREE_KEYS,
  mulberry32,
  pick,
  qualityQuestion,
  ROOT_NAMES,
  singQuestion,
  type LessonDef,
  type Question,
  type Quality,
  type Roman,
} from './lesson';
import { pc, type PitchClass } from './pitch';
import { buildRun, MAX_RUN_LEVEL, RUN_LEVELS, SCALES, type RunMaterial, type RunShape, type RunSpec } from './runs';
import { band, nextLevel, type Band, type Ratings } from './rating';
import type { SessionState } from './session';

// ======================================================================= placement

export const PLACEMENT_SKILLS = ['degrees', 'chords', 'cadences'] as const;
export type PlacementSkill = (typeof PLACEMENT_SKILLS)[number];
export const PLACEMENT_ROUNDS = 3;

const CAD_PHRASES: Record<'resolved' | 'open', Roman[]>[] = [
  { resolved: ['I', 'IV', 'V7', 'I'], open: ['I', 'vi', 'IV', 'V'] },
  { resolved: ['I', 'vi', 'ii', 'V7', 'I'], open: ['I', 'IV', 'ii', 'V'] },
  { resolved: ['vi', 'IV', 'V7', 'I'], open: ['I', 'iii', 'vi', 'V'] },
];

/** One placement item for a skill at level 0 (easy) … 2 (hard). Difficulty grows with level. */
export function placementItem(skill: PlacementSkill, level: number, seed: number, id: string): Question {
  const rnd = mulberry32(seed);
  const key = pick(rnd, DEGREE_KEYS);
  switch (skill) {
    case 'degrees': {
      if (level === 0) return degreeQuestion(id, key, pick(rnd, [1, 5]), [1, 5], 900);
      if (level === 1) return degreeQuestion(id, key, pick(rnd, [1, 3, 5]), [1, 3, 5], 1050);
      return degreeQuestion(id, key, 1 + Math.floor(rnd() * 7), [1, 2, 3, 4, 5, 6, 7], 1250);
    }
    case 'chords': {
      const root = pc(pick(rnd, ROOT_NAMES));
      if (level === 0) return qualityQuestion(id, root, pick(rnd, ['maj', 'min'] as Quality[]), ['maj', 'min'], true, 950);
      if (level === 1) return qualityQuestion(id, root, pick(rnd, ['maj', 'min'] as Quality[]), ['maj', 'min'], false, 1100);
      return qualityQuestion(id, root, pick(rnd, ['maj', 'min', 'dim', 'aug'] as Quality[]), ['maj', 'min', 'dim', 'aug'], false, 1300);
    }
    case 'cadences':
      return cadenceQuestion(id, key, pick(rnd, ['resolved', 'open'] as const), CAD_PHRASES[level], [1000, 1100, 1200][level]);
  }
}

const skillOf = (i: number): PlacementSkill => PLACEMENT_SKILLS[i % PLACEMENT_SKILLS.length];

/** 9 items: degrees, chords, cadences × 3 rounds, all starting at the middle level. */
export function placementLesson(seed: number): LessonDef {
  const questions = Array.from({ length: PLACEMENT_SKILLS.length * PLACEMENT_ROUNDS }, (_, i) => placementItem(skillOf(i), 1, seed + i * 97, `p${i + 1}`));
  return { id: 'placement', version: 1, skill: 'degrees', scoring: { xpPerCorrect: 0, attemptLimit: 1 }, intro: [], questions };
}

/** Level the next item of a skill should have, from that skill's resolved items so far. */
export function placementLevel(s: SessionState, skill: PlacementSkill): number {
  let level = 1;
  s.records.forEach((r, i) => {
    if (skillOf(i) !== skill || r.outcome === 'pending' || r.outcome === 'skipped') return;
    level = nextLevel(level, r.outcome === 'correct');
  });
  return level;
}

/**
 * Adapt after each answer: unresolved items are regenerated at the level implied by results so far
 * (up after a first-try correct, down after a miss). Resolved items are never changed.
 */
export function adaptPlacement(s: SessionState, seed: number): Question[] {
  return s.lesson.questions.map((q, i) => {
    if (s.records[i].outcome !== 'pending' || i <= s.index) return q;
    const skill = skillOf(i);
    return placementItem(skill, placementLevel(s, skill), seed + i * 97, q.id);
  });
}

// ======================================================================= review

export interface ReviewItem {
  questionId: string;
  key: string; // question tag
  answer: number | string;
  addedAt: string;
  box?: number;
  due?: string;
}

const parsePc = (s: string): PitchClass | null => {
  const m = /^([A-G])(-?\d)$/.exec(s);
  return m ? { letter: m[1] as PitchClass['letter'], acc: Number(m[2]) as PitchClass['acc'] } : null;
};

/** Rebuild a fresh question that tests the same thing as a review tag (new voicing / register where possible). */
export function questionFromTag(tag: string, seed: number, id: string): Question | null {
  const rnd = mulberry32(seed);
  const [kind, a, b] = tag.split(':');
  switch (kind) {
    case 'degree': {
      const key = parsePc(a);
      const d = Number(b);
      if (!key || !(d >= 1 && d <= 7)) return null;
      const choices = [1, 5].includes(d) && rnd() < 0.5 ? [1, 5] : [1, 3, 5].includes(d) ? [1, 3, 5] : [1, 2, 3, 4, 5, 6, 7];
      return degreeQuestion(id, key, d, choices, 1000);
    }
    case 'quality': {
      if (!['maj', 'min', 'dim', 'aug'].includes(a)) return null;
      const q = a as Quality;
      const choices: Quality[] = q === 'dim' || q === 'aug' ? ['maj', 'min', 'dim', 'aug'] : ['maj', 'min'];
      return qualityQuestion(id, pc(pick(rnd, ROOT_NAMES)), q, choices, true, 1000);
    }
    case 'cadence':
      return a === 'resolved' || a === 'open' ? cadenceQuestion(id, pick(rnd, DEGREE_KEYS), a) : null;
    case 'sing': {
      const d = Number(a);
      return d >= 1 && d <= 7 ? singQuestion(id, pick(rnd, ['C', 'D', 'F', 'G'].map(pc)), d) : null;
    }
    case 'interval':
      return ['M3', 'P5', 'P8'].includes(a) ? intervalQuestion(id, 53 + Math.floor(rnd() * 10), a as 'M3', b === 'harmonic' ? 'harmonic' : 'melodic') : null;
    case 'inversion':
      return ['root', 'third', 'fifth'].includes(a) ? inversionQuestion(id, pc(pick(rnd, ['C', 'D', 'F', 'G'])), a as 'root') : null;
    case 'name': {
      const key = parsePc(a);
      const [d, how] = [Number(b), tag.split(':')[3]];
      return key && d >= 1 && d <= 7 ? noteNameQuestion(id, key, d, how === 'heard') : null;
    }
    case 'singseq': {
      const key = parsePc(a);
      const ds = (b ?? '').split('-').map(Number);
      if (!key || !ds.length || !ds.every((x) => x >= 1 && x <= 7)) return null;
      return tag.split(':')[3] === 'name' ? singNamesSeqQuestion(id, key, ds) : singSeqQuestion(id, key, ds);
    }
    case 'nameseq': {
      const key = parsePc(a);
      const ds = (b ?? '').split('-').map(Number);
      if (!key || !ds.length || !ds.every((x) => x >= 1 && x <= 7)) return null;
      return nameSeqQuestion(id, key, ds, tag.split(':')[3] === 'degrees' ? 'degrees' : 'sound');
    }
    case 'srun':
    case 'runid': {
      // srun:<key>:<level>:<material>:<shape>:<nps>:<prompt> · runid:<key>:<level>:<material>:<shape>:<aspect>
      const key = parsePc(a);
      const parts = tag.split(':');
      const level = Number(parts[2]);
      if (!key || !(level >= 1 && level <= MAX_RUN_LEVEL)) return null;
      const material = parts[3] as RunMaterial;
      const shape = parts[4] as RunShape;
      if (!(material in SCALES)) return null;
      const def = RUN_LEVELS[level - 1];
      const start = shape === 'down' || shape === 'zigzag' ? (def.len > 6 ? 'top' : 'fifth') : 'tonic';
      const run: RunSpec = { offsets: buildRun(material, shape, def.len, start), nps: kind === 'srun' ? Number(parts[5]) || def.nps : def.nps, material, shape, level };
      if (kind === 'srun') return singRunQuestion(id, key, run, parts[6] === 'told' ? 'told' : 'echo');
      return runIdQuestion(id, key, run, parts[5] === 'shape' ? 'shape' : 'material');
    }
    case 'seq': {
      const key = parsePc(a);
      const ds = (b ?? '').split('-').map(Number);
      if (!key || !ds.length || !ds.every((d) => d >= 1 && d <= 7)) return null;
      return tag.split(':')[3] === 'names' ? namesToDegreesQuestion(id, key, ds) : degreeSeqQuestion(id, key, ds);
    }
  }
  return null;
}

/** Up to `max` most recent review items as a session; null when there is nothing to review. */
/** Due items only (spaced repetition); fresh misses (lowest box) first, then the most recent. */
export function reviewLesson(items: ReviewItem[], seed: number, max = 5, now = new Date()): LessonDef | null {
  const due = items.filter((it) => new Date(it.due ?? it.addedAt).getTime() <= now.getTime());
  const recent = [...due].sort((a, b) => (a.box ?? 0) - (b.box ?? 0) || b.addedAt.localeCompare(a.addedAt));
  const qs: Question[] = [];
  const used = new Set<string>();
  for (const it of recent) {
    if (qs.length >= max || used.has(it.key)) continue;
    const q = questionFromTag(it.key, seed + qs.length * 31, `r${qs.length + 1}`);
    if (q) {
      qs.push(q);
      used.add(it.key);
    }
  }
  if (!qs.length) return null;
  return { id: 'review', version: 1, skill: 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 2 }, intro: [], questions: qs };
}

// ======================================================================= weekly puzzle

/** ISO-8601 week id in local time, e.g. "2026-W45". Weeks start on Monday. */
export function weekId(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const PUZZLE_VERSION = 1;

/** Band for the puzzle: from the degrees + sequences ratings, one step above what you usually get. */
export function puzzleBand(ratings: Ratings): Band {
  const rs = [ratings.degrees, ratings.sequences].filter((x) => x && x.n > 0).map((x) => x!.r);
  const r = rs.length ? Math.max(...rs) : 950;
  return band(r + 100);
}

const PUZZLE_SHAPE: Record<Band, { pool: number[]; len: number; difficulty: number }> = {
  beginner: { pool: [1, 3, 5], len: 3, difficulty: 1000 },
  developing: { pool: [1, 2, 3, 4, 5], len: 3, difficulty: 1150 },
  solid: { pool: [1, 2, 3, 4, 5, 6, 7], len: 4, difficulty: 1300 },
  advanced: { pool: [1, 2, 3, 4, 5, 6, 7], len: 5, difficulty: 1450 },
};

/** The same versioned puzzle for everyone in a band during a given week. */
export function weeklyPuzzle(week: string, b: Band): LessonDef {
  const rnd = mulberry32(hash(`${PUZZLE_VERSION}|${week}|${b}`));
  const shape = PUZZLE_SHAPE[b];
  const degrees: number[] = [];
  while (degrees.length < shape.len) {
    const d = pick(rnd, shape.pool);
    if (degrees.length && degrees[degrees.length - 1] === d) continue;
    degrees.push(d);
  }
  const key = pick(rnd, DEGREE_KEYS);
  return {
    id: 'weekly-puzzle',
    version: PUZZLE_VERSION,
    skill: 'sequences',
    scoring: { xpPerCorrect: 0, attemptLimit: 2 },
    intro: [],
    questions: [degreeSeqQuestion(`${week}-${b}`, key, degrees, shape.difficulty)],
  };
}

export type Medal = 'gold' | 'silver' | null;
/** First-attempt solve = gold, second = silver; unrecognised speech never consumes an attempt. */
export const medalFor = (outcome: string): Medal => (outcome === 'correct' ? 'gold' : outcome === 'correct-retry' ? 'silver' : null);
