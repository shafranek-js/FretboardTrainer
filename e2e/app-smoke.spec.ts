import { test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';

test('loads main UI and opens Settings + Stats modals', async ({ page }) => {
  const app = new AppShell(page);
  const settings = app.settings();
  const stats = settings.stats();
  const inputDetection = settings.inputDetection();

  await app.goto();
  await app.expectLoaded();

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
