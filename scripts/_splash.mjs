import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:5173/?splash=1&lang=he');
const t0 = Date.now();
for (const t of [1000, 2500, 3600, 4800, 5600]) { await p.waitForTimeout(t - (Date.now() - t0)); await p.screenshot({ path: `${out}/splash-${t}.png` }); }
await b.close();
