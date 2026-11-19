// Comp Caller (AUDIT-GAMES §4.2 #9): a chart loops under a walking bass and a click; each bar's comping rhythm is
// called (one bar ahead at ff). Listen to the band comp it, then play: count-in, then comp the chords on the called
// rhythms, switching on the bar. MIDI hears the rhythm and the chord (its guide tones); the microphone hears the rhythm;
// the on-screen pad is practice (rhythm only, it never clears a tier). Engine: src/engine/compCaller.ts.

import { IsoMix } from './Iso';
import '../advgames.css';
import '../newgames.css';
import { useEffect, useRef, useState } from 'react';
import {
  compAfterTake,
  compHitsOf,
  compItem,
  compName,
  compOver,
  compPcs,
  compResult,
  gradeComp,
  groupAttacks,
  isCompSave,
  newComp,
  rhythmCount,
  RHYTHM_NAME,
  RHYTHMS,
  tierLevelCC,
  COMP_PASS,
  COMP_TAKES,
  type CompAttack,
  type CompItem,
  type CompSave,
} from '../engine/compCaller';
import { nearVoicing } from '../engine/topicsHarris2';
import { MIC_PITCH_LAG_MS } from '../engine/highway';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { GameScreenProps } from './gameProps';
import { listenNotes, type Heard } from './instCapture';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck, InputWatchdog } from './InputCheck';
import { RushResultCard } from './GameResult';
import { piano } from './services';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
type Input = 'midi' | 'mic' | 'touch';
const TX = {
  title: { en: 'Comp Caller', he: 'קורא הליווי' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Each bar calls a comping rhythm. Listen to the band, then comp the chords on the called rhythm after the count-in, switching on the bar. Four takes, three lives.', he: 'כל תיבה קוראת מקצב ליווי. מקשיבים ללהקה, ואז מלווים את האקורדים במקצב שנקרא אחרי הספירה, ומחליפים על התיבה. ארבעה טייקים, שלושה חיים.' },
  input: { en: 'Play into', he: 'לנגן דרך' },
  midiIn: { en: 'MIDI', he: 'MIDI' },
  mic: { en: 'Microphone', he: 'מיקרופון' },
  touch: { en: 'Screen', he: 'מסך' },
  touchNote: { en: 'The screen pad is practice: rhythm only, it does not clear a level.', he: 'הפד במסך הוא תרגול: קצב בלבד, הוא לא עובר שלב.' },
  micNote: { en: 'The microphone hears the rhythm; MIDI also checks the chord.', he: 'המיקרופון שומע את הקצב; MIDI בודק גם את האקורד.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  listen: { en: 'Listen', he: 'להקשיב' },
  play: { en: 'Comp it', he: 'ללוות' },
  hearing: { en: 'The band comps it…', he: 'הלהקה מלווה…' },
  count: { en: 'Get ready…', he: 'מתכוננים…' },
  playing: { en: 'Comp on the called rhythm', he: 'מלווים במקצב שנקרא' },
  opening: { en: 'Opening the input…', he: 'פותחים את הקלט…' },
  micErr: { en: 'The microphone did not open. Try MIDI, or allow the microphone.', he: 'המיקרופון לא נפתח. נסו MIDI, או אשרו גישה למיקרופון.' },
  pad: { en: 'Comp', he: 'ליווי' },
  take: { en: 'Take', he: 'טייק' },
  lives: { en: 'Lives', he: 'חיים' },
  avg: { en: 'Average', he: 'ממוצע' },
  next: { en: 'Next', he: 'הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  why: { en: 'Why?', he: 'למה?' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  best: { en: 'Best', he: 'שיא' },
  level: { en: 'Level', he: 'רמה' },
  onTime: { en: 'on time', he: 'בזמן' },
  wrongChord: { en: 'other chord', he: 'אקורד אחר' },
  missed: { en: 'missed', he: 'חסרים' },
  extra: { en: 'extra', he: 'מיותרים' },
  whyText: { en: 'A hit counts within a little under half an 8th of its place; with MIDI its chord’s 3rd and 7th must sound. A hit on the "and" of 4 marked → sounds the next bar’s chord.', he: 'מכה נספרת עד קצת פחות מחצי שמינית מהמקום שלה; ב־MIDI צריכות להישמע הטרצה והספטימה של האקורד. מכה על ה"וְ" של 4 שמסומנת → משמיעה את האקורד של התיבה הבאה.' },
};
const tx = (b: Bi, l: Lang) => b[l];
const SLOTS = ['1', '+', '2', '+', '3', '+', '4', '+'];

type Phase = 'setup' | 'ready' | 'hear' | 'open' | 'count' | 'play' | 'review' | 'over' | 'mic-error';

/** The bass walk (quarters: root, 5th, root, a half step under the next root) and, for the call, the comp itself. */
function bandEvents(it: CompItem, withComp: boolean, offset: number): NoteEvent[] {
  const beat = 60 / it.bpm;
  const out: NoteEvent[] = [];
  const pitch = (pc: number) => 36 + ((pc - 36) % 12 + 12) % 12;
  it.chords.forEach((c, bar) => {
    const nx = it.chords[bar + 1] ?? it.chords[0];
    const line = [pitch(c.root), pitch(c.root + 7), pitch(c.root) + (pitch(c.root) < 40 ? 12 : 0), pitch(nx.root - 1)];
    line.forEach((m, k) => out.push({ midi: m, start: offset + (bar * 4 + k) * beat, duration: beat * 0.9, velocity: 0.5 }));
  });
  if (withComp) {
    let prev: number[] | null = null;
    for (const h of compHitsOf(it)) {
      const v = nearVoicing(compPcs(h.chord), prev, 55, 76, 67);
      prev = v;
      v.forEach((m) => out.push({ midi: m, start: offset + h.beat * beat, duration: beat * 0.45, velocity: 0.5 }));
    }
  }
  return out;
}

export function CompCaller({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isCompSave(saved) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [input, setInput] = useState<Input>(() => (settings.midiInput ? 'midi' : settings.activeCourse === 'guitar' ? 'mic' : 'touch'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<CompSave | null>(null);
  const [pos, setPos] = useState<number>(-1); // the eighth now (from bar 1), −1 = none
  const [beat, setBeat] = useState(-1);
  const [out, setOut] = useState<ReturnType<typeof gradeComp> | null>(null);
  const [armAt, setArmAt] = useState(0);
  const acRef = useRef<AbortController | null>(null);
  const taps = useRef<number[]>([]);
  const origin = useRef(0);
  const prevBest = useRef(best ?? 0);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stop, []);

  const idx = run ? Math.max(0, run.takes.length - (phase === 'review' || phase === 'over' ? 1 : 0)) : 0;
  const item = run ? compItem(run.seed, idx, run.level) : null;

  const begin = (resume: boolean) => {
    stop();
    const r = resume && resumable ? resumable : newComp((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tierInfo ? tier : 'pp', tierLevelCC(tier));
    prevBest.current = best ?? 0;
    setRun(r);
    setOut(null);
    onSave(r);
    setPhase('ready');
  };

  const followFrom = (start: () => number, it: CompItem, sig: AbortSignal) => {
    const e = 60_000 / it.bpm / 2;
    const id = window.setInterval(() => {
      const ms = performance.now() - start();
      setPos(ms < 0 ? -1 : Math.min(it.chords.length * 8, Math.floor(ms / e)));
    }, 25);
    sig.addEventListener('abort', () => clearInterval(id), { once: true });
    return () => clearInterval(id);
  };

  const hear = async () => {
    if (!item) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setPhase('hear');
    try {
      await piano.unlock();
      const ev = bandEvents(item, true, 0);
      const t0 = performance.now() + 60;
      const end = followFrom(() => t0, item, ac.signal);
      await piano.play(ev, (item.chords.length * 4 * 60) / item.bpm + 0.6, ac.signal).finally(end);
    } catch {
      /* stopped */
    }
    setPos(-1);
    if (acRef.current === ac) setPhase('ready');
  };

  const take = async () => {
    if (!run || !item) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    const sig = ac.signal;
    setOut(null);
    taps.current = [];
    setPhase('open');
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    // the input
    const heard: Heard[] = [];
    const micOn: { perf: number }[] = [];
    if (input === 'midi') await listenNotes(sig, 'midi', settings, heard);
    else if (input === 'mic') {
      let capStart = 0;
      let last = -1e9;
      const rms: number[] = [];
      const ok = await new Promise<boolean>((resolve) => {
        void new BrowserPitchCapture()
          .sing({
            signal: sig,
            maxMs: 60_000,
            silenceMs: 60_000,
            endSilenceMs: 1e9,
            hopMs: 15,
            onCapturing: () => {
              capStart = performance.now();
              resolve(true);
            },
            onFrame: (f) => {
              const t = capStart + f.t * 1000;
              const floor = rms.length ? Math.min(...rms.slice(-5)) : 0;
              if (f.rms >= 0.02 && f.rms >= 2.2 * Math.max(floor, 0.004) && t - last > 120) {
                last = t;
                micOn.push({ perf: t });
              }
              rms.push(f.rms);
              if (rms.length > 20) rms.shift();
            },
          })
          .then((r) => {
            if (r.kind === 'error') resolve(false);
          });
      });
      if (sig.aborted) return;
      if (!ok) {
        stop();
        setPhase('mic-error');
        return;
      }
    }
    if (sig.aborted) return;
    setPhase('count');
    const beatSec = 60 / item.bpm;
    const bars = item.chords.length;
    const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
    for (let k = 0; k < 4; k++) clicks.push({ t: k * beatSec, accent: k === 0, count: true });
    for (let k = 0; k < bars * 4; k++) clicks.push({ t: (4 + k) * beatSec, accent: k % 4 === 0, soft: k % 4 !== 0 });
    origin.current = performance.now() + 120 + 4 * beatSec * 1000;
    const end = followFrom(() => origin.current, item, sig);
    const tl = piano.playTimeline({ clicks, wood: [], responseAt: 4 * beatSec, responseEnd: (4 + bars * 4) * beatSec + 0.4 }, sig, (i) => setBeat(i < 4 ? i : -1), (perf) => {
      origin.current = perf;
      setArmAt(perf);
      setPhase('play');
    });
    // the walking bass under the take, scheduled to line up with the click (play starts 0.06 s after "now", the click 0.12 s)
    void piano.play(bandEvents(item, false, 0.06 + 4 * beatSec), 0.06 + (4 + bars * 4) * beatSec + 0.3, sig).catch(() => {});
    try {
      await tl;
    } catch {
      end();
      return;
    }
    end();
    setPos(-1);
    setBeat(-1);
    setArmAt(0);
    stop();
    // grade
    const lat = input === 'midi' ? (settings.midiLatencyMs ?? 0) : input === 'mic' ? (settings.micLatencyMs ?? MIC_PITCH_LAG_MS) : 0;
    const beatMs = 60_000 / item.bpm;
    let attacks: CompAttack[];
    if (input === 'midi') attacks = groupAttacks(heard.map((h) => ({ ms: h.perf - h.lat - origin.current, midi: h.midi })), item.bpm);
    else if (input === 'mic') attacks = micOn.map((o) => ({ beat: (o.perf - lat - origin.current) / beatMs }));
    else attacks = taps.current.map((t) => ({ beat: (t - origin.current) / beatMs }));
    const g = gradeComp(item, attacks);
    const ok = g.marks.filter((m) => m === 'ok').length;
    const next = compAfterTake(run, g.score, ok, g.marks.length);
    setRun(next);
    setOut(g);
    if (compOver(next)) {
      onSave(null);
      const res = compResult(next, input);
      // key mastery: each MIDI take in its chart's key
      const keyTakes = input === 'midi' ? next.takes.map((acc, i) => ({ key: compItem(next.seed, i, next.level).key, acc, bpm: compItem(next.seed, i, next.level).bpm })) : [];
      const inst = settings.activeCourse === 'guitar' ? 'guitar' : 'piano';
      onResult(keyTakes.length ? { ...res, detail: { ...res.detail, keyInst: inst, keyTakes } } : res);
    } else onSave(next);
    setPhase('review');
  };

  const tapPad = () => {
    if (phase !== 'play' && phase !== 'count') return;
    taps.current.push(performance.now());
    void piano.play([{ midi: 64, start: 0, duration: 0.15, velocity: 0.35 }], 0.2, new AbortController().signal).catch(() => {});
  };

  const back = () => {
    stop();
    onExit();
  };
  const done = run ? compOver(run) : false;
  const curBar = pos >= 0 ? Math.floor(pos / 8) : -1;
  const shownBar = curBar >= 0 ? Math.min(curBar, (item?.chords.length ?? 1) - 1) : 0;
  const avg = run && run.takes.length ? Math.round(run.takes.reduce((a, b) => a + b, 0) / run.takes.length) : null;
  const call = item ? item.calls[shownBar] : null;
  const hitSlots = call ? RHYTHMS[call.id][call.part].map((h) => Math.round(h.at * 2)) : [];
  const live = phase === 'hear' || phase === 'play' || phase === 'count';
  const hideFar = !!item && run?.level === 6 && (phase === 'play' || phase === 'count');

  const line = (): string => {
    if (!out) return '';
    const n = (x: string) => out.marks.filter((m) => m === x).length;
    const parts = [`${n('ok')} ${tx(TX.onTime, lang)}`];
    if (n('chord')) parts.push(`${n('chord')} ${tx(TX.wrongChord, lang)}`);
    if (n('miss')) parts.push(`${n('miss')} ${tx(TX.missed, lang)}`);
    if (out.extras) parts.push(`${out.extras} ${tx(TX.extra, lang)}`);
    return parts.join(' · ');
  };

  return (
    <main className={`panel-screen g2 inst-game ng cc ${calm ? 'g2-calm' : ''}`} data-game="compcaller" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && phase !== 'over' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.min(COMP_TAKES, run.takes.length + (phase === 'review' ? 0 : 1))}/{COMP_TAKES}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          <div className="seg g2-seg" role="radiogroup" aria-label={tx(TX.input, lang)}>
            {(['midi', 'mic', 'touch'] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={input === k} className={input === k ? 'on' : ''} onClick={() => setInput(k)}>
                <IsoMix text={tx(k === 'midi' ? TX.midiIn : k === 'mic' ? TX.mic : TX.touch, lang)} />
              </button>
            ))}
          </div>
          {input !== 'touch' && <InputCheck key={input} mode={input} lang={lang} />}
          <p className="g2-dim">
            <IsoMix text={tx(input === 'touch' ? TX.touchNote : TX.micNote, lang)} />
          </p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="compcaller" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)} data-ng-start>
                {tx(TX.cont, lang)} · {tx(TX.take, lang)} <span dir="ltr">{resumable.takes.length + 1}</span>
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
              <small>{tx(TX.lives, lang)}</small>
              <b dir="ltr">{run.lives}/3</b>
            </span>
            <span>
              <small>{tx(TX.avg, lang)}</small>
              <b dir="ltr">{avg === null ? '–' : `${avg}%`}</b>
            </span>
            <span>
              <small>{tx(TX.level, lang)}</small>
              <i className="dyn">{run.tier}</i>
            </span>
          </div>
          <p className="inst-meta" dir="ltr">
            <span>♩ = {item.bpm}</span>
            <span className="cc-beats" aria-hidden="true">
              {[0, 1, 2, 3].map((b) => (
                <i key={b} className={beat >= b ? 'on' : ''} />
              ))}
            </span>
          </p>
          <div className={`cc-bars n${item.chords.length}`} dir="ltr">
            {item.chords.map((c, bar) => {
              const cl = item.calls[bar];
              const now = live && bar === curBar;
              const nextUp = live && bar === curBar + 1;
              const hidden = hideFar && bar > Math.max(curBar, 0) + 1;
              return (
                <span key={bar} className={`cc-bar ${now ? 'now' : ''} ${nextUp ? 'call' : ''} ${phase === 'review' && out ? out.barMarks[bar] : ''}`} data-cc-bar={bar}>
                  <b>{compName(c)}</b>
                  <small>{hidden ? '·' : <bdi dir={lang === 'he' ? 'rtl' : 'ltr'}>{RHYTHM_NAME[cl.id][lang]}</bdi>}</small>
                  <em>{hidden ? '' : rhythmCount(cl.id, cl.part)}</em>
                </span>
              );
            })}
          </div>
          <div className="cc-slots" dir="ltr" aria-hidden="true">
            {SLOTS.map((s, k) => (
              <span key={k} className={`${hitSlots.includes(k) ? 'hit' : ''} ${live && pos >= 0 && pos % 8 === k ? 'now' : ''}`}>
                {s}
              </span>
            ))}
          </div>
          <p className={`adv-line ${phase === 'review' && out ? (out.score >= COMP_PASS ? 'ok' : 'bad') : ''}`} aria-live="polite" data-ng-verdict={phase === 'review' && out ? (out.score >= COMP_PASS ? 'ok' : 'bad') : ''}>
            {phase === 'hear' ? tx(TX.hearing, lang) : phase === 'open' ? tx(TX.opening, lang) : phase === 'count' ? tx(TX.count, lang) : phase === 'play' ? tx(TX.playing, lang) : phase === 'review' && out ? (
              <>
                <span dir="ltr">{out.score}%</span> · {line()}
              </>
            ) : (
              ''
            )}
          </p>
          {phase === 'review' && out && out.score < COMP_PASS && (
            <details className="ng-whyd">
              <summary>{tx(TX.why, lang)}</summary>
              <p>
                <IsoMix text={tx(TX.whyText, lang)} />
              </p>
            </details>
          )}
          {phase === 'play' && armAt > 0 && input !== 'touch' && <InputWatchdog lang={lang} mode={input} arm={{ start: armAt, due: armAt }} />}
          <div className="g2-col">
            {phase === 'ready' && (
              <div className="g2-row">
                <button className="btn" onClick={() => void hear()} data-cc-hear>
                  {tx(TX.listen, lang)}
                </button>
                <button className="btn primary mega" onClick={() => void take()} data-cc-play>
                  {tx(TX.play, lang)}
                </button>
              </div>
            )}
            {(phase === 'play' || phase === 'count') && input === 'touch' && (
              <button className="btn primary mega cc-pad" onPointerDown={tapPad} data-cc-pad>
                {tx(TX.pad, lang)}
              </button>
            )}
            {phase === 'review' && (
              <button className="btn primary mega" onClick={() => (done ? setPhase('over') : (setOut(null), setPhase('ready')))} data-ng-next>
                {done ? tx(TX.finish, lang) : tx(TX.next, lang)}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'over' && run && (
        <RushResultCard
          lang={lang}
          heading={tx(TX.over, lang)}
          score={compResult(run, input).score}
          best={prevBest.current}
          newBest={compResult(run, input).score > 0 && compResult(run, input).score > prevBest.current}
          right={run.ok}
          wrong={run.asked - run.ok}
          stats={[
            { label: tx(TX.accuracy, lang), value: <span dir="ltr">{compResult(run, input).detail.accuracy}%</span>, key: 'acc' },
            { label: tx(TX.level, lang), value: <i className="dyn">{run.tier}</i>, key: 'lv' },
          ]}
          note={input === 'touch' ? tx(TX.touchNote, lang) : undefined}
          onAgain={() => begin(false)}
          onBack={back}
        />
      )}
    </main>
  );
}
