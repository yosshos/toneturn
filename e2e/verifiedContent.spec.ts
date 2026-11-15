import { expect, test, type Page } from '@playwright/test';

// Hidden until verified (owner 2026-11-15, src/engine/verifiedContent.ts): unconfirmed named-method content is left out
// of the games lists, the path and the depth page; verified content (the Elevator from the tonic) stays.

/** The Practice tab's games list, every category. */
const openGames = async (page: Page) => {
  await page.locator('[data-hub="games"]').click();
  await page.locator('[data-cat="all"]').click();
};

const seed = async (page: Page, course: 'keys' | 'jazz', lang: 'en' | 'he' = 'en') => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ course, lang }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, track: 'pro', intake: { v: 1, at: now, music: 3, singing: 1, theory: 3, reading: 3, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'jazz', leaveOut: [], packs: ['jazz'], noSing: false, noMic: false }, courses: ['ear', course], activeCourse: course, seenVersion: '9.9.9', drills };
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
    { course, lang },
  );
};

test.use({ viewport: { width: 390, height: 844 } });

test('games list (keys): the Elevator is there, 5-4-3-2 Call is not', async ({ page }) => {
  await seed(page, 'keys');
  await page.goto('/?unlock#/arcade');
  await openGames(page);
  await expect(page.locator('.game-card.elevator')).toBeVisible();
  await expect(page.locator('.game-card.call5432')).toHaveCount(0);
  await expect(page.locator('.game-card.guidetone')).toBeVisible();
});

test('games list (jazz): no 5-4-3-2 Call', async ({ page }) => {
  await seed(page, 'jazz');
  await page.goto('/?unlock#/arcade');
  await openGames(page);
  await expect(page.locator('.game-card.guidetone')).toBeVisible();
  await expect(page.locator('.game-card.call5432')).toHaveCount(0);
});

test('path (jazz): bonus steps without 5-4-3-2 Call', async ({ page }) => {
  await seed(page, 'jazz');
  await page.goto('/?unlock#/path');
  await expect(page.locator('[data-step^="bonus:jazz:"]').first()).toBeAttached();
  await expect(page.locator('[data-step="bonus:jazz:call5432"]')).toHaveCount(0);
});

test('Drills (keys): hidden Harris-line levels are not listed; the ones switched on 2026-11-15 are', async ({ page }) => {
  await seed(page, 'keys');
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="k-harrisline"]').click();
  // shown: the important arpeggios (4); switched on: the ABCs (2), the dominant rules (3, 33), the chromatic scale (6),
  // two voices (19, 34), seven down (21), the tune outlines (14, 18)
  for (const id of ['k-harrisline-2', 'k-harrisline-3', 'k-harrisline-4', 'k-harrisline-6', 'k-harrisline-14', 'k-harrisline-18', 'k-harrisline-19', 'k-harrisline-21', 'k-harrisline-33', 'k-harrisline-34'])
    await expect(page.locator(`[data-level="${id}"]`), id).toBeAttached();
  // still hidden: chromatic arpeggios down (1), the 5-4-3-2 phrases (17), 3 to ♭9 (20), feel 6 (24), compose (26)
  for (const id of ['k-harrisline-1', 'k-harrisline-17', 'k-harrisline-20', 'k-harrisline-24', 'k-harrisline-26']) await expect(page.locator(`[data-level="${id}"]`), id).toHaveCount(0);
});

test('Drills (keys): the shells on the 6th-diminished scale are listed (Echols, owner 2026-11-15)', async ({ page }) => {
  await seed(page, 'keys');
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="k-sharm"]').click();
  await expect(page.locator('[data-level="k-sharm-41"]')).toBeAttached();
  await expect(page.locator('[data-level="k-sharm-41"]')).toContainText('shells');
});

for (const lang of ['en', 'he'] as const)
  test(`depth page (${lang}): no link to a hidden topic, no Goldings credit, live counts`, async ({ page }) => {
    await page.goto(`/?sim=1&lang=${lang}#/depth`);
    const root = page.locator('[data-depth]');
    await expect(root).toBeVisible();
    for (const d of await root.locator('details').all()) if ((await d.getAttribute('open')) === null) await d.locator('summary').click();
    await expect(root.getByText('Goldings')).toHaveCount(0);
    const n = await root.locator('[data-depth-count="levels"] b').innerText();
    expect(Number(n.replace(/[^\d]/g, ''))).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
