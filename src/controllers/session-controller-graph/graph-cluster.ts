import { createMelodyImportEditorCluster } from '../melody-import';
import { createSessionConfigurationGraphCluster } from '../session-configuration';
import { createSessionMelodyRuntimeGraphCluster } from '../session-melody-runtime';

interface SessionControllerGraphClusterDeps {
  melodyRuntime: Omit<
    Parameters<typeof createSessionMelodyRuntimeGraphCluster>[0],
    'melodyDemo'
  > & {
    melodyDemo: Omit<
      Parameters<typeof createSessionMelodyRuntimeGraphCluster>[0]['melodyDemo'],
      'sessionTransportControls' | 'melodyDemoRuntime'
    > & {
      melodyDemoRuntime: Omit<
        Parameters<typeof createSessionMelodyRuntimeGraphCluster>[0]['melodyDemo']['melodyDemoRuntime'],
        'startMelodyMetronomeIfEnabled' | 'syncMelodyMetronomeRuntime'
      >;
      sessionTransportControls: Omit<
        Parameters<
          typeof createSessionMelodyRuntimeGraphCluster
        >[0]['melodyDemo']['sessionTransportControls'],
        'applyUiWorkflow'
      >;
    };
  };
  importEditor: Omit<
    Parameters<typeof createMelodyImportEditorCluster>[0],
    | 'getSelectedMelodyId'
    | 'getSelectedMelody'
    | 'finalizeImportSelection'
    | 'stopMelodyDemoPlayback'
  >;
  configurationGraph: Omit<
    Parameters<typeof createSessionConfigurationGraphCluster>[0],
    'workspaceGraph'
  > & {
    workspaceGraph: Omit<
      Parameters<typeof createSessionConfigurationGraphCluster>[0]['workspaceGraph'],
      | 'selectedMelodyContextController'
      | 'melodyPracticeSettingsBridgeController'
      | 'melodyTimelineEditingBridgeController'
      | 'melodyImportWorkspaceController'
      | 'melodyTimelineUiController'
      | 'melodyDemoRuntimeController'
    >;
  };
}

export function createSessionControllerGraphCluster(deps: SessionControllerGraphClusterDeps) {
  const melodyRuntimeGraphCluster = createSessionMelodyRuntimeGraphCluster({
    ...deps.melodyRuntime,
    melodyDemo: {
      ...deps.melodyRuntime.melodyDemo,
      melodyDemoRuntime: {
        ...deps.melodyRuntime.melodyDemo.melodyDemoRuntime,
        startMelodyMetronomeIfEnabled: (options) =>
          configurationGraphCluster.metronomeBridgeController.startMelodyMetronomeIfEnabled(options),
        syncMelodyMetronomeRuntime: () =>
          configurationGraphCluster.metronomeBridgeController.syncMelodyMetronomeRuntime(),
      },
      sessionTransportControls: {
        ...deps.melodyRuntime.melodyDemo.sessionTransportControls,
        applyUiWorkflow: (workflow) =>
          configurationGraphCluster.workflowController.applyUiWorkflow(workflow),
      },
    },
  });

  const melodyImportEditorCluster = createMelodyImportEditorCluster({
    ...deps.importEditor,
    getSelectedMelodyId: () =>
      melodyRuntimeGraphCluster.selectedMelodyContextController.getSelectedMelodyId(),
    getSelectedMelody: () =>
      melodyRuntimeGraphCluster.selectedMelodyContextController.getSelectedMelody(),
    finalizeImportSelection: (melodyId, successMessage) =>
      configurationGraphCluster.melodySelectionController.finalizeImportSelection(
        melodyId,
        successMessage
      ),
    stopMelodyDemoPlayback: (options) =>
      melodyRuntimeGraphCluster.melodyDemoRuntimeController.stopPlayback(options),
  });

  const configurationGraphCluster = createSessionConfigurationGraphCluster({
    ...deps.configurationGraph,
    workspaceGraph: {
      ...deps.configurationGraph.workspaceGraph,
      selectedMelodyContextController: melodyRuntimeGraphCluster.selectedMelodyContextController,
      melodyPracticeSettingsBridgeController:
        melodyRuntimeGraphCluster.melodyPracticeSettingsBridgeController,
      melodyTimelineEditingBridgeController:
        melodyRuntimeGraphCluster.melodyTimelineEditingBridgeController,
      melodyImportWorkspaceController: melodyImportEditorCluster.melodyImportWorkspaceController,
      melodyTimelineUiController: melodyRuntimeGraphCluster.melodyTimelineUiController,
      melodyDemoRuntimeController: melodyRuntimeGraphCluster.melodyDemoRuntimeController,
    },
  });

  return {
    ...melodyRuntimeGraphCluster,
    ...melodyImportEditorCluster,
    ...configurationGraphCluster,
  };
}



