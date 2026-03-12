import { describe, expect, it, vi } from 'vitest';
import { createSessionBootstrapCluster } from './session-bootstrap-cluster';

function createDeps() {
  return {
    dom: {
      metronomeBpm: { value: '' },
      melodyDemoBpm: { value: '' },
      timelineViewMode: { value: '' },
      showTimelineSteps: { checked: false },
      showTimelineDetails: { checked: false },
    },
    state: {
      melodyTimelineViewMode: 'beats',
      showMelodyTimelineSteps: true,
      showMelodyTimelineDetails: false,
      uiWorkflow: 'practice',
      uiMode: 'advanced',
    },
    selection: {
      setCurriculumPresetSelection: vi.fn(),
      getClampedMetronomeBpmFromInput: vi.fn(() => 88),
      getClampedMelodyDemoBpmFromInput: vi.fn(() => 92),
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      getSelectedMelodyId: vi.fn(() => 'melody-1'),
    },
    timeline: {
      syncMelodyLoopRangeDisplay: vi.fn(),
      setMelodyTimelineStudyRangeCommitHandler: vi.fn(),
      handleStudyRangeCommit: vi.fn(),
      registerMelodyTimelineEditingInteractionHandlers: vi.fn(),
      setMelodyTimelineSeekHandler: vi.fn(),
      seekMelodyTimelineToEvent: vi.fn(),
      syncMelodyTimelineEditingState: vi.fn(),
    },
    melodyImport: {
      resetMelodyImportDraft: vi.fn(),
      syncMelodyImportModalUi: vi.fn(),
    },
    metronome: {
      syncMelodyTimelineZoomDisplay: vi.fn(),
      syncScrollingTabZoomDisplay: vi.fn(),
      syncMetronomeMeterFromSelectedMelody: vi.fn(),
      syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
      syncMetronomeBpmDisplay: vi.fn(),
      syncMetronomeVolumeDisplayAndRuntime: vi.fn(),
      syncMelodyDemoBpmDisplay: vi.fn(),
      resetMetronomeVisualIndicator: vi.fn(),
      renderMetronomeToggleButton: vi.fn(),
    },
    ui: {
      renderMelodyDemoButtonState: vi.fn(),
      updateMicNoiseGateInfo: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      syncPracticePresetUi: vi.fn(),
      syncMicPolyphonicTelemetryButtonState: vi.fn(),
      mountWorkspaceControls: vi.fn(),
      syncUiWorkflowFromTrainingMode: vi.fn(),
      applyUiWorkflowLayout: vi.fn(),
      setUiMode: vi.fn(),
      updatePracticeSetupSummary: vi.fn(),
      refreshInputSourceAvailabilityUi: vi.fn(),
      refreshAudioInputDeviceOptions: vi.fn(async () => {}),
      refreshMidiInputDevices: vi.fn(async () => {}),
    },
    registrations: {
      registerMelodyImportControls: vi.fn(),
      registerWorkflowLayoutControls: vi.fn(),
      registerMelodyEditingControls: vi.fn(),
      registerMelodyPlaybackControls: vi.fn(),
      registerMelodyLibraryControls: vi.fn(),
      registerPracticePresetControls: vi.fn(),
      registerPracticeSetupControls: vi.fn(),
      registerInstrumentDisplayControls: vi.fn(),
      registerMelodySetupControls: vi.fn(),
      registerMelodyPracticeControls: vi.fn(),
      registerSessionTransportControls: vi.fn(),
      registerAudioInputControls: vi.fn(),
      registerStudyMelodyMicTuningControls: vi.fn(),
      registerMetronomeControls: vi.fn(),
      registerMetronomeBeatIndicator: vi.fn(),
      registerModalControls: vi.fn(),
      registerConfirmControls: vi.fn(),
      registerProfileControls: vi.fn(),
    },
  };
}

describe('session-bootstrap-cluster', () => {
  it('creates the session bootstrap controller from grouped dependencies', () => {
    const cluster = createSessionBootstrapCluster(createDeps() as never);

    expect(cluster.sessionBootstrapController).toBeTruthy();
  });
});
