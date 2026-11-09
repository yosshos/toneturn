// Today's quests (0.63, the design's "משימות היום"): two small goals a day, chosen by day and course from what the
// player really did today (answers, path steps, sessions). Pure; nothing stored — progress is read from the day.

import type { CourseId } from './courses';
import type { RatingEvent } from './rating';

export interface Quest {
  id: string;
  title: { en: string; he: string };
  now: number;
  target: number;
  /** Note-head colour of the quest's symbol. */
  color: string;
  glyph: 'intervals' | 'sing' | 'keys' | 'guitar' | 'bass' | 'drums' | 'rhythm' | 'scales' | 'tempo';
}

interface QuestDay {
  day: string;
  course: CourseId;
  events: RatingEvent[];
  /** Today's finished sessions (lesson ids). */
  sessions: string[];
  /** Path steps finished today. */
  stepsToday: number;
  minutesToday: number;
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
const POOL: Record<string, Make> = {
  run10: (d) => ({ id: 'run10', title: { en: '10 right answers in a row', he: '10 תשובות נכונות ברצף' }, now: bestRun(d.events, d.day), target: 10, color: '#3AB8FF', glyph: 'intervals' }),
  steps2: (d) => ({ id: 'steps2', title: { en: 'Finish 2 path steps', he: 'לסיים 2 צעדים במסלול' }, now: d.stepsToday, target: 2, color: '#FFD43B', glyph: 'scales' }),
  min10: (d) => ({ id: 'min10', title: { en: 'Practise 10 minutes', he: 'להתאמן 10 דקות' }, now: Math.round(d.minutesToday), target: 10, color: '#12C9B4', glyph: 'tempo' }),
  sing3: (d) => ({ id: 'sing3', title: { en: 'Sing 3 melodies', he: 'לשיר 3 מנגינות' }, now: d.sessions.filter((s) => /sing|vocal/.test(s)).length, target: 3, color: '#12C9B4', glyph: 'sing' }),
  tech3: (d) => ({ id: 'tech3', title: { en: '3 technique sessions', he: '3 אימוני טכניקה' }, now: d.sessions.filter((s) => s.startsWith('tech') || s.startsWith('technique')).length, target: 3, color: '#FFD43B', glyph: d.course === 'guitar' || d.course === 'bass' || d.course === 'drums' ? d.course : 'keys' }),
  rhythm: (d) => ({ id: 'rhythm', title: { en: '5 rhythm answers right', he: '5 תשובות קצב נכונות' }, now: d.events.filter((e) => sameDay(e.at, d.day) && e.set === undefined && /rhythm|timing|tempo|meter/.test(e.skill) && (e.score ?? (e.correct ? 1 : 0)) >= 0.7).length, target: 5, color: '#FF5FA2', glyph: 'rhythm' }),
};

/** Which quests a course offers (first one rotates with the day). */
const BY_COURSE: Record<CourseId, string[]> = {
  ear: ['run10', 'steps2', 'rhythm', 'min10'],
  exam: ['run10', 'steps2', 'rhythm', 'min10'],
  jazz: ['steps2', 'run10', 'min10'],
  voice: ['sing3', 'steps2', 'min10'],
  keys: ['tech3', 'steps2', 'min10'],
  guitar: ['tech3', 'steps2', 'min10'],
  bass: ['tech3', 'steps2', 'min10'],
  drums: ['tech3', 'rhythm', 'steps2', 'min10'],
};

/** Today's two quests for the course. */
export function dailyQuests(d: QuestDay): Quest[] {
  const ids = BY_COURSE[d.course] ?? BY_COURSE.ear;
  const n = [...d.day].reduce((a, c) => a + c.charCodeAt(0), 0);
  const first = ids[n % ids.length];
  const second = ids[(n + 1) % ids.length];
  return [first, second].map((id) => {
    const q = POOL[id](d);
    return { ...q, now: Math.min(q.now, q.target) };
  });
}
