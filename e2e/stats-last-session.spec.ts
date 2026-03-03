import { test } from '@playwright/test';
import { AppShell } from './helpers/app-shell';

test('renders last session input source metadata in Stats modal from persisted session snapshot', async ({
  page,
}) => {
  const app = new AppShell(page);
  const settings = app.settings();
  const stats = settings.stats();

  await app.seedStorage({
    'fretflow-last-session-stats': {
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
    },
    'fretflow-stats': {
      highScore: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      totalTime: 0,
      noteStats: {},
    },
  });

  await app.goto();
  await settings.open();
  await settings.openTools();
  await stats.openFromTools();
  await stats.expectLastSessionInput(/MIDI: MIDI Keyboard Controller 61/i);
});
