// Groove trainer (0.50): three exercises for time feel, all feeding the groove fingerprint.
//  · The fading click — tap quarters; the click drops out for longer and longer; how many silent bars do you hold?
//  · Pocket — choose to push, sit on, or lay back by a set number of ms; a meter shows whether you hold it.
//  · Swing dial — hear eighths at a swing ratio, set the dial to it, then tap them at that ratio.
// Input: tap the pad, the space bar, or any MIDI key.

import { useEffect, useRef, useState } from 'react';
import { fadePlan, heldSilent, matchTaps, pocketScore, swingOf } from '../engine/analysis/grooveTrainer';
import { recordGroove } from '../storage/analysis';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { piano } from './services';

type Mode = 'fade' | 'pocket' | 'swing';
const TX = {
  en: { title: 'Groove trainer', fade: 'Fading click', pocket: 'Pocket', swing: 'Swing dial', fadeHow: 'Tap every beat. The click drops out for 1, then 2, then 3 bars… keep the time.', pocketHow: 'Tap every beat, placed on purpose: ahead (push), on, or behind (lay back).', swingHow: 'Listen to the eighths, set the dial to their swing, then tap them the same way.', start: 'Start', stop: 'Stop', tap: 'Tap', held: 'silent bars held', best: 'best', target: 'Target', push: 'push', on: 'on', lay: 'lay back', inPocket: 'in the pocket', yourMean: 'your average', ratio: 'Swing', check: 'Check', yours: 'you played', right: 'It was', tempo: 'Tempo', back: 'Back', listen: 'Listen' },
  he: { title: 'מאמן גרוב', fade: 'הקליק הנעלם', pocket: 'כיס', swing: 'חוגת סווינג', fadeHow: 'הקישו כל פעמה. הקליק נעלם לתיבה, אחר כך לשתיים, לשלוש… שמרו על הזמן.', pocketHow: 'הקישו כל פעמה, במיקום מכוון: מלפנים (דוחפים), עליה, או מאחור (נשענים).', swingHow: 'הקשיבו לשמיניות, כוונו את החוגה לסווינג שלהן, ואז הקישו אותן באותה צורה.', start: 'להתחיל', stop: 'עצירה', tap: 'הקשה', held: 'תיבות שקטות שהחזקתם', best: 'שיא', target: 'מטרה', push: 'דוחפים', on: 'על הפעמה', lay: 'נשענים', inPocket: 'בתוך הכיס', yourMean: 'הממוצע שלכם', ratio: 'סווינג', check: 'לבדוק', yours: 'ניגנתם', right: 'זה היה', tempo: 'טמפו', back: 'חזרה', listen: 'להקשיב' },
};

export function GrooveTrainerScreen({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const [mode, setMode] = useState<Mode>('fade');
  const [bpm, setBpm] = useState(90);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** 0.66 (owner): the first bar is a count-in — a woodblock, counted down on the pad. */
  const [cd, setCd] = useState(0);
  const onBeat = (i: number) => setCd(i < 4 ? 4 - i : 0);
  const [best, setBest] = useState(0);
  const [target, setTarget] = useState(0);
  const [meter, setMeter] = useState<{ mean: number; share: number } | null>(null);
  const [dial, setDial] = useState(0.6);
  const [hidden, setHidden] = useState(0.66);
  const [flash, setFlash] = useState(false);
  const taps = useRef<number[]>([]);
  const ctl = useRef<AbortController | null>(null);
  const lat = settings.tapLatencyMs ?? 0;
  useEffect(() => () => ctl.current?.abort(), []);
  const tap = () => {
    if (!running) return;
    taps.current.push(performance.now() - lat);
    setFlash(true);
    setTimeout(() => setFlash(false), 80);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tap();
      }
    };
    addEventListener('keydown', k);
    const off = midi.onNote((_m, on) => on && tap());
    return () => {
      removeEventListener('keydown', k);
      off();
    };
  });

  /** Play clicks at given beats (heard-clock start returned), resolving when done. */
  const playClicks = async (beats: { b: number; accent: boolean; on: boolean }[], beatMs: number, c: AbortController, extra?: number[]) => {
    await piano.unlock();
    let t0 = 0;
    const tl = { clicks: beats.filter((x) => x.on).map((x) => ({ t: (x.b * beatMs) / 1000, accent: x.accent, count: x.b < 4 })), wood: (extra ?? []).map((b) => (b * beatMs) / 1000), responseAt: 0, responseEnd: ((beats.length + 0.5) * beatMs) / 1000 };
    await piano.playTimeline(tl, c.signal, onBeat, (perf) => (t0 = perf)).catch(() => {});
    setCd(0);
    return t0;
  };

  const runFade = async () => {
    const c = new AbortController();
    ctl.current = c;
    taps.current = [];
    setRunning(true);
    setMsg(null);
    const beatMs = 60000 / bpm;
    let held = 0;
    let rounds = 1;
    while (!c.signal.aborted) {
      // this round only: two bars with the click, `rounds` silent bars, one bar back in (the full ramp is fadePlan)
      const plan = [...fadePlan(0), ...Array(rounds).fill(false), true];
      const beats: { b: number; accent: boolean; on: boolean }[] = [];
      plan.forEach((on, bar) => {
        for (let k = 0; k < 4; k++) beats.push({ b: bar * 4 + k, accent: k === 0, on });
      });
      taps.current = [];
      const t0 = await playClicks(beats, beatMs, c);
      if (c.signal.aborted) break;
      const offs = matchTaps(taps.current, t0, beatMs, beats.length);
      void recordGroove(beats.map((x) => x.b), offs, bpm, 4);
      // the last silent stretch of this round
      const lastOffStart = 2;
      const silent = offs.slice(lastOffStart * 4, (lastOffStart + rounds) * 4 + 1);
      const h = heldSilent(silent, beatMs);
      if (!h.held) break;
      held = rounds;
      rounds++;
      if (rounds > 8) break;
    }
    setRunning(false);
    setBest((b) => Math.max(b, held));
    setMsg(`${held} ${tx.held}`);
  };

  const runPocket = async () => {
    const c = new AbortController();
    ctl.current = c;
    taps.current = [];
    setRunning(true);
    setMsg(null);
    setMeter(null);
    const beatMs = 60000 / bpm;
    const beats = Array.from({ length: 32 }, (_, i) => ({ b: i, accent: i % 4 === 0, on: true }));
    // a live meter while playing
    const t0Ref = { t: 0 };
    const live = setInterval(() => {
      if (!t0Ref.t) return;
      const n = Math.floor((performance.now() - t0Ref.t) / beatMs);
      const offs = matchTaps(taps.current, t0Ref.t, beatMs, Math.max(1, n));
      const ps = pocketScore(offs.slice(-8), target);
      setMeter({ mean: ps.mean, share: ps.share });
    }, 250);
    await piano.unlock();
    const tl = { clicks: beats.map((x) => ({ t: (x.b * beatMs) / 1000, accent: x.accent, count: x.b < 4 })), wood: [], responseAt: 0, responseEnd: ((beats.length + 0.5) * beatMs) / 1000 };
    await piano.playTimeline(tl, c.signal, onBeat, (perf) => (t0Ref.t = perf)).catch(() => {});
    setCd(0);
    clearInterval(live);
    const offs = matchTaps(taps.current, t0Ref.t, beatMs, beats.length);
    void recordGroove(beats.map((x) => x.b), offs, bpm, 4);
    const ps = pocketScore(offs.slice(4), target);
    setMeter({ mean: ps.mean, share: ps.share });
    setMsg(`${Math.round(ps.share * 100)}% ${tx.inPocket} · ${tx.yourMean} ${ps.mean > 0 ? '+' : ''}${ps.mean} ms`);
    setRunning(false);
  };

  const playSwing = async () => {
    const c = new AbortController();
    ctl.current = c;
    const beatMs = 60000 / bpm;
    const beats = Array.from({ length: 8 }, (_, i) => ({ b: i, accent: i % 4 === 0, on: true }));
    const wood = beats.flatMap((x) => [x.b, x.b + hidden]);
    await playClicks(beats, beatMs, c, wood);
  };
  const runSwingTap = async () => {
    const c = new AbortController();
    ctl.current = c;
    taps.current = [];
    setRunning(true);
    const beatMs = 60000 / bpm;
    const beats = Array.from({ length: 12 }, (_, i) => ({ b: i, accent: i % 4 === 0, on: true }));
    const t0 = await playClicks(beats, beatMs, c);
    const r = swingOf(taps.current.filter((t) => t > t0 + 4 * beatMs - 50), t0, beatMs);
    setRunning(false);
    setMsg(`${tx.right} ${Math.round(hidden * 100)}% · ${tx.ratio} ${Math.round(dial * 100)}% · ${tx.yours} ${r === null ? '—' : `${Math.round(r * 100)}%`}`);
  };

  const stop = () => {
    ctl.current?.abort();
    setRunning(false);
  };
  return (
    <main className="panel-screen groove-trainer" data-groove-trainer="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stop(), onBack())} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <div className="chips" role="tablist">
        {(['fade', 'pocket', 'swing'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => (stop(), setMode(m), setMsg(null), setMeter(null))} data-groove-mode={m}>
            {tx[m]}
          </button>
        ))}
      </div>
      <p className="field-hint">{mode === 'fade' ? tx.fadeHow : mode === 'pocket' ? tx.pocketHow : tx.swingHow}</p>
      <div className="ch-step gt-tempo" dir="ltr">
        <small>{tx.tempo}</small>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.max(50, b - 5))} disabled={running}>
          −
        </button>
        <b>{bpm}</b>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.min(200, b + 5))} disabled={running}>
          +
        </button>
      </div>
      {mode === 'pocket' && (
        <div className="chips gt-target" role="radiogroup" aria-label={tx.target} dir="ltr">
          {[-30, -15, 0, 15, 30].map((v) => (
            <button key={v} role="radio" aria-checked={target === v} className={`chip ${target === v ? 'on' : ''}`} onClick={() => setTarget(v)} disabled={running} data-pocket={v}>
              {v === 0 ? tx.on : v < 0 ? `${tx.push} ${-v}` : `${tx.lay} ${v}`}
            </button>
          ))}
        </div>
      )}
      {mode === 'pocket' && meter && (
        <div className="gt-meter" dir="ltr" aria-live="polite">
          <span className="gt-track">
            <i className="gt-zero" />
            <i className="gt-target" style={{ left: `${50 + (target / 60) * 50}%` }} />
            <i className="gt-you" style={{ left: `${50 + (Math.max(-60, Math.min(60, meter.mean)) / 60) * 50}%` }} />
          </span>
          <small>{Math.round(meter.share * 100)}% {tx.inPocket}</small>
        </div>
      )}
      {mode === 'swing' && (
        <div className="gt-swing">
          <label className="mx-knob">
            <span>{tx.ratio}</span>
            <input type="range" dir="ltr" min={0.5} max={0.75} step={0.01} value={dial} onChange={(e) => setDial(Number(e.target.value))} data-swing-dial="1" />
            <b dir="ltr">{Math.round(dial * 100)}%</b>
          </label>
          <div className="gt-row">
            <button className="btn ghost" onClick={() => void playSwing()} disabled={running} data-swing-listen="1">
              ▶ {tx.listen}
            </button>
            <button className="btn ghost" onClick={() => setHidden(0.52 + Math.round(Math.random() * 20) / 100)} disabled={running}>
              ↻
            </button>
          </div>
        </div>
      )}
      <button className={`gt-pad ${flash ? 'hit' : ''}`} onPointerDown={tap} disabled={!running} aria-label={tx.tap} data-groove-pad="1">
        {cd ? (
          <span className="tap-countdown" key={`c${cd}`}>
            {cd}
          </span>
        ) : (
          tx.tap
        )}
      </button>
      {running ? (
        <button className="btn mega" onClick={stop}>
          ■ {tx.stop}
        </button>
      ) : (
        <button className="btn mega" onClick={() => void (mode === 'fade' ? runFade() : mode === 'pocket' ? runPocket() : runSwingTap())} data-groove-start="1">
          ▶ {tx.start}
        </button>
      )}
      {msg && (
        <p className="pc-coach" aria-live="polite" data-groove-result="1">
          {msg}
          {mode === 'fade' && best > 0 && <small> · {tx.best} {best}</small>}
        </p>
      )}
    </main>
  );
}
