import type { SessionAnalysisBundle } from './session-analysis-bundle';
import type { PerformanceMicHoldCalibrationLevel } from './mic-note-hold-filter';

function resolveLevelScore(level: PerformanceMicHoldCalibrationLevel) {
  if (level === 'strong') return 2;
  if (level === 'mild') return 1;
  return 0;
}

export function mergePerformanceMicHoldCalibrationLevel(
  baseLevel: PerformanceMicHoldCalibrationLevel,
  nextLevel: PerformanceMicHoldCalibrationLevel
): PerformanceMicHoldCalibrationLevel {
  return resolveLevelScore(nextLevel) > resolveLevelScore(baseLevel) ? nextLevel : baseLevel;
}

export function resolvePerformanceMicHoldCalibrationLevel(input: {
  totalAttempts: number;
  missedNoInputAttempts: number;
  shortHoldRejectCount: number;
  weakAttackRejectCount: number;
  lowConfidenceRejectCount: number;
  lowVoicingRejectCount: number;
}): PerformanceMicHoldCalibrationLevel {
  const totalAttempts = Math.max(0, Math.round(input.totalAttempts));
  const missedAttempts = Math.max(0, Math.round(input.missedNoInputAttempts));
  const shortHoldRejectCount = Math.max(0, Math.round(input.shortHoldRejectCount));
  const weakAttackRejectCount = Math.max(0, Math.round(input.weakAttackRejectCount));
  const lowConfidenceRejectCount = Math.max(0, Math.round(input.lowConfidenceRejectCount));
  const lowVoicingRejectCount = Math.max(0, Math.round(input.lowVoicingRejectCount));
  const totalRejects =
    shortHoldRejectCount + weakAttackRejectCount + lowConfidenceRejectCount + lowVoicingRejectCount;

  if (totalAttempts < 12 || shortHoldRejectCount < 8 || totalRejects <= 0) {
    return 'off';
  }

  const missedRatio = missedAttempts / Math.max(1, totalAttempts);
  const shortHoldShare = shortHoldRejectCount / totalRejects;

  if (shortHoldShare >= 0.7 && shortHoldRejectCount >= 20 && missedRatio >= 0.08) {
    return 'strong';
  }

  if (shortHoldShare >= 0.45 && shortHoldRejectCount >= 10 && missedRatio >= 0.04) {
    return 'mild';
  }

  return 'off';
}

export function resolvePerformanceMicHoldCalibrationLevelFromBundle(
  bundle: SessionAnalysisBundle | null | undefined
): PerformanceMicHoldCalibrationLevel {
  if (!bundle?.sessionStats || bundle.sessionStats.modeKey !== 'performance') return 'off';
  if (bundle.sessionStats.inputSource !== 'microphone') return 'off';
  return resolvePerformanceMicHoldCalibrationLevel({
    totalAttempts: bundle.sessionStats.totalAttempts,
    missedNoInputAttempts: bundle.sessionStats.performanceMissedNoInputAttempts ?? 0,
    shortHoldRejectCount: bundle.diagnostics.micPerformanceOnsetRejected.shortHold,
    weakAttackRejectCount: bundle.diagnostics.micPerformanceOnsetRejected.weakAttack,
    lowConfidenceRejectCount: bundle.diagnostics.micPerformanceOnsetRejected.lowConfidence,
    lowVoicingRejectCount: bundle.diagnostics.micPerformanceOnsetRejected.lowVoicing,
  });
}

export function resolveRuntimePerformanceMicHoldCalibrationLevel(input: {
  shortHoldRejectCount: number;
  weakAttackRejectCount: number;
  lowConfidenceRejectCount: number;
  lowVoicingRejectCount: number;
}): PerformanceMicHoldCalibrationLevel {
  const shortHoldRejectCount = Math.max(0, Math.round(input.shortHoldRejectCount));
  const weakAttackRejectCount = Math.max(0, Math.round(input.weakAttackRejectCount));
  const lowConfidenceRejectCount = Math.max(0, Math.round(input.lowConfidenceRejectCount));
  const lowVoicingRejectCount = Math.max(0, Math.round(input.lowVoicingRejectCount));
  const totalRejects =
    shortHoldRejectCount + weakAttackRejectCount + lowConfidenceRejectCount + lowVoicingRejectCount;

  if (totalRejects < 5 || shortHoldRejectCount < 4) return 'off';

  const shortHoldShare = shortHoldRejectCount / totalRejects;
  if (shortHoldShare >= 0.72 && shortHoldRejectCount >= 12) return 'strong';
  if (shortHoldShare >= 0.55 && shortHoldRejectCount >= 5) return 'mild';
  return 'off';
}
