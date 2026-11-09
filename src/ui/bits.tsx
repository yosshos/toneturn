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

/**
 * The brand mark (0.61, logo A redrawn for the v2 language): the ear whose outline with the two dots is a bass clef,
 * a 7 inside it, and a sound wave going in. Ink outline, flat fills, no gradients. `bare` = no tile (in-app header).
 */
const EAR = 'M226 206 C226 132 274 96 318 96 C380 96 420 146 420 208 C420 266 388 290 368 320 C348 350 358 404 304 418 C266 428 242 404 236 378';
const WAVE = 'M240 286 Q220 222 200 286 Q182 338 164 286 Q149 250 134 286 Q122 308 110 286';
const SEVEN = 'M272 186 L356 186 Q370 186 364 200 L312 330';
export function Logo({ size = 44, bare = false, onDark = false }: { size?: number; /** No tile behind it (in-app header). */ bare?: boolean; /** Light outline for dark surfaces. */ onDark?: boolean }) {
  const ink = '#1E1033';
  const edge = onDark ? '#FFFFFF' : ink;
  return (
    <svg width={size} height={size} viewBox={bare ? '60 60 420 420' : '0 0 512 512'} aria-hidden="true" className={`logo-mark ${bare ? 'bare' : ''}`}>
      {!bare && <rect width="512" height="512" rx="116" fill="#6D28D9" />}
      <g transform="translate(256 256) scale(0.86) translate(-306 -256)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="logo-wave w1" d={WAVE} stroke={ink} strokeWidth="44" />
        <path d={WAVE} stroke="#12C9B4" strokeWidth="24" />
        <path d={EAR} stroke={bare ? edge : ink} strokeWidth="80" />
        <path d={EAR} stroke="#FFD43B" strokeWidth="56" />
        <path d={SEVEN} stroke={ink} strokeWidth="40" />
        <path d={SEVEN} stroke="#FFFFFF" strokeWidth="20" />
        <circle cx="306" cy="370" r="20" fill="#FF5FA2" stroke={ink} strokeWidth="9" />
      </g>
      <circle className="logo-spark" cx="430" cy="196" r="26" fill="#FF5FA2" stroke={ink} strokeWidth="9" />
      <circle cx="430" cy="268" r="26" fill="#FF5FA2" stroke={ink} strokeWidth="9" />
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
