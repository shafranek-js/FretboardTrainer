import { createSessionDetectionRuntimeGraphCluster } from './session-detection-runtime-graph-cluster';

type SessionDetectionRuntimeGraphDeps = Parameters<typeof createSessionDetectionRuntimeGraphCluster>[0];

interface SessionDetectionRuntimeGraphDepsBuilderArgs {
  dom: SessionDetectionRuntimeGraphDeps['dom'];
  state: SessionDetectionRuntimeGraphDeps['state'];
  recordSessionAttempt: SessionDetectionRuntimeGraphDeps['recordSessionAttempt'];
  redrawFretboard: SessionDetectionRuntimeGraphDeps['redrawFretboard'];
  drawFretboard: SessionDetectionRuntimeGraphDeps['drawFretboard'];
  setResultMessage: SessionDetectionRuntimeGraphDeps['setResultMessage'];
  scheduleSessionCooldown: SessionDetectionRuntimeGraphDeps['scheduleSessionCooldown'];
  freqToScientificNoteName: SessionDetectionRuntimeGraphDeps['freqToScientificNoteName'];
  detectPitch: SessionDetectionRuntimeGraphDeps['detectPitch'];
  noteResolver: SessionDetectionRuntimeGraphDeps['noteResolver'];
  detectMonophonicFrame: SessionDetectionRuntimeGraphDeps['detectMonophonicFrame'];
  buildAudioMonophonicReactionPlan: SessionDetectionRuntimeGraphDeps['buildAudioMonophonicReactionPlan'];
  executeAudioMonophonicReaction: SessionDetectionRuntimeGraphDeps['executeAudioMonophonicReaction'];
  updateTuner: SessionDetectionRuntimeGraphDeps['updateTuner'];
  resolveMicNoteAttackRequiredPeak: SessionDetectionRuntimeGraphDeps['resolveMicNoteAttackRequiredPeak'];
  shouldAcceptMicNoteByAttackStrength: SessionDetectionRuntimeGraphDeps['shouldAcceptMicNoteByAttackStrength'];
  resolveMicNoteHoldRequiredDurationMs: SessionDetectionRuntimeGraphDeps['resolveMicNoteHoldRequiredDurationMs'];
  shouldAcceptMicNoteByHoldDuration: SessionDetectionRuntimeGraphDeps['shouldAcceptMicNoteByHoldDuration'];
  resolvePerformanceMicJudgingThresholds: SessionDetectionRuntimeGraphDeps['resolvePerformanceMicJudgingThresholds'];
  shouldReportPerformanceMicUncertainFrame: SessionDetectionRuntimeGraphDeps['shouldReportPerformanceMicUncertainFrame'];
  resolveLatencyCompensatedPromptStartedAtMs: SessionDetectionRuntimeGraphDeps['resolveLatencyCompensatedPromptStartedAtMs'];
  isMelodyWorkflowMode: SessionDetectionRuntimeGraphDeps['isMelodyWorkflowMode'];
  isPerformanceStyleMode: SessionDetectionRuntimeGraphDeps['isPerformanceStyleMode'];
  isPolyphonicMelodyPrompt: SessionDetectionRuntimeGraphDeps['isPolyphonicMelodyPrompt'];
  resolveMicVolumeThreshold: SessionDetectionRuntimeGraphDeps['resolveMicVolumeThreshold'];
  resolveStudyMelodyMicVolumeThreshold: SessionDetectionRuntimeGraphDeps['resolveStudyMelodyMicVolumeThreshold'];
  resolvePerformanceMicVolumeThreshold: SessionDetectionRuntimeGraphDeps['resolvePerformanceMicVolumeThreshold'];
  resolvePerformanceSilenceResetAfterFrames: SessionDetectionRuntimeGraphDeps['resolvePerformanceSilenceResetAfterFrames'];
  resolveEffectiveStudyMelodySilenceResetFrames: SessionDetectionRuntimeGraphDeps['resolveEffectiveStudyMelodySilenceResetFrames'];
  resolveEffectiveStudyMelodyStableFrames: SessionDetectionRuntimeGraphDeps['resolveEffectiveStudyMelodyStableFrames'];
  resolvePerformanceRequiredStableFrames: SessionDetectionRuntimeGraphDeps['resolvePerformanceRequiredStableFrames'];
  buildProcessAudioFramePreflightPlan: SessionDetectionRuntimeGraphDeps['buildProcessAudioFramePreflightPlan'];
  defaultRequiredStableFrames: SessionDetectionRuntimeGraphDeps['defaultRequiredStableFrames'];
  calibrationSamples: SessionDetectionRuntimeGraphDeps['calibrationSamples'];
  detectCalibrationFrame: SessionDetectionRuntimeGraphDeps['detectCalibrationFrame'];
  buildCalibrationFrameReactionPlan: SessionDetectionRuntimeGraphDeps['buildCalibrationFrameReactionPlan'];
  executeCalibrationFrameReaction: SessionDetectionRuntimeGraphDeps['executeCalibrationFrameReaction'];
  setCalibrationProgress: SessionDetectionRuntimeGraphDeps['setCalibrationProgress'];
  finishCalibration: SessionDetectionRuntimeGraphDeps['finishCalibration'];
  requiredStableFrames: SessionDetectionRuntimeGraphDeps['requiredStableFrames'];
  getModeDetectionType: SessionDetectionRuntimeGraphDeps['getModeDetectionType'];
  now: SessionDetectionRuntimeGraphDeps['now'];
  performanceNow: SessionDetectionRuntimeGraphDeps['performanceNow'];
  performanceTimelineFeedbackController: {
    recordWrongAttempt: SessionDetectionRuntimeGraphDeps['recordPerformanceTimelineWrongAttempt'];
  };
  detectedNoteFeedbackRuntimeController: {
    clearWrongDetectedHighlight: SessionDetectionRuntimeGraphDeps['clearWrongDetectedHighlight'];
    setWrongDetectedHighlight: SessionDetectionRuntimeGraphDeps['setWrongDetectedHighlight'];
    detectMonophonicOctaveMismatch: SessionDetectionRuntimeGraphDeps['detectMonophonicOctaveMismatch'];
  };
  performanceMicTelemetryController: {
    recordPromptAttempt: SessionDetectionRuntimeGraphDeps['markPerformancePromptAttempt'];
    recordCaptureFrame: SessionDetectionRuntimeGraphDeps['recordCaptureFrame'];
    recordStableDetection: SessionDetectionRuntimeGraphDeps['recordStableDetection'];
    recordUncertainFrame: SessionDetectionRuntimeGraphDeps['recordUncertainFrame'];
    setOnsetGateStatus: SessionDetectionRuntimeGraphDeps['setOnsetGateStatus'];
    resolveUncertainReasonKey: SessionDetectionRuntimeGraphDeps['resolveUncertainReasonKey'];
  };
  performancePromptController: {
    markPromptAttempt: SessionDetectionRuntimeGraphDeps['markPerformancePromptAttempt'];
    resolveSuccess: SessionDetectionRuntimeGraphDeps['performanceResolveSuccess'];
  };
  performanceAdaptiveRuntimeController: {
    updateTimingBiasFromGrade: (timingGrade: unknown) => void;
    resolveEffectiveRuntimeMicHoldCalibrationLevel: SessionDetectionRuntimeGraphDeps['resolveEffectiveRuntimeMicHoldCalibrationLevel'];
  };
  micPerformanceRuntimeStatusController: {
    recordJudgmentLatency: SessionDetectionRuntimeGraphDeps['recordPerformanceMicJudgmentLatency'];
    refreshReadinessUiThrottled: SessionDetectionRuntimeGraphDeps['refreshReadinessUiThrottled'];
    updatePolyphonicDetectorRuntimeStatus: SessionDetectionRuntimeGraphDeps['updateMicPolyphonicDetectorRuntimeStatus'];
  };
  micMonophonicAttackTrackingController: {
    update: SessionDetectionRuntimeGraphDeps['updateAttackTracking'];
    clearFreshAttackGuard: SessionDetectionRuntimeGraphDeps['clearFreshAttackGuard'];
    markSilenceDuringFreshAttackWait: SessionDetectionRuntimeGraphDeps['markSilenceDuringFreshAttackWait'];
    reset: SessionDetectionRuntimeGraphDeps['resetAttackTracking'];
  };
  rhythmModeRuntimeController: {
    handleStableNote: SessionDetectionRuntimeGraphDeps['handleRhythmModeStableNote'];
  };
  displayResult: SessionDetectionRuntimeGraphDeps['displayResult'];
  clearLiveDetectedHighlight: SessionDetectionRuntimeGraphDeps['clearFreeHighlight'];
  updateFreePlayLiveHighlight: SessionDetectionRuntimeGraphDeps['updateFreePlayLiveHighlight'];
  detectMicPolyphonicFrame: SessionDetectionRuntimeGraphDeps['detectMicPolyphonicFrame'];
  isPerformancePitchWithinTolerance: SessionDetectionRuntimeGraphDeps['isPerformancePitchWithinTolerance'];
  markPerformanceMicOnsetJudged: SessionDetectionRuntimeGraphDeps['markPerformanceMicOnsetJudged'];
  resetStabilityTracking: SessionDetectionRuntimeGraphDeps['resetStabilityTracking'];
}

export function buildSessionDetectionRuntimeGraphDeps(
  args: SessionDetectionRuntimeGraphDepsBuilderArgs
): SessionDetectionRuntimeGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    recordSessionAttempt: args.recordSessionAttempt,
    recordPerformanceTimelineWrongAttempt: (note) => args.performanceTimelineFeedbackController.recordWrongAttempt(note),
    redrawFretboard: args.redrawFretboard,
    drawFretboard: args.drawFretboard,
    setResultMessage: args.setResultMessage,
    scheduleSessionCooldown: args.scheduleSessionCooldown,
    clearWrongDetectedHighlight: () => args.detectedNoteFeedbackRuntimeController.clearWrongDetectedHighlight(),
    setWrongDetectedHighlight: (detectedNote, detectedFrequency) =>
      args.detectedNoteFeedbackRuntimeController.setWrongDetectedHighlight(detectedNote, detectedFrequency),
    markPerformancePromptAttempt: () => {
      args.performanceMicTelemetryController.recordPromptAttempt();
      args.performancePromptController.markPromptAttempt();
    },
    markPerformanceMicOnsetJudged: args.markPerformanceMicOnsetJudged,
    recordPerformanceMicJudgmentLatency: (onsetAtMs, judgedAtMs) =>
      args.micPerformanceRuntimeStatusController.recordJudgmentLatency(onsetAtMs, judgedAtMs),
    isPerformancePitchWithinTolerance: args.isPerformancePitchWithinTolerance,
    detectMonophonicOctaveMismatch: (detectedNote, detectedFrequency) =>
      args.detectedNoteFeedbackRuntimeController.detectMonophonicOctaveMismatch(detectedNote, detectedFrequency),
    performanceResolveSuccess: (elapsedSeconds, timingGrade) => {
      args.performanceAdaptiveRuntimeController.updateTimingBiasFromGrade(timingGrade ?? null);
      args.performancePromptController.resolveSuccess(elapsedSeconds, timingGrade ?? null);
    },
    displayResult: args.displayResult,
    handleRhythmModeStableNote: (detectedNote) => args.rhythmModeRuntimeController.handleStableNote(detectedNote),
    updateFreePlayLiveHighlight: args.updateFreePlayLiveHighlight,
    freqToScientificNoteName: args.freqToScientificNoteName,
    detectPitch: args.detectPitch,
    noteResolver: args.noteResolver,
    detectMonophonicFrame: args.detectMonophonicFrame,
    buildAudioMonophonicReactionPlan: args.buildAudioMonophonicReactionPlan,
    executeAudioMonophonicReaction: args.executeAudioMonophonicReaction,
    updateTuner: args.updateTuner,
    refreshReadinessUiThrottled: (nowMs) => args.micPerformanceRuntimeStatusController.refreshReadinessUiThrottled(nowMs),
    recordCaptureFrame: (input) => args.performanceMicTelemetryController.recordCaptureFrame(input),
    recordStableDetection: () => args.performanceMicTelemetryController.recordStableDetection(),
    recordUncertainFrame: (reason) => args.performanceMicTelemetryController.recordUncertainFrame(reason),
    setOnsetGateStatus: (status, text, options) => args.performanceMicTelemetryController.setOnsetGateStatus(status, text, options),
    resolveUncertainReasonKey: (input) => args.performanceMicTelemetryController.resolveUncertainReasonKey(input),
    resolveEffectiveRuntimeMicHoldCalibrationLevel: (enabled) =>
      args.performanceAdaptiveRuntimeController.resolveEffectiveRuntimeMicHoldCalibrationLevel(enabled),
    updateAttackTracking: (detectedNote, volume) => args.micMonophonicAttackTrackingController.update(detectedNote, volume),
    clearFreshAttackGuard: (event) => args.micMonophonicAttackTrackingController.clearFreshAttackGuard(event),
    resolveMicNoteAttackRequiredPeak: args.resolveMicNoteAttackRequiredPeak,
    shouldAcceptMicNoteByAttackStrength: args.shouldAcceptMicNoteByAttackStrength,
    resolveMicNoteHoldRequiredDurationMs: args.resolveMicNoteHoldRequiredDurationMs,
    shouldAcceptMicNoteByHoldDuration: args.shouldAcceptMicNoteByHoldDuration,
    resolvePerformanceMicJudgingThresholds: args.resolvePerformanceMicJudgingThresholds,
    shouldReportPerformanceMicUncertainFrame: args.shouldReportPerformanceMicUncertainFrame,
    resolveLatencyCompensatedPromptStartedAtMs: args.resolveLatencyCompensatedPromptStartedAtMs,
    getModeDetectionType: args.getModeDetectionType,
    isMelodyWorkflowMode: args.isMelodyWorkflowMode,
    isPerformanceStyleMode: args.isPerformanceStyleMode,
    isPolyphonicMelodyPrompt: args.isPolyphonicMelodyPrompt,
    resetStabilityTracking: args.resetStabilityTracking,
    clearFreeHighlight: args.clearLiveDetectedHighlight,
    markSilenceDuringFreshAttackWait: () => args.micMonophonicAttackTrackingController.markSilenceDuringFreshAttackWait(),
    resetAttackTracking: () => args.micMonophonicAttackTrackingController.reset(),
    resolveMicVolumeThreshold: args.resolveMicVolumeThreshold,
    resolveStudyMelodyMicVolumeThreshold: args.resolveStudyMelodyMicVolumeThreshold,
    resolvePerformanceMicVolumeThreshold: args.resolvePerformanceMicVolumeThreshold,
    resolvePerformanceSilenceResetAfterFrames: args.resolvePerformanceSilenceResetAfterFrames,
    resolveEffectiveStudyMelodySilenceResetFrames: args.resolveEffectiveStudyMelodySilenceResetFrames,
    resolveEffectiveStudyMelodyStableFrames: args.resolveEffectiveStudyMelodyStableFrames,
    resolvePerformanceRequiredStableFrames: args.resolvePerformanceRequiredStableFrames,
    buildProcessAudioFramePreflightPlan: args.buildProcessAudioFramePreflightPlan,
    defaultRequiredStableFrames: args.defaultRequiredStableFrames,
    calibrationSamples: args.calibrationSamples,
    detectCalibrationFrame: args.detectCalibrationFrame,
    buildCalibrationFrameReactionPlan: args.buildCalibrationFrameReactionPlan,
    executeCalibrationFrameReaction: args.executeCalibrationFrameReaction,
    setCalibrationProgress: args.setCalibrationProgress,
    finishCalibration: args.finishCalibration,
    requiredStableFrames: args.requiredStableFrames,
    detectMicPolyphonicFrame: args.detectMicPolyphonicFrame,
    updateMicPolyphonicDetectorRuntimeStatus: (result, latencyMs) =>
      args.micPerformanceRuntimeStatusController.updatePolyphonicDetectorRuntimeStatus(result, latencyMs),
    now: args.now,
    performanceNow: args.performanceNow,
  };
}
