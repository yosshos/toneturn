import { expect, test, type Page } from '@playwright/test';

// COURSE-FEEDBACK-UI slice 7 (docs/research/COURSE-FEEDBACK-UI.md §4.6): ear feedback at 320×720, English and Hebrew.
// A miss shows "Yours ▶ / Right ▶" under the one-line card and each lights the keyboard as it plays; the answer buttons
// carry ✓ / ✕ glyphs; the grid dictation's ask sits above its pad and its parts carry ✓ / ✕; the recap offers "Drill
// these N" and the day's streak comes as a sheet AFTER the recap. Every screen fits (no vertical scroll).
// SHOTS=1 saves the screens to docs/ui-shots-v3/ (s7-…). E2E_BASE: point at another dev server (a worktree's own vite).
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, permissions: ['microphone'], ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

const SHOTS = !!process.env.SHOTS;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/ui-shots-v3/s7-${name}.png` });
};
const overflow = (page: Page) =>
  page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    return { tall: document.scrollingElement!.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
const fits = async (page: Page) => {
  const o = await overflow(page);
  expect(o.wide).toBeLessThanOrEqual(1);
  expect(o.tall).toBeLessThanOrEqual(2);
};
/** Latin text in the Hebrew UI sits in <bdi> / dir=ltr (no RTL reordering of note / chord names). */
const latinLeft = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll(s)) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const txt = n.textContent ?? '';
        if (!/[A-G][♭♯#b]?\d?/.test(txt) || /[֐-׿]/.test(txt)) continue;
        if (!(n.parentElement?.closest('bdi, [dir="ltr"]'))) bad.push(txt.trim());
      }
    }
    return bad;
  }, sel);

/** Open an ear topic in Buttons mode (the simulator: no real progress, no speech). */
const handled = new WeakSet<Page>();
async function openTopic(page: Page, lang: 'en' | 'he', topic: string, level: number) {
  // the first-run voice consent sheet: answer with buttons (never the streak sheet)
  if (!handled.has(page)) {
    handled.add(page);
    await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet:not([data-streak-sheet])'), async () => {
      await page.locator('.sheet-backdrop .sheet:not([data-streak-sheet]) .btn.ghost').first().click();
    });
  }
  await page.goto(`/?sim=1&brief=1&lang=${lang}#/topic/${topic}/${level}`);
  await page.locator('main.lesson').waitFor({ timeout: 15_000 });
  await page.locator('[data-brief-play]').click({ timeout: 5000 }).catch(() => {});
  const buttonsMode = page.locator('.mode-switch button').nth(1);
  if (await buttonsMode.isVisible().catch(() => false)) {
    if ((await buttonsMode.getAttribute('aria-pressed')) === 'false') await buttonsMode.click().catch(() => {});
  }
}

/**
 * Answer (alternating the first / last button) until one is wrong twice (the reveal): returns once the miss card waits
 * for Continue. A lesson finished without a miss starts again (a fresh simulator session).
 */
async function missOne(page: Page, lang: 'en' | 'he') {
  for (let k = 0; k < 30; k++) {
    if (await page.locator('main.recap').isVisible().catch(() => false)) await openTopic(page, lang, 'basics-highlow', 1);
    const btn = page.locator('.answers .answer').nth(k % 2 ? -1 : 0);
    await expect(btn).toBeEnabled({ timeout: 20_000 });
    const pick = (await btn.getAttribute('data-answer')) ?? '';
    await btn.click();
    const res = await Promise.race([
      page.locator('.feedback.retry').waitFor({ timeout: 8000 }).then(() => 'retry'),
      page.locator('.feedback.reveal').waitFor({ timeout: 8000 }).then(() => 'reveal'),
      page.locator('.feedback.correct').waitFor({ timeout: 8000 }).then(() => 'correct'),
    ]).catch(() => 'none');
    if (res === 'retry') {
      // ✕ on the chosen wrong one, no ✓ anywhere yet (the right answer is not given away), no replay pair yet
      await expect(page.locator(`.answer.is-wrong[data-answer="${pick}"] [data-ans-glyph="wrong"]`)).toBeVisible();
      await expect(page.locator('[data-ans-glyph="right"]')).toHaveCount(0);
      await expect(page.locator('.replay-pair')).toHaveCount(0);
      await fits(page);
      await shot(page, `ear-retry-${lang}`);
      const again = page.locator(`.answers .answer[data-answer="${pick}"]`);
      await expect(again).toBeEnabled({ timeout: 20_000 });
      await again.click();
      await page.locator('.feedback.reveal').waitFor({ timeout: 10_000 });
      return pick;
    }
    if (res === 'reveal') return pick;
    // right: on to the next question (or the recap)
    await Promise.race([
      page.locator('main.recap').waitFor({ timeout: 6000 }),
      page.locator('.answers .answer:not(.is-right)').first().waitFor({ timeout: 6000 }),
    ]).catch(() => {});
    await page.waitForTimeout(300);
  }
  throw new Error('no miss reached');
}

for (const lang of ['en', 'he'] as const) {
  test(`ear miss: Yours / Right replay and light the keyboard, ✓ / ✕ glyphs, recap drill, streak sheet after (${lang})`, async ({ page }) => {
    test.setTimeout(150_000);
    await openTopic(page, lang, 'basics-highlow', 1);
    await expect(page.locator('.answers .answer').first()).toBeVisible({ timeout: 20_000 });
    await fits(page);
    await shot(page, `ear-question-${lang}`);
    const pick = await missOne(page, lang);
    // ✓ on the right answer (teal), ✕ on the chosen wrong one (pink); ink glyphs, not colour alone
    await expect(page.locator(`.answer.is-wrong[data-answer="${pick}"] [data-ans-glyph="wrong"]`)).toBeVisible();
    await expect(page.locator('.answer.is-right [data-ans-glyph="right"]')).toBeVisible();
    const bg = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);
    await expect.poll(() => bg('.answer.is-right')).toBe('rgb(18, 201, 180)');
    await expect.poll(() => bg('.answer.is-wrong')).toBe('rgb(226, 58, 90)'); // the studio raspberry wrong colour (--wrong, studio-elements.css)
    // the pair under the one-line card
    const pair = page.locator('.replay-pair');
    await expect(pair).toBeVisible();
    await expect(pair.locator('[data-replay="right"]')).toBeVisible();
    await expect(pair.locator('[data-replay="yours"]')).toBeVisible();
    await page.waitForTimeout(2500); // the short comparison that plays by itself
    for (const side of ['yours', 'right'] as const) {
      await pair.locator(`[data-replay="${side}"]`).click();
      await expect(pair).toHaveAttribute('data-replay-playing', side);
      // the keyboard lights the notes as they sound (the item is answered, so the keys are live)
      await expect.poll(async () => Number((await page.locator('.lesson .keyboard').first().getAttribute('data-lit')) ?? 0), { timeout: 4000, intervals: [50] }).toBeGreaterThan(0);
      if (side === 'right') {
        const lit = await page.evaluate(() => {
          const k = document.querySelector('.lesson .keyboard .wk.lit, .lesson .keyboard .bk.lit') as HTMLElement | null;
          if (k) k.style.transition = 'none';
          return k ? getComputedStyle(k).backgroundColor : '';
        });
        // the studio's lit key: a teal tint on a white key, teal on a black key (studio-elements.css)
        if (lit) expect(['rgb(191, 240, 232)', 'rgb(18, 201, 180)']).toContain(lit);
        await shot(page, `ear-miss-pair-${lang}`);
      }
      await expect(pair).toHaveAttribute('data-replay-playing', '', { timeout: 8000 });
    }
    await fits(page);
    // no halo around Toni's note head
    const orbShadow = await page.locator('.orb').evaluate((e) => getComputedStyle(e).boxShadow);
    // (the studio's soft elevation has two offset layers; a halo is a layer centred on the head: 0 0 blur)
    expect(orbShadow).not.toMatch(/rgba?\([^)]*\)\s+0px\s+0px\s+[1-9]/);
    if (lang === 'he') expect(await latinLeft(page, '.feedback, .replay-pair')).toEqual([]);
    // finish quickly: Continue, then skip the rest
    await page.locator('[data-continue]').click();
    for (let i = 0; i < 30 && !(await page.locator('main.recap').isVisible().catch(() => false)); i++) {
      const skip = page.locator('.controls .ctl-btn').nth(1);
      await skip.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    await expect(page.locator('main.recap')).toBeVisible({ timeout: 20_000 });
    // the streak does not cover the recap
    await page.waitForTimeout(1200);
    await expect(page.locator('[data-streak-sheet]')).toHaveCount(0);
    await expect(page.locator('.streak-celebrate')).toHaveCount(0);
    // the recap in the v2 palette: no gold marks, no lemon / pale-yellow insight card
    const pal = await page.evaluate(() => {
      const rgb = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
      const yellowish = (s: string) => {
        const [r, g, b] = rgb(s);
        return r > 180 && g > 150 && b < 150 && r - b > 60;
      };
      const marks = [...document.querySelectorAll('.recap-mark')].map((e) => getComputedStyle(e).color);
      const ins = document.querySelector('.coach-insight') as HTMLElement | null;
      return { goldMark: marks.some((c) => { const [r, g, b] = rgb(c); return r > 110 && g > 70 && b < 40 && r - b > 80; }), insYellow: ins ? yellowish(getComputedStyle(ins).backgroundColor) : false, insGradient: ins ? getComputedStyle(ins).backgroundImage !== 'none' : false };
    });
    expect(pal).toEqual({ goldMark: false, insYellow: false, insGradient: false });
    await shot(page, `recap-${lang}`);
    for (let i = 0; i < 3 && (await page.locator('[data-recap-next]').isVisible().catch(() => false)); i++) {
      await page.locator('[data-recap-next]').click();
      await page.waitForTimeout(500);
    }
    const drill = page.locator('[data-drill-these]');
    await expect(drill).toBeVisible();
    expect(Number(await drill.getAttribute('data-drill-these'))).toBeGreaterThanOrEqual(1);
    await shot(page, `recap-drill-${lang}`);
    await drill.click();
    // the day's streak: a sheet after the recap; its Continue carries on with the drill
    const sheet = page.locator('[data-streak-sheet]');
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(600);
    // the sheet itself fits the screen (the recap behind it is a page, not an exercise)
    const box = await sheet.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    expect(box!.width).toBeLessThanOrEqual(321);
    // the week strip's day letters are in the app's language (Hebrew letters on a Hebrew screen)
    const days = await sheet.locator('.week-strip li span').allTextContents();
    expect(days).toHaveLength(7);
    for (const d of days) expect(d).toMatch(lang === 'he' ? /^[אבגדהוש]$/ : /^[SMTWF]$/);
    await shot(page, `streak-sheet-${lang}`);
    await page.locator('[data-streak-continue]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('main.lesson')).toBeVisible();
    await expect(page.locator('.answers .answer').first()).toBeVisible({ timeout: 20_000 });
    await shot(page, `drill-start-${lang}`);
  });

  test(`grid dictation: the ask above the pad, ✓ / ✕ on each part, ink selected chips (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await openTopic(page, lang, 'grid-dictation', 4);
    await expect(page.locator('[data-gd-root="0"]')).toBeEnabled({ timeout: 30_000 });
    const order = await page.evaluate(() => {
      const ask = document.querySelector('.lesson .ask')!.getBoundingClientRect();
      const pad = document.querySelector('.gd-pad')!.getBoundingClientRect();
      const grid = document.querySelector('.gd-grid')!.getBoundingClientRect();
      return { ask: ask.bottom, pad: pad.top, grid: grid.top };
    });
    expect(order.ask).toBeLessThanOrEqual(order.grid + 1);
    expect(order.ask).toBeLessThanOrEqual(order.pad);
    await page.locator('[data-gd-root="0"]').click();
    const on = await page.locator('[data-gd-root="0"]').evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color }));
    expect(on.bg).toBe('rgb(30, 16, 51)');
    expect(on.fg).toBe('rgb(251, 248, 255)');
    // the current cell is edged in ink, not the voice course's teal
    const cur = await page.locator('.gd-cell.cur').first().evaluate((e) => getComputedStyle(e).borderTopColor);
    expect(cur).not.toBe('rgb(18, 201, 180)');
    await fits(page);
    await shot(page, `grid-question-${lang}`);
    // fill blindly and check: the wrong parts get ✕, the right parts ✓
    const cells = page.locator('[data-gd-cell]');
    const n = await cells.count();
    for (let i = 0; i < n; i++) {
      await cells.nth(i).click();
      await page.locator('[data-gd-root]').nth(i % 12).click();
      const xs = page.locator('[data-gd-x]');
      await page.locator('[data-gd-q]').first().click();
      if (await xs.count()) await xs.first().click();
    }
    await page.locator('[data-gd-check]').click();
    await expect(page.locator('.feedback.retry, .feedback.correct')).toBeVisible({ timeout: 15_000 });
    const marks = await page.evaluate(() => {
      const after = (s: string) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e, '::after').content);
      return { ok: after('.gd-p.ok'), bad: after('.gd-p.bad') };
    });
    expect(marks.ok.length + marks.bad.length).toBeGreaterThan(0);
    for (const c of marks.ok) expect(c).toBe('"✓"');
    for (const c of marks.bad) expect(c).toBe('"✕"');
    // the locked pad stays readable (no faded block)
    expect(await page.locator('.gd-pad').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    await page.waitForTimeout(400);
    await fits(page);
    await shot(page, `grid-feedback-${lang}`);
  });
}
