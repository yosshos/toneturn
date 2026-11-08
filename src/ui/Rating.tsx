// Overall rating shown next to names (spec L.2) and on the Skill Map (L.4).

import { useEffect, useMemo, useState } from 'react';
import { band, overallRating, peakOf, type Overall, type RatingChange, type RatingEvent, type Ratings } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { Delta, overallTrend, TrendChart } from './Trends';

/** "1084" or "1084?" with a ring in the band colour. */
export function RatingBadge({ r, provisional, t, size = 'md' }: { r: number | null | undefined; provisional?: boolean; t: Strings; size?: 'sm' | 'md' }) {
  if (r === null || r === undefined) return null;
  return (
    <span className={`rating-badge band-${band(r)} ${size}`} title={`${t.overallRating}: ${r}${provisional ? ` (${t.evProvisional})` : ''} · ${t.bands[band(r)]}`}>
      <span dir="ltr">
        {r}
        {provisional ? '?' : ''}
      </span>
    </span>
  );
}

/** Header name chip: initial + name + rating; tap opens the Skill Map. */
export function NameChip({ t, name, overall, onClick }: { t: Strings; name: string | null; overall: Overall | null; onClick: () => void }) {
  const label = name || t.you;
  return (
    <button className="name-chip" onClick={onClick} aria-label={`${label} · ${t.overallRating} ${overall ? overall.r : '—'}`}>
      <span className="name-initial" aria-hidden="true">
        {label.trim().charAt(0).toUpperCase()}
      </span>
      <span className="name-text">{label}</span>
      {overall ? <RatingBadge r={overall.r} provisional={overall.provisional} t={t} size="sm" /> : <span className="rating-badge sm none">—</span>}
    </button>
  );
}

/** Top of the Skill Map: the overall rating, band, peak, 30-day change and its trend. */
export function OverallCard({ t, ratings, events, lang }: { t: Strings; ratings: Ratings; events: RatingEvent[]; lang: 'he' | 'en' }) {
  const o = overallRating(ratings);
  const hist = useMemo(() => overallTrend(events), [events]);
  if (!o) return null;
  const peak = peakOf(hist);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const base = [...hist].reverse().find((p) => p.day <= monthAgo) ?? hist[0];
  const d30 = hist.length >= 2 && base ? o.r - base.r : null;
  return (
    <TrendChart
      t={t}
      pts={hist}
      title={t.overallRating}
      lang={lang}
      head={
        <div className="overall-head">
          <div>
            <small>{t.overallRating}</small>
            <div className="overall-now">
              <RatingBadge r={o.r} provisional={o.provisional} t={t} />
              <span className="overall-band">{t.bands[band(o.r)]}</span>
            </div>
            {o.provisional && <small className="field-hint">{t.provisionalHint}</small>}
          </div>
          <dl className="overall-facts">
            <div>
              <dt>{t.peak}</dt>
              <dd dir="ltr">{peak ?? '—'}</dd>
            </div>
            <div>
              <dt>{t.last30}</dt>
              <dd>
                <Delta d={d30} t={t} />
              </dd>
            </div>
          </dl>
        </div>
      }
    />
  );
}

/** Recap card: how the overall and each touched skill moved in this session (spec L.3). */
export function RatingCard({ t, change, peakBefore, accuracy }: { t: Strings; change: RatingChange | null; peakBefore: number | null; accuracy: number }) {
  const to = change?.overall?.to ?? null;
  const from = change?.overall?.from ?? null;
  const [shown, setShown] = useState(from ?? to ?? 0);
  useEffect(() => {
    if (to === null) return;
    if (from === null || document.documentElement.dataset.motion === 'reduced') return setShown(to);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      setShown(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  if (!change || !change.skills.length || to === null) return <p className="rating-card practice field-hint">{t.practiceNoRating}</p>;
  const d = from === null ? null : to - from;
  const newPeak = peakBefore !== null && to > peakBefore && !change.overall?.provisional;
  return (
    <section className="rating-card set-card" aria-label={t.overallRating}>
      <div className="rc-top">
        <div>
          <small>{t.overallRating}</small>
          <div className="rc-now">
            <span className={`rating-badge band-${band(to)}`}>
              <span dir="ltr">
                {shown}
                {change.overall?.provisional ? '?' : ''}
              </span>
            </span>
            <Delta d={d} t={t} />
          </div>
        </div>
        <div className="rc-acc">
          <small>{t.accuracy}</small>
          <b dir="ltr">{Math.round(accuracy * 100)}%</b>
        </div>
      </div>
      {newPeak && <p className="rc-peak">{t.newPeak}: {to}</p>}
      {change.bandsReached.map((b) => (
        <p key={b.skill} className="rc-band">
          {t.bandReached.replace('{b}', t.bands[b.band]).replace('{s}', t.skillNames[b.skill])}
        </p>
      ))}
      <ul className="rc-skills">
        {change.skills.map((s) => (
          <li key={s.skill}>
            <span className="rc-name">{t.skillNames[s.skill]}</span>
            <span className="rc-val" dir="ltr">
              {s.to}
            </span>
            <Delta d={s.from === null ? null : s.to - s.from} t={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}
