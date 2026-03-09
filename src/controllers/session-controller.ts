import { dom, state } from '../state';
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
  convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes,
} from '../musescore-file-import';
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
import { updateScrollingTabPanelRuntime } from '../scrolling-tab-panel';
import { createMelodyTimelineEditingController } from './melody-timeline-editing-controller';
import { createMelodyTimelineEditingOrchestrator } from './melody-timeline-editing-orchestrator';
import { createMelodyImportPreviewController } from './melody-import-preview-controller';
import { createMelodyEventEditorController } from './melody-event-editor-controller';
import { createMelodyImportModalController } from './melody-import-modal-controller';
import { createMelodyImportControlsController } from './melody-import-controls-controller';
import { createMelodyEditingControlsController } from './melody-editing-controls-controller';
import { createMelodyPlaybackControlsController } from './melody-playback-controls-controller';
import { createMelodyLibraryControlsController } from './melody-library-controls-controller';
import { createMelodyLibraryActionsController } from './melody-library-actions-controller';
import { createPracticePresetControlsController } from './practice-preset-controls-controller';
import { createPracticeSetupControlsController } from './practice-setup-controls-controller';
import { createInstrumentDisplayControlsController } from './instrument-display-controls-controller';
import { createMelodySetupControlsController } from './melody-setup-controls-controller';
import { createMelodyPracticeControlsController } from './melody-practice-controls-controller';
import { createSessionTransportControlsController } from './session-transport-controls-controller';
import { createAudioInputControlsController } from './audio-input-controls-controller';
import { createMelodyTempoController } from './melody-tempo-controller';
import { createSessionBootstrapController } from './session-bootstrap-controller';
import { createPracticePresetUiController } from './practice-preset-ui-controller';
import { createMelodyPracticeSettingsController } from './melody-practice-settings-controller';
import { createMelodySetupUiController } from './melody-setup-ui-controller';
import { createPracticeSetupSummaryController } from './practice-setup-summary-controller';
import { createCurriculumPresetController } from './curriculum-preset-controller';
import { createMetronomeController } from './metronome-controller';
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

function getSelectedMelodyId() {
  const selectedMelodyId = dom.melodySelector.value.trim();
  return selectedMelodyId.length > 0 ? selectedMelodyId : null;
}

function getSelectedBaseMelody() {
  const selectedMelodyId = getSelectedMelodyId();
  return selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
}

function syncMetronomeMeterFromSelectedMelody() {
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) {
    setMetronomeMeter({
      beatsPerBar: DEFAULT_METRONOME_BEATS_PER_BAR,
      beatUnitDenominator: 4,
      secondaryAccentBeatIndices: [],
    });
    return;
  }
  const selectedMelody = getSelectedBaseMelody();
  const profile = resolveMelodyMetronomeMeterProfile(selectedMelody);
  setMetronomeMeter(profile);
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
      sourceTimeSignature?: string;
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
  loadMusescoreFileFromBytes,
  convertLoadedMidiTrackToImportedMelody,
  convertLoadedMusescoreTrackToImportedMelody,
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

const melodyImportControlsController = createMelodyImportControlsController({
  dom,
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  resetMelodyGpFileInput,
  resetMelodyMidiFileInput,
  melodyImportModalController,
  melodyImportPreviewController,
  savePendingMidiImportedTrack: () => melodyLibraryActionsController.savePendingMidiImportedTrack(),
  savePendingGpImportedTrack: () => melodyLibraryActionsController.savePendingGpImportedTrack(),
  saveFromModal: () => melodyLibraryActionsController.saveFromModal(),
  setResultMessage,
  renderMelodyEditorPreviewError,
  formatUserFacingError,
  showNonBlockingError,
});

function stopPlaybackForTimelineEditing() {
  if (melodyDemoRuntimeController.isActive()) {
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

const resetMelodyTimelineEditingState = () => melodyTimelineEditingOrchestrator.resetState();
const canEditSelectedMelodyOnTimeline = () => melodyTimelineEditingOrchestrator.canEditSelectedMelodyOnTimeline();
const ensureMelodyTimelineEditingDraftLoaded = (melody: MelodyDefinition) =>
  melodyTimelineEditingOrchestrator.ensureDraftLoaded(melody);
const ensureMelodyTimelineEditingSelection = () => melodyTimelineEditingOrchestrator.ensureSelection();
const syncMelodyTimelineEditingState = (_statusText?: string) => melodyTimelineEditingOrchestrator.syncState();
const moveSelectedMelodyTimelineEditingNoteToString = (targetStringName: string, options?: { commit?: boolean }) =>
  melodyTimelineEditingOrchestrator.moveSelectedNoteToString(targetStringName, options);
const addMelodyTimelineEditingNote = () => melodyTimelineEditingOrchestrator.addNote();
const setSelectedMelodyTimelineEditingNoteFinger = (finger: number | null) =>
  melodyTimelineEditingOrchestrator.setSelectedNoteFinger(finger);
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
  getSelectedMelodyId,
  getMelodyById,
  getStoredMelodyStudyRange: (melodyId, totalEvents) => getStoredMelodyStudyRange(melodyId, totalEvents),
  getEnabledStrings,
  isMelodyWorkflowMode,
  setResultMessage,
  setPromptText,
  syncMelodyLoopRangeDisplay: () => syncMelodyLoopRangeDisplay(),
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
  startMelodyMetronomeIfEnabled: (options) => startMelodyMetronomeIfEnabled(options),
  syncMelodyMetronomeRuntime: () => syncMelodyMetronomeRuntime(),
  updateScrollingTabPanelRuntime,
  getPlaybackActionLabel: getPlaybackTransportIdleLabel,
  getPlaybackPromptLabel,
  getPlaybackCompletedLabel,
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
});

function stopMelodyDemoPlayback(options?: { clearUi?: boolean; message?: string }) {
  melodyDemoRuntimeController.stopPlayback(options);
}

function pauseMelodyDemoPlayback() {
  melodyDemoRuntimeController.pausePlayback();
}

async function resumeMelodyDemoPlayback() {
  await melodyDemoRuntimeController.resumePlayback();
}

function seekMelodyTimelineToEvent(eventIndex: number, options?: { commit?: boolean }) {
  melodyDemoRuntimeController.seekToEvent(eventIndex, options);
}

async function stepMelodyPreview(direction: -1 | 1) {
  await melodyDemoRuntimeController.stepPreview(direction);
}

async function startMelodyDemoPlayback() {
  await melodyDemoRuntimeController.startPlayback();
}

function findPlayableStringForNote(note: string): string | null {
  return melodyDemoRuntimeController.findPlayableStringForNote(note);
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
  ].some((element) => !element.classList.contains('hidden'));
}

export function refreshMelodyOptionsForCurrentInstrument() {
  melodyPracticeSettingsController.refreshMelodyOptionsForCurrentInstrument();
  hydrateMelodyTempoForSelectedMelody();
  workflowController.updateMelodyActionButtonsForSelection();
  workflowController.refreshMelodyEmptyState();
}

function finalizeMelodyImportSelection(melodyId: string, successMessage: string) {
  resetMelodyTimelineEditingState();
  refreshMelodyOptionsForCurrentInstrument();
  dom.melodySelector.value = melodyId;
  state.preferredMelodyId = melodyId;
  hydrateMelodyTransposeForSelectedMelody();
  hydrateMelodyStringShiftForSelectedMelody();
  hydrateMelodyStudyRangeForSelectedMelody();
  hydrateMelodyTempoForSelectedMelody();
  melodyDemoRuntimeController.clearPreviewState();
  workflowController.updateMelodyActionButtonsForSelection();
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
  clearPreviewState: () => melodyDemoRuntimeController.clearPreviewState(),
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

const syncMetronomeBpmDisplay = () => metronomeController.syncBpmDisplay();
const getClampedMetronomeBpmFromInput = () => metronomeController.getClampedBpmFromInput();
const resetMetronomeVisualIndicator = () => metronomeController.resetVisualIndicator();

const sessionTransportControlsController = createSessionTransportControlsController({
  dom,
  state,
  isMelodyDemoActive: () => melodyDemoRuntimeController.isActive(),
  stopMelodyDemoPlayback,
  applyUiWorkflow: (workflow) => workflowController.applyUiWorkflow(workflow),
  saveSettings,
  getSelectedMelodyId,
  stopListening,
  startSessionFromUi,
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
  findPlayableStringForNote,
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
  getSelectedMelody: () => getSelectedBaseMelody(),
  syncMelodyDemoBpmDisplay: () => melodyDemoRuntimeController.syncBpmDisplay(),
  syncMetronomeMeterFromSelectedMelody,
  getClampedMetronomeBpmFromInput,
  startMetronome,
  stopMetronome,
  setMetronomeTempo: async (bpm) => {
    await setMetronomeTempo(bpm);
  },
  isMetronomeRunning,
  resetMetronomeVisualIndicator,
  showNonBlockingError,
  formatUserFacingError,
  isMelodyDemoPlaying: () => melodyDemoRuntimeController.isPlaying(),
  isMelodyWorkflowMode,
  isPerformanceStyleMode,
});

const syncMelodyTempoFromMetronomeIfLinked = () =>
  melodyTempoController.syncMelodyTempoFromMetronomeIfLinked();
const hydrateMelodyTempoForSelectedMelody = () => melodyTempoController.hydrateMelodyTempoForSelectedMelody();
const persistSelectedMelodyTempoOverride = () => melodyTempoController.persistSelectedMelodyTempoOverride();
const syncHiddenMetronomeTempoFromSharedTempo = () =>
  melodyTempoController.syncHiddenMetronomeTempoFromSharedTempo();
const syncMetronomeTempoFromMelodyIfLinked = () =>
  melodyTempoController.syncMetronomeTempoFromMelodyIfLinked();
const startMelodyMetronomeIfEnabled = (options?: { alignToPerformanceTimeMs?: number | null }) =>
  melodyTempoController.startMelodyMetronomeIfEnabled(options);
const syncMelodyMetronomeRuntime = () => melodyTempoController.syncMelodyMetronomeRuntime();
const renderMetronomeToggleButton = () => melodyTempoController.renderMetronomeToggleButton();
const syncMelodyTimelineZoomDisplay = () => melodyTempoController.syncMelodyTimelineZoomDisplay();
const syncScrollingTabZoomDisplay = () => melodyTempoController.syncScrollingTabZoomDisplay();

function syncMetronomeVolumeDisplayAndRuntime() {
  const clampedVolumePercent = clampMetronomeVolumePercent(
    Number.parseInt(dom.metronomeVolume.value, 10)
  );
  dom.metronomeVolume.value = String(clampedVolumePercent);
  dom.metronomeVolumeValue.textContent = `${clampedVolumePercent}%`;
  setMetronomeVolume(clampedVolumePercent);
}

const metronomeControlsController = createMetronomeControlsController({
  dom: {
    metronomeToggleBtn: dom.metronomeToggleBtn,
    metronomeEnabled: dom.metronomeEnabled,
    metronomeBpm: dom.metronomeBpm,
    metronomeVolume: dom.metronomeVolume,
  },
  syncHiddenMetronomeTempoFromSharedTempo,
  syncMelodyMetronomeRuntime,
  renderMetronomeToggleButton,
  saveSettings,
  syncMelodyTempoFromMetronomeIfLinked,
  syncMetronomeVolumeDisplayAndRuntime,
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
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi,
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
  stopMelodyDemoPlayback,
  stopListening,
  saveSettings,
  updateMicNoiseGateInfo: () => micSettingsController.updateNoiseGateInfo(),
  refreshMicPerformanceReadinessUi,
  setResultMessage,
});

const updateMicNoiseGateInfo = () => micSettingsController.updateNoiseGateInfo();
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
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  markCurriculumPresetAsCustom,
  resetMelodyTimelineEditingState,
  hydrateMelodyTransposeForSelectedMelody,
  hydrateMelodyStringShiftForSelectedMelody,
  hydrateMelodyStudyRangeForSelectedMelody,
  hydrateMelodyTempoForSelectedMelody,
  syncMetronomeMeterFromSelectedMelody,
  clearMelodyDemoPreviewState: () => melodyDemoRuntimeController.clearPreviewState(),
  updateMelodyActionButtonsForSelection: () => workflowController.updateMelodyActionButtonsForSelection(),
  isMelodyWorkflowMode,
  stopListening,
  setResultMessage,
  updatePracticeSetupSummary,
  saveSettings,
  refreshMelodyTimelineUi,
  refreshLayoutControlsVisibility,
  syncMelodyTimelineZoomDisplay,
  syncScrollingTabZoomDisplay,
  syncMelodyLoopRangeDisplay,
  clampMelodyDemoBpmInput: () => {
    melodyDemoRuntimeController.getClampedBpmFromInput();
  },
  persistSelectedMelodyTempoOverride,
  syncMetronomeTempoFromMelodyIfLinked,
  getSelectedMelodyEventCount: () => {
    const selectedMelodyId = getSelectedMelodyId();
    const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
    return melody?.events.length ?? null;
  },
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
  updateMelodyActionButtonsForSelection: () => workflowController.updateMelodyActionButtonsForSelection(),
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

const melodyPracticeControlsController = createMelodyPracticeControlsController({
  dom,
  state,
  normalizeMelodyTransposeSemitones,
  normalizeMelodyStringShift: (value) => normalizeMelodyStringShift(value, state.currentInstrument),
  handleTransposeInputChange: (value) => melodyPracticeActionsController.handleTransposeInputChange(value),
  handleStringShiftInputChange: (value) => melodyPracticeActionsController.handleStringShiftInputChange(value),
  applyCurrentTransposeToAllCustomMelodies: () =>
    melodyPracticeActionsController.applyCurrentTransposeToAllCustomMelodies(),
  handleStudyRangeChange: (range, options) =>
    melodyPracticeActionsController.handleStudyRangeChange(range, options),
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
});

function resetMelodyGpFileInput() {
  dom.melodyGpFileInput.value = '';
}

function resetMelodyMidiFileInput() {
  dom.melodyMidiFileInput.value = '';
}

const workflowLayoutController = createWorkflowLayoutController({
  dom,
  state,
  setUiWorkflow,
  setPracticeSetupCollapsed,
  setMelodySetupCollapsed,
  setSessionToolsCollapsed,
  setLayoutControlsExpanded,
  syncRecommendedDefaultsUi,
  updatePracticeSetupSummary,
  updateMelodySetupActionButtons: () => melodySetupUiController.updateActionButtons(),
  handleModeChange,
  resetMelodyWorkflowEditorState: () => {
    resetMelodyGpFileInput();
    resetMelodyMidiFileInput();
    melodyImportModalController.close();
    resetMelodyTimelineEditingState();
  },
  getSelectedMelodyId,
  getAvailableMelodyCount: () => listMelodiesForInstrument(state.currentInstrument).length,
});

const workflowController = createWorkflowController({
  dom: {
    melodySelector: dom.melodySelector,
  },
  workflowLayoutController,
  listAvailableMelodyIds: () => listMelodiesForInstrument(state.currentInstrument).map((entry) => entry.id),
});

const workflowLayoutControlsController = createWorkflowLayoutControlsController({
  dom,
  state,
  toggleLayoutControlsExpanded,
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  stopListening,
  applyUiWorkflow: (workflow) => workflowController.applyUiWorkflow(workflow),
  saveSettings,
  setUiMode,
  openMelodyImport: () => dom.openMelodyImportBtn.click(),
  getFirstAvailableMelodyId: () => workflowController.getFirstAvailableMelodyId(),
  selectMelodyById: (melodyId) => workflowController.selectMelodyById(melodyId),
});

const melodyEditingControlsController = createMelodyEditingControlsController({
  dom,
  state,
  maxFret: DEFAULT_TABLATURE_MAX_FRET,
  saveSettings,
  refreshMelodyTimelineUi,
  updateSelectedMelodyEventEditorNotePosition,
  addMelodyEventEditorNote,
  deleteSelectedMelodyEventEditorNote,
  undoMelodyEventEditorMutation,
  redoMelodyEventEditorMutation,
  renderMelodyEventEditorInspector,
  handleTimelineHotkey: (event) => melodyTimelineEditingController.handleHotkey(event),
  syncMelodyTimelineEditingState: () => syncMelodyTimelineEditingState(),
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
  startMelodyDemoPlayback,
  pauseMelodyDemoPlayback,
  resumeMelodyDemoPlayback,
  stopMelodyDemoPlayback,
  stepMelodyPreview,
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
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  stopListening,
  isMelodyWorkflowMode,
  getTrainingMode: () => dom.trainingMode.value,
  exportSelectedMelodyAsMidi: () => melodyLibraryActionsController.exportSelectedMelodyAsMidi(),
  bakeSelectedPracticeAdjustedMelodyAsCustom: () => melodyLibraryActionsController.bakeSelectedPracticeAdjustedMelodyAsCustom(),
  getSelectedMelodyId,
  isCustomMelodyId,
  confirmUserAction,
  deleteCustomMelody,
  refreshMelodyOptionsForCurrentInstrument,
  markCurriculumPresetAsCustom,
  updatePracticeSetupSummary,
  saveSettings,
  setResultMessage,
  showNonBlockingError,
  formatUserFacingError,
});

const practicePresetControlsController = createPracticePresetControlsController({
  dom,
  state,
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi,
  updateMicNoiseGateInfo,
  saveSettings,
});

const practiceSetupControlsController = createPracticeSetupControlsController({
  dom,
  state,
  markCurriculumPresetAsCustom,
  saveSettings,
  redrawFretboard,
  refreshDisplayFormatting,
  setNoteNamingPreference,
  resolveSessionToolsVisibility: (workflow) => workflowController.resolveCurrentWorkflowLayout(workflow).sessionTools,
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  handleModeChange,
  applyUiWorkflowLayout: (workflow) => workflowController.applyUiWorkflowLayout(workflow),
  syncHiddenMetronomeTempoFromSharedTempo,
  syncMelodyMetronomeRuntime,
  updatePracticeSetupSummary,
  refreshMicPerformanceReadinessUi,
  syncMelodyTimelineEditingState,
  setCurriculumPresetInfo,
  applyCurriculumPreset,
  persistSelectedMelodyTempoOverride,
  renderMetronomeToggleButton,
});

const instrumentDisplayControlsController = createInstrumentDisplayControlsController({
  dom,
  state,
  resolveInstrumentById: (instrumentId) => instruments[instrumentId],
  stopMelodyDemoPlayback: ({ clearUi }) => stopMelodyDemoPlayback({ clearUi }),
  markCurriculumPresetAsCustom,
  resetMelodyTimelineEditingState,
  updateInstrumentUI,
  getEnabledStrings: () => Array.from(getEnabledStrings(dom.stringSelector)),
  refreshMelodyOptionsForCurrentInstrument,
  updatePracticeSetupSummary,
  loadInstrumentSoundfont,
  saveSettings,
  refreshMelodyTimelineUi,
  stopListening,
  setResultMessage,
  redrawFretboard,
});

const practicePresetUiController = createPracticePresetUiController({
  dom,
  state,
  hasCompletedOnboarding: () => localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1',
});

function syncPracticePresetUi() {
  practicePresetUiController.syncPracticePresetUi();
}

function syncRecommendedDefaultsUi() {
  practicePresetUiController.syncRecommendedDefaultsUi();
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
  isEditorWorkflowActive: () => state.uiWorkflow === 'editor',
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
  setSelectedNoteFinger: setSelectedMelodyTimelineEditingNoteFinger,
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
  if (state.isListening) return;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  try {
    refreshMelodyTimelineUi();
    await startListening();
  } catch (error) {
    showNonBlockingError(formatUserFacingError('Failed to start session', error));
  }
}

const sessionBootstrapController = createSessionBootstrapController({
  dom,
  state,
  setCurriculumPresetSelection,
  getClampedMetronomeBpmFromInput,
  getClampedMelodyDemoBpmFromInput: () => melodyDemoRuntimeController.getClampedBpmFromInput(),
  syncMelodyLoopRangeDisplay,
  syncMelodyTimelineZoomDisplay,
  syncScrollingTabZoomDisplay,
  syncMetronomeMeterFromSelectedMelody,
  syncHiddenMetronomeTempoFromSharedTempo,
  syncMetronomeBpmDisplay,
  syncMetronomeVolumeDisplayAndRuntime,
  syncMelodyDemoBpmDisplay: () => melodyDemoRuntimeController.syncBpmDisplay(),
  refreshMelodyOptionsForCurrentInstrument,
  setMelodyTimelineStudyRangeCommitHandler,
  getSelectedMelodyId,
  handleStudyRangeCommit: (range) => {
    melodyPracticeActionsController.handleStudyRangeChange(range, {
      stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
    });
  },
  registerMelodyTimelineEditingInteractionHandlers: () =>
    melodyTimelineEditingController.registerInteractionHandlers(),
  setMelodyTimelineSeekHandler,
  seekMelodyTimelineToEvent,
  resetMelodyImportDraft: () => melodyImportModalController.resetDraft(),
  syncMelodyImportModalUi: () => melodyImportModalController.syncUi(),
  renderMelodyDemoButtonState: () => melodyDemoRuntimeController.renderButtonState(),
  resetMetronomeVisualIndicator,
  renderMetronomeToggleButton,
  updateMicNoiseGateInfo,
  refreshMicPolyphonicDetectorAudioInfoUi,
  refreshMicPerformanceReadinessUi,
  syncPracticePresetUi,
  syncMicPolyphonicTelemetryButtonState: () => micPolyphonicTelemetryController.syncButtonState(),
  mountWorkspaceControls: () => workflowLayoutController.mountWorkspaceControls(),
  syncUiWorkflowFromTrainingMode: () => workflowController.syncUiWorkflowFromTrainingMode(),
  applyUiWorkflowLayout: (workflow) => workflowController.applyUiWorkflowLayout(workflow),
  setUiMode,
  updatePracticeSetupSummary,
  syncMelodyTimelineEditingState,
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
  registerMetronomeControls: () => metronomeControlsController.register(),
  registerMetronomeBeatIndicator: () => metronomeController.registerBeatIndicator(),
});
export function registerSessionControls() {
  sessionBootstrapController.initialize();
  registerModalControls();
  registerConfirmControls();
  registerProfileControls();
}


















