import { expect, test, type Page } from '@playwright/test';

// docs/SPEC-PARTNER-PITCH.md §3.2–3.3: the depth page (live counts, maps, what we measure) in every build, and the
// partner build (VITE_PARTNER=openstudio: piano and guitar only, "your teacher here" frames, the depth card on Home).
// The partner tests run only against a partner server: PARTNER_E2E=openstudio with the app built or served in that
// mode (npx vite --mode openstudio). SHOTS=1 saves screenshots to docs/partner-demo-shots/.
const PARTNER = process.env.PARTNER_E2E ?? '';
const SHOTS = !!process.env.SHOTS;
const build = PARTNER || 'normal';

const SIZES = [
  { name: 'phone', width: 320, height: 720 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function noSideScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
}
const shot = async (page: Page, file: string, fullPage = true) => {
  if (!SHOTS) return;
  // The simulator's test banner is not part of the product.
  await page.addStyleTag({ content: '.sim-banner { display: none !important; }' });
  await page.screenshot({ path: `docs/partner-demo-shots/${file}.png`, fullPage });
};

for (const size of SIZES)
  for (const lang of ['en', 'he'] as const) {
    test.describe(`${build} · ${size.name} · ${lang}`, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      test('the depth page renders with live, non-zero counts', async ({ page }) => {
        await page.goto(`/?sim=1&lang=${lang}#/depth`);
        const root = page.locator('[data-depth]');
        await expect(root).toBeVisible();
        for (const id of ['levels', 'items', 'drills', 'topics', 'lessons', 'keys12', 'instruments', 'cards']) {
          const n = await root.locator(`[data-depth-count="${id}"] b`).innerText();
          expect(Number(n.replace(/[^\d]/g, '')), id).toBeGreaterThan(0);
        }
        for (const m of ['harris', 'siskind', 'reharm', 'voicings', 'ear', 'scales']) await expect(root.locator(`[data-depth-map="${m}"]`)).toBeVisible();
        await expect(root.locator('[data-depth-measure]')).toHaveCount(7);
        await expect(root.locator('[data-depth-fits]')).toHaveCount(PARTNER ? 1 : 0);
        await noSideScroll(page);
        await shot(page, `${build}-depth-${size.name}-${lang}`);
        // A map link opens the drills, and Back returns to the depth page.
        const harris = root.locator('[data-depth-map="harris"]');
        if ((await harris.getAttribute('open')) === null) await harris.locator('summary').click();
        await harris.locator('[data-depth-link^="family:"]').first().click();
        await expect(page.locator('[data-depth]')).toHaveCount(0);
      });

      if (!PARTNER)
        test('Settings links to the depth page', async ({ page }) => {
          await page.goto(`/?sim=1&lang=${lang}#/settings`);
          await page.locator('[data-open-depth]').first().click();
          await expect(page.locator('[data-depth]')).toBeVisible();
          await expect(page.locator('[data-teacher-frame]')).toHaveCount(0);
        });

      if (PARTNER)
        test('the partner build shows only keys and guitar, and the placeholder teacher', async ({ page }) => {
          await page.goto(`/?sim=1&welcome=1&lang=${lang}`);
          await expect(page.locator('html')).toHaveAttribute('data-partner', PARTNER);
          await expect(page.locator('[data-onboarding="welcome"]')).toBeVisible();
          await expect(page.locator('[data-onboarding="welcome"] [data-teacher-frame]')).toBeVisible();
          await expect(page.locator('.toni')).toHaveCount(0);
          await noSideScroll(page);
          await shot(page, `${build}-welcome-${size.name}-${lang}`, false);
          await page.locator('[data-ob="start"]').click();
          await page.locator('.ob-skip').click();
          await expect(page.locator('[data-onboarding="courses"]')).toBeVisible();
          const offered = await page.locator('[data-ob^="course-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-ob')));
          expect(offered).toEqual(['course-keys', 'course-guitar']);
          await shot(page, `${build}-courses-${size.name}-${lang}`, false);

          // Home: the course switcher offers only keys and guitar; the depth card leads to the depth page.
          await page.goto(`/?sim=1&lang=${lang}`);
          await expect(page.locator('[data-depth-card]')).toBeVisible();
          // The stored default course (Ear) moved to the build's first course: nothing on Home is the Ear course.
          await expect(page.locator('[data-course-chip]:visible').first()).toHaveAttribute('data-course-chip', /^(keys|guitar)$/);
          await expect(page.getByText(/Ear & theory|שמיעה ותיאוריה/)).toHaveCount(0);
          await shot(page, `${build}-home-${size.name}-${lang}`, false);
          await page.locator('[data-course-chip]:visible').first().click();
          const mine = await page.locator('.course-sheet [data-course]').evaluateAll((els) => els.map((e) => e.getAttribute('data-course')));
          expect(mine.every((c) => c === 'keys' || c === 'guitar')).toBe(true);
          if (await page.locator('[data-course-add]').count()) {
            await page.locator('[data-course-add]').click();
            const all = await page.locator('.course-sheet [data-course]').evaluateAll((els) => els.map((e) => e.getAttribute('data-course')));
            expect(new Set(all)).toEqual(new Set(['keys', 'guitar']));
          }
          await page.keyboard.press('Escape');
          await page.goto(`/?sim=1&lang=${lang}`);
          await page.locator('[data-depth-card]').click();
          await expect(page.locator('[data-depth-mascots] [data-teacher-frame]')).toHaveCount(12);
          await expect(page.locator('[data-depth-inst="voice"]')).toContainText(/also built|בנוי גם/);
        });
    });
  }
