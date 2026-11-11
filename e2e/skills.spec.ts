import { expect, test } from '@playwright/test';
import { openGames } from './practice';

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
    // SPEC-COURSE-START: the first visit starts the course; Find my level stays one tap away on the path.
    await expect(page.locator('[data-course-hero]')).toBeVisible();
    await page.locator('.tab[data-tab="path"]').click();
    await page.getByRole('button', { name: 'Find my level' }).last().click();
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
    await expect(page.locator('.topic-strip .ts')).toHaveCount(26); // 0.38: + dictation, instrument, timbre — every skill (transposition, meter, form, expression included) (rhythmic precision rides on rhythm reading), sung ones included (voice)
    await expect(page.locator('.topic-strip .ts.done').first()).toBeVisible({ timeout: 120_000 });
    // The meter at the side follows the climb.
    await expect(page.locator('.placement-meter')).toBeVisible();
    // The rest: skip through (the simulator's scripted voice does not speak every new answer type).
    const done = page.getByRole('heading', { name: 'Lesson complete' });
    // "Skip this section" leaves a whole section out (not measured): try it on Absolute pitch.
    let skippedSection = false;
    for (const end = Date.now() + 480_000; Date.now() < end && !(await done.isVisible()); ) {
      const now = await page.locator('.topic-strip .ts.now').getAttribute('data-skill').catch(() => null);
      if (now === 'absolute' && !skippedSection) {
        await page.getByRole('button', { name: /Skip this section/ }).click();
        skippedSection = true;
        await expect(page.locator('.topic-strip .ts.skipped[data-skill="absolute"]')).toBeVisible();
        continue;
      }
      const skip = page.getByRole('button', { name: 'Skip', exact: true });
      if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    expect(skippedSection).toBe(true);
    await expect(done).toBeVisible({ timeout: 60_000 });
    expect(await page.locator('.recap-row').count()).toBeGreaterThanOrEqual(11);
    await page.getByRole('button', { name: /See my Skill Map/ }).click();

    await expect(page.getByRole('heading', { name: 'Skill Map', level: 1 })).toBeVisible();
    await expect(page.locator('.radar.domains [data-domain]')).toHaveCount(7); // seven domains (0.38)
    await expect(page.locator('.trend-detail svg')).not.toHaveCount(0); // the selected skill's trend (overall is on Activity, 0.42)
    await expect(page.locator('.radar .area')).toHaveCount(1);
    await expect(page.locator('main.skillmap')).toContainText('provisional');
    await expect(page.locator('main.skillmap')).toContainText('not measured yet');
    await expect(page.locator('.diag-panel')).toContainText('Recommended next');
    await page.screenshot({ path: 'test-results/skill-map.png', fullPage: true });

    // Selecting an axis from the accessible list opens its diagnosis.
    // 0.42: areas are a list you open; the skill rows are inside.
    await page.locator('[data-domain-list="pitch"]').evaluate((d) => ((d as HTMLDetailsElement).open = true)); // 0.64: may already be open (the course's weakest skill)
    await page.locator('[data-domain-list="pitch"]').getByRole('button', { name: /Harmony & progressions/ }).first().click();
    await expect(page.locator('.diag-panel h2')).toHaveText('Harmony & progressions');

    // The scripted miss went into the review queue.
    await page.getByRole('button', { name: 'Back' }).click();
    // The scripted miss is in the review queue (Path → Practice rooms).
    await page.locator('.tab[data-tab="path"]').click();
    await page.locator('[data-px="rooms"] > summary').click();
    await expect(page.locator('[data-room="review"]')).toBeVisible();
    // Find my level stays on Today after it was done (re-take): one small button → the sheet.
    await page.locator('.tab[data-tab="home"]').click();
    await page.locator('[data-find-level]').click();
    await expect(page.locator('.level-sheet')).toContainText('Take it again');
  });

  test('measure one area: Memory runs only its three skills', async ({ page }) => {
    // One area from the Skill Map (Progress tab) — on Today it is the Find my level sheet.
    await page.goto('/?sim=1&unlock=all#/skills');
    await page.locator('#ps-tab-skills').click();
    await page.locator('[data-domain-list="memory"] > summary').click();
    await page.locator('[data-measure="memory"]').click();
    await page.getByRole('button', { name: /Use my voice & start|Buttons instead/ }).first().click();
    await expect(page.locator('.topic-strip .ts')).toHaveCount(3);
    await expect(page.locator('.topic-strip .ts').first()).toHaveAttribute('data-skill', 'sequences');
    await expect(page.locator('.placement-meter')).toBeVisible();
  });

  test('weekly puzzle: solve on the first try → gold, shown on the home screen', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    await openGames(page);
    await page.getByRole('button', { name: /Weekly puzzle/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.ask')).toHaveText('Which degrees, in order?');
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Home' }).click();
    await page.locator('.tab[data-tab="arcade"]').click();
    await openGames(page);
    await expect(page.getByRole('button', { name: /Weekly puzzle/ })).toContainText('Gold this week');
  });

  test('weekly puzzle with the keypad (Buttons mode)', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.locator('.tab[data-tab="arcade"]').click();
    await openGames(page);
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
