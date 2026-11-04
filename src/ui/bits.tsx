// Small shared UI pieces: logo, mode switch, keyboard, permission panel.

import { useEffect, useState, type ReactNode } from 'react';
import type { InputMode } from '../engine/session';
import type { AccessError } from '../game/adapters';
import { ERROR_TITLES, recoverySteps, type Strings } from '../i18n/strings';
import { detectBrowser } from '../speech/errors';
import { piano } from './services';

/** Note/chord symbols stay left-to-right inside Hebrew text. */
export const Note = ({ children }: { children: ReactNode }) => (
  <bdi dir="ltr" className="note-sym">
    {children}
  </bdi>
);
/** Render a template with {n}/{k} placeholders, isolating each note symbol for bidi. */
export function withNote(template: string, note: string, key = '') {
  const parts = template.split(/(\{[nk]\})/);
  return (
    <>
      {parts.map((p, i) =>
        p === '{n}' ? <Note key={i}>{note}</Note> : p === '{k}' ? <Note key={i}>{key}</Note> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

/** Plain-text fill for speech. */
export const fillText = (template: string, note: string, key = '') => template.replaceAll('{n}', note).replaceAll('{k}', key);

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC94D" />
          <stop offset="1" stopColor="#FF6A4D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#lg-a)" />
      {/* turning arrow */}
      <path d="M14 30a18 18 0 0 1 31-12" fill="none" stroke="#2A1747" strokeWidth="5" strokeLinecap="round" />
      <path d="M47 10l-1 10-10-2" fill="none" stroke="#2A1747" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* note */}
      <ellipse cx="29" cy="44" rx="8" ry="6" transform="rotate(-20 29 44)" fill="#2A1747" />
      <path d="M36 42V24l10 4" fill="none" stroke="#2A1747" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ModeSwitch({ mode, onChange, t }: { mode: InputMode; onChange: (m: InputMode) => void; t: Strings }) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label={t.inputMode}>
      {(['voice', 'buttons'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          className={mode === m ? 'on' : ''}
          onClick={() => onChange(m)}
        >
          <span aria-hidden="true">{m === 'voice' ? <MicIcon /> : <TapIcon />}</span>
          {m === 'voice' ? t.voice : t.buttons}
        </button>
      ))}
    </div>
  );
}

export const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" stroke="none" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </svg>
);
export const TapIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="3" y="3" width="8" height="8" rx="2.5" />
    <rect x="13" y="3" width="8" height="8" rx="2.5" opacity=".6" />
    <rect x="3" y="13" width="8" height="8" rx="2.5" opacity=".6" />
    <rect x="13" y="13" width="8" height="8" rx="2.5" />
  </svg>
);

/** Audio-synced mini keyboard: keys light up exactly while they sound. */
export function Keyboard({ low = 48, high = 76, mark }: { low?: number; high?: number; mark?: number }) {
  const [active, setActive] = useState<number[]>([]);
  useEffect(() => piano.onNotes(setActive), []);
  const shown = new Set(active.map((m) => (m < low ? m + 12 * Math.ceil((low - m) / 12) : m)));
  const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  return (
    <div className="keyboard" dir="ltr" aria-hidden="true">
      {whites.map((m, i) => (
        <div key={m} className={`wk ${shown.has(m) ? 'lit' : ''} ${mark === m ? 'mark' : ''}`} style={{ left: `${i * W}%`, width: `${W}%` }} />
      ))}
      {whites.map((m, i) =>
        m + 1 <= high && isBlack(m + 1) ? (
          <div
            key={m + 1}
            className={`bk ${shown.has(m + 1) ? 'lit' : ''} ${mark === m + 1 ? 'mark' : ''}`}
            style={{ left: `${(i + 1) * W - W * 0.32}%`, width: `${W * 0.64}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

export function PermissionPanel({
  error,
  t,
  lang,
  onRetry,
  onButtons,
}: {
  error: AccessError;
  t: Strings;
  lang: 'he' | 'en';
  onRetry: () => void;
  onButtons: () => void;
}) {
  const { browser } = detectBrowser();
  return (
    <div className="perm-panel" role="alert">
      <div className="perm-head">
        <span className="perm-icon" aria-hidden="true">
          <MicIcon />
        </span>
        <div>
          <h2>{ERROR_TITLES[lang][error.code]}</h2>
          <p className="perm-stage">
            {error.stage === 'capture' ? t.stageCapture : t.stageRecognition} · <code dir="ltr">{error.code}</code>
          </p>
        </div>
      </div>
      <ol className="perm-steps">
        {recoverySteps(error.code, lang, browser).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="perm-raw">
        {t.rawError}: <code dir="ltr">{error.raw}</code>
      </p>
      <div className="row">
        <button className="btn primary" onClick={onRetry}>
          {t.retry}
        </button>
        <button className="btn" onClick={onButtons}>
          {t.useButtons}
        </button>
      </div>
      <a className="link" href="#/diagnostics">
        {t.diagnostics} →
      </a>
    </div>
  );
}
