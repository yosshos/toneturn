import { useState } from 'react';
import type { SkillId } from '../engine/lesson';
import { band, evidence, normalised, PLANNED_SKILLS, SKILLS, weakestSkill, type Ratings } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { ratingsOf, type Progress } from '../storage/progress';

type Axis = SkillId | (typeof PLANNED_SKILLS)[number];
const AXES: Axis[] = [...SKILLS, ...PLANNED_SKILLS];

export function SkillMap({
  t,
  progress,
  onBack,
  onPractice,
  onPlacement,
}: {
  t: Strings;
  progress: Progress;
  onBack: () => void;
  onPractice: (skill: SkillId) => void;
  onPlacement: () => void;
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

      <Radar ratings={ratings} old={old?.ratings} sel={sel} onSelect={setSel} t={t} />
      {old && (
        <p className="legend">
          <span className="sw now" /> {t.now} <span className="sw old" /> {t.lastMonth}
        </p>
      )}

      <Diagnosis t={t} axis={sel} ratings={ratings} recommended={sel === rec} onPractice={onPractice} />

      {!anyMeasured && (
        <section className="set-card">
          <h2>🧭 {t.findLevel}</h2>
          <p className="field-hint">{t.findLevelHint}</p>
          <button className="btn mega" onClick={onPlacement}>
            {t.findLevel}
          </button>
        </section>
      )}

      {/* Text equivalent of the chart (also the keyboard / screen-reader path). */}
      <section className="set-card">
        <h2>{t.skillMap}</h2>
        <ul className="skill-list">
          {AXES.map((a) => {
            const r = ratings[a as SkillId];
            const ev = PLANNED_SKILLS.includes(a as never) ? null : evidence(r);
            return (
              <li key={a}>
                <button className={`skill-row ${sel === a ? 'on' : ''}`} onClick={() => setSel(a)} aria-pressed={sel === a}>
                  <b>{t.skillNames[a]}</b>
                  <span className={`ev ev-${ev ?? 'planned'}`}>
                    {ev === null
                      ? t.comingSoonSkill
                      : ev === 'unmeasured'
                        ? t.evUnmeasured
                        : `${t.bands[band(r!.r)]} · ${r!.r} · ${ev === 'provisional' ? t.evProvisional : t.evMeasured}`}
                  </span>
                  {a === rec && <span className="rec-chip">★</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {anyMeasured && (
          <button className="btn ghost small" onClick={onPlacement}>
            {t.findLevel}
          </button>
        )}
      </section>
    </main>
  );
}

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
  const n = AXES.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => [C + R * v * Math.cos(ang(i)), C + R * v * Math.sin(ang(i))] as const;
  const vals = AXES.map((a) => (PLANNED_SKILLS.includes(a as never) ? null : normalised(ratings[a as SkillId])));
  const oldVals = AXES.map((a) => {
    const r = old?.[a as SkillId];
    return r === undefined ? null : Math.max(0, Math.min(1, (r - 600) / 1000));
  });
  // Polygon only through measured axes, in order — unmeasured axes are gaps, never zero.
  const poly = (vs: (number | null)[]) =>
    vs
      .map((v, i) => (v === null ? null : pt(i, v)))
      .filter((p): p is readonly [number, number] => p !== null)
      .map((p) => p.join(','))
      .join(' ');
  const measuredCount = vals.filter((v) => v !== null).length;

  return (
    <svg className="radar" viewBox="0 0 320 320" role="img" aria-label={t.skillMap}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} className="ring" points={AXES.map((_, i) => pt(i, k).join(',')).join(' ')} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} className="spoke" x1={C} y1={C} x2={x} y2={y} />;
      })}
      {oldVals.filter((v) => v !== null).length >= 3 && <polygon className="area old" points={poly(oldVals)} />}
      {measuredCount >= 3 && <polygon className="area" points={poly(vals)} />}
      {AXES.map((a, i) => {
        const v = vals[i];
        const ev = PLANNED_SKILLS.includes(a as never) ? 'planned' : evidence(ratings[a as SkillId]);
        const [lx, ly] = pt(i, 1.24);
        const [px, py] = v === null ? pt(i, 0.06) : pt(i, v);
        return (
          <g key={a} className={`axis ${sel === a ? 'sel' : ''}`} onClick={() => onSelect(a)} style={{ cursor: 'pointer' }}>
            <circle className={`dot ev-${ev}`} cx={px} cy={py} r={v === null ? 6 : 8} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="axis-label">
              {t.skillNames[a]}
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
}: {
  t: Strings;
  axis: Axis;
  ratings: Ratings;
  recommended: boolean;
  onPractice: (s: SkillId) => void;
}) {
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
        <button className="btn primary" onClick={() => onPractice(axis as SkillId)}>
          {ev === 'unmeasured' ? t.measureThis : t.practiceThis} →
        </button>
      )}
    </section>
  );
}
