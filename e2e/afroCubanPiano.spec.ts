import { expect, test, type Page } from '@playwright/test';

// The cha-cha-chá, mambo and bolero levels of k-montuno (13–20, STYLE-AFROCUBAN §2.5–2.7): every run screen fits one
// phone screen (390×844, English and Hebrew) — no sideways scroll, no vertical scroll during the run.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang }) => {
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
    },
    { lang },
  );
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

const LEVELS = Array.from({ length: 8 }, (_, i) => `k-montuno-${i + 13}`);

for (const lang of ['en', 'he'] as const)
  test(`cha-cha, mambo, bolero: the run screens fit one phone screen (${lang})`, async ({ page }) => {
    test.setTimeout(600_000);
    await seed(page, lang);
    const bad: string[] = [];
    for (const level of LEVELS) {
      await page.goto('about:blank');
      await page.goto(`/?unlock=all&lang=${lang}#/drills`);
      await page.waitForTimeout(800);
      await page.locator('[data-topic="all"]').click();
      await page.waitForTimeout(400);
      await page.locator('[data-family="k-montuno"]').click();
      const card = page.locator(`[data-level="${level}"]`);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
      await page.locator(`[data-level-start="${level}"]`).click();
      await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      await page.waitForTimeout(600);
      const p = await problems(page);
      if (p.length) {
        bad.push(`${level}: ${p.join(', ')}`);
        await page.screenshot({ path: `test-results/afc-${lang}-${level}.png`, fullPage: true });
      }
    }
    expect(bad).toEqual([]);
  });
