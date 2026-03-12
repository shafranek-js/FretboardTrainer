import { createMelodyTimelineEditingController } from './melody-timeline-editing-controller';
import { createSessionMelodyControlsCluster } from './session-melody-controls-cluster';
import { createStudyMelodyMicTuningController } from './study-melody-mic-tuning-controller';

interface SessionEditorControlsClusterDeps {
  studyMelodyMicTuning: Parameters<typeof createStudyMelodyMicTuningController>[0];
  melodyTimelineEditing: Parameters<typeof createMelodyTimelineEditingController>[0];
  melodyControls: {
    melodyEditingControls: Omit<
      Parameters<typeof createSessionMelodyControlsCluster>[0]['melodyEditingControls'],
      'handleTimelineHotkey' | 'clearMelodyTimelineSelection'
    >;
    melodyPlaybackControls: Parameters<typeof createSessionMelodyControlsCluster>[0]['melodyPlaybackControls'];
    melodyLibraryControls: Parameters<typeof createSessionMelodyControlsCluster>[0]['melodyLibraryControls'];
  };
}

export function createSessionEditorControlsCluster(deps: SessionEditorControlsClusterDeps) {
  const studyMelodyMicTuningController = createStudyMelodyMicTuningController(deps.studyMelodyMicTuning);
  const melodyTimelineEditingController = createMelodyTimelineEditingController(deps.melodyTimelineEditing);
  const {
    melodyEditingControlsController,
    melodyPlaybackControlsController,
    melodyLibraryControlsController,
  } = createSessionMelodyControlsCluster({
    melodyEditingControls: {
      ...deps.melodyControls.melodyEditingControls,
      handleTimelineHotkey: (event) => melodyTimelineEditingController.handleHotkey(event),
      clearMelodyTimelineSelection: () => melodyTimelineEditingController.clearSelection(),
    },
    melodyPlaybackControls: deps.melodyControls.melodyPlaybackControls,
    melodyLibraryControls: deps.melodyControls.melodyLibraryControls,
  });

  return {
    studyMelodyMicTuningController,
    melodyTimelineEditingController,
    melodyEditingControlsController,
    melodyPlaybackControlsController,
    melodyLibraryControlsController,
  };
}
