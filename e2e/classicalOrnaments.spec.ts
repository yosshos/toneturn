import { expect, test, type Page } from '@playwright/test';

// 0.98: the classical tier grades 2–8 (k-classic 3, 5, 7–9) and ornament signs (k-read 12, the Minuet): every run
// screen fits one phone screen (320×720, English and Hebrew) with the score paged, and the ornament signs are drawn on
// the staff (VexFlow's g.vf-ornament) with the legend line under it, inside the screen.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async ({ lang }) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', drills };
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
  }, { lang });
};
const problems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`wide ${document.documentElement.scrollWidth}`);
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (over > 2) out.push(`taller by ${over}`);
    return out;
  });
/** Ornament signs drawn on the staff now, inside the screen. */
const signsOnScreen = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.drill-staff g.vf-ornament')].filter((g) => {
      const r = g.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight;
    }).length,
  );

const open = async (page: Page, lang: 'en' | 'he', family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.waitForTimeout(800);
  await page.locator('[data-topic="all"]').click();
  await page.waitForTimeout(400);
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
  const card = page.locator(`[data-level="${level}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await page.waitForTimeout(700);
};

for (const lang of ['en', 'he'] as const) {
  test(`classical grades 2–8: run screens fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(600_000);
    await seed(page, lang);
    const bad: string[] = [];
    for (const level of ['k-classic-3', 'k-classic-5', 'k-classic-6', 'k-classic-7', 'k-classic-8', 'k-classic-9']) {
      await open(page, lang, 'k-classic', level);
      await expect(page.locator('.drill-staff svg').first()).toBeVisible();
      const p = await problems(page);
      // page through the score: every page fits too
      for (let k = 0; k < 12; k++) {
        const next = page.getByRole('button', { name: 'Next lines' });
        if (!(await next.count()) || (await next.first().isDisabled())) break;
        await next.first().click();
        await page.waitForTimeout(250);
        p.push(...(await problems(page)));
      }
      if (p.length) {
        bad.push(`${level}: ${[...new Set(p)].join(', ')}`);
        await page.screenshot({ path: `test-results/cl-${lang}-${level}.png`, fullPage: true });
      }
    }
    expect(bad).toEqual([]);
  });

  test(`ornament signs on the staff with the legend: k-read 12 and the Minuet (${lang})`, async ({ page }) => {
    test.setTimeout(600_000);
    await seed(page, lang);
    for (const [family, level] of [
      ['k-read', 'k-read-12'],
      ['k-classic', 'k-classic-2'],
    ] as const) {
      await open(page, lang, family, level);
      const legend = page.locator('[data-orn-legend]');
      await expect(legend).toBeVisible();
      expect(await legend.evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      // page until a sign is on the screen (the Minuet's first mordent is in bar 3)
      let seen = await signsOnScreen(page);
      for (let k = 0; k < 8 && !seen; k++) {
        const next = page.getByRole('button', { name: 'Next lines' });
        if (!(await next.count()) || (await next.first().isDisabled())) break;
        await next.first().click();
        await page.waitForTimeout(300);
        seen = await signsOnScreen(page);
      }
      expect(seen, level).toBeGreaterThan(0);
      expect(await problems(page), level).toEqual([]);
      await page.screenshot({ path: `test-results/orn-${lang}-${level}.png` });
    }
  });
}
