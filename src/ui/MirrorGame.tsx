// Mirror (negative harmony): a key and its axis on a one-octave keyboard; a note, chord or cadence sounds and is shown;
// tap its mirror (the key on the keyboard, or the chord) before the clock runs out. Rounds speed up; three lives;
// saved after every answer. Engine: src/engine/mirrorGame.ts.

import { useEffect, useRef, useState } from 'react';
import { MIRROR_ITEMS, MIRROR_LIVES, isMirrorSave, mirrorAnswer, mirrorItem, mirrorLevel, mirrorOver, mirrorResult, mirrorWhy, newMirrorSave, roundMs, type MirrorItem, type MirrorSave } from '../engine/mirrorGame';
import { pc } from '../engine/newGamesKit';
import { nearVoicing } from '../engine/topicsHarris2';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { Sym, WhyLine } from './NewGameBits';

const TX = {
  en: {
    title: 'Mirror',
    back: 'Back',
    blurb: 'A note or chord sounds. Tap its mirror around the axis of the key — fast. Every round is quicker.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    lives: 'Lives',
    score: 'Score',
    key: (k: string) => `${k} major`,
    axis: 'axis',
    askNote: 'Its mirror? Tap the key',
    askChord: 'Its mirror?',
    askCad: 'The cadence in the mirror?',
    hear: 'Hear it again',
    right: 'Right',
    wrong: 'Not this one',
    late: 'Time is up',
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
  },
  he: {
    title: 'מראה',
    back: 'חזרה',
    blurb: 'צליל או אקורד נשמע. מקישים על ההשתקפות שלו סביב הציר של הסולם — מהר. כל סיבוב מהיר יותר.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    lives: 'חיים',
    score: 'ניקוד',
    key: (k: string) => `${k} מז׳ור`,
    axis: 'ציר',
    askNote: 'ההשתקפות? הקישו על הקליד',
    askChord: 'ההשתקפות?',
    askCad: 'הקדנצה במראה?',
    hear: 'לשמוע שוב',
    right: 'נכון',
    wrong: 'לא זה',
    late: 'נגמר הזמן',
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
  },
};
type Phase = 'setup' | 'play' | 'answered' | 'over';
const BLACK = new Set([1, 3, 6, 8, 10]);

/** A chord: the root in the bass, the notes close above it, led smoothly from the last chord. */
function chordEvents(chords: { root: number; pcs: number[] }[], step = 0.85): NoteEvent[] {
  const ev: NoteEvent[] = [];
  let prev: number[] | null = null;
  chords.forEach((c, i) => {
    const t = 0.05 + i * step;
    const len = i === chords.length - 1 ? step * 1.6 : step * 0.95;
    const v = nearVoicing(c.pcs, prev, 55, 79, 72);
    prev = v;
    ev.push({ midi: 36 + pc(c.root), start: t, duration: len, velocity: 0.55, inst: 'bass' });
    for (const m of v) ev.push({ midi: m, start: t + 0.01, duration: len, velocity: 0.42 });
  });
  return ev;
}
/** What a round plays: a note after a soft tonic chord, or the chord(s). */
function askEvents(q: MirrorItem): { ev: NoteEvent[]; len: number } {
  if (q.kind === 'note') {
    const tonic = [0, 4, 7].map((x) => 48 + pc(q.key) + x);
    return { ev: [...tonic.map((m) => ({ midi: m, start: 0.05, duration: 0.55, velocity: 0.26 })), { midi: 60 + pc(q.src.pcs[0]), start: 0.75, duration: 1, velocity: 0.5 }], len: 1.9 };
  }
  const cs = q.src.chords ?? [];
  return { ev: chordEvents(cs), len: 0.4 + cs.length * 0.85 * 1.3 };
}
/** The reveal: what sounded, then its mirror. */
function revealEvents(q: MirrorItem): { ev: NoteEvent[]; len: number } {
  if (q.kind === 'note')
    return {
      ev: [
        { midi: 60 + pc(q.src.pcs[0]), start: 0.05, duration: 0.6, velocity: 0.45 },
        { midi: 60 + pc(q.mir.pcs[0]), start: 0.75, duration: 0.9, velocity: 0.5 },
      ],
      len: 1.8,
    };
  const a = q.src.chords ?? [];
  const b = q.mir.chords ?? [];
  const gap = 0.4 + a.length * 0.85;
  return { ev: [...chordEvents(a, 0.7), ...chordEvents(b, 0.7).map((e) => ({ ...e, start: e.start + gap }))], len: gap + b.length * 0.7 * 1.4 + 0.3 };
}

export function MirrorGame({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isMirrorSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<MirrorSave | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const [record, setRecord] = useState(false);
  const [clock, setClock] = useState(1);
  const shownAt = useRef(0);
  const ac = useRef<AbortController | null>(null);
  const runRef = useRef<MirrorSave | null>(null);
  runRef.current = run;
  const phaseRef = useRef<Phase>('setup');
  phaseRef.current = phase;

  const sound = async ({ ev, len }: { ev: NoteEvent[]; len: number }) => {
    ac.current?.abort();
    const a = new AbortController();
    ac.current = a;
    try {
      await piano.unlock();
      await piano.play(ev, len, a.signal);
    } catch {
      /* stopped */
    }
  };
  useEffect(() => () => ac.current?.abort(), []);

  const show = (r: MirrorSave) => {
    setPicked(null);
    setVerdict(null);
    setClock(1);
    shownAt.current = performance.now();
    setPhase('play');
    void sound(askEvents(mirrorItem(r.seed, r.level, r.i)));
  };
  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newMirrorSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, mirrorLevel(tier), tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    show(r);
  };
  const end = (r: MirrorSave) => {
    onSave(null);
    const res = mirrorResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const answer = (id: string | null) => {
    const r = runRef.current;
    if (!r || phaseRef.current !== 'play') return;
    const it = mirrorItem(r.seed, r.level, r.i);
    const { save, ok, gained } = mirrorAnswer(r, id, performance.now() - shownAt.current);
    setPicked(id);
    setRun(save);
    const label = id && it.kind === 'note' ? it.cells[pc(Number(id.slice(1)) - it.key)] : id;
    setVerdict({ ok, text: ok ? `${tx.right} · +${gained}` : id === null ? tx.late : label ? `${tx.wrong}: ${label}` : tx.wrong });
    if (!mirrorOver(save)) onSave(save);
    setPhase('answered');
    void sound(revealEvents(it));
  };

  // The round's clock: it shrinks every round; at zero the round counts as missed.
  useEffect(() => {
    if (phase !== 'play' || !run) return;
    const limit = roundMs(run.level, run.i);
    const id = window.setInterval(() => {
      const left = 1 - (performance.now() - shownAt.current) / limit;
      setClock(Math.max(0, left));
      if (left <= 0) answer(null);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run?.i]);

  const next = () => {
    if (!run) return;
    if (mirrorOver(run)) return end(run);
    show(run);
  };
  useEffect(() => {
    if (phase !== 'answered' || !verdict?.ok || !run) return;
    const id = window.setTimeout(next, calm ? 1800 : 1300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verdict]);

  const back = () => {
    ac.current?.abort();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng hn mg ${calm ? 'g2-calm' : ''}`} data-game="mirror" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={tx.blurb} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="mirror" />}
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
    const r = mirrorResult(run);
    return (
      <main className={`panel-screen g2 ng hn mg ${calm ? 'g2-calm' : ''}`} data-game="mirror" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  if (!run) return null;
  const answered = phase === 'answered';
  const q = mirrorItem(run.seed, run.level, answered ? run.i - 1 : run.i);
  const isNote = q.kind === 'note';
  const srcSet = new Set(q.src.pcs.map(pc));
  const mirSet = new Set(q.mir.pcs.map(pc));
  const askLine = isNote ? tx.askNote : q.kind === 'cadence' ? tx.askCad : tx.askChord;

  return (
    <main className={`panel-screen g2 ng hn hn-play mg ${calm ? 'g2-calm' : ''}`} data-game="mirror" data-phase={phase} data-mg-kind={q.kind}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(MIRROR_ITEMS, run.i + (answered ? 0 : 1))}/{MIRROR_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.lives}</small>
          <b dir="ltr">
            {run.lives}/{MIRROR_LIVES}
          </b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
      </div>
      <div className="hn-clock" aria-hidden="true">
        <i style={{ inlineSize: `${Math.round((answered ? 0 : clock) * 100)}%` }} />
      </div>
      <div className="mg-board">
        <p className="mg-key-line">
          <b>
            <IsoMix text={tx.key(q.keyName)} />
          </b>
          <span>
            {tx.axis} <Sym text={`${q.axis[0]}|${q.axis[1]}`} />
          </span>
        </p>
        <div className="mg-kbd" dir="ltr" data-mg-kbd>
          {q.cells.map((name, s) => {
            const p = pc(q.key + s);
            const id = `n${p}`;
            const cls = [
              BLACK.has(p) ? 'blk' : '',
              srcSet.has(p) ? 'src' : '',
              answered && mirSet.has(p) ? 'mir' : '',
              answered && isNote && picked === id && id !== q.answer ? 'bad' : '',
            ].join(' ');
            const showName = srcSet.has(p) || (answered && mirSet.has(p)) || s === 0;
            return (
              <button key={s} type="button" className={`mg-cell ${cls}`} disabled={!isNote || answered} onClick={() => answer(id)} aria-label={name} data-mg-cell={p}>
                <span>{showName ? name : ''}</span>
                <i aria-hidden="true" />
              </button>
            );
          })}
          <span className="mg-axis" style={{ insetInlineStart: `calc(3px + (100% - 8px) * ${4 / 12})` }} aria-hidden="true" />
          <span className="mg-axis" style={{ insetInlineStart: `calc(3px + (100% - 8px) * ${10 / 12})` }} aria-hidden="true" />
        </div>
        <button type="button" className="tj-from mg-src" onClick={() => void sound(answered ? revealEvents(q) : askEvents(q))} aria-label={tx.hear} data-mg-src>
          <Sym text={q.kind === 'cadence' ? `${q.src.label} → ${q.tonic}` : q.src.label} />
          {answered && (
            <span className="tj-to">
              <Sym text={q.kind === 'cadence' ? `↔ ${q.mir.label} → ${q.tonic}` : `↔ ${q.mir.label}`} />
            </span>
          )}
        </button>
        <p className="hn-ask">
          <IsoMix text={askLine} />
        </p>
      </div>
      {!isNote && (
        <div className={`adv-grid hn-choices ${q.kind === 'cadence' ? 'mg-cad' : ''}`} dir="ltr">
          {q.choices.map((c) => {
            const cls = answered ? (c.id === q.answer ? 'ok' : c.id === picked ? 'bad' : '') : '';
            return (
              <button key={c.id} type="button" className={`btn ${cls}`} disabled={answered} onClick={() => answer(c.id)} data-mg-choice={c.id}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok ? mirrorWhy(q, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-mg-next>
          {mirrorOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
