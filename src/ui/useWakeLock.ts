// Keep the screen on while the app is open (owner feedback 2026-11-18): a practicing musician's phone sits on a stand,
// hands busy. Screen Wake Lock API (Chrome/Edge/Android, Safari 16.4+); the browser drops the lock whenever the tab
// is hidden, so it is taken again each time the app comes back. Where the API is missing this does nothing.
import { useEffect } from 'react';

type Sentinel = { release: () => Promise<void>; released?: boolean };
type WakeNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };

export function useWakeLock(on: boolean): void {
  useEffect(() => {
    const wl = (navigator as WakeNav).wakeLock;
    if (!on || !wl) return;
    let lock: Sentinel | null = null;
    let alive = true;
    const take = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const l = await wl.request('screen');
        if (alive) lock = l;
        else void l.release();
      } catch {
        /* refused (battery saver, no user gesture yet): try again on the next visit or tap */
      }
    };
    void take();
    const onVis = () => void take();
    document.addEventListener('visibilitychange', onVis);
    // Some browsers refuse before the first user gesture: one tap anywhere retries.
    document.addEventListener('pointerdown', onVis, { passive: true });
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('pointerdown', onVis);
      void lock?.release().catch(() => {});
    };
  }, [on]);
}
