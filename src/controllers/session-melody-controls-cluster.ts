import { createMelodyEditingControlsController } from './melody-editing-controls-controller';
import { createMelodyLibraryControlsController } from './melody-library-controls-controller';
import { createMelodyPlaybackControlsController } from './melody-playback-controls-controller';

interface SessionMelodyControlsClusterDeps {
  melodyEditingControls: Parameters<typeof createMelodyEditingControlsController>[0];
  melodyPlaybackControls: Parameters<typeof createMelodyPlaybackControlsController>[0];
  melodyLibraryControls: Parameters<typeof createMelodyLibraryControlsController>[0];
}

export function createSessionMelodyControlsCluster(deps: SessionMelodyControlsClusterDeps) {
  const melodyEditingControlsController = createMelodyEditingControlsController(deps.melodyEditingControls);
  const melodyPlaybackControlsController = createMelodyPlaybackControlsController(deps.melodyPlaybackControls);
  const melodyLibraryControlsController = createMelodyLibraryControlsController(deps.melodyLibraryControls);

  return {
    melodyEditingControlsController,
    melodyPlaybackControlsController,
    melodyLibraryControlsController,
  };
}
