import { useSyncExternalStore } from 'react';
// The look layer (redesign stage 1). `data-look="studio"` on <html> turns on src/studio.css, a restrained skin over the
// classic v2 look: hairlines and soft shadows instead of ink outlines and hard offsets, one emphasis per screen.
// The studio look is the DEFAULT (owner, 2026-11-17); the previous look stays reachable: localStorage tt.look =
// 'classic', ?look=classic, or Settings > Display "Previous look". index.html applies it before the first paint.

export type Look = 'classic' | 'studio';
export const LOOK_KEY = 'tt.look';

/** The look a URL asks for (`?look=studio` / `?look=classic`), or null. */
export function lookFromSearch(search: string): Look | null {
  const v = new URLSearchParams(search).get('look');
  return v === 'studio' || v === 'classic' ? v : null;
}

/** The stored look: classic only when localStorage says so; studio otherwise. */
export function storedLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === 'classic' ? 'classic' : 'studio';
  } catch {
    return 'studio';
  }
}

/** Store a look (`studio`, the default, clears the key) and paint it. */
export function setLook(look: Look, doc: Document = document): void {
  try {
    if (look === 'classic') localStorage.setItem(LOOK_KEY, 'classic');
    else localStorage.removeItem(LOOK_KEY);
  } catch {
    /* private mode: the attribute still applies for this visit */
  }
  paintLook(look, doc);
}

export function paintLook(look: Look, doc: Document = document): void {
  if (look === 'studio') doc.documentElement.dataset.look = 'studio';
  else delete doc.documentElement.dataset.look;
}

/** At startup: a `?look=` in the URL wins and is remembered; otherwise the stored look. */
export function applyStartupLook(loc: Pick<Location, 'search'> = location, doc: Document = document): Look {
  const asked = lookFromSearch(loc.search);
  if (asked) setLook(asked, doc);
  else paintLook(storedLook(), doc);
  return asked ?? storedLook();
}

export const isStudio = (doc: Document = document): boolean => doc.documentElement.dataset.look === 'studio';

// ---- React hook (main screens, 2026-11-17) ----

const subscribeLook = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });
  return () => mo.disconnect();
};

/** True while the studio look is on (re-renders when <html data-look> changes). */
export function useStudio(): boolean {
  return useSyncExternalStore(subscribeLook, () => document.documentElement.dataset.look === 'studio', () => false);
}
