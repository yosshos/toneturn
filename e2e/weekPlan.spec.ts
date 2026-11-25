import { expect, test } from '@playwright/test';

// SPEC-WEEK-PLAN-TILT §1 (owner 2026-11-25): the teacher saves the class's assignments as a weekly plan, edits it, and
// sends it to the class from a start day; the duplicate guard asks before sending the same plan for the same day.
// The dev teacher mock (tt.mockTeacher = 1) stands in for the server.
test.describe.configure({ timeout: 120_000 });

for (const lang of ['en', 'he'] as const)
  test(`teacher weekly plan: save, edit, send, guard (${lang})`, async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('tt.seeded')) return;
      sessionStorage.setItem('tt.seeded', '1');
      localStorage.setItem('tt.mockTeacher', '1');
      const now = Date.now();
      const iso = (d: number) => new Date(now + d * 86400000).toISOString();
      const row = (id: string, kind: string, ref: string | null, due: number | null, lesson = kind) => ({ id, class: 'Demo', kind, lesson_id: lesson, ref, due_on: due === null ? null : iso(due).slice(0, 10), strictness: 'moderate', target_bpm: null, note: null, created_at: iso(-1 + Number(id.slice(1)) / 100) });
      localStorage.setItem('tt.mockTeacher.db', JSON.stringify({ assignments: [row('a1', 'piece', 'Autumn Leaves, bars 1–8', 3), row('a2', 'piece', 'Blue Bossa head', null), row('a3', 'piece', 'C major scale, two octaves', 1)], submissions: [] }));
    });
    await page.goto(`/?lang=${lang}#/classes`);
    const card = page.locator('[data-week-plans="demo-class"]');
    await expect(card).toBeVisible({ timeout: 20_000 });
    // save: all three checked; drop one
    await card.locator('[data-wp-save-open]').click();
    await card.locator('[data-wp-name]').fill('Week 1');
    await card.locator('[data-wp-pick="a2"]').uncheck();
    await card.locator('[data-wp-save-go]').click();
    // the send form opens on the new plan, two items in the preview
    await expect(card.locator('[data-wp-preview] li')).toHaveCount(2);
    // edit: move the second up, rename
    await card.locator('[data-wp-edit-open]').click();
    await card.locator('[data-wp-up="1"]').click();
    await card.locator('[data-wp-rename]').fill('Week one');
    await card.locator('[data-wp-edit-done]').click();
    await expect(card.locator('[data-wp-plan]')).toContainText('Week one');
    await expect(card.locator('[data-wp-preview] li').first()).toContainText('C major');
    // send
    const before = await page.locator('.assign-list li').count();
    await card.locator('[data-wp-send-go]').click();
    await expect(card.locator('[data-wp-result="ok"]')).toBeVisible();
    await expect(page.locator('.assign-list li')).toHaveCount(before + 2);
    // the same plan, same day: asks first
    await card.locator('[data-wp-send-go]').click();
    await expect(card.locator('[data-wp-again]')).toBeVisible();
    await page.screenshot({ path: `test-results/week-plan-${lang}.png`, fullPage: true });
    // the plan is kept in settings (reload: still there)
    await page.reload();
    await page.locator('[data-week-plans="demo-class"] [data-wp-send-open]').click();
    await expect(page.locator('[data-wp-plan]')).toContainText('Week one');
    const w = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    expect(w).toBe(true);
  });

test('teacher weekly plan: an item that fails stays waiting (through an edit and a reload); only it is offered again', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('tt.seeded')) return;
    sessionStorage.setItem('tt.seeded', '1');
    localStorage.setItem('tt.mockTeacher', '1');
    const now = Date.now();
    const iso = (d: number) => new Date(now + d * 86400000).toISOString();
    // the mock refuses a non-phrase ref over 2000 characters: that item fails on every send
    const row = (id: string, ref: string, k: number) => ({ id, class: 'Demo', kind: 'piece', lesson_id: 'piece', ref, due_on: iso(2).slice(0, 10), strictness: 'moderate', target_bpm: null, note: null, created_at: iso(-1 + k / 100) });
    localStorage.setItem('tt.mockTeacher.db', JSON.stringify({ assignments: [row('a1', 'Autumn Leaves', 1), row('a2', 'x'.repeat(2100), 2), row('a3', 'Blue Bossa', 3)], submissions: [] }));
  });
  await page.goto('/?lang=en#/classes');
  const card = page.locator('[data-week-plans="demo-class"]');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.locator('[data-wp-save-open]').click();
  await card.locator('[data-wp-name]').fill('Fails once');
  await card.locator('[data-wp-save-go]').click();
  const before = await page.locator('.assign-list li').count();
  await card.locator('[data-wp-send-go]').click();
  await expect(card.locator('[data-wp-pending="1"]')).toBeVisible();
  await expect(page.locator('.assign-list li')).toHaveCount(before + 2);
  // an edit (move an item) does not change what is waiting
  await card.locator('[data-wp-edit-open]').click();
  await card.locator('[data-wp-up="2"]').click();
  await card.locator('[data-wp-edit-done]').click();
  await expect(card.locator('[data-wp-pending="1"]')).toBeVisible();
  // a reload keeps it; the retry sends only the waiting one (it fails again here: still one waiting, nothing new)
  await page.reload();
  await page.locator('[data-week-plans="demo-class"] [data-wp-send-open]').click();
  await expect(page.locator('[data-wp-pending="1"]')).toBeVisible();
  const mid = await page.locator('.assign-list li').count();
  await page.locator('[data-wp-retry]').click();
  await expect(page.locator('[data-wp-pending="1"]')).toBeVisible();
  await expect(page.locator('.assign-list li')).toHaveCount(mid);
  // sending the whole plan again for the same day asks first
  await page.locator('[data-wp-send-go]').click();
  await expect(page.locator('[data-wp-again]')).toBeVisible();
  // the waiting item is named on the class card and can be discarded
  await expect(page.locator('[data-wp-pending-item]')).toHaveCount(1);
  await page.locator('[data-wp-discard]').click();
  await expect(page.locator('[data-wp-waiting]')).toHaveCount(0);
});
