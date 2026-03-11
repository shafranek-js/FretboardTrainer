import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveSessionAutoCollapseTransition: vi.fn(),
  renderSessionButtonsDisabled: vi.fn(),
  renderSessionToggleButton: vi.fn(),
  renderHintButtonVisibility: vi.fn(),
  renderLearnNotesPromptVisibility: vi.fn(),
  renderTimedInfoVisibility: vi.fn(),
}));

vi.mock('./ui-session-auto-collapse', () => ({
  resolveSessionAutoCollapseTransition: mocks.resolveSessionAutoCollapseTransition,
}));

vi.mock('./ui-session-controls-view', () => ({
  renderSessionButtonsDisabled: mocks.renderSessionButtonsDisabled,
  renderSessionToggleButton: mocks.renderSessionToggleButton,
  renderHintButtonVisibility: mocks.renderHintButtonVisibility,
  renderLearnNotesPromptVisibility: mocks.renderLearnNotesPromptVisibility,
  renderTimedInfoVisibility: mocks.renderTimedInfoVisibility,
}));

import { syncSessionControlsState } from './ui-session-controls-sync';

describe('ui-session-controls-sync', () => {
  it('syncs button renderers and returns collapse transition state', () => {
    mocks.resolveSessionAutoCollapseTransition.mockReturnValue({
      nextPracticeSetupCollapsed: true,
      nextMelodySetupCollapsed: false,
      nextSessionToolsCollapsed: true,
      previousSessionActive: true,
      wasAutoCollapsedForSession: true,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: true,
    });

    const result = syncSessionControlsState({
      startDisabled: false,
      stopDisabled: false,
      hintDisabled: true,
      playSoundDisabled: false,
      isLoading: false,
      mode: 'random',
      workflow: 'learn-notes',
      hasPromptText: true,
      timedInfoVisible: true,
      practiceSetupCollapsed: false,
      melodySetupCollapsed: true,
      sessionToolsCollapsed: false,
      melodySetupToggleHidden: false,
      previousSessionActive: false,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: false,
    });

    expect(mocks.renderSessionButtonsDisabled).toHaveBeenCalledWith({
      startDisabled: false,
      stopDisabled: false,
      hintDisabled: true,
      playSoundDisabled: false,
      isLoading: false,
    });
    expect(mocks.resolveSessionAutoCollapseTransition).toHaveBeenCalledWith({
      sessionActive: true,
      previousSessionActive: false,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: false,
      practiceSetupCollapsed: false,
      melodySetupCollapsed: true,
      sessionToolsCollapsed: false,
      melodySetupToggleHidden: false,
    });
    expect(mocks.renderSessionToggleButton).toHaveBeenCalledWith({
      startDisabled: false,
      stopDisabled: false,
      isLoading: false,
      workflow: 'learn-notes',
    });
    expect(mocks.renderHintButtonVisibility).toHaveBeenCalledWith({
      mode: 'random',
      workflow: 'learn-notes',
      sessionActive: true,
    });
    expect(mocks.renderLearnNotesPromptVisibility).toHaveBeenCalledWith({
      workflow: 'learn-notes',
      sessionActive: true,
      hasPromptText: true,
    });
    expect(mocks.renderTimedInfoVisibility).toHaveBeenCalledWith({
      mode: 'random',
      workflow: 'learn-notes',
      sessionActive: true,
      timedInfoVisible: true,
    });
    expect(result).toEqual({
      nextPracticeSetupCollapsed: true,
      nextMelodySetupCollapsed: false,
      nextSessionToolsCollapsed: true,
      previousSessionActive: true,
      wasAutoCollapsedForSession: true,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: true,
    });
  });
});
