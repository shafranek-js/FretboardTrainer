import { expect, test } from '@playwright/test';

test('renders last session input source metadata in Stats modal from persisted session snapshot', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'fretflow-last-session-stats',
      JSON.stringify({
        modeKey: 'random',
        modeLabel: 'Find the Note',
        startedAtMs: Date.now() - 25_000,
        endedAtMs: Date.now(),
        instrumentName: 'guitar',
        tuningPresetKey: 'standard',
        inputSource: 'midi',
        inputDeviceLabel: 'MIDI Keyboard Controller 61',
        stringOrder: ['e', 'B', 'G', 'D', 'A', 'E'],
        enabledStrings: ['e', 'B', 'G', 'D', 'A', 'E'],
        minFret: 0,
        maxFret: 12,
        totalAttempts: 12,
        correctAttempts: 9,
        totalTime: 12.5,
        currentCorrectStreak: 0,
        bestCorrectStreak: 4,
        noteStats: {
          'C-G': { attempts: 4, correct: 3, totalTime: 3.2 },
        },
        targetZoneStats: {
          'G:5': { attempts: 4, correct: 3, totalTime: 3.2 },
        },
        rhythmStats: {
          totalJudged: 0,
          onBeat: 0,
          early: 0,
          late: 0,
          totalAbsOffsetMs: 0,
          bestAbsOffsetMs: null,
        },
      })
    );
    localStorage.setItem(
      'fretflow-stats',
      JSON.stringify({
        highScore: 0,
        totalAttempts: 0,
        correctAttempts: 0,
        totalTime: 0,
        noteStats: {},
      })
    );
  });

  await page.goto('/');
  await page.locator('#settingsBtn').click();
  await page.locator('#openStatsBtn').click();

  await expect(page.locator('#statsLastSessionSection')).toBeVisible();
  await expect(page.locator('#statsLastSessionInput')).toBeVisible();
  await expect(page.locator('#statsLastSessionInput')).toHaveText(/MIDI: MIDI Keyboard Controller 61/i);
  await expect(page.locator('#statsLastSessionInput')).toHaveAttribute(
    'title',
    /MIDI: MIDI Keyboard Controller 61/i
  );
});
