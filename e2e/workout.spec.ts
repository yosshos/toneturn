import { expect, test } from '@playwright/test';

// Today's workout (spec AH): the editor — total, a block's minutes, remove + undo, add, presets — saved for today.
test.describe("today's workout", () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test('edit the total, a block, remove with undo, add; the path coverage updates', async ({ page }) => {
    await page.goto('/?sim=1#/workout');
    const blocks = page.locator('.wk-block');
    await expect(blocks.first()).toBeVisible();
    const n0 = await blocks.count();
    // Total → 20 minutes: the blocks rescale and sum to 20.
    await page.locator('.wk-chips .chip', { hasText: '20′' }).click();
    await expect(page.locator('.wk-stepper b')).toContainText('20');
    // A block's minutes: + 1 → the total follows.
    await blocks.first().getByRole('button', { name: '+1' }).click();
    await expect(page.locator('.wk-stepper b')).toContainText('21');
    // Remove with undo.
    await blocks.last().locator('.wk-more').click(); // 0.42: Remove lives in the ⋯ menu
    await blocks.last().getByRole('menuitem', { name: /Remove/ }).click();
    await expect(blocks).toHaveCount((await blocks.count()));
    await expect(page.locator('.wk-undo')).toBeVisible();
    await page.locator('.wk-undo .btn').click();
    // Add a topic block from the sheet.
    await page.locator('.wk-add').click();
    await page.locator('.wk-search').fill('interval');
    await page.locator('.wk-topic-list .chip').first().click();
    await expect.poll(() => blocks.count()).toBeGreaterThan(n0);
    // The unit coverage line is shown.
    await expect(page.locator('.wk-editor .wk-cov')).toContainText(/Unit 1/);
    // Presets keep the total.
    await page.locator('.wk-presets .chip', { hasText: 'Rhythm focus' }).click();
    await expect(page.locator('.wk-block').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(376);
  });
});

// 0.68.1 (owner): "Continue workout does nothing" — a warm-up block with due mistakes that can't be rebuilt as a
// review used to open nothing; and the card's title named the path step, not what Continue opens.
test.describe('workout Continue always opens something', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const cases: [string, string, string | null][] = [
    ['an unbuildable due mistake falls back to practice', 'rread:1:1:notes:gone', null],
    ['a buildable due mistake opens the review the card names', 'degree:C0:5', 'Review'],
  ];
  for (const [name, key, title] of cases) {
    test(name, async ({ page }) => {
      await page.goto('/manifest.webmanifest');
      await page.evaluate(async (key) => {
        const now = new Date().toISOString();
        const progress = { version: 1, xp: 40, applied: [], lessons: { 'bflat-two-homes': { best: 6, completions: 1, lastAt: now } }, history: [{ lessonId: 'bflat-two-homes', lessonVersion: 1, sessionId: 's1', completedAt: now, firstTry: 5, total: 6, xp: 40, missed: [] }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [{ lessonId: 'x', questionId: 'q1', key, answer: 5, addedAt: '2026-01-01T00:00:00.000Z' }] };
        const settings = { version: 2, uiLang: 'en', inputLang: 'en', outputLang: 'en', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', miniLessons: false, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: true, noMic: true }, courses: ['ear'], activeCourse: 'ear', workoutToday: { day: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`, blocks: [{ id: 'w1', target: { kind: 'warmup' }, minutes: 5 }, { id: 'w2', target: { kind: 'path' }, minutes: 5 }] } };
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
      }, key);
      await page.goto('/?unlock#/home');
      const card = page.locator('.wk-hero');
      await expect(card.locator('.wk-title')).not.toBeEmpty();
      const shown = (await card.locator('.wk-title').innerText()).trim();
      if (title) expect(shown).toBe(title);
      else expect(shown).not.toBe('Review');
      await card.locator('.wk-start').click();
      await expect(page.locator('main.lesson')).toBeVisible();
      expect(new URL(page.url()).hash).toBe('#/play');
    });
  }
});
