interface MelodySelectionControllerDom {
  melodySelector: HTMLSelectElement;
  melodyNameInput: HTMLInputElement;
  melodyAsciiTabInput: HTMLTextAreaElement;
}

interface MelodySelectionControllerState {
  preferredMelodyId: string | null;
}

export interface MelodySelectionControllerDeps {
  dom: MelodySelectionControllerDom;
  state: MelodySelectionControllerState;
  refreshPracticeMelodyOptions(): void;
  hydrateMelodyTransposeForSelectedMelody(): void;
  hydrateMelodyStringShiftForSelectedMelody(): void;
  hydrateMelodyStudyRangeForSelectedMelody(): void;
  hydrateMelodyTempoForSelectedMelody(): void;
  clearMelodyDemoPreviewState(): void;
  updateMelodyActionButtonsForSelection(): void;
  refreshMelodyEmptyState(): void;
  resetMelodyTimelineEditingState(): void;
  closeMelodyImportModal(): void;
  markCurriculumPresetAsCustom(): void;
  updatePracticeSetupSummary(): void;
  saveSettings(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
  renderMelodyTabTimeline(): void;
  syncMelodyTimelineEditingState(): void;
}

export function createMelodySelectionController(deps: MelodySelectionControllerDeps) {
  function refreshOptionsForCurrentInstrument() {
    deps.refreshPracticeMelodyOptions();
    deps.hydrateMelodyTempoForSelectedMelody();
    deps.updateMelodyActionButtonsForSelection();
    deps.refreshMelodyEmptyState();
  }

  function finalizeImportSelection(melodyId: string, successMessage: string) {
    deps.resetMelodyTimelineEditingState();
    refreshOptionsForCurrentInstrument();
    deps.dom.melodySelector.value = melodyId;
    deps.state.preferredMelodyId = melodyId;
    deps.hydrateMelodyTransposeForSelectedMelody();
    deps.hydrateMelodyStringShiftForSelectedMelody();
    deps.hydrateMelodyStudyRangeForSelectedMelody();
    deps.hydrateMelodyTempoForSelectedMelody();
    deps.clearMelodyDemoPreviewState();
    deps.updateMelodyActionButtonsForSelection();
    deps.dom.melodyNameInput.value = '';
    deps.dom.melodyAsciiTabInput.value = '';
    deps.closeMelodyImportModal();
    deps.markCurriculumPresetAsCustom();
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.setResultMessage(successMessage, 'success');
    deps.renderMelodyTabTimeline();
    deps.syncMelodyTimelineEditingState();
  }

  return {
    refreshOptionsForCurrentInstrument,
    finalizeImportSelection,
  };
}

