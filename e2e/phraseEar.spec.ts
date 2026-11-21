import { expect, test, type Page } from '@playwright/test';

// Phrases by ear (owner 2026-11-14): the k-phrase / g-phrase / b-phrase run screens — the call card with its replay
// buttons and the bars (the longest: 8 bars of a form, 16 bars in all) — and the lick trainer's by-ear mode fit one
// 320 × 720 phone screen, in English and Hebrew.
// E2E_BASE: point at another dev server (a worktree's own vite when 5174 is taken by another checkout).
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
        drills: { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: inst, guitarAddOns: ['jazz'] },
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
const overflow = (page: Page) => page.evaluate(() => Math.max(document.scrollingElement!.scrollHeight - window.innerHeight, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const openLevel = async (page: Page, family: string, level: string) => {
  await page.goto('about:blank');
  await page.goto('/?unlock#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator(`[data-family="${family}"]`).click();
  const card = page.locator(`[data-level="${level}"]`);
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator(`[data-level-start="${level}"]`).click();
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
};

test.describe('phrases by ear', () => {
  const CASES: [Inst, string][] = [
    ['piano', 'k-phrase'],
    ['guitar', 'g-phrase'],
    ['bass', 'b-phrase'],
  ];
  for (const [inst, family] of CASES)
    for (const lang of ['en', 'he'] as const)
      test(`${family}: the call card, replay and the bars fit one phone screen (${lang})`, async ({ page }) => {
        await seed(page, inst, lang);
        for (const level of [`${family}-1`, `${family}-5`, `${family}-8`]) {
          await openLevel(page, family, level);
          await expect(page.locator('[data-ear-card]')).toBeVisible();
          await expect(page.locator('[data-replay="call"]')).toBeVisible();
          await expect(page.locator('[data-replay="slow"]')).toBeVisible();
          // The answer stays hidden: no staff or tab before the take.
          await expect(page.locator('.drill-run .note-staff, .drill-run .drill-tab')).toHaveCount(0);
          expect(await overflow(page), `${level} ${lang}`).toBeLessThanOrEqual(4);
        }
      });
});

test.describe('the lick trainer by ear', () => {
  for (const lang of ['en', 'he'] as const)
    test(`notes hidden until revealed, the screen fits (${lang})`, async ({ page }) => {
      await seed(page, 'piano', lang);
      await page.goto('about:blank');
      await page.goto(`/?unlock=all&lang=${lang}#/licks`);
      await expect(page.locator('[data-licks="lib"]')).toBeVisible();
      await page.locator('[data-lick-card]').first().click();
      await expect(page.locator('[data-licks="lick"]')).toBeVisible();
      expect(await overflow(page), `lick page ${lang}`).toBeLessThanOrEqual(4);
      await page.locator('[data-lick-byear]').click();
      await expect(page.locator('[data-lick-run="ear"]')).toBeVisible();
      await expect(page.locator('[data-lick-ear="hidden"]')).toBeVisible();
      await expect(page.locator('[data-lick-hear="1"]')).toBeVisible();
      expect(await overflow(page), `by ear ${lang}`).toBeLessThanOrEqual(4);
      // Revealing the notes early: the staff shows, with the less-credit note.
      await page.locator('[data-lick-reveal]').click();
      await expect(page.locator('[data-lick-ear="hidden"]')).toHaveCount(0);
      await expect(page.locator('.lk-run .lk-voice-hint')).toBeVisible();
      await expect(page.locator('.lk-run .note-staff').first()).toBeVisible();
      const revealed = await overflow(page);
      // Revealed, it is the lick's practice screen (checked at 390 × 844 in licks.spec): the reveal adds no height to it.
      await page.locator('.screen-head .icon-btn').click();
      await page.locator('[data-lick-practice]').click();
      await expect(page.locator('[data-lick-run="practice"]')).toBeVisible();
      expect(revealed, `revealed ${lang}`).toBeLessThanOrEqual((await overflow(page)) + 4);
    });
});
