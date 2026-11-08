import { expect, test } from '@playwright/test';

// The first lesson of the day shows the streak screen over the recap; dismiss it whenever it is in the way.
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

test('MIDI keyboard (stub device): enable in Settings, answer a degree question with a key', async ({ page }) => {
  await page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }),
    });
  });
  await page.goto('/?unlock=all#/settings/midi');
  await page.getByRole('radiogroup', { name: 'MIDI keyboard' }).getByRole('radio', { name: 'On' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Connected: Test Keys' })).toBeVisible();
  // The key test in the MIDI category shows the note and velocity.
  await page.evaluate(() => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    inp.onmidimessage({ data: new Uint8Array([0x90, 62, 90]), timeStamp: performance.now() });
  });
  await expect(page.locator('.mt-note')).toContainText('D');
  await expect(page.locator('.mt-vel')).toContainText('90');
  // The keys sound through the app by default (most MIDI keyboards have no speakers): a held key is a sounding note.
  await expect(page.locator('[data-midi-sound]')).toBeChecked();
  const sounding = await page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    const path = '/src/ui/services.ts';
    const { piano } = await import(/* @vite-ignore */ path);
    let seen: number[] = [];
    const off = piano.onNotes((a: number[]) => (seen = a));
    inp.onmidimessage({ data: new Uint8Array([0x90, 64, 100]), timeStamp: performance.now() });
    await new Promise((r) => setTimeout(r, 100));
    const held = [...seen];
    inp.onmidimessage({ data: new Uint8Array([0x80, 64, 0]), timeStamp: performance.now() });
    await new Promise((r) => setTimeout(r, 100));
    const after = [...seen];
    // the sustain pedal holds a released key until the pedal comes up
    const send = (d: number[]) => inp.onmidimessage({ data: new Uint8Array(d), timeStamp: performance.now() });
    const wait = () => new Promise((r) => setTimeout(r, 80));
    send([0xb0, 64, 127]);
    send([0x90, 60, 80]);
    send([0x80, 60, 0]);
    await wait();
    const pedalHeld = [...seen];
    send([0xb0, 64, 0]);
    await wait();
    off();
    return { held, after, pedalHeld, pedalUp: seen };
  });
  expect(sounding.held).toContain(64);
  expect(sounding.after).not.toContain(64);
  expect(sounding.pedalHeld).toContain(60);
  expect(sounding.pedalUp).not.toContain(60);
  // its own volume and touch response
  await expect(page.locator("[data-midi-volume]")).toBeVisible();
  await page.getByRole("radiogroup", { name: "Touch response" }).getByRole("radio", { name: "Heavy" }).click();
  await page.goto('/?unlock=all');
  await page.getByRole('radio', { name: 'Buttons' }).click();
  await page.locator('.tab[data-tab="path"]').click();
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
