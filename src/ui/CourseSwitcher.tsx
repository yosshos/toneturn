// The course button and the "my courses" sheet (0.61, SPEC-COURSES + SPEC-REDESIGN). One course is active; the
// path, the daily workout and Practice follow it. Adding a course switches to it (its placement test is offered on
// its first visit to the path).
import { useState } from 'react';
import { COURSES, courseOf, type CourseId } from '../engine/courses';
import { Glyph } from './Glyph';

type Lang = 'he' | 'en';

export function CourseChip({ active, lang, onOpen, variant = 'top' }: { active: CourseId; lang: Lang; onOpen: () => void; variant?: 'top' | 'side' }) {
  const c = courseOf(active);
  return (
    <button className={`course-chip ${variant}`} onClick={onOpen} aria-haspopup="dialog" aria-label={lang === 'he' ? `קורס: ${c.name.he}. החלפה` : `Course: ${c.name.en}. Switch`} data-course-chip={c.id}>
      <Glyph kind={c.glyph} color={c.color} size={variant === 'side' ? 34 : 30} />
      <span className="cc-name">{variant === 'side' ? c.name[lang] : c.short[lang]}</span>
      <svg className="cc-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

export function CourseSheet({ mine, active, lang, onPick, onClose }: { mine: CourseId[]; active: CourseId; lang: Lang; onPick: (c: CourseId) => void; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const he = lang === 'he';
  const others = COURSES.filter((c) => !mine.includes(c.id));
  const row = (id: CourseId, isNew = false) => {
    const c = courseOf(id);
    const on = id === active;
    return (
      <button key={id} className={`course-row ${on ? 'on' : ''}`} onClick={() => onPick(id)} aria-current={on ? 'true' : undefined} data-course={id}>
        <Glyph kind={c.glyph} color={c.color} size={48} />
        <span className="cr-text">
          <b>{c.name[lang]}</b>
          {isNew && <small>{he ? 'מתחילים במבחן מיקום קצר, או מההתחלה' : 'Starts with a short placement test, or from the beginning'}</small>}
        </span>
        {on && (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </button>
    );
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet course-sheet" role="dialog" aria-modal="true" aria-label={he ? 'הקורסים שלי' : 'My courses'} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <h2>{he ? 'הקורסים שלי' : 'My courses'}</h2>
        <p className="field-hint">{he ? 'לכל קורס מסלול, אימון יומי ותרגול משלו. הרצף והנקודות משותפים.' : 'Each course has its own path, daily workout and practice. Streak and points are shared.'}</p>
        <div className="course-list">{mine.map((id) => row(id))}</div>
        {others.length > 0 &&
          (adding ? (
            <div className="course-list add">{others.map((c) => row(c.id, true))}</div>
          ) : (
            <button className="course-add" onClick={() => setAdding(true)} data-course-add="1">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {he ? 'קורס חדש' : 'New course'}
            </button>
          ))}
      </div>
    </div>
  );
}
