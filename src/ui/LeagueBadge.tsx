// League badge (spec Y.3): the chord so far, one note per league from middle C, Root → 13 (src/ui/studio/StudioArt).

import { LADDER, tierOf } from '../engine/league';
import { LeagueTile } from './studio/StudioArt';

export function LeagueBadge({ tier, size = 72, ghostNext = false, title, arrive = false, falling = [] }: { tier: number; size?: number; ghostNext?: boolean; title?: string; /** Promotion (spec Y.5): the newest note drops onto its line. */ arrive?: boolean; /** Relegation: these higher notes fall off the staff. */ falling?: number[] }) {
  // The Paper league tile (the chord so far, stacked in the league's own colour).
  return <LeagueTile tier={tier} size={size} ghostNext={ghostNext} title={title ?? tierOf(tier).symbol} arrive={arrive} falling={falling} />;
}

/** All seven leagues in a row: reached ones filled, the current one highlighted, the rest dimmed. */
export function LeagueLadder({ tier, names }: { tier: number; names: string[] }) {
  return (
    <ol className="league-ladder" aria-label="leagues">
      {LADDER.map((L) => (
        <li key={L.tier} className={L.tier === tier ? 'now' : L.tier < tier ? 'past' : 'ahead'} style={{ ['--tier-color' as string]: L.color }}>
          <LeagueBadge tier={L.tier} size={34} title={names[L.tier - 1]} />
          <small>{names[L.tier - 1]}</small>
        </li>
      ))}
    </ol>
  );
}
