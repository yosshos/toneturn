import { expect, test } from '@playwright/test';
import { openGames } from './practice';

test.describe('online rooms', () => {
  test('signed out: the online screen asks to sign in', async ({ page }) => {
    await page.goto('/#/arcade');
    await openGames(page);
    await page.getByRole('button', { name: /Online room/ }).click();
    await expect(page.getByText(/Sign in to play online/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeVisible();
  });

  test('full room game against bots (dev in-page server): lobby, rounds, reveal board, podium', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/?fakeRooms#/online');
    await page.getByRole('textbox', { name: /Your name/ }).fill('Dana');
    await page.getByRole('radio', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('.room-code')).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
    await expect(page.locator('.room-players li')).toHaveCount(3, { timeout: 10_000 });
    await expect(page.locator('.room-players')).toContainText('Ada');
    await page.screenshot({ path: 'test-results/online-lobby.png' });
    await page.getByRole('button', { name: /Start the game/ }).click();

    for (let r = 0; r < 5; r++) {
      await expect(page.locator('main.online-play.stage-answering')).toBeVisible({ timeout: 30_000 });
      await page.locator('.answer').first().dispatchEvent('pointerdown');
      await expect(page.locator('main.online-play.stage-reveal, main.room-over')).toBeVisible({ timeout: 30_000 });
      if (r === 0) {
        await expect(page.locator('.answer.right')).toHaveCount(1);
        await expect(page.locator('.room-board li')).toHaveCount(3);
        await page.screenshot({ path: 'test-results/online-reveal.png' });
      }
    }
    await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.podium .step')).toHaveCount(3);
    await page.screenshot({ path: 'test-results/online-over.png' });
  });

  test('joining a code that does not exist shows an error', async ({ page }) => {
    await page.goto('/?fakeRooms#/online/ZZZ222');
    await expect(page.getByRole('textbox', { name: 'Room code' })).toHaveValue('ZZZ222');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(/No open room/);
  });
});
