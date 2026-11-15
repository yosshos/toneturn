// The chord chart, "דף אקורדים" (COURSE-FEEDBACK-UI §4.7, slice 8): one shared view for the chart-only drills, the ear
// and rule-card cards, and the chords over a song's staff. Always four bars a row (72 px cells on a phone), chord
// symbols in <bdi> (LTR inside a Hebrew page), one slash a beat in faint ink, 2.5 px ink bar lines. The bar being
// played: a lemon strip on top with an ink edge, and a lemon underline that fills across the bar in time (where you are
// inside the bar). A loop selection is lilac hatching, never lemon. After a take: a corner tab per bar (teal ✓ kept,
// pink with the numbers of the rules broken there) and, for target rules, the note landed on under the chord.

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

export function ChordChart({ cells, meter, beat = -1, first = 0, maxRows = 4, size = 'full', loop, lang, attrs }: {
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
}) {
  const he = lang === 'he';
  const curF = beat >= 0 ? beat / Math.max(1, meter) : -1;
  const cur = curF >= 0 ? Math.floor(curF + 1e-6) : -1;
  const progress = curF >= 0 ? Math.min(1, Math.max(0, curF - cur)) : 0;
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += 4) rows.push(Array.from({ length: Math.min(4, cells.length - i) }, (_, k) => i + k));
  // The row being played stays in the top part with the next row in view.
  const curRow = cur >= 0 ? Math.floor(cur / 4) : 0;
  const start = Math.max(0, Math.min(rows.length - maxRows, curRow - (maxRows > 2 ? 1 : 0)));
  const slashes = Math.min(meter, 7);
  return (
    <div className={`chord-chart ${size}`} dir="ltr" role="group" aria-label={he ? 'דף אקורדים' : 'Chord chart'} data-chord-chart={cells.length} {...attrs}>
      {rows.slice(start, start + maxRows).map((r, ri) => (
        <ol key={start + ri} className="cc-row">
          {r.map((i) => {
            const c = cells[i];
            const now = i === cur;
            const inLoop = !!loop && i >= loop[0] && i <= loop[1];
            const label = `${c.chord ? prettyChord(c.chord) : c.chord === undefined ? '' : '%'} · ${he ? 'תיבה' : 'bar'} ${first + i + 1}${c.role === 'band' ? (he ? ', הקשבה' : ', listen') : ''}${c.tab ? (c.tab.kind === 'ok' ? (he ? ', נשמר' : ', kept') : he ? ', נשבר' : ', broken') : ''}`;
            return (
              <li key={i} className={`cc-bar ${now ? 'now' : ''} ${inLoop ? 'loop' : ''} ${c.role ?? ''}`} data-bar={first + i} aria-label={label} aria-current={now ? 'true' : undefined}>
                {c.tab && (
                  <span className={`cc-tab ${c.tab.kind}`} aria-hidden="true">
                    {c.tab.kind === 'ok' ? '✓' : c.tab.rules.join('·')}
                  </span>
                )}
                {c.chord !== undefined && (
                  <bdi className="cc-chord" dir="ltr">
                    {c.chord ? <Symbol c={c.chord} /> : '%'}
                  </bdi>
                )}
                {size === 'full' && !c.landed && !c.target && !c.role && <span className="cc-slash" aria-hidden="true">{'/ '.repeat(slashes).trim()}</span>}
                {c.landed !== undefined ? (
                  <small className={`cc-sub ${c.landed ? (c.landed.hit ? 'hit' : 'miss') : 'rest'}`}>{c.landed ? <bdi dir="ltr">{c.landed.name}</bdi> : '—'}</small>
                ) : c.target ? (
                  <small className="cc-sub target">
                    <bdi dir="ltr">→ {c.target}</bdi>
                  </small>
                ) : c.role ? (
                  <small className="cc-sub role">{c.role === 'band' ? (he ? 'הקשבה' : 'Listen') : he ? 'אתם' : 'You'}</small>
                ) : null}
                {now && <i className="cc-progress" style={{ width: `${Math.round(progress * 100)}%` }} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      ))}
    </div>
  );
}
