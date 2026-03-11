import { renderPromptText } from './ui-feedback-view';
import {
  renderLearnNotesPromptVisibility,
  renderTimedInfoVisibility,
} from './ui-session-controls-view';
import type { UiWorkflow } from './training-workflows';

interface PromptUiSyncState {
  promptText: string;
  workflow: UiWorkflow;
  sessionActive: boolean;
}

interface TimedInfoUiSyncState {
  mode: string;
  workflow: UiWorkflow;
  sessionActive: boolean;
  timedInfoVisible: boolean;
}

export function syncPromptUiState({ promptText, workflow, sessionActive }: PromptUiSyncState) {
  renderPromptText(promptText);
  renderLearnNotesPromptVisibility({
    workflow,
    sessionActive,
    hasPromptText: promptText.trim().length > 0,
  });
}

export function syncTimedInfoUiState({
  mode,
  workflow,
  sessionActive,
  timedInfoVisible,
}: TimedInfoUiSyncState) {
  renderTimedInfoVisibility({
    mode,
    workflow,
    sessionActive,
    timedInfoVisible,
  });
}
