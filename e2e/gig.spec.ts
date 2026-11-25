import { expect, test, type Page } from '@playwright/test';

// On the bandstand (docs/AUDIT-DEPTH-3.md #11, #12, C8): the run screens of k-gig, g-gig and b-gig fit one 320 × 720
// phone screen in English and Hebrew — intros and endings, the ballad ladder, the rubato ballad intro, a section of the
// whole tune and the whole tune in one take (paged two lines at a time).
// E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Inst = 'piano' | 'guitar' | 'bass';
const PLAYS: Record<Inst, string> = { piano: 'keys', guitar: 'guitar', bass: 'bass' };

const seed = async (page: Page, inst: Inst, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ inst, lang, plays }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = {
        version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true,
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [plays], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false },
        courses: ['ear', plays], activeCourse: plays, seenVersion: '9.9.9', instrument: inst,
        drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: inst, guitarAddOns: ['jazz'], bassTrack: 'both' },
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
    },
    { inst, lang, plays: PLAYS[inst] },
  );
};
const overflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
const wide = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const openFamily = async (page: Page, family: string) => {
  await page.goto('about:blank');
  await page.goto('/?unlock#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family-levels="${family}"], [data-family="${family}"]:not([data-family-direct])`).click();
};
const openLevel = async (page: Page, family: string, level: string) => {
  await openFamily(page, family);
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const CASES: [Inst, string, string[]][] = [
  ['piano', 'k-gig', ['k-gig-1', 'k-gig-2', 'k-gig-6', 'k-gig-7', 'k-gig-8', 'k-gig-9', 'k-gig-10', 'k-gig-12']],
  ['guitar', 'g-gig', ['g-gig-1', 'g-gig-4', 'g-gig-5', 'g-gig-6']],
  ['bass', 'b-gig', ['b-gig-1', 'b-gig-3', 'b-gig-6']],
];

test.describe('on the bandstand', () => {
  for (const [inst, family, levels] of CASES)
    for (const lang of ['en', 'he'] as const)
      test(`${family} run screens fit one phone screen (${lang})`, async ({ page }) => {
        test.setTimeout(180_000);
        await seed(page, inst, lang);
        for (const level of levels) {
          await openLevel(page, family, level);
          const o = await overflow(page);
          if (o > 4) await page.screenshot({ path: `test-results/gig-${level}-${lang}.png`, fullPage: true });
          expect(o, `${level} ${lang}`).toBeLessThanOrEqual(4);
          expect(await wide(page), `${level} ${lang} sideways`).toBeLessThanOrEqual(1);
        }
      });
});
