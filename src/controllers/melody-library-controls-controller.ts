interface MelodyLibraryControlsDom {
  exportMelodyMidiBtn: HTMLButtonElement;
  bakePracticeMelodyBtn: HTMLButtonElement;
  deleteMelodyBtn: HTMLButtonElement;
}

interface MelodyLibraryControlsState {
  isListening: boolean;
}

export interface MelodyLibraryControlsControllerDeps {
  dom: MelodyLibraryControlsDom;
  state: MelodyLibraryControlsState;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  stopListening: () => void;
  isMelodyWorkflowMode: (mode: string) => boolean;
  getTrainingMode: () => string;
  exportSelectedMelodyAsMidi: () => Promise<void>;
  bakeSelectedPracticeAdjustedMelodyAsCustom: () => void;
  getSelectedMelodyId: () => string | null;
  isCustomMelodyId: (melodyId: string | null) => boolean;
  confirmUserAction: (message: string) => Promise<boolean>;
  deleteCustomMelody: (melodyId: string) => boolean;
  refreshMelodyOptionsForCurrentInstrument: () => void;
  markCurriculumPresetAsCustom: () => void;
  updatePracticeSetupSummary: () => void;
  saveSettings: () => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
}

export function createMelodyLibraryControlsController(deps: MelodyLibraryControlsControllerDeps) {
  function shouldStopSessionForMelodyWorkflow() {
    return deps.state.isListening && deps.isMelodyWorkflowMode(deps.getTrainingMode());
  }

  function register() {
    deps.dom.exportMelodyMidiBtn.addEventListener('click', async () => {
      try {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        if (shouldStopSessionForMelodyWorkflow()) {
          deps.stopListening();
        }
        await deps.exportSelectedMelodyAsMidi();
        deps.setResultMessage('MIDI file exported.', 'success');
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to export MIDI file', error));
      }
    });

    deps.dom.bakePracticeMelodyBtn.addEventListener('click', () => {
      try {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        if (shouldStopSessionForMelodyWorkflow()) {
          deps.stopListening();
        }
        deps.bakeSelectedPracticeAdjustedMelodyAsCustom();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to bake adjusted melody', error));
      }
    });

    deps.dom.deleteMelodyBtn.addEventListener('click', async () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      const selectedId = deps.getSelectedMelodyId();
      if (!deps.isCustomMelodyId(selectedId)) return;

      const confirmed = await deps.confirmUserAction('Delete selected custom melody from the local library?');
      if (!confirmed) return;

      const deleted = deps.deleteCustomMelody(selectedId);
      deps.refreshMelodyOptionsForCurrentInstrument();
      deps.markCurriculumPresetAsCustom();
      deps.updatePracticeSetupSummary();
      deps.saveSettings();
      if (deleted) {
        deps.setResultMessage('Custom melody deleted.');
      }
    });
  }

  return { register };
}
