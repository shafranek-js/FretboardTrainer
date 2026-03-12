import { createSessionMelodyWorkflowCluster } from './session-melody-workflow-cluster';
import { createSessionPracticeControlsCluster } from './session-practice-controls-cluster';
import { createSessionSetupUiCluster } from './session-setup-ui-cluster';
import { createSessionWorkflowLayoutCluster } from './session-workflow-layout-cluster';

interface SessionWorkspaceControlsClusterDeps {
  setupUi: Parameters<typeof createSessionSetupUiCluster>[0];
  workflowLayout: {
    workflowLayout: Omit<
      Parameters<typeof createSessionWorkflowLayoutCluster>[0]['workflowLayout'],
      'syncRecommendedDefaultsUi' | 'updatePracticeSetupSummary' | 'updateMelodySetupActionButtons'
    >;
    workflow: Parameters<typeof createSessionWorkflowLayoutCluster>[0]['workflow'];
    workflowLayoutControls: Parameters<typeof createSessionWorkflowLayoutCluster>[0]['workflowLayoutControls'];
  };
  melodyWorkflow: {
    melodySetupControls: Omit<
      Parameters<typeof createSessionMelodyWorkflowCluster>[0]['melodySetupControls'],
      'updateMelodyActionButtonsForSelection' | 'updatePracticeSetupSummary'
    >;
    melodyPracticeActions: Omit<
      Parameters<typeof createSessionMelodyWorkflowCluster>[0]['melodyPracticeActions'],
      'updateMelodyActionButtonsForSelection' | 'updatePracticeSetupSummary'
    >;
    melodyPracticeControls: Parameters<typeof createSessionMelodyWorkflowCluster>[0]['melodyPracticeControls'];
    melodySelection: Omit<
      Parameters<typeof createSessionMelodyWorkflowCluster>[0]['melodySelection'],
      'updateMelodyActionButtonsForSelection' | 'refreshMelodyEmptyState' | 'updatePracticeSetupSummary'
    >;
  };
  practiceControls: {
    practicePresetControls: Parameters<typeof createSessionPracticeControlsCluster>[0]['practicePresetControls'];
    practiceSetupControls: Omit<
      Parameters<typeof createSessionPracticeControlsCluster>[0]['practiceSetupControls'],
      'resolveSessionToolsVisibility' | 'applyUiWorkflowLayout' | 'updatePracticeSetupSummary'
    >;
    instrumentDisplayControls: Omit<
      Parameters<typeof createSessionPracticeControlsCluster>[0]['instrumentDisplayControls'],
      'refreshMelodyOptionsForCurrentInstrument' | 'updatePracticeSetupSummary'
    >;
  };
}

export function createSessionWorkspaceControlsCluster(deps: SessionWorkspaceControlsClusterDeps) {
  const {
    melodySetupUiController,
    practiceSetupSummaryController,
    practicePresetUiController,
  } = createSessionSetupUiCluster(deps.setupUi);

  const { workflowController, workflowLayoutControlsController } = createSessionWorkflowLayoutCluster({
    workflowLayout: {
      ...deps.workflowLayout.workflowLayout,
      syncRecommendedDefaultsUi: () => practicePresetUiController.syncRecommendedDefaultsUi(),
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
      updateMelodySetupActionButtons: () => melodySetupUiController.updateActionButtons(),
    },
    workflow: deps.workflowLayout.workflow,
    workflowLayoutControls: deps.workflowLayout.workflowLayoutControls,
  });

  const {
    melodySetupControlsController,
    melodyPracticeActionsController,
    melodyPracticeControlsController,
    melodySelectionController,
  } = createSessionMelodyWorkflowCluster({
    melodySetupControls: {
      ...deps.melodyWorkflow.melodySetupControls,
      updateMelodyActionButtonsForSelection: () => workflowController.updateMelodyActionButtonsForSelection(),
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
    },
    melodyPracticeActions: {
      ...deps.melodyWorkflow.melodyPracticeActions,
      updateMelodyActionButtonsForSelection: () => workflowController.updateMelodyActionButtonsForSelection(),
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
    },
    melodyPracticeControls: deps.melodyWorkflow.melodyPracticeControls,
    melodySelection: {
      ...deps.melodyWorkflow.melodySelection,
      updateMelodyActionButtonsForSelection: () => workflowController.updateMelodyActionButtonsForSelection(),
      refreshMelodyEmptyState: () => workflowController.refreshMelodyEmptyState(),
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
    },
  });

  const refreshMelodyOptionsForCurrentInstrument = () => {
    melodySelectionController.refreshOptionsForCurrentInstrument();
  };

  const {
    practicePresetControlsController,
    practiceSetupControlsController,
    instrumentDisplayControlsController,
  } = createSessionPracticeControlsCluster({
    practicePresetControls: deps.practiceControls.practicePresetControls,
    practiceSetupControls: {
      ...deps.practiceControls.practiceSetupControls,
      resolveSessionToolsVisibility: (workflow) => workflowController.resolveSessionToolsVisibility(workflow),
      applyUiWorkflowLayout: (workflow) => workflowController.applyUiWorkflowLayout(workflow),
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
    },
    instrumentDisplayControls: {
      ...deps.practiceControls.instrumentDisplayControls,
      refreshMelodyOptionsForCurrentInstrument,
      updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
    },
  });

  return {
    melodySetupUiController,
    practiceSetupSummaryController,
    practicePresetUiController,
    workflowController,
    workflowLayoutControlsController,
    melodySetupControlsController,
    melodyPracticeActionsController,
    melodyPracticeControlsController,
    melodySelectionController,
    practicePresetControlsController,
    practiceSetupControlsController,
    instrumentDisplayControlsController,
    refreshMelodyOptionsForCurrentInstrument,
  };
}
