import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  renderPromptText,
  renderResultView,
  renderInfoSlots,
  renderStatsView,
  renderSessionSummaryView,
  renderPracticeSetupSummary,
  renderMelodySetupSummary,
  renderSessionToolsSummary,
  renderFormattedSessionGoalProgress,
} = vi.hoisted(() => ({
  renderPromptText: vi.fn(),
  renderResultView: vi.fn(),
  renderInfoSlots: vi.fn(),
  renderStatsView: vi.fn(),
  renderSessionSummaryView: vi.fn(),
  renderPracticeSetupSummary: vi.fn(),
  renderMelodySetupSummary: vi.fn(),
  renderSessionToolsSummary: vi.fn(),
  renderFormattedSessionGoalProgress: vi.fn(),
}));

vi.mock('./ui-feedback-view', () => ({
  renderPromptText,
  renderResultView,
  renderInfoSlots,
}));

vi.mock('./ui-session-results-view', () => ({
  renderStatsView,
  renderSessionSummaryView,
}));

vi.mock('./ui-session-display-view', () => ({
  renderPracticeSetupSummary,
  renderMelodySetupSummary,
  renderSessionToolsSummary,
  renderFormattedSessionGoalProgress,
}));

describe('ui-display-signal-actions', () => {
  afterEach(async () => {
    const actions = await import('./ui-display-signal-actions');
    actions.setPromptText('');
    actions.clearResultMessage();
    actions.setInfoSlots('', '', '');
    actions.setSessionGoalProgress('');
    renderPromptText.mockReset();
    renderResultView.mockReset();
    renderInfoSlots.mockReset();
    renderStatsView.mockReset();
    renderSessionSummaryView.mockReset();
    renderPracticeSetupSummary.mockReset();
    renderMelodySetupSummary.mockReset();
    renderSessionToolsSummary.mockReset();
    renderFormattedSessionGoalProgress.mockReset();
  });

  it('renders current display state through formatting refresh', async () => {
    const {
      refreshDisplayFormatting,
      setInfoSlots,
      setPromptText,
      setResultMessage,
      setSessionGoalProgress,
    } = await import('./ui-display-signal-actions');

    setPromptText('Play A');
    setResultMessage('Correct', 'positive');
    setInfoSlots('one', 'two', 'three');
    setSessionGoalProgress('2/5');

    refreshDisplayFormatting();

    expect(renderPromptText).toHaveBeenCalledWith('Play A');
    expect(renderResultView).toHaveBeenCalledWith({ text: 'Correct', tone: 'positive' });
    expect(renderInfoSlots).toHaveBeenCalledWith({ slot1: 'one', slot2: 'two', slot3: 'three' });
    expect(renderFormattedSessionGoalProgress).toHaveBeenCalledWith('2/5');
  });
});
