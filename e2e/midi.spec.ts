import { expect, test } from '@playwright/test';

test('MIDI keyboard (stub device): enable in Settings, answer a degree question with a key', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }),
    });
  });
  await page.goto('/?unlock=all#/settings');
  await page.getByRole('radiogroup', { name: 'MIDI keyboard' }).getByRole('radio', { name: 'On' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Connected: Test Keys' })).toBeVisible();
  await page.goto('/?unlock=all');
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.getByRole('button', { name: /2\. / }).first().click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.answers .answer:not([disabled])').first()).toBeVisible({ timeout: 30_000 });
  // Play every note of an octave; the first one that is a choice answers.
  await page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    for (let n = 60; n < 72; n++) {
      inp.onmidimessage({ data: new Uint8Array([0x90, n, 100]), timeStamp: performance.now() });
      inp.onmidimessage({ data: new Uint8Array([0x80, n, 0]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  await expect(page.locator('.feedback')).not.toHaveClass(/empty/, { timeout: 15_000 });
});
