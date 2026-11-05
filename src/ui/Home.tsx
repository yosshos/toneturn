import { useState } from 'react';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { displayNote, pc } from '../engine/pitch';
import type { InputMode } from '../engine/session';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import { localDay, namingFor, type Progress, type Settings } from '../storage/progress';
import { Logo, MicIcon, ModeSwitch, withNote } from './bits';
import { UNLOCK_ALL } from './services';
import { GameIcon } from './Games';
import type { GameKind } from '../game/memoryGame';

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  streak: number;
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
    if (done) out[id] = 'done';
    else if (prevDone || UNLOCK_ALL) {
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

export function Home({ t, settings, progress, streak, account, onPractice, onButtonsInstead, onMode, onSettings, onLang, onGame, onDuel, onOnline, onGhost, onMenu, updateReady, news, tools }: Props) {
  const [consentFor, setConsentFor] = useState<LessonId | null>(null);
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const bb = displayNote(pc('Bb'), nm, lang);
  const eb = displayNote(pc('Eb'), nm, lang);
  const states = lessonStates(progress);
  const next = nextLessonId(progress);
  const meta = LESSON_META[next];
  const anyDone = LESSON_ORDER.some((id) => states[id] === 'done');
  const doneCount = LESSON_ORDER.filter((id) => states[id] === 'done').length;

  const today = localDay(new Date());
  const todayXp = progress.history.filter((h) => localDay(new Date(h.completedAt)) === today).reduce((a, h) => a + h.xp, 0);
  const goal = Math.min(1, todayXp / DAILY_GOAL_XP);

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
          <button
            className="chip lang-toggle"
            onClick={() => onLang(lang === 'he' ? 'en' : 'he')}
            aria-label={lang === 'he' ? 'Switch to English' : 'החלפה לעברית'}
          >
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <span className="chip streak" title={t.streak}>
            <span aria-hidden="true">🔥</span> <b>{streak}</b>
            <span className="sr-only"> {t.streak}</span>
          </span>
          <button className="icon-btn menu-btn" onClick={onMenu} aria-label={updateReady ? `${t.menu} · ${t.updateReady}` : t.menu}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            {updateReady && <span className="badge-dot" aria-hidden="true" />}
          </button>
          <button className="icon-btn" onClick={onSettings} aria-label={t.settings}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
        </div>
      </header>

      {news}

      <section className="goal-strip" aria-label={t.dailyGoal}>
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
      </section>

      <section className="hero">
        <HeroArt bb={bb} eb={eb} />
        <div className="hero-copy">
          <p className="tagline">{t.appTagline}</p>
          <h1>{withNote(meta.title[lang], bb)}</h1>
          <p className="blurb">{meta.blurb[lang]}</p>
          <ModeSwitch mode={settings.mode} onChange={onMode} t={t} />
          <button className="btn mega" onClick={() => start(next)}>
            {settings.mode === 'voice' && <MicIcon />}
            {anyDone ? t.continue : t.practice}
          </button>
        </div>
      </section>

      <section className="path" aria-label={t.lessonPath}>
        <h2>{t.lessonPath}</h2>
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

      {tools}

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
function HeroArt({ bb, eb }: { bb: string; eb: string }) {
  return (
    <svg className="hero-art" viewBox="0 0 360 220" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#FFC94D" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFC94D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#FF8A4D" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="90" r="120" fill="url(#glow)" />
      <g className="sparkles">
        <circle cx="40" cy="40" r="2.5" fill="#FFF6EA" />
        <circle cx="320" cy="30" r="2" fill="#FFF6EA" />
        <circle cx="300" cy="70" r="1.6" fill="#FFC94D" />
        <circle cx="70" cy="80" r="1.6" fill="#A98BFF" />
      </g>
      <g className="house left">
        <path d="M40 120l40-34 40 34v50H40z" fill="#4BE3B5" />
        <rect x="68" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="80" y="112" textAnchor="middle" className="house-label" direction="ltr">
          {bb}
        </text>
      </g>
      <g className="house right">
        <path d="M240 120l40-34 40 34v50h-80z" fill="#A98BFF" />
        <rect x="268" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="280" y="112" textAnchor="middle" className="house-label" direction="ltr">
          {eb}
        </text>
      </g>
      <path d="M95 84Q180 10 265 84" fill="none" stroke="#FFC94D" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" className="arc" />
      <g className="float-coin">
        <circle cx="180" cy="62" r="30" fill="url(#coin)" stroke="#2A1747" strokeWidth="4" />
        <text x="180" y="73" textAnchor="middle" className={`coin-label ${bb.length > 3 ? 'small' : ''}`} direction="ltr">
          {bb}
        </text>
        <text x="132" y="54" className="deg-badge" direction="ltr">
          1
        </text>
        <text x="220" y="54" className="deg-badge" direction="ltr">
          5
        </text>
      </g>
      <g transform="translate(0 176)">
        {Array.from({ length: 15 }).map((_, i) => (
          <rect key={i} x={i * 24} y="0" width="23" height="44" rx="3" fill="#FFF6EA" />
        ))}
        {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14].map((i) => (
          <rect key={`b${i}`} x={i * 24 + 16} y="0" width="14" height="26" rx="2" fill="#1E1236" />
        ))}
      </g>
    </svg>
  );
}
