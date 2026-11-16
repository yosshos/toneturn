// The controls' symbols (0.52 line icons → 2026-11-16 the Paper "chrome" cut): play, stop, record, back, close, more …
// and the small marks that replaced emoji (lock, mic, gift …). Every one is a Paper drawing (src/ui/paper/art-chrome.ts)
// drawn by the one renderer (cut 'chrome'): flat sheets with their edge below, painted in the surface's chrome ramp
// (src/paper.css), so the same symbol reads on ink, purple, lemon, card, dark card and the dark bar. No thin strokes.
import { CHROME, CHROME_MIRROR, type ChromeKey } from './paper/art-chrome';
import { PaperSvg } from './paper/Paper';

export type IconKey = ChromeKey;

/**
 * A control symbol, sized in px. Decorative: the button's words, aria-label or title carry the meaning. Back / forward
 * mirror in Hebrew (flip-rtl).
 */
export function Icon({ k, size = 16, className }: { k: IconKey; size?: number; className?: string }) {
  const cls = `ico ico-${k}${CHROME_MIRROR.has(k) ? ' flip-rtl' : ''}${className ? ` ${className}` : ''}`;
  return <PaperSvg art={CHROME[k]} cut="chrome" width={size} className={cls} />;
}
