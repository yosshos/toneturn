import { expect, test, type Page } from '@playwright/test';

// AUDIT-6 Stage B: the new beginnings fit one phone screen (320×720, English and Hebrew) — a level of every new family
// (the densest ones: k-first 11, k-read 10, g-first 6, g-riff 3, b-first 5, d-first 5 and 7) and every level of the four
// new Ear topics. No sideways scroll, no vertical scroll during the question or the run.
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Inst = 'piano' | 'guitar' | 'bass' | 'drums';
const COURSE: Record<Inst, string> = { piano: 'keys', guitar: 'guitar', bass: 'bass', drums: 'drums' };
const PLAYS: Record<Inst, string> = { piano: 'keys', guitar: 'guitar', bass: 'bass', drums: 'drums' };

const seed = async (page: Page, lang: 'en' | 'he', instrument: Inst) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, instrument, course, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', drills };
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
    { lang, instrument, course: COURSE[instrument], plays: PLAYS[instrument] },
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
  test(`the new Ear topics fit one screen (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
      await page.locator('.sheet-backdrop .btn.ghost').first().click();
    });
    const bad: string[] = [];
    for (const [topic, n] of [['rhythm-echo', 7], ['intervals-down', 5], ['chord-member', 3], ['melody-change', 4]] as const)
      for (let l = 1; l <= n; l++) {
        await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${l}`);
        await page.locator('main.lesson').waitFor({ timeout: 15_000 });
        await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const p = await problems(page);
        if (p.length) {
          bad.push(`${topic} L${l}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/fs-topic-${lang}-${topic}-${l}.png`, fullPage: true });
        }
      }
    // the echo hides the rhythm until the result
    await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/rhythm-echo/3`);
    await page.locator('main.lesson').waitFor({ timeout: 15_000 });
    await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('[data-by-ear="1"] .read-echo')).toBeVisible({ timeout: 15_000 });
    expect(bad).toEqual([]);
  });

  for (const [instrument, family, levels] of [
    ['piano', 'k-first', ['k-first-4', 'k-first-11']],
    ['piano', 'k-read', ['k-read-1', 'k-read-10']],
    ['guitar', 'g-first', ['g-first-1', 'g-first-6', 'g-first-7']],
    ['guitar', 'g-riff', ['g-riff-3']],
    ['bass', 'b-first', ['b-first-5', 'b-first-7']],
    ['drums', 'd-first', ['d-first-5', 'd-first-7']],
  ] as const)
    test(`first steps: ${family} run screens fit one screen (${lang})`, async ({ page }) => {
      test.setTimeout(300_000);
      await seed(page, lang, instrument);
      const bad: string[] = [];
      for (const level of levels) {
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
        if (p.length) {
          bad.push(`${level}: ${p.join(', ')}`);
          await page.screenshot({ path: `test-results/fs-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
