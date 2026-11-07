// Profile card (docs/SPEC-STATS.md §1, §3): playing since, total practice time, items answered, favourite
// area, level, league, trophy case (up to 3 pinned awards). Opens from the header name / level ring.

import { useMemo, useState } from 'react';
import { achievements, type AchievementExtra, type ProgressStats } from '../engine/achievements';
import { band, overallRating, type DomainId } from '../engine/rating';
import { foldFromMemo, totalsIn } from '../engine/stats';
import type { Strings } from '../i18n/strings';
import { localDay, type Progress } from '../storage/progress';
import { AwardCard, fmtDuration, TrophyCase } from './Stats';
import { fmtDay, langOf } from './Trends';

const PX = {
  profile: { en: 'Profile', he: 'פרופיל' },
  since: { en: 'Playing since', he: 'משחק/ת מאז' },
  time: { en: 'Practice time', he: 'זמן תרגול' },
  items: { en: 'Answers', he: 'תשובות' },
  fav: { en: 'Favourite area', he: 'התחום האהוב' },
  level: { en: 'Level', he: 'רמה' },
  league: { en: 'League', he: 'ליגה' },
  edit: { en: 'Choose trophies', he: 'בחירת גביעים' },
  done: { en: 'Done', he: 'סיום' },
  close: { en: 'Close', he: 'סגירה' },
  pinHint: { en: 'Pin up to 3 awards.', he: 'אפשר להצמיד עד 3 הישגים.' },
};

export function ProfileCard({
  t,
  progress,
  name,
  firstUseAt,
  extra,
  league,
  pinned = [],
  onPin,
  onClose,
}: {
  t: Strings;
  progress: Progress;
  name: string | null;
  /** Settings.firstUseAt */
  firstUseAt?: string | null;
  extra?: AchievementExtra;
  /** League tier name (e.g. t.leagueTiers[tier - 1]) when known. */
  league?: string | null;
  /** Settings.trophies (≤ 3). */
  pinned?: string[];
  onPin?: (ids: string[]) => void;
  onClose: () => void;
}) {
  const lang = langOf(t);
  const ps = progress as ProgressStats;
  const [editing, setEditing] = useState(false);
  const list = useMemo(() => achievements(progress, extra), [progress, extra]);
  const o = overallRating(foldFromMemo(ps.ratingBase, progress.ratingEvents ?? []));
  const all = totalsIn(ps.statsDays, { start: null, end: '9999-12-31' });
  const items = Math.max(all.items, (progress.ratingEvents ?? []).length);
  const fav = (Object.entries(all.byArea) as [DomainId, [number, number]][]).sort((a, b) => b[1][0] - a[1][0])[0]?.[0];
  const firstDays = [firstUseAt ? localDay(new Date(firstUseAt)) : null, ...Object.keys(ps.statsDays ?? {}), ...progress.history.map((h) => localDay(new Date(h.completedAt)))].filter((x): x is string => !!x).sort();
  const since = firstDays[0];
  const toggle = (id: string) => onPin?.(pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(-3));
  const label = name || t.you;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet pf-sheet" role="dialog" aria-modal="true" aria-labelledby="pf-title" onClick={(e) => e.stopPropagation()}>
        <header className="pf-head">
          <span className={`pf-ring ${o ? `band-${band(o.r)}` : ''}`} aria-hidden="true">
            {label.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h2 id="pf-title">{label}</h2>
            <small className="field-hint">
              {PX.level[lang]} <bdi dir="ltr">{o ? `${o.r}${o.provisional ? '?' : ''}` : '—'}</bdi>
              {o ? ` · ${t.bands[band(o.r)]}` : ''}
              {league ? ` · ${PX.league[lang]}: ${league}` : ''}
            </small>
          </div>
        </header>
        <dl className="pf-facts">
          <div>
            <dt>{PX.since[lang]}</dt>
            <dd>{since ? fmtDay(since, lang, true) : '—'}</dd>
          </div>
          <div>
            <dt>{PX.time[lang]}</dt>
            <dd>
              <bdi dir="ltr">{all.hasTime ? fmtDuration(all.ms, lang) : '—'}</bdi>
            </dd>
          </div>
          <div>
            <dt>{PX.items[lang]}</dt>
            <dd>
              <bdi dir="ltr">{items}</bdi>
            </dd>
          </div>
          <div>
            <dt>{PX.fav[lang]}</dt>
            <dd data-domain={fav}>{fav ? t.domainNames[fav] : '—'}</dd>
          </div>
        </dl>
        <TrophyCase list={list} pinned={pinned} lang={lang} />
        {onPin && (
          <button className="btn ghost" aria-expanded={editing} onClick={() => setEditing((x) => !x)}>
            {editing ? PX.done[lang] : PX.edit[lang]}
          </button>
        )}
        {editing && (
          <>
            <p className="field-hint">{PX.pinHint[lang]}</p>
            <ul className="aw-list">
              {list
                .filter((a) => a.got)
                .map((a) => (
                  <AwardCard key={a.id} a={a} lang={lang} pinned={pinned.includes(a.id)} onTogglePin={() => toggle(a.id)} />
                ))}
            </ul>
          </>
        )}
        <div className="ps-sheet-actions">
          <button className="btn primary" onClick={onClose}>
            {PX.close[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
