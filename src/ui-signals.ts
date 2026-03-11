import { dom } from './dom';
import { createSignal } from './reactive/signal';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import type { LastSessionHeatmapView, LastSessionViewModel, StatsViewModel } from './stats-view';
import { formatMusicText } from './note-display';
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
  renderFormattedSessionGoalProgress,
  renderMelodySetupSummary,
  renderPracticeSetupSummary,
  renderScoreValue,
  renderSessionGoalProgress,
  renderSessionToolsSummary,
  renderTimerValue,
} from './ui-session-display-view';
import {
  type CalibrationViewState,
  type ModalKey,
  type ModalVisibilityState,
  type ProfileActionsState,
} from './ui-modal-views';
import {
  createVisibleCalibrationViewState,
  resolveNextCalibrationViewState,
  resolveNextModalVisibilityState,
  resolveNextProfileActionsState,
} from './ui-overlay-state';
import {
  syncCalibrationUiState,
  syncModalUiState,
  syncProfileActionsUiState,
} from './ui-overlay-sync';
import { type LoadingViewState } from './ui-loading-view';
import {
  renderTunerReading,
  renderTunerVisibility,
  renderVolumeLevel,
  type TunerReadingState,
} from './ui-monitoring-view';
import {
  renderInfoSlots,
  renderPromptText,
  renderResultView,
  renderStatusText,
  type InfoSlotsState,
  type ResultTone,
  type ResultViewState,
} from './ui-feedback-view';
const statusTextSignal = createSignal('Ready');
const promptTextSignal = createSignal('');
const resultViewSignal = createSignal<ResultViewState>({ text: '', tone: 'neutral' });
const volumeLevelSignal = createSignal(0);
const statsViewSignal = createSignal<StatsViewModel>({
  highScoreText: '0',
  accuracyText: '0.0%',
  avgTimeText: '0.00s',
  problemNotes: [],
  lastSession: null,
});
const sessionSummaryViewSignal = createSignal<LastSessionViewModel | null>(null);
const timerValueSignal = createSignal('60');
const scoreValueSignal = createSignal('0');
const timedInfoVisibleSignal = createSignal(false);
const sessionGoalProgressSignal = createSignal('');
const practiceSetupCollapsedSignal = createSignal(false);
const melodySetupCollapsedSignal = createSignal(false);
const sessionToolsCollapsedSignal = createSignal(true);
const layoutControlsExpandedSignal = createSignal(false);
const practiceSetupSummarySignal = createSignal('');
const melodySetupSummarySignal = createSignal('');
const sessionToolsSummarySignal = createSignal('');
interface SessionButtonsState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
}
const defaultSessionButtonsState: SessionButtonsState = {
  startDisabled: false,
  stopDisabled: true,
  hintDisabled: true,
  playSoundDisabled: true,
};
const sessionButtonsSignal = createSignal<SessionButtonsState>(defaultSessionButtonsState);
const tunerVisibleSignal = createSignal(false);
const tunerReadingSignal = createSignal<TunerReadingState>({
  frequency: null,
  targetFrequency: null,
});
const trainingModeUiSignal = createSignal('random');
const uiWorkflowSignal = createSignal<UiWorkflow>('learn-notes');
const uiModeSignal = createSignal<UiMode>('simple');
const loadingViewSignal = createSignal<LoadingViewState>({
  isLoading: false,
  message: '',
});
const modalVisibilitySignal = createSignal<ModalVisibilityState>({
  onboarding: false,
  settings: false,
  userData: false,
  help: false,
  quickHelp: false,
  sessionSummary: false,
  stats: false,
  guide: false,
  links: false,
  profileName: false,
  melodyImport: false,
});
const profileActionsSignal = createSignal<ProfileActionsState>({
  updateDisabled: true,
  deleteDisabled: true,
});
const calibrationViewSignal = createSignal<CalibrationViewState>({
  isVisible: false,
  progressPercent: 0,
  statusText: 'Listening...',
});
const infoSlotsSignal = createSignal<InfoSlotsState>({ slot1: '', slot2: '', slot3: '' });
let isBound = false;
let previousSessionActive = false;
let wasAutoCollapsedForSession = false;
let wasAutoCollapsedMelodySetupForSession = false;
let wasAutoCollapsedSessionToolsForSession = false;

export function bindUiSignals() {
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
    runtimeState: {
      get previousSessionActive() {
        return previousSessionActive;
      },
      set previousSessionActive(value: boolean) {
        previousSessionActive = value;
      },
      get wasAutoCollapsedForSession() {
        return wasAutoCollapsedForSession;
      },
      set wasAutoCollapsedForSession(value: boolean) {
        wasAutoCollapsedForSession = value;
      },
      get wasAutoCollapsedMelodySetupForSession() {
        return wasAutoCollapsedMelodySetupForSession;
      },
      set wasAutoCollapsedMelodySetupForSession(value: boolean) {
        wasAutoCollapsedMelodySetupForSession = value;
      },
      get wasAutoCollapsedSessionToolsForSession() {
        return wasAutoCollapsedSessionToolsForSession;
      },
      set wasAutoCollapsedSessionToolsForSession(value: boolean) {
        wasAutoCollapsedSessionToolsForSession = value;
      },
    },
  });
}

export function setStatusText(statusText: string) {
  statusTextSignal.set(statusText);
}

export function getStatusText() {
  return statusTextSignal.get();
}

export function setPromptText(promptText: string) {
  promptTextSignal.set(promptText);
}

export function getPromptText() {
  return promptTextSignal.get();
}

export function setResultMessage(text: string, tone: ResultTone = 'neutral') {
  resultViewSignal.set({ text, tone });
}

export function clearResultMessage() {
  resultViewSignal.set({ text: '', tone: 'neutral' });
}

export function setVolumeLevel(volumeLevel: number) {
  volumeLevelSignal.set(volumeLevel);
}

export function setStatsView(statsView: StatsViewModel) {
  statsViewSignal.set(statsView);
}

export function setSessionSummaryView(sessionSummary: LastSessionViewModel | null) {
  sessionSummaryViewSignal.set(sessionSummary);
}

export function setTimerValue(timerValue: number | string) {
  timerValueSignal.set(String(timerValue));
}

export function setScoreValue(scoreValue: number | string) {
  scoreValueSignal.set(String(scoreValue));
}

export function setTimedInfoVisible(isVisible: boolean) {
  timedInfoVisibleSignal.set(isVisible);
}

export function setSessionGoalProgress(text: string) {
  sessionGoalProgressSignal.set(text);
}

export function clearSessionGoalProgress() {
  sessionGoalProgressSignal.set('');
}

export function setPracticeSetupCollapsed(collapsed: boolean) {
  practiceSetupCollapsedSignal.set(collapsed);
}

export function getPracticeSetupCollapsed() {
  return practiceSetupCollapsedSignal.get();
}

export function togglePracticeSetupCollapsed() {
  practiceSetupCollapsedSignal.set(!practiceSetupCollapsedSignal.get());
}

export function setMelodySetupCollapsed(collapsed: boolean) {
  melodySetupCollapsedSignal.set(collapsed);
}

export function getMelodySetupCollapsed() {
  return melodySetupCollapsedSignal.get();
}

export function toggleMelodySetupCollapsed() {
  melodySetupCollapsedSignal.set(!melodySetupCollapsedSignal.get());
}

export function setSessionToolsCollapsed(collapsed: boolean) {
  sessionToolsCollapsedSignal.set(collapsed);
}

export function getSessionToolsCollapsed() {
  return sessionToolsCollapsedSignal.get();
}

export function toggleSessionToolsCollapsed() {
  sessionToolsCollapsedSignal.set(!sessionToolsCollapsedSignal.get());
}

export function setLayoutControlsExpanded(expanded: boolean) {
  layoutControlsExpandedSignal.set(expanded);
}

export function toggleLayoutControlsExpanded() {
  layoutControlsExpandedSignal.set(!layoutControlsExpandedSignal.get());
}

export function setPracticeSetupSummary(summaryText: string) {
  practiceSetupSummarySignal.set(summaryText);
}

export function setMelodySetupSummary(summaryText: string) {
  melodySetupSummarySignal.set(summaryText);
}

export function setSessionToolsSummary(summaryText: string) {
  sessionToolsSummarySignal.set(summaryText);
}

export function setInfoSlots(slot1 = '', slot2 = '', slot3 = '') {
  infoSlotsSignal.set({ slot1, slot2, slot3 });
}

export function setSessionButtonsState(partialState: Partial<SessionButtonsState>) {
  const currentState = sessionButtonsSignal.get();
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.startDisabled === nextState.startDisabled &&
    currentState.stopDisabled === nextState.stopDisabled &&
    currentState.hintDisabled === nextState.hintDisabled &&
    currentState.playSoundDisabled === nextState.playSoundDisabled;
  if (isSame) return;
  sessionButtonsSignal.set(nextState);
}

export function resetSessionButtonsState() {
  sessionButtonsSignal.set(defaultSessionButtonsState);
}

export function setTunerVisible(isVisible: boolean) {
  tunerVisibleSignal.set(isVisible);
}

export function setTunerReading(frequency: number | null, targetFrequency: number | null) {
  const currentState = tunerReadingSignal.get();
  if (currentState.frequency === frequency && currentState.targetFrequency === targetFrequency) {
    return;
  }
  tunerReadingSignal.set({ frequency, targetFrequency });
}

export function setTrainingModeUi(mode: string) {
  trainingModeUiSignal.set(mode);
}

export function setUiWorkflow(workflow: UiWorkflow) {
  uiWorkflowSignal.set(workflow);
}

export function refreshLayoutControlsVisibility() {
  syncDisplayControlsVisibilityState({
    mode: trainingModeUiSignal.get(),
    workflow: uiWorkflowSignal.get(),
    layoutControlsExpanded: layoutControlsExpandedSignal.get(),
  });
}

export function setUiMode(uiMode: UiMode) {
  uiModeSignal.set(uiMode);
}

export function setLoadingUi(isLoading: boolean, message = '') {
  loadingViewSignal.set({ isLoading, message });
}

export function setModalVisible(modal: ModalKey, isVisible: boolean) {
  const nextState = resolveNextModalVisibilityState(modalVisibilitySignal.get(), modal, isVisible);
  if (!nextState) return;
  modalVisibilitySignal.set(nextState);
}

export function setProfileActionsState(updateDisabled: boolean, deleteDisabled: boolean) {
  const nextState = resolveNextProfileActionsState(
    profileActionsSignal.get(),
    updateDisabled,
    deleteDisabled
  );
  if (!nextState) return;
  profileActionsSignal.set(nextState);
}

function setCalibrationView(partialState: Partial<CalibrationViewState>) {
  const nextState = resolveNextCalibrationViewState(calibrationViewSignal.get(), partialState);
  if (!nextState) return;
  calibrationViewSignal.set(nextState);
}

export function showCalibrationModal(statusText = 'Listening...') {
  calibrationViewSignal.set(createVisibleCalibrationViewState(statusText));
}

export function hideCalibrationModal() {
  setCalibrationView({ isVisible: false });
}

export function setCalibrationProgress(progressPercent: number) {
  setCalibrationView({ progressPercent });
}

export function setCalibrationStatus(statusText: string) {
  setCalibrationView({ statusText });
}
export function refreshDisplayFormatting() {
  renderPromptText(promptTextSignal.get());
  renderResultView(resultViewSignal.get());
  renderInfoSlots(infoSlotsSignal.get());
  renderStatsView(statsViewSignal.get());
  renderSessionSummaryView(sessionSummaryViewSignal.get());
  renderPracticeSetupSummary(practiceSetupSummarySignal.get());
  renderMelodySetupSummary(melodySetupSummarySignal.get());
  renderSessionToolsSummary(sessionToolsSummarySignal.get());
  renderFormattedSessionGoalProgress(sessionGoalProgressSignal.get());
}

























































