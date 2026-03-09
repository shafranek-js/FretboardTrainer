import { describe, expect, it, vi } from 'vitest';
import { createWorkflowLayoutControlsController } from './workflow-layout-controls-controller';

function createButton() {
  const listeners: Record<string, () => void> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: () => void) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLButtonElement & { listeners: Record<string, () => void> };
}

function createDeps(overrides?: {
  uiWorkflow?: 'learn-notes' | 'study-melody' | 'practice' | 'perform' | 'library' | 'editor';
  starterMelodyId?: string | null;
}) {
  const dom = {
    layoutToggleBtn: createButton(),
    workflowLearnNotesBtn: createButton(),
    workflowStudyMelodyBtn: createButton(),
    workflowPracticeBtn: createButton(),
    workflowPerformBtn: createButton(),
    workflowLibraryBtn: createButton(),
    workflowEditorBtn: createButton(),
    uiModeSimpleBtn: createButton(),
    uiModeAdvancedBtn: createButton(),
    melodyEmptyStateImportBtn: createButton(),
    melodyEmptyStateLoadStarterBtn: createButton(),
  };

  const deps = {
    dom,
    state: {
      uiWorkflow: overrides?.uiWorkflow ?? 'learn-notes',
      uiMode: 'simple' as const,
    },
    toggleLayoutControlsExpanded: vi.fn(),
    stopMelodyDemoPlayback: vi.fn(),
    applyUiWorkflow: vi.fn(),
    saveSettings: vi.fn(),
    setUiMode: vi.fn(),
    openMelodyImport: vi.fn(),
    getFirstAvailableMelodyId: vi.fn(() => overrides?.starterMelodyId ?? null),
    selectMelodyById: vi.fn(),
  };

  return { deps, dom };
}

describe('workflow-layout-controls-controller', () => {
  it('wires layout toggle and workflow buttons', () => {
    const { deps, dom } = createDeps();
    const controller = createWorkflowLayoutControlsController(deps);

    controller.register();
    dom.layoutToggleBtn.listeners.click();
    dom.workflowPracticeBtn.listeners.click();

    expect(deps.toggleLayoutControlsExpanded).toHaveBeenCalledTimes(1);
    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.applyUiWorkflow).toHaveBeenCalledWith('practice');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('updates ui mode through normalized values', () => {
    const { deps, dom } = createDeps();
    const controller = createWorkflowLayoutControlsController(deps);

    controller.register();
    dom.uiModeAdvancedBtn.listeners.click();

    expect(deps.state.uiMode).toBe('advanced');
    expect(deps.setUiMode).toHaveBeenCalledWith('advanced');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('opens melody import directly when empty-state import is clicked in editor', () => {
    const { deps, dom } = createDeps({ uiWorkflow: 'editor' });
    const controller = createWorkflowLayoutControlsController(deps);

    controller.register();
    dom.melodyEmptyStateImportBtn.listeners.click();

    expect(deps.openMelodyImport).toHaveBeenCalledTimes(1);
    expect(deps.applyUiWorkflow).not.toHaveBeenCalled();
    expect(deps.stopMelodyDemoPlayback).not.toHaveBeenCalled();
  });

  it('switches to editor from non-editor empty-state import', () => {
    const { deps, dom } = createDeps({ uiWorkflow: 'practice' });
    const controller = createWorkflowLayoutControlsController(deps);

    controller.register();
    dom.melodyEmptyStateImportBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.applyUiWorkflow).toHaveBeenCalledWith('editor');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('loads a starter melody when available, otherwise opens import', () => {
    const withStarter = createDeps({ starterMelodyId: 'melody-1' });
    createWorkflowLayoutControlsController(withStarter.deps).register();
    withStarter.dom.melodyEmptyStateLoadStarterBtn.listeners.click();

    expect(withStarter.deps.selectMelodyById).toHaveBeenCalledWith('melody-1');
    expect(withStarter.deps.openMelodyImport).not.toHaveBeenCalled();

    const withoutStarter = createDeps({ starterMelodyId: null });
    createWorkflowLayoutControlsController(withoutStarter.deps).register();
    withoutStarter.dom.melodyEmptyStateLoadStarterBtn.listeners.click();

    expect(withoutStarter.deps.openMelodyImport).toHaveBeenCalledTimes(1);
    expect(withoutStarter.deps.selectMelodyById).not.toHaveBeenCalled();
  });
});
