// Small shared UI pieces: logo, mode switch, keyboard, permission panel.

import { useEffect, useId, useState, type ReactNode } from 'react';
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

/** Ninth Sense mark: a 9 that is also an ear (tail = lobe), a note head in the bowl, sound waves coming in. */
/** The brand mark (0.37): a mint "9" whose stem ends in a gold note head, with sound arriving from the left. */
export function Logo({ size = 44, bare = false }: { size?: number; /** No tile behind it (in-app header). */ bare?: boolean }) {
  const id = useId().replace(/:/g, '');
  const u = (k: string) => `url(#${k}${id})`;
  return (
    <svg width={size} height={size} viewBox={bare ? '60 60 420 420' : '0 0 512 512'} aria-hidden="true" className={`logo-mark ${bare ? 'bare' : ''}`}>
      <defs>
        <radialGradient id={`bg${id}`} cx="0.5" cy="0" r="1.1">
          <stop offset="0" stopColor="#3B2F96" />
          <stop offset="0.55" stopColor="#16173A" />
          <stop offset="1" stopColor="#0F1020" />
        </radialGradient>
        <linearGradient id={`nine${id}`} gradientUnits="userSpaceOnUse" x1="220" y1="100" x2="420" y2="420">
          <stop offset="0" stopColor="#9DF9D4" />
          <stop offset="0.45" stopColor="#5CF2B5" />
          <stop offset="1" stopColor="#3FC7E0" />
        </linearGradient>
        <radialGradient id={`gold${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFF1B8" />
          <stop offset="0.5" stopColor="#FFC94D" />
          <stop offset="1" stopColor="#F08A2C" />
        </radialGradient>
        <linearGradient id={`a1${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8FC4" />
          <stop offset="1" stopColor="#FF6FB1" />
        </linearGradient>
        <linearGradient id={`a2${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C59BFF" />
          <stop offset="1" stopColor="#8E6BFF" />
        </linearGradient>
      </defs>
      {!bare && <rect width="512" height="512" rx="116" fill={u('bg')} />}
      <g transform="translate(-16 4)">
        <path className="logo-wave w2" d="M 94 132 A 150 150 0 0 0 94 280" fill="none" stroke={u('a2')} strokeWidth="24" strokeLinecap="round" opacity="0.7" />
        <path className="logo-wave w1" d="M 150 158 A 100 100 0 0 0 150 254" fill="none" stroke={u('a1')} strokeWidth="24" strokeLinecap="round" />
        <circle cx="296" cy="206" r="90" fill="none" stroke={u('nine')} strokeWidth="62" />
        <path d="M 386 206 V 392" fill="none" stroke={u('nine')} strokeWidth="62" strokeLinecap="round" />
        <ellipse cx="342" cy="410" rx="64" ry="46" transform="rotate(-24 342 410)" fill={u('gold')} />
        <ellipse cx="322" cy="396" rx="18" ry="9" transform="rotate(-24 322 396)" fill="#FFFFFF" opacity="0.55" />
        <circle cx="296" cy="206" r="30" fill={u('gold')} />
        <circle cx="286" cy="196" r="9" fill="#FFFFFF" opacity="0.75" />
        <path className="logo-spark" d="M 432 82 l 9 25 25 9 -25 9 -9 25 -9 -25 -25 -9 25 -9 z" fill="#FFC94D" />
      </g>
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
/** Piano strip. `live` = light the keys that sound; off while the sound IS the question (see keysGiveAway). */
export function Keyboard({
  low = 48,
  high = 76,
  mark,
  live = true,
  aid,
}: {
  low?: number;
  high?: number;
  mark?: number;
  live?: boolean;
  /** Visual aid while answering (spec M.3): keys outlined, optional labels, tonic highlighted. */
  aid?: { notes: number[]; labels?: string[]; tonic?: number };
}) {
  const [active, setActive] = useState<number[]>([]);
  useEffect(() => piano.onNotes(setActive), []);
  const shown = new Set(live ? active.map((m) => (m < low ? m + 12 * Math.ceil((low - m) / 12) : m)) : []);
  const aidSet = new Set(aid?.notes ?? []);
  const aidLabel = new Map((aid?.labels ?? []).map((l, i) => [aid!.notes[i], l] as const));
  const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  return (
    <div className="keyboard" dir="ltr" aria-hidden="true">
      {whites.map((m, i) => (
        <div key={m} className={`wk ${shown.has(m) ? 'lit' : ''} ${mark === m ? 'mark' : ''} ${aidSet.has(m) ? 'aid' : ''} ${aid?.tonic === m ? 'aid-tonic' : ''}`} style={{ left: `${i * W}%`, width: `${W}%` }}>
          {aidLabel.get(m) && <span className="key-label">{aidLabel.get(m)}</span>}
        </div>
      ))}
      {whites.map((m, i) =>
        m + 1 <= high && isBlack(m + 1) ? (
          <div
            key={m + 1}
            className={`bk ${shown.has(m + 1) ? 'lit' : ''} ${mark === m + 1 ? 'mark' : ''} ${aidSet.has(m + 1) ? 'aid' : ''} ${aid?.tonic === m + 1 ? 'aid-tonic' : ''}`}
            style={{ left: `${(i + 1) * W - W * 0.32}%`, width: `${W * 0.64}%` }}
          >
            {aidLabel.get(m + 1) && <span className="key-label">{aidLabel.get(m + 1)}</span>}
          </div>
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

/** Celebration burst on a correct answer (pure CSS; disabled by reduced motion). */
export function Burst({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} style={{ ['--a' as string]: `${(i / 14) * 360}deg`, ['--d' as string]: `${60 + (i % 3) * 22}px` }} />
      ))}
    </div>
  );
}
