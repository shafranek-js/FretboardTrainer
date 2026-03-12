type AppState = typeof import('./state').state;

interface SessionSeekRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'isListening'
    | 'pendingTimeoutIds'
    | 'currentMelodyEventIndex'
    | 'performanceActiveEventIndex'
    | 'currentMelodyEventFoundNotes'
    | 'pendingSessionStopResultMessage'
  >;
  getTrainingMode: () => string;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  clearTrackedTimeouts: (pendingTimeoutIds: AppState['pendingTimeoutIds']) => void;
  invalidatePendingAdvance: () => void;
  clearPerformanceTimelineFeedback: () => void;
  resetPromptResolution: () => void;
  clearWrongDetectedHighlight: () => void;
  startRuntimeClock: (targetEventIndex?: number) => void;
  nextPrompt: () => void;
}

export function createSessionSeekRuntimeController(deps: SessionSeekRuntimeControllerDeps) {
  function seekToEvent(eventIndex: number) {
    if (!deps.state.isListening) return false;

    const trainingMode = deps.getTrainingMode();
    if (!deps.isMelodyWorkflowMode(trainingMode)) return false;

    deps.clearTrackedTimeouts(deps.state.pendingTimeoutIds);
    deps.invalidatePendingAdvance();
    deps.clearPerformanceTimelineFeedback();
    deps.state.currentMelodyEventIndex = Math.max(0, Math.round(eventIndex));
    deps.state.performanceActiveEventIndex = deps.isPerformanceStyleMode(trainingMode)
      ? deps.state.currentMelodyEventIndex
      : null;
    deps.state.currentMelodyEventFoundNotes.clear();
    deps.resetPromptResolution();
    deps.state.pendingSessionStopResultMessage = null;
    deps.clearWrongDetectedHighlight();
    if (deps.isPerformanceStyleMode(trainingMode)) {
      deps.startRuntimeClock(deps.state.currentMelodyEventIndex);
    }
    deps.nextPrompt();
    return true;
  }

  return {
    seekToEvent,
  };
}
