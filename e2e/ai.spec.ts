import { expect, test } from '@playwright/test';

// The AI teacher in sim mode (scripted answers; SPEC-AI §9): explain on the brief with a follow-up, a hint before
// answering pauses the lesson and resumes on close.
test('AI: explain on the brief with a follow-up; a hint pauses and resumes the lesson', async ({ page }) => {
  await page.goto('/?sim=1&brief=1#/topic/basics-highlow/1');
  // Voice mode asks for the microphone first: answer with buttons.
  await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 6000 }).catch(() => {});
  await expect(page.locator('[data-brief]')).toBeVisible();
  await page.locator('[data-ai-explain="topic"]').click();
  const sheet = page.locator('[data-ai-sheet="explain"]');
  await expect(sheet.locator('[data-ai-turn="assistant"]')).toHaveCount(1);
  await sheet.locator('[data-ai-input]').fill('ומה עם אוקטבה?');
  await sheet.locator('[data-ai-send]').click();
  await expect(sheet.locator('[data-ai-turn="assistant"]')).toHaveCount(2);
  await expect(sheet.locator('[data-ai-turn="user"]')).toHaveCount(1);
  await sheet.locator('[data-ai-close]').click();
  await expect(sheet).toHaveCount(0);

  await page.locator('[data-brief-play]').click();
  const hint = page.locator('[data-ai-hint]');
  await expect(hint).toBeVisible();
  await hint.click();
  await expect(page.locator('[data-ai-sheet="hint"] [data-ai-turn="assistant"]')).toBeVisible();
  await expect(page.locator('.paused-card')).toBeVisible();
  await page.locator('[data-ai-close]').click();
  await expect(page.locator('.paused-card')).toHaveCount(0);
});

test('AI: the weekly summary from the profile on Insights', async ({ page }) => {
  await page.goto('/?sim=1#/insights');
  await page.evaluate(async () => {
    await new Promise<void>((res) => {
      const r = indexedDB.open('toneturn-confusion', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('confusion');
      r.onsuccess = () => {
        const tx = r.result.transaction('confusion', 'readwrite');
        tx.objectStore('confusion').put({ a: { topic: 'basics-highlow', right: { en: 'M6', he: 'סקסטה' }, given: { en: 'm7', he: 'ספטימה' }, n: 6, last: new Date().toISOString() } }, 'map');
        tx.oncomplete = () => (r.result.close(), res());
      };
    });
  });
  await page.reload();
  await page.locator('[data-ai-weekly]').click();
  await expect(page.locator('[data-ai-coach="weekly"]')).toBeVisible();
  await page.reload();
  // Kept for the week: no second call needed.
  await expect(page.locator('[data-ai-coach="weekly"]')).toBeVisible();
});
