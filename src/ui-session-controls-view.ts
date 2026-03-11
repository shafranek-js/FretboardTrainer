import { dom } from './dom';
import { getTrainingModeUiVisibility } from './training-mode-ui';
import type { UiWorkflow } from './training-workflows';
import { getWorkflowUiCopy } from './workflow-ui-copy';

export interface SessionButtonsDisabledState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
  isLoading: boolean;
}

export interface SessionToggleViewState {
  startDisabled: boolean;
  stopDisabled: boolean;
  isLoading: boolean;
  workflow: UiWorkflow;
}

export interface SessionHintVisibilityState {
  mode: string;
  workflow: UiWorkflow;
  sessionActive: boolean;
}

export interface LearnNotesPromptVisibilityState {
  workflow: UiWorkflow;
  sessionActive: boolean;
  hasPromptText: boolean;
}

export interface TimedInfoVisibilityState {
  mode: string;
  workflow: UiWorkflow;
  sessionActive: boolean;
  timedInfoVisible: boolean;
}

export function renderSessionButtonsDisabled(state: SessionButtonsDisabledState) {
  dom.startBtn.disabled = state.startDisabled || state.isLoading;
  dom.stopBtn.disabled = state.stopDisabled;
  dom.hintBtn.disabled = state.hintDisabled;
  dom.playSoundBtn.disabled = state.playSoundDisabled;
}

export function renderSessionToggleButton(state: SessionToggleViewState) {
  const isStopMode = !state.stopDisabled;
  const workflowCopy = getWorkflowUiCopy(state.workflow);
  const hideStartActions = !isStopMode && (state.workflow === 'library' || state.workflow === 'editor');
  const startActionDisabled = hideStartActions ? true : state.startDisabled || state.isLoading;

  dom.sessionToggleBtn.textContent = isStopMode ? 'Stop Session' : workflowCopy.primaryActionLabel;
  dom.sessionToggleBtn.setAttribute(
    'aria-label',
    isStopMode ? 'Stop current session' : workflowCopy.primaryActionAriaLabel
  );
  dom.sessionToggleBtn.disabled = isStopMode ? state.stopDisabled : startActionDisabled;
  dom.sessionToggleBtn.dataset.sessionState = isStopMode ? 'stop' : 'start';
  dom.sessionToggleBtn.classList.toggle('hidden', hideStartActions);
  dom.sessionToggleBtn.style.display = hideStartActions ? 'none' : 'flex';
  dom.startSessionHelpBtn.classList.toggle('hidden', hideStartActions);
  dom.startSessionHelpBtn.style.display = hideStartActions ? 'none' : '';
}

export function renderHintButtonVisibility(state: SessionHintVisibilityState) {
  const visibility = getTrainingModeUiVisibility(state.mode);
  const showHintButton =
    state.workflow === 'learn-notes' && state.sessionActive && visibility.showHintButton;
  dom.hintControlsHost.classList.toggle('hidden', !showHintButton);
  dom.hintControlsHost.style.display = showHintButton ? 'flex' : 'none';
  dom.hintBtn.style.display = showHintButton ? 'inline-flex' : 'none';
}

export function renderLearnNotesPromptVisibility(state: LearnNotesPromptVisibilityState) {
  const showLearnNotesPrompt =
    state.workflow === 'learn-notes' && state.sessionActive && state.hasPromptText;
  dom.learnNotesPromptHost.classList.toggle('hidden', !showLearnNotesPrompt);
  dom.learnNotesPromptHost.style.display = showLearnNotesPrompt ? 'flex' : 'none';
}

export function renderTimedInfoVisibility(state: TimedInfoVisibilityState) {
  const showTimedInfo =
    state.workflow === 'learn-notes' &&
    state.mode === 'timed' &&
    state.sessionActive &&
    state.timedInfoVisible;
  dom.timedInfo.classList.toggle('hidden', !showTimedInfo);
  dom.timedInfo.style.display = showTimedInfo ? 'inline-flex' : 'none';
}
