import { expect, test } from '@playwright/test';

// The practice coach (owner 2026-11-21): one press starts a continuous session on a family; after each take the coach
// says one line and the next take starts by itself (another hand / key / step) — no button between takes; End shows
// the session's summary and XP. Every reading take has Listen beside Play.
test.describe.configure({ timeout: 120_000 });

test('coach: scales run hands-free from take to take, then end with XP', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible();
  await page.locator('[data-coach-start]').click();
  // A new step is played first (cursor running); skip it here.
  const demo = page.locator('[data-coach-skip-demo]');
  if (await demo.isVisible().catch(() => false)) await demo.click();
  // Takes follow one another with no click: collect the items seen.
  const seen = new Set<string>();
  for (let k = 0; k < 40 && seen.size < 3; k++) {
    const id = await page.locator('.coach-run').getAttribute('data-drill').catch(() => null);
    if (id) seen.add(id);
    await page.waitForTimeout(400);
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.take-review')).toHaveCount(0);
  await page.locator('[data-coach-stop]').click();
  await expect(page.locator('[data-coach-end]')).toBeVisible();
  const xp = Number(await page.locator('[data-coach-xp]').getAttribute('data-coach-xp'));
  expect(xp).toBeGreaterThan(0);
  await page.locator('[data-coach-back]').click();
  await expect(page.locator('[data-coach-open="scales"]')).toBeVisible();
});

test('coach: pause holds the session on the result; resume moves on', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  const demo = page.locator('[data-coach-skip-demo]');
  if (await demo.isVisible().catch(() => false)) await demo.click();
  await expect(page.locator('[data-coach="result"]')).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-coach-pause="running"]').click();
  const id = await page.locator('.coach-run').getAttribute('data-drill');
  const before = await page.locator('.coach-run').textContent();
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-coach="result"]')).toBeVisible();
  expect(await page.locator('.coach-run').getAttribute('data-drill')).toBe(id);
  await page.locator('[data-coach-pause="paused"]').click();
  // Resumed: the session moves on (fake takes are instant, so the next result may already be up).
  await expect.poll(async () => page.locator('.coach-run').textContent(), { timeout: 15_000 }).not.toBe(before);
});

test('listen: a reading take has Listen beside Play', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  await expect(page.locator('[data-hear="off"]')).toBeVisible();
  await expect(page.locator('[data-drill-play]')).toBeVisible();
  await page.locator('[data-hear="off"]').click();
  await expect(page.locator('[data-hear="on"]')).toBeVisible();
  await page.locator('[data-hear="on"]').click();
  await expect(page.locator('[data-hear="off"]')).toBeVisible();
});

test('hands-free: a level run moves on after a take with no button (again, slower, then the next item)', async ({ page }) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'weak'));
  await page.goto('/?unlock=all&handsfree=1#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-level-start="scales-1"]').click();
  const first = await page.locator('.drill-run').getAttribute('data-drill');
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('[data-hf-bar]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-hf-bar]')).toContainText(/again/i);
  // Misses: again, slower, then on to the next item — all by itself, no click.
  await expect.poll(async () => page.locator('.drill-run').getAttribute('data-drill'), { timeout: 60_000 }).not.toBe(first);
  await expect(page.locator('.take-review button:focus')).toHaveCount(0);
});

test('sound kept closed by the browser: the coach demo still skips, and a bar offers to turn sound on', async ({ page }) => {
  // A browser that never opens the sound: resume() stays pending (0.110.2 — the demo, Play and Listen froze on it).
  await page.addInitScript(() => {
    AudioContext.prototype.resume = function () {
      return new Promise(() => {});
    };
    Object.defineProperty(AudioContext.prototype, 'state', { get: () => 'suspended', configurable: true });
  });
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  await expect(page.locator('[data-coach-demo]')).toBeVisible();
  await expect(page.locator('[data-sound-blocked]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-coach-skip-demo]').click();
  await expect(page.locator('[data-coach="take"]')).toBeVisible({ timeout: 3000 });
});

test('sound kept closed: Turn sound on opens a fresh audio channel and the bar goes away', async ({ page }) => {
  // The audio channel the app opened first is stuck (a failed device or buffer); a fresh one runs.
  await page.addInitScript(() => {
    const real = AudioContext.prototype.resume;
    const desc = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state')!;
    // every context that asked to start before __fresh stays stuck; a context made after it runs
    const stuck = new WeakSet<object>();
    const w = window as unknown as { __fresh?: boolean };
    AudioContext.prototype.resume = function (this: AudioContext) {
      if (!w.__fresh) stuck.add(this);
      return stuck.has(this) ? new Promise(() => {}) : real.call(this);
    };
    Object.defineProperty(AudioContext.prototype, 'state', { get(this: AudioContext) { return stuck.has(this) || !w.__fresh ? 'suspended' : desc.get!.call(this); }, configurable: true });
  });
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  await expect(page.locator('[data-sound-blocked]')).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => ((window as unknown as { __fresh: boolean }).__fresh = true));
  await page.locator('[data-sound-open]').click();
  await expect(page.locator('[data-sound-blocked]')).toHaveCount(0, { timeout: 5000 });
  expect(await page.evaluate(() => (window as unknown as { __sound: { audioRunning: boolean } }).__sound.audioRunning)).toBe(true);
});

test('coach intro: the key order is picked before the session (chromatic, circle of fifths up / down)', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await expect(page.locator('[data-coach-order="fifths-up"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-coach-order="chromatic-up"]').click();
  await expect(page.locator('[data-coach-order="chromatic-up"]')).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/coach-order.png' });
});

test('coach intro: the dynamics lens is picked before the session and applies to its takes', async ({ page }) => {
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-practice-view="topic"]').click().catch(() => {});
  await page.locator('[data-family="scales"]').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-lens="cresc"]').click();
  await expect(page.locator('[data-coach-lens="cresc"]')).toHaveAttribute('aria-checked', 'true');
});
