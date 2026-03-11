import { describe, expect, it, vi } from 'vitest';
import { createSignal } from './reactive/signal';
import { bindUiWorkflowSignals } from './ui-workflow-bindings';

describe('ui-workflow-bindings', () => {
  it('binds workflow subscriptions and applies collapse transitions', () => {
    const promptTextSignal = createSignal('Play A');
    const timedInfoVisibleSignal = createSignal(true);
    const sessionButtonsSignal = createSignal({
      startDisabled: false,
      stopDisabled: true,
      hintDisabled: true,
      playSoundDisabled: false,
    });
    const trainingModeUiSignal = createSignal('random');
    const uiWorkflowSignal = createSignal<'learn-notes' | 'practice'>('learn-notes');
    const uiModeSignal = createSignal<'simple' | 'advanced'>('simple');
    const loadingViewSignal = createSignal({ isLoading: false, message: '' });
    const practiceSetupCollapsedSignal = createSignal(false);
    const melodySetupCollapsedSignal = createSignal(false);
    const sessionToolsCollapsedSignal = createSignal(true);
    const layoutControlsExpandedSignal = createSignal(false);
    const practiceSetupSummarySignal = createSignal('Practice');
    const melodySetupSummarySignal = createSignal('Melody');
    const sessionToolsSummarySignal = createSignal('Tools');

    const syncPromptUiState = vi.fn();
    const syncTimedInfoUiState = vi.fn();
    const syncSessionControlsState = vi.fn(() => ({
      nextPracticeSetupCollapsed: true,
      nextMelodySetupCollapsed: null,
      nextSessionToolsCollapsed: false,
      previousSessionActive: false,
      wasAutoCollapsedForSession: true,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: true,
    }));
    const syncTrainingModeUiState = vi.fn();
    const syncWorkflowUiState = vi.fn();
    const syncUiModeState = vi.fn();
    const syncLoadingUiState = vi.fn();
    const syncPracticeSetupCollapsedState = vi.fn();
    const syncMelodySetupCollapsedState = vi.fn();
    const syncSessionToolsCollapsedState = vi.fn();
    const syncDisplayControlsVisibilityState = vi.fn();

    const runtimeState = {
      previousSessionActive: false,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: false,
    };

    bindUiWorkflowSignals({
      promptTextSignal,
      timedInfoVisibleSignal,
      sessionButtonsSignal,
      trainingModeUiSignal,
      uiWorkflowSignal,
      uiModeSignal,
      loadingViewSignal,
      practiceSetupCollapsedSignal,
      melodySetupCollapsedSignal,
      sessionToolsCollapsedSignal,
      layoutControlsExpandedSignal,
      practiceSetupSummarySignal,
      melodySetupSummarySignal,
      sessionToolsSummarySignal,
      syncPromptUiState,
      syncTimedInfoUiState,
      syncSessionControlsState,
      syncTrainingModeUiState,
      syncWorkflowUiState,
      syncUiModeState,
      syncLoadingUiState,
      syncPracticeSetupCollapsedState,
      syncMelodySetupCollapsedState,
      syncSessionToolsCollapsedState,
      syncDisplayControlsVisibilityState,
      getShowStringTogglesChecked: () => true,
      getMelodySetupToggleHidden: () => false,
      runtimeState,
    });

    expect(syncPromptUiState).toHaveBeenCalledWith({
      promptText: 'Play A',
      workflow: 'learn-notes',
      sessionActive: false,
    });
    expect(syncSessionControlsState).toHaveBeenCalled();
    expect(practiceSetupCollapsedSignal.get()).toBe(true);
    expect(sessionToolsCollapsedSignal.get()).toBe(false);
    expect(runtimeState.wasAutoCollapsedForSession).toBe(true);
    expect(syncTrainingModeUiState).toHaveBeenCalled();
    expect(syncWorkflowUiState).toHaveBeenCalled();
    expect(syncUiModeState).toHaveBeenCalledWith({ uiMode: 'simple', workflow: 'learn-notes' });
    expect(syncLoadingUiState).toHaveBeenCalledWith({
      isLoading: false,
      message: '',
      startDisabled: false,
      stopDisabled: true,
      workflow: 'learn-notes',
    });
    expect(syncTimedInfoUiState).toHaveBeenCalledWith({
      mode: 'random',
      workflow: 'learn-notes',
      sessionActive: false,
      timedInfoVisible: true,
    });
    expect(syncPracticeSetupCollapsedState).toHaveBeenCalled();
    expect(syncMelodySetupCollapsedState).toHaveBeenCalled();
    expect(syncSessionToolsCollapsedState).toHaveBeenCalled();
    expect(syncDisplayControlsVisibilityState).toHaveBeenCalled();
  });
});
