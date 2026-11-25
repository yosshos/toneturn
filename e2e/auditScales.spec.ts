import { expect, test, type Page } from '@playwright/test';

// AUDIT-SCALES (owner 2026-11-14): the new levels — the scale matrix, the Harris diminished scales, hand independence,
// the harmonization ladder with borrowing, the eight expressions and Harris's moves, the guitar technique gaps — and the new ear
// topics fit one phone screen (320×720, English and Hebrew): no sideways scroll, no vertical scroll during the run.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he', plays: 'keys' | 'guitar') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, jazzFocus: [plays], seenVersion: '9.9.9', drills };
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
    { lang, plays },
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

const RUNS: ['keys' | 'guitar', string, string[]][] = [
  ['keys', 'scales', ['scales-16', 'scales-21', 'scales-30', 'scales-33']],
  ['keys', 'harris', ['harris-1', 'harris-25', 'harris-26']],
  ['keys', 'k-indep', ['k-indep-1', 'k-indep-3', 'k-indep-4', 'k-indep-5', 'k-indep-8']],
  ['keys', 'k-sharm', ['k-sharm-1', 'k-sharm-5', 'k-sharm-9', 'k-sharm-13', 'k-sharm-15', 'k-sharm-19', 'k-sharm-23', 'k-sharm-24', 'k-sharm-26', 'k-sharm-27', 'k-sharm-29', 'k-sharm-30', 'k-sharm-32', 'k-sharm-33', 'k-sharm-34', 'k-sharm-35', 'k-sharm-36', 'k-sharm-37', 'k-sharm-39', 'k-sharm-40', 'k-sharm-41', 'k-sharm-42']],
  ['guitar', 'g-harm', ['g-harm-1', 'g-harm-3', 'g-harm-5', 'g-harm-8', 'g-harm-10', 'g-harm-12']],
  ['guitar', 'g-scales', ['g-scales-11', 'g-scales-12']],
  ['guitar', 'g-rhythm', ['g-rhythm-11']],
  ['guitar', 'g-lead', ['g-lead-11']],
  ['guitar', 'g-picking', ['g-picking-10']],
  ['guitar', 'g-harris', ['g-harris-11', 'g-harris-13']],
];

for (const lang of ['en', 'he'] as const) {
  test(`borrowing, the eight expressions and the moves by ear fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (const [topic, n] of [['bh-borrow', 3], ['bh-sixfive', 4], ['bh-moves', 3], ['bh-tesseract', 3]] as const)
      for (let l = 1; l <= n; l++) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${l}`);
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${topic} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/auditscales-${lang}-${topic}-${l}.png`, fullPage: true });
        }
      }
    expect(bad).toEqual([]);
  });

  for (const [plays, family, levels] of RUNS)
    test(`${family}: the new levels' run screen fits one screen (${lang})`, async ({ page }) => {
      test.setTimeout(levels.length > 8 ? 900_000 : 300_000);
      await seed(page, lang, plays);
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
          await page.screenshot({ path: `test-results/auditscales-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
