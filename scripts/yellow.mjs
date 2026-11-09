// Dev helper (0.65): find pale-yellow / lemon surfaces and anything hard to see on them (text or icon strokes/fills),
// plus low-contrast icons anywhere. Usage: node scripts/yellow.mjs <hash> …  (dev server on :5173). Env: SHOT_THEME, SHOT_COURSE.
import { chromium } from '@playwright/test';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: process.env.SHOT_THEME === 'dark' ? 'dark' : 'light' });
const p = await ctx.newPage();
if (process.env.SHOT_COURSE || process.env.SHOT_THEME) await p.addInitScript(([c, th]) => { try { const k = 'toneturn.settings'; const s = JSON.parse(localStorage.getItem(k) || '{}'); if (c) s.activeCourse = c; if (th) s.theme = th; localStorage.setItem(k, JSON.stringify(s)); } catch {} }, [process.env.SHOT_COURSE, process.env.SHOT_THEME]);
const seen = new Set();
for (const h of process.argv.slice(2)) {
  await p.goto(`${BASE}/?sim=1&unlock=all&lang=he#/${h}`, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(1200);
  const bad = await p.evaluate(() => {
    const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    const lum = (c) => 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('url')) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0.5) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
    const yellow = (c) => c && c.r > 225 && c.g > 190 && c.b < 200 && c.r - c.b > 60;
    const out = [];
    const desc = (el) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).slice(0, 40)} in ${(el.closest('[class]')?.parentElement?.className?.baseVal ?? el.closest('[class]')?.parentElement?.className ?? '').toString().slice(0, 30)}`;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.3) continue;
      const bg = bgOf(el.tagName === 'svg' || el instanceof SVGElement ? el.parentElement : el); if (!bg) continue;
      if (el instanceof SVGElement && el.tagName !== 'svg') {
        for (const prop of ['fill', 'stroke']) {
          const c = parse(cs[prop]); if (!c || c.a < 0.5 || cs[prop] === 'none') continue;
          const op = Number(cs.opacity) * Number(cs[prop + 'Opacity'] ?? 1);
          const rr = ratio(c, bg);
          if ((rr < 1.6 || (op < 0.5 && rr < 3)) && (r.width > 4 || r.height > 4)) out.push(`icon ${prop} ${cs[prop]} op=${op.toFixed(2)} on ${cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? `rgb(${bg.r},${bg.g},${bg.b})` : cs.backgroundColor} ratio=${rr.toFixed(2)} ${desc(el.ownerSVGElement ?? el)}`);
        }
        continue;
      }
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (own) { const fg = parse(cs.color); const rr = ratio(fg, bg); if (rr < 3 || (yellow(bg) && rr < 4.5)) out.push(`text ${cs.color} on rgb(${bg.r},${bg.g},${bg.b}) ratio=${rr.toFixed(2)} "${el.textContent.trim().slice(0, 25)}" ${desc(el)}`); }
    }
    return out;
  });
  for (const x of bad) { const k = x.replace(/"[^"]*"/, '').replace(/ratio=\S+/, ''); if (seen.has(k)) continue; seen.add(k); console.log(`${h || 'home'}\t${x}`); }
}
console.log(`-- ${seen.size} distinct`);
await b.close();
