// Placeholder (0.70): replaced by the game screen.
import type { GameScreenProps } from './gameProps';

export function BhInTime(props: GameScreenProps) {
  return (
    <main className="panel-screen g2" data-game="bhtime">
      <button className="btn" onClick={props.onExit}>
        {props.lang === 'he' ? 'חזרה' : 'Back'}
      </button>
    </main>
  );
}
