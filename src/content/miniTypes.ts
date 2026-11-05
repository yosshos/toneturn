// Mini-lessons (spec X): a 60–90 second spoken lesson with examples before every unit. Pure data.

import type { Stimulus } from '../engine/lesson';

/** Where a learned topic is filed in "Topics I learned". */
export type AreaId = 'ear' | 'harmony' | 'rhythm' | 'theory' | 'voice' | 'jazz' | 'world' | 'play';

export interface Bi {
  en: string;
  he: string;
}

/** What the screen shows during a step (all optional). */
export interface MiniShow {
  /** MIDI notes drawn in the player's chosen views (keyboard / staff / tab). */
  notes?: number[];
  /** Draw `notes` as one chord. */
  chord?: boolean;
  /** Key signature for the staff, e.g. 'C', 'G', 'Bb', 'F#'. */
  key?: string;
  /** Staff clef. */
  clef?: 'treble' | 'bass' | 'alto';
  /** Written note lengths in beats (staff), one per note. */
  durs?: number[];
  /** A big short text / symbol, e.g. "1 – 3 – 5", "C7 → F", "♩ ♩ ♫ ♩". */
  text?: Bi;
}

export interface MiniStep {
  /** Spoken and shown as a caption. 1–3 short sentences. `{name}` = the player's name (dropped if unknown). */
  say: Bi;
  /** An example played after the sentence (or before it with `playFirst`). */
  play?: Stimulus[];
  playFirst?: boolean;
  show?: MiniShow;
}

export interface MiniLesson {
  id: string;
  area: AreaId;
  emoji: string;
  title: Bi;
  /** One line for the collection card: the core idea. */
  takeaway: Bi;
  steps: MiniStep[];
}
