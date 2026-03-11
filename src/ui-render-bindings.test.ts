import { describe, expect, it, vi } from 'vitest';
import { createSignal } from './reactive/signal';
import { bindUiRenderSignals } from './ui-render-bindings';

describe('ui-render-bindings', () => {
  it('binds direct render and overlay subscriptions', () => {
    const statusTextSignal = createSignal('Ready');
    const promptTextSignal = createSignal('Prompt');
    const resultViewSignal = createSignal({ text: '', tone: 'neutral' as const });
    const volumeLevelSignal = createSignal(0);
    const statsViewSignal = createSignal({
      highScoreText: '0',
      accuracyText: '0%',
      avgTimeText: '0s',
      problemNotes: [],
      lastSession: null,
    });
    const sessionSummaryViewSignal = createSignal(null);
    const timerValueSignal = createSignal('60');
    const scoreValueSignal = createSignal('0');
    const tunerVisibleSignal = createSignal(false);
    const tunerReadingSignal = createSignal({ frequency: null, targetFrequency: null });
    const modalVisibilitySignal = createSignal({
      onboarding: false,
      settings: false,
      userData: false,
      help: false,
      quickHelp: false,
      sessionSummary: false,
      stats: false,
      guide: false,
      links: false,
      profileName: false,
      melodyImport: false,
    });
    const profileActionsSignal = createSignal({ updateDisabled: true, deleteDisabled: true });
    const calibrationViewSignal = createSignal({
      isVisible: false,
      progressPercent: 0,
      statusText: 'Listening...',
    });
    const sessionGoalProgressSignal = createSignal('Goal');
    const infoSlotsSignal = createSignal({ slot1: 'A', slot2: '', slot3: '' });
    const practiceSetupSummarySignal = createSignal('Practice');
    const melodySetupSummarySignal = createSignal('Melody');
    const sessionToolsSummarySignal = createSignal('Tools');

    const renderStatusText = vi.fn();
    const renderResultView = vi.fn();
    const renderVolumeLevel = vi.fn();
    const renderStatsView = vi.fn();
    const renderSessionSummaryView = vi.fn();
    const renderTimerValue = vi.fn();
    const renderScoreValue = vi.fn();
    const renderTunerVisibility = vi.fn();
    const renderTunerReading = vi.fn();
    const syncModalUiState = vi.fn();
    const syncProfileActionsUiState = vi.fn();
    const syncCalibrationUiState = vi.fn();
    const renderSessionGoalProgress = vi.fn();
    const renderInfoSlots = vi.fn();
    const renderPracticeSetupSummary = vi.fn();
    const renderMelodySetupSummary = vi.fn();
    const renderSessionToolsSummary = vi.fn();

    bindUiRenderSignals({
      statusTextSignal,
      promptTextSignal,
      resultViewSignal,
      volumeLevelSignal,
      statsViewSignal,
      sessionSummaryViewSignal,
      timerValueSignal,
      scoreValueSignal,
      tunerVisibleSignal,
      tunerReadingSignal,
      modalVisibilitySignal,
      profileActionsSignal,
      calibrationViewSignal,
      sessionGoalProgressSignal,
      infoSlotsSignal,
      practiceSetupSummarySignal,
      melodySetupSummarySignal,
      sessionToolsSummarySignal,
      renderStatusText,
      renderResultView,
      renderVolumeLevel,
      renderStatsView,
      renderSessionSummaryView,
      renderTimerValue,
      renderScoreValue,
      renderTunerVisibility,
      renderTunerReading,
      syncModalUiState,
      syncProfileActionsUiState,
      syncCalibrationUiState,
      renderSessionGoalProgress,
      renderInfoSlots,
      renderPracticeSetupSummary,
      renderMelodySetupSummary,
      renderSessionToolsSummary,
    });

    expect(renderStatusText).toHaveBeenCalledWith('Ready');
    expect(renderResultView).toHaveBeenCalledWith({ text: '', tone: 'neutral' });
    expect(syncModalUiState).toHaveBeenCalled();
    expect(renderSessionToolsSummary).toHaveBeenCalledWith('Tools');

    volumeLevelSignal.set(3);
    expect(renderVolumeLevel).toHaveBeenLastCalledWith(3);
    profileActionsSignal.set({ updateDisabled: false, deleteDisabled: true });
    expect(syncProfileActionsUiState).toHaveBeenLastCalledWith({ updateDisabled: false, deleteDisabled: true });
  });
});
