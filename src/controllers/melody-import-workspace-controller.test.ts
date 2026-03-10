import { describe, expect, it, vi } from 'vitest';
import { createMelodyImportWorkspaceController } from './melody-import-workspace-controller';

function createDeps() {
  return {
    syncModalUi: vi.fn(),
    resetImportDraft: vi.fn(),
    closeModal: vi.fn(),
    resetImportInputs: vi.fn(),
  };
}

describe('melody-import-workspace-controller', () => {
  it('forwards modal UI sync and draft reset', () => {
    const deps = createDeps();
    const controller = createMelodyImportWorkspaceController(deps);

    controller.syncUi();
    controller.resetDraft();

    expect(deps.syncModalUi).toHaveBeenCalledTimes(1);
    expect(deps.resetImportDraft).toHaveBeenCalledTimes(1);
  });

  it('closes the modal with or without input reset', () => {
    const deps = createDeps();
    const controller = createMelodyImportWorkspaceController(deps);

    controller.close();
    controller.closeAndResetInputs();

    expect(deps.closeModal).toHaveBeenCalledTimes(2);
    expect(deps.resetImportInputs).toHaveBeenCalledTimes(1);
  });
});
