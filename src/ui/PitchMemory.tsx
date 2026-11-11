// Pitch Memory (spec AE §8): once a day, sing or play your note with no reference; error in cents; 30-day trend.

import { useEffect, useRef, useState } from 'react';
import { centsToNote, dayKey, DEFAULT_NOTE, doneOn, meanAbs, memoryScore, takePitch, trend, type MemoryEntry } from '../engine/pitchMemory';
import { displayNote, pc } from '../engine/pitch';
import type { SungFrame } from '../engine/sing';
import type { AccessError } from '../game/adapters';
import { namingFor } from '../storage/progress';
import { G2Head, MicProblem, pitchCaptureFor, type Game2Props } from './Flight';
import { TierChips } from './TierChips';
import { startTier, tierIndex, type DynName } from '../engine/gameTiers';
import { SIMULATED } from './services';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const TEXT = {
  en: {
    title: 'Pitch Memory',
    blurb: 'Once a day, sing or play your note from memory — no reference. See how close you get, and watch the trend over 30 days.',
    note: 'Your note',
    think: (n: string) => `Imagine your ${n}… then sing or play it and hold it.`,
    ready: "I'm ready — listen",
    listening: 'Listening… hold the note',
    silence: "I didn't hear a steady note. Try again.",
    again: 'Try again',
    today: 'Today',
    sharp: 'sharp',
    flat: 'flat',
    spotOn: 'Spot on!',
    tomorrow: 'Come back tomorrow for the next one.',
    trend: 'Last 30 days',
    mean: 'Average error',
    noData: 'Your first day — the trend starts here.',
    back: 'Back',
    days: 'days',
  },
  he: {
    title: 'זיכרון צליל',
    blurb: 'פעם ביום, שירו או נגנו את הצליל שלכם מהזיכרון — בלי צליל ייחוס. ראו כמה קרוב הגעתם, ועקבו אחרי המגמה לאורך 30 יום.',
    note: 'הצליל שלכם',
    think: (n: string) => `דמיינו את ה-${n} שלכם… ואז שירו או נגנו אותו והחזיקו.`,
    ready: 'מוכן/ה — להקשיב',
    listening: 'מקשיב… החזיקו את הצליל',
    silence: 'לא שמעתי צליל יציב. נסו שוב.',
    again: 'לנסות שוב',
    today: 'היום',
    sharp: 'גבוה',
    flat: 'נמוך',
    spotOn: 'בול!',
    tomorrow: 'חזרו מחר לניסיון הבא.',
    trend: '30 הימים האחרונים',
    mean: 'סטייה ממוצעת',
    noData: 'היום הראשון — המגמה מתחילה כאן.',
    back: 'חזרה',
    days: 'ימים',
  },
};

type Phase = 'idle' | 'listening' | 'silence' | 'error';

export function PitchMemory({
  lang,
  settings,
  onSave,
  onExit,
  onResult,
  log,
  onLog,
  tier: tierInfo,
}: Game2Props & { log: MemoryEntry[]; onLog: (e: MemoryEntry) => void }) {
  const tx = TEXT[lang];
  const nm = namingFor(settings.naming, lang);
  const today = dayKey(new Date());
  const [mine, setMine] = useState<MemoryEntry | null>(null);
  // Today's take: from the log, or the one just sung (before the caller's log comes back).
  const done = doneOn(log, today) ?? (mine?.day === today ? mine : null);
  const fullLog = mine && !doneOn(log, mine.day) ? [...log, mine] : log;
  const [tier, setTier] = useState<DynName>(() => (tierInfo ? startTier(tierInfo) : 'pp'));
  // From mf the app picks the note of the day (GAMES_TIERS_PLAN): the same for the whole day.
  const appNote = tierInfo && tierIndex(tier) >= 3 ? [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 12 : null;
  const [picked, setNote] = useState<number>(log.length ? log[log.length - 1].note : DEFAULT_NOTE);
  const note = appNote ?? picked;
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState<AccessError | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const name = (n: number) => displayNote(pc(NAMES[n]), nm, lang);

  const listen = async () => {
    setPhase('listening');
    const c = new AbortController();
    ctl.current = c;
    let frames: SungFrame[] | null = null;
    if (SIMULATED) {
      // Simulator: an A eight cents sharp.
      frames = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, hz: 440 * 2 ** ((note - 9 + 0.08) / 12), confidence: 0.95, rms: 0.1 }));
    } else {
      const r = await pitchCaptureFor(settings).sing({ signal: c.signal, maxMs: 7000, silenceMs: 6000 });
      if (r.kind === 'aborted') return;
      if (r.kind === 'error') {
        setErr(r.error);
        setPhase('error');
        return;
      }
      if (r.kind === 'frames') frames = r.frames;
    }
    const m = frames ? takePitch(frames) : null;
    if (m === null) return setPhase('silence');
    const entry: MemoryEntry = { day: today, cents: centsToNote(m, note), note };
    setMine(entry);
    onLog(entry);
    onSave(null);
    onResult({ game: 'pitch-memory', score: memoryScore(entry.cents), detail: { ...entry, ...(tierInfo ? { tier } : {}) } });
    setPhase('idle');
  };

  const points = trend(fullLog, new Date());
  const mean = meanAbs(points);

  return (
    <main className="panel-screen g2 g2-memory" data-game="pitch-memory">
      <G2Head
        title={tx.title}
        backLabel={tx.back}
        onBack={() => {
          ctl.current?.abort();
          onExit();
        }}
      />

      {phase === 'error' && err ? (
        <MicProblem lang={lang} error={err} onRetry={() => void listen()} onBack={onExit} />
      ) : done ? (
        <section className="g2-card g2-today">
          <p className="g2-dim">
            {tx.today} · <span dir="ltr">{name(done.note)}</span>
          </p>
          <p className={`g2-big ${Math.abs(done.cents) <= 10 ? 'good' : Math.abs(done.cents) <= 30 ? 'ok' : 'off'}`} dir="ltr">
            {done.cents > 0 ? '+' : ''}
            {Math.round(done.cents)}¢
          </p>
          <p>{Math.abs(done.cents) <= 5 ? tx.spotOn : done.cents > 0 ? tx.sharp : tx.flat}</p>
          <p className="g2-dim">{tx.tomorrow}</p>
        </section>
      ) : (
        <section className="g2-card">
          <p>{tx.blurb}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="pitchmemory" />}
          {appNote === null && (
          <fieldset className="seg-field">
            <legend>{tx.note}</legend>
            <div className="g2-notes" role="radiogroup" aria-label={tx.note}>
              {NAMES.map((_, n) => (
                <button key={n} type="button" role="radio" aria-checked={note === n} className={note === n ? 'on' : ''} disabled={phase === 'listening'} onClick={() => setNote(n)}>
                  <span dir="ltr">{name(n)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          )}
          <p className="g2-lead">{tx.think(name(note))}</p>
          {phase === 'listening' ? (
            <p className="g2-listen" aria-live="polite">
              <span className="g2-pulse" aria-hidden="true" /> {tx.listening}
            </p>
          ) : (
            <>
              {phase === 'silence' && <p className="g2-warn">{tx.silence}</p>}
              <button className="btn mega" onClick={() => void listen()}>
                {phase === 'silence' ? tx.again : tx.ready}
              </button>
            </>
          )}
        </section>
      )}

      <section className="g2-card">
        <h2 className="g2-h">{tx.trend}</h2>
        {fullLog.length ? <TrendChart points={points} /> : <p className="g2-dim">{tx.noData}</p>}
        {mean !== null && (
          <p className="g2-dim">
            {tx.mean}: <b dir="ltr">{mean}¢</b> · <span dir="ltr">{points.filter((p) => p.cents !== null).length}</span> {tx.days}
          </p>
        )}
      </section>
    </main>
  );
}

/** Simple line: cents (clamped ±100) per day, oldest left; zero line and a ±10 ¢ band. Time runs left → right. */
function TrendChart({ points }: { points: { day: string; cents: number | null }[] }) {
  const w = 300;
  const h = 120;
  const pad = 8;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - 2 * pad);
  const y = (c: number) => h / 2 - (Math.max(-100, Math.min(100, c)) / 100) * (h / 2 - pad);
  const known = points.map((p, i) => ({ i, c: p.cents })).filter((p): p is { i: number; c: number } => p.c !== null);
  return (
    <svg className="g2-trend" viewBox={`0 0 ${w} ${h}`} direction="ltr" role="img" aria-label={known.map((p) => `${points[p.i].day}: ${Math.round(p.c)}`).join(', ')}>
      <rect x={pad} y={y(10)} width={w - 2 * pad} height={y(-10) - y(10)} className="g2-trend-band" />
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} className="g2-trend-zero" />
      <text x={pad} y={pad + 4} className="g2-trend-lbl">
        +100¢
      </text>
      <text x={pad} y={h - 2} className="g2-trend-lbl">
        −100¢
      </text>
      {known.length > 1 && <polyline className="g2-trend-line" points={known.map((p) => `${x(p.i)},${y(p.c)}`).join(' ')} />}
      {known.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.c)} r={3.5} className={Math.abs(p.c) <= 10 ? 'good' : 'off'} />
      ))}
    </svg>
  );
}
