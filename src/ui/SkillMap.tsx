import { COURSE_AREAS } from '../engine/courses';
import { useCourse } from './courseContext';
import { LeagueBadge } from './LeagueBadge';
import { chordTierForRating, tierOf } from '../engine/league';
import { overallRating } from '../engine/rating';
import { useState } from 'react';
import type { SkillId } from '../engine/lesson';
import { band, domainOf, DOMAINS, domainValue, type DomainId, evidence, PLANNED_SKILLS, SKILLS, weakestSkill, type Ratings } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { lessonMastered, ratingsOf, type Progress } from '../storage/progress';
import { recommendFor, type Recommendation } from '../engine/recommend';
import { TrendDetail } from './Trends';
import { LESSON_META } from '../game/content';
import { LESSON_ORDER } from '../engine/lesson';
import { foldSubs, subsOf, type SubStat } from '../engine/taxonomy';
import { Icon } from './icons';
import { COURSE_SECTIONS, sectionAxes } from '../engine/courseSections';
import { familyById } from '../engine/drills/plan';
import { TECH_DONE_STARS, techStars } from '../engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS, type FamilyId } from '../engine/drills/types';

type Axis = SkillId | (typeof PLANNED_SKILLS)[number];

/** Progress → Skills: an instrument course shows its sections (SPEC-COURSE-SECTIONS); Ear its skills by area. */
export function SkillMap(props: Parameters<typeof EarSkillMap>[0]) {
  const course = useCourse().active;
  return COURSE_SECTIONS[course] ? <CourseSectionsMap t={props.t} lang={props.lang} progress={props.progress} onBack={props.onBack} /> : <EarSkillMap {...props} />;
}

function EarSkillMap({
  t,
  progress,
  onBack,
  onPractice,
  onPlacement,
  lang,
  bestLeague: _bestLeague,
}: {
  t: Strings;
  lang: 'he' | 'en';
  progress: Progress;
  onBack: () => void;
  onPractice: (skill: SkillId) => void;
  onPlacement: (domain?: DomainId | null) => void;
  bestLeague?: number;
}) {
  const course = useCourse().active;
  const ratings = ratingsOf(progress);
  const courseSkills = DOMAINS.filter((d) => COURSE_AREAS[course].includes(d.id)).flatMap((d) => d.skills).filter((k) => k !== 'absolute');
  const [sel, setSel] = useState<Axis>(() => weakestSkill(ratings, courseSkills));
  const rec = weakestSkill(ratings, courseSkills);
  const old = (progress.snapshots ?? []).at(-5);
  const anyMeasured = SKILLS.some((k) => (ratings[k]?.n ?? 0) > 0);
  const subs = foldSubs(progress.ratingEvents ?? []);

  return (
    <main className="panel-screen skillmap">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <Icon k="back" />
        </button>
        <h1>{t.skillMap}</h1>
      </header>
      <p className="field-hint">{t.skillMapHint}</p>

      {/* Progress → Skills (owner 2026-11-07: "a list with lots of unclear details"): the radar, then one row per
          area with its bar; tap an area to open its skills, tap a skill for its diagnosis and trend. The overall
          card and the ear's chord live on Progress → Overview now. */}
      <Radar ratings={ratings} old={old?.ratings} sel={sel} onSelect={setSel} t={t} />
      {old && (
        <p className="legend">
          <span className="sw now" /> {t.now} <span className="sw old" /> {t.lastMonth}
        </p>
      )}

      {!anyMeasured && (
        <section className="set-card">
          <h2>{t.findLevel}</h2>
          <p className="field-hint">{t.findLevelHint}</p>
          <button className="btn primary" onClick={() => onPlacement()}>
            {t.findLevel}
          </button>
        </section>
      )}

      <section className="sm-areas" aria-label={t.skillMap}>
        {DOMAINS.filter((d) => COURSE_AREAS[course].includes(d.id)).map((d) => {
          const dv = domainValue(ratings, d.id);
          const measured = d.skills.filter((k) => (ratings[k]?.n ?? 0) > 0).length;
          return (
            <details key={d.id} className="sm-area" data-domain-list={d.id} open={d.skills.includes(sel as SkillId) || undefined}>
              <summary>
                <span className="sm-area-head">
                  <b>{t.domainNames[d.id]}</b>
                  <small>{dv ? `${Math.round(dv.v * 100)}% · ${measured}/${d.skills.length}` : t.evUnmeasured}</small>
                </span>
                <span className="sm-bar" aria-hidden="true">
                  <span style={{ width: dv ? `${Math.max(3, Math.round(dv.v * 100))}%` : '0%' }} />
                </span>
              </summary>
              <ul className="skill-list">
                {d.skills.map((a2) => {
                  const r = ratings[a2];
                  const ev = evidence(r);
                  return (
                    <li key={a2}>
                      <button className={`skill-row ${sel === a2 ? 'on' : ''}`} onClick={() => setSel(a2)} aria-pressed={sel === a2}>
                        <b>{t.skillNames[a2]}</b>
                        <span className={`ev ev-${ev}`}>{ev === 'unmeasured' ? t.evUnmeasured : `${t.bands[band(r!.r)]} · ${r!.r}${ev === 'provisional' ? ` · ${t.evProvisional}` : ''}`}</span>
                        {a2 === rec && <span className="rec-chip"><Icon k="star" size={12} /></span>}
                      </button>
                      {sel === a2 && (
                        <div className="sm-detail">
                          <Diagnosis
                            t={t}
                            axis={sel}
                            ratings={ratings}
                            recommended={sel === rec}
                            onPractice={onPractice}
                            next={PLANNED_SKILLS.includes(sel as never) ? null : recommendFor(sel as SkillId, ratings, (id) => lessonMastered(progress, id))}
                            lang={lang}
                            subs={subs}
                          />
                          {!PLANNED_SKILLS.includes(sel as never) && <TrendDetail t={t} events={progress.ratingEvents ?? []} skill={sel as SkillId} lang={lang} />}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="link measure-domain" data-measure={d.id} onClick={() => onPlacement(d.id)} aria-label={`${t.measureDomain}: ${t.domainNames[d.id]}`}>
                {t.measureDomain}
              </button>
            </details>
          );
        })}
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
    <svg className="radar domains" viewBox="-100 -14 520 348" role="img" aria-label={t.skillMap} style={{ direction: 'ltr' }}>
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
  subs,
}: {
  t: Strings;
  axis: Axis;
  ratings: Ratings;
  recommended: boolean;
  onPractice: (s: SkillId) => void;
  next: Recommendation | null;
  lang: 'he' | 'en';
  subs: Record<string, SubStat>;
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
      {recommended && <p className="eyebrow"><Icon k="star" size={14} /> {t.recommendedNext}</p>}
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
      {!planned && <SubSkills t={t} skill={axis as SkillId} subs={subs} lang={lang} />}
      {!planned && (
        <>
          {nextLabel && ev !== 'unmeasured' && (
            <p className="diag-next">
              {t.forYourLevel}: <b>{nextLabel}</b>
            </p>
          )}
          <button className="btn primary" onClick={() => onPractice(axis as SkillId)}>
            {ev === 'unmeasured' ? t.measureThis : t.practiceThis} <Icon k="fwd" />
          </button>
        </>
      )}
    </section>
  );
}

/** The skill's sub-skills (spec AD): accuracy per sub-skill, strongest and weakest marked. */
function SubSkills({ t, skill, subs, lang }: { t: Strings; skill: SkillId; subs: Record<string, SubStat>; lang: 'he' | 'en' }) {
  const list = subsOf(skill);
  if (list.length < 2) return null;
  const seen = list.filter((s) => (subs[s.id]?.n ?? 0) >= 3);
  const best = seen.length >= 2 ? seen.reduce((a, b) => (subs[a.id].ewma >= subs[b.id].ewma ? a : b)) : null;
  const worst = seen.length >= 2 ? seen.reduce((a, b) => (subs[a.id].ewma <= subs[b.id].ewma ? a : b)) : null;
  return (
    <div className="sub-skills" data-sub-skills={skill}>
      <h3>{t.subSkillsTitle}</h3>
      <ul>
        {list.map((s) => {
          const st = subs[s.id];
          const pct = st ? Math.round(st.ewma * 100) : null;
          const mark = best && worst && best.id !== worst.id ? (s.id === best.id ? 'strong' : s.id === worst.id ? 'weak' : '') : '';
          return (
            <li key={s.id} className={`sub-row ${mark}`} data-sub={s.id}>
              <span>{s[lang]}</span>
              <span className="sub-bar" aria-hidden="true">
                <i style={{ width: `${pct ?? 0}%` }} />
              </span>
              <small>{pct === null ? t.evUnmeasured : `${pct}% · ${st!.n}`}</small>
              {mark === 'strong' && <em className="sub-tag good">{t.subStrong}</em>}
              {mark === 'weak' && <em className="sub-tag work">{t.subWork}</em>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Your ear's chord (spec Y.4): the overall rating in the league's seven steps — Progress → Overview. */
export function EarChordCard({ t, ratings, bestLeague }: { t: Strings; ratings: Ratings; bestLeague?: number }) {
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
}

/**
 * An instrument course's skill map (owner 2026-11-21: the ear's map showed in Piano — a leftover from before the
 * courses split): its sections as the radar's axes (technique one axis, time its own on piano), then one row per section
 * with its families and how many of their levels are passed; the weakest started section is the next to work on.
 */
function CourseSectionsMap({ t, lang, progress, onBack }: { t: Strings; lang: 'he' | 'en'; progress: Progress; onBack: () => void }) {
  const course = useCourse().active;
  const secs = COURSE_SECTIONS[course]!;
  const items = progress.drillItems ?? {};
  const axes = sectionAxes(secs, items, lang);
  const he = lang === 'he';
  const started = axes.filter((a) => a.v !== null);
  const next = started.length ? started.reduce((a, b) => (b.v! < a.v! ? b : a)) : null;
  // owner 2026-11-21: the map lives here only (not on Overview), and it is clickable — an axis opens its area
  const [open, setOpen] = useState<string | null>(null);
  const R = 92;
  const pt = (k: number, f: number) => {
    const ang = (Math.PI * 2 * k) / axes.length - Math.PI / 2;
    return [130 + Math.cos(ang) * R * f, 120 + Math.sin(ang) * R * f];
  };
  const poly = (f: (k: number) => number) => axes.map((_, k) => pt(k, f(k)).map((x) => x.toFixed(1)).join(',')).join(' ');
  const val = axes.map((a) => Math.max(0.1, Math.min(1, a.v ?? 0.1)));
  const pick = (id: string) => {
    setOpen(id);
    requestAnimationFrame(() => document.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  return (
    <main className="panel-screen skillmap" data-skillmap-course={course}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <Icon k="back" />
        </button>
        <h1>{t.skillMap}</h1>
      </header>
      <p className="field-hint">{he ? 'המפה של התחומים בקורס. לחצו על תחום כדי לראות מה הוא כולל.' : 'The map of the course areas. Tap an area to see what it covers.'}</p>
      <svg className="radar sections" viewBox="-40 -10 340 260" role="img" aria-label={axes.map((a) => `${a.label} ${a.v === null ? '—' : Math.round(a.v * 100) + '%'}`).join(', ')} style={{ direction: 'ltr' }}>
        {[1, 0.66, 0.33].map((f) => (
          <polygon key={f} points={poly(() => f)} fill="none" stroke="var(--staff-line)" strokeWidth="1.5" />
        ))}
        {started.length > 0 && <polygon points={poly((k) => val[k])} fill="color-mix(in srgb, var(--purple) 22%, transparent)" stroke="var(--purple)" strokeWidth="2.5" strokeLinejoin="round" />}
        {axes.map((a, k) => {
          const [x, y] = pt(k, 1.25);
          return (
            <text key={a.id} x={x} y={y} textAnchor={x < 120 ? 'end' : x > 140 ? 'start' : 'middle'} dominantBaseline="middle" className={`sm-axis ${a.v === null ? 'off' : ''} ${open === a.id ? 'sel' : ''}`} fontSize="13" onClick={() => pick(a.id)} style={{ cursor: 'pointer' }} data-axis={a.id} data-axis-v={a.v === null ? '' : Math.round(a.v * 100)}>
              {a.label}
            </text>
          );
        })}
      </svg>
      {next && (
        <p className="sm-next" data-section-next={next.id}>
          {he ? 'הבא לעבודה: ' : 'Next to work on: '}
          <b>{next.label}</b>
        </p>
      )}
      <section className="sm-areas" aria-label={t.skillMap}>
        {secs.map((sec, i) => {
          const a = axes[i];
          return (
            <details key={sec.id} className="sm-area" data-section={sec.id} open={open === sec.id} onToggle={(e) => ((e.target as HTMLDetailsElement).open ? setOpen(sec.id) : open === sec.id && setOpen(null))}>
              <summary>
                <b>{sec.name[lang]}</b>
                <small>{a.v === null ? (he ? 'עוד לא נמדד' : 'not measured yet') : `${a.done} / ${a.levels} ${he ? 'שלבים' : 'levels'}`}</small>
                <span className="sm-bar" aria-hidden="true">
                  <i style={{ width: `${a.levels ? Math.round((a.done / a.levels) * 100) : 0}%` }} />
                </span>
              </summary>
              <p className="field-hint">{sec.desc[lang]}</p>
              {/* phase 6 (BUILD-PLAN §0.2): these two axes are measured from takes by channel, not from levels */}
              {(sec.id === 'byear' || sec.id === 'reading') && a.v !== null && (
                <p className="field-hint" data-section-measured={sec.id}>
                  {sec.id === 'byear' ? (he ? `נמדד מנגינות משמיעה של חומר חדש: ${Math.round(a.v * 100)}%` : `Measured from first takes by ear: ${Math.round(a.v * 100)}%`) : he ? `נמדד מקריאה מהדף של חומר חדש: ${Math.round(a.v * 100)}%` : `Measured from sight-reading takes: ${Math.round(a.v * 100)}%`}
                </p>
              )}
              <ul className="sm-fams">
                {sec.families.map((id) => {
                  const f = familyById(id as FamilyId);
                  if (!f) return null;
                  const done = f.levels.filter((l) => techStars(l, items, DEFAULT_DRILL_SETTINGS.keyOrder) >= TECH_DONE_STARS).length;
                  return (
                    <li key={id}>
                      <span>{f.title[lang]}</span>
                      <small dir="ltr">
                        {done} / {f.levels.length}
                      </small>
                    </li>
                  );
                })}
              </ul>
              <button className="link" onClick={() => (location.hash = '/drills')} data-section-practice={sec.id}>
                {he ? 'לתרגל' : 'Practice'}
              </button>
            </details>
          );
        })}
      </section>
    </main>
  );
}
