import { describe, expect, it } from 'vitest';
import { createSessionWorkspaceControlsCluster } from './session-workspace-controls-cluster';

describe('session-workspace-controls-cluster', () => {
  it('creates the workspace control graph from grouped deps', () => {
    const cluster = createSessionWorkspaceControlsCluster({
      setupUi: {} as never,
      workflowLayout: {
        workflowLayout: {} as never,
        workflow: {} as never,
        workflowLayoutControls: {} as never,
      },
      melodyWorkflow: {
        melodySetupControls: {} as never,
        melodyPracticeActions: {} as never,
        melodyPracticeControls: {} as never,
        melodySelection: {} as never,
      },
      practiceControls: {
        practicePresetControls: {} as never,
        practiceSetupControls: {} as never,
        instrumentDisplayControls: {} as never,
      },
    });

    expect(cluster.melodySetupUiController).toBeTruthy();
    expect(cluster.practiceSetupSummaryController).toBeTruthy();
    expect(cluster.practicePresetUiController).toBeTruthy();
    expect(cluster.workflowController).toBeTruthy();
    expect(cluster.workflowLayoutControlsController).toBeTruthy();
    expect(cluster.melodySetupControlsController).toBeTruthy();
    expect(cluster.melodyPracticeActionsController).toBeTruthy();
    expect(cluster.melodyPracticeControlsController).toBeTruthy();
    expect(cluster.melodySelectionController).toBeTruthy();
    expect(cluster.practicePresetControlsController).toBeTruthy();
    expect(cluster.practiceSetupControlsController).toBeTruthy();
    expect(cluster.instrumentDisplayControlsController).toBeTruthy();
    expect(typeof cluster.refreshMelodyOptionsForCurrentInstrument).toBe('function');
  });
});
