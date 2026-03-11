export interface SessionStartControllerDeps {
  isListening: () => boolean;
  clearMelodyTimelinePreviewState: () => void;
  refreshMelodyTimelineUi: () => void;
  startListening: () => Promise<unknown>;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
}

export function createSessionStartController(deps: SessionStartControllerDeps) {
  async function startSessionFromUi() {
    if (deps.isListening()) return;

    deps.clearMelodyTimelinePreviewState();

    try {
      deps.refreshMelodyTimelineUi();
      await deps.startListening();
    } catch (error) {
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to start session', error));
    }
  }

  return {
    startSessionFromUi,
  };
}
