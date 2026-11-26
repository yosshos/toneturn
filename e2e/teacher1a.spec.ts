import { expect, test } from '@playwright/test';

// SPEC-TEACHER-CLASS phase 1a on the dev teacher mock (one demo class; this device is the teacher and the student "Me"):
// send to one student, the student sees "just for you", edit it, the teacher's private note, archive.
test('teacher 1a: one student, edit, private note, archive', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tt.mockTeacher', '1');
    sessionStorage.setItem('toneturn.friendsTab', 'class');
  });
  await page.goto('/?unlock=all&lang=he&demoFriends=1#/friends');
  const card = page.locator('.class-card.teacher').first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.locator('[data-new-code]')).toBeVisible();

  // the private note on a student
  await card.locator('[data-student-row="s1"]').click();
  await card.locator('[data-student-dow]').selectOption('2');
  await card.locator('[data-student-note]').fill('יד שמאל חלשה');
  await card.locator('[data-student-note-save]').click();
  await expect(card.locator('[data-student-row="s1"]')).toContainText('שלישי');

  // send to "Me" only
  const form = card.locator('[data-assign-form]').last();
  await form.locator('[data-assign-to]').selectOption('me');
  await form.locator('[data-assign-go]').click();
  const row = card.locator('[data-teacher-assignment]').first();
  await expect(row).toContainText('ל־');
  // the student's own list (this device is also the student): read again on the next visit
  await page.reload();
  await expect(page.locator('[data-my-assignments] [data-personal]').first()).toBeVisible({ timeout: 20_000 });

  // edit: a note
  await expect(row).toBeVisible();
  await row.locator('[data-edit-assignment]').click();
  await row.locator('[data-edit-form] input[aria-label="הערה"]').fill('לאט ונקי');
  await row.locator('[data-edit-save]').click();
  await expect(row).toContainText('עודכן');
  await page.screenshot({ path: 'test-results/teacher-1a-he.png', fullPage: true });

  // archive: it leaves the live list and the student's list
  await row.locator('[data-archive-assignment]').click();
  await expect(card.locator('.ta-archived')).toBeVisible();
});
