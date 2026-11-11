// Today's quests (0.63, the design's "משימות היום"): two small goals a day, chosen by day and course from what the
// player really did today (answers, path steps, sessions). Pure; nothing stored — progress is read from the day.

import type { CourseId } from './courses';
import type { RatingEvent } from './rating';
import { parseRepLesson, repItem } from './repertoire';

export interface Quest {
  id: string;
  title: { en: string; he: string };
  now: number;
  target: number;
  /** Note-head colour of the quest's symbol. */
  color: string;
  glyph: 'intervals' | 'sing' | 'keys' | 'guitar' | 'bass' | 'drums' | 'rhythm' | 'scales' | 'tempo' | 'sticks' | 'lick' | 'transcribe';
}

interface QuestDay {
  day: string;
  course: CourseId;
  /** The Ear course in exam-prep mode (0.67): a theory quest leads. */
  examPrep?: boolean;
  events: RatingEvent[];
  /** Today's finished sessions (lesson ids). */
  sessions: string[];
  /** Path steps finished today. */
  stepsToday: number;
  minutesToday: number;
  /** Tiered game runs (GAMES_TIERS_PLAN §5.2): quests can ask for a level's goal. */
  tierRuns?: { game: string; tier: string; pass: boolean; cleared?: boolean; at: string }[];
}

const sameDay = (iso: string, day: string) => {
  const d = new Date(iso);
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return k === day;
};

/** Longest run of right answers today. */
export function bestRun(events: RatingEvent[], day: string): number {
  let best = 0;
  let run = 0;
  for (const e of [...events].filter((x) => x.set === undefined && sameDay(x.at, day)).sort((a, b) => a.at.localeCompare(b.at))) {
    const ok = (e.score ?? (e.correct ? 1 : 0)) >= 0.7;
    run = ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

type Make = (d: QuestDay) => Quest;
/** The skills the exams test most (the exam goal's boosts, engine/path.ts GOAL_BOOST.exam, plus reading). */
const EXAM_SKILLS: string[] = ['theory', 'notes', 'sight', 'dictation', 'cadences', 'rhythm-dictation'];
const POOL: Record<string, Make> = {
  run10: (d) => ({ id: 'run10', title: { en: '10 right answers in a row', he: '10 תשובות נכונות ברצף' }, now: bestRun(d.events, d.day), target: 10, color: '#3AB8FF', glyph: 'intervals' }),
  steps2: (d) => ({ id: 'steps2', title: { en: 'Finish 2 path steps', he: 'לסיים 2 צעדים במסלול' }, now: d.stepsToday, target: 2, color: '#FFD43B', glyph: 'scales' }),
  min10: (d) => ({ id: 'min10', title: { en: 'Practise 10 minutes', he: 'להתאמן 10 דקות' }, now: Math.round(d.minutesToday), target: 10, color: '#12C9B4', glyph: 'tempo' }),
  sing3: (d) => ({ id: 'sing3', title: { en: 'Sing 3 melodies', he: 'לשיר 3 מנגינות' }, now: d.sessions.filter((s) => /sing|vocal/.test(s)).length, target: 3, color: '#12C9B4', glyph: 'sing' }),
  tech3: (d) => ({ id: 'tech3', title: { en: '3 technique sessions', he: '3 אימוני טכניקה' }, now: d.sessions.filter((s) => s.startsWith('tech') || s.startsWith('technique')).length, target: 3, color: '#FFD43B', glyph: d.course === 'drums' ? 'sticks' : d.course === 'guitar' ? 'guitar' : d.course === 'bass' ? 'bass' : 'keys' }),
  // Exam prep (0.67): what the Bagrut and entrance exams test — theory, reading, dictation, cadences.
  theory5: (d) => ({ id: 'theory5', title: { en: '5 exam-topic answers right', he: '5 תשובות נכונות בנושאי בחינה' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.set === undefined && EXAM_SKILLS.includes(e.skill) && (e.score ?? (e.correct ? 1 : 0)) >= 0.7).length, target: 5, color: '#FF8A3D', glyph: 'scales' }),
  // Jazz (EAR_THEORY_AUDIT): harmony by ear — chords, changes, reharmonization, lines.
  harmony5: (d) => ({ id: 'harmony5', title: { en: '5 harmony answers right', he: '5 תשובות הרמוניה נכונות' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.set === undefined && ['chords', 'cadences', 'sequences', 'dictation'].includes(e.skill) && (e.score ?? (e.correct ? 1 : 0)) >= 0.7).length, target: 5, color: '#A78BFA', glyph: 'scales' }),
  // Drums (DRUMS_AUDIT I8): a measured drum take is rated 'instrument' with a timing share — it counts here.
  // Game tiers (GAMES_TIERS_PLAN §5.2): meet the goal of your level in a game; clear a level.
  tierPass2: (d) => ({ id: 'tierPass2', title: { en: "Meet a game level's goal twice", he: 'לעמוד פעמיים ביעד של רמה במשחק' }, now: (d.tierRuns ?? []).filter((r) => r.pass && sameDay(r.at, d.day)).length, target: 2, color: '#3AB8FF', glyph: 'scales' }),
  tierClear: (d) => ({ id: 'tierClear', title: { en: 'Clear a level in any game', he: 'לעבור רמה באחד המשחקים' }, now: (d.tierRuns ?? []).filter((r) => r.cleared && sameDay(r.at, d.day)).length, target: 1, color: '#FFD43B', glyph: 'scales' }),
  // Licks & transcription (SPEC-LICKS-TRANSCRIPTION): measured takes only — clean lick takes, transcribed phrases.
  lick3: (d) => ({ id: 'lick3', title: { en: '3 clean lick takes', he: '3 ביצועים נקיים של ליקים' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.id.startsWith('g:lick:') && e.correct).length, target: 3, color: '#A78BFA', glyph: 'lick' }),
  tx2: (d) => ({ id: 'tx2', title: { en: 'Transcribe 2 phrases', he: 'לתמלל 2 משפטים' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.id.startsWith('g:tx:') && (e.score ?? 0) >= 0.7).length, target: 2, color: '#3AB8FF', glyph: 'transcribe' }),
  // Repertoire (SPEC-REPERTOIRE): a piece of the course's repertoire, and one from Blues & progressions.
  rep1: (d) => ({ id: 'rep1', title: { en: 'Practise a repertoire piece', he: 'להתאמן על יצירה מהרפרטואר' }, now: d.sessions.filter((s) => parseRepLesson(s)?.course === d.course).length, target: 1, color: '#12C9B4', glyph: 'scales' }),
  rep2: (d) => ({ id: 'rep2', title: { en: 'A piece from Blues & progressions', he: 'יצירה מבלוז ומהלכים' }, now: d.sessions.filter((s) => { const r = parseRepLesson(s); return !!r && r.course === d.course && repItem(r.course, r.id)?.tier === 2; }).length, target: 1, color: '#A78BFA', glyph: 'scales' }),
  rhythm: (d) => ({ id: 'rhythm', title: d.course === 'drums' ? { en: 'Rhythm right 5 times', he: 'קצב נכון 5 פעמים' } : { en: '5 rhythm answers right', he: '5 תשובות קצב נכונות' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.set === undefined && (/rhythm|timing|tempo|meter/.test(e.skill) || (d.course === 'drums' && !!e.tags?.some((x) => /rhythm|timing/.test(x.skill)))) && (e.score ?? (e.correct ? 1 : 0)) >= 0.7).length, target: 5, color: '#FF5FA2', glyph: 'rhythm' }),
};

/** Which quests a course offers (first one rotates with the day). */
const BY_COURSE: Record<CourseId, string[]> = {
  ear: ['run10', 'steps2', 'rhythm', 'min10', 'tierPass2', 'rep1'],
  jazz: ['harmony5', 'steps2', 'run10', 'min10', 'tierClear', 'rep2', 'lick3', 'tx2'],
  voice: ['sing3', 'steps2', 'min10', 'tierPass2', 'rep1', 'tx2'],
  keys: ['tech3', 'steps2', 'min10', 'rep1', 'rep2', 'lick3'],
  guitar: ['tech3', 'steps2', 'min10', 'rep1', 'rep2'],
  bass: ['tech3', 'steps2', 'min10', 'rep1', 'rep2', 'lick3'],
  drums: ['tech3', 'rhythm', 'steps2', 'min10', 'rep1'],
};

/** The Ear course in exam-prep mode: the exam-topic quest every day, the other one rotates. */
const EXAM_PREP = ['steps2', 'run10', 'min10'];

/** Today's two quests for the course. */
export function dailyQuests(d: QuestDay): Quest[] {
  const prep = d.course === 'ear' && !!d.examPrep;
  const ids = prep ? EXAM_PREP : (BY_COURSE[d.course] ?? BY_COURSE.ear);
  const n = [...d.day].reduce((a, c) => a + c.charCodeAt(0), 0);
  const first = prep ? 'theory5' : ids[n % ids.length];
  const second = prep ? ids[n % ids.length] : ids[(n + 1) % ids.length];
  return [first, second].map((id) => {
    const q = POOL[id](d);
    return { ...q, now: Math.min(q.now, q.target) };
  });
}
