import { expect, test, type Page } from '@playwright/test';

// AUDIT-DEPTH-3, the last items (C1–C4, #1–#4, intros/endings by ear, more open-string pedals): the new run screens fit
// one 320 × 720 phone screen in English and Hebrew, and so do the tune ladder panel and the reharm studio's buttons.
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
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

const CASES: [Inst, string, string[]][] = [
  ['piano', 'k-harm', ['k-harm-9', 'k-harm-10', 'k-harm-11', 'k-harm-12', 'k-harm-13']],
  ['piano', 'k-tune', ['k-tune-11', 'k-tune-14', 'k-tune-15']],
  ['piano', 'k-reharm', ['k-reharm-23', 'k-reharm-24']],
  ['guitar', 'g-cmel', ['g-cmel-7', 'g-cmel-8', 'g-cmel-9']],
  ['guitar', 'g-tune', ['g-tune-10', 'g-tune-14']],
  ['guitar', 'g-gig', ['g-gig-9']],
  ['guitar', 'g-color', ['g-color-13', 'g-color-15', 'g-color-16']],
  ['bass', 'b-tune', ['b-tune-8', 'b-tune-11']],
  ['bass', 'b-gig', ['b-gig-9']],
];

test.describe('AUDIT-DEPTH-3 closed items', () => {
  for (const [inst, family, levels] of CASES)
    for (const lang of ['en', 'he'] as const)
      test(`${family} new run screens fit one phone screen (${lang})`, async ({ page }) => {
        test.setTimeout(240_000);
        await seed(page, inst, lang);
        for (const level of levels) {
          await openLevel(page, family, level);
          const o = await overflow(page);
          if (o > 4) await page.screenshot({ path: `test-results/d3-${level}-${lang}.png`, fullPage: true });
          expect(o, `${level} ${lang}`).toBeLessThanOrEqual(4);
          expect(await wide(page), `${level} ${lang} sideways`).toBeLessThanOrEqual(1);
        }
      });
  for (const [inst, family] of [['piano', 'k-tune'], ['guitar', 'g-tune'], ['bass', 'b-tune']] as const)
    for (const lang of ['en', 'he'] as const)
      test(`${family}: the tune ladder panel fits, its first step runs (${lang})`, async ({ page }) => {
        test.setTimeout(120_000);
        await seed(page, inst, lang);
        await openFamily(page, family);
        await page.locator('[data-tune-ladder="open"]').click();
        const panel = page.locator('[data-tune-ladder="panel"]');
        await expect(panel).toBeVisible();
        await panel.scrollIntoViewIfNeeded();
        const box = (await panel.boundingBox())!;
        expect(box.height, `${family} ${lang}`).toBeLessThanOrEqual(720);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
        expect(await wide(page)).toBeLessThanOrEqual(1);
        await expect(page.locator('[data-tl-step="0"]')).toHaveAttribute('data-tl-state', 'open');
        await expect(page.locator('[data-tl-step="1"]')).toBeDisabled();
        await page.locator('[data-tl-step="0"]').click();
        await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
        await expect(page.locator('[data-drills="run"]')).toBeVisible();
        expect(await overflow(page)).toBeLessThanOrEqual(4);
      });
  for (const lang of ['en', 'he'] as const)
    test(`reharm studio: comp, melody and solo buttons fit; the solo runs (${lang})`, async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, 'piano', lang);
      await openFamily(page, 'k-tune');
      await page.locator('[data-reharm-studio="open"]').click();
      const chart = page.locator('[data-rh-chart]');
      const counts = async () => ((await chart.getAttribute('data-rh-devices')) ?? '').split(',').map(Number);
      for (let i = 0; i < 8 && !(await counts()).some((n) => n > 0); i++) await page.locator('[aria-label="Next bars"]').click();
      await chart.locator('.cc-bar').nth((await counts()).findIndex((n) => n > 0)).click();
      await page.locator('[data-rh-device]').first().click();
      const solo = page.locator('[data-rh-play="solo"]');
      await expect(solo).toBeEnabled();
      for (const b of ['comp', 'melody', 'solo']) {
        const bb = (await page.locator(`[data-rh-play="${b}"]`).boundingBox())!;
        expect(bb.x).toBeGreaterThanOrEqual(0);
        expect(bb.x + bb.width).toBeLessThanOrEqual(320);
      }
      expect(await wide(page)).toBeLessThanOrEqual(1);
      await solo.click();
      await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
      await expect(page.locator('[data-drills="run"]')).toBeVisible();
      expect(await overflow(page)).toBeLessThanOrEqual(4);
    });
});
