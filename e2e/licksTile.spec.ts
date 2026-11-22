import { expect, test, type Page } from '@playwright/test';

// The Licks tile (owner 2026-11-22, SPEC-DAILY-WORKOUT §6.2): Encore moved inside Licks. One Practice tile with three
// sections — the library, Mine (what Encore was: capture a phrase, my phrases in 12 keys) and Challenges; the old Encore
// links (#/encore, #/challenges) land on the matching section.

test.use({ viewport: { width: 390, height: 844 } });

const seed = async (page: Page, lang: 'en' | 'he') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (lang) => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9' };
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

test('Licks tile: opens with three sections; Mine is the Encore capture; Challenges is the gallery', async ({ page }) => {
  await seed(page, 'he');
  await page.goto('/?unlock=all&lang=he#/arcade');
  await expect(page.locator('[data-hub="licks"]')).toBeVisible();
  await expect(page.locator('[data-hub="encore"]')).toHaveCount(0);
  await page.locator('[data-hub="licks"]').click();
  const lib = page.locator('[data-licks="lib"]');
  await expect(lib).toBeVisible();
  await expect(page.locator('[data-licks-tab]')).toHaveCount(3);
  await expect(page.locator('[data-licks-tab="library"][aria-selected="true"]')).toBeVisible();
  await expect(page.locator('[data-lick-card]').first()).toBeVisible();
  // Mine: Encore's home — record / play / write a phrase, my phrases
  await page.locator('[data-licks-tab="mine"]').click();
  await expect(page.locator('[data-encore="home"]')).toBeVisible();
  await expect(page.locator('[data-licks-tab="mine"][aria-selected="true"]')).toBeVisible();
  await expect(page.locator('[data-enc-record]')).toBeVisible();
  await expect(page.locator('[data-enc-libsum]')).toBeVisible();
  expect(page.url()).toContain('#/licks/mine');
  // Challenges: the community gallery (or its sign-in note) under the same header
  await page.locator('[data-licks-tab="challenges"]').click();
  await expect(page.locator('[data-chl]')).toBeVisible();
  await expect(page.locator('[data-licks-tab="challenges"][aria-selected="true"]')).toBeVisible();
  expect(page.url()).toContain('#/licks/challenges');
  // the tabs replace the address: Back leaves the tile
  await page.goBack();
  await expect(page.locator('[data-practice-hub]')).toBeVisible();
});

test('Licks tile: an old Encore link lands on Mine, an old challenges link on Challenges; Encore screens go back to Mine', async ({ page }) => {
  await seed(page, 'en');
  await page.goto('/?unlock=all&lang=en#/encore');
  await expect(page.locator('[data-encore="home"]')).toBeVisible();
  await expect(page.locator('[data-licks-tab="mine"][aria-selected="true"]')).toBeVisible();
  await expect.poll(() => page.url()).toContain('#/licks/mine');
  // into Encore's own screens and back to the section
  await page.locator('[data-enc-libsum]').click();
  await expect(page.locator('[data-encore="library"]')).toBeVisible();
  await page.locator('.enc-head .icon-btn').first().click();
  await expect(page.locator('[data-licks-tab="mine"][aria-selected="true"]')).toBeVisible();
  // the old challenges home
  await page.goto('about:blank');
  await page.goto('/?unlock=all&lang=en#/challenges');
  await expect(page.locator('[data-chl]')).toBeVisible();
  await expect(page.locator('[data-licks-tab="challenges"][aria-selected="true"]')).toBeVisible();
  await expect.poll(() => page.url()).toContain('#/licks/challenges');
});
