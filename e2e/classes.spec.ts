import { expect, test } from '@playwright/test';
import { cloudConfigured, NO_CLOUD } from './cloud';

// Class lives in the Community tab (0.45); signed out, its own route still asks to sign in.
test('Class screen asks to sign in when signed out', async ({ page }) => {
  test.skip(!cloudConfigured(), NO_CLOUD);
  await page.goto('/#/classes');
  await expect(page.getByRole('heading', { name: 'Class' })).toBeVisible();
  await expect(page.getByText('Sign in to join or teach a class.')).toBeVisible();
});
