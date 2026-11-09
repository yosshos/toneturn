// Tune-up (spec AE §8, R7): a string is out of tune; the in-tune reference sounds together with it so the
// beats are audible. Turn the peg (drag, or the slider / arrow keys) until the beats vanish.

import { TuneUpArt } from './GameArt';
import { useEffect, useMemo, useRef, useState } from 'react';
import { centsLeft, isTuneUpSave, makeRounds, MAX_SCORE, midiHz, PEG_RANGE, ROUNDS, roundPoints, stringNamesOf, toneHz, type TuneInst, type TuneRound, type TuneUpSave } from '../engine/tuneUp';
import { G2Head, prefersCalm, type Game2Props } from './Flight';
import { piano } from './services';

const TEXT = {
  en: {
    title: 'Tune-up',
    blurb: 'One guitar string is out of tune. It rings together with an in-tune reference — listen for the wobble (beats). Turn the peg until the wobble disappears.',
    headphones: 'Speakers or headphones at a comfortable volume.',
    start: 'Start',
    cont: (n: number) => `Continue — round ${n} of ${ROUNDS}`,
    newGame: 'New game',
    round: 'Round',
    string: (s: number, n: string) => `String ${s} (${n})`,
    refFret: (s: number, f: number) => (f ? `against string ${s} at fret ${f}` : `fretted at 5, against open string ${s}`),
    refHarm: (s: number) => `harmonics: 5th fret on string ${s}, 7th fret on this one`,
    peg: 'Tuning peg',
    pluck: 'Pluck again',
    done: 'In tune',
    left: 'Off by',
    sharp: 'sharp',
    flat: 'flat',
    perfect: 'Perfect!',
    pts: 'points',
    next: 'Next string',
    over: 'All strings done',
    again: 'Play again',
    back: 'Back',
    tuner: 'Now tune your real guitar',
    blurbBass: 'One bass string is out of tune. It rings together with an in-tune reference — listen for the wobble (beats). Turn the peg until the wobble disappears.',
    tunerBass: 'Now tune your real bass',
    best: 'Best',
    dragHint: 'Drag the peg sideways, or use the slider.',
  },
  he: {
    title: 'כיוון',
    blurb: 'מיתר אחד בגיטרה לא מכוון. הוא מצלצל יחד עם מיתר ייחוס מכוון — הקשיבו לרעידה (פעימות). סובבו את המפתח עד שהרעידה נעלמת.',
    headphones: 'רמקולים או אוזניות בעוצמה נוחה.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך — סיבוב ${n} מתוך ${ROUNDS}`,
    newGame: 'משחק חדש',
    round: 'סיבוב',
    string: (s: number, n: string) => `מיתר ${s} (${n})`,
    refFret: (s: number, f: number) => (f ? `מול מיתר ${s} בשריג ${f}` : `לחוץ בשריג 5, מול מיתר ${s} פתוח`),
    refHarm: (s: number) => `הרמוניקים: שריג 5 במיתר ${s}, שריג 7 במיתר הזה`,
    peg: 'מפתח כיוון',
    pluck: 'לפרוט שוב',
    done: 'מכוון',
    left: 'סטייה',
    sharp: 'גבוה',
    flat: 'נמוך',
    perfect: 'מושלם!',
    pts: 'נקודות',
    next: 'המיתר הבא',
    over: 'כל המיתרים כוונו',
    again: 'לשחק שוב',
    back: 'חזרה',
    tuner: 'עכשיו כוונו את הגיטרה האמיתית',
    blurbBass: 'מיתר אחד בבס לא מכוון. הוא מצלצל יחד עם מיתר ייחוס מכוון — הקשיבו לרעידה (פעימות). סובבו את המפתח עד שהרעידה נעלמת.',
    tunerBass: 'עכשיו כוונו את הבס האמיתי',
    best: 'שיא',
    dragHint: 'גררו את המפתח הצידה, או השתמשו במחוון.',
  },
};

type Phase = 'intro' | 'tune' | 'feedback' | 'over';

/** Two sustained string-like voices (reference + detuned string) on the shared AudioContext. */
class StringPair {
  private nodes: { osc: OscillatorNode[]; gain: GainNode }[] = [];
  private tone: OscillatorNode[] = [];
  private master: GainNode | null = null;
  constructor(private ctx: AudioContext) {}

  start(refHz: number, hz: number, harmonic: boolean) {
    this.stop();
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    this.master = master;
    const voice = (f: number) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = harmonic ? 4000 : 2200;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1, now + 0.006);
      g.gain.setTargetAtTime(harmonic ? 0.55 : 0.4, now + 0.01, 0.5); // rings on (a long sustain keeps the beats audible)
      const parts: [OscillatorType, number, number][] = harmonic ? [['sine', 1, 0.9], ['sine', 2, 0.08]] : [['sawtooth', 1, 0.35], ['sine', 1, 0.6], ['sine', 2, 0.15]];
      const osc = parts.map(([type, mult, amp]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * mult;
        const a = ctx.createGain();
        a.gain.value = amp;
        o.connect(a).connect(lp);
        o.start();
        return o;
      });
      lp.connect(g).connect(master);
      this.nodes.push({ osc, gain: g });
      return osc;
    };
    voice(refHz);
    this.tone = voice(hz);
  }

  /** Move the detuned string (smoothly, so dragging doesn't click). */
  setTone(hz: number) {
    const now = this.ctx.currentTime;
    this.tone.forEach((o, i) => o.frequency.setTargetAtTime(hz * (i === 2 ? 2 : 1), now, 0.03));
  }

  stop() {
    const now = this.ctx.currentTime;
    if (this.master) {
      this.master.gain.setTargetAtTime(0, now, 0.05);
      const m = this.master;
      setTimeout(() => m.disconnect(), 400);
    }
    for (const n of this.nodes) n.osc.forEach((o) => o.stop(now + 0.35));
    this.nodes = [];
    this.tone = [];
    this.master = null;
  }
}

export function TuneUp({ lang, settings, saved, onSave, onExit, onResult, best }: Game2Props) {
  const tx = TEXT[lang];
  const calm = prefersCalm(settings);
  const sv = isTuneUpSave(saved) && saved.round < ROUNDS ? saved : null;
  const [phase, setPhase] = useState<Phase>('intro');
  const [game, setGame] = useState<TuneUpSave | null>(null);
  const [peg, setPeg] = useState(0);
  const [last, setLast] = useState<{ cents: number; points: number } | null>(null);
  const pair = useRef<StringPair | null>(null);
  // Final bass check: the bass course tunes the four bass strings.
  const inst: TuneInst = settings.activeCourse === 'bass' ? 'bass' : 'guitar';
  const rounds = useMemo(() => (game ? makeRounds(game.seed, undefined, inst) : []), [game?.seed, inst]);
  const shownIdx = game ? (phase === 'feedback' || phase === 'over' ? game.round - 1 : game.round) : 0;
  const round: TuneRound | undefined = rounds[shownIdx];

  const ringOff = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silence = () => {
    if (ringOff.current) clearTimeout(ringOff.current);
    ringOff.current = null;
    pair.current?.stop();
  };
  useEffect(() => silence, []);

  const sound = async (r: TuneRound, p: number) => {
    if (ringOff.current) clearTimeout(ringOff.current);
    ringOff.current = null;
    await piano.unlock();
    const ctx = piano.context;
    if (!ctx) return;
    pair.current ??= new StringPair(ctx);
    pair.current.start(midiHz(r.refMidi), toneHz(r, p), r.kind === 'harmonic');
  };

  useEffect(() => {
    if (phase === 'tune' && round) void sound(round, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.round, game?.seed]);

  const turn = (p: number) => {
    const v = Math.max(-PEG_RANGE, Math.min(PEG_RANGE, Math.round(p * 2) / 2));
    setPeg(v);
    if (round) pair.current?.setTone(toneHz(round, v));
  };

  const begin = (resume: boolean) => {
    const g: TuneUpSave = resume && sv ? sv : { v: 1, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, round: 0, score: 0, errors: [] };
    setGame(g);
    onSave(g);
    setPeg(0);
    setLast(null);
    setPhase('tune');
  };

  const submit = () => {
    if (!game || !round) return;
    const cents = centsLeft(round, peg);
    const points = roundPoints(cents);
    const g: TuneUpSave = { ...game, round: game.round + 1, score: game.score + points, errors: [...game.errors, cents] };
    setLast({ cents, points });
    setGame(g);
    // Let the result ring on for a moment so the player hears the (lack of) beats, then stop.
    ringOff.current = setTimeout(silence, 900);
    if (g.round >= ROUNDS) {
      onSave(null);
      const mean = g.errors.reduce((a, c) => a + Math.abs(c), 0) / g.errors.length;
      onResult({ game: 'tune-up', score: g.score, detail: { errors: g.errors, meanCents: Math.round(mean * 10) / 10, max: MAX_SCORE } });
    } else onSave(g);
    setPhase('feedback');
  };

  const next = () => {
    if (!game) return;
    setPeg(0);
    setLast(null);
    setPhase(game.round >= ROUNDS ? 'over' : 'tune');
  };

  // Drag the peg sideways: 1 px ≈ ¼ cent (drag towards the end of the line = sharper, in both directions of reading).
  const drag = useRef<{ x: number; peg: number } | null>(null);

  return (
    <main className={`panel-screen g2 g2-tuneup ${calm ? 'g2-calm' : ''}`} data-game="tune-up" data-phase={phase}>
      <G2Head
        title={tx.title}
        backLabel={tx.back}
        onBack={() => {
          silence();
          onExit();
        }}
      >
        {game && phase !== 'intro' && (
          <span className="g2-hud-mini">
            <b dir="ltr">{game.score}</b>
          </span>
        )}
      </G2Head>

      {phase === 'intro' && (
        <section className="g2-card">
          <TuneUpArt />
          <p>{inst === 'bass' ? tx.blurbBass : tx.blurb}</p>
          <p className="g2-dim">{tx.headphones}</p>
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {sv ? (
            <div className="g2-col">
              <button className="btn primary mega" data-resume-tuneup onClick={() => begin(true)}>
                {tx.cont(sv.round + 1)}
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

      {(phase === 'tune' || phase === 'feedback') && game && round && (
        <section className="g2-card g2-tunecard">
          <ol className="g2-dots" aria-label={`${tx.round} ${shownIdx + 1} / ${ROUNDS}`}>
            {Array.from({ length: ROUNDS }, (_, i) => {
              const e = game.errors[i];
              return <li key={i} className={e !== undefined ? (roundPoints(e) >= 60 ? 'ok' : 'bad') : i === shownIdx ? 'now' : ''} />;
            })}
          </ol>
          <p className="g2-lead">
            {tx.string(round.string, stringNamesOf(inst)[round.string - 1])}
            <br />
            <small className="g2-dim">{round.kind === 'harmonic' ? tx.refHarm(round.refString) : tx.refFret(round.refString, round.refFret)}</small>
          </p>

          <div
            className="g2-peg-wrap"
            dir="ltr"
            onPointerDown={(e) => {
              if (phase !== 'tune') return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, peg };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              turn(drag.current.peg + (e.clientX - drag.current.x) * 0.25);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <svg className="g2-peg" viewBox="-60 -60 120 120" aria-hidden="true" style={{ transform: `rotate(${peg * 3}deg)` }}>
              <circle r="30" className="g2-peg-post" />
              <rect x="-50" y="-14" width="100" height="28" rx="14" className="g2-peg-key" />
              <circle r="8" className="g2-peg-dot" />
            </svg>
          </div>
          <input
            type="range"
            className="g2-slider"
            dir="ltr"
            min={-PEG_RANGE}
            max={PEG_RANGE}
            step={0.5}
            value={peg}
            disabled={phase !== 'tune'}
            aria-label={tx.peg}
            onChange={(e) => turn(Number(e.target.value))}
          />
          <p className="g2-dim">{tx.dragHint}</p>

          {phase === 'tune' ? (
            <div className="g2-row">
              <button className="btn" onClick={() => void sound(round, peg)}>
                ♪ {tx.pluck}
              </button>
              <button className="btn mega" onClick={submit}>
                ✓ {tx.done}
              </button>
            </div>
          ) : (
            last && (
              <>
                <p className={`g2-big ${Math.abs(last.cents) <= 3 ? 'good' : Math.abs(last.cents) <= 10 ? 'ok' : 'off'}`}>
                  {Math.abs(last.cents) <= 1 ? (
                    tx.perfect
                  ) : (
                    <>
                      <small>{tx.left}</small> <span dir="ltr">{Math.abs(last.cents)}¢</span> <small>{last.cents > 0 ? tx.sharp : tx.flat}</small>
                    </>
                  )}
                </p>
                <p>
                  <b dir="ltr">+{last.points}</b> {tx.pts}
                </p>
                <button className="btn mega" onClick={next}>
                  {tx.next} <span className="flip-rtl">→</span>
                </button>
              </>
            )
          )}
        </section>
      )}

      {phase === 'over' && game && (
        <section className="g2-card g2-over">
          <h2>{tx.over}</h2>
          <p className="g2-big" dir="ltr">
            {game.score}
            <small> / {MAX_SCORE}</small>
          </p>
          <ul className="g2-stats" dir="ltr">
            {game.errors.map((c, i) => (
              <li key={i}>
                {i + 1}: {c > 0 ? '+' : ''}
                {c}¢
              </li>
            ))}
          </ul>
          <button className="btn primary mega" onClick={() => begin(false)}>
            {tx.again}
          </button>
          <a className="btn" href="#/tuner">
            {inst === 'bass' ? tx.tunerBass : tx.tuner}
          </a>
          <button className="btn ghost" onClick={onExit}>
            {tx.back}
          </button>
        </section>
      )}
    </main>
  );
}
