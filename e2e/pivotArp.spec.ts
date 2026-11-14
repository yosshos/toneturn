import { expect, test, type Page } from '@playwright/test';

// BH-G (AUDIT-CONTENT-THEORY §ז.2): the pivot — every level of the topic, the keys levels harris 19–24, the guitar
// levels g-harris 8–10 and the bass levels b-barry 7–8 fit one phone screen (320×720, English and Hebrew): no sideways scroll, no vertical
// scroll during the question or the run. E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const seed = async (page: Page, lang: 'en' | 'he', plays: 'keys' | 'guitar' | 'bass') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: plays === 'keys' ? 'piano' : plays, guitarAddOns: ['jazz'], bassTrack: 'both' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', drills };
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

for (const lang of ['en', 'he'] as const) {
  test(`the pivot: the topic's levels fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (let l = 1; l <= 5; l++) {
      await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/bh-pivot-arp/${l}`);
      await page.locator('main.lesson').waitFor({ timeout: 15_000 });
      await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const p = await problems(page);
      const c = await page.evaluate(() => {
        const el = document.querySelector('.lesson .stage .controls');
        return el && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().bottom > innerHeight + 1;
      });
      if (c) p.push('controls below the fold');
      if (p.length) {
        bad.push(`L${l}: ${p.join(', ')}`);
        await page.screenshot({ path: `test-results/pivot-${lang}-${l}.png`, fullPage: true });
      }
    }
    expect(bad).toEqual([]);
  });

  for (const [plays, family, levels] of [
    ['keys', 'harris', ['harris-19', 'harris-20', 'harris-21', 'harris-22', 'harris-23', 'harris-24']],
    ['guitar', 'g-harris', ['g-harris-8', 'g-harris-9', 'g-harris-10']],
    ['bass', 'b-barry', ['b-barry-7', 'b-barry-8']],
  ] as const)
    test(`the pivot: ${family} levels' run screen fits one screen (${lang})`, async ({ page }) => {
      test.setTimeout(240_000);
      await seed(page, lang, plays);
      const bad: string[] = [];
      for (const level of levels) {
        await page.goto("about:blank");
        await page.goto(`/?unlock=all&lang=${lang}#/drills`);
        await page.waitForTimeout(800);
        await page.locator('[data-topic="all"]').click();
        await page.waitForTimeout(400);
        await page.locator(`[data-family="${family}"]`).click();
        const card = page.locator(`[data-level="${level}"]`);
        await card.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
        await page.locator(`[data-level-start="${level}"]`).click();
        // the level's lesson gate, if shown
        await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
        await expect(page.locator('[data-drills="run"]')).toBeVisible();
        await page.waitForTimeout(600);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${level}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/pivot-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
