// The learning path screen (spec AF): sections, themed units on the winding road, ✓ / ★ / quick-check states,
// a sticky unit header, the glide to the current step, steps that rise in as they scroll into view, and a
// "back to my step" button (§10.1). Reduced motion: no glide, no stagger, no bounce.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Strings } from '../i18n/strings';
import type { Progress, Settings } from '../storage/progress';
import { namingFor, ratingsOf, dueReviews } from '../storage/progress';
import { buildPath, defaultPacks, nextIds, sectionOf, THEMES, type Goal, type PathInput, type PathStep, type PathUnit, type PathView, type Section, type UnitStep } from '../engine/path';
import type { Intake } from '../engine/intake';
import { LESSON_META } from '../game/content';
const withNoteText = (s: string, n: string) => s.replace(/{[nk]}/g, n);
import { TOPIC_GEN } from '../engine/topicKit';
import { displayNote, pc } from '../engine/pitch';
import { NodeIcon, starsFor, TOTALS } from './Home';
import { UNLOCK_ALL } from './services';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { DOMAIN_HUE, roadX, useRoad } from './Arcade';

type Lang = 'he' | 'en';
const TX = {
  en: {
    title: 'Your path',
    unit: 'Unit {n}',
    around: 'around {d}',
    check: 'Checkpoint',
    review: 'Review',
    start: 'Start',
    known: '✓ {n} steps you already know',
    showKnown: 'Show them',
    hideKnown: 'Hide them',
    testOut: 'Test out of this unit',
    backToStep: 'Back to my step',
    section: { beginner: 'Beginner', developing: 'Developing', solid: 'Solid', advanced: 'Advanced' } as Record<Section, string>,
    sectionKnown: '{p}% known',
    later: 'The same ten themes come back, one level deeper.',
    locked: 'Coming up',
    practice: 'Practice anyway',
    keep: 'Keep it on my path',
    hide: 'Hide this topic',
    quick: 'Quick check',
    refresh: 'Needs a refresh',
    probe: 'A short probe',
    close: 'Close',
    findLevel: 'Find my level',
    updated: 'Your path was updated',
    updatedChecked: 'Your path was updated: {n} more steps ✓.',
    ok: 'OK',
    myPath: 'My path',
    stars: 'stars',
    pastUnits: '{n} units done',
  },
  he: {
    title: 'המסלול שלך',
    unit: 'יחידה {n}',
    around: 'בסביבות {d}',
    check: 'נקודת ביקורת',
    review: 'חזרה',
    start: 'להתחיל',
    known: '✓ {n} שלבים שאתם כבר יודעים',
    showKnown: 'להציג',
    hideKnown: 'להסתיר',
    testOut: 'מבחן מעבר ליחידה',
    backToStep: 'חזרה לשלב שלי',
    section: { beginner: 'מתחילים', developing: 'מתפתחים', solid: 'יציבים', advanced: 'מתקדמים' } as Record<Section, string>,
    sectionKnown: '{p}% ידוע',
    later: 'אותם עשרה נושאים חוזרים, רמה אחת עמוק יותר.',
    locked: 'בקרוב',
    practice: 'לתרגל בכל זאת',
    keep: 'להשאיר במסלול',
    hide: 'להסתיר את הנושא',
    quick: 'בדיקה קצרה',
    refresh: 'צריך רענון',
    probe: 'בדיקה קצרה ראשונה',
    close: 'סגירה',
    findLevel: 'למצוא את הרמה שלי',
    updated: 'המסלול שלכם עודכן',
    updatedChecked: 'המסלול שלכם עודכן: עוד {n} שלבים ✓.',
    ok: 'הבנתי',
    myPath: 'המסלול שלי',
    stars: 'כוכבים',
    pastUnits: '{n} יחידות הושלמו',
  },
};
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const SECTIONS: Section[] = ['beginner', 'developing', 'solid', 'advanced'];

/** Hand-made lessons finished anywhere (Home, a class, a link) are done path steps too. */
function withLessonFacts(f: NonNullable<Settings['pathFacts']>, p: Progress): NonNullable<Settings['pathFacts']> {
  const steps = { ...(f.steps ?? {}) };
  for (const [id, l] of Object.entries(p.lessons)) {
    if (!l.completions || id === 'placement' || id === 'topic') continue;
    const key = `lesson:${id}`;
    const stars = starsFor(l.best, TOTALS[id as keyof typeof TOTALS] ?? Math.max(1, l.best));
    if ((steps[key]?.stars ?? 0) < stars) steps[key] = { stars, at: l.lastAt, times: Math.max(steps[key]?.times ?? 0, l.completions), firstAt: steps[key]?.firstAt ?? l.lastAt };
  }
  return { ...f, steps };
}

/** The path input from settings and progress (spec AF §3). */
export function pathInputFrom(s: Settings, p: Progress, now = new Date()): PathInput {
  const intake = s.intake as Intake | null | undefined;
  const plays = [...(intake?.plays ?? []), ...(s.midiInput ? ['keys'] : []), ...(s.instrument && !['voice', 'C', 'Bb', 'Eb', 'F'].includes(s.instrument) ? [s.instrument] : [])];
  const track = s.track ?? 'hobby';
  const goal: Goal = s.goal ?? 'general';
  return {
    track,
    goal,
    hidden: s.pathHidden ?? [],
    noSing: !!s.noSing,
    noMic: !!s.noMic,
    noDrills: s.drills?.inPath === false,
    priorities: intake?.priorities ?? null,
    leaveOut: s.pathLeaveOut ?? [],
    packs: s.pathPacks ?? defaultPacks(track, plays, goal),
    plays,
    minutes: (intake?.minutes ?? 10) as 5 | 10 | 20,
    ratings: ratingsOf(p),
    events: p.ratingEvents ?? [],
    facts: withLessonFacts(s.pathFacts ?? {}, p),
    keep: s.pathKeep ?? [],
    reviewDue: new Set(dueReviews(p.review, now).map((r) => r.key)).size,
    now,
  };
}

/** The path, memoised on its inputs (P19). */
export function usePathView(s: Settings, p: Progress): PathView {
  const day = new Date().toDateString();
  return useMemo(
    () => buildPath(pathInputFrom(s, p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.intake, s.track, s.goal, s.pathHidden, s.noSing, s.noMic, s.pathLeaveOut, s.pathPacks, s.pathFacts, s.pathKeep, s.midiInput, s.instrument, p.ratingEvents?.length, p.review.length, p.lessons, day],
  );
}

export function stepTitle(step: PathStep, s: Settings, lang: Lang): string {
  const tx = TX[lang];
  if (step.kind === 'check') return tx.check;
  if (step.kind === 'review') return tx.review;
  if (step.kind === 'game') return `🎮 ${step.title[lang]}`;
  if (step.lesson) {
    const bb = displayNote(pc('Bb'), namingFor(s.naming, lang), lang);
    return withNoteText(LESSON_META[step.lesson]?.title[lang] ?? step.lesson, bb);
  }
  const T = step.topic ? TOPIC_GEN[step.topic] : null;
  if (!T) return step.id;
  const lv = T.levels[(step.level ?? 1) - 1];
  return `${T.title[lang]} · ${lv ? lv[lang] : step.level}`;
}

const ICON: Record<string, 'ear' | 'steps' | 'chord' | 'cadence' | 'mic' | 'map' | 'review' | 'puzzle' | 'drum'> = { pitch: 'ear', time: 'drum', memory: 'steps', voice: 'mic', reading: 'map', creative: 'puzzle', instrument: 'chord' };
const iconOf = (step: PathStep) => (step.kind === 'game' ? 'puzzle' : step.kind === 'review' ? 'review' : step.lesson ? (LESSON_META[step.lesson]?.icon ?? 'ear') : ICON[step.domain] ?? 'ear');

const reduced = () => typeof document !== 'undefined' && (document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));

export function PathView2({
  t: _t,
  settings,
  progress,
  view,
  onStep,
  onTestOut,
  onPlacement,
  onSettings,
  onLesson,
  extras,
}: {
  t: Strings;
  settings: Settings;
  progress: Progress;
  view: PathView;
  onStep: (x: UnitStep, unit: PathUnit, mode: 'step' | 'practice') => void;
  onTestOut: (unit: PathUnit) => void;
  onPlacement: () => void;
  onSettings: (p: Partial<Settings>) => void;
  /** Open a hand-made lesson directly (the unlocked QA list). */
  onLesson?: (id: LessonId) => void;
  /** Below the road: practice rooms and all topics (SPEC-TODAY §4). */
  extras?: React.ReactNode;
}) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  void progress;
  const [sheet, setSheet] = useState<{ x: UnitStep; unit: PathUnit } | null>(null);
  const [openKnown, setOpenKnown] = useState<Record<string, boolean>>({});
  const [showPast, setShowPast] = useState(false);
  const [away, setAway] = useState<0 | 1 | -1>(0);
  const curRef = useRef<HTMLLIElement | null>(null);
  const roadRef = useRef<HTMLOListElement>(null);
  const curUnit = view.units.find((u) => u.status === 'current');
  const section: Section = curUnit?.section ?? sectionOf(view.units[0]?.difficulty ?? 900);
  const past = view.units.filter((u) => u.status === 'past');
  const shownUnits = view.units.filter((u) => u.status !== 'past' || showPast);
  const roadKey = `${lang}|${shownUnits.map((u) => u.steps.map((x) => x.step.id + x.state).join(',')).join('|')}|${JSON.stringify(openKnown)}`;
  const road = useRoad(roadRef, roadKey);

  // The change card (P17: the next five steps changed after a rebuild).
  const ids = nextIds(view);
  const seen = settings.pathSeen;
  const changed = !!seen && seen.length > 0 && ids.join() !== seen.filter((x) => !x.startsWith('#')).join();
  const checkedBefore = Number((seen ?? []).find((x) => x.startsWith('#checked:'))?.slice(9) ?? view.progress.checked);
  const ackChange = () => onSettings({ pathSeen: [...ids, `#checked:${view.progress.checked}`] });
  useEffect(() => {
    if (!seen) onSettings({ pathSeen: [...ids, `#checked:${view.progress.checked}`] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Glide to the current step on arrival (§10.1).
  useEffect(() => {
    const el = curRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: reduced() ? ('instant' as ScrollBehavior) : 'smooth' }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.current?.step.id]);

  // Back-to-my-step button + steps rising in.
  useEffect(() => {
    const el = curRef.current;
    let io1: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io1 = new IntersectionObserver(([e]) => setAway(e.isIntersecting ? 0 : e.boundingClientRect.top < 0 ? -1 : 1), { threshold: 0.2 });
      io1.observe(el);
    }
    const io2 =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (es) =>
              es.forEach((e) => {
                if (e.isIntersecting) {
                  e.target.classList.add('in');
                  io2?.unobserve(e.target);
                }
              }),
            { rootMargin: '0px 0px -8% 0px' },
          )
        : null;
    roadRef.current?.querySelectorAll('.node, .unit-banner').forEach((n, i) => {
      (n as HTMLElement).style.setProperty('--stagger', `${(i % 8) * 40}ms`);
      if (io2 && !reduced()) io2.observe(n);
      else n.classList.add('in');
    });
    return () => {
      io1?.disconnect();
      io2?.disconnect();
    };
  }, [roadKey]);

  let k = 0;
  const node = (x: UnitStep, unit: PathUnit) => {
    const i = k++;
    const st = x.state;
    const hue = DOMAIN_HUE[x.step.domain];
    const label = stepTitle(x.step, settings, lang);
    const isCur = st === 'current';
    const click = () => {
      if (isCur) onStep(x, unit, 'step');
      else if (st !== 'locked') setSheet({ x, unit });
    };
    return (
      <li key={x.step.id} ref={isCur ? curRef : undefined} className={`node ${st === 'mastered' ? 'done mastered' : st} kind-${x.step.kind} ${x.probe ? 'probe' : ''}`} data-step={x.step.id} style={{ ['--x' as string]: `${roadX(i)}%`, ['--hue' as string]: hue }}>
        <button className="node-btn" disabled={st === 'locked'} onClick={click} aria-label={`${label}${st === 'tested' ? ' ✓' : ''}`}>
          {isCur && (
            <span className="start-bubble" aria-hidden="true">
              {x.probe ? tx.probe : tx.start} <span className="flip-rtl">▶</span>
            </span>
          )}
          <span className="node-disc" aria-hidden="true">
            {st === 'locked' ? <span className="lock">🔒</span> : x.step.kind === 'check' ? <span className="trophy">🏆</span> : <NodeIcon kind={iconOf(x.step)} />}
            {st === 'tested' && <span className="check-medal">✓</span>}
            {st === 'mastered' && <span className="master-medal">★</span>}
            {st === 'refresh' && <span className="refresh-medal">↻</span>}
          </span>
          <span className="node-text">
            {(st === 'done' || st === 'mastered') && (
              <span className="mini-stars" aria-label={`${x.stars ?? 0} ${tx.stars}`}>
                {[0, 1, 2].map((s) => (
                  <span key={s} className={s < (x.stars ?? 0) ? 'won' : ''}>
                    ★
                  </span>
                ))}
              </span>
            )}
            <b>{label}</b>
            {st === 'quick' && <small className="node-tag">{tx.quick}</small>}
            {st === 'refresh' && <small className="node-tag">{tx.refresh}</small>}
          </span>
        </button>
      </li>
    );
  };

  /** Steps of a unit with ✓ runs folded (≥ 2 in a row). */
  const unitSteps = (u: PathUnit) => {
    const out: React.ReactNode[] = [];
    let run: UnitStep[] = [];
    const flush = (key: string) => {
      if (!run.length) return;
      if (run.length >= 2 && !openKnown[key]) {
        out.push(
          <li key={key} className="known-fold">
            <button className="chip" onClick={() => setOpenKnown((o) => ({ ...o, [key]: true }))}>
              {fill(tx.known, { n: run.length })} · {tx.showKnown}
            </button>
          </li>,
        );
      } else run.forEach((x) => out.push(node(x, u)));
      run = [];
    };
    u.steps.forEach((x, j) => {
      if (x.state === 'tested') run.push(x);
      else {
        flush(`${u.id}-k${j}`);
        out.push(node(x, u));
      }
    });
    flush(`${u.id}-kend`);
    return out;
  };

  const theme = (u: PathUnit) => THEMES.find((th) => th.id === u.theme);
  const secStats = view.sections[section];
  const later = SECTIONS.slice(SECTIONS.indexOf(section) + 1);

  return (
    <main className="path-screen path2">
      <header className="path-head">
        <div className="ph-row">
          <h1>{tx.title}</h1>
          <span className="count-chip" dir="ltr">
            {view.progress.done + view.progress.checked}/{view.progress.total}
          </span>
        </div>
        <div className="section-bar" style={{ ['--p' as string]: `${secStats.total ? (100 * secStats.known) / secStats.total : 0}%` }}>
          <b>{tx.section[section]}</b>
          <span className="sec-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(secStats.total ? (100 * secStats.known) / secStats.total : 0)} aria-label={tx.section[section]}>
            <span />
          </span>
          <small dir="auto">{fill(tx.sectionKnown, { p: Math.round(secStats.total ? (100 * secStats.known) / secStats.total : 0) })}</small>
        </div>
      </header>

      {changed && (
        <div className="path-changed" role="status">
          <span>🧭 {view.progress.checked > checkedBefore ? fill(tx.updatedChecked, { n: view.progress.checked - checkedBefore }) : tx.updated}</span>
          <button className="btn small" onClick={ackChange}>
            {tx.ok}
          </button>
        </div>
      )}

      {past.length > 0 && (
        <button className="past-toggle chip" onClick={() => setShowPast((v) => !v)}>
          {fill(tx.pastUnits, { n: past.length })} · {showPast ? tx.hideKnown : tx.showKnown}
        </button>
      )}

      <div className="road-wrap">
        {road && (
          <svg className="road-svg" width={road.w} height={road.h} viewBox={`0 0 ${road.w} ${road.h}`} aria-hidden="true">
            <path className="road-bed" d={road.d} />
            {road.doneD && <path className="road-done" d={road.doneD} />}
          </svg>
        )}
        <ol className="road" ref={roadRef}>
          {shownUnits.map((u) => {
            const th = theme(u);
            const hue = DOMAIN_HUE[u.areas[0] ?? 'pitch'];
            return [
              <li key={u.id} className={`unit-banner sticky ${u.status}`} style={{ ['--hue' as string]: hue }}>
                <span>
                  <small dir="auto">
                    {fill(tx.unit, { n: u.n })} · <span dir="ltr">{fill(tx.around, { d: u.difficulty })}</span>
                  </small>
                  <b>{th ? th.name[lang] : tx.section[u.section]}</b>
                  <span className="unit-areas" aria-hidden="true">
                    {u.areas.map((a) => (
                      <i key={a} style={{ background: DOMAIN_HUE[a] }} />
                    ))}
                  </span>
                </span>
                {u.status === 'projected' ? (
                  <button className="btn small ghost test-out" onClick={() => onTestOut(u)}>
                    {tx.testOut}
                  </button>
                ) : (
                  <span className="unit-icon" aria-hidden="true">
                    {u.status === 'past' ? '✓' : '🎯'}
                  </span>
                )}
              </li>,
              ...unitSteps(u),
            ];
          })}
        </ol>
      </div>

      {later.length > 0 && (
        <section className="later-sections" aria-label={tx.locked}>
          {later.map((sec) => (
            <div key={sec} className="later-section">
              <b>
                🔒 {tx.section[sec]} <small dir="ltr">{view.sections[sec].total ? `${Math.round((100 * view.sections[sec].known) / view.sections[sec].total)}%` : ''}</small>
              </b>
              <small>{tx.later}</small>
            </div>
          ))}
        </section>
      )}

      {extras}

      {UNLOCK_ALL && onLesson && (
        // QA / tests (?unlock=all): every hand-made lesson, numbered in the original path order.
        <section className="all-lessons" aria-label="All lessons">
          <ol>
            {LESSON_ORDER.map((id, i) => (
              <li key={id}>
                <button className="chip" onClick={() => onLesson(id)} aria-label={`${i + 1}. ${withNoteText(LESSON_META[id].title[lang], displayNote(pc('Bb'), namingFor(settings.naming, lang), lang))}`}>
                  {i + 1}. {withNoteText(LESSON_META[id].title[lang], displayNote(pc('Bb'), namingFor(settings.naming, lang), lang))}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="path-foot">
        <button className="link" onClick={onPlacement}>
          🧭 {tx.findLevel}
        </button>
        <a className="link" href="#/settings">
          ⚙ {tx.myPath}
        </a>
      </p>

      {away !== 0 && view.current && (
        <button className={`back-to-step ${away < 0 ? 'up' : 'down'}`} style={{ ['--hue' as string]: DOMAIN_HUE[view.current.step.domain] }} onClick={() => curRef.current?.scrollIntoView({ block: 'center', behavior: reduced() ? ('instant' as ScrollBehavior) : 'smooth' })} aria-label={tx.backToStep}>
          {away < 0 ? '↑' : '↓'}
        </button>
      )}

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet step-sheet" role="dialog" aria-modal="true" aria-labelledby="step-sheet-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="step-sheet-title">{stepTitle(sheet.x.step, settings, lang)}</h2>
            {sheet.x.why && <p className="why">{sheet.x.why[lang]}</p>}
            <div className="sheet-actions">
              <button
                className="btn primary"
                onClick={() => {
                  onStep(sheet.x, sheet.unit, sheet.x.state === 'quick' || sheet.x.state === 'refresh' ? 'step' : 'practice');
                  setSheet(null);
                }}
              >
                {sheet.x.state === 'quick' ? tx.quick : sheet.x.state === 'open' || sheet.x.state === 'refresh' ? tx.start : tx.practice}
              </button>
              {sheet.x.state === 'tested' && (
                <button
                  className="btn"
                  onClick={() => {
                    onSettings({ pathKeep: [...new Set([...(settings.pathKeep ?? []), sheet.x.step.id])] });
                    setSheet(null);
                  }}
                >
                  {tx.keep}
                </button>
              )}
              {sheet.x.step.topic && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    onSettings({ pathHidden: [...new Set([...(settings.pathHidden ?? []), sheet.x.step.topic!])] });
                    setSheet(null);
                  }}
                >
                  {tx.hide}
                </button>
              )}
              <button className="btn ghost" onClick={() => setSheet(null)}>
                {tx.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
