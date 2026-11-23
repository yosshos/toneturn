// SPEC-STYLE-FOCUS §4 (Repertoire): the next-goal card follows the main style — "your third Brazilian piece" — when the
// course's heaviest style (styleWeight) is not jazz and has pieces in the list; a jazz focus keeps the road to the
// standards (repertoire.repGoal), and so does a style whose pieces are all learned. Pure.

import type { CourseId } from './courses';
import { repertoireFor, repGoal, repStatus, type RepBest, type RepCourse, type RepGoal, type RepItem } from './repertoire';
import { entryStyle } from './repLibrary';
import { heaviestStyle, type FocusSettings } from './styleFocus';
import { STYLE_TEXT, type StyleId } from './styles';

export type RepGoalAny = Omit<RepGoal, 'id'> & { id: RepGoal['id'] | `style-${StyleId}`; style?: StyleId };

const ORD_EN = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
// "יצירה" is feminine: the ordinals agree with it
const ORD_HE = ['ראשונה', 'שנייה', 'שלישית', 'רביעית', 'חמישית', 'שישית', 'שביעית', 'שמינית', 'תשיעית', 'עשירית'];

/** "Your third Brazilian piece" / "היצירה השלישית שלכם בסגנון ברזילאי" (past ten: "Brazilian piece no. 11"). */
export function styleGoalTitle(style: StyleId, n: number): { en: string; he: string } {
  const name = STYLE_TEXT[style];
  const en = n <= ORD_EN.length ? `Your ${ORD_EN[n - 1]} ${name.en} piece` : `${name.en} piece no. ${n}`;
  const he = n <= ORD_HE.length ? `היצירה ה${ORD_HE[n - 1]} שלכם בסגנון ${name.he}` : `יצירה מס׳ ${n} בסגנון ${name.he}`;
  return { en, he };
}

/** A repertoire item's style (a styled level among its ways, a bossa standard …; null = none). */
export const repItemStyle = (it: RepItem): StyleId | null => entryStyle({ item: it });

/** The course's next repertoire goal, following its main style (by styleWeight) when that style has pieces to learn. */
export function repGoalFor(course: RepCourse, res: Record<string, RepBest>, s: FocusSettings, today?: string): RepGoalAny {
  const items = repertoireFor(course);
  const fcourse: CourseId = course === 'jazz' ? 'ear' : course;
  const styles = [...new Set(items.map(repItemStyle).filter((x): x is StyleId => !!x))];
  const style = heaviestStyle(s, fcourse, styles, today);
  if (!style || style === 'jazz') return repGoal(course, res);
  const mine = items.filter((it) => repItemStyle(it) === style);
  const learned = mine.filter((it) => repStatus(res[it.id]) === 'learned').length;
  const open = mine.filter((it) => repStatus(res[it.id]) !== 'learned').sort((a, b) => a.tier - b.tier);
  if (!open.length) return repGoal(course, res);
  const next = open.find((it) => repStatus(res[it.id]) === 'started') ?? open[0];
  return { id: `style-${style}`, style, title: styleGoalTitle(style, learned + 1), now: learned, target: learned + 1, next };
}
