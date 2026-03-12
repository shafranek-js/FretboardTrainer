import { describe, expect, it, vi } from 'vitest';
import { createSessionWorkflowLayoutCluster } from './session-workflow-layout-cluster';

function createDeps() {
  return {
    workflowLayout: {
      dom: {} as never,
      state: {} as never,
      setUiWorkflow: vi.fn(),
      setPracticeSetupCollapsed: vi.fn(),
      setMelodySetupCollapsed: vi.fn(),
      setSessionToolsCollapsed: vi.fn(),
      setLayoutControlsExpanded: vi.fn(),
      syncRecommendedDefaultsUi: vi.fn(),
      updatePracticeSetupSummary: vi.fn(),
      updateMelodySetupActionButtons: vi.fn(),
      handleModeChange: vi.fn(),
      resetMelodyWorkflowEditorState: vi.fn(),
      getSelectedMelodyId: vi.fn(),
      getAvailableMelodyCount: vi.fn(),
    },
    workflow: {
      dom: { melodySelector: {} as never },
      listAvailableMelodyIds: vi.fn(() => []),
    },
    workflowLayoutControls: {
      dom: {} as never,
      state: {} as never,
      toggleLayoutControlsExpanded: vi.fn(),
      stopMelodyDemoPlayback: vi.fn(),
      stopListening: vi.fn(),
      saveSettings: vi.fn(),
      setUiMode: vi.fn(),
      openMelodyImport: vi.fn(),
    },
  };
}

describe('session-workflow-layout-cluster', () => {
  it('creates the workflow layout controllers as one cluster', () => {
    const cluster = createSessionWorkflowLayoutCluster(createDeps() as never);

    expect(cluster.workflowLayoutController).toBeTruthy();
    expect(cluster.workflowController).toBeTruthy();
    expect(cluster.workflowLayoutControlsController).toBeTruthy();
  });
});
