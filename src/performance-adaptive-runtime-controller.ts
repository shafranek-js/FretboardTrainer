import type { PerformanceMicHoldCalibrationLevel } from './mic-note-hold-filter';
import type { PerformanceTimingGrade } from './performance-timing-grade';
import { updatePerformanceTimingBias } from './performance-timing-bias';
import {
  mergePerformanceMicHoldCalibrationLevel,
  resolvePerformanceMicHoldCalibrationLevelFromBundle,
  resolveRuntimePerformanceMicHoldCalibrationLevel,
} from './performance-mic-hold-calibration';

type AppState = typeof import('./state').state;

interface PerformanceAdaptiveRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'lastSessionAnalysisBundle'
    | 'performanceMicHoldCalibrationLevel'
    | 'micPerformanceOnsetRejectedShortHoldCount'
    | 'micPerformanceOnsetRejectedWeakAttackCount'
    | 'micPerformanceOnsetRejectedLowConfidenceCount'
    | 'micPerformanceOnsetRejectedLowVoicingCount'
    | 'performanceTimingBiasMs'
    | 'performanceTimingBiasSampleCount'
    | 'inputSource'
  >;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
}

export function createPerformanceAdaptiveRuntimeController(
  deps: PerformanceAdaptiveRuntimeControllerDeps
) {
  function resolveSessionMicHoldCalibrationLevel(input: {
    trainingMode: string;
    inputSource: 'microphone' | 'midi';
  }): PerformanceMicHoldCalibrationLevel {
    if (!deps.isPerformanceStyleMode(input.trainingMode) || input.inputSource !== 'microphone') {
      return 'off';
    }
    return resolvePerformanceMicHoldCalibrationLevelFromBundle(deps.state.lastSessionAnalysisBundle);
  }

  function resolveEffectiveRuntimeMicHoldCalibrationLevel(
    performanceAdaptiveMicInput: boolean
  ): PerformanceMicHoldCalibrationLevel {
    if (!performanceAdaptiveMicInput) return 'off';
    const runtimeLevel = resolveRuntimePerformanceMicHoldCalibrationLevel({
      shortHoldRejectCount: deps.state.micPerformanceOnsetRejectedShortHoldCount,
      weakAttackRejectCount: deps.state.micPerformanceOnsetRejectedWeakAttackCount,
      lowConfidenceRejectCount: deps.state.micPerformanceOnsetRejectedLowConfidenceCount,
      lowVoicingRejectCount: deps.state.micPerformanceOnsetRejectedLowVoicingCount,
    });
    return mergePerformanceMicHoldCalibrationLevel(deps.state.performanceMicHoldCalibrationLevel, runtimeLevel);
  }

  function updateTimingBiasFromGrade(grade: PerformanceTimingGrade | null | undefined) {
    if (!grade) return;
    const next = updatePerformanceTimingBias({
      currentBiasMs: deps.state.performanceTimingBiasMs,
      sampleCount: deps.state.performanceTimingBiasSampleCount,
      signedOffsetMs: grade.signedOffsetMs,
      inputSource: deps.state.inputSource,
    });
    deps.state.performanceTimingBiasMs = next.nextBiasMs;
    deps.state.performanceTimingBiasSampleCount = next.nextSampleCount;
  }

  return {
    resolveSessionMicHoldCalibrationLevel,
    resolveEffectiveRuntimeMicHoldCalibrationLevel,
    updateTimingBiasFromGrade,
  };
}
