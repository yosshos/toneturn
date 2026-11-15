// Guide-Tone Runner (AUDIT-GAMES §4.2 #1): the changes roll by with the band and the click; on every change play the
// new chord's 3rd or 7th, in time. A wrong or missing guide tone ends the run; each clean lap starts again a little
// faster (count-in every lap). MIDI or the microphone. The run is saved after every clean lap (resume after Back /
// reload). Engine: src/engine/guideTone.ts.

import { useEffect, useRef, useState } from 'react';
import { GT_COUNT_IN, gtHints, gtJudge, gtLap, gtLapDone, gtLevel, gtMissed, gtResult, guideNames, isGtSave, lapBpm, newGtSave, type GtLap, type GtSave } from '../engine/guideTone';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { listenNotes, type Heard, type MeasuredInput } from './instCapture';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck, InputWatchdog } from './InputCheck';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { BeatDots, InputPick, Sym, WhyLine, bandEvents, clickTimeline, defaultInput, instOf } from './NewGameBits';

const TX = {
  en: {
    title: 'Guide-Tone Runner',
    back: 'Back',
    blurb: 'On every chord change play its 3rd or its 7th, on the beat. One miss ends the run; every clean lap goes a little faster.',
    start: 'Start',
    cont: (n: number) => `Continue · lap ${n}`,
    newRun: 'New run',
    best: 'Best',
    streak: 'Changes',
    lap: 'Lap',
    play: 'Play the lap',
    countIn: 'Count-in…',
    go: 'Guide tones on every change',
    clean: 'Clean lap',
    nextLap: 'Next lap',
    opening: 'Opening the microphone…',
    micErr: 'The microphone did not open. Try MIDI.',
    over: 'Run over',
    wrongNote: (got: string, sym: string) => `${got} on ${sym}`,
    missed: (sym: string) => `No guide tone on ${sym}`,
    why: (sym: string, a: string, b: string) => `${sym}: ${a} (3rd) or ${b} (7th).`,
    laps: 'Laps',
    tempo: 'Tempo',
  },
  he: {
    title: 'רץ הצלילים המובילים',
    back: 'חזרה',
    blurb: 'בכל החלפת אקורד מנגנים את הטרצה או את הספטימה שלו, על הפעמה. החטאה אחת מסיימת; כל סיבוב נקי מהיר קצת יותר.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · סיבוב ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    streak: 'החלפות',
    lap: 'סיבוב',
    play: 'לנגן את הסיבוב',
    countIn: 'ספירה…',
    go: 'צליל מוביל בכל החלפה',
    clean: 'סיבוב נקי',
    nextLap: 'לסיבוב הבא',
    opening: 'פותחים את המיקרופון…',
    micErr: 'המיקרופון לא נפתח. נסו MIDI.',
    over: 'הריצה נגמרה',
    wrongNote: (got: string, sym: string) => `${got} על ${sym}`,
    missed: (sym: string) => `אין צליל מוביל על ${sym}`,
    why: (sym: string, a: string, b: string) => `${sym}: ${a} (טרצה) או ${b} (ספטימה).`,
    laps: 'סיבובים',
    tempo: 'טמפו',
  },
};
const NOTE = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

type Phase = 'setup' | 'ready' | 'open' | 'play' | 'clean' | 'over' | 'mic-error';
interface Miss {
  i: number;
  got: number | null;
}

export function GuideToneRunner({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isGtSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [input, setInput] = useState<MeasuredInput>(() => resumable?.input ?? defaultInput(settings));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<GtSave | null>(null);
  const [caught, setCaught] = useState<boolean[]>([]);
  const [beatNow, setBeatNow] = useState(-1);
  const [miss, setMiss] = useState<Miss | null>(null);
  const [final, setFinal] = useState<ReturnType<typeof gtResult> | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const autoNext = useRef(0);
  const [armAt, setArmAt] = useState(0);
  useEffect(() => setArmAt(phase === 'play' ? performance.now() : 0), [phase]);

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
    window.clearTimeout(autoNext.current);
  };
  useEffect(() => stop, []);

  const lap: GtLap | null = run ? gtLap(run.seed, run.level, run.lap) : null;
  const bpm = run ? lapBpm(run.level, run.lap) : 0;

  const begin = (resume: boolean) => {
    stop();
    const r = resume && resumable ? resumable : newGtSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, gtLevel(tier), input, tierInfo ? tier : undefined);
    setRun({ ...r, input });
    setMiss(null);
    setFinal(null);
    setCaught([]);
    onSave(r);
    setPhase('ready');
  };

  const finish = (r: GtSave, l: GtLap, inLap: number, m: Miss) => {
    stop();
    setMiss(m);
    const res = gtResult(r, l, inLap);
    const detail = { ...res.detail, keyInst: instOf(settings) };
    setFinal(res);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onSave(null);
    onResult({ ...res, detail });
    setPhase('over');
  };

  const playLap = async () => {
    if (!run || !lap) return;
    stop();
    const a = new AbortController();
    ac.current = a;
    const r = run;
    const l = lap;
    const tempo = bpm;
    const got = l.chords.map(() => false);
    setCaught([...got]);
    setMiss(null);
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const heard: Heard[] = [];
    let ended = false;
    let origin = performance.now() + 120 + GT_COUNT_IN * (60000 / tempo);
    const lat = input === 'midi' ? (settings.midiLatencyMs ?? 0) : (settings.micLatencyMs ?? 120);
    const end = (m: Miss) => {
      if (ended) return;
      ended = true;
      finish(r, l, got.filter(Boolean).length, m);
    };
    if (input === 'mic') setPhase('open');
    const ok = await listenNotes(a.signal, input, settings, heard, {
      bass: instOf(settings) === 'bass',
      maxMs: 600_000,
      onNote: (h) => {
        if (ended || a.signal.aborted) return;
        const v = gtJudge(l, tempo, h.perf - origin - h.lat, h.midi, got);
        if (v.kind === 'hit') {
          got[v.i] = true;
          setCaught([...got]);
        } else if (v.kind === 'wrong') end({ i: v.i, got: h.midi });
      },
    });
    if (a.signal.aborted) return;
    if (!ok) {
      setPhase('mic-error');
      return;
    }
    setPhase('play');
    const beatMs = 60000 / tempo;
    const watch = window.setInterval(() => {
      if (ended) return;
      const i = gtMissed(l, tempo, performance.now() - origin - lat - 120, got);
      if (i >= 0) end({ i, got: null });
      const b = Math.floor((performance.now() - origin) / beatMs) + GT_COUNT_IN;
      setBeatNow(b);
    }, 40);
    a.signal.addEventListener('abort', () => window.clearInterval(watch), { once: true });
    const tl = clickTimeline(tempo, GT_COUNT_IN, l.beats);
    void piano.play(bandEvents(l.chords, tempo, tl.responseAt + 0.06), tl.responseEnd + 0.6, a.signal).catch(() => {});
    try {
      await piano.playTimeline(tl, a.signal, undefined, (perf) => {
        origin = perf;
      });
      // the last change's window closes just after the lap
      await new Promise((res) => window.setTimeout(res, 140 + lat));
    } catch {
      return;
    }
    window.clearInterval(watch);
    if (ended || a.signal.aborted) return;
    const left = gtMissed(l, tempo, Number.MAX_SAFE_INTEGER, got);
    if (left >= 0) return end({ i: left, got: null });
    ended = true;
    a.abort();
    const next = gtLapDone(r, l);
    setRun(next);
    onSave(next);
    setBeatNow(-1);
    setPhase('clean');
    // the run rolls on: the next lap starts by itself after a breath (or at once with the button)
    autoNext.current = window.setTimeout(() => setPhase((p) => (p === 'clean' ? 'ready' : p)), 1600);
  };

  // Start the next lap when the clean-lap pause ends (and the first lap of "Play again").
  const autoStart = useRef(false);
  useEffect(() => {
    if (phase !== 'ready' || !run) return;
    if (run.lap > 0 || autoStart.current) {
      autoStart.current = false;
      const id = window.setTimeout(() => void playLap(), 80);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run]);

  const back = () => {
    stop();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng gtr ${calm ? 'g2-calm' : ''}`} data-game="guidetone" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={tx.blurb} />
          </p>
          <InputPick lang={lang} value={input} onChange={setInput} />
          <InputCheck key={input} mode={input} lang={lang} />
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="guidetone" />}
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx.cont(resumable.lap + 1)}
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

  if (phase === 'over' && final && run && lap) {
    const c = miss ? lap.chords[miss.i] : null;
    const [g3, g7] = c ? guideNames(c) : ['', ''];
    return (
      <main className={`panel-screen g2 ng gtr ${calm ? 'g2-calm' : ''}`} data-game="guidetone" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        {c && <WhyLine lang={lang} ok={false} line={<IsoMix text={miss!.got !== null ? tx.wrongNote(NOTE[miss!.got % 12], c.sym) : tx.missed(c.sym)} />} why={tx.why(c.sym, g3, g7)} />}
        <RushResultCard
          lang={lang}
          heading={tx.over}
          score={final.score}
          best={best}
          newBest={record}
          right={final.detail.right}
          wrong={final.detail.wrong}
          stats={[
            { label: tx.laps, value: <span dir="ltr">{final.detail.laps}</span> },
            { label: tx.tempo, value: <span dir="ltr">♩ {final.detail.bpm}</span> },
          ]}
          onAgain={() => {
            autoStart.current = true;
            begin(false);
          }}
          onBack={back}
        />
      </main>
    );
  }

  if (!run || !lap) return null;
  const done = caught.filter(Boolean).length;
  // the change the clock is in (−1 during the count-in)
  const beatInLap = beatNow - GT_COUNT_IN;
  let cur = 0;
  lap.starts.forEach((s, i) => {
    if (beatInLap >= s) cur = i;
  });
  const showCur = phase === 'play' && beatInLap >= 0 ? cur : phase === 'play' ? 0 : -1;
  const curChord = lap.chords[Math.max(0, showCur)];
  const nextChord = lap.chords[Math.max(0, showCur) + 1];
  const hints = gtHints(run.level);
  const barStart = Math.floor(Math.max(0, beatInLap) / 4) * 4;

  return (
    <main className={`panel-screen g2 ng gtr gtr-play ${calm ? 'g2-calm' : ''}`} data-game="guidetone" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          ♩ {bpm}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.streak}</small>
          <b dir="ltr">{run.caught + done}</b>
        </span>
        <span>
          <small>{tx.lap}</small>
          <b dir="ltr">{run.lap + 1}</b>
        </span>
      </div>
      <div className={`gtr-now ${phase === 'play' && beatInLap >= 0 && caught[cur] ? 'hit' : ''}`} data-gtr-now>
        <Sym text={curChord.sym} className="gtr-cur" />
        {hints && (
          <span className="gtr-hint">
            <Sym text={guideNames(curChord).join(' · ')} />
          </span>
        )}
        {nextChord && (
          <span className="gtr-next">
            <Sym text={`→ ${nextChord.sym}`} />
          </span>
        )}
      </div>
      <BeatDots countIn={beatInLap < 0 ? GT_COUNT_IN : 0} beats={beatInLap < 0 ? 4 : 4} now={beatInLap < 0 ? beatNow : beatInLap - barStart} />
      <div className={`gtr-strip n${Math.min(16, lap.chords.length)}`} dir="ltr">
        {lap.chords.map((c, i) => (
          <span key={i} className={`gtr-cell ${caught[i] ? 'hit' : ''} ${i === showCur ? 'now' : ''} ${miss?.i === i ? 'miss' : ''}`}>
            {c.sym}
          </span>
        ))}
      </div>
      <p className="adv-line" aria-live="polite">
        {phase === 'open' ? tx.opening : phase === 'play' ? (beatInLap < 0 ? tx.countIn : tx.go) : phase === 'clean' ? `${tx.clean} · ♩ ${bpm}` : ''}
      </p>
      {phase === 'play' && armAt > 0 && <InputWatchdog lang={lang} mode={input} arm={{ start: armAt, due: armAt + GT_COUNT_IN * (60000 / bpm) }} />}
      {phase === 'mic-error' && <p className="g2-warn">{tx.micErr}</p>}
      <div className="g2-col">
        {(phase === 'ready' || phase === 'mic-error') && (
          <>
            {run.lap === 0 && <InputCheck key={input} mode={input} lang={lang} />}
            <button className="btn primary mega" onClick={() => void playLap()} data-ng-play>
              {tx.play}
            </button>
          </>
        )}
        {phase === 'clean' && (
          <button className="btn primary mega" onClick={() => setPhase('ready')}>
            {tx.nextLap}
          </button>
        )}
      </div>
    </main>
  );
}

