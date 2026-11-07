// Light motion (product owner, 0.38: "make the app feel alive — in measure, not overdone").
//   · screen transitions: tab → tab slides the way you move along the tab bar; other screens rise in
//   · cards rise in once as they scroll into view, lightly staggered
// Short (≤ 300 ms), small (≤ 16 px), once per screen, never during a question; off with reduced motion.
// Uses data attributes only (React never rewrites them), so a re-render can't strand a card invisible.

import { useEffect, useRef } from 'react';
import { TAB_ROUTES, type TabId } from './Arcade';

const REVEAL = [
  '.mission-card',
  '.wk-card',
  '.player-strip',
  '.warmup-card',
  '.home-section',
  '.domain-tile',
  '.tool-card',
  '.play-card',
  '.play-hero',
  '.live-card',
  '.set-card',
  '.ps-card',
  '.stats-card',
  '.award-card',
  '.later-section',
  '.topic-group',
  '.recap-card',
].join(',');

const reduced = () => document.documentElement.dataset.motion === 'reduced';

export function useMotion(route: string) {
  const prev = useRef(route);
  useEffect(() => {
    const html = document.documentElement;
    const a = TAB_ROUTES.indexOf(prev.current as TabId);
    const b = TAB_ROUTES.indexOf(route as TabId);
    html.dataset.nav = a >= 0 && b >= 0 ? (b > a ? 'fwd' : b < a ? 'back' : 'same') : 'up';
    prev.current = route;
    if (reduced() || route === 'lesson' || route === 'game' || typeof IntersectionObserver === 'undefined') return;
    let io: IntersectionObserver | null = null;
    const raf = requestAnimationFrame(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(`main :is(${REVEAL})`)).filter((el) => !el.dataset.rv);
      let k = 0;
      io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            // Stagger only what appears together (at most 6 steps of 45 ms).
            el.style.setProperty('--rv-delay', `${Math.min(k++, 6) * 45}ms`);
            el.dataset.rv = '1';
            io?.unobserve(el);
            window.setTimeout(() => (k = Math.max(0, k - 1)), 120);
          }),
        { rootMargin: '0px 0px -6% 0px' },
      );
      for (const el of els) {
        el.dataset.rv = '0';
        io.observe(el);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      // Anything still waiting shows at once (never leave a card hidden).
      document.querySelectorAll<HTMLElement>('[data-rv="0"]').forEach((el) => (el.dataset.rv = '1'));
    };
  }, [route]);
}
