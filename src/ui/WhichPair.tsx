// Which Pair? (triad pairs, deep): a chord sounds; pick the triad pair that fits it. Quick answers score more; right
// answers in a row build the streak. mf: the pair sounds over its chord, name its colour · f: the colours it adds ·
// ff: play the pair on a MIDI keyboard. Three lives; saved after every answer. Engine: src/engine/whichPair.ts.

import { useEffect, useRef, useState } from 'react';
import { WP_ITEMS, WP_LIVES, isWPSave, newWPSave, playedPair, wpAnswer, wpItem, wpLevel, wpOver, wpResult, wpSpeed, wpWhy, type WPQ, type WPSave } from '../engine/whichPair';
import { EAR_BASE, chordTonesOf, coreHex, coreTriads, patternUp } from '../engine/triadPairs';
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
    title: 'Which Pair?',
    back: 'Back',
    blurb: 'A chord sounds. Pick the triad pair that fits it. Answer fast: quick answers score more.',
    blurbFf: 'A chord sounds. Play its triad pair on your MIDI keyboard: all six notes, any octave.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    lives: 'Lives',
    score: 'Score',
    streak: 'Streak',
    pick: (c: string) => `${c}: which pair?`,
    colour: 'Which colour is this pair?',
    adds: 'Which colours does it add?',
    play: (c: string) => `${c}: play its pair`,
    hear: 'Hear it again',
    right: 'Right',
    wrong: 'Not this one',
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
    wait: 'Waiting for your six notes…',
  },
  he: {
    title: 'איזה זוג?',
    back: 'חזרה',
    blurb: 'אקורד נשמע. בוחרים את זוג המשולשים שמתאים לו. עונים מהר: תשובה מהירה שווה יותר.',
    blurbFf: 'אקורד נשמע. מנגנים את זוג המשולשים שלו במקלדת MIDI: כל ששת הצלילים, בכל אוקטבה.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    lives: 'חיים',
    score: 'ניקוד',
    streak: 'רצף',
    pick: (c: string) => `${c}: איזה זוג?`,
    colour: 'איזה צבע הזוג הזה?',
    adds: 'אילו צבעים הוא מוסיף?',
    play: (c: string) => `${c}: נגנו את הזוג שלו`,
    hear: 'לשמוע שוב',
    right: 'נכון',
    wrong: 'לא זה',
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
    wait: 'מחכים לשישה צלילים…',
  },
};
type Phase = 'setup' | 'play' | 'answered' | 'over';

/** The chord under a question: the root low (bass), the chord's tones in the middle (mf / f: the plain chord of its group). */
function chordEvents(q: WPQ, len: number): NoteEvent[] {
  const ivs = q.kind === 'pick' ? chordTonesOf(q.pair.scale) : EAR_BASE[q.group];
  const root = 48 + pc(q.root - 48);
  const mid = ivs.filter((x) => x !== 0).map((x) => root + x).map((m) => (m < 52 ? m + 12 : m));
  return [{ midi: root - 12, start: 0.05, duration: len, velocity: 0.5, inst: 'bass' as const }, ...mid.map((m) => ({ midi: m, start: 0.05, duration: len, velocity: 0.34 }))];
}
/** The pair as a line over the chord: alternating inversions up from the first triad's root, and back. */
function pairEvents(q: WPQ, start: number): NoteEvent[] {
  const [A, B] = coreTriads(q.pair, q.root);
  const lo = 64 + pc(A[0] - 64);
  const up = patternUp(A, B, 'inv', lo, lo + 15);
  const line = [...up, ...up.slice(0, -1).reverse()].slice(0, 12);
  return line.map((m, i) => ({ midi: m, start: start + i * 0.22, duration: 0.24, velocity: 0.62 }));
}

export function WhichPair({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isWPSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<WPSave | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; gained: number; text: string } | null>(null);
  const [record, setRecord] = useState(false);
  const [clock, setClock] = useState(1);
  const shownAt = useRef(0);
  const ac = useRef<AbortController | null>(null);
  const runRef = useRef<WPSave | null>(null);
  runRef.current = run;
  const phaseRef = useRef<Phase>('setup');
  phaseRef.current = phase;

  const q: WPQ | null = run && !wpOver(run) ? wpItem(run.seed, run.level, run.i) : null;
  const level = run?.level ?? wpLevel(tier);
  const played = level >= 6 && run?.input === 'midi';

  const sound = async (ev: NoteEvent[], len: number) => {
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
  /** The question's sound: the chord (mf / f: the pair line over its plain chord). */
  const ask = (it: WPQ) => {
    if (it.kind === 'pick') return void sound(chordEvents(it, 1.8), 2);
    void sound([...chordEvents(it, 3.4), ...pairEvents(it, 0.4)], 3.6);
  };
  /** After an answer: the pair over its chord. */
  const reveal = (it: WPQ) => void sound([...chordEvents({ ...it, kind: 'pick' } as WPQ, 3.4), ...pairEvents(it, 0.4)], 3.6);
  useEffect(() => () => ac.current?.abort(), []);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setClock((wpSpeed(performance.now() - shownAt.current) - 1) / 0.5), 200);
    return () => window.clearInterval(id);
  }, [phase, run?.i]);

  const show = (r: WPSave) => {
    setPicked(null);
    setVerdict(null);
    setClock(1);
    shownAt.current = performance.now();
    setPhase('play');
    ask(wpItem(r.seed, r.level, r.i));
  };
  const begin = (resume: boolean) => {
    const lv = wpLevel(tier);
    const r = resume && resumable ? resumable : newWPSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, lv, lv >= 6 && settings.midiInput ? 'midi' : 'touch', tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    show(r);
  };
  const end = (r: WPSave) => {
    onSave(null);
    const res = wpResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const answer = (id: string, byMidi = false) => {
    const r = runRef.current;
    if (!r || phaseRef.current !== 'play') return;
    const it = wpItem(r.seed, r.level, r.i);
    const ok = id === it.answer;
    const { save, gained } = wpAnswer(r, ok, performance.now() - shownAt.current, byMidi);
    setPicked(id);
    setRun(save);
    setVerdict({ ok, gained, text: ok ? `${tx.right} · +${gained}` : tx.wrong });
    if (!wpOver(save)) onSave(save);
    setPhase('answered');
    reveal(it);
  };

  // ff on MIDI: six different notes — right when they are the pair's six; a note outside the pair ends the try at once.
  useEffect(() => {
    if (phase !== 'play' || !played) return;
    const notes: number[] = [];
    const off = midiInput.onNote((n, on) => {
      if (!on) return;
      const r = runRef.current;
      if (!r) return;
      const it = wpItem(r.seed, r.level, r.i);
      notes.push(n);
      const six = coreHex(it.pair, it.root);
      if (!six.includes(pc(n))) return answer('played', true);
      if (new Set(notes.map(pc)).size >= six.length) answer(playedPair(it, notes) ? it.answer : 'played', true);
    });
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, played, run?.i]);

  const next = () => {
    if (!run) return;
    if (wpOver(run)) return end(run);
    show(run);
  };
  useEffect(() => {
    if (phase !== 'answered' || !verdict?.ok || !run) return;
    const id = window.setTimeout(next, 1600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verdict]);

  const back = () => {
    ac.current?.abort();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng hn tj wp ${calm ? 'g2-calm' : ''}`} data-game="whichpair" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={wpLevel(tier) >= 6 ? tx.blurbFf : tx.blurb} />
          </p>
          {wpLevel(tier) >= 6 && <InputCheck mode="midi" lang={lang} />}
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="whichpair" />}
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
    const r = wpResult(run);
    return (
      <main className={`panel-screen g2 ng hn tj wp ${calm ? 'g2-calm' : ''}`} data-game="whichpair" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  const shownQ = phase === 'answered' && run ? wpItem(run.seed, run.level, run.i - 1) : q;
  if (!run || !shownQ) return null;
  const answered = phase === 'answered';
  const chordName = shownQ.kind === 'pick' ? shownQ.chord : '';
  const askLine = shownQ.kind === 'pick' ? (played ? tx.play(chordName) : tx.pick(chordName)) : shownQ.kind === 'colour' ? tx.colour : tx.adds;
  const streak = Math.min(1, run.streak / 6);

  return (
    <main className={`panel-screen g2 ng hn hn-play tj wp ${calm ? 'g2-calm' : ''}`} data-game="whichpair" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(WP_ITEMS, run.i + (answered ? 0 : 1))}/{WP_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.lives}</small>
          <b dir="ltr">
            {run.lives}/{WP_LIVES}
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
      <div className="tj-cue" data-wp-streak={run.streak}>
        <small>{tx.streak}</small>
        <span className="tj-cue-bar" aria-hidden="true">
          <i style={{ inlineSize: `${Math.round(streak * 100)}%` }} />
        </span>
        <b dir="ltr">×{run.streak >= 6 ? '1.5' : run.streak >= 3 ? '1.2' : '1'}</b>
      </div>
      <button type="button" className="tj-from" onClick={() => ask(shownQ)} aria-label={tx.hear} data-wp-hear>
        <Sym text={shownQ.kind === 'pick' ? chordName : '♪'} />
      </button>
      <p className="hn-ask">
        <IsoMix text={askLine} />
      </p>
      {!played || answered ? (
        <div className="adv-grid hn-choices" dir="ltr">
          {shownQ.choices.map((c) => {
            const cls = answered ? (c.id === shownQ.answer ? 'ok' : c.id === picked ? 'bad' : '') : '';
            const label = lang === 'he' && c.he ? c.he : c.label;
            return (
              <button key={c.id} type="button" className={`btn ${cls}`} disabled={answered} onClick={() => answer(c.id)} data-wp-choice={c.id}>
                {lang === 'he' && c.he ? label : <bdi>{label}</bdi>}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="tj-wait" data-wp-wait>
          <IsoMix text={tx.wait} />
        </p>
      )}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok ? wpWhy(shownQ, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-wp-next>
          {wpOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
