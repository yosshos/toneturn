import { expect, test } from '@playwright/test';

// Rubato first (owner 2026-11-14): a new scale item is played in free time — no count-in, no click, notes only — with
// a stub MIDI keyboard; the result shows notes, no timing numbers; "Again" stays in free time.
test('rubato: a new item in free time, graded on the notes only', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
  await page.goto('/?unlock=all#/settings/midi');
  await page.getByRole('radiogroup', { name: 'MIDI keyboard' }).getByRole('radio', { name: 'On' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Connected: Test Keys' })).toBeVisible();
  await page.goto('/?unlock=all&rubato=1#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-rubato-stage="free"]')).toBeVisible();
  await page.locator('[data-rubato-start]').click();
  await expect(page.locator('[data-rubato-take="on"]')).toBeVisible();
  // No count-in and no click: the take listens at once. Three notes, then Done.
  await page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    for (const n of [60, 62, 64]) {
      inp.onmidimessage({ data: new Uint8Array([0x90, n, 80]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 300));
      inp.onmidimessage({ data: new Uint8Array([0x80, n, 0]), timeStamp: performance.now() });
    }
  });
  await page.locator('[data-rubato-done]').click();
  const res = page.locator('[data-rubato-result="free"]');
  await expect(res).toBeVisible();
  await expect(res.locator('.drill-stats')).not.toContainText('CV');
  await res.getByRole('button', { name: /Again/ }).click();
  await expect(page.locator('[data-rubato-stage="free"]')).toBeVisible();
});

// The free-time screen fits a phone (one screen, no scroll) for the first piano and guitar levels.
for (const [inst, fam, level] of [['piano', 'scales', 'scales-1'], ['piano', 'fingers', 'fingers-1'], ['guitar', 'g-fretting', 'g-fretting-1']] as const)
  test(`rubato: ${level} free-time screen fits 390 × 844`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?sim=1&rubato=1#/drills');
    if (inst === 'guitar') await page.locator('[data-inst="guitar"]').click();
    await page.locator(`[data-family="${fam}"]`).click();
    await page.locator(`[data-level-start="${level}"]`).click();
    await expect(page.locator('[data-rubato-stage="free"]')).toBeVisible();
    const fit = await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight + 1);
    expect(fit).toBe(true);
  });
