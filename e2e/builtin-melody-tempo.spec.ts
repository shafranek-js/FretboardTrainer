import { test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';

test('hydrates built-in melody source tempo into the shared bpm slider and preserves per-melody overrides', async ({
  page,
}) => {
  const app = new AppShell(page);
  const melodyTempo = app.melodyTempo();

  await app.goto();
  await app.selectTrainingMode('performance');

  await melodyTempo.selectMelody('builtin:guitar:ode_to_joy_intro');
  await melodyTempo.expectTempo(140);

  await melodyTempo.setTempo(126);

  await melodyTempo.selectMelody('builtin:guitar:twinkle_phrase');
  await melodyTempo.expectTempo(100);

  await melodyTempo.selectMelody('builtin:guitar:ode_to_joy_intro');
  await melodyTempo.expectTempo(126);
});
