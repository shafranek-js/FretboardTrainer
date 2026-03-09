import { describe, expect, it, vi } from 'vitest';
import { createSessionBootstrapController } from './session-bootstrap-controller';

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
    setCurriculumPresetSelection: vi.fn(),
    getClampedMetronomeBpmFromInput: vi.fn(() => 88),
    getClampedMelodyDemoBpmFromInput: vi.fn(() => 92),
    syncMelodyLoopRangeDisplay: vi.fn(),
    syncMelodyTimelineZoomDisplay: vi.fn(),
    syncScrollingTabZoomDisplay: vi.fn(),
    syncMetronomeMeterFromSelectedMelody: vi.fn(),
    syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
    syncMetronomeBpmDisplay: vi.fn(),
    syncMetronomeVolumeDisplayAndRuntime: vi.fn(),
    syncMelodyDemoBpmDisplay: vi.fn(),
    refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    setMelodyTimelineStudyRangeCommitHandler: vi.fn(),
    getSelectedMelodyId: vi.fn(() => 'melody-1'),
    handleStudyRangeCommit: vi.fn(),
    registerMelodyTimelineEditingInteractionHandlers: vi.fn(),
    setMelodyTimelineSeekHandler: vi.fn(),
    seekMelodyTimelineToEvent: vi.fn(),
    resetMelodyImportDraft: vi.fn(),
    syncMelodyImportModalUi: vi.fn(),
    renderMelodyDemoButtonState: vi.fn(),
    resetMetronomeVisualIndicator: vi.fn(),
    renderMetronomeToggleButton: vi.fn(),
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
    syncMelodyTimelineEditingState: vi.fn(),
    refreshInputSourceAvailabilityUi: vi.fn(),
    refreshAudioInputDeviceOptions: vi.fn(async () => {}),
    refreshMidiInputDevices: vi.fn(async () => {}),
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
    registerMetronomeControls: vi.fn(),
    registerMetronomeBeatIndicator: vi.fn(),
  };
}

describe('session-bootstrap-controller', () => {
  it('hydrates initial control state and registers child controllers', () => {
    const deps = createDeps();
    const controller = createSessionBootstrapController(deps as never);

    controller.initialize();

    expect(deps.setCurriculumPresetSelection).toHaveBeenCalledWith('custom');
    expect(deps.dom.metronomeBpm.value).toBe('88');
    expect(deps.dom.melodyDemoBpm.value).toBe('92');
    expect(deps.dom.timelineViewMode.value).toBe('beats');
    expect(deps.dom.showTimelineSteps.checked).toBe(true);
    expect(deps.dom.showTimelineDetails.checked).toBe(false);
    expect(deps.syncMelodyLoopRangeDisplay).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyTimelineZoomDisplay).toHaveBeenCalledTimes(1);
    expect(deps.syncScrollingTabZoomDisplay).toHaveBeenCalledTimes(1);
    expect(deps.syncMetronomeMeterFromSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyDemoBpmDisplay).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
    expect(deps.mountWorkspaceControls).toHaveBeenCalledTimes(1);
    expect(deps.applyUiWorkflowLayout).toHaveBeenCalledWith('practice');
    expect(deps.setUiMode).toHaveBeenCalledWith('advanced');
    expect(deps.registerSessionTransportControls).toHaveBeenCalledTimes(1);
    expect(deps.registerAudioInputControls).toHaveBeenCalledTimes(1);
    expect(deps.registerMetronomeBeatIndicator).toHaveBeenCalledTimes(1);
  });

  it('wires study range commit and seek handlers to the selected melody only', () => {
    const deps = createDeps();
    const controller = createSessionBootstrapController(deps as never);

    controller.initialize();

    const studyHandler = deps.setMelodyTimelineStudyRangeCommitHandler.mock.calls[0][0];
    const seekHandler = deps.setMelodyTimelineSeekHandler.mock.calls[0][0];

    studyHandler({ melodyId: 'other', range: { startIndex: 0, endIndex: 1 } });
    studyHandler({ melodyId: 'melody-1', range: { startIndex: 1, endIndex: 2 } });
    seekHandler({ melodyId: 'other', eventIndex: 3, commit: true });
    seekHandler({ melodyId: 'melody-1', eventIndex: 4, commit: false });

    expect(deps.handleStudyRangeCommit).toHaveBeenCalledTimes(1);
    expect(deps.handleStudyRangeCommit).toHaveBeenCalledWith({ startIndex: 1, endIndex: 2 });
    expect(deps.seekMelodyTimelineToEvent).toHaveBeenCalledTimes(1);
    expect(deps.seekMelodyTimelineToEvent).toHaveBeenCalledWith(4, { commit: false });
  });
});
