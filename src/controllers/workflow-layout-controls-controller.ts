import type { UiWorkflow } from '../training-workflows';
import { normalizeUiMode, type UiMode } from '../ui-mode';

interface WorkflowLayoutControlsDom {
  layoutToggleBtn: HTMLButtonElement;
  workflowLearnNotesBtn: HTMLButtonElement;
  workflowStudyMelodyBtn: HTMLButtonElement;
  workflowPracticeBtn: HTMLButtonElement;
  workflowPerformBtn: HTMLButtonElement;
  workflowLibraryBtn: HTMLButtonElement;
  workflowEditorBtn: HTMLButtonElement;
  uiModeSimpleBtn: HTMLButtonElement;
  uiModeAdvancedBtn: HTMLButtonElement;
  melodyEmptyStateImportBtn: HTMLButtonElement;
  melodyEmptyStateLoadStarterBtn: HTMLButtonElement;
}

interface WorkflowLayoutControlsState {
  uiWorkflow: UiWorkflow;
  uiMode: UiMode;
  isListening: boolean;
}

export interface WorkflowLayoutControlsControllerDeps {
  dom: WorkflowLayoutControlsDom;
  state: WorkflowLayoutControlsState;
  toggleLayoutControlsExpanded: () => void;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  stopListening: () => void;
  applyUiWorkflow: (workflow: UiWorkflow) => void;
  saveSettings: () => void;
  setUiMode: (uiMode: UiMode) => void;
  openMelodyImport: () => void;
  getFirstAvailableMelodyId: () => string | null;
  selectMelodyById: (melodyId: string) => void;
}

export function createWorkflowLayoutControlsController(
  deps: WorkflowLayoutControlsControllerDeps
) {
  function registerWorkflowButton(button: HTMLButtonElement, workflow: UiWorkflow) {
    button.addEventListener('click', () => {
      const isWorkflowChange = deps.state.uiWorkflow !== workflow;
      if (isWorkflowChange && deps.state.isListening) {
        deps.stopListening();
      }
      deps.stopMelodyDemoPlayback({ clearUi: true });
      deps.applyUiWorkflow(workflow);
      deps.saveSettings();
    });
  }

  function registerUiModeButton(button: HTMLButtonElement, uiMode: UiMode) {
    button.addEventListener('click', () => {
      deps.state.uiMode = normalizeUiMode(uiMode);
      deps.setUiMode(deps.state.uiMode);
      deps.saveSettings();
    });
  }

  function register() {
    deps.dom.layoutToggleBtn.addEventListener('click', () => {
      deps.toggleLayoutControlsExpanded();
    });

    registerWorkflowButton(deps.dom.workflowLearnNotesBtn, 'learn-notes');
    registerWorkflowButton(deps.dom.workflowStudyMelodyBtn, 'study-melody');
    registerWorkflowButton(deps.dom.workflowPracticeBtn, 'practice');
    registerWorkflowButton(deps.dom.workflowPerformBtn, 'perform');
    registerWorkflowButton(deps.dom.workflowLibraryBtn, 'library');
    registerWorkflowButton(deps.dom.workflowEditorBtn, 'editor');

    registerUiModeButton(deps.dom.uiModeSimpleBtn, 'simple');
    registerUiModeButton(deps.dom.uiModeAdvancedBtn, 'advanced');

    deps.dom.melodyEmptyStateImportBtn.addEventListener('click', () => {
      if (deps.state.uiWorkflow === 'editor') {
        deps.openMelodyImport();
        return;
      }
      deps.stopMelodyDemoPlayback({ clearUi: true });
      deps.applyUiWorkflow('editor');
      deps.saveSettings();
    });

    deps.dom.melodyEmptyStateLoadStarterBtn.addEventListener('click', () => {
      const starterMelodyId = deps.getFirstAvailableMelodyId();
      if (!starterMelodyId) {
        deps.openMelodyImport();
        return;
      }
      deps.selectMelodyById(starterMelodyId);
    });
  }

  return { register };
}

