// Voicing Sprint (0.76, keys): a chord symbol and the voicing to use appear — play it on a MIDI keyboard; 60 seconds,
// a wrong voicing costs 2 s. Triads → inversions → shells → rootless A / B → drop 2 → upper structures. The held keys
// are judged once the chord settles (250 ms after the last key, with as many notes as the voicing needs). On-screen
// keys are practice (they never clear a tier).

import '../advgames.css';
import '../instgames.css';
import { useEffect, useRef, useState } from 'react';
import { isVoicingRun, judgeVoicing, newVoicingRun, voicingAnswer, voicingAt, voicingExample, voicingResult, voicingSize, voicingTick, VOICING_MS, type VoicingRun } from '../engine/instGames';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { KeysPad } from './Instrument';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
type Input = 'midi' | 'touch';
type Bi = { en: string; he: string };
const TX = {
  title: { en: 'Voicing Sprint', he: 'ספרינט וויסינגים' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'A chord symbol and a voicing appear. Play it on your MIDI keyboard — it counts once all its notes are down. 60 seconds; a wrong voicing costs 2 s.', he: 'מופיעים סימן אקורד ווויסינג. נגנו אותו במקלדת ה־MIDI — הוא נספר כשכל הצלילים שלו לחוצים. 60 שניות; וויסינג שגוי עולה 2 שניות.' },
  input: { en: 'Play on', he: 'לנגן על' },
  midiIn: { en: 'MIDI keyboard', he: 'מקלדת MIDI' },
  touch: { en: 'Screen (practice)', he: 'מסך (תרגול)' },
  touchNote: { en: 'Screen keys are practice: they do not clear a level.', he: 'מקשי המסך הם תרגול: הם לא עוברים שלב.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  time: { en: 'Time', he: 'זמן' },
  right: { en: 'Right', he: 'נכונים' },
  wrong: { en: 'Wrong', he: 'שגויים' },
  check: { en: 'Check', he: 'לבדוק' },
  clear: { en: 'Clear', he: 'לנקות' },
  ok: { en: 'Right', he: 'נכון' },
  was: { en: 'It was', he: 'זה היה' },
  over: { en: 'Results', he: 'תוצאות' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
  waiting: { en: 'Play the voicing', he: 'נגנו את הוויסינג' },
};
const tx = (b: Bi, l: Lang) => b[l];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function VoicingSprint({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isVoicingRun(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [input, setInput] = useState<Input>('midi');
  const [run, setRun] = useState<VoicingRun | null>(null);
  const [phase, setPhase] = useState<'setup' | 'play' | 'over'>('setup');
  const [held, setHeld] = useState<number[]>([]);
  const [fb, setFb] = useState<{ ok: boolean; show: number[] } | null>(null);
  const [final, setFinal] = useState<ReturnType<typeof voicingResult> | null>(null);
  const runRef = useRef<VoicingRun | null>(null);
  runRef.current = run;
  const heldRef = useRef(new Set<number>());
  const timer = useRef<number | null>(null);
  const busy = useRef(false);

  const finish = (r: VoicingRun) => {
    onSave(null);
    const res = voicingResult(r, input);
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
      const r = runRef.current;
      if (!r) return;
      const n = voicingTick(r, now - last);
      last = now;
      setRun(n);
      if (n.timeLeftMs <= 0) {
        clearInterval(id);
        finish(n);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const answer = (ok: boolean) => {
    const r = runRef.current;
    if (!r || busy.current) return;
    busy.current = true;
    const it = voicingAt(r);
    setFb({ ok, show: ok ? [] : voicingExample(it) });
    if (!ok) void piano.play(voicingExample(it).map((m) => ({ midi: m, start: 0, duration: 0.9, velocity: 0.5 })), 1.1, new AbortController().signal).catch(() => {});
    const n = voicingAnswer(r, ok);
    setRun(n);
    onSave(n);
    window.setTimeout(
      () => {
        busy.current = false;
        setFb(null);
        setHeld([]);
        heldRef.current.clear();
        if (n.timeLeftMs <= 0 && runRef.current) finish(runRef.current);
      },
      ok ? 350 : 1300,
    );
  };

  // MIDI: judge the held keys once they settle
  useEffect(() => {
    if (phase !== 'play' || input !== 'midi') return;
    let alive = true;
    void midiInput.enable().catch(() => {});
    const unsub = midiInput.onNote((note, on) => {
      if (!alive || busy.current) return;
      if (on) heldRef.current.add(note);
      else heldRef.current.delete(note);
      setHeld([...heldRef.current].sort((a, b) => a - b));
      if (timer.current) clearTimeout(timer.current);
      if (!on) return;
      timer.current = window.setTimeout(() => {
        const r = runRef.current;
        if (!r || busy.current) return;
        const it = voicingAt(r);
        const notes = [...heldRef.current];
        if (notes.length >= voicingSize(it)) answer(judgeVoicing(it, notes));
      }, 250);
    });
    return () => {
      alive = false;
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, input]);

  const begin = (resume: boolean) => {
    const d = tierDef('voicingsprint', tier);
    const r = resume && resumable ? resumable : newVoicingRun((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, Number(d?.levels?.[0] ?? 1), tierInfo ? tier : undefined);
    setRun(r);
    onSave(r);
    setFinal(null);
    setFb(null);
    setHeld([]);
    heldRef.current.clear();
    void piano.unlock().catch(() => {});
    setPhase('play');
  };
  const back = () => onExit();

  const it = run ? voicingAt(run) : null;
  const tapKey = (m: number) => {
    if (busy.current) return;
    const s = heldRef.current;
    if (s.has(m)) s.delete(m);
    else s.add(m);
    setHeld([...s].sort((a, b) => a - b));
    void piano.play([{ midi: m, start: 0, duration: 0.4, velocity: 0.5 }], 0.5, new AbortController().signal).catch(() => {});
  };
  const marks = fb && !fb.ok ? fb.show.map((m) => ({ m, tone: 'answer' })) : held.map((m) => ({ m, tone: fb ? (fb.ok ? 'ok' : 'wrong') : 'mine' }));

  return (
    <main className={`panel-screen g2 inst-game vsprint ${calm ? 'g2-calm' : ''}`} data-game="voicingsprint" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.ceil(run.timeLeftMs / 1000)}s
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          <fieldset className="seg-field">
            <legend>{tx(TX.input, lang)}</legend>
            <div className="seg g2-seg" role="radiogroup" aria-label={tx(TX.input, lang)}>
              {(['midi', 'touch'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={input === k} className={input === k ? 'on' : ''} onClick={() => setInput(k)}>
                  {tx(k === 'midi' ? TX.midiIn : TX.touch, lang)}
                </button>
              ))}
            </div>
          </fieldset>
          {input === 'touch' && <p className="g2-dim">{tx(TX.touchNote, lang)}</p>}
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="voicingsprint" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {Math.ceil(resumable.timeLeftMs / 1000)}s
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-vs-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {phase === 'play' && run && it && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.time, lang)}</small>
              <b dir="ltr">{Math.ceil(run.timeLeftMs / 1000)}</b>
            </span>
            <span>
              <small>{tx(TX.right, lang)}</small>
              <b dir="ltr">{run.right}</b>
            </span>
            <span>
              <small>{tx(TX.wrong, lang)}</small>
              <b dir="ltr">{run.wrong}</b>
            </span>
          </div>
          <div className="vs-clock" aria-hidden="true">
            <i style={{ width: `${(100 * run.timeLeftMs) / VOICING_MS}%` }} />
          </div>
          <div className={`vs-card ${fb ? (fb.ok ? 'ok' : 'bad') : ''}`} aria-live="polite">
            <b className="vs-symbol" dir="ltr">
              {it.symbol}
            </b>
            <span className="vs-how">{tx(it.how, lang)}</span>
          </div>
          <p className="adv-line" dir="auto">
            {fb ? (fb.ok ? tx(TX.ok, lang) : `${tx(TX.was, lang)}: ${fb.show.map((m) => NAMES[m % 12]).join(' ')}`) : held.length ? held.map((m) => NAMES[m % 12]).join(' ') : tx(TX.waiting, lang)}
          </p>
          <KeysPad lo={it.kind === 'shell' || it.kind === 'upper' ? 43 : 48} hi={it.kind === 'shell' || it.kind === 'upper' ? 79 : 84} marks={marks} onTap={input === 'touch' ? tapKey : undefined} label={tx(TX.title, lang)} />
          {input === 'touch' && (
            <div className="g2-row">
              <button className="btn ghost" onClick={() => (heldRef.current.clear(), setHeld([]))}>
                {tx(TX.clear, lang)}
              </button>
              <button className="btn primary" disabled={!held.length || !!fb} onClick={() => answer(judgeVoicing(it, [...heldRef.current]))}>
                {tx(TX.check, lang)}
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="inst-final">
            <span>{tx(TX.right, lang)}</span> <b dir="ltr">{final.detail.right}</b>
          </p>
          <p className="g2-dim" dir="ltr">
            {final.detail.right} / {final.detail.right + final.detail.wrong}
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
