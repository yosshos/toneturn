import type { CatchUp } from '../engine/catchup';
import type { Strings } from '../i18n/strings';

// Today (SPEC-TODAY, 0.41; owner: "big neon buttons belong inside the exercises — app buttons are clean and minimal"):
// things to resume are quiet rows above the workout — a short name, a thin progress bar, two small icon buttons.

function Row({ name, done, all, sub, onGo, goLabel, alt, kind }: { name: string; done: number; all: number; sub?: string; onGo: () => void; goLabel: string; alt?: { icon: string; label: string; onClick: () => void }; kind: string }) {
  const pct = all > 0 ? Math.round((100 * Math.min(done, all)) / all) : 0;
  return (
    <section className={`resume-row ${kind}`} aria-label={name}>
      <span className="rr-text">
        <span className="rr-name">
          <b>{name}</b>
          {all > 0 && (
            <small dir="ltr">
              {Math.min(done, all)}/{all}
            </small>
          )}
        </span>
        <span className="rr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={all} aria-valuenow={Math.min(done, all)} aria-label={sub ?? name}>
          <span style={{ width: `${pct}%` }} />
        </span>
      </span>
      {alt && (
        <button className="rr-icon" onClick={alt.onClick} aria-label={alt.label} title={alt.label}>
          {alt.icon}
        </button>
      )}
      <button className="rr-icon rr-go resume-placement-go" onClick={onGo} aria-label={goLabel} title={goLabel} data-resume-session={kind === 'resume-session' ? '1' : undefined}>
        <span className="flip-rtl">▶</span>
      </button>
    </section>
  );
}

/** What an existing player has not done yet of the current first-run flow (intake, placement sections). */
export function CatchUpCard({ t, c, draft, onIntake, onMeasure, onFindLevel, onHide }: { t: Strings; c: CatchUp; draft: { done: number; all: number } | null; onIntake: () => void; onMeasure: () => void; onFindLevel: () => void; onHide: () => void }) {
  const k = t.catchUp;
  const intakeLine = draft ? k.intakePartial(draft.done, draft.all) : c.intake === 'missing' ? k.intakeMissing : c.intake === 'later' ? k.intakeLater : c.intake === 'outdated' ? k.intakeOutdated : null;
  const minutes = Math.max(1, Math.round(c.unmeasured.length * 0.7));
  return (
    <section className="resume-row catchup-row" data-catchup={c.key} aria-label={k.title}>
      <span className="rr-text">
        <b>🧭 {k.title}</b>
        {intakeLine && (
          <button className="rr-link" data-catchup-do="intake" onClick={onIntake}>
            {intakeLine} <span className="flip-rtl">›</span>
          </button>
        )}
        {c.unmeasured.length > 0 && (
          <button className="rr-link" data-catchup-do="placement" onClick={c.neverPlaced ? onFindLevel : onMeasure}>
            {c.neverPlaced ? k.findLevel : k.measure(c.unmeasured.length, minutes)} <span className="flip-rtl">›</span>
          </button>
        )}
      </span>
      <button className="rr-icon catchup-hide" onClick={onHide} aria-label={k.notNow} title={k.notNow}>
        ✕
      </button>
    </section>
  );
}

/** Find my level was left half-way — continue it (or start over). */
export function ResumePlacementCard({ t, progress, onContinue, onRestart }: { t: Strings; progress: { answered: number; sections: number; doneSections: number }; onContinue: () => void; onRestart: () => void }) {
  const k = t.resumePlacement;
  return <Row kind="resume-placement" name={`🧭 ${t.findLevel}`} done={progress.doneSections} all={progress.sections} sub={k.where(progress.doneSections, progress.sections, progress.answered)} onGo={onContinue} goLabel={k.go} alt={{ icon: '↺', label: k.restart, onClick: onRestart }} />;
}

/** Any lesson or exercise left half-way — continue it, or let it go. */
export function ResumeSessionCard({ t, title, progress, onContinue, onDrop }: { t: Strings; title: string; progress: { answered: number; total: number }; onContinue: () => void; onDrop: () => void }) {
  const k = t.resumeSession;
  return <Row kind="resume-session" name={title || k.untitled} done={progress.answered} all={progress.total} sub={progress.total > 0 ? k.where(progress.answered, progress.total) : undefined} onGo={onContinue} goLabel={k.go} alt={{ icon: '✕', label: k.drop, onClick: onDrop }} />;
}
