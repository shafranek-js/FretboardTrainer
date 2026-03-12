import { instruments } from '../instruments';
import { createSessionControllerGraphCluster } from './session-controller-graph-cluster';

type ConfigurationGraphDeps = Parameters<typeof createSessionControllerGraphCluster>[0]['configurationGraph'];
type WorkspaceGraphDeps = ConfigurationGraphDeps['workspaceGraph'];
type MetronomeDeps = ConfigurationGraphDeps['metronome'];
type CurriculumPresetDeps = ConfigurationGraphDeps['curriculumPreset'];
type InputControlsDeps = ConfigurationGraphDeps['inputControls'];

interface SessionConfigurationGraphDepsBuilderArgs {
  dom: WorkspaceGraphDeps['dom'];
  state: WorkspaceGraphDeps['state'];
  saveSettings: WorkspaceGraphDeps['saveSettings'];
  handleModeChange: CurriculumPresetDeps['curriculumPreset']['handleModeChange'];
  redrawFretboard: WorkspaceGraphDeps['redrawFretboard'];
  stopListening: CurriculumPresetDeps['curriculumPreset']['stopListening'];
  setResultMessage: CurriculumPresetDeps['curriculumPreset']['setResultMessage'];
  refreshDisplayFormatting: WorkspaceGraphDeps['refreshDisplayFormatting'];
  setNoteNamingPreference: WorkspaceGraphDeps['setNoteNamingPreference'];
  updateInstrumentUI: WorkspaceGraphDeps['updateInstrumentUI'];
  loadInstrumentSoundfont: WorkspaceGraphDeps['loadInstrumentSoundfont'];
  renderMelodyTabTimelineFromState: WorkspaceGraphDeps['renderMelodyTabTimelineFromState'];
  setPracticeSetupSummary: WorkspaceGraphDeps['setPracticeSetupSummary'];
  setSessionToolsSummary: WorkspaceGraphDeps['setSessionToolsSummary'];
  setMelodySetupSummary: WorkspaceGraphDeps['setMelodySetupSummary'];
  setPracticeSetupCollapsed: WorkspaceGraphDeps['setPracticeSetupCollapsed'];
  setMelodySetupCollapsed: WorkspaceGraphDeps['setMelodySetupCollapsed'];
  setSessionToolsCollapsed: WorkspaceGraphDeps['setSessionToolsCollapsed'];
  setLayoutControlsExpanded: WorkspaceGraphDeps['setLayoutControlsExpanded'];
  toggleLayoutControlsExpanded: WorkspaceGraphDeps['toggleLayoutControlsExpanded'];
  setUiWorkflow: WorkspaceGraphDeps['setUiWorkflow'];
  setUiMode: WorkspaceGraphDeps['setUiMode'];
  refreshLayoutControlsVisibility: WorkspaceGraphDeps['refreshLayoutControlsVisibility'];
  refreshMicPerformanceReadinessUi: WorkspaceGraphDeps['refreshMicPerformanceReadinessUi'];
  getEnabledStringsCount: WorkspaceGraphDeps['getEnabledStringsCount'];
  getEnabledStrings: WorkspaceGraphDeps['getEnabledStrings'];
  listMelodiesForCurrentInstrument: WorkspaceGraphDeps['listMelodiesForCurrentInstrument'];
  getAdjustedMelody: WorkspaceGraphDeps['getAdjustedMelody'];
  isStringShiftFeasible: WorkspaceGraphDeps['isStringShiftFeasible'];
  isDefaultStudyRange: WorkspaceGraphDeps['isDefaultStudyRange'];
  isMelodyWorkflowMode: WorkspaceGraphDeps['isMelodyWorkflowMode'];
  isPerformanceStyleMode: MetronomeDeps['melodyTempo']['isPerformanceStyleMode'];
  isCustomMelodyId: WorkspaceGraphDeps['isCustomMelodyId'];
  formatMelodyStudyRange: WorkspaceGraphDeps['formatMelodyStudyRange'];
  formatMelodyTransposeSemitones: WorkspaceGraphDeps['formatMelodyTransposeSemitones'];
  formatMelodyStringShift: WorkspaceGraphDeps['formatMelodyStringShift'];
  normalizeMelodyTransposeSemitones: WorkspaceGraphDeps['normalizeMelodyTransposeSemitones'];
  normalizeMelodyStringShift: WorkspaceGraphDeps['normalizeMelodyStringShift'];
  hasCompletedOnboarding: WorkspaceGraphDeps['hasCompletedOnboarding'];
  confirmUserAction: WorkspaceGraphDeps['confirmUserAction'];
  clampMetronomeVolumePercent: MetronomeDeps['metronomeBridge']['clampMetronomeVolumePercent'];
  setMetronomeVolume: MetronomeDeps['metronomeBridge']['setMetronomeVolume'];
  clampMetronomeBpm: MetronomeDeps['metronome']['clampMetronomeBpm'];
  startMetronome: MetronomeDeps['metronome']['startMetronome'];
  stopMetronome: MetronomeDeps['metronome']['stopMetronome'];
  setMetronomeTempo: MetronomeDeps['metronome']['setMetronomeTempo'];
  subscribeMetronomeBeat: MetronomeDeps['metronome']['subscribeMetronomeBeat'];
  isMetronomeRunning: MetronomeDeps['melodyTempo']['isMetronomeRunning'];
  getSelectedMelody: MetronomeDeps['melodyTempo']['getSelectedMelody'];
  syncMelodyDemoBpmDisplay: MetronomeDeps['melodyTempo']['syncMelodyDemoBpmDisplay'];
  syncMetronomeMeterFromSelectedMelody: MetronomeDeps['melodyTempo']['syncMetronomeMeterFromSelectedMelody'];
  isMelodyDemoPlaying: MetronomeDeps['melodyTempo']['isMelodyDemoPlaying'];
  getClampedMetronomeBpmFromInput: CurriculumPresetDeps['curriculumPreset']['getClampedMetronomeBpmFromInput'];
  ensureAudioRuntime: InputControlsDeps['micSettings']['ensureAudioRuntime'];
  refreshAudioInputDeviceOptions: InputControlsDeps['micSettings']['refreshAudioInputDeviceOptions'];
  refreshMicPolyphonicDetectorAudioInfoUi: InputControlsDeps['micSettings']['refreshMicPolyphonicDetectorAudioInfoUi'];
  formatUserFacingError: InputControlsDeps['micSettings']['formatUserFacingError'];
  showNonBlockingError: InputControlsDeps['micSettings']['showNonBlockingError'];
  normalizeAudioInputDeviceId: InputControlsDeps['inputDevice']['normalizeAudioInputDeviceId'];
  setPreferredAudioInputDeviceId: InputControlsDeps['inputDevice']['setPreferredAudioInputDeviceId'];
  normalizeInputSource: InputControlsDeps['inputDevice']['normalizeInputSource'];
  setInputSourcePreference: InputControlsDeps['inputDevice']['setInputSourcePreference'];
  refreshMidiInputDevices: InputControlsDeps['inputDevice']['refreshMidiInputDevices'];
  normalizeMidiInputDeviceId: InputControlsDeps['inputDevice']['normalizeMidiInputDeviceId'];
  setPreferredMidiInputDeviceId: InputControlsDeps['inputDevice']['setPreferredMidiInputDeviceId'];
  stopMelodyDemoPlayback: InputControlsDeps['inputDevice']['stopMelodyDemoPlayback'];
  updateMicNoiseGateInfo: InputControlsDeps['inputDevice']['updateMicNoiseGateInfo'];
  detectMicPolyphonicFrame: InputControlsDeps['micPolyphonicBenchmark']['detectMicPolyphonicFrame'];
  nowPerformance: InputControlsDeps['micPolyphonicBenchmark']['now'];
  nowDate: InputControlsDeps['micPolyphonicTelemetry']['now'];
  getUserAgent: InputControlsDeps['micPolyphonicTelemetry']['getUserAgent'];
  getHardwareConcurrency: InputControlsDeps['micPolyphonicTelemetry']['getHardwareConcurrency'];
  getAnalyserSampleRate: InputControlsDeps['micPolyphonicTelemetry']['getAnalyserSampleRate'];
  getAnalyserFftSize: InputControlsDeps['micPolyphonicTelemetry']['getAnalyserFftSize'];
  downloadTextFile: InputControlsDeps['micPolyphonicTelemetry']['downloadTextFile'];
  resetTelemetry: InputControlsDeps['micPolyphonicTelemetry']['resetTelemetry'];
}

export function buildSessionConfigurationGraphDeps(
  args: SessionConfigurationGraphDepsBuilderArgs
): ConfigurationGraphDeps {
  return {
    metronome: {
      metronome: {
        dom: {
          trainingMode: args.dom.trainingMode,
          metronomeEnabled: args.dom.metronomeEnabled,
          metronomeBpm: args.dom.melodyDemoBpm,
          metronomeBpmValue: args.dom.melodyDemoBpmValue,
          metronomeBeatLabel: args.dom.metronomeBeatLabel,
          metronomePulse: args.dom.metronomePulse,
        },
        clampMetronomeBpm: args.clampMetronomeBpm,
        startMetronome: args.startMetronome,
        stopMetronome: args.stopMetronome,
        setMetronomeTempo: args.setMetronomeTempo,
        subscribeMetronomeBeat: args.subscribeMetronomeBeat,
        saveSettings: args.saveSettings,
        formatUserFacingError: args.formatUserFacingError,
        showNonBlockingError: args.showNonBlockingError,
      },
      melodyTempo: {
        dom: {
          trainingMode: args.dom.trainingMode,
          metronomeEnabled: args.dom.metronomeEnabled,
          metronomeBpm: args.dom.metronomeBpm,
          metronomeBpmValue: args.dom.metronomeBpmValue,
          metronomeToggleBtn: args.dom.metronomeToggleBtn,
          melodyDemoBpm: args.dom.melodyDemoBpm,
          melodyTimelineZoom: args.dom.melodyTimelineZoom,
          melodyTimelineZoomValue: args.dom.melodyTimelineZoomValue,
          scrollingTabZoom: args.dom.scrollingTabZoom,
          scrollingTabZoomValue: args.dom.scrollingTabZoomValue,
        },
        state: args.state,
        getSelectedMelody: args.getSelectedMelody,
        syncMelodyDemoBpmDisplay: args.syncMelodyDemoBpmDisplay,
        syncMetronomeMeterFromSelectedMelody: args.syncMetronomeMeterFromSelectedMelody,
        startMetronome: args.startMetronome,
        stopMetronome: args.stopMetronome,
        setMetronomeTempo: args.setMetronomeTempo,
        isMetronomeRunning: args.isMetronomeRunning,
        showNonBlockingError: args.showNonBlockingError,
        formatUserFacingError: args.formatUserFacingError,
        isMelodyDemoPlaying: args.isMelodyDemoPlaying,
        isMelodyWorkflowMode: args.isMelodyWorkflowMode,
        isPerformanceStyleMode: args.isPerformanceStyleMode,
      },
      metronomeBridge: {
        dom: {
          metronomeVolume: args.dom.metronomeVolume,
          metronomeVolumeValue: args.dom.metronomeVolumeValue,
        },
        clampMetronomeVolumePercent: args.clampMetronomeVolumePercent,
        setMetronomeVolume: args.setMetronomeVolume,
      },
      metronomeControls: {
        dom: {
          metronomeToggleBtn: args.dom.metronomeToggleBtn,
          metronomeEnabled: args.dom.metronomeEnabled,
          metronomeBpm: args.dom.metronomeBpm,
          metronomeVolume: args.dom.metronomeVolume,
        },
        saveSettings: args.saveSettings,
      },
    },
    curriculumPreset: {
      curriculumPreset: {
        dom: {
          curriculumPreset: args.dom.curriculumPreset,
          curriculumPresetInfo: args.dom.curriculumPresetInfo,
          sessionGoal: args.dom.sessionGoal,
          scaleSelector: args.dom.scaleSelector,
          chordSelector: args.dom.chordSelector,
          progressionSelector: args.dom.progressionSelector,
          arpeggioPatternSelector: args.dom.arpeggioPatternSelector,
          rhythmTimingWindow: args.dom.rhythmTimingWindow,
          metronomeEnabled: args.dom.metronomeEnabled,
          metronomeBpm: args.dom.melodyDemoBpm,
          showAllNotes: args.dom.showAllNotes,
          trainingMode: args.dom.trainingMode,
          difficulty: args.dom.difficulty,
          startFret: args.dom.startFret,
          endFret: args.dom.endFret,
        },
        state: args.state,
        getClampedMetronomeBpmFromInput: args.getClampedMetronomeBpmFromInput,
        applyEnabledStrings: (enabledStrings) => {
          const enabled = new Set(enabledStrings);
          args.dom.stringSelector.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            const checkbox = input as HTMLInputElement;
            checkbox.checked = enabled.has(checkbox.value);
          });
        },
        handleModeChange: args.handleModeChange,
        redrawFretboard: args.redrawFretboard,
        saveSettings: args.saveSettings,
        setResultMessage: args.setResultMessage,
        isListening: () => args.state.isListening,
        stopListening: args.stopListening,
      },
    },
    inputControls: {
      micSettings: {
        dom: {
          micNoiseGateInfo: args.dom.micNoiseGateInfo,
          micSensitivityPreset: args.dom.micSensitivityPreset,
          micNoteAttackFilter: args.dom.micNoteAttackFilter,
          micNoteHoldFilter: args.dom.micNoteHoldFilter,
          micPolyphonicDetectorProvider: args.dom.micPolyphonicDetectorProvider,
          calibrateNoiseFloorBtn: args.dom.calibrateNoiseFloorBtn,
        },
        state: args.state,
        ensureAudioRuntime: args.ensureAudioRuntime,
        refreshAudioInputDeviceOptions: args.refreshAudioInputDeviceOptions,
        refreshMicPolyphonicDetectorAudioInfoUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
        refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
        saveSettings: args.saveSettings,
        setResultMessage: args.setResultMessage,
        formatUserFacingError: args.formatUserFacingError,
        showNonBlockingError: args.showNonBlockingError,
      },
      inputDevice: {
        dom: args.dom,
        state: args.state,
        normalizeAudioInputDeviceId: args.normalizeAudioInputDeviceId,
        setPreferredAudioInputDeviceId: args.setPreferredAudioInputDeviceId,
        normalizeInputSource: args.normalizeInputSource,
        setInputSourcePreference: args.setInputSourcePreference,
        refreshMidiInputDevices: args.refreshMidiInputDevices,
        normalizeMidiInputDeviceId: args.normalizeMidiInputDeviceId,
        setPreferredMidiInputDeviceId: args.setPreferredMidiInputDeviceId,
        stopMelodyDemoPlayback: args.stopMelodyDemoPlayback,
        stopListening: args.stopListening,
        saveSettings: args.saveSettings,
        updateMicNoiseGateInfo: args.updateMicNoiseGateInfo,
        refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
        setResultMessage: args.setResultMessage,
      },
      micPolyphonicBenchmark: {
        dom: {
          runMicPolyphonicBenchmarkBtn: args.dom.runMicPolyphonicBenchmarkBtn,
          micPolyphonicBenchmarkInfo: args.dom.micPolyphonicBenchmarkInfo,
        },
        state: args.state,
        detectMicPolyphonicFrame: args.detectMicPolyphonicFrame,
        now: args.nowPerformance,
        setResultMessage: args.setResultMessage,
        showNonBlockingError: args.showNonBlockingError,
        formatUserFacingError: args.formatUserFacingError,
      },
      micPolyphonicTelemetry: {
        dom: {
          exportMicPolyphonicTelemetryBtn: args.dom.exportMicPolyphonicTelemetryBtn,
          resetMicPolyphonicTelemetryBtn: args.dom.resetMicPolyphonicTelemetryBtn,
        },
        state: args.state,
        now: args.nowDate,
        getUserAgent: args.getUserAgent,
        getHardwareConcurrency: args.getHardwareConcurrency,
        getAnalyserSampleRate: args.getAnalyserSampleRate,
        getAnalyserFftSize: args.getAnalyserFftSize,
        downloadTextFile: args.downloadTextFile,
        resetTelemetry: args.resetTelemetry,
        refreshTelemetryUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
        setResultMessage: args.setResultMessage,
        showNonBlockingError: args.showNonBlockingError,
        formatUserFacingError: args.formatUserFacingError,
      },
      audioInputControls: {
        dom: args.dom,
      },
    },
    workspaceGraph: {
      dom: args.dom,
      state: args.state,
      saveSettings: args.saveSettings,
      handleModeChange: args.handleModeChange,
      stopListening: args.stopListening,
      refreshDisplayFormatting: args.refreshDisplayFormatting,
      setNoteNamingPreference: args.setNoteNamingPreference,
      resolveInstrumentById: (instrumentId) => instruments[instrumentId],
      redrawFretboard: args.redrawFretboard,
      updateInstrumentUI: args.updateInstrumentUI,
      loadInstrumentSoundfont: args.loadInstrumentSoundfont,
      renderMelodyTabTimelineFromState: args.renderMelodyTabTimelineFromState,
      setPracticeSetupSummary: args.setPracticeSetupSummary,
      setSessionToolsSummary: args.setSessionToolsSummary,
      setMelodySetupSummary: args.setMelodySetupSummary,
      setPracticeSetupCollapsed: args.setPracticeSetupCollapsed,
      setMelodySetupCollapsed: args.setMelodySetupCollapsed,
      setSessionToolsCollapsed: args.setSessionToolsCollapsed,
      setLayoutControlsExpanded: args.setLayoutControlsExpanded,
      toggleLayoutControlsExpanded: args.toggleLayoutControlsExpanded,
      setUiWorkflow: args.setUiWorkflow,
      setUiMode: args.setUiMode,
      setResultMessage: args.setResultMessage,
      refreshLayoutControlsVisibility: args.refreshLayoutControlsVisibility,
      refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
      getEnabledStringsCount: args.getEnabledStringsCount,
      getEnabledStrings: args.getEnabledStrings,
      listMelodiesForCurrentInstrument: args.listMelodiesForCurrentInstrument,
      getAdjustedMelody: args.getAdjustedMelody,
      isStringShiftFeasible: args.isStringShiftFeasible,
      isDefaultStudyRange: args.isDefaultStudyRange,
      isMelodyWorkflowMode: args.isMelodyWorkflowMode,
      isCustomMelodyId: args.isCustomMelodyId,
      formatMelodyStudyRange: args.formatMelodyStudyRange,
      formatMelodyTransposeSemitones: args.formatMelodyTransposeSemitones,
      formatMelodyStringShift: args.formatMelodyStringShift,
      normalizeMelodyTransposeSemitones: args.normalizeMelodyTransposeSemitones,
      normalizeMelodyStringShift: args.normalizeMelodyStringShift,
      hasCompletedOnboarding: args.hasCompletedOnboarding,
      confirmUserAction: args.confirmUserAction,
    },
  };
}
