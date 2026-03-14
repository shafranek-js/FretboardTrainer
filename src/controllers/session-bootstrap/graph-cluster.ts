import { createSessionBootstrapCluster } from './cluster';

interface SessionBootstrapGraphClusterDeps {
  bootstrap: Omit<Parameters<typeof createSessionBootstrapCluster>[0], 'registrations'>;
  controllers: {
    melodyImportControlsController: { register(): void };
    workflowLayoutControlsController: { register(): void };
    melodyEditingControlsController: { register(): void };
    melodyPlaybackControlsController: { register(): void };
    melodyLibraryControlsController: { register(): void };
    practicePresetControlsController: { register(): void };
    practiceSetupControlsController: { register(): void };
    instrumentDisplayControlsController: { register(): void };
    melodySetupControlsController: { register(): void };
    melodyPracticeControlsController: { register(): void };
    sessionTransportControlsController: { register(): void };
    audioInputControlsController: { register(): void };
    studyMelodyMicTuningController: { register(): void };
    metronomeControlsController: { register(): void };
    metronomeController: { registerBeatIndicator(): void };
  };
  registrations: Pick<
    Parameters<typeof createSessionBootstrapCluster>[0]['registrations'],
    'registerModalControls' | 'registerConfirmControls' | 'registerProfileControls'
  >;
}

export function createSessionBootstrapGraphCluster(deps: SessionBootstrapGraphClusterDeps) {
  const { sessionBootstrapController } = createSessionBootstrapCluster({
    ...deps.bootstrap,
    registrations: {
      registerMelodyImportControls: () => deps.controllers.melodyImportControlsController.register(),
      registerWorkflowLayoutControls: () => deps.controllers.workflowLayoutControlsController.register(),
      registerMelodyEditingControls: () => deps.controllers.melodyEditingControlsController.register(),
      registerMelodyPlaybackControls: () => deps.controllers.melodyPlaybackControlsController.register(),
      registerMelodyLibraryControls: () => deps.controllers.melodyLibraryControlsController.register(),
      registerPracticePresetControls: () => deps.controllers.practicePresetControlsController.register(),
      registerPracticeSetupControls: () => deps.controllers.practiceSetupControlsController.register(),
      registerInstrumentDisplayControls: () => deps.controllers.instrumentDisplayControlsController.register(),
      registerMelodySetupControls: () => deps.controllers.melodySetupControlsController.register(),
      registerMelodyPracticeControls: () => deps.controllers.melodyPracticeControlsController.register(),
      registerSessionTransportControls: () => deps.controllers.sessionTransportControlsController.register(),
      registerAudioInputControls: () => deps.controllers.audioInputControlsController.register(),
      registerStudyMelodyMicTuningControls: () => deps.controllers.studyMelodyMicTuningController.register(),
      registerMetronomeControls: () => deps.controllers.metronomeControlsController.register(),
      registerMetronomeBeatIndicator: () => deps.controllers.metronomeController.registerBeatIndicator(),
      ...deps.registrations,
    },
  });

  function registerSessionControls() {
    sessionBootstrapController.registerSessionControls();
  }

  return {
    sessionBootstrapController,
    registerSessionControls,
  };
}

