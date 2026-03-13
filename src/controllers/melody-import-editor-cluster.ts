import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import type { MidiImportQuantize } from '../midi-file-import';
import { createMelodyEventEditorController } from './melody-event-editor-controller';
import { createMelodyEventEditorBridgeController } from './melody-event-editor-bridge-controller';
import { createMelodyImportModalController } from './melody-import-modal-controller';
import { createMelodyImportPreviewController } from './melody-import-preview-controller';
import {
  createMelodyImportEditorBridgeController,
  type MelodyImportEditorMetadata,
  type MelodyImportPreviewRenderOptions,
} from './melody-import-editor-bridge-controller';
import { createMelodyImportIoController } from './melody-import-io-controller';
import { createMelodyImportWorkspaceController } from './melody-import-workspace-controller';
import { createMelodyLibraryActionsController } from './melody-library-actions-controller';
import { createMelodyImportControlsController } from './melody-import-controls-controller';

type AppDom = typeof import('../dom').dom;
type AppState = typeof import('../state').state;
type CurrentInstrument = AppState['currentInstrument'];

interface PracticeAdjustmentSummary {
  transposeSemitones: number;
  stringShift: number;
}

interface MelodyImportEditorClusterDeps {
  dom: AppDom;
  state: AppState;
  cloneDraft: (events: MelodyEvent[]) => MelodyEvent[];
  formatUserFacingError: (prefix: string, error: unknown) => string;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  getCurrentInstrument: () => CurrentInstrument;
  getSelectedMelodyId: () => string | null;
  getSelectedMelody: () => MelodyDefinition | null;
  setMelodyImportModalVisible: (visible: boolean) => void;
  getSelectedMidiImportQuantize: () => MidiImportQuantize;
  parseAsciiTabToEvents: typeof import('../ascii-tab-melody-parser').parseAsciiTabToMelodyEvents;
  loadGpScoreFromBytes: typeof import('../gp-import').loadGpScoreFromBytes;
  convertLoadedGpScoreTrackToImportedMelody: typeof import('../gp-import').convertLoadedGpScoreTrackToImportedMelody;
  loadMidiFileFromBytes: typeof import('../midi-file-import').loadMidiFileFromBytes;
  loadMusescoreFileFromBytes: typeof import('../musescore-file-import').loadMusescoreFileFromBytes;
  convertLoadedMidiTrackToImportedMelody: typeof import('../midi-file-import').convertLoadedMidiTrackToImportedMelody;
  convertLoadedMusescoreTrackToImportedMelody: typeof import('../musescore-file-import').convertLoadedMusescoreTrackToImportedMelody;
  saveCustomEventMelody: typeof import('../melody-library').saveCustomEventMelody;
  updateCustomEventMelody: typeof import('../melody-library').updateCustomEventMelody;
  saveCustomAsciiTabMelody: typeof import('../melody-library').saveCustomAsciiTabMelody;
  updateCustomAsciiTabMelody: typeof import('../melody-library').updateCustomAsciiTabMelody;
  exportMelodyToMidiBytes: typeof import('../midi-file-export').exportMelodyToMidiBytes;
  buildExportMidiFileName: typeof import('../midi-file-export').buildExportMidiFileName;
  getPracticeAdjustedMelody: (melody: MelodyDefinition) => MelodyDefinition;
  getPracticeAdjustedBakeBpm: (melody: MelodyDefinition) => number | undefined;
  getPracticeAdjustmentSummary: () => PracticeAdjustmentSummary;
  finalizeImportSelection: (melodyId: string, successMessage?: string) => void;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
  showNonBlockingError: (message: string) => void;
}

export function createMelodyImportEditorCluster(deps: MelodyImportEditorClusterDeps) {
  const melodyEventEditorController = createMelodyEventEditorController({
    dom: {
      melodyPreviewStatus: deps.dom.melodyPreviewStatus,
      melodyPreviewSummary: deps.dom.melodyPreviewSummary,
      melodyPreviewList: deps.dom.melodyPreviewList,
      melodyEventEditorPanel: deps.dom.melodyEventEditorPanel,
      melodyEventEditorSelection: deps.dom.melodyEventEditorSelection,
      melodyEventEditorNoteSelector: deps.dom.melodyEventEditorNoteSelector,
      melodyEventEditorString: deps.dom.melodyEventEditorString,
      melodyEventEditorFret: deps.dom.melodyEventEditorFret,
      melodyEventEditorAddBtn: deps.dom.melodyEventEditorAddBtn,
      melodyEventEditorDeleteBtn: deps.dom.melodyEventEditorDeleteBtn,
      melodyEventEditorUndoBtn: deps.dom.melodyEventEditorUndoBtn,
      melodyEventEditorRedoBtn: deps.dom.melodyEventEditorRedoBtn,
    },
    getCurrentInstrument: deps.getCurrentInstrument,
    cloneDraft: deps.cloneDraft,
    formatUserFacingError: deps.formatUserFacingError,
    onStateChange: () => melodyImportWorkspaceController.syncUi(),
  });

  const melodyEventEditorBridgeController = createMelodyEventEditorBridgeController({
    clearPreview: () => melodyEventEditorController.clearPreview(),
    renderPreviewError: (prefix: string, error: unknown) =>
      melodyEventEditorController.renderPreviewError(prefix, error),
    renderPreviewFromEvents: (
      parsedEvents: MelodyEvent[],
      options?: MelodyImportPreviewRenderOptions
    ) => melodyEventEditorController.renderPreviewFromEvents(parsedEvents, options),
    renderInspector: () => melodyEventEditorController.renderInspector(),
    updateSelectedNotePosition: (stringName: string, fretValue: number) =>
      melodyEventEditorController.updateSelectedNotePosition(stringName, fretValue),
    deleteSelectedNote: () => melodyEventEditorController.deleteSelectedNote(),
    addNote: () => melodyEventEditorController.addNote(),
    undo: () => melodyEventEditorController.undo(),
    redo: () => melodyEventEditorController.redo(),
    hasDraft: () => melodyEventEditorController.hasDraft(),
    getDraft: () => melodyEventEditorController.getDraft(),
    getSourceMetadata: () =>
      melodyEventEditorController.getSourceMetadata() as MelodyImportEditorMetadata | null,
  });

  const melodyImportPreviewController = createMelodyImportPreviewController({
    dom: {
      melodyNameInput: deps.dom.melodyNameInput,
      melodyAsciiTabInput: deps.dom.melodyAsciiTabInput,
      melodyGpTrackImportPanel: deps.dom.melodyGpTrackImportPanel,
      melodyGpTrackSelector: deps.dom.melodyGpTrackSelector,
      melodyGpTrackInfo: deps.dom.melodyGpTrackInfo,
      saveMelodyGpTrackBtn: deps.dom.saveMelodyGpTrackBtn,
      melodyMidiTrackImportPanel: deps.dom.melodyMidiTrackImportPanel,
      melodyMidiTrackSelector: deps.dom.melodyMidiTrackSelector,
      melodyMidiQuantize: deps.dom.melodyMidiQuantize,
      melodyMidiTrackInfo: deps.dom.melodyMidiTrackInfo,
      saveMelodyMidiTrackBtn: deps.dom.saveMelodyMidiTrackBtn,
    },
    getCurrentInstrument: deps.getCurrentInstrument,
    getSelectedMidiImportQuantize: deps.getSelectedMidiImportQuantize,
    parseAsciiTabToEvents: deps.parseAsciiTabToEvents,
    loadGpScoreFromBytes: deps.loadGpScoreFromBytes,
    convertLoadedGpScoreTrackToImportedMelody: deps.convertLoadedGpScoreTrackToImportedMelody,
    loadMidiFileFromBytes: deps.loadMidiFileFromBytes,
    loadMusescoreFileFromBytes: deps.loadMusescoreFileFromBytes,
    convertLoadedMidiTrackToImportedMelody: deps.convertLoadedMidiTrackToImportedMelody,
    convertLoadedMusescoreTrackToImportedMelody: deps.convertLoadedMusescoreTrackToImportedMelody,
    renderPreviewFromEvents: (parsedEvents, options) =>
      melodyEventEditorBridgeController.renderPreviewFromEvents(parsedEvents, options),
    renderPreviewError: (prefix, error) =>
      melodyEventEditorBridgeController.renderPreviewError(prefix, error),
    clearPreview: () => melodyEventEditorBridgeController.clearPreview(),
  });

  const melodyImportEditorBridgeController = createMelodyImportEditorBridgeController({
    hasStructuredEventDraft: () => melodyEventEditorBridgeController.hasDraft(),
    resetImportPreviewDraft: () => melodyImportPreviewController.reset(),
    updatePreview: () => melodyImportPreviewController.updatePreview(),
    schedulePreviewUpdate: () => melodyImportPreviewController.schedulePreviewUpdate(),
    loadGpImportDraftFromFile: (file) =>
      melodyImportPreviewController.loadGpImportDraftFromFile(file),
    loadMidiImportDraftFromFile: (file) =>
      melodyImportPreviewController.loadMidiImportDraftFromFile(file),
    refreshMidiTrackPreviewFromSelection: () =>
      melodyImportPreviewController.refreshMidiTrackPreviewFromSelection(),
    hasPendingMidiImport: () => melodyImportPreviewController.hasPendingMidiImport(),
    refreshGpTrackPreviewFromSelection: () =>
      melodyImportPreviewController.refreshGpTrackPreviewFromSelection(),
    resolvePendingGpImportedPreview: () =>
      melodyImportPreviewController.resolvePendingGpImportedPreview(),
    resolvePendingMidiImportedPreview: () =>
      melodyImportPreviewController.resolvePendingMidiImportedPreview(),
    renderStructuredPreview: (parsedEvents, options) =>
      melodyEventEditorBridgeController.renderPreviewFromEvents(parsedEvents, options),
    renderPreviewError: (prefix, error) =>
      melodyEventEditorBridgeController.renderPreviewError(prefix, error),
    clearPreview: () => melodyEventEditorBridgeController.clearPreview(),
    getDraft: () => melodyEventEditorBridgeController.getDraft(),
    getSourceMetadata: () => melodyEventEditorBridgeController.getSourceMetadata(),
  });

  const melodyImportModalController = createMelodyImportModalController({
    dom: {
      melodyNameInput: deps.dom.melodyNameInput,
      melodyAsciiTabInput: deps.dom.melodyAsciiTabInput,
      importMelodyGpBtn: deps.dom.importMelodyGpBtn,
      importMelodyMidiBtn: deps.dom.importMelodyMidiBtn,
      importMelodyBtn: deps.dom.importMelodyBtn,
      melodyImportTitle: deps.dom.melodyImportTitle,
      melodyImportHelpText: deps.dom.melodyImportHelpText,
    },
    state: deps.state,
    hasStructuredEventDraft: () => melodyImportEditorBridgeController.hasStructuredEventDraft(),
    resetImportPreviewDraft: () => melodyImportEditorBridgeController.resetImportPreviewDraft(),
    updatePreview: () => melodyImportEditorBridgeController.updatePreview(),
    renderStructuredPreview: (parsedEvents, options) =>
      melodyImportEditorBridgeController.renderStructuredPreview(parsedEvents, options),
    getSelectedMelodyId: deps.getSelectedMelodyId,
    getSelectedMelody: deps.getSelectedMelody,
    setModalVisible: deps.setMelodyImportModalVisible,
    focusNameInput: (selectText) => {
      deps.dom.melodyNameInput.focus();
      if (selectText) {
        deps.dom.melodyNameInput.select();
      }
    },
    setResultMessage: deps.setResultMessage,
  });

  const melodyImportIoController = createMelodyImportIoController({
    dom: {
      melodyGpFileInput: deps.dom.melodyGpFileInput,
      melodyMidiFileInput: deps.dom.melodyMidiFileInput,
    },
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement('a'),
    appendAnchor: (anchor) => document.body.appendChild(anchor),
    scheduleCleanup: (callback) => {
      window.setTimeout(callback, 0);
    },
  });

  const melodyImportWorkspaceController = createMelodyImportWorkspaceController({
    syncModalUi: () => melodyImportModalController.syncUi(),
    resetImportDraft: () => melodyImportModalController.resetDraft(),
    closeModal: () => melodyImportModalController.close(),
    openModal: (options) => melodyImportModalController.open(options),
    resetImportInputs: () => melodyImportIoController.resetImportInputs(),
  });

  const melodyLibraryActionsController = createMelodyLibraryActionsController({
    getSelectedMelody: deps.getSelectedMelody,
    getCurrentInstrument: deps.getCurrentInstrument,
    getMelodyEditorMode: () => deps.state.melodyEditorMode,
    getEditingMelodyId: () => deps.state.editingMelodyId,
    getMelodyNameInputValue: () => deps.dom.melodyNameInput.value.trim(),
    getAsciiTabInputValue: () => deps.dom.melodyAsciiTabInput.value,
    getEventEditorDraft: () => melodyImportEditorBridgeController.getDraft(),
    getEventEditorMetadata: () => melodyImportEditorBridgeController.getSourceMetadata(),
    resolvePendingGpImportedPreview: () =>
      melodyImportEditorBridgeController.resolvePendingGpImportedPreview(),
    resolvePendingMidiImportedPreview: () =>
      melodyImportEditorBridgeController.resolvePendingMidiImportedPreview(),
    getPracticeAdjustedMelody: deps.getPracticeAdjustedMelody,
    getPracticeAdjustedBakeBpm: deps.getPracticeAdjustedBakeBpm,
    saveCustomEventMelody: deps.saveCustomEventMelody,
    updateCustomEventMelody: deps.updateCustomEventMelody,
    saveCustomAsciiTabMelody: deps.saveCustomAsciiTabMelody,
    updateCustomAsciiTabMelody: deps.updateCustomAsciiTabMelody,
    exportMelodyToMidiBytes: deps.exportMelodyToMidiBytes,
    buildExportMidiFileName: deps.buildExportMidiFileName,
    downloadBytesAsFile: (bytes, fileName, mimeType) =>
      melodyImportIoController.downloadBytesAsFile(bytes, fileName, mimeType),
    getPracticeAdjustmentSummary: deps.getPracticeAdjustmentSummary,
    finalizeImportSelection: (melodyId, successMessage) =>
      deps.finalizeImportSelection(melodyId, successMessage),
  });

  const melodyImportControlsController = createMelodyImportControlsController({
    dom: deps.dom,
    stopMelodyDemoPlayback: deps.stopMelodyDemoPlayback,
    resetMelodyGpFileInput: () => melodyImportIoController.resetGpFileInput(),
    resetMelodyMidiFileInput: () => melodyImportIoController.resetMidiFileInput(),
    melodyImportWorkspaceController,
    melodyImportPreviewController: melodyImportEditorBridgeController,
    savePendingMidiImportedTrack: () =>
      melodyLibraryActionsController.savePendingMidiImportedTrack(),
    savePendingGpImportedTrack: () => melodyLibraryActionsController.savePendingGpImportedTrack(),
    saveFromModal: () => melodyLibraryActionsController.saveFromModal(),
    setResultMessage: deps.setResultMessage,
    renderMelodyEditorPreviewError: (prefix, error) =>
      melodyImportEditorBridgeController.renderPreviewError(prefix, error),
    formatUserFacingError: deps.formatUserFacingError,
    showNonBlockingError: deps.showNonBlockingError,
  });

  return {
    melodyEventEditorBridgeController,
    melodyImportEditorBridgeController,
    melodyImportWorkspaceController,
    melodyLibraryActionsController,
    melodyImportControlsController,
  };
}
