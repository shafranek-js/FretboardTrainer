import type { MelodyDefinition } from '../melody-library';
import type { MelodyStudyRange } from '../melody-study-range';
import type { ChordNote } from '../types';
import { ONBOARDING_COMPLETED_KEY } from '../app-storage-keys';
import { getEnabledStrings } from '../fretboard-ui-state';
import { cloneMelodyEventsDraft as cloneMelodyEventsDraftModel } from '../melody-timeline-editing';
import { clampMelodyPlaybackBpm } from '../melody-timeline-duration';
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
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  isDefaultMelodyStudyRange,
} from '../melody-study-range';
import { normalizeMidiImportQuantize } from '../midi-file-import';
import { buildPromptAudioPlan } from '../prompt-audio-plan';
import {
  getPlaybackCompletedLabel,
  getPlaybackPromptLabel,
  getPlaybackTransportIdleLabel,
} from '../workflow-ui-copy';
import { buildSessionConfigurationGraphDeps } from './session-configuration-graph-deps';
import { createSessionControllerGraphCluster } from './session-controller-graph-cluster';

type AppDom = typeof import('../dom').dom;
type AppState = typeof import('../state').state;
type SessionControllerGraphDeps = Parameters<typeof createSessionControllerGraphCluster>[0];
type SessionConfigurationGraphDeps = Parameters<typeof buildSessionConfigurationGraphDeps>[0];

interface SessionControllerGraphDepsBuilderArgs {
  app: {
    dom: AppDom;
    state: SessionControllerAppState;
  };
  runtime: {
    saveSettings: typeof import('../storage').saveSettings;
    handleModeChange: typeof import('../ui').handleModeChange;
    redrawFretboard: typeof import('../ui').redrawFretboard;
    scheduleMelodyTimelineRenderFromState: typeof import('../ui').scheduleMelodyTimelineRenderFromState;
    updateInstrumentUI: typeof import('../ui').updateInstrumentUI;
    drawFretboard: typeof import('../ui').drawFretboard;
    renderMelodyTabTimelineFromState: typeof import('../ui').renderMelodyTabTimelineFromState;
    playSound: typeof import('../audio').playSound;
    loadInstrumentSoundfont: typeof import('../audio').loadInstrumentSoundfont;
    scheduleSessionTimeout: typeof import('../logic').scheduleSessionTimeout;
    seekActiveMelodySessionToEvent: typeof import('../logic').seekActiveMelodySessionToEvent;
    resetMicPolyphonicDetectorTelemetry: typeof import('../logic').resetMicPolyphonicDetectorTelemetry;
    startListening: typeof import('../logic').startListening;
    stopListening: typeof import('../logic').stopListening;
    ensureAudioRuntime: typeof import('../audio-runtime').ensureAudioRuntime;
    clampMetronomeVolumePercent: typeof import('../metronome').clampMetronomeVolumePercent;
    defaultMetronomeBeatsPerBar: number;
    setMetronomeMeter: typeof import('../metronome').setMetronomeMeter;
    setMetronomeTempo: typeof import('../metronome').setMetronomeTempo;
    setMetronomeVolume: typeof import('../metronome').setMetronomeVolume;
    startMetronome: typeof import('../metronome').startMetronome;
    stopMetronome: typeof import('../metronome').stopMetronome;
    isMetronomeRunning: typeof import('../metronome').isMetronomeRunning;
    subscribeMetronomeBeat: typeof import('../metronome').subscribeMetronomeBeat;
    resolveMelodyMetronomeMeterProfile: typeof import('../melody-meter').resolveMelodyMetronomeMeterProfile;
    setNoteNamingPreference: typeof import('../note-display').setNoteNamingPreference;
    normalizeAudioInputDeviceId: typeof import('../audio-input-devices').normalizeAudioInputDeviceId;
    refreshAudioInputDeviceOptions: typeof import('../audio-input-devices').refreshAudioInputDeviceOptions;
    setPreferredAudioInputDeviceId: typeof import('../audio-input-devices').setPreferredAudioInputDeviceId;
    normalizeInputSource: typeof import('../midi-runtime').normalizeInputSource;
    refreshInputSourceAvailabilityUi: typeof import('../midi-runtime').refreshInputSourceAvailabilityUi;
    refreshMidiInputDevices: typeof import('../midi-runtime').refreshMidiInputDevices;
    setInputSourcePreference: typeof import('../midi-runtime').setInputSourcePreference;
    normalizeMidiInputDeviceId: typeof import('../midi-runtime').normalizeMidiInputDeviceId;
    setPreferredMidiInputDeviceId: typeof import('../midi-runtime').setPreferredMidiInputDeviceId;
    formatUserFacingError: typeof import('../app-feedback').formatUserFacingError;
    showNonBlockingError: typeof import('../app-feedback').showNonBlockingError;
    deleteCustomMelody: typeof import('../melody-library').deleteCustomMelody;
    getMelodyById: typeof import('../melody-library').getMelodyById;
    isCustomMelodyId: typeof import('../melody-library').isCustomMelodyId;
    listMelodiesForInstrument: typeof import('../melody-library').listMelodiesForInstrument;
    saveCustomAsciiTabMelody: typeof import('../melody-library').saveCustomAsciiTabMelody;
    saveCustomEventMelody: typeof import('../melody-library').saveCustomEventMelody;
    updateCustomEventMelody: typeof import('../melody-library').updateCustomEventMelody;
    updateCustomAsciiTabMelody: typeof import('../melody-library').updateCustomAsciiTabMelody;
    confirmUserAction: typeof import('../user-feedback-port').confirmUserAction;
    refreshMicPolyphonicDetectorAudioInfoUi: typeof import('../mic-polyphonic-detector-ui').refreshMicPolyphonicDetectorAudioInfoUi;
    refreshMicPerformanceReadinessUi: typeof import('../mic-performance-readiness-ui').refreshMicPerformanceReadinessUi;
    detectMicPolyphonicFrame: typeof import('../mic-polyphonic-detector').detectMicPolyphonicFrame;
    normalizeMicPolyphonicDetectorProvider: typeof import('../mic-polyphonic-detector').normalizeMicPolyphonicDetectorProvider;
    parseAsciiTabToMelodyEvents: typeof import('../ascii-tab-melody-parser').parseAsciiTabToMelodyEvents;
    convertLoadedGpScoreTrackToImportedMelody: typeof import('../gp-import').convertLoadedGpScoreTrackToImportedMelody;
    loadGpScoreFromBytes: typeof import('../gp-import').loadGpScoreFromBytes;
    convertLoadedMidiTrackToImportedMelody: typeof import('../midi-file-import').convertLoadedMidiTrackToImportedMelody;
    loadMidiFileFromBytes: typeof import('../midi-file-import').loadMidiFileFromBytes;
    convertLoadedMusescoreTrackToImportedMelody: typeof import('../musescore-file-import').convertLoadedMusescoreTrackToImportedMelody;
    loadMusescoreFileFromBytes: typeof import('../musescore-file-import').loadMusescoreFileFromBytes;
    buildExportMidiFileName: typeof import('../midi-file-export').buildExportMidiFileName;
    exportMelodyToMidiBytes: typeof import('../midi-file-export').exportMelodyToMidiBytes;
    isMelodyWorkflowMode: typeof import('../training-mode-groups').isMelodyWorkflowMode;
    isPerformanceStyleMode: typeof import('../training-mode-groups').isPerformanceStyleMode;
    updateScrollingTabPanelRuntime: typeof import('../scrolling-tab-panel').updateScrollingTabPanelRuntime;
  };
  ui: {
    clearResultMessage: () => void;
    refreshDisplayFormatting: () => void;
    setMelodySetupSummary: (text: string) => void;
    setMelodySetupCollapsed: (collapsed: boolean) => void;
    setPracticeSetupCollapsed: (collapsed: boolean) => void;
    setPracticeSetupSummary: (text: string) => void;
    setSessionToolsCollapsed: (collapsed: boolean) => void;
    setSessionToolsSummary: (text: string) => void;
    setModalVisible: (modal: Parameters<typeof import('../ui-signals').setModalVisible>[0], visible: boolean) => void;
    setPromptText: (text: string) => void;
    refreshLayoutControlsVisibility: () => void;
    setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
    setUiMode: (mode: Parameters<typeof import('../ui-signals').setUiMode>[0]) => void;
    setUiWorkflow: (workflow: Parameters<typeof import('../ui-signals').setUiWorkflow>[0]) => void;
    setLayoutControlsExpanded: (expanded: boolean) => void;
    toggleLayoutControlsExpanded: () => void;
  };
  controllerBridges: {
    getSelectedMelody: () => MelodyDefinition | null;
    getStoredMelodyStudyRange: (melodyId: string, totalEvents: number) => MelodyStudyRange;
    syncMetronomeMeterFromSelectedMelody: () => void;
    syncMelodyDemoBpmDisplay: () => void;
    isMelodyDemoPlaying: () => boolean;
    getClampedMetronomeBpmFromInput: () => number;
    stopMelodyDemoPlayback: (options: { clearUi: boolean; message?: string }) => void;
    updateMicNoiseGateInfo: () => void;
  };
}

type SessionControllerRuntimeDeps = SessionControllerGraphDepsBuilderArgs['runtime'];
type SessionControllerUiDeps = SessionControllerGraphDepsBuilderArgs['ui'];
type SessionControllerBridgeDeps = SessionControllerGraphDepsBuilderArgs['controllerBridges'];

type SessionControllerImportEditorState = Pick<
  AppState,
  | 'currentInstrument'
  | 'editingMelodyId'
  | 'melodyEditorMode'
  | 'melodyStringShift'
  | 'melodyTransposeSemitones'
>;
type SessionControllerMelodyTimelineEditingState = Pick<
  AppState,
  | 'currentInstrument'
  | 'melodyTimelineSelectedEventIndex'
  | 'melodyTimelineSelectedNoteIndex'
  | 'melodyTransposeSemitones'
  | 'melodyStringShift'
  | 'uiWorkflow'
>;
type SessionControllerSelectedMelodyContextState =
  SessionControllerGraphDeps['melodyRuntime']['melodySettings']['selectedMelodyContext']['state'];
type SessionControllerMelodyPracticeSettingsState =
  SessionControllerGraphDeps['melodyRuntime']['melodySettings']['melodyPracticeSettings']['state'];
type SessionControllerRuntimeUiState = Pick<
  AppState,
  | 'isListening'
  | 'melodyTimelinePreviewIndex'
  | 'melodyTimelinePreviewLabel'
>;
type SessionControllerMelodyDemoRuntimeState =
  SessionControllerGraphDeps['melodyRuntime']['melodyDemo']['melodyDemoRuntime']['state'];
type SessionControllerSessionTransportControlsState =
  SessionControllerGraphDeps['melodyRuntime']['melodyDemo']['sessionTransportControls']['state'];
type SessionControllerMelodyDemoState =
  SessionControllerMelodyDemoRuntimeState & SessionControllerSessionTransportControlsState;
type SessionControllerMelodyRuntimeState =
  SessionControllerSelectedMelodyContextState &
  SessionControllerMelodyPracticeSettingsState &
  SessionControllerMelodyTimelineEditingState &
  SessionControllerRuntimeUiState &
  SessionControllerMelodyDemoState;
type SessionControllerMelodySettingsContextState =
  SessionControllerSelectedMelodyContextState & SessionControllerMelodyPracticeSettingsState;
type SessionControllerConfigurationState = SessionConfigurationGraphDeps['app']['state'];
type SessionControllerWorkspaceConfigurationState = Pick<
  SessionControllerConfigurationState,
  | 'currentInstrument'
  | 'melodyStudyRangeEndIndex'
  | 'melodyStudyRangeStartIndex'
  | 'melodyTransposeSemitones'
>;
type SessionControllerInputControlsConfigurationState = Pick<
  SessionControllerConfigurationState,
  | 'analyser'
  | 'audioContext'
>;
type SessionControllerAppState =
  SessionConfigurationGraphDeps['app']['state'] &
  SessionControllerImportEditorState &
  SessionControllerMelodyTimelineEditingState &
  SessionControllerSelectedMelodyContextState &
  SessionControllerMelodyPracticeSettingsState &
  SessionControllerRuntimeUiState &
  SessionControllerMelodyDemoState;

type SessionControllerGraphDepsBuilderContext = {
  dom: AppDom;
  state: SessionControllerAppState;
  runtime: SessionControllerRuntimeDeps;
  ui: SessionControllerUiDeps;
  controllerBridges: SessionControllerBridgeDeps;
};

type MelodyRuntimeBuilderContext = ReturnType<typeof createMelodyRuntimeContext>;
type ImportEditorBuilderContext = ReturnType<typeof createImportEditorContext>;
type ConfigurationBuilderContext = ReturnType<typeof createConfigurationContext>;
type WorkspaceConfigurationBuilderContext = ReturnType<typeof createWorkspaceConfigurationContext>;
type MetronomeConfigurationBuilderContext = ReturnType<typeof createMetronomeConfigurationContext>;
type CurriculumPresetConfigurationBuilderContext =
  ReturnType<typeof createCurriculumPresetConfigurationContext>;
type InputControlsConfigurationBuilderContext = ReturnType<typeof createInputControlsConfigurationContext>;
type MelodySettingsBuilderContext = ReturnType<typeof createMelodySettingsContext>;
type MelodyTimelineEditingBuilderContext = ReturnType<typeof createMelodyTimelineEditingContext>;
type RuntimeUiBuilderContext = ReturnType<typeof createRuntimeUiContext>;
type MelodyDemoBuilderContext = ReturnType<typeof createMelodyDemoContext>;

function createBuilderContext(
  args: SessionControllerGraphDepsBuilderArgs
): SessionControllerGraphDepsBuilderContext {
  return {
    dom: args.app.dom,
    state: args.app.state,
    runtime: args.runtime,
    ui: args.ui,
    controllerBridges: args.controllerBridges,
  };
}

function createMelodyRuntimeState(
  state: SessionControllerAppState
): SessionControllerMelodyRuntimeState {
  return state;
}

function createMelodySettingsContextState(
  state: SessionControllerMelodyRuntimeState
): SessionControllerMelodySettingsContextState {
  return state;
}

function createMelodyDemoContextState(
  state: SessionControllerMelodyRuntimeState
): SessionControllerMelodyDemoState {
  return state;
}

function createConfigurationState(
  state: SessionControllerAppState
): SessionControllerConfigurationState {
  return state;
}

function createWorkspaceConfigurationState(
  state: SessionControllerConfigurationState
): SessionControllerWorkspaceConfigurationState {
  return state;
}

function createInputControlsConfigurationState(
  state: SessionControllerConfigurationState
): SessionControllerInputControlsConfigurationState {
  return state;
}

function createMelodyRuntimeContext(context: SessionControllerGraphDepsBuilderContext) {
  const { dom, state, runtime, ui, controllerBridges } = context;

  return {
    dom,
    state: createMelodyRuntimeState(state),
    runtime: {
      getMelodyById: runtime.getMelodyById,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      defaultMetronomeBeatsPerBar: runtime.defaultMetronomeBeatsPerBar,
      resolveMelodyMetronomeMeterProfile: runtime.resolveMelodyMetronomeMeterProfile,
      setMetronomeMeter: runtime.setMetronomeMeter,
      updateCustomEventMelody: runtime.updateCustomEventMelody,
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
      redrawFretboard: runtime.redrawFretboard,
      stopListening: runtime.stopListening,
      startListening: runtime.startListening,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
      scheduleMelodyTimelineRenderFromState: runtime.scheduleMelodyTimelineRenderFromState,
      drawFretboard: runtime.drawFretboard,
      playSound: runtime.playSound,
      loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
      seekActiveMelodySessionToEvent: runtime.seekActiveMelodySessionToEvent,
      updateScrollingTabPanelRuntime: runtime.updateScrollingTabPanelRuntime,
      saveSettings: runtime.saveSettings,
      scheduleSessionTimeout: runtime.scheduleSessionTimeout,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
      setPromptText: ui.setPromptText,
      clearResultMessage: ui.clearResultMessage,
    },
    controllerBridges: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
    },
  };
}

function createImportEditorContext(context: SessionControllerGraphDepsBuilderContext) {
  const { dom, state, runtime, ui } = context;

  return {
    dom,
    state: createImportEditorState(state),
    runtime: {
      formatUserFacingError: runtime.formatUserFacingError,
      parseAsciiTabToMelodyEvents: runtime.parseAsciiTabToMelodyEvents,
      loadGpScoreFromBytes: runtime.loadGpScoreFromBytes,
      convertLoadedGpScoreTrackToImportedMelody: runtime.convertLoadedGpScoreTrackToImportedMelody,
      loadMidiFileFromBytes: runtime.loadMidiFileFromBytes,
      loadMusescoreFileFromBytes: runtime.loadMusescoreFileFromBytes,
      convertLoadedMidiTrackToImportedMelody: runtime.convertLoadedMidiTrackToImportedMelody,
      convertLoadedMusescoreTrackToImportedMelody: runtime.convertLoadedMusescoreTrackToImportedMelody,
      saveCustomEventMelody: runtime.saveCustomEventMelody,
      updateCustomEventMelody: runtime.updateCustomEventMelody,
      saveCustomAsciiTabMelody: runtime.saveCustomAsciiTabMelody,
      updateCustomAsciiTabMelody: runtime.updateCustomAsciiTabMelody,
      exportMelodyToMidiBytes: runtime.exportMelodyToMidiBytes,
      buildExportMidiFileName: runtime.buildExportMidiFileName,
      showNonBlockingError: runtime.showNonBlockingError,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
      setModalVisible: ui.setModalVisible,
    },
  };
}

function createImportEditorState(
  state: SessionControllerAppState
): SessionControllerImportEditorState {
  const importEditorState = {} as SessionControllerImportEditorState;

  Object.defineProperties(importEditorState, {
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
    },
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
    },
    melodyStringShift: {
      enumerable: true,
      get: () => state.melodyStringShift,
    },
    melodyEditorMode: {
      enumerable: true,
      get: () => state.melodyEditorMode,
      set: (value: SessionControllerImportEditorState['melodyEditorMode']) => {
        state.melodyEditorMode = value;
      },
    },
    editingMelodyId: {
      enumerable: true,
      get: () => state.editingMelodyId,
      set: (value: SessionControllerImportEditorState['editingMelodyId']) => {
        state.editingMelodyId = value;
      },
    },
  });

  return importEditorState;
}

function createMelodyTimelineEditingState(
  state: SessionControllerMelodyTimelineEditingState
): SessionControllerMelodyTimelineEditingState {
  const melodyTimelineEditingState = {} as SessionControllerMelodyTimelineEditingState;

  Object.defineProperties(melodyTimelineEditingState, {
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
    },
    melodyTimelineSelectedEventIndex: {
      enumerable: true,
      get: () => state.melodyTimelineSelectedEventIndex,
      set: (value: SessionControllerMelodyTimelineEditingState['melodyTimelineSelectedEventIndex']) => {
        state.melodyTimelineSelectedEventIndex = value;
      },
    },
    melodyTimelineSelectedNoteIndex: {
      enumerable: true,
      get: () => state.melodyTimelineSelectedNoteIndex,
      set: (value: SessionControllerMelodyTimelineEditingState['melodyTimelineSelectedNoteIndex']) => {
        state.melodyTimelineSelectedNoteIndex = value;
      },
    },
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
    },
    melodyStringShift: {
      enumerable: true,
      get: () => state.melodyStringShift,
    },
    uiWorkflow: {
      enumerable: true,
      get: () => state.uiWorkflow,
    },
  });

  return melodyTimelineEditingState;
}

function createRuntimeUiState(
  state: SessionControllerRuntimeUiState
): SessionControllerRuntimeUiState {
  const runtimeUiState = {} as SessionControllerRuntimeUiState;

  Object.defineProperties(runtimeUiState, {
    isListening: {
      enumerable: true,
      get: () => state.isListening,
    },
    melodyTimelinePreviewIndex: {
      enumerable: true,
      get: () => state.melodyTimelinePreviewIndex,
      set: (value: SessionControllerRuntimeUiState['melodyTimelinePreviewIndex']) => {
        state.melodyTimelinePreviewIndex = value;
      },
    },
    melodyTimelinePreviewLabel: {
      enumerable: true,
      get: () => state.melodyTimelinePreviewLabel,
      set: (value: SessionControllerRuntimeUiState['melodyTimelinePreviewLabel']) => {
        state.melodyTimelinePreviewLabel = value;
      },
    },
  });

  return runtimeUiState;
}

function createSelectedMelodyContextState(
  state: SessionControllerSelectedMelodyContextState
): SessionControllerSelectedMelodyContextState {
  const selectedMelodyContextState = {} as SessionControllerSelectedMelodyContextState;

  Object.defineProperties(selectedMelodyContextState, {
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
    },
  });

  return selectedMelodyContextState;
}

function createMelodyPracticeSettingsState(
  state: SessionControllerMelodyPracticeSettingsState
): SessionControllerMelodyPracticeSettingsState {
  const melodyPracticeSettingsState = {} as SessionControllerMelodyPracticeSettingsState;

  Object.defineProperties(melodyPracticeSettingsState, {
    preferredMelodyId: {
      enumerable: true,
      get: () => state.preferredMelodyId,
      set: (value: SessionControllerMelodyPracticeSettingsState['preferredMelodyId']) => {
        state.preferredMelodyId = value;
      },
    },
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
    },
    melodyTransposeById: {
      enumerable: true,
      get: () => state.melodyTransposeById,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyTransposeById']) => {
        state.melodyTransposeById = value;
      },
    },
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyTransposeSemitones']) => {
        state.melodyTransposeSemitones = value;
      },
    },
    melodyStringShiftById: {
      enumerable: true,
      get: () => state.melodyStringShiftById,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyStringShiftById']) => {
        state.melodyStringShiftById = value;
      },
    },
    melodyStringShift: {
      enumerable: true,
      get: () => state.melodyStringShift,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyStringShift']) => {
        state.melodyStringShift = value;
      },
    },
    melodyStudyRangeById: {
      enumerable: true,
      get: () => state.melodyStudyRangeById,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyStudyRangeById']) => {
        state.melodyStudyRangeById = value;
      },
    },
    melodyStudyRangeStartIndex: {
      enumerable: true,
      get: () => state.melodyStudyRangeStartIndex,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyStudyRangeStartIndex']) => {
        state.melodyStudyRangeStartIndex = value;
      },
    },
    melodyStudyRangeEndIndex: {
      enumerable: true,
      get: () => state.melodyStudyRangeEndIndex,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyStudyRangeEndIndex']) => {
        state.melodyStudyRangeEndIndex = value;
      },
    },
    melodyLoopRangeEnabled: {
      enumerable: true,
      get: () => state.melodyLoopRangeEnabled,
      set: (value: SessionControllerMelodyPracticeSettingsState['melodyLoopRangeEnabled']) => {
        state.melodyLoopRangeEnabled = value;
      },
    },
  });

  return melodyPracticeSettingsState;
}

function createConfigurationContext(context: SessionControllerGraphDepsBuilderContext) {
  const { dom, state, runtime, ui, controllerBridges } = context;

  return {
    dom,
    state: createConfigurationState(state),
    runtime: {
      saveSettings: runtime.saveSettings,
      handleModeChange: runtime.handleModeChange,
      stopListening: runtime.stopListening,
      redrawFretboard: runtime.redrawFretboard,
      updateInstrumentUI: runtime.updateInstrumentUI,
      loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
      refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
      setNoteNamingPreference: runtime.setNoteNamingPreference,
      listMelodiesForInstrument: runtime.listMelodiesForInstrument,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      isCustomMelodyId: runtime.isCustomMelodyId,
      confirmUserAction: runtime.confirmUserAction,
      startMetronome: runtime.startMetronome,
      stopMetronome: runtime.stopMetronome,
      setMetronomeTempo: runtime.setMetronomeTempo,
      subscribeMetronomeBeat: runtime.subscribeMetronomeBeat,
      formatUserFacingError: runtime.formatUserFacingError,
      showNonBlockingError: runtime.showNonBlockingError,
      isMetronomeRunning: runtime.isMetronomeRunning,
      isPerformanceStyleMode: runtime.isPerformanceStyleMode,
      clampMetronomeVolumePercent: runtime.clampMetronomeVolumePercent,
      setMetronomeVolume: runtime.setMetronomeVolume,
      ensureAudioRuntime: runtime.ensureAudioRuntime,
      refreshAudioInputDeviceOptions: runtime.refreshAudioInputDeviceOptions,
      refreshMicPolyphonicDetectorAudioInfoUi: runtime.refreshMicPolyphonicDetectorAudioInfoUi,
      normalizeAudioInputDeviceId: runtime.normalizeAudioInputDeviceId,
      setPreferredAudioInputDeviceId: runtime.setPreferredAudioInputDeviceId,
      normalizeInputSource: runtime.normalizeInputSource,
      setInputSourcePreference: runtime.setInputSourcePreference,
      refreshMidiInputDevices: runtime.refreshMidiInputDevices,
      normalizeMidiInputDeviceId: runtime.normalizeMidiInputDeviceId,
      setPreferredMidiInputDeviceId: runtime.setPreferredMidiInputDeviceId,
      detectMicPolyphonicFrame: runtime.detectMicPolyphonicFrame,
      normalizeMicPolyphonicDetectorProvider: runtime.normalizeMicPolyphonicDetectorProvider,
      resetMicPolyphonicDetectorTelemetry: runtime.resetMicPolyphonicDetectorTelemetry,
    },
    ui: {
      setPracticeSetupSummary: ui.setPracticeSetupSummary,
      setSessionToolsSummary: ui.setSessionToolsSummary,
      setMelodySetupSummary: ui.setMelodySetupSummary,
      setPracticeSetupCollapsed: ui.setPracticeSetupCollapsed,
      setMelodySetupCollapsed: ui.setMelodySetupCollapsed,
      setSessionToolsCollapsed: ui.setSessionToolsCollapsed,
      setLayoutControlsExpanded: ui.setLayoutControlsExpanded,
      toggleLayoutControlsExpanded: ui.toggleLayoutControlsExpanded,
      setUiWorkflow: ui.setUiWorkflow,
      setUiMode: ui.setUiMode,
      setResultMessage: ui.setResultMessage,
      refreshDisplayFormatting: ui.refreshDisplayFormatting,
      refreshLayoutControlsVisibility: ui.refreshLayoutControlsVisibility,
    },
    controllerBridges: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
      getStoredMelodyStudyRange: controllerBridges.getStoredMelodyStudyRange,
      syncMelodyDemoBpmDisplay: controllerBridges.syncMelodyDemoBpmDisplay,
      syncMetronomeMeterFromSelectedMelody: controllerBridges.syncMetronomeMeterFromSelectedMelody,
      isMelodyDemoPlaying: controllerBridges.isMelodyDemoPlaying,
      getClampedMetronomeBpmFromInput: controllerBridges.getClampedMetronomeBpmFromInput,
      stopMelodyDemoPlayback: controllerBridges.stopMelodyDemoPlayback,
      updateMicNoiseGateInfo: controllerBridges.updateMicNoiseGateInfo,
    },
  };
}

function createWorkspaceConfigurationContext(context: ConfigurationBuilderContext) {
  const { dom, state, runtime, ui, controllerBridges } = context;

  return {
    dom,
    state: createWorkspaceConfigurationState(state),
    runtime: {
      saveSettings: runtime.saveSettings,
      handleModeChange: runtime.handleModeChange,
      stopListening: runtime.stopListening,
      redrawFretboard: runtime.redrawFretboard,
      updateInstrumentUI: runtime.updateInstrumentUI,
      loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
      refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
      setNoteNamingPreference: runtime.setNoteNamingPreference,
      listMelodiesForInstrument: runtime.listMelodiesForInstrument,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      isCustomMelodyId: runtime.isCustomMelodyId,
      confirmUserAction: runtime.confirmUserAction,
    },
    ui: {
      setPracticeSetupSummary: ui.setPracticeSetupSummary,
      setSessionToolsSummary: ui.setSessionToolsSummary,
      setMelodySetupSummary: ui.setMelodySetupSummary,
      setPracticeSetupCollapsed: ui.setPracticeSetupCollapsed,
      setMelodySetupCollapsed: ui.setMelodySetupCollapsed,
      setSessionToolsCollapsed: ui.setSessionToolsCollapsed,
      setLayoutControlsExpanded: ui.setLayoutControlsExpanded,
      toggleLayoutControlsExpanded: ui.toggleLayoutControlsExpanded,
      setUiWorkflow: ui.setUiWorkflow,
      setUiMode: ui.setUiMode,
      setResultMessage: ui.setResultMessage,
      refreshDisplayFormatting: ui.refreshDisplayFormatting,
      refreshLayoutControlsVisibility: ui.refreshLayoutControlsVisibility,
    },
    controllerBridges: {
      getStoredMelodyStudyRange: controllerBridges.getStoredMelodyStudyRange,
    },
  };
}

function createMetronomeConfigurationContext(context: ConfigurationBuilderContext) {
  const { runtime, controllerBridges } = context;

  return {
    runtime: {
      saveSettings: runtime.saveSettings,
      startMetronome: runtime.startMetronome,
      stopMetronome: runtime.stopMetronome,
      setMetronomeTempo: runtime.setMetronomeTempo,
      subscribeMetronomeBeat: runtime.subscribeMetronomeBeat,
      formatUserFacingError: runtime.formatUserFacingError,
      showNonBlockingError: runtime.showNonBlockingError,
      isMetronomeRunning: runtime.isMetronomeRunning,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      isPerformanceStyleMode: runtime.isPerformanceStyleMode,
      clampMetronomeVolumePercent: runtime.clampMetronomeVolumePercent,
      setMetronomeVolume: runtime.setMetronomeVolume,
    },
    controllerBridges: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
      syncMelodyDemoBpmDisplay: controllerBridges.syncMelodyDemoBpmDisplay,
      syncMetronomeMeterFromSelectedMelody: controllerBridges.syncMetronomeMeterFromSelectedMelody,
      isMelodyDemoPlaying: controllerBridges.isMelodyDemoPlaying,
    },
  };
}

function createCurriculumPresetConfigurationContext(context: ConfigurationBuilderContext) {
  const { runtime, ui, controllerBridges } = context;

  return {
    runtime: {
      handleModeChange: runtime.handleModeChange,
      redrawFretboard: runtime.redrawFretboard,
      saveSettings: runtime.saveSettings,
      stopListening: runtime.stopListening,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
    },
    controllerBridges: {
      getClampedMetronomeBpmFromInput: controllerBridges.getClampedMetronomeBpmFromInput,
    },
  };
}

function createInputControlsConfigurationContext(context: ConfigurationBuilderContext) {
  const { state, runtime, ui, controllerBridges } = context;

  return {
    state: createInputControlsConfigurationState(state),
    runtime: {
      ensureAudioRuntime: runtime.ensureAudioRuntime,
      refreshAudioInputDeviceOptions: runtime.refreshAudioInputDeviceOptions,
      refreshMicPolyphonicDetectorAudioInfoUi: runtime.refreshMicPolyphonicDetectorAudioInfoUi,
      refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
      saveSettings: runtime.saveSettings,
      formatUserFacingError: runtime.formatUserFacingError,
      showNonBlockingError: runtime.showNonBlockingError,
      normalizeAudioInputDeviceId: runtime.normalizeAudioInputDeviceId,
      setPreferredAudioInputDeviceId: runtime.setPreferredAudioInputDeviceId,
      normalizeInputSource: runtime.normalizeInputSource,
      setInputSourcePreference: runtime.setInputSourcePreference,
      refreshMidiInputDevices: runtime.refreshMidiInputDevices,
      normalizeMidiInputDeviceId: runtime.normalizeMidiInputDeviceId,
      setPreferredMidiInputDeviceId: runtime.setPreferredMidiInputDeviceId,
      stopListening: runtime.stopListening,
      detectMicPolyphonicFrame: runtime.detectMicPolyphonicFrame,
      normalizeMicPolyphonicDetectorProvider: runtime.normalizeMicPolyphonicDetectorProvider,
      resetMicPolyphonicDetectorTelemetry: runtime.resetMicPolyphonicDetectorTelemetry,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
    },
    controllerBridges: {
      stopMelodyDemoPlayback: controllerBridges.stopMelodyDemoPlayback,
      updateMicNoiseGateInfo: controllerBridges.updateMicNoiseGateInfo,
    },
  };
}

function getEnabledStringSet(dom: AppDom) {
  return getEnabledStrings(dom.stringSelector);
}

function listMelodiesForCurrentInstrument(
  runtime: Pick<SessionControllerRuntimeDeps, 'listMelodiesForInstrument'>,
  state: Pick<SessionControllerWorkspaceConfigurationState, 'currentInstrument'>
) {
  return runtime.listMelodiesForInstrument(state.currentInstrument);
}

function createMelodySettingsContext(context: MelodyRuntimeBuilderContext) {
  const { dom, state, runtime } = context;

  return {
    dom: {
      melodySelector: dom.melodySelector,
      trainingMode: dom.trainingMode,
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
    state: createMelodySettingsContextState(state),
    runtime: {
      getMelodyById: runtime.getMelodyById,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      defaultMetronomeBeatsPerBar: runtime.defaultMetronomeBeatsPerBar,
      resolveMelodyMetronomeMeterProfile: runtime.resolveMelodyMetronomeMeterProfile,
      setMetronomeMeter: runtime.setMetronomeMeter,
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
    },
  };
}

function createMelodyTimelineEditingContext(context: MelodyRuntimeBuilderContext) {
  const { dom, state, runtime, controllerBridges } = context;

  return {
    dom: {
      trainingMode: dom.trainingMode,
    },
    state: createMelodyTimelineEditingState(state),
    runtime: {
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      updateCustomEventMelody: runtime.updateCustomEventMelody,
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
      redrawFretboard: runtime.redrawFretboard,
    },
    controllerBridges: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
    },
  };
}

function createRuntimeUiContext(context: MelodyRuntimeBuilderContext) {
  const { dom, state, runtime, ui } = context;

  return {
    dom: {
      settingsModal: dom.settingsModal,
      userDataModal: dom.userDataModal,
      helpModal: dom.helpModal,
      quickHelpModal: dom.quickHelpModal,
      sessionSummaryModal: dom.sessionSummaryModal,
      statsModal: dom.statsModal,
      guideModal: dom.guideModal,
      linksModal: dom.linksModal,
      profileNameModal: dom.profileNameModal,
      melodyImportModal: dom.melodyImportModal,
      confirmModal: dom.confirmModal,
      calibrationModal: dom.calibrationModal,
    },
    state: createRuntimeUiState(state),
    runtime: {
      renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
      stopListening: runtime.stopListening,
      startListening: runtime.startListening,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
    },
  };
}

function createMelodyDemoContext(context: MelodyRuntimeBuilderContext) {
  const { dom, state, runtime, ui } = context;

  return {
    dom,
    state: createMelodyDemoContextState(state),
    runtime: {
      getMelodyById: runtime.getMelodyById,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
      scheduleMelodyTimelineRenderFromState: runtime.scheduleMelodyTimelineRenderFromState,
      drawFretboard: runtime.drawFretboard,
      redrawFretboard: runtime.redrawFretboard,
      playSound: runtime.playSound,
      loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
      stopListening: runtime.stopListening,
      seekActiveMelodySessionToEvent: runtime.seekActiveMelodySessionToEvent,
      updateScrollingTabPanelRuntime: runtime.updateScrollingTabPanelRuntime,
      saveSettings: runtime.saveSettings,
      scheduleSessionTimeout: runtime.scheduleSessionTimeout,
    },
    ui: {
      setResultMessage: ui.setResultMessage,
      setPromptText: ui.setPromptText,
      clearResultMessage: ui.clearResultMessage,
    },
  };
}

function createMelodyDemoState(
  state: SessionControllerMelodyDemoState
): SessionControllerMelodyDemoState {
  const melodyDemoState = {} as SessionControllerMelodyDemoState;

  Object.defineProperties(melodyDemoState, {
    uiWorkflow: { enumerable: true, get: () => state.uiWorkflow },
    currentInstrument: { enumerable: true, get: () => state.currentInstrument },
    melodyTransposeSemitones: { enumerable: true, get: () => state.melodyTransposeSemitones },
    melodyStringShift: { enumerable: true, get: () => state.melodyStringShift },
    melodyLoopRangeEnabled: {
      enumerable: true,
      get: () => state.melodyLoopRangeEnabled,
      set: (value: SessionControllerMelodyDemoState['melodyLoopRangeEnabled']) => {
        state.melodyLoopRangeEnabled = value;
      },
    },
    isListening: { enumerable: true, get: () => state.isListening },
    currentMelodyId: {
      enumerable: true,
      get: () => state.currentMelodyId,
      set: (value: SessionControllerMelodyDemoState['currentMelodyId']) => {
        state.currentMelodyId = value;
      },
    },
    currentMelodyEventIndex: {
      enumerable: true,
      get: () => state.currentMelodyEventIndex,
      set: (value: SessionControllerMelodyDemoState['currentMelodyEventIndex']) => {
        state.currentMelodyEventIndex = value;
      },
    },
    performanceActiveEventIndex: {
      enumerable: true,
      get: () => state.performanceActiveEventIndex,
      set: (value: SessionControllerMelodyDemoState['performanceActiveEventIndex']) => {
        state.performanceActiveEventIndex = value;
      },
    },
    melodyTimelinePreviewIndex: {
      enumerable: true,
      get: () => state.melodyTimelinePreviewIndex,
      set: (value: SessionControllerMelodyDemoState['melodyTimelinePreviewIndex']) => {
        state.melodyTimelinePreviewIndex = value;
      },
    },
    melodyTimelinePreviewLabel: {
      enumerable: true,
      get: () => state.melodyTimelinePreviewLabel,
      set: (value: SessionControllerMelodyDemoState['melodyTimelinePreviewLabel']) => {
        state.melodyTimelinePreviewLabel = value;
      },
    },
    melodyDemoRuntimeActive: {
      enumerable: true,
      get: () => state.melodyDemoRuntimeActive,
      set: (value: SessionControllerMelodyDemoState['melodyDemoRuntimeActive']) => {
        state.melodyDemoRuntimeActive = value;
      },
    },
    melodyDemoRuntimePaused: {
      enumerable: true,
      get: () => state.melodyDemoRuntimePaused,
      set: (value: SessionControllerMelodyDemoState['melodyDemoRuntimePaused']) => {
        state.melodyDemoRuntimePaused = value;
      },
    },
    melodyDemoRuntimeBaseTimeSec: {
      enumerable: true,
      get: () => state.melodyDemoRuntimeBaseTimeSec,
      set: (value: SessionControllerMelodyDemoState['melodyDemoRuntimeBaseTimeSec']) => {
        state.melodyDemoRuntimeBaseTimeSec = value;
      },
    },
    melodyDemoRuntimeAnchorStartedAtMs: {
      enumerable: true,
      get: () => state.melodyDemoRuntimeAnchorStartedAtMs,
      set: (value: SessionControllerMelodyDemoState['melodyDemoRuntimeAnchorStartedAtMs']) => {
        state.melodyDemoRuntimeAnchorStartedAtMs = value;
      },
    },
    melodyDemoRuntimePausedOffsetSec: {
      enumerable: true,
      get: () => state.melodyDemoRuntimePausedOffsetSec,
      set: (value: SessionControllerMelodyDemoState['melodyDemoRuntimePausedOffsetSec']) => {
        state.melodyDemoRuntimePausedOffsetSec = value;
      },
    },
    melodyFingeringStrategy: { enumerable: true, get: () => state.melodyFingeringStrategy },
    melodyFingeringLevel: { enumerable: true, get: () => state.melodyFingeringLevel },
    calibratedA4: { enumerable: true, get: () => state.calibratedA4 },
    audioContext: { enumerable: true, get: () => state.audioContext },
    currentPrompt: { enumerable: true, get: () => state.currentPrompt },
    cooldown: {
      enumerable: true,
      get: () => state.cooldown,
      set: (value: SessionControllerMelodyDemoState['cooldown']) => {
        state.cooldown = value;
      },
    },
  });

  return melodyDemoState;
}

function buildMelodySettingsDeps(
  context: MelodySettingsBuilderContext
): SessionControllerGraphDeps['melodyRuntime']['melodySettings'] {
  const { dom, state, runtime } = context;
  const selectedMelodyContextState = createSelectedMelodyContextState(state);
  const melodyPracticeSettingsState = createMelodyPracticeSettingsState(state);

  return {
    selectedMelodyContext: {
      dom: { melodySelector: dom.melodySelector, trainingMode: dom.trainingMode },
      state: selectedMelodyContextState,
      getMelodyById: runtime.getMelodyById,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      defaultMeterProfile: {
        beatsPerBar: runtime.defaultMetronomeBeatsPerBar,
        beatUnitDenominator: 4,
        secondaryAccentBeatIndices: [],
      },
      resolveMelodyMetronomeMeterProfile: runtime.resolveMelodyMetronomeMeterProfile,
      setMetronomeMeter: runtime.setMetronomeMeter,
    },
    melodyPracticeSettings: {
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
      state: melodyPracticeSettingsState,
      renderTimeline: runtime.renderMelodyTabTimelineFromState,
    },
    melodyPracticeSettingsBridge: {},
  };
}

function buildMelodyTimelineEditingDeps(
  context: MelodyTimelineEditingBuilderContext
): SessionControllerGraphDeps['melodyRuntime']['melodyTimelineEditing'] {
  const { dom, state, runtime, controllerBridges } = context;

  return {
    melodyTimelineEditingOrchestrator: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
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
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      updateCustomEventMelody: runtime.updateCustomEventMelody,
      clearPracticeAdjustmentCaches: () => {
        clearMelodyTransposeCache();
        clearMelodyStringShiftCache();
      },
      renderTimeline: runtime.renderMelodyTabTimelineFromState,
      redrawFretboard: runtime.redrawFretboard,
    },
  };
}

function buildRuntimeUiDeps(
  context: RuntimeUiBuilderContext
): SessionControllerGraphDeps['melodyRuntime']['runtimeUi'] {
  const { dom, state, runtime, ui } = context;

  return {
    melodyTimelineUi: {
      renderMelodyTabTimeline: runtime.renderMelodyTabTimelineFromState,
      isListening: () => state.isListening,
      stopListening: runtime.stopListening,
      setResultMessage: ui.setResultMessage,
    },
    sessionStart: {
      isListening: () => state.isListening,
      clearMelodyTimelinePreviewState: () => {
        state.melodyTimelinePreviewIndex = null;
        state.melodyTimelinePreviewLabel = null;
      },
      startListening: runtime.startListening,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
    },
    interactionGuards: {
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
    },
  };
}

function buildMelodyDemoDeps(
  context: MelodyDemoBuilderContext
): SessionControllerGraphDeps['melodyRuntime']['melodyDemo'] {
  const { dom, state, runtime, ui } = context;
  const melodyDemoState = createMelodyDemoState(state);

  return {
    melodyDemoRuntime: {
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
      state: melodyDemoState,
      getMelodyById: runtime.getMelodyById,
      getEnabledStrings,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      setResultMessage: ui.setResultMessage,
      setPromptText: ui.setPromptText,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
      scheduleTimelineRender: () => runtime.scheduleMelodyTimelineRenderFromState(),
      drawFretboard: runtime.drawFretboard,
      redrawFretboard: runtime.redrawFretboard,
      playSound: runtime.playSound,
      loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
      stopListening: runtime.stopListening,
      seekActiveMelodySessionToEvent: (eventIndex) => runtime.seekActiveMelodySessionToEvent(eventIndex),
      getStudyRangeLength: getMelodyStudyRangeLength,
      formatStudyRange: formatMelodyStudyRange,
      updateScrollingTabPanelRuntime: runtime.updateScrollingTabPanelRuntime,
      getPlaybackActionLabel: getPlaybackTransportIdleLabel,
      getPlaybackPromptLabel,
      getPlaybackCompletedLabel,
      requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    },
    sessionTransportControls: {
      dom,
      state: melodyDemoState,
      saveSettings: runtime.saveSettings,
      stopListening: runtime.stopListening,
      playSound: runtime.playSound,
      clearResultMessage: ui.clearResultMessage,
      setResultMessage: ui.setResultMessage,
      buildPromptAudioPlan: () =>
        buildPromptAudioPlan({
          prompt: state.currentPrompt as AppState['currentPrompt'],
          trainingMode: dom.trainingMode.value,
          instrument: state.currentInstrument,
          calibratedA4: state.calibratedA4,
          enabledStrings: getEnabledStringSet(dom),
        }),
      drawHintFretboard: ({ noteToShow, stringToShow, melodyNotes }) => {
        if (melodyNotes) {
          runtime.drawFretboard(false, null, null, melodyNotes as ChordNote[]);
          return;
        }
        runtime.drawFretboard(false, noteToShow, stringToShow);
      },
      scheduleHintReset: (label) => {
        runtime.scheduleSessionTimeout(
          2000,
          () => {
            runtime.redrawFretboard();
            state.cooldown = false;
          },
          label
        );
      },
    },
  };
}

function buildMelodyRuntimeGraphDeps(
  context: MelodyRuntimeBuilderContext
): SessionControllerGraphDeps['melodyRuntime'] {
  return {
    melodySettings: buildMelodySettingsDeps(createMelodySettingsContext(context)),
    melodyTimelineEditing: buildMelodyTimelineEditingDeps(createMelodyTimelineEditingContext(context)),
    runtimeUi: buildRuntimeUiDeps(createRuntimeUiContext(context)),
    melodyDemo: buildMelodyDemoDeps(createMelodyDemoContext(context)),
  };
}

function buildImportEditorDeps(
  context: ImportEditorBuilderContext
): SessionControllerGraphDeps['importEditor'] {
  const { dom, state, runtime, ui } = context;

  return {
    dom,
    state,
    cloneDraft: (events) => cloneMelodyEventsDraftModel(events),
    formatUserFacingError: runtime.formatUserFacingError,
    setResultMessage: ui.setResultMessage,
    getCurrentInstrument: () => state.currentInstrument,
    setMelodyImportModalVisible: (visible) => ui.setModalVisible('melodyImport', visible),
    getSelectedMidiImportQuantize: () => normalizeMidiImportQuantize(dom.melodyMidiQuantize.value),
    parseAsciiTabToEvents: runtime.parseAsciiTabToMelodyEvents,
    loadGpScoreFromBytes: runtime.loadGpScoreFromBytes,
    convertLoadedGpScoreTrackToImportedMelody: runtime.convertLoadedGpScoreTrackToImportedMelody,
    loadMidiFileFromBytes: runtime.loadMidiFileFromBytes,
    loadMusescoreFileFromBytes: runtime.loadMusescoreFileFromBytes,
    convertLoadedMidiTrackToImportedMelody: runtime.convertLoadedMidiTrackToImportedMelody,
    convertLoadedMusescoreTrackToImportedMelody: runtime.convertLoadedMusescoreTrackToImportedMelody,
    saveCustomEventMelody: runtime.saveCustomEventMelody,
    updateCustomEventMelody: runtime.updateCustomEventMelody,
    saveCustomAsciiTabMelody: runtime.saveCustomAsciiTabMelody,
    updateCustomAsciiTabMelody: runtime.updateCustomAsciiTabMelody,
    exportMelodyToMidiBytes: runtime.exportMelodyToMidiBytes,
    buildExportMidiFileName: runtime.buildExportMidiFileName,
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
    showNonBlockingError: runtime.showNonBlockingError,
  };
}

function buildWorkspaceConfigurationDeps(
  context: WorkspaceConfigurationBuilderContext
): SessionConfigurationGraphDeps['workspace'] {
  const { dom, state, runtime, ui, controllerBridges } = context;

  return {
    saveSettings: runtime.saveSettings,
    handleModeChange: runtime.handleModeChange,
    stopListening: runtime.stopListening,
    redrawFretboard: runtime.redrawFretboard,
    updateInstrumentUI: runtime.updateInstrumentUI,
    loadInstrumentSoundfont: runtime.loadInstrumentSoundfont,
    renderMelodyTabTimelineFromState: runtime.renderMelodyTabTimelineFromState,
    setPracticeSetupSummary: ui.setPracticeSetupSummary,
    setSessionToolsSummary: ui.setSessionToolsSummary,
    setMelodySetupSummary: ui.setMelodySetupSummary,
    setPracticeSetupCollapsed: ui.setPracticeSetupCollapsed,
    setMelodySetupCollapsed: ui.setMelodySetupCollapsed,
    setSessionToolsCollapsed: ui.setSessionToolsCollapsed,
    setLayoutControlsExpanded: ui.setLayoutControlsExpanded,
    toggleLayoutControlsExpanded: ui.toggleLayoutControlsExpanded,
    setUiWorkflow: ui.setUiWorkflow,
    setUiMode: ui.setUiMode,
    setResultMessage: ui.setResultMessage,
    refreshDisplayFormatting: ui.refreshDisplayFormatting,
    refreshLayoutControlsVisibility: ui.refreshLayoutControlsVisibility,
    refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
    setNoteNamingPreference: runtime.setNoteNamingPreference,
    getEnabledStringsCount: () => getEnabledStringSet(dom).size,
    getEnabledStrings: () => Array.from(getEnabledStringSet(dom)),
    listMelodiesForCurrentInstrument: () => listMelodiesForCurrentInstrument(runtime, state),
    getAdjustedMelody: (melody, stringShift) =>
      getMelodyWithPracticeAdjustments(
        melody,
        state.melodyTransposeSemitones,
        stringShift,
        state.currentInstrument
      ),
    isStringShiftFeasible: (melody, nextShift) =>
      isMelodyStringShiftFeasible(melody, nextShift, state.currentInstrument),
    isDefaultStudyRange: (totalEvents) =>
      isDefaultMelodyStudyRange(
        {
          startIndex: state.melodyStudyRangeStartIndex,
          endIndex: state.melodyStudyRangeEndIndex,
        },
        totalEvents
      ),
    isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
    isCustomMelodyId: runtime.isCustomMelodyId,
    formatMelodyStudyRange: (melody) =>
      formatMelodyStudyRange(
        controllerBridges.getStoredMelodyStudyRange(melody.id, melody.events.length),
        melody.events.length
      ),
    formatMelodyTransposeSemitones,
    formatMelodyStringShift,
    normalizeMelodyTransposeSemitones,
    normalizeMelodyStringShift: (value) => normalizeMelodyStringShift(value, state.currentInstrument),
    hasCompletedOnboarding: () => localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1',
    confirmUserAction: runtime.confirmUserAction,
  };
}

function buildMetronomeConfigurationDeps(
  context: MetronomeConfigurationBuilderContext
): SessionConfigurationGraphDeps['metronome'] {
  const { runtime, controllerBridges } = context;

  return {
    metronome: {
      clampMetronomeBpm: clampMelodyPlaybackBpm,
      startMetronome: runtime.startMetronome,
      stopMetronome: runtime.stopMetronome,
      setMetronomeTempo: async (bpm) => {
        await runtime.setMetronomeTempo(bpm);
      },
      subscribeMetronomeBeat: runtime.subscribeMetronomeBeat,
      saveSettings: runtime.saveSettings,
      formatUserFacingError: runtime.formatUserFacingError,
      showNonBlockingError: runtime.showNonBlockingError,
    },
    melodyTempo: {
      getSelectedMelody: controllerBridges.getSelectedMelody,
      syncMelodyDemoBpmDisplay: controllerBridges.syncMelodyDemoBpmDisplay,
      syncMetronomeMeterFromSelectedMelody: controllerBridges.syncMetronomeMeterFromSelectedMelody,
      startMetronome: runtime.startMetronome,
      stopMetronome: runtime.stopMetronome,
      setMetronomeTempo: async (bpm) => {
        await runtime.setMetronomeTempo(bpm);
      },
      isMetronomeRunning: runtime.isMetronomeRunning,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
      isMelodyDemoPlaying: controllerBridges.isMelodyDemoPlaying,
      isMelodyWorkflowMode: runtime.isMelodyWorkflowMode,
      isPerformanceStyleMode: runtime.isPerformanceStyleMode,
    },
    metronomeBridge: {
      clampMetronomeVolumePercent: runtime.clampMetronomeVolumePercent,
      setMetronomeVolume: runtime.setMetronomeVolume,
    },
    metronomeControls: {
      saveSettings: runtime.saveSettings,
    },
  };
}

function buildCurriculumPresetConfigurationDeps(
  context: CurriculumPresetConfigurationBuilderContext
): SessionConfigurationGraphDeps['curriculumPreset'] {
  const { runtime, ui, controllerBridges } = context;

  return {
    getClampedMetronomeBpmFromInput: controllerBridges.getClampedMetronomeBpmFromInput,
    handleModeChange: runtime.handleModeChange,
    redrawFretboard: runtime.redrawFretboard,
    saveSettings: runtime.saveSettings,
    setResultMessage: ui.setResultMessage,
    stopListening: runtime.stopListening,
  };
}

function buildInputControlsConfigurationDeps(
  context: InputControlsConfigurationBuilderContext
): SessionConfigurationGraphDeps['inputControls'] {
  const { state, runtime, ui, controllerBridges } = context;

  return {
    micSettings: {
      ensureAudioRuntime: (runtimeState, options) =>
        runtime.ensureAudioRuntime(runtimeState as AppState, options),
      refreshAudioInputDeviceOptions: runtime.refreshAudioInputDeviceOptions,
      refreshMicPolyphonicDetectorAudioInfoUi: runtime.refreshMicPolyphonicDetectorAudioInfoUi,
      refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
      saveSettings: runtime.saveSettings,
      setResultMessage: ui.setResultMessage,
      formatUserFacingError: runtime.formatUserFacingError,
      showNonBlockingError: runtime.showNonBlockingError,
    },
    inputDevice: {
      normalizeAudioInputDeviceId: runtime.normalizeAudioInputDeviceId,
      setPreferredAudioInputDeviceId: runtime.setPreferredAudioInputDeviceId,
      normalizeInputSource: runtime.normalizeInputSource,
      setInputSourcePreference: runtime.setInputSourcePreference,
      refreshMidiInputDevices: runtime.refreshMidiInputDevices,
      normalizeMidiInputDeviceId: runtime.normalizeMidiInputDeviceId,
      setPreferredMidiInputDeviceId: runtime.setPreferredMidiInputDeviceId,
      stopMelodyDemoPlayback: controllerBridges.stopMelodyDemoPlayback,
      stopListening: runtime.stopListening,
      saveSettings: runtime.saveSettings,
      updateMicNoiseGateInfo: controllerBridges.updateMicNoiseGateInfo,
      refreshMicPerformanceReadinessUi: runtime.refreshMicPerformanceReadinessUi,
      setResultMessage: ui.setResultMessage,
    },
    micPolyphonicBenchmark: {
      detectMicPolyphonicFrame: (input) =>
        runtime.detectMicPolyphonicFrame({
          ...input,
          provider: runtime.normalizeMicPolyphonicDetectorProvider(input.provider),
        }),
      now: () => performance.now(),
      setResultMessage: ui.setResultMessage,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
    },
    micPolyphonicTelemetry: {
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
      resetTelemetry: () => runtime.resetMicPolyphonicDetectorTelemetry(),
      refreshTelemetryUi: runtime.refreshMicPolyphonicDetectorAudioInfoUi,
      setResultMessage: ui.setResultMessage,
      showNonBlockingError: runtime.showNonBlockingError,
      formatUserFacingError: runtime.formatUserFacingError,
    },
  };
}

function buildConfigurationGraphDeps(
  context: ConfigurationBuilderContext
): SessionConfigurationGraphDeps {
  const { dom, state } = context;

  return {
    app: {
      dom,
      state,
    },
    workspace: buildWorkspaceConfigurationDeps(createWorkspaceConfigurationContext(context)),
    metronome: buildMetronomeConfigurationDeps(createMetronomeConfigurationContext(context)),
    curriculumPreset: buildCurriculumPresetConfigurationDeps(createCurriculumPresetConfigurationContext(context)),
    inputControls: buildInputControlsConfigurationDeps(createInputControlsConfigurationContext(context)),
  };
}

export function buildSessionControllerGraphDeps(
  args: SessionControllerGraphDepsBuilderArgs
): SessionControllerGraphDeps {
  const context = createBuilderContext(args);

  return {
    melodyRuntime: buildMelodyRuntimeGraphDeps(createMelodyRuntimeContext(context)),
    importEditor: buildImportEditorDeps(createImportEditorContext(context)),
    configurationGraph: buildSessionConfigurationGraphDeps(
      buildConfigurationGraphDeps(createConfigurationContext(context))
    ),
  };
}









