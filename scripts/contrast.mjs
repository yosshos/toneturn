// Dev helper (0.64): find text that is hard to read — WCAG contrast of each text element against the background it
// actually sits on (walking up the ancestors). Usage: node scripts/contrast.mjs <hash> [<hash> …]  (dev server on :5173)
// Env: SHOT_THEME=dark, SHOT_LANG=en, SHOT_COURSE=keys, MIN=3 (report below this ratio; default 3).
import { chromium } from '@playwright/test';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173';
const MIN = Number(process.env.MIN ?? 3);
const routes = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: process.env.SHOT_THEME === 'dark' ? 'dark' : 'light' });
const p = await ctx.newPage();
const lang = process.env.SHOT_LANG === 'en' ? 'en' : 'he';
const out = [];
for (const h of routes) {
  await p.goto(`${BASE}/?sim=1&unlock=all&lang=${lang}#/${h}`, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(1200);
  const bad = await p.evaluate((min) => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, bl, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r, g, b: bl, a };
    };
    const lum = ({ r, g, b }) => {
      const f = (x) => {
        x /= 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('url')) return null; // gradient: skip
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
    };
    const res = [];
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.3) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const fg = parse(cs.color);
      const bg = bgOf(el);
      if (!fg || !bg) continue;
      const L1 = lum(fg);
      const L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (ratio < min) res.push({ text: el.textContent.trim().slice(0, 40), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50), tag: el.tagName.toLowerCase(), fg: cs.color, bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`, ratio: Math.round(ratio * 100) / 100 });
    }
    return res;
  }, MIN);
  for (const x of bad) out.push({ route: h, ...x });
}
const seen = new Set();
for (const x of out) {
  const k = `${x.cls}|${x.fg}|${x.bg}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`${x.ratio}\t${x.route}\t${x.tag}.${x.cls}\t${x.fg} on ${x.bg}\t"${x.text}"`);
}
console.log(`-- ${out.length} low-contrast texts (${seen.size} distinct styles)`);
await b.close();
