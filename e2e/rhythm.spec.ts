import { expect, test } from '@playwright/test';

test.describe('rhythm reading & dictation', () => {
  test.setTimeout(240_000);

  test('Rhythm 1 in Buttons mode: notation renders, taps on the metronome are graded, dictation options show notation', async ({ page }) => {
    await page.goto('/?unlock=all');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: /Rhythm 1: quarters and halves/ }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();

    // Tap whatever rhythm is shown, timed from the moment beat 1 is heard (exposed as data-start).
    await page.evaluate(() => {
      const armed = new WeakSet<Element>();
      new MutationObserver(() => {
        const prompt = document.querySelector('.read-prompt[data-start]') as HTMLElement | null;
        if (!prompt || armed.has(prompt) || prompt.dataset.done === prompt.dataset.start) return;
        prompt.dataset.done = prompt.dataset.start;
        const start = Number(prompt.dataset.start);
        const beatMs = 60000 / Number(prompt.dataset.bpm);
        for (const b of (prompt.dataset.onsets ?? '').split(',').map(Number)) {
          setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })), Math.max(0, start + b * beatMs - performance.now()));
        }
      }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-start'], childList: true });
    });

    // Q1: read from notation
    await expect(page.locator('.read-prompt .rhythm-staff svg')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/rhythm-read.png' });
    await expect(page.locator('.feedback.correct')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.read-strip .rs')).not.toHaveCount(0);

    // Q2: dictation — four options, each with notation
    await expect(page.locator('.answer.rhythm-opt')).toHaveCount(4, { timeout: 60_000 });
    await expect(page.locator('.answer.rhythm-opt .rhythm-staff svg').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/rhythm-dictation.png' });
    await page.locator('.answer.rhythm-opt').first().click();
    await expect(page.locator('.feedback')).not.toHaveClass(/empty/, { timeout: 30_000 });
  });
});
