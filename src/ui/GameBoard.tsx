// The game board (GAMES_TIERS_PLAN §5.1, 0.70): best score per game × tier this week — me and my friends — from the
// server (toneturn_game_board; bests go up after every tiered run via toneturn_game_best_submit). Signed out, or on a
// server without the board, it shows this device's own bests only. One phone screen: a game picker, six tier
// buttons, the list.
import '../tiers.css';
import '../advgames.css';
import { useEffect, useState } from 'react';
import { gameBoard } from '../cloud/compete';
import { boardGames, boardRows, boardTiers, localBests, type BoardRow } from '../engine/gameBoard';
import { tierIndex, TIERS, type DynName, type TierInfo } from '../engine/gameTiers';
import type { Progress } from '../storage/progress';
import { G2Head } from './Flight';
import { Glyph } from './Glyph';
import { BeatMyScoreButton } from './Community';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Game board', he: 'לוח המשחקים' },
  back: { en: 'Back', he: 'חזרה' },
  game: { en: 'Game', he: 'משחק' },
  level: { en: 'Level', he: 'רמה' },
  week: { en: 'This week · you and your friends', he: 'השבוע · אתם והחברים' },
  local: { en: 'Sign in to see your friends. Your own bests on this device:', he: 'התחברו כדי לראות חברים. השיאים שלכם במכשיר הזה:' },
  offline: { en: 'The board is not available right now — your own best is shown.', he: 'הלוח לא זמין כרגע — מוצג השיא שלכם.' },
  empty: { en: 'No score at this level yet. Play it to open the board.', he: 'עוד אין ניקוד ברמה הזאת. שחקו בה כדי לפתוח את הלוח.' },
  you: { en: 'You', he: 'אתם' },
  loading: { en: 'Loading…', he: 'טוען…' },
};

export interface GameBoardProps {
  lang: Lang;
  progress: Progress;
  /** The course's games (COURSE_GAMES); only tiered ones are offered. */
  games: string[];
  titleOf: (game: string) => string;
  /** The tier each game opens at (the board starts there). */
  tierFor: (game: string) => TierInfo;
  signedIn: boolean;
  onBack: () => void;
  /** "Beat my score" links (signed in, not in young-player mode). */
  canShare?: boolean;
}

export function GameBoard({ lang, progress, games, titleOf, tierFor, signedIn, onBack, canShare = false }: GameBoardProps) {
  const list = boardGames(games);
  const [game, setGame] = useState(list[0] ?? 'rush-chord');
  const tiers = boardTiers(game);
  const open = tierFor(game).open;
  const [tier, setTier] = useState<DynName>(tiers.includes(open) ? open : tiers[0]);
  const [remote, setRemote] = useState<{ name: string; best: number; me: boolean }[] | null | 'loading'>(signedIn ? 'loading' : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    setRemote('loading');
    void gameBoard(game, tier)
      .then((r) => {
        if (!live) return;
        setRemote(r);
        setFailed(r === null);
      })
      .catch(() => live && (setRemote(null), setFailed(true)));
    return () => {
      live = false;
    };
  }, [game, tier, signedIn]);

  const pickGame = (g: string) => {
    setGame(g);
    const ts = boardTiers(g);
    const o = tierFor(g).open;
    setTier(ts.includes(o) ? o : ts[0]);
  };
  const mine = localBests(progress.gameTiers, game);
  const rows: BoardRow[] = remote === 'loading' ? [] : boardRows(remote, mine[tier], TX.you[lang]);

  return (
    <main className="panel-screen g2 gboard" data-screen="gameboard">
      <G2Head title={TX.title[lang]} backLabel={TX.back[lang]} onBack={onBack}>
        <Glyph kind="board" color="#EDE6F7" size={34} />
      </G2Head>
      <section className="g2-card gboard-card">
        <label className="gboard-pick">
          <span>{TX.game[lang]}</span>
          <select value={game} onChange={(e) => pickGame(e.target.value)} data-board-game>
            {list.map((g) => (
              <option key={g} value={g}>
                {titleOf(g)}
              </option>
            ))}
          </select>
        </label>
        <div className="tier-row" role="radiogroup" aria-label={TX.level[lang]} dir="ltr">
          {TIERS.map((t) => {
            const ok = tiers.includes(t);
            return (
              <button key={t} type="button" role="radio" aria-checked={tier === t} disabled={!ok} className={`tier-chip ${tier === t ? 'on' : ''} ${t === open ? 'open' : ''}`} onClick={() => ok && setTier(t)} data-tier={t}>
                <i className="dyn">{t}</i>
                {mine[t] ? <small className="gboard-dot" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className="g2-dim gboard-note">{!signedIn ? TX.local[lang] : failed ? TX.offline[lang] : TX.week[lang]}</p>
        {remote === 'loading' ? (
          <p className="g2-dim">{TX.loading[lang]}</p>
        ) : rows.length ? (
          <ol className="gboard-list" data-board-rows={rows.length}>
            {rows.slice(0, 8).map((r, i) => (
              <li key={`${r.name}-${i}`} className={r.me ? 'me' : ''}>
                <b dir="ltr">{r.place}</b>
                <span>{r.me ? TX.you[lang] : r.name}</span>
                <em dir="ltr">{r.best.toLocaleString()}</em>
              </li>
            ))}
          </ol>
        ) : (
          <p className="g2-dim">{TX.empty[lang]}</p>
        )}
        {signedIn && <BeatMyScoreButton lang={lang} game={game} tier={tierIndex(tier)} score={rows.find((r) => r.me)?.best ?? mine[tier] ?? 0} gameTitle={titleOf(game)} canShare={canShare} />}
        {!signedIn && (
          <p className="g2-dim gboard-mine" dir="ltr">
            {TIERS.filter((t) => mine[t])
              .sort((a, b) => tierIndex(a) - tierIndex(b))
              .map((t) => `${t} ${mine[t]}`)
              .join(' · ')}
          </p>
        )}
      </section>
    </main>
  );
}
