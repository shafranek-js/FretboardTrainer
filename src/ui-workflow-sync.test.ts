import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  renderPracticeSetupModeVisibilityView: vi.fn(),
  renderMelodySetupModeVisibilityView: vi.fn(),
  renderPlaybackControlsModeVisibilityView: vi.fn(),
  renderDisplayControlsModeVisibilityView: vi.fn(),
  renderSessionToolsModeVisibilityView: vi.fn(),
  renderTrainingModeFieldVisibilityView: vi.fn(),
  renderTrainingModeWorkflowOptionsView: vi.fn(),
  renderUiModeSwitcherView: vi.fn(),
  renderUiModeVisibilityView: vi.fn(),
  renderWorkflowCopyView: vi.fn(),
  renderWorkflowSwitcherView: vi.fn(),
  renderHintButtonVisibility: vi.fn(),
  renderLearnNotesPromptVisibility: vi.fn(),
  renderSessionToggleButton: vi.fn(),
  renderTimedInfoVisibility: vi.fn(),
  renderLoadingView: vi.fn(),
  getTrainingModeUiVisibility: vi.fn(),
  getWorkflowUiCopy: vi.fn(),
  getMelodySelectionSectionCopy: vi.fn(),
  getTrainingModeFieldCopy: vi.fn(),
  resolveWorkflowLayout: vi.fn(),
  dom: {
    melodyShowTabTimeline: { checked: true },
    melodyShowScrollingTab: { checked: false },
  },
}));

vi.mock('./dom', () => ({ dom: mocks.dom }));
vi.mock('./training-mode-ui', () => ({
  getTrainingModeUiVisibility: mocks.getTrainingModeUiVisibility,
}));
vi.mock('./workflow-ui-copy', () => ({
  getWorkflowUiCopy: mocks.getWorkflowUiCopy,
  getMelodySelectionSectionCopy: mocks.getMelodySelectionSectionCopy,
  getTrainingModeFieldCopy: mocks.getTrainingModeFieldCopy,
}));
vi.mock('./workflow-layout', () => ({
  resolveWorkflowLayout: mocks.resolveWorkflowLayout,
}));
vi.mock('./ui-workflow-layout-view', () => ({
  renderPracticeSetupModeVisibilityView: mocks.renderPracticeSetupModeVisibilityView,
  renderMelodySetupModeVisibilityView: mocks.renderMelodySetupModeVisibilityView,
  renderPlaybackControlsModeVisibilityView: mocks.renderPlaybackControlsModeVisibilityView,
  renderDisplayControlsModeVisibilityView: mocks.renderDisplayControlsModeVisibilityView,
  renderSessionToolsModeVisibilityView: mocks.renderSessionToolsModeVisibilityView,
  renderTrainingModeFieldVisibilityView: mocks.renderTrainingModeFieldVisibilityView,
  renderTrainingModeWorkflowOptionsView: mocks.renderTrainingModeWorkflowOptionsView,
  renderUiModeSwitcherView: mocks.renderUiModeSwitcherView,
  renderUiModeVisibilityView: mocks.renderUiModeVisibilityView,
  renderWorkflowCopyView: mocks.renderWorkflowCopyView,
  renderWorkflowSwitcherView: mocks.renderWorkflowSwitcherView,
}));
vi.mock('./ui-session-controls-view', () => ({
  renderHintButtonVisibility: mocks.renderHintButtonVisibility,
  renderLearnNotesPromptVisibility: mocks.renderLearnNotesPromptVisibility,
  renderSessionToggleButton: mocks.renderSessionToggleButton,
  renderTimedInfoVisibility: mocks.renderTimedInfoVisibility,
}));
vi.mock('./ui-loading-view', () => ({
  renderLoadingView: mocks.renderLoadingView,
}));

import {
  syncDisplayControlsVisibilityState,
  syncLoadingUiState,
  syncTrainingModeUiState,
  syncUiModeState,
  syncWorkflowUiState,
} from './ui-workflow-sync';

describe('ui-workflow-sync', () => {
  it('syncs training mode workflow visibility cluster', () => {
    const layout = {
      sessionTools: { showShowStringTogglesRow: true },
    };
    const visibility = { helperText: '', showMelodySelector: true };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);
    mocks.getTrainingModeUiVisibility.mockReturnValue(visibility);
    mocks.getTrainingModeFieldCopy.mockReturnValue({ label: 'Mode', fieldHintPrefix: 'Mode' });

    syncTrainingModeUiState({
      mode: 'random',
      workflow: 'practice',
      sessionActive: true,
      timedInfoVisible: true,
      practiceSetupSummaryText: 'Practice',
      melodySetupSummaryText: 'Melody',
      sessionToolsSummaryText: 'Tools',
      layoutControlsExpanded: false,
      showStringTogglesChecked: true,
    });

    expect(mocks.resolveWorkflowLayout).toHaveBeenCalledWith({
      workflow: 'practice',
      trainingMode: 'random',
      showTabTimeline: true,
      showScrollingTab: false,
    });
    expect(mocks.renderTrainingModeFieldVisibilityView).toHaveBeenCalledWith({
      visibility,
      trainingModeCopy: { label: 'Mode', fieldHintPrefix: 'Mode' },
    });
    expect(mocks.renderHintButtonVisibility).toHaveBeenCalledWith({
      mode: 'random',
      workflow: 'practice',
      sessionActive: true,
    });
    expect(mocks.renderPracticeSetupModeVisibilityView).toHaveBeenCalledWith(
      layout,
      'Practice',
      expect.any(Function)
    );
    expect(mocks.renderSessionToolsModeVisibilityView).toHaveBeenCalledWith(
      layout,
      'Tools',
      true,
      expect.any(Function)
    );
  });

  it('syncs workflow cluster and toggle button state', () => {
    const layout = {
      sessionTools: { showShowStringTogglesRow: false },
    };
    const visibility = { helperText: '', showMelodySelector: true };
    const workflowCopy = { melodySetupLabelMobile: 'Melody' };
    const melodySelectionCopy = { sectionHint: 'Hint' };
    const trainingModeCopy = { label: 'Focus', fieldHintPrefix: 'Focus' };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);
    mocks.getTrainingModeUiVisibility.mockReturnValue(visibility);
    mocks.getWorkflowUiCopy.mockReturnValue(workflowCopy);
    mocks.getMelodySelectionSectionCopy.mockReturnValue(melodySelectionCopy);
    mocks.getTrainingModeFieldCopy.mockReturnValue(trainingModeCopy);

    syncWorkflowUiState({
      workflow: 'learn-notes',
      mode: 'random',
      uiMode: 'advanced',
      sessionActive: false,
      timedInfoVisible: false,
      practiceSetupSummaryText: 'Practice',
      melodySetupSummaryText: 'Melody',
      sessionToolsSummaryText: 'Tools',
      layoutControlsExpanded: true,
      showStringTogglesChecked: true,
      hasPromptText: true,
      startDisabled: false,
      stopDisabled: true,
      isLoading: true,
    });

    expect(mocks.renderWorkflowSwitcherView).toHaveBeenCalledWith('learn-notes', expect.any(Function));
    expect(mocks.renderWorkflowCopyView).toHaveBeenCalledWith({
      workflow: 'learn-notes',
      copy: workflowCopy,
      melodySelectionCopy,
      trainingModeCopy,
    });
    expect(mocks.renderTrainingModeWorkflowOptionsView).toHaveBeenCalledWith('learn-notes');
    expect(mocks.renderUiModeVisibilityView).toHaveBeenCalledWith('advanced', true);
    expect(mocks.renderLearnNotesPromptVisibility).toHaveBeenCalledWith({
      workflow: 'learn-notes',
      sessionActive: false,
      hasPromptText: true,
    });
    expect(mocks.renderSessionToggleButton).toHaveBeenCalledWith({
      startDisabled: false,
      stopDisabled: true,
      isLoading: true,
      workflow: 'learn-notes',
    });
  });

  it('syncs ui mode, loading state and display controls visibility', () => {
    const layout = {
      sessionTools: { showShowStringTogglesRow: false },
    };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);

    syncUiModeState({ uiMode: 'simple', workflow: 'practice' });
    expect(mocks.renderUiModeSwitcherView).toHaveBeenCalledWith('simple', expect.any(Function));
    expect(mocks.renderUiModeVisibilityView).toHaveBeenCalledWith('simple', false);

    syncLoadingUiState({
      isLoading: true,
      message: 'Loading',
      startDisabled: false,
      stopDisabled: true,
      workflow: 'practice',
    });
    expect(mocks.renderLoadingView).toHaveBeenCalledWith(
      { isLoading: true, message: 'Loading' },
      { startDisabled: false }
    );
    expect(mocks.renderSessionToggleButton).toHaveBeenCalledWith({
      startDisabled: false,
      stopDisabled: true,
      isLoading: true,
      workflow: 'practice',
    });

    syncDisplayControlsVisibilityState({
      mode: 'melody',
      workflow: 'study-melody',
      layoutControlsExpanded: true,
    });
    expect(mocks.renderDisplayControlsModeVisibilityView).toHaveBeenCalledWith(
      layout,
      true,
      expect.any(Function)
    );
  });
});
