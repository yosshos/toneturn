import { expect, test, type Page } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

/** Degree answer for the current question, read from the key badge (B♭ major → 1, otherwise 5). */
async function correctDegree(page: Page): Promise<1 | 5> {
  const key = await page.locator('.key-badge').innerText();
  return /B♭|Si♭|סי♭/.test(key) ? 1 : 5;
}

async function pill(page: Page, i: number) {
  return page.locator('.pill').nth(i).getAttribute('class');
}

test.describe('home & language', () => {
  test('defaults to English with letter names @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    // First visit: finding your level is the default step; lesson 1 is one tap away.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let’s find your level');
    await expect(page.getByRole('button', { name: 'Or start from lesson 1' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Voice' })).toHaveAttribute('aria-checked', 'true');
    // Touch targets on the main actions are at least 44px tall.
    const box = await page.locator('.first-run-cta').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('Hebrew toggle → RTL and Do-Re-Mi names', async ({ page }) => {
    await page.goto('/');
    // The language picker lives in Settings (menu → Settings).
    await page.goto('/#/settings/language');
    await page.getByRole('radio', { name: 'עברית' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('בואו נמצא את הרמה שלכם');
    // persisted
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('lesson', () => {
  test('Buttons mode: three rounds to a 3/3 recap @mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('.pill').nth(i)).toHaveClass(/current/);
      const d = await correctDegree(page);
      const btn = page.locator(`.answer[data-answer="${d}"]`);
      await expect(btn).toBeEnabled();
      await btn.click();
      await btn.click({ force: true, trial: false }).catch(() => {}); // a double tap must not double-score
      await expect.poll(() => pill(page, i), { timeout: 60_000 }).toMatch(/correct/); // real-time audio
    }
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.score-line')).toContainText('3/3');
    // Quick, right first time, no replays: a full fluency score.
    await expect(page.locator('.fluency-score')).toHaveAttribute('data-score', '100');
    await expect(page.locator('.star.won')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Replay 1/ })).toBeVisible();
    await page.getByRole('button', { name: 'Home' }).click();
    // Lesson 1 runs with automatic aids (a new player is below Solid): each answer gives 80 % XP (8),
    // plus the full speed bonus (3) for answering within the pace goal.
    await expect(page.locator('.wk-ring')).toContainText('33');
    // Today (SPEC-TODAY): the workout and one small Find my level button — no topic list, no tools, no account card.
    await expect(page.locator('.tab[data-tab="home"]')).toContainText('Today');
    await expect(page.locator('.wk-card')).toBeVisible();
    await expect(page.locator('main.home [data-topic]')).toHaveCount(0);
    await expect(page.locator('main.home .tool-card, main.home .domain-tile, main.home .account-card')).toHaveCount(0);
    await expect(page.locator('[data-find-level]')).toHaveCount(1);
    await page.locator('[data-find-level]').click();
    await expect(page.locator('.level-sheet [data-level-all]')).toBeVisible();
    await expect(page.locator('.level-sheet [data-domain]')).toHaveCount(7);
  });

  test('Voice mode (simulator): hands-free after one Start', async ({ page }) => {
    await page.goto('/?sim=1');
    await expect(page.locator('.sim-banner')).toBeVisible();
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    // No further interaction.
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 120_000 });
    // Script: right, wrong→right, right
    await expect(page.locator('.score-line')).toContainText('2/3');
    await expect(page.locator('.recap-row').nth(1)).toHaveClass(/correct-retry/);
    // Simulator keeps progress only in memory: nothing survives a reload.
    await page.getByRole('button', { name: 'Home' }).click();
    await page.reload();
    await expect(page.locator('.first-run-cta')).toBeVisible(); // back to the first visit: nothing was kept
  });

  test('Buttons → Voice mid-question keeps the attempt history', async ({ page }) => {
    await page.goto('/?sim=1');
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    const d = await correctDegree(page);
    const wrong = page.locator(`.answer[data-answer="${d === 1 ? 5 : 1}"]`);
    await expect(wrong).toBeEnabled();
    await wrong.click();
    await expect(page.locator('.feedback')).toContainText('Not quite');
    await page.getByRole('radio', { name: 'Voice' }).click();
    // Simulator answers correctly on the replayed prompt → correct on retry, no XP.
    await expect.poll(() => pill(page, 0), { timeout: 60_000 }).toMatch(/correct-retry/);
    await expect(page.getByRole('radio', { name: 'Voice' })).toHaveAttribute('aria-checked', 'true');
  });

  test('mic denied: capture error panel, then Switch to buttons continues', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    const panel = page.locator('.perm-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Microphone capture');
    await expect(panel).toContainText('permission-denied');
    await expect(panel).toContainText(/NotAllowedError|NotSupportedError/); // raw browser error is shown verbatim
    await panel.getByRole('button', { name: 'Switch to buttons' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.answer')).toHaveCount(2);
    for (let i = 0; i < 3; i++) await expect(page.locator('.pill').nth(i)).toHaveClass(/pending/);
  });
});

test.describe('voice check', () => {
  test('fake microphone yields a signal and a pitch', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto('/#/diagnostics');
    await expect(page.getByText('secure context')).toBeVisible();
    await page.getByRole('button', { name: /Test microphone/ }).click();
    await expect(page.locator('.log')).toContainText('capture opened');
    await expect(page.locator('.meter-wrap')).toContainText('✓ signal', { timeout: 10_000 });
    await expect(page.locator('.meter-wrap')).toContainText('Hz');
  });

  test('denied microphone is classified as capture/permission-denied', async ({ page }) => {
    await page.goto('/#/diagnostics');
    await page.getByRole('button', { name: /Test microphone/ }).click();
    await expect(page.locator('.err-box')).toContainText('capture/permission-denied');
  });
});

test.describe('settings', () => {
  test('naming override, Hebrew narration example uses במול, voice picker present', async ({ page }) => {
    await page.goto('/#/settings/language');
    const example = page.locator('.example');
    await expect(example).toContainText('B♭');
    await expect(example).toContainText('B flat');
    await page.getByRole('radio', { name: 'Do Re Mi' }).click();
    await expect(example).toContainText('Si♭');
    await expect(example).toContainText('Si flat');
    // Narration in Hebrew + Auto naming → סי במול (never "פלאט").
    await page.getByRole('radiogroup', { name: 'Note names' }).getByRole('radio', { name: 'Auto', exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Narration in' }).getByRole('radio', { name: 'עברית' }).click();
    await expect(example).toContainText('סי במול');
    await expect(example).not.toContainText('פלאט');
    // Gender preference control.
    const voiceGroup = page.getByRole('radiogroup', { name: 'Voice type' });
    await expect(voiceGroup.getByRole('radio', { name: /Female/ })).toBeVisible();
    await voiceGroup.getByRole('radio', { name: /Male/ }).last().click();
    await expect(voiceGroup.getByRole('radio', { name: /Male/ }).last()).toHaveAttribute('aria-checked', 'true');
    // Either a voice list or the "no voices" notice — headless browsers often have none.
    await expect(page.locator('.voice-list, .field-hint.warn').first()).toBeVisible();
  });
});

test.describe('more lessons', () => {
  test('completing lesson 1 unlocks lesson 2 on the path', async ({ page }) => {
    // The path is its own tab (0.37); 0.38: an adaptive spiral — the first step is current, the rest locked or open.
    await page.goto('/#/path');
    await expect(page.locator('.road .node.current')).toHaveCount(1);
    await page.goto('/');
    await page.reload();
    await page.getByRole('radio', { name: 'Buttons' }).click();
    await page.getByRole('button', { name: 'Or start from lesson 1' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('.pill').nth(i)).toHaveClass(/current/);
      const d = await correctDegree(page);
      const btn = page.locator(`.answer[data-answer="${d}"]`);
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect.poll(() => pill(page, i), { timeout: 60_000 }).toMatch(/correct/);
    }
    await expect(page.getByRole('button', { name: /Next lesson/ })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Home' }).click();
    // Today's workout leads with the next path step (no longer the finished lesson).
    await expect(page.locator('.wk-next')).not.toContainText('two homes');
    await page.locator('.tab[data-tab="path"]').click();
    // The finished lesson counts on the path wherever it was played (spec AF): one step done.
    await expect(page.locator('.path-head .count-chip')).toHaveText(/^1\//);
  });

  test('Major or minor (simulator, hands-free)', async ({ page }) => {
    await page.goto('/?sim=1&unlock=all#/path');
    await page.getByRole('button', { name: /3\. Major or minor/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await expect(page.locator('.intro-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 140_000 });
    await expect(page.locator('.score-line')).toContainText('4/5');
  });

  test('Sing home & five (simulator): live tuner and per-attempt pitch feedback', async ({ page }) => {
    await page.goto('/?sim=1&unlock=all#/path');
    await page.getByRole('button', { name: /5\. Sing home & five/ }).click();
    await page.getByRole('button', { name: 'Use my voice & start' }).click();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.tuner')).toBeVisible();
    await expect(page.locator('.feedback')).toContainText(/Spot on|A little low/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Lesson complete' })).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('.score-line')).toContainText('2/3');
    await expect(page.locator('.recap-row').nth(1)).toContainText('low');
  });
});

test('settings: categories start closed, open on tap and are remembered', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.locator('.set-group')).toHaveCount(9); // + Privacy & friends (0.42)
  await expect(page.locator('.set-group[open]')).toHaveCount(0);
  await page.locator('.set-group[data-group="midi"] > summary').click();
  await expect(page.getByRole('radiogroup', { name: 'MIDI keyboard' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.set-group[data-group="midi"]')).toHaveAttribute('open', '');
});
