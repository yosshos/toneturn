// Hold the Note (AUDIT-GAMES §4.2 #5): one note, many chords. The held note sounds; pick the chord that keeps it, or
// what it is over the chord, fast (quicker answers score more). f: a 4-bar chain — which bar drops it. ff: "8 ways, no
// repeats" — tap eight chords that hold it, or play them on a MIDI keyboard. Three lives; saved after every answer.
// Engine: src/engine/holdNote.ts.

import { useEffect, useRef, useState } from 'react';
import { HOLD_LIVES, HOLD_WAYS, heldName, holdAnswer, holdItem, holdItems, holdLevel, holdOver, holdPick, holdResult, holdSpeed, holdWhy, isHoldSave, newHoldSave, playedWay, type HoldQ, type HoldSave } from '../engine/holdNote';
import { CT_Q, identifyChord, type CtQ } from '../engine/commonTone';
import { pc } from '../engine/newGamesKit';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck } from './InputCheck';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { Sym, WhyLine } from './NewGameBits';

const TX = {
  en: {
    title: 'Hold the Note',
    back: 'Back',
    blurb: 'One note sounds and stays. Which chord keeps it — and what is it over that chord? Answer fast: quick answers score more.',
    blurbFf: 'Eight different chords that hold the note: tap them, or play them on your MIDI keyboard. No repeats.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    lives: 'Lives',
    score: 'Score',
    which: (n: string) => `Which chord has ${n}?`,
    degree: (n: string) => `${n} over this chord is…`,
    chain: (n: string) => `Which bar drops ${n}?`,
    ways: (n: string) => `8 chords that hold ${n}`,
    found: 'Found',
    hear: 'Hear the note',
    right: 'Right',
    wrong: 'Not this one',
    repeat: 'Already found',
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
    bar: 'Bar',
  },
  he: {
    title: 'להחזיק את הצליל',
    back: 'חזרה',
    blurb: 'צליל אחד נשמע ונשאר. איזה אקורד שומר עליו — ומה הוא מעל האקורד? עונים מהר: תשובה מהירה מקבלת יותר.',
    blurbFf: 'שמונה אקורדים שונים שמחזיקים את הצליל: מקישים עליהם, או מנגנים אותם במקלדת MIDI. בלי חזרות.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    lives: 'חיים',
    score: 'ניקוד',
    which: (n: string) => `${n}: באיזה אקורד הוא נמצא?`,
    degree: (n: string) => `${n} מעל האקורד הזה הוא…`,
    chain: (n: string) => `${n}: באיזו תיבה הוא נעלם?`,
    ways: (n: string) => `8 אקורדים שמחזיקים את ${n}`,
    found: 'נמצאו',
    hear: 'לשמוע את הצליל',
    right: 'נכון',
    wrong: 'לא זה',
    repeat: 'כבר נמצא',
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
    bar: 'תיבה',
  },
};
type Phase = 'setup' | 'play' | 'answered' | 'over';

/** The held note (octave 5) with a chord under it (close, below the note). */
function chordUnder(held: number, root: number, q: CtQ): NoteEvent[] {
  const top = 72 + pc(held);
  const ints = CT_Q[q].ints.map((x) => x % 12);
  let r = top - 12 - pc(top - 12 - root);
  if (r > top - 7) r -= 12;
  const ns = [...new Set(ints.map((x) => r + x))].filter((m) => m < top);
  return [...ns.map((m) => ({ midi: m, start: 0.05, duration: 1.4, velocity: 0.36 })), { midi: r - 12, start: 0.05, duration: 1.4, velocity: 0.5, inst: 'bass' as const }, { midi: top, start: 0.05, duration: 1.6, velocity: 0.55 }];
}
const parseChord = (id: string): { root: number; q: CtQ } => {
  const [r, q] = id.split('.');
  return { root: Number(r), q: q as CtQ };
};

export function HoldTheNote({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isHoldSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<HoldSave | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; gained: number; text: string } | null>(null);
  const [wrongChips, setWrongChips] = useState<string[]>([]);
  const [record, setRecord] = useState(false);
  const [clock, setClock] = useState(1);
  const shownAt = useRef(0);
  const ac = useRef<AbortController | null>(null);
  const runRef = useRef<HoldSave | null>(null);
  runRef.current = run;

  const q: HoldQ | null = run && !holdOver(run) ? holdItem(run.seed, run.level, run.i) : null;
  const isFf = (run?.level ?? holdLevel(tier)) >= 6;

  const sound = async (ev: NoteEvent[], len = 1.8) => {
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
  const playHeld = (held: number) => void sound([{ midi: 72 + pc(held), start: 0.05, duration: 1.6, velocity: 0.6 }]);
  useEffect(() => () => ac.current?.abort(), []);

  // the speed bar: full at the start, empty at 15 s
  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setClock((holdSpeed(performance.now() - shownAt.current) - 1) / 0.5), 200);
    return () => window.clearInterval(id);
  }, [phase, run?.i]);

  const show = (r: HoldSave) => {
    setPicked(null);
    setVerdict(null);
    setWrongChips([]);
    setClock(1);
    shownAt.current = performance.now();
    setPhase('play');
    const it = holdItem(r.seed, r.level, r.i);
    playHeld(it.held);
  };
  const begin = (resume: boolean) => {
    const r = resume && resumable ? resumable : newHoldSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, holdLevel(tier), settings.midiInput ? 'midi' : 'touch', tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    show(r);
  };
  const end = (r: HoldSave) => {
    onSave(null);
    const res = holdResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const answer = (id: string) => {
    if (!run || !q || phase !== 'play' || q.kind === 'ways') return;
    const ok = id === q.answer;
    const { save, gained } = holdAnswer(run, ok, performance.now() - shownAt.current);
    setPicked(id);
    setRun(save);
    setVerdict({ ok, gained, text: ok ? `${tx.right} · +${gained}` : tx.wrong });
    if (!holdOver(save)) onSave(save);
    setPhase('answered');
    if (q.kind === 'which') void sound(chordUnder(q.held, q.right.root, q.right.q));
    else if (q.kind === 'degree') void sound(chordUnder(q.held, q.chord.root, q.chord.q));
  };

  const pick = (id: string, holds: boolean, label: string) => {
    const r = runRef.current;
    if (!r || phase !== 'play') return;
    const it = holdItem(r.seed, r.level, r.i);
    if (it.kind !== 'ways') return;
    const res = holdPick(r, id, holds, performance.now() - shownAt.current);
    if (res.result === 'repeat') {
      setVerdict({ ok: true, gained: 0, text: tx.repeat });
      return;
    }
    setRun(res.save);
    const ch = parseChord(id);
    void sound(chordUnder(it.held, ch.root, ch.q), 1.6);
    if (res.result === 'wrong') {
      setWrongChips((w) => [...w, id]);
      setVerdict({ ok: false, gained: 0, text: `${tx.wrong}: ${label}` });
    } else {
      setVerdict({ ok: true, gained: res.gained, text: `${label} · +${res.gained}` });
      shownAt.current = performance.now();
    }
    if (holdOver(res.save)) return end(res.save);
    onSave(res.save);
    // a finished board: the next one
    if (res.save.i !== r.i) window.setTimeout(() => show(res.save), 700);
  };

  // ff: chords played on a MIDI keyboard count as picks (the notes held together within 150 ms).
  useEffect(() => {
    if (phase !== 'play' || !isFf) return;
    const held = new Set<number>();
    let timer = 0;
    const off = midiInput.onNote((n, on) => {
      if (on) held.add(n);
      else held.delete(n);
      window.clearTimeout(timer);
      if (!on || held.size < 3) return;
      timer = window.setTimeout(() => {
        const r = runRef.current;
        if (!r) return;
        const w = playedWay(holdItem(r.seed, r.level, r.i).held, identifyChord([...held]));
        if (w) pick(w.id, w.holds, w.label);
      }, 150);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isFf, run?.i]);

  const next = () => {
    if (!run) return;
    if (holdOver(run)) return end(run);
    show(run);
  };
  // a right answer moves on by itself
  useEffect(() => {
    if (phase !== 'answered' || !verdict?.ok || !run) return;
    const id = window.setTimeout(next, 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verdict]);

  const back = () => {
    ac.current?.abort();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng hn ${calm ? 'g2-calm' : ''}`} data-game="holdnote" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={holdLevel(tier) >= 6 ? tx.blurbFf : tx.blurb} />
          </p>
          {holdLevel(tier) >= 6 && <InputCheck mode="midi" lang={lang} />}
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="holdnote" />}
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
    const r = holdResult(run);
    return (
      <main className={`panel-screen g2 ng hn ${calm ? 'g2-calm' : ''}`} data-game="holdnote" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  // the question on screen (after an answer the run has moved on; show the answered one)
  const shownQ = phase === 'answered' && run ? holdItem(run.seed, run.level, run.i - 1) : q;
  if (!run || !shownQ) return null;
  const n = heldName(shownQ.held);
  const ask = shownQ.kind === 'which' ? tx.which(n) : shownQ.kind === 'degree' ? tx.degree(n) : shownQ.kind === 'chain' ? tx.chain(n) : tx.ways(n);
  const answered = phase === 'answered';
  const total = holdItems(run.level);

  return (
    <main className={`panel-screen g2 ng hn hn-play ${calm ? 'g2-calm' : ''}`} data-game="holdnote" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(total, run.i + (answered ? 0 : 1))}/{total}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.lives}</small>
          <b dir="ltr">
            {run.lives}/{HOLD_LIVES}
          </b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{run.score}</b>
        </span>
        {shownQ.kind === 'ways' && (
          <span>
            <small>{tx.found}</small>
            <b dir="ltr">
              {run.found.length}/{HOLD_WAYS}
            </b>
          </span>
        )}
      </div>
      <div className="hn-clock" aria-hidden="true">
        <i style={{ inlineSize: `${Math.round((answered ? 0 : clock) * 100)}%` }} />
      </div>
      <button type="button" className="hn-held" onClick={() => playHeld(shownQ.held)} aria-label={tx.hear} data-hn-held>
        <Sym text={n} />
      </button>
      {shownQ.kind === 'degree' && (
        <p className="hn-chord">
          <Sym text={shownQ.chord.sym} />
        </p>
      )}
      <p className="hn-ask">
        <IsoMix text={ask} />
      </p>
      {shownQ.kind === 'chain' && (
        <div className="hn-chain" dir="ltr" role="group" aria-label={tx.bar}>
          {shownQ.bars.map((s, k) => {
            const id = String(k);
            const cls = answered ? (id === shownQ.answer ? 'ok' : id === picked ? 'bad' : '') : '';
            return (
              <button key={k} type="button" className={`btn hn-bar ${cls}`} disabled={answered} onClick={() => answer(id)} data-hn-choice={id}>
                <small>{k + 1}</small>
                <span>{s}</span>
              </button>
            );
          })}
        </div>
      )}
      {(shownQ.kind === 'which' || shownQ.kind === 'degree') && (
        <div className="adv-grid hn-choices" dir="ltr">
          {shownQ.choices.map((c) => {
            const cls = answered ? (c.id === shownQ.answer ? 'ok' : c.id === picked ? 'bad' : '') : '';
            return (
              <button key={c.id} type="button" className={`btn ${cls}`} disabled={answered} onClick={() => answer(c.id)} data-hn-choice={c.id}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
      {shownQ.kind === 'ways' && (
        <div className="hn-ways" dir="ltr">
          {shownQ.chips.map((c) => {
            const cls = run.found.includes(c.id) ? 'ok' : wrongChips.includes(c.id) ? 'bad' : '';
            return (
              <button key={c.id} type="button" className={`chip ${cls}`} disabled={!!cls} onClick={() => pick(c.id, c.holds, c.label)} data-hn-chip={c.id}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok && shownQ.kind !== 'ways' ? holdWhy(shownQ, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-hn-next>
          {holdOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
