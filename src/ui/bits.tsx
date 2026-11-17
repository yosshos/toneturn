// Small shared UI pieces: mode switch, keyboard, permission panel (the logo lives in ./brand/Logo).

import { useEffect, useState, type ReactNode } from 'react';
import type { InputMode } from '../engine/session';
import type { AccessError } from '../game/adapters';
import { ERROR_TITLES, recoverySteps, type Strings } from '../i18n/strings';
import { detectBrowser } from '../speech/errors';
import { piano } from './services';
import { Icon } from './icons';

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

/** The brand mark (owner 2026-11-17: the "Paper" 7-as-a-quaver): ./brand/Logo. */
export { Logo } from './brand/Logo';

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

export const MicIcon = () => <Icon k="mic" size={20} />;
export const TapIcon = () => <Icon k="pads" size={20} />;

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
    <div className="keyboard" dir="ltr" aria-hidden="true" data-lit={shown.size || undefined}>
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
        {t.diagnostics} <Icon k="fwd" />
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
