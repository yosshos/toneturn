import { WorkoutCard } from './Extras';
import type { WorkoutStep } from '../engine/workout';
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
import { localDay, namingFor, type Progress, type Settings } from '../storage/progress';
import { Logo, MicIcon, ModeSwitch } from './bits';
import { DomainTiles, MissionCard, PlayerStrip, WhatsNewButton } from './Arcade';
import { UNLOCK_ALL } from './services';

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  /** The next path step (spec AF D7): the mission card opens it. */
  pathNext?: { title: string; blurb: string; onStart: () => void };
  /** Extra header icons (month in review, spec AG S16). */
  headerExtra?: React.ReactNode;
  /** Today's workout (spec AH W1): the first card, in place of the mission and warm-up cards. */
  workout?: React.ReactNode;
  /** Reviews due (spec AF D7): a 2-minute warm-up before the path. */
  warmUp?: { count: number; onStart: () => void };
  streak: StreakState;
  onStreak: () => void;
  account: React.ReactNode;
  onPractice: (id: LessonId, consented: boolean) => void;
  onButtonsInstead: (id: LessonId) => void;
  onMode: (m: InputMode) => void;
  onSettings: () => void;
  onLang: (l: 'he' | 'en') => void;
  onPracticeSkill: (k: import('../engine/lesson').SkillId) => void;
  whatsNew: { unseen: boolean; onSeen: () => void };
  onVocal: (warmup: boolean) => void;
  onWorkout: (s: WorkoutStep) => void;
  onPlacement: (domain?: import('../engine/rating').DomainId | null) => void;
  onSkills: () => void;
  playerName: string | null;
  onMenu: () => void;
  updateReady: boolean;
  news: React.ReactNode;
  tools: React.ReactNode;
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

export function Home({ t, settings, progress, streak, onStreak, account, onPractice, onButtonsInstead, onMode, onPracticeSkill, whatsNew, onVocal, onWorkout, onPlacement, onSkills, playerName, onMenu, news, tools, pathNext, warmUp, headerExtra, workout }: Props) {
  const [consentFor, setConsentFor] = useState<LessonId | null>(null);
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  // The path in the player's own order of areas (intake questionnaire).
  const order = personalOrder((settings.intake as Intake | null | undefined)?.priorities, settings.track);
  const states = lessonStates(progress, order);
  const next = nextLessonId(progress, order);
  const anyDone = order.some((id) => states[id] === 'done');
  const beginner = settings.track === 'explorer' || settings.track === 'hobby';

  const today = localDay(new Date());
  const todayXp = progress.history.filter((h) => localDay(new Date(h.completedAt)) === today).reduce((a, h) => a + h.xp, 0);

  // First visit: finding your level is the default first step (spec addendum, user testing).
  const firstRun = !(progress.lessons.placement?.completions ?? 0) && progress.history.length === 0 && !LESSON_ORDER.some((id) => (progress.lessons[id]?.completions ?? 0) > 0);
  const start = (id: LessonId) => {
    if (settings.mode === 'voice' && !settings.voiceConsent) return setConsentFor(id);
    onPractice(id, false);
  };

  return (
    <main className="home">
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
                <button className="btn mega first-run-cta" onClick={() => start(next)}>
                  {t.intake.startBasics}
                </button>
                <button className="link start-from-one" onClick={() => onPlacement()}>
                  {t.intake.findLevelInstead}
                </button>
              </>
            ) : (
              <>
                <button className="btn mega first-run-cta" onClick={() => onPlacement()}>
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
          <PlayerStrip t={t} xp={progress.xp} name={playerName} onOpen={onSkills} />
          {workout}
          {!workout && warmUp && warmUp.count >= 3 && (
            <button className="warmup-card" onClick={warmUp.onStart}>
              <span aria-hidden="true">🔥</span>
              <span>
                <b>{lang === 'en' ? '2-minute warm-up' : 'חימום של 2 דקות'}</b>
                <small dir="auto">{lang === 'en' ? `${warmUp.count} items to review before your path` : `${warmUp.count} פריטים לחזרה לפני המסלול`}</small>
              </span>
            </button>
          )}
          {workout ? null : pathNext ? (
            <MissionCard t={t} settings={settings} lessonId={next} anyDone={anyDone} todayXp={todayXp} goalXp={DAILY_GOAL_XP} onStart={pathNext.onStart} title={pathNext.title} blurb={pathNext.blurb} />
          ) : (
            <MissionCard t={t} settings={settings} lessonId={next} anyDone={anyDone} todayXp={todayXp} goalXp={DAILY_GOAL_XP} onStart={() => start(next)} />
          )}
          <div className="home-mode-row">
            <ModeSwitch mode={settings.mode} onChange={onMode} t={t} />
            <button className="link start-from-one" onClick={() => onPlacement()}>
              🧭 {t.findLevel}
            </button>
          </div>
        </>
      )}

      {!firstRun && <DomainTiles t={t} progress={progress} onPractice={onPracticeSkill} lang={lang} />}
      {!firstRun && !workout && (
        <section className="home-section today" aria-label={lang === 'en' ? 'Free practice' : 'תרגול חופשי'}>
          <h2 className="home-h">🎯 {lang === 'en' ? 'Free practice' : 'תרגול חופשי'}</h2>
          <WorkoutCard t={t} progress={progress} settings={settings} onOpen={onWorkout} />
        </section>
      )}

      <section className="home-section practice" aria-label={t.homePractice}>
        <h2 className="home-h">🎯 {t.homePractice}</h2>
        {tools}
      </section>

      <section className="vocal-strip home-section" aria-label={t.vocalTitle}>
        <div className="vocal-strip-text">
          <h2>🎤 {t.vocalTitle}</h2>
          <p>{t.vocalBlurb}</p>
        </div>
        <div className="vocal-strip-actions">
          <button className="btn" onClick={() => onVocal(false)}>
            {(() => {
              const passed = (progress.vocal?.passed ?? []).filter((x) => x < 100);
              const lv = Math.min(12, (passed.length ? Math.max(...passed) : 0) + 1);
              return `${t.vocalLevel.replace('{n}', String(lv))} · ${t.vocalLevelNames[lv - 1]}`;
            })()}
          </button>
          <button className="btn ghost small" onClick={() => onVocal(true)}>
            ☀️ {t.vocalWarmup}
          </button>
        </div>
      </section>


      {account}

      <footer className="home-foot">
        <a className="link" href="#/diagnostics">
          {t.diagnostics}
        </a>
      </footer>

      {consentFor && (
        <div className="sheet-backdrop" onClick={() => setConsentFor(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="consent-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="consent-title">
              <MicIcon /> {t.consentTitle}
            </h2>
            <p>{t.consentBody}</p>
            <button className="btn mega" autoFocus onClick={() => onPractice(consentFor, true)}>
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
          <span aria-hidden="true">📲</span>
        </button>
      )}
      {howTo && (
        <div className="sheet-backdrop" onClick={() => setHowTo(false)}>
          <div className="sheet install-sheet" role="dialog" aria-modal="true" aria-label={t.installApp} onClick={(e) => e.stopPropagation()}>
            <h2>📲 {t.installApp}</h2>
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
