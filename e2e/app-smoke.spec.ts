import { expect, test } from '@playwright/test';

test('loads main UI and opens Settings + Stats modals', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/FretFlow/i);
  await expect(page.locator('#sessionToggleBtn')).toBeVisible();
  await expect(page.locator('#sessionToggleBtn')).toHaveText(/Start Session/i);
  await expect(page.locator('#statusBar')).toHaveText(/Ready/i);
  await expect(page.locator('#inputStatusBar')).toContainText(/Mic:/i);

  await expect(page.locator('#trainingMode')).toBeVisible();
  await expect(page.locator('#practiceSetupToggleBtn')).toBeVisible();

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Settings & Tools/i })).toBeVisible();
  await expect(page.locator('#audioInputDevice')).toBeVisible();
  await expect(page.locator('#inputSource')).toBeVisible();
  const midiOptionDisabled = await page.evaluate(() => {
    const select = document.getElementById('inputSource') as HTMLSelectElement | null;
    const midiOption = [...(select?.options ?? [])].find((option) => option.value === 'midi');
    return Boolean(midiOption?.disabled);
  });

  if (midiOptionDisabled) {
    await expect(page.locator('#inputSource')).toHaveValue('microphone');
    await expect(page.locator('#midiInputRow')).toBeHidden();
    await expect(page.locator('#audioInputRow')).toBeVisible();
    await expect(page.locator('#midiConnectionStatus')).toBeHidden();
    await expect(page.locator('#inputStatusBar')).toContainText(/Mic:/i);
  } else {
    await page.locator('#inputSource').selectOption('midi');
    await expect(page.locator('#midiInputRow')).toBeVisible();
    await expect(page.locator('#audioInputRow')).toBeHidden();
    await expect(page.locator('#midiConnectionStatus')).toBeVisible();
    await expect(page.locator('#midiConnectionStatus')).toContainText(/MIDI Connection:/i);
    await expect(page.locator('#inputStatusBar')).toContainText(/MIDI:/i);

    await page.locator('#inputSource').selectOption('microphone');
    await expect(page.locator('#midiInputRow')).toBeHidden();
    await expect(page.locator('#audioInputRow')).toBeVisible();
    await expect(page.locator('#midiConnectionStatus')).toBeHidden();
    await expect(page.locator('#inputStatusBar')).toContainText(/Mic:/i);
  }

  await page.locator('#openStatsBtn').click();
  await expect(page.locator('#statsModal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /My Statistics/i })).toBeVisible();
  await expect(page.locator('#repeatLastSessionBtn')).toBeVisible();
  await expect(page.locator('#practiceWeakSpotsBtn')).toBeVisible();
  await expect(page.locator('#resetStatsBtn')).toBeVisible();
});
