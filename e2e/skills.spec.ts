import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

// Voice flows run in the labelled simulator (scripted answers: right, wrong, then right…).
test.describe('placement, Skill Map, review, weekly puzzle', () => {
  test.setTimeout(900_000);

  test('placement adapts, then the Skill Map shows measured skills and a recommendation; review appears', async ({ page }) => {
    await page.goto('/?sim=1');
    // First visit: finding your level is the default step.
    await expect(page.getByRole('heading', { name: 'Let’s find your level' })).toBeVisible();
    await page.locator('.first-run-cta').click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.intro-card')).toHaveCount(0); // no intro for placement
    // Rhythm reading item: tap whatever rhythm is shown, on time (the simulator has no hands).
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
    // The topic strip shows what is done, now and left.
    await expect(page.locator('.topic-strip .ts')).toHaveCount(14); // every skill Find my level measures, singing included (voice)
    await expect(page.locator('.topic-strip .ts.done').first()).toBeVisible({ timeout: 120_000 });
    // The meter at the side follows the climb.
    await expect(page.locator('.placement-meter')).toBeVisible();
    // The rest: skip through (the simulator's scripted voice does not speak every new answer type).
    const done = page.getByRole('heading', { name: 'Lesson complete' });
    for (const end = Date.now() + 360_000; Date.now() < end && !(await done.isVisible()); ) {
      const skip = page.getByRole('button', { name: /Skip ⇥|Skip/ }).first();
      if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await expect(done).toBeVisible({ timeout: 60_000 });
    expect(await page.locator('.recap-row').count()).toBeGreaterThanOrEqual(11);
    await page.getByRole('button', { name: /See my Skill Map/ }).click();

    await expect(page.getByRole('heading', { name: 'Skill Map', level: 1 })).toBeVisible();
    await expect(page.locator('.radar.domains [data-domain]')).toHaveCount(5); // five domains
    await expect(page.locator('.trend-tile')).not.toHaveCount(0); // trends per measured skill
    await expect(page.locator('.trend-detail svg')).toHaveCount(2); // overall + selected skill
    await expect(page.locator('.overall-head .rating-badge')).toBeVisible();
    await expect(page.locator('.radar .area')).toHaveCount(1);
    await expect(page.locator('main.skillmap')).toContainText('provisional');
    await expect(page.locator('main.skillmap')).toContainText('not measured yet');
    await expect(page.locator('.diag-panel')).toContainText('Recommended next');
    await page.screenshot({ path: 'test-results/skill-map.png', fullPage: true });

    // Selecting an axis from the accessible list opens its diagnosis.
    await page.getByRole('button', { name: /Cadences/ }).first().click();
    await expect(page.locator('.diag-panel h2')).toHaveText('Cadences');

    // The scripted miss went into the review queue.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: /Review/ }).first()).toBeVisible();
    // Find my level stays in Practice tools after it was done (re-take).
    await expect(page.locator('.placement-card')).toContainText('Take it again');
  });

  test('weekly puzzle: solve on the first try → gold, shown on the home screen', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('button', { name: /Weekly puzzle/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.ask')).toHaveText('Which degrees, in order?');
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: /Weekly puzzle/ })).toContainText('Gold this week');
  });

  test('weekly puzzle with the keypad (Buttons mode)', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: /Weekly puzzle/ }).click();
    await expect(page.locator('.seq-keys .seq-key')).toHaveCount(7, { timeout: 60_000 });
    const slots = await page.locator('.seq-slots .slot').count();
    expect(slots).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < slots; i++) await page.locator('.seq-key[data-degree="1"]').click();
    await expect(page.locator('.slot.filled')).toHaveCount(slots);
    await page.getByRole('button', { name: /Delete/ }).click();
    await expect(page.locator('.slot.filled')).toHaveCount(slots - 1);
    await page.locator('.seq-key[data-degree="1"]').click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    // All-ones is never the puzzle (no repeated neighbours) → a retry, not a medal yet.
    await expect(page.locator('.feedback')).toContainText(/Not quite/, { timeout: 30_000 });
  });

  test('Beat Echo setup offers tap-latency calibration', async ({ page }) => {
    await page.goto('/#/games');
    await page.getByRole('radio', { name: /Beat Echo/ }).click();
    await expect(page.getByRole('button', { name: /Calibrate tap timing/ })).toBeVisible();
    await expect(page.locator('.calibrate')).toContainText('Tap delay: 0 ms');
  });
});
