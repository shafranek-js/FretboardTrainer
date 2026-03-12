import { dom } from '../dom';
import { state } from '../state';
import type { MelodyDefinition } from '../melody-library';
import { createSessionEditorControlsCluster } from './session-editor-controls-cluster';

interface SelectedMelodyContextControllerLike {
  getSelectedMelodyId(): string | null;
}

interface MelodyTimelineEditingBridgeControllerLike {
  canEditSelectedMelodyOnTimeline(): { editable: false; reason: string } | { editable: true; melody: MelodyDefinition };
  ensureDraftLoaded(melody: MelodyDefinition): void;
  ensureSelection(): void;
  syncState(statusText?: string): void;
  moveSelectedNoteToString(targetStringName: string, options?: { commit?: boolean }): void;
  adjustSelectedNoteFret(direction: -1 | 1): void;
  moveSelectedEventToIndex(targetIndex: number): void;
  adjustDuration(direction: -1 | 1): void;
  addNote(): void;
  setSelectedNoteFinger(finger: number | null): void;
  addNoteAtEventString(eventIndex: number, stringName: string): void;
  addEventAfterSelection(): void;
  duplicateEvent(): void;
  splitEvent(): void;
  mergeEventWithNext(): void;
  deleteNote(): void;
  deleteEvent(): void;
  undo(): void;
  redo(): void;
}

interface MelodyEventEditorBridgeControllerLike {
  deleteSelectedNote(): void;
  undo(): void;
  redo(): void;
  updateSelectedNotePosition(stringName: string, fretValue: number): void;
  addNote(): void;
  renderInspector(): void;
}

interface MelodyTimelineUiControllerLike {
  refreshUi(): void;
  stopPlaybackForEditing(): void;
}

interface MelodyDemoRuntimeControllerLike {
  startPlayback(): Promise<void>;
  pausePlayback(): void;
  resumePlayback(): Promise<void>;
  stopPlayback(options?: { clearUi?: boolean; message?: string }): void;
  stepPreview(direction: -1 | 1): Promise<void>;
  isPlaying(): boolean;
  isPaused(): boolean;
  shouldHandleHotkeys(): boolean;
}

interface MelodyLibraryActionsControllerLike {
  exportSelectedMelodyAsMidi(): Promise<void>;
  bakeSelectedPracticeAdjustedMelodyAsCustom(): void;
}

interface CurriculumPresetBridgeControllerLike {
  markAsCustom(): void;
}

interface PracticeSetupSummaryControllerLike {
  update(): void;
}

interface SessionEditorGraphClusterDeps {
  dom: typeof dom;
  state: typeof state;
  maxFret: number;
  saveSettings: () => void;
  stopListening: () => void;
  setPracticeSetupCollapsed: (collapsed: boolean) => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  isMelodyWorkflowMode: (mode: string) => boolean;
  isTextEntryElement: (target: EventTarget | null) => boolean;
  isElementWithin: (target: EventTarget | null, container: HTMLElement | null | undefined) => boolean;
  isAnyBlockingModalOpen: () => boolean;
  clearMelodyTimelineContextMenu: () => boolean;
  renderMelodyTabTimelineFromState: () => void;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  confirmUserAction: (message: string) => Promise<boolean>;
  isCustomMelodyId: (melodyId: string | null) => boolean;
  deleteCustomMelody: (melodyId: string) => boolean;
  refreshMelodyOptionsForCurrentInstrument: () => void;
  selectedMelodyContextController: SelectedMelodyContextControllerLike;
  melodyTimelineEditingBridgeController: MelodyTimelineEditingBridgeControllerLike;
  melodyEventEditorBridgeController: MelodyEventEditorBridgeControllerLike;
  melodyTimelineUiController: MelodyTimelineUiControllerLike;
  melodyDemoRuntimeController: MelodyDemoRuntimeControllerLike;
  melodyLibraryActionsController: MelodyLibraryActionsControllerLike;
  curriculumPresetBridgeController: CurriculumPresetBridgeControllerLike;
  practiceSetupSummaryController: PracticeSetupSummaryControllerLike;
}

export function createSessionEditorGraphCluster(deps: SessionEditorGraphClusterDeps) {
  return createSessionEditorControlsCluster({
    studyMelodyMicTuning: {
      dom: deps.dom,
      state: deps.state,
      saveSettings: deps.saveSettings,
    },
    melodyTimelineEditing: {
      getSelectedMelodyId: () => deps.selectedMelodyContextController.getSelectedMelodyId(),
      isEditorWorkflowActive: () => deps.state.uiWorkflow === 'editor',
      canEditSelectedMelodyOnTimeline: () => deps.melodyTimelineEditingBridgeController.canEditSelectedMelodyOnTimeline(),
      ensureDraftLoaded: (melody) => deps.melodyTimelineEditingBridgeController.ensureDraftLoaded(melody),
      ensureSelection: () => deps.melodyTimelineEditingBridgeController.ensureSelection(),
      syncState: (statusText) => deps.melodyTimelineEditingBridgeController.syncState(statusText),
      renderTimeline: deps.renderMelodyTabTimelineFromState,
      stopPlaybackForEditing: () => deps.melodyTimelineUiController.stopPlaybackForEditing(),
      moveSelectedNoteToString: (targetStringName, options) =>
        deps.melodyTimelineEditingBridgeController.moveSelectedNoteToString(targetStringName, options),
      adjustSelectedNoteFret: (direction) => deps.melodyTimelineEditingBridgeController.adjustSelectedNoteFret(direction),
      moveSelectedEventToIndex: (targetIndex) => deps.melodyTimelineEditingBridgeController.moveSelectedEventToIndex(targetIndex),
      adjustDuration: (direction) => deps.melodyTimelineEditingBridgeController.adjustDuration(direction),
      addNote: () => deps.melodyTimelineEditingBridgeController.addNote(),
      setSelectedNoteFinger: (finger) => deps.melodyTimelineEditingBridgeController.setSelectedNoteFinger(finger),
      addNoteAtEventString: (eventIndex, stringName) =>
        deps.melodyTimelineEditingBridgeController.addNoteAtEventString(eventIndex, stringName),
      addEventAfterSelection: () => deps.melodyTimelineEditingBridgeController.addEventAfterSelection(),
      duplicateEvent: () => deps.melodyTimelineEditingBridgeController.duplicateEvent(),
      splitEvent: () => deps.melodyTimelineEditingBridgeController.splitEvent(),
      mergeEventWithNext: () => deps.melodyTimelineEditingBridgeController.mergeEventWithNext(),
      deleteNote: () => deps.melodyTimelineEditingBridgeController.deleteNote(),
      deleteEvent: () => deps.melodyTimelineEditingBridgeController.deleteEvent(),
      deleteEventEditorNote: () => deps.melodyEventEditorBridgeController.deleteSelectedNote(),
      undo: () => deps.melodyTimelineEditingBridgeController.undo(),
      redo: () => deps.melodyTimelineEditingBridgeController.redo(),
      undoEventEditor: () => deps.melodyEventEditorBridgeController.undo(),
      redoEventEditor: () => deps.melodyEventEditorBridgeController.redo(),
      showNonBlockingError: deps.showNonBlockingError,
      formatUserFacingError: deps.formatUserFacingError,
      isTextEntryElement: deps.isTextEntryElement,
      isElementWithin: deps.isElementWithin,
      isAnyBlockingModalOpen: deps.isAnyBlockingModalOpen,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    },
    melodyControls: {
      melodyEditingControls: {
        dom: deps.dom,
        state: deps.state,
        maxFret: deps.maxFret,
        saveSettings: deps.saveSettings,
        refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
        updateSelectedMelodyEventEditorNotePosition: (stringName, fretValue) =>
          deps.melodyEventEditorBridgeController.updateSelectedNotePosition(stringName, fretValue),
        addMelodyEventEditorNote: () => deps.melodyEventEditorBridgeController.addNote(),
        deleteSelectedMelodyEventEditorNote: () => deps.melodyEventEditorBridgeController.deleteSelectedNote(),
        undoMelodyEventEditorMutation: () => deps.melodyEventEditorBridgeController.undo(),
        redoMelodyEventEditorMutation: () => deps.melodyEventEditorBridgeController.redo(),
        renderMelodyEventEditorInspector: () => deps.melodyEventEditorBridgeController.renderInspector(),
        syncMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.syncState(),
        clearMelodyTimelineContextMenu: deps.clearMelodyTimelineContextMenu,
        renderMelodyTabTimelineFromState: deps.renderMelodyTabTimelineFromState,
        formatUserFacingError: deps.formatUserFacingError,
        showNonBlockingError: deps.showNonBlockingError,
      },
      melodyPlaybackControls: {
        dom: deps.dom,
        state: deps.state,
        setPracticeSetupCollapsed: deps.setPracticeSetupCollapsed,
        startMelodyDemoPlayback: () => deps.melodyDemoRuntimeController.startPlayback(),
        pauseMelodyDemoPlayback: () => deps.melodyDemoRuntimeController.pausePlayback(),
        resumeMelodyDemoPlayback: () => deps.melodyDemoRuntimeController.resumePlayback(),
        stopMelodyDemoPlayback: (options) => deps.melodyDemoRuntimeController.stopPlayback(options),
        stepMelodyPreview: (direction) => deps.melodyDemoRuntimeController.stepPreview(direction),
        isPlaying: () => deps.melodyDemoRuntimeController.isPlaying(),
        isPaused: () => deps.melodyDemoRuntimeController.isPaused(),
        canHandleHotkeys: () => deps.melodyDemoRuntimeController.shouldHandleHotkeys(),
        getTrainingMode: () => deps.dom.trainingMode.value,
        isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
        isTextEntryElement: deps.isTextEntryElement,
        isAnyBlockingModalOpen: deps.isAnyBlockingModalOpen,
      },
      melodyLibraryControls: {
        dom: deps.dom,
        state: deps.state,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
        stopListening: deps.stopListening,
        isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
        getTrainingMode: () => deps.dom.trainingMode.value,
        exportSelectedMelodyAsMidi: () => deps.melodyLibraryActionsController.exportSelectedMelodyAsMidi(),
        bakeSelectedPracticeAdjustedMelodyAsCustom: () =>
          deps.melodyLibraryActionsController.bakeSelectedPracticeAdjustedMelodyAsCustom(),
        getSelectedMelodyId: () => deps.selectedMelodyContextController.getSelectedMelodyId(),
        isCustomMelodyId: deps.isCustomMelodyId,
        confirmUserAction: deps.confirmUserAction,
        deleteCustomMelody: deps.deleteCustomMelody,
        refreshMelodyOptionsForCurrentInstrument: deps.refreshMelodyOptionsForCurrentInstrument,
        markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
        updatePracticeSetupSummary: () => deps.practiceSetupSummaryController.update(),
        saveSettings: deps.saveSettings,
        setResultMessage: deps.setResultMessage,
        showNonBlockingError: deps.showNonBlockingError,
        formatUserFacingError: deps.formatUserFacingError,
      },
    },
  });
}
