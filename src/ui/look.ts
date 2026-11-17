// The app's look (redesign 2026-11): 'studio' is the new design language (src/studio.css, src/studio-screens.css),
// scoped under <html data-look="studio">. ?look=studio or ?look=classic sets it and remembers the choice.
import { useSyncExternalStore } from 'react';

const KEY = 'tt-look';

export function installLook() {
  let look: string | null = null;
  try {
    const q = new URLSearchParams(location.search).get('look');
    if (q === 'studio' || q === 'classic') localStorage.setItem(KEY, q);
    look = localStorage.getItem(KEY);
  } catch {
    look = new URLSearchParams(location.search).get('look');
  }
  if (look === 'studio') document.documentElement.dataset.look = 'studio';
  else if (look === 'classic' && document.documentElement.dataset.look === 'studio') delete document.documentElement.dataset.look;
}

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });
  return () => mo.disconnect();
};

/** True while the studio look is on (re-renders when <html data-look> changes). */
export function useStudio(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.look === 'studio', () => false);
}
