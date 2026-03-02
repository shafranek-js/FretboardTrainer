import { expect, test } from '@playwright/test';

test('hydrates built-in melody source tempo into the shared bpm slider and preserves per-melody overrides', async ({
  page,
}) => {
  await page.goto('/');

  await page.locator('#trainingMode').selectOption('performance');

  await page.locator('#melodySelector').selectOption('builtin:guitar:ode_to_joy_intro');
  await expect(page.locator('#melodyDemoBpm')).toHaveValue('92');
  await expect(page.locator('#melodyDemoBpmValue')).toHaveText('92');

  await page.locator('#melodyDemoBpm').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '126';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#melodyDemoBpmValue')).toHaveText('126');

  await page.locator('#melodySelector').selectOption('builtin:guitar:twinkle_phrase');
  await expect(page.locator('#melodyDemoBpm')).toHaveValue('100');

  await page.locator('#melodySelector').selectOption('builtin:guitar:ode_to_joy_intro');
  await expect(page.locator('#melodyDemoBpm')).toHaveValue('126');
});
