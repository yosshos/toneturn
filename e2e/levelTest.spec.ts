import { expect, test } from '@playwright/test';

// SPEC-LEVEL-TEST: the piano level test walks sections of real levels; a miss moves on, never the same scale again.
test('piano level test: sections, adaptive steps, a miss moves on', async ({ page }) => {
  await page.goto('/?sim=1#/drills');
  await page.locator('[data-drills-test]').click();
  await expect(page.locator('[data-level-test="piano"]')).toBeVisible();
  await expect(page.locator('.lt-sections li')).toHaveCount(6);
  await page.locator('[data-test-start]').click();
  const probe = page.locator('[data-test-probe]');
  // Hands starts on its second step (two octaves hands together, not C).
  await expect(probe).toHaveAttribute('data-test-strand', 'hands');
  await expect(probe).toHaveAttribute('data-test-probe', 'scales-3');
  await page.screenshot({ path: 'test-results/level-test-hands.png' });
  await page.locator('[data-test-too-hard]').click();
  // A miss brackets down to the first step, in another key.
  await expect(probe).toHaveAttribute('data-test-probe', 'scales-1');
  await page.locator('[data-test-too-hard]').click();
  // Then the next section — no insisting.
  await expect(probe).toHaveAttribute('data-test-strand', 'chords');
  const seen: string[] = [];
  for (let k = 0; k < 30; k++) {
    if (await page.locator('[data-level-test-done]').isVisible()) break;
    seen.push((await probe.getAttribute('data-test-strand')) ?? '');
    await page.locator('[data-test-too-hard]').click();
  }
  await expect(page.locator('[data-level-test-done]')).toBeVisible();
  expect(new Set(seen)).toEqual(new Set(['chords', 'comp', 'reading', 'ear', 'lines']));
  expect(seen.length).toBeLessThanOrEqual(12);
});
