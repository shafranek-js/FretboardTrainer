import { createMelodyDemoRuntimeController } from './melody-demo-runtime-controller';
import { createSessionTransportControlsController } from './session-transport-controls-controller';

interface SessionMelodyDemoClusterDeps {
  melodyDemoRuntime: Parameters<typeof createMelodyDemoRuntimeController>[0];
  sessionTransportControls: Omit<
    Parameters<typeof createSessionTransportControlsController>[0],
    'isMelodyDemoActive' | 'stopMelodyDemoPlayback' | 'findPlayableStringForNote'
  >;
}

export function createSessionMelodyDemoCluster(deps: SessionMelodyDemoClusterDeps) {
  const melodyDemoRuntimeController = createMelodyDemoRuntimeController(deps.melodyDemoRuntime);
  const sessionTransportControlsController = createSessionTransportControlsController({
    ...deps.sessionTransportControls,
    isMelodyDemoActive: () => melodyDemoRuntimeController.isActive(),
    stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
    findPlayableStringForNote: (note) => melodyDemoRuntimeController.findPlayableStringForNote(note),
  });

  return {
    melodyDemoRuntimeController,
    sessionTransportControlsController,
  };
}
