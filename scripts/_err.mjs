import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message.slice(0, 300)));
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 300)));
for (const h of process.argv.slice(2)) { await p.goto(`http://localhost:5173/?unlock#/${h}`); await p.waitForTimeout(2500); console.log('--', h, (await p.locator('main').count())); }
await b.close();
