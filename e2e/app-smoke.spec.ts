import { expect, test } from '@playwright/test';

test('loads main UI and opens Settings + Stats modals', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/FretFlow/i);
  await expect(page.locator('#sessionToggleBtn')).toBeVisible();
  await expect(page.locator('#sessionToggleBtn')).toHaveText(/Start Session/i);
  await expect(page.locator('#statusBar')).toHaveText(/Ready/i);

  await expect(page.locator('#trainingMode')).toBeVisible();
  await expect(page.locator('#practiceSetupToggleBtn')).toBeVisible();

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Settings & Tools/i })).toBeVisible();
  await expect(page.locator('#audioInputDevice')).toBeVisible();

  await page.locator('#openStatsBtn').click();
  await expect(page.locator('#statsModal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /My Statistics/i })).toBeVisible();
  await expect(page.locator('#repeatLastSessionBtn')).toBeVisible();
  await expect(page.locator('#practiceWeakSpotsBtn')).toBeVisible();
  await expect(page.locator('#resetStatsBtn')).toBeVisible();
});
