import { describe, expect, it, vi } from 'vitest';
import { createMelodyImportWorkspaceController } from './melody-import-workspace-controller';

function createDeps() {
  return {
    syncModalUi: vi.fn(),
    resetImportDraft: vi.fn(),
    closeModal: vi.fn(),
    openModal: vi.fn(() => true),
    resetImportInputs: vi.fn(),
  };
}

describe('melody-import-workspace-controller', () => {
  it('forwards modal UI sync, draft reset, and open flows', () => {
    const deps = createDeps();
    const controller = createMelodyImportWorkspaceController(deps);

    controller.syncUi();
    controller.resetDraft();
    expect(controller.openCreate()).toBe(true);
    expect(controller.openEditCustom()).toBe(true);

    expect(deps.syncModalUi).toHaveBeenCalledTimes(1);
    expect(deps.resetImportDraft).toHaveBeenCalledTimes(1);
    expect(deps.openModal).toHaveBeenNthCalledWith(1, { mode: 'create' });
    expect(deps.openModal).toHaveBeenNthCalledWith(2, { mode: 'edit-custom' });
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
