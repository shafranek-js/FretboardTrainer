import { describe, expect, it, vi } from 'vitest';
import { buildSessionEditorBootstrapGraphDeps } from './graph-deps';

type SessionEditorBootstrapGraphDepsArgs = Parameters<
  typeof buildSessionEditorBootstrapGraphDeps
>[0];

function createStub<T>(): T {
  return {} as T;
}

describe('session-editor-bootstrap-graph-deps', () => {
  it('builds bootstrap graph sections through controller bridges', () => {
    const setSelection = vi.fn();
    const getSelectedMelodyId = vi.fn(() => 'melody-1');
    const syncMetronomeMeterFromSelectedMelody = vi.fn();
    const getClampedBpmFromInput = vi.fn(() => 123);
    const getClampedMelodyDemoBpmFromInput = vi.fn(() => 132);
    const syncMelodyLoopRangeDisplay = vi.fn();
    const handleStudyRangeChange = vi.fn();
    const registerMelodyTimelineEditingInteractionHandlers = vi.fn();
    const setMelodyTimelineStudyRangeCommitHandler = vi.fn();
    const setMelodyTimelineSeekHandler = vi.fn();
    const seekToEvent = vi.fn();
    const syncState = vi.fn();
    const resetDraft = vi.fn();
    const syncUi = vi.fn();
    const syncMelodyTimelineZoomDisplay = vi.fn();
    const syncScrollingTabZoomDisplay = vi.fn();
    const syncHiddenMetronomeTempoFromSharedTempo = vi.fn();
    const syncMetronomeBpmDisplay = vi.fn();
    const syncMetronomeVolumeDisplayAndRuntime = vi.fn();
    const syncMelodyDemoBpmDisplay = vi.fn();
    const resetVisualIndicator = vi.fn();
    const renderMetronomeToggleButton = vi.fn();
    const renderButtonState = vi.fn();
    const updateMicNoiseGateInfo = vi.fn();
    const refreshMicPolyphonicDetectorAudioInfoUi = vi.fn();
    const refreshMicPerformanceReadinessUi = vi.fn();
    const syncPracticePresetUi = vi.fn();
    const syncButtonState = vi.fn();
    const mountWorkspaceControls = vi.fn();
    const syncUiWorkflowFromTrainingMode = vi.fn();
    const applyUiWorkflowLayout = vi.fn();
    const setUiMode = vi.fn();
    const updatePracticeSetupSummary = vi.fn();
    const refreshInputSourceAvailabilityUi = vi.fn();
    const refreshAudioInputDeviceOptions = vi.fn();
    const refreshMidiInputDevices = vi.fn();

    const args = {
      dom: createStub<SessionEditorBootstrapGraphDepsArgs['dom']>(),
      state: createStub<SessionEditorBootstrapGraphDepsArgs['state']>(),
      maxFret: 19,
      saveSettings: vi.fn(),
      stopListening: vi.fn(),
      setPracticeSetupCollapsed: vi.fn(),
      setResultMessage: vi.fn(),
      isMelodyWorkflowMode: vi.fn(),
      isTextEntryElement: vi.fn(),
      isElementWithin: vi.fn(),
      isAnyBlockingModalOpen: vi.fn(),
      clearMelodyTimelineContextMenu: vi.fn(),
      renderMelodyTabTimelineFromState: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(),
      confirmUserAction: vi.fn(),
      isCustomMelodyId: vi.fn(),
      deleteCustomMelody: vi.fn(),
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      selectedMelodyContextController: {
        getSelectedMelodyId,
        syncMetronomeMeterFromSelectedMelody,
      },
      melodyTimelineEditingBridgeController: { syncState },
      melodyEventEditorBridgeController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodyEventEditorBridgeController']
      >(),
      melodyTimelineUiController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodyTimelineUiController']
      >(),
      melodyDemoRuntimeController: {
        getClampedBpmFromInput: getClampedMelodyDemoBpmFromInput,
        seekToEvent,
        syncBpmDisplay: syncMelodyDemoBpmDisplay,
        renderButtonState,
      },
      melodyLibraryActionsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodyLibraryActionsController']
      >(),
      curriculumPresetBridgeController: { setSelection },
      practiceSetupSummaryController: { update: updatePracticeSetupSummary },
      melodyPracticeSettingsBridgeController: { syncMelodyLoopRangeDisplay },
      melodyPracticeActionsController: { handleStudyRangeChange },
      melodyImportWorkspaceController: { resetDraft, syncUi },
      registerMelodyTimelineEditingInteractionHandlers,
      setMelodyTimelineStudyRangeCommitHandler,
      setMelodyTimelineSeekHandler,
      metronomeRuntimeBridgeController: {
        getClampedBpmFromInput,
        syncBpmDisplay: syncMetronomeBpmDisplay,
        resetVisualIndicator,
      },
      metronomeBridgeController: {
        syncMelodyTimelineZoomDisplay,
        syncScrollingTabZoomDisplay,
        syncHiddenMetronomeTempoFromSharedTempo,
        syncMetronomeVolumeDisplayAndRuntime,
        renderMetronomeToggleButton,
      },
      micSettingsController: { updateNoiseGateInfo: updateMicNoiseGateInfo },
      refreshMicPolyphonicDetectorAudioInfoUi,
      refreshMicPerformanceReadinessUi,
      practicePresetUiController: { syncPracticePresetUi },
      micPolyphonicTelemetryController: { syncButtonState },
      workflowController: {
        mountWorkspaceControls,
        syncUiWorkflowFromTrainingMode,
        applyUiWorkflowLayout,
      },
      setUiMode,
      refreshInputSourceAvailabilityUi,
      refreshAudioInputDeviceOptions,
      refreshMidiInputDevices,
      melodyImportControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodyImportControlsController']
      >(),
      workflowLayoutControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['workflowLayoutControlsController']
      >(),
      practicePresetControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['practicePresetControlsController']
      >(),
      practiceSetupControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['practiceSetupControlsController']
      >(),
      instrumentDisplayControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['instrumentDisplayControlsController']
      >(),
      melodySetupControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodySetupControlsController']
      >(),
      melodyPracticeControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['melodyPracticeControlsController']
      >(),
      sessionTransportControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['sessionTransportControlsController']
      >(),
      audioInputControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['audioInputControlsController']
      >(),
      metronomeControlsController: createStub<
        SessionEditorBootstrapGraphDepsArgs['metronomeControlsController']
      >(),
      metronomeController: createStub<SessionEditorBootstrapGraphDepsArgs['metronomeController']>(),
      registerModalControls: vi.fn(),
      registerConfirmControls: vi.fn(),
      registerProfileControls: vi.fn(),
    } as unknown as SessionEditorBootstrapGraphDepsArgs;

    const result = buildSessionEditorBootstrapGraphDeps(args);

    expect(result.editorGraph.state).toBe(args.state);
    expect(result.bootstrapGraph.bootstrap.state).toBe(args.state);

    result.bootstrapGraph.bootstrap.selection.setCurriculumPresetSelection('default');
    expect(setSelection).toHaveBeenCalledWith('default');
    expect(result.bootstrapGraph.bootstrap.selection.getClampedMetronomeBpmFromInput()).toBe(123);
    expect(result.bootstrapGraph.bootstrap.selection.getClampedMelodyDemoBpmFromInput()).toBe(132);
    expect(result.bootstrapGraph.bootstrap.selection.getSelectedMelodyId()).toBe('melody-1');

    result.bootstrapGraph.bootstrap.timeline.syncMelodyLoopRangeDisplay();
    result.bootstrapGraph.bootstrap.timeline.handleStudyRangeCommit({ startIndex: 1, endIndex: 3 });
    result.bootstrapGraph.bootstrap.timeline.registerMelodyTimelineEditingInteractionHandlers();
    result.bootstrapGraph.bootstrap.timeline.setMelodyTimelineStudyRangeCommitHandler(vi.fn());
    result.bootstrapGraph.bootstrap.timeline.setMelodyTimelineSeekHandler(vi.fn());
    result.bootstrapGraph.bootstrap.timeline.seekMelodyTimelineToEvent(8, { commit: true });
    result.bootstrapGraph.bootstrap.timeline.syncMelodyTimelineEditingState();

    expect(syncMelodyLoopRangeDisplay).toHaveBeenCalledTimes(1);
    expect(handleStudyRangeChange).toHaveBeenCalledWith(
      { startIndex: 1, endIndex: 3 },
      { stopMessage: 'Study range adjusted. Session stopped; press Start to continue.' }
    );
    expect(registerMelodyTimelineEditingInteractionHandlers).toHaveBeenCalledTimes(1);
    expect(setMelodyTimelineStudyRangeCommitHandler).toHaveBeenCalledTimes(1);
    expect(setMelodyTimelineSeekHandler).toHaveBeenCalledTimes(1);
    expect(seekToEvent).toHaveBeenCalledWith(8, { commit: true });
    expect(syncState).toHaveBeenCalledTimes(1);

    result.bootstrapGraph.bootstrap.melodyImport.resetMelodyImportDraft();
    result.bootstrapGraph.bootstrap.melodyImport.syncMelodyImportModalUi();
    expect(resetDraft).toHaveBeenCalledTimes(1);
    expect(syncUi).toHaveBeenCalledTimes(1);

    result.bootstrapGraph.bootstrap.metronome.syncMelodyTimelineZoomDisplay();
    result.bootstrapGraph.bootstrap.metronome.syncScrollingTabZoomDisplay();
    result.bootstrapGraph.bootstrap.metronome.syncMetronomeMeterFromSelectedMelody();
    result.bootstrapGraph.bootstrap.metronome.syncHiddenMetronomeTempoFromSharedTempo();
    result.bootstrapGraph.bootstrap.metronome.syncMetronomeBpmDisplay();
    result.bootstrapGraph.bootstrap.metronome.syncMetronomeVolumeDisplayAndRuntime();
    result.bootstrapGraph.bootstrap.metronome.syncMelodyDemoBpmDisplay();
    result.bootstrapGraph.bootstrap.metronome.resetMetronomeVisualIndicator();
    result.bootstrapGraph.bootstrap.metronome.renderMetronomeToggleButton();

    expect(syncMelodyTimelineZoomDisplay).toHaveBeenCalledTimes(1);
    expect(syncScrollingTabZoomDisplay).toHaveBeenCalledTimes(1);
    expect(syncMetronomeMeterFromSelectedMelody).toHaveBeenCalledTimes(1);
    expect(syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(syncMetronomeBpmDisplay).toHaveBeenCalledTimes(1);
    expect(syncMetronomeVolumeDisplayAndRuntime).toHaveBeenCalledTimes(1);
    expect(syncMelodyDemoBpmDisplay).toHaveBeenCalledTimes(1);
    expect(resetVisualIndicator).toHaveBeenCalledTimes(1);
    expect(renderMetronomeToggleButton).toHaveBeenCalledTimes(1);

    result.bootstrapGraph.bootstrap.ui.renderMelodyDemoButtonState();
    result.bootstrapGraph.bootstrap.ui.updateMicNoiseGateInfo();
    result.bootstrapGraph.bootstrap.ui.refreshMicPolyphonicDetectorAudioInfoUi();
    result.bootstrapGraph.bootstrap.ui.refreshMicPerformanceReadinessUi();
    result.bootstrapGraph.bootstrap.ui.syncPracticePresetUi();
    result.bootstrapGraph.bootstrap.ui.syncMicPolyphonicTelemetryButtonState();
    result.bootstrapGraph.bootstrap.ui.mountWorkspaceControls();
    result.bootstrapGraph.bootstrap.ui.syncUiWorkflowFromTrainingMode();
    result.bootstrapGraph.bootstrap.ui.applyUiWorkflowLayout('perform');
    result.bootstrapGraph.bootstrap.ui.setUiMode('simple');
    result.bootstrapGraph.bootstrap.ui.updatePracticeSetupSummary();
    result.bootstrapGraph.bootstrap.ui.refreshInputSourceAvailabilityUi();
    result.bootstrapGraph.bootstrap.ui.refreshAudioInputDeviceOptions();
    result.bootstrapGraph.bootstrap.ui.refreshMidiInputDevices();

    expect(renderButtonState).toHaveBeenCalledTimes(1);
    expect(updateMicNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
    expect(refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(syncButtonState).toHaveBeenCalledTimes(1);
    expect(mountWorkspaceControls).toHaveBeenCalledTimes(1);
    expect(syncUiWorkflowFromTrainingMode).toHaveBeenCalledTimes(1);
    expect(applyUiWorkflowLayout).toHaveBeenCalledWith('perform');
    expect(setUiMode).toHaveBeenCalledWith('simple');
    expect(updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(refreshInputSourceAvailabilityUi).toHaveBeenCalledTimes(1);
    expect(refreshAudioInputDeviceOptions).toHaveBeenCalledTimes(1);
    expect(refreshMidiInputDevices).toHaveBeenCalledTimes(1);
  });
});

