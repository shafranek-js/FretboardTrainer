import { dom } from './dom';
import { state } from './state';
import type { MidiNoteEvent } from './midi-runtime';
import { createSessionLifecycleRuntimeGraphCluster } from './session-lifecycle-runtime-graph-cluster';

type SessionLifecycleRuntimeGraphDeps = Parameters<typeof createSessionLifecycleRuntimeGraphCluster>[0];

interface SessionLifecycleRuntimeGraphDepsBuilderArgs {
  dom: SessionLifecycleRuntimeGraphDeps['dom'];
  state: SessionLifecycleRuntimeGraphDeps['state'];
  timedDurationSeconds: SessionLifecycleRuntimeGraphDeps['timedDurationSeconds'];
  captureMicPerformanceLatencyCalibrationState: SessionLifecycleRuntimeGraphDeps['captureMicPerformanceLatencyCalibrationState'];
  restoreMicPerformanceLatencyCalibrationState: SessionLifecycleRuntimeGraphDeps['restoreMicPerformanceLatencyCalibrationState'];
  flushPendingStatsSave: SessionLifecycleRuntimeGraphDeps['flushPendingStatsSave'];
  saveLastSessionStats: SessionLifecycleRuntimeGraphDeps['saveLastSessionStats'];
  saveLastSessionAnalysisBundle: SessionLifecycleRuntimeGraphDeps['saveLastSessionAnalysisBundle'];
  savePerformanceStarResults: SessionLifecycleRuntimeGraphDeps['savePerformanceStarResults'];
  displayStats: SessionLifecycleRuntimeGraphDeps['displayStats'];
  displaySessionSummary: SessionLifecycleRuntimeGraphDeps['displaySessionSummary'];
  stopMetronome: SessionLifecycleRuntimeGraphDeps['stopMetronome'];
  clearTrackedTimeouts: SessionLifecycleRuntimeGraphDeps['clearTrackedTimeouts'];
  stopMidiInput: SessionLifecycleRuntimeGraphDeps['stopMidiInput'];
  teardownAudioRuntime: SessionLifecycleRuntimeGraphDeps['teardownAudioRuntime'];
  setStatusText: SessionLifecycleRuntimeGraphDeps['setStatusText'];
  setTunerVisible: SessionLifecycleRuntimeGraphDeps['setTunerVisible'];
  updateTuner: SessionLifecycleRuntimeGraphDeps['updateTuner'];
  setVolumeLevel: SessionLifecycleRuntimeGraphDeps['setVolumeLevel'];
  resetSessionButtonsState: SessionLifecycleRuntimeGraphDeps['resetSessionButtonsState'];
  setPromptText: SessionLifecycleRuntimeGraphDeps['setPromptText'];
  clearResultMessage: SessionLifecycleRuntimeGraphDeps['clearResultMessage'];
  clearSessionGoalProgress: SessionLifecycleRuntimeGraphDeps['clearSessionGoalProgress'];
  setInfoSlots: SessionLifecycleRuntimeGraphDeps['setInfoSlots'];
  setTimedInfoVisible: SessionLifecycleRuntimeGraphDeps['setTimedInfoVisible'];
  createSessionStopResetState: SessionLifecycleRuntimeGraphDeps['createSessionStopResetState'];
  refreshMicPolyphonicDetectorAudioInfoUi: SessionLifecycleRuntimeGraphDeps['refreshMicPolyphonicDetectorAudioInfoUi'];
  refreshMicPerformanceReadinessUi: SessionLifecycleRuntimeGraphDeps['refreshMicPerformanceReadinessUi'];
  redrawFretboard: SessionLifecycleRuntimeGraphDeps['redrawFretboard'];
  scheduleMelodyTimelineRenderFromState: SessionLifecycleRuntimeGraphDeps['scheduleMelodyTimelineRenderFromState'];
  normalizeInputSource: SessionLifecycleRuntimeGraphDeps['normalizeInputSource'];
  setInputSourcePreference: SessionLifecycleRuntimeGraphDeps['setInputSourcePreference'];
  clearAudioInputGuidanceError: SessionLifecycleRuntimeGraphDeps['clearAudioInputGuidanceError'];
  createMidiSessionMessageHandler: SessionLifecycleRuntimeGraphDeps['createMidiSessionMessageHandler'];
  startMidiInput: SessionLifecycleRuntimeGraphDeps['startMidiInput'];
  ensureAudioRuntime: SessionLifecycleRuntimeGraphDeps['ensureAudioRuntime'];
  refreshAudioInputDeviceOptions: SessionLifecycleRuntimeGraphDeps['refreshAudioInputDeviceOptions'];
  isPerformanceStyleMode: SessionLifecycleRuntimeGraphDeps['isPerformanceStyleMode'];
  buildSessionStartPlan: SessionLifecycleRuntimeGraphDeps['buildSessionStartPlan'];
  setSessionButtonsState: SessionLifecycleRuntimeGraphDeps['setSessionButtonsState'];
  setTimerValue: SessionLifecycleRuntimeGraphDeps['setTimerValue'];
  setScoreValue: SessionLifecycleRuntimeGraphDeps['setScoreValue'];
  createTimedSessionIntervalHandler: SessionLifecycleRuntimeGraphDeps['createTimedSessionIntervalHandler'];
  getSelectedFretRange: SessionLifecycleRuntimeGraphDeps['getSelectedFretRange'];
  getEnabledStrings: SessionLifecycleRuntimeGraphDeps['getEnabledStrings'];
  executeSessionRuntimeActivation: SessionLifecycleRuntimeGraphDeps['executeSessionRuntimeActivation'];
  setResultMessage: SessionLifecycleRuntimeGraphDeps['setResultMessage'];
  playMetronomeCue: SessionLifecycleRuntimeGraphDeps['playMetronomeCue'];
  scheduleSessionTimeout: SessionLifecycleRuntimeGraphDeps['scheduleSessionTimeout'];
  showNonBlockingError: SessionLifecycleRuntimeGraphDeps['showNonBlockingError'];
  formatUserFacingError: SessionLifecycleRuntimeGraphDeps['formatUserFacingError'];
  setAudioInputGuidanceError: SessionLifecycleRuntimeGraphDeps['setAudioInputGuidanceError'];
  buildPerformancePromptForEvent: SessionLifecycleRuntimeGraphDeps['buildPerformancePromptForEvent'];
  buildSessionNextPromptPlan: SessionLifecycleRuntimeGraphDeps['buildSessionNextPromptPlan'];
  executeSessionNextPromptPlan: SessionLifecycleRuntimeGraphDeps['executeSessionNextPromptPlan'];
  recordSessionAttempt: SessionLifecycleRuntimeGraphDeps['recordSessionAttempt'];
  updateStats: SessionLifecycleRuntimeGraphDeps['updateStats'];
  setSessionGoalProgress: SessionLifecycleRuntimeGraphDeps['setSessionGoalProgress'];
  scheduleSessionCooldown: SessionLifecycleRuntimeGraphDeps['scheduleSessionCooldown'];
  saveStats: SessionLifecycleRuntimeGraphDeps['saveStats'];
  drawFretboard: SessionLifecycleRuntimeGraphDeps['drawFretboard'];
  isMelodyWorkflowMode: SessionLifecycleRuntimeGraphDeps['isMelodyWorkflowMode'];
  getCurrentModeDetectionType: SessionLifecycleRuntimeGraphDeps['getCurrentModeDetectionType'];
  handleSessionRuntimeError: SessionLifecycleRuntimeGraphDeps['onRuntimeError'];
  getModeDetectionType: SessionLifecycleRuntimeGraphDeps['getModeDetectionType'];
  getMode: SessionLifecycleRuntimeGraphDeps['getMode'];
  performanceTransportRuntimeController: {
    stopLoop: SessionLifecycleRuntimeGraphDeps['stopPerformanceTransportLoop'];
    startRuntimeClock: SessionLifecycleRuntimeGraphDeps['startRuntimeClock'];
    beginPrerollTimeline: SessionLifecycleRuntimeGraphDeps['beginPrerollTimeline'];
    advancePrerollTimeline: SessionLifecycleRuntimeGraphDeps['advancePrerollTimeline'];
    finishPrerollTimeline: SessionLifecycleRuntimeGraphDeps['finishPrerollTimeline'];
    syncPromptEventFromRuntime: SessionLifecycleRuntimeGraphDeps['syncPromptEventFromRuntime'];
  };
  performancePromptController: {
    invalidatePendingAdvance: SessionLifecycleRuntimeGraphDeps['invalidatePendingAdvance'];
    scheduleAdvance: SessionLifecycleRuntimeGraphDeps['schedulePerformancePromptAdvance'];
    resetPromptResolution: SessionLifecycleRuntimeGraphDeps['resetPromptResolution'];
  };
  micMonophonicAttackTrackingController: {
    reset: SessionLifecycleRuntimeGraphDeps['resetAttackTracking'];
    syncPromptTransition: SessionLifecycleRuntimeGraphDeps['syncPromptTransition'];
  };
  micPerformanceRuntimeStatusController: {
    resetPolyphonicDetectorTelemetry: SessionLifecycleRuntimeGraphDeps['resetMicPolyphonicDetectorTelemetry'];
    resetReadinessAndJudgmentTelemetry: SessionLifecycleRuntimeGraphDeps['resetReadinessAndJudgmentTelemetry'];
  };
  performanceMicTelemetryController: {
    resetOnsetGateStatus: SessionLifecycleRuntimeGraphDeps['resetOnsetGateStatus'];
    resetOnsetRejectTelemetry: SessionLifecycleRuntimeGraphDeps['resetOnsetRejectTelemetry'];
  };
  performanceTimelineFeedbackController: {
    clearFeedback: SessionLifecycleRuntimeGraphDeps['clearPerformanceTimelineFeedback'];
  };
  performanceAdaptiveRuntimeController: {
    resolveSessionMicHoldCalibrationLevel: SessionLifecycleRuntimeGraphDeps['resolveSessionMicHoldCalibrationLevel'];
  };
  melodyRuntimeDetectionController: {
    handleMidiMelodyUpdate: (event: MidiNoteEvent) => void;
  };
  polyphonicChordDetectionController: {
    handleMidiChordUpdate: (event: MidiNoteEvent) => void;
  };
  detectedNoteFeedbackRuntimeController: {
    clearWrongDetectedHighlight: SessionLifecycleRuntimeGraphDeps['clearWrongDetectedHighlight'];
  };
  stableMonophonicDetectionController: {
    handleDetectedNote: SessionLifecycleRuntimeGraphDeps['handleStableMonophonicDetectedNote'];
  };
  sessionPromptRuntimeController: {
    applyInitialTimelinePreview: SessionLifecycleRuntimeGraphDeps['applyInitialTimelinePreview'];
    clearInitialTimelinePreview: SessionLifecycleRuntimeGraphDeps['clearInitialTimelinePreview'];
    configurePromptAudio: SessionLifecycleRuntimeGraphDeps['configurePromptAudio'];
  };
  syncMetronomeToPromptStart: SessionLifecycleRuntimeGraphDeps['syncMetronomeToPromptStart'];
  processAudio: SessionLifecycleRuntimeGraphDeps['processAudio'];
  clearLiveDetectedHighlight: SessionLifecycleRuntimeGraphDeps['clearLiveDetectedHighlight'];
  resetPromptCycleTracking: SessionLifecycleRuntimeGraphDeps['resetPromptCycleTracking'];
  requestSessionSummaryOnStop: SessionLifecycleRuntimeGraphDeps['requestSessionSummaryOnStop'];
  warn: SessionLifecycleRuntimeGraphDeps['warn'];
}

export function buildSessionLifecycleRuntimeGraphDeps(
  args: SessionLifecycleRuntimeGraphDepsBuilderArgs
): SessionLifecycleRuntimeGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    timedDurationSeconds: args.timedDurationSeconds,
    captureMicPerformanceLatencyCalibrationState: args.captureMicPerformanceLatencyCalibrationState,
    restoreMicPerformanceLatencyCalibrationState: args.restoreMicPerformanceLatencyCalibrationState,
    flushPendingStatsSave: args.flushPendingStatsSave,
    saveLastSessionStats: args.saveLastSessionStats,
    saveLastSessionAnalysisBundle: args.saveLastSessionAnalysisBundle,
    savePerformanceStarResults: args.savePerformanceStarResults,
    displayStats: args.displayStats,
    displaySessionSummary: args.displaySessionSummary,
    stopMetronome: args.stopMetronome,
    stopPerformanceTransportLoop: () => args.performanceTransportRuntimeController.stopLoop(),
    clearTrackedTimeouts: args.clearTrackedTimeouts,
    invalidatePendingAdvance: () => args.performancePromptController.invalidatePendingAdvance(),
    resetAttackTracking: () => args.micMonophonicAttackTrackingController.reset(),
    resetMicPolyphonicDetectorTelemetry: () => args.micPerformanceRuntimeStatusController.resetPolyphonicDetectorTelemetry(),
    stopMidiInput: args.stopMidiInput,
    teardownAudioRuntime: args.teardownAudioRuntime,
    setStatusText: args.setStatusText,
    setTunerVisible: args.setTunerVisible,
    updateTuner: args.updateTuner,
    setVolumeLevel: args.setVolumeLevel,
    resetSessionButtonsState: args.resetSessionButtonsState,
    setPromptText: args.setPromptText,
    clearResultMessage: args.clearResultMessage,
    clearSessionGoalProgress: args.clearSessionGoalProgress,
    setInfoSlots: args.setInfoSlots,
    setTimedInfoVisible: args.setTimedInfoVisible,
    createSessionStopResetState: args.createSessionStopResetState,
    refreshMicPolyphonicDetectorAudioInfoUi: args.refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi: args.refreshMicPerformanceReadinessUi,
    redrawFretboard: args.redrawFretboard,
    scheduleMelodyTimelineRenderFromState: args.scheduleMelodyTimelineRenderFromState,
    normalizeInputSource: args.normalizeInputSource,
    setInputSourcePreference: args.setInputSourcePreference,
    resolveSessionMicHoldCalibrationLevel: (input) =>
      args.performanceAdaptiveRuntimeController.resolveSessionMicHoldCalibrationLevel(input),
    resetReadinessAndJudgmentTelemetry: () =>
      args.micPerformanceRuntimeStatusController.resetReadinessAndJudgmentTelemetry(),
    resetOnsetGateStatus: () => args.performanceMicTelemetryController.resetOnsetGateStatus(),
    resetOnsetRejectTelemetry: () => args.performanceMicTelemetryController.resetOnsetRejectTelemetry(),
    clearPerformanceTimelineFeedback: () => args.performanceTimelineFeedbackController.clearFeedback(),
    clearAudioInputGuidanceError: args.clearAudioInputGuidanceError,
    createMidiSessionMessageHandler: args.createMidiSessionMessageHandler,
    startMidiInput: args.startMidiInput,
    ensureAudioRuntime: args.ensureAudioRuntime,
    refreshAudioInputDeviceOptions: args.refreshAudioInputDeviceOptions,
    isPerformanceStyleMode: args.isPerformanceStyleMode,
    getCurrentModeDetectionType: args.getCurrentModeDetectionType,
    handleMelodyUpdate: (event) => args.melodyRuntimeDetectionController.handleMidiMelodyUpdate(event),
    handlePolyphonicUpdate: (event) => args.polyphonicChordDetectionController.handleMidiChordUpdate(event),
    clearLiveDetectedHighlight: args.clearLiveDetectedHighlight,
    clearWrongDetectedHighlight: () => args.detectedNoteFeedbackRuntimeController.clearWrongDetectedHighlight(),
    handleStableMonophonicDetectedNote: (detectedNote, detectedFrequency) =>
      args.stableMonophonicDetectionController.handleDetectedNote(detectedNote, detectedFrequency),
    onRuntimeError: args.handleSessionRuntimeError,
    warn: args.warn,
    getModeDetectionType: args.getModeDetectionType,
    buildSessionStartPlan: args.buildSessionStartPlan,
    setSessionButtonsState: args.setSessionButtonsState,
    setTimerValue: args.setTimerValue,
    setScoreValue: args.setScoreValue,
    createTimedSessionIntervalHandler: args.createTimedSessionIntervalHandler,
    onStartRuntimeError: args.handleSessionRuntimeError,
    getSelectedFretRange: args.getSelectedFretRange,
    getEnabledStrings: args.getEnabledStrings,
    executeSessionRuntimeActivation: args.executeSessionRuntimeActivation,
    resetPromptCycleTracking: args.resetPromptCycleTracking,
    processAudio: args.processAudio,
    setResultMessage: args.setResultMessage,
    applyInitialTimelinePreview: (previewLabel) => args.sessionPromptRuntimeController.applyInitialTimelinePreview(previewLabel),
    clearInitialTimelinePreview: () => args.sessionPromptRuntimeController.clearInitialTimelinePreview(),
    startRuntimeClock: (targetEventIndex) => args.performanceTransportRuntimeController.startRuntimeClock(targetEventIndex),
    beginPrerollTimeline: (pulseCount, delayMs) => args.performanceTransportRuntimeController.beginPrerollTimeline(pulseCount, delayMs),
    advancePrerollTimeline: (pulseIndex, pulseCount) =>
      args.performanceTransportRuntimeController.advancePrerollTimeline(pulseIndex, pulseCount),
    finishPrerollTimeline: () => args.performanceTransportRuntimeController.finishPrerollTimeline(),
    playMetronomeCue: args.playMetronomeCue,
    scheduleSessionTimeout: args.scheduleSessionTimeout,
    showNonBlockingError: args.showNonBlockingError,
    formatUserFacingError: args.formatUserFacingError,
    setAudioInputGuidanceError: args.setAudioInputGuidanceError,
    getMode: args.getMode,
    syncPromptEventFromRuntime: () => args.performanceTransportRuntimeController.syncPromptEventFromRuntime(),
    buildPerformancePromptForEvent: args.buildPerformancePromptForEvent,
    buildSessionNextPromptPlan: args.buildSessionNextPromptPlan,
    executeSessionNextPromptPlan: args.executeSessionNextPromptPlan,
    requestSessionSummaryOnStop: args.requestSessionSummaryOnStop,
    syncPromptTransition: (previousPrompt, nextPrompt) =>
      args.micMonophonicAttackTrackingController.syncPromptTransition(previousPrompt, nextPrompt),
    configurePromptAudio: () => args.sessionPromptRuntimeController.configurePromptAudio(),
    syncMetronomeToPromptStart: args.syncMetronomeToPromptStart,
    schedulePerformancePromptAdvance: (prompt) => args.performancePromptController.scheduleAdvance(prompt),
    recordSessionAttempt: args.recordSessionAttempt,
    updateStats: args.updateStats,
    setSessionGoalProgress: args.setSessionGoalProgress,
    scheduleSessionCooldown: args.scheduleSessionCooldown,
    saveStats: args.saveStats,
    resetPromptResolution: () => args.performancePromptController.resetPromptResolution(),
    drawFretboard: args.drawFretboard,
    isMelodyWorkflowMode: args.isMelodyWorkflowMode,
  };
}

