// The studio look's game-end art (games frame, second pass): the same final barline + Toni as the lesson recap
// (Recap.tsx, src/studio-elements.css), smaller, so every game's result card reads as one celebration language.
// Pure presentation.
import { FinalBarline } from './studio/StudioArt';
import { Toni, type ToniMood } from './Toni';

/** Barline + Toni over a result card. `good` = a pass / new best (Toni celebrates), otherwise Toni encourages. */
export function GameCeleArt({ good, best = false }: { good: boolean; best?: boolean }) {
  const mood: ToniMood = best ? 'celebrating' : good ? 'proud' : 'encouraging';
  return (
    <div className="gs-cele-art" aria-hidden="true">
      <FinalBarline size={58} />
      <span className="cel-toni">
        <Toni state={mood} size={88} />
      </span>
    </div>
  );
}
