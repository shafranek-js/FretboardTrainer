type MelodyImportMode = 'create' | 'edit-custom';

interface MelodyImportControlsDom {
  closeMelodyImportBtn: HTMLButtonElement;
  cancelMelodyImportBtn: HTMLButtonElement;
  melodyImportModal: HTMLElement;
  melodyAsciiTabInput: HTMLTextAreaElement;
  melodyNameInput: HTMLInputElement;
  openMelodyImportBtn: HTMLButtonElement;
  editMelodyBtn: HTMLButtonElement;
  importMelodyGpBtn: HTMLButtonElement;
  importMelodyMidiBtn: HTMLButtonElement;
  melodyGpFileInput: HTMLInputElement;
  melodyMidiFileInput: HTMLInputElement;
  melodyMidiTrackSelector: HTMLSelectElement;
  melodyMidiQuantize: HTMLSelectElement;
  saveMelodyMidiTrackBtn: HTMLButtonElement;
  melodyGpTrackSelector: HTMLSelectElement;
  saveMelodyGpTrackBtn: HTMLButtonElement;
  importMelodyBtn: HTMLButtonElement;
}

interface MelodyImportModalControllerLike {
  open(options: { mode: MelodyImportMode }): boolean;
  close(): void;
}

interface MelodyImportPreviewControllerLike {
  schedulePreviewUpdate(): void;
  updatePreview(): void;
  loadGpImportDraftFromFile(file: File): Promise<void>;
  loadMidiImportDraftFromFile(file: File): Promise<void>;
  refreshMidiTrackPreviewFromSelection(): void;
  hasPendingMidiImport(): boolean;
  refreshGpTrackPreviewFromSelection(): void;
}

export interface MelodyImportControlsControllerDeps {
  dom: MelodyImportControlsDom;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  resetMelodyGpFileInput: () => void;
  resetMelodyMidiFileInput: () => void;
  melodyImportModalController: MelodyImportModalControllerLike;
  melodyImportPreviewController: MelodyImportPreviewControllerLike;
  savePendingMidiImportedTrack: () => void;
  savePendingGpImportedTrack: () => void;
  saveFromModal: () => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  renderMelodyEditorPreviewError: (prefix: string, error: unknown) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  showNonBlockingError: (message: string) => void;
}

export function createMelodyImportControlsController(deps: MelodyImportControlsControllerDeps) {
  function closeImportModal() {
    deps.resetMelodyGpFileInput();
    deps.resetMelodyMidiFileInput();
    deps.melodyImportModalController.close();
  }

  async function handleGpImportChange() {
    const file = deps.dom.melodyGpFileInput.files?.[0];
    if (!file) return;

    const originalLabel = deps.dom.importMelodyGpBtn.textContent ?? 'Import GP...';
    deps.dom.importMelodyGpBtn.disabled = true;
    deps.dom.importMelodyGpBtn.textContent = 'Importing...';

    try {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      await deps.melodyImportPreviewController.loadGpImportDraftFromFile(file);
      deps.setResultMessage('GP file parsed. Review the preview, choose a track, then save.', 'success');
    } catch (error) {
      deps.renderMelodyEditorPreviewError('Import failed', error);
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to import Guitar Pro file', error));
    } finally {
      deps.dom.importMelodyGpBtn.disabled = false;
      deps.dom.importMelodyGpBtn.textContent = originalLabel;
      deps.resetMelodyGpFileInput();
    }
  }

  async function handleMidiImportChange() {
    const file = deps.dom.melodyMidiFileInput.files?.[0];
    if (!file) return;
    const normalizedName = file.name.trim().toLowerCase();
    const isMuseScoreImport = normalizedName.endsWith('.mscz') || normalizedName.endsWith('.mscx');
    const sourceLabel = isMuseScoreImport ? 'MuseScore' : 'MIDI';

    const originalLabel = deps.dom.importMelodyMidiBtn.textContent ?? 'Import MIDI/MSCZ...';
    deps.dom.importMelodyMidiBtn.disabled = true;
    deps.dom.importMelodyMidiBtn.textContent = 'Importing...';

    try {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      await deps.melodyImportPreviewController.loadMidiImportDraftFromFile(file);
      deps.setResultMessage(`${sourceLabel} file parsed. Review the preview, choose a track, then save.`, 'success');
    } catch (error) {
      deps.renderMelodyEditorPreviewError('Import failed', error);
      deps.showNonBlockingError(deps.formatUserFacingError(`Failed to import ${sourceLabel} file`, error));
    } finally {
      deps.dom.importMelodyMidiBtn.disabled = false;
      deps.dom.importMelodyMidiBtn.textContent = originalLabel;
      deps.resetMelodyMidiFileInput();
    }
  }

  function register() {
    deps.dom.closeMelodyImportBtn.addEventListener('click', closeImportModal);
    deps.dom.cancelMelodyImportBtn.addEventListener('click', closeImportModal);
    deps.dom.melodyImportModal.addEventListener('click', (event) => {
      if (event.target === deps.dom.melodyImportModal) {
        closeImportModal();
      }
    });

    deps.dom.melodyAsciiTabInput.addEventListener('input', () => {
      deps.melodyImportPreviewController.schedulePreviewUpdate();
    });
    deps.dom.melodyNameInput.addEventListener('input', () => {
      if (!deps.dom.melodyAsciiTabInput.value.trim()) {
        deps.melodyImportPreviewController.updatePreview();
      }
    });

    deps.dom.openMelodyImportBtn.addEventListener('click', () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      deps.melodyImportModalController.open({ mode: 'create' });
    });
    deps.dom.editMelodyBtn.addEventListener('click', () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      deps.melodyImportModalController.open({ mode: 'edit-custom' });
    });
    deps.dom.importMelodyGpBtn.addEventListener('click', () => {
      deps.dom.melodyGpFileInput.click();
    });
    deps.dom.importMelodyMidiBtn.addEventListener('click', () => {
      deps.dom.melodyMidiFileInput.click();
    });
    deps.dom.melodyGpFileInput.addEventListener('change', () => {
      void handleGpImportChange();
    });
    deps.dom.melodyMidiFileInput.addEventListener('change', () => {
      void handleMidiImportChange();
    });
    deps.dom.melodyMidiTrackSelector.addEventListener('change', () => {
      try {
        deps.melodyImportPreviewController.refreshMidiTrackPreviewFromSelection();
      } catch (error) {
        deps.renderMelodyEditorPreviewError('Track preview failed', error);
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to preview selected imported track', error));
      }
    });
    deps.dom.melodyMidiQuantize.addEventListener('change', () => {
      if (!deps.melodyImportPreviewController.hasPendingMidiImport()) return;
      try {
        deps.melodyImportPreviewController.refreshMidiTrackPreviewFromSelection();
      } catch (error) {
        deps.renderMelodyEditorPreviewError('Quantized track preview failed', error);
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to apply quantize preview', error));
      }
    });
    deps.dom.saveMelodyMidiTrackBtn.addEventListener('click', () => {
      try {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        deps.savePendingMidiImportedTrack();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to save imported MIDI track', error));
      }
    });
    deps.dom.melodyGpTrackSelector.addEventListener('change', () => {
      try {
        deps.melodyImportPreviewController.refreshGpTrackPreviewFromSelection();
      } catch (error) {
        deps.renderMelodyEditorPreviewError('GP track preview failed', error);
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to preview selected GP track', error));
      }
    });
    deps.dom.saveMelodyGpTrackBtn.addEventListener('click', () => {
      try {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        deps.savePendingGpImportedTrack();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to save imported GP track', error));
      }
    });
    deps.dom.importMelodyBtn.addEventListener('click', () => {
      try {
        deps.stopMelodyDemoPlayback({ clearUi: true });
        deps.saveFromModal();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to save melody from ASCII tab', error));
      }
    });
  }

  return {
    register,
    closeImportModal,
  };
}
