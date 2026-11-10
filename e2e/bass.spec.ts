import { expect, test, type Page } from '@playwright/test';

// Bass course content track (BASS_AUDIT B1–B3, B5, B17): the chart-only free levels, bass clef notation, the whole
// drill in a moving tab window, the headphones gate for drums — each on one phone screen.
test.describe('bass course', () => {
  test.use({ viewport: { width: 375, height: 780 } });

  const open = async (page: Page, family: string, level: string) => {
    await page.goto('about:blank');
    await page.goto('/?sim=1#/drills');
    await page.locator('[data-inst="bass"]').click();
    await page.locator('[data-topic="all"]').click();
    await page.locator(`[data-family="${family}"]`).click();
    const card = page.locator(`[data-level="${level}"]`);
    if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
    await page.locator(`[data-level-start="${level}"]`).click();
    await expect(page.locator('[data-drills="run"]')).toBeVisible();
  };
  const fitsScreen = async (page: Page) => {
    const h = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
    expect(h).toBeLessThanOrEqual(4);
  };

  test('topics: time & groove, reading, bass ear and upright have their own tabs', async ({ page }) => {
    await page.goto('/?sim=1#/drills');
    await page.locator('[data-inst="bass"]').click();
    for (const t of ['time', 'reading', 'ear', 'upright']) await expect(page.locator(`[data-topic="${t}"]`)).toBeVisible();
    await page.locator('[data-topic="time"]').click();
    await expect(page.locator('[data-family="b-pocket"]')).toBeVisible();
    await expect(page.locator('[data-family="b-scale"]')).toHaveCount(0);
  });

  test('free walking shows only the chart; the model line is opt-in', async ({ page }) => {
    await open(page, 'b-walk', 'b-walk-7');
    await expect(page.locator('[data-chart-only]')).toBeVisible();
    await expect(page.locator('[data-drills="run"] .drill-tab')).toHaveCount(0);
    await fitsScreen(page);
    await page.locator('[data-model-line]').click();
    await expect(page.locator('[data-drills="run"] .drill-tab svg').first()).toBeVisible();
  });

  test('reading is in the bass clef; a long drill pages through its whole tab', async ({ page }) => {
    await open(page, 'b-read', 'b-read-3');
    await expect(page.locator('[data-drills="run"] .drill-staff[data-clef="bass"] svg').first()).toBeVisible();
    await expect(page.locator('[data-drills="run"] .drill-tab')).toHaveCount(0);
    await fitsScreen(page);
    await open(page, 'b-walk', 'b-walk-2');
    const tab = page.locator('[data-drills="run"] .drill-tab');
    await expect(tab).toHaveAttribute('data-tab-lines', '7');
    await expect(tab.locator('.tab-pager small')).toHaveText('1–2 / 7');
    await tab.locator('.tab-pager button').last().click();
    await expect(tab.locator('.tab-pager small')).toHaveText('3–4 / 7');
    await fitsScreen(page);
  });

  test('a pocket level asks where the sound goes before playing drums (never a pass)', async ({ page }) => {
    await open(page, 'b-pocket', 'b-pocket-1');
    await expect(page.locator('[data-drums-gate]')).toBeVisible();
    await page.locator('[data-drums-choice="speaker"]').click();
    await expect(page.locator('[data-drums="off"]')).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toBeVisible();
    await fitsScreen(page);
  });

  test('a style level plays with a band behind the same headphones gate; the speaker keeps the click', async ({ page }) => {
    await open(page, 'b-styles', 'b-styles-1');
    const gate = page.locator('[data-drums-gate]');
    await expect(gate).toBeVisible();
    await expect(gate).toContainText(/band/i);
    await page.locator('[data-drums-choice="headphones"]').click();
    await expect(page.locator('[data-drums="on"]')).toHaveAttribute('data-band', 'rock');
    await page.locator('[data-drums="on"]').click();
    await expect(page.locator('[data-drums="off"]')).toBeVisible();
    await fitsScreen(page);
  });

  test('quick study: prep time to read before Play, skippable', async ({ page }) => {
    await open(page, 'b-read', 'b-read-12');
    await page.locator('[data-drums-choice="speaker"]').click();
    await expect(page.locator('[data-prep]')).toBeVisible();
    await expect(page.locator('[data-drill-play]')).toHaveCount(0);
    await page.locator('[data-prep-ready]').click();
    await expect(page.locator('[data-drill-play]')).toBeVisible();
    await fitsScreen(page);
  });

  test('0.66: target-note solos show the chart only; position reading is in the bass clef; picking patterns — one screen each', async ({ page }) => {
    await open(page, 'b-impro', 'b-impro-5');
    await page.locator('[data-drums-choice="speaker"]').click();
    await expect(page.locator('[data-chart-only]')).toBeVisible();
    await fitsScreen(page);
    await open(page, 'b-posread', 'b-posread-1');
    await expect(page.locator('[data-drills="run"] .drill-staff[data-clef="bass"] svg').first()).toBeVisible();
    await fitsScreen(page);
    await open(page, 'b-posread', 'b-posread-6');
    await expect(page.locator('[data-drills="run"] .drill-staff[data-clef="bass"] svg').first()).toBeVisible();
    await fitsScreen(page);
    for (const [f, l] of [['b-pick', 'b-pick-7'], ['b-pluck', 'b-pluck-11']]) {
      await open(page, f, l);
      await fitsScreen(page);
    }
  });

  test('upright thumb position reads the treble clef; studies read from the staff — one screen each', async ({ page }) => {
    await open(page, 'b-up-read', 'b-up-read-5');
    await expect(page.locator('[data-drills="run"] .drill-staff[data-clef="treble"] svg').first()).toBeVisible();
    await fitsScreen(page);
    await open(page, 'b-up-arco', 'b-up-arco-9');
    await expect(page.locator('[data-drills="run"] .drill-staff[data-clef="bass"] svg').first()).toBeVisible();
    await fitsScreen(page);
  });
});
