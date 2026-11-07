// Ear Bingo — the host's screen (room host or teacher's big screen): plays the next call and shows what has
// been called. The newest call stays hidden ("?") until the host reveals it or plays the next one, so a shared
// screen does not give the answer away. Controlled: the parent owns `called` (how many calls have been made).

import '../games3.css';
import { useEffect, useRef, useState } from 'react';
import { bingoCallEvents, bingoItem, type BingoGame } from '../engine/bingo';
import { piano } from './services';

type Lang = 'he' | 'en';
type Text = { en: string; he: string };

const T = {
  title: { en: 'Ear Bingo — host', he: 'בינגו שמיעה — מנחה' },
  first: { en: 'Play the first call', he: 'השמיעו את ההכרזה הראשונה' },
  next: { en: 'Next call', he: 'ההכרזה הבאה' },
  replay: { en: 'Play again', he: 'שוב' },
  reveal: { en: 'Show it', he: 'הציגו' },
  called: { en: 'Called', he: 'הוכרזו' },
  of: { en: 'of', he: 'מתוך' },
  none: { en: 'Nothing called yet.', he: 'עוד לא הוכרז דבר.' },
  noMore: { en: 'Every item has been called.', he: 'כל הפריטים הוכרזו.' },
  winners: { en: 'Bingo!', he: 'בינגו!' },
  end: { en: 'End game', he: 'סיום המשחק' },
  sets: { en: 'chords', he: 'אקורדים' },
  chords: { en: 'Chords', he: 'אקורדים' },
  intervals: { en: 'Intervals', he: 'מרווחים' },
  progressions: { en: 'Progressions', he: 'מהלכים' },
} satisfies Record<string, Text>;

export interface BingoHostProps {
  lang: Lang;
  game: BingoGame;
  /** How many calls have been made (0 = none). */
  called: number;
  /** The host made call number `next` (1-based count): the parent stores it / tells the room. */
  onCall: (next: number) => void;
  /** Players who called a valid bingo (names), newest last. */
  winners?: string[];
  onEnd?: () => void;
  /** Play the sound on this device (default true; false when the host screen is silent). */
  sound?: boolean;
}

export function BingoHost({ lang, game, called, onCall, winners = [], onEnd, sound = true }: BingoHostProps) {
  const tx = (o: Text) => o[lang];
  const [revealed, setRevealed] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const acRef = useRef<AbortController | null>(null);
  useEffect(() => () => acRef.current?.abort(), []);

  const playCall = async (index: number) => {
    if (!sound || index < 0 || index >= game.calls.length) return;
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
    } catch {
      /* try anyway */
    }
    const { events, length } = bingoCallEvents(game.set, game.calls[index], game.seed, index);
    setPlaying(true);
    try {
      await piano.play(events, length, ac.signal);
    } catch {
      /* stopped */
    }
    if (acRef.current === ac) setPlaying(false);
  };

  const next = () => {
    if (called >= game.calls.length) return;
    // The previous call becomes visible when the next one is played.
    setRevealed(called - 1);
    onCall(called + 1);
    void playCall(called);
  };

  const cur = called - 1;
  const shown = game.calls.slice(0, Math.max(0, called)).map((id, i) => ({ id, i, item: bingoItem(game.set, id), hidden: i === cur && revealed < cur }));
  const done = called >= game.calls.length;

  return (
    <section className="g3 bingo-host" aria-label={tx(T.title)}>
      <header className="bingo-head">
        <h2>
          {tx(T.title)} · {tx(T[game.set])}
        </h2>
        <span className="bingo-calls">
          {tx(T.called)}{' '}
          <bdi dir="ltr">
            {called} / {game.calls.length}
          </bdi>
        </span>
      </header>

      <div className="bingo-current" aria-live="polite">
        {cur >= 0 ? (
          <>
            <span className="bingo-num" dir="ltr">
              #{called}
            </span>
            <b dir="ltr">{shown[cur]?.hidden ? '?' : shown[cur]?.item?.label}</b>
            {!shown[cur]?.hidden && <small>{shown[cur]?.item?.name[lang]}</small>}
          </>
        ) : (
          <p className="field-hint">{tx(T.none)}</p>
        )}
      </div>

      <div className="bingo-host-actions">
        <button className="btn mega" onClick={next} disabled={done || playing} data-bingo-next="1">
          ▶ {called === 0 ? tx(T.first) : tx(T.next)}
        </button>
        {cur >= 0 && (
          <button className="btn" onClick={() => void playCall(cur)} disabled={playing || !sound}>
            ↻ {tx(T.replay)}
          </button>
        )}
        {cur >= 0 && revealed < cur && (
          <button className="btn ghost" onClick={() => setRevealed(cur)}>
            {tx(T.reveal)}
          </button>
        )}
      </div>
      {done && <p className="field-hint">{tx(T.noMore)}</p>}

      <ol className="bingo-called" dir="ltr">
        {shown
          .slice()
          .reverse()
          .map((c) => (
            <li key={c.i} className={c.hidden ? 'hidden' : ''} title={c.hidden ? undefined : c.item?.name[lang]}>
              <small>{c.i + 1}</small>
              <span>{c.hidden ? '?' : (c.item?.label ?? c.id)}</span>
            </li>
          ))}
      </ol>

      {winners.length > 0 && (
        <div className="bingo-winners" aria-live="assertive">
          <b>🏆 {tx(T.winners)}</b>
          <ul>
            {winners.map((w, i) => (
              <li key={i}>
                <bdi>{w}</bdi>
              </li>
            ))}
          </ul>
        </div>
      )}
      {onEnd && (
        <button className="btn ghost" onClick={onEnd}>
          {tx(T.end)}
        </button>
      )}
    </section>
  );
}
