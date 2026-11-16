// Dark Side (REHARM-AND-COLOR C.3): modal interchange by ear, in time. A one-bar count-in (woodblock), then a 4-bar
// loop with a click on every beat and the now-cue on the beat dots; tap Now when the borrowed chord arrives (earlier in
// its bar scores more), then name it. f: two or three borrowed chords (tap each), named as chord symbols in the key;
// ff: + borrowing in minor. Saved after every loop. Engine: src/engine/darkSide.ts.

import { useEffect, useRef, useState } from 'react';
import { DARK_BARS, DARK_COUNT_IN, DARK_ITEMS, barSymbol, darkAnswer, darkBpm, darkItem, darkLevel, darkOver, darkResult, darkWhy, isDarkSave, keyName, newDarkSave, type DarkItem, type DarkSave } from '../engine/darkSide';
import { CT_Q } from '../engine/commonTone';
import { pc } from '../engine/newGamesKit';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { BeatDots, Sym, WhyLine } from './NewGameBits';

const TX = {
  en: {
    title: 'Dark Side',
    back: 'Back',
    blurb: 'A loop in a major key. One chord comes from the dark side (the parallel minor or another mode): tap Now the moment it arrives, then name it.',
    blurbF: 'Two or three borrowed chords in the loop: tap each one, then name the last as a chord in the key.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    score: 'Score',
    key: 'Key',
    now: 'Now',
    listen: 'Tap when the borrowed chord comes',
    name: 'Name the marked chord',
    caught: (n: number, of: number) => `Caught ${n} of ${of}`,
    missed: 'Missed the moment',
    right: 'Right',
    wrong: 'Not this one',
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
  },
  he: {
    title: 'הצד האפל',
    back: 'חזרה',
    blurb: 'לופ בסולם מז׳ור. אקורד אחד מגיע מהצד האפל (המינור המקביל או מודוס אחר): מקישים „עכשיו” ברגע שהוא מגיע, ואז נותנים לו שם.',
    blurbF: 'שניים או שלושה אקורדים שאולים בלופ: מקישים על כל אחד, ואז נותנים שם לאחרון כאקורד בסולם.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    score: 'ניקוד',
    key: 'סולם',
    now: 'עכשיו',
    listen: 'מקישים כשהאקורד השאול מגיע',
    name: 'איזה אקורד מסומן?',
    caught: (n: number, of: number) => `נתפסו ${n} מתוך ${of}`,
    missed: 'הרגע התפספס',
    right: 'נכון',
    wrong: 'לא זה',
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
  },
};
type Phase = 'setup' | 'listen' | 'name' | 'answered' | 'over';

/** The loop's band: each bar's chord in one compact register (G3–F♯4) on beats 1 and 3, its root in the bass. */
function loopEvents(item: DarkItem, bpm: number, t0: number): NoteEvent[] {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  item.loop.bars.forEach((bar, k) => {
    const root = pc(item.loop.key + bar.d);
    const tones = [...new Set(CT_Q[bar.q].ints.map((x) => pc(root + x)))].map((p) => 55 + pc(p - 55));
    for (const half of [0, 2]) {
      const t = t0 + (k * 4 + half) * beat;
      for (const m of tones) ev.push({ midi: m, start: t, duration: 1.9 * beat, velocity: half ? 0.3 : 0.36 });
      ev.push({ midi: 36 + pc(root - 36), start: t, duration: 1.9 * beat, velocity: 0.55, inst: 'bass' });
    }
  });
  return ev;
}
/** Count-in (woodblock) then a click on every beat, the downbeats accented. */
function loopTimeline(bpm: number) {
  const beat = 60 / bpm;
  const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  for (let k = 0; k < DARK_COUNT_IN; k++) clicks.push({ t: k * beat, accent: k === 0, count: true });
  for (let b = 0; b < DARK_BARS * 4; b++) clicks.push({ t: (DARK_COUNT_IN + b) * beat, accent: b % 4 === 0, soft: b % 4 !== 0 });
  return { clicks, wood: [] as number[], responseAt: DARK_COUNT_IN * beat, responseEnd: (DARK_COUNT_IN + DARK_BARS * 4) * beat + 0.2 };
}

export function DarkSide({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isDarkSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<DarkSave | null>(null);
  const [beatNow, setBeatNow] = useState(-1);
  const [taps, setTaps] = useState<number[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string; hits: number[] } | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const origin = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const runRef = useRef<DarkSave | null>(null);
  runRef.current = run;

  const item: DarkItem | null = run && !darkOver(run) ? darkItem(run.seed, run.level, run.i) : null;
  const shown: DarkItem | null = phase === 'answered' && run ? darkItem(run.seed, run.level, run.i - 1) : item;
  const bpm = darkBpm(run?.level ?? darkLevel(tier));

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
  };
  useEffect(() => () => stop(), []);

  const playLoop = async (r: DarkSave) => {
    stop();
    const a = new AbortController();
    ac.current = a;
    const it = darkItem(r.seed, r.level, r.i);
    const tempo = darkBpm(r.level);
    const beatMs = 60000 / tempo;
    tapsRef.current = [];
    setTaps([]);
    setPicked(null);
    setVerdict(null);
    setPhase('listen');
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    if (a.signal.aborted) return;
    origin.current = performance.now() + 120 + DARK_COUNT_IN * beatMs;
    const tl = loopTimeline(tempo);
    const watch = window.setInterval(() => {
      const b = Math.floor((performance.now() - origin.current) / beatMs) + DARK_COUNT_IN;
      setBeatNow(b >= 0 && b < DARK_COUNT_IN + DARK_BARS * 4 ? b : -1);
    }, 40);
    a.signal.addEventListener('abort', () => window.clearInterval(watch), { once: true });
    void piano.play(loopEvents(it, tempo, tl.responseAt + 0.06), tl.responseEnd + 0.8, a.signal).catch(() => {});
    try {
      await piano.playTimeline(tl, a.signal, undefined, (perf) => {
        origin.current = perf;
      });
      await new Promise((res) => window.setTimeout(res, 200));
    } catch {
      return;
    }
    window.clearInterval(watch);
    if (a.signal.aborted) return;
    setBeatNow(-1);
    setPhase('name');
  };

  const tap = () => {
    if (phase !== 'listen') return;
    const beat = (performance.now() - origin.current) / (60000 / bpm);
    if (beat < -0.5) return;
    tapsRef.current = [...tapsRef.current, beat];
    setTaps(tapsRef.current);
  };

  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newDarkSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, darkLevel(tier), tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    void playLoop(r);
  };
  const end = (r: DarkSave) => {
    stop();
    onSave(null);
    const res = darkResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const answer = (id: string) => {
    const r = runRef.current;
    if (!r || phase !== 'name') return;
    const it = darkItem(r.seed, r.level, r.i);
    const named = id === it.answer;
    const { save, tap: tj, gained } = darkAnswer(r, tapsRef.current, named);
    setPicked(id);
    setRun(save);
    const ok = named && tj.missed.length === 0 && tj.falses === 0;
    const parts = [tj.missed.length ? tx.missed : tx.caught(tj.hits.length, it.borrowed.length), named ? `${tx.right} · +${gained}` : tx.wrong];
    setVerdict({ ok, text: parts.join(' · '), hits: tj.hits });
    if (!darkOver(save)) onSave(save);
    setPhase('answered');
  };

  const next = () => {
    const r = runRef.current;
    if (!r) return;
    if (darkOver(r)) return end(r);
    void playLoop(r);
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
      <main className={`panel-screen g2 ng ds ${calm ? 'g2-calm' : ''}`} data-game="darkside" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={darkLevel(tier) >= 5 ? tx.blurbF : tx.blurb} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="darkside" />}
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
    const r = darkResult(run);
    return (
      <main className={`panel-screen g2 ng ds ${calm ? 'g2-calm' : ''}`} data-game="darkside" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  if (!run || !shown) return null;
  const answered = phase === 'answered';
  const reveal = phase === 'name' || answered;
  const tapBars = taps.map((t) => Math.floor((t + 0.25) / 4));
  const marks = Array.from({ length: DARK_BARS * 4 }, (_, b) => (reveal && shown.borrowed.includes(Math.floor(b / 4)) ? 'target' : undefined));

  return (
    <main className={`panel-screen g2 ng ds ds-play ${calm ? 'g2-calm' : ''}`} data-game="darkside" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(DARK_ITEMS, run.i + (answered ? 0 : 1))}/{DARK_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.key}</small>
          <b>
            <Sym text={keyName(shown.loop)} />
          </b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
        <span>
          <small>♩</small>
          <b dir="ltr">{bpm}</b>
        </span>
      </div>
      <div className="ds-bars" dir="ltr">
        {shown.loop.bars.map((bar, k) => {
          const borrowed = shown.borrowed.includes(k);
          const hit = verdict?.hits.includes(k) || (!answered && phase === 'name' && tapBars.includes(k) && borrowed);
          const cls = [reveal && borrowed ? 'borrowed' : '', reveal && k === shown.ask ? 'ask' : '', hit ? 'hit' : '', reveal && !borrowed && tapBars.includes(k) ? 'false' : '', beatNow >= DARK_COUNT_IN && Math.floor((beatNow - DARK_COUNT_IN) / 4) === k ? 'now' : ''].join(' ');
          return (
            <span key={k} className={`ds-bar ${cls}`} data-ds-bar={k}>
              <small>{k + 1}</small>
              {answered ? <span>{barSymbol(shown.loop, bar)}</span> : reveal && k === shown.ask ? <span>?</span> : reveal ? <span>{bar.from ? '·' : bar.rn}</span> : <span>&nbsp;</span>}
            </span>
          );
        })}
      </div>
      <BeatDots countIn={DARK_COUNT_IN} beats={DARK_BARS * 4} now={beatNow} marks={marks} />
      <p className="hn-ask">
        <IsoMix text={phase === 'listen' ? tx.listen : tx.name} />
      </p>
      {phase === 'listen' ? (
        <button type="button" className="btn primary mega ds-now" onPointerDown={tap} data-ds-now>
          {tx.now}
          {taps.length > 0 && <small dir="ltr"> · {taps.length}</small>}
        </button>
      ) : (
        <div className="adv-grid hn-choices" dir="ltr">
          {shown.choices.map((c) => {
            const cls = answered ? (c.id === shown.answer ? 'ok' : c.id === picked ? 'bad' : '') : '';
            return (
              <button key={c.id} type="button" className={`btn ${cls}`} disabled={answered} onClick={() => answer(c.id)} data-ds-choice={c.id}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok ? darkWhy(shown, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-ds-next>
          {darkOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
