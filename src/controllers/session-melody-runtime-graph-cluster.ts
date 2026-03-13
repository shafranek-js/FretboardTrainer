import { createSessionMelodySettingsCluster } from './session-melody-settings-cluster';
import { createSessionMelodyTimelineEditingCluster } from './session-melody-timeline-editing-cluster';
import { createSessionRuntimeUiCluster } from './session-runtime-ui-cluster';
import { createSessionMelodyDemoCluster } from './session-melody-demo-cluster';

interface SessionMelodyRuntimeGraphClusterDeps {
  melodySettings: Omit<
    Parameters<typeof createSessionMelodySettingsCluster>[0],
    'melodyPracticeSettings'
  > & {
    melodyPracticeSettings: Omit<
      Parameters<typeof createSessionMelodySettingsCluster>[0]['melodyPracticeSettings'],
      'clearPreviewState'
    >;
  };
  melodyTimelineEditing: Parameters<typeof createSessionMelodyTimelineEditingCluster>[0];
  runtimeUi: {
    melodyTimelineUi: Omit<
      Parameters<typeof createSessionRuntimeUiCluster>[0]['melodyTimelineUi'],
      'syncMelodyTimelineEditingState' | 'isMelodyDemoPlaybackActive' | 'stopMelodyDemoPlayback'
    >;
    sessionStart: Omit<
      Parameters<typeof createSessionRuntimeUiCluster>[0]['sessionStart'],
      'refreshMelodyTimelineUi'
    >;
    interactionGuards: Parameters<typeof createSessionRuntimeUiCluster>[0]['interactionGuards'];
  };
  melodyDemo: Omit<
    Parameters<typeof createSessionMelodyDemoCluster>[0],
    'melodyDemoRuntime' | 'sessionTransportControls'
  > & {
    melodyDemoRuntime: Omit<
      Parameters<typeof createSessionMelodyDemoCluster>[0]['melodyDemoRuntime'],
      'getSelectedMelodyId' | 'getStoredMelodyStudyRange' | 'syncMelodyLoopRangeDisplay'
    >;
    sessionTransportControls: Omit<
      Parameters<typeof createSessionMelodyDemoCluster>[0]['sessionTransportControls'],
      'startSessionFromUi' | 'getSelectedMelodyId'
    >;
  };
}

export function createSessionMelodyRuntimeGraphCluster(deps: SessionMelodyRuntimeGraphClusterDeps) {
  const {
    selectedMelodyContextController,
    melodyPracticeSettingsController,
    melodyPracticeSettingsBridgeController,
  } = createSessionMelodySettingsCluster({
    ...deps.melodySettings,
    melodyPracticeSettings: {
      ...deps.melodySettings.melodyPracticeSettings,
      clearPreviewState: () => melodyDemoCluster.melodyDemoRuntimeController.clearPreviewState(),
    },
  });

  const { melodyTimelineEditingOrchestrator, melodyTimelineEditingBridgeController } =
    createSessionMelodyTimelineEditingCluster(deps.melodyTimelineEditing);

  const { melodyTimelineUiController, sessionStartController, interactionGuardsController } =
    createSessionRuntimeUiCluster({
      ...deps.runtimeUi,
      melodyTimelineUi: {
        ...deps.runtimeUi.melodyTimelineUi,
        syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
        isMelodyDemoPlaybackActive: () => melodyDemoCluster.melodyDemoRuntimeController.isActive(),
        stopMelodyDemoPlayback: (options) =>
          melodyDemoCluster.melodyDemoRuntimeController.stopPlayback(options),
      },
    });

  const melodyDemoCluster = createSessionMelodyDemoCluster({
    ...deps.melodyDemo,
    melodyDemoRuntime: {
      ...deps.melodyDemo.melodyDemoRuntime,
      getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
      getStoredMelodyStudyRange: (melodyId, totalEvents) =>
        melodyPracticeSettingsBridgeController.getStoredMelodyStudyRange(melodyId, totalEvents),
      syncMelodyLoopRangeDisplay: () =>
        melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
    },
    sessionTransportControls: {
      ...deps.melodyDemo.sessionTransportControls,
      startSessionFromUi: () => sessionStartController.startSessionFromUi(),
      getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
    },
  });

  return {
    selectedMelodyContextController,
    melodyPracticeSettingsController,
    melodyPracticeSettingsBridgeController,
    melodyTimelineEditingOrchestrator,
    melodyTimelineEditingBridgeController,
    melodyTimelineUiController,
    sessionStartController,
    interactionGuardsController,
    melodyDemoRuntimeController: melodyDemoCluster.melodyDemoRuntimeController,
    sessionTransportControlsController: melodyDemoCluster.sessionTransportControlsController,
  };
}
