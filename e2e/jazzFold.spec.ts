import { expect, test } from '@playwright/test';

// SPEC-JAZZ-FOLD (owner 2026-11-19): the Jazz course is folded into the other courses. A player of the old Jazz course
// lands in Ear & theory with jazz focus on, keeps everything, gets a one-time notice, and finds the jazz steps on the
// Ear path and the jazz rows on Practice.
test.describe('the Jazz course folded into Ear (jazz focus)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('an old Jazz-course player lands in Ear with jazz focus and sees jazz steps (he)', async ({ page }) => {
    await page.goto('/manifest.webmanifest');
    await page.evaluate(async () => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 120, applied: [], lessons: {}, history: [{ lessonId: 'practice-log', lessonVersion: 1, sessionId: 'old-jazz', completedAt: now, firstTry: 1, total: 1, xp: 20, missed: [], course: 'jazz' }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = {
        version: 2, uiLang: 'he', inputLang: 'he', outputLang: 'he', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', track: 'hobby',
        intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: ['keys'], priorities: null, motivation: 'learn', minutes: 10, goal: 'jazz', leaveOut: [], packs: [], noSing: false, noMic: false },
        goal: 'jazz', courses: ['ear', 'keys', 'jazz'], activeCourse: 'jazz',
        pathFacts: { steps: { 'topic:swing-ratio:1': { stars: 3, at: now }, 'lesson:jazz-welcome': { stars: 3, at: now } } },
        pathFactsBy: { ear: { steps: { 'lesson:basics-pitch': { stars: 3, at: now } } } },
        courseStart: { jazz: { legacy: true }, ear: { legacy: true }, keys: { legacy: true } },
        openers: { course: { jazz: now, ear: now, keys: now } },
      };
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
    });
    await page.goto('/?unlock#/path');
    // Ear is the active course; the one-time notice says what happened.
    await expect(page.locator('[data-course-chip="ear"]:visible').first()).toBeVisible();
    const note = page.locator('[data-jazz-notice="fold"]');
    await expect(note).toBeVisible();
    await expect(note).toContainText('מיקוד ג׳אז');
    // The path header: jazz focus on (exam prep off), fitting the phone.
    const sw = page.locator('[data-jazz-focus]').first();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(sw).toContainText('מיקוד ג׳אז');
    const box = await sw.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    // Jazz steps on the Ear path (the jazz pack: swing, the blues, guide tones, the jazz lessons, Barry Harris …).
    await expect(page.locator('[data-step^="topic:swing-ratio"], [data-step^="topic:blues-ear"], [data-step^="topic:guide-tones"], [data-step^="lesson:jazz"], [data-step^="topic:bh-"], [data-step^="topic:comping"], [data-step^="licks:jazz"], [data-step^="bonus:jazz"], [data-step^="rep:jazz"]').first()).toBeAttached();
    expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'docs/fresh-shots/jazz-fold-he.png' });
    // No Jazz course in the switcher.
    await page.locator('[data-course-chip]:visible').first().click();
    await expect(page.locator('.course-sheet [data-course="jazz"]')).toHaveCount(0);
    await expect(page.locator('.course-sheet [data-course="keys"]')).toBeVisible();
    await page.locator('.course-sheet [data-course="ear"]').click();
    // Practice: the jazz rows of Ear lead (jazz focus).
    await page.goto('/#/arcade');
    await expect(page.locator('[data-hub="standards"]')).toBeVisible();
    await expect(page.locator('.pt-grid .pt-tile').first()).toHaveAttribute('data-hub', 'standards');
    // Off: the jazz rows stay (a migrated player keeps the jazz pack open), but no longer lead.
    await page.locator('[data-jazz-focus]').first().click();
    await expect(page.locator('[data-jazz-focus]').first()).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.pt-grid .pt-tile').first()).not.toHaveAttribute('data-hub', 'standards');
  });
});
