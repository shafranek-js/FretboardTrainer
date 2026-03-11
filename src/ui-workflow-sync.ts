import { dom } from './dom';
import { getTrainingModeUiVisibility } from './training-mode-ui';
import type { TrainingModeUiVisibility } from './training-mode-ui';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import {
  renderDisplayControlsModeVisibilityView,
  renderMelodySetupModeVisibilityView,
  renderPlaybackControlsModeVisibilityView,
  renderPracticeSetupModeVisibilityView,
  renderSessionToolsModeVisibilityView,
  renderTrainingModeFieldVisibilityView,
  renderTrainingModeWorkflowOptionsView,
  renderUiModeSwitcherView,
  renderUiModeVisibilityView,
  renderWorkflowCopyView,
  renderWorkflowSwitcherView,
} from './ui-workflow-layout-view';
import {
  renderHintButtonVisibility,
  renderLearnNotesPromptVisibility,
  renderSessionToggleButton,
  renderTimedInfoVisibility,
} from './ui-session-controls-view';
import { renderLoadingView } from './ui-loading-view';
import {
  getMelodySelectionSectionCopy,
  getTrainingModeFieldCopy,
  getWorkflowUiCopy,
} from './workflow-ui-copy';
import { resolveWorkflowLayout, type WorkflowLayout } from './workflow-layout';

interface WorkflowLayoutState {
  mode: string;
  workflow: UiWorkflow;
}

interface TrainingModeUiSyncState extends WorkflowLayoutState {
  sessionActive: boolean;
  timedInfoVisible: boolean;
  practiceSetupSummaryText: string;
  melodySetupSummaryText: string;
  sessionToolsSummaryText: string;
  layoutControlsExpanded: boolean;
  showStringTogglesChecked: boolean;
}

interface WorkflowUiSyncState extends TrainingModeUiSyncState {
  uiMode: UiMode;
  hasPromptText: boolean;
  startDisabled: boolean;
  stopDisabled: boolean;
  isLoading: boolean;
}

interface UiModeSyncState {
  uiMode: UiMode;
  workflow: UiWorkflow;
}

interface LoadingUiSyncState {
  isLoading: boolean;
  message: string;
  startDisabled: boolean;
  stopDisabled: boolean;
  workflow: UiWorkflow;
}

interface DisplayControlsSyncState extends WorkflowLayoutState {
  layoutControlsExpanded: boolean;
}

function resolveCurrentWorkflowLayout({ mode, workflow }: WorkflowLayoutState) {
  return resolveWorkflowLayout({
    workflow,
    trainingMode: mode,
    showTabTimeline: dom.melodyShowTabTimeline.checked,
    showScrollingTab: dom.melodyShowScrollingTab.checked,
  });
}

function setPanelToggleVisualState(button: HTMLButtonElement, expanded: boolean) {
  button.classList.toggle('bg-slate-700', expanded);
  button.classList.toggle('text-white', expanded);
  button.classList.toggle('shadow-inner', expanded);
  button.classList.toggle('shadow-black/20', expanded);
  button.classList.toggle('bg-transparent', !expanded);
  button.classList.toggle('text-slate-300', !expanded);
  button.classList.toggle('hover:bg-slate-800/70', !expanded);
}

function setWorkflowButtonVisualState(button: HTMLButtonElement, active: boolean) {
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('border-cyan-400/80', active);
  button.classList.toggle('bg-cyan-600', active);
  button.classList.toggle('text-white', active);
  button.classList.toggle('shadow-inner', active);
  button.classList.toggle('shadow-black/20', active);
  button.classList.toggle('border-slate-500/80', !active);
  button.classList.toggle('bg-slate-800/70', !active);
  button.classList.toggle('text-slate-200', !active);
}

function renderWorkflowLayoutVisibility(
  layout: WorkflowLayout,
  visibility: TrainingModeUiVisibility,
  workflow: UiWorkflow,
  summaryText: {
    practice: string;
    melody: string;
    sessionTools: string;
  },
  layoutControlsExpanded: boolean,
  showStringTogglesChecked: boolean
) {
  renderPracticeSetupModeVisibilityView(
    layout,
    summaryText.practice,
    setPanelToggleVisualState
  );
  renderMelodySetupModeVisibilityView(
    layout,
    summaryText.melody,
    setPanelToggleVisualState
  );
  renderPlaybackControlsModeVisibilityView(layout, visibility, workflow);
  renderDisplayControlsModeVisibilityView(
    layout,
    layoutControlsExpanded,
    setPanelToggleVisualState
  );
  renderSessionToolsModeVisibilityView(
    layout,
    summaryText.sessionTools,
    layout.sessionTools.showShowStringTogglesRow && showStringTogglesChecked,
    setPanelToggleVisualState
  );
}

export function syncTrainingModeUiState({
  mode,
  workflow,
  sessionActive,
  timedInfoVisible,
  practiceSetupSummaryText,
  melodySetupSummaryText,
  sessionToolsSummaryText,
  layoutControlsExpanded,
  showStringTogglesChecked,
}: TrainingModeUiSyncState) {
  const visibility = getTrainingModeUiVisibility(mode);
  const layout = resolveCurrentWorkflowLayout({ mode, workflow });

  renderTrainingModeFieldVisibilityView({
    visibility,
    trainingModeCopy: getTrainingModeFieldCopy(workflow),
  });
  renderHintButtonVisibility({
    mode,
    workflow,
    sessionActive,
  });
  renderTimedInfoVisibility({
    mode,
    workflow,
    sessionActive,
    timedInfoVisible,
  });
  renderWorkflowLayoutVisibility(
    layout,
    visibility,
    workflow,
    {
      practice: practiceSetupSummaryText,
      melody: melodySetupSummaryText,
      sessionTools: sessionToolsSummaryText,
    },
    layoutControlsExpanded,
    showStringTogglesChecked
  );
}

export function syncWorkflowUiState({
  workflow,
  mode,
  uiMode,
  sessionActive,
  timedInfoVisible,
  practiceSetupSummaryText,
  melodySetupSummaryText,
  sessionToolsSummaryText,
  layoutControlsExpanded,
  showStringTogglesChecked,
  hasPromptText,
  startDisabled,
  stopDisabled,
  isLoading,
}: WorkflowUiSyncState) {
  const visibility = getTrainingModeUiVisibility(mode);
  const layout = resolveCurrentWorkflowLayout({ mode, workflow });

  renderWorkflowSwitcherView(workflow, setWorkflowButtonVisualState);
  renderWorkflowCopyView({
    workflow,
    copy: getWorkflowUiCopy(workflow),
    melodySelectionCopy: getMelodySelectionSectionCopy(workflow),
    trainingModeCopy: getTrainingModeFieldCopy(workflow),
  });
  renderTrainingModeWorkflowOptionsView(workflow);
  renderUiModeVisibilityView(uiMode, workflow === 'learn-notes');
  renderHintButtonVisibility({
    mode,
    workflow,
    sessionActive,
  });
  renderLearnNotesPromptVisibility({
    workflow,
    sessionActive,
    hasPromptText,
  });
  renderTimedInfoVisibility({
    mode,
    workflow,
    sessionActive,
    timedInfoVisible,
  });
  renderWorkflowLayoutVisibility(
    layout,
    visibility,
    workflow,
    {
      practice: practiceSetupSummaryText,
      melody: melodySetupSummaryText,
      sessionTools: sessionToolsSummaryText,
    },
    layoutControlsExpanded,
    showStringTogglesChecked
  );
  renderSessionToggleButton({
    startDisabled,
    stopDisabled,
    isLoading,
    workflow,
  });
}

export function syncUiModeState({ uiMode, workflow }: UiModeSyncState) {
  renderUiModeSwitcherView(uiMode, setWorkflowButtonVisualState);
  renderUiModeVisibilityView(uiMode, workflow === 'learn-notes');
}

export function syncLoadingUiState({
  isLoading,
  message,
  startDisabled,
  stopDisabled,
  workflow,
}: LoadingUiSyncState) {
  renderLoadingView({ isLoading, message }, { startDisabled });
  renderSessionToggleButton({
    startDisabled,
    stopDisabled,
    isLoading,
    workflow,
  });
}

export function syncDisplayControlsVisibilityState({
  mode,
  workflow,
  layoutControlsExpanded,
}: DisplayControlsSyncState) {
  renderDisplayControlsModeVisibilityView(
    resolveCurrentWorkflowLayout({ mode, workflow }),
    layoutControlsExpanded,
    setPanelToggleVisualState
  );
}
