import { expect, test, type Page } from '@playwright/test';

// Phones (product owner): no screen may scroll sideways. Every screen and the states inside them, at 320 px
// (the narrowest common phone, and a stand-in for large system fonts), English and Hebrew (RTL): nothing may
// stick out of the viewport, and no container may scroll sideways (only the teacher's class table may).

test.use({ viewport: { width: Number(process.env.OVF_WIDTH ?? 320), height: 720 }, hasTouch: true });

const ALLOWED_SCROLLERS = ['roster-wrap'];

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

const ROUTES = ['', '#/settings', '#/games', '#/friends', '#/skills', '#/daily', '#/online', '#/drone', '#/classes', '#/ghost', '#/truefalse', '#/vocal', '#/achievements', '#/singalong', '#/perform', '#/learned'];

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
    if (p.length) {
      bad[label] = p;
      console.log(`OVERFLOW ${label}: ${p.join(' | ')}`);
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
    await page.getByRole('button', { name: /Find my level|מצאו את הרמה|בדיקת רמה/ }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await check('find my level');
    expect(bad, JSON.stringify(bad, null, 1)).toEqual({});
  });

  test(`practice topics: no sideways scrolling (${lang})`, async ({ page }) => {
    test.setTimeout(900_000);
    await setup(page);
    const { bad, check } = recorder(page);
    await page.goto(base);
    await openAll(page);
    const n = await page.locator('[data-topic]').count();
    for (let i = 0; i < n; i++) {
      await page.goto(base);
      await openAll(page);
      const chip = page.locator('[data-topic]').nth(i);
      const label = `topic ${await chip.getAttribute('data-topic')} #${i}`;
      await chip.click();
      await page.waitForTimeout(1200);
      await check(label);
    }
    expect(bad, JSON.stringify(bad, null, 1)).toEqual({});
  });

  test(`path lessons and games: no sideways scrolling (${lang})`, async ({ page }) => {
    test.setTimeout(900_000);
    await setup(page);
    const { bad, check } = recorder(page);
    await page.goto(base);
    const nodes = page.locator('button.node-btn');
    const n = await nodes.count();
    for (let i = 0; i < n; i++) {
      await page.goto(base);
      const b = page.locator('button.node-btn').nth(i);
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
