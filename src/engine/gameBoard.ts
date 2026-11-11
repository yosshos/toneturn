// The game board (GAMES_TIERS_PLAN §5.1): best per game × tier this week, me and my friends (server RPC
// toneturn_game_board), with this device's own best filled in when the server has none for me yet. Pure helpers.

import { tierKey, tierSpec, TIERS, type DynName, type GameTiers } from './gameTiers';

export interface BoardRow {
  name: string;
  best: number;
  me: boolean;
  /** 1-based place (ties share a place). */
  place: number;
}

/** Rows of the board, best first: the server's rows, plus my local best when the server has none for me (or a lower one). */
export function boardRows(remote: { name: string; best: number; me: boolean }[] | null, localBest: number | undefined, myName: string): BoardRow[] {
  const rows = (remote ?? []).map((r) => ({ ...r }));
  const mine = rows.find((r) => r.me);
  if (localBest && localBest > 0) {
    if (!mine) rows.push({ name: myName, best: localBest, me: true });
    else if (mine.best < localBest) mine.best = localBest;
  }
  rows.sort((a, b) => b.best - a.best || (a.me ? -1 : b.me ? 1 : 0));
  let place = 0;
  let last = Number.NaN;
  return rows.map((r, i) => {
    if (r.best !== last) {
      place = i + 1;
      last = r.best;
    }
    return { ...r, place };
  });
}

/** The games a board can show for a course list: tiered games only (social sets and the groove tool have no score board). */
export function boardGames(games: string[]): string[] {
  const out: string[] = [];
  for (const g of games) {
    if (!tierSpec(g) || g === 'duel' || g === 'daily' || g === 'ghost' || g === 'online' || g === 'drills') continue;
    const k = tierKey(g);
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** My best per tier of a game (this device). */
export const localBests = (tiers: GameTiers | undefined, game: string): Partial<Record<DynName, number>> => tiers?.[tierKey(game)]?.best ?? {};

/** The tiers a board offers for a game (advanced games start at their minimum tier). */
export function boardTiers(game: string): DynName[] {
  const min = tierSpec(game)?.minTier;
  return min ? TIERS.slice(TIERS.indexOf(min)) : TIERS;
}

/** Names of the tiered games that are not in Arcade's GAMES2 list. */
export const GAME_TITLES: Record<string, { en: string; he: string }> = {
  melody: { en: 'Echo Chain', he: 'שרשרת הד' },
  rhythm: { en: 'Beat Echo', he: 'הד קצב' },
  truefalse: { en: 'Truth or Bluff', he: 'אמת או בלוף' },
  groove: { en: 'Groove trainer', he: 'מאמן הגרוב' },
  land: { en: 'Land It', he: 'נחיתה' },
  'groove-echo': { en: 'Groove Echo', he: 'הד גרוב' },
  'odd-echo': { en: 'Odd-meter Echo', he: 'הד משקלים אי־זוגיים' },
  'time-lock': { en: 'Time Lock', he: 'נעילת זמן' },
  'ghost-control': { en: 'Ghost Control', he: 'שליטה ברפאים' },
};
