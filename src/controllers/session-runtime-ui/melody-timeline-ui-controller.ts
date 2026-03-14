export interface MelodyTimelineUiControllerDeps {
  renderMelodyTabTimeline(): void;
  syncMelodyTimelineEditingState(): void;
  isMelodyDemoPlaybackActive(): boolean;
  stopMelodyDemoPlayback(options: { clearUi?: boolean; message?: string }): void;
  isListening(): boolean;
  stopListening(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
}

export function createMelodyTimelineUiController(deps: MelodyTimelineUiControllerDeps) {
  function refreshUi() {
    deps.renderMelodyTabTimeline();
    deps.syncMelodyTimelineEditingState();
  }

  function stopPlaybackForEditing() {
    if (deps.isMelodyDemoPlaybackActive()) {
      deps.stopMelodyDemoPlayback({ clearUi: true, message: 'Playback stopped to edit the melody.' });
    }
    if (deps.isListening()) {
      deps.stopListening();
      deps.setResultMessage('Session stopped to edit the melody.');
    }
  }

  return {
    refreshUi,
    stopPlaybackForEditing,
  };
}
