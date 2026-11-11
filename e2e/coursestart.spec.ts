import { expect, test, type Page } from '@playwright/test';

// How a course starts (docs/SPEC-COURSE-START.md): onboarding → the first course's welcome card ("Where are you?")
// → setup as a musical moment (simulated) → the taste lesson → the measured first win → what next. One phone screen
// per step (390 × 844). Voice runs in the labelled simulator (?sim=1), so settings live in memory for each test.
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('.streak-celebrate'), async () => {
    await page.locator('.streak-celebrate .btn.mega').click();
  });
});

const fits = async (page: Page, what: string) => {
  await page.screenshot({ path: `test-results/cs-${what.replace(/\W+/g, '-')}.png`, fullPage: true });
  const over = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
  expect(over, `${what} fits one phone screen`).toBeLessThanOrEqual(4);
};

/** Onboarding to the end of the course grid, picking one course. */
async function onboard(page: Page, course: string) {
  await page.goto('/?sim=1&welcome=1&lang=en');
  await page.locator('[data-ob="start"]').click();
  await page.locator('[data-ob="listen"]').click();
  await expect(page.locator('[data-ob="taste-0"]')).toBeEnabled({ timeout: 10_000 });
  await page.locator('[data-ob="taste-0"]').click();
  await page.locator('[data-ob="taste-next"]').click();
  await page.locator(`[data-ob="course-${course}"]`).click();
  await page.locator('[data-ob="courses-next"]').click();
}

/** The welcome card: promise, ladder, "Where are you?" — on one screen. */
async function welcome(page: Page, course: string, report: 'new' | 'bit' | 'well') {
  const w = page.locator(`[data-course-start="welcome"][data-cs-course="${course}"]`);
  await expect(w).toBeVisible();
  await expect(w.locator('.cs-ladder li')).toHaveCount(4);
  await fits(page, `${course} welcome`);
  await page.locator(`[data-report="${report}"]`).click();
}

/** Setup: the simulator "plays" a note (or the listening check picks headphones); drums skip the kit wizard. */
async function setup(page: Page, course: string) {
  await expect(page.locator(`[data-course-start="setup"][data-cs-course="${course}"]`)).toBeVisible();
  if (course === 'ear' || course === 'jazz') {
    await fits(page, `${course} setup`);
    await page.locator('[data-setup-play]').click();
    await page.locator('[data-setup-headphones]').click();
  } else if (course === 'drums') {
    await page.locator('[data-setup-skip]').click();
  } else {
    await fits(page, `${course} setup`);
    await page.locator('[data-setup-listen]').click();
    await expect(page.locator('[data-heard]')).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-setup-next]').click();
  }
}

/** A question taste in Buttons mode: answer whatever is offered until the recap (wrong answers move on too). */
async function playLesson(page: Page) {
  // Voice mode asks for consent first: answer with buttons instead.
  await page.getByRole('button', { name: 'Use buttons instead' }).click();
  await expect(page.locator('main.lesson')).toBeVisible({ timeout: 15_000 });
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  // A tap item (keep the beat): tap with the pulse the prompt shows (the simulator has no hands).
  await page.evaluate(() => {
    new MutationObserver(() => {
      const p = document.querySelector('.read-prompt[data-start]') as HTMLElement | null;
      if (!p || p.dataset.done === p.dataset.start) return;
      p.dataset.done = p.dataset.start;
      const start = Number(p.dataset.start);
      const beatMs = 60000 / Number(p.dataset.bpm);
      for (const b of (p.dataset.onsets ?? '').split(',').map(Number)) setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })), Math.max(0, start + b * beatMs - performance.now()));
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-start'], childList: true });
  });
  for (let i = 0; i < 200; i++) {
    if (await page.getByRole('button', { name: 'See your first result' }).isVisible().catch(() => false)) break;
    const ans = page.locator('main.lesson .answer:enabled').first();
    if (await ans.isVisible().catch(() => false)) await ans.click({ timeout: 2000 }).catch(() => {});
    // After a revealed answer the lesson waits for Continue.
    const cont = page.locator('main.lesson').getByRole('button', { name: 'Continue', exact: true });
    if (await cont.isVisible().catch(() => false)) await cont.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  await expect(page.getByRole('button', { name: 'See your first result' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'See your first result' }).click();
}

test.describe('course start', () => {
  test.setTimeout(240_000);

  test('ear: welcome → setup → taste → first win → continue the path; the welcome never comes back', async ({ page }) => {
    await onboard(page, 'ear');
    await welcome(page, 'ear', 'new');
    await setup(page, 'ear');
    await playLesson(page);
    const win = page.locator('[data-course-start="win"]');
    await expect(win).toBeVisible();
    await expect(win.locator('[data-win-line]')).toContainText(/of 6 right first time/);
    await expect(win.locator('[data-win-badge]')).toContainText('First session');
    await fits(page, 'first win');
    // "New" highlights Continue the path; the daily goal and the reminder are one tap away.
    await expect(page.locator('[data-next="path"]')).toHaveClass(/primary/);
    await page.locator('[data-next="daily"]').click();
    await page.locator('[data-goal-xp="20"]').click();
    await page.locator('[data-daily-save]').click();
    await expect(page.locator('[data-next="daily"]')).toContainText('20 XP');
    await page.locator('[data-personal-goal]').click();
    await page.locator('[data-goal="ear-chords"]').click();
    await expect(page.locator('[data-personal-goal]')).toContainText('Your goal');
    await page.locator('[data-next="path"]').click();
    await expect(page.locator('main.path2')).toBeVisible();
    await expect(page.locator('[data-goal-line="ear-chords"]')).toBeVisible();
    await page.locator('.tab[data-tab="home"]').click();
    await expect(page.locator('[data-course-hero]')).toHaveCount(0);
  });

  test('ear "I know it well": the win offers Find my level first', async ({ page }) => {
    await onboard(page, 'ear');
    await welcome(page, 'ear', 'well');
    await setup(page, 'ear');
    await playLesson(page);
    await expect(page.locator('[data-next="level"]')).toHaveClass(/primary/);
    await expect(page.locator('.cs-nexts .cs-next').first()).toHaveAttribute('data-next', 'level');
  });

  for (const course of ['keys', 'guitar', 'drums', 'voice', 'jazz'] as const) {
    test(`${course}: welcome → setup (simulated) → the taste opens; left half-way it waits as "Continue" on Home`, async ({ page }) => {
      await onboard(page, course);
      await welcome(page, course, 'new');
      await setup(page, course);
      if (course === 'voice' || course === 'jazz') {
        await page.getByRole('button', { name: 'Use buttons instead' }).click();
        await expect(page.locator('main.lesson')).toBeVisible({ timeout: 15_000 });
        // Leave half-way: pause, then exit.
        await page.locator('main.lesson header .icon-btn, main.lesson .icon-btn').first().click();
        await page.locator('main.lesson header .icon-btn, main.lesson .icon-btn').first().click();
      } else {
        await expect(page.locator('[data-drills="run"]')).toBeVisible({ timeout: 15_000 });
        await page.locator('[data-drills="run"] .icon-btn').first().click();
      }
      await expect(page.locator('[data-course-start-cta]')).toContainText('Continue:');
    });
  }

  test('keys: abandoning the taste keeps "Continue: <taste>" on Home and Path', async ({ page }) => {
    await onboard(page, 'keys');
    await welcome(page, 'keys', 'bit');
    await setup(page, 'keys');
    await expect(page.locator('[data-drills="run"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-drills="run"] .icon-btn').first().click();
    await expect(page.locator('[data-course-start-cta]')).toContainText('Continue: I–IV–V with both hands');
    await fits(page, 'Home hero');
    await page.locator('.tab[data-tab="path"]').click();
    await expect(page.locator('main.path2 [data-course-start-cta]')).toContainText('Continue');
    await page.locator('main.path2 [data-course-start-cta]').click();
    await expect(page.locator('[data-drills="run"]')).toBeVisible({ timeout: 15_000 });
  });

  test('a second course runs the same flow; setup is skipped when already checked', async ({ page }) => {
    await onboard(page, 'ear');
    await welcome(page, 'ear', 'new');
    await setup(page, 'ear');
    await playLesson(page);
    await page.locator('[data-next="path"]').click();
    // Add jazz: its welcome opens; the listening check was done in ear, so the taste follows the report directly.
    await page.locator('[data-course-chip]:visible').first().click();
    await page.locator('[data-course-add]').click();
    await page.locator('.course-list.add [data-course="jazz"]').click();
    await welcome(page, 'jazz', 'bit');
    await expect(page.locator('main.lesson')).toBeVisible({ timeout: 15_000 });
  });
});
