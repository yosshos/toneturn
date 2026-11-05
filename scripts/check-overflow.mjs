// Phone-width audit: opens every screen and every lesson's first question and reports anything wider than
// the viewport. Needs a dev server: npx vite --port 5175 --strictPort; then: node scripts/check-overflow.mjs 320
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5175';
const W = Number(process.argv[2] ?? 360);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: W, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
async function check(label) {
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const e of document.querySelectorAll('body *')) {
      const rc = e.getBoundingClientRect();
      if (rc.width === 0) continue;
      if (rc.right > vw + 1 || rc.left < -1) {
        // report only the outermost offenders
        const p = e.parentElement?.getBoundingClientRect();
        if (p && (p.right > vw + 1 || p.left < -1)) continue;
        out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 2).join('.')} [${Math.round(rc.left)}..${Math.round(rc.right)}]`);
      }
    }
    return { scroll: document.documentElement.scrollWidth, vw, out: out.slice(0, 6) };
  });
  if (r.scroll > r.vw || r.out.length) console.log(`✗ ${label}: scrollWidth ${r.scroll} > ${r.vw}`, r.out.join(' | '));
  else console.log(`✓ ${label}`);
}
for (const route of ['', 'settings', 'diagnostics', 'games', 'friends', 'skills', 'daily', 'duel', 'online', 'drone', 'classes', 'ghost']) {
  await page.goto(`${BASE}/?unlock=all#/${route}`);
  await check(route || 'home');
}
// Every lesson, first question, Buttons mode.
await page.goto(`${BASE}/?unlock=all`);
await page.evaluate(() => localStorage.clear());
const n = await page.locator('.path-list li button').count();
for (let i = 0; i < n; i++) {
  await page.goto(`${BASE}/?unlock=all`);
  await page.getByRole('radio', { name: 'Buttons' }).first().click().catch(() => {});
  const btn = page.locator('.path-list li button').nth(i);
  const name = (await btn.innerText()).split('\n')[0];
  await btn.click();
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await check(`lesson ${i + 1} ${name}`);
}
await b.close();
