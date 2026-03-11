import { resolveSessionAutoCollapseTransition } from './ui-session-auto-collapse';
import {
  renderHintButtonVisibility,
  renderLearnNotesPromptVisibility,
  renderSessionButtonsDisabled,
  renderSessionToggleButton,
  renderTimedInfoVisibility,
} from './ui-session-controls-view';
import type { UiWorkflow } from './training-workflows';

export interface SessionControlsSyncState {
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
}

export interface SessionControlsSyncResult {
  nextPracticeSetupCollapsed: boolean | null;
  nextMelodySetupCollapsed: boolean | null;
  nextSessionToolsCollapsed: boolean | null;
  previousSessionActive: boolean;
  wasAutoCollapsedForSession: boolean;
  wasAutoCollapsedMelodySetupForSession: boolean;
  wasAutoCollapsedSessionToolsForSession: boolean;
}

export function syncSessionControlsState({
  startDisabled,
  stopDisabled,
  hintDisabled,
  playSoundDisabled,
  isLoading,
  mode,
  workflow,
  hasPromptText,
  timedInfoVisible,
  practiceSetupCollapsed,
  melodySetupCollapsed,
  sessionToolsCollapsed,
  melodySetupToggleHidden,
  previousSessionActive,
  wasAutoCollapsedForSession,
  wasAutoCollapsedMelodySetupForSession,
  wasAutoCollapsedSessionToolsForSession,
}: SessionControlsSyncState): SessionControlsSyncResult {
  const sessionActive = !stopDisabled;

  renderSessionButtonsDisabled({
    startDisabled,
    stopDisabled,
    hintDisabled,
    playSoundDisabled,
    isLoading,
  });

  const transition = resolveSessionAutoCollapseTransition({
    sessionActive,
    previousSessionActive,
    wasAutoCollapsedForSession,
    wasAutoCollapsedMelodySetupForSession,
    wasAutoCollapsedSessionToolsForSession,
    practiceSetupCollapsed,
    melodySetupCollapsed,
    sessionToolsCollapsed,
    melodySetupToggleHidden,
  });

  renderSessionToggleButton({
    startDisabled,
    stopDisabled,
    isLoading,
    workflow,
  });
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

  return {
    nextPracticeSetupCollapsed: transition.nextPracticeSetupCollapsed,
    nextMelodySetupCollapsed: transition.nextMelodySetupCollapsed,
    nextSessionToolsCollapsed: transition.nextSessionToolsCollapsed,
    previousSessionActive: transition.previousSessionActive,
    wasAutoCollapsedForSession: transition.wasAutoCollapsedForSession,
    wasAutoCollapsedMelodySetupForSession: transition.wasAutoCollapsedMelodySetupForSession,
    wasAutoCollapsedSessionToolsForSession: transition.wasAutoCollapsedSessionToolsForSession,
  };
}
