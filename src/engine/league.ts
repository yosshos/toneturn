// The league ladder as a chord (spec Y): Root, Third, Fifth, Seventh, Ninth, ♯11, 13 — C E G B♭ D F♯ A,
// stacked from middle C (C13♯11, the chord of the overtone series). The same rules as the server
// (migration 20, toneturn_league_move). Pure.

export interface LeagueTier {
  tier: number;
  /** The note this tier adds to the chord (MIDI, from middle C). */
  midi: number;
  /** Accidental drawn before the note head. */
  acc: '' | '♭' | '♯';
  symbol: string;
  /** Colour of the tier (badge ring, new note, accents). */
  color: string;
  /** Second colour (gradient). */
  color2: string;
  /** Places that move up at the end of the week, and the weekly XP that also takes. */
  promote: number;
  minXp: number;
  /** Places that move down (cohorts of 10 or more). */
  relegate: number;
}

export const LADDER: LeagueTier[] = [
  { tier: 1, midi: 60, acc: '', symbol: '1', color: '#a3acc2', color2: '#6c7489', promote: 5, minXp: 1, relegate: 0 },
  { tier: 2, midi: 64, acc: '', symbol: '3', color: '#2ec4b6', color2: '#127a72', promote: 5, minXp: 1, relegate: 5 },
  { tier: 3, midi: 67, acc: '', symbol: '5', color: '#4ea8de', color2: '#1d5f8e', promote: 5, minXp: 1, relegate: 5 },
  { tier: 4, midi: 70, acc: '♭', symbol: '♭7', color: '#a06cf0', color2: '#5b2aa8', promote: 4, minXp: 1, relegate: 5 },
  { tier: 5, midi: 74, acc: '', symbol: '9', color: '#ffc94d', color2: '#ff8a3d', promote: 3, minXp: 500, relegate: 5 },
  { tier: 6, midi: 78, acc: '♯', symbol: '♯11', color: '#ff4d8d', color2: '#a3155b', promote: 1, minXp: 900, relegate: 6 },
  { tier: 7, midi: 81, acc: '', symbol: '13', color: '#7af0d0', color2: '#b18cff', promote: 0, minXp: 0, relegate: 8 },
];
export const TOP_TIER = LADDER.length;
export const NINTH_TIER = 5;
export const tierOf = (tier: number) => LADDER[Math.max(1, Math.min(TOP_TIER, tier)) - 1];

/** The move at the end of the week (+1 / −1 / 0): the server's rule. */
export function leagueMove(tier: number, rank: number, n: number, xp: number): -1 | 0 | 1 {
  const T = tierOf(tier);
  if (xp > 0 && tier < TOP_TIER && rank <= T.promote && xp >= T.minXp) return 1;
  if (n >= 10 && tier > 1 && rank > n - T.relegate) return -1;
  return 0;
}

/** Zone of a place for the live table: 'up' also needs the weekly XP the tier asks for. */
export function leagueZone(place: number, n: number, tier: number, xp = Infinity): 'up' | 'up-needs-xp' | 'down' | 'stay' {
  const T = tierOf(tier);
  if (tier < TOP_TIER && place <= T.promote) return xp >= T.minXp ? 'up' : 'up-needs-xp';
  if (n >= 10 && tier > 1 && place > n - T.relegate) return 'down';
  return 'stay';
}

/** First placement from the overall rating — never above the Seventh. */
export const firstTier = (rating: number | null) => (rating === null || rating < 1000 ? 1 : rating < 1150 ? 2 : rating < 1300 ? 3 : 4);

/** "Your ear's chord" on the Skill Map: the overall rating in the same seven steps. */
export const CHORD_STEPS = [0, 850, 1000, 1150, 1300, 1450, 1600];
export const chordTierForRating = (r: number) => CHORD_STEPS.reduce((t, min, i) => (r >= min ? i + 1 : t), 1);
