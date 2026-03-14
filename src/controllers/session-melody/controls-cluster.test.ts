import { describe, expect, it, vi } from 'vitest';
import { createSessionMelodyControlsCluster } from './controls-cluster';

function createDeps() {
  return {
    melodyEditingControls: {
      dom: {} as never,
      state: {} as never,
      maxFret: 24,
      saveSettings: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      updateSelectedMelodyEventEditorNotePosition: vi.fn(),
      addMelodyEventEditorNote: vi.fn(),
      deleteSelectedMelodyEventEditorNote: vi.fn(),
      undoMelodyEventEditorMutation: vi.fn(),
      redoMelodyEventEditorMutation: vi.fn(),
      renderMelodyEventEditorInspector: vi.fn(),
      handleTimelineHotkey: vi.fn(() => false),
      syncMelodyTimelineEditingState: vi.fn(),
      clearMelodyTimelineSelection: vi.fn(),
      clearMelodyTimelineContextMenu: vi.fn(() => false),
      renderMelodyTabTimelineFromState: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
      showNonBlockingError: vi.fn(),
    },
    melodyPlaybackControls: {
      dom: {} as never,
      state: {} as never,
      setPracticeSetupCollapsed: vi.fn(),
      startMelodyDemoPlayback: vi.fn(),
      pauseMelodyDemoPlayback: vi.fn(),
      resumeMelodyDemoPlayback: vi.fn(),
      stopMelodyDemoPlayback: vi.fn(),
      stepMelodyPreview: vi.fn(),
      isPlaying: vi.fn(() => false),
      isPaused: vi.fn(() => false),
      canHandleHotkeys: vi.fn(() => false),
      getTrainingMode: vi.fn(() => 'melody'),
      isMelodyWorkflowMode: vi.fn(() => true),
      isTextEntryElement: vi.fn(() => false),
      isAnyBlockingModalOpen: vi.fn(() => false),
    },
    melodyLibraryControls: {
      dom: {} as never,
      state: {} as never,
      stopMelodyDemoPlayback: vi.fn(),
      stopListening: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
      getTrainingMode: vi.fn(() => 'melody'),
      exportSelectedMelodyAsMidi: vi.fn(),
      bakeSelectedPracticeAdjustedMelodyAsCustom: vi.fn(),
      getSelectedMelodyId: vi.fn(() => null),
      isCustomMelodyId: vi.fn(() => false),
      confirmUserAction: vi.fn(async () => true),
      deleteCustomMelody: vi.fn(() => false),
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      markCurriculumPresetAsCustom: vi.fn(),
      updatePracticeSetupSummary: vi.fn(),
      saveSettings: vi.fn(),
      setResultMessage: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
    },
  };
}

describe('session-melody-controls-cluster', () => {
  it('creates the melody editing/playback/library controllers as one cluster', () => {
    const cluster = createSessionMelodyControlsCluster(createDeps() as never);

    expect(cluster.melodyEditingControlsController).toBeTruthy();
    expect(cluster.melodyPlaybackControlsController).toBeTruthy();
    expect(cluster.melodyLibraryControlsController).toBeTruthy();
  });
});
