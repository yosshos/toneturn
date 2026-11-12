// The screen of the take-based instrument games (0.76: Play It Back, Roots by Ear, Walk the Changes, Chord Change
// Race): setup (input, tier, start / continue), then per take Listen (where the game has one) and Play — a count-in and
// the measured take — a one-line verdict, and the results. Three lives: a take under 70 % costs one. The game supplies
// its item, its sound, its measured take and its board (src/engine/instGames.ts has the pure parts).

import '../advgames.css';
import '../instgames.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { addTakeScore, isTakeSave, newTakeSave, takeRunOver, takeRunResult, TAKE_LIVES, TAKE_PASS, TAKES_PER_RUN, type TakeGame, type TakeSave } from '../engine/instGames';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { Settings } from '../storage/progress';
import type { GameScreenProps } from './gameProps';
import type { MeasuredInput } from './instCapture';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
export type TakePhase = 'setup' | 'ready' | 'hear' | 'open' | 'play' | 'review' | 'over' | 'mic-error';
export interface TakeOutcome {
  score: number;
  /** One line under the verdict (what was right / missed). */
  line: string;
  /** Per-cell marks for the board. */
  marks?: string[];
}
export interface TakeCtx<I> {
  item: I;
  save: TakeSave;
  input: MeasuredInput;
  signal: AbortSignal;
  settings: Settings;
  lang: Lang;
  setPhase: (p: TakePhase) => void;
  /** The board's live cursor (a cell index, −1 = none). */
  setCell: (i: number) => void;
}
export interface TakeGameCfg<I> {
  game: TakeGame;
  className: string;
  tx: { title: Bi; blurb: Bi; unit: Bi; play: Bi; playing: Bi };
  inputs: MeasuredInput[];
  defaultInput: (course: string | undefined) => MeasuredInput;
  /** The item of take i. */
  item: (s: TakeSave, i: number) => I;
  hear?: (c: Omit<TakeCtx<I>, 'input'>) => Promise<void>;
  take: (c: TakeCtx<I>) => Promise<TakeOutcome | 'mic-error' | null>;
  board: (p: { item: I; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) => ReactNode;
}

const TX = {
  back: { en: 'Back', he: 'חזרה' },
  input: { en: 'Play into', he: 'לנגן דרך' },
  mic: { en: 'Microphone', he: 'מיקרופון' },
  midiIn: { en: 'MIDI', he: 'MIDI' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  lives: { en: 'Lives', he: 'חיים' },
  avg: { en: 'Average', he: 'ממוצע' },
  listen: { en: 'Listen', he: 'להקשיב' },
  hearing: { en: 'Listening…', he: 'מקשיבים…' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  micErr: { en: 'The microphone did not open. Try MIDI, or allow the microphone.', he: 'המיקרופון לא נפתח. נסו MIDI, או אשרו גישה למיקרופון.' },
  next: { en: 'Next', he: 'הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  take: { en: 'Take', he: 'טייק' },
  lifeLost: { en: 'Under 70 % — one life lost.', he: 'מתחת ל־70% — ירד חיים אחד.' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
};
const tx = (b: Bi, l: Lang) => b[l];

export function TakeShell<I>({ cfg, lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps & { cfg: TakeGameCfg<I> }) {
  const calm = prefersCalm(settings);
  const resumable = isTakeSave(saved, cfg.game) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [input, setInput] = useState<MeasuredInput>(() => cfg.defaultInput(settings.activeCourse));
  const [phase, setPhase] = useState<TakePhase>('setup');
  const [run, setRun] = useState<TakeSave | null>(null);
  const [outcome, setOutcome] = useState<TakeOutcome | null>(null);
  const [cell, setCell] = useState(-1);
  const [final, setFinal] = useState<ReturnType<typeof takeRunResult> | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const total = TAKES_PER_RUN[cfg.game];

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stop, []);

  const idx = run ? (phase === 'review' || phase === 'over' ? run.takes.length - 1 : run.takes.length) : 0;
  const item: I | null = run ? cfg.item(run, Math.max(0, idx)) : null;

  const begin = (resume: boolean) => {
    stop();
    const d = tierDef(cfg.game, tier);
    const r = resume && resumable ? resumable : newTakeSave(cfg.game, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, Number(d?.levels?.[0] ?? 1), Number(d?.params?.bpm ?? 90), tierInfo ? tier : undefined);
    setRun(r);
    setOutcome(null);
    setFinal(null);
    onSave(r);
    setPhase('ready');
  };

  const hear = async () => {
    if (!run || !item || !cfg.hear) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setPhase('hear');
    try {
      await cfg.hear({ item, save: run, signal: ac.signal, settings, lang, setPhase, setCell });
    } catch {
      /* stopped */
    }
    setCell(-1);
    if (acRef.current === ac) setPhase('ready');
  };

  const take = async () => {
    if (!run || !item) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setOutcome(null);
    let res: TakeOutcome | 'mic-error' | null = null;
    try {
      res = await cfg.take({ item, save: run, input, signal: ac.signal, settings, lang, setPhase, setCell });
    } catch {
      res = null;
    }
    setCell(-1);
    if (acRef.current !== ac) return;
    stop();
    if (res === 'mic-error') {
      setPhase('mic-error');
      return;
    }
    if (!res) {
      setPhase('ready');
      return;
    }
    setOutcome(res);
    const next = addTakeScore(run, res.score);
    setRun(next);
    if (takeRunOver(next)) {
      onSave(null);
      const r = takeRunResult(next, input);
      setFinal(r);
      onResult(r);
    } else onSave(next);
    setPhase('review');
  };

  const back = () => {
    stop();
    onExit();
  };
  const avg = run && run.takes.length ? Math.round(run.takes.reduce((a, b) => a + b, 0) / run.takes.length) : null;
  const shown = run ? Math.min(total, run.takes.length + (phase === 'review' ? 0 : 1)) : 0;

  return (
    <main className={`panel-screen g2 inst-game ${cfg.className} ${calm ? 'g2-calm' : ''}`} data-game={cfg.game} data-phase={phase}>
      <G2Head title={tx(cfg.tx.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && (
          <span className="g2-hud-mini" dir="ltr">
            {shown}/{total}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(cfg.tx.blurb, lang)}</p>
          {cfg.inputs.length > 1 && (
            <fieldset className="seg-field">
              <legend>{tx(TX.input, lang)}</legend>
              <div className="seg g2-seg" role="radiogroup" aria-label={tx(TX.input, lang)}>
                {cfg.inputs.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={input === k} className={input === k ? 'on' : ''} onClick={() => setInput(k)}>
                    {tx(k === 'mic' ? TX.mic : TX.midiIn, lang)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game={cfg.game} />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {tx(cfg.tx.unit, lang)} {resumable.takes.length + 1}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-take-start>
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
              <small>{tx(cfg.tx.unit, lang)}</small>
              <b dir="ltr">
                {shown}/{total}
              </b>
            </span>
            <span>
              <small>{tx(TX.lives, lang)}</small>
              <b dir="ltr">
                {run.lives}/{TAKE_LIVES}
              </b>
            </span>
            <span>
              <small>{tx(TX.avg, lang)}</small>
              <b dir="ltr">{avg === null ? '–' : `${avg}%`}</b>
            </span>
          </div>
          {cfg.board({ item, save: run, phase, outcome, cell, lang })}
          <p className={`adv-line ${phase === 'review' && outcome ? (outcome.score >= TAKE_PASS ? 'ok' : 'bad') : ''}`} aria-live="polite">
            {phase === 'hear' ? tx(TX.hearing, lang) : phase === 'open' ? tx(TX.opening, lang) : phase === 'play' ? tx(cfg.tx.playing, lang) : phase === 'review' && outcome ? `${tx(TX.take, lang)} ${outcome.score}%` : ''}
          </p>
          {phase === 'review' && outcome && (
            <p className="g2-dim inst-detail">
              {outcome.line}
              {outcome.score < TAKE_PASS ? ` · ${tx(TX.lifeLost, lang)}` : ''}
            </p>
          )}
          <div className="g2-col inst-actions">
            {phase === 'ready' && (
              <>
                {cfg.hear && (
                  <button className="btn" onClick={() => void hear()} data-take-hear>
                    {tx(TX.listen, lang)}
                  </button>
                )}
                <button className="btn primary mega" onClick={() => void take()} data-take-play>
                  {tx(cfg.tx.play, lang)}
                </button>
              </>
            )}
            {phase === 'review' && (
              <button className="btn primary mega" onClick={() => (final ? setPhase('over') : (setOutcome(null), setPhase('ready')))}>
                {final ? tx(TX.finish, lang) : tx(TX.next, lang)}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="inst-final">
            <span>{tx(TX.accuracy, lang)}</span> <b dir="ltr">{final.detail.accuracy}%</b>
          </p>
          <p className="g2-dim" dir="ltr">
            {run?.takes.map((x) => `${x}%`).join(' · ')}
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
