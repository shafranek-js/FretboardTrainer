import { evaluateSilenceGate } from './audio-detection-handlers';

export type ProcessAudioFramePreflightKind =
  | 'silence_wait'
  | 'missing_mode_or_prompt'
  | 'continue';

export interface ProcessAudioFramePreflightInput {
  volume: number;
  volumeThreshold: number;
  consecutiveSilence: number;
  isCalibrating: boolean;
  trainingMode: string;
  hasMode: boolean;
  hasCurrentPrompt: boolean;
}

export interface ProcessAudioFramePreflightPlan {
  kind: ProcessAudioFramePreflightKind;
  nextConsecutiveSilence: number;
  shouldResetTracking: boolean;
  shouldResetTuner: boolean;
  shouldClearFreeHighlight: boolean;
}

export function buildProcessAudioFramePreflightPlan({
  volume,
  volumeThreshold,
  consecutiveSilence,
  isCalibrating,
  trainingMode,
  hasMode,
  hasCurrentPrompt,
}: ProcessAudioFramePreflightInput): ProcessAudioFramePreflightPlan {
  const silenceGate = evaluateSilenceGate({
    volume,
    volumeThreshold,
    consecutiveSilence,
  });

  if (silenceGate.isBelowThreshold) {
    return {
      kind: 'silence_wait',
      nextConsecutiveSilence: silenceGate.nextConsecutiveSilence,
      shouldResetTracking: silenceGate.shouldResetTracking,
      shouldResetTuner: silenceGate.shouldResetTracking && !isCalibrating,
      shouldClearFreeHighlight: silenceGate.shouldResetTracking && trainingMode === 'free',
    };
  }

  if (!hasMode || !hasCurrentPrompt) {
    return {
      kind: 'missing_mode_or_prompt',
      nextConsecutiveSilence: silenceGate.nextConsecutiveSilence,
      shouldResetTracking: false,
      shouldResetTuner: false,
      shouldClearFreeHighlight: false,
    };
  }

  return {
    kind: 'continue',
    nextConsecutiveSilence: silenceGate.nextConsecutiveSilence,
    shouldResetTracking: false,
    shouldResetTuner: false,
    shouldClearFreeHighlight: false,
  };
}
