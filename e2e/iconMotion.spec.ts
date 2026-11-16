import { expect, test, type Locator, type Page } from '@playwright/test';

// Icon micro-animations (owner-approved 2026-11-16): a tap on a tab / Practice tile / path node plays the icon's motion
// (the class applies and clears), reduced motion plays nothing, the gallery plays (and records ~12 motions into
// docs/icon-shots/anim/), exercise screens run no icon animation, the two ambient motions run only where allowed, and
// nothing changes size at 320×720 in English and Hebrew.
test.use({ viewport: { width: 320, height: 720 } });

const put = async (page: Page, lang: 'en' | 'he') => {
  await page.evaluate(async (lang) => {
    const iso = new Date().toISOString();
    // three practised days, today included: the streak is lit
    const day = (back: number) => {
      const d = new Date(Date.now() - back * 86400000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const stats = { days: [day(2), day(1), day(0)], goodSessions: 0, xpByDay: {} };
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], stats, review: [], drillItems: {} };
    const settings = {
      version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', miniLessons: false,
      intake: { v: 1, at: iso, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: true, noMic: true },
      noSing: true, noMic: true, courses: ['ear'], activeCourse: 'ear', drillStart: {},
    };
    await new Promise((res, rej) => {
      const r = indexedDB.open('toneturn', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        const tx = r.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(progress, 'progress');
        tx.objectStore('kv').put(settings, 'settings');
        tx.oncomplete = res;
        tx.onerror = rej;
      };
      r.onerror = rej;
    });
  }, lang);
};
/** Running animations on the icon parts inside `root` (CSS animations of .pa groups, sheets, flames). */
const running = (loc: Locator) => loc.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
/** Every running animation on the page that belongs to an icon. */
const iconAnims = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName)
        .filter((n) => /^(pa-|pp-|fl-)/.test(n)).length,
  );
/** The layout box (transforms excluded): the icon's own size and its HTML parent's. */
const box = (loc: Locator) =>
  loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    const p = el.parentElement!;
    return [cs.width, cs.height, p.offsetWidth, p.offsetHeight, p.offsetLeft, p.offsetTop].join(' ');
  });
const pageSize = (page: Page) => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);

test('gallery: a tap plays the motion and clears; play all; every motion runs', async ({ page }) => {
  await page.goto('/#/dev/glyphs?sec=motion');
  await expect(page.locator('[data-ready]')).toBeVisible();
  const cell = page.locator('.pg-mcell[data-glyph="tempo"]');
  const svg = cell.locator('svg.pp');
  await cell.click();
  await expect(svg).toHaveClass(/pp-play/);
  expect(await running(svg)).toBeGreaterThan(0);
  await expect(svg).not.toHaveClass(/pp-play/, { timeout: 3000 });
  // play all: every cell on screen plays
  await page.locator('[data-play-all]').click();
  await expect(page.locator('.pg-motion svg.pp-play').first()).toBeVisible();
  expect(await page.locator('.pg-motion svg.pp-play').count()).toBeGreaterThan(6);
  await page.locator('[data-play-all]').click();
  // the two ambient demos run
  expect(await iconAnims(page)).toBeGreaterThan(0);
});

// The review recordings: the motion set (18 icons + the flame) as a WebM (light), and frames of every motion paused
// at fixed times (all cells play together, then the Web Animations clock is set) — docs/icon-shots/anim/.
for (const theme of ['light', 'dark'] as const)
  test(`gallery recording ${theme}`, async ({ browser }) => {
    const OUT = 'docs/icon-shots/anim';
    const ctx = await browser.newContext({ viewport: { width: 760, height: 620 }, colorScheme: theme, ...(theme === 'light' ? { recordVideo: { dir: 'test-results/anim-video', size: { width: 760, height: 620 } } } : {}) });
    const page = await ctx.newPage();
    await page.goto(`/#/dev/glyphs?sec=motion&theme=${theme}`);
    await expect(page.locator('[data-ready]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.querySelector('.pg-motion')!.scrollIntoView());
    const cells = page.locator('.pg-mcell');
    const n = await cells.count();
    // one after another (tap motion), then all together as events
    for (let i = 0; i < n; i++) {
      await cells.nth(i).click();
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(800);
    await page.locator('[data-play-event]').click();
    for (let i = 0; i < n; i++) {
      await cells.nth(i).click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    await page.locator('[data-play-event]').click();
    // frames: everything starts together and is paused at t
    for (const t of [0, 120, 240, 360, 520, 700]) {
      await page.evaluate((t) => {
        document.querySelectorAll('.pg-motion svg').forEach((s) => s.classList.remove('pp-play', 'pp-ev'));
        void document.body.offsetWidth;
        document.querySelectorAll('.pg-motion svg.pp, .pg-motion svg.flame').forEach((s) => s.classList.add('pp-play'));
        for (const a of document.getAnimations()) {
          const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
          if (!el?.closest('.pg-motion')) continue;
          a.pause();
          a.currentTime = t;
        }
      }, t);
      if (theme === 'light' || t === 240) await page.locator('.pg-motion').screenshot({ path: `${OUT}/frames-${theme}-t${String(t).padStart(3, '0')}.png` });
    }
    const video = page.video();
    await ctx.close();
    if (video) await video.saveAs(`${OUT}/motions-${theme}.webm`);
  });

test('reduced motion: taps and events add nothing, nothing runs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/dev/glyphs?sec=motion');
  await expect(page.locator('[data-ready]')).toBeVisible();
  const cell = page.locator('.pg-mcell[data-glyph="tempo"]');
  await cell.click();
  await expect(cell.locator('svg.pp')).not.toHaveClass(/pp-play/);
  await page.locator('[data-play-all]').click();
  await page.waitForTimeout(300);
  expect(await page.locator('svg.pp-play').count()).toBe(0);
  expect(await iconAnims(page)).toBe(0);
});

for (const lang of ['en', 'he'] as const)
  test(`app ${lang}: tab, tile and path node taps play and clear; ambient only on the now node and the home flame; size unchanged`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/manifest.webmanifest');
    await put(page, lang);
    await page.goto(`/?lang=${lang}#/`);
    const tabs = page.locator('nav.tabbar');
    await expect(tabs).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.iconMotion)).toBe('on');

    // home: the lit streak flame flickers (ambient)
    await expect(page.locator('.streak-chip[data-amb="flicker"]')).toHaveCount(1);
    const size0 = await pageSize(page);
    const tabIcon = tabs.locator('[data-tab="skills"] svg.pp');
    const tabBox = await box(tabIcon);
    await tabs.locator('[data-tab="skills"]').dispatchEvent('pointerdown');
    await expect(tabIcon).toHaveClass(/pp-play/);
    expect(await running(tabIcon)).toBeGreaterThan(0);
    expect(await box(tabIcon)).toEqual(tabBox);
    expect(await pageSize(page)).toEqual(size0);
    await expect(tabIcon).not.toHaveClass(/pp-play/, { timeout: 3000 });

    // a real tap on a tab: the new tab's icon plays
    await tabs.locator('[data-tab="arcade"]').click();
    await expect(tabs.locator('[data-tab="arcade"] svg.pp')).toHaveClass(/pp-play/);
    // Practice tiles
    const tile = page.locator('.pt-tile').first();
    await expect(tile).toBeVisible();
    const tileIcon = tile.locator('svg').first();
    const tb = await box(tileIcon);
    await tile.dispatchEvent('pointerdown');
    await expect(tileIcon).toHaveClass(/pp-play/);
    expect(await box(tileIcon)).toEqual(tb);
    await expect(tileIcon).not.toHaveClass(/pp-play/, { timeout: 3000 });
    // no ambient outside the two places
    await expect(page.locator('[data-amb]')).toHaveCount(0);

    // Path: the current node breathes; a tap on a node plays its icon
    await tabs.locator('[data-tab="path"]').click();
    const cur = page.locator('.road .node.current');
    await expect(cur).toBeVisible();
    await expect(cur).toHaveAttribute('data-amb', 'breathe');
    expect(await page.locator('[data-amb]').count()).toBe(1);
    const nodeIcon = cur.locator('.node-disc svg').first();
    const nb = await box(nodeIcon);
    await cur.locator('.node-btn').dispatchEvent('pointerdown');
    await expect(nodeIcon).toHaveClass(/pp-play/);
    expect(await box(nodeIcon)).toEqual(nb);
    await expect(nodeIcon).not.toHaveClass(/pp-play/, { timeout: 3000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (lang === 'en') await page.screenshot({ path: `docs/icon-shots/anim/app-path-${lang}.png` });

    // progress event: the current step was locked when the road was last shown → it plays once (event) on arrival
    const id = await cur.getAttribute('data-step');
    await page.evaluate((id) => {
      const seen = JSON.parse(localStorage.getItem('tt-path-node-seen') ?? '{}');
      seen[id!] = 'locked';
      localStorage.setItem('tt-path-node-seen', JSON.stringify(seen));
    }, id);
    await page.reload();
    await expect(page.locator('.road .node.current .node-disc svg.pp-ev')).toHaveCount(1, { timeout: 5000 });
    expect(await page.evaluate((id) => JSON.parse(localStorage.getItem('tt-path-node-seen') ?? '{}')[id!], id)).toBe('open');

    // into the exercise: no icon animation at all
    await cur.locator('.node-btn').click();
    const play = page.locator('[data-brief-play], .brief-play, button.mega').first();
    if (await play.isVisible().catch(() => false)) await play.click();
    await page.waitForFunction(() => document.documentElement.dataset.iconMotion === 'off', null, { timeout: 15000 });
    await page.waitForTimeout(400);
    const btn = page.locator('main button:has(svg)').first();
    if (await btn.count()) await btn.dispatchEvent('pointerdown');
    expect(await page.locator('.pp-play').count()).toBe(0);
    expect(await iconAnims(page)).toBe(0);
    expect(errors).toEqual([]);
  });
