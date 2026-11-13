// Barry Harris in Time (GAMES_TIERS_PLAN §4, 0.70): 8th-note lines over a vamp or changes, played on the keys and
// measured — chord tones of the bar's 6 chord on the beats, the diminished notes (or, from f, a chromatic half step)
// between, every note on the grid. Three takes per run; the engine is src/engine/bhInTime.ts. MIDI keyboards are
// measured; the on-screen keys are for practice (detail.input = 'touch'). Keys and bars stay physical LTR.

import '../bhtime.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  backing,
  chordPcs,
  chordSymbol,
  gradeTake,
  HIGH,
  isBhSave,
  LOW,
  makeTake,
  noteName,
  runResult,
  sixSymbol,
  TAKES,
  takeSeed,
  type BhGrade,
  type BhLevel,
  type BhSave,
  type Onset,
} from '../engine/bhInTime';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { midi as midiInput } from '../speech/midi';
import { G2Head, prefersCalm } from './Flight';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { TierChips } from './TierChips';

type Lang = 'he' | 'en';
const TEXT = {
  en: {
    title: 'Barry Harris in Time',
    blurb: 'Every bar is a 6th-diminished scale: the 6 chord’s notes on the beats, the diminished notes between. Play 8th notes over the band — the suggested line, or your own that keeps the rule.',
    refresher: 'Chord tones on 1, 2, 3, 4 · the scale between · from f a half step may lead into the next note.',
    midi: 'MIDI keyboard found — your takes are measured.',
    touch: 'No MIDI keyboard: the keys below are for practice and do not clear a level.',
    play: 'Play',
    cont: (n: number) => `Continue — take ${n} of ${TAKES}`,
    newRun: 'New run',
    back: 'Back',
    take: 'Take',
    bar: 'Bar',
    countIn: 'One bar count-in…',
    playing: 'Play the line',
    accuracy: 'Accuracy',
    beats: 'Chord tones on the beats',
    timing: 'Average timing',
    early: 'early',
    late: 'late',
    onTime: 'on time',
    next: 'Next take',
    results: 'See results',
    over: 'Results',
    best: 'Best',
    newBest: 'New personal best',
    again: 'Play again',
    verdict: { good: 'clean', ok: 'almost', off: 'not yet' } as Record<'good' | 'ok' | 'off', string>,
    practice: 'Practice run — on-screen keys do not clear a level.',
    keys: 'Keys',
    suggested: 'Suggested line',
  },
  he: {
    title: 'בארי האריס בזמן',
    blurb: 'כל תיבה היא סולם שישית־מוקטן: צלילי אקורד ה־6 על הפעמות, הצלילים המוקטנים ביניהם. נגנו שמיניות מעל הלהקה — את הקו המוצע, או קו משלכם ששומר על הכלל.',
    refresher: 'צלילי אקורד על 1, 2, 3, 4 · הסולם ביניהם · מ־f מותר חצי טון שמוביל לצליל הבא.',
    midi: 'נמצאה מקלדת MIDI — הטייקים נמדדים.',
    touch: 'אין מקלדת MIDI: הקלידים למטה הם לתרגול ולא מעבירים רמה.',
    play: 'לנגן',
    cont: (n: number) => `להמשיך — טייק ${n} מתוך ${TAKES}`,
    newRun: 'סבב חדש',
    back: 'חזרה',
    take: 'טייק',
    bar: 'תיבה',
    countIn: 'תיבת ספירה…',
    playing: 'נגנו את הקו',
    accuracy: 'דיוק',
    beats: 'צלילי אקורד על הפעמות',
    timing: 'תזמון ממוצע',
    early: 'מוקדם',
    late: 'מאוחר',
    onTime: 'בזמן',
    next: 'לטייק הבא',
    results: 'לתוצאות',
    over: 'תוצאות',
    best: 'שיא',
    newBest: 'שיא אישי חדש',
    again: 'לשחק שוב',
    verdict: { good: 'נקי', ok: 'כמעט', off: 'עוד לא' } as Record<'good' | 'ok' | 'off', string>,
    practice: 'סבב תרגול — קלידי המסך לא מעבירים רמה.',
    keys: 'קלידים',
    suggested: 'הקו המוצע',
  },
};

type Phase = 'setup' | 'ready' | 'play' | 'review' | 'over';
const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

export function BhInTime({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TEXT[lang as Lang];
  const calm = prefersCalm(settings);
  const resumable = isBhSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'mp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<BhSave | null>(null);
  const [grade, setGrade] = useState<BhGrade | null>(null);
  const [bar, setBar] = useState(-1);
  const [lastKey, setLastKey] = useState<number | null>(null);
  const [hasMidi, setHasMidi] = useState<boolean | null>(null);
  const [final, setFinal] = useState<{ accuracy: number; score: number; record: boolean } | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const onsets = useRef<Onset[]>([]);
  const origin = useRef(0);
  const playing = useRef(false);

  const take = useMemo(() => (run ? makeTake(run.level, run.bpm, takeSeed(run.seed, run.takes.length)) : null), [run]);

  // Is a MIDI keyboard there? (asked once on open; without one the on-screen keys are practice only)
  useEffect(() => {
    let live = true;
    midiInput
      .enable()
      .then((d) => live && setHasMidi(d.length > 0))
      .catch(() => live && setHasMidi(false));
    return () => {
      live = false;
    };
  }, []);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
    playing.current = false;
  };
  useEffect(() => stop, []);

  const levelOf = (t: DynName): BhLevel => (tierDef('bhtime', t)?.levels?.[0] ?? 1) as BhLevel;
  const bpmOf = (t: DynName) => Number(tierDef('bhtime', t)?.params?.bpm ?? 90);

  // Owner 2026-11-13: "Play again" starts the first round at once (no second Start press).
  const autoFirst = useRef(false);
  useEffect(() => {
    if (!autoFirst.current || phase !== 'ready') return;
    autoFirst.current = false;
    const id = window.setTimeout(() => void playTake(), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run]);
  const begin = (resume: boolean) => {
    stop();
    const r: BhSave =
      resume && resumable
        ? resumable
        : { v: 1, game: 'bhtime', seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, level: levelOf(tier), bpm: bpmOf(tier), input: hasMidi ? 'midi' : 'touch', takes: [], ...(tierInfo ? { tier } : {}) };
    setRun(r);
    setGrade(null);
    setFinal(null);
    onSave(r);
    setPhase('ready');
  };

  const note = (m: number, at: number) => {
    setLastKey(m);
    if (playing.current) onsets.current.push({ ms: at - origin.current, midi: m });
  };

  // MIDI notes during the run (the app's live sound plays them).
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'play') return;
    return midiInput.onNote((m, on, at) => {
      if (on) note(m, at || performance.now());
    });
  }, [phase]);

  // The lit bar follows the clock.
  useEffect(() => {
    if (phase !== 'play' || !take) return;
    let id = 0;
    const barMs = (4 * 60000) / take.bpm;
    const tick = () => {
      const b = Math.floor((performance.now() - origin.current) / barMs);
      setBar(b < 0 ? -1 : Math.min(take.bars.length - 1, b));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase, take]);

  const playTake = async () => {
    if (!take || !run) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    onsets.current = [];
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const b = backing(take);
    // piano.play schedules 60 ms ahead; beat 1 of bar 1 comes after the count-in.
    origin.current = performance.now() + 60 + b.startSec * 1000;
    playing.current = true;
    setBar(-1);
    setPhase('play');
    try {
      await piano.play(b.events, b.length, ac.signal);
    } catch {
      return; // left the screen
    }
    if (acRef.current !== ac) return;
    playing.current = false;
    const lat = run.input === 'midi' ? (settings.midiLatencyMs ?? 0) : (settings.tapLatencyMs ?? 0);
    const g = gradeTake(take, onsets.current, lat);
    setGrade(g);
    const next = { ...run, takes: [...run.takes, g.accuracy] };
    setRun(next);
    if (next.takes.length < TAKES) onSave(next);
    setPhase('review');
  };

  const afterReview = () => {
    if (!run) return;
    if (run.takes.length < TAKES) {
      setGrade(null);
      setPhase('ready');
      return;
    }
    const r = runResult(run);
    setFinal({ ...r, record: r.score > 0 && r.score > (best ?? 0) });
    onSave(null);
    onResult({ game: 'bhtime', score: r.score, detail: { accuracy: r.accuracy, input: run.input, bars: take?.bars.length ?? 4, level: run.level, bpm: run.bpm, takes: run.takes, rounds: run.takes.length, ...(run.tier ? { tier: run.tier } : {}) } });
    setPhase('over');
  };

  const back = () => {
    stop();
    onExit();
  };

  const tapKey = (m: number, at: number) => {
    void piano.unlock().then(() => piano.play([{ midi: m, start: 0, duration: 0.35, velocity: 0.7 }], 0.4, new AbortController().signal)).catch(() => {});
    note(m, at);
  };

  // ------------------------------------------------------------------ render
  const takeNo = run ? Math.min(TAKES, run.takes.length + (phase === 'review' ? 0 : 1)) : 1;
  const curBar = take ? take.bars[Math.max(0, bar)] : null;

  return (
    <main className={`panel-screen g2 bht ${calm ? 'g2-calm' : ''}`} data-game="bhtime" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        {run && phase !== 'setup' && phase !== 'over' && (
          <span className="g2-hud-mini" dir="ltr">
            {takeNo}/{TAKES}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx.blurb}</p>
          <p className="g2-dim">{tx.refresher}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="bhtime" />}
          <p className="g2-dim bht-input" data-bh-input={hasMidi ? 'midi' : 'touch'}>
            {hasMidi ? tx.midi : tx.touch}
          </p>
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx.cont(resumable.takes.length + 1)}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx.newRun}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-bh-start>
              {tx.play}
            </button>
          )}
        </section>
      )}

      {(phase === 'ready' || phase === 'play' || phase === 'review') && take && run && (
        <>
          <div className="bht-bars" dir="ltr" style={{ ['--cols' as string]: Math.min(4, take.bars.length) }} role="list">
            {take.bars.map((b, i) => {
              const v = grade?.bars[i]?.verdict;
              return (
                <div key={i} role="listitem" className={`bht-bar ${phase === 'play' && i === bar ? 'on' : ''} ${v ? `v-${v}` : ''}`} aria-current={phase === 'play' && i === bar ? 'true' : undefined}>
                  <b>{chordSymbol(b)}</b>
                  <small>{sixSymbol(b)}</small>
                  {v && <em>{tx.verdict[v]}</em>}
                </div>
              );
            })}
          </div>

          {phase !== 'review' && curBar && (
            <section className="bht-line" aria-label={tx.suggested}>
              <small className="g2-dim">
                {phase === 'play' && bar < 0 ? tx.countIn : `${tx.suggested} · ${tx.bar} ${Math.max(0, bar) + 1}`}
              </small>
              <div className="bht-notes" dir="ltr">
                {curBar.line.map((m, k) => (
                  <span key={k} className={k % 2 === 0 ? 'beat' : ''} data-ct={chordPcs(curBar).includes(((m % 12) + 12) % 12) ? 1 : 0}>
                    {noteName(m)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {phase === 'review' && grade && (
            <section className="g2-card bht-review" aria-live="polite">
              <p className="bht-acc">
                <span>{tx.accuracy}</span> <b dir="ltr">{grade.accuracy}%</b>
              </p>
              <p className="g2-dim">
                {tx.beats}: <b dir="ltr">{Math.round(grade.beatShare * 100)}%</b> · {tx.timing}:{' '}
                <b dir="ltr">{grade.meanOffsetMs === null ? '—' : Math.abs(grade.meanOffsetMs) <= 10 ? tx.onTime : `${Math.abs(grade.meanOffsetMs)} ms ${grade.meanOffsetMs < 0 ? tx.early : tx.late}`}</b>
              </p>
              {run.input === 'touch' && <p className="g2-dim">{tx.practice}</p>}
              <button className="btn primary mega" onClick={afterReview} data-bh-next>
                {run.takes.length < TAKES ? tx.next : tx.results}
              </button>
            </section>
          )}

          {phase === 'ready' && (
            <button className="btn primary mega" onClick={() => void playTake()} data-bh-play>
              {tx.play} · {tx.take} {takeNo}
            </button>
          )}

          {phase !== 'review' && <Keys lo={LOW} hi={HIGH - 1} lit={lastKey} onKey={tapKey} label={tx.keys} />}
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card bht-review" aria-live="polite">
          <h2>{tx.over}</h2>
          <p className="bht-acc">
            <span>{tx.accuracy}</span> <b dir="ltr">{final.accuracy}%</b>
          </p>
          {final.record ? <p className="g2-best">{tx.newBest}</p> : best ? <p className="g2-dim">{tx.best}: {best}</p> : null}
          {run?.input === 'touch' && <p className="g2-dim">{tx.practice}</p>}
          <div className="g2-row">
            <button className="btn primary" onClick={() => ((autoFirst.current = true), begin(false))}>
              {tx.again}
            </button>
            <button className="btn ghost" onClick={back}>
              {tx.back}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

/** Two octaves of keys, answered on pointer-down (the time a key is pressed, not released). */
function Keys({ lo, hi, lit, onKey, label }: { lo: number; hi: number; lit: number | null; onKey: (m: number, at: number) => void; label: string }) {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  const key = (m: number, cls: string, style: React.CSSProperties) => (
    <button
      key={m}
      type="button"
      className={`${cls} ${lit === m ? 'mk ok' : ''} ${m === 60 ? 'middle-c' : ''}`}
      style={style}
      aria-label={noteName(m)}
      onPointerDown={(e) => {
        e.preventDefault();
        onKey(m, e.timeStamp || performance.now());
      }}
    />
  );
  return (
    <div className="keys-pad bht-keys" dir="ltr" role="group" aria-label={label}>
      {whites.map((m, i) => key(m, 'wk', { left: `${i * W}%`, width: `${W}%` }))}
      {whites.map((m, i) => (m + 1 <= hi && isBlack(m + 1) ? key(m + 1, 'bk', { left: `${(i + 1) * W - W * 0.32}%`, width: `${W * 0.64}%` }) : null))}
    </div>
  );
}

