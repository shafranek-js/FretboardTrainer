import { instruments } from '../instruments';
import { createSessionControllerGraphCluster } from './session-controller-graph-cluster';

type ConfigurationGraphDeps = Parameters<typeof createSessionControllerGraphCluster>[0]['configurationGraph'];
type WorkspaceGraphDeps = ConfigurationGraphDeps['workspaceGraph'];
type MetronomeDeps = ConfigurationGraphDeps['metronome'];
type CurriculumPresetDeps = ConfigurationGraphDeps['curriculumPreset'];
type InputControlsDeps = ConfigurationGraphDeps['inputControls'];

type SessionConfigurationWorkspaceDeps = Omit<
  WorkspaceGraphDeps,
  'dom' | 'state' | 'resolveInstrumentById'
>;
type SessionConfigurationCurriculumPresetDeps = Omit<
  CurriculumPresetDeps['curriculumPreset'],
  'dom' | 'state' | 'applyEnabledStrings' | 'isListening'
>;
type SessionConfigurationMetronomeDeps = {
  metronome: Omit<MetronomeDeps['metronome'], 'dom'>;
  melodyTempo: Omit<MetronomeDeps['melodyTempo'], 'dom' | 'state'>;
  metronomeBridge: Omit<MetronomeDeps['metronomeBridge'], 'dom'>;
  metronomeControls: Omit<MetronomeDeps['metronomeControls'], 'dom'>;
};
type SessionConfigurationInputControlsDeps = {
  micSettings: Omit<InputControlsDeps['micSettings'], 'dom' | 'state'>;
  inputDevice: Omit<InputControlsDeps['inputDevice'], 'dom' | 'state'>;
  micPolyphonicBenchmark: Omit<InputControlsDeps['micPolyphonicBenchmark'], 'dom' | 'state'>;
  micPolyphonicTelemetry: Omit<InputControlsDeps['micPolyphonicTelemetry'], 'dom' | 'state'>;
};
type SessionConfigurationMicSettingsState = InputControlsDeps['micSettings']['state'];
type SessionConfigurationInputDeviceState = InputControlsDeps['inputDevice']['state'];
type SessionConfigurationMicPolyphonicBenchmarkState =
  InputControlsDeps['micPolyphonicBenchmark']['state'];
type SessionConfigurationMicPolyphonicTelemetryState =
  InputControlsDeps['micPolyphonicTelemetry']['state'];
type SessionConfigurationCurriculumPresetState =
  CurriculumPresetDeps['curriculumPreset']['state'];
type SessionConfigurationMelodyTempoState = MetronomeDeps['melodyTempo']['state'];
type SessionConfigurationGraphAppState =
  WorkspaceGraphDeps['state'] &
  SessionConfigurationMelodyTempoState &
  SessionConfigurationCurriculumPresetState &
  SessionConfigurationMicSettingsState &
  SessionConfigurationInputDeviceState &
  SessionConfigurationMicPolyphonicBenchmarkState &
  SessionConfigurationMicPolyphonicTelemetryState;
type SessionConfigurationGraphAppDeps = Omit<Pick<WorkspaceGraphDeps, 'dom' | 'state'>, 'state'> & {
  state: SessionConfigurationGraphAppState;
};

interface SessionConfigurationGraphDepsBuilderArgs {
  app: SessionConfigurationGraphAppDeps;
  workspace: SessionConfigurationWorkspaceDeps;
  metronome: SessionConfigurationMetronomeDeps;
  curriculumPreset: SessionConfigurationCurriculumPresetDeps;
  inputControls: SessionConfigurationInputControlsDeps;
}

function createMelodyTempoState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationMelodyTempoState {
  const melodyTempoState = {} as SessionConfigurationMelodyTempoState;

  Object.defineProperties(melodyTempoState, {
    isListening: { enumerable: true, get: () => state.isListening },
    performanceRuntimeStartedAtMs: {
      enumerable: true,
      get: () => state.performanceRuntimeStartedAtMs,
      set: (value: SessionConfigurationMelodyTempoState['performanceRuntimeStartedAtMs']) => {
        state.performanceRuntimeStartedAtMs = value;
      },
    },
    performancePrerollLeadInVisible: {
      enumerable: true,
      get: () => state.performancePrerollLeadInVisible,
      set: (value: SessionConfigurationMelodyTempoState['performancePrerollLeadInVisible']) => {
        state.performancePrerollLeadInVisible = value;
      },
    },
    melodyPlaybackBpmById: {
      enumerable: true,
      get: () => state.melodyPlaybackBpmById,
      set: (value: SessionConfigurationMelodyTempoState['melodyPlaybackBpmById']) => {
        state.melodyPlaybackBpmById = value;
      },
    },
    melodyTimelineZoomPercent: {
      enumerable: true,
      get: () => state.melodyTimelineZoomPercent,
      set: (value: SessionConfigurationMelodyTempoState['melodyTimelineZoomPercent']) => {
        state.melodyTimelineZoomPercent = value;
      },
    },
    scrollingTabZoomPercent: {
      enumerable: true,
      get: () => state.scrollingTabZoomPercent,
      set: (value: SessionConfigurationMelodyTempoState['scrollingTabZoomPercent']) => {
        state.scrollingTabZoomPercent = value;
      },
    },
  });

  return melodyTempoState;
}

function buildMetronomeDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps['metronome'] {
  const { dom, state } = args.app;
  const melodyTempoState = createMelodyTempoState(state);

  return {
    metronome: {
      dom: {
        trainingMode: dom.trainingMode,
        metronomeEnabled: dom.metronomeEnabled,
        metronomeBpm: dom.melodyDemoBpm,
        metronomeBpmValue: dom.melodyDemoBpmValue,
        metronomeBeatLabel: dom.metronomeBeatLabel,
        metronomePulse: dom.metronomePulse,
      },
      ...args.metronome.metronome,
    },
    melodyTempo: {
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
      state: melodyTempoState,
      ...args.metronome.melodyTempo,
    },
    metronomeBridge: {
      dom: {
        metronomeVolume: dom.metronomeVolume,
        metronomeVolumeValue: dom.metronomeVolumeValue,
      },
      ...args.metronome.metronomeBridge,
    },
    metronomeControls: {
      dom: {
        metronomeToggleBtn: dom.metronomeToggleBtn,
        metronomeEnabled: dom.metronomeEnabled,
        metronomeBpm: dom.metronomeBpm,
        metronomeVolume: dom.metronomeVolume,
      },
      ...args.metronome.metronomeControls,
    },
  };
}

function createCurriculumPresetState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationCurriculumPresetState {
  const curriculumPresetState = {} as SessionConfigurationCurriculumPresetState;

  Object.defineProperties(curriculumPresetState, {
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
    },
    showingAllNotes: {
      enumerable: true,
      get: () => state.showingAllNotes,
      set: (value: SessionConfigurationCurriculumPresetState['showingAllNotes']) => {
        state.showingAllNotes = value;
      },
    },
  });

  return curriculumPresetState;
}

function buildCurriculumPresetDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps['curriculumPreset'] {
  const { dom, state } = args.app;
  const curriculumPresetState = createCurriculumPresetState(state);

  return {
    curriculumPreset: {
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
      state: curriculumPresetState,
      ...args.curriculumPreset,
      applyEnabledStrings: (enabledStrings) => {
        const enabled = new Set(enabledStrings);
        dom.stringSelector.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          const checkbox = input as HTMLInputElement;
          checkbox.checked = enabled.has(checkbox.value);
        });
      },
      isListening: () => state.isListening,
    },
  };
}

function createMicSettingsState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationMicSettingsState {
  const micSettingsState = {} as SessionConfigurationMicSettingsState;

  Object.defineProperties(micSettingsState, {
    isListening: { enumerable: true, get: () => state.isListening },
    preferredAudioInputDeviceId: {
      enumerable: true,
      get: () => state.preferredAudioInputDeviceId,
    },
    micSensitivityPreset: {
      enumerable: true,
      get: () => state.micSensitivityPreset as SessionConfigurationMicSettingsState['micSensitivityPreset'],
      set: (value: SessionConfigurationMicSettingsState['micSensitivityPreset']) => {
        state.micSensitivityPreset = value as SessionConfigurationMicSettingsState['micSensitivityPreset'];
      },
    },
    micAutoNoiseFloorRms: {
      enumerable: true,
      get: () => state.micAutoNoiseFloorRms,
      set: (value: SessionConfigurationMicSettingsState['micAutoNoiseFloorRms']) => {
        state.micAutoNoiseFloorRms = value;
      },
    },
    micNoteAttackFilterPreset: {
      enumerable: true,
      get: () =>
        state.micNoteAttackFilterPreset as SessionConfigurationMicSettingsState['micNoteAttackFilterPreset'],
      set: (value: SessionConfigurationMicSettingsState['micNoteAttackFilterPreset']) => {
        state.micNoteAttackFilterPreset = value as SessionConfigurationMicSettingsState['micNoteAttackFilterPreset'];
      },
    },
    micNoteHoldFilterPreset: {
      enumerable: true,
      get: () =>
        state.micNoteHoldFilterPreset as SessionConfigurationMicSettingsState['micNoteHoldFilterPreset'],
      set: (value: SessionConfigurationMicSettingsState['micNoteHoldFilterPreset']) => {
        state.micNoteHoldFilterPreset = value as SessionConfigurationMicSettingsState['micNoteHoldFilterPreset'];
      },
    },
    micPolyphonicDetectorProvider: {
      enumerable: true,
      get: () =>
        state.micPolyphonicDetectorProvider as SessionConfigurationMicSettingsState['micPolyphonicDetectorProvider'],
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorProvider']) => {
        state.micPolyphonicDetectorProvider = value as SessionConfigurationMicSettingsState['micPolyphonicDetectorProvider'];
      },
    },
    lastMicPolyphonicDetectorProviderUsed: {
      enumerable: true,
      get: () =>
        state.lastMicPolyphonicDetectorProviderUsed as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorProviderUsed'],
      set: (value: SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorProviderUsed']) => {
        state.lastMicPolyphonicDetectorProviderUsed = value as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorProviderUsed'];
      },
    },
    lastMicPolyphonicDetectorFallbackFrom: {
      enumerable: true,
      get: () =>
        state.lastMicPolyphonicDetectorFallbackFrom as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorFallbackFrom'],
      set: (value: SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorFallbackFrom']) => {
        state.lastMicPolyphonicDetectorFallbackFrom = value as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorFallbackFrom'];
      },
    },
    lastMicPolyphonicDetectorWarning: {
      enumerable: true,
      get: () =>
        state.lastMicPolyphonicDetectorWarning as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorWarning'],
      set: (value: SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorWarning']) => {
        state.lastMicPolyphonicDetectorWarning = value as SessionConfigurationMicSettingsState['lastMicPolyphonicDetectorWarning'];
      },
    },
    micPolyphonicDetectorTelemetryFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryFrames,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryFrames']) => {
        state.micPolyphonicDetectorTelemetryFrames = value;
      },
    },
    micPolyphonicDetectorTelemetryTotalLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryTotalLatencyMs,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryTotalLatencyMs']) => {
        state.micPolyphonicDetectorTelemetryTotalLatencyMs = value;
      },
    },
    micPolyphonicDetectorTelemetryMaxLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryMaxLatencyMs,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryMaxLatencyMs']) => {
        state.micPolyphonicDetectorTelemetryMaxLatencyMs = value;
      },
    },
    micPolyphonicDetectorTelemetryLastLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryLastLatencyMs,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryLastLatencyMs']) => {
        state.micPolyphonicDetectorTelemetryLastLatencyMs = value;
      },
    },
    micPolyphonicDetectorTelemetryFallbackFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryFallbackFrames,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryFallbackFrames']) => {
        state.micPolyphonicDetectorTelemetryFallbackFrames = value;
      },
    },
    micPolyphonicDetectorTelemetryWarningFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryWarningFrames,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryWarningFrames']) => {
        state.micPolyphonicDetectorTelemetryWarningFrames = value;
      },
    },
    micPolyphonicDetectorTelemetryWindowStartedAtMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryWindowStartedAtMs']) => {
        state.micPolyphonicDetectorTelemetryWindowStartedAtMs = value;
      },
    },
    micPolyphonicDetectorTelemetryLastUiRefreshAtMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs,
      set: (value: SessionConfigurationMicSettingsState['micPolyphonicDetectorTelemetryLastUiRefreshAtMs']) => {
        state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = value;
      },
    },
    audioContext: { enumerable: true, get: () => state.audioContext },
    analyser: { enumerable: true, get: () => state.analyser },
    dataArray: { enumerable: true, get: () => state.dataArray },
  });

  return micSettingsState;
}

function createInputDeviceState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationInputDeviceState {
  const inputDeviceState = {} as SessionConfigurationInputDeviceState;

  Object.defineProperties(inputDeviceState, {
    isListening: { enumerable: true, get: () => state.isListening },
    inputSource: {
      enumerable: true,
      get: () => state.inputSource,
      set: (value: SessionConfigurationInputDeviceState['inputSource']) => {
        state.inputSource = value;
      },
    },
  });

  return inputDeviceState;
}

function createMicPolyphonicBenchmarkState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationMicPolyphonicBenchmarkState {
  const micPolyphonicBenchmarkState = {} as SessionConfigurationMicPolyphonicBenchmarkState;

  Object.defineProperties(micPolyphonicBenchmarkState, {
    isListening: { enumerable: true, get: () => state.isListening },
    micPolyphonicDetectorProvider: {
      enumerable: true,
      get: () =>
        state.micPolyphonicDetectorProvider as SessionConfigurationMicPolyphonicBenchmarkState['micPolyphonicDetectorProvider'],
      set: (value: SessionConfigurationMicPolyphonicBenchmarkState['micPolyphonicDetectorProvider']) => {
        state.micPolyphonicDetectorProvider = value as SessionConfigurationMicPolyphonicBenchmarkState['micPolyphonicDetectorProvider'];
      },
    },
  });

  return micPolyphonicBenchmarkState;
}

function createMicPolyphonicTelemetryState(
  state: SessionConfigurationGraphAppDeps['state']
): SessionConfigurationMicPolyphonicTelemetryState {
  const micPolyphonicTelemetryState = {} as SessionConfigurationMicPolyphonicTelemetryState;

  Object.defineProperties(micPolyphonicTelemetryState, {
    micSensitivityPreset: { enumerable: true, get: () => state.micSensitivityPreset },
    micAutoNoiseFloorRms: { enumerable: true, get: () => state.micAutoNoiseFloorRms },
    micNoteAttackFilterPreset: { enumerable: true, get: () => state.micNoteAttackFilterPreset },
    micNoteHoldFilterPreset: { enumerable: true, get: () => state.micNoteHoldFilterPreset },
    micPolyphonicDetectorProvider: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorProvider,
    },
    lastMicPolyphonicDetectorProviderUsed: {
      enumerable: true,
      get: () => state.lastMicPolyphonicDetectorProviderUsed,
    },
    lastMicPolyphonicDetectorFallbackFrom: {
      enumerable: true,
      get: () => state.lastMicPolyphonicDetectorFallbackFrom,
    },
    lastMicPolyphonicDetectorWarning: {
      enumerable: true,
      get: () => state.lastMicPolyphonicDetectorWarning,
    },
    micPolyphonicDetectorTelemetryFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryFrames,
    },
    micPolyphonicDetectorTelemetryTotalLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryTotalLatencyMs,
    },
    micPolyphonicDetectorTelemetryMaxLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryMaxLatencyMs,
    },
    micPolyphonicDetectorTelemetryLastLatencyMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryLastLatencyMs,
    },
    micPolyphonicDetectorTelemetryFallbackFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryFallbackFrames,
    },
    micPolyphonicDetectorTelemetryWarningFrames: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryWarningFrames,
    },
    micPolyphonicDetectorTelemetryWindowStartedAtMs: {
      enumerable: true,
      get: () => state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
    },
  });

  return micPolyphonicTelemetryState;
}

function buildInputControlsDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps['inputControls'] {
  const { dom, state } = args.app;
  const micSettingsState = createMicSettingsState(state);
  const inputDeviceState = createInputDeviceState(state);
  const micPolyphonicBenchmarkState = createMicPolyphonicBenchmarkState(state);
  const micPolyphonicTelemetryState = createMicPolyphonicTelemetryState(state);

  return {
    micSettings: {
      dom: {
        micNoiseGateInfo: dom.micNoiseGateInfo,
        micSensitivityPreset: dom.micSensitivityPreset,
        micNoteAttackFilter: dom.micNoteAttackFilter,
        micNoteHoldFilter: dom.micNoteHoldFilter,
        micPolyphonicDetectorProvider: dom.micPolyphonicDetectorProvider,
        calibrateNoiseFloorBtn: dom.calibrateNoiseFloorBtn,
      },
      state: micSettingsState,
      ...args.inputControls.micSettings,
    },
    inputDevice: {
      dom,
      state: inputDeviceState,
      ...args.inputControls.inputDevice,
    },
    micPolyphonicBenchmark: {
      dom: {
        runMicPolyphonicBenchmarkBtn: dom.runMicPolyphonicBenchmarkBtn,
        micPolyphonicBenchmarkInfo: dom.micPolyphonicBenchmarkInfo,
      },
      state: micPolyphonicBenchmarkState,
      ...args.inputControls.micPolyphonicBenchmark,
    },
    micPolyphonicTelemetry: {
      dom: {
        exportMicPolyphonicTelemetryBtn: dom.exportMicPolyphonicTelemetryBtn,
        resetMicPolyphonicTelemetryBtn: dom.resetMicPolyphonicTelemetryBtn,
      },
      state: micPolyphonicTelemetryState,
      ...args.inputControls.micPolyphonicTelemetry,
    },
    audioInputControls: {
      dom,
    },
  };
}

function buildWorkspaceGraphDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps['workspaceGraph'] {
  const { dom, state } = args.app;

  return {
    dom,
    state,
    ...args.workspace,
    resolveInstrumentById: (instrumentId) => instruments[instrumentId],
  };
}

export function buildSessionConfigurationGraphDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps {
  return {
    metronome: buildMetronomeDeps(args),
    curriculumPreset: buildCurriculumPresetDeps(args),
    inputControls: buildInputControlsDeps(args),
    workspaceGraph: buildWorkspaceGraphDeps(args),
  };
}
