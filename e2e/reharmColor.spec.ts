import { expect, test, type Page } from '@playwright/test';

// Reharmonization and colour harmony (docs/HARMONY-REHARM.md): every level of the new ear topics (and the levels added
// to planing and reharm-spot), and one level of every new family (k-ctone, k-mediant, k-organ, k-reharm
// 11–22, g-ctone, g-color, b-counter) fit one phone screen (320×720, English and Hebrew): no sideways scroll, no
// vertical scroll during the question or the run. E2E_BASE: point at another dev server (a worktree's own vite).
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

const TOPICS: [string, number[]][] = [
  ['ct-degree', [1, 2, 3, 4, 5, 6]],
  ['mediants', [1, 2, 3, 4, 5]],
  ['pedal-ear', [1, 2, 3]],
  ['approach-chord', [1, 2, 3]],
  ['counter-line', [1, 2, 3]],
  ['modern-color', [1, 2, 3]],
  ['func-color', [1, 2, 3]],
  ['modal-mix', [1, 2, 3, 4, 5]],
  ['planing', [4]],
  ['reharm-spot', [5]],
];
const LEVELS: ['keys' | 'guitar' | 'bass', string, string][] = [
  ['keys', 'k-ctone', 'k-ctone-3'],
  ['keys', 'k-ctone', 'k-ctone-7'],
  ['keys', 'k-mediant', 'k-mediant-4'],
  ['keys', 'k-organ', 'k-organ-1'],
  ['keys', 'k-reharm', 'k-reharm-17'],
  ['guitar', 'g-ctone', 'g-ctone-2'],
  ['guitar', 'g-color', 'g-color-9'],
  ['bass', 'b-counter', 'b-counter-7'],
];

for (const lang of ['en', 'he'] as const) {
  test(`colour harmony by ear: every new topic level fits one screen (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (const [topic, levels] of TOPICS)
      for (const l of levels) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${l}`);
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${topic} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/rc-topic-${lang}-${topic}-${l}.png`, fullPage: true });
        }
      }
    expect(bad).toEqual([]);
  });

  for (const [plays, family, level] of LEVELS)
    test(`colour harmony: ${level} run screen fits one screen (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, lang, plays);
      await page.goto('about:blank');
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
      await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      await page.waitForTimeout(600);
      const p = await problems(page);
      if (p.length) await page.screenshot({ path: `test-results/rc-${lang}-${level}.png`, fullPage: true });
      expect(p, level).toEqual([]);
    });
}
