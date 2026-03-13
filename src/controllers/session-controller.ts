import { dom } from '../dom';
import { state } from '../state';
import { saveSettings } from '../storage';
import {
  handleModeChange,
  redrawFretboard,
  scheduleMelodyTimelineRenderFromState,
  updateInstrumentUI,
  drawFretboard,
  renderMelodyTabTimelineFromState,
} from '../ui';
import { playSound, loadInstrumentSoundfont } from '../audio';
import {
  scheduleSessionTimeout,
  seekActiveMelodySessionToEvent,
  resetMicPolyphonicDetectorTelemetry,
  startListening,
  stopListening,
} from '../logic';
import { ensureAudioRuntime } from '../audio-runtime';
import { buildPromptAudioPlan } from '../prompt-audio-plan';
import { instruments } from '../instruments';
import {
  clearResultMessage,
  refreshDisplayFormatting,
  setMelodySetupSummary,
  setMelodySetupCollapsed,
  setPracticeSetupCollapsed,
  setPracticeSetupSummary,
  setSessionToolsCollapsed,
  setSessionToolsSummary,
  setModalVisible,
  setPromptText,
  refreshLayoutControlsVisibility,
  setResultMessage,
  setUiMode,
  setUiWorkflow,
  setLayoutControlsExpanded,
  toggleLayoutControlsExpanded,
} from '../ui-signals';
import { getEnabledStrings } from '../fretboard-ui-state';
import type { ChordNote } from '../types';
import { type CurriculumPresetKey } from '../curriculum-presets';
import {
  clampMetronomeVolumePercent,
  DEFAULT_METRONOME_BEATS_PER_BAR,
  setMetronomeMeter,
  setMetronomeTempo,
  setMetronomeVolume,
  startMetronome,
  stopMetronome,
  isMetronomeRunning,
  subscribeMetronomeBeat,
} from '../metronome';
import { resolveMelodyMetronomeMeterProfile } from '../melody-meter';
import { setNoteNamingPreference } from '../note-display';
import {
  normalizeAudioInputDeviceId,
  refreshAudioInputDeviceOptions,
  setPreferredAudioInputDeviceId,
} from '../audio-input-devices';
import {
  normalizeInputSource,
  normalizeMidiInputDeviceId,
  refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices,
  setInputSourcePreference,
  setPreferredMidiInputDeviceId,
} from '../midi-runtime';
import { formatUserFacingError, showNonBlockingError } from '../app-feedback';
import {
  deleteCustomMelody,
  getMelodyById,
  isCustomMelodyId,
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
  saveCustomEventMelody,
  type MelodyEvent,
  type MelodyDefinition,
  updateCustomEventMelody,
  updateCustomAsciiTabMelody,
} from '../melody-library';
import { confirmUserAction } from '../user-feedback-port';
import { refreshMicPolyphonicDetectorAudioInfoUi } from '../mic-polyphonic-detector-ui';
import { refreshMicPerformanceReadinessUi } from '../mic-performance-readiness-ui';
import {
  detectMicPolyphonicFrame,
  normalizeMicPolyphonicDetectorProvider,
} from '../mic-polyphonic-detector';
import { parseAsciiTabToMelodyEvents } from '../ascii-tab-melody-parser';
import { convertLoadedGpScoreTrackToImportedMelody, loadGpScoreFromBytes } from '../gp-import';
import {
  convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes,
  normalizeMidiImportQuantize,
  type MidiImportQuantize,
} from '../midi-file-import';
import {
  convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes,
} from '../musescore-file-import';
import { buildExportMidiFileName, exportMelodyToMidiBytes } from '../midi-file-export';
import { cloneMelodyEventsDraft as cloneMelodyEventsDraftModel } from '../melody-timeline-editing';
import {
  clearMelodyTransposeCache,
  formatMelodyTransposeSemitones,
  normalizeMelodyTransposeSemitones,
} from '../melody-transposition';
import {
  clearMelodyStringShiftCache,
  formatMelodyStringShift,
  getMelodyWithPracticeAdjustments,
  isMelodyStringShiftFeasible,
  normalizeMelodyStringShift,
} from '../melody-string-shift';
import {
  clearMelodyTimelineContextMenu,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineStudyRangeCommitHandler,
} from '../melody-tab-timeline';
import { updateScrollingTabPanelRuntime } from '../scrolling-tab-panel';
import { createMelodyTimelineEditingController } from './melody-timeline-editing-controller';
import { createMelodyTimelineEditingBridgeController } from './melody-timeline-editing-bridge-controller';
import { createMelodyTimelineEditingOrchestrator } from './melody-timeline-editing-orchestrator';
import { createMelodyImportEditorCluster } from './melody-import-editor-cluster';
import { createMelodyEditingControlsController } from './melody-editing-controls-controller';
import { createMelodyPlaybackControlsController } from './melody-playback-controls-controller';
import { createMelodyLibraryControlsController } from './melody-library-controls-controller';
import { createPracticePresetControlsController } from './practice-preset-controls-controller';
import { createPracticeSetupControlsController } from './practice-setup-controls-controller';
import { createInstrumentDisplayControlsController } from './instrument-display-controls-controller';
import { createMelodySetupControlsController } from './melody-setup-controls-controller';
import { createMelodyPracticeControlsController } from './melody-practice-controls-controller';
import { createSessionTransportControlsController } from './session-transport-controls-controller';
import { createAudioInputControlsController } from './audio-input-controls-controller';
import { createMelodyTempoController } from './melody-tempo-controller';
import { createSessionBootstrapController } from './session-bootstrap-controller';
import { createSessionStartController } from './session-start-controller';
import { createPracticePresetUiController } from './practice-preset-ui-controller';
import { createMelodyPracticeSettingsController } from './melody-practice-settings-controller';
import { createMelodyPracticeSettingsBridgeController } from './melody-practice-settings-bridge-controller';
import { createMelodySetupUiController } from './melody-setup-ui-controller';
import { createPracticeSetupSummaryController } from './practice-setup-summary-controller';
import { createCurriculumPresetController } from './curriculum-preset-controller';
import { createCurriculumPresetBridgeController } from './curriculum-preset-bridge-controller';
import { createMetronomeController } from './metronome-controller';
import { createMetronomeRuntimeBridgeController } from './metronome-runtime-bridge-controller';
import { createMetronomeControlsController } from './metronome-controls-controller';
import { createMicSettingsController } from './mic-settings-controller';
import { createInputDeviceController } from './input-device-controller';
import { createMelodyPracticeActionsController } from './melody-practice-actions-controller';
import { createMelodyDemoRuntimeController } from './melody-demo-runtime-controller';
import { createMicPolyphonicBenchmarkController } from './mic-polyphonic-benchmark-controller';
import { createMicPolyphonicTelemetryController } from './mic-polyphonic-telemetry-controller';
import { registerModalControls } from './modal-controller';
import { registerConfirmControls } from './confirm-controller';
import { registerProfileControls } from './profile-controller';
import { createWorkflowLayoutController } from './workflow-layout-controller';
import { createWorkflowLayoutControlsController } from './workflow-layout-controls-controller';
import { createWorkflowController } from './workflow-controller';
import { createStudyMelodyMicTuningController } from './study-melody-mic-tuning-controller';
import { createMelodySelectionController } from './melody-selection-controller';
import { createMelodyTimelineUiController } from './melody-timeline-ui-controller';
import { createSelectedMelodyContextController } from './selected-melody-context-controller';
import { createInteractionGuardsController } from './interaction-guards-controller';
import { createMetronomeBridgeController } from './metronome-bridge-controller';
import { DEFAULT_TABLATURE_MAX_FRET } from '../tablature-optimizer';
import {
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  isDefaultMelodyStudyRange,
  type MelodyStudyRange,
} from '../melody-study-range';
import { isMelodyWorkflowMode, isPerformanceStyleMode } from '../training-mode-groups';
import { clampMelodyPlaybackBpm } from '../melody-timeline-duration';
import { ONBOARDING_COMPLETED_KEY } from '../app-storage-keys';
import {
  getPlaybackCompletedLabel,
  getPlaybackPromptLabel,
  getPlaybackTransportIdleLabel,
} from '../workflow-ui-copy';
const selectedMelodyContextController = createSelectedMelodyContextController({
  dom: { melodySelector: dom.melodySelector, trainingMode: dom.trainingMode },
  state,
  getMelodyById,
  isMelodyWorkflowMode,
  defaultMeterProfile: {
    beatsPerBar: DEFAULT_METRONOME_BEATS_PER_BAR,
    beatUnitDenominator: 4,
    secondaryAccentBeatIndices: [],
  },
  resolveMelodyMetronomeMeterProfile,
  setMetronomeMeter,
});
function cloneMelodyEventsDraft(events: MelodyEvent[]) {
  return cloneMelodyEventsDraftModel(events);
}
function getSelectedMidiImportQuantize(): MidiImportQuantize {
  return normalizeMidiImportQuantize(dom.melodyMidiQuantize.value);
}
const {
  melodyEventEditorBridgeController,
  melodyImportWorkspaceController,
  melodyLibraryActionsController,
  melodyImportControlsController,
} = createMelodyImportEditorCluster({
  dom,
  state,
  cloneDraft: cloneMelodyEventsDraft,
  formatUserFacingError,
  setResultMessage,
  getCurrentInstrument: () => state.currentInstrument,
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
  setMelodyImportModalVisible: (visible) => setModalVisible('melodyImport', visible),
  getSelectedMidiImportQuantize,
  parseAsciiTabToEvents: parseAsciiTabToMelodyEvents,
  loadGpScoreFromBytes,
  convertLoadedGpScoreTrackToImportedMelody,
  loadMidiFileFromBytes,
  loadMusescoreFileFromBytes,
  convertLoadedMidiTrackToImportedMelody,
  convertLoadedMusescoreTrackToImportedMelody,
  saveCustomEventMelody,
  updateCustomEventMelody,
  saveCustomAsciiTabMelody,
  updateCustomAsciiTabMelody,
  exportMelodyToMidiBytes,
  buildExportMidiFileName,
  getPracticeAdjustedMelody: (melody) =>
    getMelodyWithPracticeAdjustments(
      melody,
      state.melodyTransposeSemitones,
      state.melodyStringShift,
      state.currentInstrument
    ),
  getPracticeAdjustedBakeBpm: (melody) => {
    const parsed = Number.parseInt(dom.melodyDemoBpm.value, 10);
    return Number.isFinite(parsed) ? parsed : (melody.sourceTempoBpm ?? undefined);
  },
  getPracticeAdjustmentSummary: () => ({
    transposeSemitones: state.melodyTransposeSemitones,
    stringShift: state.melodyStringShift,
  }),
  finalizeImportSelection: (melodyId, successMessage) =>
    melodySelectionController.finalizeImportSelection(melodyId, successMessage),
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  showNonBlockingError,
});
const melodyTimelineEditingOrchestrator = createMelodyTimelineEditingOrchestrator({
  getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
  getCurrentInstrument: () => state.currentInstrument,
  getTimelineSelection: () => ({
    eventIndex: state.melodyTimelineSelectedEventIndex,
    noteIndex: state.melodyTimelineSelectedNoteIndex,
  }),
  setTimelineSelection: (selection) => {
    state.melodyTimelineSelectedEventIndex = selection.eventIndex;
    state.melodyTimelineSelectedNoteIndex = selection.noteIndex;
  },
  getMelodyTransposeSemitones: () => state.melodyTransposeSemitones,
  getMelodyStringShift: () => state.melodyStringShift,
  getTrainingMode: () => dom.trainingMode.value,
  getUiWorkflow: () => state.uiWorkflow,
  isMelodyWorkflowMode,
  updateCustomEventMelody,
  clearPracticeAdjustmentCaches: () => {
    clearMelodyTransposeCache();
    clearMelodyStringShiftCache();
  },
  renderTimeline: renderMelodyTabTimelineFromState,
  redrawFretboard,
});
const melodyTimelineEditingBridgeController = createMelodyTimelineEditingBridgeController({
  resetState: () => melodyTimelineEditingOrchestrator.resetState(),
  canEditSelectedMelodyOnTimeline: () =>
    melodyTimelineEditingOrchestrator.canEditSelectedMelodyOnTimeline(),
  ensureDraftLoaded: (melody: MelodyDefinition) =>
    melodyTimelineEditingOrchestrator.ensureDraftLoaded(melody),
  ensureSelection: () => melodyTimelineEditingOrchestrator.ensureSelection(),
  syncState: (_statusText?: string) => melodyTimelineEditingOrchestrator.syncState(),
  moveSelectedNoteToString: (targetStringName: string, options?: { commit?: boolean }) =>
    melodyTimelineEditingOrchestrator.moveSelectedNoteToString(targetStringName, options),
  adjustSelectedNoteFret: (direction: -1 | 1) =>
    melodyTimelineEditingOrchestrator.adjustSelectedNoteFret(direction),
  addNote: () => melodyTimelineEditingOrchestrator.addNote(),
  setSelectedNoteFinger: (finger: number | null) =>
    melodyTimelineEditingOrchestrator.setSelectedNoteFinger(finger),
  addNoteAtEventString: (eventIndex: number, stringName: string) =>
    melodyTimelineEditingOrchestrator.addNoteAtEventString(eventIndex, stringName),
  deleteNote: () => melodyTimelineEditingOrchestrator.deleteNote(),
  adjustDuration: (direction: -1 | 1) =>
    melodyTimelineEditingOrchestrator.adjustDuration(direction),
  addEventAfterSelection: () => melodyTimelineEditingOrchestrator.addEventAfterSelection(),
  duplicateEvent: () => melodyTimelineEditingOrchestrator.duplicateEvent(),
  moveSelectedEventToIndex: (targetIndex: number) =>
    melodyTimelineEditingOrchestrator.moveSelectedEventToIndex(targetIndex),
  deleteEvent: () => melodyTimelineEditingOrchestrator.deleteEvent(),
  splitEvent: () => melodyTimelineEditingOrchestrator.splitEvent(),
  mergeEventWithNext: () => melodyTimelineEditingOrchestrator.mergeEventWithNext(),
  undo: () => melodyTimelineEditingOrchestrator.undo(),
  redo: () => melodyTimelineEditingOrchestrator.redo(),
});
const melodyDemoRuntimeController = createMelodyDemoRuntimeController({
  dom: {
    melodySelector: dom.melodySelector,
    melodyTabTimelineGrid: dom.melodyTabTimelineGrid,
    melodyDemoBpm: dom.melodyDemoBpm,
    melodyDemoBpmValue: dom.melodyDemoBpmValue,
    melodyDemoBtn: dom.melodyDemoBtn,
    melodyPauseDemoBtn: dom.melodyPauseDemoBtn,
    melodyStepBackBtn: dom.melodyStepBackBtn,
    melodyStepForwardBtn: dom.melodyStepForwardBtn,
    melodyLoopRange: dom.melodyLoopRange,
    melodyPlaybackControls: dom.melodyPlaybackControls,
    trainingMode: dom.trainingMode,
    stringSelector: dom.stringSelector,
  },
  state,
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  getMelodyById,
  getStoredMelodyStudyRange: (melodyId, totalEvents) =>
    melodyPracticeSettingsBridgeController.getStoredMelodyStudyRange(melodyId, totalEvents),
  getEnabledStrings,
  isMelodyWorkflowMode,
  setResultMessage,
  setPromptText,
  syncMelodyLoopRangeDisplay: () =>
    melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
  showNonBlockingError,
  formatUserFacingError,
  scheduleTimelineRender: () => scheduleMelodyTimelineRenderFromState(),
  drawFretboard,
  redrawFretboard,
  playSound,
  loadInstrumentSoundfont,
  stopListening,
  seekActiveMelodySessionToEvent: (eventIndex) => seekActiveMelodySessionToEvent(eventIndex),
  getStudyRangeLength: getMelodyStudyRangeLength,
  formatStudyRange: formatMelodyStudyRange,
  startMelodyMetronomeIfEnabled: (options) =>
    metronomeBridgeController.startMelodyMetronomeIfEnabled(options),
  syncMelodyMetronomeRuntime: () => metronomeBridgeController.syncMelodyMetronomeRuntime(),
  updateScrollingTabPanelRuntime,
  getPlaybackActionLabel: getPlaybackTransportIdleLabel,
  getPlaybackPromptLabel,
  getPlaybackCompletedLabel,
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
});
const melodyTimelineUiController = createMelodyTimelineUiController({
  renderMelodyTabTimeline: renderMelodyTabTimelineFromState,
  syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
  isMelodyDemoPlaybackActive: () => melodyDemoRuntimeController.isActive(),
  stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
  isListening: () => state.isListening,
  stopListening,
  setResultMessage,
});
const sessionStartController = createSessionStartController({
  isListening: () => state.isListening,
  clearMelodyTimelinePreviewState: () => {
    state.melodyTimelinePreviewIndex = null;
    state.melodyTimelinePreviewLabel = null;
  },
  refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  startListening,
  showNonBlockingError,
  formatUserFacingError,
});
const interactionGuardsController = createInteractionGuardsController({
  blockingModals: [
    dom.settingsModal,
    dom.userDataModal,
    dom.helpModal,
    dom.quickHelpModal,
    dom.sessionSummaryModal,
    dom.statsModal,
    dom.guideModal,
    dom.linksModal,
    dom.profileNameModal,
    dom.melodyImportModal,
    dom.confirmModal,
    dom.calibrationModal,
  ],
});
const isTextEntryElement = interactionGuardsController.isTextEntryElement;
const isElementWithin = interactionGuardsController.isElementWithin;
const isAnyBlockingModalOpen = interactionGuardsController.isAnyBlockingModalOpen;
export function refreshMelodyOptionsForCurrentInstrument() {
  melodySelectionController.refreshOptionsForCurrentInstrument();
}
const melodyPracticeSettingsController = createMelodyPracticeSettingsController({
  dom: {
    melodySelector: dom.melodySelector,
    melodyTranspose: dom.melodyTranspose,
    melodyTransposeValue: dom.melodyTransposeValue,
    melodyStringShift: dom.melodyStringShift,
    melodyStringShiftValue: dom.melodyStringShiftValue,
    melodyStudyStart: dom.melodyStudyStart,
    melodyStudyEnd: dom.melodyStudyEnd,
    melodyStudyValue: dom.melodyStudyValue,
    melodyStudyResetBtn: dom.melodyStudyResetBtn,
    melodyLoopRange: dom.melodyLoopRange,
  },
  state,
  clearPreviewState: () => melodyDemoRuntimeController.clearPreviewState(),
  renderTimeline: renderMelodyTabTimelineFromState,
});
const melodyPracticeSettingsBridgeController = createMelodyPracticeSettingsBridgeController({
  getStoredMelodyStudyRange: (melodyId: string | null, totalEvents: number) =>
    melodyPracticeSettingsController.getStoredMelodyStudyRange(melodyId, totalEvents),
  syncMelodyLoopRangeDisplay: () => melodyPracticeSettingsController.syncMelodyLoopRangeDisplay(),
  hydrateMelodyTransposeForSelectedMelody: (options?: { migrateLegacyValue?: boolean }) =>
    melodyPracticeSettingsController.hydrateMelodyTransposeForSelectedMelody(options),
  hydrateMelodyStringShiftForSelectedMelody: () =>
    melodyPracticeSettingsController.hydrateMelodyStringShiftForSelectedMelody(),
  hydrateMelodyStudyRangeForSelectedMelody: () =>
    melodyPracticeSettingsController.hydrateMelodyStudyRangeForSelectedMelody(),
  applyMelodyTransposeSemitones: (nextValue: unknown) =>
    melodyPracticeSettingsController.applyMelodyTransposeSemitones(nextValue),
  applyMelodyStringShift: (nextValue: unknown) =>
    melodyPracticeSettingsController.applyMelodyStringShift(nextValue),
  applyMelodyStudyRange: (range: Partial<MelodyStudyRange>) =>
    melodyPracticeSettingsController.applyMelodyStudyRange(range),
  setStoredMelodyTransposeSemitones: (melodyId: string | null, semitones: number) =>
    melodyPracticeSettingsController.setStoredMelodyTransposeSemitones(melodyId, semitones),
  refreshMelodyOptionsForCurrentInstrument: () =>
    melodyPracticeSettingsController.refreshMelodyOptionsForCurrentInstrument(),
});
const melodySetupUiController = createMelodySetupUiController({
  dom: {
    trainingMode: dom.trainingMode,
    melodyPlaybackControls: dom.melodyPlaybackControls,
    editMelodyBtn: dom.editMelodyBtn,
    exportMelodyMidiBtn: dom.exportMelodyMidiBtn,
    bakePracticeMelodyBtn: dom.bakePracticeMelodyBtn,
    melodyDemoBtn: dom.melodyDemoBtn,
    melodyStepBackBtn: dom.melodyStepBackBtn,
    melodyStepForwardBtn: dom.melodyStepForwardBtn,
    melodyTransposeResetBtn: dom.melodyTransposeResetBtn,
    melodyStringShiftResetBtn: dom.melodyStringShiftResetBtn,
    melodyTransposeBatchCustomBtn: dom.melodyTransposeBatchCustomBtn,
    melodyStringShift: dom.melodyStringShift,
    melodyStringShiftDownBtn: dom.melodyStringShiftDownBtn,
    melodyStringShiftUpBtn: dom.melodyStringShiftUpBtn,
    melodyStudyStart: dom.melodyStudyStart,
    melodyStudyEnd: dom.melodyStudyEnd,
    melodyStudyResetBtn: dom.melodyStudyResetBtn,
    deleteMelodyBtn: dom.deleteMelodyBtn,
  },
  state,
  getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  listMelodies: () => listMelodiesForInstrument(state.currentInstrument),
  getAdjustedMelody: (melody, stringShift) =>
    getMelodyWithPracticeAdjustments(
      melody,
      state.melodyTransposeSemitones,
      stringShift,
      state.currentInstrument
    ),
  isStringShiftFeasible: (melody, nextShift) =>
    isMelodyStringShiftFeasible(melody, nextShift, state.currentInstrument),
  isMelodyWorkflowMode,
  isDemoActive: () => melodyDemoRuntimeController.isActive(),
  isCustomMelodyId,
  isDefaultStudyRange: (totalEvents) =>
    isDefaultMelodyStudyRange(
      { startIndex: state.melodyStudyRangeStartIndex, endIndex: state.melodyStudyRangeEndIndex },
      totalEvents
    ),
  renderTimeline: renderMelodyTabTimelineFromState,
});
const practiceSetupSummaryController = createPracticeSetupSummaryController({
  dom: {
    trainingMode: dom.trainingMode,
    difficulty: dom.difficulty,
    curriculumPreset: dom.curriculumPreset,
    sessionGoal: dom.sessionGoal,
    sessionPace: dom.sessionPace,
    startFret: dom.startFret,
    endFret: dom.endFret,
    stringSelector: dom.stringSelector,
    scaleSelector: dom.scaleSelector,
    chordSelector: dom.chordSelector,
    progressionSelector: dom.progressionSelector,
    arpeggioPatternSelector: dom.arpeggioPatternSelector,
    melodySelector: dom.melodySelector,
    melodyShowNote: dom.melodyShowNote,
  },
  state,
  getEnabledStringsCount: () => getEnabledStrings(dom.stringSelector).size,
  getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
  getStoredMelodyStudyRangeText: (melody) =>
    formatMelodyStudyRange(
      melodyPracticeSettingsBridgeController.getStoredMelodyStudyRange(
        melody.id,
        melody.events.length
      ),
      melody.events.length
    ),
  isMelodyWorkflowMode,
  formatMelodyTransposeSemitones,
  formatMelodyStringShift,
  setPracticeSetupSummary,
  setSessionToolsSummary,
  setMelodySetupSummary,
});
const metronomeController = createMetronomeController({
  dom: {
    trainingMode: dom.trainingMode,
    metronomeEnabled: dom.metronomeEnabled,
    metronomeBpm: dom.melodyDemoBpm,
    metronomeBpmValue: dom.melodyDemoBpmValue,
    metronomeBeatLabel: dom.metronomeBeatLabel,
    metronomePulse: dom.metronomePulse,
  },
  clampMetronomeBpm: clampMelodyPlaybackBpm,
  startMetronome,
  stopMetronome,
  setMetronomeTempo: async (bpm) => {
    await setMetronomeTempo(bpm);
  },
  subscribeMetronomeBeat,
  saveSettings,
  formatUserFacingError,
  showNonBlockingError,
});
const metronomeRuntimeBridgeController = createMetronomeRuntimeBridgeController({
  syncBpmDisplay: () => metronomeController.syncBpmDisplay(),
  getClampedBpmFromInput: () => metronomeController.getClampedBpmFromInput(),
  resetVisualIndicator: () => metronomeController.resetVisualIndicator(),
});
const sessionTransportControlsController = createSessionTransportControlsController({
  dom,
  state,
  isMelodyDemoActive: () => melodyDemoRuntimeController.isActive(),
  stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
  applyUiWorkflow: (workflow) => workflowController.applyUiWorkflow(workflow),
  saveSettings,
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  stopListening,
  startSessionFromUi: () => sessionStartController.startSessionFromUi(),
  buildPromptAudioPlan: () =>
    buildPromptAudioPlan({
      prompt: state.currentPrompt,
      trainingMode: dom.trainingMode.value,
      instrument: state.currentInstrument,
      calibratedA4: state.calibratedA4,
      enabledStrings: getEnabledStrings(dom.stringSelector),
    }),
  playSound,
  clearResultMessage,
  drawHintFretboard: ({ noteToShow, stringToShow, melodyNotes }) => {
    if (melodyNotes) {
      drawFretboard(false, null, null, melodyNotes as ChordNote[]);
      return;
    }
    drawFretboard(false, noteToShow, stringToShow);
  },
  scheduleHintReset: (label) => {
    scheduleSessionTimeout(
      2000,
      () => {
        redrawFretboard();
        state.cooldown = false;
      },
      label
    );
  },
  findPlayableStringForNote: (note) => melodyDemoRuntimeController.findPlayableStringForNote(note),
  setResultMessage,
});
const melodyTempoController = createMelodyTempoController({
  dom: {
    trainingMode: dom.trainingMode,
    metronomeEnabled: dom.metronomeEnabled,
    metronomeBpm: dom.metronomeBpm,
    metronomeBpmValue: dom.metronomeBpmValue,
    metronomeToggleBtn: dom.metronomeToggleBtn,
    melodyDemoBpm: dom.melodyDemoBpm,
    melodyTimelineZoom: dom.melodyTimelineZoom,
    melodyTimelineZoomValue: dom.melodyTimelineZoomValue,
    scrollingTabZoom: dom.scrollingTabZoom,
    scrollingTabZoomValue: dom.scrollingTabZoomValue,
  },
  state,
  getSelectedMelody: () => selectedMelodyContextController.getSelectedMelody(),
  syncMelodyDemoBpmDisplay: () => melodyDemoRuntimeController.syncBpmDisplay(),
  syncMetronomeMeterFromSelectedMelody: () =>
    selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
  getClampedMetronomeBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
  startMetronome,
  stopMetronome,
  setMetronomeTempo: async (bpm) => {
    await setMetronomeTempo(bpm);
  },
  isMetronomeRunning,
  resetMetronomeVisualIndicator: () => metronomeRuntimeBridgeController.resetVisualIndicator(),
  showNonBlockingError,
  formatUserFacingError,
  isMelodyDemoPlaying: () => melodyDemoRuntimeController.isPlaying(),
  isMelodyWorkflowMode,
  isPerformanceStyleMode,
});
const metronomeBridgeController = createMetronomeBridgeController({
  dom: { metronomeVolume: dom.metronomeVolume, metronomeVolumeValue: dom.metronomeVolumeValue },
  metronomeRuntime: {
    syncBpmDisplay: () => metronomeRuntimeBridgeController.syncBpmDisplay(),
    getClampedBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
    resetVisualIndicator: () => metronomeRuntimeBridgeController.resetVisualIndicator(),
  },
  melodyTempo: {
    syncMelodyTempoFromMetronomeIfLinked: () =>
      melodyTempoController.syncMelodyTempoFromMetronomeIfLinked(),
    hydrateMelodyTempoForSelectedMelody: () =>
      melodyTempoController.hydrateMelodyTempoForSelectedMelody(),
    persistSelectedMelodyTempoOverride: () =>
      melodyTempoController.persistSelectedMelodyTempoOverride(),
    syncHiddenMetronomeTempoFromSharedTempo: () =>
      melodyTempoController.syncHiddenMetronomeTempoFromSharedTempo(),
    syncMetronomeTempoFromMelodyIfLinked: () =>
      melodyTempoController.syncMetronomeTempoFromMelodyIfLinked(),
    startMelodyMetronomeIfEnabled: (options) =>
      melodyTempoController.startMelodyMetronomeIfEnabled(options),
    syncMelodyMetronomeRuntime: () => melodyTempoController.syncMelodyMetronomeRuntime(),
    renderMetronomeToggleButton: () => melodyTempoController.renderMetronomeToggleButton(),
    syncMelodyTimelineZoomDisplay: () => melodyTempoController.syncMelodyTimelineZoomDisplay(),
    syncScrollingTabZoomDisplay: () => melodyTempoController.syncScrollingTabZoomDisplay(),
  },
  clampMetronomeVolumePercent,
  setMetronomeVolume,
});
const metronomeControlsController = createMetronomeControlsController({
  dom: {
    metronomeToggleBtn: dom.metronomeToggleBtn,
    metronomeEnabled: dom.metronomeEnabled,
    metronomeBpm: dom.metronomeBpm,
    metronomeVolume: dom.metronomeVolume,
  },
  syncHiddenMetronomeTempoFromSharedTempo: () =>
    metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
  syncMelodyMetronomeRuntime: () => metronomeBridgeController.syncMelodyMetronomeRuntime(),
  renderMetronomeToggleButton: () => metronomeBridgeController.renderMetronomeToggleButton(),
  saveSettings,
  syncMelodyTempoFromMetronomeIfLinked: () =>
    metronomeBridgeController.syncMelodyTempoFromMetronomeIfLinked(),
  syncMetronomeVolumeDisplayAndRuntime: () =>
    metronomeBridgeController.syncMetronomeVolumeDisplayAndRuntime(),
});
const curriculumPresetController = createCurriculumPresetController({
  dom: {
    curriculumPreset: dom.curriculumPreset,
    curriculumPresetInfo: dom.curriculumPresetInfo,
    sessionGoal: dom.sessionGoal,
    scaleSelector: dom.scaleSelector,
    chordSelector: dom.chordSelector,
    progressionSelector: dom.progressionSelector,
    arpeggioPatternSelector: dom.arpeggioPatternSelector,
    rhythmTimingWindow: dom.rhythmTimingWindow,
    metronomeEnabled: dom.metronomeEnabled,
    metronomeBpm: dom.melodyDemoBpm,
    showAllNotes: dom.showAllNotes,
    trainingMode: dom.trainingMode,
    difficulty: dom.difficulty,
    startFret: dom.startFret,
    endFret: dom.endFret,
  },
  state,
  getClampedMetronomeBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
  applyEnabledStrings: (enabledStrings) => {
    const enabled = new Set(enabledStrings);
    dom.stringSelector.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const checkbox = input as HTMLInputElement;
      checkbox.checked = enabled.has(checkbox.value);
    });
  },
  handleModeChange,
  redrawFretboard,
  saveSettings,
  setResultMessage,
  isListening: () => state.isListening,
  stopListening,
});
const curriculumPresetBridgeController = createCurriculumPresetBridgeController({
  setPresetInfo: (text: string) => curriculumPresetController.setPresetInfo(text),
  setSelection: (key: CurriculumPresetKey) => curriculumPresetController.setSelection(key),
  markAsCustom: () => curriculumPresetController.markAsCustom(),
  applyPreset: (key: CurriculumPresetKey) => curriculumPresetController.applyPreset(key),
});
const micSettingsController = createMicSettingsController({
  dom: {
    micNoiseGateInfo: dom.micNoiseGateInfo,
    micSensitivityPreset: dom.micSensitivityPreset,
    micNoteAttackFilter: dom.micNoteAttackFilter,
    micNoteHoldFilter: dom.micNoteHoldFilter,
    micPolyphonicDetectorProvider: dom.micPolyphonicDetectorProvider,
    calibrateNoiseFloorBtn: dom.calibrateNoiseFloorBtn,
  },
  state,
  ensureAudioRuntime: (runtimeState, options) =>
    ensureAudioRuntime(runtimeState as typeof state, options),
  refreshAudioInputDeviceOptions,
  refreshMicPolyphonicDetectorAudioInfoUi,
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi: () => practicePresetUiController.syncPracticePresetUi(),
  saveSettings,
  setResultMessage,
  formatUserFacingError,
  showNonBlockingError,
});
const audioInputControlsController = createAudioInputControlsController({
  dom,
  applySuggestedMicLatency: () => practicePresetControlsController.applySuggestedMicLatency(),
  startMicLatencyCalibration: () => practicePresetControlsController.startMicLatencyCalibration(),
  handleAudioInputDeviceChange: () => inputDeviceController.handleAudioInputDeviceChange(),
  handleSensitivityChange: () => micSettingsController.handleSensitivityChange(),
  handleAttackChange: () => micSettingsController.handleAttackChange(),
  handleHoldChange: () => micSettingsController.handleHoldChange(),
  handlePolyphonicProviderChange: () => micSettingsController.handlePolyphonicProviderChange(),
  calibrateNoiseFloor: () => micSettingsController.calibrateNoiseFloor(),
  runMicPolyphonicBenchmark: () => micPolyphonicBenchmarkController.runBenchmark(),
  exportMicPolyphonicTelemetry: () => micPolyphonicTelemetryController.exportTelemetry(),
  resetMicPolyphonicTelemetry: () => micPolyphonicTelemetryController.resetTelemetry(),
  handleInputSourceChange: () => inputDeviceController.handleInputSourceChange(),
  handleMidiInputDeviceChange: () => inputDeviceController.handleMidiInputDeviceChange(),
});
const inputDeviceController = createInputDeviceController({
  dom,
  state,
  normalizeAudioInputDeviceId,
  setPreferredAudioInputDeviceId,
  normalizeInputSource,
  setInputSourcePreference,
  refreshMidiInputDevices,
  normalizeMidiInputDeviceId,
  setPreferredMidiInputDeviceId,
  stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
  stopListening,
  saveSettings,
  updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
  refreshMicPerformanceReadinessUi,
  setResultMessage,
});
const micPolyphonicBenchmarkController = createMicPolyphonicBenchmarkController({
  dom: {
    runMicPolyphonicBenchmarkBtn: dom.runMicPolyphonicBenchmarkBtn,
    micPolyphonicBenchmarkInfo: dom.micPolyphonicBenchmarkInfo,
  },
  state,
  detectMicPolyphonicFrame: (input) =>
    detectMicPolyphonicFrame({
      ...input,
      provider: normalizeMicPolyphonicDetectorProvider(input.provider),
    }),
  now: () => performance.now(),
  setResultMessage,
  showNonBlockingError,
  formatUserFacingError,
});
const micPolyphonicTelemetryController = createMicPolyphonicTelemetryController({
  dom: {
    exportMicPolyphonicTelemetryBtn: dom.exportMicPolyphonicTelemetryBtn,
    resetMicPolyphonicTelemetryBtn: dom.resetMicPolyphonicTelemetryBtn,
  },
  state,
  now: () => Date.now(),
  getUserAgent: () => navigator.userAgent,
  getHardwareConcurrency: () => navigator.hardwareConcurrency ?? null,
  getAnalyserSampleRate: () => state.audioContext?.sampleRate ?? null,
  getAnalyserFftSize: () => state.analyser?.fftSize ?? null,
  downloadTextFile: (fileName, text, mimeType) => {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  },
  resetTelemetry: () => resetMicPolyphonicDetectorTelemetry(),
  refreshTelemetryUi: () => refreshMicPolyphonicDetectorAudioInfoUi(),
  setResultMessage,
  showNonBlockingError,
  formatUserFacingError,
});
const melodySetupControlsController = createMelodySetupControlsController({
  dom,
  state,
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  resetMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.resetState(),
  hydrateMelodyTransposeForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
  hydrateMelodyStringShiftForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
  hydrateMelodyStudyRangeForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
  hydrateMelodyTempoForSelectedMelody: () =>
    metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
  syncMetronomeMeterFromSelectedMelody: () =>
    selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
  clearMelodyDemoPreviewState: () => melodyDemoRuntimeController.clearPreviewState(),
  updateMelodyActionButtonsForSelection: () =>
    workflowController.updateMelodyActionButtonsForSelection(),
  isMelodyWorkflowMode,
  stopListening,
  setResultMessage,
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  saveSettings,
  refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  refreshLayoutControlsVisibility,
  syncMelodyTimelineZoomDisplay: () => metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
  syncScrollingTabZoomDisplay: () => metronomeBridgeController.syncScrollingTabZoomDisplay(),
  syncMelodyLoopRangeDisplay: () =>
    melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
  clampMelodyDemoBpmInput: () => {
    melodyDemoRuntimeController.getClampedBpmFromInput();
  },
  persistSelectedMelodyTempoOverride: () =>
    metronomeBridgeController.persistSelectedMelodyTempoOverride(),
  syncMetronomeTempoFromMelodyIfLinked: () =>
    metronomeBridgeController.syncMetronomeTempoFromMelodyIfLinked(),
  retimeMelodyDemoPlayback: () => melodyDemoRuntimeController.retimePlayback(),
  getSelectedMelodyEventCount: () => selectedMelodyContextController.getSelectedMelodyEventCount(),
});
const melodyPracticeActionsController = createMelodyPracticeActionsController({
  dom: { trainingMode: dom.trainingMode },
  state,
  isMelodyWorkflowMode,
  stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
  stopListening,
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  updateMelodyActionButtonsForSelection: () =>
    workflowController.updateMelodyActionButtonsForSelection(),
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  saveSettings,
  redrawFretboard,
  refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  setResultMessage,
  applyMelodyTransposeSemitones: (nextValue) =>
    melodyPracticeSettingsBridgeController.applyMelodyTransposeSemitones(nextValue),
  applyMelodyStringShift: (nextValue) =>
    melodyPracticeSettingsBridgeController.applyMelodyStringShift(nextValue),
  applyMelodyStudyRange: (range) =>
    melodyPracticeSettingsBridgeController.applyMelodyStudyRange(range),
  listCustomMelodies: () =>
    listMelodiesForInstrument(state.currentInstrument).filter((entry) => entry.source === 'custom'),
  setStoredMelodyTransposeSemitones: (melodyId, semitones) =>
    melodyPracticeSettingsBridgeController.setStoredMelodyTransposeSemitones(melodyId, semitones),
  hydrateMelodyTransposeForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
  formatMelodyTransposeSemitones,
  confirmUserAction,
});
const melodyPracticeControlsController = createMelodyPracticeControlsController({
  dom,
  state,
  normalizeMelodyTransposeSemitones,
  normalizeMelodyStringShift: (value) => normalizeMelodyStringShift(value, state.currentInstrument),
  handleTransposeInputChange: (value) =>
    melodyPracticeActionsController.handleTransposeInputChange(value),
  handleStringShiftInputChange: (value) =>
    melodyPracticeActionsController.handleStringShiftInputChange(value),
  applyCurrentTransposeToAllCustomMelodies: () =>
    melodyPracticeActionsController.applyCurrentTransposeToAllCustomMelodies(),
  handleStudyRangeChange: (range, options) =>
    melodyPracticeActionsController.handleStudyRangeChange(range, options),
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
});
const workflowLayoutController = createWorkflowLayoutController({
  dom,
  state,
  setUiWorkflow,
  setPracticeSetupCollapsed,
  setMelodySetupCollapsed,
  setSessionToolsCollapsed,
  setLayoutControlsExpanded,
  syncRecommendedDefaultsUi: () => practicePresetUiController.syncRecommendedDefaultsUi(),
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  updateMelodySetupActionButtons: () => melodySetupUiController.updateActionButtons(),
  handleModeChange,
  resetMelodyWorkflowEditorState: () => {
    melodyImportWorkspaceController.closeAndResetInputs();
    melodyTimelineEditingBridgeController.resetState();
  },
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  getAvailableMelodyCount: () => listMelodiesForInstrument(state.currentInstrument).length,
});
const workflowController = createWorkflowController({
  dom: { melodySelector: dom.melodySelector },
  workflowLayoutController,
  listAvailableMelodyIds: () =>
    listMelodiesForInstrument(state.currentInstrument).map((entry) => entry.id),
});
const melodySelectionController = createMelodySelectionController({
  dom: {
    melodySelector: dom.melodySelector,
    melodyNameInput: dom.melodyNameInput,
    melodyAsciiTabInput: dom.melodyAsciiTabInput,
  },
  state,
  refreshPracticeMelodyOptions: () =>
    melodyPracticeSettingsBridgeController.refreshMelodyOptionsForCurrentInstrument(),
  hydrateMelodyTransposeForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
  hydrateMelodyStringShiftForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
  hydrateMelodyStudyRangeForSelectedMelody: () =>
    melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
  hydrateMelodyTempoForSelectedMelody: () =>
    metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
  clearMelodyDemoPreviewState: () => melodyDemoRuntimeController.clearPreviewState(),
  updateMelodyActionButtonsForSelection: () =>
    workflowController.updateMelodyActionButtonsForSelection(),
  refreshMelodyEmptyState: () => workflowController.refreshMelodyEmptyState(),
  resetMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.resetState(),
  closeMelodyImportModal: () => melodyImportWorkspaceController.close(),
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  saveSettings,
  setResultMessage,
  renderMelodyTabTimeline: renderMelodyTabTimelineFromState,
  syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
});
const workflowLayoutControlsController = createWorkflowLayoutControlsController({
  dom,
  state,
  toggleLayoutControlsExpanded,
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  stopListening,
  applyUiWorkflow: (workflow) => workflowController.applyUiWorkflow(workflow),
  saveSettings,
  setUiMode,
  openMelodyImport: () => dom.openMelodyImportBtn.click(),
  getFirstAvailableMelodyId: () => workflowController.getFirstAvailableMelodyId(),
  selectMelodyById: (melodyId) => workflowController.selectMelodyById(melodyId),
});
const studyMelodyMicTuningController = createStudyMelodyMicTuningController({
  dom,
  state,
  saveSettings,
});
const melodyEditingControlsController = createMelodyEditingControlsController({
  dom,
  state,
  maxFret: DEFAULT_TABLATURE_MAX_FRET,
  saveSettings,
  refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  updateSelectedMelodyEventEditorNotePosition: (stringName, fretValue) =>
    melodyEventEditorBridgeController.updateSelectedNotePosition(stringName, fretValue),
  addMelodyEventEditorNote: () => melodyEventEditorBridgeController.addNote(),
  deleteSelectedMelodyEventEditorNote: () => melodyEventEditorBridgeController.deleteSelectedNote(),
  undoMelodyEventEditorMutation: () => melodyEventEditorBridgeController.undo(),
  redoMelodyEventEditorMutation: () => melodyEventEditorBridgeController.redo(),
  renderMelodyEventEditorInspector: () => melodyEventEditorBridgeController.renderInspector(),
  handleTimelineHotkey: (event) => melodyTimelineEditingController.handleHotkey(event),
  syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
  clearMelodyTimelineSelection: () => melodyTimelineEditingController.clearSelection(),
  clearMelodyTimelineContextMenu,
  renderMelodyTabTimelineFromState,
  formatUserFacingError,
  showNonBlockingError,
});
const melodyPlaybackControlsController = createMelodyPlaybackControlsController({
  dom,
  state,
  setPracticeSetupCollapsed,
  startMelodyDemoPlayback: () => melodyDemoRuntimeController.startPlayback(),
  pauseMelodyDemoPlayback: () => melodyDemoRuntimeController.pausePlayback(),
  resumeMelodyDemoPlayback: () => melodyDemoRuntimeController.resumePlayback(),
  stopMelodyDemoPlayback: (options) => melodyDemoRuntimeController.stopPlayback(options),
  stepMelodyPreview: (direction) => melodyDemoRuntimeController.stepPreview(direction),
  isPlaying: () => melodyDemoRuntimeController.isPlaying(),
  isPaused: () => melodyDemoRuntimeController.isPaused(),
  canHandleHotkeys: () => melodyDemoRuntimeController.shouldHandleHotkeys(),
  getTrainingMode: () => dom.trainingMode.value,
  isMelodyWorkflowMode,
  isTextEntryElement,
  isAnyBlockingModalOpen,
});
const melodyLibraryControlsController = createMelodyLibraryControlsController({
  dom,
  state,
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  stopListening,
  isMelodyWorkflowMode,
  getTrainingMode: () => dom.trainingMode.value,
  exportSelectedMelodyAsMidi: () => melodyLibraryActionsController.exportSelectedMelodyAsMidi(),
  bakeSelectedPracticeAdjustedMelodyAsCustom: () =>
    melodyLibraryActionsController.bakeSelectedPracticeAdjustedMelodyAsCustom(),
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  isCustomMelodyId,
  confirmUserAction,
  deleteCustomMelody,
  refreshMelodyOptionsForCurrentInstrument,
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  saveSettings,
  setResultMessage,
  showNonBlockingError,
  formatUserFacingError,
});
const practicePresetControlsController = createPracticePresetControlsController({
  dom,
  state,
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi: () => practicePresetUiController.syncPracticePresetUi(),
  updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
  saveSettings,
});
const practiceSetupControlsController = createPracticeSetupControlsController({
  dom,
  state,
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  saveSettings,
  redrawFretboard,
  refreshDisplayFormatting,
  setNoteNamingPreference,
  resolveSessionToolsVisibility: (workflow) =>
    workflowController.resolveSessionToolsVisibility(workflow),
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  handleModeChange,
  applyUiWorkflowLayout: (workflow) => workflowController.applyUiWorkflowLayout(workflow),
  syncHiddenMetronomeTempoFromSharedTempo: () =>
    metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
  syncMelodyMetronomeRuntime: () => metronomeBridgeController.syncMelodyMetronomeRuntime(),
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  refreshMicPerformanceReadinessUi,
  syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
  setCurriculumPresetInfo: (text) => curriculumPresetBridgeController.setPresetInfo(text),
  applyCurriculumPreset: (key) => curriculumPresetBridgeController.applyPreset(key),
  persistSelectedMelodyTempoOverride: () =>
    metronomeBridgeController.persistSelectedMelodyTempoOverride(),
  renderMetronomeToggleButton: () => metronomeBridgeController.renderMetronomeToggleButton(),
});
const instrumentDisplayControlsController = createInstrumentDisplayControlsController({
  dom,
  state,
  resolveInstrumentById: (instrumentId) => instruments[instrumentId],
  stopMelodyDemoPlayback: ({ clearUi }) => melodyDemoRuntimeController.stopPlayback({ clearUi }),
  markCurriculumPresetAsCustom: () => curriculumPresetBridgeController.markAsCustom(),
  resetMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.resetState(),
  updateInstrumentUI,
  getEnabledStrings: () => Array.from(getEnabledStrings(dom.stringSelector)),
  refreshMelodyOptionsForCurrentInstrument,
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  loadInstrumentSoundfont,
  saveSettings,
  refreshMelodyTimelineUi: () => melodyTimelineUiController.refreshUi(),
  stopListening,
  setResultMessage,
  redrawFretboard,
});
const practicePresetUiController = createPracticePresetUiController({
  dom,
  state,
  hasCompletedOnboarding: () => localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1',
});
const melodyTimelineEditingController = createMelodyTimelineEditingController({
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  isEditorWorkflowActive: () => state.uiWorkflow === 'editor',
  canEditSelectedMelodyOnTimeline: () =>
    melodyTimelineEditingBridgeController.canEditSelectedMelodyOnTimeline(),
  ensureDraftLoaded: (melody) => melodyTimelineEditingBridgeController.ensureDraftLoaded(melody),
  ensureSelection: () => melodyTimelineEditingBridgeController.ensureSelection(),
  syncState: (statusText) => melodyTimelineEditingBridgeController.syncState(statusText),
  renderTimeline: renderMelodyTabTimelineFromState,
  stopPlaybackForEditing: () => melodyTimelineUiController.stopPlaybackForEditing(),
  moveSelectedNoteToString: (targetStringName, options) =>
    melodyTimelineEditingBridgeController.moveSelectedNoteToString(targetStringName, options),
  adjustSelectedNoteFret: (direction) =>
    melodyTimelineEditingBridgeController.adjustSelectedNoteFret(direction),
  moveSelectedEventToIndex: (targetIndex) =>
    melodyTimelineEditingBridgeController.moveSelectedEventToIndex(targetIndex),
  adjustDuration: (direction) => melodyTimelineEditingBridgeController.adjustDuration(direction),
  addNote: () => melodyTimelineEditingBridgeController.addNote(),
  setSelectedNoteFinger: (finger) =>
    melodyTimelineEditingBridgeController.setSelectedNoteFinger(finger),
  addNoteAtEventString: (eventIndex, stringName) =>
    melodyTimelineEditingBridgeController.addNoteAtEventString(eventIndex, stringName),
  addEventAfterSelection: () => melodyTimelineEditingBridgeController.addEventAfterSelection(),
  duplicateEvent: () => melodyTimelineEditingBridgeController.duplicateEvent(),
  splitEvent: () => melodyTimelineEditingBridgeController.splitEvent(),
  mergeEventWithNext: () => melodyTimelineEditingBridgeController.mergeEventWithNext(),
  deleteNote: () => melodyTimelineEditingBridgeController.deleteNote(),
  deleteEvent: () => melodyTimelineEditingBridgeController.deleteEvent(),
  deleteEventEditorNote: () => melodyEventEditorBridgeController.deleteSelectedNote(),
  undo: () => melodyTimelineEditingBridgeController.undo(),
  redo: () => melodyTimelineEditingBridgeController.redo(),
  undoEventEditor: () => melodyEventEditorBridgeController.undo(),
  redoEventEditor: () => melodyEventEditorBridgeController.redo(),
  showNonBlockingError,
  formatUserFacingError,
  isTextEntryElement,
  isElementWithin,
  isAnyBlockingModalOpen,
  isMelodyWorkflowMode,
});
const sessionBootstrapController = createSessionBootstrapController({
  dom,
  state,
  setCurriculumPresetSelection: (key) =>
    curriculumPresetBridgeController.setSelection(key as CurriculumPresetKey),
  getClampedMetronomeBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
  getClampedMelodyDemoBpmFromInput: () => melodyDemoRuntimeController.getClampedBpmFromInput(),
  syncMelodyLoopRangeDisplay: () =>
    melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
  syncMelodyTimelineZoomDisplay: () => metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
  syncScrollingTabZoomDisplay: () => metronomeBridgeController.syncScrollingTabZoomDisplay(),
  syncMetronomeMeterFromSelectedMelody: () =>
    selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
  syncHiddenMetronomeTempoFromSharedTempo: () =>
    metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
  syncMetronomeBpmDisplay: () => metronomeRuntimeBridgeController.syncBpmDisplay(),
  syncMetronomeVolumeDisplayAndRuntime: () =>
    metronomeBridgeController.syncMetronomeVolumeDisplayAndRuntime(),
  syncMelodyDemoBpmDisplay: () => melodyDemoRuntimeController.syncBpmDisplay(),
  refreshMelodyOptionsForCurrentInstrument,
  setMelodyTimelineStudyRangeCommitHandler,
  getSelectedMelodyId: () => selectedMelodyContextController.getSelectedMelodyId(),
  handleStudyRangeCommit: (range) => {
    melodyPracticeActionsController.handleStudyRangeChange(range, {
      stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
    });
  },
  registerMelodyTimelineEditingInteractionHandlers: () =>
    melodyTimelineEditingController.registerInteractionHandlers(),
  setMelodyTimelineSeekHandler,
  seekMelodyTimelineToEvent: (eventIndex, options) =>
    melodyDemoRuntimeController.seekToEvent(eventIndex, options),
  resetMelodyImportDraft: () => melodyImportWorkspaceController.resetDraft(),
  syncMelodyImportModalUi: () => melodyImportWorkspaceController.syncUi(),
  renderMelodyDemoButtonState: () => melodyDemoRuntimeController.renderButtonState(),
  resetMetronomeVisualIndicator: () => metronomeRuntimeBridgeController.resetVisualIndicator(),
  renderMetronomeToggleButton: () => metronomeBridgeController.renderMetronomeToggleButton(),
  updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
  refreshMicPolyphonicDetectorAudioInfoUi,
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi: () => practicePresetUiController.syncPracticePresetUi(),
  syncMicPolyphonicTelemetryButtonState: () => micPolyphonicTelemetryController.syncButtonState(),
  mountWorkspaceControls: () => workflowController.mountWorkspaceControls(),
  syncUiWorkflowFromTrainingMode: () => workflowController.syncUiWorkflowFromTrainingMode(),
  applyUiWorkflowLayout: (workflow) => workflowController.applyUiWorkflowLayout(workflow),
  setUiMode,
  updatePracticeSetupSummary: () => practiceSetupSummaryController.update(),
  syncMelodyTimelineEditingState: () => melodyTimelineEditingBridgeController.syncState(),
  refreshInputSourceAvailabilityUi,
  refreshAudioInputDeviceOptions,
  refreshMidiInputDevices,
  registerMelodyImportControls: () => melodyImportControlsController.register(),
  registerWorkflowLayoutControls: () => workflowLayoutControlsController.register(),
  registerMelodyEditingControls: () => melodyEditingControlsController.register(),
  registerMelodyPlaybackControls: () => melodyPlaybackControlsController.register(),
  registerMelodyLibraryControls: () => melodyLibraryControlsController.register(),
  registerPracticePresetControls: () => practicePresetControlsController.register(),
  registerPracticeSetupControls: () => practiceSetupControlsController.register(),
  registerInstrumentDisplayControls: () => instrumentDisplayControlsController.register(),
  registerMelodySetupControls: () => melodySetupControlsController.register(),
  registerMelodyPracticeControls: () => melodyPracticeControlsController.register(),
  registerSessionTransportControls: () => sessionTransportControlsController.register(),
  registerAudioInputControls: () => audioInputControlsController.register(),
  registerStudyMelodyMicTuningControls: () => studyMelodyMicTuningController.register(),
  registerMetronomeControls: () => metronomeControlsController.register(),
  registerMetronomeBeatIndicator: () => metronomeController.registerBeatIndicator(),
  registerModalControls,
  registerConfirmControls,
  registerProfileControls,
});
export function registerSessionControls() {
  sessionBootstrapController.registerSessionControls();
}
