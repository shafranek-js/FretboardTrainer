import {
  describePracticeInputPreset,
  describePracticeTimingPreset,
  resolvePracticeInputPresetFromSettings,
  resolvePracticeTimingPresetFromSettings,
} from '../practice-presets';
import {
  getDirectInputRecommendationText,
  isRecommendedInputPreset,
  isRecommendedTimingPreset,
  shouldShowRecommendedPresetBadge,
  shouldShowRecommendedWorkflowBadge,
} from '../recommended-defaults';

interface PracticePresetUiDom {
  practiceInputPreset: HTMLSelectElement;
  practiceInputPresetInfo: HTMLElement;
  practiceInputPresetRecommendedBadge: HTMLElement;
  practiceTimingPreset: HTMLSelectElement;
  practiceTimingPresetInfo: HTMLElement;
  practiceTimingPresetRecommendedBadge: HTMLElement;
  workflowLearnNotesRecommendedBadge: HTMLElement;
  micDirectInputRecommendedBadge: HTMLElement;
  micDirectInputRecommendationText: HTMLElement;
}

interface PracticePresetUiState {
  micSensitivityPreset: string;
  micNoteAttackFilterPreset: string;
  micNoteHoldFilterPreset: string;
  isDirectInputMode: boolean;
  performanceMicTolerancePreset: string;
  performanceTimingLeniencyPreset: string;
  uiWorkflow: Parameters<typeof getDirectInputRecommendationText>[0];
}

export interface PracticePresetUiControllerDeps {
  dom: PracticePresetUiDom;
  state: PracticePresetUiState;
  hasCompletedOnboarding: () => boolean;
}

export function createPracticePresetUiController(deps: PracticePresetUiControllerDeps) {
  function syncRecommendedDefaultsUi() {
    const recommendationText = getDirectInputRecommendationText(deps.state.uiWorkflow);
    const showDirectInputRecommendation = recommendationText !== null;
    const hasCompletedOnboarding = deps.hasCompletedOnboarding();
    deps.dom.workflowLearnNotesRecommendedBadge.classList.toggle(
      'hidden',
      !shouldShowRecommendedWorkflowBadge(hasCompletedOnboarding)
    );
    deps.dom.micDirectInputRecommendedBadge.classList.toggle('hidden', !showDirectInputRecommendation);
    deps.dom.micDirectInputRecommendationText.classList.toggle('hidden', !showDirectInputRecommendation);
    deps.dom.micDirectInputRecommendationText.textContent = recommendationText ?? '';
  }

  function syncPracticePresetUi() {
    const hasCompletedOnboarding = deps.hasCompletedOnboarding();
    const inputPreset = resolvePracticeInputPresetFromSettings({
      micSensitivityPreset: deps.state.micSensitivityPreset as never,
      micNoteAttackFilterPreset: deps.state.micNoteAttackFilterPreset as never,
      micNoteHoldFilterPreset: deps.state.micNoteHoldFilterPreset as never,
      isDirectInputMode: deps.state.isDirectInputMode,
    });
    deps.dom.practiceInputPreset.value = inputPreset;
    deps.dom.practiceInputPresetInfo.textContent = describePracticeInputPreset(inputPreset);
    deps.dom.practiceInputPresetRecommendedBadge.classList.toggle(
      'hidden',
      !shouldShowRecommendedPresetBadge(hasCompletedOnboarding, isRecommendedInputPreset(inputPreset))
    );

    const timingPreset = resolvePracticeTimingPresetFromSettings({
      performanceMicTolerancePreset: deps.state.performanceMicTolerancePreset as never,
      performanceTimingLeniencyPreset: deps.state.performanceTimingLeniencyPreset as never,
    });
    deps.dom.practiceTimingPreset.value = timingPreset;
    deps.dom.practiceTimingPresetInfo.textContent = describePracticeTimingPreset(timingPreset);
    deps.dom.practiceTimingPresetRecommendedBadge.classList.toggle(
      'hidden',
      !shouldShowRecommendedPresetBadge(hasCompletedOnboarding, isRecommendedTimingPreset(timingPreset))
    );
    syncRecommendedDefaultsUi();
  }

  return {
    syncPracticePresetUi,
    syncRecommendedDefaultsUi,
  };
}
