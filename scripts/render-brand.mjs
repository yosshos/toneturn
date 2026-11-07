// Renders the brand SVGs to PNG (app icons for iOS / Android install, and a preview sheet).
// Usage: node scripts/render-brand.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const icon = readFileSync(new URL('public/icon.svg', root), 'utf-8');
// Wordmark: icon + "Ninth Sense" in Secular One, tagline in Rubik (both embedded, so the SVG renders the same everywhere).
const rubik = readFileSync(new URL('node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2', root)).toString('base64');
const secular = readFileSync(new URL('node_modules/@fontsource/secular-one/files/secular-one-latin-400-normal.woff2', root)).toString('base64');
const inner = icon.replace(/<\?xml[^>]*>/, '').replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', '').replace('</svg>', '').replace(/<title>.*?<\/title>/, '');
function wordmark(text, sub) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 320">
  <title>Ninth Sense</title>
  <style>@font-face{font-family:'RubikNS';src:url(data:font/woff2;base64,${rubik}) format('woff2');font-weight:300 900}
  @font-face{font-family:'SecularNS';src:url(data:font/woff2;base64,${secular}) format('woff2')}
  .w{font-family:'SecularNS','Secular One',Rubik,sans-serif;font-size:156px;letter-spacing:-2px}
  .s{font-family:'RubikNS',Rubik,system-ui,sans-serif;font-weight:600;font-size:40px;letter-spacing:6px}</style>
  <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9DF9D4"/><stop offset="0.5" stop-color="#5CF2B5"/><stop offset="1" stop-color="#3FC7E0"/></linearGradient></defs>
  <svg x="20" y="20" width="280" height="280" viewBox="0 0 512 512">${inner}</svg>
  <text x="340" y="190" class="w"><tspan fill="${text}">Ninth</tspan><tspan fill="url(#wg)" dx="34">Sense</tspan></text>
  <text x="346" y="262" class="s" fill="${sub}">HEAR IT · SAY IT · SING IT</text>
</svg>
`;
}
writeFileSync(new URL('docs/brand/wordmark.svg', root), wordmark('#0F1020', '#5B5880'));
writeFileSync(new URL('docs/brand/wordmark-dark.svg', root), wordmark('#F4F1FF', '#A9A6C9'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(svg, size, out, { maskable = false } = {}) {
  // Maskable: full-bleed background, artwork inside the 80 % safe zone.
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#0F1020;display:grid;place-items:center"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${size * 0.8}px;height:${size * 0.8}px"></div>`
    : `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${size}px;height:${size}px;display:block">`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: new URL(out, root).pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: !maskable });
}

await png(icon, 180, 'public/apple-touch-icon.png', { maskable: true });
await png(icon, 192, 'public/icon-192.png');
await png(icon, 512, 'public/icon-512.png');
await png(icon, 512, 'public/icon-maskable-512.png', { maskable: true });

// Preview sheet
const preview = pathToFileURL(new URL('docs/brand/preview.html', root).pathname.replace(/^\/([A-Z]:)/, '$1')).href;
await page.setViewportSize({ width: 1100, height: 900 });
await page.goto(preview);
await page.waitForTimeout(300);
await page.screenshot({ path: new URL('docs/brand/preview.png', root).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
await browser.close();
console.log('ok');
