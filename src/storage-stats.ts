import { dom, state } from './state';
import type { PerformanceTimingStats, RhythmSessionStats, SessionStats } from './types';
import type { SessionAnalysisBundle } from './session-analysis-bundle';
import {
  LAST_SESSION_ANALYSIS_BUNDLE_KEY,
  LAST_SESSION_STATS_KEY,
  PERFORMANCE_STAR_RESULTS_KEY,
  STATS_KEY,
} from './app-storage-keys';
import { createDefaultRhythmSessionStats } from './storage-profiles';
import {
  readStorageJson,
  removeStorageValue,
  writeStorageJson,
} from './storage-schema';

const STATS_SAVE_DEBOUNCE_MS = 180;
let pendingStatsSaveTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

function clearPendingStatsSave() {
  if (pendingStatsSaveTimeoutId !== null) {
    clearTimeout(pendingStatsSaveTimeoutId);
    pendingStatsSaveTimeoutId = null;
  }
}

function scheduleStatsSave() {
  clearPendingStatsSave();
  pendingStatsSaveTimeoutId = globalThis.setTimeout(() => {
    pendingStatsSaveTimeoutId = null;
    saveStats();
  }, STATS_SAVE_DEBOUNCE_MS);
}

function createDefaultPerformanceTimingStats(): PerformanceTimingStats {
  return {
    totalGraded: 0,
    perfect: 0,
    aBitEarly: 0,
    early: 0,
    tooEarly: 0,
    aBitLate: 0,
    late: 0,
    tooLate: 0,
    weightedScoreTotal: 0,
    totalAbsOffsetMs: 0,
  };
}

export function saveStats() {
  writeStorageJson(localStorage, STATS_KEY, state.stats);
}

export function flushPendingStatsSave() {
  if (pendingStatsSaveTimeoutId === null) return;
  clearPendingStatsSave();
  saveStats();
}

export function saveLastSessionStats() {
  if (!state.lastSessionStats) {
    removeStorageValue(localStorage, LAST_SESSION_STATS_KEY);
    return;
  }
  writeStorageJson(localStorage, LAST_SESSION_STATS_KEY, state.lastSessionStats);
}

export function saveLastSessionAnalysisBundle() {
  if (!state.lastSessionAnalysisBundle) {
    removeStorageValue(localStorage, LAST_SESSION_ANALYSIS_BUNDLE_KEY);
    return;
  }
  writeStorageJson(localStorage, LAST_SESSION_ANALYSIS_BUNDLE_KEY, state.lastSessionAnalysisBundle);
}

export function savePerformanceStarResults() {
  writeStorageJson(localStorage, PERFORMANCE_STAR_RESULTS_KEY, state.performanceStarsByRunKey);
}

export function loadStats() {
  clearPendingStatsSave();
  state.lastSessionStats = null;
  state.lastSessionPerformanceNoteLog = null;
  state.lastSessionAnalysisBundle = null;
  state.lastSessionAnalysisAutoDownloadKey = null;
  state.performanceStarsByRunKey = {};
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
      performanceWrongAttempts:
        typeof loadedLastSession.performanceWrongAttempts === 'number'
          ? Math.max(0, loadedLastSession.performanceWrongAttempts)
          : 0,
      performanceMissedNoInputAttempts:
        typeof loadedLastSession.performanceMissedNoInputAttempts === 'number'
          ? Math.max(0, loadedLastSession.performanceMissedNoInputAttempts)
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
      performanceTimingStats:
        loadedLastSession.performanceTimingStats &&
        typeof loadedLastSession.performanceTimingStats === 'object' &&
        typeof (loadedLastSession.performanceTimingStats as Partial<PerformanceTimingStats>)
          .totalGraded === 'number'
          ? ({
              ...createDefaultPerformanceTimingStats(),
              ...(loadedLastSession.performanceTimingStats as Partial<PerformanceTimingStats>),
            } satisfies PerformanceTimingStats)
          : createDefaultPerformanceTimingStats(),
    };
  }

  const loadedLastSessionAnalysisBundle = readStorageJson(
    localStorage,
    LAST_SESSION_ANALYSIS_BUNDLE_KEY,
    (value): value is SessionAnalysisBundle =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { schemaVersion?: unknown }).schemaVersion === 'number' &&
      typeof (value as { generatedAtIso?: unknown }).generatedAtIso === 'string',
    null,
    (error) => {
      console.error('Failed to load last session analysis bundle:', error);
      removeStorageValue(localStorage, LAST_SESSION_ANALYSIS_BUNDLE_KEY);
    }
  );
  state.lastSessionAnalysisBundle = loadedLastSessionAnalysisBundle;

  state.performanceStarsByRunKey = readStorageJson(
    localStorage,
    PERFORMANCE_STAR_RESULTS_KEY,
    (value): value is Record<string, number> =>
      typeof value === 'object' &&
      value !== null &&
      Object.values(value as Record<string, unknown>).every(
        (entry) => typeof entry === 'number' && Number.isFinite(entry)
      ),
    {},
    (error) => {
      console.error('Failed to load performance star results:', error);
      removeStorageValue(localStorage, PERFORMANCE_STAR_RESULTS_KEY);
    }
  );
}

export function resetStats() {
  clearPendingStatsSave();
  state.stats = {
    highScore: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    noteStats: {},
  };
  state.lastSessionStats = null;
  state.lastSessionPerformanceNoteLog = null;
  state.lastSessionAnalysisBundle = null;
  state.lastSessionAnalysisAutoDownloadKey = null;
  state.performanceStarsByRunKey = {};
  state.activeSessionStats = null;
  saveStats();
  removeStorageValue(localStorage, LAST_SESSION_STATS_KEY);
  removeStorageValue(localStorage, LAST_SESSION_ANALYSIS_BUNDLE_KEY);
  removeStorageValue(localStorage, PERFORMANCE_STAR_RESULTS_KEY);
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
  scheduleStatsSave();
}
