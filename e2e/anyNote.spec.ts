import { expect, test } from '@playwright/test';

// "Play a note to continue" (owner 2026-11-21): a brief page waits for a press — a computer key or a MIDI note does it;
// a take waiting for Play counts in on a note.
test('any note: a key on the brief page starts the exercise', async ({ page }) => {
  await page.goto('/?sim=1&brief=1#/topic/basics-highlow/1');
  await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 6000 }).catch(() => {});
  await expect(page.locator('[data-brief]')).toBeVisible();
  await expect(page.locator('[data-any-note]')).toBeVisible();
  await page.waitForTimeout(900);
  await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {});
  await page.keyboard.press('k');
  await expect(page.locator('[data-brief]')).toHaveCount(0, { timeout: 10_000 });
});

test('any note: a MIDI note counts a waiting take in', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });
  await page.goto('/?unlock=all#/settings/midi');
  await page.getByRole('radiogroup', { name: 'MIDI keyboard' }).getByRole('radio', { name: 'On' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Connected: Test Keys' })).toBeVisible();
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-drill-play]')).toBeVisible();
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    inp.onmidimessage({ data: new Uint8Array([0x90, 60, 80]), timeStamp: performance.now() });
    inp.onmidimessage({ data: new Uint8Array([0x80, 60, 0]), timeStamp: performance.now() });
  });
  await expect(page.locator('[data-drill-play]')).toHaveCount(0, { timeout: 5000 });
});
