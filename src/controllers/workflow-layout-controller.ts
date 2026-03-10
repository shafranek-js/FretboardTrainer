import { resolveMelodyEmptyStateView } from '../melody-empty-state';
import {
  getDefaultTrainingModeForUiWorkflow,
  isTrainingModeInUiWorkflow,
  resolveUiWorkflowFromTrainingMode,
  type UiWorkflow,
} from '../training-workflows';
import { resolveWorkflowLayout } from '../workflow-layout';
import {
  shouldShowMelodyBakeAction,
  shouldShowMelodyCreateAction,
  shouldShowMelodyDeleteAction,
  shouldShowMelodyEditAction,
  shouldShowMelodyExportAction,
} from '../workflow-ui-copy';

export interface WorkflowLayoutControllerDom {
  learningControls: HTMLElement;
  practiceSetupPanel: HTMLElement;
  trainingMode: HTMLSelectElement;
  topPromptHost: HTMLElement;
  promptContainer: HTMLElement;
  learnNotesPromptHost: HTMLElement;
  learnNotesSessionActionHost: HTMLElement;
  melodyShowTabTimeline: HTMLInputElement;
  melodyShowScrollingTab: HTMLInputElement;
  melodyPracticeSection: HTMLElement;
  melodyPracticeFieldsRow: HTMLElement;
  melodyPracticeActionsRow: HTMLElement;
  editingToolsSection: HTMLElement;
  editingToolsFieldsRow: HTMLElement;
  editingToolsActionsRow: HTMLElement;
  sessionToolsAutoPlayPromptSoundHost: HTMLElement;
  playbackPromptSoundHost: HTMLElement;
  sessionPrimaryActionHost: HTMLElement;
  sessionPrimaryActionControls: HTMLElement;
  startSessionHelpBtn: HTMLButtonElement;
  playbackSessionActionHost: HTMLElement;
  sessionToolsAutoPlayPromptSoundRow: HTMLElement;
  sessionToolsShowAllNotesRow: HTMLElement;
  sessionToolsShowStringTogglesRow: HTMLElement;
  layoutLearnNotesControlsHost: HTMLElement;
  sessionToolsLearnNotesLayoutControlsHost: HTMLElement;
  openMelodyImportBtn: HTMLButtonElement;
  editMelodyBtn: HTMLButtonElement;
  bakePracticeMelodyBtn: HTMLButtonElement;
  exportMelodyMidiBtn: HTMLButtonElement;
  deleteMelodyBtn: HTMLButtonElement;
  melodyEventEditorPanel: HTMLElement;
  melodyEmptyState: HTMLElement;
  melodyEmptyStateTitle: HTMLElement;
  melodyEmptyStateDescription: HTMLElement;
  melodyEmptyStateLoadStarterBtn: HTMLElement;
  melodyEmptyStateLoadStarterLabel: HTMLElement;
  melodyEmptyStateImportBtn: HTMLElement;
  melodyEmptyStateImportLabel: HTMLElement;
  melodyLibrarySection: HTMLElement;
  melodyPlaybackControls: HTMLElement;
  melodyDemoQuickControls: HTMLElement;
  melodyWorkspaceTransportSlot: HTMLElement;
  melodyDisplayControls: HTMLElement;
  melodyDisplayControlsSlot: HTMLElement;
}

interface WorkflowLayoutControllerState {
  uiWorkflow: UiWorkflow;
}

export interface WorkflowLayoutControllerDeps {
  dom: WorkflowLayoutControllerDom;
  state: WorkflowLayoutControllerState;
  setUiWorkflow: (workflow: UiWorkflow) => void;
  setPracticeSetupCollapsed: (collapsed: boolean) => void;
  setMelodySetupCollapsed: (collapsed: boolean) => void;
  setSessionToolsCollapsed: (collapsed: boolean) => void;
  setLayoutControlsExpanded: (expanded: boolean) => void;
  syncRecommendedDefaultsUi: () => void;
  updatePracticeSetupSummary: () => void;
  updateMelodySetupActionButtons: () => void;
  handleModeChange: () => void;
  resetMelodyWorkflowEditorState: () => void;
  getSelectedMelodyId: () => string | null;
  getAvailableMelodyCount: () => number;
}

export function createWorkflowLayoutController(deps: WorkflowLayoutControllerDeps) {
  function resolveCurrentWorkflowLayout(workflow: UiWorkflow) {
    return resolveWorkflowLayout({
      workflow,
      trainingMode: deps.dom.trainingMode.value,
      showTabTimeline: deps.dom.melodyShowTabTimeline.checked,
      showScrollingTab: deps.dom.melodyShowScrollingTab.checked,
    });
  }

  function mountMelodyWorkspaceTransport() {
    if (deps.dom.melodyPlaybackControls.parentElement !== deps.dom.melodyWorkspaceTransportSlot) {
      deps.dom.melodyWorkspaceTransportSlot.appendChild(deps.dom.melodyPlaybackControls);
    }
    if (deps.dom.melodyDemoQuickControls.parentElement !== deps.dom.melodyWorkspaceTransportSlot) {
      deps.dom.melodyWorkspaceTransportSlot.appendChild(deps.dom.melodyDemoQuickControls);
    }
    deps.dom.melodyPlaybackControls.classList.add('flex-wrap');
    deps.dom.melodyDemoQuickControls.classList.add('flex-wrap');
  }

  function mountMelodyDisplayControls() {
    if (deps.dom.melodyDisplayControls.parentElement !== deps.dom.melodyDisplayControlsSlot) {
      deps.dom.melodyDisplayControlsSlot.appendChild(deps.dom.melodyDisplayControls);
    }
    deps.dom.melodyDisplayControls.classList.add('flex-wrap');
  }

  function mountLearnNotesLayoutControls(workflow: UiWorkflow) {
    const targetHost =
      workflow === 'learn-notes'
        ? deps.dom.layoutLearnNotesControlsHost
        : deps.dom.sessionToolsLearnNotesLayoutControlsHost;
    if (deps.dom.sessionToolsShowAllNotesRow.parentElement !== targetHost) {
      targetHost.appendChild(deps.dom.sessionToolsShowAllNotesRow);
    }
    if (deps.dom.sessionToolsShowStringTogglesRow.parentElement !== targetHost) {
      targetHost.appendChild(deps.dom.sessionToolsShowStringTogglesRow);
    }
    deps.dom.layoutLearnNotesControlsHost.classList.toggle('hidden', workflow !== 'learn-notes');
    deps.dom.layoutLearnNotesControlsHost.style.display = workflow === 'learn-notes' ? 'flex' : 'none';
    deps.dom.sessionToolsLearnNotesLayoutControlsHost.classList.toggle('hidden', workflow === 'learn-notes');
    deps.dom.sessionToolsLearnNotesLayoutControlsHost.style.display = workflow === 'learn-notes' ? 'none' : '';
  }

  function mountLearnNotesPromptControls(workflow: UiWorkflow) {
    const targetHost = deps.dom.topPromptHost;
    if (deps.dom.promptContainer.parentElement !== targetHost) {
      targetHost.appendChild(deps.dom.promptContainer);
    }
    const isLearnNotesWorkflow = workflow === 'learn-notes';
    deps.dom.topPromptHost.classList.add('hidden');
    deps.dom.topPromptHost.style.display = 'none';
    if (!isLearnNotesWorkflow) {
      deps.dom.learnNotesPromptHost.classList.add('hidden');
      deps.dom.learnNotesPromptHost.style.display = 'none';
      return;
    }
    if (deps.dom.promptContainer.parentElement !== deps.dom.learnNotesPromptHost) {
      deps.dom.learnNotesPromptHost.appendChild(deps.dom.promptContainer);
    }
  }
  function mountSessionPrimaryActions(workflow: UiWorkflow) {
    const targetHost =
      workflow === 'learn-notes'
        ? deps.dom.learnNotesSessionActionHost
        : workflow === 'study-melody' || workflow === 'practice' || workflow === 'perform'
          ? deps.dom.playbackSessionActionHost
          : null;
    if (targetHost && deps.dom.sessionPrimaryActionControls.parentElement !== targetHost) {
      targetHost.appendChild(deps.dom.sessionPrimaryActionControls);
    }
    const inLearnNotesHost = targetHost === deps.dom.learnNotesSessionActionHost;
    const inPlaybackHost = targetHost === deps.dom.playbackSessionActionHost;
    deps.dom.learnNotesSessionActionHost.classList.toggle('hidden', !inLearnNotesHost);
    deps.dom.learnNotesSessionActionHost.style.display = inLearnNotesHost ? 'flex' : 'none';
    deps.dom.playbackSessionActionHost.classList.toggle('hidden', !inPlaybackHost);
    deps.dom.playbackSessionActionHost.style.display = inPlaybackHost ? 'flex' : 'none';
    deps.dom.sessionPrimaryActionHost.classList.add('hidden');
    deps.dom.sessionPrimaryActionHost.style.display = 'none';
    deps.dom.sessionPrimaryActionControls.style.display = targetHost ? 'flex' : 'none';
  }

  function mountPromptSoundControl(workflow: UiWorkflow) {
    const layout = resolveCurrentWorkflowLayout(workflow);
    const targetHost =
      workflow === 'learn-notes' || !layout.showPlaybackPromptSoundControl
        ? deps.dom.sessionToolsAutoPlayPromptSoundHost
        : deps.dom.playbackPromptSoundHost;
    if (deps.dom.sessionToolsAutoPlayPromptSoundRow.parentElement !== targetHost) {
      targetHost.appendChild(deps.dom.sessionToolsAutoPlayPromptSoundRow);
    }
  }

  function syncWorkflowMelodyActionVisibility() {
    const workflow = deps.state.uiWorkflow;
    const showCreate = shouldShowMelodyCreateAction(workflow);
    const showEdit = shouldShowMelodyEditAction(workflow);
    const showBake = shouldShowMelodyBakeAction(workflow);
    const showExport = shouldShowMelodyExportAction(workflow);
    const showDelete = shouldShowMelodyDeleteAction(workflow);

    deps.dom.openMelodyImportBtn.classList.toggle('hidden', !showCreate);
    deps.dom.openMelodyImportBtn.style.display = showCreate ? '' : 'none';
    deps.dom.editMelodyBtn.classList.toggle('hidden', !showEdit);
    deps.dom.editMelodyBtn.style.display = showEdit ? '' : 'none';
    deps.dom.bakePracticeMelodyBtn.classList.toggle('hidden', !showBake);
    deps.dom.bakePracticeMelodyBtn.style.display = showBake ? '' : 'none';
    deps.dom.exportMelodyMidiBtn.classList.toggle('hidden', !showExport);
    deps.dom.exportMelodyMidiBtn.style.display = showExport ? '' : 'none';
    deps.dom.deleteMelodyBtn.classList.toggle('hidden', !showDelete);
    deps.dom.deleteMelodyBtn.style.display = showDelete ? '' : 'none';
    if (workflow !== 'editor') {
      deps.dom.melodyEventEditorPanel.classList.add('hidden');
      deps.dom.melodyEventEditorPanel.style.display = 'none';
    } else {
      deps.dom.melodyEventEditorPanel.style.display = '';
    }
  }

  function refreshMelodyEmptyState() {
    const layout = resolveCurrentWorkflowLayout(deps.state.uiWorkflow);
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: deps.state.uiWorkflow,
      selectedMelodyId: deps.getSelectedMelodyId(),
      availableMelodyCount: deps.getAvailableMelodyCount(),
    });
    const showMelodyPracticeSection = !view.visible && layout.showMelodyPracticeControls;
    const showEditingToolsSection = !view.visible && layout.showEditingToolsControls;

    deps.dom.melodyEmptyState.classList.toggle('hidden', !view.visible);
    deps.dom.melodyEmptyState.style.display = view.visible ? '' : 'none';
    deps.dom.melodyPracticeSection.classList.toggle('hidden', !showMelodyPracticeSection);
    deps.dom.melodyPracticeSection.style.display = showMelodyPracticeSection ? '' : 'none';
    deps.dom.editingToolsSection.classList.toggle('hidden', !showEditingToolsSection);
    deps.dom.editingToolsSection.style.display = showEditingToolsSection ? '' : 'none';
    deps.dom.melodyEmptyStateTitle.textContent = view.title;
    deps.dom.melodyEmptyStateDescription.textContent = view.description;
    deps.dom.melodyEmptyStateLoadStarterBtn.classList.toggle('hidden', !view.canLoadStarter);
    deps.dom.melodyEmptyStateLoadStarterLabel.textContent = view.loadStarterLabel;
    deps.dom.melodyEmptyStateImportBtn.classList.toggle('hidden', !view.canImportOrOpenEditor);
    deps.dom.melodyEmptyStateImportLabel.textContent = view.importOrOpenEditorLabel;
  }

  function updateMelodyActionButtonsForSelection() {
    syncWorkflowMelodyActionVisibility();
    deps.updateMelodySetupActionButtons();
    refreshMelodyEmptyState();
  }

  function syncUiWorkflowFromTrainingMode() {
    const nextWorkflow = isTrainingModeInUiWorkflow(deps.dom.trainingMode.value, deps.state.uiWorkflow)
      ? deps.state.uiWorkflow
      : resolveUiWorkflowFromTrainingMode(deps.dom.trainingMode.value);
    deps.state.uiWorkflow = nextWorkflow;
    deps.setUiWorkflow(nextWorkflow);
  }

  function applyUiWorkflowLayout(workflow: UiWorkflow) {
    const layout = resolveCurrentWorkflowLayout(workflow);
    deps.syncRecommendedDefaultsUi();
    mountLearnNotesPromptControls(workflow);
    mountSessionPrimaryActions(workflow);
    mountPromptSoundControl(workflow);
    mountLearnNotesLayoutControls(workflow);
    syncWorkflowMelodyActionVisibility();
    if (!layout.showMelodyPracticeControls) {
      deps.dom.melodyPracticeSection.classList.add('hidden');
      deps.dom.melodyPracticeSection.style.setProperty('display', 'none', 'important');
      deps.dom.melodyPracticeFieldsRow.style.setProperty('display', 'none', 'important');
      deps.dom.melodyPracticeActionsRow.style.setProperty('display', 'none', 'important');
    }
    if (!layout.showEditingToolsControls) {
      deps.dom.editingToolsSection.classList.add('hidden');
      deps.dom.editingToolsSection.style.setProperty('display', 'none', 'important');
      deps.dom.editingToolsFieldsRow.style.setProperty('display', 'none', 'important');
      deps.dom.editingToolsActionsRow.style.setProperty('display', 'none', 'important');
    }
    deps.setPracticeSetupCollapsed(false);
    deps.setMelodySetupCollapsed(false);
    deps.setSessionToolsCollapsed(false);
    deps.setLayoutControlsExpanded(false);
  }

  function applyUiWorkflow(workflow: UiWorkflow) {
    if (workflow !== 'learn-notes') {
      deps.dom.learningControls.dataset.panelLayout = 'default';
      deps.dom.practiceSetupPanel.classList.add('hidden');
      deps.dom.practiceSetupPanel.style.display = 'none';
    }

    if (workflow !== 'editor') {
      deps.resetMelodyWorkflowEditorState();
    }

    if (!isTrainingModeInUiWorkflow(deps.dom.trainingMode.value, workflow)) {
      deps.dom.trainingMode.value = getDefaultTrainingModeForUiWorkflow(workflow);
      deps.handleModeChange();
    }

    deps.state.uiWorkflow = workflow;
    deps.setUiWorkflow(workflow);
    applyUiWorkflowLayout(workflow);
    deps.updatePracticeSetupSummary();
    refreshMelodyEmptyState();
  }

  return {
    applyUiWorkflow,
    applyUiWorkflowLayout,
    getLayout: resolveCurrentWorkflowLayout,
    mountWorkspaceControls() {
      mountLearnNotesPromptControls(deps.state.uiWorkflow);
      mountMelodyWorkspaceTransport();
      mountMelodyDisplayControls();
      mountSessionPrimaryActions(deps.state.uiWorkflow);
    },
    refreshMelodyEmptyState,
    syncUiWorkflowFromTrainingMode,
    updateMelodyActionButtonsForSelection,
  };
}



