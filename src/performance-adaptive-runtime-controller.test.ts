import { describe, expect, it } from 'vitest';
import { createPerformanceAdaptiveRuntimeController } from './performance-adaptive-runtime-controller';

describe('createPerformanceAdaptiveRuntimeController', () => {
  it('resolves session mic hold calibration from the last performance bundle', () => {
    const state = {
      lastSessionAnalysisBundle: {
        sessionStats: {
          modeKey: 'performance',
          inputSource: 'microphone',
          totalAttempts: 20,
          performanceMissedNoInputAttempts: 2,
        },
        diagnostics: {
          micPerformanceOnsetRejected: {
            shortHold: 10,
            weakAttack: 2,
            lowConfidence: 1,
            lowVoicing: 0,
          },
        },
      },
      performanceMicHoldCalibrationLevel: 'off' as const,
      micPerformanceOnsetRejectedShortHoldCount: 0,
      micPerformanceOnsetRejectedWeakAttackCount: 0,
      micPerformanceOnsetRejectedLowConfidenceCount: 0,
      micPerformanceOnsetRejectedLowVoicingCount: 0,
      performanceTimingBiasMs: 0,
      performanceTimingBiasSampleCount: 0,
      inputSource: 'microphone' as const,
    };
    const controller = createPerformanceAdaptiveRuntimeController({
      state,
      isPerformanceStyleMode: (trainingMode) => trainingMode === 'performance' || trainingMode === 'practice',
    });

    expect(
      controller.resolveSessionMicHoldCalibrationLevel({
        trainingMode: 'performance',
        inputSource: 'microphone',
      })
    ).toBe('mild');
  });

  it('merges runtime mic hold calibration with the base session level', () => {
    const state = {
      lastSessionAnalysisBundle: null,
      performanceMicHoldCalibrationLevel: 'mild' as const,
      micPerformanceOnsetRejectedShortHoldCount: 12,
      micPerformanceOnsetRejectedWeakAttackCount: 1,
      micPerformanceOnsetRejectedLowConfidenceCount: 1,
      micPerformanceOnsetRejectedLowVoicingCount: 0,
      performanceTimingBiasMs: 0,
      performanceTimingBiasSampleCount: 0,
      inputSource: 'microphone' as const,
    };
    const controller = createPerformanceAdaptiveRuntimeController({
      state,
      isPerformanceStyleMode: () => true,
    });

    expect(controller.resolveEffectiveRuntimeMicHoldCalibrationLevel(true)).toBe('strong');
    expect(controller.resolveEffectiveRuntimeMicHoldCalibrationLevel(false)).toBe('off');
  });

  it('updates timing bias from microphone timing grades only', () => {
    const state = {
      lastSessionAnalysisBundle: null,
      performanceMicHoldCalibrationLevel: 'off' as const,
      micPerformanceOnsetRejectedShortHoldCount: 0,
      micPerformanceOnsetRejectedWeakAttackCount: 0,
      micPerformanceOnsetRejectedLowConfidenceCount: 0,
      micPerformanceOnsetRejectedLowVoicingCount: 0,
      performanceTimingBiasMs: 0,
      performanceTimingBiasSampleCount: 0,
      inputSource: 'microphone' as const,
    };
    const controller = createPerformanceAdaptiveRuntimeController({
      state,
      isPerformanceStyleMode: () => true,
    });

    controller.updateTimingBiasFromGrade({
      bucket: 'late',
      label: 'Late',
      weight: 0.75,
      signedOffsetMs: 100,
    });

    expect(state.performanceTimingBiasMs).toBe(50);
    expect(state.performanceTimingBiasSampleCount).toBe(1);
  });
});
