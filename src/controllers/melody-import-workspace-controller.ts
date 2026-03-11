export interface MelodyImportWorkspaceControllerDeps {
  syncModalUi: () => void;
  resetImportDraft: () => void;
  closeModal: () => void;
  openModal: (options: { mode: 'create' | 'edit-custom' }) => boolean;
  resetImportInputs: () => void;
}

export function createMelodyImportWorkspaceController(deps: MelodyImportWorkspaceControllerDeps) {
  function syncUi() {
    deps.syncModalUi();
  }

  function resetDraft() {
    deps.resetImportDraft();
  }

  function openCreate() {
    return deps.openModal({ mode: 'create' });
  }

  function openEditCustom() {
    return deps.openModal({ mode: 'edit-custom' });
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
    openCreate,
    openEditCustom,
    close,
    closeAndResetInputs,
  };
}
