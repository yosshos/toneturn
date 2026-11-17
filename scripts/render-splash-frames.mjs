// Frames of the studio opening animation (src/ui/brand/Splash.tsx) into docs/brand-shots/.
// Usage: start the dev server (npx vite --port 5184), then: node scripts/render-splash-frames.mjs [baseURL] [--inapp]
// Each frame loads the app with ?look=studio&splash=force, then pauses every animation at the frame's time.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5184';
const only = process.argv.includes('--inapp'); // just the in-app logo shots
const out = (f) => fileURLToPath(new URL(`../docs/brand-shots/${f}`, import.meta.url));
mkdirSync(out(''), { recursive: true });
const FRAMES = [250, 600, 950, 1150, 1450, 1700, 2080];

const browser = await chromium.launch({ channel: 'chrome' });
for (const [lang, view] of [
  ['he', { width: 390, height: 844 }],
  ['en', { width: 390, height: 844 }],
  ['he', { width: 1280, height: 800 }],
]) {
  const wide = view.width > 600;
  for (const t of only ? [] : wide ? [2080] : FRAMES) {
    const ctx = await browser.newContext({ viewport: view, deviceScaleFactor: wide ? 1 : 2 });
    await ctx.addInitScript(() => {
      try {
        localStorage.removeItem('tt.splash.day');
      } catch {
        /* fine */
      }
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?look=studio&splash=force&lang=${lang}`);
    await page.locator('[data-brand-splash]').waitFor();
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = ms;
      }
    }, t);
    await page.screenshot({ path: out(`splash-${lang}${wide ? '-wide' : ''}-${String(t).padStart(4, '0')}ms.png`) });
    await ctx.close();
  }
}
// Where the logo sits in the app: the side menu (wide screens) and the onboarding welcome.
for (const [name, url, view, clip] of [
  ['inapp-sidebar', '/?nosplash&lang=he', { width: 1440, height: 900 }, '[data-side-nav] .sn-brand'],
  ['inapp-welcome', '/?nosplash&sim=1&welcome=1&lang=he', { width: 390, height: 844 }, null],
]) {
  const ctx = await browser.newContext({ viewport: view, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(base + url);
  if (clip) await page.locator(clip).waitFor();
  else await page.locator('[data-onboarding="welcome"]').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(`${name}.png`), clip: clip ? { x: 0, y: 0, width: view.width, height: 160 } : undefined });
  await ctx.close();
}
await browser.close();
console.log('ok');
