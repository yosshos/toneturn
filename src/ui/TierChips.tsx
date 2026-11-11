// The level tier picker on every game setup screen (GAMES_TIERS_PLAN §2.2): six small buttons pp … ff, the open
// tier preselected, lower tiers free (warm-up), one tier above open ("try" — rated), the rest locked with a one-line
// reason. One line under the row says what the picked tier holds. Fits a phone row at 320 px.
import '../tiers.css';
import { lockReason, tierAllowed, tierDef, tierIndex, TIERS, type DynName, type TierInfo } from '../engine/gameTiers';

type Lang = 'he' | 'en';
const TX = {
  level: { en: 'Level', he: 'רמה' },
  yours: { en: 'your level', he: 'הרמה שלכם' },
  next: { en: 'next', he: 'הבאה' },
  tryUp: { en: 'one level up — rated', he: 'רמה אחת מעל — נמדד' },
  warm: { en: 'warm-up', he: 'חימום' },
  cleared: { en: 'cleared', he: 'עברתם' },
};

export function TierChips({ lang, info, value, onChange, game }: { lang: Lang; info: TierInfo; value: DynName; onChange: (t: DynName) => void; game?: string }) {
  const def = tierDef(game ?? info.game, value);
  const vi = tierIndex(value);
  const oi = tierIndex(info.open);
  const note = vi > oi ? TX.tryUp[lang] : vi < oi ? TX.warm[lang] : null;
  const next = oi < TIERS.length - 1 ? TIERS[oi + 1] : null;
  return (
    <fieldset className="tier-field" data-tiers={info.game}>
      <legend>
        {TX.level[lang]}
        <small>
          {TX.yours[lang]} <i className="dyn">{info.open}</i>
          {next ? (
            <>
              {' · '}
              {TX.next[lang]} <i className="dyn">{next}</i>
            </>
          ) : null}
        </small>
      </legend>
      <div className="tier-row" role="radiogroup" aria-label={TX.level[lang]} dir="ltr">
        {TIERS.map((t) => {
          const ok = tierAllowed(info, t);
          const why = lockReason(info, t, lang);
          const done = info.cleared !== null && tierIndex(t) <= tierIndex(info.cleared);
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={value === t}
              aria-disabled={!ok}
              disabled={!ok}
              title={why ?? (done ? TX.cleared[lang] : undefined)}
              className={`tier-chip ${value === t ? 'on' : ''} ${t === info.open ? 'open' : ''} ${done ? 'done' : ''}`}
              onClick={() => ok && onChange(t)}
              data-tier={t}
            >
              <i className="dyn">{t}</i>
            </button>
          );
        })}
      </div>
      <p className="tier-line">
        {def?.label[lang]}
        {note ? <span className="tier-note"> · {note}</span> : null}
      </p>
    </fieldset>
  );
}

/** The "your level · next" chip of a game card. */
export function TierBadge({ lang, tier, next, into, isNew }: { lang: Lang; tier: DynName; next: DynName | null; into: number; isNew: boolean }) {
  return (
    <span className="tier-badge" data-tier-badge={tier} aria-label={`${TX.yours[lang]} ${tier}${next ? ` · ${TX.next[lang]} ${next}` : ''}`}>
      <i className="dyn">{tier}</i>
      {next && (
        <>
          <span className="tier-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(into * 100)}%` }} />
          </span>
          <small>
            {isNew ? (lang === 'he' ? 'חדש' : 'new') : `${TX.next[lang]} `}
            {!isNew && <i className="dyn">{next}</i>}
          </small>
        </>
      )}
    </span>
  );
}
