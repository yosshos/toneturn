// Dev helper: headless screenshots of routes on phone and wide, for design review.
// Usage: node scripts/shots.mjs <outDir> <phone|wide|both> <hash> [<hash> …]   (dev server on :5173)
// Env: SHOT_THEME=dark · SHOT_LANG=en · SHOT_SEED=1 (a returning player: a few lessons done, onboarding finished)
//      SHOT_COURSE=keys (active course when seeded) · SHOT_SETUP='js run before each shot'.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [out, mode, ...hashes] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const sizes = { phone: { width: 390, height: 844 }, wide: { width: 1440, height: 900 } };
const which = mode === 'both' ? ['phone', 'wide'] : [mode];
const seed = !!process.env.SHOT_SEED;
const course = process.env.SHOT_COURSE ?? 'ear';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173';
const lang = process.env.SHOT_LANG === 'en' ? 'en' : 'he';

async function seedDb(page) {
  await page.goto(`${BASE}/manifest.webmanifest`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    async ({ course, lang }) => {
      const now = new Date().toISOString();
      const day = now.slice(0, 10);
      const hist = (id, i) => ({ lessonId: id, lessonVersion: 1, sessionId: `s${i}`, completedAt: now, firstTry: 5, total: 6, xp: 40, missed: [] });
      const progress = {
        version: 1,
        xp: 420,
        applied: [],
        lessons: { 'bflat-two-homes': { best: 6, completions: 2, lastAt: now }, 'major-minor': { best: 5, completions: 1, lastAt: now } },
        history: [hist('bflat-two-homes', 1), hist('major-minor', 2)],
        streak: { count: 12, lastDay: day },
        review: [],
      };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys', 'voice'], activeCourse: course, seenVersion: '9.9.9' };
      await new Promise((res, rej) => {
        const r = indexedDB.open('toneturn', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          const tx = r.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(progress, 'progress');
          tx.objectStore('kv').put(settings, 'settings');
          tx.oncomplete = res;
          tx.onerror = rej;
        };
        r.onerror = rej;
      });
    },
    { course, lang },
  );
}

const browser = await chromium.launch({ channel: 'chrome' });
for (const w of which) {
  const ctx = await browser.newContext({ viewport: sizes[w], deviceScaleFactor: 1, colorScheme: process.env.SHOT_THEME === 'dark' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  if (seed) await seedDb(page);
  for (const h of hashes) {
    const q = seed ? '?unlock' : lang === 'en' ? '?sim=1&lang=en' : '?sim=1';
    await page.goto(`${BASE}/${q}#/${h}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    if (process.env.SHOT_SETUP) await page.evaluate(process.env.SHOT_SETUP).catch(() => {});
    await page.waitForTimeout(300);
    const name = `${w}-${h.replace(/[^a-z0-9-]/gi, '_') || 'home'}.png`;
    await page.screenshot({ path: `${out}/${name}` });
    console.log(name);
  }
  await ctx.close();
}
await browser.close();
