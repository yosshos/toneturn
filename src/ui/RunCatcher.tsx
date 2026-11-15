// Run Catcher (AUDIT-GAMES §4.2 #8, Voice): a run is played, then — after a count-in, with the click on — sung back on
// one vowel; each note's cell lights as its time comes (the now-cue). A clean catch (≥ 75 % of the notes in the 60 ¢
// band) raises the tempo 10 %; under half costs a life. Engine: src/engine/runCatcher.ts.

import { IsoMix } from './Iso';
import '../advgames.css';
import '../newgames.css';
import { useEffect, useRef, useState } from 'react';
import { gradeRun, isRcSave, newRc, rcAfterTake, rcBeats, rcBpm, rcNoteSec, rcOver, rcResult, runItem, RC_CLEAN, RC_LIVES, RC_MISS, RC_TAKES, tierLevelRC, type RcFrame, type RcSave, type RunItem } from '../engine/runCatcher';
import { MIC_PITCH_LAG_MS } from '../engine/highway';
import { DEFAULT_RANGE } from '../engine/vocal';
import { pcNameKey } from '../engine/topicKit';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck, InputWatchdog } from './InputCheck';
import { RushResultCard } from './GameResult';
import { piano } from './services';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
const TX = {
  title: { en: 'Run Catcher', he: 'תופסים ראן' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Hear a run, then sing it back on one vowel after the count-in, with the click. Every clean catch is 10 % faster. Three lives.', he: 'שומעים ראן, ושרים אותו בחזרה על הברה אחת אחרי הספירה, עם הקליק. כל תפיסה נקייה מהירה ב־10%. שלושה חיים.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  go: { en: 'Hear and sing', he: 'לשמוע ולשיר' },
  hearing: { en: 'Listen…', he: 'מקשיבים…' },
  count: { en: 'Get ready…', he: 'מתכוננים…' },
  sing: { en: 'Sing', he: 'שרים' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  micErr: { en: 'The microphone did not open. Allow it for this site and try again.', he: 'המיקרופון לא נפתח. אשרו גישה לאתר ונסו שוב.' },
  take: { en: 'Take', he: 'טייק' },
  lives: { en: 'Lives', he: 'חיים' },
  tempo: { en: 'Tempo', he: 'טמפו' },
  clean: { en: 'Clean catch · faster', he: 'תפיסה נקייה · מהר יותר' },
  half: { en: 'Almost · same tempo', he: 'כמעט · אותו טמפו' },
  miss: { en: 'Missed · one life', he: 'פספוס · חיים אחד' },
  why: { en: 'Why?', he: 'למה?' },
  whyText: { en: 'A note counts when its middle sits within 60 cents of the target, in its own time slot. Start right on the beat after the count-in.', he: 'צליל נספר כשהאמצע שלו בטווח 60 סנט מהיעד, בזמן שלו. מתחילים בדיוק על הפעמה אחרי הספירה.' },
  next: { en: 'Next', he: 'הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Notes in tune', he: 'צלילים מדויקים' },
  top: { en: 'Top clean tempo', he: 'טמפו נקי מרבי' },
  best: { en: 'Best', he: 'שיא' },
  level: { en: 'Level', he: 'רמה' },
};
const tx = (b: Bi, l: Lang) => b[l];
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

type Phase = 'setup' | 'ready' | 'open' | 'hear' | 'count' | 'sing' | 'review' | 'over' | 'mic-error';

export function RunCatcher({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isRcSave(saved) ? saved : null;
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<RcSave | null>(null);
  const [cell, setCell] = useState(-1);
  const [beat, setBeat] = useState(-1);
  const [marks, setMarks] = useState<string[] | null>(null);
  const [lastPct, setLastPct] = useState<number | null>(null);
  const [armAt, setArmAt] = useState(0);
  const acRef = useRef<AbortController | null>(null);
  const prevBest = useRef(best ?? 0);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stop, []);

  const item: RunItem | null = run ? runItem(run.seed, Math.max(0, run.takes.length - (phase === 'review' || phase === 'over' ? 1 : 0)), run.level, range.low, range.high) : null;

  const begin = (resume: boolean) => {
    stop();
    const r = resume && resumable ? resumable : newRc((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tierInfo ? tier : 'pp', tierLevelRC(tier));
    prevBest.current = best ?? 0;
    setRun(r);
    setMarks(null);
    setLastPct(null);
    onSave(r);
    setPhase('ready');
  };

  const take = async () => {
    if (!run || !item) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    const sig = ac.signal;
    setMarks(null);
    setPhase('open');
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const noteSec = rcNoteSec(run.pct);
    const bpm = rcBpm(run.pct);
    const beatSec = 60 / bpm;
    const frames: { perf: number; midi: number | null }[] = [];
    let capStart = 0;
    let listening = false;
    const opened = await new Promise<boolean>((resolve) => {
      void new BrowserPitchCapture()
        .sing({
          signal: sig,
          maxMs: 60_000,
          silenceMs: 60_000,
          endSilenceMs: 1e9,
          hopMs: 20,
          onCapturing: () => {
            capStart = performance.now();
            resolve(true);
          },
          onFrame: (f) => {
            if (!listening) return;
            const m = f.hz && f.confidence >= 0.8 && f.rms >= 0.01 ? midiOf(f.hz) : null;
            frames.push({ perf: capStart + f.t * 1000, midi: m });
          },
        })
        .then((r) => {
          if (r.kind === 'error') resolve(false);
        });
    });
    if (sig.aborted) return;
    if (!opened) {
      stop();
      setPhase('mic-error');
      return;
    }
    // 1. hear the run (the cells light as it plays)
    setPhase('hear');
    const evs = item.notes.map((m, k) => ({ midi: m, start: 0.08 + k * noteSec, duration: noteSec * 0.95, velocity: 0.62 }));
    const t0 = performance.now() + 80;
    const follow = window.setInterval(() => setCell(Math.min(item.notes.length - 1, Math.floor((performance.now() - t0) / 1000 / noteSec))), 30);
    try {
      await piano.play(evs, 0.15 + item.notes.length * noteSec + 0.25, sig);
    } catch {
      clearInterval(follow);
      return;
    }
    clearInterval(follow);
    setCell(-1);
    if (sig.aborted) return;
    // 2. count-in (4 woodblock beats), then the click under the sung run
    setPhase('count');
    const beats = rcBeats(item.notes.length);
    const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
    for (let k = 0; k < 4; k++) clicks.push({ t: k * beatSec, accent: k === 0, count: true });
    for (let k = 0; k < beats + 1; k++) clicks.push({ t: (4 + k) * beatSec, accent: k === 0, soft: k !== 0 });
    let origin = performance.now() + 120 + 4 * beatSec * 1000;
    const lat = settings.micLatencyMs ?? MIC_PITCH_LAG_MS;
    const cue = window.setInterval(() => {
      const ms = performance.now() - origin;
      if (ms >= 0) setPhase((p) => (p === 'count' ? 'sing' : p));
      setCell(ms < 0 ? -1 : Math.min(item.notes.length, Math.floor(ms / 1000 / noteSec)));
    }, 25);
    listening = true;
    setArmAt(0);
    try {
      await piano.playTimeline(
        { clicks, wood: [], responseAt: 4 * beatSec, responseEnd: (4 + beats + 1) * beatSec },
        sig,
        (i) => setBeat(i < 4 ? i : -1),
        (perf) => {
          origin = perf;
          setArmAt(perf);
        },
      );
    } catch {
      clearInterval(cue);
      return;
    }
    clearInterval(cue);
    listening = false;
    setCell(-1);
    setBeat(-1);
    setArmAt(0);
    stop();
    // 3. grade
    const fr: RcFrame[] = frames.map((f) => ({ ms: f.perf - lat - origin, midi: f.midi }));
    const g = gradeRun(item.notes, fr, noteSec * 1000);
    const caught = g.marks.filter((m) => m === 'ok').length;
    const next = rcAfterTake(run, g.pct, caught, item.notes.length);
    setRun(next);
    setMarks(g.marks);
    setLastPct(g.pct);
    if (rcOver(next)) {
      onSave(null);
      onResult(rcResult(next));
    } else onSave(next);
    setPhase('review');
  };

  const back = () => {
    stop();
    onExit();
  };

  const verdictOf = (p: number) => (p >= RC_CLEAN ? TX.clean : p >= RC_MISS ? TX.half : TX.miss);
  const done = run ? rcOver(run) : false;

  return (
    <main className={`panel-screen g2 vgame ng rc ${calm ? 'g2-calm' : ''}`} data-game="runcatcher" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && phase !== 'over' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.min(RC_TAKES, run.takes.length + (phase === 'review' ? 0 : 1))}/{RC_TAKES}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="runcatcher" />}
          <InputCheck mode="mic" lang={lang} />
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)} data-ng-start>
                {tx(TX.cont, lang)} · {tx(TX.take, lang)} <span dir="ltr">{resumable.takes.length + 1}</span>
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-ng-start>
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

      {run && item && phase !== 'setup' && phase !== 'over' && phase !== 'mic-error' && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.lives, lang)}</small>
              <b dir="ltr">
                {run.lives}/{RC_LIVES}
              </b>
            </span>
            <span>
              <small>{tx(TX.tempo, lang)}</small>
              <b dir="ltr">{phase === 'review' && run.takes.length ? `${run.pct}%` : `${run.pct}%`}</b>
            </span>
            <span>
              <small>{tx(TX.level, lang)}</small>
              <i className="dyn">{run.tier}</i>
            </span>
          </div>
          <p className="ng-ask">
            <IsoMix text={item.shape.name[lang]} />
          </p>
          <div className="rc-beats" aria-hidden="true">
            {[0, 1, 2, 3].map((b) => (
              <i key={b} className={beat >= b ? 'on' : ''} />
            ))}
          </div>
          <div className={`rc-cells n${Math.min(13, item.notes.length)}`} dir="ltr" data-rc-cells>
            {item.notes.map((m, k) => (
              <span key={k} className={`rc-cell ${k === cell && (phase === 'hear' || phase === 'sing') ? 'now' : ''} ${marks?.[k] ?? ''}`} style={{ ['--h' as string]: `${(m - Math.min(...item.notes)) * 3}px` }}>
                <b>{pcNameKey(m, item.tonic)}</b>
              </span>
            ))}
          </div>
          <p className={`adv-line ${phase === 'review' && lastPct !== null ? (lastPct >= RC_CLEAN ? 'ok' : 'bad') : ''}`} aria-live="polite" data-ng-verdict={phase === 'review' ? (lastPct !== null && lastPct >= RC_CLEAN ? 'ok' : 'bad') : ''}>
            {phase === 'open' ? tx(TX.opening, lang) : phase === 'hear' ? tx(TX.hearing, lang) : phase === 'count' ? tx(TX.count, lang) : phase === 'sing' ? tx(TX.sing, lang) : phase === 'review' && lastPct !== null ? (
              <>
                <span dir="ltr">{lastPct}%</span> · {tx(verdictOf(lastPct), lang)}
              </>
            ) : (
              ''
            )}
          </p>
          {phase === 'review' && lastPct !== null && lastPct < RC_CLEAN && (
            <details className="ng-why">
              <summary>{tx(TX.why, lang)}</summary>
              <p>{tx(TX.whyText, lang)}</p>
            </details>
          )}
          {phase === 'sing' && armAt > 0 && <InputWatchdog lang={lang} mode="mic" arm={{ start: armAt, due: armAt }} />}
          <div className="g2-col">
            {phase === 'ready' && (
              <button className="btn primary mega" onClick={() => void take()} data-rc-go>
                {tx(TX.go, lang)}
              </button>
            )}
            {phase === 'review' && (
              <button className="btn primary mega" onClick={() => (done ? setPhase('over') : (setMarks(null), setLastPct(null), setPhase('ready')))} data-ng-next>
                {done ? tx(TX.finish, lang) : tx(TX.next, lang)}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'over' && run && (
        <RushResultCard
          lang={lang}
          heading={tx(TX.over, lang)}
          score={run.score}
          best={prevBest.current}
          newBest={run.score > 0 && run.score > prevBest.current}
          right={run.takes.filter((x) => x >= RC_CLEAN).length}
          wrong={run.takes.filter((x) => x < RC_CLEAN).length}
          stats={[
            { label: tx(TX.accuracy, lang), value: <span dir="ltr">{rcResult(run).detail.accuracy}%</span>, key: 'acc' },
            { label: tx(TX.top, lang), value: <span dir="ltr">{run.topPct ? `${run.topPct}%` : '–'}</span>, key: 'top' },
            { label: tx(TX.level, lang), value: <i className="dyn">{run.tier}</i>, key: 'lv' },
          ]}
          onAgain={() => begin(false)}
          onBack={back}
        />
      )}
    </main>
  );
}
