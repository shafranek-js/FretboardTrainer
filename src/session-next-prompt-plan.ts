import type { DetectionType } from './modes/training-mode';

export type NextPromptStopReason = 'missing_mode' | 'missing_prompt' | null;

export interface SessionNextPromptPlanInput {
  hasMode: boolean;
  detectionType: DetectionType | null;
  hasPrompt: boolean;
}

export interface SessionNextPromptPlan {
  shouldStopListening: boolean;
  stopReason: NextPromptStopReason;
  errorMessage: string | null;
  tunerVisible: boolean;
  shouldResetTuner: boolean;
}

export function buildSessionNextPromptPlan({
  hasMode,
  detectionType,
  hasPrompt,
}: SessionNextPromptPlanInput): SessionNextPromptPlan {
  if (!hasMode) {
    return {
      shouldStopListening: true,
      stopReason: 'missing_mode',
      errorMessage: 'Selected training mode is not available.',
      tunerVisible: false,
      shouldResetTuner: false,
    };
  }

  const tunerVisible = detectionType === 'monophonic';
  if (!hasPrompt) {
    return {
      shouldStopListening: true,
      stopReason: 'missing_prompt',
      errorMessage: null,
      tunerVisible,
      shouldResetTuner: tunerVisible,
    };
  }

  return {
    shouldStopListening: false,
    stopReason: null,
    errorMessage: null,
    tunerVisible,
    shouldResetTuner: tunerVisible,
  };
}
