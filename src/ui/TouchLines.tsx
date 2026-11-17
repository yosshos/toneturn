// MEASUREMENT-AUDIT: the touch lines of a take (touch.ts) — one short line per point, a filled dot or a ring, and a "Why?" expander
// on the misses only. Shown in the review's "Why?" sheet (the card itself keeps the one worst line) and under a piece.
import { useState } from 'react';
import type { TouchLine, TouchReport } from '../engine/drills/types';
import { MT } from '../i18n/measureText';
import { isoTempo } from './TakeReview';
import '../measure.css';

type Lang = 'he' | 'en';

function Line({ l, lang }: { l: TouchLine; lang: Lang }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`tl-line ${l.ok ? 'ok' : 'miss'}`} data-touch={l.id} data-touch-ok={l.ok ? '1' : '0'}>
      <i className="tl-mark" aria-hidden="true" />
      <span className="tl-text" dir="auto">
        {isoTempo(l.text[lang])}
      </span>
      {!l.ok && l.why && (
        <button className="link tl-why" onClick={() => setOpen((x) => !x)} aria-expanded={open} data-touch-why={l.id}>
          {MT.why[lang]}
        </button>
      )}
      {open && l.why && (
        <small className="tl-why-text" dir="auto">
          {l.why[lang]}
        </small>
      )}
    </li>
  );
}

/** The touch lines, misses first; `max` keeps it short (one screen). */
export function TouchLines({ t, lang, max = 6, missesOnly = false }: { t: TouchReport | undefined; lang: Lang; max?: number; missesOnly?: boolean }) {
  if (!t?.lines.length) return null;
  const seen = new Set<string>();
  const ls = [...t.lines]
    .sort((a, b) => Number(a.ok) - Number(b.ok))
    .filter((l) => (missesOnly ? !l.ok : true))
    .filter((l) => !seen.has(l.text.en) && !!seen.add(l.text.en))
    .slice(0, max);
  if (!ls.length) return null;
  return (
    <section className="touch-lines" data-touch-lines={ls.length}>
      <h3>{MT.touchHead[lang]}</h3>
      <ul>
        {ls.map((l) => (
          <Line key={`${l.id}:${l.text.en}`} l={l} lang={lang} />
        ))}
      </ul>
    </section>
  );
}
