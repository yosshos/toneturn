// Reharm Spotter (0.70, GAMES_TIERS_PLAN §4): the progression, then reharmonised. Tap the bar that changed, then name
// the substitution. Three lives; the bar and the name both have to be right. Engine: src/engine/reharmSpot.ts.
import '../advgames.css';
import '../reharm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderStimulus, type Stimulus } from '../engine/lesson';
import { jazzProgStim } from '../engine/topicsJazzEar';
import {
  answerCase,
  barSym,
  flatBars,
  isReharmSave,
  newReharm,
  reharmCase,
  reharmResult,
  START_LIVES,
  SUB_NAMES,
  type ReharmCase,
  type ReharmSave,
  type SubKind,
} from '../engine/reharmSpot';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

const TX = {
  en: {
    title: 'Reharm Spotter',
    back: 'Back',
    blurb: 'You hear a progression, then the same progression reharmonised. Find the bar that changed, then name the substitution.',
    rules: 'Three lives. A case counts when the bar and the name are both right. Faster answers score more.',
    start: 'Play',
    cont: (n: number) => `Continue · case ${n}`,
    newGame: 'New game',
    best: 'Best',
    caseN: 'Case',
    score: 'Score',
    lives: 'Lives',
    original: 'Original',
    reharm: 'Reharm',
    both: 'Both again',
    listening: 'Listening…',
    whichBar: 'Which bar changed?',
    whichSub: 'What is the substitution?',
    next: 'Next case',
    finish: 'See results',
    right: 'Right',
    barOnly: 'Right bar, wrong name',
    nameOnly: 'Right name, wrong bar',
    wrong: 'Not this time',
    over: 'Case closed',
    solved: 'Solved',
    newBest: 'New personal best',
    again: 'Play again',
    bar: 'bar',
    level: 'Level',
  },
  he: {
    title: 'גלאי הרה־הרמוניזציה',
    back: 'חזרה',
    blurb: 'שומעים מהלך, ואז את אותו מהלך ברה־הרמוניזציה. מוצאים את התיבה שהשתנתה ונותנים שם לתחליף.',
    rules: 'שלושה חיים. תיק נחשב כשגם התיבה וגם השם נכונים. תשובה מהירה מקבלת יותר.',
    start: 'לנגן',
    cont: (n: number) => `להמשיך · תיק ${n}`,
    newGame: 'משחק חדש',
    best: 'שיא',
    caseN: 'תיק',
    score: 'ניקוד',
    lives: 'חיים',
    original: 'המקור',
    reharm: 'החדש',
    both: 'שוב את שניהם',
    listening: 'מקשיבים…',
    whichBar: 'איזו תיבה השתנתה?',
    whichSub: 'מה התחליף?',
    next: 'לתיק הבא',
    finish: 'לתוצאות',
    right: 'נכון',
    barOnly: 'התיבה נכונה, השם לא',
    nameOnly: 'השם נכון, התיבה לא',
    wrong: 'לא הפעם',
    over: 'התיק נסגר',
    solved: 'נפתרו',
    newBest: 'שיא אישי חדש',
    again: 'לשחק שוב',
    bar: 'תיבה',
    level: 'רמה',
  },
};

type Phase = 'setup' | 'play' | 'reveal' | 'over';
const bpmOf = (bars: number) => (bars >= 8 ? 168 : 144);

export function ReharmSpot({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isReharmSave(saved) ? saved : null;
  const [phase, setPhase] = useState<Phase>('setup');
  const [tier, setTier] = useState<DynName>(() => (resumable && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'mp'));
  const [run, setRun] = useState<ReharmSave | null>(null);
  const [bar, setBar] = useState<number | null>(null);
  const [playing, setPlaying] = useState<'orig' | 'new' | 'both' | null>(null);
  const [reveal, setReveal] = useState<{ barRight: boolean; nameRight: boolean; gained: number; c: ReharmCase; name: SubKind } | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const heardAt = useRef(0);

  const c = run ? reharmCase(run.seed, run.i, run.level, run.bars) : null;

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
    setPlaying(null);
  };
  useEffect(() => stop, []);

  const play = useCallback(async (k: ReharmCase, which: 'orig' | 'new' | 'both', bars: number) => {
    ac.current?.abort();
    const a = new AbortController();
    ac.current = a;
    setPlaying(which);
    const bpm = bpmOf(bars);
    const o = jazzProgStim(k.key, flatBars(k.bars), bpm);
    const n = jazzProgStim(k.key, flatBars(k.reharm), bpm);
    const stim: Stimulus[] = which === 'orig' ? [o] : which === 'new' ? [n] : [o, { kind: 'rest', duration: 0.7 }, n];
    try {
      await piano.unlock();
      const r = renderStimulus(stim);
      await piano.play(r.events, r.length, a.signal);
    } catch {
      /* stopped or no audio */
    }
    if (ac.current === a) {
      ac.current = null;
      setPlaying(null);
      if (which !== 'orig') heardAt.current = performance.now();
    }
  }, []);

  const beginCase = (r: ReharmSave) => {
    setBar(null);
    setReveal(null);
    setPhase('play');
    heardAt.current = performance.now() + 60_000; // the clock starts when the reharm has been heard
    void play(reharmCase(r.seed, r.i, r.level, r.bars), 'both', r.bars);
  };
  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newReharm((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tier);
    setRun(r);
    setRecord(false);
    onSave(r);
    beginCase(r);
  };

  const choose = (name: SubKind) => {
    if (!run || bar === null || phase !== 'play') return;
    stop();
    const ms = Math.max(0, performance.now() - heardAt.current);
    const r = answerCase(run, bar, name, ms);
    setRun(r.save);
    setReveal({ ...r, name });
    if (!r.save.over) onSave(r.save);
    setPhase('reveal');
  };

  const next = () => {
    if (!run) return;
    if (run.over) {
      onSave(null);
      setRecord(run.score > 0 && run.score > (best ?? 0));
      onResult(reharmResult(run));
      setPhase('over');
      return;
    }
    beginCase(run);
  };

  const back = () => {
    stop();
    onExit();
  };

  if (phase === 'setup') {
    return (
      <main className={`panel-screen g2 rh ${calm ? 'g2-calm' : ''}`} data-game="reharm" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>{tx.blurb}</p>
          <p className="g2-dim">{tx.rules}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="reharm" />}
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
                {tx.newGame}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)}>
              {tx.start}
            </button>
          )}
        </section>
      </main>
    );
  }

  if (phase === 'over' && run) {
    return (
      <main className={`panel-screen g2 rh ${calm ? 'g2-calm' : ''}`} data-game="reharm" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card" aria-live="polite">
          <h2>{tx.over}</h2>
          <div className="adv-hud">
            <span>
              <small>{tx.score}</small>
              <b dir="ltr">{run.score}</b>
            </span>
            <span>
              <small>{tx.solved}</small>
              <b dir="ltr">{run.right}</b>
            </span>
            <span>
              <small>{tx.best}</small>
              <b dir="ltr">{Math.max(best ?? 0, run.score)}</b>
            </span>
          </div>
          {record && <p className="adv-line ok">{tx.newBest}</p>}
          <div className="g2-row">
            <button className="btn primary" onClick={() => begin(false)}>
              {tx.again}
            </button>
            <button className="btn ghost" onClick={back}>
              {tx.back}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!run || !c) return null;
  const shown = reveal?.c ?? c;
  const done = phase === 'reveal';
  const line = reveal ? (reveal.barRight && reveal.nameRight ? `${tx.right} · +${reveal.gained}` : reveal.barRight ? tx.barOnly : reveal.nameRight ? tx.nameOnly : tx.wrong) : '';
  const changedText = reveal ? reveal.c.changed.map((k) => `${barSym(reveal.c.key, reveal.c.bars[k])} → ${barSym(reveal.c.key, reveal.c.reharm[k])}`).join(' | ') : '';

  return (
    <main className={`panel-screen g2 rh rh-play ${calm ? 'g2-calm' : ''}`} data-game="reharm" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {tx.caseN} {run.i + (done ? 0 : 1)}
        </span>
      </G2Head>
      <div className="adv-hud" aria-live="polite">
        <span>
          <small>{tx.lives}</small>
          <b dir="ltr">
            {run.lives}/{START_LIVES}
          </b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
        <span>
          <small>{tx.level}</small>
          <i className="dyn">{run.tier}</i>
        </span>
      </div>

      <div className="rh-listen" role="group">
        <button type="button" className={`btn ${playing === 'orig' ? 'on' : ''}`} onClick={() => (playing ? stop() : void play(shown, 'orig', run.bars))} data-rh-play="orig">
          {tx.original}
        </button>
        <button type="button" className={`btn ${playing === 'new' ? 'on' : ''}`} onClick={() => (playing ? stop() : void play(shown, 'new', run.bars))} data-rh-play="new">
          {tx.reharm}
        </button>
        <button type="button" className={`btn ghost ${playing === 'both' ? 'on' : ''}`} onClick={() => (playing ? stop() : void play(shown, 'both', run.bars))}>
          {tx.both}
        </button>
      </div>
      <p className="g2-dim rh-status" aria-live="polite">
        {playing ? tx.listening : done ? changedText : tx.whichBar}
      </p>

      <div className={`rh-bars n${shown.bars.length}`} dir="ltr" role="radiogroup" aria-label={tx.whichBar}>
        {shown.bars.map((_, k) => {
          const isChanged = done && shown.changed.includes(k);
          const cls = done ? (isChanged ? 'ok' : bar === k ? 'bad' : '') : bar === k ? 'on' : '';
          return (
            <button key={k} type="button" role="radio" aria-checked={bar === k} aria-label={`${tx.bar} ${k + 1}`} className={`rh-bar ${cls}`} disabled={done} onClick={() => setBar(k)} data-rh-bar={k}>
              {k + 1}
            </button>
          );
        })}
      </div>

      <p className="rh-ask">{tx.whichSub}</p>
      <div className="adv-grid rh-names">
        {shown.options.map((o) => {
          const cls = done ? (o === shown.kind ? 'ok' : o === reveal?.name ? 'bad' : '') : '';
          return (
            <button key={o} type="button" className={`btn ${cls}`} disabled={done || bar === null} onClick={() => choose(o)} data-rh-name={o}>
              {SUB_NAMES[o][lang]}
            </button>
          );
        })}
      </div>

      <p className={`adv-line ${reveal ? (reveal.barRight && reveal.nameRight ? 'ok' : 'bad') : ''}`} aria-live="assertive">
        {line}
      </p>
      {done && (
        <button className="btn primary mega" onClick={next} data-rh-next>
          {run.over ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
