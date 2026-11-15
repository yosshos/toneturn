// The live timing meter, "pocket" (COURSE-FEEDBACK-UI §4.1, slice 5): a strip under the score that replaces "Go!" and
// the beat dot. The tolerance window is an ink-outlined box in the centre; a note-head needle sits at the running mean
// offset of the last 6 notes (teal inside the window, tangerine when early, purple when late); ◂ and ▸ at the ends, no
// words. One thin row per hand (keys, hands together) or per limb (drums), each with its own needle. The bar's beats
// are small cells at the end (count-in: they fill lemon one by one; then the current beat is lemon), and a quiet count
// of notes in a row inside the window. The strip is LTR like the music and aria-hidden (the count-in is spoken once).

import { HANDS_CHIP_MS, type LiveTake, type PocketRow } from '../engine/drills/liveGrade';

type Lang = 'he' | 'en';
const W = 200;
const ROW_LABEL: Record<Lang, Record<PocketRow['key'], string>> = {
  en: { R: 'R', L: 'L', RH: 'R', LH: 'L', RF: 'K', LF: 'H' },
  he: { R: 'י', L: 'ש', RH: 'י', LH: 'ש', RF: 'ק', LF: 'ה' },
};

const side = (mean: number, win: number): 'ok' | 'early' | 'late' => (Math.abs(mean) <= win ? 'ok' : mean < 0 ? 'early' : 'late');

export function PocketMeter({ live, phase, beat, meter, lang, idle, rows: rowKeys = [] }: { live: LiveTake | null; phase: 'ready' | 'count' | 'play'; /** Click index of the take (count-in first; −1 idle). */ beat: number; meter: number; lang: Lang; /** Shown before the take (the tempo). */ idle: React.ReactNode; /** The rows the take will have (drawn empty before the first notes). */ rows?: PocketRow['key'][] }) {
  const win = live?.win ?? 40;
  const range = Math.max(60, win * 2.2);
  const rows: PocketRow[] = live?.rows.length ? live.rows : rowKeys.map((key) => ({ key, mean: null }));
  const lab = rows.length ? 14 : 0;
  const x0 = 10 + lab;
  const x1 = W - 10;
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const xOf = (d: number) => mid + Math.max(-1, Math.min(1, d / range)) * half;
  const rowH = rows.length > 2 ? 8 : rows.length ? 10 : 22;
  const H = rows.length ? rows.length * (rowH + 2) + 2 : 26;
  const lines = rows.length ? rows : [{ key: 'R' as const, mean: live?.mean ?? null }];
  const cells = Math.max(1, Math.min(7, meter));
  const inPlay = phase === 'play' ? (((beat - meter) % meter) + meter) % meter : -1;
  const counted = phase === 'count' ? beat + 1 : 0;
  const he = lang === 'he';
  const hands = phase === 'play' && rows.some((r) => r.key === 'L') && live?.hands && live.hands.abs > HANDS_CHIP_MS ? live.hands : null;
  return (
    <div className={`drill-beat pocket ${phase}`} dir="ltr" data-pocket={phase} data-pocket-rows={rows.length || undefined} data-pocket-mean={live?.mean === null || live?.mean === undefined ? undefined : Math.round(live.mean)} data-streak={live?.streak ?? undefined}>
      {/* The count-in, spoken once a beat (the strip itself is hidden from screen readers). */}
      <span className="sr-summary" aria-live="polite">
        {phase === 'count' ? (he ? `ספירה ${Math.max(1, meter - beat)}` : `Count-in ${Math.max(1, meter - beat)}`) : ''}
      </span>
      <svg className="pm-track" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ height: H }}>
        <path d={`M1 ${H / 2}L7 ${H / 2 - 4}V${H / 2 + 4}Z`} className="pm-end" transform={lab ? `translate(${lab} 0)` : undefined} />
        <path d={`M${W - 1} ${H / 2}L${W - 7} ${H / 2 - 4}V${H / 2 + 4}Z`} className="pm-end" />
        {lines.map((r, k) => {
          const y = rows.length ? 2 + k * (rowH + 2) : 2;
          const h = rows.length ? rowH : H - 4;
          return (
            <g key={r.key} data-row={rows.length ? r.key : undefined}>
              {rows.length > 0 && (
                <text x={6} y={y + h / 2 + 3.2} textAnchor="middle" className="pm-lab">
                  {ROW_LABEL[lang][r.key]}
                </text>
              )}
              <line x1={x0} x2={x1} y1={y + h / 2} y2={y + h / 2} className="pm-axis" />
              <rect x={xOf(-win)} y={y} width={xOf(win) - xOf(-win)} height={h} rx={3} className="pm-win" />
              {r.mean !== null && <ellipse cx={xOf(r.mean)} cy={y + h / 2} rx={rows.length > 2 ? 5 : 6.5} ry={rows.length > 2 ? 3.4 : 4.6} transform={`rotate(-20 ${xOf(r.mean)} ${y + h / 2})`} className={`pm-needle ${side(r.mean, win)}`} />}
            </g>
          );
        })}
      </svg>
      {/* Hands together (§4.1): the RH − LH gap as a small ⇆ chip between the R and L rows, only outside 30 ms; the
          leading hand's letter beside it. */}
      {hands && (
        <span className="pm-hands" data-hands={Math.round(hands.abs)} data-hands-lead={hands.mean > 0 ? 'L' : 'R'}>
          <span aria-hidden="true">⇆</span>
          <b>{Math.round(hands.abs)}</b>
          <small>{ROW_LABEL[lang][hands.mean > 0 ? 'L' : 'R']}</small>
        </span>
      )}
      {/* Keyed by the click: a new child each beat (the e2e kit tests listen for it). */}
      <span className="pm-beats" key={beat} aria-hidden="true">
        {Array.from({ length: cells }, (_, k) => (
          <i key={k} className={k < counted || k === inPlay ? 'on' : ''} />
        ))}
      </span>
      <span className="pm-lead" dir="auto">
        {phase === 'count' ? <b className="pm-count">{Math.max(1, meter - beat)}</b> : phase === 'play' ? (live && live.streak >= 2 ? <span className="pm-streak"><bdi dir="ltr">{live.streak}</bdi> {he ? 'ברצף' : 'in a row'}</span> : null) : idle}
      </span>
    </div>
  );
}
