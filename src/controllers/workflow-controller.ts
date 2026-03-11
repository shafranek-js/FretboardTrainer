import type { WorkflowLayout } from '../workflow-layout';
import type { UiWorkflow } from '../training-workflows';

interface WorkflowControllerDom {
  melodySelector: HTMLSelectElement;
}

interface WorkflowControllerDeps {
  dom: WorkflowControllerDom;
  workflowLayoutController: {
    syncUiWorkflowFromTrainingMode: () => void;
    applyUiWorkflowLayout: (workflow: UiWorkflow) => void;
    applyUiWorkflow: (workflow: UiWorkflow) => void;
    getLayout: (workflow: UiWorkflow) => WorkflowLayout;
    updateMelodyActionButtonsForSelection: () => void;
    refreshMelodyEmptyState: () => void;
    mountWorkspaceControls: () => void;
  };
  listAvailableMelodyIds: () => string[];
}

export function createWorkflowController(deps: WorkflowControllerDeps) {
  function syncUiWorkflowFromTrainingMode() {
    deps.workflowLayoutController.syncUiWorkflowFromTrainingMode();
  }

  function applyUiWorkflowLayout(workflow: UiWorkflow) {
    deps.workflowLayoutController.applyUiWorkflowLayout(workflow);
  }

  function applyUiWorkflow(workflow: UiWorkflow) {
    deps.workflowLayoutController.applyUiWorkflow(workflow);
  }

  function resolveCurrentWorkflowLayout(workflow: UiWorkflow) {
    return deps.workflowLayoutController.getLayout(workflow);
  }

  function updateMelodyActionButtonsForSelection() {
    deps.workflowLayoutController.updateMelodyActionButtonsForSelection();
  }

  function refreshMelodyEmptyState() {
    deps.workflowLayoutController.refreshMelodyEmptyState();
  }

  function resolveSessionToolsVisibility(workflow: UiWorkflow) {
    return deps.workflowLayoutController.getLayout(workflow).sessionTools;
  }

  function mountWorkspaceControls() {
    deps.workflowLayoutController.mountWorkspaceControls();
  }

  function getFirstAvailableMelodyId() {
    return deps.listAvailableMelodyIds()[0] ?? null;
  }

  function selectMelodyById(melodyId: string) {
    deps.dom.melodySelector.value = melodyId;
    deps.dom.melodySelector.dispatchEvent(new Event('change'));
  }

  return {
    syncUiWorkflowFromTrainingMode,
    applyUiWorkflowLayout,
    applyUiWorkflow,
    resolveCurrentWorkflowLayout,
    resolveSessionToolsVisibility,
    updateMelodyActionButtonsForSelection,
    refreshMelodyEmptyState,
    mountWorkspaceControls,
    getFirstAvailableMelodyId,
    selectMelodyById,
  };
}
