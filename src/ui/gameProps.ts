// The props every single-player game screen takes from App.tsx (0.70: the advanced games share them).
import type { TierInfo } from '../engine/gameTiers';
import type { Settings } from '../storage/progress';

export interface GameScreenProps {
  lang: 'he' | 'en';
  settings: Settings;
  /** The saved run (resume after Back / reload), or null. */
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  /** A finished run: detail carries `tier` (and right / wrong or accuracy) so XP, tiers and ratings follow. */
  onResult: (r: { game: string; score: number; detail?: unknown }) => void;
  best?: number;
  tier?: TierInfo;
}
