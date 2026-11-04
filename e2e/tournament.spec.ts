import { expect, test, type Page } from '@playwright/test';

/** Wait until a round is open for answers, then tap one choice per player. */
async function playRound(page: Page, picks: number[]) {
  await expect(page.locator('main.tournament.stage-answering')).toBeVisible({ timeout: 30_000 });
  for (const [player, i] of picks.entries()) {
    await page.locator(`.duel-half.p${player} .answer`).nth(i).dispatchEvent('pointerdown');
  }
  await expect(page.locator('main.tournament.stage-reveal, main.recap')).toBeVisible({ timeout: 15_000 });
}

test.describe('tournament', () => {
  test('duel on one device: split screen, both answer, standings at the end', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.getByRole('button', { name: /Duel on this device/ }).click();
    await page.getByRole('textbox', { name: 'Player 1' }).fill('Dana');
    await page.getByRole('textbox', { name: 'Player 2' }).fill('Omer');
    await page.getByRole('radio', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: /Play/ }).click();

    await expect(page.locator('.duel-half.p0.flip')).toBeVisible();
    await expect(page.locator('.duel-half.p1')).toContainText('Omer');
    await playRound(page, [0, 1]);
    // Exactly one choice is marked right on each half.
    await expect(page.locator('.duel-half.p0 .answer.right')).toHaveCount(1);
    await expect(page.locator('.duel-half.p1 .answer.right')).toHaveCount(1);
    await page.screenshot({ path: 'test-results/duel-reveal.png' });
    for (let r = 1; r < 5; r++) await playRound(page, [0, 1]);

    await expect(page.locator('main.recap.scoreboard')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.board li')).toHaveCount(2);
    await expect(page.locator('.board')).toContainText('Dana');
    await page.screenshot({ path: 'test-results/duel-over.png' });
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: /Duel on this device/ })).toBeVisible();
  });

  test('daily challenge: 5 questions, spoiler-free share card, first play recorded', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.getByRole('button', { name: /Daily challenge/ }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    for (let r = 0; r < 5; r++) await playRound(page, [0]);

    await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 30_000 });
    const card = page.locator('.share-card');
    await expect(card).toHaveText(/^ToneTurn Daily \d{4}-\d{2}-\d{2}\n[🟩🟨⬜]{5} {2}[\d,]+ pts$/u);
    const text = await card.textContent();
    await page.getByRole('button', { name: 'Home' }).click();

    await expect(page.getByRole('button', { name: /Daily challenge/ })).toContainText('Done today');
    await page.reload();
    await page.getByRole('button', { name: /Daily challenge/ }).click();
    await expect(page.locator('.share-card')).toHaveText(text!);
    await expect(page.getByRole('button', { name: /Play again/ })).toBeVisible();
    // Signed out: the leaderboard invites to sign in.
    await expect(page.getByText(/Sign in to see how you rank today/)).toBeVisible();
  });
});
