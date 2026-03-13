import { expect, test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';

const CUSTOM_MELODIES_KEY = 'fretboardTrainer.customMelodies.v1';

const practiceFeedbackMelody = [
  {
    id: 'custom:test:timeline-practice',
    name: 'Timeline Practice Feedback',
    instrumentName: 'guitar',
    format: 'events',
    sourceFormat: 'midi',
    createdAtMs: 1,
    events: [
      { barIndex: 0, column: 0, durationBeats: 0.5, notes: [{ note: 'E', stringName: 'e', fret: 0 }] },
      { barIndex: 0, column: 1, durationBeats: 0.5, notes: [{ note: 'F', stringName: 'e', fret: 1 }] },
      { barIndex: 0, column: 2, durationBeats: 0.5, notes: [{ note: 'G', stringName: 'e', fret: 3 }] },
    ],
  },
];

const performFeedbackMelody = [
  {
    id: 'custom:test:timeline-perform',
    name: 'Timeline Perform Feedback',
    instrumentName: 'guitar',
    format: 'events',
    sourceFormat: 'midi',
    createdAtMs: 1,
    events: Array.from({ length: 6 }, (_, index) => ({
      barIndex: 0,
      column: index,
      durationBeats: 1,
      notes: [{ note: 'E', stringName: 'e', fret: index < 2 ? 0 : index < 4 ? 1 : 3 }],
    })),
  },
];

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

test('Practice session paints timeline feedback for missed notes', async ({ page }) => {
  test.setTimeout(40_000);
  const app = new AppShell(page);

  await app.seedStorage({
    'fretboardTrainer.onboardingCompleted.v1': '1',
    [CUSTOM_MELODIES_KEY]: practiceFeedbackMelody,
  });
  await app.goto();
  await page.waitForFunction(
    () => (document.getElementById('melodySelector') as HTMLSelectElement | null)?.options.length > 0
  );

  await app.switchWorkflow('practice');
  await page.locator('#melodySelector').selectOption('custom:test:timeline-practice');
  await page.locator('#sessionToggleBtn').click();
  await page.waitForTimeout(8_000);

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const [{ state }] = await Promise.all([import('/src/state.ts')]);
        return Object.keys(state.performanceTimelineFeedbackByEvent).length;
      })
    )
    .toBeGreaterThan(0);

  await expect
    .poll(async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-feedback-tone]')).map((element) =>
          element.getAttribute('data-feedback-tone')
        )
      )
    )
    .toContain('missed');
});

test('Perform session paints timeline feedback during an active run', async ({ page }) => {
  test.setTimeout(40_000);
  const app = new AppShell(page);

  await app.seedStorage({
    'fretboardTrainer.onboardingCompleted.v1': '1',
    [CUSTOM_MELODIES_KEY]: performFeedbackMelody,
  });
  await app.goto();
  await page.waitForFunction(
    () => (document.getElementById('melodySelector') as HTMLSelectElement | null)?.options.length > 0
  );

  await app.switchWorkflow('perform');
  await page.locator('#melodySelector').selectOption('custom:test:timeline-perform');
  await page.locator('#melodyDemoBpm').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#sessionToggleBtn').click();
  await page.waitForTimeout(5_500);

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const [{ state }] = await Promise.all([import('/src/state.ts')]);
        return Object.keys(state.performanceTimelineFeedbackByEvent).length;
      })
    )
    .toBeGreaterThan(0);

  await expect
    .poll(async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-feedback-tone]'))
          .map((element) => element.getAttribute('data-feedback-tone'))
          .filter((tone): tone is string => Boolean(tone))
      )
    )
    .toContainEqual(expect.stringMatching(/^(wrong|missed)$/));
});
