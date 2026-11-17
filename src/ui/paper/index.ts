// The Paper drawings by glyph name (the same names as GLYPHS in src/ui/Glyph.tsx). A name without a drawing here still
// renders through its old drawing (paperFallbacks() lists them) — parallel work can append glyphs safely.
import { LESSON_MARK, TOPIC_MARK } from '../stepMarks';
import { ART_CORE } from './art-core';
import { ART_EAR } from './art-ear';
import { ART_DRUMS } from './art-drums';
import { ART_GUITAR } from './art-guitar';
import { ART_BASS } from './art-bass';
import { ART_KEYS } from './art-keys';
import { ART_VOICE } from './art-voice';
import { ART_GIFTS } from './art-gifts';
import { markArt, type Art, type HueName } from './kit';

/** A mark's hue by what it names: meters and rhythms tangerine, sound engineering sky, the rest theory lilac. */
export function markHue(text: string): [HueName, HueName] {
  if (/^R\d$|\d\/\d|[♩♪♫]|×|\d:\d|^(swg|gap|acc\.|rit\.|stac|&)$/.test(text)) return ['tan', 'purple'];
  if (/^(EQ|HPF|dB|kHz|¢|<>|mood|pp)$/.test(text)) return ['sky', 'purple'];
  return ['lilac', 'purple'];
}

export const PAPER: Record<string, Art> = {
  ...ART_CORE,
  ...ART_EAR,
  ...ART_DRUMS,
  ...ART_GUITAR,
  ...ART_BASS,
  ...ART_KEYS,
  ...ART_VOICE,
  ...ART_GIFTS,
};
for (const [k, s] of Object.entries(TOPIC_MARK)) PAPER[`m:${k}`] ??= markArt(s, ...markHue(s));
for (const [k, s] of Object.entries(LESSON_MARK)) PAPER[`m:lesson:${k}`] ??= markArt(s, ...markHue(s));
