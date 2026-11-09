// The learning path — an adaptive spiral (spec addendum AF, docs/SPEC-PATH.md). Pure.
//
// Steps = every topic level + every hand-made lesson. Units = one level step across the player's chosen areas
// (shares by rank), ending in a checkpoint. The frontier of each skill (rating, or a cautious start) picks the
// steps; ✓ ("you already know this") is derived from evidence with every safeguard of §6 / §13; nothing derived is
// stored — only facts (done steps, test-out events, frozen units).

import { questionTags } from './taxonomy';
import { SUB_PREREQ, IMPORTANCE } from './scheduler';
import { DOMAINS, domainOf, evidence, expected, type DomainId, type RatingEvent, type Ratings } from './rating';
import { BASICS_ORDER, LESSON_AREA, PREREQ } from './intake';
import { LESSON_ORDER, makeLesson, type LessonDef, type LessonId, type Question, type SkillId } from './lesson';
import { TOPIC_GEN, genTopic, topicLesson } from './topicKit';
import type { Track } from './intake';
import { inCourse, type CourseId } from './courses';
import { catalog } from './drills/generate';
import { guitarCatalog } from './drills/guitar';
import { BARRY_LEVELS, HARMONY_LEVELS, LADDER, MODE_LEVELS, ORNAMENT_LEVELS, SIGHT_LEVELS } from './vocal';

// ---------------------------------------------------------------- types

export type StepKind = 'lesson' | 'topic' | 'check' | 'review' | 'game' | 'tech' | 'vocal';
export interface PathStep {
  id: string;
  kind: StepKind;
  topic?: string;
  level?: number;
  lesson?: LessonId;
  skill: SkillId;
  sub: string;
  domain: DomainId;
  difficulty: number;
  /** Number of answer choices (guessing floor); 0 = not guessable (sung, placed, tapped). */
  choices: number;
  /** A teaching step (hand-made lesson) — comes first when its sub-skill is new. */
  teach?: boolean;
  /** Optional content pack it belongs to. */
  pack?: Pack;
  /** Only for players of these instruments. */
  forPlays?: string[];
  /** Needs singing (dropped when singing is left out). */
  sung?: boolean;
  /** Needs the microphone (singing or playing back). */
  mic?: boolean;
  /** A game step (product owner, 0.38: games inside units): the game's route id. */
  game?: string;
  /** 0.61 (owner): a level of a measured ladder — a technique family level ('tech') or a vocal program level ('vocal').
   * family = drill family id / vocal program; ref = the drill level id ("scales-3") or the vocal level number ("103"). */
  ladder?: { family: string; level: number; ref: string; instrument?: 'piano' | 'guitar' | 'bass' };
  title: { en: string; he: string };
}

export type Pack = 'jazz' | 'maqam' | 'absolute' | 'production' | 'post-tonal';
export const PACKS: Pack[] = ['jazz', 'maqam', 'absolute', 'production', 'post-tonal'];

export type StepState = 'done' | 'mastered' | 'tested' | 'quick' | 'refresh' | 'current' | 'open' | 'locked';

export interface UnitStep {
  step: PathStep;
  state: StepState;
  stars?: number;
  /** Why a step is ✓ (P19), or why it's a quick check. */
  why?: { en: string; he: string };
  /** The first step of a skill never measured: a short probe (P6). */
  probe?: boolean;
}

export type Section = 'beginner' | 'developing' | 'solid' | 'advanced';
export interface PathUnit {
  id: string;
  n: number;
  steps: UnitStep[];
  difficulty: number;
  section: Section;
  areas: DomainId[];
  status: 'past' | 'current' | 'projected';
  /** The unit's theme (D1). */
  theme?: string;
  /** The number shown (n + the units you skipped by testing out: a placed player starts at "Unit 37", not "Unit 1"). */
  no?: number;
}

/** Facts kept in progress (P9). */
export interface PathFacts {
  /** Finished steps: best stars and when. */
  steps?: Record<string, { stars: number; at: string; times?: number; firstAt?: string }>;
  /** Units frozen when they became current (id, step ids, the ✓ at freeze time). */
  units?: { id: string; n: number; steps: string[]; checked: string[]; at: string }[];
  /** "✓ by test" events (jump-ahead). */
  tests?: Record<string, string>;
}

export type Goal = 'general' | 'sing' | 'jazz' | 'read' | 'guitar' | 'producer' | 'exam' | 'maqam';
export const GOALS: Goal[] = ['general', 'sing', 'jazz', 'read', 'guitar', 'producer', 'exam', 'maqam'];
export const GOAL_NAMES: Record<Goal, { en: string; he: string; icon: string }> = {
  general: { en: 'A bit of everything', he: 'קצת מהכל', icon: '🎵' },
  sing: { en: 'Sing in tune', he: 'לשיר מדויק', icon: '🎤' },
  jazz: { en: 'An ear for jazz', he: 'אוזן לג׳אז', icon: '🎷' },
  read: { en: 'Read & write music', he: 'לקרוא ולכתוב תווים', icon: '📖' },
  guitar: { en: 'A guitarist’s ear', he: 'אוזן של גיטריסט', icon: '🎸' },
  producer: { en: 'A producer’s ear', he: 'אוזן של מפיק', icon: '🎛' },
  exam: { en: 'Exam prep (aural & theory)', he: 'הכנה לבחינה (שמיעה ותיאוריה)', icon: '🎓' },
  maqam: { en: 'Maqam & Mizrahi music', he: 'מקאמים ומוזיקה מזרחית', icon: '🪕' },
};
const AREA_ORDER: DomainId[] = ['pitch', 'time', 'memory', 'voice', 'reading', 'creative', 'instrument'];
/** Area weights per goal (spec AF §14.2), in AREA_ORDER. */
export const GOAL_WEIGHTS: Record<Goal, number[]> = {
  general: [3, 3, 2, 2, 2, 2, 1],
  sing: [3, 2, 2, 5, 1, 1, 0],
  jazz: [5, 3, 2, 1, 2, 3, 1],
  read: [2, 3, 2, 1, 5, 1, 1],
  guitar: [4, 3, 2, 1, 1, 2, 4],
  producer: [3, 3, 1, 0, 1, 2, 5],
  exam: [4, 3, 3, 2, 5, 1, 0],
  maqam: [4, 3, 2, 3, 1, 2, 0],
};
export const GOAL_PACKS: Record<Goal, Pack[]> = { general: [], sing: [], jazz: ['jazz'], read: [], guitar: [], producer: ['production'], exam: [], maqam: ['maqam'] };
export const GOAL_BOOST: Record<Goal, Partial<Record<SkillId, number>>> = {
  general: {},
  sing: { singing: 1.5, technique: 1.5, pitch: 1.5 },
  jazz: { chords: 1.4, cadences: 1.4, modes: 1.4 },
  read: { notes: 1.5, theory: 1.5, sight: 1.5, dictation: 1.5 },
  guitar: { instrument: 1.4, chords: 1.4 },
  producer: { timbre: 1.5, 'rhythm-dictation': 1.5 },
  exam: { cadences: 1.3, dictation: 1.3, theory: 1.3, sight: 1.3 },
  maqam: { modes: 1.4, 'rhythm-dictation': 1.4 },
};

/** Unit themes (spec AF §14.1): each favours some sub-skills (a prefix ending in "/" = the whole skill). */
export const THEMES: { id: string; name: { en: string; he: string }; subs: string[] }[] = [
  { id: 'home', name: { en: 'Home & away', he: 'בית ויציאה' }, subs: ['degrees/home', 'degrees/find-tonic', 'cadences/cadence', 'timing/steady', 'singing/match', 'instrument/echo'] },
  { id: 'steps', name: { en: 'Steps & leaps', he: 'צעדים וקפיצות' }, subs: ['intervals/', 'sequences/contour', 'sequences/melody', 'singing/intervals', 'instrument/shapes', 'notes/staff'] },
  { id: 'colour', name: { en: 'Bright & dark', he: 'בהיר וכהה' }, subs: ['chords/quality', 'modes/', 'expression/mood', 'degrees/chromatic'] },
  { id: 'pulse', name: { en: 'Pulse & meter', he: 'דופק ומשקל' }, subs: ['meter/', 'tempo/', 'timing/subdivide', 'timing/backbeat', 'timing/gap', 'rhythm-reading/read'] },
  { id: 'chords', name: { en: 'Building chords', he: 'לבנות אקורדים' }, subs: ['chords/inversion', 'chords/seventh', 'chords/extension', 'instrument/shapes', 'theory/spelling', 'singing/harmony'] },
  { id: 'memory', name: { en: 'Remember & write', he: 'לזכור ולכתוב' }, subs: ['sequences/', 'rhythm/memory', 'dictation/', 'sequences/inner'] },
  { id: 'harmony', name: { en: 'Harmony moves', he: 'הרמוניה בתנועה' }, subs: ['cadences/progression', 'cadences/modulation', 'cadences/harmonize', 'cadences/chromatic', 'dictation/bass'] },
  { id: 'groove', name: { en: 'Groove & feel', he: 'גרוב ותחושה' }, subs: ['rhythm-dictation/', 'transpose/displacement', 'transpose/rhythmic', 'timing/poly', 'rhythm-reading/drums'] },
  { id: 'read', name: { en: 'Read & transform', he: 'לקרוא ולהזיז' }, subs: ['notes/', 'theory/', 'sight/', 'transpose/'] },
  { id: 'sound', name: { en: 'Color & sound', he: 'צבע וסאונד' }, subs: ['expression/', 'form/', 'timbre/', 'chords/voicing', 'improv/'] },
];
const inTheme = (sub: string, t: (typeof THEMES)[number]) => t.subs.some((x) => (x.endsWith('/') ? sub.startsWith(x) : sub === x));

export interface PathInput {
  track: Track;
  /** The questionnaire goal (D2). */
  goal: Goal;
  /** Topics the player hid (D4). */
  hidden: string[];
  /** Modes left out (D4). */
  noSing: boolean;
  noMic: boolean;
  /** Areas in order of importance; null = mixed (equal). */
  priorities: DomainId[] | null;
  leaveOut: DomainId[];
  packs: Pack[];
  plays: string[];
  /** Technique drills left out of the path (drill settings, spec AI owner Q7). */
  noDrills?: boolean;
  minutes: 5 | 10 | 20;
  ratings: Ratings;
  events: RatingEvent[];
  /** Median time / reference time per sub-skill (P4), when known. */
  speed?: Record<string, number>;
  facts: PathFacts;
  /** Steps the player asked to keep on the path although ✓ (P19). */
  keep: string[];
  /** Review items due now (spec §7). */
  reviewDue: number;
  now: Date;
  /** The course this path belongs to (0.61, SPEC-COURSES); none = the old mixed path. */
  course?: CourseId;
  /** 0.61: the technique families / vocal programs this player's course path may use, in teaching order. Absent = no ladder steps. */
  ladderFamilies?: string[];
  /** Ladder level ids left out of the path (N10: low-B levels on a bass without a low B). */
  ladderHidden?: string[];
}

export interface PathView {
  units: PathUnit[];
  /** History (owner 2026-11-08): steps you already know that are not on the road — ✓ by the level test or played
   * elsewhere — grouped into units 1…H by difficulty, shown folded above the road. The road's units are numbered from H+1. */
  history: PathUnit[];
  current: UnitStep | null;
  /** Steps ✓ or done out of all steps in the player's path. */
  progress: { done: number; checked: number; total: number };
  /** Per section: share known. */
  sections: Record<Section, { known: number; total: number }>;
  /** A unit to freeze (the caller stores it as a fact). */
  freeze: { id: string; n: number; steps: string[]; checked: string[] } | null;
}

// ---------------------------------------------------------------- constants

export const START: Record<Track, number> = { explorer: 850, hobby: 950, student: 1100, pro: 1250 };
export const UNIT_LEN: Record<5 | 10 | 20, number> = { 5: 6, 10: 8, 20: 10 };
const RANK_W = [5, 4, 3, 2, 2, 1, 1];
const DAY = 86400000;

export const sectionOf = (d: number): Section => (d < 900 ? 'beginner' : d < 1150 ? 'developing' : d < 1400 ? 'solid' : 'advanced');

// ---------------------------------------------------------------- the catalogue (memoised)

const PACK_TOPICS: Record<string, Pack> = {
  'bh-scale': 'jazz', 'bh-tone': 'jazz', 'bh-convert': 'jazz', 'bh-convert-2': 'jazz', 'bh-keys': 'jazz', 'bh-six-over': 'jazz', 'bh-lines': 'jazz', 'bh-pivot': 'jazz', 'bh-brothers': 'jazz', 'bh-family': 'jazz', 'bh-block': 'jazz', comping: 'jazz', turnarounds: 'jazz', 'guide-tones': 'jazz', 'chromatic-added': 'jazz', 'chord-scale': 'jazz', 'swing-ratio': 'jazz',
  maqam: 'maqam', 'eastern-rhythm': 'maqam',
  'set-classes': 'post-tonal', counterpoint: 'post-tonal',
  'eq-ear': 'production', 'space-ear': 'production', 'pan-ear': 'production', 'dyn-ear': 'production', 'filter-ear': 'production', 'tone-hz': 'production', 'width-ear': 'production',
};
const PACK_LESSONS: Partial<Record<string, Pack>> = { 'jazz-1': 'jazz', 'jazz-2': 'jazz', runs: undefined };
const SUNG_SKILLS: SkillId[] = ['singing', 'technique', 'agility'];

let CATALOGUE: PathStep[] | null = null;
let CAT_KEY = '';

/** Every step there is (all players). Rebuilt when topics are registered later (key = topic/level count). */
export function stepCatalogue(): PathStep[] {
  const key = Object.entries(TOPIC_GEN).map(([k, t]) => `${k}${t.levels.length}`).join(',');
  if (CATALOGUE && CAT_KEY === key) return CATALOGUE;
  const out: PathStep[] = [];
  for (const [topic, T] of Object.entries(TOPIC_GEN)) {
    for (let level = 1; level <= T.levels.length; level++) {
      let q: Question;
      try {
        q = T.gen(4242, level, 'cat') as Question;
      } catch {
        continue;
      }
      const tag = questionTags(q)[0];
      const skill = tag.skill;
      const sung = SUNG_SKILLS.includes(skill) || q.kind === 'sing' || (q.kind === 'sing-seq' && !q.play);
      const mic = q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run';
      out.push({
        id: `topic:${topic}:${level}`,
        kind: 'topic',
        topic,
        level,
        skill,
        sub: tag.sub,
        domain: domainOf(skill),
        difficulty: q.difficulty,
        choices: q.kind === 'choice' ? q.choices.length : 0,
        pack: PACK_TOPICS[topic] ?? (topic === 'absolute' ? 'absolute' : undefined),
        forPlays: T.forPlays,
        sung,
        mic,
        title: { en: `${T.title.en} · ${level}`, he: `${T.title.he} · ${level}` },
      });
    }
  }
  for (const id of [...BASICS_ORDER, ...LESSON_ORDER]) {
    try {
      const L = makeLesson(id, 1);
      const qs = L.questions;
      if (!qs.length) continue;
      const tag = questionTags(qs[0])[0];
      const d = Math.round(qs.reduce((a, q) => a + q.difficulty, 0) / qs.length);
      out.push({
        id: `lesson:${id}`,
        kind: 'lesson',
        lesson: id,
        skill: tag.skill,
        sub: tag.sub,
        domain: (LESSON_AREA as Record<string, DomainId>)[id] ?? domainOf(tag.skill),
        difficulty: d,
        choices: qs[0].choices.length,
        teach: true,
        pack: PACK_LESSONS[id],
        sung: SUNG_SKILLS.includes(tag.skill),
        mic: qs.some((q) => q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run'),
        title: { en: id, he: id },
      });
    } catch {
      /* a lesson that can't be built offline is not a path step */
    }
  }
  out.push(...ladderSteps());
  out.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  CATALOGUE = out;
  CAT_KEY = key;
  return out;
}

/** Vocal programs (0.61): level number bases, in teaching order (same numbering as the Vocal screen). */
export const VOCAL_PROGRAMS: { id: string; base: number; levels: { level: number }[]; title: { en: string; he: string } }[] = [
  { id: 'v-ladder', base: 0, levels: LADDER, title: { en: 'Vocal technique', he: 'טכניקה קולית' } },
  { id: 'v-modes', base: 100, levels: MODE_LEVELS, title: { en: 'Scales & modes', he: 'סולמות ומודוסים' } },
  { id: 'v-sight', base: 400, levels: SIGHT_LEVELS, title: { en: 'Sight-singing', he: 'שירה מתווים' } },
  { id: 'v-harmony', base: 200, levels: HARMONY_LEVELS, title: { en: 'Harmony singing', he: 'שירה בהרמוניה' } },
  { id: 'v-ornament', base: 500, levels: ORNAMENT_LEVELS, title: { en: 'Ornaments', he: 'קישוטים' } },
  { id: 'v-barry', base: 300, levels: BARRY_LEVELS, title: { en: 'Barry Harris lines', he: 'קווים של בארי האריס' } },
];

/** Every level of every technique family and vocal program as a path step (0.61, owner: technique inside the course path). */
function ladderSteps(): PathStep[] {
  const out: PathStep[] = [];
  const diff = (i: number) => 700 + i * 70;
  for (const f of catalog())
    f.levels.forEach((lv, i) =>
      out.push({ id: `tech:${lv.id}`, kind: 'tech', ladder: { family: f.id, level: lv.level, ref: lv.id, instrument: 'piano' }, skill: 'instrument', sub: 'instrument/piano-tech', domain: 'instrument', difficulty: diff(i), choices: 0, forPlays: ['keys', 'piano'], title: { en: `${f.title.en} · ${lv.title.en}`, he: `${f.title.he} · ${lv.title.he}` } }),
    );
  for (const f of guitarCatalog())
    f.levels.forEach((lv, i) =>
      out.push({ id: `tech:${lv.id}`, kind: 'tech', ladder: { family: f.id, level: lv.level, ref: lv.id, instrument: f.instruments.includes('guitar') ? 'guitar' : 'bass' }, skill: 'instrument', sub: f.instruments.includes('guitar') ? 'instrument/guitar-tech' : 'instrument/bass-tech', domain: 'instrument', difficulty: diff(i), choices: 0, forPlays: [...f.instruments], title: { en: `${f.title.en} · ${lv.title.en}`, he: `${f.title.he} · ${lv.title.he}` } }),
    );
  for (const pr of VOCAL_PROGRAMS)
    pr.levels.forEach((_, i) => {
      const n = pr.base + i + 1;
      out.push({ id: `vocal:${n}`, kind: 'vocal', ladder: { family: pr.id, level: i + 1, ref: String(n) }, skill: 'singing', sub: 'singing/vocal-ladder', domain: 'voice', difficulty: diff(i), choices: 0, sung: true, mic: true, title: { en: `${pr.title.en} · ${i + 1}`, he: `${pr.title.he} · ${i + 1}` } });
    });
  return out;
}

// ---------------------------------------------------------------- filters

/** Steps this player's path can contain (areas, packs, instruments, singing). */
export function eligible(s: PathStep, inp: Pick<PathInput, 'leaveOut' | 'packs' | 'plays' | 'track'> & Partial<Pick<PathInput, 'hidden' | 'noSing' | 'noMic' | 'course' | 'ladderFamilies' | 'ladderHidden'>>): boolean {
  if (inp.course && !inCourse(s, inp.course)) return false;
  // Ladder steps only where the course asked for them (and only for its families / programs).
  if (s.ladder && !inp.ladderFamilies?.includes(s.ladder.family)) return false;
  if (s.ladder && inp.ladderHidden?.includes(s.ladder.ref)) return false;
  if (inp.leaveOut.includes(s.domain)) return false;
  if (s.sung && (inp.leaveOut.includes('voice') || inp.noSing)) return false;
  if (s.mic && inp.noMic) return false;
  if (s.topic && inp.hidden?.includes(s.topic)) return false;
  if (s.pack && !inp.packs.includes(s.pack)) return false;
  if (s.forPlays && !s.forPlays.some((p) => inp.plays.includes(p))) {
    // The keyboard map 1–3 is the theory picture: offered to students and pros too (spec AE §4.1).
    const keysForAll = s.topic === 'key-notes' && (s.level ?? 9) <= 3 && (inp.track === 'student' || inp.track === 'pro');
    if (!keysForAll) return false;
  }
  if ((IMPORTANCE[inp.track]?.[s.skill] ?? 0.5) <= 0) return false;
  return true;
}

/** Default packs from the questionnaire (§4). */
export function defaultPacks(track: Track, plays: string[], goal: Goal = 'general'): Pack[] {
  const out: Pack[] = [...GOAL_PACKS[goal]];
  if ((track === 'pro' || track === 'student') && !out.includes('jazz')) out.push('jazz');
  if (plays.includes('production') && !out.includes('production')) out.push('production');
  if (track === 'pro') out.push('post-tonal');
  return out;
}

// ---------------------------------------------------------------- evidence

interface SubEvidence {
  n: number;
  sessions: number;
  ewma: number;
  /** Highest difficulty with ≥ 2 of the last 3 answers at or above it correct (P2). */
  h: number;
  last: number;
  correct: number;
}

// A game's events carry "g:<game>:<session>:<i>" — the session is the third part.
const sessionOf = (id: string) => (id.startsWith('g:') ? id.split(':').slice(0, 3).join(':') : id.split(':')[0]);

function subEvidence(events: RatingEvent[]): Map<string, SubEvidence> {
  const by = new Map<string, RatingEvent[]>();
  for (const e of events) {
    if (e.set !== undefined) continue;
    const subs = new Set((e.tags ?? []).filter((t) => t.w >= 0.5 || t.skill === e.skill).map((t) => t.sub ?? `${t.skill}`));
    if (!subs.size) subs.add(`${e.skill}`);
    for (const s of subs) by.set(s, [...(by.get(s) ?? []), e]);
  }
  const out = new Map<string, SubEvidence>();
  for (const [sub, es] of by) {
    es.sort((a, b) => a.at.localeCompare(b.at));
    let ewma = 0.6;
    let correct = 0;
    for (const e of es) {
      const s = e.score ?? (e.correct ? 1 : 0);
      ewma += 0.2 * (s - ewma);
      if (s >= 0.7) correct++;
    }
    // h: walk difficulties from the top; the answers at ≥ D − 50, most recent 3, need ≥ 2 right.
    const ds = [...new Set(es.map((e) => e.difficulty))].sort((a, b) => b - a);
    let h = 0;
    for (const D of ds) {
      const near = es.filter((e) => e.difficulty >= D - 50).slice(-3);
      if (near.length >= 2 && near.filter((e) => (e.score ?? (e.correct ? 1 : 0)) >= 0.7).length >= 2) {
        h = D;
        break;
      }
    }
    out.set(sub, { n: es.length, sessions: new Set(es.map((e) => sessionOf(e.id))).size, ewma, h, last: new Date(es[es.length - 1].at).getTime(), correct });
  }
  return out;
}

/** The placement value for a skill, when it was measured by Find my level. */
function placed(events: RatingEvent[], skill: SkillId): { r: number; at: number } | null {
  // Placement 3.0: a skill inferred from its area (setN = 2, never asked) is not placed — it gets the probe first.
  const ps = events.filter((e) => e.set !== undefined && e.skill === skill && e.setN !== 2);
  if (!ps.length) return null;
  const last = ps[ps.length - 1];
  return { r: last.set!, at: new Date(last.at).getTime() };
}

/** Frontier of a skill (§5.1 with P5 / P6): measured → rating; else a cautious blend toward START − 150. */
export function frontierOf(skill: SkillId, inp: Pick<PathInput, 'ratings' | 'events' | 'track'>): number {
  const r = inp.ratings[skill];
  const start = START[inp.track] - 150;
  const pl = placed(inp.events, skill);
  if (pl || evidence(r) === 'measured') return r?.r ?? pl!.r;
  if (!r || r.n === 0) return start;
  const k = Math.min(1, r.n / 8);
  return Math.round(k * r.r + (1 - k) * start);
}

const subNudge = (ev: SubEvidence | undefined) => (ev && ev.n >= 3 ? Math.max(-100, Math.min(100, 150 * (ev.ewma - 0.75))) : 0);

// ---------------------------------------------------------------- ✓ (§6 + §13)

export interface CheckVerdict {
  state: 'tested' | 'quick' | 'refresh' | null;
  why?: { en: string; he: string };
}

export function checkStep(s: PathStep, inp: PathInput, subs: Map<string, SubEvidence>): CheckVerdict {
  // Ladder steps are passed only by measured playing / singing (owner, 0.61) — never by rating evidence.
  if (s.ladder) return inp.facts.tests?.[s.id] ? { state: 'tested', why: { en: '✓ from your playing test', he: '✓ ממבחן הנגינה' } } : { state: null };
  if (s.kind === 'check' || s.kind === 'review') return { state: null };
  if (inp.keep.includes(s.id)) return { state: null };
  const ev = subs.get(s.sub);
  const F = frontierOf(s.skill, inp) + subNudge(ev);
  const P = expected(F, s.difficulty);
  const byTest = inp.facts.tests?.[s.id];
  if (byTest) {
    // ✓ by test stays unless the sub-skill slid (withdrawal rule).
    if ((ev && ev.n >= 3 && ev.ewma < 0.65) || P < 0.7) return { state: null };
    return { state: 'tested', why: { en: '✓ by your unit test', he: '✓ במבחן היחידה שלכם' } };
  }
  if (P < 0.85) return { state: null };
  const pl = placed(inp.events, s.skill);
  // P3: at least one right answer in this sub-skill (placement alone doesn't reach sub-skills never heard).
  const prereqSubs = SUB_PREREQ[s.sub] ?? [];
  const anyRight = (ev?.correct ?? 0) > 0 || prereqSubs.some((p) => (subs.get(p)?.correct ?? 0) > 0);
  if (!anyRight) return pl && pl.r - 100 >= s.difficulty ? { state: 'quick', why: { en: 'Looks easy for you — a quick check?', he: 'נראה לכם קל — בדיקה קצרה?' } } : { state: null };
  // P2: the evidence ceiling (no ✓ above what was really shown, twice of three).
  const h = Math.max(ev?.h ?? 0, pl ? pl.r - 100 : 0);
  if (s.difficulty > h + 50) return { state: null };
  // Repetitions: ≥ 3 answers in ≥ 2 sessions, unless the level test measured the skill.
  if (!pl && (!ev || ev.n < 3 || ev.sessions < 2)) return { state: null };
  // Not on a slide.
  if (ev && ev.n >= 3 && ev.ewma < 0.75) return { state: null };
  // Speed (P4): neutral without data.
  const sp = inp.speed?.[s.sub];
  if (sp !== undefined && sp > 1.25) return { state: null };
  // Recency (P8): older than 60 days → needs a refresh.
  const last = Math.max(ev?.last ?? 0, pl?.at ?? 0);
  if (inp.now.getTime() - last > 60 * DAY) return { state: 'refresh', why: { en: 'Known before — time for a refresh', he: 'ידעתם — הגיע הזמן לרענון' } };
  const days = Math.round((inp.now.getTime() - last) / DAY);
  const n = ev?.correct ?? 0;
  return {
    state: 'tested',
    why: pl && n < 3
      ? { en: `✓ from your level test${n ? ` and ${n} right answers` : ''}`, he: `✓ ממבחן הרמה${n ? ` ו־${n} תשובות נכונות` : ''}` }
      : { en: `✓ because: ${n} right, ${sp !== undefined ? 'at your speed, ' : ''}within ${Math.max(1, days)} days`, he: `✓ כי: ${n} נכונות, ${sp !== undefined ? 'בקצב שלכם, ' : ''}ב־${Math.max(1, days)} הימים האחרונים` },
  };
}

// ---------------------------------------------------------------- building

/** Area weights (D2): goal × rank. An area the goal weighs 0 stays out unless the player ranked it in the top 3. */
function areaWeights(inp: PathInput): Map<DomainId, number> {
  const areas = DOMAINS.map((d) => d.id).filter((a) => !inp.leaveOut.includes(a));
  const m = new Map<DomainId, number>();
  const gw = GOAL_WEIGHTS[inp.goal] ?? GOAL_WEIGHTS.general;
  const rankW = (a: DomainId) => {
    if (!inp.priorities || !inp.priorities.length) return 2;
    const i = inp.priorities.indexOf(a);
    return i < 0 ? 1 : RANK_W[i] ?? 1;
  };
  for (const a of areas) {
    const g = gw[AREA_ORDER.indexOf(a)] ?? 1;
    const top3 = (inp.priorities ?? []).slice(0, 3).includes(a);
    const w = (g || (top3 ? 1 : 0)) * rankW(a);
    if (w > 0) m.set(a, w);
  }
  return m;
}

/** Shares of a unit by area (§5.2.1 + P1): the lowest-ranked areas take turns when there isn't room for all. */
export function unitShares(weights: Map<DomainId, number>, live: DomainId[], L: number, unitNo: number): Map<DomainId, number> {
  const areas = [...weights.entries()].filter(([a]) => live.includes(a)).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  const out = new Map<DomainId, number>();
  if (!areas.length || L <= 0) return out;
  // P1: a unit holds at most ~60 % of its length in distinct areas; the top half always, the rest take turns.
  const P = Math.min(areas.length, Math.max(3, Math.floor(L * 0.6)), L);
  let pool = areas;
  if (areas.length > P) {
    const keepN = Math.ceil(P / 2);
    const keep = areas.slice(0, keepN);
    const rest = areas.slice(keepN);
    const slots = P - keepN;
    const start = ((Math.max(1, unitNo) - 1) * slots) % rest.length;
    const turn = Array.from({ length: slots }, (_, i) => rest[(start + i) % rest.length]);
    pool = [...keep, ...turn];
  }
  // One step each, the rest by weight (largest remainder).
  for (const [a] of pool) out.set(a, 1);
  let R = L - pool.length;
  const sum = pool.reduce((t, [, w]) => t + w, 0) || 1;
  const quota = pool.map(([a, w]) => ({ a, q: (R * w) / sum }));
  for (const x of quota) {
    const n = Math.floor(x.q);
    out.set(x.a, out.get(x.a)! + n);
  }
  R -= quota.reduce((t, x) => t + Math.floor(x.q), 0);
  quota.sort((x, y) => y.q - Math.floor(y.q) - (x.q - Math.floor(x.q)));
  for (let i = 0; i < R; i++) out.set(quota[i % quota.length].a, out.get(quota[i % quota.length].a)! + 1);
  return out;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Build the path (§5): past units (facts), the current unit (frozen), and the next two projected units. */
export function buildPath(inp: PathInput): PathView {
  const all = stepCatalogue().filter((s) => eligible(s, inp));
  const byId = new Map(stepCatalogue().map((s) => [s.id, s] as const));
  const subs = subEvidence(inp.events);
  const doneSteps = inp.facts.steps ?? {};
  const verdict = new Map<string, CheckVerdict>();
  for (const s of all) verdict.set(s.id, checkStep(s, inp, subs));
  const isDone = (id: string) => (doneSteps[id]?.stars ?? 0) > 0;
  const isChecked = (id: string) => verdict.get(id)?.state === 'tested';
  const L = UNIT_LEN[inp.minutes] ?? 8;

  const stateOf = (s: PathStep, extra?: Partial<UnitStep>): UnitStep => {
    const d = doneSteps[s.id];
    if (d && d.stars > 0) {
      const mastered = d.stars >= 3 && (d.times ?? 1) >= 2 && !!d.firstAt && new Date(d.at).getTime() - new Date(d.firstAt).getTime() >= 3 * DAY;
      return { step: s, state: mastered ? 'mastered' : 'done', stars: d.stars, ...extra };
    }
    const v = verdict.get(s.id);
    if (v?.state === 'tested') return { step: s, state: 'tested', why: v.why, ...extra };
    if (v?.state === 'refresh') return { step: s, state: 'refresh', why: v.why, ...extra };
    return { step: s, state: 'open', ...extra };
  };

  // Past and current units come from facts.
  const frozen = inp.facts.units ?? [];
  const units: PathUnit[] = [];
  const placedIds = new Set<string>();
  const mkUnit = (id: string, n: number, steps: UnitStep[], status: PathUnit['status']): PathUnit => {
    const d = median(steps.filter((x) => x.step.kind !== 'check' && x.step.kind !== 'review').map((x) => x.step.difficulty));
    return { id, n, steps, difficulty: Math.round(d), section: sectionOf(d), areas: [...new Set(steps.map((x) => x.step.domain))], status };
  };
  for (const f of frozen) {
    const steps = f.steps
      .map((id) => byId.get(id) ?? virtualStep(id, f.id))
      .filter((s): s is PathStep => !!s)
      .map((s) => (f.checked.includes(s.id) && !isDone(s.id) ? { step: s, state: 'tested' as StepState } : stateOf(s)));
    steps.forEach((x) => placedIds.add(x.step.id));
    const complete = steps.every((x) => x.state === 'done' || x.state === 'mastered' || x.state === 'tested');
    units.push(mkUnit(f.id, f.n, steps, complete ? 'past' : 'current'));
  }
  // Only the last unfinished frozen unit is current; earlier unfinished ones are past (superseded by a rebuild).
  const lastOpen = [...units].reverse().find((u) => u.status === 'current');
  for (const u of units) if (u.status === 'current' && u !== lastOpen) u.status = 'past';

  // Simulated frontier per skill for projection.
  const F = new Map<SkillId, number>();
  const fr = (k: SkillId) => {
    if (!F.has(k)) F.set(k, frontierOf(k, inp));
    return F.get(k)!;
  };
  const taken = new Set<string>([...placedIds, ...all.filter((s) => isDone(s.id) || isChecked(s.id)).map((s) => s.id)]);
  const seenSubs = new Set<string>([...subs.keys()].filter((k) => (subs.get(k)?.n ?? 0) > 0));
  for (const s of all) if (taken.has(s.id)) seenSubs.add(s.sub);
  const weights = areaWeights(inp);
  const imp = (k: SkillId) => (IMPORTANCE[inp.track]?.[k] ?? 0.5) * (GOAL_BOOST[inp.goal]?.[k] ?? 1);
  const themeFor = (n: number) => {
    // Rotate through the themes; skip one that has nothing open for the player now.
    for (let k = 0; k < THEMES.length; k++) {
      const t = THEMES[(n - 1 + k) % THEMES.length];
      if (all.some((s) => !taken.has(s.id) && inTheme(s.sub, t))) return t;
    }
    return THEMES[(n - 1) % THEMES.length];
  };

  const prereqOk = (s: PathStep, scheduled: Set<string>) => {
    // Previous level of the same topic first.
    if (s.kind === 'topic' && (s.level ?? 1) > 1) {
      const prev = `topic:${s.topic}:${(s.level ?? 1) - 1}`;
      if (byId.has(prev) && all.some((x) => x.id === prev) && !taken.has(prev) && !scheduled.has(prev)) return false;
    }
    if (s.ladder && s.ladder.level > 1) {
      const prev = ladderPrev.get(s.id);
      if (prev && !taken.has(prev) && !scheduled.has(prev)) return false;
    }
    if (s.kind === 'lesson') for (const p of PREREQ[s.lesson!] ?? []) {
      const pid = `lesson:${p}`;
      if (all.some((x) => x.id === pid) && !taken.has(pid) && !scheduled.has(pid)) return false;
    }
    for (const p of SUB_PREREQ[s.sub] ?? []) {
      const area = domainOf(p.split('/')[0] as SkillId);
      if (inp.leaveOut.includes(area)) continue; // P15
      if (!seenSubs.has(p)) return false;
    }
    return true;
  };

  // Ladder steps (0.61): the previous level of each family, and which families are open to the player now.
  const ladderPrev = new Map<string, string>();
  {
    const byFam = new Map<string, PathStep[]>();
    for (const s of stepCatalogue()) if (s.ladder) byFam.set(s.ladder.family, [...(byFam.get(s.ladder.family) ?? []), s]);
    for (const xs of byFam.values()) {
      xs.sort((a, b) => a.ladder!.level - b.ladder!.level);
      for (let i = 1; i < xs.length; i++) ladderPrev.set(xs[i].id, xs[i - 1].id);
    }
  }
  /** Families open now: those already started, then the next ones in teaching order — one more for every family two levels in. */
  const openFamilies = (): string[] => {
    const fams = inp.ladderFamilies ?? [];
    const levelsTaken = (f: string) => all.filter((s) => s.ladder?.family === f && taken.has(s.id)).length;
    const started = fams.filter((f) => levelsTaken(f) > 0);
    const deep = fams.filter((f) => levelsTaken(f) >= 2).length;
    const k = Math.min(fams.length, Math.max(2, started.length, 2 + deep));
    return [...new Set([...started, ...fams.slice(0, k)])];
  };
  /** One step per family, rotating which families come first; at most about half the unit (owner's daily mix). */
  const pickLadder = (n: number, room: number, scheduled: Set<string>): PathStep[] => {
    const fams = openFamilies();
    if (!fams.length || room <= 0) return [];
    const out: PathStep[] = [];
    for (let k = 0; k < fams.length && out.length < room; k++) {
      const f = fams[(n - 1 + k) % fams.length];
      const next = all.filter((s) => s.ladder?.family === f && !taken.has(s.id) && !scheduled.has(s.id)).sort((a, b) => a.ladder!.level - b.ladder!.level)[0];
      if (!next) continue;
      const prev = ladderPrev.get(next.id);
      if (prev && all.some((x) => x.id === prev) && !taken.has(prev) && !scheduled.has(prev)) continue;
      out.push(next);
      scheduled.add(next.id);
    }
    return out;
  };

  const unitTheme = new Map<number, string>();
  const buildUnit = (n: number, warm: boolean): UnitStep[] => {
    const scheduled = new Set<string>();
    const theme = themeFor(n);
    unitTheme.set(n, theme.id);
    const near = (s: PathStep, f: number) => Math.abs(s.difficulty - (f + 50)) - (inTheme(s.sub, theme) ? 120 : 0);
    const slots = L - 1 /* checkpoint */ - (inp.reviewDue >= 3 && n === units.length + 1 ? 1 : 0);
    const ladder = pickLadder(n, Math.ceil(slots / 2), scheduled);
    const open = all.filter((s) => !taken.has(s.id) && !s.ladder);
    const live = [...new Set(open.map((s) => s.domain))];
    const shares = unitShares(weights, live, slots - ladder.length, n);
    const picked: { s: PathStep; probe?: boolean; isNew?: boolean }[] = ladder.map((s) => ({ s }));
    let newSubs = 0;
    for (const [area, count] of shares) {
      const themed = (k: SkillId) => (open.some((s) => s.skill === k && inTheme(s.sub, theme)) ? 1 : 0);
      const skills = [...new Set(open.filter((s) => s.domain === area).map((s) => s.skill))].sort((a, b) => themed(b) - themed(a) || imp(b) - imp(a) || a.localeCompare(b));
      let k = 0;
      let guard = 0;
      while (picked.filter((p) => p.s.domain === area && !p.s.ladder).length < count && guard++ < 40 && skills.length) {
        const skill = skills[k++ % skills.length];
        const f = fr(skill) - (warm ? 50 : 0);
        // Cognitive load (P11, tuned): new sub-skills at most half of an area's share and half of the unit.
        const areaNew = picked.filter((p) => p.s.domain === area && !p.s.ladder && p.isNew).length;
        const allowNew = newSubs < Math.ceil(L / 2) && areaNew < Math.ceil(count / 2);
        const ok = (s: PathStep) => s.skill === skill && !scheduled.has(s.id) && prereqOk(s, scheduled) && (allowNew || seenSubs.has(s.sub));
        const cands = open.filter((s) => ok(s) && s.difficulty >= f - 150 && s.difficulty <= f + 200);
        let best = cands.sort((a, b) => near(a, f) - near(b, f) || a.id.localeCompare(b.id))[0];
        if (!best) {
          // Nothing in the window: the easiest open step above it, if prerequisites allow.
          best = open.filter((s) => ok(s) && s.difficulty > f + 200 && s.difficulty <= f + 350).sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id))[0];
        }
        if (!best) continue;
        const isNew = !seenSubs.has(best.sub);
        if (isNew) {
          newSubs++;
          const teach = open.find((s) => s.teach && s.sub === best!.sub && !scheduled.has(s.id) && prereqOk(s, scheduled));
          if (teach && teach.id !== best.id && picked.filter((p) => p.s.domain === area && !p.s.ladder).length + 1 < count) {
            picked.push({ s: teach });
            scheduled.add(teach.id);
          }
        }
        const unmeasured = !inp.ratings[skill]?.n && !placed(inp.events, skill) && !picked.some((p) => p.s.skill === skill);
        picked.push({ s: best, probe: unmeasured, isNew });
        scheduled.add(best.id);
        seenSubs.add(best.sub);
      }
    }
    // Order (P17): interleave areas, rising difficulty inside each area.
    const byArea = new Map<DomainId, { s: PathStep; probe?: boolean }[]>();
    for (const p of picked) byArea.set(p.s.domain, [...(byArea.get(p.s.domain) ?? []), p]);
    for (const xs of byArea.values()) {
      xs.sort((a, b) => a.s.difficulty - b.s.difficulty || a.s.id.localeCompare(b.s.id));
      // D8: a teaching step comes before the other steps of its sub-skill.
      for (const t of xs.filter((x) => x.s.teach)) {
        const first = xs.findIndex((x) => x.s.sub === t.s.sub);
        const at = xs.indexOf(t);
        if (first >= 0 && first < at) {
          xs.splice(at, 1);
          xs.splice(first, 0, t);
        }
      }
    }
    const order: { s: PathStep; probe?: boolean }[] = [];
    const queues = [...byArea.entries()].sort((a, b) => (weights.get(b[0]) ?? 0) - (weights.get(a[0]) ?? 0)).map(([, xs]) => xs);
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) order.push(q.shift()!);
    // Simulate success for the projection.
    for (const p of order) {
      taken.add(p.s.id);
      F.set(p.s.skill, Math.max(fr(p.s.skill), Math.min(fr(p.s.skill) + 40, p.s.difficulty + 50)));
    }
    const unitId = `u${n}`;
    const steps: UnitStep[] = order.map((p) => stateOf(p.s, p.probe ? { probe: true } : {}));
    if (inp.reviewDue >= 3 && n === units.length + 1) steps.push({ step: virtualStep(`review:${unitId}`, unitId)!, state: 'open' });
    // A game for the unit's leading area (0.38), before the checkpoint — a lighter, faster round of the same skills.
    const lead = order[0]?.s.domain;
    const game = lead ? gameForArea(lead, n, { ...inp, noDrills: inp.noDrills || !!inp.ladderFamilies?.length }) : null;
    if (game && order.length >= 4) steps.push(stateOf(virtualStep(`game:${unitId}:${game}`, unitId, order.map((p) => p.s))!));
    // A checkpoint asks questions: it needs question steps (a unit of technique only is checked by its own playing).
    const questions = order.filter((p) => p.s.kind === 'topic' || p.s.kind === 'lesson');
    if (steps.length && questions.length >= 2) steps.push({ step: virtualStep(`check:${unitId}`, unitId, questions.map((p) => p.s))!, state: 'open' });
    return steps;
  };

  const placementRecent = inp.events.some((e) => e.set !== undefined && inp.now.getTime() - new Date(e.at).getTime() < 3 * DAY);
  let freeze: PathView['freeze'] = null;
  if (!lastOpen) {
    const n = units.length + 1;
    const steps = buildUnit(n, placementRecent);
    if (steps.length) {
      const u = mkUnit(`u${n}`, n, steps, 'current');
      u.theme = unitTheme.get(n);
      units.push(u);
      freeze = { id: u.id, n, steps: steps.map((x) => x.step.id), checked: steps.filter((x) => x.state === 'tested').map((x) => x.step.id) };
    }
  } else {
    for (const x of lastOpen.steps) taken.add(x.step.id);
  }
  // Projected: the next two units.
  for (let k = 0; k < 2; k++) {
    const n = units.length + 1;
    const steps = buildUnit(n, false);
    if (!steps.length) break;
    const pu = mkUnit(`u${n}`, n, steps, 'projected');
    pu.theme = unitTheme.get(n);
    units.push(pu);
  }

  // Current step: the first open step of the current unit (✓ and done are passed).
  const cur = units.find((u) => u.status === 'current');
  let current: UnitStep | null = null;
  for (const u of units) {
    if (u.status === 'past') continue;
    for (const x of u.steps) {
      if (u.status === 'current' && !current && (x.state === 'open' || x.state === 'refresh')) {
        x.state = 'current';
        current = x;
      } else if (u.status === 'projected' && (x.state === 'open' || x.state === 'refresh')) x.state = 'locked';
    }
  }
  if (cur && !current) {
    // Everything in it done / ✓: it becomes past on the next build (the caller freezes the next one).
  }

  // Progress and sections (P12, P13): ✓ counts.
  const sections: PathView['sections'] = { beginner: { known: 0, total: 0 }, developing: { known: 0, total: 0 }, solid: { known: 0, total: 0 }, advanced: { known: 0, total: 0 } };
  let done = 0;
  let checked = 0;
  for (const s of all) {
    const sec = sections[sectionOf(s.difficulty)];
    sec.total++;
    if (isDone(s.id)) {
      done++;
      sec.known++;
    } else if (isChecked(s.id)) {
      checked++;
      sec.known++;
    }
  }
  const onRoad = new Set(units.flatMap((u) => u.steps.map((x) => x.step.id)));
  const known = all
    .filter((s) => s.kind !== 'check' && s.kind !== 'review' && !onRoad.has(s.id) && (isDone(s.id) || isChecked(s.id)))
    .sort((a, b) => a.difficulty - b.difficulty);
  const history: PathUnit[] = [];
  for (let i = 0; i < known.length; i += L) {
    const n = history.length + 1;
    const u = mkUnit(`hist-${n}`, n, known.slice(i, i + L).map((st) => stateOf(st)), 'past');
    u.no = n;
    history.push(u);
  }
  for (const u of units) u.no = u.n + history.length;
  return { units, history, current, progress: { done, checked, total: all.length }, sections, freeze };
}

/** Checkpoint and review steps (generated per unit). */
function virtualStep(id: string, unitId: string, from: PathStep[] = []): PathStep | null {
  if (id.startsWith('check:')) {
    const d = median(from.map((s) => s.difficulty)) || 1000;
    return { id, kind: 'check', skill: from[0]?.skill ?? 'degrees', sub: from[0]?.sub ?? 'degrees/diatonic', domain: from[0]?.domain ?? 'pitch', difficulty: d, choices: 0, title: { en: 'Checkpoint', he: 'נקודת ביקורת' } };
  }
  if (id.startsWith('review:')) return { id, kind: 'review', skill: 'degrees', sub: 'degrees/diatonic', domain: 'pitch', difficulty: 0, choices: 0, title: { en: 'Review', he: 'חזרה' } };
  if (id.startsWith('game:')) {
    const game = id.split(':')[2];
    const g = GAME_STEPS[game];
    const d = median(from.map((s) => s.difficulty)) || 1000;
    return { id, kind: 'game', game, skill: g?.skill ?? 'degrees', sub: `${g?.skill ?? 'degrees'}/${g?.sub ?? 'diatonic'}`, domain: g?.domain ?? 'pitch', difficulty: d, choices: 0, title: g?.title ?? { en: game, he: game } };
  }
  void unitId;
  return null;
}

/** Games that can sit inside a unit, by the area they train (0.38). */
export const GAME_STEPS: Record<string, { domain: DomainId; skill: SkillId; sub: string; title: { en: string; he: string }; needsMic?: boolean; forPlays?: string[] }> = {
  'rush-interval': { domain: 'pitch', skill: 'intervals', sub: 'melodic', title: { en: 'Interval Sprint', he: 'ספרינט מרווחים' } },
  'rush-chord': { domain: 'pitch', skill: 'chords', sub: 'quality', title: { en: 'Chord Rush', he: 'מרוץ אקורדים' } },
  'rush-progression': { domain: 'pitch', skill: 'cadences', sub: 'progression', title: { en: 'Progression Detective', he: 'בלש המהלכים' } },
  highway: { domain: 'time', skill: 'rhythm-reading', sub: 'read', title: { en: 'Rhythm Highway', he: 'כביש הקצב' } },
  melodypuzzle: { domain: 'memory', skill: 'dictation', sub: 'melodic', title: { en: 'Melody Puzzle', he: 'פאזל מנגינה' } },
  nametune: { domain: 'memory', skill: 'sequences', sub: 'melody', title: { en: 'Name That Tune', he: 'זהו את השיר' } },
  flight: { domain: 'voice', skill: 'singing', sub: 'match', title: { en: 'Voice Flight', he: 'טיסת קול' }, needsMic: true },
  'rush-note': { domain: 'reading', skill: 'notes', sub: 'staff', title: { en: 'Note Rush', he: 'מרוץ תווים' } },
  'rush-keysig': { domain: 'reading', skill: 'theory', sub: 'keys', title: { en: 'Key Signature Rush', he: 'מרוץ סימני מפתח' } },
  'rush-fretboard': { domain: 'instrument', skill: 'instrument', sub: 'fretboard', title: { en: 'Fretboard Sprint', he: 'ספרינט צוואר' }, forPlays: ['guitar', 'bass'] },
  peakhunter: { domain: 'instrument', skill: 'timbre', sub: 'eq', title: { en: 'Peak Hunter', he: 'צייד הפיקים' } },
  drills: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Technique drills', he: 'תרגילי טכניקה' }, forPlays: ['keys', 'piano', 'guitar', 'bass'] },
};
const AREA_GAMES: Record<DomainId, string[]> = {
  pitch: ['rush-interval', 'rush-chord', 'rush-progression'],
  time: ['highway'],
  memory: ['melodypuzzle', 'nametune'],
  voice: ['flight'],
  reading: ['rush-note', 'rush-keysig'],
  creative: ['rush-chord'],
  instrument: ['drills', 'rush-fretboard', 'peakhunter'],
};
/** The game for a unit's leading area (rotating by unit number; mic / instrument / pack rules apply). */
export function gameForArea(area: DomainId, n: number, inp: Pick<PathInput, 'noMic' | 'noSing' | 'plays' | 'packs'> & { noDrills?: boolean; course?: CourseId }): string | null {
  const ok = AREA_GAMES[area].filter((g) => {
    const s = GAME_STEPS[g];
    if (inp.course && !inCourse({ domain: s.domain, sung: !!s.needsMic && s.domain === 'voice', forPlays: s.forPlays }, inp.course)) return false;
    if (g === 'drills' && inp.noDrills) return false;
    if (s.needsMic && (inp.noMic || inp.noSing)) return false;
    if (s.forPlays && !s.forPlays.some((p) => inp.plays.includes(p))) return false;
    if (g === 'peakhunter' && !inp.packs.includes('production')) return false;
    return true;
  });
  return ok.length ? ok[n % ok.length] : null;
}

/** The steps of a checkpoint: the unit's steps (for 8 mixed items). */
export function checkpointSources(unit: PathUnit): PathStep[] {
  return unit.steps.map((x) => x.step).filter((s) => s.kind === 'topic' || s.kind === 'lesson');
}

/** Stars of a finished step from its score (P10): ≥ 4/6 = 1 star; 2 at ≥ 5/6; 3 at 6/6. Checkpoint: ≥ 75 %. */
export function stepStars(kind: StepKind, firstTry: number, total: number): number {
  const r = total ? firstTry / total : 0;
  if (kind === 'check') return r >= 1 ? 3 : r >= 0.87 ? 2 : r >= 0.75 ? 1 : 0;
  return r >= 1 ? 3 : r >= 5 / 6 - 1e-9 ? 2 : r >= 4 / 6 - 1e-9 ? 1 : 0;
}

/** Record a finished step (facts): best stars, how many times, first and last time. */
export function recordStep(facts: PathFacts, id: string, stars: number, at: string): PathFacts {
  const cur = facts.steps?.[id];
  const next = { stars: Math.max(stars, cur?.stars ?? 0), at, times: (cur?.times ?? 0) + (stars > 0 ? 1 : 0), firstAt: cur?.firstAt ?? (stars > 0 ? at : undefined) };
  return { ...facts, steps: { ...(facts.steps ?? {}), [id]: next } };
}

/** The ids of the next few steps (to tell the player when a rebuild changed something visible, P17). */
export const nextIds = (v: PathView, n = 5) =>
  v.units
    .filter((u) => u.status !== 'past')
    .flatMap((u) => u.steps)
    .filter((x) => x.state === 'current' || x.state === 'open' || x.state === 'locked')
    .slice(0, n)
    .map((x) => x.step.id);

// ---------------------------------------------------------------- sessions for steps

/** A topic step's session: 6 items (a probe 4, a quick check 3). */
export function stepSession(s: PathStep, seed: number, mode: 'step' | 'probe' | 'quick' = 'step'): LessonDef | null {
  if (s.kind !== 'topic' || !s.topic) return null;
  return topicLesson(s.topic, s.level ?? 1, seed, mode === 'probe' ? 4 : mode === 'quick' ? 3 : 6);
}

/** The checkpoint of a unit (P7): 8 mixed items from its steps, 2–3 per area. */
export function checkpointSession(unit: PathUnit, seed: number): LessonDef {
  const src = unit.steps.map((x) => x.step).filter((s) => s.kind === 'topic' || s.kind === 'lesson');
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const qs: Question[] = [];
  for (let i = 0; qs.length < 8 && i < 40 && src.length; i++) {
    const s = src[i % src.length];
    const sd = Math.floor(rnd() * 2 ** 31);
    try {
      if (s.kind === 'topic' && s.topic) qs.push({ ...(genTopic(s.topic, sd, s.level ?? 1, `cp-${qs.length + 1}`) as Question) });
      else if (s.lesson) {
        const L = makeLesson(s.lesson, sd).questions.filter((q) => q.kind !== 'rhythm-read' || i < 2);
        if (L.length) qs.push({ ...L[Math.floor(rnd() * L.length)], id: `cp-${qs.length + 1}` });
      }
    } catch {
      /* skip a source that can't build */
    }
  }
  return { id: 'topic', version: 1, skill: src[0]?.skill ?? 'degrees', scoring: { xpPerCorrect: 10, attemptLimit: 1 }, intro: [], questions: qs };
}

/** Jump-ahead test (P16): ≥ 1 item per step (8–12 items); question ids "to-<step index>-<k>". */
export function testOutSession(unit: PathUnit, seed: number): { def: LessonDef; steps: string[] } {
  const src = unit.steps.map((x) => x.step).filter((s) => s.kind === 'topic' || s.kind === 'lesson');
  const n = Math.max(8, Math.min(12, src.length));
  const qs: Question[] = [];
  for (let i = 0; i < n && src.length; i++) {
    const si = i % src.length;
    const s = src[si];
    const sd = (seed + i * 7919) >>> 0;
    try {
      if (s.kind === 'topic' && s.topic) qs.push({ ...(genTopic(s.topic, sd, s.level ?? 1, 'x') as Question), id: `to-${si}-${i}` });
      else if (s.lesson) {
        const L = makeLesson(s.lesson, sd).questions;
        if (L.length) qs.push({ ...L[sd % L.length], id: `to-${si}-${i}` });
      }
    } catch {
      /* skip */
    }
  }
  return { def: { id: 'topic', version: 1, skill: src[0]?.skill ?? 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions: qs }, steps: src.map((s) => s.id) };
}

/** The steps a test-out marks "✓ by test": every step whose items were all answered right (P16). */
export function testOutPassed(steps: string[], items: { id: string; correct: boolean }[]): string[] {
  const right = new Map<number, boolean>();
  for (const it of items) {
    const m = /:to-(\d+)-\d+$/.exec(it.id) ?? /^to-(\d+)-\d+$/.exec(it.id);
    if (!m) continue;
    const i = Number(m[1]);
    right.set(i, (right.get(i) ?? true) && it.correct);
  }
  return steps.filter((_, i) => right.get(i) === true);
}

/** Topic-level marks from the path (SPEC-TODAY §4): ✓ when the path already counts the level, ▶ for the current step. */
export function topicMarks(view: PathView): Map<string, 'done' | 'current'> {
  const out = new Map<string, 'done' | 'current'>();
  for (const u of view.units)
    for (const x of u.steps) {
      const { topic, level } = x.step;
      if (!topic || !level) continue;
      if (x.state === 'done' || x.state === 'mastered' || x.state === 'tested') out.set(`${topic}:${level}`, 'done');
    }
  const cur = view.current?.step;
  if (cur?.topic && cur.level) out.set(`${cur.topic}:${cur.level}`, 'current');
  return out;
}
