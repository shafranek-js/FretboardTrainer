import { createWorkflowLayoutController } from './workflow-layout-controller';
import { createWorkflowController } from './workflow-controller';
import { createWorkflowLayoutControlsController } from './workflow-layout-controls-controller';

interface SessionWorkflowLayoutClusterDeps {
  workflowLayout: Parameters<typeof createWorkflowLayoutController>[0];
  workflow: {
    dom: Parameters<typeof createWorkflowController>[0]['dom'];
    listAvailableMelodyIds: Parameters<typeof createWorkflowController>[0]['listAvailableMelodyIds'];
  };
  workflowLayoutControls: Omit<
    Parameters<typeof createWorkflowLayoutControlsController>[0],
    'applyUiWorkflow' | 'getFirstAvailableMelodyId' | 'selectMelodyById'
  >;
}

export function createSessionWorkflowLayoutCluster(deps: SessionWorkflowLayoutClusterDeps) {
  const workflowLayoutController = createWorkflowLayoutController(deps.workflowLayout);
  const workflowController = createWorkflowController({
    dom: deps.workflow.dom,
    workflowLayoutController,
    listAvailableMelodyIds: deps.workflow.listAvailableMelodyIds,
  });
  const workflowLayoutControlsController = createWorkflowLayoutControlsController({
    ...deps.workflowLayoutControls,
    applyUiWorkflow: (workflow) => workflowController.applyUiWorkflow(workflow),
    getFirstAvailableMelodyId: () => workflowController.getFirstAvailableMelodyId(),
    selectMelodyById: (melodyId) => workflowController.selectMelodyById(melodyId),
  });

  return {
    workflowLayoutController,
    workflowController,
    workflowLayoutControlsController,
  };
}
