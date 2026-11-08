
import { DOMAINS, type DomainId } from '../engine/rating';
import { TrioArt } from './TrioArt';
import { StreakChip } from './Streak';
import type { StreakState } from '../engine/streak';
import { FIRST_TRIO, randomTrio, type Trio } from '../engine/heroTrio';
import { applyUpdate, promptInstall, pwa } from '../pwa';
import { topicProgress } from '../engine/recommend';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { personalOrder, type Intake } from '../engine/intake';
import { displayNote, type Naming } from '../engine/pitch';
import type { InputMode } from '../engine/session';
import type { Strings } from '../i18n/strings';
import { namingFor, type Progress, type Settings } from '../storage/progress';
import { Logo, MicIcon, ModeSwitch } from './bits';
import { WhatsNewButton } from './Arcade';
import { UNLOCK_ALL } from './services';

/** Small line icons for the Home chrome (stroke = currentColor). */
const CompassIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </svg>
);
const InstallIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" />
  </svg>
);

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  /** Extra header icons (month in review, spec AG S16). */
  headerExtra?: React.ReactNode;
  /** Today's workout (spec AH W1). */
  workout?: React.ReactNode;
  /** Teacher assignments (today's homework), when there are some. */
  assigned?: React.ReactNode;
  streak: StreakState;
  onStreak: () => void;
  onPractice: (id: LessonId, consented: boolean) => void;
  onButtonsInstead: (id: LessonId) => void;
  onMode: (m: InputMode) => void;
  whatsNew: { unseen: boolean; onSeen: () => void };
  onPlacement: (domain?: DomainId | null) => void;
  onMenu: () => void;
  /** Things to resume (placement, last session), the freeze toast, the catch-up card. */
  news: React.ReactNode;
}

export const DAILY_GOAL_XP = 30;

export type NodeState = 'done' | 'current' | 'open' | 'locked';

/** Lesson i unlocks when lesson i-1 has been completed at least once. */
export function lessonStates(progress: Progress, order: LessonId[] = LESSON_ORDER): Record<LessonId, NodeState> {
  const out = {} as Record<LessonId, NodeState>;
  let currentSet = false;
  order.forEach((id, i) => {
    const done = (progress.lessons[id]?.completions ?? 0) > 0;
    const prevDone = i === 0 || (progress.lessons[order[i - 1]]?.completions ?? 0) > 0;
    const placed = progress.placementUnlocks?.includes(id) ?? false;
    if (done) out[id] = 'done';
    else if (prevDone || placed || UNLOCK_ALL) {
      out[id] = currentSet ? 'open' : 'current';
      currentSet = true;
    } else out[id] = 'locked';
  });
  return out;
}

export function nextLessonId(progress: Progress, order: LessonId[] = LESSON_ORDER): LessonId {
  const st = lessonStates(progress, order);
  return order.find((id) => st[id] === 'current') ?? order[order.length - 1];
}

export function starsFor(best: number, total: number) {
  const r = total ? best / total : 0;
  return r >= 1 ? 3 : r >= 0.6 ? 2 : r > 0 ? 1 : 0;
}

export const TOTALS: Partial<Record<LessonId, number>> = { 'bflat-two-homes': 3, 'degrees-135': 5, 'major-minor': 5, cadences: 4, 'sing-home-five': 3, intervals: 6, inversions: 5, 'notes-degrees': 6, 'sing-names': 4, 'sing-degrees': 3, 'rhythm-r1': 5, 'rhythm-r2': 5, 'rhythm-r3': 5, runs: 5, 'rhythm-r4': 5, 'rhythm-r5': 5, 'rhythm-r6': 5, 'rhythm-r7': 5, 'rhythm-r8': 5, 'note-sequences': 5, 'jazz-1': 5, songs: 5 };

/**
 * Today (SPEC-TODAY, owner 2026-11-07): the screen brings the player to today's workout and lets them edit it — plus
 * one small Find my level button. Everything else moved to its own place (Path: topics and practice rooms; Play:
 * puzzles and challenges; Progress: areas and ranks; Settings: account). First run keeps the welcome hero.
 */
export function Home({ t, settings, progress, streak, onStreak, onPractice, onButtonsInstead, onMode, whatsNew, onPlacement, onMenu, news, assigned, headerExtra, workout }: Props) {
  const [consentFor, setConsentFor] = useState<LessonId | null>(null);
  const [levelSheet, setLevelSheet] = useState(false);
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  // The path in the player's own order of areas (intake questionnaire).
  const order = personalOrder((settings.intake as Intake | null | undefined)?.priorities, settings.track);
  const next = nextLessonId(progress, order);
  const beginner = settings.track === 'explorer' || settings.track === 'hobby';
  const placed = (progress.lessons.placement?.completions ?? 0) > 0;

  // First visit: finding your level is the default first step (spec addendum, user testing).
  const firstRun = !placed && progress.history.length === 0 && !LESSON_ORDER.some((id) => (progress.lessons[id]?.completions ?? 0) > 0);
  const start = (id: LessonId) => {
    if (settings.mode === 'voice' && !settings.voiceConsent) return setConsentFor(id);
    onPractice(id, false);
  };
  const he = lang === 'he';

  return (
    <main className="home today-screen">
      <TopBar t={t} lang={lang} streak={streak} onStreak={onStreak} whatsNew={whatsNew} headerExtra={headerExtra} onMenu={onMenu} />

      {news}

      {firstRun ? (
        <section className="hero first-run">
          <HeroArt nm={nm} lang={lang} />
          <div className="hero-copy">
            <p className="tagline">{t.appTagline}</p>
            <h1>{t.firstRunTitle}</h1>
            <p className="blurb">{t.firstRunBlurb}</p>
            <ModeSwitch mode={settings.mode} onChange={onMode} t={t} />
            {beginner ? (
              <>
                <button className="btn primary first-run-cta" onClick={() => start(next)}>
                  {t.intake.startBasics}
                </button>
                <button className="link start-from-one" onClick={() => onPlacement()}>
                  {t.intake.findLevelInstead}
                </button>
              </>
            ) : (
              <>
                <button className="btn primary first-run-cta" onClick={() => onPlacement()}>
                  {settings.mode === 'voice' && <MicIcon />}
                  {t.findLevel}
                </button>
                <button className="link start-from-one" onClick={() => start(next)}>
                  {t.startFromLessonOne}
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <h1 className="sr-only">The 7th Sense — {t.homeToday}</h1>
          {assigned}
          {workout}
          <button className="find-level-btn" onClick={() => setLevelSheet(true)} data-find-level="1">
            <CompassIcon /> {t.findLevel}
          </button>
        </>
      )}

      {levelSheet && (
        <div className="sheet-backdrop" onClick={() => setLevelSheet(false)}>
          <div className="sheet level-sheet" role="dialog" aria-modal="true" aria-labelledby="level-sheet-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="level-sheet-title">{t.findLevel}</h2>
            <p className="field-hint">{placed ? t.retakePlacement : t.findLevelHint}</p>
            <button
              className="btn primary ls-all"
              data-level-all="1"
              onClick={() => {
                setLevelSheet(false);
                onPlacement();
              }}
            >
              <span>{he ? 'הכול יחד' : 'Everything'}</span>
              <small>{he ? 'כל התחומים · 20–30 דק׳' : 'All areas · 20–30 min'}</small>
            </button>
            <p className="ls-or">{t.placementByDomain}</p>
            <div className="ls-areas" role="group" aria-label={t.placementByDomain}>
              {DOMAINS.map((d) => (
                <button
                  key={d.id}
                  className="chip"
                  data-domain={d.id}
                  onClick={() => {
                    setLevelSheet(false);
                    onPlacement(d.id);
                  }}
                >
                  {t.domainNames[d.id]}
                </button>
              ))}
            </div>
            <button className="btn ghost" onClick={() => setLevelSheet(false)}>
              {he ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {consentFor && (
        <div className="sheet-backdrop" onClick={() => setConsentFor(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="consent-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="consent-title">
              <MicIcon /> {t.consentTitle}
            </h2>
            <p>{t.consentBody}</p>
            <button className="btn primary" autoFocus onClick={() => onPractice(consentFor, true)}>
              {t.consentAllow}
            </button>
            <button className="btn ghost" onClick={() => onButtonsInstead(consentFor)}>
              {t.consentButtons}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


/**
 * The app's top bar (owner 2026-11-07): logo, streak, what's new / gift, month review, install / update, menu — the
 * same on every main tab (Today, Path, Progress, Play, Friends), never inside an exercise.
 */
export function TopBar({ t, lang, streak, onStreak, whatsNew, headerExtra, onMenu }: { t: Strings; lang: 'he' | 'en'; streak: StreakState; onStreak: () => void; whatsNew: { unseen: boolean; onSeen: () => void }; headerExtra?: React.ReactNode; onMenu: () => void }) {
  return (
  <header className="topbar">
    <div className="brand">
      <Logo bare size={40} />
      <span className="wordmark" dir="ltr">
        <span>
          The 7<span className="wordmark-th">th</span>
        </span>{' '}
        <span className="wordmark-accent">Sense</span>
      </span>
    </div>
    <div className="stats">
      <StreakChip t={t} st={streak} onOpen={onStreak} />
      <WhatsNewButton t={t} lang={lang} unseen={whatsNew.unseen} onSeen={whatsNew.onSeen} />
      {headerExtra}
      <HeaderPwa t={t} />
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label={t.menu}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>
  </header>
  );
}

export function NodeIcon({ kind }: { kind: 'ear' | 'steps' | 'chord' | 'cadence' | 'mic' | 'map' | 'review' | 'puzzle' | 'drum' }) {
  switch (kind) {
    case 'ear':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M10 13a7 7 0 1 1 13 3.5c-1.5 2.5-4 3.5-4 6.5a3.5 3.5 0 0 1-6.5 1.5" />
          <path d="M14 13.5a3 3 0 1 1 5 2" />
        </svg>
      );
    case 'steps':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <circle cx="7" cy="24" r="4" />
          <circle cx="16" cy="16" r="4" />
          <circle cx="25" cy="8" r="4" />
        </svg>
      );
    case 'chord':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <ellipse cx="12" cy="24" rx="5" ry="3.6" transform="rotate(-20 12 24)" />
          <ellipse cx="12" cy="16" rx="5" ry="3.6" transform="rotate(-20 12 16)" />
          <ellipse cx="12" cy="8" rx="5" ry="3.6" transform="rotate(-20 12 8)" />
          <rect x="16" y="5" width="2.6" height="20" rx="1.3" />
        </svg>
      );
    case 'cadence':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22l7-8 6 5 9-11" />
          <path d="M20 8h6v6" />
        </svg>
      );
    case 'mic':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <rect x="12" y="4" width="8" height="15" rx="4" fill="currentColor" />
          <path d="M8 15a8 8 0 0 0 16 0M16 23v5" />
        </svg>
      );
    case 'map':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
          <polygon points="16,3 28,11 24,27 8,27 4,11" opacity=".45" />
          <polygon points="16,9 23,13 21,22 11,23 9,14" fill="currentColor" />
        </svg>
      );
    case 'review':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16a10 10 0 1 0 3-7" />
          <path d="M5 4v6h6" />
          <path d="M16 11v6l4 2" />
        </svg>
      );
    case 'drum':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <ellipse cx="9" cy="23" rx="4.5" ry="3.4" transform="rotate(-20 9 23)" />
          <ellipse cx="23" cy="20" rx="4.5" ry="3.4" transform="rotate(-20 23 20)" />
          <path d="M12.5 22V7l14-3v15h-2.6V8L15 9.8V22z" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <path d="M6 6h8a3 3 0 1 1 4 0h8v8a3 3 0 1 0 0 4v8h-8a3 3 0 1 0-4 0H6v-8a3 3 0 1 1 0-4z" />
        </svg>
      );
  }
}

/** Illustrated hero: a piano horizon, the B♭ token floating between its two homes. */
/** Three notes on the keyboard and the intervals between them; a new random trio every few seconds. */
function HeroArt({ nm, lang }: { nm: Naming; lang: 'he' | 'en' }) {
  const [state, setState] = useState<{ n: number; trio: Trio }>({ n: 0, trio: FIRST_TRIO });
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setState((s) => ({ n: s.n + 1, trio: randomTrio() }));
    }, 4500);
    return () => window.clearInterval(id);
  }, []);
  const { trio, n } = state;
  return <TrioArt n={n} left={displayNote(trio.left, nm, lang)} mid={displayNote(trio.mid, nm, lang)} right={displayNote(trio.right, nm, lang)} intervalLeft={trio.intervalLeft} intervalRight={trio.intervalRight} />;
}

/** "Done X of Y" per topic across the whole path. */
export function TopicBars({ t, progress }: { t: Strings; progress: Progress }) {
  const rows = topicProgress((id) => (progress.lessons[id]?.completions ?? 0) > 0);
  return (
    <section className="topic-bars" aria-label={t.topics}>
      <h2>{t.topics}</h2>
      <ul>
        {rows.map((r) => (
          <li key={r.id} data-topic={r.id}>
            <span className="tb-name">{t.topicNames[r.id]}</span>
            <span className="tb-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done} aria-label={t.topicNames[r.id]}>
              <span style={{ width: `${(100 * r.done) / r.total}%` }} />
            </span>
            <span className="tb-count" dir="ltr">
              {r.done}/{r.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Header actions from the PWA state: a gold "update" button when a new version is waiting, an install emoji when not installed. */
function HeaderPwa({ t }: { t: Strings }) {
  const p = useSyncExternalStore(pwa.subscribe, pwa.get);
  const [howTo, setHowTo] = useState(false);
  return (
    <>
      {p.updateReady && (
        <button className="update-pill" onClick={() => applyUpdate()} title={t.updateReady}>
          <span aria-hidden="true">⟳</span> {t.updateShort}
        </button>
      )}
      {!p.installed && (p.canInstall || p.iosManual || import.meta.env.PROD) && (
        <button
          className="icon-btn install-btn"
          aria-label={t.installApp}
          title={t.installApp}
          onClick={() => (p.canInstall ? void promptInstall() : setHowTo(true))}
        >
          <InstallIcon />
        </button>
      )}
      {howTo && (
        <div className="sheet-backdrop" onClick={() => setHowTo(false)}>
          <div className="sheet install-sheet" role="dialog" aria-modal="true" aria-label={t.installApp} onClick={(e) => e.stopPropagation()}>
            <h2>{t.installApp}</h2>
            <p>{p.iosManual ? t.installIos : t.installHint}</p>
            <button className="btn primary" onClick={() => setHowTo(false)}>
              {t.done}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
