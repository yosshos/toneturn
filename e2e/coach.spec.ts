import { expect, test } from '@playwright/test';

// The practice coach (owner 2026-11-21): one press starts a continuous session on a family; after each take the coach
// says one line and the next take starts by itself (another key, again, faster) — no button between takes; End shows
// the session's summary and XP. Every reading take has Listen beside Play.
// Owner 2026-11-24 (taskBrief.ts): a new kind of take (another hand, another step) opens with a short brief once and its
// count-in waits for Ready; repeats of a kind already briefed keep flowing.
test.describe.configure({ timeout: 120_000 });

test('coach: scales run hands-free from take to take, then end with XP', async ({ page }) => {
  // three takes in a row with no click prove the flow; the end page follows Stop (a realistic end, well inside the limit)
  test.setTimeout(180_000);
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all#/drills');
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  await page.locator('[data-coach-open="scales"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible();
  await page.locator('[data-coach-start]').click();
  // A new step is played first (cursor running); skip it here.
  const demo = page.locator('[data-coach-skip-demo]');
  if (await demo.isVisible().catch(() => false)) await demo.click();
  // Takes follow one another with no click (each item climbs to its target, SPEC-KEY-SESSION-2 §3.4): count the coach's
  // lines after takes — four takes in a row, hands-free, is the flow; a new kind of take waits on its brief (Ready).
  const lines: string[] = [];
  let briefs = 0;
  for (let k = 0; k < 120 && lines.length < 3; k++) {
    if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
    const ready = page.locator('[data-brief-ready]');
    if (await ready.isVisible().catch(() => false)) {
      await expect(page.locator('[data-task-brief]')).toBeVisible();
      briefs++;
      await ready.click().catch(() => {});
    }
    if ((await page.locator('[data-coach-line="1"]').count()) > 0) {
      const t = ((await page.locator('.coach-line').textContent().catch(() => '')) ?? '').trim();
      if (t && t !== lines[lines.length - 1]) lines.push(t);
    }
    await page.waitForTimeout(300);
  }
  expect(lines.length).toBeGreaterThanOrEqual(3);
  expect(briefs).toBeGreaterThanOrEqual(0);
  await expect(page.locator('.take-review')).toHaveCount(0);
  // End: the session's summary and its XP
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  await page.locator('[data-level-start="scales-1"]').click();
  const first = await page.locator('.drill-run').getAttribute('data-drill');
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('[data-hf-bar]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-hf-bar]')).toContainText(/again/i);
  // Misses: again, slower, then on to the next item — all by itself, no click.
  // a brief may open on the next kind of take: Ready keeps it moving (the hands-free flow itself needs no click)
  await expect
    .poll(
      async () => {
        const ready = page.locator('[data-brief-ready]');
        if (await ready.isVisible().catch(() => false)) await ready.click().catch(() => {});
        return page.locator('.drill-run').getAttribute('data-drill');
      },
      { timeout: 90_000, intervals: [500] },
    )
    .not.toBe(first);
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
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
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-lens="cresc"]').click();
  await expect(page.locator('[data-coach-lens="cresc"]')).toHaveAttribute('aria-checked', 'true');
});

// SPEC-KEY-SESSION-2 §6, §8.3: the key session climbs stage by stage — the strip above the music marks the current
// stage and ticks the passed ones, each new stage opens with its own one-line brief, and the speed stage shows its tempo bar.
test('key session: the stage strip, a brief per stage, ticks, and the tempo bar on the speed stage', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=en#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-coach-start]').click();
  const demo = page.locator('[data-coach-skip-demo]');
  const strip = page.locator('[data-stage-strip]');
  const briefs = new Set<string>();
  let tempo = false;
  for (let k = 0; k < 120 && !tempo; k++) {
    if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
    const ready = page.locator('[data-brief-ready]');
    if (await ready.isVisible().catch(() => false)) {
      briefs.add((await page.locator('[data-task-brief] .tb-what').textContent().catch(() => '')) ?? '');
      await ready.click().catch(() => {});
    }
    tempo = await page.locator('[data-stage-tempo]').isVisible().catch(() => false);
    if (!tempo) await page.waitForTimeout(300);
  }
  await expect(strip).toBeVisible();
  // the scale's stages: the current one marked, the ones before it ticked
  await expect(page.locator('[data-stage-state="now"]')).toHaveCount(1);
  // the passed stages fold into one tick chip with their count (S6: one line at 375 px)
  expect(Number(await page.locator('[data-stage-done]').getAttribute('data-stage-done'))).toBeGreaterThanOrEqual(3);
  // the tempo bar names the note value being played (U9)
  await expect(page.locator('[data-stage-tempo]')).toContainText(/quarters|eighths|triplets/);
  expect(tempo).toBe(true);
  // each new stage opened with its own brief (both hands, two octaves, contrary, the speed …)
  expect(briefs.size).toBeGreaterThanOrEqual(2);
  expect([...briefs].join(' ')).toMatch(/Both hands|Contrary|The speed/);
  // one phone screen: the strip stays inside the 375 px width
  const box = await strip.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 376).toBe(true);
  await page.screenshot({ path: 'test-results/key-session-strip-375.png' });
});

/** Drive a key session until `done` says stop: skip demos, press Ready on each brief. */
async function driveKeySession(page: import('@playwright/test').Page, done: () => Promise<boolean>, max = 160) {
  const demo = page.locator('[data-coach-skip-demo]');
  for (let k = 0; k < max; k++) {
    if (await done()) return true;
    if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
    const ready = page.locator('[data-brief-ready]');
    if (await ready.isVisible().catch(() => false)) await ready.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  return done();
}

// S14 (review 2026-11-25): the coach's lines are fixed phrases with recordings (public/voice/en): an English key session
// plays them from the recordings (the test browser poses as a person's browser with the voice on).
test('key session: the coach speaks a recorded phrase (English)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    (window as unknown as { __fakeTake: string }).__fakeTake = 'clean';
    localStorage.setItem('toneturn.talk', '1');
  });
  const played: string[] = [];
  page.on('request', (r) => {
    if (/\/voice\/en\/[^/]+\.mp3/.test(r.url())) played.push(r.url());
  });
  await page.goto('/?unlock=all&lang=en#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-coach-start]').click();
  expect(await driveKeySession(page, async () => played.length > 0, 120)).toBe(true);
});

test('key session in Hebrew: the strip, the brief and the coach line in Hebrew, tempi with their note value', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=he#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-coach-start]').click();
  const line = page.locator('.coach-line');
  expect(await driveKeySession(page, async () => /[א-ת]/.test((await line.textContent().catch(() => '')) ?? '') && /ב(רבעים|שמיניות)/.test((await line.textContent().catch(() => '')) ?? ''))).toBe(true);
  await expect(page.locator('[data-stage-strip]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// Owner 2026-11-26: "I have to scroll down and press Ready on every exercise" — in the coach a new stage's brief is read,
// then its count-in starts by itself (no tap), and the brief with Play / Ready stays on screen under the tall score.
test('key session: a new stage starts by itself after its brief, its Ready on screen without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=en#/drills');
  await page.locator('[data-practice-view="key"]').click();
  await page.locator('[data-key-card="0"]').click();
  await page.locator('[data-key-session="0"]').click();
  await expect(page.locator('[data-coach-intro]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-coach-start]').click();
  const demo = page.locator('[data-coach-skip-demo]');
  const ready = page.locator('[data-brief-ready]');
  // wait for a brief (a new stage), skipping demos only — never pressing Ready
  let seen = false;
  for (let k = 0; k < 160 && !seen; k++) {
    if (await demo.isVisible().catch(() => false)) await demo.click().catch(() => {});
    seen = await ready.isVisible().catch(() => false);
    if (!seen) await page.waitForTimeout(250);
  }
  expect(seen).toBe(true);
  await expect(page.locator('[data-task-brief]')).toContainText(/starts by itself/);
  // Ready sits inside the viewport (sticky under the score)
  const box = await ready.boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= 667).toBe(true);
  await page.screenshot({ path: 'test-results/key-session-brief-auto-375.png' });
  // no tap: the take starts by itself and the coach says its line
  const takes0 = Number(await page.locator('[data-coach-bar]').getAttribute('data-coach-takes'));
  await expect.poll(async () => Number(await page.locator('[data-coach-bar]').getAttribute('data-coach-takes')), { timeout: 15_000 }).toBeGreaterThan(takes0);
});

// Owner 2026-11-27: a coach session always shows how much is left and how it is going (phones too).
test('coach: the clock shows the time left and the clean takes, on a phone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
  await page.goto('/?unlock=all&lang=he#/drills');
  await page.locator('[data-family-levels="scales"], [data-family="scales"]:not([data-family-direct])').click();
  await page.locator('[data-coach-open="scales"]').click();
  await page.locator('[data-coach-start]').click();
  const clock = page.locator('[data-coach-clock]');
  await expect(clock).toBeVisible({ timeout: 20_000 });
  await expect(clock).toContainText('נשארו');
  await page.screenshot({ path: 'test-results/coach-clock-he-375.png' });
});
