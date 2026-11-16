// The shared screen of the beginner games (AUDIT-7 hole #14): Staff Runner, Root Catcher, Strum Changes, Rebound
// Ball, Sing It Back. Setup (input, input check, tier chips, best, resume) → laps: a count-in, the click on every
// beat, the now-cue (beat dots + the game's own board), measured by MIDI or the microphone → a one-line verdict per
// lap ("Why?" only after a miss) → the shared result card. The run is saved after every lap (resume after Back /
// reload). Engine: src/engine/beginnerRun.ts and each game's module.

import '../advgames.css';
import '../newgames.css';
import '../beginnergames.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KEY_NAME, afterLap, bLevel, bResult, bWindow, B_COUNT_IN, B_LAPS, B_LIVES, isBSave, lapClicks, lapOutcome, matchLap, newBSave, runOver, type BCheck, type BEvent, type BGame, type BJudge, type BLap, type BLapOutcome, type BMatch, type BSave } from '../engine/beginnerRun';
import { spellMidi } from '../engine/aids';
import { displayNote, pc as pcOf, type PitchClass } from '../engine/pitch';
import { startTier, tierAllowed, type DynName } from '../engine/gameTiers';
import type { NoteEvent } from '../engine/lesson';
import type { KeyInstrument } from '../engine/analysis/keyMastery';
import { judgeStrum } from '../engine/chordFinder';
import type { ChordQuality } from '../engine/chordRecognize';
import { midiStrumVerdict } from '../engine/strumChanges';
import { namingFor, type Settings } from '../storage/progress';
import type { GameScreenProps } from './gameProps';
import { listenNotes, type MeasuredInput } from './instCapture';
import { listenHits, listenStrums } from './beginnerCapture';
import { piano } from './services';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { InputCheck, InputWatchdog } from './InputCheck';
import { RushResultCard } from './GameResult';
import { IsoMix } from './Iso';
import { BeatDots, InputPick, WhyLine } from './NewGameBits';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };

/** A note's name in the player's naming (letters / solfège), spelled in the key. */
export function noteNameIn(midi: number, key: number | null, settings: Settings, lang: Lang): string {
  const s = spellMidi(midi, key === null ? null : pcOf(KEY_NAME[((key % 12) + 12) % 12]));
  return displayNote({ letter: s.letter as PitchClass['letter'], acc: s.acc }, namingFor(settings.naming, lang), lang);
}

export interface BoardProps {
  lap: BLap;
  match: BMatch | null;
  /** The beat the clock is on inside the lap (fractional), −1 before the lap starts (count-in). */
  beat: number;
  /** The target due now (−1 none). */
  now: number;
  phase: Phase;
  lang: Lang;
  settings: Settings;
  check: BCheck | null;
}

export interface BeginnerCfg {
  game: BGame;
  title: Bi;
  blurb: Bi;
  /** Inputs offered (voice: the microphone only). */
  inputs: MeasuredInput[];
  capture: 'notes' | 'strums' | 'hits';
  /** The microphone listens down to the bass register. */
  bass?: boolean;
  /** Timing windows wider by this factor (singing). */
  slack?: number;
  /** The InputCheck mode for the microphone / MIDI. */
  checkMode?: (input: MeasuredInput) => 'mic' | 'midi' | 'drum-mic' | 'drum-midi';
  lapOf: (seed: number, level: number, lap: number, run: BSave, settings: Settings) => BLap;
  judge: (input: MeasuredInput) => BJudge;
  check?: (lap: BLap, m: BMatch, input: MeasuredInput) => BCheck;
  /** Notes the app plays during the lap (from `t0` s, the lap's beat 0): Sing It Back's call, Root Catcher's chords. */
  band?: (lap: BLap, t0: number) => NoteEvent[];
  board: (p: BoardProps) => ReactNode;
  /** One line about the first miss of a lap and its "Why?" (null: nothing to say). */
  why: (p: { lap: BLap; m: BMatch; o: BLapOutcome; lang: Lang; settings: Settings }) => { line: string; why: string } | null;
  /** Key mastery instrument (key-relative games). */
  keyInst?: KeyInstrument;
}

export type Phase = 'setup' | 'ready' | 'open' | 'play' | 'review' | 'over' | 'mic-error';

const TX = {
  back: { en: 'Back', he: 'חזרה' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: (n: number) => `Continue · lap ${n}`, he: (n: number) => `להמשיך · סיבוב ${n}` },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  best: { en: 'Best', he: 'שיא' },
  lap: { en: 'Lap', he: 'סיבוב' },
  lives: { en: 'Lives', he: 'חיים' },
  caught: { en: 'Caught', he: 'נתפסו' },
  play: { en: 'Play the lap', he: 'לנגן את הסיבוב' },
  next: { en: 'Next lap', he: 'לסיבוב הבא' },
  countIn: { en: 'Count-in…', he: 'ספירה…' },
  go: { en: 'Now, on the click', he: 'עכשיו, על הקליק' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  micErr: { en: 'The microphone did not open. Try MIDI.', he: 'המיקרופון לא נפתח. נסו MIDI.' },
  micErrOnly: { en: 'The microphone did not open.', he: 'המיקרופון לא נפתח.' },
  clean: { en: 'Clean lap: a little faster', he: 'סיבוב נקי: קצת יותר מהר' },
  passed: { en: (h: number, n: number) => `Lap passed · ${h}/${n}`, he: (h: number, n: number) => `הסיבוב עבר · ${h}/${n}` },
  failed: { en: (h: number, n: number) => `Lap missed · ${h}/${n} · a life lost`, he: (h: number, n: number) => `הסיבוב לא עבר · ${h}/${n} · ירדו חיים` },
  over: { en: 'Run over', he: 'הריצה נגמרה' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  laps: { en: 'Laps passed', he: 'סיבובים שעברו' },
  rule: { en: 'Pass a lap with 3 of 4 on time. A missed lap costs a life.', he: 'סיבוב עובר עם 3 מכל 4 בזמן. סיבוב שלא עבר מוריד חיים.' },
};

export function BeginnerShell({ cfg, lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps & { cfg: BeginnerCfg }) {
  const t = <T,>(o: { en: T; he: T }) => o[lang];
  const calm = prefersCalm(settings);
  const resumable = isBSave(saved, cfg.game) ? saved : null;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const firstInput = (): MeasuredInput => {
    const want = resumable?.input ?? (settings.midiInput ? 'midi' : 'mic');
    return cfg.inputs.includes(want) ? want : cfg.inputs[0];
  };
  const [input, setInput] = useState<MeasuredInput>(firstInput);
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<BSave | null>(null);
  const [match, setMatch] = useState<BMatch | null>(null);
  const [outcome, setOutcome] = useState<BLapOutcome | null>(null);
  const [beat, setBeat] = useState(-1);
  const [final, setFinal] = useState<ReturnType<typeof bResult> | null>(null);
  const [lastLap, setLastLap] = useState<BLap | null>(null);
  const [record, setRecord] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const autoNext = useRef(0);
  const autoStart = useRef(false);
  const [armAt, setArmAt] = useState(0);
  useEffect(() => setArmAt(phase === 'play' ? performance.now() : 0), [phase]);

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
    window.clearTimeout(autoNext.current);
  };
  useEffect(() => stop, []);

  const lap: BLap | null = run && phase !== 'over' ? cfg.lapOf(run.seed, run.level, run.lap, run, settings) : null;
  const shownLap = phase === 'review' || phase === 'over' ? lastLap : lap;
  const checkMode = cfg.checkMode ?? ((i: MeasuredInput) => i);

  const begin = (resume: boolean) => {
    stop();
    const r = resume && resumable ? { ...resumable, input } : newBSave(cfg.game, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, bLevel(tier), input, tierInfo ? tier : undefined);
    setRun(r);
    setMatch(null);
    setOutcome(null);
    setFinal(null);
    setLastLap(null);
    onSave(r);
    setPhase('ready');
  };

  const finish = (r: BSave, l: BLap) => {
    stop();
    const res = bResult(r, l.bpm);
    const detail = { ...res.detail, ...(cfg.keyInst && r.keys.length ? { keyInst: cfg.keyInst } : {}) };
    setFinal(res);
    setRecord(res.score > 0 && res.score > (best ?? 0));
    onSave(null);
    onResult({ ...res, detail });
    setPhase('over');
  };

  const playLap = async () => {
    if (!run || !lap) return;
    stop();
    const a = new AbortController();
    ac.current = a;
    const r = run;
    const l = lap;
    const judge = cfg.judge(input);
    const win = bWindow(l, cfg.slack ?? 1);
    const beatMs = 60000 / l.bpm;
    const events: BEvent[] = [];
    let origin = performance.now() + 120 + B_COUNT_IN * beatMs;
    setMatch(null);
    setOutcome(null);
    setBeat(-1);
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    // the target a strum falls on (to judge the recogniser against it)
    const targetAt = (ms: number) => {
      let best = -1;
      l.targets.forEach((tg, i) => {
        const d = Math.abs(ms - tg.beat * beatMs);
        if (d <= Math.max(win.early, win.late) * 1.5 && (best < 0 || d < Math.abs(ms - l.targets[best].beat * beatMs))) best = i;
      });
      return best;
    };
    if (input === 'mic') setPhase('open');
    let ok: boolean;
    if (cfg.capture === 'notes') ok = await listenNotes(a.signal, input, settings, [], { bass: cfg.bass, maxMs: 600_000, onNote: (h) => events.push({ ms: h.perf - h.lat - origin, midi: h.midi }) });
    else if (cfg.capture === 'hits') ok = await listenHits(a.signal, input, settings, (h) => events.push({ ms: h.perf - h.lat - origin, vel: h.vel }));
    else
      ok = await listenStrums(a.signal, input, settings, (s) => {
        const ms = s.perf - s.lat - origin;
        const i = targetAt(ms);
        if (i < 0) return events.push({ ms, verdict: 'again' });
        const c = l.targets[i].chord!;
        const verdict = s.pcs ? midiStrumVerdict(s.pcs, c) : s.frames ? judgeStrum(s.frames, { root: c.root, quality: c.quality as ChordQuality }).verdict : 'again';
        events.push({ ms, verdict });
      });
    if (a.signal.aborted) return;
    if (!ok) {
      setPhase('mic-error');
      return;
    }
    setPhase('play');
    const watch = window.setInterval(() => {
      const ms = performance.now() - origin;
      setBeat(ms / beatMs);
      setMatch(matchLap(l, events, judge, ms - 60, win));
    }, 40);
    a.signal.addEventListener('abort', () => window.clearInterval(watch), { once: true });
    const tl = lapClicks(l.bpm, l.beats, l.meter);
    if (cfg.band) void piano.play(cfg.band(l, tl.responseAt + 0.06), tl.responseEnd + 0.6, a.signal).catch(() => {});
    try {
      await piano.playTimeline(tl, a.signal, undefined, (perf) => {
        origin = perf;
      });
      // the last target's window closes just after the lap
      await new Promise((res) => window.setTimeout(res, win.late + 120));
    } catch {
      return;
    }
    window.clearInterval(watch);
    if (a.signal.aborted) return;
    a.abort();
    const m = matchLap(l, events, judge, Infinity, win);
    const chk = cfg.check?.(l, m, input);
    const o = lapOutcome(m, chk);
    const next = afterLap(r, l, o);
    setMatch(m);
    setOutcome(o);
    setLastLap(l);
    setBeat(-1);
    setRun(next);
    if (runOver(next)) return finish(next, l);
    onSave(next);
    setPhase('review');
    // a clean lap rolls on by itself; a lap with a miss waits (its "Why?" can be read)
    if (o.clean) autoNext.current = window.setTimeout(() => setPhase((p) => (p === 'review' ? ((autoStart.current = true), 'ready') : p)), 1400);
  };

  // Start the next lap when the review pause ends (and the first lap of "Play again").
  useEffect(() => {
    if (phase !== 'ready' || !run) return;
    if (autoStart.current) {
      autoStart.current = false;
      const id = window.setTimeout(() => void playLap(), 80);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run]);

  const back = () => {
    stop();
    onExit();
  };
  const cls = `panel-screen g2 ng bg-run bg-${cfg.game} ${calm ? 'g2-calm' : ''}`;

  if (phase === 'setup')
    return (
      <main className={cls} data-game={cfg.game} data-phase="setup">
        <G2Head title={t(cfg.title)} backLabel={t(TX.back)} onBack={back} />
        <section className="g2-card">
          <p>
            <IsoMix text={t(cfg.blurb)} />
          </p>
          <p className="g2-dim bg-rule">{t(TX.rule)}</p>
          {cfg.inputs.length > 1 && <InputPick lang={lang} value={input} onChange={setInput} />}
          <InputCheck key={input} mode={checkMode(input)} lang={lang} />
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game={cfg.game} />}
          {!!best && (
            <p className="g2-best">
              {t(TX.best)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {t(TX.cont)(resumable.lap + 1)}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {t(TX.newRun)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-bg-start>
              {t(TX.start)}
            </button>
          )}
        </section>
      </main>
    );

  // "Why?" only after a miss (a target missed or wrong, or the game's own check failed)
  const whyOf = (l: BLap | null) => (l && match && outcome && (outcome.firstMiss >= 0 || (outcome.check && !outcome.check.ok)) ? cfg.why({ lap: l, m: match, o: outcome, lang, settings }) : null);

  if (phase === 'over' && final && run) {
    const w = whyOf(lastLap);
    return (
      <main className={cls} data-game={cfg.game} data-phase="over">
        <G2Head title={t(cfg.title)} backLabel={t(TX.back)} onBack={back} />
        {w && <WhyLine lang={lang} ok={false} line={<IsoMix text={w.line} />} why={w.why} />}
        <RushResultCard
          lang={lang}
          heading={t(TX.over)}
          score={final.score}
          best={best}
          newBest={record}
          right={final.detail.right}
          wrong={final.detail.wrong}
          stats={[
            { label: t(TX.accuracy), value: <span dir="ltr">{final.detail.accuracy}%</span> },
            { label: t(TX.laps), value: <span dir="ltr">{final.detail.passed}/{final.detail.laps}</span> },
          ]}
          onAgain={() => {
            autoStart.current = true;
            begin(false);
          }}
          onBack={back}
        />
      </main>
    );
  }

  if (!run || !shownLap) return null;
  const beatMs = 60000 / shownLap.bpm;
  const win = bWindow(shownLap, cfg.slack ?? 1);
  const inLap = phase === 'play' && beat >= 0;
  // the due target: the last one whose time has come (from its window's opening)
  let now = -1;
  if (inLap) shownLap.targets.forEach((tg, i) => (beat * beatMs >= tg.beat * beatMs - win.early ? (now = i) : null));
  const caughtNow = (match?.marks.filter((x) => x === 'hit').length ?? 0) + run.hits - (phase === 'review' && outcome ? outcome.hits : 0);
  const countBeat = phase === 'play' ? Math.floor(beat + B_COUNT_IN) : -1;
  const barBeat = inLap ? Math.floor(beat) % shownLap.meter : -1;
  const w = phase === 'review' ? whyOf(lastLap) : null;
  const lapNo = phase === 'review' ? run.lap : run.lap + 1;
  const reviewLine = phase === 'review' && outcome ? (outcome.clean ? t(TX.clean) : outcome.pass ? t(TX.passed)(outcome.hits, outcome.total) : t(TX.failed)(outcome.hits, outcome.total)) : '';

  return (
    <main className={`${cls} bg-play`} data-game={cfg.game} data-phase={phase}>
      <G2Head title={t(cfg.title)} backLabel={t(TX.back)} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          ♩ {shownLap.bpm}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{t(TX.lap)}</small>
          <b dir="ltr">
            {lapNo}/{B_LAPS}
          </b>
        </span>
        <span>
          <small>{t(TX.lives)}</small>
          <b className="bg-lives" aria-label={`${run.lives}/${B_LIVES}`}>
            {Array.from({ length: B_LIVES }, (_, i) => (
              <i key={i} className={i < run.lives ? 'on' : ''} />
            ))}
          </b>
        </span>
        <span>
          <small>{t(TX.caught)}</small>
          <b dir="ltr">{caughtNow}</b>
        </span>
      </div>
      <div className="bg-board">{cfg.board({ lap: shownLap, match, beat: inLap ? beat : -1, now, phase, lang, settings, check: outcome?.check ?? null })}</div>
      <BeatDots countIn={countBeat >= 0 && countBeat < B_COUNT_IN ? B_COUNT_IN : 0} beats={shownLap.meter} now={countBeat >= 0 && countBeat < B_COUNT_IN ? countBeat : barBeat} />
      {phase === 'review' && w ? (
        <WhyLine lang={lang} ok={false} line={<IsoMix text={`${reviewLine} · ${w.line}`} />} why={w.why} />
      ) : (
        <p className={`adv-line ${phase === 'review' && outcome?.pass ? 'ok' : ''}`} aria-live="polite">
          {phase === 'open' ? t(TX.opening) : phase === 'play' ? (beat < 0 ? t(TX.countIn) : t(TX.go)) : reviewLine}
        </p>
      )}
      {phase === 'play' && armAt > 0 && <InputWatchdog lang={lang} mode={checkMode(input)} arm={{ start: armAt, due: armAt + B_COUNT_IN * beatMs }} />}
      {phase === 'mic-error' && <p className="g2-warn">{cfg.inputs.includes('midi') ? t(TX.micErr) : t(TX.micErrOnly)}</p>}
      <div className="g2-col">
        {(phase === 'ready' || phase === 'mic-error') && (
          <>
            {run.lap === 0 && <InputCheck key={input} mode={checkMode(input)} lang={lang} />}
            <button className="btn primary mega" onClick={() => void playLap()} data-bg-play>
              {t(TX.play)}
            </button>
          </>
        )}
        {phase === 'review' && (
          <button className="btn primary mega" onClick={() => ((autoStart.current = true), setPhase('ready'))} data-bg-next>
            {t(TX.next)}
          </button>
        )}
      </div>
    </main>
  );
}
