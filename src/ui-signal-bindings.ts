import { dom } from './dom';
import { renderSessionSummaryView, renderStatsView } from './ui-session-results-view';
import { bindUiRenderSignals } from './ui-render-bindings';
import { bindUiWorkflowSignals } from './ui-workflow-bindings';
import { syncSessionControlsState } from './ui-session-controls-sync';
import {
  syncMelodySetupCollapsedState,
  syncPracticeSetupCollapsedState,
  syncSessionToolsCollapsedState,
} from './ui-workflow-panels-sync';
import {
  syncDisplayControlsVisibilityState,
  syncLoadingUiState,
  syncTrainingModeUiState,
  syncUiModeState,
  syncWorkflowUiState,
} from './ui-workflow-sync';
import { syncPromptUiState, syncTimedInfoUiState } from './ui-session-visibility-sync';
import {
  renderMelodySetupSummary,
  renderPracticeSetupSummary,
  renderScoreValue,
  renderSessionGoalProgress,
  renderSessionToolsSummary,
  renderTimerValue,
} from './ui-session-display-view';
import {
  syncCalibrationUiState,
  syncModalUiState,
  syncProfileActionsUiState,
} from './ui-overlay-sync';
import { renderTunerReading, renderTunerVisibility, renderVolumeLevel } from './ui-monitoring-view';
import { renderInfoSlots, renderResultView, renderStatusText } from './ui-feedback-view';
import {
  calibrationViewSignal,
  infoSlotsSignal,
  layoutControlsExpandedSignal,
  loadingViewSignal,
  melodySetupCollapsedSignal,
  melodySetupSummarySignal,
  modalVisibilitySignal,
  practiceSetupCollapsedSignal,
  practiceSetupSummarySignal,
  profileActionsSignal,
  promptTextSignal,
  resultViewSignal,
  scoreValueSignal,
  sessionButtonsSignal,
  sessionGoalProgressSignal,
  sessionSummaryViewSignal,
  sessionToolsCollapsedSignal,
  sessionToolsSummarySignal,
  statsViewSignal,
  statusTextSignal,
  timedInfoVisibleSignal,
  timerValueSignal,
  trainingModeUiSignal,
  tunerReadingSignal,
  tunerVisibleSignal,
  uiModeSignal,
  uiSignalBindingRuntimeState,
  uiWorkflowSignal,
  volumeLevelSignal,
} from './ui-signal-store';

let isBound = false;

export function bindUiSignalBindings() {
  if (isBound) return;
  isBound = true;

  bindUiRenderSignals({
    statusTextSignal,
    promptTextSignal,
    resultViewSignal,
    volumeLevelSignal,
    statsViewSignal,
    sessionSummaryViewSignal,
    timerValueSignal,
    scoreValueSignal,
    tunerVisibleSignal,
    tunerReadingSignal,
    modalVisibilitySignal,
    profileActionsSignal,
    calibrationViewSignal,
    sessionGoalProgressSignal,
    infoSlotsSignal,
    practiceSetupSummarySignal,
    melodySetupSummarySignal,
    sessionToolsSummarySignal,
    renderStatusText,
    renderResultView,
    renderVolumeLevel,
    renderStatsView,
    renderSessionSummaryView,
    renderTimerValue,
    renderScoreValue,
    renderTunerVisibility,
    renderTunerReading,
    syncModalUiState,
    syncProfileActionsUiState,
    syncCalibrationUiState,
    renderSessionGoalProgress,
    renderInfoSlots,
    renderPracticeSetupSummary,
    renderMelodySetupSummary,
    renderSessionToolsSummary,
  });

  bindUiWorkflowSignals({
    promptTextSignal,
    timedInfoVisibleSignal,
    sessionButtonsSignal,
    trainingModeUiSignal,
    uiWorkflowSignal,
    uiModeSignal,
    loadingViewSignal,
    practiceSetupCollapsedSignal,
    melodySetupCollapsedSignal,
    sessionToolsCollapsedSignal,
    layoutControlsExpandedSignal,
    practiceSetupSummarySignal,
    melodySetupSummarySignal,
    sessionToolsSummarySignal,
    syncPromptUiState,
    syncTimedInfoUiState,
    syncSessionControlsState,
    syncTrainingModeUiState,
    syncWorkflowUiState,
    syncUiModeState,
    syncLoadingUiState,
    syncPracticeSetupCollapsedState,
    syncMelodySetupCollapsedState,
    syncSessionToolsCollapsedState,
    syncDisplayControlsVisibilityState,
    getShowStringTogglesChecked: () => dom.showStringToggles.checked,
    getMelodySetupToggleHidden: () => dom.melodySetupToggleBtn.classList.contains('hidden'),
    runtimeState: uiSignalBindingRuntimeState,
  });
}
