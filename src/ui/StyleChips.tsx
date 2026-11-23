// SPEC-STYLE-FOCUS §3: "What do you want to play?" — up to three style chips, the first is the main style (jazz is
// pre-selected first). The same chips at the instrument choice, per course in Settings, and in the Drills settings.
// One small line explains the order; every style stays open whatever is picked (focus changes weights, not access).
import { courseOf, type CourseId } from '../engine/courses';
import { MAX_PICKS, picksOf, togglePick, type StyleFocus } from '../engine/styleFocus';
import { GUITAR_ADDON_STYLES, STYLE_TEXT, stylesFor } from '../engine/styles';

type Lang = 'en' | 'he';

export function StyleChips({ course, lang, focus, onChange, hints = false, title = true }: { course: CourseId; lang: Lang; focus: StyleFocus; onChange: (f: StyleFocus) => void; /** The short "what is it" line under each chip (an experienced player). */ hints?: boolean; title?: boolean }) {
  const he = lang === 'he';
  const picks = picksOf(focus);
  const main = stylesFor(course, { main: true });
  const extra = course === 'guitar' ? GUITAR_ADDON_STYLES : [];
  const chip = (st: (typeof main)[number]) => {
    const i = picks.indexOf(st);
    const on = i >= 0;
    const full = !on && picks.length >= MAX_PICKS;
    return (
      <button key={st} type="button" className={`chip style-chip ${on ? 'on' : ''} ${i === 0 ? 'main' : ''}`} aria-pressed={on} disabled={full} onClick={() => onChange(togglePick(course, focus, st))} data-style-chip={st} data-style-rank={on ? i + 1 : undefined}>
        {on && (
          <span className="sc-rank" aria-label={i === 0 ? (he ? 'ראשי' : 'main') : undefined}>
            {i === 0 ? (he ? 'ראשי' : 'main') : <bdi dir="ltr">{i + 1}</bdi>}
          </span>
        )}
        <span className="sc-name">{STYLE_TEXT[st][lang]}</span>
        {hints && <small className="sc-hint">{STYLE_TEXT[st].hint[lang]}</small>}
      </button>
    );
  };
  return (
    <div className="style-focus" data-style-focus={course} data-style-main={focus.main}>
      {title && <span className="sf-title">{he ? 'מה בא לכם לנגן?' : 'What do you want to play?'}</span>}
      <div className="style-chips" role="group" aria-label={he ? `סגנונות · ${courseOf(course).name.he}` : `Styles · ${courseOf(course).name.en}`}>
        {main.map(chip)}
        {extra.map(chip)}
      </div>
      <small className="sf-hint">{he ? 'עד שלושה. הראשון הוא הסגנון הראשי. כל הסגנונות פתוחים תמיד.' : 'Up to three. The first is your main style. Every style stays open.'}</small>
    </div>
  );
}
