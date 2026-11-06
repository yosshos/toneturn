import { expect, test, type Page } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

/** Record the order in which pads light up during playback (what a player sees and hears). */
async function watchPads(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __lit: number[] };
    w.__lit = [];
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target as HTMLElement;
        if (m.attributeName === 'class' && el.classList.contains('pad') && el.classList.contains('lit') && !(m.oldValue ?? '').includes('lit')) {
          const pads = [...document.querySelectorAll('.pad')];
          w.__lit.push(pads.indexOf(el));
        }
      }
    });
    obs.observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
  });
}
const resetLit = (page: Page) => page.evaluate(() => ((window as unknown as { __lit: number[] }).__lit = []));
const lit = (page: Page) => page.evaluate(() => (window as unknown as { __lit: number[] }).__lit.slice());

async function repeatTurn(page: Page, expectLen: number, mistake = false) {
  await expect(page.locator('main.game.stage-turn, main.game.stage-demo, main.game.stage-respond').first()).toBeVisible({ timeout: 30_000 });
  await resetLit(page);
  await expect(page.locator('.turn-banner')).toHaveText(/Your turn/, { timeout: 30_000 });
  // Pads no longer light up (melodic memory, not colours): read the sequence from the strip's data.
  const seq = await page.locator('.chain-strip .cs').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.pad)));
  void lit;
  expect(seq).toHaveLength(expectLen);
  if (mistake) {
    await page.locator('.pad').nth((seq[0] + 1) % 4).dispatchEvent('pointerdown');
  } else {
    for (const i of seq) await page.locator('.pad').nth(i).dispatchEvent('pointerdown');
  }
  await expect(page.locator('.feedback')).not.toHaveClass(/empty/, { timeout: 10_000 });
}

test.describe('memory games', () => {
  test('home lists both games', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Echo Chain/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Beat Echo/ })).toBeVisible();
  });

  test('Echo Chain solo with pads: chain grows, a mistake ends it, best is saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Echo Chain/ }).click();
    await expect(page.getByRole('radio', { name: /Note pads/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: /Play/ }).click();
    await watchPads(page);
    await repeatTurn(page, 2);
    await page.screenshot({ path: 'test-results/echo-chain-play.png' });
    await repeatTurn(page, 3);
    await repeatTurn(page, 4, true);
    await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.big-score b')).toHaveText('3');
    await page.screenshot({ path: 'test-results/echo-chain-over.png' });
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: /Echo Chain/ })).toContainText('Best: 3');
  });

  test('Echo Chain, two players on one device: named turns and a winner', async ({ page }) => {
    await page.goto('/#/games');
    await page.getByRole('radio', { name: '2', exact: true }).click();
    await page.getByLabel('Player 1').fill('Dana');
    await page.getByLabel('Player 2').fill('Omer');
    await page.getByRole('button', { name: /Play/ }).click();
    await watchPads(page);
    await expect(page.locator('.player-chips li')).toHaveCount(2);
    await expect(page.locator('.player-chips li.now')).toContainText('Dana');
    await repeatTurn(page, 2); // Dana
    await expect(page.locator('.player-chips li.now')).toContainText('Omer', { timeout: 20_000 });
    await repeatTurn(page, 2, true); // Omer fails
    await expect(page.getByRole('heading', { name: /Dana/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.board li.win')).toContainText('Dana');
    await page.screenshot({ path: 'test-results/echo-chain-scoreboard.png' });
    await page.getByRole('button', { name: /Rematch/ }).click();
    await expect(page.locator('.player-chips li.now')).toContainText('Dana');
  });

  test('Beat Echo: count-in and demo play, no taps → round lost, game over', async ({ page }) => {
    await page.goto('/#/games');
    await page.getByRole('radio', { name: /Beat Echo/ }).click();
    await expect(page.getByRole('radio', { name: /Tapping/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: /Fast/ }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.locator('.turn-banner')).toHaveText(/Listen/, { timeout: 30_000 });
    await expect(page.locator('.beat-grid .onset').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/beat-echo-demo.png' });
    await expect(page.locator('.turn-banner')).toHaveText(/Your turn/, { timeout: 30_000 });
    await expect(page.locator('.tap-pad.kick')).toHaveClass(/live/);
    await expect(page.locator('.tap-pad.snare')).toHaveClass(/live/);
    await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.big-score b')).toHaveText('0');
  });

  test('Beat Echo (kick & snare): tapping each hit on its drum passes a round', async ({ page }) => {
    await page.goto('/#/games');
    await page.getByRole('radio', { name: /Beat Echo/ }).click();
    await page.getByRole('radio', { name: /Slow/ }).click();
    await page.getByRole('button', { name: /Play/ }).click();
    // Read the pattern from the beat grid shown during the demo.
    await expect(page.locator('.beat-grid .onset').first()).toBeVisible({ timeout: 30_000 });
    const lefts = await page.locator('.beat-grid .onset').evaluateAll((els) => els.map((e) => parseFloat((e as HTMLElement).style.left)));
    const kinds = await page.locator('.beat-grid .onset').evaluateAll((els) => els.map((e) => (e.classList.contains('snare') ? 'KeyJ' : 'KeyF')));
    expect(kinds).toContain('KeyF');
    const beats = await page.locator('.beat-grid .beat-cell').count();
    const beatMs = 60000 / 75;
    const onsetsMs = lefts.map((l, i) => ({ at: (l / 100) * beats * beatMs, code: kinds[i] }));
    // Tap from inside the page, scheduled from the moment the response opens (stage turns "Your turn").
    await page.evaluate((offsets) => {
      const banner = document.querySelector('.turn-banner')!;
      const obs = new MutationObserver(() => {
        if (!/Your turn/.test(banner.textContent ?? '')) return;
        obs.disconnect();
        // The banner flips ~60 ms before beat 1 is heard.
        const t0 = performance.now() + 60;
        for (const o of offsets) {
          setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: o.code, key: o.code.slice(3).toLowerCase() })), Math.max(0, t0 + o.at - performance.now()));
        }
      });
      obs.observe(banner, { childList: true, characterData: true, subtree: true });
    }, onsetsMs);
    await expect(page.locator('.feedback.correct')).toBeVisible({ timeout: 40_000 });
    await expect(page.locator('.chain-count b')).toHaveText('3', { timeout: 20_000 });
  });
});
