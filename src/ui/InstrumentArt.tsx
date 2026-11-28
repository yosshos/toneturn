// The instrument sound cards' drawings (0.61, SPEC-REDESIGN: "sound cards with a picture of the instrument"), in the
// Paper language since the icon redraw (src/ui/paper/art-scenes.ts): flat sheets with their edge below, the
// instrument's own hue, no outlines. One 120 x 72 box each, drawn here (no images, no downloads).
import { INSTRUMENT_ART, INSTRUMENT_VIEWBOX } from './paper/art-scenes';
import { PaperSvg } from './paper/Paper';

export function InstrumentArt({ id }: { id: string }) {
  const art = INSTRUMENT_ART[id];
  if (!art) return null;
  return <PaperSvg art={art} cut="badge" viewBox={INSTRUMENT_VIEWBOX} width={120} height={72} className="inst-art" />;
}
