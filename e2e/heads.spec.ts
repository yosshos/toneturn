import { expect, test, type Page } from '@playwright/test';

// Heads (docs/AUDIT-DEPTH-3.md C1, #4, C3, C4): the run screens of k-harm, k-tune, g-cmel, g-tune and b-tune fit one
// 320 × 720 phone screen in English and Hebrew — a harmonising phrase, a whole head comped (paged two lines at a time),
// chord-melody, the reharm levels — and the reharm studio opens on the tune family's page.
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
  await page.locator(`[data-family="${family}"]`).click();
};
const openLevel = async (page: Page, family: string, level: string) => {
  await openFamily(page, family);
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const CASES: [Inst, string, string[]][] = [
  ['piano', 'k-harm', ['k-harm-1', 'k-harm-2', 'k-harm-6']],
  ['piano', 'k-tune', ['k-tune-1', 'k-tune-6', 'k-tune-9']],
  ['guitar', 'g-cmel', ['g-cmel-1', 'g-cmel-4', 'g-cmel-6']],
  ['guitar', 'g-tune', ['g-tune-1', 'g-tune-9']],
  ['bass', 'b-tune', ['b-tune-1', 'b-tune-3', 'b-tune-7']],
];

test.describe('heads', () => {
  for (const [inst, family, levels] of CASES)
    for (const lang of ['en', 'he'] as const)
      test(`${family} run screens fit one phone screen (${lang})`, async ({ page }) => {
        test.setTimeout(150_000);
        await seed(page, inst, lang);
        for (const level of levels) {
          await openLevel(page, family, level);
          if (level === 'k-harm-2' || level === 'k-harm-6') await expect(page.locator('[data-vl-score]')).toBeVisible();
          const o = await overflow(page);
          if (o > 4) await page.screenshot({ path: `test-results/heads-${level}-${lang}.png`, fullPage: true });
          expect(o, `${level} ${lang}`).toBeLessThanOrEqual(4);
          expect(await wide(page), `${level} ${lang} sideways`).toBeLessThanOrEqual(1);
        }
      });

  for (const lang of ['en', 'he'] as const)
    test(`the reharm studio picks a device and opens the comp (${lang})`, async ({ page }) => {
      await seed(page, 'piano', lang);
      await openFamily(page, 'k-tune');
      await page.locator('[data-reharm-studio="open"]').click();
      await expect(page.locator('[data-reharm-studio="panel"]')).toBeVisible();
      const comp = page.locator('[data-rh-play="comp"]');
      await expect(comp).toBeDisabled();
      // Find a page with a device to pick.
      // (COURSE-FEEDBACK-UI §4.7: the bars are on the shared chord chart; a tapped bar opens its devices in a sheet.)
      const chart = page.locator('[data-rh-chart]');
      const counts = async () => ((await chart.getAttribute('data-rh-devices')) ?? '').split(',').map(Number);
      for (let i = 0; i < 8 && !(await counts()).some((n) => n > 0); i++) await page.locator('[aria-label="Next bars"]').click();
      await chart.locator('.cc-bar').nth((await counts()).findIndex((n) => n > 0)).click();
      await expect(page.locator('[data-rh-sheet]')).toBeVisible();
      await page.locator('[data-rh-device]').first().click();
      await expect(page.locator('[data-rh-sheet]')).toHaveCount(0);
      await expect(chart.locator('.cc-tab.changed').first()).toBeVisible();
      await expect(comp).toBeEnabled();
      await comp.click();
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      expect(await overflow(page)).toBeLessThanOrEqual(4);
    });
});
