import type { PracticeInputPreset, PracticeTimingPreset } from './practice-presets';
import type { UiWorkflow } from './training-workflows';

export const DEFAULT_RECOMMENDED_WORKFLOW: UiWorkflow = 'learn-notes';
export const DEFAULT_RECOMMENDED_INPUT_PRESET: Exclude<PracticeInputPreset, 'custom'> = 'normal_room';
export const DEFAULT_RECOMMENDED_TIMING_PRESET: Exclude<PracticeTimingPreset, 'custom'> = 'balanced';

export function isRecommendedInputPreset(preset: PracticeInputPreset) {
  return preset === DEFAULT_RECOMMENDED_INPUT_PRESET;
}

export function isRecommendedTimingPreset(preset: PracticeTimingPreset) {
  return preset === DEFAULT_RECOMMENDED_TIMING_PRESET;
}

export function getDirectInputRecommendationText(workflow: UiWorkflow) {
  if (workflow !== 'practice' && workflow !== 'perform') {
    return null;
  }
  return 'Recommended for Practice and Perform when you use headphones or a direct interface.';
}

export function shouldShowRecommendedWorkflowBadge(hasCompletedOnboarding: boolean) {
  return !hasCompletedOnboarding;
}

export function shouldShowRecommendedPresetBadge(
  hasCompletedOnboarding: boolean,
  isRecommendedPreset: boolean
) {
  return !hasCompletedOnboarding && isRecommendedPreset;
}
