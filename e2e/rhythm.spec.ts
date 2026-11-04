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

test.describe('rhythm R4–R8', () => {
  test.setTimeout(300_000);

  test('Rhythm 4 (sixteenths) to the end: read with taps, choose, then build the bar from blocks', async ({ page }) => {
    await page.goto('/?unlock=all');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: /Rhythm 4: sixteenths/ }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await page.evaluate(() => {
      new MutationObserver(() => {
        const prompt = document.querySelector('.read-prompt[data-start]') as HTMLElement | null;
        if (!prompt || prompt.dataset.done === prompt.dataset.start) return;
        prompt.dataset.done = prompt.dataset.start;
        const start = Number(prompt.dataset.start);
        const beatMs = 60000 / Number(prompt.dataset.bpm);
        for (const b of (prompt.dataset.onsets ?? '').split(',').map(Number)) {
          setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })), Math.max(0, start + b * beatMs - performance.now()));
        }
      }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-start'], childList: true });
    });
    await expect(page.locator('.read-prompt .rhythm-staff svg')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/rhythm-r4-read.png' });

    let built = false;
    for (let i = 0; i < 200; i++) {
      if (await page.getByRole('heading', { name: 'Lesson complete' }).isVisible()) break;
      if (await page.locator('.rhythm-builder').isVisible()) {
        const done = page.locator('.rhythm-builder .btn.primary');
        for (let k = 0; k < 16 && !(await done.isEnabled()); k++) {
          const block = page.locator('.block-btn:not([disabled])').first();
          if (!(await block.count())) break;
          await block.click();
        }
        if (!built) await page.screenshot({ path: 'test-results/rhythm-build.png' });
        built = true;
        if (await done.isEnabled()) await done.click();
      } else if (await page.locator('.answer.rhythm-opt:not([disabled])').first().isVisible()) {
        await page.locator('.answer.rhythm-opt').first().click();
      }
      await page.waitForTimeout(500);
    }
    expect(built).toBe(true);
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 60_000 });
  });
});
