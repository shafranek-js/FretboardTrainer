import { describe, expect, it, vi } from 'vitest';

const {
  createSessionMelodyRuntimeGraphCluster,
  createMelodyImportEditorCluster,
  createSessionConfigurationGraphCluster,
} = vi.hoisted(() => ({
  createSessionMelodyRuntimeGraphCluster: vi.fn(),
  createMelodyImportEditorCluster: vi.fn(),
  createSessionConfigurationGraphCluster: vi.fn(),
}));

vi.mock('./session-melody-runtime-graph-cluster', () => ({
  createSessionMelodyRuntimeGraphCluster,
}));
vi.mock('./melody-import-editor-cluster', () => ({
  createMelodyImportEditorCluster,
}));
vi.mock('./session-configuration-graph-cluster', () => ({
  createSessionConfigurationGraphCluster,
}));

describe('session-controller-graph-cluster', () => {
  it('wires runtime, import/editor, and configuration graphs through shared top-level callbacks', async () => {
    const applyUiWorkflow = vi.fn();
    const finalizeImportSelection = vi.fn();
    const stopPlayback = vi.fn();

    createSessionMelodyRuntimeGraphCluster.mockReturnValue({
      selectedMelodyContextController: {
        getSelectedMelodyId: vi.fn(() => 'melody-1'),
        getSelectedMelody: vi.fn(() => ({ id: 'melody-1' })),
      },
      melodyPracticeSettingsBridgeController: { id: 'practiceBridge' },
      melodyTimelineEditingBridgeController: { id: 'timelineBridge' },
      melodyTimelineUiController: { id: 'timelineUi' },
      interactionGuardsController: { id: 'guards' },
      melodyDemoRuntimeController: { stopPlayback, id: 'demoRuntime' },
      sessionTransportControlsController: { id: 'transport' },
    });
    createMelodyImportEditorCluster.mockReturnValue({
      melodyEventEditorBridgeController: { id: 'eventEditorBridge' },
      melodyImportEditorBridgeController: { id: 'importEditorBridge' },
      melodyImportWorkspaceController: { id: 'importWorkspace' },
      melodyLibraryActionsController: { id: 'libraryActions' },
      melodyImportControlsController: { id: 'importControls' },
    });
    createSessionConfigurationGraphCluster.mockReturnValue({
      workflowController: { applyUiWorkflow, id: 'workflow' },
      melodySelectionController: { finalizeImportSelection, id: 'selection' },
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      workflowLayoutControlsController: { id: 'workflowLayout' },
      practicePresetControlsController: { id: 'practicePreset' },
      practiceSetupControlsController: { id: 'practiceSetup' },
      instrumentDisplayControlsController: { id: 'instrumentDisplay' },
      melodySetupControlsController: { id: 'melodySetup' },
      melodyPracticeActionsController: { id: 'practiceActions' },
      melodyPracticeControlsController: { id: 'practiceControls' },
      metronomeController: { id: 'metronome' },
      metronomeRuntimeBridgeController: { id: 'metronomeRuntime' },
      metronomeBridgeController: { id: 'metronomeBridge' },
      metronomeControlsController: { id: 'metronomeControls' },
      curriculumPresetBridgeController: { id: 'curriculumBridge' },
      micSettingsController: { id: 'micSettings' },
      micPolyphonicTelemetryController: { id: 'telemetry' },
      audioInputControlsController: { id: 'audioInput' },
      practiceSetupSummaryController: { id: 'summary' },
      practicePresetUiController: { id: 'practiceUi' },
    });

    const { createSessionControllerGraphCluster } = await import('./session-controller-graph-cluster');

    const result = createSessionControllerGraphCluster({
      melodyRuntime: {
        melodySettings: {} as any,
        melodyTimelineEditing: {} as any,
        runtimeUi: {} as any,
        melodyDemo: {
          melodyDemoRuntime: {} as any,
          sessionTransportControls: {} as any,
        },
      },
      importEditor: {
        dom: {} as any,
        state: {} as any,
        cloneDraft: vi.fn(),
        formatUserFacingError: vi.fn(),
        setResultMessage: vi.fn(),
        getCurrentInstrument: vi.fn(),
        setMelodyImportModalVisible: vi.fn(),
        getSelectedMidiImportQuantize: vi.fn(),
        parseAsciiTabToEvents: vi.fn(),
        loadGpScoreFromBytes: vi.fn(),
        convertLoadedGpScoreTrackToImportedMelody: vi.fn(),
        loadMidiFileFromBytes: vi.fn(),
        loadMusescoreFileFromBytes: vi.fn(),
        convertLoadedMidiTrackToImportedMelody: vi.fn(),
        convertLoadedMusescoreTrackToImportedMelody: vi.fn(),
        saveCustomEventMelody: vi.fn(),
        updateCustomEventMelody: vi.fn(),
        saveCustomAsciiTabMelody: vi.fn(),
        updateCustomAsciiTabMelody: vi.fn(),
        exportMelodyToMidiBytes: vi.fn(),
        buildExportMidiFileName: vi.fn(),
        getPracticeAdjustedMelody: vi.fn(),
        getPracticeAdjustedBakeBpm: vi.fn(),
        getPracticeAdjustmentSummary: vi.fn(),
        showNonBlockingError: vi.fn(),
      },
      configurationGraph: {
        metronome: {} as any,
        curriculumPreset: {} as any,
        inputControls: {} as any,
        workspaceGraph: {
          dom: {} as any,
          state: {} as any,
        } as any,
      },
    } as any);

    const runtimeArgs = createSessionMelodyRuntimeGraphCluster.mock.calls[0][0];
    const importArgs = createMelodyImportEditorCluster.mock.calls[0][0];
    const configArgs = createSessionConfigurationGraphCluster.mock.calls[0][0];

    runtimeArgs.melodyDemo.sessionTransportControls.applyUiWorkflow('perform');
    importArgs.finalizeImportSelection('melody-1', 'saved');
    importArgs.stopMelodyDemoPlayback({ clearUi: true });

    expect(applyUiWorkflow).toHaveBeenCalledWith('perform');
    expect(finalizeImportSelection).toHaveBeenCalledWith('melody-1', 'saved');
    expect(stopPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(configArgs.workspaceGraph.selectedMelodyContextController.getSelectedMelodyId()).toBe('melody-1');
    expect(configArgs.workspaceGraph.melodyImportWorkspaceController.id).toBe('importWorkspace');
    expect(result.workflowController.id).toBe('workflow');
    expect(result.melodyImportControlsController.id).toBe('importControls');
    expect(result.sessionTransportControlsController.id).toBe('transport');
  });
});
