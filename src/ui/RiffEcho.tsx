// Odd-Meter Riff Echo (0.70): hear an original riff in 5, 7, 9, 11 or 13 (with the click on the group starts), then
// play it back on your instrument — microphone (pitch onsets, latency-corrected) or MIDI. Up to six riffs, three lives:
// a take under 70 % costs one. The engine is src/engine/riffEcho.ts. The bar strip is physical (left = first) in both
// languages.

import '../riffecho.css';
import { useEffect, useRef, useState } from 'react';
import { addTake, barEighths, gradeTake, isRiffSave, newRiffSave, riffAt, riffClicks, riffEvents, riffInstrument, riffOver, riffResult, RIFF_LIVES, RIFF_PASS, RIFFS_PER_RUN, type PlayedNote, type Riff, type RiffSave, type TakeGrade } from '../engine/riffEcho';
import { MIC_PITCH_LAG_MS, OnsetTracker } from '../engine/highway';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { midi as midiInput } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
type Input = 'mic' | 'midi';
const TX = {
  title: { en: 'Odd-Meter Riff Echo', he: 'הד ריפים במשקל אי־זוגי' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'A short riff in an odd meter, with a click on each group. Listen, then play it back on your instrument after the count-in. Six riffs, three lives.', he: 'ריף קצר במשקל אי־זוגי, עם קליק על כל קבוצה. מקשיבים, ואז מנגנים אותו בחזרה על הכלי אחרי הספירה. שישה ריפים, שלושה חיים.' },
  input: { en: 'Play into', he: 'לנגן דרך' },
  mic: { en: 'Microphone', he: 'מיקרופון' },
  midiIn: { en: 'MIDI', he: 'MIDI' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  riff: { en: 'Riff', he: 'ריף' },
  lives: { en: 'Lives', he: 'חיים' },
  avg: { en: 'Average', he: 'ממוצע' },
  listen: { en: 'Listen', he: 'להקשיב' },
  again: { en: 'Listen again', he: 'להקשיב שוב' },
  play: { en: 'Play it back', he: 'לנגן בחזרה' },
  hearing: { en: 'Listening to the riff…', he: 'שומעים את הריף…' },
  yourTurn: { en: 'Your turn — after the count-in', he: 'תורכם — אחרי הספירה' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  micErr: { en: 'The microphone did not open. Try MIDI, or allow the microphone.', he: 'המיקרופון לא נפתח. נסו MIDI, או אשרו גישה למיקרופון.' },
  next: { en: 'Next riff', he: 'לריף הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  take: { en: 'Take', he: 'טייק' },
  hit: { en: 'right', he: 'נכונים' },
  wrongNote: { en: 'wrong note', he: 'תו שגוי' },
  missed: { en: 'missed', he: 'חסרים' },
  extra: { en: 'extra', he: 'מיותרים' },
  lifeLost: { en: 'Under 70 % — one life lost.', he: 'מתחת ל־70% — ירד חיים אחד.' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
  late: { en: 'late', he: 'מאחר' },
  early: { en: 'early', he: 'מקדים' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const paramsOf = (t: DynName) => {
  const d = tierDef('riffecho', t);
  return { level: Number(d?.levels?.[0] ?? 1), bpm: Number(d?.params?.bpm ?? 90), grouping: d?.params?.grouping !== false };
};

type Phase = 'setup' | 'ready' | 'hear' | 'open' | 'play' | 'review' | 'over' | 'mic-error';

export function RiffEcho({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const inst = riffInstrument(settings.activeCourse);
  const resumable = isRiffSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'mp'));
  const [input, setInput] = useState<Input>(inst === 'keys' ? 'midi' : 'mic');
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<RiffSave | null>(null);
  const [grade, setGrade] = useState<TakeGrade | null>(null);
  const [cell, setCell] = useState(-1);
  const [final, setFinal] = useState<ReturnType<typeof riffResult> | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stop, []);

  const riff: Riff | null = run ? riffAt(run, phase === 'review' ? run.takes.length - 1 : run.takes.length) : null;
  const grouping = paramsOf(run?.tier ?? tier).grouping;

  // Owner 2026-11-13: "Play again" starts the first round at once (no second Start press).
  const autoFirst = useRef(false);
  useEffect(() => {
    if (!autoFirst.current || phase !== 'ready') return;
    autoFirst.current = false;
    const id = window.setTimeout(() => void hear(), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run]);
  const begin = (resume: boolean) => {
    stop();
    const p = paramsOf(tier);
    const r = resume && resumable ? resumable : newRiffSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, p.level, p.bpm, inst, tierInfo ? tier : undefined);
    setRun(r);
    setGrade(null);
    setFinal(null);
    onSave(r);
    setPhase('ready');
  };

  /** Light the eighth cells while a timeline plays (origin = perf ms of the riff's first eighth). */
  const follow = (ac: AbortController, origin: () => number, r: Riff, bpm: number) => {
    const e = 30000 / bpm;
    const id = window.setInterval(() => {
      const ms = performance.now() - origin();
      setCell(ms < 0 || ms > r.eighths * e ? -1 : Math.floor(ms / e));
    }, 40);
    ac.signal.addEventListener('abort', () => clearInterval(id), { once: true });
    return () => clearInterval(id);
  };

  const hear = async () => {
    if (!run || !riff) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setPhase('hear');
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const c = riffClicks(riff, run.bpm);
    let origin = performance.now() + 120 + c.startAt * 1000;
    const end = follow(ac, () => origin, riff, run.bpm);
    // `play` schedules 60 ms ahead, `playTimeline` 120 ms — shift to line them up (as Highway does).
    void piano.play(riffEvents(riff, run.bpm, run.inst, c.startAt + 0.06), c.endAt + 0.6, ac.signal).catch(() => {});
    try {
      await piano.playTimeline({ clicks: c.clicks.map((k) => ({ ...k, soft: !k.count })), wood: [], responseAt: c.startAt, responseEnd: c.endAt + 0.3 }, ac.signal, undefined, (perf) => {
        origin = perf;
      });
    } catch {
      end();
      return;
    }
    end();
    setCell(-1);
    if (acRef.current === ac) setPhase('ready');
  };

  const take = async () => {
    if (!run || !riff) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setGrade(null);
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const played: { perf: number; midi: number; lat: number }[] = [];
    const c = riffClicks(riff, run.bpm);
    if (input === 'midi') {
      try {
        await midiInput.enable();
      } catch {
        /* no MIDI: nothing will be heard */
      }
      const unsub = midiInput.onNote((note, on, at) => on && played.push({ perf: at || performance.now(), midi: note, lat: settings.midiLatencyMs ?? 0 }));
      ac.signal.addEventListener('abort', unsub, { once: true });
    } else {
      setPhase('open');
      const tracker = new OnsetTracker({ minMidi: inst === 'bass' ? 26 : 38 });
      let capStart = 0;
      const lat = settings.micLatencyMs ?? MIC_PITCH_LAG_MS;
      const total = (c.endAt + 2) * 1000;
      const ok = await new Promise<boolean>((resolve) => {
        void new BrowserPitchCapture()
          .sing({
            signal: ac.signal,
            maxMs: total + 4000,
            silenceMs: total + 4000,
            endSilenceMs: 1e9,
            hopMs: 20,
            minHz: inst === 'bass' ? 35 : undefined,
            onCapturing: () => {
              capStart = performance.now();
              resolve(true);
            },
            onFrame: (f) => {
              const on = tracker.feed({ ms: capStart + f.t * 1000, hz: f.hz, confidence: f.confidence, rms: f.rms });
              if (on) played.push({ perf: on.ms, midi: on.midi, lat });
            },
          })
          .then((r) => {
            if (r.kind === 'error' || (r.kind === 'silence' && !capStart)) resolve(false);
          });
      });
      if (ac.signal.aborted) return;
      if (!ok) {
        stop();
        setPhase('mic-error');
        return;
      }
    }
    setPhase('play');
    let origin = performance.now() + 120 + c.startAt * 1000;
    const end = follow(ac, () => origin, riff, run.bpm);
    try {
      await piano.playTimeline({ clicks: c.clicks.map((k) => ({ ...k, soft: !k.count })), wood: [], responseAt: c.startAt, responseEnd: c.endAt + 0.6 }, ac.signal, undefined, (perf) => {
        origin = perf;
      });
    } catch {
      end();
      return;
    }
    end();
    setCell(-1);
    if (acRef.current !== ac) return;
    stop();
    const notes: PlayedNote[] = played.map((p) => ({ ms: p.perf - origin - p.lat, midi: p.midi })).filter((p) => p.ms > -400);
    const g = gradeTake(riff, notes, run.bpm);
    setGrade(g);
    const next = addTake(run, g.score);
    setRun(next);
    if (riffOver(next)) {
      onSave(null);
      const res = riffResult(next, input);
      setFinal(res);
      onResult(res);
    } else onSave(next);
    setPhase('review');
  };

  const back = () => {
    stop();
    onExit();
  };

  const avg = run && run.takes.length ? Math.round(run.takes.reduce((a, b) => a + b, 0) / run.takes.length) : null;
  const markAt = (i: number): string => {
    if (phase !== 'review' || !grade || !riff) return '';
    const k = riff.notes.findIndex((n) => n.at === i);
    return k < 0 ? '' : grade.marks[k];
  };

  return (
    <main className={`panel-screen g2 riff ${calm ? 'g2-calm' : ''}`} data-game="riffecho" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.min(RIFFS_PER_RUN, run.takes.length + (phase === 'review' || phase === 'over' ? 0 : 1))}/{RIFFS_PER_RUN}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          <fieldset className="seg-field">
            <legend>{tx(TX.input, lang)}</legend>
            <div className="seg g2-seg" role="radiogroup" aria-label={tx(TX.input, lang)}>
              {(['mic', 'midi'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={input === k} className={input === k ? 'on' : ''} onClick={() => setInput(k)}>
                  {tx(k === 'mic' ? TX.mic : TX.midiIn, lang)}
                </button>
              ))}
            </div>
          </fieldset>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="riffecho" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {tx(TX.riff, lang)} {resumable.takes.length + 1}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-riff-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {phase === 'mic-error' && (
        <section className="g2-card">
          <p>{tx(TX.micErr, lang)}</p>
          <button className="btn primary" onClick={() => setPhase('ready')}>
            {tx(TX.back, lang)}
          </button>
        </section>
      )}

      {run && riff && phase !== 'setup' && phase !== 'over' && phase !== 'mic-error' && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.riff, lang)}</small>
              <b dir="ltr">
                {Math.min(RIFFS_PER_RUN, run.takes.length + (phase === 'review' ? 0 : 1))}/{RIFFS_PER_RUN}
              </b>
            </span>
            <span>
              <small>{tx(TX.lives, lang)}</small>
              <b dir="ltr">
                {run.lives}/{RIFF_LIVES}
              </b>
            </span>
            <span>
              <small>{tx(TX.avg, lang)}</small>
              <b dir="ltr">{avg === null ? '–' : `${avg}%`}</b>
            </span>
          </div>
          <div className="riff-meter" dir="ltr">
            {riff.bars.map((b, bi) => (
              <span key={bi} className="riff-sig">
                {b.meter}
                {grouping && <small>{b.groups.join('+')}</small>}
              </span>
            ))}
            <small className="riff-bpm">♩ {run.bpm}</small>
          </div>
          <div className="riff-strip" dir="ltr" aria-hidden="true">
            {(() => {
              let i = 0;
              return riff.bars.map((b, bi) => (
                <div key={bi} className="riff-bar" style={{ flexGrow: barEighths(b) }}>
                  {b.groups.map((g, gi) => (
                    <div key={gi} className={`riff-group ${grouping ? 'shown' : ''}`} style={{ flexGrow: g }}>
                      {Array.from({ length: g }, () => {
                        const k = i++;
                        const n = riff.notes.find((x) => x.at === k);
                        const lit = phase === 'review' || phase === 'hear';
                        return <span key={k} className={`riff-cell ${k === cell ? 'now' : ''} ${lit && n ? 'note' : ''} ${lit && n?.accent ? 'acc' : ''} ${markAt(k)}`} />;
                      })}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
          <p className={`adv-line ${phase === 'review' && grade ? (grade.score >= RIFF_PASS ? 'ok' : 'bad') : ''}`} aria-live="polite">
            {phase === 'hear'
              ? tx(TX.hearing, lang)
              : phase === 'open'
                ? tx(TX.opening, lang)
                : phase === 'play'
                  ? tx(TX.yourTurn, lang)
                  : phase === 'review' && grade
                    ? `${tx(TX.take, lang)} ${grade.score}%`
                    : ''}
          </p>
          {phase === 'review' && grade && (
            <p className="g2-dim riff-detail">
              {grade.marks.filter((m) => m === 'hit').length} {tx(TX.hit, lang)} · {grade.marks.filter((m) => m === 'pitch').length} {tx(TX.wrongNote, lang)} · {grade.marks.filter((m) => m === 'miss').length} {tx(TX.missed, lang)}
              {grade.extra ? ` · ${grade.extra} ${tx(TX.extra, lang)}` : ''}
              {grade.meanOffsetMs !== null && Math.abs(grade.meanOffsetMs) > 15 ? ` · ${Math.abs(grade.meanOffsetMs)} ms ${tx(grade.meanOffsetMs > 0 ? TX.late : TX.early, lang)}` : ''}
              {grade.score < RIFF_PASS ? ` · ${tx(TX.lifeLost, lang)}` : ''}
            </p>
          )}
          <div className="g2-col riff-actions">
            {phase === 'ready' && (
              <>
                <button className="btn" onClick={() => void hear()} data-riff-hear>
                  {tx(TX.listen, lang)}
                </button>
                <button className="btn primary mega" onClick={() => void take()} data-riff-play>
                  {tx(TX.play, lang)}
                </button>
              </>
            )}
            {phase === 'review' && (
              <button className="btn primary mega" onClick={() => (final ? setPhase('over') : (setGrade(null), setPhase('ready')))}>
                {final ? tx(TX.finish, lang) : tx(TX.next, lang)}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="riff-final">
            <span>{tx(TX.accuracy, lang)}</span> <b dir="ltr">{final.detail.accuracy}%</b>
          </p>
          <p className="g2-dim" dir="ltr">
            {run?.takes.map((x) => `${x}%`).join(' · ')}
          </p>
          <div className="g2-row">
            <button className="btn primary" onClick={() => ((autoFirst.current = true), begin(false))}>
              {tx(TX.playAgain, lang)}
            </button>
            <button className="btn ghost" onClick={back}>
              {tx(TX.back, lang)}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
