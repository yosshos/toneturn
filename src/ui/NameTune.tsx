// Name That Tune (spec AE §8): hear the opening of a known song, pick the title among 4. Faster = more points.

import { useEffect, useMemo, useRef, useState } from 'react';
import { isTuneSave, makeRounds, MAX_SCORE, ROUNDS, roundPoints, songEvents, type TuneSave } from '../engine/nameTune';
import { songById, SONGS } from '../engine/songs';
import { G2Head, type Game2Props } from './Flight';
import { piano } from './services';

const TEXT = {
  en: {
    title: 'Name That Tune',
    blurb: 'Hear the opening of a well-known tune and pick its name. The faster you answer, the more points.',
    start: 'Start',
    cont: (n: number) => `Continue — round ${n} of ${ROUNDS}`,
    newGame: 'New game',
    round: 'Round',
    score: 'Score',
    replay: 'Play again',
    listen: 'Listen…',
    which: 'Which tune is it?',
    right: 'Right!',
    wrong: 'It was',
    pts: 'points',
    next: 'Next',
    over: 'Game over',
    again: 'Play again',
    back: 'Back',
    best: 'Best',
    newBest: 'New best!',
  },
  he: {
    title: 'נחשו את השיר',
    blurb: 'שמעו את הפתיחה של שיר מוכר ובחרו את שמו. ככל שעונים מהר יותר — יותר נקודות.',
    start: 'להתחיל',
    cont: (n: number) => `להמשיך — סיבוב ${n} מתוך ${ROUNDS}`,
    newGame: 'משחק חדש',
    round: 'סיבוב',
    score: 'ניקוד',
    replay: 'לנגן שוב',
    listen: 'הקשיבו…',
    which: 'איזה שיר זה?',
    right: 'נכון!',
    wrong: 'זה היה',
    pts: 'נקודות',
    next: 'הבא',
    over: 'המשחק נגמר',
    again: 'לשחק שוב',
    back: 'חזרה',
    best: 'שיא',
    newBest: 'שיא חדש!',
  },
};

type Phase = 'intro' | 'ask' | 'feedback' | 'over';

export function NameTune({ lang, saved, onSave, onExit, onResult, best }: Game2Props) {
  const tx = TEXT[lang];
  const sv = isTuneSave(saved) && saved.round < ROUNDS ? saved : null;
  const [phase, setPhase] = useState<Phase>('intro');
  const [game, setGame] = useState<TuneSave | null>(null);
  const [pick, setPick] = useState<{ id: string; points: number } | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const rounds = useMemo(() => (game ? makeRounds(game.seed, SONGS) : []), [game?.seed]);
  const round = game ? rounds[game.round] : null;

  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
  };
  useEffect(() => stop, []);

  const play = async (resetClock: boolean) => {
    if (!round) return;
    stop();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    const song = songById(round.songId)!;
    const { events, length } = songEvents(song, round.tonic);
    if (resetClock) t0.current = performance.now();
    try {
      await piano.play(events, length, c.signal);
    } catch {
      /* stopped */
    }
  };

  // Each new round plays its opening right away.
  useEffect(() => {
    if (phase === 'ask' && round) void play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.round, game?.seed]);

  const begin = (resume: boolean) => {
    const g: TuneSave = resume && sv ? sv : { v: 1, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, round: 0, score: 0, answers: [] };
    setGame(g);
    onSave(g);
    setPick(null);
    setPhase('ask');
  };

  const answer = (id: string) => {
    if (!game || !round || phase !== 'ask') return;
    stop();
    const ms = performance.now() - t0.current;
    const points = roundPoints(id === round.songId, ms);
    piano.cue(points ? 'correct' : 'wrong');
    const g: TuneSave = { ...game, round: game.round + 1, score: game.score + points, answers: [...game.answers, { pick: id, points, ms: Math.round(ms) }] };
    setPick({ id, points });
    setGame(g);
    if (g.round >= ROUNDS) {
      onSave(null);
      onResult({ game: 'name-tune', score: g.score, detail: { answers: g.answers, max: MAX_SCORE } });
    } else onSave(g);
    setPhase('feedback');
  };

  const next = () => {
    if (!game) return;
    setPick(null);
    setPhase(game.round >= ROUNDS ? 'over' : 'ask');
  };

  // The answered round is the previous one while showing feedback.
  const shown = phase === 'feedback' && game ? rounds[game.round - 1] : round;
  const title = (id: string) => songById(id)?.title[lang] ?? id;

  return (
    <main className="panel-screen g2 g2-tune" data-game="name-tune" data-phase={phase}>
      <G2Head
        title={tx.title}
        backLabel={tx.back}
        onBack={() => {
          stop();
          onExit();
        }}
      >
        {game && phase !== 'intro' && (
          <span className="g2-hud-mini">
            {tx.score} <b dir="ltr">{game.score}</b>
          </span>
        )}
      </G2Head>

      {phase === 'intro' && (
        <section className="g2-card">
          <p>{tx.blurb}</p>
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {sv ? (
            <div className="g2-col">
              <button className="btn primary mega" data-resume-tune onClick={() => begin(true)}>
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

      {(phase === 'ask' || phase === 'feedback') && game && shown && (
        <section className="g2-card">
          <ol className="g2-dots" aria-label={`${tx.round} ${Math.min(ROUNDS, game.round + (phase === 'ask' ? 1 : 0))} / ${ROUNDS}`}>
            {Array.from({ length: ROUNDS }, (_, i) => {
              const a = game.answers[i];
              return <li key={i} className={a ? (a.points ? 'ok' : 'bad') : i === game.round ? 'now' : ''} />;
            })}
          </ol>
          <p className="g2-lead">{phase === 'ask' ? tx.which : pick && pick.points ? `${tx.right} +${pick.points} ${tx.pts}` : `${tx.wrong}: ${title(shown.songId)}`}</p>
          <div className="g2-options">
            {shown.options.map((id) => {
              const cls = phase === 'feedback' ? (id === shown.songId ? 'right' : id === pick?.id ? 'wrong' : 'dim') : '';
              return (
                <button key={id} className={`g2-option ${cls}`} disabled={phase !== 'ask'} onClick={() => answer(id)}>
                  {title(id)}
                </button>
              );
            })}
          </div>
          {phase === 'ask' ? (
            <button className="btn ghost" onClick={() => void play(false)}>
              ↻ {tx.replay}
            </button>
          ) : (
            <button className="btn mega" onClick={next}>
              {tx.next} <span className="flip-rtl">→</span>
            </button>
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
          {!!best && game.score > best && <p className="g2-best">{tx.newBest}</p>}
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
