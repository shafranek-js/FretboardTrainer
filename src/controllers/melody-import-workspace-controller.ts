export interface MelodyImportWorkspaceControllerDeps {
  syncModalUi: () => void;
  resetImportDraft: () => void;
  closeModal: () => void;
  resetImportInputs: () => void;
}

export function createMelodyImportWorkspaceController(deps: MelodyImportWorkspaceControllerDeps) {
  function syncUi() {
    deps.syncModalUi();
  }

  function resetDraft() {
    deps.resetImportDraft();
  }

  function close() {
    deps.closeModal();
  }

  function closeAndResetInputs() {
    deps.resetImportInputs();
    deps.closeModal();
  }

  return {
    syncUi,
    resetDraft,
    close,
    closeAndResetInputs,
  };
}
