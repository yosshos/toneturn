// Small shared pieces of Encore (SPEC-PHRASE-STUDIO): the glyph (a note head between repeat signs), the dynamic mark,
// the difficulty badge, the 12-key strip, the map, the confidence dots, the "keep" icon button, Latin isolation.

import type { ReactNode } from 'react';
import type { CellState, MapRow } from '../../engine/encore/phrase';
import { RANKS } from '../../engine/encore/phrase';
import type { Dots } from '../../engine/encore/detect';
import { keyName } from '../../engine/drills/generate';

export type Lang = 'he' | 'en';

/** The Encore glyph: the app's tilted note head inside a repeat sign (𝄆 ● 𝄇). */
export function EncoreGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg className="enc-glyph" viewBox="0 0 28 20" width={size * 1.4} height={size} aria-hidden="true" style={{ direction: 'ltr' }}>
      <path d="M2 3v14M5 3v14" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="12" r="1.2" fill="currentColor" />
      <ellipse cx="14" cy="10" rx="4.2" ry="3" transform="rotate(-20 14 10)" fill="currentColor" />
      <circle cx="20" cy="8" r="1.2" fill="currentColor" />
      <circle cx="20" cy="12" r="1.2" fill="currentColor" />
      <path d="M23 3v14M26 3v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Wrap Latin runs (note names, chord symbols, tempo, numbers with letters) in <bdi dir="ltr"> inside Hebrew text. */
export function Bi({ text }: { text: string }): ReactNode {
  const parts = text.split(/([A-Za-z♯♭#][A-Za-z0-9♯♭#–\-/.]*(?:\s[A-Za-z0-9♯♭#–\-/.]+)*|[♩♪]\s?\d+(?:\s?[→–-]\s?[♩♪]?\s?\d+)?)/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <bdi key={i} dir="ltr">
            {p}
          </bdi>
        ) : (
          p
        ),
      )}
    </>
  );
}
export const T = (x: string | { en: string; he: string }, lang: Lang) => (typeof x === 'string' ? x : x[lang]);

/** A key name in the app's spelling (flat keys flat), always isolated. */
export const kName = (k: number, minor = false) => keyName(((k % 12) + 12) % 12, minor).replace('b', '♭').replace('#', '♯') + (minor ? 'm' : '');
export function KeyB({ k, minor = false }: { k: number; minor?: boolean }) {
  return <bdi dir="ltr">{kName(k, minor)}</bdi>;
}
export function Tempo({ bpm }: { bpm: number | string }) {
  return (
    <bdi dir="ltr" className="tempo-iso">
      ♩{bpm}
    </bdi>
  );
}

/** The rank as the dynamics motif (levels are dynamics). Rank 0 is a dash ("sketch"). */
export function Dyn({ rank, size }: { rank: number; size?: number }) {
  return (
    <span className="dyn enc-dyn" style={size ? { fontSize: size } : undefined} aria-hidden="true" data-rank={rank}>
      {RANKS[Math.max(0, Math.min(6, rank))]}
    </span>
  );
}

/** The confidence mark ●●● / ●●○ / ●○○. */
export function Conf({ d }: { d: Dots }) {
  return (
    <span className="enc-conf" aria-label={`${d}/3`} data-conf={d}>
      {'●'.repeat(d)}
      {'○'.repeat(3 - d)}
    </span>
  );
}

/** The outlined difficulty chip: "grade 7 · 1330" (no colour coding by difficulty). */
export function DiffBadge({ grade, D, lang }: { grade: number; D: number; lang: Lang }) {
  return (
    <span className="enc-bdg" data-diff={D}>
      {lang === 'he' ? 'דרגה' : 'Grade'} <b>{grade}</b> <small dir="ltr">{D}</small>
    </span>
  );
}

/** 12 small cells: passed (filled) / in progress (outline lemon) / not yet. Never "full" below all 12. */
export function KeyStrip({ passed, current, n = 12 }: { passed: number; current?: boolean; n?: number }) {
  return (
    <span className="enc-strip" aria-label={`${passed}/${n}`} data-strip={passed}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < passed ? 'd' : i === passed && current ? 'c' : ''} />
      ))}
    </span>
  );
}

/** The phrase's 12-key × tempo map (§8.4): a column per key (plan order), a row per stage. */
export function KeyMap({ keys, rows, cells, lang, minor = false, due = [] }: { keys: number[]; rows: MapRow[]; cells: CellState[][]; lang: Lang; minor?: boolean; due?: number[] }) {
  const label = (r: MapRow) => (r.id === 'free' ? (lang === 'he' ? 'חופשי' : 'free') : r.id === 'quarters' ? (lang === 'he' ? 'רבעים' : '1/4') : `♩${r.id}`);
  return (
    <table className="enc-map" dir="ltr" data-map-keys={keys.length}>
      <thead>
        <tr>
          <th scope="col" />
          {keys.map((k) => (
            <th key={k} scope="col" className="k">
              <KeyB k={k} minor={minor} />
              {due.includes(k) && <i className="enc-due" aria-label={lang === 'he' ? 'לחזרה' : 'due'} />}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r, ri) => {
          const j = rows.length - 1 - ri;
          return (
            <tr key={String(r.id)}>
              <th scope="row" className="r">
                {r.id === 'free' || r.id === 'quarters' ? label(r) : <bdi dir="ltr">{label(r)}</bdi>}
              </th>
              {keys.map((k, ki) => (
                <td key={k} className={`c ${cells[ki][j]}`} data-cell={`${k}:${j}:${cells[ki][j]}`} />
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** "Keep this phrase": a small icon button for any take review (one tap, never pushes the review past one screen). */
export function KeepButton({ lang, onKeep, wide = false }: { lang: Lang; onKeep: () => void; wide?: boolean }) {
  const t = lang === 'he' ? 'לשמור משפט' : 'Keep phrase';
  return (
    <button type="button" className={`btn ghost enc-keep ${wide ? 'wide' : ''}`} onClick={onKeep} aria-label={t} title={t} data-keep-phrase="1">
      <EncoreGlyph size={14} />
      <span className="enc-keep-t">{t}</span>
    </button>
  );
}

/** A segmented control. */
export function Seg<K extends string>({ value, options, onChange, label }: { value: K; options: { k: K; t: ReactNode }[]; onChange: (k: K) => void; label: string }) {
  return (
    <div className="enc-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} className={value === o.k ? 'on' : ''} onClick={() => onChange(o.k)} data-seg={o.k}>
          {o.t}
        </button>
      ))}
    </div>
  );
}
