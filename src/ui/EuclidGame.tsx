// Euclid (אוקלידס, owner 2026-11-19): Euclidean rhythms on a circle. A count-in (woodblock), then the circle of n pulses
// loops twice with a click on every pulse and the hits on a low drum; the now-cue walks round the circle. Set the hits
// on the circle to match (or spread k evenly, no sound), Check — faster scores more. From mf the rhythm is rotated;
// ff: tap it back on the pad in time over two cycles, the click and the now-cue running. Saved after every round.
// Engine: src/engine/euclid.ts.

import { useEffect, useRef, useState } from 'react';
import { EUCLID_COUNT_IN, EUCLID_CYCLES, EUCLID_ITEMS, euclidAnswer, euclidItem, euclidLevel, euclidOver, euclidPpm, euclidResult, euclidWhy, isEuclidSave, judgeSlots, judgeTaps, newEuclidSave, onsetsOf, patternFrom, type EuclidItem, type EuclidSave } from '../engine/euclid';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { BeatDots, WhyLine } from './NewGameBits';
import { RhythmCircle, type SlotMark } from './RhythmCircle';
import { Icon } from './icons';

const TX = {
  en: {
    title: 'Euclid',
    back: 'Back',
    blurb: 'A circle of pulses loops with a click. Listen, then set the hits on the circle to match. Faster scores more.',
    blurbTap: 'Listen to the circle, then tap the rhythm back on the pad in time, two times round.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    score: 'Score',
    listen: 'Listen to the circle',
    build: 'Set the hits you heard',
    spread: (k: number, n: number) => `Spread ${k} hits evenly over ${n}`,
    tapNow: 'Tap the hits in time',
    tapReady: 'Count-in, then tap',
    pad: 'Tap',
    check: 'Check',
    again: 'Hear again',
    right: 'Right',
    wrong: 'Not this one',
    taps: (h: number, t: number) => `${h} of ${t} hits on time`,
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
  },
  he: {
    title: 'אוקלידס',
    back: 'חזרה',
    blurb: 'מעגל של משבצות מסתובב עם קליק. מקשיבים, ואז מסמנים על המעגל את המכות ששמעתם. מהר יותר = יותר נקודות.',
    blurbTap: 'מקשיבים למעגל, ואז מקישים את המקצב בחזרה על המשטח, בזמן, פעמיים מסביב.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    score: 'ניקוד',
    listen: 'הקשיבו למעגל',
    build: 'סמנו את המכות ששמעתם',
    spread: (k: number, n: number) => `פזרו ${k} מכות באופן שווה על ${n}`,
    tapNow: 'הקישו את המכות בזמן',
    tapReady: 'ספירה, ואז מקישים',
    pad: 'להקיש',
    check: 'לבדוק',
    again: 'לשמוע שוב',
    right: 'נכון',
    wrong: 'לא זה',
    taps: (h: number, t: number) => `${h} מתוך ${t} מכות בזמן`,
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
  },
};
type Phase = 'setup' | 'listen' | 'build' | 'tap' | 'answered' | 'over';

/** Count-in (woodblock, two pulses apart), then EUCLID_CYCLES cycles: a click on every pulse, the hits on the drum. */
function circleTimeline(item: EuclidItem, ppm: number, withHits: boolean) {
  const pulse = 60 / ppm;
  const lead = EUCLID_COUNT_IN * 2 * pulse;
  const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  for (let k = 0; k < EUCLID_COUNT_IN; k++) clicks.push({ t: k * 2 * pulse, accent: k === 0, count: true });
  const wood: number[] = [];
  const drums: ('k' | 's')[] = [];
  const on = onsetsOf(item.pattern);
  for (let c = 0; c < EUCLID_CYCLES; c++)
    for (let i = 0; i < item.n; i++) {
      const t = lead + (c * item.n + i) * pulse;
      clicks.push({ t, accent: i === 0, soft: i !== 0 });
      if (withHits && on.includes(i)) {
        wood.push(t);
        drums.push('k');
      }
    }
  return { clicks, wood, drums, responseAt: lead, responseEnd: lead + EUCLID_CYCLES * item.n * pulse + 0.25 };
}

export function EuclidGame({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isEuclidSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<EuclidSave | null>(null);
  /** The count-in click (0–3) or −1; the pulse sounding (0…n·cycles − 1) or −1. */
  const [countNow, setCountNow] = useState(-1);
  const [pulseNow, setPulseNow] = useState(-1);
  const [slots, setSlots] = useState<number[]>([]);
  const [taps, setTaps] = useState(0);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string; marks?: SlotMark[]; shown: string } | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const origin = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const askedAt = useRef(0);
  const runRef = useRef<EuclidSave | null>(null);
  runRef.current = run;

  const item: EuclidItem | null = run && !euclidOver(run) ? euclidItem(run.seed, run.level, run.i) : null;
  const shown: EuclidItem | null = phase === 'answered' && run ? euclidItem(run.seed, run.level, run.i - 1) : item;
  const ppm = euclidPpm(run?.level ?? euclidLevel(tier));

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
  };
  useEffect(() => () => stop(), []);

  /** Play the circle (with or without the hits) and follow it on screen; resolves at the end (false = aborted). */
  const playCircle = async (it: EuclidItem, tempo: number, withHits: boolean): Promise<boolean> => {
    stop();
    const a = new AbortController();
    ac.current = a;
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    if (a.signal.aborted) return false;
    const pulseMs = 60000 / tempo;
    const lead = EUCLID_COUNT_IN * 2 * pulseMs;
    origin.current = performance.now() + 120 + lead;
    const watch = window.setInterval(() => {
      const ms = performance.now() - origin.current;
      if (ms < 0) {
        const c = Math.floor((ms + lead) / (2 * pulseMs));
        setCountNow(c >= 0 && c < EUCLID_COUNT_IN ? c : -1);
        setPulseNow(-1);
      } else {
        const p = Math.floor(ms / pulseMs);
        setCountNow(-1);
        setPulseNow(p < EUCLID_CYCLES * it.n ? p : -1);
      }
    }, 30);
    a.signal.addEventListener('abort', () => window.clearInterval(watch), { once: true });
    try {
      await piano.playTimeline(circleTimeline(it, tempo, withHits), a.signal, undefined, (perf) => {
        origin.current = perf;
      });
    } catch {
      window.clearInterval(watch);
      return false;
    }
    window.clearInterval(watch);
    setCountNow(-1);
    setPulseNow(-1);
    return !a.signal.aborted;
  };

  const startItem = async (r: EuclidSave) => {
    const it = euclidItem(r.seed, r.level, r.i);
    setSlots([]);
    setVerdict(null);
    tapsRef.current = [];
    setTaps(0);
    if (it.mode === 'spread') {
      stop();
      askedAt.current = performance.now();
      setPhase('build');
      return;
    }
    setPhase('listen');
    if (!(await playCircle(it, euclidPpm(r.level), true))) return;
    if (it.mode === 'tap') {
      setPhase('tap');
      if (!(await playCircle(it, euclidPpm(r.level), false))) return;
      judgeTap();
      return;
    }
    askedAt.current = performance.now();
    setPhase('build');
  };

  const hearAgain = async () => {
    const r = runRef.current;
    if (!r || phase !== 'build') return;
    const it = euclidItem(r.seed, r.level, r.i);
    if (it.mode !== 'match') return;
    await playCircle(it, euclidPpm(r.level), true);
  };

  const tap = () => {
    if (phase !== 'tap') return;
    const pulse = (performance.now() - origin.current) / (60000 / ppm);
    if (pulse < -0.6) return;
    tapsRef.current = [...tapsRef.current, pulse];
    setTaps(tapsRef.current.length);
  };

  const finish = (r: EuclidSave, ok: boolean, text: string, shownPattern: string, marks?: SlotMark[]) => {
    const seconds = (performance.now() - askedAt.current) / 1000;
    const { save, gained } = euclidAnswer(r, ok, seconds);
    setRun(save);
    setVerdict({ ok, text: ok ? `${text}${text ? ' · ' : ''}${tx.right} · +${gained}` : text || tx.wrong, marks, shown: shownPattern });
    if (!euclidOver(save)) onSave(save);
    setPhase('answered');
  };

  const judgeTap = () => {
    const r = runRef.current;
    if (!r) return;
    const it = euclidItem(r.seed, r.level, r.i);
    askedAt.current = performance.now();
    const j = judgeTaps(it, tapsRef.current);
    // the circle's marks: an onset caught in both cycles = hit, else miss
    const marks: SlotMark[] = Array.from({ length: it.n }, () => undefined);
    onsetsOf(it.pattern).forEach((o, k) => {
      const per = onsetsOf(it.pattern).length;
      marks[o] = j.marks[k] && j.marks[k + per] ? 'hit' : 'miss';
    });
    finish(r, j.exact, tx.taps(j.hits, j.total), it.pattern, marks);
  };

  const check = () => {
    const r = runRef.current;
    if (!r || phase !== 'build' || !slots.length) return;
    stop();
    const it = euclidItem(r.seed, r.level, r.i);
    const picked = patternFrom(it.n, slots);
    const j = judgeSlots(it, picked);
    finish(r, j.exact, j.exact ? '' : tx.wrong, picked);
  };

  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newEuclidSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, euclidLevel(tier), tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    void startItem(r);
  };
  const end = (r: EuclidSave) => {
    stop();
    onSave(null);
    const res = euclidResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };
  const next = () => {
    const r = runRef.current;
    if (!r) return;
    if (euclidOver(r)) return end(r);
    void startItem(r);
  };
  useEffect(() => {
    if (phase !== 'answered' || !verdict?.ok) return;
    const id = window.setTimeout(next, 1400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verdict]);

  const back = () => {
    stop();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng eu ${calm ? 'g2-calm' : ''}`} data-game="euclid" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={euclidLevel(tier) >= 6 ? tx.blurbTap : tx.blurb} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="euclid" />}
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx.cont(resumable.i + 1)}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx.newRun}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-ng-start>
              {tx.start}
            </button>
          )}
        </section>
      </main>
    );

  if (phase === 'over' && run) {
    const r = euclidResult(run);
    return (
      <main className={`panel-screen g2 ng eu ${calm ? 'g2-calm' : ''}`} data-game="euclid" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  if (!run || !shown) return null;
  const answered = phase === 'answered';
  const nowSlot = pulseNow >= 0 ? pulseNow % shown.n : -1;
  // what the circle shows: the slots being set; the result (yours, the target faint); nothing while listening
  const circlePattern = answered ? (verdict?.shown ?? '') : phase === 'build' ? patternFrom(shown.n, slots) : undefined;
  const ghost = answered && !verdict?.ok ? (shown.mode === 'spread' ? undefined : shown.pattern) : undefined;
  const ask = phase === 'listen' ? tx.listen : phase === 'tap' ? (countNow >= 0 ? tx.tapReady : tx.tapNow) : shown.mode === 'spread' ? tx.spread(shown.k, shown.n) : tx.build;
  const toggle = (i: number) => setSlots((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  return (
    <main className={`panel-screen g2 ng eu eu-play ${calm ? 'g2-calm' : ''}`} data-game="euclid" data-phase={phase} data-mode={shown.mode}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(EUCLID_ITEMS, run.i + (answered ? 0 : 1))}/{EUCLID_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small dir="ltr">E(k, n)</small>
          <b dir="ltr">{shown.mode === 'spread' || answered ? `E(${shown.k},${shown.n})` : `E(?,${shown.n})`}</b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
        <span>
          <small>{lang === "he" ? "טמפו" : "Tempo"}</small>
          <b dir="ltr">{ppm}</b>
        </span>
      </div>
      <div className="eu-stage">
        <BeatDots countIn={EUCLID_COUNT_IN} beats={0} now={countNow} />
        <RhythmCircle n={shown.n} pattern={circlePattern} size={248} now={nowSlot} onToggle={phase === 'build' ? toggle : undefined} marks={answered ? verdict?.marks : undefined} ghost={ghost} />
      </div>
      <p className="hn-ask">
        <IsoMix text={ask} />
      </p>
      {phase === 'tap' || (phase === 'listen' && shown.mode === 'tap') ? (
        <button type="button" className="btn primary mega eu-pad" onPointerDown={tap} disabled={phase !== 'tap'} data-eu-pad>
          {tx.pad}
          {taps > 0 && <small dir="ltr"> · {taps}</small>}
        </button>
      ) : phase === 'build' ? (
        <div className="eu-row">
          {shown.mode === 'match' && (
            <button type="button" className="btn ghost eu-icon" onClick={() => void hearAgain()} aria-label={tx.again} title={tx.again} data-eu-again>
              <Icon k="repeat" />
            </button>
          )}
          <button type="button" className="btn primary mega" disabled={!slots.length} onClick={check} data-eu-check>
            {tx.check}
            <small dir="ltr"> · {slots.length}</small>
          </button>
        </div>
      ) : null}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok ? euclidWhy(shown, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-eu-next>
          {euclidOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
