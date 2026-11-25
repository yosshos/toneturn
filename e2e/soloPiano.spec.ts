import { expect, test, type Page } from '@playwright/test';

// Solo jazz piano after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md Part C): the three ear topics, every level
// of k-lh, k-tex (the 20-step texture ladder), k-comp and k-impro, and k-harm 8 (shared hands) fit one phone screen
// (320×720, English and Hebrew): no sideways scroll, no vertical scroll during the question or the run.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

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
const range = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}-${i + 1}`);

for (const lang of ['en', 'he'] as const) {
  test(`solo piano by ear: the topics' levels fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    // lh-tex-ear 2–3 and comp-rhythm-ear are hidden until verified (src/engine/verifiedContent.ts)
    for (const [topic, levels] of [['lh-tex-ear', [1]], ['solo-tex-ear', [1, 2, 3]]] as const)
      for (const l of levels) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${l}`);
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${topic} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/sp-topic-${lang}-${topic}-${l}.png`, fullPage: true });
        }
      }
    expect(bad).toEqual([]);
  });

  for (const [family, levels] of [
    // the levels on show; the rest are hidden until verified (src/engine/verifiedContent.ts)
    ['k-lh', range(18, 'k-lh').filter((id) => !/-(1[0-6]|18)$/.test(id))],
    ['k-tex', range(20, 'k-tex').filter((id) => !/-(4|11|18)$/.test(id))],
    ['k-comp', ['k-comp-2', 'k-comp-6', 'k-comp-7']],
    ['k-impro', range(7, 'k-impro')],
    ['k-harm', ['k-harm-8']],
  ] as const)
    test(`solo piano: ${family} run screens fit one screen (${lang})`, async ({ page }) => {
      test.setTimeout(600_000);
      await seed(page, lang);
      const bad: string[] = [];
      for (const level of levels) {
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
        await page.waitForTimeout(600);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${level}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/sp-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
