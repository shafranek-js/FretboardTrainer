import { describe, expect, it, vi } from 'vitest';

type SessionControllerGraphClusterDeps = Parameters<
  typeof import('./graph-cluster').createSessionControllerGraphCluster
>[0];

const {
  createSessionMelodyRuntimeGraphCluster,
  createMelodyImportEditorCluster,
  createSessionConfigurationGraphCluster,
} = vi.hoisted(() => ({
  createSessionMelodyRuntimeGraphCluster: vi.fn(),
  createMelodyImportEditorCluster: vi.fn(),
  createSessionConfigurationGraphCluster: vi.fn(),
}));

vi.mock('../session-melody-runtime', () => ({
  createSessionMelodyRuntimeGraphCluster,
}));
vi.mock('../melody-import', () => ({
  createMelodyImportEditorCluster,
}));
vi.mock('../session-configuration', () => ({
  createSessionConfigurationGraphCluster,
}));

describe('session-controller-graph-cluster', () => {
  it('wires runtime, import/editor, and configuration graphs through shared top-level callbacks', async () => {
    const applyUiWorkflow = vi.fn();
    const finalizeImportSelection = vi.fn();
    const stopPlayback = vi.fn();
    const startMelodyMetronomeIfEnabled = vi.fn();
    const syncMelodyMetronomeRuntime = vi.fn();

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
      metronomeBridgeController: {
        startMelodyMetronomeIfEnabled,
        syncMelodyMetronomeRuntime,
        id: 'metronomeBridge',
      },
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
      metronomeControlsController: { id: 'metronomeControls' },
      curriculumPresetBridgeController: { id: 'curriculumBridge' },
      micSettingsController: { id: 'micSettings' },
      micPolyphonicTelemetryController: { id: 'telemetry' },
      audioInputControlsController: { id: 'audioInput' },
      practiceSetupSummaryController: { id: 'summary' },
      practicePresetUiController: { id: 'practiceUi' },
    });

    const { createSessionControllerGraphCluster } = await import('./graph-cluster');

    const deps: SessionControllerGraphClusterDeps = {
      melodyRuntime: {
        melodySettings: {} as SessionControllerGraphClusterDeps['melodyRuntime']['melodySettings'],
        melodyTimelineEditing:
          {} as SessionControllerGraphClusterDeps['melodyRuntime']['melodyTimelineEditing'],
        runtimeUi: {} as SessionControllerGraphClusterDeps['melodyRuntime']['runtimeUi'],
        melodyDemo: {
          melodyDemoRuntime:
            {} as SessionControllerGraphClusterDeps['melodyRuntime']['melodyDemo']['melodyDemoRuntime'],
          sessionTransportControls:
            {} as SessionControllerGraphClusterDeps['melodyRuntime']['melodyDemo']['sessionTransportControls'],
        },
      },
      importEditor: {} as SessionControllerGraphClusterDeps['importEditor'],
      configurationGraph: {
        metronome: {} as SessionControllerGraphClusterDeps['configurationGraph']['metronome'],
        curriculumPreset:
          {} as SessionControllerGraphClusterDeps['configurationGraph']['curriculumPreset'],
        inputControls:
          {
            micSettings:
              {} as SessionControllerGraphClusterDeps['configurationGraph']['inputControls']['micSettings'],
            audioInputControls: {
              dom: {} as SessionControllerGraphClusterDeps['configurationGraph']['inputControls']['audioInputControls']['dom'],
            },
          } as SessionControllerGraphClusterDeps['configurationGraph']['inputControls'],
        workspaceGraph:
          {} as SessionControllerGraphClusterDeps['configurationGraph']['workspaceGraph'],
      },
    };

    const result = createSessionControllerGraphCluster(deps);

    const runtimeArgs = createSessionMelodyRuntimeGraphCluster.mock.calls[0][0];
    const importArgs = createMelodyImportEditorCluster.mock.calls[0][0];
    const configArgs = createSessionConfigurationGraphCluster.mock.calls[0][0];

    runtimeArgs.melodyDemo.sessionTransportControls.applyUiWorkflow('perform');
    runtimeArgs.melodyDemo.melodyDemoRuntime.startMelodyMetronomeIfEnabled({ alignToPerformanceTimeMs: 42 });
    runtimeArgs.melodyDemo.melodyDemoRuntime.syncMelodyMetronomeRuntime();
    importArgs.finalizeImportSelection('melody-1', 'saved');
    importArgs.stopMelodyDemoPlayback({ clearUi: true });

    expect(applyUiWorkflow).toHaveBeenCalledWith('perform');
    expect(startMelodyMetronomeIfEnabled).toHaveBeenCalledWith({ alignToPerformanceTimeMs: 42 });
    expect(syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(finalizeImportSelection).toHaveBeenCalledWith('melody-1', 'saved');
    expect(stopPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(configArgs.workspaceGraph.selectedMelodyContextController.getSelectedMelodyId()).toBe('melody-1');
    expect(configArgs.workspaceGraph.melodyImportWorkspaceController.id).toBe('importWorkspace');
    expect(result.workflowController.id).toBe('workflow');
    expect(result.melodyImportControlsController.id).toBe('importControls');
    expect(result.sessionTransportControlsController.id).toBe('transport');
  });
});


