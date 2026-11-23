// The chord chart, "דף אקורדים" (COURSE-FEEDBACK-UI §4.7, slice 8): one shared view for the chart-only drills, the ear
// and rule-card cards, the chords over a song's staff, the reharm studio and the chart player. Always four bars a row
// (72 px cells on a phone), chord symbols in <bdi> (LTR inside a Hebrew page), one slash a beat in faint ink, 2.5 px
// ink bar lines. The bar being played: a lemon strip on top with an ink edge, and a lemon underline that fills across
// the bar in time (where you are inside the bar). A loop selection is lilac hatching, never lemon. After a take: a
// corner tab per bar (teal ✓ kept, pink with the numbers of the rules broken there) and, for target rules, the note
// landed on under the chord. A reharmonised bar: a purple corner tab. While a rule-card take runs: a 6 px dot per note
// played under the bar (ink = chord tone, lilac = tension, dashed = outside). With `onBar` every bar is a button.

import type { ChartCell } from '../engine/drills/chartCells';
import { prettyChord } from '../engine/drills/chartCells';

type Lang = 'he' | 'en';

/** A chord symbol as a lead sheet sets it: the root large, the quality smaller beside it (Cmaj7 fits a 60 px cell). */
function Symbol({ c }: { c: string }) {
  const p = prettyChord(c);
  const m = /^([A-G][♭♯]?)(.*)$/.exec(p);
  if (!m || !m[2]) return <>{p}</>;
  return (
    <>
      {m[1]}
      <span className="cc-q">{m[2]}</span>
    </>
  );
}

const ROLE_NAME: Record<Lang, Record<'chord' | 'tension' | 'outside', string>> = {
  en: { chord: 'chord tone', tension: 'tension', outside: 'outside' },
  he: { chord: 'צליל אקורד', tension: 'טנשן', outside: 'מחוץ' },
};

export function ChordChart({ cells, meter, beat = -1, first = 0, maxRows = 4, size = 'full', loop, lang, attrs, onBar, sel, page = false }: {
  /** Turn whole pages (maxRows rows at a time) by the playhead instead of sliding row by row (a long lead sheet on a phone: 8 bars a page). */
  page?: boolean;
  cells: ChartCell[];
  meter: number;
  /** The running take's beat (−1 idle), from the chart's first bar. */
  beat?: number;
  /** The bar number of the first cell (a window into a longer chart). */
  first?: number;
  /** At most this many rows; a longer chart shows the rows around the bar being played. */
  maxRows?: number;
  /** compact: the chords over a staff (shorter cells, no slashes). */
  size?: 'full' | 'compact';
  /** Bars (cell indices) picked for a loop. */
  loop?: [number, number] | null;
  lang: Lang;
  /** Extra data-* attributes on the root (older hooks: data-chart-only, data-ear-card bars). */
  attrs?: Record<string, string | number | undefined>;
  /** Every bar is a button (cell index): the reharm studio's devices, the chart player's bar scale. */
  onBar?: (i: number) => void;
  /** The bar (cell index) whose sheet is open: an ink outline. */
  sel?: number | null;
}) {
  const he = lang === 'he';
  const curF = beat >= 0 ? beat / Math.max(1, meter) : -1;
  const cur = curF >= 0 ? Math.floor(curF + 1e-6) : -1;
  const progress = curF >= 0 ? Math.min(1, Math.max(0, curF - cur)) : 0;
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += 4) rows.push(Array.from({ length: Math.min(4, cells.length - i) }, (_, k) => i + k));
  // The row being played stays in the top part with the next row in view.
  const curRow = cur >= 0 ? Math.floor(cur / 4) : 0;
  const start = page ? Math.floor(curRow / Math.max(1, maxRows)) * Math.max(1, maxRows) : Math.max(0, Math.min(rows.length - maxRows, curRow - (maxRows > 2 ? 1 : 0)));
  const slashes = Math.min(meter, 7);
  return (
    <div className={`chord-chart ${size} ${onBar ? 'tappable' : ''}`} dir="ltr" role="group" aria-label={he ? 'דף אקורדים' : 'Chord chart'} data-chord-chart={cells.length} {...attrs}>
      {rows.slice(start, start + maxRows).map((r, ri) => (
        <ol key={start + ri} className="cc-row">
          {r.map((i) => {
            const c = cells[i];
            const now = i === cur;
            const inLoop = !!loop && i >= loop[0] && i <= loop[1];
            const chords = c.chord ? c.chord.split(/\s+/).filter(Boolean) : [];
            const label = `${c.chord ? chords.map(prettyChord).join(' ') : c.chord === undefined ? '' : '%'} · ${he ? 'תיבה' : 'bar'} ${first + i + 1}${c.role === 'band' ? (he ? ', הקשבה' : ', listen') : ''}${c.tab ? (c.tab.kind === 'ok' ? (he ? ', נשמר' : ', kept') : c.tab.kind === 'changed' ? (he ? ', שונה' : ', changed') : he ? ', נשבר' : ', broken') : ''}${c.lick === 'found' ? (he ? ', ליק שלכם' : ', a lick of yours') : c.lick === 'fits' ? (he ? ', כאן הליק של היום מתאים' : ", today's lick fits here") : ''}`;
            const tap = onBar
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': sel === i ? true : undefined,
                  onClick: () => onBar(i),
                  onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onBar(i)),
                }
              : {};
            return (
              <li key={i} className={`cc-bar ${now ? 'now' : ''} ${inLoop ? 'loop' : ''} ${sel === i ? 'sel' : ''} ${chords.length > 1 ? 'multi' : ''} ${c.role ?? ''}`} data-bar={first + i} aria-label={label} aria-current={now ? 'true' : undefined} {...tap}>
                {c.tab && (
                  <span className={`cc-tab ${c.tab.kind}`} aria-hidden="true" data-tab={c.tab.kind}>
                    {c.tab.kind === 'ok' ? '✓' : c.tab.kind === 'changed' ? '' : c.tab.rules.join('·') || '✕'}
                  </span>
                )}
                {c.chord !== undefined && (
                  <bdi className="cc-chord" dir="ltr">
                    {c.chord
                      ? chords.map((x, k) => (
                          <span key={k} className="cc-one">
                            <Symbol c={x} />
                          </span>
                        ))
                      : '%'}
                  </bdi>
                )}
                {size === 'full' && !c.landed && !c.target && !c.role && !c.note && !c.dots?.length && <span className="cc-slash" aria-hidden="true">{'/ '.repeat(slashes).trim()}</span>}
                {c.landed !== undefined ? (
                  <small className={`cc-sub ${c.landed ? (c.landed.hit ? 'hit' : 'miss') : 'rest'}`}>{c.landed ? <bdi dir="ltr">{c.landed.name}</bdi> : '—'}</small>
                ) : c.target ? (
                  <small className="cc-sub target">
                    <bdi dir="ltr">→ {c.target}</bdi>
                  </small>
                ) : c.role ? (
                  <small className="cc-sub role">{c.role === 'band' ? (he ? 'הקשבה' : 'Listen') : he ? 'אתם' : 'You'}</small>
                ) : c.note ? (
                  <small className={`cc-sub ${c.noteSet ? 'set' : ''}`}>{c.note}</small>
                ) : null}
                {c.lick && <i className={`cc-lick ${c.lick}`} aria-hidden="true" data-lick-mark={c.lick} />}
                {c.dots && c.dots.length > 0 && (
                  <span className="cc-dots" data-dots={c.dots.join(' ')} aria-label={c.dots.map((d) => ROLE_NAME[lang][d]).join(', ')}>
                    {c.dots.map((d, k) => (
                      <i key={k} className={`cc-dot ${d}`} />
                    ))}
                  </span>
                )}
                {now && <i className="cc-progress" style={{ width: `${Math.round(progress * 100)}%` }} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      ))}
    </div>
  );
}
