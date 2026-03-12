import { bindUiSignalBindings } from './ui-signal-bindings';

export { getPromptText, getStatusText, clearResultMessage, clearSessionGoalProgress, refreshDisplayFormatting,
  setInfoSlots, setMelodySetupSummary, setPromptText, setResultMessage, setScoreValue, setSessionGoalProgress,
  setSessionSummaryView, setSessionToolsSummary, setStatsView, setStatusText, setTimerValue, setTunerReading,
  setTunerVisible, setVolumeLevel, setPracticeSetupSummary } from './ui-display-signal-actions';
export { getMelodySetupCollapsed, getPracticeSetupCollapsed, getSessionToolsCollapsed, refreshLayoutControlsVisibility,
  resetSessionButtonsState, setLayoutControlsExpanded, setLoadingUi, setMelodySetupCollapsed, setPracticeSetupCollapsed, setSessionButtonsState,
  setSessionToolsCollapsed, setTimedInfoVisible, setTrainingModeUi, setUiMode, setUiWorkflow,
  toggleLayoutControlsExpanded, toggleMelodySetupCollapsed, togglePracticeSetupCollapsed,
  toggleSessionToolsCollapsed } from './ui-session-signal-actions';
export { hideCalibrationModal, setCalibrationProgress, setCalibrationStatus, setModalVisible,
  setProfileActionsState, showCalibrationModal } from './ui-overlay-signal-actions';

export function bindUiSignals() {
  bindUiSignalBindings();
}
