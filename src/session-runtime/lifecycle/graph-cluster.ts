import { dom } from '../../dom';
import type { AppState } from '../../state';
import { createSessionLifecycleRuntimeCluster } from '../../session-lifecycle-runtime-cluster';
import type { MidiNoteEvent } from '../../midi-runtime';
import type { MicPerformanceLatencyCalibrationState } from '../../mic-performance-latency-calibration-state';
import type { Prompt } from '../../types';
import type { PerformanceTimingGrade } from '../../performance-timing-grade';
import type { DetectionType } from '../../modes/training-mode';

type SessionLifecycleRuntimeClusterDeps = Parameters<typeof createSessionLifecycleRuntimeCluster>[0];
type StopState = SessionLifecycleRuntimeClusterDeps['stop']['state'];
type InputState = SessionLifecycleRuntimeClusterDeps['input']['state'];
type StartState = SessionLifecycleRuntimeClusterDeps['start']['state'];
type ActivationState = SessionLifecycleRuntimeClusterDeps['activation']['state'];
type StartErrorState = SessionLifecycleRuntimeClusterDeps['startError']['state'];
type NextPromptState = SessionLifecycleRuntimeClusterDeps['nextPrompt']['state'];
type DisplayResultState = SessionLifecycleRuntimeClusterDeps['displayResult']['state'];
type TimeUpState = SessionLifecycleRuntimeClusterDeps['timeUp']['state'];
type SeekState = SessionLifecycleRuntimeClusterDeps['seek']['state'];
type LifecycleGraphState =
  StopState &
  InputState &
  StartState &
  ActivationState &
  StartErrorState &
  NextPromptState &
  DisplayResultState &
  TimeUpState &
  SeekState;

interface SessionLifecycleRuntimeGraphClusterDeps {
  dom: Pick<typeof dom,
    | 'trainingMode'
    | 'inputSource'
    | 'melodySelector'
    | 'melodyDemoBpm'
    | 'melodyStudyStart'
    | 'melodyStudyEnd'
    | 'audioInputDevice'
    | 'midiInputDevice'
    | 'melodyTabTimelineGrid'
    | 'progressionSelector'
    | 'sessionGoal'
    | 'startFret'
    | 'endFret'
    | 'stringSelector'>;
  state: LifecycleGraphState;
  timedDurationSeconds: number;
  captureMicPerformanceLatencyCalibrationState: () => MicPerformanceLatencyCalibrationState;
  restoreMicPerformanceLatencyCalibrationState: (captured: MicPerformanceLatencyCalibrationState) => void;
  flushPendingStatsSave: typeof import('../../storage').flushPendingStatsSave;
  saveLastSessionStats: typeof import('../../storage').saveLastSessionStats;
  saveLastSessionAnalysisBundle: typeof import('../../storage').saveLastSessionAnalysisBundle;
  savePerformanceStarResults: typeof import('../../storage').savePerformanceStarResults;
  displayStats: typeof import('../../ui').displayStats;
  displaySessionSummary: typeof import('../../ui').displaySessionSummary;
  stopMetronome: typeof import('../../metronome').stopMetronome;
  stopPerformanceTransportLoop: () => void;
  clearTrackedTimeouts: typeof import('../../session-timeouts').clearTrackedTimeouts;
  invalidatePendingAdvance: () => void;
  resetAttackTracking: () => void;
  resetMicPolyphonicDetectorTelemetry: () => void;
  stopMidiInput: typeof import('../../midi-runtime').stopMidiInput;
  teardownAudioRuntime: () => void;
  setStatusText: (text: string) => void;
  setTunerVisible: (isVisible: boolean) => void;
  updateTuner: typeof import('../../ui').updateTuner;
  setVolumeLevel: (volume: number) => void;
  resetSessionButtonsState: () => void;
  setPromptText: (text: string) => void;
  clearResultMessage: () => void;
  clearSessionGoalProgress: () => void;
  setInfoSlots: (slot1?: string, slot2?: string, slot3?: string) => void;
  setTimedInfoVisible: (visible: boolean) => void;
  createSessionStopResetState: typeof import('../../session-reset-state').createSessionStopResetState;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  refreshMicPerformanceReadinessUi: (nowMs?: number) => void;
  redrawFretboard: () => void;
  scheduleMelodyTimelineRenderFromState: () => void;
  normalizeInputSource: typeof import('../../midi-runtime').normalizeInputSource;
  setInputSourcePreference: typeof import('../../midi-runtime').setInputSourcePreference;
  resolveSessionMicHoldCalibrationLevel: (input: { trainingMode: string; inputSource: 'microphone' | 'midi' }) => AppState['performanceMicHoldCalibrationLevel'];
  resetReadinessAndJudgmentTelemetry: () => void;
  resetOnsetGateStatus: () => void;
  resetOnsetRejectTelemetry: () => void;
  clearPerformanceTimelineFeedback: () => void;
  clearAudioInputGuidanceError: () => void;
  createMidiSessionMessageHandler: typeof import('../../midi-session-message-handler').createMidiSessionMessageHandler;
  startMidiInput: typeof import('../../midi-runtime').startMidiInput;
  ensureAudioRuntime: (runtimeState: InputState, options: { audioInputDeviceId: string | null; analyserProfile: 'default' | 'low-latency-performance' }) => Promise<void>;
  refreshAudioInputDeviceOptions: typeof import('../../audio-input-devices').refreshAudioInputDeviceOptions;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getCurrentModeDetectionType: () => DetectionType | null;
  handleMelodyUpdate: (event: MidiNoteEvent) => void;
  handlePolyphonicUpdate: (event: MidiNoteEvent) => void;
  clearLiveDetectedHighlight: () => void;
  clearWrongDetectedHighlight: () => void;
  handleStableMonophonicDetectedNote: (detectedNote: string, detectedFrequency?: number | null) => void;
  onRuntimeError: (context: string, error: unknown) => void;
  warn: (message: string, error: unknown) => void;
  getModeDetectionType: (trainingMode: string) => DetectionType | null;
  buildSessionStartPlan: typeof import('../../session-start-preflight').buildSessionStartPlan;
  setSessionButtonsState: (buttons: Partial<{ startDisabled: boolean; stopDisabled: boolean; hintDisabled: boolean; playSoundDisabled: boolean }>) => void;
  setTimerValue: (timerValue: number | string) => void;
  setScoreValue: (scoreValue: number | string) => void;
  createTimedSessionIntervalHandler: typeof import('../../timed-session-interval-handler').createTimedSessionIntervalHandler;
  onStartRuntimeError: (context: string, error: unknown) => void;
  getSelectedFretRange: typeof import('../../fretboard-ui-state').getSelectedFretRange;
  getEnabledStrings: typeof import('../../fretboard-ui-state').getEnabledStrings;
  executeSessionRuntimeActivation: typeof import('../../session-runtime-activation-executor').executeSessionRuntimeActivation;
  resetPromptCycleTracking: () => void;
  processAudio: () => void;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  applyInitialTimelinePreview: (previewLabel: string) => void;
  clearInitialTimelinePreview: () => void;
  startRuntimeClock: (targetEventIndex?: number) => void;
  beginPrerollTimeline: (pulseCount: number, delayMs: number) => void;
  advancePrerollTimeline: (pulseIndex: number, pulseCount: number) => void;
  finishPrerollTimeline: () => void;
  playMetronomeCue: typeof import('../../metronome').playMetronomeCue;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => number;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  setAudioInputGuidanceError: (message: string) => void;
  getMode: (trainingMode: string) => typeof import('../../modes').modes[string] | null;
  syncPromptEventFromRuntime: () => {
    context: {
      melody: Parameters<typeof import('../../modes/melody-performance').buildPerformancePromptForEvent>[0]['melody'];
      studyRange: Parameters<typeof import('../../modes/melody-performance').buildPerformancePromptForEvent>[0]['studyRange'];
      bpm: number;
    } | null;
    activeEventIndex: number | null;
  };
  buildPerformancePromptForEvent: typeof import('../../modes/melody-performance').buildPerformancePromptForEvent;
  buildSessionNextPromptPlan: typeof import('../../session-next-prompt-plan').buildSessionNextPromptPlan;
  executeSessionNextPromptPlan: typeof import('../../session-next-prompt-executor').executeSessionNextPromptPlan;
  requestSessionSummaryOnStop: () => void;
  syncPromptTransition: (previousPrompt: Prompt | null, nextPrompt: Prompt | null) => void;
  configurePromptAudio: () => void;
  syncMetronomeToPromptStart: () => Promise<void>;
  schedulePerformancePromptAdvance: (prompt: Prompt) => void;
  recordSessionAttempt: typeof import('../../session-stats').recordSessionAttempt;
  updateStats: (correct: boolean, elapsedSeconds: number) => void;
  setSessionGoalProgress: (text: string) => void;
  scheduleSessionCooldown: (context: string, delayMs: number, callback: () => void) => void;
  saveStats: typeof import('../../storage').saveStats;
  resetPromptResolution: () => void;
  drawFretboard: typeof import('../../ui').drawFretboard;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
}

export function createSessionLifecycleRuntimeGraphCluster(deps: SessionLifecycleRuntimeGraphClusterDeps) {
  const stopState = createStopState(deps.state);
  const inputState = createInputState(deps.state);
  const startState = createStartState(deps.state);
  const activationState = createActivationState(deps.state);
  const startErrorState = createStartErrorState(deps.state);
  const nextPromptState = createNextPromptState(deps.state);
  const displayResultState = createDisplayResultState(deps.state);
  const timeUpState = createTimeUpState(deps.state);
  const seekState = createSeekState(deps.state);

  return createSessionLifecycleRuntimeCluster({
    stop: {
      dom: {
        melodySelector: deps.dom.melodySelector,
        melodyDemoBpm: deps.dom.melodyDemoBpm,
        melodyStudyStart: deps.dom.melodyStudyStart,
        melodyStudyEnd: deps.dom.melodyStudyEnd,
        audioInputDevice: deps.dom.audioInputDevice,
        midiInputDevice: deps.dom.midiInputDevice,
        melodyTabTimelineGrid: deps.dom.melodyTabTimelineGrid,
      },
      state: stopState,
      captureMicPerformanceLatencyCalibrationState: deps.captureMicPerformanceLatencyCalibrationState,
      restoreMicPerformanceLatencyCalibrationState: deps.restoreMicPerformanceLatencyCalibrationState,
      flushPendingStatsSave: deps.flushPendingStatsSave,
      saveLastSessionStats: deps.saveLastSessionStats,
      saveLastSessionAnalysisBundle: deps.saveLastSessionAnalysisBundle,
      savePerformanceStarResults: deps.savePerformanceStarResults,
      displayStats: deps.displayStats,
      displaySessionSummary: deps.displaySessionSummary,
      stopMetronome: deps.stopMetronome,
      cancelAnimationFrame: (handle) => cancelAnimationFrame(handle),
      stopPerformanceTransportLoop: deps.stopPerformanceTransportLoop,
      clearTrackedTimeouts: deps.clearTrackedTimeouts,
      invalidatePendingAdvance: deps.invalidatePendingAdvance,
      clearInterval: (handle) => clearInterval(handle),
      resetAttackTracking: deps.resetAttackTracking,
      resetMicPolyphonicDetectorTelemetry: deps.resetMicPolyphonicDetectorTelemetry,
      stopMidiInput: deps.stopMidiInput,
      teardownAudioRuntime: deps.teardownAudioRuntime,
      setStatusText: deps.setStatusText,
      setTunerVisible: deps.setTunerVisible,
      updateTuner: deps.updateTuner,
      setVolumeLevel: deps.setVolumeLevel,
      resetSessionButtonsState: deps.resetSessionButtonsState,
      setPromptText: deps.setPromptText,
      clearResultMessage: deps.clearResultMessage,
      clearSessionGoalProgress: deps.clearSessionGoalProgress,
      setInfoSlots: deps.setInfoSlots,
      setTimedInfoVisible: deps.setTimedInfoVisible,
      createSessionStopResetState: deps.createSessionStopResetState,
      refreshMicPolyphonicDetectorAudioInfoUi: deps.refreshMicPolyphonicDetectorAudioInfoUi,
      refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
      redrawFretboard: deps.redrawFretboard,
      scheduleMelodyTimelineRenderFromState: deps.scheduleMelodyTimelineRenderFromState,
    },
    input: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        inputSource: deps.dom.inputSource,
        melodySelector: deps.dom.melodySelector,
      },
      state: inputState,
      normalizeInputSource: deps.normalizeInputSource,
      setInputSourcePreference: deps.setInputSourcePreference,
      resolveSessionMicHoldCalibrationLevel: deps.resolveSessionMicHoldCalibrationLevel,
      resetReadinessAndJudgmentTelemetry: deps.resetReadinessAndJudgmentTelemetry,
      resetOnsetGateStatus: deps.resetOnsetGateStatus,
      resetOnsetRejectTelemetry: deps.resetOnsetRejectTelemetry,
      clearPerformanceTimelineFeedback: deps.clearPerformanceTimelineFeedback,
      resetMicPolyphonicDetectorTelemetry: deps.resetMicPolyphonicDetectorTelemetry,
      clearAudioInputGuidanceError: deps.clearAudioInputGuidanceError,
      refreshMicPolyphonicDetectorAudioInfoUi: deps.refreshMicPolyphonicDetectorAudioInfoUi,
      refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
      createMidiSessionMessageHandler: deps.createMidiSessionMessageHandler,
      startMidiInput: deps.startMidiInput,
      ensureAudioRuntime: deps.ensureAudioRuntime,
      refreshAudioInputDeviceOptions: deps.refreshAudioInputDeviceOptions,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      getCurrentModeDetectionType: deps.getCurrentModeDetectionType,
      handleMelodyUpdate: deps.handleMelodyUpdate,
      handlePolyphonicUpdate: deps.handlePolyphonicUpdate,
      clearLiveDetectedHighlight: deps.clearLiveDetectedHighlight,
      handleStableMonophonicDetectedNote: deps.handleStableMonophonicDetectedNote,
      onRuntimeError: deps.onRuntimeError,
      warn: deps.warn,
    },
    start: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        progressionSelector: deps.dom.progressionSelector,
        melodySelector: deps.dom.melodySelector,
        sessionGoal: deps.dom.sessionGoal,
      },
      state: startState,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      stopPerformanceTransportLoop: deps.stopPerformanceTransportLoop,
      clearTrackedTimeouts: deps.clearTrackedTimeouts,
      invalidatePendingAdvance: deps.invalidatePendingAdvance,
      getModeDetectionType: deps.getModeDetectionType,
      timedDurationSeconds: deps.timedDurationSeconds,
      buildSessionStartPlan: deps.buildSessionStartPlan,
      setSessionButtonsState: deps.setSessionButtonsState,
      setTimerValue: deps.setTimerValue,
      setScoreValue: deps.setScoreValue,
      setTimedInfoVisible: deps.setTimedInfoVisible,
      clearSessionGoalProgress: deps.clearSessionGoalProgress,
      createTimedSessionIntervalHandler: deps.createTimedSessionIntervalHandler,
      setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
      onRuntimeError: deps.onStartRuntimeError,
      setSessionGoalProgress: deps.setSessionGoalProgress,
    },
    activation: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        melodySelector: deps.dom.melodySelector,
        melodyDemoBpm: deps.dom.melodyDemoBpm,
        startFret: deps.dom.startFret,
        endFret: deps.dom.endFret,
        stringSelector: deps.dom.stringSelector,
        audioInputDevice: deps.dom.audioInputDevice,
        midiInputDevice: deps.dom.midiInputDevice,
      },
      state: activationState,
      getSelectedFretRange: deps.getSelectedFretRange,
      getEnabledStrings: deps.getEnabledStrings,
      executeSessionRuntimeActivation: deps.executeSessionRuntimeActivation,
      setIsListening: (value) => {
        deps.state.isListening = value;
      },
      setActiveSessionStats: (sessionStats) => {
        deps.state.activeSessionStats = sessionStats;
      },
      resetPromptCycleTracking: deps.resetPromptCycleTracking,
      setStatusText: deps.setStatusText,
      processAudio: deps.processAudio,
      setPromptText: deps.setPromptText,
      setResultMessage: deps.setResultMessage,
      clearResultMessage: deps.clearResultMessage,
      applyInitialTimelinePreview: deps.applyInitialTimelinePreview,
      clearInitialTimelinePreview: deps.clearInitialTimelinePreview,
      startRuntimeClock: () => deps.startRuntimeClock(),
      beginPrerollTimeline: deps.beginPrerollTimeline,
      advancePrerollTimeline: deps.advancePrerollTimeline,
      finishPrerollTimeline: deps.finishPrerollTimeline,
      playMetronomeCue: deps.playMetronomeCue,
      scheduleSessionTimeout: deps.scheduleSessionTimeout,
      showNonBlockingError: deps.showNonBlockingError,
      formatUserFacingError: deps.formatUserFacingError,
    },
    startError: {
      state: startErrorState,
      setAudioInputGuidanceError: deps.setAudioInputGuidanceError,
      refreshMicPolyphonicDetectorAudioInfoUi: deps.refreshMicPolyphonicDetectorAudioInfoUi,
      showNonBlockingError: deps.showNonBlockingError,
      formatUserFacingError: deps.formatUserFacingError,
    },
    nextPrompt: {
      state: nextPromptState,
      getTrainingMode: () => deps.dom.trainingMode.value,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      startRuntimeClock: () => deps.startRuntimeClock(),
      clearResultMessage: deps.clearResultMessage,
      resetAttackTracking: deps.resetAttackTracking,
      resetPromptCycleTracking: deps.resetPromptCycleTracking,
      getMode: deps.getMode,
      syncPromptEventFromRuntime: deps.syncPromptEventFromRuntime,
      buildPerformancePromptForEvent: deps.buildPerformancePromptForEvent,
      buildSessionNextPromptPlan: deps.buildSessionNextPromptPlan,
      executeSessionNextPromptPlan: deps.executeSessionNextPromptPlan,
      requestSessionSummaryOnStop: deps.requestSessionSummaryOnStop,
      showError: deps.showNonBlockingError,
      updateTuner: deps.updateTuner,
      setTunerVisible: deps.setTunerVisible,
      syncPromptTransition: deps.syncPromptTransition,
      setPromptText: deps.setPromptText,
      redrawFretboard: deps.redrawFretboard,
      scheduleTimelineRender: deps.scheduleMelodyTimelineRenderFromState,
      configurePromptAudio: deps.configurePromptAudio,
      syncMetronomeToPromptStart: deps.syncMetronomeToPromptStart,
      schedulePerformancePromptAdvance: deps.schedulePerformancePromptAdvance,
      setResultMessage: deps.setResultMessage,
    },
    displayResult: {
      dom: {
        sessionGoal: deps.dom.sessionGoal,
      },
      state: displayResultState,
      getTrainingMode: () => deps.dom.trainingMode.value,
      getMode: deps.getMode,
      recordSessionAttempt: deps.recordSessionAttempt,
      updateStats: deps.updateStats,
      setInfoSlots: deps.setInfoSlots,
      setSessionGoalProgress: deps.setSessionGoalProgress,
      setResultMessage: deps.setResultMessage,
      setScoreValue: deps.setScoreValue,
      setTunerVisible: deps.setTunerVisible,
      redrawFretboard: deps.redrawFretboard,
      drawFretboard: deps.drawFretboard,
      scheduleSessionTimeout: deps.scheduleSessionTimeout,
      scheduleSessionCooldown: deps.scheduleSessionCooldown,
    },
    timeUp: {
      state: timeUpState,
      clearInterval: (handle) => clearInterval(handle),
      saveStats: deps.saveStats,
      setResultMessage: deps.setResultMessage,
    },
    seek: {
      state: seekState,
      getTrainingMode: () => deps.dom.trainingMode.value,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      clearTrackedTimeouts: deps.clearTrackedTimeouts,
      invalidatePendingAdvance: deps.invalidatePendingAdvance,
      clearPerformanceTimelineFeedback: deps.clearPerformanceTimelineFeedback,
      resetPromptResolution: deps.resetPromptResolution,
      clearWrongDetectedHighlight: deps.clearWrongDetectedHighlight,
      startRuntimeClock: deps.startRuntimeClock,
    },
  });
}

function createStopState(state: LifecycleGraphState): StopState {
  return {
    activeSessionStats: state.activeSessionStats,
    animationId: state.animationId,
    cooldown: state.cooldown,
    ignorePromptAudioUntilMs: state.ignorePromptAudioUntilMs,
    inputSource: state.inputSource,
    isCalibrating: state.isCalibrating,
    isDirectInputMode: state.isDirectInputMode,
    isListening: state.isListening,
    isLoadingSamples: state.isLoadingSamples,
    lastMicPolyphonicDetectorFallbackFrom: state.lastMicPolyphonicDetectorFallbackFrom,
    lastMicPolyphonicDetectorProviderUsed: state.lastMicPolyphonicDetectorProviderUsed,
    lastMicPolyphonicDetectorWarning: state.lastMicPolyphonicDetectorWarning,
    lastSessionAnalysisAutoDownloadKey: state.lastSessionAnalysisAutoDownloadKey,
    lastSessionAnalysisBundle: state.lastSessionAnalysisBundle,
    lastSessionPerformanceNoteLog: state.lastSessionPerformanceNoteLog,
    lastSessionStats: state.lastSessionStats,
    micLastInputRms: state.micLastInputRms,
    micLastMonophonicConfidence: state.micLastMonophonicConfidence,
    micLastMonophonicDetectedAtMs: state.micLastMonophonicDetectedAtMs,
    micLastMonophonicPitchSpreadCents: state.micLastMonophonicPitchSpreadCents,
    micNoteAttackFilterPreset: state.micNoteAttackFilterPreset,
    micNoteHoldFilterPreset: state.micNoteHoldFilterPreset,
    micPerformanceJudgmentCount: state.micPerformanceJudgmentCount,
    micPerformanceJudgmentLastLatencyMs: state.micPerformanceJudgmentLastLatencyMs,
    micPerformanceJudgmentTotalLatencyMs: state.micPerformanceJudgmentTotalLatencyMs,
    micPerformanceOnsetGateAtMs: state.micPerformanceOnsetGateAtMs,
    micPerformanceOnsetGateReason: state.micPerformanceOnsetGateReason,
    micPerformanceOnsetGateStatus: state.micPerformanceOnsetGateStatus,
    micPerformanceOnsetRejectedLowConfidenceCount: state.micPerformanceOnsetRejectedLowConfidenceCount,
    micPerformanceOnsetRejectedLowVoicingCount: state.micPerformanceOnsetRejectedLowVoicingCount,
    micPerformanceOnsetRejectedShortHoldCount: state.micPerformanceOnsetRejectedShortHoldCount,
    micPerformanceOnsetRejectedWeakAttackCount: state.micPerformanceOnsetRejectedWeakAttackCount,
    micPerformanceReadinessLastUiRefreshAtMs: state.micPerformanceReadinessLastUiRefreshAtMs,
    micPerformanceSuggestedLatencyMs: state.micPerformanceSuggestedLatencyMs,
    micPolyphonicDetectorProvider: state.micPolyphonicDetectorProvider,
    micPolyphonicDetectorTelemetryFallbackFrames: state.micPolyphonicDetectorTelemetryFallbackFrames,
    micPolyphonicDetectorTelemetryFrames: state.micPolyphonicDetectorTelemetryFrames,
    micPolyphonicDetectorTelemetryLastLatencyMs: state.micPolyphonicDetectorTelemetryLastLatencyMs,
    micPolyphonicDetectorTelemetryMaxLatencyMs: state.micPolyphonicDetectorTelemetryMaxLatencyMs,
    micPolyphonicDetectorTelemetryTotalLatencyMs: state.micPolyphonicDetectorTelemetryTotalLatencyMs,
    micPolyphonicDetectorTelemetryWarningFrames: state.micPolyphonicDetectorTelemetryWarningFrames,
    micPolyphonicDetectorTelemetryWindowStartedAtMs: state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
    pendingTimeoutIds: state.pendingTimeoutIds,
    performanceCaptureTelemetryByEvent: state.performanceCaptureTelemetryByEvent,
    performanceMicLatencyCompensationMs: state.performanceMicLatencyCompensationMs,
    performanceOnsetRejectsByEvent: state.performanceOnsetRejectsByEvent,
    performanceRunCompleted: state.performanceRunCompleted,
    performanceStarsByRunKey: state.performanceStarsByRunKey,
    performanceTimelineFeedbackByEvent: state.performanceTimelineFeedbackByEvent,
    performanceTimelineFeedbackKey: state.performanceTimelineFeedbackKey,
    performanceTimingBiasMs: state.performanceTimingBiasMs,
    performanceTimingByEvent: state.performanceTimingByEvent,
    performanceTimingLeniencyPreset: state.performanceTimingLeniencyPreset,
    performanceTransportAnimationId: state.performanceTransportAnimationId,
    performanceMicTolerancePreset: state.performanceMicTolerancePreset,
    requestedAudioInputContentHint: state.requestedAudioInputContentHint,
    activeAudioInputTrackContentHint: state.activeAudioInputTrackContentHint,
    activeAudioInputTrackSettings: state.activeAudioInputTrackSettings,
    showSessionSummaryOnStop: state.showSessionSummaryOnStop,
    timerId: state.timerId,
    micSensitivityPreset: state.micSensitivityPreset,
  };
}

function createInputState(state: LifecycleGraphState): InputState {
  return {
    inputSource: state.inputSource,
    preferredAudioInputDeviceId: state.preferredAudioInputDeviceId,
    audioContext: state.audioContext,
    isListening: state.isListening,
    cooldown: state.cooldown,
    isCalibrating: state.isCalibrating,
    performanceMicHoldCalibrationLevel: state.performanceMicHoldCalibrationLevel,
    performanceMicLastJudgedOnsetNote: state.performanceMicLastJudgedOnsetNote,
    performanceMicLastJudgedOnsetAtMs: state.performanceMicLastJudgedOnsetAtMs,
    performanceMicLastUncertainOnsetNote: state.performanceMicLastUncertainOnsetNote,
    performanceMicLastUncertainOnsetAtMs: state.performanceMicLastUncertainOnsetAtMs,
    micLastInputRms: state.micLastInputRms,
    micLastMonophonicConfidence: state.micLastMonophonicConfidence,
    micLastMonophonicPitchSpreadCents: state.micLastMonophonicPitchSpreadCents,
    micLastMonophonicDetectedAtMs: state.micLastMonophonicDetectedAtMs,
    currentMelodyId: state.currentMelodyId,
  };
}

function createStartState(state: LifecycleGraphState): StartState {
  return {
    isCalibrating: state.isCalibrating,
    calibrationFrequencies: state.calibrationFrequencies,
    pendingTimeoutIds: state.pendingTimeoutIds,
    performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
    performancePrerollStartedAtMs: state.performancePrerollStartedAtMs,
    performancePrerollDurationMs: state.performancePrerollDurationMs,
    performancePrerollStepIndex: state.performancePrerollStepIndex,
    performanceActiveEventIndex: state.performanceActiveEventIndex,
    performanceRunCompleted: state.performanceRunCompleted,
    currentInstrument: state.currentInstrument,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
    timeLeft: state.timeLeft,
    currentScore: state.currentScore,
    timerId: state.timerId,
    currentProgression: state.currentProgression,
    currentProgressionIndex: state.currentProgressionIndex,
    currentArpeggioIndex: state.currentArpeggioIndex,
  };
}

function createActivationState(state: LifecycleGraphState): ActivationState {
  return {
    isListening: state.isListening,
    activeSessionStats: state.activeSessionStats,
    currentInstrument: state.currentInstrument,
    currentTuningPresetKey: state.currentTuningPresetKey,
    melodyStudyRangeStartIndex: state.melodyStudyRangeStartIndex,
    melodyStudyRangeEndIndex: state.melodyStudyRangeEndIndex,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
    pendingTimeoutIds: state.pendingTimeoutIds,
  };
}

function createStartErrorState(state: LifecycleGraphState): StartErrorState {
  return { inputSource: state.inputSource };
}

function createNextPromptState(state: LifecycleGraphState): NextPromptState {
  return {
    isListening: state.isListening,
    performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
    pendingSessionStopResultMessage: state.pendingSessionStopResultMessage,
    liveDetectedNote: state.liveDetectedNote,
    liveDetectedString: state.liveDetectedString,
    wrongDetectedNote: state.wrongDetectedNote,
    wrongDetectedString: state.wrongDetectedString,
    wrongDetectedFret: state.wrongDetectedFret,
    rhythmLastJudgedBeatAtMs: state.rhythmLastJudgedBeatAtMs,
    currentMelodyEventFoundNotes: state.currentMelodyEventFoundNotes,
    currentPrompt: state.currentPrompt,
    startTime: state.startTime,
  };
}

function createDisplayResultState(state: LifecycleGraphState): DisplayResultState {
  return {
    currentPrompt: state.currentPrompt,
    activeSessionStats: state.activeSessionStats,
    currentInstrument: state.currentInstrument,
    currentArpeggioIndex: state.currentArpeggioIndex,
    showingAllNotes: state.showingAllNotes,
    sessionPace: state.sessionPace,
    showSessionSummaryOnStop: state.showSessionSummaryOnStop,
    currentMelodyEventIndex: state.currentMelodyEventIndex,
    currentScore: state.currentScore,
  };
}

function createTimeUpState(state: LifecycleGraphState): TimeUpState {
  return {
    currentScore: state.currentScore,
    stats: state.stats,
    timerId: state.timerId,
    showSessionSummaryOnStop: state.showSessionSummaryOnStop,
  };
}

function createSeekState(state: LifecycleGraphState): SeekState {
  return {
    isListening: state.isListening,
    pendingTimeoutIds: state.pendingTimeoutIds,
    currentMelodyEventIndex: state.currentMelodyEventIndex,
    performanceActiveEventIndex: state.performanceActiveEventIndex,
    currentMelodyEventFoundNotes: state.currentMelodyEventFoundNotes,
    pendingSessionStopResultMessage: state.pendingSessionStopResultMessage,
  };
}
