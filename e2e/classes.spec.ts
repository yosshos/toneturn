import { expect, test } from '@playwright/test';

test('Class screen from the menu asks to sign in when signed out', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /menu/i }).first().click();
  await page.getByRole('button', { name: /Class/ }).click();
  await expect(page.getByRole('heading', { name: 'Class' })).toBeVisible();
  await expect(page.getByText('Sign in to join or teach a class.')).toBeVisible();
});
