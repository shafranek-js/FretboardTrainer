export interface SessionAutoCollapseTransitionInput {
  sessionActive: boolean;
  previousSessionActive: boolean;
  wasAutoCollapsedForSession: boolean;
  wasAutoCollapsedMelodySetupForSession: boolean;
  wasAutoCollapsedSessionToolsForSession: boolean;
  practiceSetupCollapsed: boolean;
  melodySetupCollapsed: boolean;
  sessionToolsCollapsed: boolean;
  melodySetupToggleHidden: boolean;
}

export interface SessionAutoCollapseTransitionResult {
  previousSessionActive: boolean;
  wasAutoCollapsedForSession: boolean;
  wasAutoCollapsedMelodySetupForSession: boolean;
  wasAutoCollapsedSessionToolsForSession: boolean;
  nextPracticeSetupCollapsed: boolean | null;
  nextMelodySetupCollapsed: boolean | null;
  nextSessionToolsCollapsed: boolean | null;
}

export function resolveSessionAutoCollapseTransition(
  input: SessionAutoCollapseTransitionInput
): SessionAutoCollapseTransitionResult {
  if (input.sessionActive && !input.previousSessionActive) {
    return {
      previousSessionActive: true,
      wasAutoCollapsedForSession: !input.practiceSetupCollapsed,
      wasAutoCollapsedMelodySetupForSession:
        !input.melodySetupToggleHidden && !input.melodySetupCollapsed,
      wasAutoCollapsedSessionToolsForSession: !input.sessionToolsCollapsed,
      nextPracticeSetupCollapsed: input.practiceSetupCollapsed ? null : true,
      nextMelodySetupCollapsed:
        input.melodySetupToggleHidden || input.melodySetupCollapsed ? null : true,
      nextSessionToolsCollapsed: input.sessionToolsCollapsed ? null : true,
    };
  }

  if (!input.sessionActive && input.previousSessionActive) {
    return {
      previousSessionActive: false,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: false,
      nextPracticeSetupCollapsed: input.wasAutoCollapsedForSession ? false : null,
      nextMelodySetupCollapsed: input.wasAutoCollapsedMelodySetupForSession ? false : null,
      nextSessionToolsCollapsed: input.wasAutoCollapsedSessionToolsForSession ? false : null,
    };
  }

  return {
    previousSessionActive: input.sessionActive,
    wasAutoCollapsedForSession: input.wasAutoCollapsedForSession,
    wasAutoCollapsedMelodySetupForSession: input.wasAutoCollapsedMelodySetupForSession,
    wasAutoCollapsedSessionToolsForSession: input.wasAutoCollapsedSessionToolsForSession,
    nextPracticeSetupCollapsed: null,
    nextMelodySetupCollapsed: null,
    nextSessionToolsCollapsed: null,
  };
}
