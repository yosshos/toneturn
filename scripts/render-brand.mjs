// Writes the brand files from src/ui/brand/mark.ts (owner 2026-11-17: the "Paper" 7-as-a-quaver) and renders them.
//   public/icon.svg            the mark on its tile (manifest "any", notifications)
//   public/favicon.svg         the small-size cut (no edge copies, heavier strokes) for the browser tab
//   public/badge-mono.svg      one colour, no tile: the 7 + bars, for future push badges
//   public/icon-192.png, icon-512.png, icon-maskable-512.png (mark inside the 80 % safe zone), apple-touch-icon.png,
//   public/favicon-32.png
//   docs/brand/wordmark*.svg   mark + "The 7th Sense"
//   docs/brand-shots/icons-*.png   the mark at 16 / 29 / 32 / 48 / 64 / 180 px on dark and light
// Usage: node scripts/render-brand.mjs   (Node 24: imports the .ts geometry directly; Chrome via Playwright, no downloads)
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMPACT, MARK, PALETTES, barLine } from '../src/ui/brand/mark.ts';

const root = new URL('..', import.meta.url);
const path = (rel) => fileURLToPath(new URL(rel, root));
const H = MARK.head;
const n = (v) => +v.toFixed(2);

function bars(color, sw, dy = 0) {
  return MARK.bars
    .map((b) => {
      const l = barLine(b, dy);
      return `<line x1="${l.x}" y1="${n(l.y1)}" x2="${l.x}" y2="${n(l.y2)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    })
    .join('');
}
function seven(color, sw, dy = 0) {
  const t = dy ? ` transform="translate(0 ${dy})"` : '';
  return (
    `<g${t} fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"><path d="${MARK.top}"/><path d="${MARK.stem}"/></g>` +
    `<ellipse cx="${H.cx}" cy="${H.cy + dy}" rx="${H.rx}" ry="${H.ry}" transform="rotate(${H.rotate} ${H.cx} ${H.cy + dy})" fill="${color}"/>`
  );
}
/** The mark's layers. compact = the small-size cut. */
function mark(p, { compact = false } = {}) {
  const sw = compact ? COMPACT.stroke : MARK.stroke;
  const bw = compact ? COMPACT.barStroke : MARK.barStroke;
  return (compact ? '' : bars(p.barsEdge, MARK.barStroke, MARK.barEdgeDy)) + bars(p.bars, bw) + (compact ? '' : seven(p.edge, MARK.stroke, MARK.edgeDy)) + seven(p.fill, sw);
}
const svg = (body, title = 'The 7th Sense') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">\n  <title>${title}</title>\n  ${body}\n</svg>\n`;
const P = PALETTES.paper;
// The mark's own box (bars' left edge to the stem's right end, top stroke to the head's edge copy): centre ≈ (51.6, 61).
const CENTRE = [51.6, 61];
const placed = (scale, inner) => `<g transform="translate(60 60) scale(${scale}) translate(${-CENTRE[0]} ${-CENTRE[1]})">${inner}</g>`;

const files = {
  icon: svg(`<rect width="120" height="120" rx="${MARK.radius}" fill="${P.bg}"/>\n  ${mark(P)}`),
  favicon: svg(`<rect width="120" height="120" rx="${MARK.radius}" fill="${P.bg}"/>\n  <g transform="translate(60 60) scale(${COMPACT.scale}) translate(-60 -60)">${mark(P, { compact: true })}</g>`),
  // One colour, transparent: the platform tints it (Android status bar badge).
  badge: svg(placed(1.2, bars('#ffffff', COMPACT.barStroke) + seven('#ffffff', COMPACT.stroke)), 'The 7th Sense badge'),
  // Maskable: full bleed, the mark scaled into the 80 % safe circle and centred.
  maskable: svg(`<rect width="120" height="120" fill="${P.bg}"/>\n  ${placed(0.8, mark(P))}`),
  // iOS rounds the corners itself: full bleed, the mark as on the icon.
  apple: svg(`<rect width="120" height="120" fill="${P.bg}"/>\n  ${mark(P)}`),
};
writeFileSync(path('public/icon.svg'), files.icon);
writeFileSync(path('public/favicon.svg'), files.favicon);
writeFileSync(path('public/badge-mono.svg'), files.badge);

// Wordmark: mark + "The 7th Sense" in Secular One (embedded so the SVG renders the same everywhere).
// node_modules: here or in a parent folder (a git worktree uses the main checkout's).
const modules = (rel) => {
  for (let dir = new URL('.', root); ; dir = new URL('..', dir)) {
    const p = fileURLToPath(new URL(`node_modules/${rel}`, dir));
    if (existsSync(p)) return p;
    if (new URL('..', dir).href === dir.href) throw new Error(`not found: ${rel}`);
  }
};
const secular = readFileSync(modules('@fontsource/secular-one/files/secular-one-latin-400-normal.woff2')).toString('base64');
const rubik = readFileSync(modules('@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2')).toString('base64');
function wordmark(text, sub, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 320">
  <title>The 7th Sense</title>
  <style>@font-face{font-family:'RubikNS';src:url(data:font/woff2;base64,${rubik}) format('woff2');font-weight:300 900}
  @font-face{font-family:'SecularNS';src:url(data:font/woff2;base64,${secular}) format('woff2')}
  .w{font-family:'SecularNS','Secular One',Rubik,sans-serif;font-size:140px;letter-spacing:-2px}
  .s{font-family:'RubikNS',Rubik,system-ui,sans-serif;font-weight:600;font-size:40px;letter-spacing:6px}</style>
  <svg x="20" y="20" width="280" height="280" viewBox="0 0 120 120"><rect width="120" height="120" rx="${MARK.radius}" fill="${P.bg}"/>${mark(P)}</svg>
  <text x="340" y="190" class="w"><tspan fill="${text}">The 7</tspan><tspan fill="${text}" font-size="70" dy="-46">th</tspan><tspan fill="${accent}" dx="30" dy="46">Sense</tspan></text>
  <text x="346" y="262" class="s" fill="${sub}">HEAR · UNDERSTAND · PERFORM</text>
</svg>
`;
}
writeFileSync(path('docs/brand/wordmark.svg'), wordmark('#1E1033', '#5B4A86', '#6D28D9'));
writeFileSync(path('docs/brand/wordmark-dark.svg'), wordmark('#FFFFFF', '#B9A8DE', '#ffd43b'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const img = (s, size) => `<img src="data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}" width="${size}" height="${size}" style="display:block">`;

async function png(s, size, out, { opaque = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${img(s, size)}</body></html>`);
  await page.waitForTimeout(80);
  await page.screenshot({ path: path(out), omitBackground: !opaque });
}
await png(files.icon, 192, 'public/icon-192.png');
await png(files.icon, 512, 'public/icon-512.png');
await png(files.maskable, 512, 'public/icon-maskable-512.png', { opaque: true });
await png(files.apple, 180, 'public/apple-touch-icon.png', { opaque: true });
await png(files.favicon, 32, 'public/favicon-32.png');

// Size check sheet: what each size actually uses (≤ 24 px: the compact cut), plus the maskable crop and the badge.
mkdirSync(path('docs/brand-shots'), { recursive: true });
const SIZES = [16, 29, 32, 48, 64, 180];
const forSize = (s) => (s <= 24 ? files.favicon : files.icon);
for (const [name, bg, ink] of [
  ['dark', '#170638', '#e9e2ff'],
  ['light', '#f6f2fc', '#1e1033'],
]) {
  const cells = SIZES.map((s) => `<figure>${img(forSize(s), s)}<figcaption>${s}px</figcaption></figure>`).join('');
  const extras =
    `<figure><div style="width:120px;height:120px;border-radius:50%;overflow:hidden">${img(files.maskable, 120)}</div><figcaption>maskable (circle)</figcaption></figure>` +
    `<figure><div style="background:#5b5b66;padding:8px;border-radius:8px">${img(files.badge, 48)}</div><figcaption>badge</figcaption></figure>`;
  await page.setViewportSize({ width: 760, height: 260 });
  await page.setContent(`<html><body style="margin:0;background:${bg};color:${ink};font:13px system-ui">
    <div style="display:flex;gap:26px;align-items:flex-end;padding:28px">${cells}${extras}</div>
    <style>figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}</style></body></html>`);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path(`docs/brand-shots/icons-${name}.png`) });
}
// 1:1 pixels, enlarged 8x (nearest neighbour) so the small sizes can be judged.
await page.setViewportSize({ width: 900, height: 330 });
await page.setContent(`<html><body style="margin:0;background:#f6f2fc;font:13px system-ui;color:#1e1033">
  <div style="display:flex;gap:30px;padding:24px;align-items:flex-end">
  ${[16, 29, 48].map((s) => `<figure style="margin:0;text-align:center"><canvas data-s="${s}" width="${s}" height="${s}" style="width:${s * (s === 48 ? 4 : 8)}px;height:${s * (s === 48 ? 4 : 8)}px;image-rendering:pixelated"></canvas><figcaption>${s}px, enlarged</figcaption></figure>`).join('')}
  </div></body></html>`);
for (const s of [16, 29, 48]) {
  await page.evaluate(
    async ([s, src]) => {
      const im = new Image();
      im.src = src;
      await im.decode();
      document.querySelector(`canvas[data-s="${s}"]`).getContext('2d').drawImage(im, 0, 0, s, s);
    },
    [s, `data:image/svg+xml;base64,${Buffer.from(forSize(s)).toString('base64')}`],
  );
}
await page.screenshot({ path: path('docs/brand-shots/icons-pixels.png') });
await browser.close();
console.log('ok');
