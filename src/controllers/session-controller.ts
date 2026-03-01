import { dom, state } from '../state';
import { saveSettings } from '../storage';
import {
  handleModeChange,
  redrawFretboard,
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
import { instruments } from '../instruments';
import {
  clearResultMessage,
  refreshDisplayFormatting,
  setMelodySetupSummary,
  setPracticeSetupCollapsed,
  setPracticeSetupSummary,
  setSessionToolsSummary,
  setModalVisible,
  setPromptText,
  setResultMessage,
  toggleMelodySetupCollapsed,
  toggleSessionToolsCollapsed,
  togglePracticeSetupCollapsed,
} from '../ui-signals';
import { getEnabledStrings } from '../fretboard-ui-state';
import { type CurriculumPresetKey } from '../curriculum-presets';
import {
  clampMetronomeBpm,
  setMetronomeTempo,
  startMetronome,
  stopMetronome,
  subscribeMetronomeBeat,
} from '../metronome';
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
import { normalizeSessionPace } from '../session-pace';
import { refreshMicPolyphonicDetectorAudioInfoUi } from '../mic-polyphonic-detector-ui';
import { detectMicPolyphonicFrame } from '../mic-polyphonic-detector';
import { parseAsciiTabToMelodyEvents } from '../ascii-tab-melody-parser';
import {
  convertLoadedGpScoreTrackToImportedMelody,
  loadGpScoreFromBytes,
} from '../gp-import';
import {
  convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes,
  normalizeMidiImportQuantize,
  type MidiImportQuantize,
} from '../midi-file-import';
import {
  buildExportMidiFileName,
  exportMelodyToMidiBytes,
} from '../midi-file-export';
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
import { createMelodyTimelineEditingController } from './melody-timeline-editing-controller';
import { createMelodyTimelineEditingOrchestrator } from './melody-timeline-editing-orchestrator';
import { createMelodyDemoController } from './melody-demo-controller';
import { createMelodyImportPreviewController } from './melody-import-preview-controller';
import { createMelodyEventEditorController } from './melody-event-editor-controller';
import { createMelodyImportModalController } from './melody-import-modal-controller';
import { createMelodyLibraryActionsController } from './melody-library-actions-controller';
import { createMelodyPracticeSettingsController } from './melody-practice-settings-controller';
import { createMelodySetupUiController } from './melody-setup-ui-controller';
import { createPracticeSetupSummaryController } from './practice-setup-summary-controller';
import { createCurriculumPresetController } from './curriculum-preset-controller';
import { createMetronomeController } from './metronome-controller';
import { createMicSettingsController } from './mic-settings-controller';
import { createInputDeviceController } from './input-device-controller';
import { createMelodyPracticeActionsController } from './melody-practice-actions-controller';
import { createMelodyDemoPresentationController } from './melody-demo-presentation-controller';
import { createMicPolyphonicBenchmarkController } from './mic-polyphonic-benchmark-controller';
import { createMicPolyphonicTelemetryController } from './mic-polyphonic-telemetry-controller';
import { DEFAULT_TABLATURE_MAX_FRET } from '../tablature-optimizer';
import {
  buildDefaultMelodyStudyRange,
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  isDefaultMelodyStudyRange,
  type MelodyStudyRange,
} from '../melody-study-range';
import { isMelodyWorkflowMode } from '../training-mode-groups';

function getSelectedMelodyId() {
  const selectedMelodyId = dom.melodySelector.value.trim();
  return selectedMelodyId.length > 0 ? selectedMelodyId : null;
}

function cloneMelodyEventsDraft(events: MelodyEvent[]) {
  return cloneMelodyEventsDraftModel(events);
}

function syncMelodyImportModalUi() {
  melodyImportModalController.syncUi();
}

const melodyEventEditorController = createMelodyEventEditorController({
  dom: {
    melodyPreviewStatus: dom.melodyPreviewStatus,
    melodyPreviewSummary: dom.melodyPreviewSummary,
    melodyPreviewList: dom.melodyPreviewList,
    melodyEventEditorPanel: dom.melodyEventEditorPanel,
    melodyEventEditorSelection: dom.melodyEventEditorSelection,
    melodyEventEditorNoteSelector: dom.melodyEventEditorNoteSelector,
    melodyEventEditorString: dom.melodyEventEditorString,
    melodyEventEditorFret: dom.melodyEventEditorFret,
    melodyEventEditorAddBtn: dom.melodyEventEditorAddBtn,
    melodyEventEditorDeleteBtn: dom.melodyEventEditorDeleteBtn,
    melodyEventEditorUndoBtn: dom.melodyEventEditorUndoBtn,
    melodyEventEditorRedoBtn: dom.melodyEventEditorRedoBtn,
  },
  getCurrentInstrument: () => state.currentInstrument,
  cloneDraft: cloneMelodyEventsDraft,
  formatUserFacingError,
  onStateChange: syncMelodyImportModalUi,
});

const clearMelodyEditorPreview = () => melodyEventEditorController.clearPreview();
const renderMelodyEditorPreviewError = (prefix: string, error: unknown) =>
  melodyEventEditorController.renderPreviewError(prefix, error);
const renderMelodyEditorPreviewFromEvents = (
  parsedEvents: MelodyEvent[],
  options?: {
    statusText?: string;
    summaryPrefix?: string;
    editableEvents?: boolean;
    preserveDraft?: boolean;
    metadata?: {
      sourceFormat?: MelodyDefinition['sourceFormat'];
      sourceFileName?: string;
      sourceTrackName?: string;
      sourceScoreTitle?: string;
      sourceTempoBpm?: number;
    };
  }
) => melodyEventEditorController.renderPreviewFromEvents(parsedEvents, options);
const renderMelodyEventEditorInspector = () => melodyEventEditorController.renderInspector();

const melodyImportModalController = createMelodyImportModalController({
  dom: {
    melodyNameInput: dom.melodyNameInput,
    melodyAsciiTabInput: dom.melodyAsciiTabInput,
    importMelodyGpBtn: dom.importMelodyGpBtn,
    importMelodyMidiBtn: dom.importMelodyMidiBtn,
    importMelodyBtn: dom.importMelodyBtn,
    melodyImportTitle: dom.melodyImportTitle,
    melodyImportHelpText: dom.melodyImportHelpText,
  },
  state,
  hasStructuredEventDraft: () => melodyEventEditorController.hasDraft(),
  resetImportPreviewDraft: () => melodyImportPreviewController.reset(),
  updatePreview: () => melodyImportPreviewController.updatePreview(),
  renderStructuredPreview: renderMelodyEditorPreviewFromEvents,
  getSelectedMelodyId,
  getSelectedMelody: () => {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
  setModalVisible: (visible) => setModalVisible('melodyImport', visible),
  focusNameInput: (selectText) => {
    dom.melodyNameInput.focus();
    if (selectText) {
      dom.melodyNameInput.select();
    }
  },
  setResultMessage,
});

function getSelectedMidiImportQuantize(): MidiImportQuantize {
  return normalizeMidiImportQuantize(dom.melodyMidiQuantize.value);
}

const melodyImportPreviewController = createMelodyImportPreviewController({
  dom: {
    melodyNameInput: dom.melodyNameInput,
    melodyAsciiTabInput: dom.melodyAsciiTabInput,
    melodyGpTrackImportPanel: dom.melodyGpTrackImportPanel,
    melodyGpTrackSelector: dom.melodyGpTrackSelector,
    melodyGpTrackInfo: dom.melodyGpTrackInfo,
    saveMelodyGpTrackBtn: dom.saveMelodyGpTrackBtn,
    melodyMidiTrackImportPanel: dom.melodyMidiTrackImportPanel,
    melodyMidiTrackSelector: dom.melodyMidiTrackSelector,
    melodyMidiQuantize: dom.melodyMidiQuantize,
    melodyMidiTrackInfo: dom.melodyMidiTrackInfo,
    saveMelodyMidiTrackBtn: dom.saveMelodyMidiTrackBtn,
  },
  getCurrentInstrument: () => state.currentInstrument,
  getSelectedMidiImportQuantize,
  parseAsciiTabToEvents: parseAsciiTabToMelodyEvents,
  loadGpScoreFromBytes,
  convertLoadedGpScoreTrackToImportedMelody,
  loadMidiFileFromBytes,
  convertLoadedMidiTrackToImportedMelody,
  renderPreviewFromEvents: renderMelodyEditorPreviewFromEvents,
  renderPreviewError: renderMelodyEditorPreviewError,
  clearPreview: clearMelodyEditorPreview,
});

const updateSelectedMelodyEventEditorNotePosition = (stringName: string, fretValue: number) =>
  melodyEventEditorController.updateSelectedNotePosition(stringName, fretValue);
const deleteSelectedMelodyEventEditorNote = () => melodyEventEditorController.deleteSelectedNote();
const addMelodyEventEditorNote = () => melodyEventEditorController.addNote();
const undoMelodyEventEditorMutation = () => melodyEventEditorController.undo();
const redoMelodyEventEditorMutation = () => melodyEventEditorController.redo();

const melodyLibraryActionsController = createMelodyLibraryActionsController({
  getSelectedMelody: () => {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
  getCurrentInstrument: () => state.currentInstrument,
  getMelodyEditorMode: () => state.melodyEditorMode,
  getEditingMelodyId: () => state.editingMelodyId,
  getMelodyNameInputValue: () => dom.melodyNameInput.value.trim(),
  getAsciiTabInputValue: () => dom.melodyAsciiTabInput.value,
  getEventEditorDraft: () => melodyEventEditorController.getDraft(),
  getEventEditorMetadata: () => melodyEventEditorController.getSourceMetadata(),
  resolvePendingGpImportedPreview: () => melodyImportPreviewController.resolvePendingGpImportedPreview(),
  resolvePendingMidiImportedPreview: () => melodyImportPreviewController.resolvePendingMidiImportedPreview(),
  getPracticeAdjustedMelody: (melody) =>
    getMelodyWithPracticeAdjustments(
      melody,
      state.melodyTransposeSemitones,
      state.melodyStringShift,
      state.currentInstrument
    ),
  getPracticeAdjustedBakeBpm: (melody) => {
    const parsed = Number.parseInt(dom.melodyDemoBpm.value, 10);
    return Number.isFinite(parsed) ? parsed : melody.sourceTempoBpm ?? undefined;
  },
  saveCustomEventMelody,
  updateCustomEventMelody,
  saveCustomAsciiTabMelody,
  updateCustomAsciiTabMelody,
  exportMelodyToMidiBytes,
  buildExportMidiFileName,
  downloadBytesAsFile,
  getPracticeAdjustmentSummary: () => ({
    transposeSemitones: state.melodyTransposeSemitones,
    stringShift: state.melodyStringShift,
  }),
  finalizeImportSelection: finalizeMelodyImportSelection,
});

function stopPlaybackForTimelineEditing() {
  if (melodyDemoController.isActive()) {
    stopMelodyDemoPlayback({ clearUi: true, message: 'Playback stopped to edit the melody.' });
  }
  if (state.isListening) {
    stopListening();
    setResultMessage('Session stopped to edit the melody.');
  }
}

const melodyTimelineEditingOrchestrator = createMelodyTimelineEditingOrchestrator({
  getSelectedMelody: () => {
    const selectedMelodyId = dom.melodySelector.value;
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
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
  isMelodyWorkflowMode,
  updateCustomEventMelody,
  clearPracticeAdjustmentCaches: () => {
    clearMelodyTransposeCache();
    clearMelodyStringShiftCache();
  },
  renderTimeline: renderMelodyTabTimelineFromState,
  redrawFretboard,
});

const resetMelodyTimelineEditingState = () => melodyTimelineEditingOrchestrator.resetState();
const canEditSelectedMelodyOnTimeline = () => melodyTimelineEditingOrchestrator.canEditSelectedMelodyOnTimeline();
const ensureMelodyTimelineEditingDraftLoaded = (melody: MelodyDefinition) =>
  melodyTimelineEditingOrchestrator.ensureDraftLoaded(melody);
const ensureMelodyTimelineEditingSelection = () => melodyTimelineEditingOrchestrator.ensureSelection();
const syncMelodyTimelineEditingState = (_statusText?: string) => melodyTimelineEditingOrchestrator.syncState();
const moveSelectedMelodyTimelineEditingNoteToString = (targetStringName: string, options?: { commit?: boolean }) =>
  melodyTimelineEditingOrchestrator.moveSelectedNoteToString(targetStringName, options);
const addMelodyTimelineEditingNote = () => melodyTimelineEditingOrchestrator.addNote();
const deleteSelectedMelodyTimelineEditingNote = () => melodyTimelineEditingOrchestrator.deleteNote();
const adjustSelectedMelodyTimelineEventDuration = (direction: -1 | 1) =>
  melodyTimelineEditingOrchestrator.adjustDuration(direction);
const addMelodyTimelineEditingEventAfterSelection = () => melodyTimelineEditingOrchestrator.addEventAfterSelection();
const duplicateSelectedMelodyTimelineEvent = () => melodyTimelineEditingOrchestrator.duplicateEvent();
const moveSelectedMelodyTimelineEventToIndex = (targetIndex: number) =>
  melodyTimelineEditingOrchestrator.moveSelectedEventToIndex(targetIndex);
const deleteSelectedMelodyTimelineEvent = () => melodyTimelineEditingOrchestrator.deleteEvent();
const splitSelectedMelodyTimelineEvent = () => melodyTimelineEditingOrchestrator.splitEvent();
const mergeSelectedMelodyTimelineEventWithNext = () => melodyTimelineEditingOrchestrator.mergeEventWithNext();
const undoMelodyTimelineEditingMutation = () => melodyTimelineEditingOrchestrator.undo();
const redoMelodyTimelineEditingMutation = () => melodyTimelineEditingOrchestrator.redo();

function getSelectedMelodyForDemoControls() {
  const selectedMelodyId = dom.melodySelector.value;
  if (!selectedMelodyId) {
    setResultMessage('Select a melody first.', 'error');
    return null;
  }
  const baseMelody = getMelodyById(selectedMelodyId, state.currentInstrument);
  if (!baseMelody) {
    setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
    return null;
  }
  const melody = getMelodyWithPracticeAdjustments(
    baseMelody,
    state.melodyTransposeSemitones,
    state.melodyStringShift,
    state.currentInstrument
  );
  if (melody.events.length === 0) {
    setResultMessage('Selected melody has no playable notes.', 'error');
    return null;
  }
  return {
    melody,
    studyRange: getStoredMelodyStudyRange(melody.id, melody.events.length),
  };
}

let melodyDemoController: ReturnType<typeof createMelodyDemoController> | null = null;

const melodyDemoPresentationController = createMelodyDemoPresentationController({
  dom: {
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
  getSelectedMelody: () => {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
  isMelodyWorkflowMode,
  isDemoActive: () => melodyDemoController?.isActive() ?? false,
  isDemoPaused: () => melodyDemoController?.isPaused() ?? false,
  syncLoopRangeDisplay: () => syncMelodyLoopRangeDisplay(),
  loadInstrumentSoundfont,
  showNonBlockingError,
  formatUserFacingError,
  getEnabledStrings,
  playSound,
  setPromptText,
  drawFretboard,
  redrawFretboard,
  renderTimeline: renderMelodyTabTimelineFromState,
  findPlayableStringForNote,
});

melodyDemoController = createMelodyDemoController({
  getSelection: getSelectedMelodyForDemoControls,
  getLoopRangeEnabled: () => state.melodyLoopRangeEnabled,
  isListening: () => state.isListening,
  stopListening,
  getTrainingMode: () => dom.trainingMode.value,
  isMelodyWorkflowMode,
  seekActiveMelodySessionToEvent: (eventIndex) => {
    const selection = getSelectedMelodyForDemoControls();
    if (!selection) return false;
    state.currentMelodyId = selection.melody.id;
    return seekActiveMelodySessionToEvent(eventIndex);
  },
  ensureAudioReady: melodyDemoPresentationController.ensureAudioReady,
  previewEvent: melodyDemoPresentationController.previewEvent,
  getStepDelayMs: melodyDemoPresentationController.getStepDelayMs,
  getStudyRangeLength: getMelodyStudyRangeLength,
  formatStudyRange: formatMelodyStudyRange,
  clearUiPreview: () => {
    state.melodyTimelinePreviewIndex = null;
    state.melodyTimelinePreviewLabel = null;
    setPromptText('');
  },
  redrawFretboard,
  onStateChange: melodyDemoPresentationController.renderButtonState,
  setResultMessage,
});

function stopMelodyDemoPlayback(options?: { clearUi?: boolean; message?: string }) {
  melodyDemoController.stopPlayback(options);
}

function pauseMelodyDemoPlayback() {
  melodyDemoController.pausePlayback();
}

async function resumeMelodyDemoPlayback() {
  await melodyDemoController.resumePlayback();
}

function seekMelodyTimelineToEvent(eventIndex: number, options?: { commit?: boolean }) {
  melodyDemoController.seekToEvent(eventIndex, options);
}

async function stepMelodyPreview(direction: -1 | 1) {
  await melodyDemoController.stepPreview(direction);
}

async function startMelodyDemoPlayback() {
  await melodyDemoController.startPlayback();
}

function findPlayableStringForNote(note: string): string | null {
  const instrumentData = state.currentInstrument;
  const enabledStrings = getEnabledStrings(dom.stringSelector);

  for (const stringName of instrumentData.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    const fret =
      instrumentData.FRETBOARD[stringName as keyof typeof instrumentData.FRETBOARD][
        note as keyof typeof instrumentData.FRETBOARD.e
      ];
    if (typeof fret === 'number') {
      return stringName;
    }
  }

  return null;
}

function applyEnabledStrings(enabledStrings: string[]) {
  const enabled = new Set(enabledStrings);
  dom.stringSelector.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    const checkbox = input as HTMLInputElement;
    checkbox.checked = enabled.has(checkbox.value);
  });
}

function isTextEntryElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function isElementWithin(target: EventTarget | null, container: HTMLElement | null | undefined) {
  return target instanceof Node && !!container && container.contains(target);
}

function isAnyBlockingModalOpen() {
  return [
    dom.settingsModal,
    dom.statsModal,
    dom.guideModal,
    dom.linksModal,
    dom.profileNameModal,
    dom.melodyImportModal,
    dom.confirmModal,
    dom.calibrationModal,
  ].some((element) => !element.classList.contains('hidden'));
}

function shouldHandleMelodyDemoHotkeys(event: KeyboardEvent) {
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) return false;
  if (isTextEntryElement(event.target)) return false;
  if (isAnyBlockingModalOpen()) return false;
  return melodyDemoController.shouldHandleHotkeys();
}

export function refreshMelodyOptionsForCurrentInstrument() {
  melodyPracticeSettingsController.refreshMelodyOptionsForCurrentInstrument();
  updateMelodyActionButtonsForSelection();
}

function finalizeMelodyImportSelection(melodyId: string, successMessage: string) {
  resetMelodyTimelineEditingState();
  refreshMelodyOptionsForCurrentInstrument();
  dom.melodySelector.value = melodyId;
  state.preferredMelodyId = melodyId;
  hydrateMelodyTransposeForSelectedMelody();
  hydrateMelodyStringShiftForSelectedMelody();
  hydrateMelodyStudyRangeForSelectedMelody();
  melodyDemoController.clearPreviewState();
  updateMelodyActionButtonsForSelection();
  dom.melodyNameInput.value = '';
  dom.melodyAsciiTabInput.value = '';
  melodyImportModalController.close();
  markCurriculumPresetAsCustom();
  updatePracticeSetupSummary();
  saveSettings();
  setResultMessage(successMessage, 'success');
  refreshMelodyTimelineUi();
}

function downloadBytesAsFile(bytes: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
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
  clearPreviewState: () => melodyDemoController.clearPreviewState(),
  renderTimeline: renderMelodyTabTimelineFromState,
});

const getStoredMelodyStudyRange = (melodyId: string | null, totalEvents: number) =>
  melodyPracticeSettingsController.getStoredMelodyStudyRange(melodyId, totalEvents);
const syncMelodyLoopRangeDisplay = () => melodyPracticeSettingsController.syncMelodyLoopRangeDisplay();
const hydrateMelodyTransposeForSelectedMelody = (options?: { migrateLegacyValue?: boolean }) =>
  melodyPracticeSettingsController.hydrateMelodyTransposeForSelectedMelody(options);
const hydrateMelodyStringShiftForSelectedMelody = () =>
  melodyPracticeSettingsController.hydrateMelodyStringShiftForSelectedMelody();
const hydrateMelodyStudyRangeForSelectedMelody = () =>
  melodyPracticeSettingsController.hydrateMelodyStudyRangeForSelectedMelody();
const applyMelodyTransposeSemitones = (nextValue: unknown) =>
  melodyPracticeSettingsController.applyMelodyTransposeSemitones(nextValue);
const applyMelodyStringShift = (nextValue: unknown) =>
  melodyPracticeSettingsController.applyMelodyStringShift(nextValue);
const applyMelodyStudyRange = (range: Partial<MelodyStudyRange>) =>
  melodyPracticeSettingsController.applyMelodyStudyRange(range);
const setStoredMelodyTransposeSemitones = (melodyId: string | null, semitones: number) =>
  melodyPracticeSettingsController.setStoredMelodyTransposeSemitones(melodyId, semitones);
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
  getSelectedMelody: () => {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
  getSelectedMelodyId,
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
  isDemoActive: () => melodyDemoController.isActive(),
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
  getSelectedMelody: () => {
    const selectedMelodyId = getSelectedMelodyId();
    return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  },
  getStoredMelodyStudyRangeText: (melody) =>
    formatMelodyStudyRange(
      getStoredMelodyStudyRange(melody.id, melody.events.length),
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
    metronomeBpm: dom.metronomeBpm,
    metronomeBpmValue: dom.metronomeBpmValue,
    metronomeBeatLabel: dom.metronomeBeatLabel,
    metronomePulse: dom.metronomePulse,
  },
  clampMetronomeBpm,
  startMetronome,
  stopMetronome,
  setMetronomeTempo,
  subscribeMetronomeBeat,
  saveSettings,
  formatUserFacingError,
  showNonBlockingError,
});

const syncMetronomeBpmDisplay = () => metronomeController.syncBpmDisplay();
const getClampedMetronomeBpmFromInput = () => metronomeController.getClampedBpmFromInput();
const resetMetronomeVisualIndicator = () => metronomeController.resetVisualIndicator();

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
    metronomeBpm: dom.metronomeBpm,
    showAllNotes: dom.showAllNotes,
    trainingMode: dom.trainingMode,
    difficulty: dom.difficulty,
    startFret: dom.startFret,
    endFret: dom.endFret,
  },
  state,
  getClampedMetronomeBpmFromInput,
  applyEnabledStrings,
  handleModeChange,
  redrawFretboard,
  saveSettings,
  setResultMessage,
  isListening: () => state.isListening,
  stopListening,
});

const setCurriculumPresetInfo = (text: string) => curriculumPresetController.setPresetInfo(text);
const setCurriculumPresetSelection = (key: CurriculumPresetKey) =>
  curriculumPresetController.setSelection(key);
const markCurriculumPresetAsCustom = () => curriculumPresetController.markAsCustom();
const applyCurriculumPreset = (key: CurriculumPresetKey) => curriculumPresetController.applyPreset(key);

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
  ensureAudioRuntime: (runtimeState, options) => ensureAudioRuntime(runtimeState as typeof state, options),
  refreshAudioInputDeviceOptions,
  refreshMicPolyphonicDetectorAudioInfoUi,
  saveSettings,
  setResultMessage,
  formatUserFacingError,
  showNonBlockingError,
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
  stopMelodyDemoPlayback,
  stopListening,
  saveSettings,
  updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
  setResultMessage,
});

const updateMicNoiseGateInfo = () => micSettingsController.updateNoiseGateInfo();
const micPolyphonicBenchmarkController = createMicPolyphonicBenchmarkController({
  dom: {
    runMicPolyphonicBenchmarkBtn: dom.runMicPolyphonicBenchmarkBtn,
    micPolyphonicBenchmarkInfo: dom.micPolyphonicBenchmarkInfo,
  },
  state,
  detectMicPolyphonicFrame,
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

const melodyPracticeActionsController = createMelodyPracticeActionsController({
  dom: {
    trainingMode: dom.trainingMode,
  },
  state,
  isMelodyWorkflowMode,
  stopMelodyDemoPlayback,
  stopListening,
  markCurriculumPresetAsCustom,
  updateMelodyActionButtonsForSelection,
  updatePracticeSetupSummary,
  saveSettings,
  redrawFretboard,
  refreshMelodyTimelineUi,
  setResultMessage,
  applyMelodyTransposeSemitones,
  applyMelodyStringShift,
  applyMelodyStudyRange,
  listCustomMelodies: () => listMelodiesForInstrument(state.currentInstrument).filter((entry) => entry.source === 'custom'),
  setStoredMelodyTransposeSemitones,
  hydrateMelodyTransposeForSelectedMelody,
  formatMelodyTransposeSemitones,
  confirmUserAction,
});

function resetMelodyGpFileInput() {
  dom.melodyGpFileInput.value = '';
}

function resetMelodyMidiFileInput() {
  dom.melodyMidiFileInput.value = '';
}

function updateMelodyActionButtonsForSelection() {
  melodySetupUiController.updateActionButtons();
}

function updatePracticeSetupSummary() {
  practiceSetupSummaryController.update();
}

function refreshMelodyTimelineUi() {
  renderMelodyTabTimelineFromState();
  syncMelodyTimelineEditingState();
}

const melodyTimelineEditingController = createMelodyTimelineEditingController({
  getSelectedMelodyId,
  canEditSelectedMelodyOnTimeline,
  ensureDraftLoaded: ensureMelodyTimelineEditingDraftLoaded,
  ensureSelection: ensureMelodyTimelineEditingSelection,
  syncState: syncMelodyTimelineEditingState,
  renderTimeline: renderMelodyTabTimelineFromState,
  stopPlaybackForEditing: stopPlaybackForTimelineEditing,
  moveSelectedNoteToString: moveSelectedMelodyTimelineEditingNoteToString,
  adjustSelectedNoteFret: (direction) => melodyTimelineEditingOrchestrator.adjustSelectedNoteFret(direction),
  moveSelectedEventToIndex: moveSelectedMelodyTimelineEventToIndex,
  adjustDuration: adjustSelectedMelodyTimelineEventDuration,
  addNote: addMelodyTimelineEditingNote,
  addNoteAtEventString: (eventIndex, stringName) =>
    melodyTimelineEditingOrchestrator.addNoteAtEventString(eventIndex, stringName),
  addEventAfterSelection: addMelodyTimelineEditingEventAfterSelection,
  duplicateEvent: duplicateSelectedMelodyTimelineEvent,
  splitEvent: splitSelectedMelodyTimelineEvent,
  mergeEventWithNext: mergeSelectedMelodyTimelineEventWithNext,
  deleteNote: deleteSelectedMelodyTimelineEditingNote,
  deleteEvent: deleteSelectedMelodyTimelineEvent,
  deleteEventEditorNote: deleteSelectedMelodyEventEditorNote,
  undo: undoMelodyTimelineEditingMutation,
  redo: redoMelodyTimelineEditingMutation,
  undoEventEditor: undoMelodyEventEditorMutation,
  redoEventEditor: redoMelodyEventEditorMutation,
  showNonBlockingError,
  formatUserFacingError,
  isTextEntryElement,
  isElementWithin,
  isAnyBlockingModalOpen,
  isMelodyWorkflowMode,
});

async function startSessionFromUi() {
  if (!(await ensureRhythmModeMetronome())) return;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  refreshMelodyTimelineUi();
  await startListening();
}

async function ensureRhythmModeMetronome() {
  return metronomeController.ensureRhythmModeMetronome();
}

export function registerSessionControls() {
  setCurriculumPresetSelection('custom');
  dom.metronomeBpm.value = String(getClampedMetronomeBpmFromInput());
  dom.melodyDemoBpm.value = String(melodyDemoPresentationController.getClampedBpmFromInput());
  state.melodyTransposeById = state.melodyTransposeById ?? {};
  state.melodyStringShiftById = state.melodyStringShiftById ?? {};
  state.melodyStudyRangeById = state.melodyStudyRangeById ?? {};
  syncMelodyLoopRangeDisplay();
  dom.timelineViewMode.value = state.melodyTimelineViewMode;
  dom.showTimelineSteps.checked = state.showMelodyTimelineSteps;
  dom.showTimelineDetails.checked = state.showMelodyTimelineDetails;
  syncMetronomeBpmDisplay();
  melodyDemoPresentationController.syncBpmDisplay();
  refreshMelodyOptionsForCurrentInstrument();
  setMelodyTimelineStudyRangeCommitHandler(({ melodyId, range }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    melodyPracticeActionsController.handleStudyRangeChange(range, {
      stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
    });
  });
  melodyTimelineEditingController.registerInteractionHandlers();
  setMelodyTimelineSeekHandler(({ melodyId, eventIndex, commit }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    seekMelodyTimelineToEvent(eventIndex, { commit });
  });
  melodyImportModalController.resetDraft();
  melodyImportModalController.syncUi();
  melodyDemoPresentationController.renderButtonState();
  resetMetronomeVisualIndicator();
  updateMicNoiseGateInfo();
  refreshMicPolyphonicDetectorAudioInfoUi();
  micPolyphonicTelemetryController.syncButtonState();
  updatePracticeSetupSummary();
  syncMelodyTimelineEditingState();
  refreshInputSourceAvailabilityUi();
  setPracticeSetupCollapsed(window.innerWidth < 900);
  void refreshAudioInputDeviceOptions();
  void refreshMidiInputDevices(false);
  dom.closeMelodyImportBtn.addEventListener('click', () => {
    resetMelodyGpFileInput();
    resetMelodyMidiFileInput();
    melodyImportModalController.close();
  });
  dom.cancelMelodyImportBtn.addEventListener('click', () => {
    resetMelodyGpFileInput();
    resetMelodyMidiFileInput();
    melodyImportModalController.close();
  });
  dom.melodyImportModal.addEventListener('click', (e) => {
    if (e.target === dom.melodyImportModal) {
      resetMelodyGpFileInput();
      resetMelodyMidiFileInput();
      melodyImportModalController.close();
    }
  });

  dom.practiceSetupToggleBtn.addEventListener('click', () => {
    togglePracticeSetupCollapsed();
  });
  dom.melodySetupToggleBtn.addEventListener('click', () => {
    toggleMelodySetupCollapsed();
  });
  dom.sessionToolsToggleBtn.addEventListener('click', () => {
    toggleSessionToolsCollapsed();
  });

  metronomeController.registerBeatIndicator();

  // --- Main Session Controls ---
  dom.sessionToggleBtn.addEventListener('click', async () => {
    if (melodyDemoController.isActive()) {
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
      return;
    }
    if (!dom.stopBtn.disabled) {
      stopListening();
      return;
    }

    await startSessionFromUi();
  });

  dom.startBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    await startSessionFromUi();
  });

  dom.stopBtn.addEventListener('click', () => {
    stopListening();
  });

  // --- Top Control Bar Listeners ---
  dom.instrumentSelector.addEventListener('change', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    resetMelodyTimelineEditingState();
    state.currentInstrument = instruments[dom.instrumentSelector.value];
    state.currentTuningPresetKey = dom.tuningPreset.value;
    updateInstrumentUI(); // Redraw strings, fretboard, etc.
    refreshMelodyOptionsForCurrentInstrument();
    updatePracticeSetupSummary();
    await loadInstrumentSoundfont(state.currentInstrument.name);
    saveSettings();
    refreshMelodyTimelineUi();
  });

  dom.tuningPreset.addEventListener('change', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    resetMelodyTimelineEditingState();
    if (state.isListening) {
      stopListening();
    }

    state.currentTuningPresetKey = dom.tuningPreset.value;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));
    updateInstrumentUI(enabledStrings, state.currentTuningPresetKey);
    updatePracticeSetupSummary();
    saveSettings();
    setResultMessage(`Tuning set: ${dom.tuningPreset.selectedOptions[0]?.textContent ?? dom.tuningPreset.value}`);
    refreshMelodyTimelineUi();
  });

  dom.showAllNotes.addEventListener('change', (e) => {
    markCurriculumPresetAsCustom();
    state.showingAllNotes = (e.target as HTMLInputElement).checked;
    saveSettings();
    redrawFretboard();
  });
  dom.showStringToggles.addEventListener('change', () => {
    dom.stringSelector.classList.toggle('hidden', !dom.showStringToggles.checked);
    saveSettings();
  });
  dom.autoPlayPromptSound.addEventListener('change', () => {
    state.autoPlayPromptSound = dom.autoPlayPromptSound.checked;
    saveSettings();
  });
  dom.stringSelector.addEventListener('change', () => {
    updatePracticeSetupSummary();
  });

  dom.noteNaming.addEventListener('change', () => {
    setNoteNamingPreference(dom.noteNaming.value);
    saveSettings();
    redrawFretboard();
    refreshDisplayFormatting();
  });
  dom.showTimelineSteps.addEventListener('change', () => {
    state.showMelodyTimelineSteps = dom.showTimelineSteps.checked;
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.showTimelineDetails.addEventListener('change', () => {
    state.showMelodyTimelineDetails = dom.showTimelineDetails.checked;
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.timelineViewMode.addEventListener('change', () => {
    state.melodyTimelineViewMode = dom.timelineViewMode.value === 'grid' ? 'grid' : 'classic';
    dom.timelineViewMode.value = state.melodyTimelineViewMode;
    saveSettings();
    refreshMelodyTimelineUi();
  });

  dom.audioInputDevice.addEventListener('change', () => {
    inputDeviceController.handleAudioInputDeviceChange();
  });

  dom.micSensitivityPreset.addEventListener('change', () => {
    micSettingsController.handleSensitivityChange();
  });
  dom.micNoteAttackFilter.addEventListener('change', () => {
    micSettingsController.handleAttackChange();
  });
  dom.micNoteHoldFilter.addEventListener('change', () => {
    micSettingsController.handleHoldChange();
  });
  dom.micPolyphonicDetectorProvider.addEventListener('change', () => {
    micSettingsController.handlePolyphonicProviderChange();
  });

  dom.calibrateNoiseFloorBtn.addEventListener('click', async () => {
    await micSettingsController.calibrateNoiseFloor();
  });
  dom.runMicPolyphonicBenchmarkBtn.addEventListener('click', async () => {
    await micPolyphonicBenchmarkController.runBenchmark();
  });
  dom.exportMicPolyphonicTelemetryBtn.addEventListener('click', () => {
    micPolyphonicTelemetryController.exportTelemetry();
  });
  dom.resetMicPolyphonicTelemetryBtn.addEventListener('click', () => {
    micPolyphonicTelemetryController.resetTelemetry();
  });

  dom.inputSource.addEventListener('change', () => {
    void inputDeviceController.handleInputSourceChange();
  });

  dom.midiInputDevice.addEventListener('change', () => {
    inputDeviceController.handleMidiInputDeviceChange();
  });

  dom.trainingMode.addEventListener('change', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    handleModeChange();
    updatePracticeSetupSummary();
    saveSettings();
    syncMelodyTimelineEditingState();
  });

  dom.sessionGoal.addEventListener('change', () => {
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.sessionPace.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    state.sessionPace = normalizeSessionPace(dom.sessionPace.value);
    dom.sessionPace.value = state.sessionPace;
    updatePracticeSetupSummary();
    saveSettings();
  });

  dom.curriculumPreset.addEventListener('change', () => {
    const key = dom.curriculumPreset.value as CurriculumPresetKey;
    if (key === 'custom') {
      setCurriculumPresetInfo('');
      updatePracticeSetupSummary();
      return;
    }
    applyCurriculumPreset(key);
    updatePracticeSetupSummary();
  });

  dom.startFret.addEventListener('input', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    redrawFretboard();
  });
  dom.endFret.addEventListener('input', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    redrawFretboard();
  });
  dom.metronomeEnabled.addEventListener('change', async () => {
    await metronomeController.handleEnabledChange();
  });
  dom.metronomeBpm.addEventListener('input', async () => {
    await metronomeController.handleBpmInput();
  });
  dom.rhythmTimingWindow.addEventListener('change', () => {
    saveSettings();
  });
  dom.difficulty.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.scaleSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodySelector.addEventListener('change', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    state.preferredMelodyId = dom.melodySelector.value || null;
    resetMelodyTimelineEditingState();
    hydrateMelodyTransposeForSelectedMelody();
    hydrateMelodyStringShiftForSelectedMelody();
    hydrateMelodyStudyRangeForSelectedMelody();
    melodyDemoController.clearPreviewState();
    updateMelodyActionButtonsForSelection();
    if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
      stopListening();
      setResultMessage('Melody changed. Session stopped; press Start to begin from the first event.');
    }
    updatePracticeSetupSummary();
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.melodyTranspose.addEventListener('input', () => {
    melodyPracticeActionsController.handleTransposeInputChange(dom.melodyTranspose.value);
  });
  dom.melodyTranspose.addEventListener('change', () => {
    melodyPracticeActionsController.handleTransposeInputChange(dom.melodyTranspose.value);
  });
  dom.melodyTransposeDownBtn.addEventListener('click', () => {
    dom.melodyTranspose.value = String(
      normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones - 1)
    );
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeUpBtn.addEventListener('click', () => {
    dom.melodyTranspose.value = String(
      normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones + 1)
    );
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeResetBtn.addEventListener('click', () => {
    if (state.melodyTransposeSemitones === 0) return;
    dom.melodyTranspose.value = '0';
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShift.addEventListener('input', () => {
    melodyPracticeActionsController.handleStringShiftInputChange(dom.melodyStringShift.value);
  });
  dom.melodyStringShift.addEventListener('change', () => {
    melodyPracticeActionsController.handleStringShiftInputChange(dom.melodyStringShift.value);
  });
  dom.melodyStringShiftDownBtn.addEventListener('click', () => {
    dom.melodyStringShift.value = String(
      normalizeMelodyStringShift(state.melodyStringShift - 1, state.currentInstrument)
    );
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShiftUpBtn.addEventListener('click', () => {
    dom.melodyStringShift.value = String(
      normalizeMelodyStringShift(state.melodyStringShift + 1, state.currentInstrument)
    );
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShiftResetBtn.addEventListener('click', () => {
    if (state.melodyStringShift === 0) return;
    dom.melodyStringShift.value = '0';
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeBatchCustomBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    await melodyPracticeActionsController.applyCurrentTransposeToAllCustomMelodies();
  });
  dom.melodyStudyStart.addEventListener('change', () => {
    melodyPracticeActionsController.handleStudyRangeChange(
      {
        startIndex: Number.parseInt(dom.melodyStudyStart.value, 10) - 1,
        endIndex: Number.parseInt(dom.melodyStudyEnd.value, 10) - 1,
      },
      {
        stopMessage: 'Study range changed. Session stopped; press Start to continue.',
      }
    );
  });
  dom.melodyStudyEnd.addEventListener('change', () => {
    dom.melodyStudyStart.dispatchEvent(new Event('change'));
  });
  dom.melodyStudyResetBtn.addEventListener('click', () => {
    const selectedMelodyId = getSelectedMelodyId();
    const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
    if (!melody) return;
    const fullRange = buildDefaultMelodyStudyRange(melody.events.length);
    dom.melodyStudyStart.value = String(fullRange.startIndex + 1);
    dom.melodyStudyEnd.value = String(fullRange.endIndex + 1);
    dom.melodyStudyStart.dispatchEvent(new Event('change'));
  });
  dom.melodyShowNote.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodyLoopRange.addEventListener('change', () => {
    state.melodyLoopRangeEnabled = dom.melodyLoopRange.checked;
    syncMelodyLoopRangeDisplay();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodyAsciiTabInput.addEventListener('input', () => {
    melodyImportPreviewController.schedulePreviewUpdate();
  });
  dom.melodyNameInput.addEventListener('input', () => {
    if (!dom.melodyAsciiTabInput.value.trim()) {
      melodyImportPreviewController.updatePreview();
    }
  });
  dom.melodyDemoBpm.addEventListener('input', () => {
    melodyDemoPresentationController.getClampedBpmFromInput();
  });
  dom.openMelodyImportBtn.addEventListener('click', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    melodyImportModalController.open({ mode: 'create' });
  });
  dom.importMelodyGpBtn.addEventListener('click', () => {
    dom.melodyGpFileInput.click();
  });
  dom.importMelodyMidiBtn.addEventListener('click', () => {
    dom.melodyMidiFileInput.click();
  });
  dom.melodyGpFileInput.addEventListener('change', async () => {
    const file = dom.melodyGpFileInput.files?.[0];
    if (!file) return;

    const originalLabel = dom.importMelodyGpBtn.textContent ?? 'Import GP...';
    dom.importMelodyGpBtn.disabled = true;
    dom.importMelodyGpBtn.textContent = 'Importing...';

    try {
      stopMelodyDemoPlayback({ clearUi: true });
      await melodyImportPreviewController.loadGpImportDraftFromFile(file);
      setResultMessage('GP file parsed. Review the preview, choose a track, then save.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to import Guitar Pro file', error));
    } finally {
      dom.importMelodyGpBtn.disabled = false;
      dom.importMelodyGpBtn.textContent = originalLabel;
      resetMelodyGpFileInput();
    }
  });
  dom.melodyMidiFileInput.addEventListener('change', async () => {
    const file = dom.melodyMidiFileInput.files?.[0];
    if (!file) return;

    const originalLabel = dom.importMelodyMidiBtn.textContent ?? 'Import MIDI...';
    dom.importMelodyMidiBtn.disabled = true;
    dom.importMelodyMidiBtn.textContent = 'Importing...';

    try {
      stopMelodyDemoPlayback({ clearUi: true });
      await melodyImportPreviewController.loadMidiImportDraftFromFile(file);
      setResultMessage('MIDI file parsed. Review the preview, choose a track, then save.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to import MIDI file', error));
    } finally {
      dom.importMelodyMidiBtn.disabled = false;
      dom.importMelodyMidiBtn.textContent = originalLabel;
      resetMelodyMidiFileInput();
    }
  });
  dom.melodyMidiTrackSelector.addEventListener('change', () => {
    try {
      melodyImportPreviewController.refreshMidiTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('MIDI track preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to preview selected MIDI track', error));
    }
  });
  dom.melodyMidiQuantize.addEventListener('change', () => {
    if (!melodyImportPreviewController.hasPendingMidiImport()) return;
    try {
      melodyImportPreviewController.refreshMidiTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('MIDI quantized preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to apply MIDI quantize preview', error));
    }
  });
  dom.saveMelodyMidiTrackBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      melodyLibraryActionsController.savePendingMidiImportedTrack();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save imported MIDI track', error));
    }
  });
  dom.melodyGpTrackSelector.addEventListener('change', () => {
    try {
      melodyImportPreviewController.refreshGpTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('GP track preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to preview selected GP track', error));
    }
  });
  dom.saveMelodyGpTrackBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      melodyLibraryActionsController.savePendingGpImportedTrack();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save imported GP track', error));
    }
  });
  dom.melodyEventEditorString.addEventListener('change', () => {
    try {
      const fretValue = Number.parseInt(dom.melodyEventEditorFret.value, 10);
      updateSelectedMelodyEventEditorNotePosition(
        dom.melodyEventEditorString.value,
        Number.isFinite(fretValue) ? fretValue : 0
      );
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update note string', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorFret.addEventListener('input', () => {
    const parsed = Number.parseInt(dom.melodyEventEditorFret.value, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(parsed)));
    dom.melodyEventEditorFret.value = String(clamped);
    try {
      updateSelectedMelodyEventEditorNotePosition(dom.melodyEventEditorString.value, clamped);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update note fret', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorAddBtn.addEventListener('click', () => {
    try {
      addMelodyEventEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to add note', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorDeleteBtn.addEventListener('click', () => {
    try {
      deleteSelectedMelodyEventEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to delete note', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorUndoBtn.addEventListener('click', () => {
    undoMelodyEventEditorMutation();
  });
  dom.melodyEventEditorRedoBtn.addEventListener('click', () => {
    redoMelodyEventEditorMutation();
  });
  dom.editMelodyBtn.addEventListener('click', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    melodyImportModalController.open({ mode: 'edit-custom' });
  });
  dom.exportMelodyMidiBtn.addEventListener('click', async () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
        stopListening();
      }
      await melodyLibraryActionsController.exportSelectedMelodyAsMidi();
      setResultMessage('MIDI file exported.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to export MIDI file', error));
    }
  });
  dom.bakePracticeMelodyBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
        stopListening();
      }
      melodyLibraryActionsController.bakeSelectedPracticeAdjustedMelodyAsCustom();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to bake adjusted melody', error));
    }
  });
  dom.melodyDemoBtn.addEventListener('click', async () => {
    if (melodyDemoController.isActive()) {
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
      return;
    }
    setPracticeSetupCollapsed(true);
    await startMelodyDemoPlayback();
  });
  dom.melodyPauseDemoBtn.addEventListener('click', async () => {
    if (melodyDemoController.isPlaying()) {
      pauseMelodyDemoPlayback();
      return;
    }
    if (melodyDemoController.isPaused()) {
      await resumeMelodyDemoPlayback();
    }
  });
  document.addEventListener('keydown', async (event) => {
    if (!shouldHandleMelodyDemoHotkeys(event)) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (melodyDemoController.isPlaying()) {
        pauseMelodyDemoPlayback();
      } else if (melodyDemoController.isPaused()) {
        await resumeMelodyDemoPlayback();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody playback stopped.' });
    }
  });
  document.addEventListener('keydown', (event) => {
    const hotkeyResult = melodyTimelineEditingController.handleHotkey(event);
    if (hotkeyResult) {
      if (!hotkeyResult.skipSync) {
        syncMelodyTimelineEditingState();
      }
      renderMelodyEventEditorInspector();
    }
  });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('.timeline-context-menu')) {
      const hadOpenTimelineContextMenu = clearMelodyTimelineContextMenu();
      if (hadOpenTimelineContextMenu) {
        renderMelodyTabTimelineFromState();
      }
    }

    if (
      state.melodyTimelineSelectedEventIndex === null &&
      state.melodyTimelineSelectedNoteIndex === null
    ) {
      return;
    }

    if (target.closest('[data-note-index]')) return;
    if (target.closest('.timeline-context-menu')) return;
    if (target.closest('[data-timeline-range-ui="true"]')) return;
    if (target.closest('button, input, select, textarea, a, label, summary')) return;
    if (target.closest('[role="button"]')) return;

    melodyTimelineEditingController.clearSelection();
    renderMelodyEventEditorInspector();
  });
  dom.melodyStepBackBtn.addEventListener('click', async () => {
    await stepMelodyPreview(-1);
  });
  dom.melodyStepForwardBtn.addEventListener('click', async () => {
    await stepMelodyPreview(1);
  });
  dom.importMelodyBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      melodyLibraryActionsController.saveFromModal();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save melody from ASCII tab', error));
    }
  });
  dom.deleteMelodyBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    const selectedId = dom.melodySelector.value;
    if (!isCustomMelodyId(selectedId)) return;

    const confirmed = await confirmUserAction('Delete selected custom melody from the local library?');
    if (!confirmed) return;

    const deleted = deleteCustomMelody(selectedId);
    refreshMelodyOptionsForCurrentInstrument();
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    if (deleted) {
      setResultMessage('Custom melody deleted.');
    }
  });
  dom.chordSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.randomizeChords.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    saveSettings();
  });
  dom.progressionSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.arpeggioPatternSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  // String selector listeners are added dynamically in updateInstrumentUI.

  dom.playSoundBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt) return;

    const audioPlan = buildPromptAudioPlan({
      prompt,
      trainingMode: dom.trainingMode.value,
      instrument: state.currentInstrument,
      calibratedA4: state.calibratedA4,
      enabledStrings: getEnabledStrings(dom.stringSelector),
    });

    if (audioPlan.notesToPlay.length === 1) {
      playSound(audioPlan.notesToPlay[0]);
    } else if (audioPlan.notesToPlay.length > 1) {
      playSound(audioPlan.notesToPlay);
    }
  });

  dom.hintBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt) return;

    clearResultMessage();

    if ((prompt.targetMelodyEventNotes?.length ?? 0) >= 1) {
      drawFretboard(false, null, null, prompt.targetMelodyEventNotes ?? []);
      state.cooldown = true;
      scheduleSessionTimeout(
        2000,
        () => {
          redrawFretboard();
          state.cooldown = false;
        },
        'melody poly hint cooldown redraw'
      );
      return;
    }

    if (!prompt.targetNote) return;

    const noteToShow = prompt.targetNote;
    const stringToShow = prompt.targetString || findPlayableStringForNote(noteToShow);

    if (stringToShow) {
      drawFretboard(false, noteToShow, stringToShow);
      state.cooldown = true;
      scheduleSessionTimeout(
        2000,
        () => {
          redrawFretboard();
          state.cooldown = false;
        },
        'hint cooldown redraw'
      );
    } else {
      setResultMessage(`Hint: The answer is ${noteToShow}`);
    }
  });
}

