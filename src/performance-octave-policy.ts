import { isPerformanceStyleMode } from './training-mode-groups';

export interface PerformanceOctavePolicyInput {
  trainingMode: string;
  inputSource: 'microphone' | 'midi';
  relaxOctaveCheckEnabled: boolean;
  promptTargetNote: string | null | undefined;
  detectedNote: string;
}

export function shouldIgnorePerformanceOctaveMismatch(
  input: PerformanceOctavePolicyInput
) {
  return (
    isPerformanceStyleMode(input.trainingMode) &&
    input.inputSource === 'microphone' &&
    input.relaxOctaveCheckEnabled &&
    typeof input.promptTargetNote === 'string' &&
    input.promptTargetNote === input.detectedNote
  );
}
