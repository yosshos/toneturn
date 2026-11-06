import type { CatchUp } from '../engine/catchup';
import type { Strings } from '../i18n/strings';

/** Home: what an existing player has not done yet of the current first-run flow (intake, placement sections). */
export function CatchUpCard({ t, c, draft, onIntake, onMeasure, onFindLevel, onHide }: { t: Strings; c: CatchUp; draft: { done: number; all: number } | null; onIntake: () => void; onMeasure: () => void; onFindLevel: () => void; onHide: () => void }) {
  const k = t.catchUp;
  const intakeLine = draft ? k.intakePartial(draft.done, draft.all) : c.intake === 'missing' ? k.intakeMissing : c.intake === 'later' ? k.intakeLater : c.intake === 'outdated' ? k.intakeOutdated : null;
  const minutes = Math.max(1, Math.round(c.unmeasured.length * 0.7));
  return (
    <section className="catchup-card" data-catchup={c.key} aria-label={k.title}>
      <div className="news-head">
        <b>🧭 {k.title}</b>
      </div>
      <p className="catchup-blurb">{k.blurb}</p>
      <ul className="catchup-list">
        {intakeLine && (
          <li>
            <span>{intakeLine}</span>
            <button className="btn small" data-catchup-do="intake" onClick={onIntake}>
              {draft ? k.resume : k.go}
            </button>
          </li>
        )}
        {c.unmeasured.length > 0 && (
          <li>
            <span>
              {c.neverPlaced ? k.findLevel : k.measure(c.unmeasured.length, minutes)}
              {!c.neverPlaced && <small className="catchup-skills">{c.unmeasured.slice(0, 5).map((s) => t.skillNames[s]).join(' · ')}
                  {c.unmeasured.length > 5 ? ` +${c.unmeasured.length - 5}` : ''}</small>}
            </span>
            <button className="btn small" data-catchup-do="placement" onClick={c.neverPlaced ? onFindLevel : onMeasure}>
              {k.go}
            </button>
          </li>
        )}
      </ul>
      <button className="link catchup-hide" onClick={onHide}>
        {k.notNow}
      </button>
    </section>
  );
}

/** Home: Find my level was left half-way — continue it (or start over). */
export function ResumePlacementCard({ t, progress, onContinue, onRestart }: { t: Strings; progress: { answered: number; sections: number; doneSections: number }; onContinue: () => void; onRestart: () => void }) {
  const k = t.resumePlacement;
  return (
    <section className="catchup-card resume-placement" aria-label={k.title}>
      <div className="news-head">
        <b>⏸️ {k.title}</b>
      </div>
      <p className="catchup-blurb">{k.where(progress.doneSections, progress.sections, progress.answered)}</p>
      <button className="btn mega resume-placement-go" onClick={onContinue}>
        {k.go}
      </button>
      <button className="link catchup-hide" onClick={onRestart}>
        {k.restart}
      </button>
    </section>
  );
}

/** Home: any lesson or exercise left half-way — continue it, or let it go. */
export function ResumeSessionCard({ t, title, progress, onContinue, onDrop }: { t: Strings; title: string; progress: { answered: number; total: number }; onContinue: () => void; onDrop: () => void }) {
  const k = t.resumeSession;
  return (
    <section className="catchup-card resume-session" aria-label={k.title}>
      <div className="news-head">
        <b>⏸️ {k.title}</b>
      </div>
      <p className="catchup-blurb">
        <b>{title || k.untitled}</b> · {k.where(progress.answered, progress.total)}
      </p>
      <button className="btn mega resume-placement-go" onClick={onContinue} data-resume-session="1">
        {k.go}
      </button>
      <button className="link catchup-hide" onClick={onDrop}>
        {k.drop}
      </button>
    </section>
  );
}
