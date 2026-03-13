import type { Signal } from './reactive/signal';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import type { LoadingViewState } from './ui-loading-view';
import type { SessionControlsSyncResult } from './ui-session-controls-sync';
import type { SessionButtonsState, UiSignalBindingRuntimeState } from './ui-signal-store';
interface BindUiWorkflowSignalsDeps {
  promptTextSignal: Signal<string>;
  timedInfoVisibleSignal: Signal<boolean>;
  sessionButtonsSignal: Signal<SessionButtonsState>;
  trainingModeUiSignal: Signal<string>;
  uiWorkflowSignal: Signal<UiWorkflow>;
  uiModeSignal: Signal<UiMode>;
  loadingViewSignal: Signal<LoadingViewState>;
  practiceSetupCollapsedSignal: Signal<boolean>;
  melodySetupCollapsedSignal: Signal<boolean>;
  sessionToolsCollapsedSignal: Signal<boolean>;
  layoutControlsExpandedSignal: Signal<boolean>;
  practiceSetupSummarySignal: Signal<string>;
  melodySetupSummarySignal: Signal<string>;
  sessionToolsSummarySignal: Signal<string>;
  syncPromptUiState: (state: {
    promptText: string;
    workflow: UiWorkflow;
    sessionActive: boolean;
  }) => void;
  syncTimedInfoUiState: (state: {
    mode: string;
    workflow: UiWorkflow;
    sessionActive: boolean;
    timedInfoVisible: boolean;
  }) => void;
  syncSessionControlsState: (state: {
    startDisabled: boolean;
    stopDisabled: boolean;
    hintDisabled: boolean;
    playSoundDisabled: boolean;
    isLoading: boolean;
    mode: string;
    workflow: UiWorkflow;
    hasPromptText: boolean;
    timedInfoVisible: boolean;
    practiceSetupCollapsed: boolean;
    melodySetupCollapsed: boolean;
    sessionToolsCollapsed: boolean;
    melodySetupToggleHidden: boolean;
    previousSessionActive: boolean;
    wasAutoCollapsedForSession: boolean;
    wasAutoCollapsedMelodySetupForSession: boolean;
    wasAutoCollapsedSessionToolsForSession: boolean;
  }) => SessionControlsSyncResult;
  syncTrainingModeUiState: (state: {
    mode: string;
    workflow: UiWorkflow;
    sessionActive: boolean;
    timedInfoVisible: boolean;
    practiceSetupSummaryText: string;
    melodySetupSummaryText: string;
    sessionToolsSummaryText: string;
    layoutControlsExpanded: boolean;
    showStringTogglesChecked: boolean;
  }) => void;
  syncWorkflowUiState: (state: {
    workflow: UiWorkflow;
    mode: string;
    uiMode: UiMode;
    sessionActive: boolean;
    timedInfoVisible: boolean;
    practiceSetupSummaryText: string;
    melodySetupSummaryText: string;
    sessionToolsSummaryText: string;
    layoutControlsExpanded: boolean;
    showStringTogglesChecked: boolean;
    hasPromptText: boolean;
    startDisabled: boolean;
    stopDisabled: boolean;
    isLoading: boolean;
  }) => void;
  syncUiModeState: (state: { uiMode: UiMode; workflow: UiWorkflow }) => void;
  syncLoadingUiState: (state: {
    isLoading: boolean;
    message: string;
    startDisabled: boolean;
    stopDisabled: boolean;
    workflow: UiWorkflow;
  }) => void;
  syncPracticeSetupCollapsedState: (state: {
    mode: string;
    workflow: UiWorkflow;
    collapsed: boolean;
  }) => void;
  syncMelodySetupCollapsedState: (state: {
    mode: string;
    workflow: UiWorkflow;
    collapsed: boolean;
  }) => void;
  syncSessionToolsCollapsedState: (state: {
    mode: string;
    workflow: UiWorkflow;
    collapsed: boolean;
  }) => void;
  syncDisplayControlsVisibilityState: (state: {
    mode: string;
    workflow: UiWorkflow;
    layoutControlsExpanded: boolean;
  }) => void;
  getShowStringTogglesChecked: () => boolean;
  getMelodySetupToggleHidden: () => boolean;
  runtimeState: UiSignalBindingRuntimeState;
}
export function bindUiWorkflowSignals({
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
  getShowStringTogglesChecked,
  getMelodySetupToggleHidden,
  runtimeState,
}: BindUiWorkflowSignalsDeps) {
  promptTextSignal.subscribe((promptText) => {
    syncPromptUiState({
      promptText,
      workflow: uiWorkflowSignal.get(),
      sessionActive: !sessionButtonsSignal.get().stopDisabled,
    });
  });
  sessionButtonsSignal.subscribe(
    ({ startDisabled, stopDisabled, hintDisabled, playSoundDisabled }) => {
      const transition = syncSessionControlsState({
        startDisabled,
        stopDisabled,
        hintDisabled,
        playSoundDisabled,
        isLoading: loadingViewSignal.get().isLoading,
        mode: trainingModeUiSignal.get(),
        workflow: uiWorkflowSignal.get(),
        hasPromptText: promptTextSignal.get().trim().length > 0,
        timedInfoVisible: timedInfoVisibleSignal.get(),
        practiceSetupCollapsed: practiceSetupCollapsedSignal.get(),
        melodySetupCollapsed: melodySetupCollapsedSignal.get(),
        sessionToolsCollapsed: sessionToolsCollapsedSignal.get(),
        melodySetupToggleHidden: getMelodySetupToggleHidden(),
        previousSessionActive: runtimeState.previousSessionActive,
        wasAutoCollapsedForSession: runtimeState.wasAutoCollapsedForSession,
        wasAutoCollapsedMelodySetupForSession: runtimeState.wasAutoCollapsedMelodySetupForSession,
        wasAutoCollapsedSessionToolsForSession: runtimeState.wasAutoCollapsedSessionToolsForSession,
      });
      if (transition.nextPracticeSetupCollapsed !== null) {
        practiceSetupCollapsedSignal.set(transition.nextPracticeSetupCollapsed);
      }
      if (transition.nextMelodySetupCollapsed !== null) {
        melodySetupCollapsedSignal.set(transition.nextMelodySetupCollapsed);
      }
      if (transition.nextSessionToolsCollapsed !== null) {
        sessionToolsCollapsedSignal.set(transition.nextSessionToolsCollapsed);
      }
      runtimeState.previousSessionActive = transition.previousSessionActive;
      runtimeState.wasAutoCollapsedForSession = transition.wasAutoCollapsedForSession;
      runtimeState.wasAutoCollapsedMelodySetupForSession =
        transition.wasAutoCollapsedMelodySetupForSession;
      runtimeState.wasAutoCollapsedSessionToolsForSession =
        transition.wasAutoCollapsedSessionToolsForSession;
    }
  );
  trainingModeUiSignal.subscribe((mode) => {
    syncTrainingModeUiState({
      mode,
      workflow: uiWorkflowSignal.get(),
      sessionActive: !sessionButtonsSignal.get().stopDisabled,
      timedInfoVisible: timedInfoVisibleSignal.get(),
      practiceSetupSummaryText: practiceSetupSummarySignal.get(),
      melodySetupSummaryText: melodySetupSummarySignal.get(),
      sessionToolsSummaryText: sessionToolsSummarySignal.get(),
      layoutControlsExpanded: layoutControlsExpandedSignal.get(),
      showStringTogglesChecked: getShowStringTogglesChecked(),
    });
  });
  uiWorkflowSignal.subscribe((workflow) => {
    syncWorkflowUiState({
      workflow,
      mode: trainingModeUiSignal.get(),
      uiMode: uiModeSignal.get(),
      sessionActive: !sessionButtonsSignal.get().stopDisabled,
      timedInfoVisible: timedInfoVisibleSignal.get(),
      practiceSetupSummaryText: practiceSetupSummarySignal.get(),
      melodySetupSummaryText: melodySetupSummarySignal.get(),
      sessionToolsSummaryText: sessionToolsSummarySignal.get(),
      layoutControlsExpanded: layoutControlsExpandedSignal.get(),
      showStringTogglesChecked: getShowStringTogglesChecked(),
      hasPromptText: promptTextSignal.get().trim().length > 0,
      startDisabled: sessionButtonsSignal.get().startDisabled,
      stopDisabled: sessionButtonsSignal.get().stopDisabled,
      isLoading: loadingViewSignal.get().isLoading,
    });
  });
  uiModeSignal.subscribe((uiMode) => {
    syncUiModeState({ uiMode, workflow: uiWorkflowSignal.get() });
  });
  loadingViewSignal.subscribe(({ isLoading, message }) => {
    syncLoadingUiState({
      isLoading,
      message,
      startDisabled: sessionButtonsSignal.get().startDisabled,
      stopDisabled: sessionButtonsSignal.get().stopDisabled,
      workflow: uiWorkflowSignal.get(),
    });
  });
  timedInfoVisibleSignal.subscribe(() => {
    syncTimedInfoUiState({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      sessionActive: !sessionButtonsSignal.get().stopDisabled,
      timedInfoVisible: timedInfoVisibleSignal.get(),
    });
  });
  practiceSetupCollapsedSignal.subscribe((collapsed) => {
    syncPracticeSetupCollapsedState({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      collapsed,
    });
  });
  melodySetupCollapsedSignal.subscribe((collapsed) => {
    syncMelodySetupCollapsedState({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      collapsed,
    });
  });
  sessionToolsCollapsedSignal.subscribe((collapsed) => {
    syncSessionToolsCollapsedState({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      collapsed,
    });
  });
  layoutControlsExpandedSignal.subscribe(() => {
    syncDisplayControlsVisibilityState({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      layoutControlsExpanded: layoutControlsExpandedSignal.get(),
    });
  });
}
