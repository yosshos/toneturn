import { expect, test, type Page } from '@playwright/test';

// Phones (product owner): no screen may scroll sideways. Every screen and the states inside them, at 320 px
// (the narrowest common phone, and a stand-in for large system fonts), English and Hebrew (RTL): nothing may
// stick out of the viewport, and no container may scroll sideways (only the teacher's class table may).

test.use({ viewport: { width: Number(process.env.OVF_WIDTH ?? 320), height: 720 }, hasTouch: true });

const ALLOWED_SCROLLERS = ['roster-wrap', 'play-cats', 'neck-wrap', 'staff-pad-wrap', 'ar-row', 'topic-strip', 'ps-seg', 'frame-chips', 'drill-topics', 'mt-styles', 'mt-kit', 'ls-topics', 'ch-grid', 'ch-styles'];

async function problems(page: Page): Promise<string[]> {
  return page.evaluate((allowed) => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    const name = (el: Element) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    const inAllowed = (el: Element) => allowed.some((c) => el.closest(`.${c}`));
    if (document.documentElement.scrollWidth > vw + 1) out.push(`PAGE ${document.documentElement.scrollWidth} > ${vw}`);
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || inAllowed(el)) continue;
      // Sticks out of the screen (clipped or not).
      if (r.right > vw + 1 || r.left < -1) {
        // …unless an ancestor clips it on purpose and that ancestor fits (e.g. confetti, ripples).
        let clipped = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if ((o === 'hidden' || o === 'clip') && p !== document.body && p !== document.documentElement) {
            const pr = p.getBoundingClientRect();
            if (pr.left >= -1 && pr.right <= vw + 1) clipped = true;
            break;
          }
          if (o === 'auto' || o === 'scroll') break;
        }
        if (!clipped) out.push(`${name(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      // Scrolls sideways.
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.push(`${name(el)} scrolls sideways (${el.scrollWidth} > ${el.clientWidth})`);
    }
    return [...new Set(out)].slice(0, 12);
  }, ALLOWED_SCROLLERS);
}

const ROUTES = ['', '#/path', '#/arcade', '#/settings', '#/games', '#/friends', '#/skills', '#/daily', '#/online', '#/drone', '#/classes', '#/ghost', '#/truefalse', '#/studio', '#/vocal', '#/achievements', '#/singalong', '#/perform', '#/learned', '#/tuner', '#/workout', '#/highway', '#/flight', '#/melodypuzzle', '#/nametune', '#/tuneup', '#/pitchmemory', '#/peakhunter', '#/rush-chord', '#/rush-note', '#/rush-fretboard', '#/rush-interval', '#/rush-keysig', '#/rush-progression', '#/drills'];

async function setup(page: Page) {
  await page.addLocatorHandler(page.locator('.sheet-backdrop .sheet'), async () => {
    await page.locator('.sheet-backdrop .btn.ghost').first().click();
  });
}
function recorder(page: Page) {
  const bad: Record<string, string[]> = {};
  const check = async (label: string) => {
    await page.waitForTimeout(350);
    const p = await problems(page);
    // Phone fit (owner, 2026-11-07): an exercise's controls (Repeat / Skip / Refresh) are on screen without scrolling.
    const ctl = await page.evaluate(() => {
      const c = document.querySelector('.lesson .stage .controls');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return r.height > 0 && r.bottom > innerHeight + 1 ? `controls below the fold (${Math.round(r.bottom)} > ${innerHeight})` : null;
    });
    if (ctl) p.push(ctl);
    // One screen (owner 2026-11-07, guiding principle): a live exercise question never scrolls vertically either.
    const tall = await page.evaluate(() => {
      if (!document.querySelector('main.lesson .stage.question')) return null;
      // The test-only "simulated" banner is not part of the real screen.
      const banner = document.querySelector('.sim-banner') as HTMLElement | null;
      if (banner) banner.style.display = 'none';
      const over = document.scrollingElement!.scrollHeight - innerHeight;
      if (banner) banner.style.display = '';
      return over > 2 ? `exercise taller than the screen by ${Math.round(over)}px` : null;
    });
    if (tall) p.push(tall);
    if (p.length) {
      bad[label] = p;
      console.log(`OVERFLOW ${label}: ${p.join(' | ')}`);
      await page.screenshot({ path: `test-results/ovf-${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.png`, fullPage: true }).catch(() => {});
      console.log('MAIN', await page.evaluate(() => [...document.querySelectorAll('main')].map((m) => m.className + ' w=' + Math.round(m.getBoundingClientRect().width)).join(' ; ') + ' hash=' + location.hash));
    }
  };
  return { bad, check };
}
const openAll = (page: Page) => page.evaluate(() => document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true)));

for (const lang of ['en', 'he'] as const) {
  const base = `/?sim=1&unlock=all&lang=${lang}`;

  test(`screens: no sideways scrolling (${lang})`, async ({ page }) => {
    test.setTimeout(300_000);
    await setup(page);
    const { bad, check } = recorder(page);
    for (const r of ROUTES) {
      await page.goto(base + r);
      await openAll(page);
      await check(r || 'home');
    }
    await page.goto(base + '#/perform');
    const tabs = page.getByRole('tab');
    for (let i = 0; i < (await tabs.count()); i++) {
      await tabs.nth(i).click();
      await check(`perform tab ${i}`);
    }
    for (const sel of ['.vocal-level', '[data-sight="1"]', '[data-orn="1"]']) {
      await page.goto(base + '#/vocal');
      const b = page.locator(sel).first();
      if (await b.count()) {
        await b.click();
        await check(`vocal ${sel}`);
      }
    }
    await page.goto(base + '&mini=1#/learned');
    await page.locator('[data-learned-card="key-signatures"]').click();
    await check('quick lesson');
    await page.goto(base);
    await page.getByRole('button', { name: /Find my level|מצאו את הרמה|בדיקת רמה|מציאת הרמה/ }).first().click({ timeout: 5000 }).catch(() => {});
    await page.locator('[data-level-all]').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await check('find my level');
    expect(bad, JSON.stringify(bad, null, 1)).toEqual({});
  });

  test(`practice topics: no sideways scrolling (${lang})`, async ({ page }) => {
    test.setTimeout(1_800_000); // ~150 topics (0.89)
    await setup(page);
    const { bad, check } = recorder(page);
    await page.goto(base + '#/path'); // 0.41: topics live on the Path tab (All topics)
    await page.locator('.path-extras').waitFor();
    await openAll(page);
    // 0.38: ~100 topics — one level of each (the first); every topic's screen is checked.
    const ids = await page.$$eval('[data-topic]', (els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.topic!))]);
    for (const [i, id] of ids.entries()) {
      // Each topic opens through its deep link (#/topic/<id>/1) — the Path tab is heavy to re-render 109 times.
      await page.goto(`${base}#/topic/${id}/1`);
      // Voice mode asks for the microphone first: answer with "Buttons instead".
      await page.locator('.sheet-backdrop .btn.ghost').first().click({ timeout: 4000 }).catch(() => {});
      await page.locator('main.lesson').waitFor({ timeout: 10_000 }).catch(() => {});
      const label = `topic ${id} #${i}`;
      await page.waitForTimeout(1200);
      await check(label);
    }
    expect(bad, JSON.stringify(bad, null, 1)).toEqual({});
  });

  test(`path lessons and games: no sideways scrolling (${lang})`, async ({ page }) => {
    test.setTimeout(900_000);
    await setup(page);
    const { bad, check } = recorder(page);
    // The path has its own tab (0.37).
    await page.goto(`${base}#/path`);
    // 0.38: the hand-made lessons from the unlocked QA list (path nodes may be locked or ✓).
    const nodes = page.locator('.all-lessons button');
    await nodes.first().waitFor();
    const n = await nodes.count();
    for (let i = 0; i < n; i++) {
      await page.goto(`${base}#/path`);
      await page.reload();
      const b = page.locator('.all-lessons button').nth(i);
      const label = `path ${(await b.innerText()).replace(/\s+/g, ' ').slice(0, 30)}`;
      await b.click();
      await page.waitForTimeout(600);
      const skip = page.getByRole('button', { name: /Skip intro|דלגו על ההקדמה|דילוג/ });
      if (await skip.count()) await skip.first().click().catch(() => {});
      await page.waitForTimeout(2500);
      await check(label);
    }
    for (const g of ['#/games', '#/truefalse', '#/drone', '#/singalong']) {
      await page.goto(base + g);
      const start = page.locator('main .btn.mega, main .btn.primary').first();
      if (await start.count()) {
        await start.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2500);
        await check(`${g} running`);
      }
    }
    expect(bad, JSON.stringify(bad, null, 1)).toEqual({});
  });
}
