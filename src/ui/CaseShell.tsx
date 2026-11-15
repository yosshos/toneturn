// The screen of the case-based new games (AUDIT-GAMES §4.2, 2026-11-15: Border Control, Which Brother?, Elevator):
// setup (blurb, tier, input where the tier plays on the keys, the input check, start / continue), then case after case
// with three lives — the game draws its board and calls `answer` — a one-line verdict ("Why?" only on a wrong answer),
// Next, and the shared Rush result card. The run is saved after every case, so Back / reload resumes it.

import { IsoMix } from './Iso';
import '../advgames.css';
import '../newgames.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { answerCaseRun, caseRunResult, CASE_LIVES, isCaseRun, newCaseRun, type CaseRun } from '../engine/caseRun';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck } from './InputCheck';
import { RushResultCard } from './GameResult';
import { SetupSheet } from './SetupSheet';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
export type CaseInput = 'choice' | 'midi' | 'touch';

export interface CaseAnswer {
  got: number;
  of: number;
  /** Shown under the verdict when the case was wrong (the "Why?" expander). */
  why?: Bi | string;
  /** The answer, shown on a wrong case (one short line, e.g. "D♭7"). */
  was?: string;
  /** Key mastery: the case's key and accuracy (MIDI play only). */
  key?: number;
}
export interface BoardCtx<G extends string> {
  run: CaseRun<G>;
  /** The case shown (its index; the run's `i` moves on once answered). */
  idx: number;
  input: CaseInput;
  lang: Lang;
  /** The case was answered (the board shows its reveal). */
  done: boolean;
  answer: (a: CaseAnswer) => void;
}
export interface CaseGameCfg<G extends string> {
  game: G;
  className: string;
  title: Bi;
  blurb: Bi;
  /** The input a tier uses: 'choice' (ear) or the keys (MIDI, with on-screen keys as practice). */
  inputFor: (level: number) => 'choice' | 'keys';
  /** Practice note for the on-screen keys (they never clear a tier where the game is measured-only). */
  touchNote?: Bi;
  board: (c: BoardCtx<G>) => ReactNode;
  /** Base points of a fully right case. */
  base?: number;
  /** Extra result fields (e.g. stamps as right / wrong). */
  result?: (r: CaseRun<G>) => Record<string, unknown>;
  /** The key-mastery instrument for MIDI play. */
  keyInst?: 'piano' | 'guitar';
  /** Small "More" sheet content on the setup. */
  more?: (lang: Lang) => ReactNode;
}

const TX = {
  back: { en: 'Back', he: 'חזרה' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  input: { en: 'Play on', he: 'לנגן על' },
  midiIn: { en: 'MIDI keyboard', he: 'מקלדת MIDI' },
  touch: { en: 'Screen (practice)', he: 'מסך (תרגול)' },
  lives: { en: 'Lives', he: 'חיים' },
  score: { en: 'Score', he: 'ניקוד' },
  level: { en: 'Level', he: 'רמה' },
  caseN: { en: 'Case', he: 'מקרה' },
  right: { en: 'Right', he: 'נכון' },
  part: { en: 'Half right', he: 'חצי נכון' },
  wrong: { en: 'Not this time', he: 'לא הפעם' },
  was: { en: 'It was', he: 'זה היה' },
  why: { en: 'Why?', he: 'למה?' },
  next: { en: 'Next', he: 'הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  over: { en: 'Results', he: 'תוצאות' },
  best: { en: 'Best', he: 'שיא' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
};
const tx = (b: Bi, l: Lang) => b[l];

export function CaseShell<G extends string>({ cfg, lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps & { cfg: CaseGameCfg<G> }) {
  const calm = prefersCalm(settings);
  const resumable = isCaseRun(saved, cfg.game) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const levelOf = (t: DynName) => Number(tierDef(cfg.game, t)?.levels?.[0] ?? 1);
  // MIDI when a keyboard is set up (or the resumed run used it), else the screen keys
  const [keysInput, setKeysInput] = useState<'midi' | 'touch'>(() => (resumable?.input === 'touch' || resumable?.input === 'midi' ? (resumable.input as 'midi' | 'touch') : settings.midiInput ? 'midi' : 'touch'));
  const [phase, setPhase] = useState<'setup' | 'play' | 'over'>('setup');
  const [run, setRun] = useState<CaseRun<G> | null>(null);
  const [idx, setIdx] = useState(0);
  const [verdict, setVerdict] = useState<{ ok: boolean; gained: number; got: number; of: number; why?: Bi | string; was?: string } | null>(null);
  const keyLog = useRef<{ key: number; acc: number }[]>([]);
  const prevBest = useRef(best ?? 0);
  const asked = useRef(0);

  const level = levelOf(tier);
  const plays = cfg.inputFor(level) === 'keys';
  const input: CaseInput = cfg.inputFor(run?.level ?? level) === 'keys' ? (run?.input === 'touch' ? 'touch' : run?.input === 'midi' ? 'midi' : keysInput) : 'choice';

  useEffect(() => {
    asked.current = performance.now();
  }, [idx, phase]);

  const begin = (resume: boolean) => {
    const d = tierDef(cfg.game, tier);
    const n = Number(d?.params?.run ?? d?.params?.cases ?? 8);
    const inp = cfg.inputFor(level) === 'keys' ? keysInput : 'choice';
    const r = resume && resumable ? resumable : newCaseRun(cfg.game, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tierInfo ? tier : 'pp', level, n, inp);
    prevBest.current = best ?? 0;
    keyLog.current = [];
    setRun(r);
    setIdx(r.i);
    setVerdict(null);
    onSave(r);
    setPhase('play');
  };

  const answer = (a: CaseAnswer) => {
    if (!run || verdict) return;
    const ms = Math.max(0, performance.now() - asked.current);
    const res = answerCaseRun(run, a.got, a.of, ms, cfg.base ?? 10);
    if (a.key !== undefined && run.input === 'midi') keyLog.current.push({ key: a.key, acc: res.ok ? 100 : Math.round((100 * a.got) / Math.max(1, a.of)) });
    setRun(res.save);
    setVerdict({ ok: res.ok, gained: res.gained, got: a.got, of: a.of, why: a.why, was: a.was });
    if (!res.save.over) onSave(res.save);
    else {
      // the run is recorded at once (leaving before "See results" loses nothing)
      onSave(null);
      const r = caseRunResult(res.save, cfg.result?.(res.save) ?? {});
      const keyed = keyLog.current;
      onResult(keyed.length && cfg.keyInst ? { ...r, detail: { ...r.detail, keyInst: cfg.keyInst, keyTakes: keyed } } : r);
    }
  };

  const next = () => {
    if (!run) return;
    if (run.over) {
      setPhase('over');
      return;
    }
    setVerdict(null);
    setIdx(run.i);
  };

  const back = () => onExit();
  const line = verdict ? (verdict.ok ? `${tx(TX.right, lang)} · +${verdict.gained}` : verdict.got > 0 ? tx(TX.part, lang) : tx(TX.wrong, lang)) : '';
  const whyText = verdict?.why ? (typeof verdict.why === 'string' ? verdict.why : verdict.why[lang]) : '';

  return (
    <main className={`panel-screen g2 ng ${cfg.className} ${calm ? 'g2-calm' : ''}`} data-game={cfg.game} data-phase={phase === 'play' && verdict ? 'reveal' : phase}>
      <G2Head title={tx(cfg.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.min(run.cases, idx + 1)}/{run.cases}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>
            <IsoMix text={tx(cfg.blurb, lang)} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game={cfg.game} />}
          {plays && (
            <div className="seg g2-seg" role="radiogroup" aria-label={tx(TX.input, lang)}>
              {(['midi', 'touch'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={keysInput === k} className={keysInput === k ? 'on' : ''} onClick={() => setKeysInput(k)}>
                  <IsoMix text={tx(k === 'midi' ? TX.midiIn : TX.touch, lang)} />
                </button>
              ))}
            </div>
          )}
          {plays && keysInput === 'midi' && <InputCheck mode="midi" lang={lang} />}
          {plays && keysInput === 'touch' && cfg.touchNote && <p className="g2-dim">{tx(cfg.touchNote, lang)}</p>}
          {cfg.more && (
            <SetupSheet lang={lang} id={cfg.game}>
              {cfg.more(lang)}
            </SetupSheet>
          )}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)} data-ng-start>
                {tx(TX.cont, lang)} · {tx(TX.caseN, lang)} <span dir="ltr">{resumable.i + 1}</span>
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

      {phase === 'play' && run && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.lives, lang)}</small>
              <b dir="ltr">
                {run.lives}/{CASE_LIVES}
              </b>
            </span>
            <span>
              <small>{tx(TX.score, lang)}</small>
              <b dir="ltr">{run.score}</b>
            </span>
            <span>
              <small>{tx(TX.level, lang)}</small>
              <i className="dyn">{run.tier}</i>
            </span>
          </div>
          <div className="ng-board" key={idx}>
            {cfg.board({ run, idx, input, lang, done: !!verdict, answer })}
          </div>
          <div className="ng-foot">
            <p className={`adv-line ${verdict ? (verdict.ok ? 'ok' : 'bad') : ''}`} aria-live="assertive" data-ng-verdict={verdict ? (verdict.ok ? 'ok' : 'bad') : ''}>
              {line}
              {verdict && !verdict.ok && verdict.was ? (
                <>
                  {' · '}
                  {tx(TX.was, lang)} <bdi dir="ltr">{verdict.was}</bdi>
                </>
              ) : null}
            </p>
            {verdict && !verdict.ok && whyText && (
              <details className="ng-why">
                <summary>{tx(TX.why, lang)}</summary>
                <p>
                  <IsoMix text={whyText} />
                </p>
              </details>
            )}
            {verdict && (
              <button className="btn primary mega" onClick={next} data-ng-next>
                {run.over ? tx(TX.finish, lang) : tx(TX.next, lang)}
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
          right={run.right}
          wrong={run.wrong}
          stats={[
            { label: tx(TX.accuracy, lang), value: <span dir="ltr">{run.parts.total ? Math.round((100 * run.parts.right) / run.parts.total) : 0}%</span>, key: 'acc' },
            { label: tx(TX.level, lang), value: <i className="dyn">{run.tier}</i>, key: 'lv' },
          ]}
          note={run.input === 'touch' && cfg.touchNote ? tx(cfg.touchNote, lang) : undefined}
          onAgain={() => begin(false)}
          onBack={back}
        />
      )}
    </main>
  );
}
