import { useState } from 'react';
import type { InputMode } from '../engine/session';
import type { Strings } from '../i18n/strings';
import type { Progress, Settings } from '../storage/progress';
import { Logo, MicIcon, ModeSwitch, withNote } from './bits';
import { displayNote, pc } from '../engine/pitch';
import { namingFor } from '../storage/progress';

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  streak: number;
  onPractice: (consented: boolean) => void;
  onButtonsInstead: () => void;
  onMode: (m: InputMode) => void;
  onSettings: () => void;
  onLang: (l: 'he' | 'en') => void;
}

export function Home({ t, settings, progress, streak, onPractice, onButtonsInstead, onMode, onSettings, onLang }: Props) {
  const nm = namingFor(settings.naming, settings.uiLang);
  const bb = displayNote(pc('Bb'), nm, settings.uiLang);
  const eb = displayNote(pc('Eb'), nm, settings.uiLang);
  const [consent, setConsent] = useState(false);
  const done1 = (progress.lessons['bflat-two-homes']?.completions ?? 0) > 0;

  const practice = () => {
    if (settings.mode === 'voice' && !settings.voiceConsent) return setConsent(true);
    onPractice(false);
  };

  const nodes = [
    { id: 1, title: withNote(t.lesson1Title, bb), state: done1 ? 'done' : 'current', icon: 'ear' },
    { id: 2, title: t.lesson2Title, state: done1 ? 'next' : 'locked', icon: 'mic' },
    { id: 3, title: t.lesson3Title, state: 'locked', icon: 'note' },
    { id: 4, title: t.lesson4Title, state: 'locked', icon: 'cadence' },
  ] as const;

  return (
    <main className="home">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="wordmark">ToneTurn</span>
        </div>
        <div className="stats">
          <button
            className="chip lang-toggle"
            onClick={() => onLang(settings.uiLang === 'he' ? 'en' : 'he')}
            aria-label={settings.uiLang === 'he' ? 'Switch to English' : 'החלפה לעברית'}
          >
            {settings.uiLang === 'he' ? 'EN' : 'עב'}
          </button>
          <span className="chip xp" title={t.xp}>
            <b>{progress.xp}</b> {t.xp}
          </span>
          <span className="chip streak" title={t.streak}>
            <span aria-hidden="true">🔥</span> <b>{streak}</b>
            <span className="sr-only"> {t.streak}</span>
          </span>
          <button className="icon-btn" onClick={onSettings} aria-label={t.settings}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm9 3.5-.02-.6 2-1.6-2-3.4-2.4.9a8 8 0 0 0-1-.6L17 3.8h-4l-.6 2.5a8 8 0 0 0-1 .6L9 6l-2 3.4 2 1.6a8 8 0 0 0 0 1.2l-2 1.6L9 17l2.4-.9c.3.2.7.4 1 .6l.6 2.5h4l.6-2.5c.3-.2.7-.4 1-.6l2.4.9 2-3.4-2-1.6.02-.6Z" transform="translate(-3 0)" />
            </svg>
          </button>
        </div>
      </header>

      <section className="hero">
        <HeroArt bb={bb} eb={eb} />
        <div className="hero-copy">
          <p className="tagline">{t.appTagline}</p>
          <h1>{withNote(t.lesson1Title, bb)}</h1>
          <p className="blurb">{t.lesson1Blurb}</p>
          <ModeSwitch mode={settings.mode} onChange={onMode} t={t} />
          <button className="btn mega" onClick={practice}>
            {settings.mode === 'voice' && <MicIcon />}
            {done1 ? t.continue : t.practice}
          </button>
        </div>
      </section>

      <section className="path" aria-label={t.lessonPath}>
        <h2>{t.lessonPath}</h2>
        <ol className="path-list">
          {nodes.map((n, i) => (
            <li key={n.id} className={`node ${n.state}`} style={{ ['--i' as string]: i }}>
              <span className="node-disc" aria-hidden="true">
                <NodeIcon kind={n.icon} />
              </span>
              <span className="node-text">
                <b>{n.title}</b>
                <small>
                  {n.state === 'current' ? t.practice : n.state === 'done' ? '✓' : n.state === 'next' ? `${t.nextUnlock} · ${t.comingSoon}` : t.locked}
                </small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="home-foot">
        <a className="link" href="#/diagnostics">
          {t.diagnostics}
        </a>
      </footer>

      {consent && (
        <div className="sheet-backdrop" onClick={() => setConsent(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="consent-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="consent-title">
              <MicIcon /> {t.consentTitle}
            </h2>
            <p>{t.consentBody}</p>
            <button className="btn mega" autoFocus onClick={() => onPractice(true)}>
              {t.consentAllow}
            </button>
            <button className="btn ghost" onClick={onButtonsInstead}>
              {t.consentButtons}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function NodeIcon({ kind }: { kind: 'ear' | 'mic' | 'note' | 'cadence' }) {
  switch (kind) {
    case 'ear':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M10 13a7 7 0 1 1 13 3.5c-1.5 2.5-4 3.5-4 6.5a3.5 3.5 0 0 1-6.5 1.5" />
          <path d="M14 13.5a3 3 0 1 1 5 2" />
        </svg>
      );
    case 'mic':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <rect x="12" y="4" width="8" height="15" rx="4" fill="currentColor" />
          <path d="M8 15a8 8 0 0 0 16 0M16 23v5" />
        </svg>
      );
    case 'note':
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <ellipse cx="11" cy="23" rx="6" ry="4.5" transform="rotate(-20 11 23)" />
          <path d="M16 22V5l9 3v4l-6-2v12z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor">
          <rect x="4" y="16" width="5" height="12" rx="2" />
          <rect x="11" y="10" width="5" height="18" rx="2" />
          <rect x="18" y="5" width="5" height="23" rx="2" />
          <rect x="25" y="16" width="4" height="12" rx="2" opacity=".7" />
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
      {/* two houses */}
      <g className="house left">
        <path d="M40 120l40-34 40 34v50H40z" fill="#4BE3B5" />
        <rect x="68" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="80" y="112" textAnchor="middle" className="house-label" direction="ltr">{bb}</text>
      </g>
      <g className="house right">
        <path d="M240 120l40-34 40 34v50h-80z" fill="#A98BFF" />
        <rect x="268" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="280" y="112" textAnchor="middle" className="house-label" direction="ltr">{eb}</text>
      </g>
      {/* arcs */}
      <path d="M95 84Q180 10 265 84" fill="none" stroke="#FFC94D" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" className="arc" />
      {/* floating B♭ */}
      <g className="float-coin">
        <circle cx="180" cy="62" r="30" fill="url(#coin)" stroke="#2A1747" strokeWidth="4" />
        <text x="180" y="73" textAnchor="middle" className={`coin-label ${bb.length > 3 ? 'small' : ''}`} direction="ltr">{bb}</text>
        <text x="132" y="54" className="deg-badge" direction="ltr">1</text>
        <text x="220" y="54" className="deg-badge" direction="ltr">5</text>
      </g>
      {/* piano horizon */}
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
