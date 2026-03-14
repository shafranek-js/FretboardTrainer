import { describe, expect, it, vi } from 'vitest';

const {
  createSessionMelodySettingsCluster,
  createSessionMelodyTimelineEditingCluster,
  createSessionRuntimeUiCluster,
  createSessionMelodyDemoCluster,
} = vi.hoisted(() => ({
  createSessionMelodySettingsCluster: vi.fn(),
  createSessionMelodyTimelineEditingCluster: vi.fn(),
  createSessionRuntimeUiCluster: vi.fn(),
  createSessionMelodyDemoCluster: vi.fn(),
}));

vi.mock('../session-melody', () => ({
  createSessionMelodyDemoCluster,
  createSessionMelodySettingsCluster,
  createSessionMelodyTimelineEditingCluster,
}));
vi.mock('../session-runtime-ui', () => ({
  createSessionRuntimeUiCluster,
}));

describe('session-melody-runtime-graph-cluster', () => {
  it('wires settings, runtime-ui, and melody-demo callbacks through the graph layer', async () => {
    const clearPreviewState = vi.fn();
    const stopPlayback = vi.fn();
    const startSessionFromUi = vi.fn();
    const syncState = vi.fn();
    const getSelectedMelodyId = vi.fn(() => 'melody-1');
    const getStoredMelodyStudyRange = vi.fn(() => ({ startIndex: 1, endIndex: 3 }));
    const syncMelodyLoopRangeDisplay = vi.fn();

    createSessionMelodySettingsCluster.mockReturnValue({
      selectedMelodyContextController: { getSelectedMelodyId, id: 'selected' },
      melodyPracticeSettingsController: { id: 'practice' },
      melodyPracticeSettingsBridgeController: { getStoredMelodyStudyRange, syncMelodyLoopRangeDisplay, id: 'bridge' },
    });
    createSessionMelodyTimelineEditingCluster.mockReturnValue({
      melodyTimelineEditingOrchestrator: { id: 'timeline' },
      melodyTimelineEditingBridgeController: { syncState, id: 'timelineBridge' },
    });
    createSessionRuntimeUiCluster.mockReturnValue({
      melodyTimelineUiController: { id: 'timelineUi' },
      sessionStartController: { startSessionFromUi },
      interactionGuardsController: { id: 'guards' },
    });
    createSessionMelodyDemoCluster.mockReturnValue({
      melodyDemoRuntimeController: { clearPreviewState, stopPlayback, isActive: () => true },
      sessionTransportControlsController: { id: 'transport' },
    });

    const { createSessionMelodyRuntimeGraphCluster } = await import('./graph-cluster');

    const deps = {
      melodySettings: {
        selectedMelodyContext: {} as any,
        melodyPracticeSettings: {} as any,
        melodyPracticeSettingsBridge: {} as any,
      },
      melodyTimelineEditing: {
        melodyTimelineEditingOrchestrator: {} as any,
      },
      runtimeUi: {
        melodyTimelineUi: {} as any,
        sessionStart: {} as any,
        interactionGuards: {} as any,
      },
      melodyDemo: {
        melodyDemoRuntime: {} as any,
        sessionTransportControls: {
          applyUiWorkflow: vi.fn(),
        } as any,
      },
    };

    const result = createSessionMelodyRuntimeGraphCluster(deps as any);
    const settingsArgs = createSessionMelodySettingsCluster.mock.calls[0][0];
    const runtimeUiArgs = createSessionRuntimeUiCluster.mock.calls[0][0];
    const demoArgs = createSessionMelodyDemoCluster.mock.calls[0][0];

    settingsArgs.melodyPracticeSettings.clearPreviewState();
    runtimeUiArgs.melodyTimelineUi.syncMelodyTimelineEditingState();
    expect(runtimeUiArgs.melodyTimelineUi.isMelodyDemoPlaybackActive()).toBe(true);
    runtimeUiArgs.melodyTimelineUi.stopMelodyDemoPlayback({ clearUi: true });
    demoArgs.melodyDemoRuntime.getSelectedMelodyId();
    demoArgs.melodyDemoRuntime.getStoredMelodyStudyRange('melody-1', 8);
    demoArgs.melodyDemoRuntime.syncMelodyLoopRangeDisplay();
    demoArgs.sessionTransportControls.startSessionFromUi();
    demoArgs.sessionTransportControls.getSelectedMelodyId();

    expect(clearPreviewState).toHaveBeenCalledTimes(1);
    expect(syncState).toHaveBeenCalledTimes(1);
    expect(stopPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(getSelectedMelodyId).toHaveBeenCalledTimes(2);
    expect(getStoredMelodyStudyRange).toHaveBeenCalledWith('melody-1', 8);
    expect(syncMelodyLoopRangeDisplay).toHaveBeenCalledTimes(1);
    expect(startSessionFromUi).toHaveBeenCalledTimes(1);
    expect(result.melodyDemoRuntimeController.clearPreviewState).toBe(clearPreviewState);
    expect(result.sessionTransportControlsController.id).toBe('transport');
  });
});
