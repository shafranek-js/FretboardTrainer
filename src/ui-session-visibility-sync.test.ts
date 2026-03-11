import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  renderPromptText: vi.fn(),
  renderLearnNotesPromptVisibility: vi.fn(),
  renderTimedInfoVisibility: vi.fn(),
}));

vi.mock('./ui-feedback-view', () => ({
  renderPromptText: mocks.renderPromptText,
}));
vi.mock('./ui-session-controls-view', () => ({
  renderLearnNotesPromptVisibility: mocks.renderLearnNotesPromptVisibility,
  renderTimedInfoVisibility: mocks.renderTimedInfoVisibility,
}));

import { syncPromptUiState, syncTimedInfoUiState } from './ui-session-visibility-sync';

describe('ui-session-visibility-sync', () => {
  it('syncs prompt text and learn-notes prompt visibility', () => {
    syncPromptUiState({
      promptText: 'Play note A',
      workflow: 'learn-notes',
      sessionActive: true,
    });

    expect(mocks.renderPromptText).toHaveBeenCalledWith('Play note A');
    expect(mocks.renderLearnNotesPromptVisibility).toHaveBeenCalledWith({
      workflow: 'learn-notes',
      sessionActive: true,
      hasPromptText: true,
    });
  });

  it('syncs timed info visibility', () => {
    syncTimedInfoUiState({
      mode: 'random',
      workflow: 'practice',
      sessionActive: false,
      timedInfoVisible: true,
    });

    expect(mocks.renderTimedInfoVisibility).toHaveBeenCalledWith({
      mode: 'random',
      workflow: 'practice',
      sessionActive: false,
      timedInfoVisible: true,
    });
  });
});
