import { expect, test, type Page } from '@playwright/test';

// Symmetry unit (2026-11-19) at a 390 px phone, in Hebrew:
// 1. the Tonnetz game: setup and play fit one screen (no vertical or sideways scroll, the move buttons in view), no
//    visible Latin outside <bdi> / dir=ltr; a round played at par with the move buttons reaches the result card;
//    docs/fresh-shots/tonnetz-he.png is the play screen after the first move;
// 2. a P / L / R question (neo-riemann 1) fits one screen; docs/fresh-shots/symmetry-he.png.
// E2E_BASE: point at another dev server (a worktree's own vite).

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear'], activeCourse: 'ear', seenVersion: '9.9.9' };
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
const open = async (page: Page, lang: 'en' | 'he', route: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${route}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(600);
};
const saveRun = (page: Page, data: unknown) =>
  page.evaluate(async (data) => {
    const path = '/src/storage/resume.ts';
    const m = await import(/* @vite-ignore */ path);
    m.saveSlot('game:tonnetz', { title: 'tonnetz', route: 'tonnetz', done: 0, total: 0, data });
  }, data);
const measure = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    const btns = [...document.querySelectorAll('main .btn.mega, main .btn.primary')].filter((b) => (b as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
    const bottom = btns.length ? Math.max(...btns.map((b) => b.getBoundingClientRect().bottom)) : 0;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth, bottom, h: innerHeight };
  });
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, .visually-hidden, [aria-hidden="true"], .sim-banner, .dyn, .tier-chip, title')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, label: string, bad: string[]) => {
  const s = await measure(page);
  if (s.over > 4 || s.side > 1 || (s.bottom && s.bottom > s.h + 1)) bad.push(`${label}: over ${s.over}, side ${s.side}, bottom ${Math.round(s.bottom)}`);
  const l = await latinOutsideBdi(page);
  if (l.length) bad.push(`${label} latin: ${l.join(' | ')}`);
};

test('tonnetz (he): setup and play fit one phone screen, a round at par reaches the result card', async ({ page }) => {
  test.setTimeout(180_000);
  const bad: string[] = [];
  await seed(page, 'he');
  await open(page, 'he', 'tonnetz');
  await expect(page.locator('main[data-game="tonnetz"][data-phase="setup"]')).toBeVisible();
  await check(page, 'setup', bad);
  // the last round of a two-move run (p): the target named and shown
  await saveRun(page, { v: 1, game: 'tonnetz', seed: 7, level: 2, i: 5, moves: [], right: 3, wrong: 2, score: 60 });
  await open(page, 'he', 'tonnetz');
  await page.locator('main .g2-col .btn.mega').first().click();
  await expect(page.locator('main[data-game="tonnetz"][data-phase="play"]')).toBeVisible();
  await page.waitForTimeout(800);
  await check(page, 'play', bad);
  // the shortest chain for this round, from the engine itself
  const chain: string[] = await page.evaluate(async () => {
    const p1 = '/src/engine/tonnetz.ts';
    const p2 = '/src/engine/symmetry.ts';
    const tz = await import(/* @vite-ignore */ p1);
    const sy = await import(/* @vite-ignore */ p2);
    const it = tz.tzItem(7, 2, 5);
    return sy.shortestChains(it.start, it.target)[0];
  });
  expect(chain.length).toBe(2);
  await page.locator(`[data-tz-op="${chain[0]}"]`).click();
  await page.waitForTimeout(700);
  await expect(page.locator('[data-tz-moves]')).toHaveText('1/5');
  await check(page, 'after a move', bad);
  await page.screenshot({ path: 'docs/fresh-shots/tonnetz-he.png' });
  await page.locator(`[data-tz-op="${chain[1]}"]`).click();
  await expect(page.locator('main[data-game="tonnetz"][data-phase="answered"]')).toBeVisible();
  await expect(page.locator('[data-ng-feedback="ok"]')).toBeVisible();
  await check(page, 'answered', bad);
  await expect(page.locator('[data-result-card]')).toBeVisible({ timeout: 6_000 });
  expect(bad, bad.join('\n')).toEqual([]);
});

test('a P / L / R question (he) fits one phone screen', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
    await page.locator('.sheet-backdrop .btn.ghost').first().click();
  });
  await page.goto('/?sim=1&brief=1&lang=he#/topic/neo-riemann/1');
  await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 4000 }).catch(() => {});
  await page.locator('main.lesson').waitFor({ timeout: 15_000 });
  await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const p = await page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const c = document.querySelector('.lesson .stage .controls');
    if (c && c.getBoundingClientRect().height > 0 && c.getBoundingClientRect().bottom > innerHeight + 1) out.push('controls below the fold');
    if (document.querySelector('main.lesson .stage.question')) {
      const over = document.scrollingElement!.scrollHeight - innerHeight;
      if (over > 2) out.push(`taller by ${over}`);
    } else out.push('no question on screen');
    return out;
  });
  await page.screenshot({ path: 'docs/fresh-shots/symmetry-he.png' });
  expect(p).toEqual([]);
});
