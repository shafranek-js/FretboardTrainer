import { describe, expect, it } from 'vitest';
import {
  mergePerformanceMicHoldCalibrationLevel,
  resolvePerformanceMicHoldCalibrationLevel,
  resolvePerformanceMicHoldCalibrationLevelFromBundle,
  resolveRuntimePerformanceMicHoldCalibrationLevel,
} from './performance-mic-hold-calibration';

describe('performance-mic-hold-calibration', () => {
  it('returns strong when short-hold rejects dominate missed attempts', () => {
    expect(
      resolvePerformanceMicHoldCalibrationLevel({
        totalAttempts: 62,
        missedNoInputAttempts: 7,
        shortHoldRejectCount: 59,
        weakAttackRejectCount: 0,
        lowConfidenceRejectCount: 0,
        lowVoicingRejectCount: 0,
      })
    ).toBe('strong');
  });

  it('returns off when sample size is too small', () => {
    expect(
      resolvePerformanceMicHoldCalibrationLevel({
        totalAttempts: 8,
        missedNoInputAttempts: 3,
        shortHoldRejectCount: 20,
        weakAttackRejectCount: 0,
        lowConfidenceRejectCount: 0,
        lowVoicingRejectCount: 0,
      })
    ).toBe('off');
  });

  it('derives level from analysis bundle only for microphone performance sessions', () => {
    expect(
      resolvePerformanceMicHoldCalibrationLevelFromBundle({
        schemaVersion: 1,
        generatedAtIso: '2026-03-05T08:15:10.025Z',
        sessionStats: {
          modeKey: 'performance',
          inputSource: 'microphone',
          totalAttempts: 62,
          performanceMissedNoInputAttempts: 7,
        } as never,
        performanceNoteLog: null,
        performanceFeedbackByEvent: {},
        performanceTimingByEvent: {},
        performanceOnsetRejectsByEvent: {},
        performanceCaptureTelemetryByEvent: {},
        context: {} as never,
        diagnostics: {
          micPerformanceOnsetRejected: {
            weakAttack: 0,
            lowConfidence: 0,
            lowVoicing: 0,
            shortHold: 59,
          },
        } as never,
      })
    ).toBe('strong');

    expect(
      resolvePerformanceMicHoldCalibrationLevelFromBundle({
        schemaVersion: 1,
        generatedAtIso: '2026-03-05T08:15:10.025Z',
        sessionStats: {
          modeKey: 'performance',
          inputSource: 'midi',
        } as never,
      } as never)
    ).toBe('off');
  });

  it('ramps runtime level up only when short-hold rejects persist', () => {
    expect(
      resolveRuntimePerformanceMicHoldCalibrationLevel({
        shortHoldRejectCount: 4,
        weakAttackRejectCount: 0,
        lowConfidenceRejectCount: 0,
        lowVoicingRejectCount: 0,
      })
    ).toBe('off');

    expect(
      resolveRuntimePerformanceMicHoldCalibrationLevel({
        shortHoldRejectCount: 10,
        weakAttackRejectCount: 2,
        lowConfidenceRejectCount: 1,
        lowVoicingRejectCount: 0,
      })
    ).toBe('mild');

    expect(
      resolveRuntimePerformanceMicHoldCalibrationLevel({
        shortHoldRejectCount: 12,
        weakAttackRejectCount: 2,
        lowConfidenceRejectCount: 1,
        lowVoicingRejectCount: 1,
      })
    ).toBe('strong');
  });

  it('keeps the stricter relaxation level when merging', () => {
    expect(mergePerformanceMicHoldCalibrationLevel('off', 'mild')).toBe('mild');
    expect(mergePerformanceMicHoldCalibrationLevel('mild', 'off')).toBe('mild');
    expect(mergePerformanceMicHoldCalibrationLevel('mild', 'strong')).toBe('strong');
    expect(mergePerformanceMicHoldCalibrationLevel('strong', 'mild')).toBe('strong');
  });
});
