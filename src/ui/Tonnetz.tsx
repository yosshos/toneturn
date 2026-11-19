// Tonnetz (Symmetry unit, 2026-11-19): walk the grid of fifths and thirds from a start triad to a target triad with
// P, L, R — fewest moves wins, every move plays the chord. The grid re-centres on the current triad; its three
// neighbours carry their move's letter (a neighbour can be tapped too). pp–mp: the target is named and shown; mf–ff:
// heard only. Saved after every move. Engine: src/engine/tonnetz.ts (theory: src/engine/symmetry.ts).

import '../advgames.css';
import '../tonnetz.css';
import { useEffect, useRef, useState } from 'react';
import { TZ_ITEMS, baseFor, isTzSave, neighbourCell, newTzSave, nodePc, nodeXY, tzCells, tzCurrent, tzItem, tzLevel, tzLimit, tzMove, tzOver, tzResult, tzWhy, type TzCell, type TzSave } from '../engine/tonnetz';
import { mod12, OPS, sameTriad, triadName, triadVoicing, type Op, type Triad } from '../engine/symmetry';
import { pcName } from '../engine/topicKit';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { Sym, WhyLine } from './NewGameBits';
import { Icon } from './icons';

const TX = {
  en: {
    title: 'Tonnetz',
    back: 'Back',
    blurb: 'Every triangle is a triad; each move shifts one note. Reach the target in the fewest moves.',
    blurbEar: 'The target is only heard: find it on the grid in the fewest moves.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    score: 'Score',
    moves: 'Moves',
    par: 'Fewest',
    from: 'From',
    to: 'To',
    heard: 'by ear',
    hearTarget: 'Hear the target',
    hearNow: 'Hear this chord',
    perfect: (n: number) => `In ${n} — the fewest`,
    over: (n: number, par: number) => `Reached in ${n} · fewest ${par}`,
    lost: 'Out of moves',
    next: 'Next',
    finish: 'See results',
    done: 'Run over',
  },
  he: {
    title: 'טונץ',
    back: 'חזרה',
    blurb: 'כל משולש הוא אקורד; כל מהלך מזיז צליל אחד. מגיעים ליעד בכמה שפחות מהלכים.',
    blurbEar: 'שומעים את היעד בלבד: מוצאים אותו ברשת בכמה שפחות מהלכים.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    score: 'ניקוד',
    moves: 'מהלכים',
    par: 'מינימום',
    from: 'מ־',
    to: 'אל',
    heard: 'בשמיעה',
    hearTarget: 'לשמוע את היעד',
    hearNow: 'לשמוע את האקורד',
    perfect: (n: number) => `ב־${n} — הכי קצר`,
    over: (n: number, par: number) => `הגעתם ב־${n} · אפשר ב־${par}`,
    lost: 'נגמרו המהלכים',
    next: 'הבא',
    finish: 'לתוצאות',
    done: 'הריצה נגמרה',
  },
};
type Phase = 'setup' | 'play' | 'answered' | 'over';

/** A triad as a short chord (a bass root under the close voicing). */
function chordEvents(t: Triad, near: number[] | undefined, at: number, dur = 0.95): { ev: NoteEvent[]; voicing: number[] } {
  const v = triadVoicing(t, near);
  const ev: NoteEvent[] = v.map((m) => ({ midi: m, start: at, duration: dur, velocity: 0.42 }));
  ev.push({ midi: 36 + mod12(t.root - 36), start: at, duration: dur, velocity: 0.5, inst: 'bass' });
  return { ev, voicing: v };
}

const W = 56; // one grid step on screen (SVG units)
const HALF = 3;
const xy = (i: number, j: number): [number, number] => {
  const [x, y] = nodeXY(i, j);
  return [x * W, y * W];
};
const poly = (c: TzCell) => c.nodes.map(([a, b]) => xy(a, b).join(',')).join(' ');
const centroid = (c: TzCell): [number, number] => {
  const ps = c.nodes.map(([a, b]) => xy(a, b));
  return [ps.reduce((s, p) => s + p[0], 0) / 3, ps.reduce((s, p) => s + p[1], 0) / 3];
};

function Grid({ cur, target, showTarget, onCell }: { cur: Triad; target: Triad; showTarget: boolean; onCell: (op: Op) => void }) {
  const base = baseFor(cur);
  const cells = tzCells(base, HALF);
  const nb = new Map(OPS.map((op) => [(() => { const n = neighbourCell(cur, op); return `${n.i},${n.j},${n.up}`; })(), op] as const));
  // the target triangle nearest the centre (when shown)
  const tCells = showTarget ? cells.filter((c) => sameTriad(c.triad, target)) : [];
  const tNear = tCells.sort((a, b) => Math.hypot(...centroid(a)) - Math.hypot(...centroid(b)))[0];
  const nodes = new Map<string, [number, number]>();
  for (const c of cells) for (const [a, b] of c.nodes) nodes.set(`${a},${b}`, [a, b]);
  const xs = [...nodes.values()].map(([a, b]) => xy(a, b));
  const minX = Math.min(...xs.map((p) => p[0])) - 18;
  const maxX = Math.max(...xs.map((p) => p[0])) + 18;
  const minY = Math.min(...xs.map((p) => p[1])) - 16;
  const maxY = Math.max(...xs.map((p) => p[1])) + 16;
  return (
    <svg className="tz-grid" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} direction="ltr" role="img" aria-label={triadName(cur)} data-tz-grid>
      {cells.map((c) => {
        const key = `${c.i},${c.j},${c.up}`;
        const op = nb.get(key);
        const isCur = c.i === 0 && c.j === 0 && c.up === !cur.minor;
        const isT = tNear === c;
        const cls = ['tz-tri', c.up ? 'up' : 'dn', isCur ? 'cur' : '', isT ? 'target' : '', op ? 'nb' : ''].join(' ');
        const [cx, cy] = centroid(c);
        return (
          <g key={key} className={cls} onClick={op ? () => onCell(op) : undefined} data-tz-cell={op ?? (isCur ? 'cur' : isT ? 'target' : undefined)}>
            <polygon points={poly(c)} />
            {(isCur || isT) && (
              <text x={cx} y={cy + 5} className="tz-name">
                {triadName(c.triad)}
              </text>
            )}
            {op && !isT && (
              <text x={cx} y={cy + 5} className="tz-op">
                {op}
              </text>
            )}
          </g>
        );
      })}
      {[...nodes.values()].map(([a, b]) => {
        const [x, y] = xy(a, b);
        return (
          <g key={`n${a},${b}`} className="tz-node">
            <circle cx={x} cy={y} r={11} />
            <text x={x} y={y + 4}>
              {pcName(nodePc(base, a, b))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Tonnetz({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isTzSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<TzSave | null>(null);
  /** The finished round shown in the answered phase: its item, the triad reached and the verdict. */
  const [last, setLast] = useState<{ i: number; now: Triad; ok: boolean; text: string } | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const voicing = useRef<number[] | undefined>(undefined);
  const runRef = useRef<TzSave | null>(null);
  runRef.current = run;

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
  };
  useEffect(() => () => stop(), []);

  const sound = async (chords: Triad[], gap = 1.05) => {
    stop();
    const a = new AbortController();
    ac.current = a;
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    if (a.signal.aborted) return;
    const ev: NoteEvent[] = [];
    let near = voicing.current;
    chords.forEach((t, k) => {
      const c = chordEvents(t, near, 0.05 + k * gap);
      ev.push(...c.ev);
      near = c.voicing;
    });
    voicing.current = near;
    void piano.play(ev, 0.1 + chords.length * gap + 0.4, a.signal).catch(() => {});
  };

  const openRound = (r: TzSave) => {
    const it = tzItem(r.seed, r.level, r.i);
    voicing.current = undefined;
    setLast(null);
    setPhase('play');
    const cur = tzCurrent(r);
    void sound(r.moves.length ? [it.target, cur] : [it.start, it.target]);
  };

  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newTzSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tzLevel(tier), tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    openRound(r);
  };
  const end = (r: TzSave) => {
    stop();
    onSave(null);
    const res = tzResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const move = (op: Op) => {
    const r = runRef.current;
    if (!r || phase !== 'play') return;
    const it = tzItem(r.seed, r.level, r.i);
    const st = tzMove(r, op);
    setRun(st.save);
    void sound([st.now]);
    if (!st.ended) {
      onSave(st.save);
      return;
    }
    const text = st.perfect ? `${tx.perfect(st.used)} · +${st.gained}` : st.reached ? `${tx.over(st.used, it.par)} · +${st.gained}` : tx.lost;
    setLast({ i: r.i, now: st.now, ok: st.perfect, text });
    if (!tzOver(st.save)) onSave(st.save);
    setPhase('answered');
  };

  const next = () => {
    const r = runRef.current;
    if (!r) return;
    if (tzOver(r)) return end(r);
    openRound(r);
  };
  useEffect(() => {
    if (phase !== 'answered' || !last?.ok) return;
    const id = window.setTimeout(next, 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, last]);

  const back = () => {
    stop();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng tz ${calm ? 'g2-calm' : ''}`} data-game="tonnetz" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={tzLevel(tier) >= 4 ? tx.blurbEar : tx.blurb} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="tonnetz" />}
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
    const r = tzResult(run);
    return (
      <main className={`panel-screen g2 ng tz ${calm ? 'g2-calm' : ''}`} data-game="tonnetz" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.done} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  if (!run) return null;
  const answered = phase === 'answered' && last;
  const roundI = answered ? last.i : run.i;
  const item = tzItem(run.seed, run.level, roundI);
  const cur = answered ? last.now : tzCurrent(run);
  const used = answered ? 0 : run.moves.length;
  const showTarget = !item.ear || !!answered;

  return (
    <main className={`panel-screen g2 ng tz tz-play ${calm ? 'g2-calm' : ''}`} data-game="tonnetz" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(TZ_ITEMS, roundI + 1)}/{TZ_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
        <span>
          <small>{tx.moves}</small>
          <b dir="ltr" data-tz-moves>
            {answered ? '–' : `${used}/${tzLimit(item.par)}`}
          </b>
        </span>
        <span>
          <small>{tx.par}</small>
          <b dir="ltr">{item.par}</b>
        </span>
      </div>
      <div className="tz-route">
        <span className="tz-end">
          <small>{tx.from}</small>
          <Sym text={triadName(item.start)} />
        </span>
        <span className="tz-arrow" aria-hidden>
          {lang === 'he' ? '←' : '→'}
        </span>
        <span className={`tz-end tz-goal ${showTarget ? '' : 'hidden'}`} data-tz-target>
          <small>{tx.to}</small>
          {showTarget ? <Sym text={triadName(item.target)} /> : <b>{tx.heard}</b>}
        </span>
        <button type="button" className="icon-btn tz-hear" onClick={() => void sound([item.target])} aria-label={tx.hearTarget} data-tz-hear>
          <Icon k="speaker" />
        </button>
        <button type="button" className="icon-btn tz-hear" onClick={() => void sound([cur])} aria-label={tx.hearNow}>
          <Icon k="play" />
        </button>
      </div>
      <Grid cur={cur} target={item.target} showTarget={showTarget} onCell={move} />
      {phase === 'play' ? (
        <div className="tz-ops" dir="ltr">
          {OPS.map((op) => (
            <button key={op} type="button" className="btn primary mega tz-op-btn" onClick={() => move(op)} data-tz-op={op}>
              {op}
            </button>
          ))}
        </div>
      ) : null}
      <WhyLine key={`${roundI}-${phase}`} lang={lang} ok={answered ? last.ok : null} line={answered ? <IsoMix text={last.text} /> : ''} why={answered && !last.ok ? tzWhy(item, lang) : null} />
      {answered && !last.ok && (
        <button className="btn primary mega" onClick={next} data-tz-next>
          {tzOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
