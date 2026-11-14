import { expect, test, type Page } from '@playwright/test';

// Key changes and turnarounds (docs/AUDIT-GAPS-2.md #5/#6/#11/#12): the k-keys / g-keys / b-keys run screens fit one
// 320 × 720 phone screen — the longest chord list (I–♯I°7–ii–♯ii°7, nine chords), a common-diminished move and the
// 6th-diminished line — in English and Hebrew.

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
const overflow = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
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

test.describe('key changes and turnarounds', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  const CASES: [Inst, string, string[]][] = [
    ['piano', 'k-keys', ['k-keys-1', 'k-keys-7', 'k-keys-12']],
    ['guitar', 'g-keys', ['g-keys-1', 'g-keys-7', 'g-keys-12']],
    ['bass', 'b-keys', ['b-keys-1', 'b-keys-7', 'b-keys-12']],
  ];
  for (const [inst, family, levels] of CASES)
    for (const lang of ['en', 'he'] as const)
      test(`${family} run screens fit one phone screen (${lang})`, async ({ page }) => {
        await seed(page, inst, lang);
        for (const level of levels) {
          await openLevel(page, family, level);
          if (family === 'k-keys' && level !== 'k-keys-12') await expect(page.locator('[data-vl-score]')).toBeVisible();
          expect(await overflow(page), `${level} ${lang}`).toBeLessThanOrEqual(4);
        }
      });
});
