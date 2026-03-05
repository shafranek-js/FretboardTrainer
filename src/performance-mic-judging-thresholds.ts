export interface PerformanceMicJudgingThresholdInput {
  smoothedConfidence: number;
  rawConfidence: number;
  smoothedVoicing: number;
  rawVoicing: number;
  attackPeakVolume?: number;
  attackRequiredPeak?: number;
}

export interface PerformanceMicJudgingThresholdResult {
  confidenceAccepted: boolean;
  voicingAccepted: boolean;
}

// Performance judging should accept a clean single-note attack earlier than the
// generic mic pipeline. Otherwise correct notes on built-in microphones are
// rejected until the player attacks unnaturally hard.
export function resolvePerformanceMicJudgingThresholds(
  input: PerformanceMicJudgingThresholdInput
): PerformanceMicJudgingThresholdResult {
  const attackRequiredPeak =
    typeof input.attackRequiredPeak === 'number' && Number.isFinite(input.attackRequiredPeak)
      ? Math.max(0, input.attackRequiredPeak)
      : 0;
  const attackPeakVolume =
    typeof input.attackPeakVolume === 'number' && Number.isFinite(input.attackPeakVolume)
      ? Math.max(0, input.attackPeakVolume)
      : 0;
  const hasStrongAttack =
    attackRequiredPeak > 0 && attackPeakVolume >= attackRequiredPeak * 1.05;

  const confidenceAccepted =
    input.smoothedConfidence >= 0.36 ||
    (input.smoothedConfidence >= 0.3 && input.rawConfidence >= 0.35) ||
    input.rawConfidence >= 0.52 ||
    (hasStrongAttack &&
      input.rawConfidence >= 0.42 &&
      input.smoothedConfidence >= 0.24);
  const voicingAccepted =
    input.smoothedVoicing >= 0.35 ||
    (input.smoothedVoicing >= 0.29 && input.rawVoicing >= 0.34) ||
    input.rawVoicing >= 0.5 ||
    (hasStrongAttack &&
      input.rawVoicing >= 0.4 &&
      input.smoothedVoicing >= 0.24);

  return {
    confidenceAccepted,
    voicingAccepted,
  };
}
