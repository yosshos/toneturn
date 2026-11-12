// Kit Read Rush (0.76): one bar sounds on the kit after a count-in, three written bars are shown — tap the one you
// heard. 90 seconds; a wrong answer costs 3 s; ×1.5 from 5 in a row, ×2 from 10. The engine is src/engine/kitRead.ts.
// The bars are drawn by a compact kit staff (KitStaff, below) so three fit one phone screen; notation is left to right
// in both languages.

import '../kitread.css';
import { useEffect, useRef, useState } from 'react';
import { isKitSave, itemSound, kitAnswer, kitItemOf, kitOver, kitResult, kitTick, newKitSave, KIT_RUN_MS, type KitBar, type KitItem, type KitSave } from '../engine/kitRead';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Kit Read Rush', he: 'מרוץ קריאת תופים' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'One bar plays on the kit after a count-in. Three bars are written — tap the one you heard. 90 seconds; a wrong answer costs 3 seconds.', he: 'תיבה אחת מתנגנת על התופים אחרי ספירה. שלוש תיבות כתובות — הקישו על זו ששמעתם. 90 שניות; תשובה שגויה עולה 3 שניות.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  time: { en: 'Time', he: 'זמן' },
  right: { en: 'Right', he: 'נכונות' },
  score: { en: 'Score', he: 'ניקוד' },
  again: { en: 'Listen again', he: 'להקשיב שוב' },
  which: { en: 'Which bar did you hear?', he: 'איזו תיבה שמעתם?' },
  playing: { en: 'Listen…', he: 'מקשיבים…' },
  yes: { en: 'Right', he: 'נכון' },
  no: { en: 'Not this one — the marked bar', he: 'לא זו — התיבה המסומנת' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
  bar: { en: 'Bar', he: 'תיבה' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const levelOf = (t: DynName) => Number(tierDef('kitread', t)?.levels?.[0] ?? 1);

// ---------------------------------------------------------------- the compact kit staff

/** Staff positions (y of the note head): lines at 30 38 46 54 62. */
const POS: Record<string, { y: number; x?: boolean; down?: boolean }> = {
  c: { y: 22, x: true },
  h: { y: 26, x: true },
  r: { y: 30, x: true },
  t1: { y: 34 },
  s: { y: 42 },
  rm: { y: 42, x: true },
  t3: { y: 50 },
  k: { y: 58, down: true },
  p: { y: 66, x: true, down: true },
};
const W = 330;
const LEFT = 30;

/** One bar on a five-line kit staff: x heads for cymbals, stems up for the hands, down for the feet, beams per group. */
export function KitStaff({ bar, label }: { bar: KitBar; label?: string }) {
  const step = (W - LEFT - 8) / bar.steps;
  const xOf = (i: number) => LEFT + (i + 0.5) * step;
  const els: React.ReactNode[] = [];
  const voices = (down: boolean) => Object.entries(bar.lanes).filter(([l, v]) => v && POS[l] && !!POS[l].down === down) as [string, string][];
  // heads
  for (const down of [false, true]) {
    for (const [l, pat] of voices(down)) {
      [...pat].forEach((c, i) => {
        if (c === '.') return;
        const p = POS[l];
        const x = xOf(i);
        if (p.x) els.push(<path key={`${l}${i}`} d={`M${x - 3.5} ${p.y - 3.5}l7 7M${x + 3.5} ${p.y - 3.5}l-7 7`} className="ks-x" />);
        else els.push(<ellipse key={`${l}${i}`} cx={x} cy={p.y} rx={4.6} ry={3.4} transform={`rotate(-20 ${x} ${p.y})`} className={c === 'g' ? 'ks-ghost' : 'ks-head'} />);
        if (c === 'g') els.push(<text key={`g${l}${i}`} x={x} y={p.y + 3.5} className="ks-paren" textAnchor="middle">( )</text>);
        if (c === 'o') els.push(<circle key={`o${l}${i}`} cx={x} cy={12} r={2.6} className="ks-open" />);
        if (c === 'X') els.push(<path key={`a${l}${i}`} d={`M${x - 4} ${down ? 74 : 14}l8 2.5-8 2.5`} className="ks-acc" />);
      });
    }
  }
  // graces (flam = one small head, drag = two) before snare hits
  for (const [k, g] of Object.entries(bar.grace ?? {})) {
    const x = xOf(Number(k));
    for (let j = 1; j <= g; j++) els.push(<ellipse key={`gr${k}${j}`} cx={x - 4 - j * 5} cy={42} rx={2.6} ry={2} className="ks-head" />);
    els.push(<path key={`gs${k}`} d={`M${x - 4 - g * 5 + 2} 42V30`} className="ks-stem thin" />);
  }
  // stems and beams per group
  for (const down of [false, true]) {
    const onsets: { i: number; ys: number[] }[] = [];
    for (let i = 0; i < bar.steps; i++) {
      const ys = voices(down).filter(([, pat]) => pat[i] && pat[i] !== '.').map(([l]) => POS[l].y);
      if (ys.length) onsets.push({ i, ys });
    }
    const tip = down ? 82 : 6;
    let g0 = 0;
    for (const g of bar.groups) {
      const inG = onsets.filter((o) => o.i >= g0 && o.i < g0 + g);
      inG.forEach((o, k) => {
        const x = xOf(o.i) + (down ? -4 : 4);
        const from = down ? Math.min(...o.ys) : Math.max(...o.ys);
        els.push(<path key={`st${down}${o.i}`} d={`M${x} ${from}V${tip}`} className="ks-stem" />);
        const next = inG[k + 1]?.i ?? g0 + g;
        const dur = next - o.i; // steps
        const sixteenth = bar.sub === 4 && dur === 1;
        if (inG.length === 1) {
          // a lone note: flags by its length (none for a beat or longer)
          const beats = dur / bar.sub;
          const flags = beats >= 1 ? 0 : sixteenth ? 2 : 1;
          for (let f = 0; f < flags; f++) els.push(<path key={`fl${down}${o.i}${f}`} d={down ? `M${x} ${tip - f * 5}q7 -4 6 -12` : `M${x} ${tip + f * 5}q7 4 6 12`} className="ks-stem" />);
          if (bar.sub === 2 && dur === 3) els.push(<circle key={`dot${down}${o.i}`} cx={xOf(o.i) + 8} cy={down ? 58 : 42} r={1.4} className="ks-dotm" />);
        } else if (sixteenth) {
          const nx = inG[k + 1] ? xOf(inG[k + 1].i) + (down ? -4 : 4) : x - 6;
          const y = down ? tip - 5 : tip + 5;
          els.push(<path key={`b2${down}${o.i}`} d={`M${x} ${y}H${inG[k + 1] ? nx : x - 6}`} className="ks-beam" />);
        }
      });
      if (inG.length >= 2) {
        const a = xOf(inG[0].i) + (down ? -4 : 4);
        const b = xOf(inG[inG.length - 1].i) + (down ? -4 : 4);
        els.push(<path key={`bm${down}${g0}`} d={`M${a} ${tip}H${b}`} className="ks-beam" />);
        if (bar.sub === 3 && !down && g === 3) els.push(<text key={`tr${g0}`} x={(a + b) / 2} y={tip - 0.5} className="ks-trip" textAnchor="middle">3</text>);
      }
      g0 += g;
    }
  }
  return (
    <svg className="ks" viewBox={`0 0 ${W} 88`} role="img" aria-label={label} direction="ltr">
      {[30, 38, 46, 54, 62].map((y) => (
        <path key={y} d={`M4 ${y}H${W - 4}`} className="ks-line" />
      ))}
      <path d={`M${W - 4} 30V62M4 30V62`} className="ks-line" />
      <text x={16} y={44} className="ks-sig" textAnchor="middle">{bar.num}</text>
      <text x={16} y={60} className="ks-sig" textAnchor="middle">{bar.den}</text>
      {els}
    </svg>
  );
}

// ---------------------------------------------------------------- the screen

type Phase = 'setup' | 'play' | 'over';

export function KitRead({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isKitSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<KitSave | null>(null);
  const [fb, setFb] = useState<{ pick: number; correct: boolean; item: KitItem } | null>(null);
  const [listening, setListening] = useState(false);
  const [final, setFinal] = useState<ReturnType<typeof kitResult> | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const runRef = useRef<KitSave | null>(null);
  runRef.current = run;

  const stopSound = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stopSound, []);

  const finish = (s: KitSave) => {
    stopSound();
    onSave(null);
    const res = kitResult(s);
    setFinal(res);
    onResult(res);
    setPhase('over');
  };

  // the clock
  useEffect(() => {
    if (phase !== 'play') return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const cur = runRef.current;
      if (!cur) return;
      const n = kitTick(cur, now - last);
      last = now;
      if (kitOver(n)) {
        clearInterval(id);
        setRun(n);
        finish(n);
      } else setRun(n);
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const listen = async (s: KitSave) => {
    stopSound();
    const ac = new AbortController();
    acRef.current = ac;
    setListening(true);
    try {
      await piano.unlock();
      const snd = itemSound(kitItemOf(s));
      await piano.play(snd.events, snd.length, ac.signal);
    } catch {
      /* stopped or no audio */
    }
    if (acRef.current === ac) {
      acRef.current = null;
      setListening(false);
    }
  };

  const begin = (resume: boolean) => {
    const s = resume && resumable ? resumable : newKitSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, levelOf(tier), tierInfo ? tier : undefined);
    setRun(s);
    setFb(null);
    setFinal(null);
    onSave(s);
    setPhase('play');
    void listen(s);
  };

  const choose = (k: number) => {
    if (!run || fb) return;
    const shown = kitItemOf(run);
    const { state, correct } = kitAnswer(run, k);
    stopSound();
    setListening(false);
    setFb({ pick: k, correct, item: shown });
    // the answer counts now (the clock runs on); the next bar plays after the feedback
    setRun(state);
    runRef.current = state;
    if (kitOver(state)) return finish(state);
    window.setTimeout(
      () => {
        setFb(null);
        const cur = runRef.current;
        if (!cur || kitOver(cur)) return;
        onSave(cur);
        void listen(cur);
      },
      correct ? 450 : 1300,
    );
  };

  const back = () => {
    stopSound();
    onExit();
  };

  const item = run && phase === 'play' ? (fb ? fb.item : kitItemOf(run)) : null;
  const secs = run ? Math.ceil(run.timeLeftMs / 1000) : KIT_RUN_MS / 1000;

  return (
    <main className={`panel-screen g2 kitread ${calm ? 'g2-calm' : ''}`} data-game="kitread" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {secs}s
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="kitread" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · <span dir="ltr">{Math.ceil(resumable.timeLeftMs / 1000)}s</span>
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-kitread-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {run && item && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.time, lang)}</small>
              <b dir="ltr">{secs}s</b>
            </span>
            <span>
              <small>{tx(TX.right, lang)}</small>
              <b dir="ltr">{run.right}</b>
            </span>
            <span>
              <small>{tx(TX.score, lang)}</small>
              <b dir="ltr">{run.score}</b>
            </span>
          </div>
          <p className={`adv-line ${fb ? (fb.correct ? 'ok' : 'bad') : ''}`} aria-live="polite">
            {fb ? tx(fb.correct ? TX.yes : TX.no, lang) : listening ? tx(TX.playing, lang) : tx(TX.which, lang)}
          </p>
          <div className="kr-options">
            {item.options.map((b, k) => (
              <button
                key={`${run.i}-${k}`}
                type="button"
                className={`kr-opt ${fb && k === item.answer ? 'right' : ''} ${fb && !fb.correct && k === fb.pick ? 'wrong' : ''}`}
                onClick={() => choose(k)}
                disabled={!!fb}
                aria-label={`${tx(TX.bar, lang)} ${k + 1}`}
                data-kr-opt={k}
              >
                <KitStaff bar={b} label={`${tx(TX.bar, lang)} ${k + 1}`} />
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => void listen(run)} disabled={listening || !!fb}>
            {tx(TX.again, lang)}
          </button>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="kr-final">
            <span>{tx(TX.right, lang)}</span> <b dir="ltr">{final.detail.right}</b>
          </p>
          <p className="g2-dim">
            {tx(TX.accuracy, lang)} <span dir="ltr">{final.detail.accuracy}%</span> · {tx(TX.score, lang)} <span dir="ltr">{final.score}</span>
          </p>
          <div className="g2-row">
            <button className="btn primary" onClick={() => begin(false)}>
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
