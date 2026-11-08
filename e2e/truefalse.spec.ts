import { expect, test } from '@playwright/test';
import { openGames } from './practice';

test.describe('Truth or Bluff', () => {
  test('solo 60-second run on theory statements: answer, a bluff shows why, score, best kept', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/#/arcade');
    await openGames(page);
    await page.getByRole('button', { name: /Truth or Bluff/ }).first().click();
    await expect(page.getByText('No best score yet at this level.')).toBeVisible();
    // Default topics: all the theory (no sound); level Easy.
    await expect(page.locator('.tf-topics .chip.on')).toHaveCount(9);
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.tf-statement .tf-text')).not.toBeEmpty();
    await page.screenshot({ path: 'test-results/truefalse.png' });
    // Answer "true" every time until the run ends; a bluff answered "true" shows the reason.
    let sawWhy = false;
    for (let i = 0; i < 500 && !(await page.getByRole('heading', { name: 'Game over' }).isVisible()); i++) {
      const b = page.locator('.tf-true:not([disabled])');
      if (await b.isVisible()) await b.dispatchEvent('pointerdown');
      if (!sawWhy && (await page.locator('.tf-why').isVisible())) {
        sawWhy = true;
        await expect(page.locator('.tf-why')).toContainText('Bluff');
      }
      await page.waitForTimeout(250);
    }
    expect(sawWhy).toBe(true);
    await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.big-score b')).toHaveText(/^\d+(\.5)?$/);
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByText(/Best: \d/)).toBeVisible();
  });

  test('choose topics and level: only key signatures, hard; interval trios start with one interval', async ({ page }) => {
    await page.goto('/#/truefalse');
    const chips = page.locator('.tf-topics .chip');
    // Keep only Key signatures (turn the others off).
    for (const id of ['notes', 'rhythm', 'intervals', 'chords', 'scales', 'circle', 'harmony', 'jazz']) await chips.and(page.locator(`[data-topic="${id}"]`)).click();
    await expect(page.locator('.tf-topics .chip.on')).toHaveCount(1);
    await page.getByRole('radio', { name: 'Hard' }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.tf-statement')).toHaveAttribute('data-topic', 'keys');
    await expect(page.locator('.tf-text')).toContainText(/major|minor/);
    await page.locator('.tf-top .icon-btn').click();
    // Interval trios, Easy: a single interval.
    await chips.and(page.locator('[data-topic="trio"]')).click();
    await chips.and(page.locator('[data-topic="keys"]')).click();
    await page.getByRole('radio', { name: 'Easy' }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.tf-text')).toContainText(/ up to /);
  });

  test('in the Games menu', async ({ page }) => {
    await page.goto('/#/games');
    await page.locator('.games-tf').click();
    await expect(page.getByRole('heading', { name: 'Truth or Bluff', level: 1 })).toBeVisible();
  });

  test('duel on one device: the statement faces both players; 10 rounds', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/#/truefalse');
    await page.getByRole('radio', { name: 'Duel on this device' }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.duel-half.p0.flip')).toBeVisible();
    await expect(page.locator('.duel-half .tf-half-text')).toHaveCount(2);
    for (let r = 0; r < 40 && !(await page.locator('main.recap').isVisible()); r++) {
      const t0 = page.locator('.duel-half.p0 [data-answer="true"]:not([disabled])');
      const f1 = page.locator('.duel-half.p1 [data-answer="false"]:not([disabled])');
      if (await t0.isVisible()) await t0.dispatchEvent('pointerdown');
      if (await f1.isVisible()) await f1.dispatchEvent('pointerdown');
      await page.waitForTimeout(2800);
    }
    await expect(page.locator('main.recap .board li')).toHaveCount(2, { timeout: 30_000 });
  });

  test('online: the room gets the chosen topics (dev in-page server)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?fakeRooms#/truefalse');
    await page.getByRole('radio', { name: /Online/ }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.getByRole('heading', { name: 'Online', level: 1 })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Truth or Bluff' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.tf-topics')).toBeVisible();
    await page.getByRole('textbox', { name: /Your name/ }).fill('Dana');
    await page.getByRole('radio', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.room-players li')).toHaveCount(3, { timeout: 10_000 });
    await page.getByRole('button', { name: /Start the game/ }).click();
    await expect(page.locator('main.online-play.stage-answering')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('main.online-play .ask')).toContainText('True or bluff?');
    await expect(page.locator('main.online-play .answer')).toHaveCount(2);
  });
});
