// A rhythm on a circle of n pulses (Toussaint's drawing of a Euclidean rhythm): pulse 1 at the top, clockwise; the hits
// joined into a shape. Used by the euclid-rhythms topic (a drawing, choices drawn as circles, tap-the-slots building)
// and the Euclid game (the looping circle with its now-cue). Flat tonal fills, no outlines. Styles: src/euclid.css.

import '../euclid.css';
import { useState } from 'react';
import { necklaceKey, patternFrom } from '../engine/euclid';

export type SlotMark = 'hit' | 'miss' | 'extra' | undefined;
const R = 37;
const pos = (i: number, n: number, r = R): [number, number] => {
  const a = (-90 + (360 * i) / n) * (Math.PI / 180);
  return [Math.round(r * Math.cos(a) * 100) / 100, Math.round(r * Math.sin(a) * 100) / 100];
};

export function RhythmCircle({ n, pattern, size = 120, now = -1, onToggle, marks, ghost, label, disabled }: { n: number; pattern?: string; size?: number; /** The pulse sounding now (−1 none). */ now?: number; onToggle?: (i: number) => void; marks?: SlotMark[]; /** The target, drawn faintly under the pattern (a result). */ ghost?: string; label?: string; disabled?: boolean }) {
  const p = pattern ?? '.'.repeat(n);
  const on = [...p].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
  const shape = (xs: number[]) => xs.map((i) => pos(i, n).join(',')).join(' ');
  const g = ghost ? [...ghost].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0) : [];
  const big = n > 12 ? 5.4 : 6.6;
  return (
    <svg className={`rc ${onToggle ? 'rc-live' : ''}`} viewBox="-50 -50 100 100" width={size} height={size} role={onToggle ? 'group' : 'img'} aria-label={label ?? p} data-rc={p}>
      <circle className="rc-sheet" cx={0} cy={0} r={47} />
      <circle className="rc-ring" cx={0} cy={0} r={R} />
      {g.length >= 3 && <polygon className="rc-ghost" points={shape(g)} />}
      {on.length >= 3 && <polygon className="rc-shape" points={shape(on)} />}
      {on.length === 2 && <polyline className="rc-line" points={shape(on)} />}
      <path className="rc-start" d="M0 -48.5 L-3.6 -43.5 L3.6 -43.5 Z" />
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pos(i, n);
        const hit = p[i] === 'x';
        const cls = ['rc-slot', hit ? 'on' : '', g.includes(i) && !hit ? 'want' : '', marks?.[i] ?? ''].join(' ');
        return (
          <g key={i}>
            {i === now && <circle className="rc-now" cx={x} cy={y} r={big + 4.5} />}
            <circle className={cls} cx={x} cy={y} r={hit ? big : g.includes(i) ? big - 1.5 : 3} data-slot={i} />
            {onToggle && (
              <circle
                className="rc-hit"
                cx={x}
                cy={y}
                r={n > 12 ? 7.5 : 9.5}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={hit}
                aria-label={String(i + 1)}
                data-rc-slot={i}
                onClick={() => !disabled && onToggle(i)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onToggle(i);
                  }
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Tap the slots, then Check: sends the pattern (its necklace key when any starting point counts). */
export function CycleBuild({ n, lang, disabled, anyRotation, result, onSubmit }: { n: number; lang: 'en' | 'he'; disabled: boolean; anyRotation?: boolean; /** After the answer: the right pattern. */ result?: string | null; onSubmit: (key: string) => void }) {
  const [slots, setSlots] = useState<number[]>([]);
  const p = patternFrom(n, slots);
  const toggle = (i: number) => setSlots((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  // the right pattern turned to the rotation closest to what was tapped (any starting point counts)
  let ghost = result ?? undefined;
  if (result && anyRotation) {
    let best = -1;
    for (let r = 0; r < n; r++) {
      const q = result.slice(r) + result.slice(0, r);
      const s = [...q].filter((c, i) => c === 'x' && p[i] === 'x').length;
      if (s > best) {
        best = s;
        ghost = q;
      }
    }
  }
  return (
    <div className="rc-build" data-cycle-build={n}>
      <RhythmCircle n={n} pattern={p} size={196} onToggle={result ? undefined : toggle} disabled={disabled} ghost={ghost} />
      {!result && (
        <button type="button" className="btn primary rc-check" disabled={disabled || !slots.length} onClick={() => onSubmit(anyRotation ? necklaceKey(p) : p)} data-cycle-check="1">
          {lang === 'he' ? 'לבדוק' : 'Check'}
          <small dir="ltr"> · {slots.length}</small>
        </button>
      )}
    </div>
  );
}
