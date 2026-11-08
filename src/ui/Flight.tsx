// Voice Flight (spec AE §8): sing or play to fly the bird through gates on scale degrees over a drone.
// The course runs physically left → right in both languages; only the chrome mirrors in Hebrew.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BleedGate, CALIBRATE_SEC } from '../engine/bleed';
import {
  checkpointOf,
  distanceOf,
  droneOf,
  ensureGates,
  flightRange,
  foldPitch,
  gateLabel,
  heightToMidi,
  initState,
  isCheckpoint,
  levelAt,
  makeCourse,
  scaleStep,
  scoreOf,
  START_LIVES,
  step,
  viewBand,
  type Course,
  type FlightLevel,
  type FlightState,
} from '../engine/flight';
import type { SungFrame } from '../engine/sing';
import type { AccessError, PitchCapture } from '../game/adapters';
import { MidiPitchCapture } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Settings } from '../storage/progress';
import { piano, SIMULATED } from './services';

export type Game2 = 'flight' | 'pitch-memory' | 'name-tune' | 'tune-up';
export interface Game2Result {
  game: Game2;
  score: number;
  detail?: unknown;
}
export interface Game2Props {
  lang: 'he' | 'en';
  settings: Settings;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: Game2Result) => void;
  /** Personal best to show (optional; the caller keeps it). */
  best?: number;
}

// ------------------------------------------------------------------ shared bits (also used by the other games)

export const prefersCalm = (s: Settings) =>
  s.reducedMotion ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export const pitchCaptureFor = (s: Settings): PitchCapture => (s.midiInput ? new MidiPitchCapture() : new BrowserPitchCapture());

const hzOf = (m: number) => 440 * 2 ** ((m - 69) / 12);
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/**
 * Keep listening (long capture windows) until aborted. In the simulator (?sim=1) frames follow `simTarget`.
 * Resolves with an error when the microphone cannot be opened.
 */
export async function listenLoop(cap: PitchCapture, signal: AbortSignal, onFrame: (f: SungFrame) => void, simTarget?: () => number | null, opts: { chroma?: boolean } = {}): Promise<AccessError | null> {
  if (SIMULATED) {
    let t = 0;
    await new Promise<void>((resolve) => {
      const id = setInterval(() => {
        if (signal.aborted) {
          clearInterval(id);
          return resolve();
        }
        const m = simTarget?.() ?? null;
        onFrame(m === null ? { t, hz: null, confidence: 0, rms: 0.001 } : { t, hz: hzOf(m + 0.05), confidence: 0.95, rms: 0.1 });
        t += 1 / 30;
      }, 33);
    });
    return null;
  }
  while (!signal.aborted) {
    const r = await cap.sing({ signal, maxMs: 120_000, silenceMs: 120_000, endSilenceMs: 120_000, hopMs: 25, onFrame, chroma: opts.chroma });
    if (r.kind === 'error') return r.error;
    if (r.kind === 'aborted') return null;
  }
  return null;
}

const MIC_TEXT = {
  en: {
    title: 'The microphone is not available',
    blocked: 'Allow the microphone for this site (the icon in the address bar), then try again.',
    none: 'No microphone was found, or another app is using it.',
    other: 'The microphone could not be opened.',
    retry: 'Try again',
    touch: 'Play with touch',
    back: 'Back',
  },
  he: {
    title: 'אין גישה למיקרופון',
    blocked: 'אפשרו את המיקרופון לאתר הזה (הסמל בשורת הכתובת) ונסו שוב.',
    none: 'לא נמצא מיקרופון, או שאפליקציה אחרת משתמשת בו.',
    other: 'לא ניתן לפתוח את המיקרופון.',
    retry: 'לנסות שוב',
    touch: 'לשחק במגע',
    back: 'חזרה',
  },
};

export function MicProblem({ lang, error, onRetry, onBack, onTouch }: { lang: 'he' | 'en'; error: AccessError; onRetry: () => void; onBack: () => void; onTouch?: () => void }) {
  const tx = MIC_TEXT[lang];
  const msg = error.code === 'permission-denied' || error.code === 'os-blocked' ? tx.blocked : error.code === 'no-device' || error.code === 'device-busy' ? tx.none : tx.other;
  return (
    <section className="g2-card g2-mic" role="alert">
      <h2>{tx.title}</h2>
      <p>{msg}</p>
      <p className="g2-dim">
        <code dir="ltr">{error.code}</code>
      </p>
      <div className="g2-row">
        <button className="btn primary" onClick={onRetry}>
          {tx.retry}
        </button>
        {onTouch && (
          <button className="btn" data-touch-mode onClick={onTouch}>
            {tx.touch}
          </button>
        )}
        <button className="btn ghost" onClick={onBack}>
          {tx.back}
        </button>
      </div>
    </section>
  );
}

export function G2Head({ title, backLabel, onBack, children }: { title: string; backLabel: string; onBack: () => void; children?: ReactNode }) {
  return (
    <header className="screen-head g2-head">
      <button className="icon-btn" onClick={onBack} aria-label={backLabel}>
        <span className="flip-rtl">←</span>
      </button>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

// ------------------------------------------------------------------ Voice Flight

const TEXT = {
  en: {
    title: 'Voice Flight',
    blurb: 'A drone sets the key. Sing — or play — to fly through the gaps: higher notes fly higher. Each gap sits on a scale degree.',
    level: 'Start at',
    levels: { 1: 'Steps · wide gates', 2: 'Leaps · narrow gates', 3: 'Chromatic' } as Record<FlightLevel, string>,
    start: 'Start',
    cont: (n: number) => `Continue from gate ${n}`,
    newGame: 'New flight',
    back: 'Back',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    exit: 'Leave (saved at the last checkpoint)',
    quiet: 'Listening to the room — stay quiet a moment…',
    sing: 'Sing to fly!',
    score: 'Score',
    gates: 'Gates',
    lives: 'Lives',
    lvl: 'Level',
    checkpoint: 'Checkpoint saved',
    levelUp: 'Level up!',
    over: 'Flight over',
    distance: 'Distance',
    again: 'Fly again',
    best: 'Best',
    hintVoice: 'Headphones help: the drone stays out of the microphone.',
    touchMode: 'Play with touch (no microphone)',
    hintTouch: 'Hold or drag on the course to set the height; ↑ / ↓ or W / S move one scale step. Touch flights don’t count toward singing achievements.',
    hintMidi: 'Your MIDI keyboard flies the bird.',
  },
  he: {
    title: 'מעוף קולי',
    blurb: 'צליל ממושך (דרון) קובע את הסולם. שירו — או נגנו — כדי לעוף דרך הפתחים: צליל גבוה יותר מעיף גבוה יותר. כל פתח יושב על דרגה בסולם.',
    level: 'להתחיל ב',
    levels: { 1: 'צעדים · פתחים רחבים', 2: 'קפיצות · פתחים צרים', 3: 'כרומטי' } as Record<FlightLevel, string>,
    start: 'להתחיל',
    cont: (n: number) => `להמשיך משער ${n}`,
    newGame: 'מעוף חדש',
    back: 'חזרה',
    pause: 'השהיה',
    paused: 'מושהה',
    resume: 'להמשיך',
    exit: 'לצאת (נשמר בנקודת הביקורת האחרונה)',
    quiet: 'מקשיבים לחדר — רגע של שקט…',
    sing: 'שירו כדי לעוף!',
    score: 'ניקוד',
    gates: 'שערים',
    lives: 'חיים',
    lvl: 'שלב',
    checkpoint: 'נקודת ביקורת נשמרה',
    levelUp: 'עלית שלב!',
    over: 'המעוף נגמר',
    distance: 'מרחק',
    again: 'לעוף שוב',
    best: 'שיא',
    hintVoice: 'אוזניות עוזרות: הדרון לא נכנס למיקרופון.',
    touchMode: 'לשחק במגע (בלי מיקרופון)',
    hintTouch: 'החזיקו או גררו על המסלול כדי לקבוע את הגובה; ↑ / ↓ או W / S מזיזים צעד בסולם. מעוף במגע לא נספר להישגי שירה.',
    hintMidi: 'מקלדת ה-MIDI שלכם מעיפה את הציפור.',
  },
};

const W = 720;
const H = 400;
const BIRD_X = 150;
const PILLAR_W = 48;

type Phase = 'setup' | 'play' | 'paused' | 'over' | 'error';

function cssVar(name: string, fallback: string) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}

export function Flight({ lang, settings, saved, onSave, onExit, onResult, best }: Game2Props) {
  const tx = TEXT[lang];
  const calm = prefersCalm(settings);
  const input = settings.midiInput ? 'midi' : settings.instrument && settings.instrument !== 'voice' ? 'instrument' : 'voice';
  const range = useMemo(() => flightRange(settings.voiceRange ?? null, input), [settings.voiceRange, input]);
  const cp = isCheckpoint(saved) ? saved : null;

  const [phase, setPhase] = useState<Phase>('setup');
  const [level, setLevel] = useState<FlightLevel>(1);
  const [hud, setHud] = useState({ score: 0, gates: 0, lives: START_LIVES, level: 1 as FlightLevel, distance: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [listening, setListening] = useState<'quiet' | 'live' | 'off'>('off');
  const [micErr, setMicErr] = useState<AccessError | null>(null);
  const [touch, setTouch] = useState(false);
  const touchRef = useRef(false);
  touchRef.current = touch;
  /** Touch / keyboard steering target (MIDI); stays where it was set. */
  const steer = useRef<number | null>(null);

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const game = useRef<{ course: Course; s: FlightState } | null>(null);
  const pitch = useRef<{ midi: number | null; at: number }>({ midi: null, at: 0 });
  const ready = useRef(false);
  const ctl = useRef<AbortController | null>(null);

  const stopAudio = () => {
    ctl.current?.abort();
    ctl.current = null;
    piano.stopDrone();
    setListening('off');
  };
  useEffect(() => stopAudio, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((m) => (m === msg ? null : m)), 1400);
  };

  /** Drone + microphone (or MIDI). The world waits until the room level is learned. */
  const startListening = async () => {
    const g = game.current!;
    await piano.unlock();
    piano.startDrone(droneOf(g.course), 0.12);
    const c = new AbortController();
    ctl.current = c;
    ready.current = false;
    pitch.current = { midi: null, at: 0 };
    if (touchRef.current) {
      steer.current = g.s.y;
      ready.current = true;
      setListening('live');
      return;
    }
    const midiIn = !!settings.midiInput;
    const gate = new BleedGate(droneOf(g.course));
    if (SIMULATED || midiIn) {
      gate.finishCalibration();
      ready.current = true;
      setListening('live');
    } else setListening('quiet');
    let t0: number | null = null;
    const onFrame = (raw: SungFrame) => {
      if (!gate.ready) {
        t0 ??= raw.t;
        if (raw.t - t0 < CALIBRATE_SEC) return gate.calibrate(raw);
        gate.finishCalibration();
        ready.current = true;
        setListening('live');
      }
      const f = midiIn ? raw : gate.pass(raw);
      if (f.hz && f.confidence >= 0.8) pitch.current = { midi: foldPitch(midiOf(f.hz), range), at: performance.now() };
    };
    const simTarget = () => {
      const s = game.current;
      if (!s) return null;
      ensureGates(s.course, s.s.next + 2);
      return s.course.gates[s.s.next].center;
    };
    const err = await listenLoop(pitchCaptureFor(settings), c.signal, onFrame, simTarget);
    if (err) {
      stopAudio();
      setMicErr(err);
      setPhase('error');
    }
  };

  const begin = (fromCp: boolean) => {
    const seed = fromCp && cp ? cp.seed : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    // A saved flight resumes in today's range (the range may have been measured or changed since it was saved).
    const course = makeCourse(seed, fromCp && cp ? cp.startLevel : level, range);
    const s = initState(course, fromCp ? cp : null);
    game.current = { course, s };
    onSave(checkpointOf(course, s));
    setHud({ score: scoreOf(s), gates: s.passed, lives: s.lives, level: levelAt(course.startLevel, s.next), distance: distanceOf(s) });
    setMicErr(null);
    setPhase('play');
    void startListening();
  };

  const pause = () => {
    stopAudio();
    setPhase('paused');
  };
  const resume = () => {
    setPhase('play');
    void startListening();
  };

  // Pause when the app goes to the background.
  useEffect(() => {
    if (phase !== 'play') return;
    const onVis = () => document.hidden && pause();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  // The game loop (60 fps): physics in the pure engine, drawing on the canvas.
  useEffect(() => {
    if (phase !== 'play') return;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    const col = {
      bg: cssVar('--bg-2', '#16182e'),
      pillar: cssVar('--card-2', '#23254a'),
      edge: cssVar('--hue-pitch', '#7c8cff'),
      mint: cssVar('--mint', '#5cf2b5'),
      gold: cssVar('--gold', '#ffc94d'),
      red: cssVar('--red', '#ff6b5c'),
      ink: cssVar('--ink', '#f4f1ff'),
      dim: cssVar('--ink-dim', '#a9a6c9'),
    };
    const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 197) % W, y: (i * 89) % (H - 20), r: (i % 3) * 0.5 + 0.6, d: 0.15 + (i % 4) * 0.12 }));
    const trail: number[] = [];
    let shake = 0;
    let last = performance.now();
    let raf = 0;
    let hudAt = 0;

    const frame = (now: number) => {
      const g = game.current;
      if (!g) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const band = viewBand(g.course.range);
      const yOf = (m: number) => ((band.high - m) / (band.high - band.low)) * H;
      // Pitch older than 150 ms = silence.
      const p = touchRef.current ? steer.current : pitch.current.midi !== null && now - pitch.current.at < 150 ? pitch.current.midi : null;
      if (ready.current) {
        const r = step(g.course, g.s, dt, p, calm);
        g.s = r.s;
        for (const e of r.events) {
          if (e === 'hit' && !calm) shake = 0.3;
          if (e === 'checkpoint') {
            onSave(checkpointOf(g.course, g.s));
            flash(tx.checkpoint);
          }
          if (e === 'level') flash(tx.levelUp);
          if (e === 'over') {
            const score = scoreOf(g.s);
            onSave(null);
            onResult({ game: 'flight', score, detail: { gates: g.s.passed, distance: distanceOf(g.s), startLevel: g.course.startLevel, level: levelAt(g.course.startLevel, g.s.next), input: touchRef.current ? 'touch' : input } });
            stopAudio();
            setHud({ score, gates: g.s.passed, lives: 0, level: levelAt(g.course.startLevel, g.s.next), distance: distanceOf(g.s) });
            setPhase('over');
          }
        }
      }
      const s = g.s;
      trail.push(s.y);
      if (trail.length > 36) trail.shift();
      shake = Math.max(0, shake - dt);

      // ---- draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
      ctx.fillStyle = col.bg;
      ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.fillStyle = col.dim;
      for (const st of stars) {
        const x = calm ? st.x : (((st.x - s.x * st.d) % W) + W) % W;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Faint guide lines on the key's degrees (tonic brighter).
      for (let m = Math.ceil(band.low); m <= band.high; m++) {
        const semis = (((m - g.course.tonic) % 12) + 12) % 12;
        if (![0, 2, 4, 5, 7, 9, 11].includes(semis)) continue;
        ctx.strokeStyle = semis === 0 ? col.gold : col.dim;
        ctx.globalAlpha = semis === 0 ? 0.35 : 0.12;
        ctx.beginPath();
        ctx.moveTo(0, yOf(m));
        ctx.lineTo(W, yOf(m));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Gates.
      ctx.font = '600 15px Rubik, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = Math.max(0, s.next - 2); i < s.next + 4; i++) {
        const gt = g.course.gates[i];
        if (!gt) continue;
        const sx = BIRD_X + (gt.x - s.x);
        if (sx < -PILLAR_W || sx > W + PILLAR_W) continue;
        const top = yOf(gt.center + gt.half);
        const bot = yOf(gt.center - gt.half);
        ctx.fillStyle = col.pillar;
        ctx.fillRect(sx - PILLAR_W / 2, -10, PILLAR_W, top + 10);
        ctx.fillRect(sx - PILLAR_W / 2, bot, PILLAR_W, H - bot + 10);
        ctx.fillStyle = i < s.next ? col.dim : col.edge;
        ctx.fillRect(sx - PILLAR_W / 2 - 4, top - 8, PILLAR_W + 8, 8);
        ctx.fillRect(sx - PILLAR_W / 2 - 4, bot, PILLAR_W + 8, 8);
        ctx.fillStyle = gt.semis === 0 ? col.gold : col.ink;
        ctx.globalAlpha = i < s.next ? 0.4 : 0.9;
        ctx.fillText(gateLabel(gt), sx, (top + bot) / 2);
        ctx.globalAlpha = 1;
      }
      // Trail and bird.
      ctx.strokeStyle = col.mint;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.beginPath();
      trail.forEach((y, k) => {
        const x = BIRD_X - (trail.length - 1 - k) * 4;
        if (k === 0) ctx.moveTo(x, yOf(y));
        else ctx.lineTo(x, yOf(y));
      });
      ctx.stroke();
      ctx.globalAlpha = p === null ? 0.6 : 1;
      const by = yOf(s.y);
      ctx.fillStyle = shake > 0 ? col.red : col.mint;
      ctx.beginPath();
      ctx.arc(BIRD_X, by, 13, 0, Math.PI * 2);
      ctx.fill();
      const flap = calm ? 0 : Math.sin(now / 90) * 6;
      ctx.fillStyle = col.ink;
      ctx.beginPath();
      ctx.moveTo(BIRD_X - 4, by);
      ctx.lineTo(BIRD_X - 18, by - 8 + flap);
      ctx.lineTo(BIRD_X - 10, by + 3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(BIRD_X + 6, by - 4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1020';
      ctx.fill();
      ctx.fillStyle = col.gold;
      ctx.beginPath();
      ctx.moveTo(BIRD_X + 12, by - 2);
      ctx.lineTo(BIRD_X + 20, by + 1);
      ctx.lineTo(BIRD_X + 12, by + 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (now - hudAt > 120) {
        hudAt = now;
        setHud({ score: scoreOf(s), gates: s.passed, lives: s.lives, level: levelAt(g.course.startLevel, s.next), distance: distanceOf(s) });
      }
      if (!s.over) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, calm]);

  const steerTo = (e: { clientY: number; currentTarget: HTMLCanvasElement }) => {
    const g = game.current;
    if (!g) return;
    const r = e.currentTarget.getBoundingClientRect();
    steer.current = heightToMidi(g.course, (e.clientY - r.top) / Math.max(1, r.height));
  };

  // Keyboard steering in touch mode: ↑ / ↓ or W / S move the bird one scale step.
  useEffect(() => {
    if (phase !== 'play' || !touch) return;
    const onKey = (e: KeyboardEvent) => {
      const g = game.current;
      if (!g) return;
      const dir = e.code === 'ArrowUp' || e.code === 'KeyW' ? 1 : e.code === 'ArrowDown' || e.code === 'KeyS' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const chromatic = levelAt(g.course.startLevel, g.s.next) === 3;
      steer.current = scaleStep(g.course, steer.current ?? g.s.y, dir, chromatic);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, touch]);

  const back = () => {
    if (phase === 'play') return pause();
    stopAudio();
    onExit();
  };

  return (
    <main className={`panel-screen g2 g2-flight ${calm ? 'g2-calm' : ''}`} data-game="flight" data-phase={phase}>
      <G2Head title={tx.title} backLabel={phase === 'play' ? tx.pause : tx.back} onBack={back}>
        {phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {'♥'.repeat(Math.max(0, hud.lives))}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx.blurb}</p>
          <fieldset className="seg-field">
            <legend>{tx.level}</legend>
            <div className="seg g2-seg" role="radiogroup" aria-label={tx.level}>
              {([1, 2, 3] as const).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>
                  {tx.levels[l]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="toggle-row">
            <input type="checkbox" checked={touch} onChange={(e) => setTouch(e.target.checked)} data-touch-toggle />
            <span>{tx.touchMode}</span>
          </label>
          <p className="g2-dim">{touch ? tx.hintTouch : settings.midiInput ? tx.hintMidi : tx.hintVoice}</p>
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {cp ? (
            <div className="g2-col">
              <button className="btn primary mega" data-resume-flight onClick={() => begin(true)}>
                {tx.cont(cp.next)}
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
      )}

      {(phase === 'play' || phase === 'paused') && (
        <>
          <div className="g2-hud" aria-live="polite">
            <span>
              <small>{tx.score}</small> <b dir="ltr">{hud.score}</b>
            </span>
            <span>
              <small>{tx.gates}</small> <b dir="ltr">{hud.gates}</b>
            </span>
            <span>
              <small>{tx.lvl}</small> <b dir="ltr">{hud.level}</b>
            </span>
          </div>
          <div className="g2-stage" dir="ltr">
            <canvas
              ref={canvas}
              className="g2-canvas"
              width={W}
              height={H}
              aria-label={tx.title}
              role="img"
              onPointerDown={(e) => {
                if (!touch) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                steerTo(e);
              }}
              onPointerMove={(e) => touch && e.buttons && steerTo(e)}
            />
            {listening === 'quiet' && phase === 'play' && <p className="g2-overlay">{tx.quiet}</p>}
            {listening === 'live' && !touch && hud.distance === 0 && hud.gates === 0 && <p className="g2-overlay soft">{tx.sing}</p>}
            {toast && <p className="g2-toast">{toast}</p>}
          </div>
          {phase === 'paused' && (
            <section className="g2-card g2-paused">
              <h2>{tx.paused}</h2>
              <button className="btn mega" onClick={resume}>
                {tx.resume}
              </button>
              <button className="btn ghost" onClick={onExit}>
                {tx.exit}
              </button>
            </section>
          )}
        </>
      )}

      {phase === 'error' && micErr && (
        <MicProblem
          lang={lang}
          error={micErr}
          onRetry={() => {
            setMicErr(null);
            setPhase('play');
            void startListening();
          }}
          onBack={onExit}
          onTouch={() => {
            setMicErr(null);
            setTouch(true);
            touchRef.current = true;
            setPhase('play');
            void startListening();
          }}
        />
      )}

      {phase === 'over' && (
        <section className="g2-card g2-over">
          <h2>{tx.over}</h2>
          <p className="g2-big" dir="ltr">
            {hud.score}
          </p>
          <ul className="g2-stats">
            <li>
              {tx.gates}: <b dir="ltr">{hud.gates}</b>
            </li>
            <li>
              {tx.distance}: <b dir="ltr">{hud.distance} m</b>
            </li>
            <li>
              {tx.lvl}: <b dir="ltr">{hud.level}</b>
            </li>
          </ul>
          <button className="btn primary mega" onClick={() => begin(false)}>
            {tx.again}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx.back}
          </button>
        </section>
      )}
    </main>
  );
}
