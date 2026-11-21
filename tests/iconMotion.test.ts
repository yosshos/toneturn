// Icon micro-animations (owner-approved 2026-11-16): every icon resolves a motion (its own or the default lift), the
// motion data renders as classes only, every motion has its keyframes behind the reduced-motion guard, reduced motion
// plays nothing, exercises get no tap motion, and the ambient motion lives in its two places only.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BADGES } from '../src/engine/badges';
import { glyphKeyOf } from '../src/ui/BadgeArt';
import { PAPER } from '../src/ui/paper';
import { navArt } from '../src/ui/paper/art-core';
import { badgePaper, BADGE_ONLY } from '../src/ui/paper/art-badge';
import type { Anim, Art } from '../src/ui/paper/kit';
import { ICON_MOTION_ROUTES, MOTION_MS, motionsOf, nodeEvent, playIcon, tapAllowed } from '../src/ui/paper/motion';
import { hasMotion, PaperSvg } from '../src/ui/paper/Paper';

const NAV = ['home', 'path', 'arcade', 'skills', 'friends', 'tools', 'achievements'];
const ALL: [string, Art][] = [...Object.entries(PAPER), ...Object.entries(BADGE_ONLY), ...NAV.map((id) => [`nav:${id}`, navArt(id, 16)!] as [string, Art])];
const CSS = readFileSync('src/paper-motion.css', 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)); // CRLF checkouts (Windows)
const VOCAB = Object.keys(MOTION_MS) as (Anim | 'lift')[];

describe('icon motion data', () => {
  it('every icon resolves a motion of the vocabulary (its own, or the default lift)', () => {
    let own = 0;
    let nod = 0;
    for (const [k, a] of ALL) {
      const ms = motionsOf(a);
      expect(ms.length, k).toBeGreaterThan(0);
      for (const m of ms) expect(VOCAB, `${k}: ${m}`).toContain(m);
      if (ms[0] !== 'lift') own++;
      else if (ms.includes('nod')) nod++;
    }
    // the default lift carries the motif's nod wherever a drawing has the tilted accent head (every music mark)
    expect(own + nod).toBeGreaterThan(ALL.length * 0.85);
    for (const b of BADGES) expect(motionsOf(badgePaper(glyphKeyOf(b))!).length, b.id).toBeGreaterThan(0);
    // The signature set: the courses, the nav and the shared tools carry their own motion.
    for (const k of ['keys', 'guitar', 'bass', 'drums', 'sing', 'ear', 'jazz', 'encore', 'fire', 'tempo', 'tune', 'record', 'echo', 'drone', 'mixer', 'slow'])
      expect(motionsOf(PAPER[k])[0], k).not.toBe('lift');
    for (const id of ['path', 'arcade', 'tools', 'achievements']) expect(motionsOf(navArt(id)!)[0], id).not.toBe('lift');
    expect(own).toBeGreaterThan(100);
  });

  it('the signature motions are the ones asked for', () => {
    expect(motionsOf(PAPER.guitar)).toContain('vibrate');
    expect(motionsOf(PAPER.bass)).toContain('vibrate-x');
    expect(motionsOf(PAPER.fire)).toContain('flicker');
    expect(motionsOf(PAPER.sing)).toEqual(expect.arrayContaining(['pulse', 'rise']));
    expect(motionsOf(PAPER.tempo)).toContain('swing');
    expect(motionsOf(PAPER.ear)).toContain('pulse');
    expect(motionsOf(PAPER.drums)).toEqual(expect.arrayContaining(['strike', 'dip']));
    expect(motionsOf(PAPER.keys)).toContain('press');
    expect(motionsOf(PAPER.record)).toContain('spin');
    expect(motionsOf(PAPER.encore)).toContain('loop');
    expect(motionsOf(navArt('path')!)).toContain('wave');
  });

  it('origins sit on the grid, stagger steps are small, fx parts are only seen while playing', () => {
    for (const [k, a] of ALL)
      for (const p of a.parts) {
        if (!p.m) continue;
        if (p.m.o) for (const v of p.m.o) expect(v, k).toBeGreaterThanOrEqual(0), expect(v, k).toBeLessThanOrEqual(48);
        expect(p.m.d ?? 0, k).toBeLessThanOrEqual(5);
      }
    const html = renderToStaticMarkup(h(PaperSvg, { art: PAPER.sing, cut: 'full' }));
    expect(html).toContain('pa pa-rise');
    expect(html).toMatch(/class="pa pa-rise[^"]*pa-fx/);
    expect(CSS).toMatch(/\.pa-fx\s*\{\s*opacity:\s*0;/);
  });

  it('renders motion as classes and origin attributes only (no inline motion styles); untagged icons lift', () => {
    for (const [k, a] of ALL)
      for (const cut of ['small', 'full', 'badge'] as const) {
        const html = renderToStaticMarkup(h(PaperSvg, { art: a, cut }));
        const body = html.replace(/^<svg[^>]*>/, '');
        for (const m of body.matchAll(/style="([^"]*)"/g)) expect(m[1], k).toMatch(/^(fill|stroke):var\(/);
        if (hasMotion(a, cut)) expect(html, `${k} ${cut}`).toMatch(/class="pa pa-/);
        else expect(html, `${k} ${cut}`).toMatch(/^<svg class="pp pp-\w+ pm-lift/);
        for (const o of body.matchAll(/transform-origin="([^"]*)"/g)) expect(o[1], k).toMatch(/^-?[\d.]+ -?[\d.]+$/);
      }
  });
});

describe('icon motion styles', () => {
  it('every motion has its class rule and keyframes', () => {
    for (const m of VOCAB) {
      expect(CSS, m).toContain(`@keyframes pa-${m} {`);
      if (m !== 'lift') expect(CSS, m).toMatch(new RegExp(`\\.pp-play \\.pa-${m} \\{[^}]*animation-name: pa-${m};`));
    }
  });

  it('only transform and opacity move; everything plays only without reduced motion', () => {
    for (const kf of CSS.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g))
      for (const decl of kf[1].matchAll(/([a-z-]+):/g)) expect(['transform', 'opacity', 'translate', 'scale'], decl[1]).toContain(decl[1]);
    // every `animation` declaration is inside the no-preference block and not under data-motion=reduced
    const guard = CSS.indexOf('@media (prefers-reduced-motion: no-preference) {');
    const end = CSS.indexOf('\n}\n', guard);
    expect(guard).toBeGreaterThan(0);
    for (const m of CSS.matchAll(/\banimation(-name)?:/g)) expect(m.index! > guard && m.index! < end, `animation at ${m.index}`).toBe(true);
    for (const sel of CSS.slice(guard, end).matchAll(/^\s+(html[^{]*)\{/gm)) expect(sel[1], sel[1]).toContain("html:not([data-motion='reduced'])");
  });

  it('ambient motion lives in two places only: the current path node and the home streak flame', () => {
    const amb = [...CSS.matchAll(/\[data-amb='(\w+)'\]/g)].map((m) => m[1]);
    expect(new Set(amb)).toEqual(new Set(['breathe', 'flicker']));
    const users: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && /\buseAmbient\(/.test(readFileSync(p, 'utf8')) && !/paper[\\/]motion\.ts$/.test(p)) users.push(p.replace(/\\/g, '/'));
      }
    };
    walk('src');
    expect(users.sort()).toEqual(['src/ui/Path.tsx', 'src/ui/Streak.tsx', 'src/ui/paper/Gallery.tsx']);
    // the streak flame only flickers on the home screen (TopBar home → StreakChip home)
    expect(readFileSync('src/ui/Home.tsx', 'utf8')).toMatch(/<TopBar [^>]*\bhome\b[^>]*\/>/);
    expect(readFileSync('src/ui/App.tsx', 'utf8')).not.toMatch(/<TopBar [^>]*\bhome\b/);
  });
});

// ------------------------------------------------------------------ a tiny DOM for playIcon / tapAllowed
class El {
  cls = new Set<string>();
  attrs: Record<string, string> = {};
  kids: El[] = [];
  parent: El | null = null;
  constructor(public tag: string, classes: string[] = []) {
    classes.forEach((c) => this.cls.add(c));
  }
  classList = {
    add: (...c: string[]) => c.forEach((x) => this.cls.add(x)),
    remove: (...c: string[]) => c.forEach((x) => this.cls.delete(x)),
    contains: (c: string) => this.cls.has(c),
  };
  add(k: El) {
    k.parent = this;
    this.kids.push(k);
    return this;
  }
  is(sel: string) {
    return sel.split(',').some((s) => {
      const [tag, ...cs] = s.trim().split('.');
      return (!tag || tag === this.tag) && cs.every((c) => this.cls.has(c));
    });
  }
  matches(sel: string) {
    return this.is(sel);
  }
  querySelectorAll(sel: string): El[] {
    return this.kids.flatMap((k) => [...(k.is(sel) ? [k] : []), ...k.querySelectorAll(sel)]);
  }
  closest(sel: string): El | null {
    if (sel.includes('data-icon-motion') || sel.includes('main.lesson')) {
      let e: El | null = this;
      while (e) {
        if (e.attrs['data-icon-motion'] === 'off' || (e.tag === 'main' && e.cls.has('lesson'))) return e;
        e = e.parent;
      }
      return null;
    }
    return this.is(sel) ? this : this.parent?.closest(sel) ?? null;
  }
  getAttribute(n: string) {
    return this.attrs[n] ?? null;
  }
  getBoundingClientRect() {
    return { width: 40, height: 40, top: 10, left: 10, bottom: 50, right: 50 };
  }
}
const g = globalThis as unknown as Record<string, unknown>;
let reduce = false;
beforeEach(() => {
  reduce = false;
  g.document = { documentElement: { dataset: {} as Record<string, string> } };
  g.matchMedia = (q: string) => ({ matches: q.includes('reduce') && reduce });
  g.location = { hash: '#/path' };
  g.window = { innerWidth: 400, innerHeight: 800, setTimeout: (f: () => void, ms: number) => setTimeout(f, ms), clearTimeout: (id: number) => clearTimeout(id) };
});
afterEach(() => {
  for (const k of ['document', 'matchMedia', 'location', 'window']) delete g[k];
});
const tile = () => {
  const btn = new El('button', ['pt-tile']);
  const icon = new El('svg', ['pp', 'pp-full']);
  btn.add(new El('span', ['pt-icon']).add(icon));
  return { btn, icon };
};
const html = () => (g.document as { documentElement: { dataset: Record<string, string> } }).documentElement;

describe('playing', () => {
  it('a tap on a tile plays its icon and the class clears', async () => {
    const { btn, icon } = tile();
    expect(playIcon(btn as unknown as Element, 'tap')).toHaveLength(1);
    expect(icon.cls.has('pp-play')).toBe(true);
    expect(icon.cls.has('pp-ev')).toBe(false);
    playIcon(btn as unknown as Element, 'event');
    expect(icon.cls.has('pp-ev')).toBe(true);
  });

  it('reduced motion (OS or the app setting) adds no animation classes', () => {
    const { btn, icon } = tile();
    reduce = true;
    expect(playIcon(btn as unknown as Element, 'tap')).toEqual([]);
    expect(playIcon(btn as unknown as Element, 'event')).toEqual([]);
    expect(icon.cls.has('pp-play')).toBe(false);
    reduce = false;
    html().dataset.motion = 'reduced';
    expect(playIcon(btn as unknown as Element, 'event')).toEqual([]);
    expect(icon.cls.size).toBe(2);
    expect(tapAllowed(btn as unknown as Element)).toBe(false);
  });

  it('no tap motion in exercises: off screens, #/play, Encore runs, lesson regions', () => {
    const { btn } = tile();
    expect(tapAllowed(btn as unknown as Element)).toBe(true);
    html().dataset.iconMotion = 'off';
    expect(tapAllowed(btn as unknown as Element)).toBe(false);
    html().dataset.iconMotion = 'on';
    (g.location as { hash: string }).hash = '#/play';
    expect(tapAllowed(btn as unknown as Element)).toBe(false);
    (g.location as { hash: string }).hash = '#/encore/run/abc/0';
    expect(tapAllowed(btn as unknown as Element)).toBe(false);
    (g.location as { hash: string }).hash = '#/encore';
    expect(tapAllowed(btn as unknown as Element)).toBe(true);
    const lesson = new El('main', ['lesson']).add(btn);
    expect(lesson.kids).toHaveLength(1);
    expect(tapAllowed(btn as unknown as Element)).toBe(false);
    // the screen list: tabs and hubs on, exercises off
    for (const r of ['home', 'path', 'arcade', 'skills', 'friends']) expect(ICON_MOTION_ROUTES.has(r), r).toBe(true);
    for (const r of ['lesson', 'game', 'duelplay', 'rush-chord', 'tuner', 'metronome', 'kitread', 'workoutrun']) expect(ICON_MOTION_ROUTES.has(r), r).toBe(false);
  });

  it('path node events: unlocked or completed, never on the first visit', () => {
    expect(nodeEvent('locked', 'open')).toBe(true);
    expect(nodeEvent('open', 'opened')).toBe(true);
    expect(nodeEvent('opened', 'mastered')).toBe(true);
    expect(nodeEvent('open', 'open')).toBe(false);
    expect(nodeEvent('mastered', 'faded')).toBe(false);
  });
});
