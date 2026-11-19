// Kit Read Rush (0.76): one bar sounds on the kit after a count-in, three written bars are shown — tap the one you
// heard. 90 seconds; a wrong answer costs 3 s; ×1.5 from 5 in a row, ×2 from 10. The engine is src/engine/kitRead.ts.
// The bars are drawn by a compact kit staff (KitStaff.tsx) so three fit one phone screen; notation is left to right
// in both languages.

import '../kitread.css';
import { useEffect, useRef, useState } from 'react';
import { isKitSave, itemSound, kitAnswer, kitItemOf, kitOver, kitResult, kitTick, newKitSave, KIT_RUN_MS, type KitItem, type KitSave } from '../engine/kitRead';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { piano } from './services';
import { KitStaff } from './KitStaff';

export { KitStaff };

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
  level: { en: 'Level', he: 'רמה' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const levelOf = (t: DynName) => Number(tierDef('kitread', t)?.levels?.[0] ?? 1);

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
          <button className="btn kr-again" onClick={() => void listen(run)} disabled={listening || !!fb}>
            {tx(TX.again, lang)}
          </button>
        </>
      )}

      {phase === 'over' && final && (
        <RushResultCard
          lang={lang}
          heading={tx(TX.over, lang)}
          score={final.score}
          best={best}
          newBest={final.score > 0 && final.score > (best ?? 0)}
          right={final.detail.right}
          wrong={final.detail.wrong}
          stats={[
            { label: tx(TX.accuracy, lang), value: <span dir="ltr">{final.detail.accuracy}%</span> },
            { label: tx(TX.level, lang), value: final.detail.tier ? <i className="dyn">{final.detail.tier}</i> : final.detail.level },
          ]}
          onAgain={() => begin(false)}
          onBack={back}
        />
      )}
    </main>
  );
}
