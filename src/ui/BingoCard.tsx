// Ear Bingo — one player's 4×4 card (spec AE §8). Mounts inside a live room or a class: the parent passes the
// calls heard so far and receives a validated claim. Multiplayer: nothing here is saved.

import '../games3.css';
import { useEffect, useState } from 'react';
import { bingoItem, CARD_SIZE, completedLines, encodeClaim, validateClaim, type BingoCardData } from '../engine/bingo';

type Lang = 'he' | 'en';
type Text = { en: string; he: string };

const T = {
  title: { en: 'Ear Bingo', he: 'בינגו שמיעה' },
  bingo: { en: 'Bingo!', he: 'בינגו!' },
  calls: { en: 'Calls', he: 'הכרזות' },
  hint: { en: 'Listen to each call and tap the matching square. A full row, column or diagonal wins.', he: 'האזינו לכל הכרזה והקישו על המשבצת המתאימה. שורה, טור או אלכסון מלאים — ניצחון.' },
  falseClaim: { en: 'Not a bingo yet — a marked square was not called.', he: 'עוד לא בינגו — סימנתם משבצת שלא הוכרזה.' },
  wait: { en: 'Wait', he: 'המתינו' },
  won: { en: 'Bingo! You win', he: 'בינגו! ניצחתם' },
  lost: { en: 'won this game', he: 'ניצח/ה במשחק' },
  over: { en: 'Game over', he: 'המשחק הסתיים' },
  marked: { en: 'marked', he: 'מסומן' },
  claimSent: { en: 'Bingo sent — checking…', he: 'הבינגו נשלח — בודקים…' },
} satisfies Record<string, Text>;

export interface BingoClaim {
  marks: number[];
  line: number[];
  /** Room answer string ("bingo:0,5,10,15"), see engine/bingo encodeClaim. */
  encoded: string;
}

export interface BingoCardProps {
  lang: Lang;
  card: BingoCardData;
  /** Item ids called so far, in order. */
  called: string[];
  /** Validated claim (all marks on the line were called). The parent sends it to the room. */
  onClaim: (claim: BingoClaim) => void;
  /** Controlled marks (optional); otherwise the card keeps its own. */
  marks?: number[];
  onMarksChange?: (marks: number[]) => void;
  /** 'playing' (default), 'claimed' (waiting for the room), 'won', 'lost' (someone else won), 'over'. */
  status?: 'playing' | 'claimed' | 'won' | 'lost' | 'over';
  /** Winner's name when status is 'lost'. */
  winner?: string | null;
  /** After a false "Bingo!", the button is locked this long (ms). Default 5000. */
  falseClaimLockMs?: number;
}

export function BingoCard({ lang, card, called, onClaim, marks: controlled, onMarksChange, status = 'playing', winner, falseClaimLockMs = 5000 }: BingoCardProps) {
  const tx = (o: Text) => o[lang];
  const [own, setOwn] = useState<number[]>([]);
  const marks = controlled ?? own;
  const setMarks = (m: number[]) => {
    if (!controlled) setOwn(m);
    onMarksChange?.(m);
  };
  const [lockUntil, setLockUntil] = useState(0);
  const [falseMsg, setFalseMsg] = useState(false);
  const [, force] = useState(0);
  const [winLine, setWinLine] = useState<number[] | null>(null);

  // New card (new game): clear local marks.
  useEffect(() => {
    setOwn([]);
    setWinLine(null);
    setFalseMsg(false);
  }, [card.seed, card.player, card.set]);

  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(0);
        setFalseMsg(false);
      }
      force((x) => x + 1);
    }, 250);
    return () => clearInterval(id);
  }, [lockUntil]);

  const live = status === 'playing';
  const locked = lockUntil > Date.now();
  const hasLine = completedLines(marks).length > 0;

  const toggle = (i: number) => {
    if (!live) return;
    setMarks(marks.includes(i) ? marks.filter((x) => x !== i) : [...marks, i]);
  };

  const claim = () => {
    if (!live || locked) return;
    const r = validateClaim(card, marks, called);
    if (r.valid && r.line) {
      setWinLine(r.line);
      onClaim({ marks: [...marks].sort((a, b) => a - b), line: r.line, encoded: encodeClaim(marks) });
    } else {
      setFalseMsg(true);
      setLockUntil(Date.now() + falseClaimLockMs);
    }
  };

  const secsLeft = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));

  return (
    <section className={`g3 bingo-card status-${status}`} aria-label={tx(T.title)}>
      <header className="bingo-head">
        <h2>{tx(T.title)}</h2>
        <span className="bingo-calls">
          {tx(T.calls)} <bdi dir="ltr">{called.length}</bdi>
        </span>
      </header>
      <div className="bingo-grid" dir="ltr" role="grid" style={{ ['--n' as string]: CARD_SIZE }}>
        {card.cells.map((id, i) => {
          const it = bingoItem(card.set, id);
          const on = marks.includes(i);
          const win = winLine?.includes(i);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`bingo-cell ${on ? 'on' : ''} ${win ? 'win' : ''}`}
              aria-pressed={on}
              aria-label={`${it ? it.name[lang] : id}${on ? ` (${tx(T.marked)})` : ''}`}
              onClick={() => toggle(i)}
              disabled={!live}
              data-cell={i}
            >
              <span>{it?.label ?? id}</span>
            </button>
          );
        })}
      </div>
      <div className="bingo-foot" aria-live="polite">
        {status === 'won' ? (
          <p className="bingo-msg good">{tx(T.won)}</p>
        ) : status === 'lost' ? (
          <p className="bingo-msg">
            <bdi>{winner ?? ''}</bdi> {tx(T.lost)}
          </p>
        ) : status === 'over' ? (
          <p className="bingo-msg">{tx(T.over)}</p>
        ) : status === 'claimed' ? (
          <p className="bingo-msg">{tx(T.claimSent)}</p>
        ) : (
          <>
            {falseMsg ? <p className="bingo-msg warn">{tx(T.falseClaim)}</p> : <p className="field-hint">{tx(T.hint)}</p>}
            <button className={`btn mega bingo-btn ${hasLine && !locked ? 'ready' : ''}`} onClick={claim} disabled={!hasLine || locked} data-bingo="1">
              {locked ? (
                <>
                  {tx(T.wait)} <bdi dir="ltr">{secsLeft}</bdi>
                </>
              ) : (
                tx(T.bingo)
              )}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
