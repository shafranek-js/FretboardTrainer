import { dom } from '../../dom';
import type { AppState } from '../../state';
import type { MelodyDefinition } from '../../melody-library';
import { createSessionEditorControlsCluster } from './controls-cluster';

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
  state: SessionEditorGraphState;
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

type SessionEditorStudyMelodyMicTuningState =
  Parameters<typeof createSessionEditorControlsCluster>[0]['studyMelodyMicTuning']['state'];
type SessionEditorMelodyTimelineEditingState = Pick<AppState, 'uiWorkflow'>;
type SessionEditorMelodyEditingControlsState =
  Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyEditingControls']['state'];
type SessionEditorMelodyPlaybackControlsState =
  Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyPlaybackControls']['state'];
type SessionEditorMelodyLibraryControlsState =
  Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyLibraryControls']['state'];
type SessionEditorGraphState =
  SessionEditorStudyMelodyMicTuningState
  & SessionEditorMelodyTimelineEditingState
  & SessionEditorMelodyEditingControlsState
  & SessionEditorMelodyPlaybackControlsState
  & SessionEditorMelodyLibraryControlsState;
type StudyMelodyMicTuningBuilderContext = ReturnType<typeof createStudyMelodyMicTuningContext>;
type MelodyTimelineEditingBuilderContext = ReturnType<typeof createMelodyTimelineEditingContext>;
type MelodyEditingControlsBuilderContext = ReturnType<typeof createMelodyEditingControlsContext>;
type MelodyPlaybackControlsBuilderContext = ReturnType<typeof createMelodyPlaybackControlsContext>;
type MelodyLibraryControlsBuilderContext = ReturnType<typeof createMelodyLibraryControlsContext>;

function createStudyMelodyMicTuningState(
  appState: SessionEditorGraphClusterDeps['state']
): SessionEditorStudyMelodyMicTuningState {
  const tuningState = {} as SessionEditorStudyMelodyMicTuningState;

  Object.defineProperties(tuningState, {
    preEmphasisFilter: {
      enumerable: true,
      get: () => appState.preEmphasisFilter,
      set: (value: SessionEditorStudyMelodyMicTuningState['preEmphasisFilter']) => {
        appState.preEmphasisFilter = value;
      },
    },
    studyMelodyMicGatePercent: {
      enumerable: true,
      get: () => appState.studyMelodyMicGatePercent,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyMicGatePercent']) => {
        appState.studyMelodyMicGatePercent = value;
      },
    },
    studyMelodyMicNoiseGuardPercent: {
      enumerable: true,
      get: () => appState.studyMelodyMicNoiseGuardPercent,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyMicNoiseGuardPercent']) => {
        appState.studyMelodyMicNoiseGuardPercent = value;
      },
    },
    studyMelodyMicSilenceResetFrames: {
      enumerable: true,
      get: () => appState.studyMelodyMicSilenceResetFrames,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyMicSilenceResetFrames']) => {
        appState.studyMelodyMicSilenceResetFrames = value;
      },
    },
    studyMelodyMicStableFrames: {
      enumerable: true,
      get: () => appState.studyMelodyMicStableFrames,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyMicStableFrames']) => {
        appState.studyMelodyMicStableFrames = value;
      },
    },
    studyMelodyPreEmphasisFrequencyHz: {
      enumerable: true,
      get: () => appState.studyMelodyPreEmphasisFrequencyHz,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyPreEmphasisFrequencyHz']) => {
        appState.studyMelodyPreEmphasisFrequencyHz = value;
      },
    },
    studyMelodyPreEmphasisGainDb: {
      enumerable: true,
      get: () => appState.studyMelodyPreEmphasisGainDb,
      set: (value: SessionEditorStudyMelodyMicTuningState['studyMelodyPreEmphasisGainDb']) => {
        appState.studyMelodyPreEmphasisGainDb = value;
      },
    },
  });

  return tuningState;
}

function createMelodyTimelineEditingState(
  appState: SessionEditorGraphClusterDeps['state']
): SessionEditorMelodyTimelineEditingState {
  const timelineEditingState = {} as SessionEditorMelodyTimelineEditingState;

  Object.defineProperties(timelineEditingState, {
    uiWorkflow: {
      enumerable: true,
      get: () => appState.uiWorkflow,
      set: (value: SessionEditorMelodyTimelineEditingState['uiWorkflow']) => {
        appState.uiWorkflow = value;
      },
    },
  });

  return timelineEditingState;
}

function createMelodyEditingControlsState(
  appState: SessionEditorGraphClusterDeps['state']
): SessionEditorMelodyEditingControlsState {
  const editingControlsState = {} as SessionEditorMelodyEditingControlsState;

  Object.defineProperties(editingControlsState, {
    melodyTimelineSelectedEventIndex: {
      enumerable: true,
      get: () => appState.melodyTimelineSelectedEventIndex,
      set: (value: SessionEditorMelodyEditingControlsState['melodyTimelineSelectedEventIndex']) => {
        appState.melodyTimelineSelectedEventIndex = value;
      },
    },
    melodyTimelineSelectedNoteIndex: {
      enumerable: true,
      get: () => appState.melodyTimelineSelectedNoteIndex,
      set: (value: SessionEditorMelodyEditingControlsState['melodyTimelineSelectedNoteIndex']) => {
        appState.melodyTimelineSelectedNoteIndex = value;
      },
    },
    melodyTimelineViewMode: {
      enumerable: true,
      get: () => appState.melodyTimelineViewMode,
      set: (value: SessionEditorMelodyEditingControlsState['melodyTimelineViewMode']) => {
        appState.melodyTimelineViewMode = value;
      },
    },
  });

  return editingControlsState;
}

function createMelodyPlaybackControlsState(
  appState: SessionEditorGraphClusterDeps['state']
): SessionEditorMelodyPlaybackControlsState {
  const playbackControlsState = {} as SessionEditorMelodyPlaybackControlsState;

  Object.defineProperties(playbackControlsState, {
    isListening: {
      enumerable: true,
      get: () => appState.isListening,
    },
  });

  return playbackControlsState;
}

function createMelodyLibraryControlsState(
  appState: SessionEditorGraphClusterDeps['state']
): SessionEditorMelodyLibraryControlsState {
  const libraryControlsState = {} as SessionEditorMelodyLibraryControlsState;

  Object.defineProperties(libraryControlsState, {
    isListening: {
      enumerable: true,
      get: () => appState.isListening,
    },
  });

  return libraryControlsState;
}

function createStudyMelodyMicTuningContext(deps: SessionEditorGraphClusterDeps) {
  return {
    dom: deps.dom,
    state: createStudyMelodyMicTuningState(deps.state),
    saveSettings: deps.saveSettings,
  };
}

function createMelodyTimelineEditingContext(deps: SessionEditorGraphClusterDeps) {
  return {
    state: createMelodyTimelineEditingState(deps.state),
    renderMelodyTabTimelineFromState: deps.renderMelodyTabTimelineFromState,
    showNonBlockingError: deps.showNonBlockingError,
    formatUserFacingError: deps.formatUserFacingError,
    isTextEntryElement: deps.isTextEntryElement,
    isElementWithin: deps.isElementWithin,
    isAnyBlockingModalOpen: deps.isAnyBlockingModalOpen,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyTimelineEditingBridgeController: deps.melodyTimelineEditingBridgeController,
    melodyEventEditorBridgeController: deps.melodyEventEditorBridgeController,
    melodyTimelineUiController: deps.melodyTimelineUiController,
  };
}

function createMelodyEditingControlsContext(deps: SessionEditorGraphClusterDeps) {
  return {
    dom: deps.dom,
    state: createMelodyEditingControlsState(deps.state),
    maxFret: deps.maxFret,
    saveSettings: deps.saveSettings,
    clearMelodyTimelineContextMenu: deps.clearMelodyTimelineContextMenu,
    renderMelodyTabTimelineFromState: deps.renderMelodyTabTimelineFromState,
    formatUserFacingError: deps.formatUserFacingError,
    showNonBlockingError: deps.showNonBlockingError,
    melodyTimelineEditingBridgeController: deps.melodyTimelineEditingBridgeController,
    melodyEventEditorBridgeController: deps.melodyEventEditorBridgeController,
    melodyTimelineUiController: deps.melodyTimelineUiController,
  };
}

function createMelodyPlaybackControlsContext(deps: SessionEditorGraphClusterDeps) {
  return {
    dom: deps.dom,
    state: createMelodyPlaybackControlsState(deps.state),
    setPracticeSetupCollapsed: deps.setPracticeSetupCollapsed,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    isTextEntryElement: deps.isTextEntryElement,
    isAnyBlockingModalOpen: deps.isAnyBlockingModalOpen,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
  };
}

function createMelodyLibraryControlsContext(deps: SessionEditorGraphClusterDeps) {
  return {
    dom: deps.dom,
    state: createMelodyLibraryControlsState(deps.state),
    saveSettings: deps.saveSettings,
    stopListening: deps.stopListening,
    setResultMessage: deps.setResultMessage,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    confirmUserAction: deps.confirmUserAction,
    isCustomMelodyId: deps.isCustomMelodyId,
    deleteCustomMelody: deps.deleteCustomMelody,
    refreshMelodyOptionsForCurrentInstrument: deps.refreshMelodyOptionsForCurrentInstrument,
    showNonBlockingError: deps.showNonBlockingError,
    formatUserFacingError: deps.formatUserFacingError,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
    melodyLibraryActionsController: deps.melodyLibraryActionsController,
    curriculumPresetBridgeController: deps.curriculumPresetBridgeController,
    practiceSetupSummaryController: deps.practiceSetupSummaryController,
  };
}

function buildStudyMelodyMicTuning(
  deps: StudyMelodyMicTuningBuilderContext
): Parameters<typeof createSessionEditorControlsCluster>[0]['studyMelodyMicTuning'] {
  return {
    dom: deps.dom,
    state: deps.state,
    saveSettings: deps.saveSettings,
  };
}

function buildMelodyTimelineEditing(
  deps: MelodyTimelineEditingBuilderContext
): Parameters<typeof createSessionEditorControlsCluster>[0]['melodyTimelineEditing'] {
  return {
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
  };
}

function buildMelodyEditingControls(
  deps: MelodyEditingControlsBuilderContext
): Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyEditingControls'] {
  return {
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
  };
}

function buildMelodyPlaybackControls(
  deps: MelodyPlaybackControlsBuilderContext
): Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyPlaybackControls'] {
  return {
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
  };
}

function buildMelodyLibraryControls(
  deps: MelodyLibraryControlsBuilderContext
): Parameters<typeof createSessionEditorControlsCluster>[0]['melodyControls']['melodyLibraryControls'] {
  return {
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
  };
}

export function createSessionEditorGraphCluster(deps: SessionEditorGraphClusterDeps) {
  return createSessionEditorControlsCluster({
    studyMelodyMicTuning: buildStudyMelodyMicTuning(createStudyMelodyMicTuningContext(deps)),
    melodyTimelineEditing: buildMelodyTimelineEditing(createMelodyTimelineEditingContext(deps)),
    melodyControls: {
      melodyEditingControls: buildMelodyEditingControls(createMelodyEditingControlsContext(deps)),
      melodyPlaybackControls: buildMelodyPlaybackControls(createMelodyPlaybackControlsContext(deps)),
      melodyLibraryControls: buildMelodyLibraryControls(createMelodyLibraryControlsContext(deps)),
    },
  });
}

