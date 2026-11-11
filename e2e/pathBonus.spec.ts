import { expect, test, type Page } from '@playwright/test';

// PIANO_JAZZ P2 path wiring: a bonus game (tagged "Bonus") and a repertoire step at the end of units on the jazz path,
// each with its own symbol; the path still fits the phone's width.

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, track: 'pro', intake: { v: 1, at: now, music: 3, singing: 1, theory: 3, reading: 3, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'jazz', leaveOut: [], packs: ['jazz'], noSing: false, noMic: false }, courses: ['ear', 'jazz'], activeCourse: 'jazz', seenVersion: '9.9.9' };
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
  }, lang);
};

test.describe('path: bonus games and repertoire steps', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const lang of ['en', 'he'] as const)
    test(`the jazz path ends units with a bonus game and a repertoire item (${lang})`, async ({ page }) => {
      await seed(page, lang);
      await page.goto('/?unlock#/path');
      const bonus = page.locator('[data-step^="bonus:jazz:"]');
      await expect(bonus.first()).toBeAttached();
      await expect(bonus.first().locator('[data-bonus]')).toHaveText(lang === 'he' ? 'בונוס' : 'Bonus');
      await expect(page.locator('[data-step^="rep:jazz:"]').first()).toBeAttached();
      await expect(bonus.first().locator('svg.step-glyph, .lock').first()).toBeAttached();
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    });
});
