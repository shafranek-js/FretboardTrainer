import { createSessionBootstrapController } from './controller';
interface SessionBootstrapClusterDeps {
  dom: Parameters<typeof createSessionBootstrapController>[0]['dom'];
  state: Parameters<typeof createSessionBootstrapController>[0]['state'];
  selection: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    | 'setCurriculumPresetSelection'
    | 'getClampedMetronomeBpmFromInput'
    | 'getClampedMelodyDemoBpmFromInput'
    | 'refreshMelodyOptionsForCurrentInstrument'
    | 'getSelectedMelodyId'
  >;
  timeline: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    | 'syncMelodyLoopRangeDisplay'
    | 'setMelodyTimelineStudyRangeCommitHandler'
    | 'handleStudyRangeCommit'
    | 'registerMelodyTimelineEditingInteractionHandlers'
    | 'setMelodyTimelineSeekHandler'
    | 'seekMelodyTimelineToEvent'
    | 'syncMelodyTimelineEditingState'
  >;
  melodyImport: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    'resetMelodyImportDraft' | 'syncMelodyImportModalUi'
  >;
  metronome: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    | 'syncMelodyTimelineZoomDisplay'
    | 'syncScrollingTabZoomDisplay'
    | 'syncMetronomeMeterFromSelectedMelody'
    | 'syncHiddenMetronomeTempoFromSharedTempo'
    | 'syncMetronomeBpmDisplay'
    | 'syncMetronomeVolumeDisplayAndRuntime'
    | 'syncMelodyDemoBpmDisplay'
    | 'resetMetronomeVisualIndicator'
    | 'renderMetronomeToggleButton'
  >;
  ui: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    | 'renderMelodyDemoButtonState'
    | 'updateMicNoiseGateInfo'
    | 'refreshMicPolyphonicDetectorAudioInfoUi'
    | 'refreshMicPerformanceReadinessUi'
    | 'syncPracticePresetUi'
    | 'syncMicPolyphonicTelemetryButtonState'
    | 'mountWorkspaceControls'
    | 'syncUiWorkflowFromTrainingMode'
    | 'applyUiWorkflowLayout'
    | 'setUiMode'
    | 'updatePracticeSetupSummary'
    | 'refreshInputSourceAvailabilityUi'
    | 'refreshAudioInputDeviceOptions'
    | 'refreshMidiInputDevices'
  >;
  registrations: Pick<
    Parameters<typeof createSessionBootstrapController>[0],
    | 'registerMelodyImportControls'
    | 'registerWorkflowLayoutControls'
    | 'registerMelodyEditingControls'
    | 'registerMelodyPlaybackControls'
    | 'registerMelodyLibraryControls'
    | 'registerPracticePresetControls'
    | 'registerPracticeSetupControls'
    | 'registerInstrumentDisplayControls'
    | 'registerMelodySetupControls'
    | 'registerMelodyPracticeControls'
    | 'registerSessionTransportControls'
    | 'registerAudioInputControls'
    | 'registerStudyMelodyMicTuningControls'
    | 'registerMetronomeControls'
    | 'registerMetronomeBeatIndicator'
    | 'registerModalControls'
    | 'registerConfirmControls'
    | 'registerProfileControls'
  >;
}
export function createSessionBootstrapCluster(deps: SessionBootstrapClusterDeps) {
  const sessionBootstrapController = createSessionBootstrapController({
    dom: deps.dom,
    state: deps.state,
    ...deps.selection,
    ...deps.timeline,
    ...deps.melodyImport,
    ...deps.metronome,
    ...deps.ui,
    ...deps.registrations,
  });
  return { sessionBootstrapController };
}

