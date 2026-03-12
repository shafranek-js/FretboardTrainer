import { dom } from './dom';
import { state } from './state';
import { createSessionDetectionRuntimeCluster } from './session-detection-runtime-cluster';
import type { DetectionType } from './modes/training-mode';
import type { MicMonophonicAttackTrackingEvent } from './mic-monophonic-attack-tracking-controller';
import type { MicPerformanceOnsetRejectReasonKey } from './session-analysis-bundle';
import type { PerformanceTimingGrade } from './performance-timing-grade';

interface SessionDetectionRuntimeGraphClusterDeps {
  dom: Pick<typeof dom, 'trainingMode'>;
  state: typeof state;
  recordSessionAttempt: typeof import('./session-stats').recordSessionAttempt;
  recordPerformanceTimelineWrongAttempt: (detectedNote: string) => void;
  redrawFretboard: typeof import('./ui').redrawFretboard;
  drawFretboard: typeof import('./ui').drawFretboard;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  scheduleSessionCooldown: (context: string, delayMs: number, callback: () => void) => void;
  clearWrongDetectedHighlight: () => void;
  setWrongDetectedHighlight: (detectedNote: string, detectedFrequency?: number | null) => void;
  markPerformancePromptAttempt: () => void;
  markPerformanceMicOnsetJudged: (detectedNote: string, onsetAtMs: number) => void;
  recordPerformanceMicJudgmentLatency: (onsetAtMs: number, judgedAtMs: number) => void;
  isPerformancePitchWithinTolerance: (detectedFrequency?: number | null) => boolean;
  detectMonophonicOctaveMismatch: (detectedNote: string, detectedFrequency?: number | null) => {
    detectedScientific: string;
    targetScientific: string;
  } | null;
  performanceResolveSuccess: (elapsedSeconds: number, timingGrade?: PerformanceTimingGrade | null) => void;
  displayResult: (correct: boolean, elapsedSeconds: number) => void;
  handleRhythmModeStableNote: (detectedNote: string) => void;
  updateFreePlayLiveHighlight: (detectedNote: string) => void;
  freqToScientificNoteName: typeof import('./audio').freqToScientificNoteName;
  detectPitch: typeof import('./audio').detectPitch;
  noteResolver: typeof import('./audio').freqToNoteName;
  detectMonophonicFrame: typeof import('./audio-detection-handlers').detectMonophonicFrame;
  buildAudioMonophonicReactionPlan: typeof import('./session-detection-reactions').buildAudioMonophonicReactionPlan;
  executeAudioMonophonicReaction: typeof import('./process-audio-reaction-executors').executeAudioMonophonicReaction;
  updateTuner: typeof import('./ui').updateTuner;
  refreshReadinessUiThrottled: (nowMs?: number) => void;
  recordCaptureFrame: (input: {
    rms: number;
    detectedNote: string | null;
    nextStableNoteCounter: number;
    requiredStableFrames: number;
    confident: boolean;
    voiced: boolean;
    attackPeak: number;
  }) => void;
  recordStableDetection: () => void;
  recordUncertainFrame: (reason: MicPerformanceOnsetRejectReasonKey | null) => void;
  setOnsetGateStatus: (
    status: 'accepted' | 'rejected',
    statusText: string,
    options?: {
      atMs?: number;
      rejectReasonKey?: 'short_hold' | 'weak_attack' | 'low_confidence' | 'low_voicing';
      onsetNote?: string;
      onsetAtMs?: number | null;
      eventDurationMs?: number | null;
      holdRequiredMs?: number;
      holdElapsedMs?: number | null;
      runtimeCalibrationLevel?: typeof state.performanceMicHoldCalibrationLevel;
    }
  ) => void;
  resolveUncertainReasonKey: (input: {
    voicingAccepted: boolean;
    confidenceAccepted: boolean;
    attackAccepted: boolean;
    holdAccepted: boolean;
  }) => MicPerformanceOnsetRejectReasonKey | null;
  resolveEffectiveRuntimeMicHoldCalibrationLevel: (performanceAdaptiveMicInput: boolean) => typeof state.performanceMicHoldCalibrationLevel;
  updateAttackTracking: (detectedNote: string | null, volume: number) => MicMonophonicAttackTrackingEvent;
  clearFreshAttackGuard: (event: MicMonophonicAttackTrackingEvent) => void;
  resolveMicNoteAttackRequiredPeak: typeof import('./mic-note-attack-filter').resolveMicNoteAttackRequiredPeak;
  shouldAcceptMicNoteByAttackStrength: typeof import('./mic-note-attack-filter').shouldAcceptMicNoteByAttackStrength;
  resolveMicNoteHoldRequiredDurationMs: typeof import('./mic-note-hold-filter').resolveMicNoteHoldRequiredDurationMs;
  shouldAcceptMicNoteByHoldDuration: typeof import('./mic-note-hold-filter').shouldAcceptMicNoteByHoldDuration;
  resolvePerformanceMicJudgingThresholds: typeof import('./performance-mic-judging-thresholds').resolvePerformanceMicJudgingThresholds;
  shouldReportPerformanceMicUncertainFrame: typeof import('./performance-mic-uncertain').shouldReportPerformanceMicUncertainFrame;
  resolveLatencyCompensatedPromptStartedAtMs: typeof import('./performance-mic-latency-compensation').resolveLatencyCompensatedPromptStartedAtMs;
  getModeDetectionType: (trainingMode: string) => DetectionType | null;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  isPolyphonicMelodyPrompt: typeof import('./melody-prompt-polyphony').isPolyphonicMelodyPrompt;
  resetStabilityTracking: () => void;
  clearFreeHighlight: () => void;
  markSilenceDuringFreshAttackWait: () => void;
  resetAttackTracking: () => void;
  resolveMicVolumeThreshold: typeof import('./mic-input-sensitivity').resolveMicVolumeThreshold;
  resolveStudyMelodyMicVolumeThreshold: typeof import('./performance-mic-volume-threshold').resolveStudyMelodyMicVolumeThreshold;
  resolvePerformanceMicVolumeThreshold: typeof import('./performance-mic-volume-threshold').resolvePerformanceMicVolumeThreshold;
  resolvePerformanceSilenceResetAfterFrames: typeof import('./performance-mic-adaptive-gating').resolvePerformanceSilenceResetAfterFrames;
  resolveEffectiveStudyMelodySilenceResetFrames: typeof import('./study-melody-mic-tuning').resolveEffectiveStudyMelodySilenceResetFrames;
  resolveEffectiveStudyMelodyStableFrames: typeof import('./study-melody-mic-tuning').resolveEffectiveStudyMelodyStableFrames;
  resolvePerformanceRequiredStableFrames: typeof import('./performance-mic-adaptive-gating').resolvePerformanceRequiredStableFrames;
  buildProcessAudioFramePreflightPlan: typeof import('./process-audio-frame-preflight').buildProcessAudioFramePreflightPlan;
  defaultRequiredStableFrames: number;
  calibrationSamples: number;
  detectCalibrationFrame: typeof import('./audio-detection-handlers').detectCalibrationFrame;
  buildCalibrationFrameReactionPlan: typeof import('./session-detection-reactions').buildCalibrationFrameReactionPlan;
  executeCalibrationFrameReaction: typeof import('./process-audio-reaction-executors').executeCalibrationFrameReaction;
  setCalibrationProgress: (progressPercent: number) => void;
  finishCalibration: () => void;
  requiredStableFrames: number;
  detectMicPolyphonicFrame: (input: {
    spectrum: Float32Array;
    timeDomainData?: Float32Array;
    frameVolumeRms: number;
    timestampMs: number;
    sampleRate: number;
    fftSize: number;
    calibratedA4: number;
    lastDetectedChord: string;
    stableChordCounter: number;
    requiredStableFrames: number;
    targetChordNotes: string[];
    provider: string;
  }) => {
    detectedNotesText: string;
    detectedNoteNames: string[];
    nextStableChordCounter: number;
    isStableMatch: boolean;
    isStableMismatch: boolean;
    fallbackFrom?: string | null;
    warnings?: string[];
  };
  updateMicPolyphonicDetectorRuntimeStatus: (result: {
    detectedNotesText: string;
    nextStableChordCounter: number;
    isStableMatch: boolean;
    isStableMismatch: boolean;
    fallbackFrom?: string | null;
    warnings?: string[];
  }, latencyMs: number) => void;
  now: () => number;
  performanceNow: () => number;
}

export function createSessionDetectionRuntimeGraphCluster(deps: SessionDetectionRuntimeGraphClusterDeps) {
  let melodyPolyphonicFeedbackController: { handleMismatch: (prompt: any, detectedText: string, context: string) => void };
  let stableMonophonicDetectionController: { handleDetectedNote: (detectedNote: string, detectedFrequency?: number | null) => void };
  let monophonicAudioFrameController: { handleFrame: (input: any) => void };
  let melodyRuntimeDetectionController: {
    handleMicrophonePolyphonicMelodyFrame: (frameVolumeRms: number) => void;
  };
  let polyphonicChordDetectionController: {
    handleAudioChordFrame: (frameVolumeRms: number) => void;
  };

  const cluster = createSessionDetectionRuntimeCluster({
    melodyPolyphonicFeedback: {
      state: deps.state,
      recordSessionAttempt: deps.recordSessionAttempt,
      recordPerformanceTimelineWrongAttempt: deps.recordPerformanceTimelineWrongAttempt,
      redrawFretboard: deps.redrawFretboard,
      drawFretboard: deps.drawFretboard,
      setResultMessage: deps.setResultMessage,
      scheduleSessionCooldown: deps.scheduleSessionCooldown,
    },
    stableMonophonicDetection: {
      state: deps.state,
      getTrainingMode: () => deps.dom.trainingMode.value,
      clearWrongDetectedHighlight: deps.clearWrongDetectedHighlight,
      setWrongDetectedHighlight: deps.setWrongDetectedHighlight,
      recordPerformanceTimelineWrongAttempt: deps.recordPerformanceTimelineWrongAttempt,
      markPerformancePromptAttempt: deps.markPerformancePromptAttempt,
      markPerformanceMicOnsetJudged: deps.markPerformanceMicOnsetJudged,
      recordPerformanceMicJudgmentLatency: deps.recordPerformanceMicJudgmentLatency,
      isPerformancePitchWithinTolerance: deps.isPerformancePitchWithinTolerance,
      detectMonophonicOctaveMismatch: deps.detectMonophonicOctaveMismatch,
      performanceResolveSuccess: deps.performanceResolveSuccess,
      handleMelodyPolyphonicMismatch: (prompt, detectedText, context) => {
        melodyPolyphonicFeedbackController.handleMismatch(prompt, detectedText, context);
      },
      displayResult: deps.displayResult,
      setResultMessage: deps.setResultMessage,
      redrawFretboard: deps.redrawFretboard,
      drawFretboard: deps.drawFretboard,
      scheduleSessionCooldown: deps.scheduleSessionCooldown,
      recordSessionAttempt: deps.recordSessionAttempt,
      handleRhythmModeStableNote: deps.handleRhythmModeStableNote,
      updateFreePlayLiveHighlight: deps.updateFreePlayLiveHighlight,
      freqToScientificNoteName: deps.freqToScientificNoteName,
    },
    monophonicAudioFrame: {
      state: deps.state,
      detectPitch: deps.detectPitch,
      noteResolver: deps.noteResolver,
      detectMonophonicFrame: deps.detectMonophonicFrame,
      buildAudioMonophonicReactionPlan: deps.buildAudioMonophonicReactionPlan,
      executeAudioMonophonicReaction: deps.executeAudioMonophonicReaction,
      updateTuner: deps.updateTuner,
      refreshReadinessUiThrottled: deps.refreshReadinessUiThrottled,
      recordCaptureFrame: deps.recordCaptureFrame,
      recordStableDetection: deps.recordStableDetection,
      recordUncertainFrame: deps.recordUncertainFrame,
      setOnsetGateStatus: deps.setOnsetGateStatus,
      resolveUncertainReasonKey: deps.resolveUncertainReasonKey,
      resolveEffectiveRuntimeMicHoldCalibrationLevel: deps.resolveEffectiveRuntimeMicHoldCalibrationLevel,
      updateAttackTracking: deps.updateAttackTracking,
      clearFreshAttackGuard: deps.clearFreshAttackGuard,
      resolveMicNoteAttackRequiredPeak: deps.resolveMicNoteAttackRequiredPeak,
      shouldAcceptMicNoteByAttackStrength: deps.shouldAcceptMicNoteByAttackStrength,
      resolveMicNoteHoldRequiredDurationMs: deps.resolveMicNoteHoldRequiredDurationMs,
      shouldAcceptMicNoteByHoldDuration: deps.shouldAcceptMicNoteByHoldDuration,
      resolvePerformanceMicJudgingThresholds: deps.resolvePerformanceMicJudgingThresholds,
      shouldReportPerformanceMicUncertainFrame: deps.shouldReportPerformanceMicUncertainFrame,
      resolveLatencyCompensatedPromptStartedAtMs: deps.resolveLatencyCompensatedPromptStartedAtMs,
      setResultMessage: deps.setResultMessage,
      handleStableDetectedNote: (detectedNote, detectedFrequency) => {
        stableMonophonicDetectionController.handleDetectedNote(detectedNote, detectedFrequency);
      },
    },
    audioFrame: {
      state: deps.state,
      getTrainingMode: () => deps.dom.trainingMode.value,
      getModeDetectionType: deps.getModeDetectionType,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      isPolyphonicMelodyPrompt: deps.isPolyphonicMelodyPrompt,
      resetStabilityTracking: deps.resetStabilityTracking,
      clearFreeHighlight: deps.clearFreeHighlight,
      updateAttackTracking: (detectedNote, volume) => {
        deps.updateAttackTracking(detectedNote, volume);
      },
      markSilenceDuringFreshAttackWait: deps.markSilenceDuringFreshAttackWait,
      resetAttackTracking: deps.resetAttackTracking,
      updateTuner: deps.updateTuner,
      resolveMicVolumeThreshold: deps.resolveMicVolumeThreshold,
      resolveStudyMelodyMicVolumeThreshold: deps.resolveStudyMelodyMicVolumeThreshold,
      resolvePerformanceMicVolumeThreshold: deps.resolvePerformanceMicVolumeThreshold,
      resolvePerformanceSilenceResetAfterFrames: deps.resolvePerformanceSilenceResetAfterFrames,
      resolveEffectiveStudyMelodySilenceResetFrames: deps.resolveEffectiveStudyMelodySilenceResetFrames,
      resolveEffectiveStudyMelodyStableFrames: deps.resolveEffectiveStudyMelodyStableFrames,
      resolvePerformanceRequiredStableFrames: deps.resolvePerformanceRequiredStableFrames,
      buildProcessAudioFramePreflightPlan: deps.buildProcessAudioFramePreflightPlan,
      handleMicrophonePolyphonicMelodyFrame: (frameVolumeRms) => {
        melodyRuntimeDetectionController.handleMicrophonePolyphonicMelodyFrame(frameVolumeRms);
      },
      handlePolyphonicChordFrame: (frameVolumeRms) => {
        polyphonicChordDetectionController.handleAudioChordFrame(frameVolumeRms);
      },
      handleMonophonicFrame: (input) => {
        monophonicAudioFrameController.handleFrame(input);
      },
      defaultRequiredStableFrames: deps.defaultRequiredStableFrames,
      calibrationSamples: deps.calibrationSamples,
      detectPitch: deps.detectPitch,
      detectCalibrationFrame: deps.detectCalibrationFrame,
      buildCalibrationFrameReactionPlan: deps.buildCalibrationFrameReactionPlan,
      executeCalibrationFrameReaction: deps.executeCalibrationFrameReaction,
      setCalibrationProgress: deps.setCalibrationProgress,
      finishCalibration: deps.finishCalibration,
    },
    melodyRuntimeDetection: {
      state: deps.state,
      requiredStableFrames: deps.requiredStableFrames,
      getTrainingMode: () => deps.dom.trainingMode.value,
      detectMicPolyphonicFrame: deps.detectMicPolyphonicFrame,
      updateMicPolyphonicDetectorRuntimeStatus: deps.updateMicPolyphonicDetectorRuntimeStatus,
      now: deps.now,
      performanceNow: deps.performanceNow,
      redrawFretboard: deps.redrawFretboard,
      setResultMessage: deps.setResultMessage,
      recordPerformanceTimelineWrongAttempt: deps.recordPerformanceTimelineWrongAttempt,
      markPerformancePromptAttempt: deps.markPerformancePromptAttempt,
      performanceResolveSuccess: deps.performanceResolveSuccess,
      displayResult: deps.displayResult,
      handleMelodyPolyphonicMismatch: (prompt, detectedText, context) => {
        melodyPolyphonicFeedbackController.handleMismatch(prompt, detectedText, context);
      },
      handleStableMonophonicDetectedNote: (detectedNote) => {
        stableMonophonicDetectionController.handleDetectedNote(detectedNote);
      },
    },
    polyphonicChordDetection: {
      state: deps.state,
      requiredStableFrames: deps.requiredStableFrames,
      detectMicPolyphonicFrame: deps.detectMicPolyphonicFrame,
      updateMicPolyphonicDetectorRuntimeStatus: deps.updateMicPolyphonicDetectorRuntimeStatus,
      performanceNow: deps.performanceNow,
      now: deps.now,
      displayResult: deps.displayResult,
      recordSessionAttempt: deps.recordSessionAttempt,
      setResultMessage: deps.setResultMessage,
      drawFretboard: deps.drawFretboard,
      scheduleSessionCooldown: deps.scheduleSessionCooldown,
      redrawFretboard: deps.redrawFretboard,
    },
  });

  melodyPolyphonicFeedbackController = cluster.melodyPolyphonicFeedbackController;
  stableMonophonicDetectionController = cluster.stableMonophonicDetectionController;
  monophonicAudioFrameController = cluster.monophonicAudioFrameController;
  melodyRuntimeDetectionController = cluster.melodyRuntimeDetectionController;
  polyphonicChordDetectionController = cluster.polyphonicChordDetectionController;

  return cluster;
}
