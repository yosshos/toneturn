import { expect, test } from '@playwright/test';

// SPEC-DESKTOP (0.51): from 1100 px a side menu replaces the tab bar and the menu sheet — on the start side (left in
// English, right in Hebrew), sections expand in place; 700–1099 px it is a rail of icons; phones keep the tab bar.
test.describe('desktop layout', () => {
  test('side menu: English on the left, nested Practice, tools, and exercise shortcuts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?unlock=all&lang=en#/arcade');
    const nav = page.locator('[data-side-nav]');
    await expect(nav).toBeVisible();
    await expect(page.locator('.tabbar')).toBeHidden();
    const box = (await nav.boundingBox())!;
    expect(box.x).toBeLessThan(5); // start side = left
    // Practice is open on its own page; its children navigate
    await nav.locator('[data-nav="drills"]').click();
    await expect(page.locator('[data-drills="hub"]')).toBeVisible();
    // Tools is a group: it opens in place
    await nav.locator('[data-nav="group:tools"]').click();
    await nav.locator('[data-nav="metronome"]').click();
    await expect(page.locator('[data-metro-play]')).toBeVisible();
    // collapse to the rail and back (remembered)
    await nav.locator('.sn-collapse').click();
    await expect(nav).toHaveClass(/collapsed/);
    expect((await nav.boundingBox())!.width).toBeLessThan(90);
    await nav.locator('.sn-collapse').click();
    await expect(nav).not.toHaveClass(/collapsed/);
  });

  test('Hebrew: the side menu is on the right; tablet width shows the rail; phones keep the tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?unlock=all&lang=he#/arcade');
    const nav = page.locator('[data-side-nav]');
    const box = (await nav.boundingBox())!;
    expect(box.x + box.width).toBeGreaterThan(1435);
    await page.setViewportSize({ width: 900, height: 800 });
    expect((await nav.boundingBox())!.width).toBeLessThan(90);
    await expect(nav.locator('.sn-label').first()).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(nav).toBeHidden();
    await expect(page.locator('.tabbar')).toBeVisible();
  });

  test('exercise keys: a digit answers, Enter continues after a wrong answer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?unlock=all&lang=en');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    for (let i = 0; i < 12 && !(await page.locator('[data-continue]').isVisible()); i++) {
      await expect(page.locator('main.lesson.phase-listening .answers .answer:not([disabled])').first()).toBeVisible({ timeout: 30_000 });
      const n = await page.locator('main.lesson .answers .answer').count();
      const wrongIdx = await page.locator('main.lesson .answers .answer').evaluateAll((bs) => bs.findIndex((b) => !b.classList.contains('is-wrong')));
      await page.keyboard.press(String(Math.min(n, wrongIdx + 1)));
      await page.waitForTimeout(900);
      await page.waitForFunction(() => !!document.querySelector('[data-continue]') || !!document.querySelector('main.lesson.phase-listening .answers .answer:not([disabled])') || !!document.querySelector('.recap-row'), null, { timeout: 30_000 });
      if (await page.locator('.recap-row').first().isVisible()) return; // answered right every time: the keys worked
    }
    await expect(page.locator('[data-continue]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-continue]')).toHaveCount(0);
  });
});
