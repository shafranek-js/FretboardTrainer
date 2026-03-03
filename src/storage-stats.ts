import { dom, state } from './state';
import type { RhythmSessionStats, SessionStats } from './types';
import { LAST_SESSION_STATS_KEY, STATS_KEY } from './app-storage-keys';
import { createDefaultRhythmSessionStats } from './storage-profiles';
import {
  readStorageJson,
  removeStorageValue,
  writeStorageJson,
} from './storage-schema';

export function saveStats() {
  writeStorageJson(localStorage, STATS_KEY, state.stats);
}

export function saveLastSessionStats() {
  if (!state.lastSessionStats) {
    removeStorageValue(localStorage, LAST_SESSION_STATS_KEY);
    return;
  }
  writeStorageJson(localStorage, LAST_SESSION_STATS_KEY, state.lastSessionStats);
}

export function loadStats() {
  state.lastSessionStats = null;
  const loadedStats = readStorageJson(
    localStorage,
    STATS_KEY,
    (value): value is typeof state.stats =>
      !!value &&
      typeof value === 'object' &&
      typeof (value as { highScore?: unknown }).highScore === 'number' &&
      typeof (value as { noteStats?: unknown }).noteStats === 'object',
    state.stats,
    (error) => {
      console.error('Failed to load stats:', error);
      resetStats();
    }
  );
  state.stats = loadedStats;

  const loadedLastSession = readStorageJson(
    localStorage,
    LAST_SESSION_STATS_KEY,
    (value): value is Partial<SessionStats> =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { modeKey?: unknown }).modeKey === 'string' &&
      typeof (value as { modeLabel?: unknown }).modeLabel === 'string' &&
      typeof (value as { startedAtMs?: unknown }).startedAtMs === 'number' &&
      typeof (value as { totalAttempts?: unknown }).totalAttempts === 'number' &&
      typeof (value as { correctAttempts?: unknown }).correctAttempts === 'number' &&
      typeof (value as { totalTime?: unknown }).totalTime === 'number' &&
      typeof (value as { noteStats?: unknown }).noteStats === 'object' &&
      typeof (value as { targetZoneStats?: unknown }).targetZoneStats === 'object',
    null,
    (error) => {
      console.error('Failed to load last session stats:', error);
      removeStorageValue(localStorage, LAST_SESSION_STATS_KEY);
    }
  );

  if (loadedLastSession) {
    state.lastSessionStats = {
      ...(loadedLastSession as SessionStats),
      inputSource: loadedLastSession.inputSource === 'midi' ? 'midi' : 'microphone',
      inputDeviceLabel:
        typeof loadedLastSession.inputDeviceLabel === 'string' ? loadedLastSession.inputDeviceLabel : '',
      tuningPresetKey:
        typeof loadedLastSession.tuningPresetKey === 'string' ? loadedLastSession.tuningPresetKey : '',
      currentCorrectStreak:
        typeof loadedLastSession.currentCorrectStreak === 'number'
          ? loadedLastSession.currentCorrectStreak
          : 0,
      bestCorrectStreak:
        typeof loadedLastSession.bestCorrectStreak === 'number'
          ? loadedLastSession.bestCorrectStreak
          : 0,
      rhythmStats:
        loadedLastSession.rhythmStats &&
        typeof loadedLastSession.rhythmStats === 'object' &&
        typeof (loadedLastSession.rhythmStats as Partial<RhythmSessionStats>).totalJudged === 'number'
          ? ({
              ...createDefaultRhythmSessionStats(),
              ...(loadedLastSession.rhythmStats as Partial<RhythmSessionStats>),
            } satisfies RhythmSessionStats)
          : createDefaultRhythmSessionStats(),
    };
  }
}

export function resetStats() {
  state.stats = {
    highScore: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    noteStats: {},
  };
  state.lastSessionStats = null;
  state.activeSessionStats = null;
  saveStats();
  removeStorageValue(localStorage, LAST_SESSION_STATS_KEY);
}

export function updateStats(isCorrect: boolean, time: number) {
  if (dom.trainingMode.value === 'timed' || !state.currentPrompt) return;

  let noteKey: string | null = null;
  const { baseChordName, targetNote, targetString } = state.currentPrompt;

  if (baseChordName) {
    noteKey = `${baseChordName}-CHORD`;
  } else if (targetNote && targetString) {
    noteKey = `${targetNote}-${targetString}`;
  }

  if (!noteKey) return;

  state.stats.totalAttempts++;

  if (!state.stats.noteStats[noteKey]) {
    state.stats.noteStats[noteKey] = { attempts: 0, correct: 0, totalTime: 0 };
  }

  state.stats.noteStats[noteKey].attempts++;

  if (isCorrect) {
    state.stats.correctAttempts++;
    state.stats.totalTime += time;
    state.stats.noteStats[noteKey].correct++;
    state.stats.noteStats[noteKey].totalTime += time;
  }
  saveStats();
}
