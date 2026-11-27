// UI sweep (owner 2026-11-27: "make it professional, but don't get stuck for hours"): opens every top-level screen at
// phone and computer width, in Hebrew and English, light and dark, and reports layout defects the DOM can prove:
// horizontal overflow, a single word broken across lines (the squeezed "Update" chip), clipped text, emoji in copy,
// and low-contrast text. Saves one screenshot per screen × size × language (light) for a visual pass.
// Needs a dev server: npx vite --port 5175 --strictPort; then: node scripts/ui-sweep.mjs [outDir]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:5175';
const OUT = process.argv[2] ?? 'test-results/ui-sweep';
mkdirSync(OUT, { recursive: true });
const ROUTES = ['', 'path', 'drills', 'workout', 'skills', 'insights', 'achievements', 'arcade', 'games', 'friends', 'classes', 'settings', 'licks', 'encore', 'pieces', 'repertoire', 'songs', 'mysong', 'recordings', 'tuner', 'metronome', 'mixer', 'drone', 'chordfinder', 'chordbuilder', 'improv', 'perform', 'vocal', 'exams', 'diary', 'learned', 'daily', 'challenges', 'plans', 'charts', 'teach', 'transcribe-coach', 'slowdown', 'singalong', 'groove', 'euclid', 'puzzle', 'truefalse', 'duel', 'online', 'ghost', 'coursestart', 'intake'];
// ALL=1: every route in the app's router (games included), phone only, light — the wide pass
if (process.env.ALL) {
  const extra = ['peakhunter','rush-chord','rush-note','rush-fretboard','rush-interval','rush-keysig','rush-progression','rush-voicing','rush-scale','rush-standard','reharm','transcribe','bhtime','riffecho','polylock','gameboard','flight','pitchmemory','nametune','tuneup','highway','melodypuzzle','groove-echo','odd-echo','time-lock','ghost-control','rudiment-rush','groove-off','playback','voicingsprint','changerace','walkchanges','rootsear','harmonyhold','singinterval','kitread','namegroove','depth','bordercontrol','whichbrother','runcatcher','compcaller','elevator','guidetone','call5432','enclosure','crossword','holdnote','staffrunner','rootcatch','strumchange','rebound','singback','thirdjump','darkside','whichpair','mirror','tonnetz','welcome','land','admin','diagnostics','truefalse','game','duelplay'];
  ROUTES.splice(0, ROUTES.length, ...extra);
}
const SIZES = [
  { name: 'phone', width: 375, height: 812, mobile: true },
  { name: 'desk', width: 1280, height: 800, mobile: false },
];
const VARIANTS = [
  { lang: 'he', theme: 'light', shot: true },
  { lang: 'en', theme: 'light', shot: true },
  { lang: 'he', theme: 'dark', shot: false },
];

const report = [];
const b = await chromium.launch({ channel: 'chrome' });
for (const sz of process.env.ALL ? SIZES.slice(0, 1) : SIZES)
  for (const v of process.env.ALL ? VARIANTS.slice(0, 2) : VARIANTS) {
    const ctx = await b.newContext({ viewport: { width: sz.width, height: sz.height }, isMobile: sz.mobile, hasTouch: sz.mobile, colorScheme: v.theme });
    const p = await ctx.newPage();
    for (const r of ROUTES) {
      const label = `${r || 'home'} · ${sz.name} · ${v.lang} · ${v.theme}`;
      try {
        await p.goto(`${BASE}/?sim=1&unlock=all&lang=${v.lang}&pwa=update#/${r}`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1300);
        const res = await p.evaluate(() => {
          const out = { overflow: [], broken: [], spill: [], clipped: [], emoji: [], contrast: [] };
          const vw = document.documentElement.clientWidth;
          const sel = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className || '').split(' ').filter(Boolean).slice(0, 2).join('.')}`;
          const vis = (e) => {
            const s = getComputedStyle(e);
            const rc = e.getBoundingClientRect();
            return s.visibility !== 'hidden' && s.display !== 'none' && rc.width > 0 && rc.height > 0;
          };
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
          const bgOf = (e) => {
            for (let n = e; n; n = n.parentElement) {
              const s = getComputedStyle(n);
              if (s.backgroundImage && s.backgroundImage !== 'none') return null; // gradients / images: skip
              const c = parse(s.backgroundColor);
              if (c && c.a > 0.9) return c;
            }
            return { r: 255, g: 255, b: 255, a: 1 };
          };
          const emojiRe = /\p{Extended_Pictographic}/u;
          for (const e of document.querySelectorAll('body *')) {
            if (!vis(e)) continue;
            const rc = e.getBoundingClientRect();
            if (rc.right > vw + 1 || rc.left < -1) {
              const pr = e.parentElement?.getBoundingClientRect();
              if (!(pr && (pr.right > vw + 1 || pr.left < -1))) out.overflow.push(sel(e));
            }
            // leaf-ish text nodes
            const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
            if (!own) continue;
            const s = getComputedStyle(e);
            const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.3;
            // a single word wrapped over several lines (letters stacked)
            if (!/\s/.test(own) && own.length >= 3 && s.writingMode === 'horizontal-tb') {
              // count the text's own line boxes: one word on two or more lines = squeezed
              const tn = [...e.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
              if (tn) {
                const rg = document.createRange();
                rg.selectNodeContents(tn);
                const tops = new Set([...rg.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
                if (tops.size > 1) out.broken.push(`${sel(e)} "${own.slice(0, 20)}"`);
              }
            }
            // text running out of its own box (under a neighbour)
            {
              const tn = [...e.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
              if (tn && s.overflow === 'visible') {
                const rg = document.createRange();
                rg.selectNodeContents(tn);
                const er = e.getBoundingClientRect();
                const pl = parseFloat(s.paddingLeft) || 0, pr = parseFloat(s.paddingRight) || 0;
                for (const q of rg.getClientRects()) {
                  if (q.width > 0 && (q.right > er.right - pr + 3 || q.left < er.left + pl - 3)) {
                    out.spill.push(`${sel(e)} "${own.slice(0, 20)}"`);
                    break;
                  }
                }
              }
            }
            // clipped text
            if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis') out.clipped.push(`${sel(e)} "${own.slice(0, 20)}"`);
            if (emojiRe.test(own)) out.emoji.push(`${sel(e)} "${own.slice(0, 20)}"`);
            const fg = parse(s.color);
            const bg = bgOf(e);
            if (fg && bg && fg.a > 0.5) {
              const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
              const ratio = (l1 + 0.05) / (l2 + 0.05);
              const big = parseFloat(s.fontSize) >= 18.5 || (parseFloat(s.fontSize) >= 14 && Number(s.fontWeight) >= 700);
              if (ratio < (big ? 3 : 4.5) - 0.01 && ratio < 3.8) out.contrast.push(`${sel(e)} "${own.slice(0, 16)}" ${ratio.toFixed(2)}`);
            }
          }
          for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 8);
          out.scroll = document.documentElement.scrollWidth > vw + 1;
          return out;
        });
        const issues = Object.entries(res).filter(([k, x]) => (k === 'scroll' ? x : x.length));
        if (issues.length) report.push({ label, ...res });
        if (v.shot) await p.screenshot({ path: `${OUT}/${(r || 'home').replace(/\//g, '_')}-${sz.name}-${v.lang}.png` });
      } catch (e) {
        report.push({ label, error: String(e).slice(0, 160) });
      }
    }
    await ctx.close();
  }
await b.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(`${report.length} screen variants with findings; report at ${OUT}/report.json`);
