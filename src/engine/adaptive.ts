// Generated sessions: adaptive placement, targeted review from past mistakes, and the weekly puzzle.

import { MODE_STEPS, type ModeId } from './modes';
import { modeIdQuestion, tfQuestion, wrongNoteQuestion } from './lesson';
import { tfTruth } from './truefalse';
import {
  cadenceQuestion,
  degreeQuestion,
  degreeSeqQuestion,
  intervalQuestion,
  inversionQuestion,
  noteNameQuestion,
  rhythmDictQuestion,
  rhythmReadQuestion,
  singSeqQuestion,
  singRunQuestion,
  seventhQuestion,
  progressionQuestion,
  songDegreesQuestion,
  singSongQuestion,
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
import { PROGRESSIONS, SEVENTHS, type ProgressionId, type SeventhQuality } from './jazz';
import { songById } from './songs';
import { pc, type PitchClass } from './pitch';
import { buildRun, MAX_RUN_LEVEL, RUN_LEVELS, SCALES, type RunMaterial, type RunShape, type RunSpec } from './runs';
import { band, nextLevel, type Band, type Ratings } from './rating';
import type { SessionState } from './session';

// ======================================================================= placement

/**
 * "Find my level": every listening skill twice (round 2 adapts to round 1, per skill), then one
 * rhythm-reading tap item and — in voice mode — one singing item. Levels 0–3 map to the path:
 * 0 = first lessons, 3 = the hardest material of that skill. Each item's difficulty is on the rating
 * scale, so the answers place every skill on the Skill Map.
 */
export const PLACEMENT_SKILLS = ['degrees', 'notes', 'intervals', 'chords', 'cadences', 'sequences', 'rhythm-dictation'] as const;
export type PlacementSkill = (typeof PLACEMENT_SKILLS)[number];
export const PLACEMENT_ROUNDS = 2;
export const PLACEMENT_MAX_LEVEL = 3;
const START_LEVEL = 1;

const CAD_PHRASES: Record<'resolved' | 'open', Roman[]>[] = [
  { resolved: ['I', 'IV', 'V7', 'I'], open: ['I', 'vi', 'IV', 'V'] },
  { resolved: ['I', 'vi', 'ii', 'V7', 'I'], open: ['I', 'IV', 'ii', 'V'] },
  { resolved: ['vi', 'IV', 'V7', 'I'], open: ['I', 'iii', 'vi', 'V'] },
];
const NAME_LEVEL_KEYS = [['C'], ['G', 'F'], ['D', 'Bb'], ['Eb', 'A', 'E']];
const RHYTHM_LEVEL: (1 | 2 | 4 | 6)[] = [1, 2, 4, 6];

/** One placement item for a skill at level 0 (easy) … 3 (hard). Difficulty grows with level. */
export function placementItem(skill: PlacementSkill, level: number, seed: number, id: string): Question {
  const rnd = mulberry32(seed);
  const lv = Math.max(0, Math.min(PLACEMENT_MAX_LEVEL, level));
  const key = pick(rnd, DEGREE_KEYS);
  switch (skill) {
    case 'degrees': {
      if (lv === 0) return degreeQuestion(id, key, pick(rnd, [1, 5]), [1, 5], 900);
      if (lv === 1) return degreeQuestion(id, key, pick(rnd, [1, 3, 5]), [1, 3, 5], 1050);
      if (lv === 2) return degreeQuestion(id, key, 1 + Math.floor(rnd() * 7), [1, 2, 3, 4, 5, 6, 7], 1200);
      return degreeQuestion(id, key, pick(rnd, [2, 4, 6, 7]), [1, 2, 3, 4, 5, 6, 7], 1350);
    }
    case 'notes': {
      const k = pc(pick(rnd, NAME_LEVEL_KEYS[lv]));
      const d = lv === 0 ? pick(rnd, [1, 3, 5]) : 1 + Math.floor(rnd() * 7);
      return noteNameQuestion(id, k, d, true, [950, 1100, 1250, 1400][lv]);
    }
    case 'intervals': {
      const low = 53 + Math.floor(rnd() * 10);
      if (lv === 0) return intervalQuestion(id, low, pick(rnd, ['P5', 'P8'] as const), 'melodic', 900);
      if (lv === 1) return intervalQuestion(id, low, pick(rnd, ['M3', 'P5', 'P8'] as const), 'melodic', 1050);
      if (lv === 2) return intervalQuestion(id, low, pick(rnd, ['M3', 'P5', 'P8'] as const), 'harmonic', 1200);
      return intervalQuestion(id, low + 7, pick(rnd, ['M3', 'P5'] as const), 'harmonic', 1350);
    }
    case 'chords': {
      const root = pc(pick(rnd, ROOT_NAMES));
      if (lv === 0) return qualityQuestion(id, root, pick(rnd, ['maj', 'min'] as Quality[]), ['maj', 'min'], true, 900);
      if (lv === 1) return qualityQuestion(id, root, pick(rnd, ['maj', 'min'] as Quality[]), ['maj', 'min'], false, 1050);
      if (lv === 2) return qualityQuestion(id, root, pick(rnd, ['maj', 'min', 'dim', 'aug'] as Quality[]), ['maj', 'min', 'dim', 'aug'], false, 1250);
      return { ...seventhQuestion(id, root, pick(rnd, SEVENTHS), SEVENTHS), difficulty: 1400 };
    }
    case 'cadences':
      if (lv === 3) return { ...progressionQuestion(id, key, pick(rnd, ['ii-V-I', 'V-I', 'I-vi-ii-V'] as ProgressionId[]), ['ii-V-I', 'V-I', 'I-vi-ii-V']), difficulty: 1350 };
      return cadenceQuestion(id, key, pick(rnd, ['resolved', 'open'] as const), CAD_PHRASES[lv], [950, 1100, 1200][lv]);
    case 'sequences': {
      const pool = lv <= 0 ? [1, 3, 5] : lv === 1 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
      const n = lv <= 1 ? (lv === 0 ? 2 : 3) : lv === 2 ? 3 : 4;
      const ds: number[] = [];
      while (ds.length < n) {
        const d = pick(rnd, pool);
        if (d !== ds[ds.length - 1]) ds.push(d);
      }
      return degreeSeqQuestion(id, key, ds, [950, 1100, 1250, 1400][lv]);
    }
    case 'rhythm-dictation':
      return rhythmDictQuestion(id, RHYTHM_LEVEL[lv], 1, seed);
  }
}

const skillOf = (i: number): PlacementSkill | null => (i < PLACEMENT_SKILLS.length * PLACEMENT_ROUNDS ? PLACEMENT_SKILLS[i % PLACEMENT_SKILLS.length] : null);

export function placementLesson(seed: number, opts: { singing?: boolean } = {}): LessonDef {
  const questions: Question[] = Array.from({ length: PLACEMENT_SKILLS.length * PLACEMENT_ROUNDS }, (_, i) => placementItem(skillOf(i)!, START_LEVEL, seed + i * 97, `p${i + 1}`));
  // Performance: tap a short rhythm (rhythm reading); sing a degree when the microphone is in use.
  questions.push(rhythmReadQuestion(`p${questions.length + 1}`, 2, 1, seed + 5003, 'notation'));
  if (opts.singing) questions.push(singQuestion(`p${questions.length + 1}`, pc(pick(mulberry32(seed + 7), ['C', 'D', 'F', 'G'])), 5));
  return { id: 'placement', version: 2, skill: 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions };
}

/** Level the next item of a skill should have, from that skill's resolved items so far. */
export function placementLevel(s: SessionState, skill: PlacementSkill): number {
  let level = START_LEVEL;
  s.records.forEach((r, i) => {
    if (skillOf(i) !== skill || r.outcome === 'pending' || r.outcome === 'skipped') return;
    level = nextLevel(level, r.outcome === 'correct', PLACEMENT_MAX_LEVEL);
  });
  return level;
}

/**
 * Adapt after each answer: unresolved items are regenerated at the level implied by results so far
 * (up after a first-try correct, down after a miss). Resolved items and the performance items never change.
 */
export function adaptPlacement(s: SessionState, seed: number): Question[] {
  return s.lesson.questions.map((q, i) => {
    const skill = skillOf(i);
    if (!skill || s.records[i].outcome !== 'pending' || i <= s.index) return q;
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
    case 'seventh': {
      if (!SEVENTHS.includes(a as SeventhQuality)) return null;
      const n = Number(b) || 4;
      const choices = n === 2 ? (['maj7', '7'] as SeventhQuality[]) : n === 3 ? (['maj7', '7', 'm7'] as SeventhQuality[]) : SEVENTHS;
      return seventhQuestion(id, pc(pick(rnd, ['C', 'D', 'F', 'G', 'A'])), a as SeventhQuality, choices.includes(a as SeventhQuality) ? choices : SEVENTHS);
    }
    case 'prog': {
      if (!(a in PROGRESSIONS)) return null;
      const progs: ProgressionId[] = ['ii-V-I', 'V-I', 'I-vi-ii-V'];
      return progressionQuestion(id, pc(pick(rnd, ['C', 'D', 'F', 'G', 'Bb'])), a as ProgressionId, progs.includes(a as ProgressionId) ? progs : [...progs, a as ProgressionId]);
    }
    case 'song':
    case 'singsong': {
      const key = parsePc(a);
      const song = songById(b ?? '');
      const n = Number(tag.split(':')[3]) || undefined;
      if (!key || !song) return null;
      return kind === 'song' ? songDegreesQuestion(id, key, song, n) : singSongQuestion(id, key, song, n);
    }
    case 'nameseq': {
      const key = parsePc(a);
      const ds = (b ?? '').split('-').map(Number);
      if (!key || !ds.length || !ds.every((x) => x >= 1 && x <= 7)) return null;
      return nameSeqQuestion(id, key, ds, tag.split(':')[3] === 'degrees' ? 'degrees' : 'sound');
    }
    case 'tf': {
      // tf:<l.m.r>:<shownLeft>:<shownRight>:<midis>:<ear>
      const [, names, sl, sr, ms, ear] = tag.split(':');
      const ps = (names ?? '').split('.').map(parsePc);
      const midis = (ms ?? '').split('.').map(Number);
      if (ps.length !== 3 || ps.some((p) => !p) || midis.length !== 3) return null;
      return tfQuestion(id, { trio: { left: ps[0]!, mid: ps[1]!, right: ps[2]! }, shownLeft: sl, shownRight: sr, truth: tfTruth(midis, sl, sr), midis: midis as [number, number, number] }, ear === '1');
    }
    case 'wrongnote': {
      // wrongnote:<key>:<mode>:<position>:<alt>:<each>
      const key = parsePc(a);
      const [, , , pos, alt, each] = tag.split(':');
      if (!key || !(b in MODE_STEPS)) return null;
      return wrongNoteQuestion(id, key, b as ModeId, Number(pos), alt === '-1' ? -1 : 1, Number(each) || 0.4, 1300);
    }
    case 'modeid': {
      // modeid:<key>:<mode>:<choices>:<dir>:<each>
      const key = parsePc(a);
      const [, , , choices, dir, each] = tag.split(':');
      if (!key || !(b in MODE_STEPS)) return null;
      const cs = (choices ?? '').split(',').filter((c) => c in MODE_STEPS) as ModeId[];
      return modeIdQuestion(id, key, b as ModeId, cs.length >= 2 ? cs : [b as ModeId, 'ionian'], dir === 'up' ? 'up' : 'updown', Number(each) || 0.38, 1300);
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
