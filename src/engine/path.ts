// The learning path — an adaptive spiral (spec addendum AF, docs/SPEC-PATH.md). Pure.
//
// Steps = every topic level + every hand-made lesson. Units = one level step across the player's chosen areas
// (shares by rank), ending in a checkpoint. The frontier of each skill (rating, or a cautious start) picks the
// steps; ✓ ("you already know this") is derived from evidence with every safeguard of §6 / §13; nothing derived is
// stored — only facts (done steps, test-out events, frozen units).

import { gameVerified, topicVerified } from './verifiedContent';
import { K_HARM_DIFF } from './drills/harmLadder';
import { K_INDEP_DIFF } from './drills/indepDrills';
import { K_KEYLICK_DIFF, K_KEYX_DIFF } from './drills/keyLicks';
import { LATIN_LEVEL_DIFF } from './drills/latinStyles';
import { SOUL_LEVEL_DIFF } from './drills/soulStyles';
import { NOLA_LEVEL_DIFF } from './drills/nolaStyles';
import { ODD_LEVEL_DIFF } from './drills/oddJazz';
import { MODE_LEVEL_DIFF } from './drills/modeScales';
import { questionTags } from './taxonomy';
import { SUB_PREREQ, IMPORTANCE } from './scheduler';
import { DOMAINS, domainOf, evidence, expected, type DomainId, type RatingEvent, type Ratings } from './rating';
import { BASICS_ORDER, LESSON_AREA, PREREQ } from './intake';
import { LESSON_ORDER, makeLesson, type LessonDef, type LessonId, type Question, type SkillId } from './lesson';
import { TOPIC_GEN, genTopic, topicLesson } from './topicKit';
import type { Track } from './intake';
import { inCourse, isJazzStep, JAZZ_GAMES, isKeysForAll, PIANO_ONLY_JAZZ_TOPICS, playsKeys, type CourseId } from './courses';
import { stepTier, tierSpec } from './gameTiers';
import { catalog } from './drills/generate';
import { guitarCatalog } from './drills/guitar';
import { VOICE_FAMILIES, vocalLevelByRef } from './voiceFamilies';
import { DRUM_STAGGER, guitarGradeBase, LEVEL_PLACEMENT, monotoneFamily, voiceItemRating } from './levelPlacement';
import { B_LEVEL_DIFF, HL_LEVEL_DIFF } from './drills/harrisLineDrills';
import { COLOR_LEVEL_DIFF } from './drills/colorDrills';
import { SP_LEVEL_DIFF } from './drills/soloPianoDrills';
import { FIRST_RANK, NEW_FIRST_FAMILIES } from './drills/firstStepsDiff'; // AUDIT-6 Stage B
import { GUITAR_TOP_RANK } from './drills/guitarTop';
import { bonusSteps, isUnitEndStep, NEIGHBOUR_MOMENTS, neighbourMoments, repSteps, unitEndSteps } from './pathBonus';
import { FLOW_GAME_PREREQ, FLOW_PREREQ, LADDER_WAITS, REP_PREREQ } from './pathPrereq';
import { REPERTOIRE, repRefs } from './repertoire';
import { styleOfLevel, type StyleId } from './styles';
import { isStyleUnit, pathStyleRank, type StyleFocus } from './styleFocus';

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
  /** A game step's tier (GAMES_TIERS_PLAN §5.2): the band of the step's difficulty; the step opens it, 3 stars = its rule met. */
  tier?: import('./gameTiers').DynName;
  /** 0.61 (owner): a level of a measured ladder — a technique family level ('tech') or a vocal program level ('vocal').
   * family = drill family id / vocal program; ref = the drill level id ("scales-3") or the vocal level number ("103"). */
  ladder?: { family: string; level: number; ref: string; instrument?: 'piano' | 'guitar' | 'bass' | 'drums' };
  /** PIANO_JAZZ P2 (pathBonus.ts): an optional bonus step (an advanced game) — never blocks its unit, never the current step. */
  bonus?: boolean;
  /** PIANO_JAZZ P2 (pathBonus.ts): a repertoire item (game 'repertoire'), passed by its measured result only. */
  rep?: { course: import('./repertoire').RepCourse; id: string };
  /** Curriculum flow (consolidation): a practice step — another set of items of this topic level (its step id). */
  practiceOf?: string;
  /**
   * SPEC-PATH-TODAY-PRACTICE §4.4: the channel this step must be played in ("this one by ear" / "from memory"). The step
   * is learned in the player's strong channel unless set; when set, only clean takes in that channel open it
   * (stepChannel.ts) and its run hides the notation accordingly.
   */
  channel?: 'ear' | 'memory';
  title: { en: string; he: string };
}

export type Pack = 'jazz' | 'maqam' | 'absolute' | 'production' | 'post-tonal';
export const PACKS: Pack[] = ['jazz', 'maqam', 'absolute', 'production', 'post-tonal'];

export type StepState = 'done' | 'mastered' | 'tested' | 'quick' | 'refresh' | 'current' | 'open' | 'locked';

export interface UnitStep {
  step: PathStep;
  state: StepState;
  stars?: number;
  /**
   * SPEC-PATH-ROLE §8: the one star scale 0–5 (1–3 = opened, 4 = half the keys at the target / repeated clean,
   * 5 = mastered). Technique steps: from the facts here, the live keys in pathMastery.decorateMastery.
   */
  mstars?: number;
  /** SPEC-PATH-TODAY-PRACTICE §4.2: the one status ladder beside the ✓ (pathMastery.decorateMastery, opened steps). */
  ladder?: import('./statusLadder').Ladder;
  /** A mastered step whose practice has gone stale (keyMastery recency): silver, "refresh" (never loses its ✓). */
  fade?: boolean;
  /** Why a step is ✓ (P19), or why it's a quick check. */
  why?: { en: string; he: string };
  /** The first step of a skill never measured: a short probe (P6). */
  probe?: boolean;
  /** Curriculum-flow rule 5: a teaching step the rating window passed by, back as a quick check (also `probe`). */
  catchup?: boolean;
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
  /** SPEC-PATH-ROLE §4: technique steps whose unit checkpoint's technique part passed ("checked in keys"), and when. */
  keysChecked?: Record<string, string>;
  /** SPEC-PATH-ROLE §8: units sealed as mastered (every step at 5★ and the checkpoint passed), and when — the bonus
   *  XP, league points and badge are given once, when a unit is first sealed. */
  sealed?: Record<string, string>;
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
  { id: 'harmony', name: { en: 'Harmony moves', he: 'הרמוניה בתנועה' }, subs: ['cadences/progression', 'cadences/modulation', 'cadences/harmonize', 'cadences/chromatic', 'cadences/reharm', 'dictation/bass'] },
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
  /** SPEC-WORKOUT §9.4 "Less room": areas whose weight in each unit halves (the "keeps waiting" question). */
  lessRoom?: DomainId[];
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
  /**
   * Curriculum-flow rule 7 (shared credit): step ids passed in the player's other courses. A bridge step (a
   * prerequisite that lives in another course, scheduled in this one) already passed there counts as passed here.
   */
  otherDone?: string[];
  /** SPEC-JAZZ-FOLD §4: the course is in jazz focus — a unit prefers jazz steps among the near ones (jazz comes earlier). */
  jazzFocus?: boolean;
  /**
   * SPEC-STYLE-FOCUS §2: where this course's jazz harmony starts (jazzFold.jazzStartLevel: the intermediate start for a
   * player whose background / climbing / choice used to open the pack). Unmeasured jazz steps are sought from there.
   */
  jazzStart?: number;
  /**
   * SPEC-STYLE-FOCUS §4: the course's style focus. Styled ladder levels of the main style come in style units (every
   * STYLE_UNIT_EVERY-th unit), the "also" styles' when the main has none ready; other styled levels are left out of the
   * path by the caller (ladderHidden) and stay open in Practice. Absent = the old path (no style units).
   */
  styleFocus?: StyleFocus;
}

let LADDER_STYLE: Map<string, StyleId> | null = null;
/** SPEC-STYLE-FOCUS: the style of a technique level by its id (styles.ts styleOfLevel over the catalogues), or null (core). */
export function ladderStyleOf(ref: string): StyleId | null {
  if (!LADDER_STYLE) {
    LADDER_STYLE = new Map();
    for (const f of [...catalog(), ...guitarCatalog()]) for (const l of f.levels) {
      const st = styleOfLevel(l, f);
      if (st) LADDER_STYLE.set(l.id, st);
    }
  }
  return LADDER_STYLE.get(ref) ?? null;
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
  // EAR_THEORY_AUDIT: the advanced jazz ear (the Jazz & improv course).
  'jazz-changes': 'jazz', 'reharm-spot': 'jazz', 'guide-line': 'jazz', 'jazz-phrase': 'jazz', 'jazz-form': 'jazz',
  // THEORY_PLAY (TP-1…TP-4): theory you play, on the Jazz & improv path.
  'triad-pairs': 'jazz', 'pent-super': 'jazz', polychords: 'jazz', 'reharm-own': 'jazz',
  // HARRIS_2 + HARMONY_3 (AUDIT-CONTENT-THEORY §ז.2): Barry Harris unit 2, jazz dictation and planing.
  'bh-three-dim': 'jazz', 'bh-dim-roles': 'jazz', 'bh-m6-bass': 'jazz', 'jazz-dictation': 'jazz', planing: 'jazz',
  // BH-G: the pivot (Barry Harris's pivot arpeggio).
  'bh-pivot-arp': 'jazz',
  // AUDIT-SCALES: Barry Harris borrowing by ear.
  'bh-borrow': 'jazz', 'bh-sixfive': 'jazz', 'bh-moves': 'jazz', 'bh-tesseract': 'jazz',
  // Barry Harris lines by ear (BARRY-HARRIS-METHOD Part D).
  'bh-line-ear': 'jazz',
  // HARMONY-REHARM: colour harmony by ear (one note many chords, mediants, pedal, approach, counter-line, modern colours).
  'ct-degree': 'jazz', mediants: 'jazz', 'pedal-ear': 'jazz', 'approach-chord': 'jazz', 'counter-line': 'jazz', 'modern-color': 'jazz', 'func-color': 'jazz', 'modal-mix': 'jazz',
  // Negative harmony (owner 2026-11-19): a reharm device, in the Jazz course after modal interchange.
  'negative-harmony': 'jazz',
  // Solo jazz piano by ear (Siskind, SISKIND-SOLO-PIANO C1–C3).
  'lh-tex-ear': 'jazz', 'solo-tex-ear': 'jazz', 'comp-rhythm-ear': 'jazz',
  // AUDIT-DEPTH-3 #12: intros and endings by ear.
  'intro-ending': 'jazz',
  // AUDIT-6 §2–3 (course membership rule, courses.ts inCourse): the jazz ear that sat in Ear — the advanced games'
  // jazz-ear topics (voicing types by ear, ii–V chains), rootless and upper-structure voicings, reading a standard's
  // lead sheet — and the Jazz beginner band's blues on-ramp.
  'voicing-type': 'jazz', 'jazz-chains': 'jazz', 'upper-rootless': 'jazz', 'chart-analysis': 'jazz', 'blues-ear': 'jazz',
  maqam: 'maqam', 'eastern-rhythm': 'maqam',
  // AUDIT-7 #13: species counterpoint is conservatory theory, not post-tonal: it sits in the Ear course by its level.
  'set-classes': 'post-tonal',
  // Owner 2026-11-19: Messiaen's modes and twelve-tone rows, after the trichords.
  'messiaen-modes': 'post-tonal', 'twelve-tone': 'post-tonal',
  'eq-ear': 'production', 'space-ear': 'production', 'pan-ear': 'production', 'dyn-ear': 'production', 'filter-ear': 'production', 'tone-hz': 'production', 'width-ear': 'production',
};
/**
 * AUDIT-6 §3: single levels of a mixed topic that are jazz ear (`topic:level`): the jazz voicings, altered and upper
 * extensions, the jazz grids (tritone subs and backdoor, the 12-bar jazz blues, the 32-bar AABA), the bebop scales,
 * jazz progressions and "which jazz form?". The topic's other levels stay in Ear.
 */
export const PACK_LEVELS: Record<string, Pack> = Object.fromEntries([
  'voicings:3', 'voicings:4', 'voicings:5',
  ...[2, 3, 4, 5, 6, 7, 8].map((l) => `extensions:${l}`),
  'grid-dictation:5', 'grid-dictation:7', 'grid-dictation:8',
  'scale-types:5', 'progressions:2', 'next-chord:2', 'song-form:6',
].map((k) => [k, 'jazz' as Pack]));
const PACK_LESSONS: Partial<Record<string, Pack>> = { 'jazz-1': 'jazz', 'jazz-2': 'jazz', 'six-dim': 'jazz', 'jazz-welcome': 'jazz', runs: undefined };
const SUNG_SKILLS: SkillId[] = ['singing', 'technique', 'agility'];

let CATALOGUE: PathStep[] | null = null;
let CAT_KEY = '';

/** Every step there is (all players). Rebuilt when topics are registered later (key = topic/level count). */
export function stepCatalogue(): PathStep[] {
  // AUDIT-6 X1: game-only topics are never path steps, whichever module registered them (Rush used to add 19 jazz
  // steps to the Ear path in the app only); they don't count in the key either.
  // Hidden until verified (verifiedContent.ts): whole topics left out here, single levels in the loop below.
  const pathTopics = Object.entries(TOPIC_GEN).filter(([id, t]) => !t.gameOnly && topicVerified(id));
  const key = pathTopics.map(([k, t]) => `${k}${t.levels.length}`).sort().join(',');
  if (CATALOGUE && CAT_KEY === key) return CATALOGUE;
  const out: PathStep[] = [];
  for (const [topic, T] of pathTopics) {
    for (let level = 1; level <= T.levels.length; level++) {
      if (!topicVerified(topic, level)) continue;
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
        pack: PACK_LEVELS[`${topic}:${level}`] ?? PACK_TOPICS[topic] ?? (topic === 'absolute' ? 'absolute' : undefined),
        forPlays: T.levelPlays?.[level - 1] ?? T.forPlays,
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
  out.push(...measuredSteps());
  out.push(...bonusSteps(), ...repSteps());
  out.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  CATALOGUE = out;
  CAT_KEY = key;
  return out;
}

/**
 * Vocal families (VOICE_CURRICULUM §5, replacing the six 0.61 programs): each lists its level numbers in teaching
 * order — the old levels re-homed by number (their step ids `vocal:<n>` and facts are unchanged), the new ones too.
 * In teaching order: the path opens the first families first.
 */
export const VOCAL_PROGRAMS: { id: string; refs: number[]; title: { en: string; he: string } }[] = VOICE_FAMILIES.map((f) => ({ id: f.id, refs: f.refs, title: f.title }));

// Bass 0.66: position reading after the first reading levels, fills and target-note solos once chords and scales are in.
/**
 * BASS_NICHE_PLAN (P1): where the jazz and prog families start on the bass path (level 1 sits with the level it builds
 * on): swing time after walk 7, Barry Harris after walk 9 and impro 6, form after walk 11, Latin from styles 9; odd
 * meters after time 10, riffs and unisons after odd 2, polymeter after odd 4.
 */
const BASS_NICHE_LATER: Record<string, number> = { 'b-swing': 9, 'b-barry': 12, 'b-jform': 13, 'b-latin': 11, 'b-odd': 10, 'b-prog': 12, 'b-poly': 14,
  // P2: the standards ladder after walk 11 (the first standards), extended techniques after legato 5 (harmonics).
  // (AUDIT-CONTENT-THEORY §ב.4: walking and styles now start two steps in, legato four and reading two, so the
  // families built on them moved with them — position reading too, below.)
  'b-std': 13, 'b-ext': 9,
  // AUDIT-GAPS-2: key changes and turnarounds from ~1330 (after the walking cycle and the first Barry Harris levels).
  'b-keys': 9,
  // AUDIT-GAPS-2: bebop vocabulary on the bass from ~1120 (enclosures) to ~1540 (Barry Harris lines).
  'b-bebop': 6,
  // Phrases by ear: one level every 100 points, ~1200 (chord tones) to ~1900 (8 bars over a form); see LADDER_SPREAD.
  'b-phrase': 50 / 7,
  // AUDIT-DEPTH-3 C3/C4: a head on the bass from ~1330 (roots) to ~1710 (walking the Coltrane reharm).
  'b-tune': 9,
  // AUDIT-DEPTH-3: improvising under rule cards and jazz in context on the bass.
  'b-solo': 8, 'b-ctx': 9,
  // AUDIT-DEPTH-3 #11, #12, C8: on the bandstand (fallback only: every level is placed by levelPlacement GIG_PLACEMENT).
  'b-gig': 9,
  // SPEC-JAZZ-NEIGHBOURS §4, §5: soul / funk bass with the styles (after the funk and shuffle of b-styles), the 2-feel
  // with the first walking levels.
  'b-soul': 6, 'b-nola': 4 };
/**
 * AUDIT-CONTENT-THEORY §ב.4 ("roots & pocket first"): the bass core opened in catalogue order, so muting came at unit
 * 13, locking with the kick at 17 and walking at 32. Now time, the plucking hand, roots and the kick lock lead, muting
 * and the fretting hand one step later, walking (two-feel first) two steps in.
 */
const BASS_CORE_LATER: Record<string, number> = { 'b-time': 0, 'b-pluck': 0, 'b-chord': 0, 'b-pocket': 0, 'b-length': 1, 'b-fret': 1, 'b-ear': 1, 'b-walk': 2, 'b-scale': 2, 'b-read': 2, 'b-styles': 2, 'b-ghost': 3, 'b-pick': 3, 'b-legato': 4, 'b-slap': 6 };
/**
 * AUDIT-CONTENT-THEORY §ב.6: counting and a basic rock beat before rudiments — time and rock lead, single strokes one
 * step later, rolls, fills and snare reading two in, paradiddles (16ths at ♩100) four in.
 */
const DRUM_CORE_LATER: Record<string, number> = { 'd-time': 0, 'd-rock': 0, 'd-strokes': 1, 'd-rolls': 2, 'd-fills': 2, 'd-read': 2, 'd-diddles': 4 };
const DRUM_LATER: Record<string, number> = { 'd-funk': 3, 'd-shuffle': 3, 'd-mideast': 3, 'd-indep': 2, 'd-feet': 2, 'd-ear': 1, 'd-jazz': 4, 'd-latin': 4, 'b-posread': 4, 'b-impro': 4,
  // DRUMS_NICHE_PLAN P1: the drum key and counting early, songs once grooves and fills are in, prog after funk, shuffle,
  // independence and the Middle-Eastern odd meters (plan §5: DRUM_LATER['d-prog'] = 6).
  'd-notation': 1, 'd-count': 2, 'd-form': 3, 'd-song': 4, 'd-prog': 6, ...BASS_NICHE_LATER, ...BASS_CORE_LATER, ...DRUM_CORE_LATER };
/**
 * Ties between families' next levels on the path (same difficulty): the lower rank first, then catalogue order.
 * AUDIT-CONTENT-THEORY §ב: the first steps first; drums count before the groove; bass time before the hands.
 */
export const LADDER_RANK: Record<string, number> = {
  'k-first': -1, 'v-first': -1, ...FIRST_RANK,
  'd-time': 0, 'd-rock': 1, 'd-strokes': 2, 'd-notation': 3,
  'b-time': 0, 'b-pluck': 1, 'b-chord': 2, 'b-pocket': 3, 'b-length': 4, 'b-fret': 5, 'b-walk': 6,
};
/** The first-steps families (AUDIT-CONTENT-THEORY §ז.2): their levels count ✓ for a player who already plays past them. */
export const FIRST_STEP_FAMILIES = ['k-first', 'v-first', ...NEW_FIRST_FAMILIES];
/**
 * Levels that wait for other families' levels on the path: one-octave scales after the thumb passes under, and the
 * curriculum-flow waits (pathPrereq.ts LADDER_WAITS: 7th-chord arpeggios before 7th-chord voicings, …). Never a later
 * level of the same family (ladderPrev would deadlock).
 */
export const LADDER_AFTER: Record<string, string[]> = { 'tech:scales-1': ['tech:k-first-3'], ...LADDER_WAITS };
/** An unstarted family this far (two ladder steps) below everything started opens at once: a gap the old order left. */
const GAP_STEPS = 140;
/**
 * Steps that wait for another step (when both are on the player's path). AUDIT-CONTENT-THEORY §ב.1: reading notes on
 * the staff is taught before the steps that read from it — staff dictation, reading chords off the staff, spelling scales.
 */
const OWN_STEP_PREREQ: Record<string, string[]> = {
  'topic:staff-dictation:1': ['topic:note-reading:1'],
  'topic:chord-read:2': ['topic:note-reading:1'],
  'topic:scale-spelling:1': ['topic:note-reading:1'],
  // AUDIT-7 #1: interval numbers are read off the staff too.
  'topic:interval-number:1': ['topic:note-reading:1'],
  // BH-G (owner 2026-11-14): the pivot itself is taught first, then the scale line with a pivot inside it.
  'topic:bh-pivot:1': ['topic:bh-pivot-arp:1'],
  // Tester 2026-11-18 (Ear, beginner): one new idea at a time, basics before what builds on them. The same note in two
  // homes needs the scale degrees (do-re-mi: 1 3 5) first; open / closed endings need the home note; meter, tempo,
  // articulation and rhythm memory come after the steady-pulse basics. (With EARLY_PREREQ_BELOW these wait a unit.)
  'lesson:bflat-two-homes': ['lesson:degrees-135'],
  'lesson:cadences': ['lesson:degrees-135'],
  'topic:meter-feel:1': ['lesson:basics-beat'],
  'topic:tempo:1': ['lesson:basics-beat'],
  'topic:articulation:1': ['lesson:basics-beat'],
  'topic:rhythm-memory:1': ['lesson:basics-beat'],
  // Chord steps after the first chord lesson (major or minor, by ear), and that one after "What is a chord?"
  // (tester 2026-11-18: chords were used before anything said what a chord is).
  'topic:chord-read:1': ['lesson:major-minor'],
  'topic:chord-member:1': ['lesson:major-minor'],
  'topic:triads:1': ['lesson:major-minor'],
  'lesson:major-minor': ['lesson:chord-intro'],
  'topic:chord-spelling:1': ['lesson:chord-intro'],
  'topic:voice-count:1': ['lesson:chord-intro'],
};
const unionOf = (...ts: Record<string, string[]>[]): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const t of ts) for (const [k, v] of Object.entries(t)) out[k] = [...new Set([...(out[k] ?? []), ...v])];
  return out;
};
/** The step prerequisites: the tester's beginner list above + the curriculum-flow tables (pathPrereq.ts FLOW_PREREQ). */
export const STEP_PREREQ: Record<string, string[]> = unionOf(OWN_STEP_PREREQ, FLOW_PREREQ);
/**
 * Prerequisites for a beginner only (tester 2026-11-18): they hold while the player's frontier on the prerequisite's
 * skill is still in the beginner section (below 900), so a newcomer hears up and down (high / low) before the scale
 * degrees, and a student who is past it is not sent back to it.
 */
export const BEGINNER_PREREQ: Record<string, string[]> = {
  'lesson:degrees-135': ['lesson:basics-pitch'],
};
/**
 * A unit's game drills a concept (chords, intervals, progressions, notes, key signatures, rhythm reading): it waits
 * until the step that introduces the concept was passed (or placed) in an earlier unit — when that step is on the
 * player's path at all. Tester 2026-11-18: the Ear course's first unit played Chord Rush before any chord lesson.
 */
const OWN_GAME_PREREQ: Record<string, string[]> = {
  'rush-chord': ['topic:chord-read:1'],
  'rush-interval': ['lesson:intervals'],
  'rush-progression': ['lesson:cadences'],
  'rush-note': ['topic:note-reading:1'],
  'rush-keysig': ['topic:key-signatures:1'],
  highway: ['lesson:rhythm-r1'],
  // Harmony games: progressions and cadences, chord colours (their minDiff keeps them out of the first units too).
  crossword: ['lesson:cadences'],
  bordercontrol: ['lesson:cadences'],
  holdnote: ['lesson:major-minor'],
  thirdjump: ['lesson:major-minor', 'lesson:cadences'],
  darkside: ['lesson:major-minor', 'lesson:cadences'],
  whichpair: ['lesson:major-minor'],
};
/** Unit games, bonus games (and, by the game's name, the jazz course's bonus steps): the Ear list + every course's (pathPrereq.ts). */
export const GAME_PREREQ: Record<string, string[]> = unionOf(OWN_GAME_PREREQ, FLOW_GAME_PREREQ);
/**
 * Every step some other step waits for (a concept carrier): when the rating window has passed it by, it comes back as
 * a quick check instead of being skipped for good (curriculum-flow rule 5).
 */
export const PREREQ_TARGETS: Set<string> = new Set([
  ...Object.values(STEP_PREREQ).flat(),
  ...Object.values(BEGINNER_PREREQ).flat(),
  ...Object.values(GAME_PREREQ).flat(),
  ...Object.values(PREREQ).flat().map((l) => `lesson:${l}`),
]);
/** Repertoire steps wait for their concept: REP_PREREQ + the item's own topic levels (its "lesson" ways). */
export const REP_STEP_PREREQ: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = { ...REP_PREREQ };
  for (const [course, items] of Object.entries(REPERTOIRE))
    for (const it of items) {
      const id = `rep:${course}:${it.id}`;
      out[id] = [...new Set([...(out[id] ?? []), ...repRefs(it).topics.map((t) => `topic:${t.topic}:${t.level}`)])];
    }
  return out;
})();
/**
 * Tester 2026-11-18: in the first two sections (below solid) a step that builds on another lesson (PREREQ /
 * STEP_PREREQ) waits for a unit after the one that teaches it — never the same unit, so a newcomer meets one new idea
 * and passes it before the next one leans on it. Later, a prerequisite earlier in the same unit is enough.
 */
export const EARLY_PREREQ_BELOW = 1150;
/** Curriculum-flow rule 2 (owner 2026-11-19): new concepts per unit — one new idea at a time, at every level. */
export const MAX_NEW_CONCEPTS = 1;
/** The courses played on an instrument or the voice: their question steps follow the technique road (rule 4). */
export const PLAYING_COURSES: CourseId[] = ['keys', 'guitar', 'bass', 'voice', 'drums'];
/** How far a bridge step's own prerequisites are followed into the other course (rule 7). */
const BRIDGE_DEPTH = 3;

/**
 * Curriculum-flow rule 7: prerequisites that live in another course are scheduled in this one as bridge steps (the
 * same step id, so the credit is shared): a topic's nearest lower level when none of its lower levels is on this path
 * (Jazz voicings 3 after Ear's voicings 2), and a step / lesson prerequisite of another course (lesson:jazz-1 after
 * Ear's cadence lesson; the voice's sing-names after the note-names lesson). A bridge's own prerequisites are followed
 * BRIDGE_DEPTH steps deep; a prerequisite no course of this player can offer stays unmet and never blocks.
 */
export function withBridges(base: PathStep[], inp: PathInput, byId: Map<string, PathStep>): PathStep[] {
  if (!inp.course) return base;
  const have = new Set(base.map((s) => s.id));
  const extra: PathStep[] = [];
  const canBridge = (p: PathStep) =>
    !p.ladder && !isUnitEndStep(p) && p.kind !== 'game' && eligible(p, { ...inp, course: undefined, ladderFamilies: undefined, packs: p.pack ? [...inp.packs, p.pack] : isJazzStep(p) ? [...inp.packs, 'jazz'] : inp.packs });
  const needs = (s: PathStep): string[] => {
    const out = [...(s.kind === 'lesson' ? (PREREQ[s.lesson!] ?? []).map((p) => `lesson:${p}`) : []), ...(STEP_PREREQ[s.id] ?? [])];
    if (s.kind === 'topic' && (s.level ?? 1) > 1) {
      const lower = Array.from({ length: s.level! - 1 }, (_, i) => `topic:${s.topic}:${s.level! - 1 - i}`).filter((id) => byId.has(id));
      // The whole lower chain of the topic comes along (Jazz grid dictation 5 after Ear's 1–4), at the same depth.
      if (lower.length && !lower.some((id) => have.has(id))) out.push(...lower);
    }
    return out;
  };
  let wave = base;
  for (let d = 0; d < BRIDGE_DEPTH && wave.length; d++) {
    const next: PathStep[] = [];
    for (const s of wave)
      for (const pid of needs(s)) {
        if (have.has(pid)) continue;
        const p = byId.get(pid);
        if (!p || !canBridge(p)) continue;
        have.add(pid);
        extra.push(p);
        next.push(p);
      }
    wave = next;
  }
  return extra.length ? [...base, ...extra] : base;
}
/** The previous measured level (licks / transcription) of the same course, in MEASURED_STEP_LEVELS order. */
function measuredPrev(id: string): string | undefined {
  const [game, course, lv] = id.split(':');
  const ls = (MEASURED_STEP_LEVELS as Record<string, Record<string, number[]>>)[game]?.[course] ?? [];
  const i = ls.indexOf(Number(lv));
  return i > 0 ? `${game}:${course}:${ls[i - 1]}` : undefined;
}
/**
 * PIANO_JAZZ: the jazz-piano families come after the lines and voicings they build on — Barry Harris harmony after the
 * Harris lines' block chords, bebop lines after guide tones and the first Harris lines, jazz-piano harmony after the
 * rootless voicings. (With the jazz emphasis the classical families are hidden, so they arrive sooner on that path.)
 */
const KEYS_JAZZ_LATER: Record<string, number> = { 'k-sixdim': 9, 'k-bebop': 6, 'k-reharm': 6,
  // Voice leading (AUDIT-CONTENT-THEORY §ה.2, TP-6 at 900–1600): level 1 after the first chord levels (~910), drop 2 ~1260.
  'k-vl': 3,
  // THEORY_PLAY: theory you play from ~1400 (after the rootless voicings, UST and the first reharm levels).
  'k-theory': 10,
  // AUDIT-GAPS-2: key changes and turnarounds from ~1330 (LADDER_SPREAD keeps the 12 levels inside ~1330–1640).
  'k-keys': 9,
  // AUDIT-GAPS-2: bebop vocabulary from the swing on-ramp (~980) to the click that moves (~1610).
  'k-vocab': 4,
  // Phrases by ear: ~1200 (one bar of chord tones) to ~1900 (8 bars over a form), a level every 100 (LADDER_SPREAD).
  'k-phrase': 50 / 7,
  // AUDIT-DEPTH-3: harmonise a melody ~1330 → 1750; comp a head ~1330 → 1780 (LADDER_SPREAD).
  'k-harm': 9,
  'k-tune': 9,
  // AUDIT-DEPTH-3: improvising under rule cards from ~1190 (guide tones) to the duo and the written chorus (~1880);
  // jazz in context (brothers, backdoor, superimposition, Coltrane sub, intros / endings, ballads) ~1330–1880.
  'k-solo': 7, 'k-ctx': 9,
  // AUDIT-DEPTH-3 #11, #12, C8: on the bandstand (fallback only: levelPlacement GIG_PLACEMENT places every level).
  'k-gig': 9,
  // Barry Harris lines: every level is placed by KEYS_LEVEL_DIFF; this is only the fallback.
  'k-harrisline': 6,
  // Solo jazz piano (Siskind): every level is placed by KEYS_LEVEL_DIFF; these are only the fallbacks.
  'k-lh': 1, 'k-tex': 4, 'k-comp': 8, 'k-impro': 1 };
/**
 * PIANO_AUDIT I2: every piano family's level 1 sat at the same difficulty as scales L1 — octaves (advanced L1), Barry
 * Harris lines and rootless voicings came in the first unit. Now the basics lead (scales, five-finger, the pianist's
 * ear, Alberti / cadences one step later) and the jazz and advanced families start after a few scale levels.
 */
/**
 * Piano levels placed by their own difficulty instead of their index in the family (ladderOrder sorts by difficulty, so
 * a later-added easier level opens before the harder ones after it). BH-G: the pivot sits at ~1450–1650,
 * between the Harris lines' block chords (harris 7) and the brothers (harris 8).
 */
export const KEYS_LEVEL_DIFF: Record<string, number> = {
  // AUDIT-DEPTH-3 §0: the Harris levels sat at 980–2170 by index, and the half-step rules (h14) and ii–V–I by the rules
  // (h15) came after the pivot levels that use them. Now the whole family sits inside 980–1760 with the rules first.
  'harris-1': 980, 'harris-2': 1020, 'harris-3': 1060, 'harris-4': 1100, 'harris-5': 1140, 'harris-6': 1180, 'harris-7': 1220,
  'harris-8': 1240, 'harris-9': 1260, 'harris-10': 1280, 'harris-11': 1320, 'harris-12': 1340, 'harris-13': 1360,
  'harris-14': 1390, 'harris-15': 1420,
  'harris-19': 1440, 'harris-20': 1480, 'harris-21': 1520, 'harris-22': 1560, 'harris-23': 1600, 'harris-24': 1650,
  'harris-16': 1680, 'harris-17': 1720, 'harris-18': 1760,
  // AUDIT-SCALES (owner 2026-11-14): the scale matrix (one-octave hands together and minor scales early, the modes after
  // the jazz scales, 4 octaves last, under PATH_CAP), the Harris diminished scales up and down, hand independence, the
  // scale-harmonization ladder (lines / 3rds ~900–1100, triads / 7ths 1100–1350, drops, borrowing, Harris 1350–1700).
  // scales 1–15 keep their places (700 + 70 a level), so the 18 new levels don't squeeze them under PATH_CAP.
  ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`scales-${i + 1}`, 700 + 70 * i])),
  // Curriculum flow (Instruments audit K6): harmonic minor hands together after harmonic minor hands separately
  // (scales-5, 980) and natural minor (scales-17, 990).
  'scales-16': 1000, 'scales-17': 990, 'scales-18': 1060,
  // K1: maj7 / m7 / ø7 arpeggios before the 7th-chord voicings and shells that use them (voicings-2, k-lh-4 wait for it).
  'arpeggios-7': 960,
  'scales-19': 1530, 'scales-20': 1570, 'scales-21': 1610, 'scales-22': 1650, 'scales-23': 1690, 'scales-24': 1730, 'scales-25': 1770, 'scales-26': 1810, 'scales-27': 1850,
  'scales-28': 1490, 'scales-29': 1510, 'scales-30': 1860, 'scales-31': 1870, 'scales-32': 1885, 'scales-33': 1900,
  // TECHNIQUE-COVERAGE-AUDIT §4.6: bebop scales LH / hands together after the RH (scales-12, 1470); melodic minor a
  // 3rd / 6th / 10th apart after harmonic minor's (scales-13, 1540).
  'scales-34': 1520, 'scales-35': 1580,
  // RCM Levels 9–10: the harmonic minor formula pattern, 4 octaves — after the 4-octave scales (scales-10, 1330) and
  // harmonic minor in contrary motion (scales-13, 1540).
  'scales-36': 1560,
  'harris-25': 1020, 'harris-26': 1100,
  // Colours of the diminished (dimColours.ts): after Harris's diminished moves (harris-13, 1360) — the half-step moves
  // first, then the whole-step and two-note colours, drop 2 and the whole run.
  'k-dimcol-1': 1380, 'k-dimcol-2': 1400, 'k-dimcol-3': 1440, 'k-dimcol-4': 1480, 'k-dimcol-5': 1520, 'k-dimcol-6': 1570, 'k-dimcol-7': 1630,
  ...K_INDEP_DIFF,
  // SPEC-PRACTICE-KEYS §6: the modes as full scales (major modes 1540–1890; symmetric 1600–1880, melodic / harmonic
  // minor modes 1640–1895).
  ...MODE_LEVEL_DIFF,
  ...K_HARM_DIFF,
  // SPEC-KEY-SESSION: the approach licks after the harmonised scale's arpeggios; the key's extra exercises alongside.
  ...K_KEYLICK_DIFF,
  ...K_KEYX_DIFF,
  // SPEC-JAZZ-NEIGHBOURS §2, §3: bossa / samba comping ~900–1420, the montuno ~980–1480 (open from the start, no gate).
  ...LATIN_LEVEL_DIFF,
  // SPEC-JAZZ-NEIGHBOURS §4–§6: gospel ~880–1470, soul-jazz ~1050–1400, stride / boogie ~900–1340, odd meters in jazz
  // ~1150–1510 (open from the start, no gate).
  ...SOUL_LEVEL_DIFF,
  ...NOLA_LEVEL_DIFF,
  ...ODD_LEVEL_DIFF,
  // Barry Harris lines (BARRY-HARRIS-METHOD Part D): each level at its own rating, ~1100–1750, keys and bass.
  ...HL_LEVEL_DIFF, ...B_LEVEL_DIFF,
  // HARMONY-REHARM (colorDrills.ts): one note many chords, mediants, organ, k-reharm 11–22 and b-counter, ~1050–1800.
  ...COLOR_LEVEL_DIFF,
  // k-reharm 1–10 keep their places (700 + 70 × (6 + i)); the family is placed level by level now (11–22 interleave).
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k-reharm-${i + 1}`, 700 + 70 * (6 + i)])),
  // The borrowed-chord reharm of a head (k-tune 10): before the Coltrane level, under the cap.
  'k-tune-10': 1700,
  // AUDIT-DEPTH-3 C2: embellish the head — approach 1350, enclose 1420, pivots 1500, free 1600 (the doc's 1350–1650).
  'k-tune-11': 1350, 'k-tune-12': 1420, 'k-tune-13': 1500, 'k-tune-14': 1600,
  // C3 step 5 / #2 L6: a solo chorus over the reharm (after the reharm levels).
  'k-tune-15': 1760,
  // the same on the bass (the melody an octave or two down): inside the heads' band, after the walking levels' start.
  'b-tune-8': 1400, 'b-tune-9': 1470, 'b-tune-10': 1550, 'b-tune-11': 1640,
  // HARMONY-REHARM still open: borrowed chords by ear on the bass, in the modal-mix band (ear 1100–1700).
  'b-ear-24': 1450,
  // Solo jazz piano after Jeremy Siskind (SISKIND-SOLO-PIANO Part C): the left hand ~760–1620, textures 1000–1900,
  // comping vocabulary 1250–1650, improvisation habits 780–1200 — each level at its own rating.
  ...SP_LEVEL_DIFF,
  // Siskind's shared hands as k-harm 8 (heads.ts hm-shared): after drop 3 (1750), inside the heads' 1300–1800 band.
  'k-harm-8': 1780,
  // AUDIT-DEPTH-3 C1, #1, #3 (heads.ts): triads under a melody first (1250), then the 6-dim ladder — blocks, drop 2,
  // borrowing, a line that breaks into blocks at its peaks — 1450 → 1680 (inside the heads' band).
  'k-harm-9': 1450, 'k-harm-10': 1520, 'k-harm-11': 1600, 'k-harm-12': 1680, 'k-harm-13': 1250,
};
/**
 * AUDIT-DEPTH-3 §0: the top of the path scale. A family whose levels would run past it by index (accomp, voicings,
 * k-sixdim, the long bass families) is squeezed: its levels keep their order and spread evenly up to the cap.
 */
export const PATH_CAP = 1900;
/** Families whose level order on the path is not their number order (placed by grade, or by KEYS_LEVEL_DIFF). */
export const NON_MONOTONE_FAMILIES = [
  // STAGE C (AUDIT-6 GA-4): the Coltrane sub in context (g-ctx 8) moved to the diploma grade 10, above ctx 9–11.
  'g-ctx',
  'harris', 'scales', 'k-mmhm', 'k-sharm', 'k-harrisline', 'b-harrisline', 'g-harrisline', 'k-reharm', 'k-tune', 'k-harm', 'b-tune', 'g-tune', 'k-lh', 'k-tex', 'k-comp', 'k-impro',
  // AUDIT-6 (levelPlacement.ts): a level whose number came after harder ones moved to its grade; ids stay, so the number
  // can't follow (control-11 sight-reading, arpeggios-9, cadences-5/6, k-rhythm-2; the bass stylistic studies,
  // pentatonic one by one, the jazz waltz, the 3–7 shells; the drum rudiments, 7/8 and the unseen reading).
  'control', 'arpeggios', 'cadences', 'k-rhythm', 'b-styles', 'b-scale', 'b-walk', 'b-ext', 'd-diddles', 'd-count', 'd-read',
  // AUDIT-7 #12: the groove-development level (d-fills 9) and the grade 4–6 PAS rudiments sit below their families' later numbers.
  'd-fills', 'd-pas',
  // HARMONY-REHARM: b-ear 24 (borrowed chords by ear) sits at its own rating among the cadence levels; the guitar's
  // open-string pedal (g-color 13–15, grades 5–6) is placed by grade after the grade 7–9 colour levels.
  'b-ear', 'g-color',
  // TECHNIQUE-COVERAGE-AUDIT §4.6: Hanon Part I (fingers 15–18) sits at its grade, before the later finger levels.
  'fingers'];
/** Path steps per level for a family of `n` levels starting `later` steps in: LADDER_SPREAD, squeezed under PATH_CAP. */
export function spreadOf(family: string, n: number, later: number): number {
  const base = LADDER_SPREAD[family] ?? 1;
  if (n <= 1) return base;
  const room = (PATH_CAP - 700) / 70 - later;
  return Math.max(0.2, Math.min(base, room / (n - 1)));
}
export const KEYS_LATER: Record<string, number> = { 'k-first': -2, scales: 0, fingers: 0, 'k-ear': 0, arpeggios: 1, cadences: 1, control: 1, accomp: 2, voicings: 3, harris: 4, jazz: 4, advanced: 6, 'k-indep': 3, 'k-sharm': 3, ...KEYS_JAZZ_LATER };
// AUDIT-CONTENT-THEORY R-1/R-2/R-5: rhythm & meter on the keys starts after the first scale levels.
KEYS_LATER['k-rhythm'] = 3;
/**
 * VOICE_CURRICULUM §8: every vocal program's level 1 sat at diff(0) = 700 — Barry Harris L1, harmony L1 and modes L1
 * next to "hold a note" L1. Now the families start by stage (A Song Singer → D Jazz Artist): breath, pitch and songs
 * first, Barry Harris after the scat and standards families have begun. The old program ids keep a place too.
 */
export const VOICE_LATER: Record<string, number> = {
  'v-first': -2, 'v-breath': 0, 'v-pitch': 0, 'v-songs': 0, 'v-range': 1, 'v-time': 1, 'v-ear': 1, 'v-dyn': 2, 'v-scale': 2, 'v-sight': 2,
  'v-vib': 3, 'v-agility': 3, 'v-harmony': 3, 'v-inflect': 4, 'v-standards': 4, 'v-scat': 5, 'v-barry': 6,
  'v-ladder': 0, 'v-modes': 2, 'v-ornament': 4,
  // AUDIT-7 (fallback only: every level has its rating in audit7Placement.ts).
  'v-jazz1': 2, 'v-impro': 2, 'v-pop': 4,
};
/** Guitar families' teaching rank inside a grade (GUITAR_DEEPENING §5): the hands and chords first, the ear and improvising after. */
export const GUITAR_RANK: Record<string, number> = { 'g-fretting': 0, 'g-chords': 1, 'g-rhythm': 2, 'g-fingerstyle': 2, 'g-picking': 3, 'g-flamenco': 3, 'g-scales': 4, 'g-jazz': 4, 'g-ear': 5, 'g-prog': 5, 'g-legato': 6, 'g-harris': 6, 'g-theory': 6, 'g-lead': 7, 'g-arps': 8, 'g-reading': 9, 'g-impro': 10 };
// AUDIT-CONTENT-THEORY R-4: meter & cross-rhythm with rhythm guitar.
GUITAR_RANK['g-meter'] = 2;
// AUDIT-GAPS-2: key changes and turnarounds with the Barry Harris and theory families.
GUITAR_RANK['g-keys'] = 6;
/**
 * Path steps per level for families whose levels sit closer than one step apart (default 1 = 70 points a level).
 * AUDIT-GAPS-2: the key-change families have twelve short levels inside ~1330–1640 (piano and bass; guitar is by grade).
 */
export const LADDER_SPREAD: Record<string, number> = { 'k-keys': 0.4, 'b-keys': 0.4, 'k-tune': 0.8, 'b-tune': 0.9,
  // Phrases by ear: 100 points a level (700 + 70 × (50/7 + 10/7 × i) = 1200 + 100 i).
  'k-phrase': 10 / 7, 'b-phrase': 10 / 7 };
// AUDIT-GAPS-2: bebop vocabulary and lines on the neck, with the lead and Harris families.
GUITAR_RANK['g-bebop'] = 7;
// Phrases by ear on the neck: with the guitarist's ear (grades 6–9).
GUITAR_RANK['g-phrase'] = 5;
// AUDIT-DEPTH-3: a head comped on the neck with the theory families; chord-melody with the lead families.
GUITAR_RANK['g-tune'] = 6;
GUITAR_RANK['g-cmel'] = 7;
// AUDIT-DEPTH-3: jazz in context with the Harris and theory families; improvising under rule cards with improvisation.
GUITAR_RANK['g-ctx'] = 6;
// AUDIT-DEPTH-3 #11, #12, C8: on the bandstand with the jazz-in-context family.
GUITAR_RANK['g-gig'] = 6;
GUITAR_RANK['g-solo'] = 1,
// Barry Harris lines on the neck: with the Harris family (grades 6–9).
GUITAR_RANK['g-harrisline'] = 6;
// HARMONY-REHARM: one note many chords and colour harmony on the neck, with the theory families.
GUITAR_RANK['g-ctone'] = 6;
GUITAR_RANK['g-color'] = 6;
// AUDIT-7 #2: the jazz entry over the blues, with the jazz family (each level has its own rating, audit7Placement.ts).
GUITAR_RANK['g-jblues'] = 4;
// SPEC-JAZZ-NEIGHBOURS §2, §3: the bossa batida and the guajeo with the rhythm guitar.
GUITAR_RANK['g-brazil'] = 2;
GUITAR_RANK['g-guajeo'] = 2;
// SPEC-JAZZ-NEIGHBOURS §4: soul-jazz comping and funk with the rhythm guitar.
GUITAR_RANK['g-soul'] = 2;
// STAGE C (AUDIT-6 GA-4): the families above grade 8 (guitarTop.ts).
Object.assign(GUITAR_RANK, GUITAR_TOP_RANK);
/**
 * The order of a family's levels on the path: by path difficulty, then level number. AUDIT-CONTENT-THEORY §ב.3: guitar
 * levels sit by grade, but the family's next level used to be the next number, so a later-added easier level (picking 4
 * at grade 5 after picking 3 at grade 6, scales 8, arps 6, jazz 8 and 13, prog 6 …) waited behind a harder one. Level ids
 * are unchanged (saved progress keys stay valid); other instruments' difficulties rise with the level, so nothing moves.
 */
export const ladderOrder = (a: PathStep, b: PathStep): number => a.difficulty - b.difficulty || a.ladder!.level - b.ladder!.level;
/** A guitar grade's base rating (levelPlacement.guitarGradeBase: G(grade) to 8, the diploma grades 9–11 above it). */
export { guitarGradeBase };
/** A guitar level's path difficulty from its grade (0 = Debut … 8, 9–11 = diploma): the grade's base + 8·rank (rank ≤ 10, so a grade always outranks the rank). */
export const guitarPathDifficulty = (family: string, grade: number): number => guitarGradeBase(grade) + 8 * (GUITAR_RANK[family] ?? 5);
/** Every level of every technique family and vocal program as a path step (0.61, owner: technique inside the course path). */
function ladderSteps(): PathStep[] {
  const out: PathStep[] = [];
  const diff = (i: number) => 700 + i * 70;
  for (const f of catalog())
    f.levels.forEach((lv, i) =>
      out.push({ id: `tech:${lv.id}`, kind: 'tech', ladder: { family: f.id, level: lv.level, ref: lv.id, instrument: 'piano' }, skill: 'instrument', sub: 'instrument/piano-tech', domain: 'instrument', difficulty: Math.min(PATH_CAP, LEVEL_PLACEMENT[lv.id] ?? KEYS_LEVEL_DIFF[lv.id] ?? Math.round(diff(i * spreadOf(f.id, f.levels.length, KEYS_LATER[f.id] ?? 0) + (KEYS_LATER[f.id] ?? 0)))), choices: 0, forPlays: ['keys', 'piano'], title: { en: `${f.title.en} · ${lv.title.en}`, he: `${f.title.he} · ${lv.title.he}` } }),
    );
  for (const f of guitarCatalog()) {
    // Drums (0.65): the drum families are path steps of the drums course (forPlays 'drums' → inCourse).
    const inst = f.instruments.includes('guitar') ? 'guitar' : f.instruments.includes('drums') ? 'drums' : 'bass';
    // Drums v2 families (DRUMS_AUDIT N1) come after the basics: their level 1 sits with the rock grooves' L3–L4.
    const from = DRUM_LATER[f.id] ?? 0;
    // GUITAR_DEEPENING §5 (owner 2026-11-11): guitar levels sit by their RSL-equivalent grade, families interleaved
    // inside a grade by teaching rank (sweep picking at grade 8 after 3nps scales at 7; 3nps picking with 3nps scales).
    // AUDIT-6 (levelPlacement.ts): a curated per-level rating wins; then the guitar grade; then the index placement
    // (the drums staggered by family so their families no longer share the same rungs).
    const stagger = inst === 'drums' ? DRUM_STAGGER[f.id] ?? 0 : 0;
    const gDiff = (lv: { grade?: number; id?: string }, i: number) => Math.min(PATH_CAP, LEVEL_PLACEMENT[lv.id ?? ''] ?? (inst === 'guitar' && lv.grade !== undefined ? guitarPathDifficulty(f.id, lv.grade) : (KEYS_LEVEL_DIFF[lv.id ?? ''] ?? Math.round(diff(i * spreadOf(f.id, f.levels.length, from) + from) + stagger))));
    f.levels.forEach((lv, i) =>
      out.push({ id: `tech:${lv.id}`, kind: 'tech', ladder: { family: f.id, level: lv.level, ref: lv.id, instrument: inst }, skill: 'instrument', sub: `instrument/${inst === 'drums' ? 'drum' : inst}-tech`, domain: 'instrument', difficulty: gDiff(lv as { grade?: number; id?: string }, i), choices: 0, forPlays: [...f.instruments], title: { en: `${f.title.en} · ${lv.title.en}`, he: `${f.title.he} · ${lv.title.he}` } }),
    );
  }
  // AUDIT-6 V-W1: a vocal level sits where its items' ratings put it (levelPlacement.voiceItemRating), or at its
  // curated place; the family keeps rising in its teaching order. The old index placement is only the fallback.
  for (const pr of VOCAL_PROGRAMS) {
    const ds = monotoneFamily(pr.refs.map((n, i) => Math.min(PATH_CAP, LEVEL_PLACEMENT[`vocal:${n}`] ?? vocalItemsRating(n) ?? diff(i + (VOICE_LATER[pr.id] ?? 0)))));
    pr.refs.forEach((n, i) => {
      out.push({ id: `vocal:${n}`, kind: 'vocal', ladder: { family: pr.id, level: i + 1, ref: String(n) }, skill: 'singing', sub: 'singing/vocal-ladder', domain: 'voice', difficulty: Math.min(PATH_CAP, ds[i]), choices: 0, sung: true, mic: true, title: { en: `${pr.title.en} · ${i + 1}`, he: `${pr.title.he} · ${i + 1}` } });
    });
  }
  return out;
}

/** A vocal level's path rating from its items' mean rating (none when its items carry no rating). */
export function vocalItemsRating(n: number): number | undefined {
  const ds = (vocalLevelByRef(n)?.items ?? []).map((x) => (x as { difficulty?: number }).difficulty).filter((x): x is number => typeof x === 'number');
  return ds.length ? voiceItemRating(ds.reduce((a, b) => a + b, 0) / ds.length) : undefined;
}

/**
 * Licks and transcription (SPEC-LICKS-TRANSCRIPTION): a few measured steps per course — game steps that open the lick
 * trainer / the transcription coach on a level. Jazz: the vocabulary (creative) and transcription (jazz pack); keys,
 * guitar, bass: on the instrument; voice: sung. They pass only by measured playing (checkStep), like the ladders.
 */
export const MEASURED_STEP_LEVELS: Record<'licks' | 'transcribe', Record<'jazz' | 'keys' | 'guitar' | 'bass' | 'voice', number[]>> = {
  licks: { jazz: [1, 2, 3, 4], keys: [1, 2, 3], guitar: [1, 2, 3], bass: [1, 2], voice: [1, 2] },
  // Guitar and bass reach the solo phrase over ii–V–I (L9), as the keys do (owner 2026-11-14).
  transcribe: { jazz: [4, 5, 6, 7, 8], keys: [2, 4, 6, 9], guitar: [2, 4, 6, 8, 9], bass: [2, 4, 6, 8, 9], voice: [1, 3, 5] },
};
function measuredSteps(): PathStep[] {
  const out: PathStep[] = [];
  const T = { licks: { en: 'Licks', he: 'ליקים' }, transcribe: { en: 'Transcribe', he: 'תמלול' } };
  for (const game of ['licks', 'transcribe'] as const)
    for (const [course, levels] of Object.entries(MEASURED_STEP_LEVELS[game]))
      for (const level of levels) {
        const base = { id: `${game}:${course}:${level}`, kind: 'game' as const, game, level, choices: 0, title: { en: `${T[game].en} · ${level}`, he: `${T[game].he} · ${level}` } };
        const difficulty = game === 'licks' ? 880 + level * 120 : 820 + level * 95;
        if (course === 'jazz')
          out.push(game === 'licks' ? { ...base, skill: 'improv', sub: 'improv/vocab', domain: 'creative', difficulty } : { ...base, skill: 'dictation', sub: 'dictation/transcribe', domain: 'memory', pack: 'jazz', difficulty });
        else if (course === 'voice') out.push({ ...base, skill: 'singing', sub: 'singing/sequence', domain: 'voice', difficulty, sung: true, mic: true });
        else out.push({ ...base, skill: 'instrument', sub: `instrument/${course === 'keys' ? 'piano' : course}-tech`, domain: 'instrument', difficulty, forPlays: course === 'keys' ? ['keys', 'piano'] : [course] });
      }
  return out;
}

// ---------------------------------------------------------------- filters

/** Steps this player's path can contain (areas, packs, instruments, singing). */
export function eligible(s: PathStep, inp: Pick<PathInput, 'leaveOut' | 'packs' | 'plays' | 'track'> & Partial<Pick<PathInput, 'hidden' | 'noSing' | 'noMic' | 'course' | 'ladderFamilies' | 'ladderHidden'>>): boolean {
  if (inp.course && !inCourse(s, inp.course)) return false;
  // Ladder steps only where the course asked for them (and only for its families / programs).
  if (s.ladder && !inp.ladderFamilies?.includes(s.ladder.family)) return false;
  if (s.ladder && inp.ladderHidden?.includes(s.ladder.ref)) return false;
  // AUDIT-7 #2: the pianist's solo-hand topics only for a player of the keys.
  if (s.topic && PIANO_ONLY_JAZZ_TOPICS.includes(s.topic) && !playsKeys(inp.plays)) return false;
  if (inp.leaveOut.includes(s.domain)) return false;
  if (s.sung && (inp.leaveOut.includes('voice') || inp.noSing)) return false;
  if (s.mic && inp.noMic) return false;
  if (s.topic && inp.hidden?.includes(s.topic)) return false;
  if (s.pack && !inp.packs.includes(s.pack)) return false;
  // SPEC-JAZZ-FOLD §2: jazz content (the pack's steps, improvising, the jazz technique families) only with the jazz pack.
  if (!inp.packs.includes('jazz') && isJazzStep(s)) return false;
  if (s.forPlays && !s.forPlays.some((p) => inp.plays.includes(p))) {
    // The keyboard map 1–3 is the theory picture: offered to everyone (spec AE §4.1; AUDIT-CONTENT-THEORY §ב.1 — note
    // names on the keys for every beginner, not only students and pros).
    const keysForAll = isKeysForAll(s);
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

/** Beyond the beginner section: a ladder level this hard, done or ✓ by test, means the first steps are behind the player. */
const PAST_FIRST_STEPS = 840;
let LADDER_BY_ID: Map<string, PathStep> | null = null;
/** A technique / vocal ladder step by its id ("tech:<level id>"), as the path defines it (its channel included). */
export function ladderStepById(id: string): PathStep | undefined {
  if (!LADDER_BY_ID) LADDER_BY_ID = new Map(ladderSteps().map((x) => [x.id, x] as const));
  return LADDER_BY_ID.get(id);
}
/**
 * Has the player arrived already playing past the first steps of this instrument / the voice? Curriculum-flow rule 1
 * (all three audits, R1): only evidence from outside the path counts — a level test / placement (✓ by test), or a
 * ladder level done that the path never scheduled (the Drills hub). A player walking the first steps on the path
 * (any level of the family passed) finishes them there: the path's own unit-3 levels (fingers-3, g-chords-3,
 * b-time-3, d-time-3, vocal:601) no longer tick the rest off.
 */
export function playsPastFirstSteps(s: PathStep, facts: PathFacts): boolean {
  if (!LADDER_BY_ID) LADDER_BY_ID = new Map(ladderSteps().map((x) => [x.id, x] as const));
  const fam = s.ladder!.family;
  const done = Object.entries(facts.steps ?? {}).filter(([, v]) => v.stars > 0).map(([k]) => k);
  if (done.some((id) => LADDER_BY_ID!.get(id)?.ladder?.family === fam)) return false;
  const scheduled = new Set((facts.units ?? []).flatMap((u) => u.steps));
  const ids = [...done.filter((id) => !scheduled.has(id)), ...Object.keys(facts.tests ?? {})];
  return ids.some((id) => {
    const o = LADDER_BY_ID!.get(id);
    return !!o && o.kind === s.kind && o.ladder!.instrument === s.ladder!.instrument && !FIRST_STEP_FAMILIES.includes(o.ladder!.family) && o.difficulty >= PAST_FIRST_STEPS;
  });
}

export function checkStep(s: PathStep, inp: PathInput, subs: Map<string, SubEvidence>): CheckVerdict {
  // Ladder steps are passed only by measured playing / singing (owner, 0.61) — never by rating evidence.
  if (s.ladder) {
    if (inp.facts.tests?.[s.id]) return { state: 'tested', why: { en: '✓ from your playing test', he: '✓ ממבחן הנגינה' } };
    // The first steps (posture, holding, the first notes) are ✓ once the player has played past them on the same instrument.
    if (FIRST_STEP_FAMILIES.includes(s.ladder.family) && playsPastFirstSteps(s, inp.facts)) return { state: 'tested', why: { en: '✓ you already play past the first steps', he: '✓ אתם כבר מנגנים מעבר לצעדים הראשונים' } };
    return { state: null };
  }
  if (s.kind === 'check' || s.kind === 'review') return { state: null };
  // Licks / transcription steps: only measured playing passes them (never rating evidence from elsewhere).
  if (s.game === 'licks' || s.game === 'transcribe') return { state: null };
  // Bonus games and repertoire items (pathBonus.ts): only their own measured results pass them.
  if (s.bonus || s.rep) return { state: null };
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
    const w = (g || (top3 ? 1 : 0)) * rankW(a) * (inp.lessRoom?.includes(a) ? 0.5 : 1);
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
  const byId = new Map(stepCatalogue().map((s) => [s.id, s] as const));
  const own = stepCatalogue().filter((s) => eligible(s, inp));
  const all = withBridges(own, inp, byId);
  const ownIds = new Set(own.map((s) => s.id));
  /** A bridge step (rule 7): taken in a first pass only as the prerequisite of a step of this course. */
  const bridged = (s: PathStep) => !ownIds.has(s.id);
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
      // SPEC-PATH-ROLE §8: one star scale; mastered = 5★ (technique: every key at the target tempo; ear / theory:
      // repeated clean, spaced, accurate and at speed).
      const ms = masteryStars(s, d, subs.get(s.sub), inp.speed?.[s.sub], doneSteps, inp.facts.tests);
      return { step: s, state: ms >= 5 ? 'mastered' : 'done', stars: d.stars, mstars: ms, ...extra };
    }
    const v = verdict.get(s.id);
    if (v?.state === 'tested') return { step: s, state: 'tested', why: v.why, mstars: 0, ...extra };
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
    // SPEC-PATH-ROLE §4 / §6 Q2 (owner): the checkpoint is promotion, never a gate — a unit whose steps are done is past
    // and the next unit opens; its checkpoint stays open (pendingChecks) and only the rank waits for it.
    const complete = steps.every((x) => x.step.bonus || x.step.kind === 'check' || x.state === 'done' || x.state === 'mastered' || x.state === 'tested');
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
  // Shared credit (curriculum-flow rule 7): a bridge step passed in another course counts here too.
  const otherDone = new Set(inp.otherDone ?? []);
  const taken = new Set<string>([...placedIds, ...all.filter((s) => isDone(s.id) || isChecked(s.id) || otherDone.has(s.id)).map((s) => s.id)]);
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

  const onPath = new Set(all.map((x) => x.id));
  /** The lessons / steps a step builds on (PREREQ, STEP_PREREQ, and BEGINNER_PREREQ while the player is a beginner in it). */
  const stepPrereqs = (s: PathStep): string[] => [
    ...(s.kind === 'lesson' ? (PREREQ[s.lesson!] ?? []).map((p) => `lesson:${p}`) : []),
    ...(STEP_PREREQ[s.id] ?? []),
    ...(BEGINNER_PREREQ[s.id] ?? []).filter((pid) => {
      const p = byId.get(pid);
      return !!p && fr(p.skill) < 900;
    }),
  ];
  /** A prerequisite still to come (EARLY_PREREQ_BELOW: early on, one scheduled in this same unit is not enough). */
  const waitsFor = (s: PathStep, pid: string, scheduled: Set<string>) => onPath.has(pid) && !taken.has(pid) && !(s.difficulty >= EARLY_PREREQ_BELOW && scheduled.has(pid));
  /**
   * Curriculum-flow rule 7: a topic level waits for the nearest lower level of the topic on this player's path (a
   * hidden level, or one of another course that was not bridged, is skipped) — not just level − 1.
   */
  const prevLevel = (s: PathStep): string | undefined => {
    if (s.kind !== 'topic') return undefined;
    for (let l = (s.level ?? 1) - 1; l >= 1; l--) {
      const id = `topic:${s.topic}:${l}`;
      if (onPath.has(id)) return id;
    }
    return undefined;
  };
  /** A concept carrier (rule 5): a teaching lesson, a step something waits for, or a topic's first level on the path. */
  const carrier = (s: PathStep) => !!s.teach || PREREQ_TARGETS.has(s.id) || (s.kind === 'topic' && !prevLevel(s));
  /** A practice level the rating window has passed by (more than 150 below the skill): known, it no longer blocks. */
  const passedBy = (pid: string) => {
    const p = byId.get(pid);
    return !!p && !carrier(p) && p.difficulty < fr(p.skill) - 150;
  };
  /** The sub-skills some step of this path trains (a SUB_PREREQ no step can meet never blocks: rule 7 / audit R4). */
  const pathSubs = new Set(all.map((s) => s.sub));
  /** Everything but the step prerequisites: the previous level of a topic / ladder, and the sub-skills it needs. */
  const baseOk = (s: PathStep, scheduled: Set<string>) => {
    // The previous level of the same topic first — passed in an earlier unit (rule 3: one level of a topic per unit).
    // A passed-by level lets the next one through only when everything below it is passed or passed by too (the
    // topic's first level, a concept carrier, is never passed by: it comes back as a quick check).
    for (let prev = prevLevel(s); prev && !taken.has(prev); prev = prevLevel(byId.get(prev)!)) if (!passedBy(prev)) return false;
    if (s.ladder) {
      const lp = ladderPrev.get(s.id);
      // A previous level left out of this path (N10: low B on a 4-string) doesn't block the next one.
      if (lp && onPath.has(lp) && !taken.has(lp) && !scheduled.has(lp)) return false;
    }
    // Licks / transcription: the previous measured level of the course first (Instruments audit R5).
    if (s.game === 'licks' || s.game === 'transcribe') {
      const mp = measuredPrev(s.id);
      if (mp && onPath.has(mp) && !taken.has(mp) && !passedBy(mp)) return false;
    }
    for (const p of SUB_PREREQ[s.sub] ?? []) {
      const area = domainOf(p.split('/')[0] as SkillId);
      if (inp.leaveOut.includes(area)) continue; // P15
      if (!pathSubs.has(p)) continue;
      if (!seenSubs.has(p)) return false;
    }
    return true;
  };
  const prereqOk = (s: PathStep, scheduled: Set<string>) => baseOk(s, scheduled) && !stepPrereqs(s).some((pid) => waitsFor(s, pid, scheduled));

  /** The step ids a step builds on: its topic's previous level, its ladder's previous level, PREREQ, STEP_PREREQ. */
  const prereqIdsOf = (s: PathStep): string[] => [
    ...(s.practiceOf ? [s.practiceOf] : prevLevel(s) ? [prevLevel(s)!] : []),
    ...(s.ladder && ladderPrev.get(s.id) ? [ladderPrev.get(s.id)!] : []),
    ...stepPrereqs(s),
  ];
  /**
   * Prerequisite chain first (tester 2026-11-18): for a beginner in a skill (frontier below 900), when the step the
   * skill would take next waits for a lesson it builds on, that lesson comes now instead (the first one on the chain
   * that can be taken, in the same area as the step) — so a beginner meets high / low before the degrees, and "What is a chord?"
   * before major / minor.
   */
  const pullPrereq = (s: PathStep, scheduled: Set<string>, can: (p: PathStep) => boolean, depth = 0): PathStep | undefined => {
    if (depth > 4) return undefined;
    for (const pid of stepPrereqs(s)) {
      if (!waitsFor(s, pid, scheduled) || scheduled.has(pid)) continue;
      const p = byId.get(pid);
      if (!p || p.ladder || !can(p)) continue;
      if (prereqOk(p, scheduled)) return p;
      const deeper = baseOk(p, scheduled) ? pullPrereq(p, scheduled, can, depth + 1) : undefined;
      if (deeper) return deeper;
    }
    return undefined;
  };

  // Ladder steps (0.61): the previous level of each family, and which families are open to the player now.
  const ladderPrev = new Map<string, string>();
  {
    const byFam = new Map<string, PathStep[]>();
    for (const s of stepCatalogue()) if (s.ladder) byFam.set(s.ladder.family, [...(byFam.get(s.ladder.family) ?? []), s]);
    for (const xs of byFam.values()) {
      xs.sort(ladderOrder);
      for (let i = 1; i < xs.length; i++) ladderPrev.set(xs[i].id, xs[i - 1].id);
    }
  }
  /** A family's next level not yet taken (or scheduled in the unit being built). */
  const nextLevel = (f: string, scheduled?: Set<string>): PathStep | undefined =>
    all.filter((s) => s.ladder?.family === f && !taken.has(s.id) && !scheduled?.has(s.id)).sort(ladderOrder)[0];
  /**
   * Families by difficulty (AUDIT-CONTENT-THEORY §ב): the easiest next level first, ties by LADDER_RANK, then the
   * catalogue order. Before, families opened in catalogue order whatever their difficulty (sweep picking before the
   * first chord, paradiddles before a rock beat).
   */
  const byDifficulty = (fs: string[], scheduled?: Set<string>): string[] => {
    const fams = inp.ladderFamilies ?? [];
    const key = (f: string) => ({ f, d: nextLevel(f, scheduled)?.difficulty ?? Infinity, r: LADDER_RANK[f] ?? 50, i: fams.indexOf(f) });
    return fs.map(key).sort((a, b) => a.d - b.d || a.r - b.r || a.i - b.i).map((x) => x.f);
  };
  /**
   * Families open now: those already started, then the easiest unstarted ones — one more for every family two levels in.
   * An unstarted family easier than everything started opens too (it fills a gap the old catalogue order left behind).
   */
  const openFamilies = (): string[] => {
    const fams = inp.ladderFamilies ?? [];
    const levelsTaken = (f: string) => all.filter((s) => s.ladder?.family === f && taken.has(s.id)).length;
    const started = fams.filter((f) => levelsTaken(f) > 0);
    const deep = fams.filter((f) => levelsTaken(f) >= 2).length;
    // A family whose next level waits for another family's level (LADDER_AFTER) is not opened yet.
    const ready = (f: string) => {
      const nx = nextLevel(f);
      return !!nx && !(LADDER_AFTER[nx.id] ?? []).some((after) => onPath.has(after) && !taken.has(after));
    };
    // A started family that can't go on (finished, or its next level waits for another family) never gets "two
    // levels in": it no longer holds the next family back (the flow waits made such families common).
    const stuck = started.filter((f) => levelsTaken(f) < 2 && !ready(f)).length;
    const k = Math.min(fams.length, Math.max(2, started.length, 2 + deep + stuck));
    const fresh = byDifficulty(fams.filter((f) => !started.includes(f) && ready(f)));
    const easiestStarted = Math.min(...started.map((f) => nextLevel(f)?.difficulty ?? Infinity));
    // Rule 2: a gap family (far below everything started) opens one at a time, not all at once (E11).
    const gap = started.length ? fresh.filter((f) => (nextLevel(f)?.difficulty ?? Infinity) <= easiestStarted - GAP_STEPS).slice(0, 1) : [];
    return [...new Set([...started, ...fresh.slice(0, Math.max(0, k - started.length)), ...gap])];
  };
  const isFirstFamily = (f: string) => FIRST_STEP_FAMILIES.includes(f);
  /**
   * One step per family, the easiest next levels first; at most about half the unit (owner's daily mix).
   * Curriculum-flow rules 1–2: at most one family the player has not started yet per unit (the first steps don't
   * count), and while a first-steps family on the path is unfinished, the other families stay below the first-steps
   * band (PAST_FIRST_STEPS) so the first steps keep pace with the rest.
   */
  // SPEC-STYLE-FOCUS §4: a styled level's place — 1 the main style, 2 an "also" style, 0 core (jazz included), −1 other.
  const styleRank = (s: PathStep | undefined): number => (inp.styleFocus && s?.ladder ? pathStyleRank(inp.styleFocus, ladderStyleOf(s.ladder.ref)) : 0);
  const pickLadder = (room: number, scheduled: Set<string>, styleUnit = false): PathStep[] => {
    let fams = byDifficulty(openFamilies(), scheduled);
    if (inp.styleFocus) {
      // A style unit leads with the main style's next levels (the "also" styles' only when the main has none ready);
      // the other units leave styled levels for the style units.
      const styled = (r: number) => byDifficulty((inp.ladderFamilies ?? []).filter((f) => styleRank(nextLevel(f, scheduled)) === r), scheduled);
      const lead = styleUnit ? (styled(1).length ? styled(1) : styled(2)) : [];
      fams = [...lead, ...fams.filter((f) => !lead.includes(f) && styleRank(nextLevel(f, scheduled)) < 1)];
    }
    if (!fams.length || room <= 0) return [];
    const out: PathStep[] = [];
    const waiting = (id: string | undefined) => !!id && onPath.has(id) && !taken.has(id) && !scheduled.has(id);
    const firstLeft = all.filter((s) => s.ladder && isFirstFamily(s.ladder.family) && !taken.has(s.id)).map((s) => s.difficulty);
    const firstPending = firstLeft.length > 0;
    const firstCap = Math.max(PAST_FIRST_STEPS, Math.min(...firstLeft) + 100);
    let fresh = 0;
    for (const f of fams) {
      if (out.length >= room) break;
      const next = nextLevel(f, scheduled);
      if (!next) continue;
      // A wait on another family: below EARLY_PREREQ_BELOW that level is passed in an earlier unit, never the same one.
      if (waiting(ladderPrev.get(next.id)) || (LADDER_AFTER[next.id] ?? []).some((id) => (next.difficulty < EARLY_PREREQ_BELOW ? onPath.has(id) && !taken.has(id) : waiting(id)))) continue;
      const unstarted = !isFirstFamily(f) && !all.some((s) => s.ladder?.family === f && taken.has(s.id));
      if (unstarted && fresh >= 1) continue;
      // (A family already started keeps going; a new one waits until the first steps are past its level.)
      if (firstPending && unstarted && next.difficulty >= firstCap) continue;
      if (unstarted) fresh++;
      out.push(next);
      scheduled.add(next.id);
    }
    return out;
  };

  const unitTheme = new Map<number, string>();
  const buildUnit = (n: number, warm: boolean): UnitStep[] => {
    const scheduled = new Set<string>();
    // What was passed or placed before this unit (a unit's game waits for the step that teaches its concept).
    const takenBefore = new Set(taken);
    const theme = themeFor(n);
    unitTheme.set(n, theme.id);
    // SPEC-JAZZ-FOLD §4: in jazz focus a jazz step gets the same pull as the unit's theme (never past its prerequisites).
    // SPEC-STYLE-FOCUS §2: a jazz step is sought from the course's jazz start (no lock: only where it starts).
    const near = (s: PathStep, f: number) => Math.abs(s.difficulty - ((inp.jazzStart && isJazzStep(s) ? Math.max(f, inp.jazzStart - 150) : f) + 50)) - (inTheme(s.sub, theme) ? 120 : 0) - (inp.jazzFocus && isJazzStep(s) ? 120 : 0);
    const slots = L - 1 /* checkpoint */ - (inp.reviewDue >= 3 && n === units.length + 1 ? 1 : 0);
    const ladder = pickLadder(Math.ceil(slots / 2), scheduled, isStyleUnit(n));
    const open = all.filter((s) => !taken.has(s.id) && !s.ladder && !isUnitEndStep(s));
    const live = [...new Set(open.map((s) => s.domain))];
    const shares = unitShares(weights, live, slots - ladder.length, n);
    const picked: { s: PathStep; probe?: boolean; isNew?: boolean; catchup?: boolean }[] = ladder.map((s) => ({ s }));
    // Rule 4: in the playing courses the question steps stay near the technique road (the unit's hardest ladder level,
    // or the easiest next one); everywhere, no step more than 250 above the unit (the median frontier of its skills).
    const road = ladder.length ? Math.max(...ladder.map((s) => s.difficulty)) : Math.min(...(inp.ladderFamilies ?? []).map((f) => nextLevel(f)?.difficulty ?? Infinity));
    const roadCap = inp.course && PLAYING_COURSES.includes(inp.course) && Number.isFinite(road) ? road + 150 : Infinity;
    // The unit's level: the median frontier of the skills it can draw on that the player has already worked in.
    const unitSkills = [...new Set(open.filter((s) => shares.has(s.domain)).map((s) => s.skill))];
    const worked = unitSkills.filter((k) => !!inp.ratings[k]?.n || placed(inp.events, k) || all.some((s) => s.skill === k && taken.has(s.id)));
    const unitTarget = median((worked.length ? worked : unitSkills).map((k) => fr(k) - (warm ? 50 : 0)));
    const cap = roadCap;
    const capUnit = Math.min(roadCap, unitSkills.length ? unitTarget + 250 : Infinity);
    // Rule 2: one new concept per unit, counted per topic (a teaching lesson and one topic of its sub-skill count once;
    // a catch-up quick check is not new). Placement included: a topic with a placed / ✓ level is started.
    const conceptOf = (s: PathStep): string | undefined => (s.kind === 'topic' ? s.topic : s.game === 'licks' || s.game === 'transcribe' ? `${s.game}:${s.id.split(':')[1]}` : s.kind === 'lesson' ? s.id : undefined);
    const started = new Set<string>();
    for (const id of taken) {
      const s = byId.get(id);
      const c = s && conceptOf(s);
      if (c) started.add(c);
    }
    const startedBefore = new Set(started);
    let newConcepts = 0;
    // A counted concept may take one partner of the other kind in its sub-skill: a teaching lesson ↔ one topic.
    const pairOpen = new Set<string>();
    const partnerKey = (s: PathStep) => (s.teach ? `topic>${s.sub}` : s.kind === 'topic' ? `lesson>${s.sub}` : '');
    const ownKey = (s: PathStep) => (s.teach ? `lesson>${s.sub}` : s.kind === 'topic' ? `topic>${s.sub}` : '');
    const isNewConcept = (s: PathStep) => {
      const c = conceptOf(s);
      if (!c || started.has(c)) return false;
      return !pairOpen.has(ownKey(s));
    };
    const countConcept = (s: PathStep) => {
      const c = conceptOf(s);
      if (!c || started.has(c)) return;
      if (pairOpen.has(ownKey(s))) pairOpen.delete(ownKey(s));
      else {
        newConcepts++;
        if (partnerKey(s)) pairOpen.add(partnerKey(s));
      }
      started.add(c);
    };
    let catchups = 0;
    const catchArea = new Set<DomainId>();
    for (const pass of [0, 1])
    for (const [area, count] of shares) {
      const themed = (k: SkillId) => (open.some((s) => s.skill === k && inTheme(s.sub, theme)) ? 1 : 0);
      const skills = [...new Set(open.filter((s) => s.domain === area).map((s) => s.skill))].sort((a, b) => themed(b) - themed(a) || imp(b) - imp(a) || a.localeCompare(b));
      let k = 0;
      let guard = 0;
      // A skill can have steps in another area (degrees in reading): such a step fills this area's share too (it used
      // not to count, and the unit overflowed until the guard).
      let cross = 0;
      while (picked.filter((p) => p.s.domain === area && !p.s.ladder).length + cross < count && guard++ < 40 && skills.length) {
        const skill = skills[k++ % skills.length];
        const f = Math.min(fr(skill), roadCap) - (warm ? 50 : 0);
        const allowNew = newConcepts < MAX_NEW_CONCEPTS;
        const free = (s: PathStep) => !scheduled.has(s.id) && (allowNew || !isNewConcept(s));
        const ok = (s: PathStep) => s.skill === skill && (pass === 1 || !bridged(s)) && free(s) && prereqOk(s, scheduled);
        const capAbove = f < 1150 ? 250 : 350;
        const inWindow = (s: PathStep) => s.difficulty >= f - 150 && s.difficulty <= f + 200 && s.difficulty <= capUnit;
        const above = (s: PathStep) => s.difficulty > f + 200 && s.difficulty <= f + capAbove && s.difficulty <= capUnit;
        const byNear = (a: PathStep, b: PathStep) => near(a, f) - near(b, f) || a.id.localeCompare(b.id);
        const byDiff = (a: PathStep, b: PathStep) => a.difficulty - b.difficulty || a.id.localeCompare(b.id);
        // Rule 5: a concept carrier the window has passed by comes back as a quick check (one per area per unit).
        const behind = (s: PathStep) => s.difficulty < f - 150 && carrier(s);
        let best = !catchArea.has(area) ? open.filter((s) => s.skill === skill && (pass === 1 || !bridged(s)) && !scheduled.has(s.id) && behind(s) && prereqOk(s, scheduled)).sort(byDiff)[0] : undefined;
        let catchup = !!best;
        if (!best) best = open.filter((s) => ok(s) && inWindow(s)).sort(byNear)[0];
        // Nothing in the window: the easiest open step above it, if prerequisites allow.
        if (!best) best = open.filter((s) => ok(s) && above(s)).sort(byDiff)[0];
        // The step this skill would take if nothing waited — when that waits for a lesson / step it builds on, that
        // prerequisite comes first (pullPrereq; tester 2026-11-18 for beginners, every level since rule 5).
        if (!catchup) {
          const wanted = (s: PathStep) => s.skill === skill && (pass === 1 || !bridged(s)) && free(s) && baseOk(s, scheduled);
          const want = open.filter((s) => wanted(s) && inWindow(s)).sort(byNear)[0] ?? open.filter((s) => wanted(s) && above(s)).sort(byDiff)[0];
          if (want && want !== best && !prereqOk(want, scheduled)) {
            const pulled = pullPrereq(want, scheduled, (p) => (p.domain === want.domain || !!p.teach) && open.includes(p) && !scheduled.has(p.id) && (allowNew || !isNewConcept(p) || p.difficulty < fr(p.skill) - 150) && p.difficulty <= Math.min(cap, fr(p.skill) - (warm ? 50 : 0) + 350));
            // A bridge step (another course's prerequisite) does not push this course's own step out of the first pass.
            if (pulled && !(pass === 0 && bridged(pulled))) {
              best = pulled;
              catchup = pulled.difficulty < fr(pulled.skill) - (warm ? 50 : 0) - 150;
            }
          }
        }
        if (!best) continue;
        if (catchup) {
          catchArea.add(area);
          catchups++;
        }
        const isNew = !catchup && isNewConcept(best);
        if (isNew && best.kind === 'topic') {
          // The teaching lesson of a new topic's sub-skill comes with it (one concept).
          const teach = open.find((s) => s.teach && s.sub === best!.sub && !scheduled.has(s.id) && prereqOk(s, scheduled));
          if (teach && teach.id !== best.id && picked.filter((p) => p.s.domain === area && !p.s.ladder).length + 1 < count) {
            countConcept(teach);
            picked.push({ s: teach });
            if (teach.domain !== area) cross++;
            scheduled.add(teach.id);
          }
        }
        if (!catchup) countConcept(best);
        else {
          const c = conceptOf(best);
          if (c) started.add(c);
        }
        const unmeasured = !inp.ratings[best.skill]?.n && !placed(inp.events, best.skill) && !picked.some((p) => p.s.skill === best!.skill);
        picked.push({ s: best, probe: unmeasured || catchup, isNew, catchup });
        if (best.domain !== area) cross++;
        scheduled.add(best.id);
        seenSubs.add(best.sub);
      }
    }
    // Never a dead end, never a near-empty unit (rule 7): a unit with fewer than three steps is filled from the open
    // steps whose prerequisites are met — nearest to their skill's frontier first (the road cap still holds); an empty
    // one takes the first step on the chain of the easiest step that waits. The rating windows don't apply here.
    if (picked.length < 3) {
      const byDiff = (a: PathStep, b: PathStep) => Math.abs(a.difficulty - fr(a.skill)) - Math.abs(b.difficulty - fr(b.skill)) || a.difficulty - b.difficulty || a.id.localeCompare(b.id);
      // A practice level the window passed by is known: not material for this unit.
      const live2 = open.filter((s) => !(s.difficulty < fr(s.skill) - 150 && !carrier(s)));
      const nearRoad = live2.filter((s) => s.difficulty <= roadCap);
      const pool = (picked.length ? nearRoad.filter((s) => s.difficulty <= capUnit) : nearRoad.length ? nearRoad : live2.length ? live2 : open).sort(byDiff);
      // Up to three steps of different topics, one new concept at most, the easiest first.
      const topicsIn = new Set(picked.map((p) => p.s.topic).filter((t): t is string => !!t));
      for (let i = picked.length; i < Math.min(3, slots); i++) {
        const cands = pool.filter((s) => !scheduled.has(s.id) && !(s.topic && topicsIn.has(s.topic)) && (newConcepts < MAX_NEW_CONCEPTS || !isNewConcept(s)));
        let best = cands.find((s) => prereqOk(s, scheduled));
        if (!best && !picked.length)
          for (const s of cands.filter((x) => baseOk(x, scheduled))) {
            best = pullPrereq(s, scheduled, (p) => open.includes(p) && !scheduled.has(p.id));
            if (best) break;
          }
        // Prerequisites no step can meet: the easiest step goes ahead rather than the path stopping.
        if (!best && !picked.length) best = cands.find((s) => baseOk(s, scheduled)) ?? [...cands].sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id))[0];
        if (!best) break;
        countConcept(best);
        picked.push({ s: best });
        scheduled.add(best.id);
        seenSubs.add(best.sub);
        if (best.topic) topicsIn.add(best.topic);
      }
    }
    // Consolidation (owner 2026-11-19: several success items per stage): one NEW idea per unit, but the unit keeps its
    // normal size. It fills with practice of what is already introduced — first a second / third item of the topic
    // just introduced (a practice step: the same topic level, a fresh set of items), then the next level of a started
    // topic (one level per unit, inside the road / unit caps, the unit's theme first), then a practice item of a level
    // passed recently. Only a unit with real material of its own is filled (no units of practice only at the end).
    // A playing course's unit was its ladder levels plus a question step or two (about four steps): it fills to that size.
    const fillTo = inp.course && PLAYING_COURSES.includes(inp.course) && inp.ladderFamilies?.length ? Math.min(slots, 4) : slots;
    if (picked.length && picked.length < fillTo) {
      const inUnit = new Set(picked.map((p) => p.s.topic).filter((t): t is string => !!t));
      const capFill = Math.min(roadCap, capUnit);
      const themeFirst = (a: PathStep, b: PathStep) => (inTheme(b.sub, theme) ? 1 : 0) - (inTheme(a.sub, theme) ? 1 : 0);
      let k = 0;
      const addPractice = (base: PathStep) => {
        const s = practiceStep(base, `${base.id}~u${n}p${++k}`);
        picked.push({ s });
        scheduled.add(s.id);
      };
      // 1. The topic just introduced: up to two more items at its level.
      const fresh = picked.filter((p) => p.s.kind === 'topic' && !p.catchup && !p.s.practiceOf && !startedBefore.has(p.s.topic!)).map((p) => p.s);
      for (const base of fresh) for (let r = 0; r < 2 && picked.length < fillTo; r++) addPractice(base);
      // 2. The next level of a started topic (prerequisites met, near the road and the unit).
      const next = open
        // (Not a level the window passed by, nor one below a level already passed: the topic moves up, never back.)
        .filter((s) => s.kind === 'topic' && !scheduled.has(s.id) && !inUnit.has(s.topic!) && !isNewConcept(s) && started.has(s.topic!) && s.difficulty <= capFill && !(s.difficulty < fr(s.skill) - 150 && !carrier(s)) && !all.some((x) => x.topic === s.topic && (x.level ?? 0) > (s.level ?? 0) && taken.has(x.id)) && prereqOk(s, scheduled))
        .sort((a, b) => themeFirst(a, b) || Math.abs(a.difficulty - fr(a.skill)) - Math.abs(b.difficulty - fr(b.skill)) || a.id.localeCompare(b.id));
      for (const s of next) {
        if (picked.length >= fillTo) break;
        if (inUnit.has(s.topic!)) continue;
        picked.push({ s });
        scheduled.add(s.id);
        inUnit.add(s.topic!);
      }
      // 3. Practice items: the unit's own topics, then the levels passed most recently (each topic once).
      const recent = all
        .filter((s) => s.kind === 'topic' && taken.has(s.id) && !inUnit.has(s.topic!) && s.difficulty <= capFill)
        .sort((a, b) => themeFirst(a, b) || (doneSteps[b.id]?.at ?? '').localeCompare(doneSteps[a.id]?.at ?? '') || b.difficulty - a.difficulty);
      const unitTopics = picked.filter((p) => p.s.kind === 'topic' && !p.s.practiceOf && !p.catchup).map((p) => p.s);
      const seenT = new Set<string>();
      for (const base of [...unitTopics, ...recent]) {
        if (picked.length >= fillTo) break;
        if (seenT.has(base.topic!)) continue;
        seenT.add(base.topic!);
        if (fresh.includes(base)) continue;
        addPractice(base);
      }
      // 4. Still short (a course's first units: nothing else is started yet): one more item of the new topic.
      for (const base of fresh) if (picked.length < Math.min(4, fillTo)) addPractice(base);
    }
    void catchups;
    // Order (P17): interleave areas, rising difficulty inside each area.
    const byArea = new Map<DomainId, { s: PathStep; probe?: boolean; catchup?: boolean }[]>();
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
    const order: { s: PathStep; probe?: boolean; catchup?: boolean }[] = [];
    const queues = [...byArea.entries()].sort((a, b) => (weights.get(b[0]) ?? 0) - (weights.get(a[0]) ?? 0)).map(([, xs]) => xs);
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) order.push(q.shift()!);
    // Prerequisites first (tester 2026-11-18): the difficulty sort put "same note, two homes" (900) before the degrees
    // lesson it builds on (1000). A step moves to just after the last of its prerequisites in this unit.
    for (let guard = 0; guard < order.length * order.length; guard++) {
      const i = order.findIndex((p, k) => prereqIdsOf(p.s).some((pid) => order.findIndex((o) => o.s.id === pid) > k));
      if (i < 0) break;
      const [p] = order.splice(i, 1);
      const last = Math.max(...prereqIdsOf(p.s).map((pid) => order.findIndex((o) => o.s.id === pid)));
      order.splice(last + 1, 0, p);
    }
    // Simulate success for the projection.
    for (const p of order) {
      taken.add(p.s.id);
      F.set(p.s.skill, Math.max(fr(p.s.skill), Math.min(fr(p.s.skill) + 40, p.s.difficulty + 50)));
    }
    const unitId = `u${n}`;
    const steps: UnitStep[] = order.map((p) => stateOf(p.s, p.catchup ? { probe: true, catchup: true, why: { en: 'A quick check of something the next steps build on', he: 'בדיקה קצרה של משהו שהצעדים הבאים נשענים עליו' } } : p.probe ? { probe: true } : {}));
    if (inp.reviewDue >= 3 && n === units.length + 1) steps.push({ step: virtualStep(`review:${unitId}`, unitId)!, state: 'open' });
    // A game for the unit's leading area (0.38), before the checkpoint — a lighter, faster round of the same skills.
    const lead = order[0]?.s.domain;
    const gInp = { ...inp, noDrills: inp.noDrills || !!inp.ladderFamilies?.length };
    const gDiff = median(order.map((p) => p.s.difficulty)) || 1000;
    const ready = (g: string) => (GAME_PREREQ[g] ?? []).every((pid) => !onPath.has(pid) || takenBefore.has(pid));
    // Rule 6 / audits R5–R6: repertoire and bonus steps wait for their concept too.
    const endReady = (s: PathStep) => (s.rep ? REP_STEP_PREREQ[s.id] ?? [] : s.game ? GAME_PREREQ[s.game] ?? [] : []).every((pid) => !onPath.has(pid) || takenBefore.has(pid));
    let game = lead ? gameForArea(lead, n, gInp, gDiff, ready) : null;
    // GAME_PREREQ: when the leading area's games all wait for a concept, the next area of the unit that has a game ready.
    if (lead && !game && gameForArea(lead, n, gInp, gDiff))
      for (const a of [...new Set(order.map((p) => p.s.domain))].filter((a) => a !== lead)) if ((game = gameForArea(a, n, gInp, gDiff, ready))) break;
    // A one-area unit (one new idea): a ready game of another area of the course (Name That Tune in Ear unit 1).
    if (lead && !game && gameForArea(lead, n, gInp, gDiff))
      for (const a of live.filter((a) => !order.some((p) => p.s.domain === a))) if ((game = gameForArea(a, n, gInp, gDiff, ready))) break;
    // A unit of four steps or more gets its game round (units keep their size: consolidation fills them).
    if (game && order.length >= 4) steps.push(stateOf(virtualStep(`game:${unitId}:${game}`, unitId, order.map((p) => p.s))!));
    // PIANO_JAZZ P2: a repertoire item / an optional bonus game at the unit's end, where its depth fits the unit.
    if (order.length >= 3)
      for (const x of unitEndSteps(n, median(order.map((p) => p.s.difficulty)), all.filter((s) => isUnitEndStep(s) && !taken.has(s.id) && endReady(s)))) {
        taken.add(x.id);
        steps.push(stateOf(x));
      }
    // SPEC-STYLE-FOCUS §9: the core's neighbour-style moment — a unit with the core ii–V–I gets its versions over bossa
    // and in montuno ponchando (optional steps, never blocking; the styled levels themselves under "moment:" ids)
    for (const x of neighbourMoments(order.map((p) => p.s.id), byId, taken)) {
      if (!eligible(x, inp)) continue;
      taken.add(x.id);
      steps.push(stateOf(x));
    }
    // A checkpoint asks questions: it needs question steps (a unit of technique only is checked by its own playing).
    const questions = order.filter((p) => p.s.kind === 'topic' || p.s.kind === 'lesson');
    // SPEC-PATH-ROLE §4: the checkpoint also has a technique part (the unit's technique levels in 4 random keys at the
    // target tempo), so a unit of technique only gets one too.
    const techs = order.filter((p) => p.s.kind === 'tech');
    if (steps.length && (questions.length >= 2 || techs.length >= 1)) steps.push({ step: virtualStep(`check:${unitId}`, unitId, (questions.length >= 2 ? questions : techs).map((p) => p.s))!, state: 'open' });
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
      if (u.status === 'current' && !current && !x.step.bonus && (x.state === 'open' || x.state === 'refresh')) {
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

/**
 * A practice step (consolidation): the same topic level as `base`, played again with fresh items, under its own id
 * ("topic:<t>:<l>~u<unit>p<k>") so its result is its own. Not in the catalogue; frozen units rebuild it from the id.
 */
export function practiceStep(base: PathStep, id: string): PathStep {
  return { ...base, id, practiceOf: base.id, teach: undefined, title: { en: `${base.title.en} · practice`, he: `${base.title.he} · תרגול` } };
}

/** Checkpoint and review steps (generated per unit). */
function virtualStep(id: string, unitId: string, from: PathStep[] = []): PathStep | null {
  if (id.includes('~')) {
    const base = stepCatalogue().find((s) => s.id === id.split('~')[0]);
    return base ? practiceStep(base, id) : null;
  }
  if (id.startsWith('check:')) {
    const d = median(from.map((s) => s.difficulty)) || 1000;
    return { id, kind: 'check', skill: from[0]?.skill ?? 'degrees', sub: from[0]?.sub ?? 'degrees/diatonic', domain: from[0]?.domain ?? 'pitch', difficulty: d, choices: 0, title: { en: 'Checkpoint', he: 'נקודת ביקורת' } };
  }
  if (id.startsWith('review:')) return { id, kind: 'review', skill: 'degrees', sub: 'degrees/diatonic', domain: 'pitch', difficulty: 0, choices: 0, title: { en: 'Review', he: 'חזרה' } };
  // SPEC-STYLE-FOCUS §9: a neighbour-style moment in a frozen unit (pathBonus.NEIGHBOUR_MOMENTS)
  if (id.startsWith('moment:')) {
    const m = NEIGHBOUR_MOMENTS.flatMap((x) => x.moments).find((x) => x.id === id);
    const base = m ? stepCatalogue().find((s) => s.id === m.level) : undefined;
    return base && m ? { ...base, id, bonus: true, title: m.title } : null;
  }
  if (id.startsWith('game:')) {
    const game = id.split(':')[2];
    const g = GAME_STEPS[game];
    const d = median(from.map((s) => s.difficulty)) || 1000;
    return { id, kind: 'game', game, ...(tierSpec(game) ? { tier: stepTier(d) } : {}), skill: g?.skill ?? 'degrees', sub: `${g?.skill ?? 'degrees'}/${g?.sub ?? 'diatonic'}`, domain: g?.domain ?? 'pitch', difficulty: d, choices: 0, title: g?.title ?? { en: game, he: game } };
  }
  void unitId;
  return null;
}

/** Games that can sit inside a unit, by the area they train (0.38). */
export const GAME_STEPS: Record<string, { domain: DomainId; skill: SkillId; sub: string; title: { en: string; he: string }; needsMic?: boolean; forPlays?: string[]; minDiff?: number; /** A beginner game: in the units up to this difficulty only, and every other unit there (gameForArea). */ maxDiff?: number }> = {
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
  // Drum games P1 (DRUMS_NICHE_PLAN §3): measured takes on the kit, in the drums course's instrument units.
  land: { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Land It', he: 'לנחות על 1' }, forPlays: ['drums'] },
  'groove-echo': { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Groove Echo', he: 'הד לגרוב' }, forPlays: ['drums'] },
  'odd-echo': { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Odd-meter Echo', he: 'הד במשקל מוזר' }, forPlays: ['drums'] },
  // DRUMS_NICHE_PLAN P2: Time Lock and Ghost Control.
  'time-lock': { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Time Lock', he: 'נעילת זמן' }, forPlays: ['drums'] },
  'ghost-control': { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Ghost Control', he: 'שליטה ברפאים' }, forPlays: ['drums'] },
  'rudiment-rush': { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Rudiment Rush', he: 'מרוץ רודימנטים' }, forPlays: ['drums'] },
  // AUDIT-GAMES §1 (games fix): the games that never reached the path, in their course's units. `minDiff` keeps a
  // harder game out of the first units (the unit's median difficulty must reach it).
  tuneup: { domain: 'instrument', skill: 'instrument', sub: 'fretboard', title: { en: 'Tune-up', he: 'כיוון' }, forPlays: ['guitar', 'bass'] },
  rootsear: { domain: 'instrument', skill: 'instrument', sub: 'fretboard', title: { en: 'Roots by Ear', he: 'שורשים מהאוזן' }, forPlays: ['guitar', 'bass'], minDiff: 880 },
  changerace: { domain: 'instrument', skill: 'instrument', sub: 'guitar-tech', title: { en: 'Chord Change Race', he: 'מרוץ החלפות אקורדים' }, forPlays: ['guitar'] },
  walkchanges: { domain: 'instrument', skill: 'instrument', sub: 'bass-tech', title: { en: 'Walk the Changes', he: 'ללכת על המהלך' }, forPlays: ['bass'], minDiff: 950 },
  playback: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Play It Back', he: 'לנגן בחזרה' }, forPlays: ['keys', 'piano', 'guitar', 'bass'], minDiff: 900 },
  voicingsprint: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Voicing Sprint', he: 'ספרינט וויסינגים' }, forPlays: ['keys', 'piano'], minDiff: 1000 },
  kitread: { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Kit Read Rush', he: 'מרוץ קריאת תופים' }, forPlays: ['drums'] },
  namegroove: { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Name That Groove', he: 'זהו את הגרוב' }, forPlays: ['drums'], minDiff: 850 },
  singinterval: { domain: 'voice', skill: 'singing', sub: 'intervals', title: { en: 'Interval Sing', he: 'ספרינט שירה' }, needsMic: true, minDiff: 850 },
  harmonyhold: { domain: 'voice', skill: 'singing', sub: 'harmony', title: { en: 'Harmony Hold', he: 'להחזיק הרמוניה' }, needsMic: true, minDiff: 1000 },
  // AUDIT-GAMES §4.2 new games (2026-11-15); the jazz course gets its own as bonus steps (pathBonus.ts).
  bordercontrol: { domain: 'pitch', skill: 'cadences', sub: 'modulation', title: { en: 'Border Control', he: 'ביקורת גבולות' }, minDiff: 1050 },
  whichbrother: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Which Brother?', he: 'איזה אח?' }, forPlays: ['keys', 'piano'], minDiff: 1050 },
  runcatcher: { domain: 'voice', skill: 'agility', sub: 'runs', title: { en: 'Run Catcher', he: 'תופסים ראן' }, needsMic: true, minDiff: 950 },
  compcaller: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Comp Caller', he: 'קורא הליווי' }, forPlays: ['keys', 'piano', 'guitar'], minDiff: 1000 },
  elevator: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Elevator', he: 'המעלית' }, forPlays: ['keys', 'piano', 'guitar'], minDiff: 1100 },
  // AUDIT-GAMES §4.2 new games: the played ones in the instrument courses' units, the ear ones in the Ear course's
  // pitch units (each from its difficulty floor); the Jazz course has them as bonus steps (pathBonus.ts).
  guidetone: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Guide-Tone Runner', he: 'רץ הצלילים המנחים' }, forPlays: ['keys', 'piano', 'guitar', 'bass'], minDiff: 1000 },
  enclosure: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Enclosure Target', he: 'מטרת הכיתור' }, forPlays: ['keys', 'piano', 'guitar', 'bass'], minDiff: 1050 },
  call5432: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: '5-4-3-2 Call', he: 'קריאת 5-4-3-2' }, forPlays: ['keys', 'piano', 'guitar', 'bass'], minDiff: 1150 },
  crossword: { domain: 'pitch', skill: 'cadences', sub: 'dictation', title: { en: 'Changes Crossword', he: 'תשבץ המהלכים' }, minDiff: 1000 },
  holdnote: { domain: 'pitch', skill: 'cadences', sub: 'reharm', title: { en: 'Hold the Note', he: 'להחזיק את הצליל' }, minDiff: 1050 },
  // HARMONY-REHARM still-open games: chromatic mediants and modal interchange, from their ladders' first ratings.
  thirdjump: { domain: 'pitch', skill: 'cadences', sub: 'chromatic', title: { en: 'Third Jump', he: 'קפיצת טרצה' }, minDiff: 1250 },
  darkside: { domain: 'pitch', skill: 'cadences', sub: 'chromatic', title: { en: 'Dark Side', he: 'הצד האפל' }, minDiff: 1100 },
  // Triad pairs, deep: Which Pair? from the first pair's rating (advanced, ~1350–1850).
  whichpair: { domain: 'pitch', skill: 'modes', sub: 'scales', title: { en: 'Which Pair?', he: 'איזה זוג?' }, minDiff: 1350 },
  // Negative harmony: Mirror — a Jazz bonus step after the topic (pathBonus.ts); not a unit game (not in AREA_GAMES).
  mirror: { domain: 'pitch', skill: 'theory', sub: 'harmony', title: { en: 'Mirror', he: 'מראה' }, minDiff: 1450 },
  // Symmetry unit: the Tonnetz from the P / L / R topic's first rating.
  tonnetz: { domain: 'pitch', skill: 'chords', sub: 'symmetry', title: { en: 'Tonnetz', he: 'טונץ' }, minDiff: 1500 },
  // AUDIT-7 hole #14: a beginner game per instrument course, in the beginner band's units (720 → 1150).
  staffrunner: { domain: 'instrument', skill: 'instrument', sub: 'piano-tech', title: { en: 'Staff Runner', he: 'רץ החמשה' }, forPlays: ['keys', 'piano'], minDiff: 720, maxDiff: 1150 },
  rootcatch: { domain: 'instrument', skill: 'instrument', sub: 'bass-tech', title: { en: 'Root Catcher', he: 'תופס השורשים' }, forPlays: ['bass'], minDiff: 720, maxDiff: 1150 },
  strumchange: { domain: 'instrument', skill: 'instrument', sub: 'guitar-tech', title: { en: 'Strum Changes', he: 'החלפות בפריטה' }, forPlays: ['guitar'], minDiff: 720, maxDiff: 1150 },
  rebound: { domain: 'instrument', skill: 'instrument', sub: 'drum-tech', title: { en: 'Rebound Ball', he: 'הכדור הקופץ' }, forPlays: ['drums'], minDiff: 720, maxDiff: 1150 },
  singback: { domain: 'voice', skill: 'singing', sub: 'match', title: { en: 'Sing It Back', he: 'שרים בחזרה' }, needsMic: true, minDiff: 720, maxDiff: 1150 },
  // Owner 2026-11-19: Euclid (Euclidean rhythms on a circle) in the Ear course's time units, from the topic's level.
  euclid: { domain: 'time', skill: 'rhythm-dictation', sub: 'euclid', title: { en: 'Euclid', he: 'אוקלידס' }, minDiff: 1300 },
};
const AREA_GAMES: Record<DomainId, string[]> = {
  pitch: ['rush-interval', 'rush-chord', 'rush-progression', 'bordercontrol', 'crossword', 'holdnote', 'thirdjump', 'darkside', 'whichpair', 'tonnetz'],
  time: ['highway', 'euclid'],
  memory: ['melodypuzzle', 'nametune'],
  voice: ['flight', 'singinterval', 'harmonyhold', 'runcatcher', 'singback'],
  reading: ['rush-note', 'rush-keysig', 'staffrunner'],
  creative: ['rush-chord'],
  instrument: ['drills', 'rush-fretboard', 'peakhunter', 'land', 'groove-echo', 'odd-echo', 'time-lock', 'ghost-control', 'rudiment-rush', 'tuneup', 'changerace', 'kitread', 'rootsear', 'playback', 'namegroove', 'walkchanges', 'voicingsprint', 'whichbrother', 'compcaller', 'elevator', 'guidetone', 'enclosure', 'call5432', 'staffrunner', 'rootcatch', 'strumchange', 'rebound'],
};
/** The game for a unit's leading area (rotating by unit number; mic / instrument / pack rules apply). */
export function gameForArea(area: DomainId, n: number, inp: Pick<PathInput, 'noMic' | 'noSing' | 'plays' | 'packs'> & { noDrills?: boolean; course?: CourseId }, diff = Infinity, ready: (game: string) => boolean = () => true): string | null {
  const ok = AREA_GAMES[area].filter((g) => {
    if (!gameVerified(g)) return false;
    // GAME_PREREQ: not before the step that teaches the game's concept (the caller knows the player's path).
    if (!ready(g)) return false;
    const s = GAME_STEPS[g];
    if (s.minDiff && diff < s.minDiff) return false;
    if (s.maxDiff && diff > s.maxDiff) return false;
    if (inp.course && !inCourse({ domain: s.domain, sung: !!s.needsMic && s.domain === 'voice', forPlays: s.forPlays }, inp.course)) return false;
    if (g === 'drills' && inp.noDrills) return false;
    if (s.needsMic && (inp.noMic || inp.noSing)) return false;
    if (s.forPlays && !s.forPlays.some((p) => inp.plays.includes(p))) return false;
    if (g === 'peakhunter' && !inp.packs.includes('production')) return false;
    // SPEC-JAZZ-FOLD: the jazz games only with the jazz pack.
    if (JAZZ_GAMES.includes(g) && !inp.packs.includes('jazz')) return false;
    return true;
  });
  // AUDIT-7 hole #14: in the beginner band every other unit plays the course's beginner game.
  const early = ok.filter((g) => GAME_STEPS[g].maxDiff);
  if (early.length && n % 2 === 1) return early[Math.floor(n / 2) % early.length];
  return ok.length ? ok[n % ok.length] : null;
}

/** The steps of a checkpoint: the unit's steps (for 8 mixed items). */
export function checkpointSources(unit: PathUnit): PathStep[] {
  return unit.steps.map((x) => x.step).filter((s) => s.kind === 'topic' || s.kind === 'lesson');
}

/** SPEC-PATH-ROLE §4: the checkpoint's question part (needs ≥ 2 question steps) and its technique part (the unit's levels). */
export function checkpointParts(unit: PathUnit): { questions: PathStep[]; tech: PathStep[] } {
  const qs = checkpointSources(unit);
  return { questions: qs.length >= 2 ? qs : [], tech: unit.steps.map((x) => x.step).filter((s) => s.kind === 'tech' && !!s.ladder) };
}

// ---------------------------------------------------------------- opened vs mastered (SPEC-PATH-ROLE §8)

/** Stars where a step counts as mastered (the top of the one scale). */
export const MASTER_STARS = 5;

/**
 * A done step on the one star scale 0–5. Technique (and other ladder) levels keep their measured stars (keys at the
 * target tempo; the live keys are read in pathMastery). Vocal levels: 3 when passed, 5 once the next level of the same
 * family is passed too (or it is the family's last). Ear / theory / game steps: the session's 1–3, 4 = a second clean
 * run (3★), 5 = spaced over ≥ 3 days, the sub-skill accurate (EWMA ≥ 0.85 once measured) and at speed.
 */
export function masteryStars(
  s: PathStep,
  d: { stars: number; at: string; times?: number; firstAt?: string } | undefined,
  ev: { n: number; ewma: number } | undefined,
  speed: number | undefined,
  steps: PathFacts['steps'] = {},
  tests: PathFacts['tests'] = {},
): number {
  if (!d || d.stars <= 0) return 0;
  if (s.kind === 'vocal' && s.ladder) {
    const pr = VOCAL_PROGRAMS.find((p) => p.id === s.ladder!.family);
    const refs = pr?.refs ?? [];
    const i = refs.indexOf(Number(s.ladder.ref));
    const next = i >= 0 ? refs[i + 1] : undefined;
    if (next === undefined) return MASTER_STARS;
    return (steps?.[`vocal:${next}`]?.stars ?? 0) > 0 || !!tests?.[`vocal:${next}`] ? MASTER_STARS : 3;
  }
  if (s.ladder) return Math.min(MASTER_STARS, d.stars);
  const base = Math.min(3, d.stars);
  if (base < 3 || (d.times ?? 1) < 2) return base;
  const spaced = !!d.firstAt && new Date(d.at).getTime() - new Date(d.firstAt).getTime() >= 3 * DAY;
  const accurate = !ev || ev.n < 5 || ev.ewma >= 0.85;
  const fast = speed === undefined || speed <= 1;
  return spaced && accurate && fast ? MASTER_STARS : 4;
}

/** A unit's checkpoint that is still open although the unit's other steps are done (SPEC-PATH-ROLE §3, §4). */
export function pendingChecks(view: PathView): { unit: PathUnit; step: UnitStep }[] {
  const out: { unit: PathUnit; step: UnitStep }[] = [];
  for (const u of view.units) {
    if (u.status === 'projected') continue;
    const chk = u.steps.find((x) => x.step.kind === 'check');
    if (!chk || chk.state === 'done' || chk.state === 'mastered' || chk.state === 'tested') continue;
    const rest = u.steps.filter((x) => x.step.kind !== 'check' && !x.step.bonus);
    if (rest.every((x) => x.state === 'done' || x.state === 'mastered' || x.state === 'tested')) out.push({ unit: u, step: chk });
  }
  return out;
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
  const src = checkpointParts(unit).questions;
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
export function topicMarks(view: PathView, levelsOf?: (topic: string) => number): Map<string, 'done' | 'current' | 'ahead'> {
  const out = new Map<string, 'done' | 'current' | 'ahead'>();
  // SPEC-PATH-ROLE §5: a level the path has not reached yet is "ahead of the path" — on a coming unit, or above the
  // topic's highest level on the road (current / past units). Playing it counts once the path gets there.
  const reached = new Map<string, number>();
  for (const u of view.units)
    for (const x of u.steps) {
      const { topic, level } = x.step;
      if (!topic || !level) continue;
      if (x.state === 'done' || x.state === 'mastered' || x.state === 'tested') out.set(`${topic}:${level}`, 'done');
      else if (u.status === 'projected') out.set(`${topic}:${level}`, 'ahead');
      if (u.status !== 'projected') reached.set(topic, Math.max(reached.get(topic) ?? 0, level));
    }
  if (levelsOf)
    for (const [topic, top] of reached) for (let l = top + 1; l <= levelsOf(topic); l++) if (!out.has(`${topic}:${l}`)) out.set(`${topic}:${l}`, 'ahead');
  const cur = view.current?.step;
  if (cur?.topic && cur.level) out.set(`${cur.topic}:${cur.level}`, 'current');
  return out;
}
