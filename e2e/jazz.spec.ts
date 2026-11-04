import { expect, test } from '@playwright/test';

for (const [n, name] of [
  ['21', 'Jazz 1'],
  ['22', 'Songs you know'],
] as const) {
  test(`${name} (lesson ${n}, simulator) runs to the end`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/?sim=1&unlock=all');
    await page.getByRole('button', { name: new RegExp(`${n}\. ${name}`) }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 220_000 });
    await expect(page.locator('.recap-row')).toHaveCount(5);
    await page.screenshot({ path: `test-results/lesson-${n}-recap.png` });
  });
}
