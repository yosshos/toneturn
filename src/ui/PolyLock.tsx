// Polyrhythm Lock (0.70): two big pads (left hand, right hand), keys F and J, or a MIDI keyboard (below middle C =
// left). A count-in bar, two guide bars where both voices sound, then only the bar's 1 clicks — the hands keep the
// polyrhythm alone. The engine is src/engine/polyLock.ts. The pads are physical (left pad = left hand) in both languages.

import '../polylock.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { barBeatsOf, gradePoly, isPolySave, newPolySave, polyBacking, polyDone, polyPattern, polyResult, polyRounds, polyWindow, POLY_BARS, type Lane, type PolyGrade, type PolySave, type PolyTap } from '../engine/polyLock';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Polyrhythm Lock', he: 'נעילת פולי־ריתם' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Two hands, two pulses. The left pad keeps the slow pulse, the right pad the fast one. Two bars with a guide, then you hold it alone for six.', he: 'שתי ידיים, שתי פעימות. הפד השמאלי מחזיק את הפעימה האיטית, הימני את המהירה. שתי תיבות עם ליווי, ואז שש תיבות לבד.' },
  how: { en: 'Tap the pads, or keys F and J, or a MIDI keyboard (below middle C = left).', he: 'מקישים על הפדים, או על המקשים F ו־J, או על מקלדת MIDI (מתחת לדו האמצעי = שמאל).' },
  start: { en: 'Play', he: 'לנגן' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  round: { en: 'Round', he: 'סיבוב' },
  left: { en: 'Left', he: 'שמאל' },
  right: { en: 'Right', he: 'ימין' },
  listen: { en: 'Count-in…', he: 'ספירה…' },
  guide: { en: 'With the guide', he: 'עם הליווי' },
  alone: { en: 'Alone — hold it', he: 'לבד — להחזיק' },
  swap: { en: 'Swap hands now', he: 'עכשיו מחליפים ידיים' },
  ready: { en: 'Ready when you are.', he: 'מוכנים כשאתם מוכנים.' },
  next: { en: 'Next round', he: 'לסיבוב הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  hand: { en: 'hits', he: 'פגיעות' },
  stray: { en: 'stray taps', he: 'הקשות מיותרות' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  again: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
  late: { en: 'late', he: 'מאחר' },
  early: { en: 'early', he: 'מקדים' },
  onTime: { en: 'on time', he: 'בזמן' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const levelOf = (t: DynName) => Number(tierDef('polylock', t)?.levels?.[0] ?? 1);
const bpmOf = (t: DynName) => Number(tierDef('polylock', t)?.params?.bpm ?? 70);

type Phase = 'setup' | 'ready' | 'play' | 'review' | 'over';

export function PolyLock({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isPolySave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'mp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<PolySave | null>(null);
  const [grade, setGrade] = useState<PolyGrade | null>(null);
  const [bar, setBar] = useState(-1);
  const [flash, setFlash] = useState<{ L: number; R: number }>({ L: 0, R: 0 });
  const [input, setInput] = useState<'touch' | 'keys' | 'midi'>('touch');
  const [final, setFinal] = useState<ReturnType<typeof polyResult> | null>(null);

  const acRef = useRef<AbortController | null>(null);
  const originRef = useRef(0); // perf ms of bar 1's 1
  const playingRef = useRef(false);
  const tapsRef = useRef<PolyTap[]>([]);
  const inputRef = useRef<'touch' | 'keys' | 'midi'>('touch');

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
    playingRef.current = false;
  };
  useEffect(() => stop, []);

  const round = run ? polyRounds(run.level)[run.rounds.length] : null;
  const bpm = run ? bpmOf(run.tier ?? tier) : bpmOf(tier);

  /** One tap (perf ms) on a lane, latency removed by its device. */
  const tap = useCallback(
    (lane: Lane, perf: number, src: 'touch' | 'keys' | 'midi') => {
      setFlash((f) => ({ ...f, [lane]: f[lane] + 1 }));
      if (!playingRef.current) return;
      if (src !== inputRef.current && (src === 'midi' || inputRef.current === 'touch')) {
        inputRef.current = src;
        setInput(src);
      }
      const lat = src === 'midi' ? (settings.midiLatencyMs ?? 0) : (settings.tapLatencyMs ?? 0);
      tapsRef.current.push({ lane, ms: perf - originRef.current - lat });
    },
    [settings.midiLatencyMs, settings.tapLatencyMs],
  );

  // keys F / J
  useEffect(() => {
    if (phase !== 'play' && phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyF') tap('L', e.timeStamp, 'keys');
      else if (e.code === 'KeyJ') tap('R', e.timeStamp, 'keys');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, tap]);

  // MIDI: below middle C = left
  useEffect(() => {
    if (phase !== 'play' && phase !== 'ready') return;
    let unsub: (() => void) | null = null;
    void midiInput
      .enable()
      .then(() => {
        unsub = midiInput.onNote((note, on, at) => on && tap(note < 60 ? 'L' : 'R', at || performance.now(), 'midi'));
      })
      .catch(() => {});
    return () => unsub?.();
  }, [phase, tap]);

  // Owner 2026-11-13: "Play again" starts the first round at once (no second Start press).
  const autoFirst = useRef(false);
  useEffect(() => {
    if (!autoFirst.current || phase !== 'ready') return;
    autoFirst.current = false;
    const id = window.setTimeout(() => void playRound(), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run]);
  const begin = (resume: boolean) => {
    stop();
    const r = resume && resumable ? resumable : newPolySave(levelOf(tier), tierInfo ? tier : undefined);
    setRun(r);
    setGrade(null);
    setFinal(null);
    onSave(r);
    setPhase('ready');
  };

  const playRound = async () => {
    if (!run || !round) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    tapsRef.current = [];
    setGrade(null);
    setBar(-1);
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const bk = polyBacking(round, bpm);
    const bb = barBeatsOf(round);
    const beatMs = 60000 / bpm;
    setPhase('play');
    originRef.current = performance.now() + 120 + bk.responseAt * 1000;
    playingRef.current = true;
    const hats: NoteEvent[] = bk.hats.map((t) => ({ midi: 0, start: t + 0.06, duration: 0.04, velocity: 0.3, perc: 'hat' }));
    if (hats.length) void piano.play(hats, bk.responseEnd + 0.2, ac.signal).catch(() => {});
    const tick = window.setInterval(() => {
      const ms = performance.now() - originRef.current;
      setBar(ms < 0 ? -1 : Math.min(POLY_BARS - 1, Math.floor(ms / (bb * beatMs))));
    }, 60);
    ac.signal.addEventListener('abort', () => clearInterval(tick), { once: true });
    try {
      await piano.playTimeline({ clicks: bk.clicks, wood: bk.wood, drums: bk.drums, responseAt: bk.responseAt, responseEnd: bk.responseEnd }, ac.signal, undefined, (perf) => {
        originRef.current = perf;
      });
    } catch {
      clearInterval(tick);
      return; // left the screen
    }
    clearInterval(tick);
    if (acRef.current !== ac) return;
    playingRef.current = false;
    const g = gradePoly(polyPattern(round), tapsRef.current, bpm, polyWindow(round, bpm));
    setGrade(g);
    const next: PolySave = { ...run, rounds: [...run.rounds, { accuracy: g.accuracy, hitsL: g.L.total ? g.L.hits / g.L.total : 0, hitsR: g.R.total ? g.R.hits / g.R.total : 0 }] };
    setRun(next);
    if (polyDone(next)) {
      onSave(null);
      const res = polyResult(next, inputRef.current);
      setFinal(res);
      onResult(res);
    } else onSave(next);
    setPhase('review');
  };

  const back = () => {
    stop();
    onExit();
  };

  const offWord = (o: number[]) => {
    if (!o.length) return '';
    const m = Math.round(o.reduce((a, b) => a + b, 0) / o.length);
    return Math.abs(m) <= 12 ? tx(TX.onTime, lang) : `${Math.abs(m)} ms ${tx(m > 0 ? TX.late : TX.early, lang)}`;
  };
  const roundsN = run ? polyRounds(run.level).length : 2;
  const shown = round ?? (run ? polyRounds(run.level)[run.rounds.length - 1] : null);

  return (
    <main className={`panel-screen g2 poly ${calm ? 'g2-calm' : ''}`} data-game="polylock" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.min(roundsN, run.rounds.length + (phase === 'review' || phase === 'over' ? 0 : 1))}/{roundsN}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          <p className="g2-dim">{tx(TX.how, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="polylock" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {tx(TX.round, lang)} {resumable.rounds.length + 1}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-poly-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {phase !== 'setup' && phase !== 'over' && shown && (
        <>
          <div className="poly-ratio" dir="ltr" aria-live="polite">
            <b>{shown.fast}</b>
            <span>:</span>
            <b>{shown.slow}</b>
            <small>♩ {bpm}</small>
          </div>
          <div className="poly-bars" dir="ltr" aria-hidden="true">
            {Array.from({ length: POLY_BARS }, (_, i) => (
              <span key={i} className={`${i < 2 ? 'guide' : ''} ${i === bar && phase === 'play' ? 'now' : ''} ${shown.swapAt === i ? 'swap' : ''}`} />
            ))}
          </div>
          <p className="adv-line">
            {phase === 'ready'
              ? tx(TX.ready, lang)
              : phase === 'play'
                ? bar < 0
                  ? tx(TX.listen, lang)
                  : shown.swapAt !== undefined && bar >= shown.swapAt
                    ? tx(TX.swap, lang)
                    : bar < 2
                      ? tx(TX.guide, lang)
                      : tx(TX.alone, lang)
                : grade
                  ? `${tx(TX.accuracy, lang)} ${grade.accuracy}%`
                  : ''}
          </p>
          <div className="poly-pads" dir="ltr">
            {(['L', 'R'] as const).map((l) => {
              const lane = l === 'L' ? grade?.L : grade?.R;
              const swapped = shown.swapAt !== undefined && bar >= shown.swapAt && phase === 'play';
              const count = (l === 'R') !== swapped ? shown.fast : shown.slow;
              return (
                <button
                  key={l}
                  type="button"
                  className={`poly-pad pad-${l}`}
                  data-poly-pad={l}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tap(l, e.timeStamp, 'touch');
                  }}
                >
                  <span key={flash[l]} className={calm ? '' : 'poly-ring'} aria-hidden="true" />
                  <b>{tx(l === 'L' ? TX.left : TX.right, lang)}</b>
                  <small dir="ltr">{count}</small>
                  {phase === 'review' && lane && (
                    <em>
                      <bdi dir="ltr">
                        {lane.hits}/{lane.total}
                      </bdi>{' '}
                      {tx(TX.hand, lang)}
                      {lane.extra ? ` · ${lane.extra} ${tx(TX.stray, lang)}` : ''}
                      <br />
                      {offWord(lane.offsets)}
                    </em>
                  )}
                </button>
              );
            })}
          </div>
          {phase === 'ready' && (
            <button className="btn primary mega" onClick={() => void playRound()} data-poly-play>
              {tx(TX.start, lang)}
            </button>
          )}
          {phase === 'review' && (
            <button className="btn primary mega" onClick={() => (final ? setPhase('over') : void playRound())}>
              {final ? tx(TX.finish, lang) : tx(TX.next, lang)}
            </button>
          )}
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="poly-final">
            <span>{tx(TX.accuracy, lang)}</span> <b dir="ltr">{final.detail.accuracy}%</b>
          </p>
          <p className="g2-dim" dir="ltr">
            {tx(TX.left, lang)} {Math.round(final.detail.hitsL * 100)}% · {tx(TX.right, lang)} {Math.round(final.detail.hitsR * 100)}% · {input}
          </p>
          <div className="g2-row">
            <button className="btn primary" onClick={() => ((autoFirst.current = true), begin(false))}>
              {tx(TX.again, lang)}
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
