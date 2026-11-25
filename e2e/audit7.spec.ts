import { expect, test, type Page } from '@playwright/test';

// AUDIT-7: the new and moved levels fit one phone screen (320×720, English and Hebrew) — the run screen of each new
// family's densest levels: k-read 11–15, k-pop, k-pedal, k-classic (keys), g-scales 13–15 (guitar), b-riff, b-feel and a
// 12-key b-chord level (bass), d-fills 9 and d-pas 3 (drums). No sideways scroll, no vertical scroll during the run.
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
  for (const [instrument, family, levels] of [
    ['piano', 'k-read', ['k-read-11', 'k-read-12', 'k-read-13', 'k-read-14', 'k-read-15']],
    ['piano', 'k-pop', ['k-pop-1', 'k-pop-3', 'k-pop-4', 'k-pop-6']],
    ['piano', 'k-pedal', ['k-pedal-1', 'k-pedal-2', 'k-pedal-3']],
    ['piano', 'k-classic', ['k-classic-1', 'k-classic-2', 'k-classic-3', 'k-classic-4']],
    ['guitar', 'g-scales', ['g-scales-13', 'g-scales-15']],
    ['bass', 'b-riff', ['b-riff-1', 'b-riff-4', 'b-riff-5']],
    ['bass', 'b-feel', ['b-feel-1', 'b-feel-3', 'b-feel-5']],
    ['bass', 'b-chord', ['b-chord-11']],
    ['drums', 'd-fills', ['d-fills-9']],
    ['drums', 'd-pas', ['d-pas-3']],
  ] as const)
    test(`audit 7: ${family} run screens fit one screen (${lang})`, async ({ page }) => {
      test.setTimeout(300_000);
      await seed(page, lang, instrument);
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
          await page.screenshot({ path: `test-results/a7-${lang}-${level}.png`, fullPage: true });
        }
      }
      expect(bad).toEqual([]);
    });
}
