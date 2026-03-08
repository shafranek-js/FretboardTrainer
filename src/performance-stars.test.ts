import { describe, expect, it } from 'vitest';

import { buildPerformanceStarsRunKey, resolvePerformanceStarView } from './performance-stars';
import type { SessionStats } from './types';

function createSessionStats(partial: Partial<SessionStats> = {}): SessionStats {
  return {
    modeKey: 'performance',
    modeLabel: 'Play Through',
    startedAtMs: 1000,
    endedAtMs: 8000,
    instrumentName: 'guitar',
    tuningPresetKey: 'standard',
    inputSource: 'microphone',
    inputDeviceLabel: 'Default microphone',
    stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
    enabledStrings: ['E', 'A', 'D', 'G', 'B', 'e'],
    minFret: 0,
    maxFret: 12,
    totalAttempts: 20,
    correctAttempts: 18,
    performanceWrongAttempts: 1,
    performanceMissedNoInputAttempts: 1,
    totalTime: 18,
    currentCorrectStreak: 5,
    bestCorrectStreak: 9,
    noteStats: {},
    targetZoneStats: {},
    rhythmStats: {
      totalJudged: 0,
      onBeat: 0,
      early: 0,
      late: 0,
      totalAbsOffsetMs: 0,
      bestAbsOffsetMs: null,
    },
    performanceTimingStats: {
      totalGraded: 18,
      perfect: 10,
      aBitEarly: 3,
      early: 2,
      tooEarly: 1,
      aBitLate: 1,
      late: 1,
      tooLate: 0,
      weightedScoreTotal: 15.8,
      totalAbsOffsetMs: 910,
    },
    melodyId: 'melody-1',
    melodyStudyRangeStartIndex: 0,
    melodyStudyRangeEndIndex: 19,
    melodyTransposeSemitones: 0,
    melodyStringShift: 0,
    completedRun: true,
    ...partial,
  };
}

describe('performance-stars', () => {
  it('returns null when the run was not a completed performance', () => {
    expect(resolvePerformanceStarView(createSessionStats({ completedRun: false }))).toBeNull();
    expect(resolvePerformanceStarView(createSessionStats({ modeKey: 'practice' }))).toBeNull();
  });

  it('assigns stars based on completed performance quality', () => {
    expect(resolvePerformanceStarView(createSessionStats())?.stars).toBe(2);
    expect(
      resolvePerformanceStarView(
        createSessionStats({
          correctAttempts: 19,
          totalAttempts: 20,
          performanceTimingStats: {
            totalGraded: 19,
            perfect: 15,
            aBitEarly: 2,
            early: 1,
            tooEarly: 0,
            aBitLate: 1,
            late: 0,
            tooLate: 0,
            weightedScoreTotal: 18.6,
            totalAbsOffsetMs: 540,
          },
        })
      )?.stars
    ).toBe(3);
    expect(
      resolvePerformanceStarView(
        createSessionStats({
          correctAttempts: 8,
          totalAttempts: 20,
          performanceTimingStats: {
            totalGraded: 8,
            perfect: 2,
            aBitEarly: 1,
            early: 2,
            tooEarly: 1,
            aBitLate: 1,
            late: 1,
            tooLate: 0,
            weightedScoreTotal: 4.4,
            totalAbsOffsetMs: 2400,
          },
        })
      )?.stars
    ).toBe(1);
  });

  it('builds a stable run key for melody/range variants', () => {
    expect(buildPerformanceStarsRunKey(createSessionStats())).toBe('guitar|melody-1|0-19|tr0|ss0');
  });
});
