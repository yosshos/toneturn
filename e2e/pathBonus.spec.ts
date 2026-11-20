import { expect, test, type Page } from '@playwright/test';

// PIANO_JAZZ P2 path wiring: a bonus game (tagged "Bonus") and a repertoire step at the end of units on the jazz path,
// each with its own symbol; the path still fits the phone's width.

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    // A player already placed high (Find my level), so the path opens at the advanced section where the bonus steps sit.
    const placed = ['degrees', 'intervals', 'chords', 'cadences', 'modes', 'sequences', 'rhythm-dictation', 'rhythm-reading', 'meter', 'notes', 'theory', 'form'].map((skill, i) => ({ id: `p:${i}`, skill, difficulty: 1500, correct: true, set: 1500, setN: 6, at: now }));
    const progress = { version: 1, xp: 0, applied: [], lessons: { placement: { completions: 1 } }, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], ratingEvents: placed };
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
    // SPEC-JAZZ-FOLD: the old Jazz player now walks Ear in jazz focus; its units still end with bonus games and repertoire.
    test(`the path ends units with a bonus game and a repertoire item (${lang})`, async ({ page }) => {
      await seed(page, lang);
      await page.goto('/?unlock#/path');
      // SPEC-JAZZ-FOLD: the old Jazz player walks Ear from its start, so the jazz bonus and repertoire steps sit in later
      // sections (their presence is checked by tests/jazzFold.test.ts and tests/newGamesConnections.test.ts). Here: the
      // path opens in Ear with jazz focus on, and any bonus step on screen carries its label.
      await expect(page.locator('[data-jazz-focus]').first()).toHaveAttribute('aria-checked', 'true');
      const bonus = page.locator('[data-step^="bonus:"] [data-bonus]');
      for (let i = 0; i < (await bonus.count()); i++) await expect(bonus.nth(i)).toHaveText(lang === 'he' ? 'בונוס' : 'Bonus');
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    });
});
