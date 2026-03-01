import type { MelodyStudyRange } from '../melody-study-range';

interface MelodyPracticeActionsControllerState {
  isListening: boolean;
  melodyTransposeSemitones: number;
}

interface MelodyPracticeActionsControllerDom {
  trainingMode: HTMLSelectElement;
}

interface MelodyPracticeActionsControllerDeps {
  dom: MelodyPracticeActionsControllerDom;
  state: MelodyPracticeActionsControllerState;
  isMelodyWorkflowMode(mode: string): boolean;
  stopMelodyDemoPlayback(options: { clearUi: boolean }): void;
  stopListening(): void;
  markCurriculumPresetAsCustom(): void;
  updateMelodyActionButtonsForSelection(): void;
  updatePracticeSetupSummary(): void;
  saveSettings(): void;
  redrawFretboard(): void;
  refreshMelodyTimelineUi(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
  applyMelodyTransposeSemitones(nextValue: unknown): boolean;
  applyMelodyStringShift(nextValue: unknown): { changed: boolean; valid: boolean };
  applyMelodyStudyRange(range: Partial<MelodyStudyRange>): boolean;
  listCustomMelodies(): Array<{ id: string }>;
  setStoredMelodyTransposeSemitones(melodyId: string | null, semitones: number): number;
  hydrateMelodyTransposeForSelectedMelody(): void;
  formatMelodyTransposeSemitones(semitones: number): string;
  confirmUserAction(message: string): Promise<boolean>;
}

export function createMelodyPracticeActionsController(deps: MelodyPracticeActionsControllerDeps) {
  function stopActiveMelodyWorkflow(message: string) {
    if (deps.state.isListening && deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      deps.stopListening();
      deps.setResultMessage(message);
    }
  }

  function handleStudyRangeChange(range: Partial<MelodyStudyRange>, options?: { stopMessage?: string }) {
    const changed = deps.applyMelodyStudyRange(range);
    if (!changed) return false;

    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.updateMelodyActionButtonsForSelection();
    stopActiveMelodyWorkflow(options?.stopMessage ?? 'Study range changed. Session stopped; press Start to continue.');
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.redrawFretboard();
    return true;
  }

  function handleTransposeInputChange(nextValue: unknown) {
    const changed = deps.applyMelodyTransposeSemitones(nextValue);
    if (!changed) return false;

    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.updateMelodyActionButtonsForSelection();
    stopActiveMelodyWorkflow('Melody transpose changed. Session stopped; press Start to continue.');
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.redrawFretboard();
    deps.refreshMelodyTimelineUi();
    return true;
  }

  function handleStringShiftInputChange(nextValue: unknown) {
    const result = deps.applyMelodyStringShift(nextValue);
    if (!result.valid) {
      deps.setResultMessage('This string shift is not playable on the current instrument setup.', 'error');
      return false;
    }
    if (!result.changed) return false;

    deps.stopMelodyDemoPlayback({ clearUi: true });
    deps.markCurriculumPresetAsCustom();
    deps.updateMelodyActionButtonsForSelection();
    stopActiveMelodyWorkflow('Melody string shift changed. Session stopped; press Start to continue.');
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.redrawFretboard();
    deps.refreshMelodyTimelineUi();
    return true;
  }

  async function applyCurrentTransposeToAllCustomMelodies() {
    const customMelodies = deps.listCustomMelodies();
    if (customMelodies.length === 0) {
      deps.setResultMessage('No custom melodies available for batch transpose.', 'error');
      return;
    }

    const transposeText = deps.formatMelodyTransposeSemitones(deps.state.melodyTransposeSemitones);
    const confirmed = await deps.confirmUserAction(
      deps.state.melodyTransposeSemitones === 0
        ? `Reset transpose for all ${customMelodies.length} custom melodies?`
        : `Set transpose ${transposeText} for all ${customMelodies.length} custom melodies?`
    );
    if (!confirmed) return;

    if (deps.state.isListening && deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      deps.stopListening();
    }

    customMelodies.forEach((melody) => {
      deps.setStoredMelodyTransposeSemitones(melody.id, deps.state.melodyTransposeSemitones);
    });

    deps.hydrateMelodyTransposeForSelectedMelody();
    deps.updateMelodyActionButtonsForSelection();
    deps.updatePracticeSetupSummary();
    deps.saveSettings();
    deps.redrawFretboard();
    deps.setResultMessage(
      deps.state.melodyTransposeSemitones === 0
        ? `Reset transpose for ${customMelodies.length} custom melodies.`
        : `Set transpose ${transposeText} for ${customMelodies.length} custom melodies.`,
      'success'
    );
  }

  return {
    handleStudyRangeChange,
    handleTransposeInputChange,
    handleStringShiftInputChange,
    applyCurrentTransposeToAllCustomMelodies,
  };
}
