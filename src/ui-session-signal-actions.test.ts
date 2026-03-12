import { afterEach, describe, expect, it, vi } from 'vitest';

const { syncDisplayControlsVisibilityState } = vi.hoisted(() => ({
  syncDisplayControlsVisibilityState: vi.fn(),
}));

vi.mock('./ui-workflow-sync', () => ({
  syncDisplayControlsVisibilityState,
}));

describe('ui-session-signal-actions', () => {
  afterEach(async () => {
    const actions = await import('./ui-session-signal-actions');
    actions.resetSessionButtonsState();
    actions.setTrainingModeUi('random');
    actions.setUiWorkflow('learn-notes');
    actions.setLayoutControlsExpanded(false);
    syncDisplayControlsVisibilityState.mockReset();
  });

  it('dedupes unchanged session button state updates', async () => {
    const { sessionButtonsSignal } = await import('./ui-signal-store');
    const { setSessionButtonsState } = await import('./ui-session-signal-actions');
    const subscriber = vi.fn();
    const unsubscribe = sessionButtonsSignal.subscribe(subscriber);

    setSessionButtonsState({ startDisabled: false });
    expect(subscriber).toHaveBeenCalledTimes(1);

    setSessionButtonsState({ startDisabled: true });
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(sessionButtonsSignal.get().startDisabled).toBe(true);

    unsubscribe();
  });

  it('refreshes layout visibility from current store state', async () => {
    const { trainingModeUiSignal, uiWorkflowSignal, layoutControlsExpandedSignal } = await import('./ui-signal-store');
    const { refreshLayoutControlsVisibility, setTrainingModeUi, setUiWorkflow, setLayoutControlsExpanded } =
      await import('./ui-session-signal-actions');

    setTrainingModeUi('melody');
    setUiWorkflow('practice');
    setLayoutControlsExpanded(true);

    refreshLayoutControlsVisibility();

    expect(syncDisplayControlsVisibilityState).toHaveBeenCalledWith({
      mode: trainingModeUiSignal.get(),
      workflow: uiWorkflowSignal.get(),
      layoutControlsExpanded: layoutControlsExpandedSignal.get(),
    });
  });
});
