import { expect, test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';

test('loads main UI and opens Settings + Stats modals', async ({ page }) => {
  const app = new AppShell(page);
  const settings = app.settings();
  const stats = settings.stats();
  const inputDetection = settings.inputDetection();

  await app.seedStorage({
    'fretboardTrainer.onboardingCompleted.v1': '1',
  });
  await app.goto();
  await app.expectLoaded();
  await app.switchWorkflow('learn-notes');
  await page.locator('#showStringToggles').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await app.switchWorkflow('practice');
  await expect(page.locator('#sessionToolsPlanSection')).toBeHidden();
  await expect(page.locator('#fretboard-string-selector')).toBeHidden();
  await app.switchWorkflow('library');
  await app.expectLibraryMelodyActions();
  await app.switchWorkflow('editor');
  await app.expectEditorMelodyActions();

  await settings.open();
  await settings.openInputDetection();
  const midiOptionDisabled = await inputDetection.isMidiDisabled();

  if (midiOptionDisabled) {
    await inputDetection.expectMicrophoneState();
  } else {
    await inputDetection.switchToMidi();
    await inputDetection.expectMidiState();

    await inputDetection.switchToMicrophone();
    await inputDetection.expectMicrophoneState();
  }

  await settings.backToSections();
  await settings.openTools();
  await stats.openFromTools();
  await stats.expectBaseActionsVisible();
});

test('persists Learn Notes string buttons visibility across reload', async ({ page }) => {
  const app = new AppShell(page);
  const stringButtons = page.locator('.fretboard-string-toggle-label');

  await app.seedStorage({
    'fretboardTrainer.onboardingCompleted.v1': '1',
  });
  await app.goto();
  await app.expectLoaded();
  await app.switchWorkflow('learn-notes');
  await app.selectTrainingMode('random');
  await expect(page.locator('#trainingMode')).toHaveValue('random');
  await page.locator('#layoutToggleBtn').click();
  await expect(page.locator('#showStringToggles')).toBeVisible();
  await page.locator('#showStringToggles').setChecked(true);

  await expect(stringButtons.first()).toBeVisible();

  await page.reload();
  await app.waitForAppReady();
  await app.expectLoaded();

  await expect(page.locator('#workflowLearnNotesBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#trainingMode')).toHaveValue('random');
  await expect(stringButtons.first()).toBeVisible();
  await page.locator('#layoutToggleBtn').click();
  await expect(page.locator('#showStringToggles')).toBeVisible();
  await expect(page.locator('#showStringToggles')).toBeChecked();
});


