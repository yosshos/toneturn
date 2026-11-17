// The review after a take (COURSE-FEEDBACK-UI §4.1, slice 2) — replaces TakeResult. One screen at 320×720: one verdict
// line, three chips (Notes, Time, Even), Again / Loop / Next. The charts, the legend and the detail lines sit behind
// "Why?" in a sheet. A weak take shows only the total and one suggestion. No jargon (no "CV", no "vel SD").

import { useState, type ReactNode } from 'react';
import type { Drill, DrillCalibration, TakeMetrics } from '../engine/drills/types';
import { limbChips, reviewOf, type Review } from '../engine/drills/review';
import type { DrumVoice } from '../engine/drills/types';

/** Short drum names for the per-drum chips (slice 6). */
const DRUM_SHORT: Partial<Record<DrumVoice, { en: string; he: string }>> = {
  kick: { en: 'Kick', he: 'קיק' },
  snare: { en: 'Snare', he: 'סנר' },
  hihat: { en: 'Hat', he: 'היי־האט' },
  hhPedal: { en: 'Hat foot', he: 'פדל' },
  ride: { en: 'Ride', he: 'רייד' },
  crash: { en: 'Crash', he: 'קראש' },
  tom1: { en: 'Tom', he: 'טום' },
  tom2: { en: 'Tom 2', he: 'טום 2' },
  tom3: { en: 'Floor', he: 'טום רצפה' },
};
import { drumLimbLine } from '../engine/drills/drumAnalyze';
import { EvennessStrip, MarkLegend, VelocityCurve } from './DrillTake';
import { KeepButton } from './encore/bits';
import { Icon } from './icons';
import { RecLink } from './Recordings'; // My recordings: every take is kept (SPEC-PHRASE-STUDIO §6.3)
import { TouchLines } from './TouchLines';

type Lang = 'he' | 'en';

const TX = {
  en: { clean: 'Clean', almost: 'Almost', not: 'Not yet', notes: 'Notes', time: 'Time', even: 'Even', early: 'a bit early', late: 'a bit late', ontime: 'on time', again: 'Again', next: 'Next', why: 'Why?', close: 'Close', wait: 'Same tempo — wait for the click', free: 'Once in free time', loop: 'Loop', hands: 'Hands together', pedal: 'Pedal', chords: 'Full chords', ms: 'ms', of: 'of' },
  he: { clean: 'נקי', almost: 'כמעט', not: 'עוד לא', notes: 'תווים', time: 'זמן', even: 'אחידות', early: 'קצת מוקדם', late: 'קצת מאוחר', ontime: 'בזמן', again: 'שוב', next: 'הבא', why: 'למה?', close: 'סגירה', wait: 'אותו טמפו — לחכות לקליק', free: 'פעם אחת בלי קצב', loop: 'לולאה', hands: 'שתי הידיים יחד', pedal: 'פדל', chords: 'אקורדים מלאים', ms: 'מ״ש', of: 'מתוך' },
};

/** Text with "♩ 66" / "♪ 120" kept whole and left-to-right inside a Hebrew line (the tempo jumped to the line start). */
export function isoTempo(text: string): ReactNode {
  const parts = text.split(/([♩♪]\s?\d+(?:\s?[→–-]\s?[♩♪]?\s?\d+)?)/);
  return parts.map((p, i) =>
    i % 2 ? (
      <bdi key={i} dir="ltr" className="tempo-iso">
        {p}
      </bdi>
    ) : (
      p
    ),
  );
}

/** The mini timing meter: the window box, the mean as a head (◂ early … late ▸), LTR always. */
function TimeMeter({ r }: { r: NonNullable<Review['time']> }) {
  const W = 64;
  const clamp = Math.max(-60, Math.min(60, r.mean));
  const x = W / 2 + (clamp / 60) * (W / 2 - 6);
  return (
    <svg className="tr-meter" viewBox={`0 0 ${W} 14`} aria-hidden="true" style={{ direction: 'ltr' }}>
      <line x1={2} x2={W - 2} y1={7} y2={7} className="tr-axis" />
      <rect x={W / 2 - 9} y={2} width={18} height={10} rx={3} className="tr-win" />
      <ellipse cx={x} cy={7} rx={4.6} ry={3.4} transform={`rotate(-20 ${x} 7)`} className={`tr-needle ${r.tendency}`} />
    </svg>
  );
}

/** Five waveform bars (the v2 progress motif): the evenness grade. */
function EvenBars({ grade }: { grade: number }) {
  const hs = [5, 9, 12, 9, 6];
  return (
    <svg className="tr-even" viewBox="0 0 34 14" aria-hidden="true">
      {hs.map((h, i) => (
        <rect key={i} x={i * 7 + 1} y={14 - h} width={5} height={h} rx={1.5} className={i < grade ? 'on' : ''} />
      ))}
    </svg>
  );
}

export function TakeReview({
  m,
  lang,
  onAgain,
  onSlower,
  onNext,
  onFree,
  onLoop,
  loopLabel,
  free = false,
  next,
  nextLabel,
  lastTake,
  children,
  onKeep,
  fingering,
  drill,
  cal,
}: {
  /** B14: the drill and calibration, so the "Why?" sheet's velocity row matches the live bars. */
  drill?: Drill;
  cal?: DrillCalibration;
  /** "Other fingering?" (OwnFingeringLink): a small text action beside "Why?" — the row it shares adds no height. */
  fingering?: ReactNode;
  /** Encore (SPEC-PHRASE-STUDIO §4.1): "Keep this phrase" — a small icon button beside Again / Loop / Next. */
  onKeep?: () => void;
  /** A previous take of the same item exists: the "Last take" toggle (its ticks faded under this take's). */
  lastTake?: { on: boolean; onToggle: () => void };
  /** The Next button's word ("Whole item" after a loop). */
  nextLabel?: string;
  m: TakeMetrics;
  lang: Lang;
  onAgain: () => void;
  onSlower?: () => void;
  onNext?: () => void;
  /** A badly missed timed take: one take in free time (rubato.ts). */
  onFree?: () => void;
  /** Loop the selected / worst bars (slice 3). */
  onLoop?: () => void;
  /** "3–4": the bars the Loop button plays. */
  loopLabel?: string;
  /** A free-time take: notes only, no timing numbers. */
  free?: boolean;
  /** The ladder's line (tempo step), shown under the verdict. */
  next?: string;
  /** Extra one-line results (rule cards, phrasing): shown compactly under the chips. */
  children?: ReactNode;
}) {
  const tx = TX[lang];
  const r = reviewOf(m, { free, canFree: !!onFree });
  const [why, setWhy] = useState(false);
  const word = r.verdict === 'clean' ? tx.clean : r.verdict === 'almost' ? tx.almost : tx.not;
  const tend = r.time ? (r.time.tendency === 'early' ? tx.early : r.time.tendency === 'late' ? tx.late : tx.ontime) : null;
  const slowerBpm = Math.max(30, Math.round(m.bpm * 0.9));
  const ring = (m as TakeMetrics & { guitar?: { ring: { chords: number; full: number } | null } }).guitar?.ring ?? null;
  const suggestion =
    r.suggestion === 'wait' ? (
      <span className="tr-tip" data-rushing="1">
        {tx.wait}
      </span>
    ) : r.suggestion === 'slower' && onSlower ? (
      <button className="btn small ghost tr-tip-btn" onClick={onSlower} data-slower="1">
        {lang === 'he' ? 'לנסות ב־' : 'Try at '}
        <bdi dir="ltr">♩ {slowerBpm}</bdi>
        {lang === 'he' ? '' : '?'}
      </button>
    ) : r.suggestion === 'free' && onFree ? (
      <button className="btn small ghost tr-tip-btn" onClick={onFree} data-to-rubato="1">
        {tx.free}
      </button>
    ) : null;
  return (
    <section className={`drill-result take-review v-${m.verdict} ${r.soft ? 'soft' : ''}`} data-review={m.verdict} data-soft={r.soft ? '1' : '0'}>
      <p className="tr-verdict" aria-live="polite">
        <span className={`tr-medal v-${m.verdict}`} aria-hidden="true" />
        <b>{word}</b>
        {/* the count lives in the Notes chip below; repeated here it wrapped the verdict to a second line (a phone's
            review is one screen: the hands-together pieces had no row to spare). A soft review has no chips: keep it. */}
        {r.soft && (
          <>
            <span className="tr-sep" aria-hidden="true">
              ·
            </span>
            <span data-notes={`${r.notes.ok}/${r.notes.total}`}>
              <bdi dir="ltr">
                {r.notes.ok}/{r.notes.total}
              </bdi>{' '}
              {tx.notes}
            </span>
          </>
        )}
        {!r.soft && tend && (
          <>
            <span className="tr-sep" aria-hidden="true">
              ·
            </span>
            <span>{tend}</span>
          </>
        )}
      </p>
      {m.why[lang] && (
        <p className="tr-why-line drill-why" dir="auto">
          {isoTempo(m.why[lang])}
        </p>
      )}
      {!r.soft && (
        <ul className="tr-chips" aria-label={lang === 'he' ? 'תוצאות' : 'results'}>
          <li data-chip="notes">
            <small>{tx.notes}</small>
            <b>
              <bdi dir="ltr">
                {r.notes.ok}/{r.notes.total}
              </bdi>
            </b>
          </li>
          {r.time && (
            <li data-chip="time">
              <small>{tx.time}</small>
              <TimeMeter r={r.time} />
              <b>
                <bdi dir="ltr">±{Math.round(r.time.sd ?? Math.abs(r.time.mean))}</bdi> <span className="tr-unit">{tx.ms}</span>
              </b>
            </li>
          )}
          {r.even !== null && (
            <li data-chip="even">
              <small>{tx.even}</small>
              <EvenBars grade={r.even} />
              <b>
                <bdi dir="ltr">{r.even}/5</bdi>
              </b>
            </li>
          )}
        </ul>
      )}
      {!r.soft && m.drum && !free && (
        // Slice 6: the per-drum split — which limb rushed or dragged (◂ early / late ▸), a check when on time.
        <ul className="limb-chips" data-limb-chips={limbChips(m.drum).map((c) => `${c.voice}:${c.state}`).join(' ')} aria-label={lang === 'he' ? 'לפי תוף' : 'per drum'}>
          {limbChips(m.drum).map((c) => (
            <li key={c.voice} className={c.state}>
              <i aria-hidden="true" />
              {DRUM_SHORT[c.voice]?.[lang] ?? c.voice}
              <b>
                <bdi dir="ltr">{c.state === 'ok' ? '✓' : c.state === 'miss' ? '—' : c.state === 'early' ? `◂ ${Math.abs(c.mean!)}` : `${Math.abs(c.mean!)} ▸`}</bdi>
              </b>
            </li>
          ))}
        </ul>
      )}
      {!r.soft && children}
      {suggestion && <p className="tr-suggest">{suggestion}</p>}
      <div className="tr-actions">
        <button className="btn" onClick={onAgain} data-again="1">
          {tx.again}
        </button>
        {onLoop && (
          <button className="btn ghost" onClick={onLoop} data-loop-start="1">
            {tx.loop} <bdi dir="ltr">{loopLabel}</bdi>
          </button>
        )}
        {onNext && (
          <button className="btn primary" onClick={onNext} data-next="1">
            {nextLabel ?? tx.next}
          </button>
        )}
        {onKeep && <KeepButton lang={lang} onKeep={onKeep} />}
      </div>
      {lastTake || fingering ? (
        // The take overlay (§4.1): the previous take's ticks, faded, under this one's — on the same notes.
        <div className="tr-why-row">
          <button className="link tr-why" onClick={() => setWhy(true)} aria-haspopup="dialog" data-why="1">
            {tx.why}
          </button>
          {fingering}
          {lastTake && (
            <button className={`chip tr-last ${lastTake.on ? 'on' : ''}`} aria-pressed={lastTake.on} onClick={lastTake.onToggle} data-last-take={lastTake.on ? 'on' : 'off'}>
              {lang === 'he' ? 'הנגינה הקודמת' : 'Last take'}
            </button>
          )}
        </div>
      ) : (
        <button className="link tr-why" onClick={() => setWhy(true)} aria-haspopup="dialog" data-why="1">
          {tx.why}
        </button>
      )}
      {why && (
        <div className="sheet-backdrop" onClick={() => setWhy(false)}>
          <div className="sheet tr-sheet" role="dialog" aria-modal="true" aria-label={tx.why} onClick={(e) => e.stopPropagation()} data-why-sheet="1">
            <header className="tr-sheet-head">
              <h2>{word}</h2>
              <button className="icon-btn" onClick={() => setWhy(false)} aria-label={tx.close}>
                <Icon k="close" />
              </button>
            </header>
            {next && (
              <p className="tr-next drill-ladder" dir="auto">
                {isoTempo(next)}
              </p>
            )}
            <p className="sr-summary">
              {lang === 'he' ? `${r.notes.ok} ${tx.of} ${r.notes.total} תווים נכונים.` : `${r.notes.ok} of ${r.notes.total} notes right.`}
            </p>
            {m.drum && (
              <p className="drum-limbs" dir="auto" data-drum-limbs="1">
                {drumLimbLine(m.drum, m.wrong, lang)}
              </p>
            )}
            <ul className="tr-detail">
              {m.handsAbs !== null && (
                <li>
                  {tx.hands}: <bdi dir="ltr">{Math.round(m.handsAbs)}</bdi> {tx.ms}
                </li>
              )}
              {m.pedal && (
                <li>
                  {tx.pedal}: <bdi dir="ltr">{m.pedal.ok}/{m.pedal.total}</bdi>
                </li>
              )}
              {ring && (
                <li data-ring="1">
                  {tx.chords}: <bdi dir="ltr">{ring.full}/{ring.chords}</bdi>
                </li>
              )}
            </ul>
            {/* MEASUREMENT-AUDIT: one line per touch point, a "Why?" on the misses */}
            <TouchLines t={m.touch} lang={lang} />
            <MarkLegend lang={lang} />
            {!free && <EvennessStrip m={m} lang={lang} />}
            <VelocityCurve m={m} lang={lang} drill={drill} cal={cal} />
            <RecLink lang={lang} />
          </div>
        </div>
      )}
    </section>
  );
}
