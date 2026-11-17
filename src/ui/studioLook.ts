// The "studio" look switch (redesign 2026-11-17): <html data-look="studio"> turns on src/studio.css and
// src/studio-games.css. Until the settings switch lands, `?look=studio` (or `?look=classic`) sets it and the choice is
// remembered on this device. A look already set by someone else (e.g. index.html) is left alone.
const KEY = 'toneturn.look';

export function installLook(): void {
  const root = document.documentElement;
  let pick: string | null = null;
  try {
    pick = new URLSearchParams(location.search).get('look');
    if (pick) localStorage.setItem(KEY, pick);
    else pick = localStorage.getItem(KEY);
  } catch {
    /* storage blocked: the query alone decides */
  }
  if (pick === 'studio' && !root.dataset.look) root.dataset.look = 'studio';
  if (pick === 'classic' && root.dataset.look === 'studio') delete root.dataset.look;
}

/** The studio look is on (read at render; the attribute is set before the first render). */
export const isStudio = (): boolean => typeof document !== 'undefined' && document.documentElement.dataset.look === 'studio';
