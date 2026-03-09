import { test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';
import {
  BUILTIN_MELODY_STORAGE_KEY,
  BUILTIN_MIDI_LIBRARY_SYNC_KEY,
} from '../src/app-storage-keys';

test('hydrates built-in melody source tempo into the shared bpm slider and preserves per-melody overrides', async ({
  page,
}) => {
  const app = new AppShell(page);
  const melodyTempo = app.melodyTempo();
  const now = Date.now();
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort());

  await app.seedStorage({
    [BUILTIN_MELODY_STORAGE_KEY]: [
      {
        id: 'builtin:guitar:ode_to_joy_intro',
        name: 'Ode to Joy Intro',
        instrumentName: 'guitar',
        sourceFormat: 'midi',
        sourceTempoBpm: 140,
        sourceTimeSignature: '4/4',
        updatedAtMs: now,
        events: [
          {
            durationBeats: 1,
            notes: [{ note: 'E4', stringName: 'e', fret: 0 }],
          },
        ],
      },
      {
        id: 'builtin:guitar:twinkle_phrase',
        name: 'Twinkle Phrase',
        instrumentName: 'guitar',
        sourceFormat: 'midi',
        sourceTempoBpm: 100,
        sourceTimeSignature: '4/4',
        updatedAtMs: now,
        events: [
          {
            durationBeats: 1,
            notes: [{ note: 'G4', stringName: 'e', fret: 3 }],
          },
        ],
      },
    ],
    [BUILTIN_MIDI_LIBRARY_SYNC_KEY]: 'e2e-seeded',
  });

  await app.goto();
  await app.switchWorkflow('perform');
  await page.locator('#melodySelector option[value="builtin:guitar:ode_to_joy_intro"]').waitFor({
    state: 'attached',
  });
  await page.locator('#melodySelector option[value="builtin:guitar:twinkle_phrase"]').waitFor({
    state: 'attached',
  });

  await melodyTempo.selectMelody('builtin:guitar:ode_to_joy_intro');
  await melodyTempo.expectTempo(140);

  await melodyTempo.setTempo(126);

  await melodyTempo.selectMelody('builtin:guitar:twinkle_phrase');
  await melodyTempo.expectTempo(100);

  await melodyTempo.selectMelody('builtin:guitar:ode_to_joy_intro');
  await melodyTempo.expectTempo(126);
});

