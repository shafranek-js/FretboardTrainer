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
  runtimeUi: Omit<Parameters<typeof createSessionRuntimeUiCluster>[0], 'sessionStart'> & {
    sessionStart: Omit<
      Parameters<typeof createSessionRuntimeUiCluster>[0]['sessionStart'],
      'refreshMelodyTimelineUi'
    >;
  };
  melodyDemo: Omit<
    Parameters<typeof createSessionMelodyDemoCluster>[0],
    'melodyDemoRuntime' | 'sessionTransportControls'
  > & {
    melodyDemoRuntime: Parameters<typeof createSessionMelodyDemoCluster>[0]['melodyDemoRuntime'];
    sessionTransportControls: Omit<
      Parameters<typeof createSessionMelodyDemoCluster>[0]['sessionTransportControls'],
      'startSessionFromUi'
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
    createSessionRuntimeUiCluster(deps.runtimeUi);

  const melodyDemoCluster = createSessionMelodyDemoCluster({
    ...deps.melodyDemo,
    melodyDemoRuntime: deps.melodyDemo.melodyDemoRuntime,
    sessionTransportControls: {
      ...deps.melodyDemo.sessionTransportControls,
      startSessionFromUi: () => sessionStartController.startSessionFromUi(),
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
