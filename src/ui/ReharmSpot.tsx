// Placeholder (0.70): replaced by the game screen.
import type { GameScreenProps } from './gameProps';

export function ReharmSpot(props: GameScreenProps) {
  return (
    <main className="panel-screen g2" data-game="reharm">
      <button className="btn" onClick={props.onExit}>
        {props.lang === 'he' ? 'חזרה' : 'Back'}
      </button>
    </main>
  );
}
