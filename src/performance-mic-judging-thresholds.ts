export interface PerformanceMicJudgingThresholdInput {
  smoothedConfidence: number;
  rawConfidence: number;
  smoothedVoicing: number;
  rawVoicing: number;
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
  const confidenceAccepted =
    input.smoothedConfidence >= 0.36 ||
    (input.smoothedConfidence >= 0.3 && input.rawConfidence >= 0.35) ||
    input.rawConfidence >= 0.52;
  const voicingAccepted =
    input.smoothedVoicing >= 0.35 ||
    (input.smoothedVoicing >= 0.29 && input.rawVoicing >= 0.34) ||
    input.rawVoicing >= 0.5;

  return {
    confidenceAccepted,
    voicingAccepted,
  };
}
