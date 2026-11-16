import { expect, test, type Page } from '@playwright/test';

// Encore v1 leftovers at 320×720 in English and Hebrew: the plan's key-order chips (easiest first / cycle of 4ths /
// chromatic / my choice) under the 12-key ring, the magnet's badge on the trim roll, and a pickup phrase's run (a
// short first bar, the full count-in) through a measured take. One screen each; Hebrew shows no Latin outside <bdi>.

test.use({ viewport: { width: 320, height: 720 }, hasTouch: true });
type Lang = 'en' | 'he';

const NOW = '2026-11-16T10:00:00.000Z';
const plan = { startBpm: 60, goalBpm: 100, keys: 'all', order: 'easiest', hands: 'R', band: false, inToday: true, inWorkout: true };
/** A one-hand phrase with a one-beat pickup (G, then the C-major run from the downbeat). */
const PICKUP = { id: 'enc-pk1', v: 3, ctx: 'free', level: 3, name: { en: 'Pickup run', he: 'ריצה עם אנקרוזה' }, chords: [], notes: [[-5, 0, 1], [0, 1, 1], [2, 2, 1], [4, 3, 1], [5, 4, 1], [7, 5, 1], [9, 6, 1], [11, 7, 1], [12, 8, 1]], meter: 4, pickup: 1, swing: 0.5, straight: true, homeKey: 0, own: true, instrument: 'piano', playedBpm: 90, createdAt: NOW, plan };

const seed = async (page: Page, lang: Lang, own: unknown[] = []) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ([lang, own]) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 0, applied: [], lessons: {}, history: [], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', seenVersion: '9.9.9', lickBook: { own } };
      await new Promise((res, rej) => {
        const r = indexedDB.open('toneturn', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          const tx = r.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(progress, 'progress');
          tx.objectStore('kv').put(settings, 'settings');
          tx.oncomplete = res;
          tx.onerror = rej;
        };
        r.onerror = rej;
      });
    },
    [lang, own] as const,
  );
};
const open = async (page: Page, lang: Lang, hash: string) => {
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/${hash}`);
  await page.locator('main').first().waitFor();
  await page.waitForTimeout(500);
};
const fits = async (page: Page, what: string) => {
  const m = await page.evaluate(() => {
    const se = document.scrollingElement!;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth };
  });
  expect(m.side, `${what}: no horizontal scroll`).toBeLessThanOrEqual(1);
  expect(m.over, `${what}: one screen`).toBeLessThanOrEqual(2);
};
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, .visually-hidden, [aria-hidden="true"], .sim-banner, .dyn, .tier-chip, title, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const words = (t.match(/[A-Za-z]+/g) ?? []).filter((x) => x !== 'BPM');
      if (words.length) out.push(t.trim().slice(0, 70));
    }
    return [...new Set(out)];
  });
const check = async (page: Page, lang: Lang, what: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `docs/encore-shots/leftover-${what}-${lang}.png` });
  await fits(page, `${what} (${lang})`);
  if (lang === 'he') expect(await latinOutsideBdi(page), `${what}: Latin outside bdi`).toEqual([]);
};

for (const lang of ['en', 'he'] as Lang[]) {
  test(`Encore plan: the key-order chips under the ring, "my choice" builds the order (${lang})`, async ({ page }) => {
    await seed(page, lang, [PICKUP]);
    await open(page, lang, `encore/plan/${PICKUP.id}`);
    await expect(page.locator('[data-encore="plan"]')).toBeVisible();
    const set = page.locator('[data-order-set]');
    await expect(set.locator('[data-order]')).toHaveCount(4);
    await expect(set.locator('[data-order="easiest"]')).toHaveAttribute('aria-checked', 'true');
    await check(page, lang, 'plan-order');
    // cycle of 4ths from the home key: C F B♭ …
    await set.locator('[data-order="fourths"]').click();
    await expect(page.locator('[data-order-line]')).toHaveAttribute('data-order-line', /^0 5 10 3 8 1 6 11 4 9 2 7$/);
    // my choice: the order shown becomes the list; a tap takes a key out, a second tap adds it at the end
    await set.locator('[data-order="custom"]').click();
    await expect(set.locator('[data-order="custom"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('[data-ring-key="5"]').click();
    await expect(page.locator('[data-order-line]')).toHaveAttribute('data-order-line', '0 10 3 8 1 6 11 4 9 2 7');
    await page.locator('[data-ring-key="5"]').click();
    await expect(page.locator('[data-order-line]')).toHaveAttribute('data-order-line', '0 10 3 8 1 6 11 4 9 2 7 5');
    await check(page, lang, 'plan-custom');
    // back to easiest: all 12 again, home key first
    await set.locator('[data-order="easiest"]').click();
    await expect(page.locator('[data-order-line]')).toHaveAttribute('data-order-line', /^0( \d+){11}$/);
  });

  test(`Encore run: a pickup phrase — short first bar, full count-in, a measured take (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page, lang, [PICKUP]);
    await open(page, lang, `encore/run/${PICKUP.id}~0~R`);
    await expect(page.locator('[data-encore="run"]')).toBeVisible();
    await page.locator('[data-rubato-skip]').click();
    await expect(page.locator('[data-run-stage="tempo"]')).toBeVisible();
    await check(page, lang, 'run-pickup');
    await page.evaluate(() => ((window as unknown as { __fakeTake: string }).__fakeTake = 'clean'));
    await page.locator('.drill-take button.btn.mega, .drill-take .btn.primary').first().click();
    await expect(page.locator('[data-review]')).toBeVisible();
    await check(page, lang, 'after-pickup');
  });
}

test('Encore trim: the magnet shows a small badge when a suggested boundary pulls a handle (en + he)', async ({ page }) => {
  test.setTimeout(120_000);
  for (const lang of ['en', 'he'] as Lang[]) {
    await seed(page, lang);
    // a take handed over as a review would (memory copy): eighths with a breath after bar 2, so a boundary sits mid-take
    await open(page, lang, 'encore');
    const id = await page.evaluate((lang) => {
      const P = 250;
      const line = [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72, 71, 67, 65, 62];
      const notes = line.map((p, i) => ({ pitch: p, on: 300 + i * P + (i >= 8 ? 2 * P : 0), off: 300 + i * P + (i >= 8 ? 2 * P : 0) + P * 0.8, vel: 80 }));
      const t = { id: `mem:e2emag-${lang}`, at: new Date().toISOString(), kind: 'improv', instrument: 'piano', title: 'x', source: 'midi', notes, bpm: 120, meter: 4, t0: 300 };
      localStorage.setItem('tt.encore.takes.v1', JSON.stringify([t]));
      return t.id;
    }, lang);
    await open(page, lang, `encore/new?take=${encodeURIComponent(id)}`);
    await expect(page.locator('[data-encore="trim"]')).toBeVisible();
    const ticks = page.locator('.er-tick');
    await expect(ticks.first()).toBeAttached();
    const roll = await page.locator('.enc-roll').boundingBox();
    const grip = await page.locator('[data-handle="to"] .er-grip').boundingBox();
    // the boundary tick nearest the end handle
    const tx = await ticks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => r.left + r.width / 2));
    const gx = grip!.x + grip!.width / 2;
    const target = tx.filter((x) => Math.abs(x - gx) > 4).sort((a, b) => Math.abs(a - gx) - Math.abs(b - gx))[0];
    expect(target).toBeDefined();
    const y = grip!.y + grip!.height / 2;
    await page.mouse.move(gx, y);
    await page.mouse.down();
    // the hold path (no keyboard): a handle held still for 300 ms snaps to beats, where the magnet works; moving on
    // keeps the hold
    await page.waitForTimeout(450);
    await page.mouse.move(target + 2, y, { steps: 6 });
    await page.mouse.move(target + 1, y);
    await expect(page.locator('[data-magnet]')).toBeVisible();
    await page.mouse.up();
    expect(roll!.width).toBeGreaterThan(200);
    await check(page, lang, 'trim-magnet');
  }
});
