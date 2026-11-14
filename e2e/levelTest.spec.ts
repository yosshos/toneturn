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

for (const inst of ['guitar', 'bass'] as const)
  test(`${inst} level test: sections of real levels, a miss moves on`, async ({ page }) => {
    await page.goto('/?sim=1#/drills');
    await page.locator(`[data-inst="${inst}"]`).click();
    await page.locator('[data-drills-test]').click();
    await expect(page.locator(`[data-level-test="${inst}"]`)).toBeVisible();
    expect(await page.locator('.lt-sections li').count()).toBeGreaterThanOrEqual(5);
    await page.locator('[data-test-start]').click();
    const probe = page.locator('[data-test-probe]');
    // AUDIT-CONTENT-THEORY §ב.3: the guitar test follows the course path — chords first; bass opens with the hands.
    await expect(probe).toHaveAttribute('data-test-strand', inst === 'guitar' ? 'chords' : 'hands');
    await page.screenshot({ path: `test-results/level-test-${inst}.png` });
    const seen: string[] = [];
    for (let k = 0; k < 40; k++) {
      if (await page.locator('[data-level-test-done]').isVisible()) break;
      seen.push((await probe.getAttribute('data-test-strand')) ?? '');
      await page.locator('[data-test-too-hard]').click();
    }
    await expect(page.locator('[data-level-test-done]')).toBeVisible();
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);
    expect(seen.length).toBeLessThanOrEqual(14);
  });

// 0.84: the voice course's test — the course's own families in sections; skipping moves through all of them.
test('voice level test: sections of the voice course, each take in the real exercise screen', async ({ page }) => {
  await page.goto('/?sim=1#/vocal');
  await page.locator('[data-voice-probe]').click();
  await expect(page.locator('[data-voice-test]')).toBeVisible();
  expect(await page.locator('.lt-sections li').count()).toBeGreaterThanOrEqual(5);
  await page.locator('[data-test-start]').click();
  const probe = page.locator('[data-test-strand]');
  await expect(probe).toHaveAttribute('data-test-strand', 'v-pitch');
  await expect(page.locator('.pn-click').first()).toBeVisible(); // the click / now-cue of the real screen
  const seen: string[] = [];
  for (let k = 0; k < 10; k++) {
    if (await page.locator('[data-level-test-done]').isVisible()) break;
    seen.push((await probe.getAttribute('data-test-strand')) ?? '');
    await page.locator('.vlt-skip').click();
  }
  await expect(page.locator('[data-level-test-done]')).toBeVisible();
  expect(new Set(seen).size).toBe(seen.length);
  expect(seen.length).toBeGreaterThanOrEqual(5);
});

// Never lose progress: the voice test left half-way continues at the same section.
test('voice level test continues where it was left', async ({ page }) => {
  await page.goto('/?sim=1#/vocal');
  await page.locator('[data-voice-probe]').click();
  await page.locator('[data-test-start]').click();
  const probe = page.locator('[data-test-strand]');
  await expect(probe).toHaveAttribute('data-test-strand', 'v-pitch');
  await page.locator('.vlt-skip').click();
  await page.locator('.vlt-skip').click();
  const third = await probe.getAttribute('data-test-strand');
  await page.reload();
  await page.locator('[data-voice-probe]').click();
  await expect(page.locator('[data-test-resume]')).toContainText('3');
  await page.locator('[data-test-resume]').click();
  await expect(probe).toHaveAttribute('data-test-strand', third!);
});
