import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import { syncDisplayControlsVisibilityState } from './ui-workflow-sync';
import {
  defaultSessionButtonsState,
  layoutControlsExpandedSignal,
  loadingViewSignal,
  melodySetupCollapsedSignal,
  practiceSetupCollapsedSignal,
  sessionButtonsSignal,
  sessionToolsCollapsedSignal,
  timedInfoVisibleSignal,
  trainingModeUiSignal,
  uiModeSignal,
  uiWorkflowSignal,
  type SessionButtonsState,
} from './ui-signal-store';

export function setTimedInfoVisible(isVisible: boolean) {
  timedInfoVisibleSignal.set(isVisible);
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
