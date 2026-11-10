import { expect, test } from '@playwright/test';
import { switchCourse } from './practice';

// 0.67 (owner 2026-11-10): "Exams" is no longer a course — it is the Ear course's exam-prep mode. The switch sits on
// the Ear course's Practice and Path headers; on, Practice leads with the mock exams and Today shows an exam card.
test.describe('exam prep mode', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no Exams course; the switch on Practice and Path reorders Practice', async ({ page }) => {
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-practice-hub]')).toBeVisible();
    // Not a course any more: not among mine, not under "New course".
    await page.locator('[data-course-chip]:visible').first().click();
    await page.locator('[data-course-add]').click();
    await expect(page.locator('[data-course="exam"]')).toHaveCount(0);
    await expect(page.locator('[data-course="jazz"]')).toBeVisible();
    // Picking the active course closes the sheet.
    await page.locator('[data-course="ear"]').click();
    await expect(page.locator('.course-sheet')).toHaveCount(0);

    // Off: the ear rows, no mock exams.
    const sw = page.locator('[data-exam-prep]');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('[data-hub="exams"]')).toHaveCount(0);
    // On: the mock exams lead the course's tiles.
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.pt-grid .pt-tile').first()).toHaveAttribute('data-hub', 'exams');
    const box = await page.locator('[data-exam-prep]').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await page.locator('[data-hub="exams"]').click();
    await expect(page.locator('[data-exams]')).toBeVisible();

    // The path header carries the same switch, already on; it fits beside the count.
    await page.goto('/?sim=1#/path');
    const ps = page.locator('.path-head [data-exam-prep]');
    await expect(ps).toHaveAttribute('aria-checked', 'true');
    const pb = await ps.boundingBox();
    expect(pb!.x + pb!.width).toBeLessThanOrEqual(390);

    // Another course has no switch; back in Ear it is still on.
    await switchCourse(page, 'voice');
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-exam-prep]')).toHaveCount(0);
    await page.goto('/?sim=1#/');
    await expect(page.locator('[data-today-exam]')).toHaveCount(0);
    await switchCourse(page, 'ear');
    await page.goto('/?sim=1#/arcade');
    await expect(page.locator('[data-exam-prep]')).toHaveAttribute('aria-checked', 'true');
    // Off again: the ear rows come back.
    await page.locator('[data-exam-prep]').click();
    await expect(page.locator('[data-hub="exams"]')).toHaveCount(0);
  });

  test('a player of the old Exams course: Ear with exam prep on, nothing lost, the Today card', async ({ page }) => {
    // Old data (0.66): the Exams course active, voice parked, a finished step and a result recorded in Exams.
    await page.goto('/manifest.webmanifest');
    await page.evaluate(async () => {
      const now = new Date().toISOString();
      const progress = { version: 1, xp: 30, applied: [], lessons: { 'intervals-1': { best: 3, completions: 1, lastAt: now } }, history: [{ lessonId: 'intervals-1', lessonVersion: 1, sessionId: 'old-exam', completedAt: now, firstTry: 3, total: 3, xp: 30, missed: [], course: 'exam' }], streak: { count: 1, lastDay: now.slice(0, 10) }, review: [] };
      const settings = { version: 2, uiLang: 'en', inputLang: 'en', outputLang: 'en', mode: 'buttons', voiceConsent: true, seenVersion: '9.9.9', intake: { v: 1, at: now, music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities: null, motivation: 'learn', minutes: 10, goal: 'exam', leaveOut: [], packs: [], noSing: false, noMic: false }, goal: 'exam', courses: ['exam', 'voice'], activeCourse: 'exam', pathFacts: { steps: { 'lesson:intervals-1': { stars: 3, at: now } } } };
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
    await page.goto('/#/');
    await expect(page.locator('[data-course-chip="ear"]:visible').first()).toBeVisible();
    await expect(page.locator('[data-today-exam]')).toBeVisible();
    await expect(page.locator('[data-today-mock]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // My courses: Ear and Singing, no Exams.
    await page.locator('[data-course-chip]:visible').first().click();
    await expect(page.locator('.course-list:not(.add) [data-course]')).toHaveCount(2);
    await expect(page.locator('[data-course="exam"]')).toHaveCount(0);
    await page.locator('[data-course="ear"]').click();
    // Practice: exam prep is on, the mock exams lead; the path keeps the finished step.
    await page.goto('/#/arcade');
    await expect(page.locator('[data-exam-prep]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.pt-grid .pt-tile').first()).toHaveAttribute('data-hub', 'exams');
    await page.goto('/#/path');
    await expect(page.locator('.path-head [data-exam-prep]')).toHaveAttribute('aria-checked', 'true');
  });
});
