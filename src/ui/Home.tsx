import { WorkoutCard } from './Extras';
import type { WorkoutStep } from '../engine/workout';
import { TrioArt } from './TrioArt';
import { StreakChip } from './Streak';
import type { StreakState } from '../engine/streak';
import { NameChip } from './Rating';
import { overallRating } from '../engine/rating';
import { FIRST_TRIO, randomTrio, type Trio } from '../engine/heroTrio';
import { applyUpdate, promptInstall, pwa } from '../pwa';
import { topicProgress } from '../engine/recommend';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { displayNote, pc, type Naming } from '../engine/pitch';
import type { InputMode } from '../engine/session';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import { localDay, namingFor, ratingsOf, type Progress, type Settings } from '../storage/progress';
import { Logo, MicIcon, ModeSwitch, withNote } from './bits';
import { UNLOCK_ALL } from './services';
import { GameIcon } from './Games';
import type { GameKind } from '../game/memoryGame';

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  streak: StreakState;
  onStreak: () => void;
  account: React.ReactNode;
  onPractice: (id: LessonId, consented: boolean) => void;
  onButtonsInstead: (id: LessonId) => void;
  onMode: (m: InputMode) => void;
  onSettings: () => void;
  onLang: (l: 'he' | 'en') => void;
  onGame: (k: GameKind) => void;
  onDuel: () => void;
  onOnline: () => void;
  onGhost: () => void;
  onTrueFalse: () => void;
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
export function lessonStates(progress: Progress): Record<LessonId, NodeState> {
  const out = {} as Record<LessonId, NodeState>;
  let currentSet = false;
  LESSON_ORDER.forEach((id, i) => {
    const done = (progress.lessons[id]?.completions ?? 0) > 0;
    const prevDone = i === 0 || (progress.lessons[LESSON_ORDER[i - 1]]?.completions ?? 0) > 0;
    const placed = progress.placementUnlocks?.includes(id) ?? false;
    if (done) out[id] = 'done';
    else if (prevDone || placed || UNLOCK_ALL) {
      out[id] = currentSet ? 'open' : 'current';
      currentSet = true;
    } else out[id] = 'locked';
  });
  return out;
}

export function nextLessonId(progress: Progress): LessonId {
  const st = lessonStates(progress);
  return LESSON_ORDER.find((id) => st[id] === 'current') ?? LESSON_ORDER[LESSON_ORDER.length - 1];
}

export function starsFor(best: number, total: number) {
  const r = total ? best / total : 0;
  return r >= 1 ? 3 : r >= 0.6 ? 2 : r > 0 ? 1 : 0;
}

const TOTALS: Partial<Record<LessonId, number>> = { 'bflat-two-homes': 3, 'degrees-135': 5, 'major-minor': 5, cadences: 4, 'sing-home-five': 3, intervals: 6, inversions: 5, 'notes-degrees': 6, 'sing-names': 4, 'sing-degrees': 3, 'rhythm-r1': 5, 'rhythm-r2': 5, 'rhythm-r3': 5, runs: 5, 'rhythm-r4': 5, 'rhythm-r5': 5, 'rhythm-r6': 5, 'rhythm-r7': 5, 'rhythm-r8': 5, 'note-sequences': 5, 'jazz-1': 5, songs: 5 };

export function Home({ t, settings, progress, streak, onStreak, account, onPractice, onButtonsInstead, onMode, onGame, onDuel, onOnline, onGhost, onTrueFalse, onVocal, onWorkout, onPlacement, onSkills, playerName, onMenu, news, tools }: Props) {
  const [consentFor, setConsentFor] = useState<LessonId | null>(null);
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const bb = displayNote(pc('Bb'), nm, lang);
  const states = lessonStates(progress);
  const next = nextLessonId(progress);
  const meta = LESSON_META[next];
  const anyDone = LESSON_ORDER.some((id) => states[id] === 'done');
  const doneCount = LESSON_ORDER.filter((id) => states[id] === 'done').length;

  const today = localDay(new Date());
  const todayXp = progress.history.filter((h) => localDay(new Date(h.completedAt)) === today).reduce((a, h) => a + h.xp, 0);
  const goal = Math.min(1, todayXp / DAILY_GOAL_XP);

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
          <Logo />
          <span className="wordmark" dir="ltr">
            Ninth <span className="wordmark-accent">Sense</span>
          </span>
        </div>
        <div className="stats">
          <NameChip t={t} name={playerName} overall={overallRating(ratingsOf(progress))} onClick={onSkills} />
          <StreakChip t={t} st={streak} onOpen={onStreak} />
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
            <button className="btn mega first-run-cta" onClick={() => onPlacement()}>
              {settings.mode === 'voice' && <MicIcon />}
              {t.findLevel}
            </button>
            <button className="link start-from-one" onClick={() => start(next)}>
              {t.startFromLessonOne}
            </button>
          </div>
        </section>
      ) : (
        <>
          <h1 className="sr-only">Ninth Sense — {t.homeToday}</h1>
          {/* Today (product owner): the goal and the day's plan, together, first. */}
          <section className="home-section today" aria-label={t.homeToday}>
            <h2 className="home-h">☀️ {t.homeToday}</h2>
            <div className="goal-strip">
              <GoalRing value={goal} />
              <div className="goal-text">
                <b>{t.dailyGoal}</b>
                <small dir="ltr">
                  {todayXp}/{DAILY_GOAL_XP} {t.xp} · {progress.xp} {t.xp}
                </small>
              </div>
              <div className="goal-done">
                <b>
                  {doneCount}/{LESSON_ORDER.length}
                </b>
                <small>{t.lessonsDone}</small>
              </div>
            </div>
            <WorkoutCard t={t} progress={progress} settings={settings} onOpen={onWorkout} />
          </section>

          {/* Continue: the next lesson on the path, compact (no big banner). */}
          <section className="continue-card" aria-label={t.homeContinue}>
            <span className="continue-icon" aria-hidden="true">
              <NodeIcon kind={meta.icon} />
            </span>
            <div className="continue-text">
              <small className="continue-kicker">{t.homeContinue}</small>
              <b>{withNote(meta.title[lang], bb)}</b>
              <small>{meta.blurb[lang]}</small>
            </div>
            <button className="btn primary continue-go" data-continue="1" onClick={() => start(next)}>
              {settings.mode === 'voice' && <MicIcon />}
              {anyDone ? t.continue : t.practice}
            </button>
          </section>
          <div className="home-mode-row">
            <ModeSwitch mode={settings.mode} onChange={onMode} t={t} />
            <button className="link start-from-one" onClick={() => onPlacement()}>
              🧭 {t.findLevel}
            </button>
          </div>
        </>
      )}

      <section className="path home-section" aria-label={t.lessonPath}>
        <h2 className="home-h">🗺️ {t.lessonPath}</h2>
        <TopicBars t={t} progress={progress} />
        <ol className="path-list">
          {LESSON_ORDER.map((id, i) => {
            const st = states[id];
            const m = LESSON_META[id];
            const best = progress.lessons[id]?.best ?? 0;
            const stars = st === 'done' ? starsFor(best, TOTALS[id] ?? 1) : 0;
            const playable = st !== 'locked';
            return (
              <li key={id} className={`node ${st} ${i % 2 ? 'alt' : ''}`}>
                <button className="node-btn" disabled={!playable} onClick={() => start(id)} aria-label={`${i + 1}. ${m.title[lang].replace('{n}', bb)}`}>
                  <span className="node-disc" aria-hidden="true">
                    <NodeIcon kind={m.icon} />
                    {st === 'locked' && <span className="lock">🔒</span>}
                  </span>
                  <span className="node-text">
                    <b>{withNote(m.title[lang], bb)}</b>
                    <small>
                      {st === 'done' ? (
                        <span className="mini-stars" aria-label={`${stars} ${t.stars}`}>
                          {[0, 1, 2].map((k) => (
                            <span key={k} className={k < stars ? 'won' : ''}>
                              ★
                            </span>
                          ))}
                        </span>
                      ) : st === 'current' ? (
                        <>
                          {t.start} <span className="flip-rtl">→</span>
                        </>
                      ) : st === 'open' ? (
                        t.start
                      ) : (
                        t.locked
                      )}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

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


      <section className="games-row" aria-label={t.games}>
        <h2>{t.games}</h2>
        <p className="field-hint">{t.gamesHint}</p>
        <div className="game-cards">
          {(['melody', 'rhythm'] as const).map((k) => (
            <button key={k} className={`game-card ${k}`} onClick={() => onGame(k)}>
              <GameIcon kind={k} />
              <b>{k === 'melody' ? t.echoChain : t.beatEcho}</b>
              <small>{k === 'melody' ? t.echoChainBlurb : t.beatEchoBlurb}</small>
              {(progress.games?.[k] ?? 0) > 0 && (
                <span className="best-chip">
                  {t.personalBest}: {progress.games?.[k]}
                </span>
              )}
            </button>
          ))}
          <button className="game-card duel" onClick={onDuel}>
            <span className="duel-icon" aria-hidden="true">
              ⚔
            </span>
            <b>{t.duel}</b>
            <small>{t.duelBlurb}</small>
          </button>
          <button className="game-card online" onClick={onOnline}>
            <span className="duel-icon" aria-hidden="true">
              🌐
            </span>
            <b>{t.online}</b>
            <small>{t.onlineBlurb}</small>
          </button>
          <button className="game-card truefalse" onClick={onTrueFalse}>
            <span className="duel-icon" aria-hidden="true">
              ✓✗
            </span>
            <b>{t.trueFalse}</b>
            <small>{t.tfBlurb}</small>
            {!progress.tfBest && <span className="new-chip">{t.newChip}</span>}
          </button>
          <button className="game-card ghost" onClick={onGhost}>
            <span className="duel-icon" aria-hidden="true">
              👻
            </span>
            <b>{t.ghostRace}</b>
            <small>{t.ghostBlurb}</small>
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

function GoalRing({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg className="goal-ring" viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
      <circle cx="26" cy="26" r={r} className="ring-bg" />
      <circle cx="26" cy="26" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 26 26)" />
      <text x="26" y="31" textAnchor="middle" className="ring-text">
        {value >= 1 ? '✓' : `${Math.round(value * 100)}`}
      </text>
    </svg>
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
