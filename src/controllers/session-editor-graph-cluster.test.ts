import { describe, expect, it, vi } from 'vitest';

const { createSessionEditorControlsCluster } = vi.hoisted(() => ({
  createSessionEditorControlsCluster: vi.fn(),
}));

vi.mock('../dom', () => ({ dom: {} }));
vi.mock('../state', () => ({ state: {} }));
vi.mock('./session-editor-controls-cluster', () => ({
  createSessionEditorControlsCluster,
}));

describe('session-editor-graph-cluster', () => {
  it('wires editor and library graph callbacks through the session editor graph', async () => {
    const clusterResult = { melodyTimelineEditingController: {}, melodyLibraryControlsController: {} };
    createSessionEditorControlsCluster.mockReturnValue(clusterResult);

    const { createSessionEditorGraphCluster } = await import('./session-editor-graph-cluster');
    const stopPlaybackForEditing = vi.fn();
    const refreshMelodyOptionsForCurrentInstrument = vi.fn();

    const dom = {
      trainingMode: { value: 'practice' },
      exportMelodyMidiBtn: {}, bakePracticeMelodyBtn: {}, deleteMelodyBtn: {},
    } as any;

    const deps = {
      dom,
      state: { uiWorkflow: 'editor' } as any,
      maxFret: 24,
      saveSettings: vi.fn(),
      stopListening: vi.fn(),
      setPracticeSetupCollapsed: vi.fn(),
      setResultMessage: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
      isTextEntryElement: vi.fn(() => false),
      isElementWithin: vi.fn(() => false),
      isAnyBlockingModalOpen: vi.fn(() => false),
      clearMelodyTimelineContextMenu: vi.fn(() => false),
      renderMelodyTabTimelineFromState: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
      confirmUserAction: vi.fn(async () => true),
      deleteCustomMelody: vi.fn(() => true),
      refreshMelodyOptionsForCurrentInstrument,
      isCustomMelodyId: vi.fn(() => true),
      selectedMelodyContextController: {
        getSelectedMelodyId: vi.fn(() => 'm1'),
      },
      melodyTimelineEditingBridgeController: {
        canEditSelectedMelodyOnTimeline: vi.fn(() => ({ editable: false, reason: 'locked' })),
        ensureDraftLoaded: vi.fn(),
        ensureSelection: vi.fn(),
        syncState: vi.fn(),
        moveSelectedNoteToString: vi.fn(),
        adjustSelectedNoteFret: vi.fn(),
        moveSelectedEventToIndex: vi.fn(),
        adjustDuration: vi.fn(),
        addNote: vi.fn(),
        setSelectedNoteFinger: vi.fn(),
        addNoteAtEventString: vi.fn(),
        addEventAfterSelection: vi.fn(),
        duplicateEvent: vi.fn(),
        splitEvent: vi.fn(),
        mergeEventWithNext: vi.fn(),
        deleteNote: vi.fn(),
        deleteEvent: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
      },
      melodyEventEditorBridgeController: {
        deleteSelectedNote: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        updateSelectedNotePosition: vi.fn(),
        addNote: vi.fn(),
        renderInspector: vi.fn(),
      },
      melodyTimelineUiController: {
        refreshUi: vi.fn(),
        stopPlaybackForEditing,
      },
      melodyDemoRuntimeController: {
        startPlayback: vi.fn(async () => {}),
        pausePlayback: vi.fn(),
        resumePlayback: vi.fn(async () => {}),
        stopPlayback: vi.fn(),
        stepPreview: vi.fn(async () => {}),
        isPlaying: vi.fn(() => false),
        isPaused: vi.fn(() => false),
        shouldHandleHotkeys: vi.fn(() => true),
      },
      melodyLibraryActionsController: {
        exportSelectedMelodyAsMidi: vi.fn(async () => {}),
        bakeSelectedPracticeAdjustedMelodyAsCustom: vi.fn(),
      },
      curriculumPresetBridgeController: {
        markAsCustom: vi.fn(),
      },
      practiceSetupSummaryController: {
        update: vi.fn(),
      },
    };

    const result = createSessionEditorGraphCluster(deps as any);
    const args = createSessionEditorControlsCluster.mock.calls[0][0];

    args.melodyTimelineEditing.stopPlaybackForEditing();
    args.melodyControls.melodyLibraryControls.refreshMelodyOptionsForCurrentInstrument();

    expect(stopPlaybackForEditing).toHaveBeenCalledTimes(1);
    expect(refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
    expect(result).toBe(clusterResult);
  });
});
