import { expect, test, type Page } from '@playwright/test';

// The live singing view (docs/research/VOICE-FEEDBACK-UI.md): in the simulator fed in real time (?simrt=1), a take
// shows the pitch lane, the note readout and the zone meter on one 320 × 720 phone screen, then the review.
// SHOTS=1 also writes the screenshots for the owner to docs/voice-ui-shots/.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });

const SHOTS = !!process.env.SHOTS;

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const over = document.scrollingElement!.scrollHeight - innerHeight;
    if (banner) banner.style.display = '';
    return over;
  });
}

async function openLevel(page: Page, lang: string, lv: number, item = 0) {
  await page.goto(`/?sim=1&simrt=1&unlock=all&lang=${lang}&vlevel=${lv}#/vocal`);
  const sing = page.locator('.vocal .vocal-actions .btn.mega').first();
  await expect(sing).toBeVisible({ timeout: 60_000 });
  for (let k = 0; k < item; k++) {
    // move on without singing: sing once, then Next
    await sing.click();
    await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
    await page.locator('.vocal .vocal-actions .btn.mega').first().click();
  }
  return sing;
}

const CASES = [
  { lv: 1, name: 'hold', item: 1 },
  { lv: 3, name: 'vibrato', item: 1 },
  { lv: 7, name: 'melody', item: 1 },
];

for (const lang of ['en', 'he'] as const) {
  for (const c of CASES) {
    test(`sing lane: ${c.name} live + review fit 320×720 (${lang})`, async ({ page }) => {
      const sing = await openLevel(page, lang, c.lv, c.item);
      // the mic check answers before the take (a synthetic voice in the simulator)
      await expect(page.locator('[data-voice-check="got"]')).toBeVisible({ timeout: 10_000 });
      expect(await overflow(page), 'ready screen').toBeLessThanOrEqual(2);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-ready-${lang}.png` });
      await sing.click();
      // live: the lane, the readout and the meter, with a note name once the voice is heard
      await expect(page.locator('.sing-lane.is-live')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.sing-readout')).toBeVisible();
      await expect(page.locator('.zone-meter')).toBeVisible();
      await expect(page.locator('.sing-readout .sr-note > bdi')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(c.name === 'melody' ? 900 : 1600);
      expect(await overflow(page), 'live screen').toBeLessThanOrEqual(2);
      await expect(page.locator('.sl-trail').first()).toHaveAttribute('d', /L/);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-live-${lang}.png` });
      if (c.name === 'vibrato') {
        // slice 4: the vibrato chip draws the measured wave (rate, width) over the goal's ghost
        await expect(page.locator('.vib-chip[data-vib="vibrato"]')).toBeVisible({ timeout: 6_000 });
        await expect(page.locator('.vib-chip .vc-ghost')).toHaveCount(1);
        if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s4-vibrato-live-${lang}.png` });
      }
      // review
      await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('.sing-lane.is-review')).toBeVisible();
      await expect(page.locator('.take-score b')).toContainText('%');
      expect(await overflow(page), 'review screen').toBeLessThanOrEqual(2);
      if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s1-${c.name}-review-${lang}.png` });
      if (c.name === 'vibrato') {
        await expect(page.locator('.take-card ~ * .vib-chip, .sing-meters .vib-chip').first()).toBeVisible();
        expect(await overflow(page), 'vibrato review').toBeLessThanOrEqual(2);
        if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s4-vibrato-review-${lang}.png` });
      }
      if (c.name === 'melody') {
        // slice 2: per-note chips over the blocks, a money note's double outline, tap a note for its detail
        await expect(page.locator('.sl-chip').first()).toBeVisible();
        expect(await page.locator('.sl-chip').count()).toBe(5);
        await expect(page.locator('.sl-outline-2')).toHaveCount(1);
        await expect(page.locator('.sl-centre')).toHaveAttribute('d', /L/);
        await page.locator('.sl-hit').nth(3).click();
        await expect(page.locator('.note-detail')).toBeVisible();
        expect(await overflow(page), 'note detail').toBeLessThanOrEqual(2);
        if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s2-melody-note-${lang}.png` });
        await page.locator('.note-detail .nd-close').click();
        await expect(page.locator('.note-detail')).toHaveCount(0);
      }
    });
  }
}

// slice 3: songs (the timed session and the sing-along) ride the same lane, with the phrase strip above it
for (const lang of ['en', 'he'] as const) {
  test(`sing lane: song with the band, live + review (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&simrt=1&unlock=all&lang=${lang}&vlevel=1303#/vocal`);
    const sing = page.locator('.vtimed .vocal-actions .btn.mega').first();
    await expect(sing).toBeVisible({ timeout: 60_000 });
    await sing.click();
    await expect(page.locator('.vtimed .sing-lane.is-live')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.phrase-strip .ps.now')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.lane-note')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    expect(await overflow(page), 'live').toBeLessThanOrEqual(2);
    if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s3-song-live-${lang}.png` });
    await expect(page.locator('.vt-result')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.vtimed .sing-lane.is-review')).toBeVisible();
    await expect(page.locator('.phrase-strip .ps.good').first()).toBeVisible();
    expect(await overflow(page), 'review').toBeLessThanOrEqual(2);
    if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s3-song-review-${lang}.png` });
  });

  test(`sing lane: sing-along screen (${lang})`, async ({ page }) => {
    await page.goto(`/?sim=1&simrt=1&lang=${lang}#/singalong`);
    await page.locator('.song-list .tool-card').first().click({ timeout: 60_000 });
    await page.locator('.singalong .vocal-actions .btn.mega').click();
    await expect(page.locator('.singalong .sing-lane.is-live')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('.singalong .sl-trail').first()).toHaveAttribute('d', /L/);
    if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s3-singalong-live-${lang}.png` });
    await expect(page.locator('.singalong .take-card')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.singalong .sing-lane.is-review')).toBeVisible();
  });
}

// slice 5: polish — a strong take ends on a final barline with a fermata; the next take of a melody is blind;
// reduced motion pages the lane instead of scrolling it
for (const lang of ['en', 'he'] as const) {
  test(`sing lane: fermata, blind retake, reduced motion (${lang})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const sing = await openLevel(page, lang, 1, 1);
    await sing.click();
    await expect(page.locator('.take-card.strong')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.sl-final .fermata')).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s5-fermata-${lang}.png` });
    // a melody: the first take is strong (the demo singer), so the retake is sung blind
    const mel = await openLevel(page, lang, 7, 1);
    await mel.click();
    await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
    await page.locator('.vocal .vocal-actions .btn.ghost').filter({ hasText: /Try again|לנסות שוב/ }).click();
    await expect(page.locator('.sing-lane.is-live.blind')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3500);
    expect(await overflow(page)).toBeLessThanOrEqual(2);
    if (SHOTS) await page.screenshot({ path: `docs/voice-ui-shots/s5-blind-live-${lang}.png` });
    await expect(page.locator('.sing-lane.is-review:not(.blind)')).toBeVisible({ timeout: 60_000 });
  });
}

// Sight-singing (one shared screen: 401–405, 1902 bass clef): the score carries the take; ready, live and review
// all fit 320 × 720 (production overflow after slice 1, fixed). Stage C's 2241 joins this list when it lands.
for (const lang of ['en', 'he'] as const) {
  for (const lv of [401, 405, 1902]) {
    test(`sight-singing ${lv} fits 320×720: ready, live, review (${lang})`, async ({ page }) => {
      await page.goto(`/?sim=1&simrt=1&unlock=all&lang=${lang}&vlevel=${lv}#/vocal`);
      const sing = page.locator('.vocal .vocal-actions .btn.mega').first();
      await expect(sing).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('.sight-score .note-staff').first()).toBeVisible();
      expect(await overflow(page), 'ready').toBeLessThanOrEqual(2);
      await sing.click();
      await expect(page.locator('.sing-readout')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('.sing-lane.is-live')).toHaveCount(0);
      await page.waitForTimeout(2500);
      expect(await overflow(page), 'live').toBeLessThanOrEqual(2);
      if (SHOTS && lv === 405) await page.screenshot({ path: `docs/voice-ui-shots/sight-${lv}-live-${lang}.png` });
      await expect(page.locator('.take-card')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('.sing-lane.is-review')).toBeVisible();
      expect(await overflow(page), 'review').toBeLessThanOrEqual(2);
      if (SHOTS && lv === 405) await page.screenshot({ path: `docs/voice-ui-shots/sight-${lv}-review-${lang}.png` });
    });
  }
}
