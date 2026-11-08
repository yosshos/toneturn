// Side panels on a computer (SPEC-DESKTOP §3.3, 0.53): what helps beside the main content instead of below it.
//   LessonAside — in an exercise: where you are, first-try score so far, the keys.
//   TodayAside  — on Today: this week, the daily challenge and the progression of the day, quick links.
// Shown only from 1100 px (CSS); on phones the same information stays where it was.
import type { Progress } from '../storage/progress';
import { localDay } from '../storage/progress';
import { dailyPuzzle, scoreGuess, solvedBy, type PChord } from '../engine/progPuzzle';

type Lang = 'en' | 'he';

export function LessonAside({ lang, index, total, firstTry, answered, title }: { lang: Lang; index: number; total: number; firstTry: number; answered: number; title: string }) {
  const he = lang === 'he';
  const keys: [string, string][] = he
    ? [['1–9', 'תשובה'], ['רווח', 'השמעה חוזרת'], ['Enter', 'המשך'], ['C', 'השוואה'], ['H', 'רמז'], ['S', 'דילוג'], ['Esc', 'השהיה']]
    : [['1–9', 'answer'], ['Space', 'repeat'], ['Enter', 'continue'], ['C', 'compare'], ['H', 'hint'], ['S', 'skip'], ['Esc', 'pause']];
  return (
    <aside className="side-panel lesson-aside" aria-label={he ? 'מידע על התרגיל' : 'About this exercise'} data-lesson-aside="1">
      <section>
        <h2>{title}</h2>
        <small>
          {he ? 'שאלה' : 'Question'} {Math.min(total, index + 1)} / {total}
        </small>
        <div className="sp-bar">
          <i style={{ width: `${(100 * Math.min(total, index)) / Math.max(1, total)}%` }} />
        </div>
      </section>
      {answered > 0 && (
        <section>
          <h3>{he ? 'בניסיון ראשון' : 'First try'}</h3>
          <b className="sp-num" dir="ltr">
            {firstTry} / {answered}
          </b>
        </section>
      )}
      <section>
        <h3>{he ? 'מקשים' : 'Keys'}</h3>
        <dl className="sp-keys">
          {keys.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  );
}

export function TodayAside({ lang, progress, streak, puzzleRows, onPuzzle, onDaily, onExams, onImprov }: { lang: Lang; progress: Progress; streak: number; puzzleRows: string[][] | undefined; onPuzzle: () => void; onDaily: () => void; onExams: () => void; onImprov: () => void }) {
  const he = lang === 'he';
  const today = localDay(new Date());
  // this week (Monday first): practised days
  const days = new Set(progress.history.map((h) => localDay(new Date(h.completedAt))));
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDay(d);
  });
  const names = he ? ['ב', 'ג', 'ד', 'ה', 'ו', 'ש', 'א'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const daily = progress.daily?.[today];
  const pz = dailyPuzzle(today);
  const rows = (puzzleRows ?? []) as PChord[][];
  const solved = solvedBy(rows.map((r) => scoreGuess(r, pz.chords)));
  return (
    <aside className="side-panel today-aside" aria-label={he ? 'השבוע ועוד' : 'This week and more'} data-today-aside="1">
      <section>
        <h3>{he ? 'השבוע' : 'This week'}</h3>
        <ol className="sp-week" dir="ltr">
          {week.map((d, i) => (
            <li key={d} className={`${days.has(d) ? 'done' : ''} ${d === today ? 'today' : ''}`} title={d}>
              <span>{names[i]}</span>
            </li>
          ))}
        </ol>
        <small>{he ? `רצף: ${streak} ימים` : `${streak}-day streak`}</small>
      </section>
      <section>
        <h3>{he ? 'האתגר היומי' : 'Daily challenge'}</h3>
        <small>{daily ? (he ? `שוחק היום · ${daily.points} נקודות` : `Played today · ${daily.points} points`) : he ? 'חמש שאלות, אותן לכולם' : 'Five questions, the same for everyone'}</small>
        <button className="btn ghost small" onClick={onDaily} data-aside-daily="1">
          {daily ? (he ? 'לתוצאות' : 'Results') : he ? 'לשחק' : 'Play'}
        </button>
      </section>
      <section>
        <h3>
          {he ? 'מהלך היום' : 'Progression of the day'} <small dir="ltr">#{pz.n}</small>
        </h3>
        <small>{solved ? (he ? `נפתר ב־${rows.length} ניסיונות` : `Solved in ${rows.length}`) : rows.length ? (he ? `${rows.length} ניסיונות עד עכשיו` : `${rows.length} tries so far`) : he ? 'ארבעה אקורדים, שישה ניסיונות' : 'Four chords, six tries'}</small>
        <button className="btn ghost small" onClick={onPuzzle} data-aside-puzzle="1">
          {solved ? (he ? 'לשתף' : 'Share') : he ? 'לפתור' : 'Solve'}
        </button>
      </section>
      <section className="sp-links">
        <button className="link" onClick={onExams}>
          {he ? 'מבחנים: בגרות וקונסרבטוריון' : 'Exams: Bagrut & conservatory'}
        </button>
        <button className="link" onClick={onImprov}>
          {he ? 'סטודיו לאלתור' : 'Improvisation studio'}
        </button>
      </section>
    </aside>
  );
}
