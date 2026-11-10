// Per-course community pieces (owner 2026-11-09): a row of my courses with their level (profile, Achievements), and
// the league week's XP split by course (league card, Today). The league itself stays one across courses.
import { courseOf, type CourseId } from '../engine/courses';
import { courseLevel, leagueWeekBounds, weeklyCourseXp, type DynName, type ResultLike } from '../engine/courseSocial';
import type { Ratings } from '../engine/rating';
import { Glyph } from './Glyph';

type Lang = 'he' | 'en';

/** One course with its level chip (pp … ff, or a dash before it is measured). */
export function CourseLevelChip({ course, level, lang, active = false }: { course: CourseId; level: DynName | null; lang: Lang; active?: boolean }) {
  const c = courseOf(course);
  return (
    <span className={`cl-item ${active ? 'on' : ''}`} data-course-level={course}>
      <Glyph kind={c.glyph} color={c.color} size={26} />
      <span className="cl-name">{c.short[lang]}</span>
      <span className={`cl-dyn ${level ? '' : 'none'}`} dir="ltr" aria-label={level ? undefined : lang === 'he' ? 'עוד לא נמדד' : 'not measured yet'}>
        {level ?? '–'}
      </span>
    </span>
  );
}

/** My courses, each with its level. */
export function CourseLevelsRow({ courses, ratings, lang, active }: { courses: CourseId[]; ratings: Ratings; lang: Lang; active?: CourseId }) {
  if (!courses.length) return null;
  return (
    <div className="cl-row" role="list" aria-label={lang === 'he' ? 'הדרגה בכל קורס' : 'Your level in each course'}>
      {courses.map((c) => (
        <span role="listitem" key={c}>
          <CourseLevelChip course={c} level={courseLevel(c, ratings, courses).name} lang={lang} active={c === active} />
        </span>
      ))}
    </div>
  );
}

/** "120 guitar · 80 ear": this league week's XP per course, from what I did (nothing when there is none yet). */
export function CourseXpLine({ history, endsAt, lang }: { history: ResultLike[]; endsAt: string; lang: Lang }) {
  const { from, to } = leagueWeekBounds(endsAt);
  const parts = weeklyCourseXp(history, from, to);
  if (!parts.length) return null;
  return (
    <small className="cl-xp" data-course-xp="1" aria-label={lang === 'he' ? 'הנקודות השבוע לפי קורס' : "This week's XP by course"}>
      {parts.map((p, k) => (
        <span key={p.course}>
          {k > 0 && <span aria-hidden="true"> · </span>}
          <i className="cl-dot" style={{ background: courseOf(p.course).color }} aria-hidden="true" />
          <bdi dir="ltr">{p.xp}</bdi> {courseOf(p.course).short[lang]}
        </span>
      ))}
    </small>
  );
}
