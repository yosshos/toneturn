import { expect, test } from '@playwright/test';

// 0.50.2: Buttons mode answers quietly — the buttons are marked, a wrong final answer waits for Continue (Compare on
// demand) — and an exercise cut off by a reload (the phone closing the tab) opens again where it stood.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

test('Buttons mode: wrong answers are marked, Continue moves on, nothing is spoken', async ({ page }) => {
  await page.goto('/?unlock=all');
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.locator('.tab[data-tab="path"]').click();
  await page.getByRole('button', { name: /2\. / }).first().click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  // count speech from here on
  await page.evaluate(() => {
    const w = window as unknown as { __spoken: number };
    w.__spoken = 0;
    const orig = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken++;
      orig(u);
    };
  });
  // answer wrong until the item is resolved: Continue appears, the right button is green, ours red
  for (let i = 0; i < 10 && !(await page.locator('[data-continue]').isVisible()); i++) {
    const btn = page.locator('main.lesson.phase-listening .answers .answer:not([disabled]):not(.is-wrong)');
    await expect(btn.first()).toBeVisible({ timeout: 30_000 });
    const right = await page.evaluate(() => (document.querySelector('.ask') as HTMLElement | null)?.dataset.answer ?? null);
    const all = await btn.evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.answer));
    const pick = all.find((a) => a !== right) ?? all[0];
    await page.locator(`.answers .answer[data-answer="${pick}"]`).click();
    await page.waitForTimeout(800);
    // next: either Continue (resolved) or the buttons open again (a retry, or the next item after a right guess)
    await page.waitForFunction(() => !!document.querySelector('[data-continue]') || !!document.querySelector('main.lesson.phase-listening .answers .answer:not([disabled]):not(.is-wrong)'), null, { timeout: 30_000 });
  }
  await expect(page.locator('[data-continue]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.answers .answer.is-right')).toHaveCount(1);
  await expect(page.locator('.answers .answer.is-wrong').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __spoken: number }).__spoken)).toBe(0);
  await page.locator('[data-continue]').click();
  await expect(page.locator('[data-continue]')).toHaveCount(0);
  // the next question (empty feedback) — or the recap, when that was the last one
  await expect(page.locator('.answers .answer.is-right, .answers .answer.is-wrong')).toHaveCount(0, { timeout: 15_000 });
});

test('a reload inside an exercise opens it again where it stood', async ({ page }) => {
  await page.goto('/?unlock=all');
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.locator('.tab[data-tab="path"]').click();
  await page.getByRole('button', { name: /2\. / }).first().click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  // two items done (Skip resolves an item and saves the session)
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.answers .answer:not([disabled])').first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await page.waitForTimeout(1500);
  }
  await expect(page).toHaveURL(/#\/play/);
  await page.reload();
  // back in the lesson, not on the home screen, on the third item
  await expect(page.locator('.controls')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.lesson-screen, main.lesson').first()).toBeVisible();
});
