// The learning path screen (spec AF): sections, themed units on the winding road, ✓ / ★ / quick-check states,
// a sticky unit header, the glide to the current step, steps that rise in as they scroll into view, and a
// "back to my step" button (§10.1). Reduced motion: no glide, no stagger, no bounce.

import { GLYPHS } from './Glyph';
import { ladderFamiliesFor, ladderHiddenFor, pathGuitarAddOns, withLadderFacts } from '../engine/ladderFacts';
import { drillSettingsOf } from './Drills';
import { Iso } from './Iso';
import { courseInput } from '../engine/courses';
import { useCourse } from './courseContext';
import { ExamPrepSwitch } from './CourseSwitcher';
import { Icon } from './icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shortName } from '../engine/pathNames';
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
import { DOMAIN_HUE, useRoad } from './Arcade';

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
    bonus: 'Bonus',
    close: 'Close',
    findLevel: 'Find my level',
    updated: 'Your path was updated',
    updatedChecked: 'Your path was updated: {n} more steps ✓.',
    ok: 'OK',
    myPath: 'My path',
    stars: 'stars',
    pastUnits: '{n} units done',
    histMany: 'Units 1–{n}',
    histOne: 'Unit 1',
    histSub: '✓ {n} steps you already know',
    histUnit: 'Unit {n}',
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
    bonus: 'בונוס',
    close: 'סגירה',
    findLevel: 'למצוא את הרמה שלי',
    updated: 'המסלול שלכם עודכן',
    updatedChecked: 'המסלול שלכם עודכן: עוד {n} שלבים ✓.',
    ok: 'הבנתי',
    myPath: 'המסלול שלי',
    stars: 'כוכבים',
    pastUnits: '{n} יחידות הושלמו',
    histMany: 'יחידות 1–{n}',
    histOne: 'יחידה 1',
    histSub: '✓ {n} שלבים שאתם כבר יודעים',
    histUnit: 'יחידה {n}',
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

/** Units are marked like rehearsal letters in a score: A, B, C … Z, AA, AB … (0.61, SPEC-REDESIGN). */
export const rehearsal = (n: number) => {
  let x = Math.max(1, n);
  let out = '';
  while (x > 0) {
    x -= 1;
    out = String.fromCharCode(65 + (x % 26)) + out;
    x = Math.floor(x / 26);
  }
  return out;
};

/** The path input from settings and progress (spec AF §3). */
export function pathInputFrom(s: Settings, p: Progress, now = new Date()): PathInput {
  const intake = s.intake as Intake | null | undefined;
  const plays = [...(intake?.plays ?? []), ...(s.midiInput ? ['keys'] : []), ...(s.instrument && !['voice', 'C', 'Bb', 'Eb', 'F'].includes(s.instrument) ? [s.instrument] : [])];
  const track = s.track ?? 'hobby';
  const goal: Goal = s.goal ?? 'general';
  const base: PathInput = {
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
    // PIANO_JAZZ P2: repertoire results are done repertoire steps (measured on the item's own practice).
    facts: withRepFacts(withLessonFacts(s.pathFacts ?? {}, p), p.lessons),
    keep: s.pathKeep ?? [],
    reviewDue: new Set(dueReviews(p.review, now).map((r) => r.key)).size,
    now,
  };
  // 0.61: the path is the active course's (SPEC-COURSES).
  const course = s.activeCourse ?? 'ear';
  // 0.67: the Ear course in exam-prep mode weighs the path by what the exams test (the old Exams course).
  const inp = courseInput(base, course, !!s.examPrep);
  // 0.61 (owner): an instrument / voice course teaches its technique ladders as path steps, passed only by measured takes.
  // AUDIT-CONTENT-THEORY §ב.3: until the player picks guitar add-ons, the path carries the jazz add-on (pathGuitarAddOns).
  const ds0 = drillSettingsOf(s);
  const ds = { ...ds0, guitarAddOns: s.drills?.guitarAddOns ?? pathGuitarAddOns({ ...ds0, guitarAddOns: undefined }) };
  const families = s.drills?.inPath === false ? [] : ladderFamiliesFor(course, ds, s.bassTuning, drumMicOf(s.drumKit));
  if (!families.length) return inp;
  return {
    ...inp,
    ladderFamilies: families,
    ladderHidden: ladderHiddenFor(course, s.bassTuning, drumMicOf(s.drumKit), !!s.drills?.pianoMicOnly, ds),
    facts: withLadderFacts(inp.facts, { families, items: p.drillItems ?? {}, order: ds.keyOrder, start: s.drillStart ?? {}, vocalPassed: p.vocal?.passed ?? [], at: now.toISOString() }),
  };
}

/** The path, memoised on its inputs (P19). */
export function usePathView(s: Settings, p: Progress): PathView {
  const day = new Date().toDateString();
  return useMemo(
    () => buildPath(pathInputFrom(s, p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.activeCourse, s.examPrep, s.intake, s.track, s.goal, s.pathHidden, s.noSing, s.noMic, s.pathLeaveOut, s.pathPacks, s.pathFacts, s.pathKeep, s.midiInput, s.instrument, s.drills, s.drillStart, s.bassTuning, s.drumKit, p.ratingEvents?.length, p.review.length, p.lessons, p.drillItems, p.vocal, day],
  );
}

export function stepTitle(step: PathStep, s: Settings, lang: Lang): string {
  const tx = TX[lang];
  if (step.kind === 'check') return tx.check;
  if (step.kind === 'review') return tx.review;
  if (step.kind === 'game' || step.ladder) return step.title[lang];
  if (step.lesson) {
    const bb = displayNote(pc('Bb'), namingFor(s.naming, lang), lang);
    return withNoteText(LESSON_META[step.lesson]?.title[lang] ?? step.lesson, bb);
  }
  const T = step.topic ? TOPIC_GEN[step.topic] : null;
  if (!T) return step.id;
  const lv = T.levels[(step.level ?? 1) - 1];
  return `${T.title[lang]} · ${lv ? lv[lang] : step.level}`;
}

/** The short road name under a node: "Intervals 3", "Rhythm 2" (the full title is on the sheet and the first slide). */
export function nodeTitle(step: PathStep, s: Settings, lang: Lang): string {
  const tx = TX[lang];
  if (step.kind === 'check') return tx.check;
  if (step.kind === 'review') return tx.review;
  if (step.kind === 'game') return step.title[lang];
  // A ladder level: "Scales 3" — the family's name and the level number.
  if (step.ladder) return `${step.title[lang].split(' · ')[0]} ${step.ladder.level}`;
  if (step.lesson) {
    const m = LESSON_META[step.lesson];
    const bb = displayNote(pc('Bb'), namingFor(s.naming, lang), lang);
    return withNoteText(m ? shortName(step.lesson, m.title, lang) : step.lesson, bb);
  }
  const T = step.topic ? TOPIC_GEN[step.topic] : null;
  if (!T || !step.topic) return step.id;
  return `${shortName(step.topic, T.title, lang)} ${step.level ?? 1}`;
}

const ICON: Record<string, 'ear' | 'steps' | 'chord' | 'cadence' | 'mic' | 'map' | 'review' | 'puzzle' | 'drum'> = { pitch: 'ear', time: 'drum', memory: 'steps', voice: 'mic', reading: 'map', creative: 'puzzle', instrument: 'chord' };
const iconOf = (step: PathStep) => (step.kind === 'tech' ? 'chord' : step.kind === 'vocal' ? 'mic' : step.kind === 'game' ? 'puzzle' : step.kind === 'review' ? 'review' : step.lesson ? (LESSON_META[step.lesson]?.icon ?? 'ear') : ICON[step.domain] ?? 'ear');

import { BONUS_STEP_GLYPH, FAMILY_GLYPH, GAME_STEP_GLYPH, LESSON_GLYPH, TOPIC_GLYPH } from './stepGlyphs';
import { drumMicOf } from '../engine/drumKit';
import { KitNotice } from './DrumViews';
import { withRepFacts } from '../engine/pathBonus';

function StepIcon({ step }: { step: PathStep }) {
  const kind = step.ladder ? (FAMILY_GLYPH[step.ladder.family] ?? (step.kind === 'vocal' ? 'sing' : step.ladder.instrument === 'piano' ? 'keys' : step.ladder.instrument === 'drums' ? 'drums' : 'guitar')) : step.topic ? TOPIC_GLYPH[step.topic] : step.lesson ? LESSON_GLYPH[step.lesson] : step.kind === 'game' && step.game ? ((step.bonus ? BONUS_STEP_GLYPH[step.game] : undefined) ?? GAME_STEP_GLYPH[step.game]) : undefined;
  if (!kind) return <NodeIcon kind={iconOf(step)} />;
  return (
    <svg className="step-glyph" viewBox="-30 -27 60 54" width="30" height="27" aria-hidden="true">
      {GLYPHS[kind]}
    </svg>
  );
}

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
  onTechTest,
  top,
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
  /** An instrument course whose player never took the playing test (0.61): open it. */
  onTechTest?: () => void;
  /** SPEC-COURSE-START: under the header — the course-start hero, the level-test offer, the goal line. */
  top?: React.ReactNode;
}) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const courseCtx = useCourse();
  void progress;
  const [sheet, setSheet] = useState<{ x: UnitStep; unit: PathUnit } | null>(null);
  const [away, setAway] = useState<0 | 1 | -1>(0);
  const curRef = useRef<HTMLLIElement | null>(null);
  const roadRef = useRef<HTMLOListElement>(null);
  const curUnit = view.units.find((u) => u.status === 'current');
  const section: Section = curUnit?.section ?? sectionOf(view.units[0]?.difficulty ?? 900);
  // Like Duolingo (owner 2026-11-07): everything you passed stays on the road above you — scroll up to see it.
  const shownUnits = view.units;
  const roadKey = `${lang}|${shownUnits.map((u) => u.steps.map((x) => x.step.id + x.state).join(',')).join('|')}`;
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

  const node = (x: UnitStep, unit: PathUnit, slot: number) => {
    const st = x.state;
    const hue = DOMAIN_HUE[x.step.domain];
    const label = nodeTitle(x.step, settings, lang);
    const isCur = st === 'current';
    const click = () => {
      // Straight to the exercise's brief page (owner, 2026-11-07: no in-between sheet; hide / keep live on the brief).
      if (isCur || st === 'quick' || st === 'open' || st === 'refresh') onStep(x, unit, 'step');
      else if (st !== 'locked') onStep(x, unit, 'practice');
    };
    return (
      <li key={x.step.id} ref={isCur ? curRef : undefined} className={`node ${st === 'mastered' ? 'done mastered' : st} kind-${x.step.kind} ${x.probe ? 'probe' : ''}`} data-step={x.step.id} data-slot={slot} style={{ ['--hue' as string]: hue }}>
        <button className="node-btn" disabled={st === 'locked'} onClick={click} aria-label={`${label}${st === 'tested' ? ' ✓' : ''}`}>
          {/* 0.63 (design board PhonePath): a note head on the staff — the unit test is a final double barline with a fermata,
              review is a repeat sign; done is a filled head with a check, the current one lemon with a ring. */}
          {x.step.kind === 'check' ? (
            <span className="node-bar" aria-hidden="true">
              <svg viewBox="0 0 60 90" width="60" height="90">
                <path d="M12 26 A18 18 0 0 1 48 26" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <circle cx="30" cy="22" r="3.6" fill="currentColor" />
                <rect x="24" y="34" width="3" height="56" fill="var(--ink-c)" />
                <rect x="31" y="34" width="9" height="56" fill="var(--ink-c)" />
              </svg>
            </span>
          ) : x.step.kind === 'review' ? (
            <span className="node-bar repeat" aria-hidden="true">
              <svg viewBox="0 0 40 90" width="40" height="90">
                <rect x="6" y="34" width="6" height="56" fill="var(--ink-c)" />
                <rect x="17" y="34" width="2.5" height="56" fill="var(--ink-c)" />
                <circle cx="27" cy="55" r="3.5" fill="var(--ink-c)" />
                <circle cx="27" cy="69" r="3.5" fill="var(--ink-c)" />
              </svg>
            </span>
          ) : (
            <span className="node-disc" aria-hidden="true">
              {st === 'locked' ? (
                <span className="lock">
                  <Icon k="lock" />
                </span>
              ) : st === 'done' || st === 'mastered' || st === 'tested' ? (
                <svg className="node-check" viewBox="0 0 24 24" width="24" height="24">
                  <path d="M5 12.5l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <StepIcon step={x.step} />
              )}
              {st === 'refresh' && <span className="refresh-medal">↻</span>}
            </span>
          )}
          <span className="node-text">
            {(st === 'done' || st === 'mastered') && (
              <span className="mini-stars" aria-label={`${x.stars ?? 0} ${tx.stars}`}>
                {(x.step.ladder && x.step.kind === 'tech' ? [0, 1, 2, 3, 4] : [0, 1, 2]).map((s) => (
                  <i key={s} className={s < (x.stars ?? 0) ? 'won' : ''} />
                ))}
              </span>
            )}
            <b>
              <Iso text={label} />
            </b>
            {isCur && <small className="node-go">{lang === 'he' ? 'לגעת כדי להתחיל' : 'Tap to start'}</small>}
            {isCur && x.probe && <small className="node-tag">{tx.probe}</small>}
            {st === 'quick' && <small className="node-tag">{tx.quick}</small>}
            {x.step.bonus && st !== 'done' && st !== 'mastered' && <small className="node-tag" data-bonus="1">{tx.bonus}</small>}
            {st === 'refresh' && <small className="node-tag">{tx.refresh}</small>}
          </span>
        </button>
      </li>
    );
  };

  /** Every step of a unit, ✓ ones included, three to a staff (0.63, the design's systems). */
  const unitSteps = (u: PathUnit) => {
    const rows: UnitStep[][] = [];
    for (let r = 0; r < u.steps.length; r += 3) rows.push(u.steps.slice(r, r + 3));
    return rows.map((row, ri) => (
      <li key={`${u.id}-sys${ri}`} className={`sys ${u.status}`}>
        <svg className="sys-staff" viewBox="0 0 350 56" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 1H350M0 14.5H350M0 28H350M0 41.5H350M0 55H350" stroke="var(--staff-line)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          <rect x="0" y="0" width="3" height="56" fill="var(--ink-c)" />
          {ri < rows.length - 1 && <rect x="347" y="0" width="3" height="56" fill="var(--ink-c)" />}
        </svg>
        <ol className="sys-notes">{row.map((x, j) => node(x, u, j))}</ol>
      </li>
    ));
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
        {(settings.activeCourse ?? 'ear') === 'ear' && (
          <div className="exam-head-row">
            <ExamPrepSwitch on={courseCtx.examPrep} lang={lang} onChange={courseCtx.setExamPrep} />
          </div>
        )}
        <div className="section-bar" style={{ ['--p' as string]: `${secStats.total ? (100 * secStats.known) / secStats.total : 0}%` }}>
          <b>{tx.section[section]}</b>
          <span className="sec-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(secStats.total ? (100 * secStats.known) / secStats.total : 0)} aria-label={tx.section[section]}>
            <span />
          </span>
          <small dir="auto">{fill(tx.sectionKnown, { p: Math.round(secStats.total ? (100 * secStats.known) / secStats.total : 0) })}</small>
        </div>
      </header>

      {top}
      {/* 0.66 (owner): the drums course is built for an e-kit by MIDI — said at the top until one is set up. */}
      {(settings.activeCourse ?? 'ear') === 'drums' && <KitNotice kit={settings.drumKit} lang={lang} className="path-kit-notice" />}

      {onTechTest && (
        <div className="path-techtest" data-tech-test="1">
          <span>
            <b>{lang === 'he' ? 'כבר מנגנים?' : 'Already playing?'}</b>
            <small>{lang === 'he' ? 'בדיקת נגינה קצרה (כ־3 דקות) קובעת מאיזה שלב מתחילים בכל משפחת טכניקה.' : 'A short playing test (about 3 minutes) sets your starting level in each technique family.'}</small>
          </span>
          <button className="btn primary small" onClick={onTechTest}>
            {lang === 'he' ? 'לבדיקה' : 'Take the test'}
          </button>
        </div>
      )}

      {changed && (
        <div className="path-changed" role="status">
          <span>{view.progress.checked > checkedBefore ? fill(tx.updatedChecked, { n: view.progress.checked - checkedBefore }) : tx.updated}</span>
          <button className="btn small" onClick={ackChange}>
            {tx.ok}
          </button>
        </div>
      )}


      {view.history.length > 0 && (
        <details className="path-history" data-path-history>
          <summary>
            <span className="hist-mark" aria-hidden="true">✓</span>
            <span className="hist-head">
              <b dir="auto">{view.history.length === 1 ? tx.histOne : fill(tx.histMany, { n: view.history.length })}</b>
              <small dir="auto">{fill(tx.histSub, { n: view.history.reduce((a, u) => a + u.steps.length, 0) })}</small>
            </span>
            <span className="hist-chev" aria-hidden="true">›</span>
          </summary>
          <ol className="hist-units">
            {view.history.map((u) => (
              <li key={u.id} className="hist-unit">
                <small dir="auto">
                  {fill(tx.histUnit, { n: u.no ?? u.n })} · {tx.section[u.section]}
                </small>
                <div className="hist-steps">
                  {u.steps.map((x) => (
                    <button key={x.step.id} className="hist-step" style={{ ['--hue' as string]: DOMAIN_HUE[x.step.domain] }} onClick={() => onStep(x, u, 'practice')}>
                      <StepIcon step={x.step} />
                      <span dir="auto">{nodeTitle(x.step, settings, lang)}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </details>
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
                <span className="unit-letter" aria-hidden="true">
                  {rehearsal(u.no ?? u.n)}
                </span>
                <span className="unit-copy">
                  <small dir="auto">
                    {fill(tx.unit, { n: u.no ?? u.n })} · <span dir="ltr">{fill(tx.around, { d: u.difficulty })}</span>
                  </small>
                  <b>{th ? th.name[lang] : tx.section[u.section]}</b>
                  {/* 0.66 (owner): the unit shows its progress (steps done / steps) — the old row of area-colour dots read as
                      stars that were "lit" before starting. */}
                  {(() => {
                    // An optional bonus step counts only once it is done (it never holds a unit back).
                    const isDone = (x: UnitStep) => x.state === 'done' || x.state === 'mastered' || x.state === 'tested';
                    const counted = u.steps.filter((x) => !x.step.bonus || isDone(x));
                    const total = counted.length;
                    const done = counted.filter(isDone).length;
                    return (
                      <span className="unit-prog" data-unit-done={done} data-unit-total={total}>
                        <span className="up-bar" aria-hidden="true">
                          <i style={{ width: `${total ? Math.round((100 * done) / total) : 0}%` }} />
                        </span>
                        <span className="up-n" dir="ltr">
                          {done}/{total}
                        </span>
                        <span className="sr-only">{lang === 'he' ? `${done} מתוך ${total} צעדים` : `${done} of ${total} steps`}</span>
                      </span>
                    );
                  })()}
                </span>
                {u.status === 'projected' ? (
                  <button className="btn small ghost test-out" onClick={() => onTestOut(u)}>
                    {tx.testOut}
                  </button>
                ) : u.status === 'past' ? (
                  <span className="unit-icon" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
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
                <Icon k="lock" /> {tx.section[sec]} <small dir="ltr">{view.sections[sec].total ? `${Math.round((100 * view.sections[sec].known) / view.sections[sec].total)}%` : ''}</small>
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
        <button className="btn ghost small" onClick={onPlacement}>
          {tx.findLevel}
        </button>
        <a className="btn ghost small" href="#/settings">
          {tx.myPath}
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
