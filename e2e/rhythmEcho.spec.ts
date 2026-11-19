import { expect, test } from '@playwright/test';

// Owner 2026-11-19: in every course a heard rhythm is answered by playing it back (pad, or said in time) —
// never by choosing / saying "ta ti-ti".
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate, [data-streak-sheet]'), async () => {
    await page.locator('.streak-celebrate .btn.mega, [data-streak-continue]').first().click();
  });
});

test('Ear course Rhythm 1: the first heard bar is picked by tapping, the second is played back', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
    const settings = { version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear'], activeCourse: 'ear', seenVersion: '9.9.9' };
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
  });
  await page.goto('/?unlock=all');
  await page.locator('.tab[data-tab="path"]').click();
  await page.locator('.all-lessons').getByRole('button', { name: /קצב 1|Rhythm 1/ }).first().click();
  const skip = page.getByRole('button', { name: /דלגו|Skip intro/ });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // Tap every shown or heard rhythm on time (the response start is data-start).
  await page.evaluate(() => {
    new MutationObserver(() => {
      const prompt = document.querySelector('.read-prompt[data-start]') as HTMLElement | null;
      if (!prompt || prompt.dataset.done === prompt.dataset.start) return;
      prompt.dataset.done = prompt.dataset.start;
      const start = Number(prompt.dataset.start);
      const beatMs = 60000 / Number(prompt.dataset.bpm);
      for (const b of (prompt.dataset.onsets ?? '').split(',').map(Number))
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })), Math.max(0, start + b * beatMs - performance.now()));
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-start'], childList: true });
  });

  // The first heard bar: pick the written one of four, by tapping — no syllables anywhere.
  await expect(page.locator('.answer.rhythm-opt')).toHaveCount(4, { timeout: 180_000 });
  await expect(page.locator('body')).not.toContainText(/טי-טי|ti-ti/);
  await page.screenshot({ path: 'docs/fresh-shots/ear-choose-he.png' });
  // The second: played back.
  for (let i = 0; i < 240 && !(await page.locator('.read-prompt[data-by-ear="1"]').isVisible()); i++) {
    if (await page.locator('[data-continue]').isVisible()) await page.locator('[data-continue]').click().catch(() => {});
    else if (await page.locator('.answer.rhythm-opt:not([disabled])').first().isVisible()) await page.locator('.answer.rhythm-opt').first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await expect(page.locator('.read-prompt[data-by-ear="1"]')).toBeVisible();
  await expect(page.locator('.answer.rhythm-opt')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/טי-טי|ti-ti/);
  await page.screenshot({ path: 'docs/fresh-shots/ear-echo-he.png' });
  await expect(page.locator('.feedback.correct')).toBeVisible({ timeout: 60_000 });
});
