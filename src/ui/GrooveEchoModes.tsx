// Groove Echo with Odd-meter Echo as its second mode (AUDIT-GAMES §10): one card in the drums list; the odd-meter
// rounds keep their own game id ('odd-echo'), so its tiers, bests, path steps and saved progress stay valid. The
// #/odd-echo route opens this screen in the odd-meter mode.
import { useState, type ComponentProps } from 'react';
import { DrumGame } from './DrumGame';
import type { TierInfo } from '../engine/gameTiers';

type EchoGame = 'groove-echo' | 'odd-echo';
type Base = Omit<ComponentProps<typeof DrumGame>, 'game' | 'onResult' | 'best' | 'tier' | 'echoMode'>;

export function GrooveEchoModes({ initialOdd, onResult, bestOf, tierOf, ...rest }: Base & { initialOdd: boolean; onResult: (game: EchoGame, r: { score: number; detail?: unknown }) => void; bestOf: (g: EchoGame) => number | undefined; tierOf: (g: EchoGame) => TierInfo | undefined }) {
  const [odd, setOdd] = useState(initialOdd);
  const game: EchoGame = odd ? 'odd-echo' : 'groove-echo';
  return <DrumGame key={game} {...rest} game={game} best={bestOf(game)} tier={tierOf(game)} onResult={(r) => onResult(game, r)} echoMode={{ odd, onChange: setOdd }} />;
}
