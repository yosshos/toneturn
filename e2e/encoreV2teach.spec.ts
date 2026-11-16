import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Encore v2 part 2 (SPEC-PHRASE-STUDIO §6.5–6.6, §11): a teacher plays a phrase on a stub MIDI keyboard and assigns
// it (the teacher RPCs answered by the dev mock, tt.mockTeacher = 1) → the student's Today card → the assignment page
// with locked fields → a key passed at the target is submitted once; a playlist plays in the background with Media
// Session metadata set; A/B compare of two takes of the same item fits 320×720 in English and Hebrew.
// E2E_BASE: another dev server (a worktree's own vite). SHOTS=1 saves the screens to docs/encore-shots/.
test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, ...(process.env.E2E_BASE ? { baseURL: process.env.E2E_BASE } : {}) });

type Lang = 'en' | 'he';
const SHOTS = !!process.env.SHOTS;
if (SHOTS) mkdirSync('docs/encore-shots', { recursive: true });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `docs/encore-shots/${name}.png` });
};

const stubMidi = (page: Page) =>
  page.addInitScript(() => {
    const input = { name: 'Test Keys', onmidimessage: null as null | ((e: { data: Uint8Array; timeStamp: number }) => void) };
    (window as unknown as { __midiIn: typeof input }).__midiIn = input;
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['1', input]]), onstatechange: null }) });
  });

const seed = async (page: Page, lang: Lang, extra: Record<string, unknown> = {}) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    async ({ lang, extra }) => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 10, applied: ['seed-1'], lessons: {}, history: [{ sessionId: 'seed-1', lessonId: 'bflat-two-homes', lessonVersion: 1, firstTry: 3, total: 3, xp: 10, missed: [], completedAt: new Date(Date.now() - 86_400_000).toISOString() }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [], ...((extra.progress as object) ?? {}) };
      const drills = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true, instrument: 'piano' };
      const settings = { version: 2, uiLang: lang, inputLang: lang, outputLang: lang, mode: 'buttons', voiceConsent: true, midiInput: true, nickname: 'Ronit', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'general', leaveOut: [], packs: [], noSing: false, noMic: false }, courses: ['ear', 'keys'], activeCourse: 'keys', courseStart: { keys: { legacy: true } }, seenVersion: '9.9.9', drills, ...((extra.settings as object) ?? {}) };
      await new Promise((res, rej) => {
        const r = indexedDB.open('toneturn', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          const tx = r.result.transaction('kv', 'readwrite');
          if (extra.keepProgress !== true) tx.objectStore('kv').put(progress, 'progress');
          if (extra.keepSettings !== true) tx.objectStore('kv').put(settings, 'settings');
          tx.oncomplete = res;
          tx.onerror = rej;
        };
        r.onerror = rej;
      });
      localStorage.setItem('tt.mockTeacher', '1');
    },
    { lang, extra },
  );
};
const fits = async (page: Page, what: string) => {
  const m = await page.evaluate(() => {
    const banner = document.querySelector('.sim-banner') as HTMLElement | null;
    if (banner) banner.style.display = 'none';
    const se = document.scrollingElement!;
    return { over: se.scrollHeight - innerHeight, side: se.scrollWidth - innerWidth };
  });
  expect(m.side, `${what}: no horizontal scroll`).toBeLessThanOrEqual(1);
  expect(m.over, `${what}: one screen`).toBeLessThanOrEqual(2);
};
const latinOutsideBdi = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const t = n.textContent ?? '';
      if (!/[A-Za-z]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest('bdi, [dir="ltr"], script, style, svg, .sr-only, [aria-hidden="true"], .sim-banner, title, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      out.push(t.trim().slice(0, 60));
    }
    return [...new Set(out)];
  });

/** Eighths at ♩120 on the stub keyboard (real time). */
const playPhrase = (page: Page) =>
  page.evaluate(async () => {
    const inp = (window as unknown as { __midiIn: { onmidimessage: (e: { data: Uint8Array; timeStamp: number }) => void } }).__midiIn;
    const line = [65, 69, 72, 76, 74, 72, 69, 67, 65, 64, 65, 67, 69, 72, 74, 77];
    for (let i = 0; i < line.length; i++) {
      inp.onmidimessage({ data: new Uint8Array([0x90, line[i], 90]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 212));
      inp.onmidimessage({ data: new Uint8Array([0x80, line[i], 0]), timeStamp: performance.now() });
      await new Promise((r) => setTimeout(r, 38));
    }
  });

for (const lang of ['en', 'he'] as Lang[]) {
  test(`teacher assigns a phrase (stub MIDI) → student Today card → locked assignment → a passed key is submitted (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await stubMidi(page);
    await seed(page, lang);
    // the teacher's sheet
    await page.goto(`/?lang=${lang}#/teach/new/demo-class`);
    await expect(page.locator('[data-teach="new"] [data-teach-armed]')).toBeVisible();
    await page.waitForTimeout(400);
    await playPhrase(page);
    await expect(page.locator('[data-teach-caught]')).toBeVisible({ timeout: 8000 });
    await page.locator('[data-teach-keys="home"]').click();
    await page.locator('[data-teach-goal-plus]').click();
    await page.locator('[data-seg="strict"]').click();
    await page.locator('[data-teach-note]').fill(lang === 'he' ? 'שימו לב לתיבה 2' : 'Mind bar 2');
    await shot(page, `teach-sheet-${lang}`);
    await fits(page, `teacher sheet (${lang})`);
    if (lang === 'he') expect(await latinOutsideBdi(page), 'teacher sheet: Latin outside bdi').toEqual([]);
    const bytes = Number(await page.locator('[data-teach="new"]').getAttribute('data-teach-bytes'));
    expect(bytes).toBeGreaterThan(50);
    expect(bytes).toBeLessThan(2000); // fits today's server (the legacy ref) — and the 4 KB sync limit
    await page.locator('[data-teach-assign]').click();
    await expect(page.locator('[data-teach-msg]')).toBeVisible();
    const db = await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockTeacher.db') ?? '{}'));
    expect(db.assignments).toHaveLength(1);
    expect(db.assignments[0].kind).toBe('piece'); // before the migration a phrase travels as a 'piece' with the phrase code
    expect(db.assignments[0].ref.startsWith('phrase1:')).toBe(true);
    expect(db.assignments[0].strictness).toBe('strict');

    // the student: Home fetches the assignment, the phrase goes into the lick book, Today shows the card
    await page.goto(`/?lang=${lang}#/`);
    const card = page.locator('[data-today-teacher]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page.locator('[data-teach="student"]')).toBeVisible();
    await expect(page.locator('[data-locked="goal"]')).toBeVisible();
    await expect(page.locator('[data-locked="keys"]')).toBeVisible();
    await expect(page.locator('[data-teach-progress="0/1"]')).toBeVisible();
    await shot(page, `teach-student-${lang}`);
    await fits(page, `student assignment (${lang})`);
    if (lang === 'he') expect(await latinOutsideBdi(page), 'student page: Latin outside bdi').toEqual([]);

    // a key passed at the target (3 clean takes on 2 days) → one submission with score and tempo
    const c = await page.evaluate(() => JSON.parse(localStorage.getItem('tt.teacherPhrases.v1') ?? '[]')[0]);
    const goal = c.a.plan.goalBpm;
    const itemId = `lick:${c.phraseId}:piano:${c.a.homeKey}`;
    const item = { itemId, family: 'licks', key: c.a.homeKey, hands: 'R', cleanBpm: goal, goalBpm: goal, streak: 0, fails: 0, takes: 5, last: new Date().toISOString(), history: [], ewma: { cv: 0.05, sd: 22, vsd: 0, hands: 0, acc: 0.97 }, passLog: [{ at: '2026-11-10T10:00:00Z', bpm: goal }, { at: '2026-11-11T10:00:00Z', bpm: goal }, { at: '2026-11-11T11:00:00Z', bpm: goal }] };
    await page.goto('/manifest.webmanifest');
    await page.evaluate(
      async ({ itemId, item }) =>
        new Promise((res, rej) => {
          const r = indexedDB.open('toneturn', 1);
          r.onsuccess = () => {
            const tx = r.result.transaction('kv', 'readwrite');
            const st = tx.objectStore('kv');
            const g = st.get('progress');
            g.onsuccess = () => st.put({ ...g.result, drillItems: { ...(g.result.drillItems ?? {}), [itemId]: item } }, 'progress');
            tx.oncomplete = res;
            tx.onerror = rej;
          };
          r.onerror = rej;
        }),
      { itemId, item },
    );
    await page.goto(`/?lang=${lang}#/teach/a/${c.id}`);
    await expect(page.locator('[data-teach-progress="1/1"]')).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockTeacher.db') ?? '{}').submissions?.length ?? 0)), { timeout: 10_000 })
      .toBe(1);
    const sub = await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockTeacher.db') ?? '{}').submissions[0]);
    expect(sub.metrics).toMatchObject({ kind: 'phrase', key: c.a.homeKey, bpm: goal });
    expect(sub.score).toBeGreaterThan(0.9);
    // never twice: a reload sends nothing new
    await page.reload();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tt.mockTeacher.db') ?? '{}').submissions.length)).toBe(1);
  });
}

/** One drill take with the dev-only synthesized input (fakeTake.ts). */
const playOneTake = async (page: Page, lang: Lang) => {
  await page.addInitScript(() => ((window as unknown as { __fakeTake?: string }).__fakeTake = 'clean'));
  await page.goto('about:blank');
  await page.goto(`/?unlock=all&lang=${lang}#/drills`);
  await page.locator('[data-topic="all"]').click();
  await page.locator('[data-family="scales"]').click();
  const card = page.locator('[data-level="scales-1"]');
  await card.scrollIntoViewIfNeeded();
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page.locator('[data-level-start="scales-1"]').click();
  await page.locator('[data-brief-play]').click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator('[data-drills="run"]')).toBeVisible();
  await page.waitForTimeout(100);
  await page.locator('[data-drill-play]').click();
  await expect(page.locator('.drill-result')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
};

test('a playlist plays in the background with Media Session metadata; the player and A/B compare fit 320×720 (en, he)', async ({ page }) => {
  test.setTimeout(240_000);
  await seed(page, 'en');
  await playOneTake(page, 'en');
  await playOneTake(page, 'en');
  await page.goto('/?lang=en#/recordings');
  const rows = page.locator('[data-rec-take]');
  await expect(rows).toHaveCount(2, { timeout: 10_000 });
  await rows.first().locator('[data-rec-open]').click();
  await expect(page.locator('[data-recordings="player"]')).toBeVisible();
  await expect(page.locator('[data-rec-actions2]')).toBeVisible();
  await fits(page, 'player with the v2 actions (en)');

  // add to a new playlist
  await page.locator('[data-rec-addlist]').click();
  await page.locator('[data-rec-newlist-name]').fill('Commute');
  await page.locator('[data-rec-newlist]').click();
  await page.waitForTimeout(700);
  await page.goto('/?lang=en#/recordings/playlists');
  const list = page.locator('[data-rec-playlist]').filter({ hasText: 'Commute' });
  await expect(list).toBeVisible();
  await list.click();
  await expect(page.locator('[data-recordings="playlist"][data-rec-pl-n="1"]')).toBeVisible();
  await page.locator('[data-rec-pl-mode="one"]').click();
  await expect(page.locator('[data-recordings="playlist"][data-rec-pl-loop="one"]')).toBeVisible();
  await page.locator('[data-rec-pl-play]').click();
  await expect(page.locator('[data-rec-now]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (navigator.mediaSession?.metadata ? `${navigator.mediaSession.metadata.artist}|${navigator.mediaSession.metadata.album}` : '')), { timeout: 30_000 })
    .toBe('The 7th Sense|Commute');
  const meta = await page.evaluate(() => ({ title: navigator.mediaSession.metadata!.title, art: navigator.mediaSession.metadata!.artwork.length }));
  expect(meta.title.length).toBeGreaterThan(2);
  expect(meta.art).toBe(1);
  // the MIDI take was rendered to audio for the media element (kept in the cache)
  await expect.poll(() => page.evaluate(() => (document.querySelector('audio[data-bg-player]') as HTMLAudioElement | null)?.src ?? ''), { timeout: 30_000 }).toContain('blob:');
  await shot(page, 'rec-playlist-en');

  // A/B compare of the two takes of the same item
  for (const lang of ['en', 'he'] as Lang[]) {
    await page.goto(`/?lang=${lang}#/recordings`);
    await page.reload();
    await expect(page.locator('[data-rec-take]')).toHaveCount(2, { timeout: 10_000 });
    await page.locator('[data-rec-take]').first().locator('[data-rec-open]').click();
    await expect(page.locator('[data-recordings="player"]')).toBeVisible();
    await page.locator('[data-rec-compare]').click();
    await expect(page.locator('[data-recordings="compare-pick"]')).toBeVisible();
    await page.locator('[data-rec-cmp-pick]').first().click();
    await expect(page.locator('[data-recordings="compare"][data-rec-cmp-method="bars"]')).toBeVisible();
    await expect(page.locator('[data-rec-cmp-roll="A"]')).toBeVisible();
    await expect(page.locator('[data-rec-cmp-delta="tempo"]')).toBeVisible();
    await expect(page.locator('[data-rec-progress]')).toBeVisible();
    await shot(page, `rec-compare-${lang}`);
    await fits(page, `A/B compare (${lang})`);
    if (lang === 'he') expect(await latinOutsideBdi(page), 'compare: Latin outside bdi').toEqual([]);
  }
});
