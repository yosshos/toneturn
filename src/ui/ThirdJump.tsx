// Third Jump (REHARM-AND-COLOR C.2): a chord sounds with one note glowing; jump to the chromatic mediant that keeps it.
// The chord you land on is the next one, so a run is a chain; right jumps in a row build the film cue (more points).
// mp: which jump keeps nothing · mf: hear the jump, name it · f: the glowing note's degree in the new chord · ff: play
// the jump on a MIDI keyboard. Three lives; saved after every answer. Engine: src/engine/thirdJump.ts.

import { useEffect, useRef, useState } from 'react';
import { JUMP_CUE, JUMP_ITEMS, JUMP_LIVES, isJumpSave, jumpAnswer, jumpItem, jumpLevel, jumpOver, jumpResult, jumpSpeed, jumpWhy, newJumpSave, playedJump, toneName, type JChord, type JumpQ, type JumpSave } from '../engine/thirdJump';
import { commonTones, identifyChord, triadPcs } from '../engine/commonTone';
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
    title: 'Third Jump',
    back: 'Back',
    blurb: 'A chord sounds, one note glows. Jump a 3rd to the chord that keeps it. Right jumps in a row build the film cue.',
    blurbFf: 'Play the jump on your MIDI keyboard: the chord a 3rd away that keeps the glowing note.',
    start: 'Start',
    cont: (n: number) => `Continue · ${n}`,
    newRun: 'New run',
    best: 'Best',
    lives: 'Lives',
    score: 'Score',
    cue: 'Film cue',
    keep: (n: string) => `Which jump keeps ${n}?`,
    none: 'Which jump keeps nothing?',
    ear: 'Where did it jump?',
    degree: (n: string, c: string) => `${n} in ${c} is…`,
    play: (n: string) => `Play the jump that keeps ${n}`,
    hear: 'Hear it again',
    right: 'Right',
    wrong: 'Not this one',
    next: 'Next',
    finish: 'See results',
    over: 'Run over',
  },
  he: {
    title: 'קפיצת טרצה',
    back: 'חזרה',
    blurb: 'אקורד נשמע, צליל אחד זוהר. קופצים טרצה לאקורד ששומר עליו. קפיצות נכונות ברצף בונות מוזיקת סרט.',
    blurbFf: 'מנגנים את הקפיצה במקלדת MIDI: האקורד שבמרחק טרצה ששומר על הצליל הזוהר.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך · ${n}`,
    newRun: 'ריצה חדשה',
    best: 'שיא',
    lives: 'חיים',
    score: 'ניקוד',
    cue: 'מוזיקת סרט',
    keep: (n: string) => `${n}: איזו קפיצה שומרת עליו?`,
    none: 'איזו קפיצה לא שומרת אף צליל?',
    ear: 'לאן הוא קפץ?',
    degree: (n: string, c: string) => `${n} ב־${c} הוא…`,
    play: (n: string) => `מנגנים את הקפיצה ששומרת על ${n}`,
    hear: 'לשמוע שוב',
    right: 'נכון',
    wrong: 'לא זה',
    next: 'הבא',
    finish: 'לתוצאות',
    over: 'הריצה נגמרה',
  },
};
type Phase = 'setup' | 'play' | 'answered' | 'over';

/** A triad with `top` as its highest note (the other two close below it) and its root in the bass. */
function triadUnder(c: JChord, top: number, start: number, len: number, vel = 0.36): NoteEvent[] {
  const inner = triadPcs(c)
    .filter((p) => p !== pc(top))
    .map((p) => top - 12 + pc(p - top + 12));
  const bass = 48 + pc(c.root - 48);
  return [...inner.map((m) => ({ midi: m, start, duration: len, velocity: vel })), { midi: top, start, duration: len, velocity: vel + 0.16 }, { midi: bass - 12, start, duration: len, velocity: 0.5, inst: 'bass' as const }];
}
/** The jump: the first chord, then the second with the note they share held on top. */
function jumpEvents(from: JChord, to: JChord, glow?: number): NoteEvent[] {
  const common = glow ?? commonTones(from, to)[0];
  const top = common === undefined ? 72 + pc(from.root + 7) : 72 + pc(common);
  const top2 = common === undefined ? 72 + pc(to.root + 7) : top;
  return [...triadUnder(from, top, 0.05, 1.3), ...triadUnder(to, top2, 1.45, 1.6)];
}

export function ThirdJump({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isJumpSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<JumpSave | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; gained: number; text: string } | null>(null);
  const [record, setRecord] = useState(false);
  const [clock, setClock] = useState(1);
  const shownAt = useRef(0);
  const ac = useRef<AbortController | null>(null);
  const runRef = useRef<JumpSave | null>(null);
  runRef.current = run;
  const phaseRef = useRef<Phase>('setup');
  phaseRef.current = phase;

  const q: JumpQ | null = run && !jumpOver(run) ? jumpItem(run.seed, run.level, run.i) : null;
  const level = run?.level ?? jumpLevel(tier);
  const played = level >= 6 && run?.input === 'midi';

  const sound = async (ev: NoteEvent[], len = 3.2) => {
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
  /** The question's sound: the chord with the glowing note on top (mf: the whole jump). */
  const ask = (it: JumpQ) => {
    if (it.kind === 'ear') return void sound(jumpEvents(it.from, it.to));
    const top = it.kind === 'keep' || it.kind === 'degree' ? 72 + pc(it.glow) : 72 + pc(it.from.root + 7);
    void sound(triadUnder(it.from, top, 0.05, 1.6), 1.9);
  };
  useEffect(() => () => ac.current?.abort(), []);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setClock((jumpSpeed(performance.now() - shownAt.current) - 1) / 0.5), 200);
    return () => window.clearInterval(id);
  }, [phase, run?.i]);

  const show = (r: JumpSave) => {
    setPicked(null);
    setVerdict(null);
    setClock(1);
    shownAt.current = performance.now();
    setPhase('play');
    ask(jumpItem(r.seed, r.level, r.i));
  };
  const begin = (resume: boolean) => {
    const lv = jumpLevel(tier);
    const r = resume && resumable ? resumable : newJumpSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, lv, lv >= 6 && settings.midiInput ? 'midi' : 'touch', tierInfo ? tier : undefined);
    setRun(r);
    setRecord(false);
    onSave(r);
    show(r);
  };
  const end = (r: JumpSave) => {
    onSave(null);
    const res = jumpResult(r);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onResult(res);
    setPhase('over');
  };

  const answer = (id: string, byMidi = false, label?: string) => {
    const r = runRef.current;
    if (!r || phaseRef.current !== 'play') return;
    const it = jumpItem(r.seed, r.level, r.i);
    const ok = id === it.answer;
    const { save, gained } = jumpAnswer(r, ok, performance.now() - shownAt.current, byMidi);
    setPicked(id);
    setRun(save);
    setVerdict({ ok, gained, text: ok ? `${tx.right} · +${gained}` : label ? `${tx.wrong}: ${label}` : tx.wrong });
    if (!jumpOver(save)) onSave(save);
    setPhase('answered');
    void sound(jumpEvents(it.from, it.to, it.kind === 'keep' || it.kind === 'degree' ? it.glow : undefined));
  };

  // ff on MIDI: the chord played (3+ notes held within 150 ms) is the answer.
  useEffect(() => {
    if (phase !== 'play' || !played) return;
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
        const it = jumpItem(r.seed, r.level, r.i);
        const ch = identifyChord([...held]);
        const ok = playedJump(it, ch);
        answer(ok ? it.answer : 'played', true, ok ? undefined : [...held].sort((a, b) => a - b).map((m) => toneName(it.from, m)).join(' '));
      }, 150);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, played, run?.i]);

  const next = () => {
    if (!run) return;
    if (jumpOver(run)) return end(run);
    show(run);
  };
  useEffect(() => {
    if (phase !== 'answered' || !verdict?.ok || !run) return;
    const id = window.setTimeout(next, 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, verdict]);

  const back = () => {
    ac.current?.abort();
    onExit();
  };

  if (phase === 'setup')
    return (
      <main className={`panel-screen g2 ng hn tj ${calm ? 'g2-calm' : ''}`} data-game="thirdjump" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={jumpLevel(tier) >= 6 ? tx.blurbFf : tx.blurb} />
          </p>
          {jumpLevel(tier) >= 6 && <InputCheck mode="midi" lang={lang} />}
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="thirdjump" />}
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
    const r = jumpResult(run);
    return (
      <main className={`panel-screen g2 ng hn tj ${calm ? 'g2-calm' : ''}`} data-game="thirdjump" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <RushResultCard lang={lang} heading={tx.over} score={r.score} best={best} newBest={record} right={r.detail.right} wrong={r.detail.wrong} onAgain={() => begin(false)} onBack={back} />
      </main>
    );
  }

  const shownQ = phase === 'answered' && run ? jumpItem(run.seed, run.level, run.i - 1) : q;
  if (!run || !shownQ) return null;
  const answered = phase === 'answered';
  const glowName = shownQ.kind === 'keep' || shownQ.kind === 'degree' ? shownQ.glowName : null;
  const askLine =
    shownQ.kind === 'keep' ? (played ? tx.play(shownQ.glowName) : tx.keep(shownQ.glowName)) : shownQ.kind === 'none' ? tx.none : shownQ.kind === 'ear' ? tx.ear : tx.degree(shownQ.glowName, shownQ.to.name);
  const cue = Math.min(1, run.streak / JUMP_CUE);

  return (
    <main className={`panel-screen g2 ng hn hn-play tj ${calm ? 'g2-calm' : ''}`} data-game="thirdjump" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {Math.min(JUMP_ITEMS, run.i + (answered ? 0 : 1))}/{JUMP_ITEMS}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.lives}</small>
          <b dir="ltr">
            {run.lives}/{JUMP_LIVES}
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
      <div className="tj-cue" data-tj-cue={run.streak}>
        <small>{tx.cue}</small>
        <span className="tj-cue-bar" aria-hidden="true">
          <i style={{ inlineSize: `${Math.round(cue * 100)}%` }} />
        </span>
        <b dir="ltr">×{run.streak >= 6 ? '1.5' : run.streak >= 3 ? '1.2' : '1'}</b>
      </div>
      <button type="button" className="tj-from" onClick={() => ask(shownQ)} aria-label={tx.hear} data-tj-from>
        <Sym text={shownQ.from.name} />
        {glowName && (
          <span className="tj-glow">
            <Sym text={glowName} />
          </span>
        )}
        {answered && (
          <span className="tj-to">
            <Sym text={`→ ${shownQ.to.name}`} />
          </span>
        )}
      </button>
      <p className="hn-ask">
        <IsoMix text={askLine} />
      </p>
      {!played || answered ? (
        <div className="adv-grid hn-choices" dir="ltr">
          {shownQ.choices.map((c) => {
            const cls = answered ? (c.id === shownQ.answer ? 'ok' : c.id === picked ? 'bad' : '') : '';
            return (
              <button key={c.id} type="button" className={`btn ${cls}`} disabled={answered} onClick={() => answer(c.id)} data-tj-choice={c.id}>
                {c.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="tj-wait" data-tj-wait>
          <IsoMix text={lang === 'he' ? 'מחכים לאקורד מהמקלדת…' : 'Waiting for your chord…'} />
        </p>
      )}
      <WhyLine key={`${run.i}-${phase}`} lang={lang} ok={verdict ? verdict.ok : null} line={verdict ? <IsoMix text={verdict.text} /> : ''} why={verdict && !verdict.ok ? jumpWhy(shownQ, lang) : null} />
      {answered && !verdict?.ok && (
        <button className="btn primary mega" onClick={next} data-tj-next>
          {jumpOver(run) ? tx.finish : tx.next}
        </button>
      )}
    </main>
  );
}
