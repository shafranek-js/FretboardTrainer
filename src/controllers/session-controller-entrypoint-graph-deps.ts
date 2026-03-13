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
} from '../midi-file-import';
import {
  convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes,
} from '../musescore-file-import';
import { buildExportMidiFileName, exportMelodyToMidiBytes } from '../midi-file-export';
import { updateScrollingTabPanelRuntime } from '../scrolling-tab-panel';
import { buildSessionControllerGraphDeps } from './session-controller-graph-deps';
import { isMelodyWorkflowMode, isPerformanceStyleMode } from '../training-mode-groups';

type SessionControllerGraphDepsArgs = Parameters<typeof buildSessionControllerGraphDeps>[0];
type SessionControllerGraphEntrypointAppDeps = SessionControllerGraphDepsArgs['app'];
type SessionControllerGraphEntrypointDom = SessionControllerGraphEntrypointAppDeps['dom'];
type SessionControllerGraphEntrypointState = SessionControllerGraphEntrypointAppDeps['state'];
type SessionControllerGraphEntrypointRuntimeDeps = SessionControllerGraphDepsArgs['runtime'];
type SessionControllerGraphEntrypointUiDeps = SessionControllerGraphDepsArgs['ui'];

function buildAppDom(): SessionControllerGraphEntrypointDom {
  return dom;
}

function buildAppState(): SessionControllerGraphEntrypointState {
  return state;
}

function buildAppDeps(): SessionControllerGraphEntrypointAppDeps {
  return {
    dom: buildAppDom(),
    state: buildAppState(),
  };
}

function buildCoreRuntimeDeps(): Pick<
  SessionControllerGraphEntrypointRuntimeDeps,
  | 'saveSettings'
  | 'handleModeChange'
  | 'redrawFretboard'
  | 'scheduleMelodyTimelineRenderFromState'
  | 'updateInstrumentUI'
  | 'drawFretboard'
  | 'renderMelodyTabTimelineFromState'
  | 'scheduleSessionTimeout'
  | 'seekActiveMelodySessionToEvent'
  | 'startListening'
  | 'stopListening'
  | 'formatUserFacingError'
  | 'showNonBlockingError'
  | 'isMelodyWorkflowMode'
  | 'isPerformanceStyleMode'
  | 'updateScrollingTabPanelRuntime'
> {
  return {
    saveSettings,
    handleModeChange,
    redrawFretboard,
    scheduleMelodyTimelineRenderFromState,
    updateInstrumentUI,
    drawFretboard,
    renderMelodyTabTimelineFromState,
    scheduleSessionTimeout,
    seekActiveMelodySessionToEvent,
    startListening,
    stopListening,
    formatUserFacingError,
    showNonBlockingError,
    isMelodyWorkflowMode,
    isPerformanceStyleMode,
    updateScrollingTabPanelRuntime,
  };
}

function buildAudioAndMetronomeRuntimeDeps(): Pick<
  SessionControllerGraphEntrypointRuntimeDeps,
  | 'playSound'
  | 'loadInstrumentSoundfont'
  | 'clampMetronomeVolumePercent'
  | 'defaultMetronomeBeatsPerBar'
  | 'setMetronomeMeter'
  | 'setMetronomeTempo'
  | 'setMetronomeVolume'
  | 'startMetronome'
  | 'stopMetronome'
  | 'isMetronomeRunning'
  | 'subscribeMetronomeBeat'
  | 'resolveMelodyMetronomeMeterProfile'
> {
  return {
    playSound,
    loadInstrumentSoundfont,
    clampMetronomeVolumePercent,
    defaultMetronomeBeatsPerBar: DEFAULT_METRONOME_BEATS_PER_BAR,
    setMetronomeMeter,
    setMetronomeTempo,
    setMetronomeVolume,
    startMetronome,
    stopMetronome,
    isMetronomeRunning,
    subscribeMetronomeBeat,
    resolveMelodyMetronomeMeterProfile,
  };
}

function buildInputRuntimeDeps(): Pick<
  SessionControllerGraphEntrypointRuntimeDeps,
  | 'ensureAudioRuntime'
  | 'resetMicPolyphonicDetectorTelemetry'
  | 'setNoteNamingPreference'
  | 'normalizeAudioInputDeviceId'
  | 'refreshAudioInputDeviceOptions'
  | 'setPreferredAudioInputDeviceId'
  | 'normalizeInputSource'
  | 'refreshInputSourceAvailabilityUi'
  | 'refreshMidiInputDevices'
  | 'setInputSourcePreference'
  | 'normalizeMidiInputDeviceId'
  | 'setPreferredMidiInputDeviceId'
  | 'refreshMicPolyphonicDetectorAudioInfoUi'
  | 'refreshMicPerformanceReadinessUi'
  | 'detectMicPolyphonicFrame'
  | 'normalizeMicPolyphonicDetectorProvider'
> {
  return {
    ensureAudioRuntime,
    resetMicPolyphonicDetectorTelemetry,
    setNoteNamingPreference,
    normalizeAudioInputDeviceId,
    refreshAudioInputDeviceOptions,
    setPreferredAudioInputDeviceId,
    normalizeInputSource,
    refreshInputSourceAvailabilityUi,
    refreshMidiInputDevices,
    setInputSourcePreference,
    normalizeMidiInputDeviceId,
    setPreferredMidiInputDeviceId,
    refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi,
    detectMicPolyphonicFrame,
    normalizeMicPolyphonicDetectorProvider,
  };
}

function buildMelodyLibraryRuntimeDeps(): Pick<
  SessionControllerGraphEntrypointRuntimeDeps,
  | 'deleteCustomMelody'
  | 'getMelodyById'
  | 'isCustomMelodyId'
  | 'listMelodiesForInstrument'
  | 'saveCustomAsciiTabMelody'
  | 'saveCustomEventMelody'
  | 'updateCustomEventMelody'
  | 'updateCustomAsciiTabMelody'
  | 'confirmUserAction'
> {
  return {
    deleteCustomMelody,
    getMelodyById,
    isCustomMelodyId,
    listMelodiesForInstrument,
    saveCustomAsciiTabMelody,
    saveCustomEventMelody,
    updateCustomEventMelody,
    updateCustomAsciiTabMelody,
    confirmUserAction,
  };
}

function buildMelodyImportExportRuntimeDeps(): Pick<
  SessionControllerGraphEntrypointRuntimeDeps,
  | 'parseAsciiTabToMelodyEvents'
  | 'convertLoadedGpScoreTrackToImportedMelody'
  | 'loadGpScoreFromBytes'
  | 'convertLoadedMidiTrackToImportedMelody'
  | 'loadMidiFileFromBytes'
  | 'convertLoadedMusescoreTrackToImportedMelody'
  | 'loadMusescoreFileFromBytes'
  | 'buildExportMidiFileName'
  | 'exportMelodyToMidiBytes'
> {
  return {
    parseAsciiTabToMelodyEvents,
    convertLoadedGpScoreTrackToImportedMelody,
    loadGpScoreFromBytes,
    convertLoadedMidiTrackToImportedMelody,
    loadMidiFileFromBytes,
    convertLoadedMusescoreTrackToImportedMelody,
    loadMusescoreFileFromBytes,
    buildExportMidiFileName,
    exportMelodyToMidiBytes,
  };
}

function buildRuntimeDeps(): SessionControllerGraphEntrypointRuntimeDeps {
  return {
    ...buildCoreRuntimeDeps(),
    ...buildAudioAndMetronomeRuntimeDeps(),
    ...buildInputRuntimeDeps(),
    ...buildMelodyLibraryRuntimeDeps(),
    ...buildMelodyImportExportRuntimeDeps(),
  };
}

function buildWorkspaceUiDeps(): Omit<
  SessionControllerGraphEntrypointUiDeps,
  'setModalVisible'
> {
  return {
    clearResultMessage,
    refreshDisplayFormatting,
    setMelodySetupSummary,
    setMelodySetupCollapsed,
    setPracticeSetupCollapsed,
    setPracticeSetupSummary,
    setSessionToolsCollapsed,
    setSessionToolsSummary,
    setPromptText,
    refreshLayoutControlsVisibility,
    setResultMessage,
    setUiMode,
    setUiWorkflow,
    setLayoutControlsExpanded,
    toggleLayoutControlsExpanded,
  };
}

function buildUiDeps(): SessionControllerGraphEntrypointUiDeps {
  return {
    ...buildWorkspaceUiDeps(),
    setModalVisible,
  };
}

export function buildSessionControllerGraphEntrypointDeps(args: {
  controllerBridges: SessionControllerGraphDepsArgs['controllerBridges'];
}): SessionControllerGraphDepsArgs {
  return {
    app: buildAppDeps(),
    runtime: buildRuntimeDeps(),
    ui: buildUiDeps(),
    controllerBridges: args.controllerBridges,
  };
}
