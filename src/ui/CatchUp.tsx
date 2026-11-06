import type { CatchUp } from '../engine/catchup';
import type { Strings } from '../i18n/strings';

/** Home: what an existing player has not done yet of the current first-run flow (intake, placement sections). */
export function CatchUpCard({ t, c, onIntake, onMeasure, onFindLevel, onHide }: { t: Strings; c: CatchUp; onIntake: () => void; onMeasure: () => void; onFindLevel: () => void; onHide: () => void }) {
  const k = t.catchUp;
  const intakeLine = c.intake === 'missing' ? k.intakeMissing : c.intake === 'later' ? k.intakeLater : c.intake === 'outdated' ? k.intakeOutdated : null;
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
              {k.go}
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
