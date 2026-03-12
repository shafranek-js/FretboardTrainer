import { describe, expect, it, vi } from 'vitest';

const {
  createSessionMetronomeCluster,
  createSessionCurriculumPresetCluster,
  createSessionInputControlsCluster,
  createSessionWorkspaceGraphCluster,
} = vi.hoisted(() => ({
  createSessionMetronomeCluster: vi.fn(),
  createSessionCurriculumPresetCluster: vi.fn(),
  createSessionInputControlsCluster: vi.fn(),
  createSessionWorkspaceGraphCluster: vi.fn(),
}));

vi.mock('./session-metronome-cluster', () => ({
  createSessionMetronomeCluster,
}));
vi.mock('./session-curriculum-preset-cluster', () => ({
  createSessionCurriculumPresetCluster,
}));
vi.mock('./session-input-controls-cluster', () => ({
  createSessionInputControlsCluster,
}));
vi.mock('./session-workspace-graph-cluster', () => ({
  createSessionWorkspaceGraphCluster,
}));

describe('session-configuration-graph-cluster', () => {
  it('wires metronome, curriculum, input, and workspace cross-dependencies through one graph', async () => {
    const syncPracticePresetUi = vi.fn();
    const applySuggestedMicLatency = vi.fn();
    const startMicLatencyCalibration = vi.fn();

    createSessionMetronomeCluster.mockReturnValue({
      metronomeController: { id: 'metronome' },
      metronomeRuntimeBridgeController: { id: 'runtime' },
      melodyTempoController: { id: 'tempo' },
      metronomeBridgeController: { id: 'metronomeBridge' },
      metronomeControlsController: { id: 'metronomeControls' },
    });
    createSessionCurriculumPresetCluster.mockReturnValue({
      curriculumPresetController: { id: 'curriculum' },
      curriculumPresetBridgeController: { id: 'curriculumBridge' },
    });
    createSessionInputControlsCluster.mockReturnValue({
      micSettingsController: { id: 'micSettings' },
      inputDeviceController: { id: 'inputDevice' },
      micPolyphonicBenchmarkController: { id: 'benchmark' },
      micPolyphonicTelemetryController: { id: 'telemetry' },
      audioInputControlsController: { id: 'audioInputControls' },
    });
    createSessionWorkspaceGraphCluster.mockReturnValue({
      melodySetupUiController: { id: 'setupUi' },
      practiceSetupSummaryController: { id: 'summary' },
      practicePresetUiController: { syncPracticePresetUi },
      workflowController: { id: 'workflow' },
      workflowLayoutControlsController: { id: 'layout' },
      melodySetupControlsController: { id: 'melodySetup' },
      melodyPracticeActionsController: { id: 'practiceActions' },
      melodyPracticeControlsController: { id: 'practiceControls' },
      melodySelectionController: { id: 'selection' },
      practicePresetControlsController: {
        applySuggestedMicLatency,
        startMicLatencyCalibration,
      },
      practiceSetupControlsController: { id: 'practiceSetup' },
      instrumentDisplayControlsController: { id: 'instrumentDisplay' },
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    });

    const { createSessionConfigurationGraphCluster } = await import('./session-configuration-graph-cluster');

    const result = createSessionConfigurationGraphCluster({
      metronome: {} as any,
      curriculumPreset: {} as any,
      inputControls: {
        micSettings: {} as any,
        inputDevice: {} as any,
        micPolyphonicBenchmark: {} as any,
        micPolyphonicTelemetry: {} as any,
        audioInputControls: {
          dom: {} as any,
        },
      },
      workspaceGraph: {
        dom: {} as any,
        state: {} as any,
      } as any,
    });

    const inputArgs = createSessionInputControlsCluster.mock.calls[0][0];
    const workspaceArgs = createSessionWorkspaceGraphCluster.mock.calls[0][0];

    inputArgs.micSettings.syncPracticePresetUi();
    inputArgs.audioInputControls.applySuggestedMicLatency();
    inputArgs.audioInputControls.startMicLatencyCalibration();

    expect(syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(applySuggestedMicLatency).toHaveBeenCalledTimes(1);
    expect(startMicLatencyCalibration).toHaveBeenCalledTimes(1);
    expect(workspaceArgs.metronomeBridgeController.id).toBe('metronomeBridge');
    expect(workspaceArgs.curriculumPresetBridgeController.id).toBe('curriculumBridge');
    expect(workspaceArgs.micSettingsController.id).toBe('micSettings');
    expect(result.workflowController.id).toBe('workflow');
    expect(result.metronomeControlsController.id).toBe('metronomeControls');
    expect(result.inputDeviceController.id).toBe('inputDevice');
  });
});
