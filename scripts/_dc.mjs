import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const [dir, out, ...boards] = process.argv.slice(2);
const rt = readFileSync(`${dir}/artifact-type/dc-runtime.js`, 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
for (const name of boards) {
  const [file, w, h] = name.split(':');
  const p = await b.newPage({ viewport: { width: Number(w || 390), height: Number(h || 844) } });
  await p.route('**/support.js', (r) => r.fulfill({ body: rt, contentType: 'text/javascript' }));
  await p.goto(`file:///${dir}/project/${file}.dc.html`).catch((e) => console.log('ERR', e.message));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${file}.png`, fullPage: true });
  console.log(file);
  await p.close();
}
await b.close();
