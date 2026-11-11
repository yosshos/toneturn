// Speed games (0.38): Chord Rush, Note Rush, Fretboard Rush, Interval Rush, Key Signature Rush (60 seconds, combos)
// and Progression Detective (3 lives, no clock). The engine is src/engine/rush.ts. Pictures stay physical LTR;
// only the chrome mirrors in Hebrew.

import '../rush.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  comboMult,
  currentItem,
  fretAnswers,
  gradeFret,
  isRushSaved,
  isPlayed,
  ladderOf,
  isStreak,
  isRounds,
  ROUNDS,
  newRush,
  rushAnswer,
  rushLadder,
  rushResult,
  rushHears,
  rushTick,
  RUSH_MS,
  START_LIVES,
  type RushItem,
  type RushMode,
  type RushPicture,
  type RushState,
} from '../engine/rush';
import { renderStimulus, type Stimulus } from '../engine/lesson';
import { noteAt, tuningById } from '../engine/fretboard';
import { neckTuningOf, type Settings } from '../storage/progress';
import { DiagramView, Neck, type NeckDot } from './Instrument';
import { NoteStaff } from './NoteViews';
import { G2Head, prefersCalm } from './Flight';
import { piano } from './services';
import { TierChips } from './TierChips';
import { startTier, tierAllowed, tierDef, type DynName, type TierInfo } from '../engine/gameTiers';
import { judgeStrum } from '../engine/chordFinder';
import { useStrums } from './strumListen';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };

export interface RushProps {
  lang: Lang;
  settings: Settings;
  mode: RushMode;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: { game: string; score: number; detail?: unknown }) => void;
  best?: number;
  /** Level tiers (GAMES_TIERS_PLAN): which tier opens and how far up the player may pick. */
  tier?: TierInfo;
}

/** Cards for the games list: route id, icon, hue, names. */
export const RUSH_GAMES: { mode: RushMode; icon: string; hue: string; en: [string, string]; he: [string, string] }[] = [
  { mode: 'chord', icon: '🎹', hue: 'var(--hue-reading)', en: ['Chord Rush', 'See a chord, name it — 60 seconds.'], he: ['מרוץ אקורדים', 'רואים אקורד, נותנים לו שם — 60 שניות.'] },
  { mode: 'note', icon: '𝄞', hue: 'var(--hue-reading)', en: ['Note Rush', 'Read notes on the staff against the clock.'], he: ['מרוץ תווים', 'קוראים תווים על החמשה נגד השעון.'] },
  { mode: 'fretboard', icon: '🎸', hue: 'var(--hue-instrument)', en: ['Fretboard Rush', 'Find the note on the neck — fast.'], he: ['מרוץ הצוואר', 'מוצאים את התו על הצוואר — מהר.'] },
  { mode: 'interval', icon: '↕', hue: 'var(--hue-pitch)', en: ['Interval Rush', 'Name intervals by ear against the clock.'], he: ['מרוץ מרווחים', 'מזהים מרווחים בשמיעה נגד השעון.'] },
  { mode: 'keysig', icon: '♯', hue: 'var(--hue-reading)', en: ['Key Signature Rush', 'Which key is it? 60 seconds.'], he: ['מרוץ סימני היתק', 'איזה סולם זה? 60 שניות.'] },
  { mode: 'progression', icon: '🔍', hue: 'var(--hue-creative)', en: ['Progression Detective', 'Name the chord progression. Three lives.'], he: ['בלש המהלכים', 'מזהים את מהלך האקורדים. שלושה חיים.'] },
  { mode: 'voicing', icon: '', hue: 'var(--hue-pitch)', en: ['Voicing Spy', 'Hear a chord, name its voicing. Three lives.'], he: ['מרגל הוויסינגים', 'שומעים אקורד, מזהים את הוויסינג. שלושה חיים.'] },
  { mode: 'scale', icon: '', hue: 'var(--hue-pitch)', en: ['Scale & Mode Rush', 'Hear a scale or mode, name it — 60 seconds.'], he: ['מרוץ סולמות ומודוסים', 'שומעים סולם או מודוס, נותנים שם — 60 שניות.'] },
  { mode: 'standard', icon: '', hue: 'var(--hue-pitch)', en: ['Name That Standard', 'Hear the changes, name the tune — 10 rounds.'], he: ['זהו את הסטנדרט', 'שומעים את המהלך, מזהים את השיר — 10 סיבובים.'] },
];

const T = {
  back: { en: 'Back', he: 'חזרה' },
  startAt: { en: 'Start at level', he: 'להתחיל ברמה' },
  picture: { en: 'Draw the chords on', he: 'לצייר את האקורדים על' },
  pics: { keys: { en: 'Keys', he: 'קלידים' }, staff: { en: 'Staff', he: 'חמשה' }, neck: { en: 'Guitar', he: 'גיטרה' }, mixed: { en: 'Mixed', he: 'מעורב' }, play: { en: 'Strum it', he: 'לפרוט' } } as Record<RushPicture, Bi>,
  playHint: { en: 'Strum it: the chord name appears — play it on your guitar, clean tone, every string. The microphone decides.', he: 'לפרוט: מופיע שם של אקורד — נגנו אותו בגיטרה, צליל נקי, כל המיתרים. המיקרופון מחליט.' },
  strumIt: { en: 'Strum', he: 'פרטו' },
  listening: { en: 'Listening', he: 'מקשיבים' },
  strumAgain: { en: 'Not clear — strum it again', he: 'לא ברור — פרטו שוב' },
  heard: { en: 'Heard', he: 'נשמע' },
  skip: { en: 'Skip', he: 'דילוג' },
  micOff: { en: 'The microphone is not available. Allow it for this site and try again.', he: 'המיקרופון לא זמין. אפשרו אותו לאתר ונסו שוב.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newGame: { en: 'New game', he: 'משחק חדש' },
  best: { en: 'Best', he: 'שיא' },
  newBest: { en: 'New personal best', he: 'שיא אישי חדש' },
  score: { en: 'Score', he: 'ניקוד' },
  level: { en: 'Level', he: 'רמה' },
  lives: { en: 'Lives', he: 'חיים' },
  time: { en: 'Seconds left', he: 'שניות שנשארו' },
  combo: { en: 'Combo', he: 'קומבו' },
  right: { en: 'Right', he: 'נכונות' },
  wrong: { en: 'Wrong', he: 'שגויות' },
  maxCombo: { en: 'Best combo', he: 'הקומבו הכי ארוך' },
  reached: { en: 'Level reached', he: 'הרמה שהגעתם אליה' },
  again: { en: 'Play again', he: 'לשחק שוב' },
  timeUp: { en: 'Time!', he: 'נגמר הזמן!' },
  caseClosed: { en: 'Case closed', he: 'התיק נסגר' },
  levelUp: { en: 'Level up!', he: 'עלית רמה!' },
  play: { en: 'Play again', he: 'להשמיע שוב' },
  rightFb: { en: 'Right!', he: 'נכון!' },
  answerWas: { en: 'The answer:', he: 'התשובה:' },
  find: { en: 'Find', he: 'מצאו את' },
  onStrings: { en: 'strings', he: 'מיתרים' },
  onString: { en: 'string', he: 'מיתר' },
  keysHint: { en: 'Keys 1–4 answer.', he: 'מקשים 1–4 עונים.' },
  earHint: { en: 'Space plays it again.', he: 'רווח משמיע שוב.' },
  timedRules: { en: '60 seconds. 5 right in a row: ×1.5, 10 in a row: ×2. A wrong answer costs 2 seconds.', he: '60 שניות. 5 נכונות ברצף: ×1.5, ‏10 ברצף: ×2. תשובה שגויה עולה 2 שניות.' },
  roundsRules: { en: '10 rounds, no clock. The faster you answer, the more it scores.', he: '10 סיבובים, בלי שעון. ככל שעונים מהר יותר, הניקוד גבוה יותר.' },
  round: { en: 'Round', he: 'סיבוב' },
  tenDone: { en: 'Ten rounds', he: 'עשרה סיבובים' },
  streakRules: { en: 'No clock — three lives. Every 3 right answers the cases get harder.', he: 'בלי שעון — שלושה חיים. כל 3 תשובות נכונות התיקים נעשים קשים יותר.' },
  tuningNote: { en: 'Guitar pictures use standard tuning.', he: 'תמונות הגיטרה בכיוון סטנדרטי.' },
};

const BLURB: Record<RushMode, Bi> = {
  chord: { en: 'A chord is drawn — on the keys, the staff or a guitar. Name it as fast as you can.', he: 'אקורד מצויר — על הקלידים, על החמשה או בגיטרה. תנו לו שם הכי מהר שאפשר.' },
  note: { en: 'A note on the staff. Name it — the clock is running.', he: 'תו על החמשה. מה שמו? השעון רץ.' },
  fretboard: { en: 'A note name appears. Tap a place on the neck where it lives.', he: 'מופיע שם של תו. הקישו על מקום בצוואר שבו הוא נמצא.' },
  interval: { en: 'Two notes. Which interval? Answer by ear, fast.', he: 'שני צלילים. איזה מרווח? עונים בשמיעה, מהר.' },
  keysig: { en: 'A key signature. Which key is it?', he: 'סימן היתק. איזה סולם זה?' },
  progression: { en: 'Listen to the chords and name the progression. Every case solved makes the next one harder.', he: 'הקשיבו לאקורדים וזהו את המהלך. כל תיק שנפתר מקשה את הבא.' },
  voicing: { en: 'One chord, played then broken up low to high. How is it voiced?', he: 'אקורד אחד, נשמע ואז מפורק מלמטה למעלה. איך הוא מחולק?' },
  scale: { en: 'A scale or mode, up and down. Name it.', he: 'סולם או מודוס, עולה ויורד. מה שמו?' },
  standard: { en: 'Four bars of a standard’s changes, comped by the band — no melody. Which tune?', he: 'ארבע תיבות מהמהלך של סטנדרט, בליווי הלהקה — בלי מנגינה. איזה שיר?' },
};

const tx = (b: Bi, lang: Lang) => b[lang];
const ear = (m: RushMode) => m === 'interval' || m === 'progression' || m === 'voicing' || m === 'scale' || m === 'standard';
/** Does this item sound? (engine/rush: ear games; Chord Rush keys / guitar pictures; Key Signature Rush heard rungs.) */
const hears = rushHears;

interface Feedback {
  correct: boolean;
  chosen?: string;
  /** Played Chord Rush: what the recognizer heard. */
  heard?: string;
  tap?: { str: number; fret: number };
}

export function Rush({ lang, settings, mode, saved, onSave, onExit, onResult, best, tier: tierInfo }: RushProps) {
  const title = RUSH_GAMES.find((g) => g.mode === mode)![lang][0];
  const ladder = rushLadder(mode);
  const calm = prefersCalm(settings);
  const streak = isStreak(mode);
  const rounds = isRounds(mode);
  /** Runs that save after every answer (resume after Back / reload). */
  const saving = streak || rounds;
  // The bass course drills the bass neck (its own tuning), every other course the guitar's.
  const tuningId = mode === 'fretboard' ? neckTuningOf(settings) : undefined;
  const tuning = tuningById(tuningId);
  const resumable = saving && isRushSaved(saved, mode) ? saved.state : null;

  const [stage, setStage] = useState<'setup' | 'play' | 'over'>('setup');
  // Note Rush in the bass course starts on the bass clef (level 2).
  const [startLevel, setStartLevel] = useState(mode === 'note' && settings.activeCourse === 'bass' ? 2 : 1);
  // The course's own instrument first: chords on the neck in the guitar course, on the keys in the piano course.
  const [picture, setPicture] = useState<RushPicture>(settings.activeCourse === 'guitar' ? 'neck' : settings.activeCourse === 'keys' ? 'keys' : 'mixed');
  // Played Chord Rush (guitar course): its own ladder, no level tiers.
  const played = isPlayed({ mode, picture });
  const shownLadder = played ? ladderOf({ mode, picture }) : ladder;
  const [again, setAgain] = useState(0);
  const [micErr, setMicErr] = useState(false);
  const [tier, setTier] = useState<DynName>(() => (resumable?.opts.tier && tierInfo && tierAllowed(tierInfo, resumable.opts.tier) ? resumable.opts.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [st, setSt] = useState<RushState | null>(null);
  const [item, setItem] = useState<RushItem | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [pop, setPop] = useState<{ text: string; n: number } | null>(null);
  const [burst, setBurst] = useState<{ m: number; n: number } | null>(null);
  const [lvlUp, setLvlUp] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const stRef = useRef<RushState | null>(null);
  const busy = useRef(false); // feedback showing: the clock stops, answers are ignored
  const acRef = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);
  const popN = useRef(0);
  const finished = useRef(false);
  /** When the current item appeared (rounds mode scores the answer time). */
  const shownAt = useRef(0);

  const setState = (s: RushState) => {
    stRef.current = s;
    setSt(s);
  };

  const stopAudio = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  const playStim = useCallback(async (stim: Stimulus[]) => {
    if (!stim.length) return;
    stopAudio();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
      const r = renderStimulus(stim);
      await piano.play(r.events, r.length, ac.signal);
    } catch {
      /* no audio or stopped */
    }
  }, []);
  useEffect(
    () => () => {
      stopAudio();
      timers.current.forEach((t) => clearTimeout(t));
    },
    [],
  );
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const finish = useCallback(
    (s: RushState) => {
      if (finished.current) return;
      finished.current = true;
      busy.current = true;
      stopAudio();
      setNewBest(s.score > 0 && s.score > (best ?? 0));
      if (saving) onSave(null);
      onResult(rushResult(s));
      setStage('over');
    },
    [best, onResult, onSave, saving],
  );

  const begin = (s: RushState) => {
    finished.current = false;
    busy.current = false;
    setFb(null);
    setPop(null);
    setBurst(null);
    setState(s);
    const it = currentItem(s);
    setItem(it);
    setStage('play');
    shownAt.current = performance.now();
    if (hears(mode, it) && it.kind === 'choice') void playStim(it.q.stimulus);
  };
  const tierRungs = () => {
    const rs = tierDef(`rush-${mode}`, tier)?.rungs ?? [];
    // Note Rush in the bass course: its first tier reads the bass clef.
    return mode === 'note' && settings.activeCourse === 'bass' && tier === 'pp' ? [{ topic: 'note-reading', level: 2 }] : rs;
  };
  const startNew = () =>
    begin(newRush({ mode, seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, startLevel: tierInfo && !played ? 1 : Math.min(startLevel, shownLadder.length), picture: mode === 'chord' ? picture : undefined, tuning: tuningId, ...(tierInfo && !played ? { tier, rungs: tierRungs() } : {}) }));

  // The clock (timed modes): 10 ticks a second, paused while feedback shows.
  useEffect(() => {
    if (stage !== 'play' || streak || rounds) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const s = stRef.current;
      if (!s || busy.current || s.over) return;
      const n = rushTick(s, dt);
      setState(n);
      if (n.over) finish(n);
    }, 100);
    return () => clearInterval(id);
  }, [stage, streak, rounds, finish]);

  /** Record an answer: score now, the next item after a short look at the feedback. */
  const answer = (correct: boolean, f: Feedback) => {
    const s = stRef.current;
    if (!s || !item || busy.current || s.over) return;
    busy.current = true;
    const step = rushAnswer(s, correct, item.key, performance.now() - shownAt.current);
    setState(step.state);
    setFb(f);
    popN.current++;
    if (correct) setPop({ text: `+${step.gained}`, n: popN.current });
    if (step.burst) {
      setBurst({ m: step.burst, n: popN.current });
      later(() => setBurst(null), 1000);
    }
    if (step.levelUp) {
      setLvlUp((x) => x + 1);
      later(() => setLvlUp(0), 1300);
    }
    if (saving && !step.state.over) onSave({ v: 1, game: 'rush', state: step.state });
    if (!correct && navigator.vibrate && !calm) {
      try {
        navigator.vibrate(25);
      } catch {
        /* unsupported */
      }
    }
    later(
      () => {
        if (step.state.over) return finish(step.state);
        const next = currentItem(step.state);
        setItem(next);
        setFb(null);
        busy.current = false;
        shownAt.current = performance.now();
        if (hears(mode, next) && next.kind === 'choice') void playStim(next.q.stimulus);
      },
      correct ? 320 : saving ? 1600 : 950,
    );
  };

  const choose = (c: string) => {
    if (!item || item.kind !== 'choice') return;
    answer(c === item.q.answer, { correct: c === item.q.answer, chosen: c });
  };
  // Played Chord Rush: the microphone listens while a strum item shows; an unclear strum asks again (no penalty).
  useStrums(
    stage === 'play' && item?.kind === 'strum',
    (frames) => {
      if (!item || item.kind !== 'strum' || busy.current) return;
      const v = judgeStrum(frames, item.target.chord);
      if (v.verdict === 'again') return setAgain((n) => n + 1);
      setAgain(0);
      answer(v.verdict === 'right', { correct: v.verdict === 'right', heard: v.heard });
    },
    () => setMicErr(true),
  );
  const tap = (str: number, fret: number) => {
    if (!item || item.kind !== 'fret' || busy.current) return;
    const m = noteAt(tuning, str, fret);
    void playStim([{ kind: 'note', midi: m, duration: 0.5 }]);
    const ok = gradeFret(item.target, str, fret, tuning);
    answer(ok, { correct: ok, tap: { str, fret } });
  };

  // Keyboard: 1–9 answer, Space replays the sound.
  useEffect(() => {
    if (stage !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (item?.kind === 'choice') {
        const d = /^Digit([1-9])$/.exec(e.code) ?? /^Numpad([1-9])$/.exec(e.code);
        if (d) {
          const c = item.q.choices[Number(d[1]) - 1];
          if (c) {
            e.preventDefault();
            choose(c);
          }
          return;
        }
        if (e.code === 'Space' && hears(mode, item)) {
          e.preventDefault();
          void playStim(item.q.stimulus);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exit = () => {
    stopAudio();
    onExit();
  };

  // ------------------------------------------------------------------ setup
  if (stage === 'setup') {
    return (
      <main className={`rush rush-setup ${calm ? 'calm' : ''}`}>
        <G2Head title={title} backLabel={tx(T.back, lang)} onBack={exit} />
        <section className="g2-card rush-card">
          <p>{tx(BLURB[mode], lang)}</p>
          <p className="g2-dim">{tx(streak ? T.streakRules : rounds ? T.roundsRules : T.timedRules, lang)}</p>
          {mode === 'chord' && (
            <fieldset className="rush-field">
              <legend>{tx(T.picture, lang)}</legend>
              <div className="rush-seg" role="radiogroup">
                {(['keys', 'staff', 'neck', 'mixed', ...(settings.activeCourse === 'guitar' ? ['play'] : [])] as RushPicture[]).map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={picture === p} className={`rush-opt ${picture === p ? 'on' : ''}`} onClick={() => setPicture(p)}>
                    {tx(T.pics[p], lang)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {tierInfo && !played ? (
            <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game={`rush-${mode}`} />
          ) : (
          <fieldset className="rush-field">
            <legend>{tx(T.startAt, lang)}</legend>
            <div className="rush-levels" role="radiogroup">
              {shownLadder.map((r, i) => (
                <button key={i} type="button" role="radio" aria-checked={startLevel === i + 1} className={`rush-lvl ${startLevel === i + 1 ? 'on' : ''}`} onClick={() => setStartLevel(i + 1)}>
                  <b>{i + 1}</b>
                  <span>{tx(r.name, lang)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          )}
          {best ? (
            <p className="rush-best">
              {tx(T.best, lang)}: <b>{best}</b>
            </p>
          ) : null}
          <p className="g2-dim">
            {played ? (
              tx(T.playHint, lang)
            ) : (
              <>
                {mode !== 'fretboard' && tx(T.keysHint, lang)} {ear(mode) && tx(T.earHint, lang)} {mode === 'chord' && (picture === 'neck' || picture === 'mixed') && tx(T.tuningNote, lang)}
              </>
            )}
          </p>
          <div className="g2-row">
            {resumable ? (
              <>
                <button className="btn primary" onClick={() => begin(resumable)}>
                  {tx(T.cont, lang)} · {resumable.score}
                </button>
                <button className="btn" onClick={startNew}>
                  {tx(T.newGame, lang)}
                </button>
              </>
            ) : (
              <button className="btn primary mega" onClick={startNew}>
                {tx(T.start, lang)}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  // ------------------------------------------------------------------ results
  if (stage === 'over' && st) {
    return (
      <main className={`rush rush-over ${calm ? 'calm' : ''}`}>
        <G2Head title={title} backLabel={tx(T.back, lang)} onBack={exit} />
        <section className="g2-card rush-card rush-result" aria-live="polite">
          <h2>{tx(streak ? T.caseClosed : rounds ? T.tenDone : T.timeUp, lang)}</h2>
          <p className="rush-final">
            <span>{tx(T.score, lang)}</span>
            <b>{st.score}</b>
          </p>
          {newBest ? <p className="rush-newbest">{tx(T.newBest, lang)}</p> : best ? <p className="g2-dim">{tx(T.best, lang)}: {best}</p> : null}
          <dl className="rush-stats">
            <div>
              <dt>{tx(T.right, lang)}</dt>
              <dd>{st.right}</dd>
            </div>
            <div>
              <dt>{tx(T.wrong, lang)}</dt>
              <dd>{st.wrong}</dd>
            </div>
            <div>
              <dt>{tx(T.maxCombo, lang)}</dt>
              <dd>{st.maxCombo}</dd>
            </div>
            <div>
              <dt>{tx(T.reached, lang)}</dt>
              <dd>{st.level}</dd>
            </div>
          </dl>
          <div className="g2-row">
            <button className="btn primary" onClick={startNew}>
              {tx(T.again, lang)}
            </button>
            <button className="btn ghost" onClick={exit}>
              {tx(T.back, lang)}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!st || !item) return null;

  // ------------------------------------------------------------------ play
  const mult = comboMult(st.combo);
  const frac = streak ? 1 : st.timeLeftMs / RUSH_MS;
  const R = 26;
  const C = 2 * Math.PI * R;
  const secs = Math.ceil(st.timeLeftMs / 1000);

  return (
    <main className={`rush rush-play ${calm ? 'calm' : ''} ${fb ? (fb.correct ? 'fb-ok' : 'fb-bad') : ''}`}>
      <G2Head title={title} backLabel={tx(T.back, lang)} onBack={exit} />
      <div className="rush-hud">
        {streak ? (
          <div className="rush-lives" aria-label={`${tx(T.lives, lang)}: ${st.lives}`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <span key={i} className={`breath ${i < st.lives ? 'on' : 'off'}`} aria-hidden="true">
                ,
              </span>
            ))}
          </div>
        ) : rounds ? (
          <div className="rush-score rush-rounds" aria-label={`${tx(T.round, lang)} ${Math.min(ROUNDS, st.i + 1)}/${ROUNDS}`}>
            <small>{tx(T.round, lang)}</small>
            <b dir="ltr">
              {Math.min(ROUNDS, st.i + 1)}/{ROUNDS}
            </b>
          </div>
        ) : (
          <div className={`rush-clock ${secs <= 10 ? 'low' : ''}`} role="timer" aria-label={`${tx(T.time, lang)}: ${secs}`}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r={R} className="track" />
              <circle cx="32" cy="32" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 32 32)" />
            </svg>
            <b>{secs}</b>
          </div>
        )}
        <div className="rush-score">
          <small>{tx(T.score, lang)}</small>
          <b>{st.score}</b>
        </div>
        <div className={`rush-combo ${mult > 1 ? `x${mult === 2 ? 2 : 15}` : ''}`}>
          <small>{tx(T.combo, lang)}</small>
          <b>
            {st.combo}
            {mult > 1 && <em> ×{mult}</em>}
          </b>
        </div>
        <div className="rush-level">
          <small>{tx(T.level, lang)}</small>
          <b>{st.level}</b>
        </div>
      </div>

      <section className="rush-stage">
        {pop && fb?.correct && (
          <span key={pop.n} className="rush-pop" aria-hidden="true">
            {pop.text}
          </span>
        )}
        {burst && (
          <span key={`b${burst.n}`} className="rush-burst" aria-hidden="true">
            {tx(T.combo, lang)} ×{burst.m}!
          </span>
        )}
        {lvlUp > 0 && (
          <span key={`l${lvlUp}`} className="rush-lvlup" role="status">
            {tx(T.levelUp, lang)}
          </span>
        )}
        {item.kind === 'choice' ? <ChoicePrompt item={item} mode={mode} lang={lang} settings={settings} onReplay={() => void playStim(item.q.stimulus)} /> : item.kind === 'strum' ? <StrumPrompt item={item} lang={lang} settings={settings} fb={fb} again={again} micErr={micErr} /> : <FretPrompt item={item} lang={lang} />}
      </section>

      {item.kind === 'choice' ? (
        <div className={`rush-answers n${item.q.choices.length}`}>
          {item.q.choices.map((c, i) => {
            const n = item.q.names[c];
            const cls = fb ? (c === item.q.answer ? 'ok' : c === fb.chosen ? 'bad' : 'dim') : '';
            return (
              <button key={c} type="button" className={`rush-ans ${cls}`} disabled={!!fb} onClick={() => choose(c)}>
                <kbd aria-hidden="true">{i + 1}</kbd>
                {mode === 'chord' ? (
                  <span className="sym" dir="ltr">
                    {n.en}
                    {lang === 'he' && <small dir="rtl">{n.he}</small>}
                  </span>
                ) : (
                  <span>{n[lang]}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : item.kind === 'strum' ? (
        <div className="rush-strum-actions">
          <button type="button" className="btn small ghost" disabled={!!fb} onClick={() => answer(false, { correct: false })}>
            {tx(T.skip, lang)}
          </button>
        </div>
      ) : (
        <FretBoard item={item} fb={fb} settings={settings} onTap={tap} lang={lang} />
      )}

      <p className="rush-live" aria-live="assertive">
        {fb ? (fb.correct ? tx(T.rightFb, lang) : item.kind === 'choice' ? `${tx(T.answerWas, lang)} ${item.q.names[item.q.answer][lang]}` : item.kind === 'strum' ? (fb.heard ? `${tx(T.heard, lang)}: ${fb.heard}` : '') : `${tx(T.answerWas, lang)} ${tx(item.target.name, lang)}`) : ''}
      </p>
    </main>
  );
}

// ------------------------------------------------------------------ prompts

function ChoicePrompt({ item, mode, lang, settings, onReplay }: { item: Extract<RushItem, { kind: 'choice' }>; mode: RushMode; lang: Lang; settings: Settings; onReplay: () => void }) {
  const q = item.q;
  return (
    <>
      <p className="rush-ask">{q.ask[lang]}</p>
      {q.text && (
        <p className="rush-text" dir="ltr">
          {q.text[lang]}
        </p>
      )}
      <div className="rush-pic" dir="ltr">
        {q.show && <NoteStaff notes={q.show.midis} chord={!!q.show.chord} keyPc={q.show.key ?? null} clef={q.show.clef ?? 'treble'} />}
        {/* chord-read guitar pictures are built in standard tuning */}
        {q.diagram && <DiagramView d={q.diagram} settings={mode === 'chord' ? { ...settings, tuning: 'standard' } : settings} />}
      </div>
      {hears(mode, item) && (
        <button type="button" className="btn rush-replay" onClick={onReplay}>
          <span aria-hidden="true">▶</span> {T.play[lang]}
        </button>
      )}
    </>
  );
}

function StrumPrompt({ item, lang, settings, fb, again, micErr }: { item: Extract<RushItem, { kind: 'strum' }>; lang: Lang; settings: Settings; fb: Feedback | null; again: number; micErr: boolean }) {
  const t = item.target;
  const miss = !!fb && !fb.correct;
  return (
    <>
      <p className="rush-ask">{T.strumIt[lang]}</p>
      <p className="rush-target">
        <b dir="ltr">{t.symbol}</b>
        <small>{t.name[lang]}</small>
      </p>
      {miss && t.shape ? (
        <div className="rush-pic" dir="ltr">
          <DiagramView d={{ kind: 'box', instrument: 'guitar', ...t.shape.box, frets: 4 }} settings={{ ...settings, tuning: 'standard' }} />
        </div>
      ) : (
        <p className={`rush-listen ${again ? 'again' : ''}`} role="status" key={again}>
          {micErr ? (
            T.micOff[lang]
          ) : again ? (
            T.strumAgain[lang]
          ) : (
            <>
              <span className="rush-mic-dot" aria-hidden="true" /> {T.listening[lang]}
            </>
          )}
        </p>
      )}
    </>
  );
}

function FretPrompt({ item, lang }: { item: Extract<RushItem, { kind: 'fret' }>; lang: Lang }) {
  const t = item.target;
  const ss = [...t.strings].sort((a, b) => a - b);
  const range = ss.length === 1 ? `${T.onString[lang]} ${ss[0]}` : `${T.onStrings[lang]} ${ss[0]}–${ss[ss.length - 1]}`;
  return (
    <>
      <p className="rush-ask">{T.find[lang]}</p>
      <p className="rush-target">
        <b dir="ltr">{t.name.en}</b>
        {lang === 'he' && <small>{t.name.he}</small>}
      </p>
      <p className="g2-dim">{range}</p>
    </>
  );
}

function FretBoard({ item, fb, settings, onTap, lang }: { item: Extract<RushItem, { kind: 'fret' }>; fb: Feedback | null; settings: Settings; onTap: (s: number, f: number) => void; lang: Lang }) {
  const tuning = tuningById(neckTuningOf(settings));
  const t = item.target;
  const dots: NeckDot[] = [];
  if (fb?.tap) dots.push({ ...fb.tap, tone: fb.correct ? 'ok' : 'wrong' });
  if (fb && !fb.correct) for (const p of fretAnswers(t, tuning)) dots.push({ ...p, tone: 'answer' });
  return (
    <div className="rush-neck">
      <Neck tuning={tuning} lo={t.frets[0]} hi={t.frets[1]} dots={dots} strings={t.strings} leftHanded={settings.leftHanded} onTap={fb ? undefined : onTap} label={`${T.find[lang]} ${t.name[lang]}`} />
    </div>
  );
}
