// Changes Crossword (AUDIT-GAMES §4.2 #4): hear the bars, fill each bar's root, quality and (mp–f) bass. "Check" locks
// every right part; the wrong ones get one fix pass (only those bars replayed). Five puzzles; partial credit per part.
// The run is saved after every puzzle (resume after Back / reload). Engine: src/engine/crossword.ts.

import { useEffect, useRef, useState } from 'react';
import { CW_PUZZLES, cellText, cwAdd, cwCredit, cwFilled, cwGrade, cwLevel, cwOver, cwPoints, cwPuzzle, cwResult, cwWhy, emptyCells, fixBars, isCwSave, locksOf, newCwSave, type CwCell, type CwLocks, type CwPuzzle, type CwSave } from '../engine/crossword';
import { GQ_LABEL, GX_LABEL, progEvents, suffixOf, type GQ, type GX, type GridGrade } from '../engine/progGrid';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { WhyLine } from './NewGameBits';
import { IsoMix } from './Iso';

const TX = {
  en: {
    title: 'Changes Crossword',
    back: 'Back',
    blurb: 'Hear the bars, then fill each one: root, quality and, from mp, the bass. Check locks what is right; the rest gets one more try.',
    start: 'Start',
    cont: (n: number) => `Continue · puzzle ${n}`,
    newRun: 'New run',
    best: 'Best',
    puzzle: 'Puzzle',
    score: 'Score',
    hear: 'Hear it',
    hearWrong: 'Hear the open bars',
    root: 'Root',
    quality: 'Quality',
    bass: 'Bass',
    check: 'Check',
    checkFix: 'Check again',
    next: 'Next puzzle',
    finish: 'See results',
    solved: 'Solved',
    fixIt: (n: number) => `${n} open — fix them`,
    got: (pct: number, pts: number) => `${pct}% · +${pts}`,
    over: 'Crossword done',
    accuracy: 'Parts right',
    bar: 'Bar',
  },
  he: {
    title: 'תשבץ המהלכים',
    back: 'חזרה',
    blurb: 'שומעים את התיבות וממלאים כל אחת: שורש, סוג, ומ־mp גם הבס. "בדיקה" נועלת את מה שנכון; השאר מקבל עוד ניסיון.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · תשבץ ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    puzzle: 'תשבץ',
    score: 'ניקוד',
    hear: 'לשמוע',
    hearWrong: 'לשמוע את הפתוחות',
    root: 'שורש',
    quality: 'סוג',
    bass: 'בס',
    check: 'בדיקה',
    checkFix: 'לבדוק שוב',
    next: 'לתשבץ הבא',
    finish: 'לתוצאות',
    solved: 'נפתר',
    fixIt: (n: number) => `${n} פתוחות — לתקן`,
    got: (pct: number, pts: number) => `${pct}% · +${pts}`,
    over: 'התשבץ הושלם',
    accuracy: 'חלקים נכונים',
    bar: 'תיבה',
  },
};
type Stage = 'first' | 'fix' | 'done';
type Phase = 'setup' | 'play' | 'over';
const BASS_LABEL: Record<string, { en: string; he: string }> = {
  none: { en: 'root', he: 'שורש' },
  '/3': { en: '3rd', he: 'טרצה' },
  '/5': { en: '5th', he: 'קווינטה' },
  '/7': { en: '7th', he: 'ספטימה' },
};
const EMPTY_LOCKS = (n: number): CwLocks => ({ root: Array(n).fill(false), q: Array(n).fill(false), x: Array(n).fill(false) });

export function ChangesCrossword({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isCwSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<CwSave | null>(null);
  const [cells, setCells] = useState<CwCell[]>([]);
  const [sel, setSel] = useState(0);
  const [stage, setStage] = useState<Stage>('first');
  const [locks, setLocks] = useState<CwLocks>(EMPTY_LOCKS(4));
  const [first, setFirst] = useState<GridGrade | null>(null);
  const [last, setLast] = useState<{ grade: GridGrade; credit: number; pts: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);

  const p: CwPuzzle | null = run ? cwPuzzle(run.seed, run.level, run.credits.length - (stage === 'done' ? 1 : 0)) : null;

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const play = async (pz: CwPuzzle, bars?: number[]) => {
    stop();
    const a = new AbortController();
    ac.current = a;
    setPlaying(true);
    try {
      await piano.unlock();
      let ev: NoteEvent[];
      let len: number;
      if (!bars) ({ events: ev, length: len } = progEvents(pz.cells, pz.voicing, pz.bpm));
      else {
        ev = [];
        let t = 0;
        for (const i of bars) {
          const r = progEvents([pz.cells[i]], pz.voicing, pz.bpm);
          ev.push(...r.events.map((e) => ({ ...e, start: e.start + t })));
          t += r.length + 0.3;
        }
        len = t;
      }
      await piano.play(ev, len, a.signal);
    } catch {
      /* stopped */
    }
    if (ac.current === a) {
      ac.current = null;
      setPlaying(false);
    }
  };

  const startPuzzle = (r: CwSave) => {
    const pz = cwPuzzle(r.seed, r.level, r.credits.length);
    setCells(emptyCells(pz.cells.length));
    setLocks(EMPTY_LOCKS(pz.cells.length));
    setSel(0);
    setStage('first');
    setFirst(null);
    setLast(null);
    setPhase('play');
    void play(pz);
  };
  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newCwSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, cwLevel(tier), tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    startPuzzle(r);
  };

  const setPart = (part: 'root' | 'q' | 'x', v: number | GQ | GX) => {
    if (!p || stage === 'done') return;
    const lk = part === 'root' ? locks.root : part === 'q' ? locks.q : locks.x;
    if (lk[sel]) return;
    const next = cells.map((c, i) => (i === sel ? { ...c, [part]: v } : c));
    setCells(next);
    // a bar complete → the next open bar
    const c = next[sel];
    if (c.root !== null && c.q !== null && (!p.extras.length || c.x !== null)) {
      const open = next.findIndex((x, i) => i > sel && (x.root === null || x.q === null || (p.extras.length > 0 && x.x === null) || (stage === 'fix' && !(locks.root[i] && locks.q[i] && locks.x[i]))));
      if (open >= 0) setSel(open);
    }
  };

  const check = () => {
    if (!p || !run) return;
    stop();
    const g = cwGrade(p, cells);
    if (stage === 'first' && g.score < 1) {
      setFirst(g);
      setLocks(locksOf(g));
      setStage('fix');
      const bars = fixBars(g);
      setSel(bars[0] ?? 0);
      // the wrong parts clear for the fix pass
      setCells(cells.map((c, i) => ({ root: g.marks[i].root ? c.root : null, q: g.marks[i].quality ? c.q : null, x: g.marks[i].extra ? c.x : null })));
      return;
    }
    const credit = stage === 'first' ? 1 : cwCredit(first!.score, g.score);
    const pts = cwPoints(credit, run.level);
    const next = cwAdd(run, credit);
    setRun(next);
    setLast({ grade: g, credit, pts });
    setLocks(locksOf(g));
    setStage('done');
    if (!cwOver(next)) onSave(next);
  };

  const after = () => {
    if (!run) return;
    if (cwOver(run)) {
      onSave(null);
      const r = cwResult(run);
      setRecord(r.score > 0 && r.score > (best ?? 0));
      onResult(r);
      setPhase('over');
      return;
    }
    startPuzzle(run);
  };

  const back = () => {
    stop();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng cw ${calm ? 'g2-calm' : ''}`} data-game="crossword" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={tx.blurb} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="crossword" />}
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx.cont(resumable.credits.length + 1)}
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

  if (phase === 'over' && run) {
    const r = cwResult(run);
    return (
      <main className={`panel-screen g2 ng cw ${calm ? 'g2-calm' : ''}`} data-game="crossword" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} stats={[{ label: tx.accuracy, value: <span dir="ltr">{r.detail.accuracy}%</span> }]} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  if (!run || !p) return null;
  const done = stage === 'done';
  const asked = p.extras.length > 0;
  const g = done ? last!.grade : stage === 'fix' ? first : null;
  const open = g ? fixBars(g).length : 0;
  const cur = cells[sel] ?? { root: null, q: null, x: null };
  const line = done ? (last!.credit >= 0.999 ? `${tx.solved} · +${last!.pts}` : tx.got(Math.round(last!.credit * 100), last!.pts)) : stage === 'fix' ? tx.fixIt(open) : '';
  const shown = run.credits.length + (done ? 0 : 1);

  return (
    <main className={`panel-screen g2 ng cw cw-play ${calm ? 'g2-calm' : ''}`} data-game="crossword" data-phase={done ? 'reveal' : stage}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {shown}/{CW_PUZZLES}
        </span>
      </G2Head>
      <div className="cw-top">
        <button type="button" className={`btn ${playing ? 'on' : ''}`} onClick={() => (playing ? stop() : void play(p, stage === 'fix' ? fixBars(first!) : undefined))} data-cw-hear>
          {stage === 'fix' ? tx.hearWrong : tx.hear}
        </button>
        <span className="cw-score">
          <small>{tx.score}</small> <b dir="ltr">{run.score}</b>
        </span>
      </div>
      <div className={`cw-bars n${p.cells.length}`} dir="ltr" role="radiogroup" aria-label={tx.bar}>
        {cells.map((c, i) => {
          const m = g?.marks[i];
          const fullLock = locks.root[i] && locks.q[i] && (!asked || locks.x[i]);
          const text = done ? cellText(p, i) : `${c.root !== null ? p.spell[c.root] : '·'}${c.q !== null ? suffixOf(c.q, 'none') : ''}${asked && c.x && c.x !== 'none' ? ` ${c.x}` : ''}`;
          const cls = ['cw-bar', i === sel && !done ? 'sel' : '', fullLock ? 'locked' : '', done && m && !m.ok ? 'bad' : '', done && m?.ok ? 'ok' : ''].join(' ');
          return (
            <button key={i} type="button" role="radio" aria-checked={i === sel} aria-label={`${tx.bar} ${i + 1}`} className={cls} disabled={done} onClick={() => setSel(i)} data-cw-bar={i}>
              <small>{i + 1}</small>
              <span>{text}</span>
            </button>
          );
        })}
      </div>
      {!done && (
        <div className="cw-chips">
          <div className="cw-row roots" role="group" aria-label={tx.root} dir="ltr">
            {p.spell.map((name, r) => (
              <button key={r} type="button" className={`chip ${cur.root === r ? 'on' : ''}`} disabled={locks.root[sel]} onClick={() => setPart('root', r)} data-cw-root={r}>
                {name}
              </button>
            ))}
          </div>
          <div className="cw-row" role="group" aria-label={tx.quality} dir="ltr">
            {p.qualities.map((q) => (
              <button key={q} type="button" className={`chip ${cur.q === q ? 'on' : ''}`} disabled={locks.q[sel]} onClick={() => setPart('q', q)} data-cw-q={q}>
                {GQ_LABEL[q]}
              </button>
            ))}
          </div>
          {asked && (
            <div className="cw-row bass" role="group" aria-label={tx.bass}>
              <span className="cw-row-label">{tx.bass}</span>
              {p.extras.map((x) => (
                <button key={x} type="button" className={`chip ${cur.x === x ? 'on' : ''}`} disabled={locks.x[sel]} onClick={() => setPart('x', x)} data-cw-x={x} title={GX_LABEL[x]}>
                  {BASS_LABEL[x][lang]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <WhyLine key={`${run.credits.length}-${stage}`} lang={lang} ok={done ? last!.credit >= 0.999 : stage === 'fix' ? false : null} line={line} why={done && last!.credit < 0.999 ? cwWhy(p, last!.grade, lang) : null} />
      {done ? (
        <button className="btn primary mega" onClick={after} data-cw-next>
          {cwOver(run) ? tx.finish : tx.next}
        </button>
      ) : (
        <button className="btn primary mega" onClick={check} disabled={!cwFilled(p, cells)} data-cw-check>
          {stage === 'fix' ? tx.checkFix : tx.check}
        </button>
      )}
    </main>
  );
}

