// Icon micro-animations (owner-approved 2026-11-16). Three layers, all CSS transforms / opacity on the drawing's parts
// (src/paper-motion.css), all off with reduced motion (the OS setting or the app's own, html[data-motion=reduced]):
//   1. tap: pressing a control that holds an icon plays the icon's signature motion once (installIconTaps(), one
//      document listener: tab bar, Practice tiles, path nodes, game cards, rows, buttons with glyphs). Never on an
//      exercise screen (html[data-icon-motion=off], #/play, Encore runs).
//   2. progress events (playIcon(el, 'event')): a path node unlocking or completed, the streak going up, a badge
//      earned, a phrase becoming "yours" — the same motion, a little larger and longer, with a small pop.
//   3. ambient (useAmbient): only the current path node (breathe) and the home streak flame (flicker), and only while
//      on screen.
// The motions themselves are data: parts tagged with an(...) in the art files (kit.ts: Anim). Untagged: "lift".
import { useEffect, type RefObject } from 'react';
import type { Anim, Art, Cut } from './kit';
import { autoNod } from './Paper';

/** The vocabulary with each motion's length (ms, before the 80 ms stagger steps). Mirrors src/paper-motion.css. */
export const MOTION_MS: Record<Anim | 'lift', number> = {
  vibrate: 620,
  'vibrate-x': 620,
  swing: 900,
  flicker: 800,
  rise: 900,
  pulse: 700,
  spin: 900,
  turn: 700,
  press: 450,
  strike: 600,
  dip: 600,
  wave: 900,
  loop: 900,
  nod: 650,
  hop: 550,
  slide: 700,
  lift: 650,
};
/** Longest tap play (motion + the largest stagger) and the event's (× 1.3): the play classes clear after these. */
export const TAP_MS = 1400;
export const EVENT_MS = 1900;

/** The motions an icon plays, in the order they appear; ['lift'] when nothing is tagged (at this cut). */
export function motionsOf(art: Art, cut: Cut = 'badge'): (Anim | 'lift')[] {
  const maxLod = cut === 'small' ? 0 : cut === 'full' ? 1 : 2;
  const ks = [...new Set(art.parts.filter((p) => p.m && !p.m.fx && (p.lod ?? 0) <= maxLod).map((p) => p.m!.k))];
  const fx = [...new Set(art.parts.filter((p) => p.m?.fx && (p.lod ?? 0) <= maxLod).map((p) => p.m!.k))];
  // Untagged: the sheets lift, and the motif note head (if any) nods.
  return ks.length ? [...ks, ...fx.filter((k) => !ks.includes(k))] : autoNod(art, cut) >= 0 ? ['lift', 'nod'] : ['lift'];
}

/** False with reduced motion (OS or the app's setting) or without a DOM. */
export function motionAllowed(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.dataset.motion === 'reduced') return false;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

/**
 * The screens where a tap animates its icon (App sets html[data-icon-motion]): the tabs, hubs, lists and libraries.
 * Every other route is an exercise, a game or a tool in use — no icon motion there.
 */
export const ICON_MOTION_ROUTES: ReadonlySet<string> = new Set([
  'home', 'path', 'arcade', 'skills', 'friends', 'achievements', 'games', 'drills', 'insights', 'exams', 'plans', 'recordings', 'encore', 'challenges',
  'classes', 'learned', 'repertoire', 'pieces', 'songs', 'teach', 'diary', 'settings', 'workout', 'online', 'duel',
]);
/** Exercise screens never animate icons: lessons and games run on #/play; Encore's run / record / capture screens. */
const EXERCISE_HASH = /^#\/?(play|encore\/(run|record|caught|new|context))(\/|$|\?)/;
/** Taps animate icons outside exercises only: App marks the screen (html[data-icon-motion]); a region can opt out. */
export function tapAllowed(host?: Element | null): boolean {
  if (!motionAllowed()) return false;
  if (document.documentElement.dataset.iconMotion === 'off') return false;
  if (typeof location !== 'undefined' && EXERCISE_HASH.test(location.hash)) return false;
  if (host?.closest('[data-icon-motion="off"], main.lesson')) return false;
  return true;
}

/** What plays: Paper icons, badge medals, the streak flame. */
export const ICON_SEL = 'svg.pp, svg.badge-art, svg.flame';
const timers = new WeakMap<Element, number>();

function onScreen(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < (window.innerHeight || 0) && r.left < (window.innerWidth || 0);
}

/**
 * Play the icon(s) in `target` once: 'tap' (the signature motion) or 'event' (larger, longer, with a pop). An event on
 * an element without an icon pops the element itself. Off-screen icons do not play. Returns what played.
 */
export function playIcon(target: Element | null | undefined, kind: 'tap' | 'event' = 'tap'): Element[] {
  if (!target || !motionAllowed()) return [];
  const icons = target.matches(ICON_SEL) ? [target] : Array.from(target.querySelectorAll(ICON_SEL)).slice(0, 2);
  const list = (icons.length ? icons : kind === 'event' ? [target] : []).filter(onScreen);
  for (const el of list) {
    el.classList.remove('pp-play', 'pp-ev');
    // Restart: a second tap mid-motion begins again.
    void el.getBoundingClientRect();
    el.classList.add('pp-play');
    if (kind === 'event') el.classList.add('pp-ev');
    const prev = timers.get(el);
    if (prev) window.clearTimeout(prev);
    timers.set(
      el,
      window.setTimeout(() => {
        el.classList.remove('pp-play', 'pp-ev');
        timers.delete(el);
      }, kind === 'event' ? EVENT_MS : TAP_MS),
    );
  }
  return list;
}

/** The controls whose icon plays when pressed. */
const HOST = 'button, a[href], [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="option"], summary, label, .pt-tile, .node-btn';
let installed = false;
/** One document listener for the whole app (main.tsx): press a control → its icon plays. */
export function installIconTaps(doc: Document = document) {
  if (installed) return;
  installed = true;
  const fire = (t: EventTarget | null) => {
    const host = (t as Element | null)?.closest?.(HOST);
    if (!host || (host as HTMLButtonElement).disabled || host.getAttribute('aria-disabled') === 'true') return;
    if (!tapAllowed(host)) return;
    playIcon(host, 'tap');
  };
  doc.addEventListener('pointerdown', (e) => (e.button ? undefined : fire(e.target)), { capture: true, passive: true });
  doc.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ' ? fire(e.target) : undefined), { capture: true, passive: true });
}

/** The only two ambient motions, and where they live (tests/iconMotion.test.ts holds the list). */
export type Ambient = 'breathe' | 'flicker';
/**
 * Ambient motion on `ref` (data-amb) while it is on screen and `active`; re-checked when `dep` changes. Only the current
 * path node (Path.tsx) and the home streak flame (Streak.tsx) use it.
 */
export function useAmbient(ref: RefObject<Element | null>, kind: Ambient, active: boolean, dep?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active || !motionAllowed() || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.setAttribute('data-amb', kind) : el.removeAttribute('data-amb')));
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-amb');
    };
  }, [ref, kind, active, dep]);
}

/** Play an event once after `delay` ms when `dep` changes (a badge revealed, the streak counted up, a phrase made yours). */
export function usePlayOnMount(ref: RefObject<Element | null>, delay: number, dep?: unknown, active = true) {
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => playIcon(ref.current, 'event'), delay);
    return () => window.clearTimeout(id);
  }, [ref, delay, dep, active]);
}

const SEEN_KEY = 'tt-path-node-seen';
/**
 * Path nodes that unlocked or were completed since the road was last shown play their motion once (event). The last
 * seen state of every node is kept on the device; the first visit only records.
 */
export function usePathNodeEvents(road: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const el = road.current;
    if (!el) return;
    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') ?? {};
    } catch {
      seen = {};
    }
    const first = Object.keys(seen).length === 0;
    const play: Element[] = [];
    el.querySelectorAll<HTMLElement>('.node[data-step]').forEach((n) => {
      const id = n.dataset.step!;
      const now = n.dataset.nodeState ?? 'open';
      const was = seen[id];
      if (!first && was && was !== now && nodeEvent(was, now)) play.push(n.querySelector('.node-disc, .node-bar') ?? n);
      seen[id] = now;
    });
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      /* private mode */
    }
    if (!play.length) return;
    // After the road glided to the current step.
    const id = window.setTimeout(() => play.slice(0, 3).forEach((n) => playIcon(n, 'event')), 700);
    return () => window.clearTimeout(id);
  }, [road, key]);
}
/** A node's state change that is a progress event: unlocked, or completed / mastered. */
export const nodeEvent = (was: string, now: string) =>
  (was === 'locked' && now !== 'locked') || ((was === 'open' || was === 'locked') && (now === 'opened' || now === 'mastered')) || (was === 'opened' && now === 'mastered');
