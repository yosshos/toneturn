// Dev helper: put a folder of screenshots on one contact sheet (labelled tiles) for a quick design review.
// Usage: node scripts/sheet.mjs <dir> <out.png> <tileWidth> <cols> [prefix]
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

const [dir, out, tw = '240', cols = '6', prefix = ''] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.startsWith(prefix) && !f.startsWith('sheet'));
const tiles = files
  .map((f) => `<figure><img src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`)
  .join('');
const html = `<html><body style="margin:0;background:#ddd;font:12px Rubik,sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:8px;padding:8px">${tiles}</div>
<style>figure{margin:0;background:#fff}img{width:${tw}px;display:block}figcaption{padding:2px 4px;font-weight:700}</style></body></html>`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(cols) * (Number(tw) + 8) + 8, height: 600 } });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out, files.length);
