// Rhythm Highway (spec AE §8, §10.2 pitch lanes, §10.4 reduced motion / resume, R8 tap latency).
// Solo game: the host app persists `saved` (the last checkpoint) and records results.

import '../games3.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  backingTrack,
  hitWindows,
  highwaySong,
  judgeInput,
  KIT_LANE_NOTE,
  KIT_LANES,
  KIT_MAX_LEVEL,
  kitLaneOf,
  MIC_PITCH_LAG_MS,
  newRun,
  OnsetTracker,
  PITCH_MAX_LEVEL,
  rewind,
  sectionStartMs,
  sectionsDone,
  SONGS_PER_LEVEL,
  songId,
  summary,
  sweepMisses,
  type HighwayBests,
  type HighwayMode,
  type HighwayOptions,
  type HighwayRun,
  type HighwaySong,
  type HighwaySummary,
  type HitGrade,
} from '../engine/highway';
import { MAX_RHYTHM_LEVEL, type RhythmLevel } from '../engine/rhythm';
import { displayNote, type PitchClass } from '../engine/pitch';
import { namingFor, type Settings } from '../storage/progress';
import { midi as midiInput } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { piano } from './services';

type Lang = 'he' | 'en';
type Text = { en: string; he: string };

/** Kit lane labels (short: the road is narrow on a phone). */
const KIT_SHORT: Record<(typeof KIT_LANES)[number], Text> = { hihat: { en: 'HH', he: 'הייהט' }, snare: { en: 'SN', he: 'סנר' }, kick: { en: 'BD', he: 'קיק' }, tom: { en: 'TOM', he: 'טום' }, cymbal: { en: 'CYM', he: 'מצילה' } };

export interface HighwaySaved {
  v: 1;
  game: 'highway';
  opts: HighwayOptions;
  /** Resume from the start of this section. */
  section: number;
  run: HighwayRun;
}

export function isHighwaySaved(x: unknown): x is HighwaySaved {
  const s = x as HighwaySaved | null;
  return !!s && s.v === 1 && s.game === 'highway' && !!s.opts && typeof s.section === 'number' && Array.isArray(s.run?.grades);
}

const T = {
  title: { en: 'Rhythm Highway', he: 'כביש הקצב' },
  back: { en: 'Back', he: 'חזרה' },
  mode: { en: 'Play with', he: 'מנגנים עם' },
  tap: { en: 'Taps', he: 'הקשות' },
  kit: { en: 'Drum kit', he: 'מערכת תופים' },
  kitHint: { en: 'Play the lanes on your e-kit: hi-hat, snare, kick, tom, cymbal.', he: 'נגנו את המסלולים על התופים: היי־האט, סנר, קיק, טום, מצילה.' },
  pitch: { en: 'My instrument', he: 'הכלי שלי' },
  level: { en: 'Rhythm level', he: 'רמת קצב' },
  song: { en: 'Song', he: 'שיר' },
  tempo: { en: 'Tempo', he: 'טמפו' },
  slow: { en: 'Slow', he: 'איטי' },
  medium: { en: 'Medium', he: 'בינוני' },
  fast: { en: 'Fast', he: 'מהיר' },
  lanes: { en: 'Lanes', he: 'מסלולים' },
  play: { en: 'Play', he: 'שחקו' },
  cont: { en: 'Continue from section', he: 'להמשיך מקטע' },
  best: { en: 'Best', he: 'שיא' },
  pitchHint: {
    en: 'Play each note on your instrument when it reaches the line. Headphones help: the microphone should hear only you.',
    he: 'נגנו כל תו על הכלי כשהוא מגיע לקו. עדיף אוזניות: המיקרופון צריך לשמוע רק אתכם.',
  },
  midiHint: { en: 'MIDI keyboard on: notes are read from the keys.', he: 'מקלדת MIDI פעילה: התווים נקראים מהקלידים.' },
  tapHint: { en: 'Tap, Space or Enter when a note reaches the line.', he: 'הקישו, רווח או Enter כשתו מגיע לקו.' },
  calibrate: {
    en: 'Tap delay not measured yet. Calibrate it once in Beat Echo for fair timing.',
    he: 'השהיית ההקשה עוד לא נמדדה. כיילו אותה פעם אחת בהד הקצב לתזמון הוגן.',
  },
  tapHere: { en: 'Tap', he: 'הקישו' },
  pause: { en: 'Pause', he: 'השהיה' },
  paused: { en: 'Paused', he: 'מושהה' },
  resume: { en: 'Resume from section', he: 'להמשיך מקטע' },
  exit: { en: 'Exit', he: 'יציאה' },
  combo: { en: 'Combo', he: 'רצף' },
  section: { en: 'Section', he: 'קטע' },
  perfect: { en: 'Perfect', he: 'מושלם' },
  good: { en: 'Good', he: 'טוב' },
  miss: { en: 'Miss', he: 'פספוס' },
  wrong: { en: 'Wrong note', he: 'תו אחר' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  maxCombo: { en: 'Longest combo', he: 'הרצף הארוך' },
  fullCombo: { en: 'Full combo', he: 'רצף מלא' },
  newBest: { en: 'New best', he: 'שיא חדש' },
  again: { en: 'Play again', he: 'שוב' },
  next: { en: 'Next song', he: 'השיר הבא' },
  early: { en: 'early', he: 'מוקדם' },
  late: { en: 'late', he: 'מאוחר' },
  micError: { en: 'The microphone could not start. Allow it, or play with taps.', he: 'המיקרופון לא נפתח. אשרו אותו, או שחקו בהקשות.' },
  useTaps: { en: 'Play with taps', he: 'לשחק בהקשות' },
  retry: { en: 'Try again', he: 'לנסות שוב' },
  points: { en: 'points', he: 'נקודות' },
} satisfies Record<string, Text>;

const BEST_KEY = 'toneturn.highway.best.v1';
function loadBests(): HighwayBests {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as HighwayBests;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function saveBest(id: string, acc: number): boolean {
  const b = loadBests();
  if ((b[id] ?? -1) >= acc) return false;
  b[id] = acc;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* storage blocked */
  }
  return true;
}

function useReducedMotion(settings: Settings) {
  return useMemo(() => {
    if (settings.reducedMotion !== null && settings.reducedMotion !== undefined) return settings.reducedMotion;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, [settings.reducedMotion]);
}

/** The key for pitch lanes: guitar / bass / strings in G, everything else in C. */
const laneKeyPc = (s: Settings) => (s.activeCourse === 'guitar' || s.activeCourse === 'bass' || s.instrument === 'guitar' || s.instrument === 'bass' || s.instrument === 'strings' ? 7 : 0);
const PC_NAMES: PitchClass[] = [
  { letter: 'C', acc: 0 },
  { letter: 'C', acc: 1 },
  { letter: 'D', acc: 0 },
  { letter: 'E', acc: -1 },
  { letter: 'E', acc: 0 },
  { letter: 'F', acc: 0 },
  { letter: 'F', acc: 1 },
  { letter: 'G', acc: 0 },
  { letter: 'A', acc: -1 },
  { letter: 'A', acc: 0 },
  { letter: 'B', acc: -1 },
  { letter: 'B', acc: 0 },
];

type Stage = 'setup' | 'play' | 'paused' | 'over' | 'mic-error';

export function Highway({
  lang,
  settings,
  saved,
  onSave,
  onExit,
  onResult,
}: {
  lang: Lang;
  settings: Settings;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: { game: 'highway' | 'melody-puzzle'; score: number; detail?: unknown }) => void;
}) {
  const tx = (o: Text) => o[lang];
  const resumable = isHighwaySaved(saved) ? saved : null;
  const reduced = useReducedMotion(settings);
  const useMidi = !!settings.midiInput;
  // 0.65: in the drums course the highway has kit lanes (hi-hat, snare, kick, tom, cymbal) played on the e-kit.
  const drumsCourse = settings.activeCourse === 'drums';
  const MODES: HighwayMode[] = drumsCourse ? ['kit', 'tap'] : ['tap', 'pitch'];

  const [opts, setOpts] = useState<HighwayOptions>(
    () => resumable?.opts ?? { mode: drumsCourse ? 'kit' : 'tap', level: 1, song: 1, bpm: 90, lanes: 3, keyPc: laneKeyPc(settings) },
  );
  const song = useMemo(() => highwaySong(opts), [opts]);
  const [stage, setStage] = useState<Stage>('setup');
  const [run, setRun] = useState<HighwayRun>(() => newRun(song));
  const [section, setSection] = useState(0);
  const [flash, setFlash] = useState<{ text: string; cls: string; n: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [result, setResult] = useState<{ sum: HighwaySummary; best: boolean } | null>(null);
  const [bests, setBests] = useState<HighwayBests>(loadBests);

  const runRef = useRef(run);
  const songRef = useRef<HighwaySong>(song);
  const originRef = useRef(0); // performance.now() of the song's beat 1
  const playingRef = useRef(false);
  const acRef = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const checkpointRef = useRef<{ section: number; run: HighwayRun }>({ section: 0, run: newRun(song) });
  const curSectionRef = useRef(0);
  const flashN = useRef(0);

  const px = reduced ? 0.15 : 0.3; // px per ms of scroll
  const latency = opts.mode === 'tap' ? settings.tapLatencyMs || 0 : opts.mode === 'kit' ? (settings.midiLatencyMs ?? 0) : useMidi ? (settings.midiLatencyMs ?? 0) : (settings.micLatencyMs ?? MIC_PITCH_LAG_MS);

  const setBoth = (r: HighwayRun) => {
    runRef.current = r;
    setRun(r);
  };

  const showGrade = useCallback(
    (g: HitGrade | 'wrong', offset: number | null) => {
      flashN.current++;
      const label = g === 'wrong' ? tx(T.wrong) : tx(T[g]);
      const side = offset !== null && g === 'good' ? ` · ${tx(offset < 0 ? T.early : T.late)}` : '';
      setFlash({ text: label + side, cls: g, n: flashN.current });
      if ((g === 'miss' || g === 'wrong') && !reduced) setShake((x) => x + 1);
      if (navigator.vibrate && !reduced && document.documentElement.dataset.haptics !== 'off' && (g === 'miss' || g === 'wrong')) {
        try {
          navigator.vibrate(30);
        } catch {
          /* unsupported */
        }
      }
    },
    [lang, reduced],
  );

  const stopAudio = () => {
    playingRef.current = false;
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => () => stopAudio(), []);

  const finish = useCallback(() => {
    const s = songRef.current;
    const swept = sweepMisses(s, runRef.current, s.lengthMs + 10_000, 0).run;
    setBoth(swept);
    const sum = summary(s, swept);
    const best = saveBest(s.id, sum.accuracy);
    setBests(loadBests());
    setResult({ sum, best });
    stopAudio();
    setStage('over');
    onSave(null);
    onResult({
      game: 'highway',
      score: sum.accuracy,
      detail: { songId: s.id, mode: s.opts.mode, level: s.opts.level, bpm: s.opts.bpm, lanes: s.opts.lanes, newBest: best, ...sum },
    });
  }, [onResult, onSave]);

  /** One input at `perf` ms (performance.now clock). */
  const input = useCallback(
    (perf: number, midi?: number | null, lat = latency) => {
      if (!playingRef.current) return;
      const s = songRef.current;
      const j = judgeInput(s, runRef.current, perf - originRef.current, lat, midi);
      setBoth(j.run);
      if (j.grade) showGrade(j.grade, j.offset);
      else if (j.wrongPitch) showGrade('wrong', null);
    },
    [latency, showGrade],
  );

  // rAF: scroll, misses, checkpoints.
  useEffect(() => {
    if (stage !== 'play') return;
    let id = 0;
    const tick = () => {
      const s = songRef.current;
      const songMs = performance.now() - originRef.current;
      if (stripRef.current) stripRef.current.style.transform = `translate3d(0, ${(songMs * px).toFixed(1)}px, 0)`;
      if (playingRef.current) {
        const { run: r, missed } = sweepMisses(s, runRef.current, songMs, latency);
        if (missed.length) {
          setBoth(r);
          showGrade('miss', null);
        }
        // Checkpoint: a section is over when its notes are all judged and the next one has begun.
        const next = curSectionRef.current + 1;
        if (next < s.sections && songMs - latency > sectionStartMs(s, next) + hitWindows(s.opts.level, s.opts.bpm, s.opts.mode).good && sectionsDone(s, runRef.current, next)) {
          curSectionRef.current = next;
          setSection(next);
          const cp = { section: next, run: rewind(s, runRef.current, next) };
          checkpointRef.current = cp;
          onSave({ v: 1, game: 'highway', opts: s.opts, section: cp.section, run: cp.run } satisfies HighwaySaved);
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [stage, px, latency, showGrade, onSave]);

  // Keyboard taps.
  useEffect(() => {
    if (stage !== 'play' || opts.mode !== 'tap') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        input(e.timeStamp);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, opts.mode, input]);

  const start = async (fromSection: number, startRun: HighwayRun, s: HighwaySong = song) => {
    stopAudio();
    songRef.current = s;
    setBoth(startRun);
    curSectionRef.current = fromSection;
    setSection(fromSection);
    checkpointRef.current = { section: fromSection, run: startRun };
    setFlash(null);
    setResult(null);
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const pitch = s.opts.mode === 'pitch';
    const kitMode = s.opts.mode === 'kit';
    const bt = backingTrack(s, fromSection, { bass: !(pitch && !useMidi), drums: !kitMode });
    const offsetMs = sectionStartMs(s, fromSection);
    let unsub: (() => void) | null = null;

    if (kitMode) {
      try {
        await midiInput.enable();
      } catch {
        /* no MIDI: nothing will be heard */
      }
      // Each kit hit → its lane's note (the kit map names the pad); the pedal chick has no lane.
      unsub = midiInput.onHit((h) => {
        const lane = kitLaneOf(h.voice);
        input(h.at || performance.now(), lane === null ? -1 : KIT_LANE_NOTE[KIT_LANES[lane]], settings.midiLatencyMs ?? 0);
      });
      ac.signal.addEventListener('abort', () => unsub?.(), { once: true });
    } else if (pitch && useMidi) {
      try {
        await midiInput.enable();
      } catch {
        /* no MIDI: nothing will be heard */
      }
      unsub = midiInput.onNote((note, on, at) => on && input(at || performance.now(), note, 0));
      ac.signal.addEventListener('abort', () => unsub?.(), { once: true });
    } else if (pitch) {
      // Open the microphone first; the song starts once it is listening.
      const tracker = new OnsetTracker();
      let capStart = 0;
      const ok = await new Promise<boolean>((resolve) => {
        void new BrowserPitchCapture()
          .sing({
            signal: ac.signal,
            maxMs: s.lengthMs + 8000,
            silenceMs: s.lengthMs + 8000,
            endSilenceMs: 1e9,
            hopMs: 20,
            onCapturing: () => {
              capStart = performance.now();
              resolve(true);
            },
            onFrame: (f) => {
              const on = tracker.feed({ ms: capStart + f.t * 1000, hz: f.hz, confidence: f.confidence, rms: f.rms });
              if (on) input(on.ms, on.midi, MIC_PITCH_LAG_MS);
            },
          })
          .then((r) => {
            if (r.kind === 'error' || (r.kind === 'silence' && !capStart)) resolve(false);
          });
      });
      if (ac.signal.aborted) return;
      if (!ok) {
        stopAudio();
        setStage('mic-error');
        return;
      }
    }
    if (ac.signal.aborted) return;
    // Until the audio clock reports beat 1, estimate it (scheduling lead + count-in).
    originRef.current = performance.now() + 120 + bt.responseAt * 1000 - offsetMs;
    playingRef.current = true;
    setStage('play');
    const tl = { clicks: bt.clicks, wood: bt.kit.map((k) => k.t), drums: bt.kit.map((k) => k.d), responseAt: bt.responseAt, responseEnd: bt.responseEnd };
    const done = piano.playTimeline(tl, ac.signal, undefined, (perf) => {
      originRef.current = perf - offsetMs;
    });
    // Hats + bass: `play` schedules 60 ms ahead, `playTimeline` 120 ms — shift to line them up.
    void piano.play(bt.extras.map((e) => ({ ...e, start: e.start + 0.06 })), bt.responseEnd + 0.2, ac.signal).catch(() => {});
    try {
      await done;
    } catch {
      return; // paused / exited
    }
    if (acRef.current === ac) finish();
  };

  const pause = () => {
    stopAudio();
    setStage('paused');
  };
  const resumeFromCheckpoint = () => {
    const cp = checkpointRef.current;
    void start(cp.section, cp.run);
  };

  // ------------------------------------------------------------- render

  if (stage === 'setup') {
    const maxLevel = opts.mode === 'pitch' ? PITCH_MAX_LEVEL : opts.mode === 'kit' ? (KIT_MAX_LEVEL as RhythmLevel) : (MAX_RHYTHM_LEVEL as RhythmLevel);
    const set = (p: Partial<HighwayOptions>) =>
      setOpts((o) => {
        const n = { ...o, ...p };
        if (n.mode === 'pitch' && n.level > PITCH_MAX_LEVEL) n.level = PITCH_MAX_LEVEL;
        if (n.mode === 'kit' && n.level > KIT_MAX_LEVEL) n.level = KIT_MAX_LEVEL as RhythmLevel;
        return n;
      });
    return (
      <main className="panel-screen g3 hw-setup">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={tx(T.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx(T.title)}</h1>
        </header>
        <section className="set-card">
          <fieldset className="seg-field">
            <legend>{tx(T.mode)}</legend>
            <div className="seg" role="radiogroup" aria-label={tx(T.mode)}>
              {MODES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={opts.mode === m} className={opts.mode === m ? 'on' : ''} onClick={() => set({ mode: m })} data-hw-mode={m}>
                  {tx(m === 'tap' ? T.tap : m === 'kit' ? T.kit : T.pitch)}
                </button>
              ))}
            </div>
            <p className="field-hint">{opts.mode === 'tap' ? tx(T.tapHint) : opts.mode === 'kit' ? tx(T.kitHint) : useMidi ? tx(T.midiHint) : tx(T.pitchHint)}</p>
            {opts.mode === 'tap' && !settings.tapLatencyMs && <p className="field-hint warn">{tx(T.calibrate)}</p>}
          </fieldset>
          <fieldset className="seg-field">
            <legend>{tx(T.level)}</legend>
            <div className="g3-chips" role="radiogroup" aria-label={tx(T.level)}>
              {Array.from({ length: maxLevel }, (_, i) => (i + 1) as RhythmLevel).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={opts.level === l} className={`g3-chip ${opts.level === l ? 'on' : ''}`} onClick={() => set({ level: l })}>
                  <bdi dir="ltr">R{l}</bdi>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="seg-field">
            <legend>{tx(T.song)}</legend>
            <div className="g3-chips" role="radiogroup" aria-label={tx(T.song)}>
              {Array.from({ length: SONGS_PER_LEVEL }, (_, i) => i + 1).map((n) => {
                const b = bests[songId({ ...opts, song: n })];
                return (
                  <button key={n} type="button" role="radio" aria-checked={opts.song === n} className={`g3-chip song ${opts.song === n ? 'on' : ''}`} onClick={() => set({ song: n })}>
                    <b dir="ltr">{n}</b>
                    {b !== undefined && (
                      <small>
                        {tx(T.best)} <bdi dir="ltr">{b}%</bdi>
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="seg-field">
            <legend>{tx(T.tempo)}</legend>
            <div className="seg" role="radiogroup" aria-label={tx(T.tempo)}>
              {(
                [
                  [70, T.slow],
                  [90, T.medium],
                  [110, T.fast],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={opts.bpm === v} className={opts.bpm === v ? 'on' : ''} onClick={() => set({ bpm: v })}>
                  {tx(l)} <small dir="ltr">{v}</small>
                </button>
              ))}
            </div>
          </fieldset>
          {opts.mode === 'pitch' && (
            <fieldset className="seg-field">
              <legend>{tx(T.lanes)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.lanes)}>
                {([3, 4, 5] as const).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={opts.lanes === n} className={opts.lanes === n ? 'on' : ''} onClick={() => set({ lanes: n, keyPc: laneKeyPc(settings) })}>
                    <bdi dir="ltr">{n}</bdi>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </section>
        {resumable && (
          <button
            className="btn primary mega"
            data-resume-highway="1"
            onClick={() => {
              const s = highwaySong(resumable.opts);
              setOpts(resumable.opts);
              void start(resumable.section, resumable.run, s);
            }}
          >
            {tx(T.cont)} <bdi dir="ltr">{resumable.section + 1}</bdi>
          </button>
        )}
        <button
          className={`btn ${resumable ? 'ghost' : 'primary mega'}`}
          data-start-highway="1"
          onClick={() => {
            onSave(null);
            void start(0, newRun(song), song);
          }}
        >
          {tx(T.play)}
        </button>
      </main>
    );
  }

  if (stage === 'mic-error') {
    return (
      <main className="panel-screen g3">
        <section className="set-card g3-center">
          <p>{tx(T.micError)}</p>
          <button className="btn mega" onClick={() => resumeFromCheckpoint()}>
            {tx(T.retry)}
          </button>
          <button
            className="btn"
            onClick={() => {
              setOpts((o) => ({ ...o, mode: 'tap', level: o.level }));
              setStage('setup');
            }}
          >
            {tx(T.useTaps)}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </section>
      </main>
    );
  }

  if (stage === 'over' && result) {
    const r = result.sum;
    return (
      <main className="recap g3 hw-over">
        <p className="eyebrow">
          {tx(T.title)} · <bdi dir="ltr">R{song.opts.level}</bdi> · {tx(T.song)} <bdi dir="ltr">{song.opts.song}</bdi>
        </p>
        <h1>{r.fullCombo ? tx(T.fullCombo) : result.best ? tx(T.newBest) : tx(T.accuracy)}</h1>
        <p className="big-score">
          <small>{tx(T.accuracy)}</small>
          <b dir="ltr">{r.accuracy}%</b>
        </p>
        <ul className="g3-stats">
          <li className="perfect">
            {tx(T.perfect)} <bdi dir="ltr">{r.perfect}</bdi>
          </li>
          <li className="good">
            {tx(T.good)} <bdi dir="ltr">{r.good}</bdi>
          </li>
          <li className="miss">
            {tx(T.miss)} <bdi dir="ltr">{r.miss}</bdi>
          </li>
          <li>
            {tx(T.maxCombo)} <bdi dir="ltr">{r.maxCombo}</bdi>
          </li>
          <li>
            <bdi dir="ltr">{r.points}</bdi> {tx(T.points)}
          </li>
          {r.meanOffsetMs !== null && Math.abs(r.meanOffsetMs) >= 20 && (
            <li>
              <bdi dir="ltr">{Math.abs(r.meanOffsetMs)} ms</bdi> {tx(r.meanOffsetMs < 0 ? T.early : T.late)}
            </li>
          )}
          <li>
            {tx(T.best)} <bdi dir="ltr">{bests[song.id] ?? r.accuracy}%</bdi>
          </li>
        </ul>
        <div className="recap-actions">
          <button className="btn primary mega" onClick={() => void start(0, newRun(song), song)}>
            {tx(T.again)}
          </button>
          {song.opts.song < SONGS_PER_LEVEL && (
            <button
              className="btn"
              onClick={() => {
                const o = { ...song.opts, song: song.opts.song + 1 };
                setOpts(o);
                const s = highwaySong(o);
                void start(0, newRun(s), s);
              }}
            >
              {tx(T.next)}
            </button>
          )}
          <button className="btn ghost" onClick={() => setStage('setup')}>
            {tx(T.back)}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </div>
      </main>
    );
  }

  // play / paused
  const s = songRef.current;
  const lanes = Math.max(1, s.laneMidis.length);
  const naming = namingFor(settings.naming, lang);
  const sum = summary(s, run);
  const judged = run.grades.filter((g) => g !== null).length;
  const accNow = judged ? Math.round((100 * (sum.perfect + 0.6 * sum.good)) / judged) : 100;
  const barMs = s.beatsPerBar * s.beatMs;

  return (
    <main className={`g3 hw-play ${reduced ? 'calm' : ''}`}>
      <header className="lesson-top hw-top">
        <button className="icon-btn" onClick={() => (stage === 'paused' ? onExit() : pause())} aria-label={stage === 'paused' ? tx(T.exit) : tx(T.pause)}>
          {stage === 'paused' ? '✕' : '❚❚'}
        </button>
        <div className="hw-stat" aria-live="off">
          <small>{tx(T.accuracy)}</small>
          <b dir="ltr">{accNow}%</b>
        </div>
        <div className="hw-stat combo">
          <small>{tx(T.combo)}</small>
          <b dir="ltr">{run.combo}</b>
        </div>
        <div className="hw-stat">
          <small>{tx(T.section)}</small>
          <b dir="ltr">
            {section + 1}/{s.sections}
          </b>
        </div>
      </header>

      {stage === 'paused' ? (
        <section className="paused-card">
          <h2>{tx(T.paused)}</h2>
          <button className="btn mega" onClick={resumeFromCheckpoint}>
            {tx(T.resume)} <bdi dir="ltr">{checkpointRef.current.section + 1}</bdi>
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </section>
      ) : (
        <>
          {/* The road itself is physical (left = low lane) in both languages. */}
          <div
            className={`hw-road lanes-${lanes} ${shake && !reduced ? `shake-${shake % 2}` : ''}`}
            dir="ltr"
            style={{ ['--lanes' as string]: lanes }}
            onPointerDown={(e) => {
              if (opts.mode !== 'tap') return;
              e.preventDefault();
              input(e.timeStamp);
            }}
            role="application"
            aria-label={tx(T.title)}
          >
            {Array.from({ length: lanes }, (_, i) => (
              <div key={i} className="hw-lane" style={{ ['--i' as string]: i }} />
            ))}
            <div className="hw-strip" ref={stripRef}>
              {Array.from({ length: s.bars + 1 }, (_, b) => (
                <div key={`b${b}`} className={`hw-bar ${b % s.sectionBars === 0 ? 'sec' : ''}`} style={{ bottom: `${b * barMs * px}px` }} />
              ))}
              {s.notes.map((n, i) => {
                const g = run.grades[i];
                return (
                  <div
                    key={i}
                    className={`hw-note lane-${n.lane} ${g ? `is-${g}` : ''}`}
                    style={{
                      bottom: `${n.ms * px}px`,
                      height: `${Math.max(14, Math.min(n.durMs * px, 90) * 0.35)}px`,
                      ['--i' as string]: n.lane,
                    }}
                  />
                );
              })}
            </div>
            <div className="hw-hitline" />
            {flash && (
              <div key={flash.n} className={`hw-flash ${flash.cls}`} aria-live="assertive">
                {flash.text}
              </div>
            )}
            {s.opts.mode === 'kit' && (
              <div className="hw-lane-labels kit" data-kit-lanes="1">
                {KIT_LANES.map((l, i) => (
                  <span key={l} style={{ ['--i' as string]: i }}>
                    <b>{KIT_SHORT[l][lang]}</b>
                  </span>
                ))}
              </div>
            )}
            {s.laneMidis.length > 0 && s.opts.mode !== 'kit' && (
              <div className="hw-lane-labels">
                {s.laneMidis.map((m, i) => (
                  <span key={i} style={{ ['--i' as string]: i }}>
                    <b>{s.laneDegrees[i]}</b>
                    <small>{displayNote(PC_NAMES[m % 12], naming, lang)}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
          {opts.mode === 'tap' && (
            <button
              className="tap-pad big hw-pad live"
              onPointerDown={(e) => {
                e.preventDefault();
                input(e.timeStamp);
              }}
              aria-label={tx(T.tapHere)}
            >
              {tx(T.tapHere)}
            </button>
          )}
          <p className="hint">{opts.mode === 'tap' ? tx(T.tapHint) : opts.mode === 'kit' ? tx(T.kitHint) : tx(T.pitchHint)}</p>
        </>
      )}
    </main>
  );
}
