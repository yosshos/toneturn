// AUDIT-GAMES §1 ("everything connects"): the key-relative measured games (Barry Harris in Time, Voicing Sprint, Walk
// the Changes, Chord Change Race, Roots by Ear, Play It Back) write key cells for key mastery, the way drill takes do.
// A game's takes in a key become one item state per game, instrument and key (`progress.gameKeys`), whose family id
// carries the instrument prefix keyMastery.ts reads (k- piano, g- guitar, b- bass). Key mastery, the profile and
// Insights read the drill items and these together (withGameKeys). Pure.

import type { FamilyId, ItemState } from './drills/types';
import type { KeyInstrument } from './analysis/keyMastery';

/** The games that feed key mastery. */
export const KEY_GAMES = ['bhtime', 'voicingsprint', 'walkchanges', 'changerace', 'rootsear', 'playback', 'whichbrother', 'compcaller', 'elevator'] as const;
export type KeyGame = (typeof KEY_GAMES)[number];
export const isKeyGame = (g: string): g is KeyGame => (KEY_GAMES as readonly string[]).includes(g);

/** One measured take of a key-relative game: its key (tonic pitch class), accuracy 0–100 and tempo (♩, 0 = untimed). */
export interface GameKeyTake {
  key: number;
  acc: number;
  bpm?: number;
}

/** A take at or above this accuracy is clean (the take games' pass line). */
export const GAME_KEY_CLEAN = 70;

const PREFIX: Record<KeyInstrument, string> = { piano: 'k', guitar: 'g', bass: 'b' };
/** The skill (family id) of a game on an instrument, e.g. `g-game-rootsear`. */
export const gameKeyFamily = (game: string, inst: KeyInstrument): FamilyId => `${PREFIX[inst]}-game-${game}` as FamilyId;
export const isGameKeyFamily = (f: string): boolean => /^[kgb]-game-/.test(f);
const pc = (k: number) => ((Math.round(k) % 12) + 12) % 12;

/** The item state after one take (a fresh state when none). Untimed games count a clean take as the target tempo. */
export function noteGameKeyTake(prev: ItemState | undefined, game: string, inst: KeyInstrument, t: GameKeyTake, at: string): ItemState {
  const key = pc(t.key);
  const family = gameKeyFamily(game, inst);
  const acc = Math.max(0, Math.min(1, t.acc / 100));
  const bpm = t.bpm && t.bpm > 0 ? Math.round(t.bpm) : 100;
  const clean = t.acc >= GAME_KEY_CLEAN;
  const base: ItemState = prev ?? {
    itemId: `${family}:game:${key}:RL`,
    family,
    key,
    hands: 'RL',
    cleanBpm: 0,
    goalBpm: bpm,
    streak: 0,
    fails: 0,
    ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc },
    takes: 0,
    last: '',
    history: [],
  };
  const a = prev ? 0.3 : 1;
  return {
    ...base,
    cleanBpm: clean ? Math.max(base.cleanBpm, bpm) : base.cleanBpm,
    goalBpm: Math.max(base.goalBpm, bpm),
    targetBpm: Math.max(base.targetBpm ?? 0, bpm),
    streak: clean ? base.streak + 1 : 0,
    fails: clean ? 0 : base.fails + 1,
    ewma: { ...base.ewma, acc: base.ewma.acc * (1 - a) + acc * a },
    takes: base.takes + 1,
    last: at,
    history: clean ? [...base.history, { at, bpm, cv: 0 }].slice(-40) : base.history,
  };
}

/** The game key cells after a run's takes. */
export function addGameKeyTakes(cells: Record<string, ItemState> | undefined, game: string, inst: KeyInstrument, takes: GameKeyTake[], at: string): Record<string, ItemState> {
  const out = { ...(cells ?? {}) };
  for (const t of takes) {
    if (!Number.isFinite(t.key) || !Number.isFinite(t.acc)) continue;
    const id = `${gameKeyFamily(game, inst)}:game:${pc(t.key)}:RL`;
    out[id] = noteGameKeyTake(out[id], game, inst, t, at);
  }
  return out;
}

/** Drill items plus game key cells, for key mastery (the drill screens keep reading the drill items alone). */
export const withGameKeys = (drills: Record<string, ItemState> | undefined, games: Record<string, ItemState> | undefined): Record<string, ItemState> => ({ ...(drills ?? {}), ...(games ?? {}) });

/** A run's key takes from a result detail (`keyTakes` + `keyInst`), or null. */
export function keyTakesOf(detail: Record<string, unknown> | undefined): { inst: KeyInstrument; takes: GameKeyTake[] } | null {
  const inst = detail?.keyInst;
  const takes = detail?.keyTakes;
  if ((inst !== 'piano' && inst !== 'guitar' && inst !== 'bass') || !Array.isArray(takes) || !takes.length) return null;
  return { inst, takes: (takes as GameKeyTake[]).filter((t) => t && typeof t.key === 'number' && typeof t.acc === 'number') };
}

const TITLES: Record<KeyGame, { en: string; he: string }> = {
  bhtime: { en: 'Barry Harris in Time', he: 'בארי האריס בזמן' },
  voicingsprint: { en: 'Voicing Sprint', he: 'ספרינט וויסינגים' },
  walkchanges: { en: 'Walk the Changes', he: 'ללכת על המהלך' },
  changerace: { en: 'Chord Change Race', he: 'מרוץ החלפות אקורדים' },
  rootsear: { en: 'Roots by Ear', he: 'שורשים מהאוזן' },
  playback: { en: 'Play It Back', he: 'לנגן בחזרה' },
  whichbrother: { en: 'Which Brother?', he: 'איזה אח?' },
  compcaller: { en: 'Comp Caller', he: 'קורא הליווי' },
  elevator: { en: 'Elevator', he: 'המעלית' },
};
/** A game key skill's name (the game's title), or undefined for other families. */
export function gameKeyTitle(f: string): { en: string; he: string } | undefined {
  const m = /^[kgb]-game-(.+)$/.exec(f);
  return m && isKeyGame(m[1]) ? TITLES[m[1]] : undefined;
}
