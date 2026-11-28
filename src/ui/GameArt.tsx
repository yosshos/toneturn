// Intro drawings for games that had none (0.61, SPEC-REDESIGN): Tune-up and the two Echo games. In the Paper language
// since the icon redraw (src/ui/paper/art-scenes.ts): flat sheets with their edge below, no outlines; Toni where he
// belongs. The card is a light island in both themes (pp-on-light). No images.
import { Toni } from './Toni';
import { echoArt, GAME_VIEWBOX, TUNE_UP_ART } from './paper/art-scenes';
import { PaperSvg } from './paper/Paper';

/** Tune-up: a wobbly note slides onto the target line; the target is the dashed strip. */
export function TuneUpArt() {
  return (
    <div className="game-art pp-on-light" aria-hidden="true">
      <PaperSvg art={TUNE_UP_ART} cut="badge" viewBox={GAME_VIEWBOX} width={300} height={120} className="ga-paper" />
    </div>
  );
}

/** Echo: Toni hears a phrase (left) and plays it back (right) — the same heads, a beat later. */
export function EchoArt({ kind }: { kind: 'melody' | 'rhythm' }) {
  return (
    <div className="game-art echo-art pp-on-light" aria-hidden="true">
      <PaperSvg art={echoArt(kind)} cut="badge" viewBox={GAME_VIEWBOX} width={300} height={120} className="ga-paper" />
      <span className="ga-toni">
        <Toni state="listen" size={62} />
      </span>
    </div>
  );
}
