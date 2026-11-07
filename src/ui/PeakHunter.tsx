// Peak Hunter: A is the flat sound, B has one band boosted (loudness-matched, R1). Find the boost on a log slider.
// Honest by design: the player only ever hears A and B — no sweep tone, no audition of the slider.
// The slider runs low → high, left → right in both languages; only the chrome mirrors in Hebrew.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { renderFx } from '../audio/fx';
import type { FxSpec } from '../engine/fx';
import {
  answer,
  boostSpec,
  flatSpec,
  formatHz,
  hzAt,
  isBest,
  isPeakSave,
  makeRounds,
  meanOctavesOf,
  newSave,
  PEAK_MAX_POINTS,
  PEAK_ROUNDS,
  posOf,
  roundNeedsHeadphones,
  snapHz,
  stepHz,
  totalOf,
  type PeakAnswer,
  type PeakLevel,
  type PeakSave,
} from '../engine/peakHunter';
import type { Settings } from '../storage/progress';
import { G2Head, prefersCalm } from './Flight';
import { piano } from './services';

export interface PeakHunterResult {
  game: 'peakhunter';
  score: number;
  detail: { rounds: number; meanOctaves: number; level: PeakLevel };
}
export interface PeakHunterProps {
  lang: 'he' | 'en';
  settings: Settings;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: PeakHunterResult) => void;
  best?: number;
}

const TEXT = {
  en: {
    title: 'Peak Hunter',
    blurb: 'A is the plain sound. B has one frequency band boosted — at the same loudness. Find the boost on the slider: the closer, the more points.',
    level: 'Level',
    levels: { 1: 'Octave bands', 2: 'Third-octave bands', 3: 'Free · subtle · music' } as Record<PeakLevel, string>,
    start: 'Start',
    cont: (n: number) => `Continue from round ${n}`,
    newGame: 'New game',
    back: 'Back',
    round: 'Round',
    score: 'Score',
    a: 'A · flat',
    b: 'B · boosted',
    stop: 'Stop',
    slider: 'Boosted frequency',
    submit: 'Lock it in',
    next: 'Next round',
    finish: 'See results',
    yours: 'Yours',
    truth: 'Boost',
    off: (o: number) => (o < 0.01 ? 'Spot on!' : `${o.toFixed(2)} octave${Math.abs(o - 1) < 0.005 ? '' : 's'} away`),
    pts: 'pts',
    phones: 'This boost is low — use headphones; phone speakers can’t play it.',
    listen: 'Listen to A and B as often as you like.',
    over: 'Results',
    mean: 'Average miss',
    oct: 'oct',
    best: 'Best',
    newBest: 'New personal best!',
    again: 'Play again',
    loading: 'Preparing the sound…',
  },
  he: {
    title: 'צייד הפיקים',
    blurb: 'A הוא הצליל הנקי. ב-B פס תדרים אחד מוגבר — באותה עוצמה. מצאו את ההגברה על הסליידר: ככל שקרוב יותר, יותר נקודות.',
    level: 'שלב',
    levels: { 1: 'פסי אוקטבה', 2: 'פסי שליש אוקטבה', 3: 'חופשי · עדין · מוזיקה' } as Record<PeakLevel, string>,
    start: 'להתחיל',
    cont: (n: number) => `להמשיך מסיבוב ${n}`,
    newGame: 'משחק חדש',
    back: 'חזרה',
    round: 'סיבוב',
    score: 'ניקוד',
    a: 'A · נקי',
    b: 'B · מוגבר',
    stop: 'עצירה',
    slider: 'התדר המוגבר',
    submit: 'זהו, לנעול',
    next: 'לסיבוב הבא',
    finish: 'לתוצאות',
    yours: 'שלכם',
    truth: 'ההגברה',
    off: (o: number) => (o < 0.01 ? 'בול!' : `במרחק ${o.toFixed(2)} אוקטבות`),
    pts: 'נק׳',
    phones: 'ההגברה הזאת נמוכה — כדאי אוזניות; רמקול של טלפון לא מנגן אותה.',
    listen: 'אפשר להקשיב ל-A ול-B כמה שרוצים.',
    over: 'תוצאות',
    mean: 'החטאה ממוצעת',
    oct: 'אוק׳',
    best: 'שיא',
    newBest: 'שיא אישי חדש!',
    again: 'לשחק שוב',
    loading: 'מכינים את הצליל…',
  },
};

const TICKS = [100, 200, 500, 1000, 2000, 5000, 10000];
const SLIDER_STEPS = 1000;
/** Position on the rail (0…1) as a CSS variable; peak.css lines it up with the range thumb's centre. */
const at = (p: number): CSSProperties => ({ ['--p' as string]: p }) as CSSProperties;

type Phase = 'setup' | 'guess' | 'reveal' | 'over';

export function PeakHunter({ lang, settings, saved, onSave, onExit, onResult, best }: PeakHunterProps) {
  const tx = TEXT[lang];
  const calm = prefersCalm(settings);
  const resumable = isPeakSave(saved) ? saved : null;

  const [phase, setPhase] = useState<Phase>('setup');
  const [level, setLevel] = useState<PeakLevel>(resumable?.level ?? 1);
  const [game, setGame] = useState<PeakSave | null>(null);
  const [guess, setGuess] = useState(1000);
  const [last, setLast] = useState<PeakAnswer | null>(null);
  const [playing, setPlaying] = useState<'a' | 'b' | null>(null);
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState<{ score: number; mean: number; answers: PeakAnswer[]; record: boolean } | null>(null);
  const ctl = useRef<AbortController | null>(null);

  const rounds = useMemo(() => (game ? makeRounds(game.seed, game.level) : []), [game?.seed, game?.level]);
  /** Index of the round on screen (in reveal: the one just answered). */
  const idx = game ? (phase === 'reveal' ? game.answers.length - 1 : game.answers.length) : 0;
  const round = rounds[idx];
  const specs = useMemo(() => (round ? { a: flatSpec(round), b: boostSpec(round) } : null), [round]);

  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setPlaying(null);
    setBusy(false);
  };
  useEffect(() => stop, []);

  // Render both sounds ahead (cached by audio/fx.ts) so A/B switch instantly.
  useEffect(() => {
    if (!specs) return;
    void renderFx(specs.a).catch(() => {});
    void renderFx(specs.b).catch(() => {});
  }, [specs]);

  const play = async (which: 'a' | 'b') => {
    if (!specs) return;
    if (playing === which) return stop();
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setPlaying(which);
    setBusy(true);
    const spec: FxSpec = specs[which];
    try {
      await piano.unlock();
      const p = piano.play([{ midi: 0, start: 0, duration: spec.seconds, velocity: 0, fx: spec }], spec.seconds, c.signal);
      // Rendering is done once playback is scheduled; the promise resolves when the sound ends.
      void renderFx(spec).then(() => ctl.current === c && setBusy(false), () => {});
      await p;
    } catch {
      /* aborted or audio unavailable */
    }
    if (ctl.current === c) {
      ctl.current = null;
      setPlaying(null);
      setBusy(false);
    }
  };

  const begin = (resume: boolean) => {
    stop();
    const g = resume && resumable ? resumable : newSave((Date.now() ^ (Math.random() * 1e9)) >>> 0, level);
    setGame(g);
    setLevel(g.level);
    setGuess(snapHz(1000, g.level));
    setLast(null);
    setFinal(null);
    onSave(g);
    setPhase('guess');
  };

  const submit = () => {
    if (!game || phase !== 'guess') return;
    stop();
    const r = answer(game, rounds, guess);
    setGame(r.save);
    setLast(r.result);
    setGuess(r.result.guess);
    if (r.save.answers.length < PEAK_ROUNDS) onSave(r.save);
    setPhase('reveal');
  };

  const next = () => {
    if (!game) return;
    stop();
    if (game.answers.length >= PEAK_ROUNDS) {
      const score = totalOf(game.answers);
      const mean = meanOctavesOf(game.answers);
      setFinal({ score, mean, answers: game.answers, record: isBest(score, best) });
      onSave(null);
      onResult({ game: 'peakhunter', score, detail: { rounds: game.answers.length, meanOctaves: mean, level: game.level } });
      setPhase('over');
      return;
    }
    setGuess(snapHz(1000, game.level));
    setLast(null);
    setPhase('guess');
  };

  const onSlider = (v: number) => {
    if (!game || phase !== 'guess') return;
    setGuess(snapHz(hzAt(v / SLIDER_STEPS), game.level));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!game || phase !== 'guess') return;
    const k = e.key;
    let g: number | null = null;
    if (k === 'ArrowRight' || k === 'ArrowUp') g = stepHz(guess, game.level, 1);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') g = stepHz(guess, game.level, -1);
    else if (k === 'PageUp') g = stepHz(guess, game.level, 1, true);
    else if (k === 'PageDown') g = stepHz(guess, game.level, -1, true);
    else if (k === 'Home') g = snapHz(0, game.level);
    else if (k === 'End') g = snapHz(Infinity, game.level);
    else if (k === 'Enter') {
      e.preventDefault();
      return submit();
    }
    if (g !== null) {
      e.preventDefault();
      setGuess(g);
    }
  };

  const back = () => {
    stop();
    onExit();
  };

  const scoreSoFar = game ? totalOf(game.answers) : 0;
  const phones = round ? roundNeedsHeadphones(round) : false;
  const cls = (p: number) => (p >= PEAK_MAX_POINTS ? 'good' : p > 0 ? 'ok' : 'off');

  return (
    <main className={`panel-screen g2 ph ${calm ? 'g2-calm ph-calm' : ''}`} data-game="peakhunter" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        {(phase === 'guess' || phase === 'reveal') && (
          <span className="g2-hud-mini" dir="ltr">
            {idx + 1}/{PEAK_ROUNDS}
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
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn mega" data-resume-peak onClick={() => begin(true)}>
                ▶ {tx.cont(resumable.answers.length + 1)}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx.newGame}
              </button>
            </div>
          ) : (
            <button className="btn mega" onClick={() => begin(false)}>
              ▶ {tx.start}
            </button>
          )}
        </section>
      )}

      {(phase === 'guess' || phase === 'reveal') && game && round && (
        <>
          <div className="g2-hud" aria-live="polite">
            <span>
              <small>{tx.round}</small> <b dir="ltr">{idx + 1}</b>
            </span>
            <span>
              <small>{tx.score}</small> <b dir="ltr">{scoreSoFar}</b>
            </span>
            <span>
              <small>{tx.level}</small> <b dir="ltr">{game.level}</b>
            </span>
          </div>

          <section className="g2-card ph-card">
            <div className="ph-ab" role="group" aria-label="A / B">
              {(['a', 'b'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`btn ph-ab-btn ph-${w} ${playing === w ? 'on' : ''}`}
                  aria-pressed={playing === w}
                  data-peak-play={w}
                  onClick={() => void play(w)}
                >
                  <span className="ph-ab-icon" aria-hidden>
                    {playing === w ? '■' : '▶'}
                  </span>
                  <span>{w === 'a' ? tx.a : tx.b}</span>
                </button>
              ))}
            </div>
            <p className="g2-dim" aria-live="polite">
              {busy ? tx.loading : tx.listen}
            </p>
            {phones && (
              <p className="ph-phones" role="note">
                🎧 {tx.phones}
              </p>
            )}

            <div className="ph-slider" dir="ltr">
              <output className="ph-readout" htmlFor="ph-range" aria-live="polite">
                {formatHz(guess)}
              </output>
              <div className="ph-track-wrap">
                <input
                  id="ph-range"
                  className="ph-range"
                  type="range"
                  min={0}
                  max={SLIDER_STEPS}
                  step={1}
                  value={Math.round(posOf(guess) * SLIDER_STEPS)}
                  aria-label={tx.slider}
                  aria-valuetext={formatHz(guess)}
                  disabled={phase !== 'guess'}
                  onChange={(e) => onSlider(+e.target.value)}
                  onKeyDown={onKey}
                  data-peak-slider
                />
                {phase === 'reveal' && last && (
                  <>
                    <span className={`ph-mark ph-truth ${calm ? '' : 'ph-pop'}`} style={at(posOf(round.freq))} data-peak-truth={round.freq}>
                      <span className="ph-mark-label">
                        {tx.truth} {formatHz(round.freq)}
                      </span>
                    </span>
                    <span className="ph-mark ph-guess" style={at(posOf(last.guess))}>
                      <span className="ph-mark-label">{tx.yours}</span>
                    </span>
                    <span
                      className="ph-gap"
                      style={{ ...at(Math.min(posOf(round.freq), posOf(last.guess))), ['--w' as string]: Math.abs(posOf(round.freq) - posOf(last.guess)) } as CSSProperties}
                    />
                  </>
                )}
              </div>
              <div className="ph-ticks" aria-hidden>
                {TICKS.map((t) => (
                  <span key={t} style={at(posOf(t))}>
                    {formatHz(t).replace(' Hz', '').replace(' kHz', 'k')}
                  </span>
                ))}
              </div>
            </div>

            {phase === 'guess' ? (
              <button className="btn mega" data-peak-submit onClick={submit}>
                {tx.submit}
              </button>
            ) : (
              last && (
                <div className="ph-result" role="status">
                  <p className={`g2-big ${cls(last.points)}`} dir="ltr">
                    +{last.points} <small>{tx.pts}</small>
                  </p>
                  <p className="g2-dim">
                    <span dir="ltr">{formatHz(last.guess)}</span> → <span dir="ltr">{formatHz(round.freq)}</span> · {tx.off(last.octaves)}
                  </p>
                  <button className="btn mega" data-peak-next onClick={next} autoFocus>
                    {game.answers.length >= PEAK_ROUNDS ? tx.finish : tx.next}
                  </button>
                </div>
              )
            )}
          </section>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card g2-over">
          <h2>{tx.over}</h2>
          <p className="g2-big" dir="ltr">
            {final.score}
            <small> / {PEAK_ROUNDS * PEAK_MAX_POINTS}</small>
          </p>
          {final.record && <p className={`g2-best ${calm ? '' : 'ph-pop'}`}>{tx.newBest}</p>}
          <ul className="g2-stats">
            <li>
              {tx.mean}:{' '}
              <b dir="ltr">
                {final.mean.toFixed(2)} {tx.oct}
              </b>
            </li>
            {!!best && !final.record && (
              <li>
                {tx.best}: <b dir="ltr">{best}</b>
              </li>
            )}
          </ul>
          <ol className="ph-rounds" dir="ltr">
            {final.answers.map((a, i) => (
              <li key={i} className={cls(a.points)} title={formatHz(a.guess)}>
                {a.points}
              </li>
            ))}
          </ol>
          <button className="btn mega" onClick={() => begin(false)}>
            ↻ {tx.again}
          </button>
          <button className="btn ghost" onClick={back}>
            {tx.back}
          </button>
        </section>
      )}
    </main>
  );
}
