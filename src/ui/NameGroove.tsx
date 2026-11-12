// Name That Groove (0.76): two bars of a groove on the kit, name the style among four. 10 rounds; a right answer is
// worth 10 within 2 s of the groove starting, falling to 5 at 12 s. The engine is src/engine/nameGroove.ts.

import '../kitread.css';
import { useEffect, useRef, useState } from 'react';
import { grooveAnswer, grooveOver, grooveResult, grooveSound, isGrooveSave, newGrooveSave, roundOf, styleById, GROOVE_ROUNDS, type GrooveRound, type GrooveSave } from '../engine/nameGroove';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Name That Groove', he: 'זהו את הגרוב' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Two bars of a groove on the kit. Name its style — the faster, the more points. Ten rounds.', he: 'שתי תיבות של גרוב על התופים. זהו את הסגנון — ככל שמהר יותר, יותר נקודות. עשרה סיבובים.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  round: { en: 'Round', he: 'סיבוב' },
  right: { en: 'Right', he: 'נכונות' },
  score: { en: 'Score', he: 'ניקוד' },
  again: { en: 'Listen again', he: 'להקשיב שוב' },
  which: { en: 'Which style is it?', he: 'איזה סגנון זה?' },
  wasIt: { en: 'It was', he: 'זה היה' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const levelOf = (t: DynName) => Number(tierDef('namegroove', t)?.levels?.[0] ?? 1);

type Phase = 'setup' | 'play' | 'over';

export function NameGroove({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isGrooveSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<GrooveSave | null>(null);
  const [fb, setFb] = useState<{ pick: string; correct: boolean; gained: number; round: GrooveRound } | null>(null);
  const [final, setFinal] = useState<ReturnType<typeof grooveResult> | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const t0 = useRef<number | null>(null);

  const stopSound = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stopSound, []);

  const listen = async (s: GrooveSave) => {
    stopSound();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
      const snd = grooveSound(roundOf(s));
      // the answer clock starts with the first sound (the first time only)
      if (t0.current === null) t0.current = performance.now() + 60;
      await piano.play(snd.events, snd.length, ac.signal);
    } catch {
      /* stopped or no audio */
    }
    if (acRef.current === ac) acRef.current = null;
  };

  const begin = (resume: boolean) => {
    const s = resume && resumable ? resumable : newGrooveSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, levelOf(tier), tierInfo ? tier : undefined);
    setRun(s);
    setFb(null);
    setFinal(null);
    onSave(s);
    setPhase('play');
    t0.current = null;
    void listen(s);
  };

  const choose = (id: string) => {
    if (!run || fb) return;
    const round = roundOf(run);
    const ms = t0.current === null ? 0 : performance.now() - t0.current;
    const { state, correct, gained } = grooveAnswer(run, id, ms);
    stopSound();
    setFb({ pick: id, correct, gained, round });
    setRun(state);
    window.setTimeout(
      () => {
        setFb(null);
        t0.current = null;
        if (grooveOver(state)) {
          onSave(null);
          const res = grooveResult(state);
          setFinal(res);
          onResult(res);
          setPhase('over');
          return;
        }
        onSave(state);
        void listen(state);
      },
      correct ? 700 : 1500,
    );
  };

  const back = () => {
    stopSound();
    onExit();
  };

  const round = run && phase === 'play' ? (fb ? fb.round : roundOf(run)) : null;
  const score = run ? run.answers.reduce((a, b) => a + b, 0) : 0;
  const shownRound = run ? Math.min(GROOVE_ROUNDS, run.answers.length + (fb ? 0 : 1)) : 1;
  const name = (id: string) => tx(styleById(id)!.name, lang);

  return (
    <main className={`panel-screen g2 namegroove ${calm ? 'g2-calm' : ''}`} data-game="namegroove" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {shownRound}/{GROOVE_ROUNDS}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="namegroove" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {tx(TX.round, lang)} {resumable.answers.length + 1}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-namegroove-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {run && round && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.round, lang)}</small>
              <b dir="ltr">
                {shownRound}/{GROOVE_ROUNDS}
              </b>
            </span>
            <span>
              <small>{tx(TX.right, lang)}</small>
              <b dir="ltr">{run.right}</b>
            </span>
            <span>
              <small>{tx(TX.score, lang)}</small>
              <b dir="ltr">{score}</b>
            </span>
          </div>
          <p className={`adv-line ${fb ? (fb.correct ? 'ok' : 'bad') : ''}`} aria-live="polite">
            {fb ? (fb.correct ? `+${fb.gained}` : `${tx(TX.wasIt, lang)}: ${name(fb.round.answer)}`) : tx(TX.which, lang)}
          </p>
          <div className="ng-options">
            {round.options.map((id) => (
              <button
                key={id}
                type="button"
                className={`btn ng-opt ${fb && id === fb.round.answer ? 'right' : ''} ${fb && !fb.correct && id === fb.pick ? 'wrong' : ''}`}
                onClick={() => choose(id)}
                disabled={!!fb}
                data-ng-opt={id}
              >
                {name(id)}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => void listen(run)} disabled={!!fb}>
            {tx(TX.again, lang)}
          </button>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="kr-final">
            <span>{tx(TX.score, lang)}</span> <b dir="ltr">{final.score}</b>
          </p>
          <p className="g2-dim">
            {tx(TX.accuracy, lang)} <span dir="ltr">{final.detail.accuracy}%</span> · {tx(TX.right, lang)} <span dir="ltr">{final.detail.right}/{final.detail.rounds}</span>
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
