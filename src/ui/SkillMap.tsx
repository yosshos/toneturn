import { LeagueBadge } from './LeagueBadge';
import { chordTierForRating, tierOf } from '../engine/league';
import { overallRating } from '../engine/rating';
import { useState } from 'react';
import type { SkillId } from '../engine/lesson';
import { band, domainOf, DOMAINS, domainValue, type DomainId, evidence, PLANNED_SKILLS, SKILLS, weakestSkill, type Ratings } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { lessonMastered, ratingsOf, type Progress } from '../storage/progress';
import { recommendFor, type Recommendation } from '../engine/recommend';
import { TrendDetail, TrendTiles } from './Trends';
import { OverallCard } from './Rating';
import { LESSON_META } from '../game/content';
import { LESSON_ORDER } from '../engine/lesson';

type Axis = SkillId | (typeof PLANNED_SKILLS)[number];

export function SkillMap({
  t,
  progress,
  onBack,
  onPractice,
  onPlacement,
  lang,
  bestLeague,
}: {
  t: Strings;
  lang: 'he' | 'en';
  progress: Progress;
  onBack: () => void;
  onPractice: (skill: SkillId) => void;
  onPlacement: (domain?: DomainId | null) => void;
  bestLeague?: number;
}) {
  const ratings = ratingsOf(progress);
  const [sel, setSel] = useState<Axis>(() => weakestSkill(ratings));
  const rec = weakestSkill(ratings);
  const old = (progress.snapshots ?? []).at(-5);
  const anyMeasured = SKILLS.some((k) => (ratings[k]?.n ?? 0) > 0);

  return (
    <main className="panel-screen skillmap">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.skillMap}</h1>
      </header>
      <p className="field-hint">{t.skillMapHint}</p>

      <OverallCard t={t} ratings={ratings} events={progress.ratingEvents ?? []} lang={lang} />
      {(() => {
        // Your ear's chord (spec Y.4): the overall rating in the league's seven steps.
        const o = overallRating(ratings);
        if (!o) return null;
        const ct = chordTierForRating(o.r);
        return (
          <section className="set-card ear-chord" data-ear-chord={ct} style={{ ['--tier-color' as string]: tierOf(ct).color }}>
            <LeagueBadge tier={ct} size={58} ghostNext title={t.leagueTiers[ct - 1]} />
            <div>
              <small className="league-kicker">{t.earChord}</small>
              <div>
                <b>{t.leagueTiers[ct - 1]}</b>
                {bestLeague ? <small className="field-hint"> · {t.leagueTitle}: {t.leagueTiers[bestLeague - 1]}</small> : null}
              </div>
              <p className="field-hint">{t.earChordHint}</p>
            </div>
          </section>
        );
      })()}

      <Radar ratings={ratings} old={old?.ratings} sel={sel} onSelect={setSel} t={t} />
      {old && (
        <p className="legend">
          <span className="sw now" /> {t.now} <span className="sw old" /> {t.lastMonth}
        </p>
      )}

      <Diagnosis
        t={t}
        axis={sel}
        ratings={ratings}
        recommended={sel === rec}
        onPractice={onPractice}
        next={PLANNED_SKILLS.includes(sel as never) ? null : recommendFor(sel as SkillId, ratings, (id) => lessonMastered(progress, id))}
        lang={lang}
      />

      {!PLANNED_SKILLS.includes(sel as never) && <TrendDetail t={t} events={progress.ratingEvents ?? []} skill={sel as SkillId} lang={lang} />}
      <TrendTiles t={t} events={progress.ratingEvents ?? []} skills={SKILLS} sel={sel} onSelect={setSel} />

      {!anyMeasured && (
        <section className="set-card">
          <h2>🧭 {t.findLevel}</h2>
          <p className="field-hint">{t.findLevelHint}</p>
          <button className="btn mega" onClick={() => onPlacement()}>
            {t.findLevel}
          </button>
        </section>
      )}

      {/* Text equivalent of the chart (also the keyboard / screen-reader path). */}
      <section className="set-card">
        <h2>{t.skillMap}</h2>
        {DOMAINS.map((d) => {
          const dv = domainValue(ratings, d.id);
          return (
            <div key={d.id} className="skill-domain" data-domain-list={d.id}>
              <h3 className="skill-domain-h">
                {t.domainNames[d.id]}
                <small>{dv ? `${Math.round(dv.v * 100)}%` : t.evUnmeasured}</small>
                <button className="link measure-domain" data-measure={d.id} onClick={() => onPlacement(d.id)} aria-label={`${t.measureDomain}: ${t.domainNames[d.id]}`}>
                  🧭 {t.measureDomain}
                </button>
              </h3>
              <ul className="skill-list">
                {d.skills.map((a2) => {
                  const r = ratings[a2];
                  const ev = evidence(r);
                  return (
                    <li key={a2}>
                      <button className={`skill-row ${sel === a2 ? 'on' : ''}`} onClick={() => setSel(a2)} aria-pressed={sel === a2}>
                        <b>{t.skillNames[a2]}</b>
                        <span className={`ev ev-${ev}`}>{ev === 'unmeasured' ? t.evUnmeasured : `${t.bands[band(r!.r)]} · ${r!.r} · ${ev === 'provisional' ? t.evProvisional : t.evMeasured}`}</span>
                        {a2 === rec && <span className="rec-chip">★</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {anyMeasured && (
          <button className="btn ghost small" onClick={() => onPlacement()}>
            {t.findLevel}
          </button>
        )}
      </section>
    </main>
  );
}

/** The radar of the five domains (product owner): each the confidence-weighted level of its measured skills. */
function Radar({
  ratings,
  old,
  sel,
  onSelect,
  t,
}: {
  ratings: Ratings;
  old?: Partial<Record<SkillId, number>>;
  sel: Axis;
  onSelect: (a: Axis) => void;
  t: Strings;
}) {
  const C = 160;
  const R = 112;
  const n = DOMAINS.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => [C + R * v * Math.cos(ang(i)), C + R * v * Math.sin(ang(i))] as const;
  const vals = DOMAINS.map((d) => domainValue(ratings, d.id)?.v ?? null);
  const oldVals = DOMAINS.map((d) => {
    const rs = d.skills.map((k) => old?.[k]).filter((x): x is number => x !== undefined);
    return rs.length ? Math.max(0, Math.min(1, (rs.reduce((a2, b2) => a2 + b2, 0) / rs.length - 600) / 1000)) : null;
  });
  const poly = (vs: (number | null)[]) =>
    vs
      .map((v, i) => (v === null ? null : pt(i, v)))
      .filter((p): p is readonly [number, number] => p !== null)
      .map((p) => p.join(','))
      .join(' ');
  const selDomain = domainOf(sel as SkillId);
  return (
    <svg className="radar domains" viewBox="-100 -14 520 348" role="img" aria-label={t.skillMap}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} className="ring" points={DOMAINS.map((_, i) => pt(i, k).join(',')).join(' ')} />
      ))}
      {DOMAINS.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} className="spoke" x1={C} y1={C} x2={x} y2={y} />;
      })}
      {oldVals.filter((v) => v !== null).length >= 3 && <polygon className="area old" points={poly(oldVals)} />}
      {vals.filter((v) => v !== null).length >= 3 && <polygon className="area" points={poly(vals)} />}
      {DOMAINS.map((d, i) => {
        const v = vals[i];
        const dv = domainValue(ratings, d.id);
        const ev = !dv ? 'unmeasured' : dv.n < 8 ? 'provisional' : 'measured';
        const [lx, ly] = pt(i, 1.16);
        const cos = Math.cos(ang(i));
        const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
        const [px, py] = v === null ? pt(i, 0.06) : pt(i, v);
        const first = d.skills.find((k) => (ratings[k]?.n ?? 0) > 0) ?? d.skills[0];
        return (
          <g key={d.id} className={`axis ${selDomain === d.id ? 'sel' : ''}`} data-domain={d.id} onClick={() => onSelect(first)} style={{ cursor: 'pointer' }}>
            <circle className={`dot ev-${ev}`} cx={px} cy={py} r={v === null ? 7 : 10} />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="axis-label">
              {/* Long names on two lines, so they never leave the drawing. */}
              {(() => {
                const name = t.domainNames[d.id];
                const cut = name.length > 14 ? Math.max(name.lastIndexOf(' ', Math.ceil(name.length / 2) + 3), name.indexOf(' ')) : -1;
                const lines = cut > 0 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
                return lines.map((ln, k) => (
                  <tspan key={k} x={lx} dy={k === 0 ? (lines.length > 1 ? '-0.55em' : 0) : '1.15em'}>
                    {ln}
                  </tspan>
                ));
              })()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Diagnosis({
  t,
  axis,
  ratings,
  recommended,
  onPractice,
  next,
  lang,
}: {
  t: Strings;
  axis: Axis;
  ratings: Ratings;
  recommended: boolean;
  onPractice: (s: SkillId) => void;
  next: Recommendation | null;
  lang: 'he' | 'en';
}) {
  const nextLabel =
    next?.kind === 'lesson'
      ? `${LESSON_ORDER.indexOf(next.lessonId) + 1}. ${LESSON_META[next.lessonId].title[lang].replace(/\{[nk]\}/g, '')}`
      : next?.kind === 'puzzle'
        ? t.weeklyPuzzle
        : next?.kind === 'runs-workshop'
          ? t.runsWorkshop
          : next?.kind === 'rhythm-game'
            ? t.beatEcho
            : next?.kind === 'vocal'
              ? t.vocalTitle
              : next?.kind === 'modes'
                ? t.skillNames.modes
                : next?.kind === 'absolute'
                  ? t.skillNames.absolute
                  : '';
  const planned = PLANNED_SKILLS.includes(axis as never);
  const r = planned ? undefined : ratings[axis as SkillId];
  const ev = planned ? null : evidence(r);
  return (
    <section className={`set-card diag-panel ${recommended ? 'recommended' : ''}`} aria-live="polite">
      {recommended && <p className="eyebrow">★ {t.recommendedNext}</p>}
      <h2>{t.skillNames[axis]}</h2>
      {r && r.n > 0 && (
        <div className="diag-stats">
          <div>
            <small>{t.rating}</small>
            <b>{r.r}</b>
            <small>{t.bands[band(r.r)]}</small>
          </div>
          <div>
            <small>{t.answered}</small>
            <b>{r.n}</b>
            <small>{ev === 'provisional' ? t.evProvisional : t.evMeasured}</small>
          </div>
          <div>
            <small>{t.accuracy}</small>
            <b>{Math.round((r.correct / r.n) * 100)}%</b>
          </div>
        </div>
      )}
      <p>{t.skillDiag[axis]}</p>
      {!planned && (
        <>
          {nextLabel && ev !== 'unmeasured' && (
            <p className="diag-next">
              {t.forYourLevel}: <b>{nextLabel}</b>
            </p>
          )}
          <button className="btn primary" onClick={() => onPractice(axis as SkillId)}>
            {ev === 'unmeasured' ? t.measureThis : t.practiceThis} →
          </button>
        </>
      )}
    </section>
  );
}
