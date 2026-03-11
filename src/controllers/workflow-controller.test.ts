import { describe, expect, it, vi } from 'vitest';
import { createWorkflowController } from './workflow-controller';

function createDeps(overrides?: { melodyIds?: string[] }) {
  const dom = {
    melodySelector: {
      value: '',
      dispatchEvent: vi.fn(),
    } as unknown as HTMLSelectElement,
  };

  const deps = {
    dom,
    workflowLayoutController: {
      syncUiWorkflowFromTrainingMode: vi.fn(),
      applyUiWorkflowLayout: vi.fn(),
      applyUiWorkflow: vi.fn(),
      getLayout: vi.fn(() => ({ sessionTools: { showPlanSection: true } })),
      updateMelodyActionButtonsForSelection: vi.fn(),
      refreshMelodyEmptyState: vi.fn(),
      mountWorkspaceControls: vi.fn(),
    },
    listAvailableMelodyIds: vi.fn(() => overrides?.melodyIds ?? []),
  };

  return { deps, dom };
}

describe('workflow-controller', () => {
  it('delegates workflow operations to workflow-layout-controller', () => {
    const { deps } = createDeps();
    const controller = createWorkflowController(deps);

    controller.syncUiWorkflowFromTrainingMode();
    controller.applyUiWorkflowLayout('practice');
    controller.applyUiWorkflow('editor');
    controller.updateMelodyActionButtonsForSelection();
    controller.refreshMelodyEmptyState();
    controller.mountWorkspaceControls();
    const layout = controller.resolveCurrentWorkflowLayout('perform');
    const sessionTools = controller.resolveSessionToolsVisibility('perform');

    expect(deps.workflowLayoutController.syncUiWorkflowFromTrainingMode).toHaveBeenCalledTimes(1);
    expect(deps.workflowLayoutController.applyUiWorkflowLayout).toHaveBeenCalledWith('practice');
    expect(deps.workflowLayoutController.applyUiWorkflow).toHaveBeenCalledWith('editor');
    expect(deps.workflowLayoutController.updateMelodyActionButtonsForSelection).toHaveBeenCalledTimes(1);
    expect(deps.workflowLayoutController.refreshMelodyEmptyState).toHaveBeenCalledTimes(1);
    expect(deps.workflowLayoutController.mountWorkspaceControls).toHaveBeenCalledTimes(1);
    expect(layout).toEqual({ sessionTools: { showPlanSection: true } });
    expect(sessionTools).toEqual({ showPlanSection: true });
  });

  it('returns the first available melody id and dispatches a change event when selecting', () => {
    const { deps, dom } = createDeps({ melodyIds: ['melody-1', 'melody-2'] });
    const controller = createWorkflowController(deps);

    expect(controller.getFirstAvailableMelodyId()).toBe('melody-1');

    controller.selectMelodyById('melody-2');

    expect(dom.melodySelector.value).toBe('melody-2');
    expect((dom.melodySelector.dispatchEvent as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});
