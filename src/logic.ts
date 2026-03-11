/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom } from './dom';
import { state } from './state';
import {
  flushPendingStatsSave,
  updateStats,
  saveLastSessionStats,
  saveLastSessionAnalysisBundle,
  savePerformanceStarResults,
  saveSettings,
  saveStats,
} from './storage';
import {
  updateTuner,
  redrawFretboard,
  drawFretboard,
  displaySessionSummary,
  displayStats,
  scheduleMelodyTimelineRenderFromState,
} from './ui';
import { freqToNoteName, freqToScientificNoteName, detectPitch, playSound } from './audio';
import { modes } from './modes';
import { buildPerformancePromptForEvent } from './modes/melody-performance';
import {
  calculateRmsLevel,
} from './audio-frame-processing';
import {
  detectCalibrationFrame,
  detectMonophonicFrame,
} from './audio-detection-handlers';
import {
  clearResultMessage,
  clearSessionGoalProgress,
  hideCalibrationModal,
  setInfoSlots,
  setCalibrationProgress,
  setCalibrationStatus,
  setPromptText,
  resetSessionButtonsState,
  setResultMessage,
  setScoreValue,
  setSessionGoalProgress,
  setSessionButtonsState,
  setStatusText,
  setTimedInfoVisible,
  setTimerValue,
  setTunerVisible,
  setVolumeLevel,
} from './ui-signals';
import {
  REQUIRED_STABLE_FRAMES,
  CALIBRATION_SAMPLES,
  TIMED_CHALLENGE_DURATION,
} from './constants';
import { getEnabledStrings, getSelectedFretRange } from './fretboard-ui-state';
import {
  createPromptCycleTrackingResetState,
  createStabilityTrackingResetState,
} from './prompt-tracking-state';
import { createSessionStopResetState } from './session-reset-state';
import { buildSessionStartPlan } from './session-start-preflight';
import { ensureAudioRuntime, teardownAudioRuntime } from './audio-runtime';
import { refreshAudioInputDeviceOptions } from './audio-input-devices';
import {
  normalizeInputSource,
  setInputSourcePreference,
  startMidiInput,
  stopMidiInput,
  type MidiNoteEvent,
} from './midi-runtime';
import { buildSessionNextPromptPlan } from './session-next-prompt-plan';
import {
  computeCalibratedA4FromSamples,
  getOpenATuningInfoFromTuning,
} from './calibration-utils';
import { buildSessionTimeUpPlan } from './session-timeup-plan';
import {
  finalizeSessionStats,
  recordPerformancePromptResolution,
  recordPerformanceTimingAttempt,
  recordRhythmTimingAttempt,
  recordSessionAttempt,
} from './session-stats';
import {
  DEFAULT_METRONOME_BEATS_PER_BAR,
  getMetronomeBpm,
  setMetronomeMeter,
  getMetronomeTimingSnapshot,
  isMetronomeRunning,
  playMetronomeCue,
  setMetronomeTempo,
  startMetronome,
  stopMetronome,
} from './metronome';
import { formatUserFacingError, showNonBlockingError } from './app-feedback';
import {
  formatSessionGoalProgress,
  getSessionGoalTargetCorrect,
} from './session-goal';
import { evaluateRhythmTiming, formatRhythmFeedback } from './rhythm-timing';
import {
  clearTrackedTimeouts,
  scheduleTrackedCooldown,
  scheduleTrackedTimeout,
} from './session-timeouts';
import { clearLiveDetectedHighlight, updateLiveDetectedHighlight } from './live-detected-highlight';
import { createSessionRuntimeErrorHandler } from './session-runtime-error-handler';
import { buildAudioMonophonicReactionPlan, buildCalibrationFrameReactionPlan } from './session-detection-reactions';
import { executeSessionNextPromptPlan } from './session-next-prompt-executor';
import { getTrainingModeLabel } from './training-mode-labels';
import { createPerformanceTransportRuntimeController } from './performance-transport-runtime-controller';
import { createPerformanceTimelineFeedbackController } from './performance-timeline-feedback-controller';
import { createPerformanceMicTelemetryController } from './performance-mic-telemetry-controller';
import { createMicMonophonicAttackTrackingController } from './mic-monophonic-attack-tracking-controller';
import { createMicPerformanceRuntimeStatusController } from './mic-performance-runtime-status-controller';
import { createSessionPromptRuntimeController } from './session-prompt-runtime-controller';
import { createPerformanceAdaptiveRuntimeController } from './performance-adaptive-runtime-controller';
import { createMonophonicAudioFrameController } from './monophonic-audio-frame-controller';
import { createAudioFrameRuntimeController } from './audio-frame-runtime-controller';
import {
  buildFinishCalibrationOutcome,
  closeCalibrationSession,
} from './calibration-session-flow';
import { executeSessionTimeUpPlan } from './session-timeup-executor';
import {
  executeAudioMonophonicReaction,
  executeCalibrationFrameReaction,
} from './process-audio-reaction-executors';
import { executeDisplayResultSuccessFlow } from './display-result-success-flow-executor';
import { buildProcessAudioFramePreflightPlan } from './process-audio-frame-preflight';
import { executeSessionRuntimeActivation } from './session-runtime-activation-executor';
import { createMidiSessionMessageHandler } from './midi-session-message-handler';
import { createTimedSessionIntervalHandler } from './timed-session-interval-handler';
import type { Prompt } from './types';
import { resolveMicVolumeThreshold } from './mic-input-sensitivity';
import {
  resolveMicNoteAttackRequiredPeak,
  shouldAcceptMicNoteByAttackStrength,
} from './mic-note-attack-filter';
import {
  resolveMicNoteHoldRequiredDurationMs,
  shouldAcceptMicNoteByHoldDuration,
  type PerformanceMicHoldCalibrationLevel,
} from './mic-note-hold-filter';
import { shouldResetMicAttackTracking } from './mic-attack-tracking';
import { shouldRearmMicOnsetForSameNote } from './mic-note-reattack';
import { shouldResetStudyMelodyOnsetTrackingOnPromptChange } from './study-melody-prompt-transition';
import { shouldReportPerformanceMicUncertainFrame } from './performance-mic-uncertain';
import { resolveLatencyCompensatedPromptStartedAtMs } from './performance-mic-latency-compensation';
import { resolvePerformanceMicJudgingThresholds } from './performance-mic-judging-thresholds';
import type { PerformanceTimingGrade } from './performance-timing-grade';
import {
  resolvePerformanceMicVolumeThreshold,
  resolveStudyMelodyMicVolumeThreshold,
} from './performance-mic-volume-threshold';
import {
  resolvePerformanceMicDropHoldMs,
  resolvePerformanceRequiredStableFrames,
  resolvePerformanceSilenceResetAfterFrames,
} from './performance-mic-adaptive-gating';
import {
  resolveEffectiveStudyMelodySilenceResetFrames,
  resolveEffectiveStudyMelodyStableFrames,
} from './study-melody-mic-tuning';
import {
  detectMicPolyphonicFrame,
  normalizeMicPolyphonicDetectorProvider,
} from './mic-polyphonic-detector';
import { refreshMicPolyphonicDetectorAudioInfoUi } from './mic-polyphonic-detector-ui';
import { refreshMicPerformanceReadinessUi } from './mic-performance-readiness-ui';
import {
  clearAudioInputGuidanceError,
  setAudioInputGuidanceError,
} from './audio-input-guidance-ui';
import { isMelodyWorkflowMode, isPerformanceStyleMode } from './training-mode-groups';
import { isPolyphonicMelodyPrompt } from './melody-prompt-polyphony';
import { createPerformancePromptController } from './performance-prompt-controller';
import {
  detectMonophonicOctaveMismatch as detectMonophonicOctaveMismatchHelper,
  resolveWrongDetectedHighlight,
} from './detected-note-feedback';
import { createMelodyPolyphonicFeedbackController } from './melody-polyphonic-feedback-controller';
import { createStableMonophonicDetectionController } from './stable-monophonic-detection-controller';
import { createMelodyRuntimeDetectionController } from './melody-runtime-detection-controller';
import { createPolyphonicChordDetectionController } from './polyphonic-chord-detection-controller';
import {
  appendPerformanceTimelineAttempts,
  buildPerformanceTimelineMissedAttempts,
  buildPerformanceTimelineFeedbackKey,
  buildPerformanceTimelineSuccessAttempts,
  buildPerformanceTimelineWrongAttempts,
  clearPerformanceTimelineFeedbackState,
} from './performance-timeline-feedback';
import { buildSessionInitialPromptPlan } from './session-initial-prompt-plan';
import { shouldIgnorePerformanceOctaveMismatch } from './performance-octave-policy';
import { isPerformancePitchWithinTolerance as isPerformancePitchWithinToleranceHelper } from './performance-pitch-tolerance';
import { getMelodyById } from './melody-library';
import { clampMelodyPlaybackBpm, getMelodyEventPlaybackDurationExactMs } from './melody-timeline-duration';
import { getMelodyWithPracticeAdjustments } from './melody-string-shift';
import { resolveMelodyMetronomeMeterProfile } from './melody-meter';
import { formatMelodyStudyRange, isDefaultMelodyStudyRange, normalizeMelodyStudyRange } from './melody-study-range';
import {
  captureMicPerformanceLatencyCalibrationState,
  restoreMicPerformanceLatencyCalibrationState,
} from './mic-performance-latency-calibration-state';
import { buildPerformanceSessionNoteLogSnapshot } from './performance-session-note-log';
import { buildPerformanceStarsRunKey, resolvePerformanceStarView } from './performance-stars';
import {
  buildSessionAnalysisBundle,
  type MicPerformanceOnsetRejectReasonKey,
  type PerformanceCaptureEventTelemetry,
} from './session-analysis-bundle';

const handleSessionRuntimeError = createSessionRuntimeErrorHandler({
  stopSession: () => {
    stopListening();
  },
  setStatusText,
  setResultMessage,
});

export function resetMicPolyphonicDetectorTelemetry() {
  state.lastMicPolyphonicDetectorProviderUsed = null;
  state.lastMicPolyphonicDetectorFallbackFrom = null;
  state.lastMicPolyphonicDetectorWarning = null;
  state.micPolyphonicDetectorTelemetryFrames = 0;
  state.micPolyphonicDetectorTelemetryTotalLatencyMs = 0;
  state.micPolyphonicDetectorTelemetryMaxLatencyMs = 0;
  state.micPolyphonicDetectorTelemetryLastLatencyMs = null;
  state.micPolyphonicDetectorTelemetryFallbackFrames = 0;
  state.micPolyphonicDetectorTelemetryWarningFrames = 0;
  state.micPolyphonicDetectorTelemetryWindowStartedAtMs = 0;
  state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = 0;
}

function clearWrongDetectedHighlight(redraw = false) {
  const hadHighlight = state.wrongDetectedNote !== null || state.wrongDetectedString !== null;
  state.wrongDetectedNote = null;
  state.wrongDetectedString = null;
  state.wrongDetectedFret = null;
  if (redraw && hadHighlight) {
    redrawFretboard();
  }
}

function setWrongDetectedHighlight(detectedNote: string, detectedFrequency?: number | null) {
  const enabledStrings = getEnabledStrings(dom.stringSelector);
  const highlight = resolveWrongDetectedHighlight({
    detectedNote,
    detectedFrequency,
    enabledStrings,
    instrument: state.currentInstrument,
    freqToScientificNoteName,
  });

  state.wrongDetectedNote = highlight.wrongDetectedNote;
  state.wrongDetectedString = highlight.wrongDetectedString;
  state.wrongDetectedFret = highlight.wrongDetectedFret;
}

function getCurrentPerformanceTimelineEventIndex() {
  if (!isPerformanceStyleMode(dom.trainingMode.value)) return null;
  const eventIndex = state.performanceActiveEventIndex;
  return Number.isInteger(eventIndex) && eventIndex >= 0 ? eventIndex : null;
}

function getCurrentPerformanceTimelineFeedbackKey() {
  return buildPerformanceTimelineFeedbackKey({
    melodyId: state.currentMelodyId,
    instrumentName: state.currentInstrument.name,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
  });
}

const performanceTimelineFeedbackController = createPerformanceTimelineFeedbackController({
  state,
  getCurrentEventIndex: () => getCurrentPerformanceTimelineEventIndex(),
  getFeedbackKey: () => getCurrentPerformanceTimelineFeedbackKey(),
  redrawFretboard,
  scheduleTimelineRender: scheduleMelodyTimelineRenderFromState,
});

const performanceMicTelemetryController = createPerformanceMicTelemetryController({
  state,
  getCurrentEventIndex: () => getCurrentPerformanceTimelineEventIndex(),
});

const micMonophonicAttackTrackingController = createMicMonophonicAttackTrackingController({
  state,
  getTrainingMode: () => dom.trainingMode.value,
  isMelodyWorkflowMode,
  resolvePerformanceMicDropHoldMs,
  shouldResetMicAttackTracking,
  shouldRearmMicOnsetForSameNote,
  shouldResetStudyMelodyOnsetTrackingOnPromptChange,
});

const micPerformanceRuntimeStatusController = createMicPerformanceRuntimeStatusController({
  state,
  refreshMicPerformanceReadinessUi: (nowMs) => refreshMicPerformanceReadinessUi(nowMs),
  refreshMicPolyphonicDetectorAudioInfoUi,
});

const sessionPromptRuntimeController = createSessionPromptRuntimeController({
  dom: {
    trainingMode: dom.trainingMode,
    melodySelector: dom.melodySelector,
    sessionGoal: dom.sessionGoal,
    stringSelector: dom.stringSelector,
  },
  state,
  getEnabledStrings,
  redrawFretboard,
  scheduleTimelineRender: scheduleMelodyTimelineRenderFromState,
  setSessionGoalProgress,
  setPlaySoundDisabled: (disabled) => {
    setSessionButtonsState({ playSoundDisabled: disabled });
  },
  playSound,
});

const performanceAdaptiveRuntimeController = createPerformanceAdaptiveRuntimeController({
  state,
  isPerformanceStyleMode,
});

function handleRhythmModeStableNote(detectedNote: string) {
  const timing = evaluateRhythmTiming(
    Date.now(),
    getMetronomeTimingSnapshot(),
    dom.rhythmTimingWindow.value
  );
  if (!timing) {
    setResultMessage('Enable Click to practice rhythm timing.', 'error');
    return;
  }

  if (state.rhythmLastJudgedBeatAtMs === timing.beatAtMs) {
    return;
  }

  state.rhythmLastJudgedBeatAtMs = timing.beatAtMs;
  recordRhythmTimingAttempt(
    state.activeSessionStats,
    timing.signedOffsetMs,
    timing.absOffsetMs,
    timing.tone === 'success'
  );
  setResultMessage(formatRhythmFeedback(timing, detectedNote), timing.tone);
}

const performancePromptController = createPerformancePromptController({
  state,
  getTrainingMode: () => dom.trainingMode.value,
  clearWrongDetectedHighlight: () => clearWrongDetectedHighlight(),
  recordPerformanceTimelineSuccess: (prompt, redraw) => performanceTimelineFeedbackController.recordSuccess(prompt, redraw),
  recordPerformanceTimelineMissed: (prompt) => performanceTimelineFeedbackController.recordMissed(prompt),
  recordSessionAttempt,
  recordPerformancePromptResolution: (activeSessionStats, input) => {
    recordPerformancePromptResolution(activeSessionStats as typeof state.activeSessionStats, input);
  },
  updateStats,
  updateSessionGoalProgress: () => sessionPromptRuntimeController.updateSessionGoalProgress(),
  recordPerformanceTimingAttempt: (activeSessionStats, grade) => {
    recordPerformanceTimingAttempt(activeSessionStats as typeof state.activeSessionStats, grade);
  },
  recordPerformanceTimingByEvent: (grade) => performanceTimelineFeedbackController.recordTiming(grade),
  setInfoSlots,
  redrawFretboard,
  drawFretboard,
  setResultMessage,
  scheduleSessionTimeout,
  nextPrompt,
});

const performanceTransportRuntimeController = createPerformanceTransportRuntimeController({
  dom: {
    trainingMode: dom.trainingMode,
    melodySelector: dom.melodySelector,
    melodyDemoBpm: dom.melodyDemoBpm,
  },
  state,
  isPerformanceStyleMode,
  getMelodyById,
  getPracticeAdjustedMelody: (melody) =>
    getMelodyWithPracticeAdjustments(
      melody,
      state.melodyTransposeSemitones,
      state.melodyStringShift,
      state.currentInstrument
    ),
  redrawFretboard,
  scheduleTimelineRender: scheduleMelodyTimelineRenderFromState,
  clearPerformanceTimelineFeedback: () => performanceTimelineFeedbackController.clearFeedback(),
  clearWrongDetectedHighlight: () => clearWrongDetectedHighlight(),
  onResolveMissedPrompt: () => performancePromptController.resolveMissed(),
  onAdvancePrompt: () => nextPrompt(),
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
  cancelAnimationFrame: (handle) => cancelAnimationFrame(handle),
});
function detectMonophonicOctaveMismatch(
  detectedNote: string,
  detectedFrequency?: number | null
) {
  if (dom.trainingMode.value === 'melody') {
    return null;
  }

  if (
    shouldIgnorePerformanceOctaveMismatch({
      trainingMode: dom.trainingMode.value,
      inputSource: state.inputSource,
      relaxOctaveCheckEnabled: state.relaxPerformanceOctaveCheck,
      promptTargetNote: state.currentPrompt?.targetNote,
      detectedNote,
    })
  ) {
    return null;
  }

  return detectMonophonicOctaveMismatchHelper({
    prompt: state.currentPrompt,
    targetFrequency: state.targetFrequency,
    detectedNote,
    detectedFrequency,
    freqToScientificNoteName,
  });
}

const melodyPolyphonicFeedbackController = createMelodyPolyphonicFeedbackController({
  state,
  recordSessionAttempt,
  recordPerformanceTimelineWrongAttempt: (note) => performanceTimelineFeedbackController.recordWrongAttempt(note),
  redrawFretboard,
  drawFretboard,
  setResultMessage,
  scheduleSessionCooldown,
});

const stableMonophonicDetectionController = createStableMonophonicDetectionController({
  state,
  getTrainingMode: () => dom.trainingMode.value,
  clearWrongDetectedHighlight,
  setWrongDetectedHighlight,
  recordPerformanceTimelineWrongAttempt: (note) => performanceTimelineFeedbackController.recordWrongAttempt(note),
  markPerformancePromptAttempt: () => {
    performanceMicTelemetryController.recordPromptAttempt();
    performancePromptController.markPromptAttempt();
  },
  markPerformanceMicOnsetJudged: (detectedNote, onsetAtMs) => {
    state.performanceMicLastJudgedOnsetNote = detectedNote;
    state.performanceMicLastJudgedOnsetAtMs = onsetAtMs;
  },
  recordPerformanceMicJudgmentLatency: (onsetAtMs, judgedAtMs) => micPerformanceRuntimeStatusController.recordJudgmentLatency(onsetAtMs, judgedAtMs),
  isPerformancePitchWithinTolerance: (detectedFrequency) =>
    state.inputSource === 'microphone' &&
    isPerformancePitchWithinToleranceHelper(
      detectedFrequency,
      state.targetFrequency,
      state.performanceMicTolerancePreset
    ),
  detectMonophonicOctaveMismatch,
  performanceResolveSuccess: (elapsedSeconds, timingGrade) => {
    performanceAdaptiveRuntimeController.updateTimingBiasFromGrade(timingGrade ?? null);
    performancePromptController.resolveSuccess(elapsedSeconds, timingGrade ?? null);
  },
  handleMelodyPolyphonicMismatch: (prompt, detectedText, context) => {
    melodyPolyphonicFeedbackController.handleMismatch(prompt, detectedText, context);
  },
  displayResult,
  setResultMessage,
  redrawFretboard,
  drawFretboard,
  scheduleSessionCooldown,
  recordSessionAttempt,
  handleRhythmModeStableNote,
  updateFreePlayLiveHighlight: (detectedNote) => {
    updateLiveDetectedHighlight({
      note: detectedNote,
      stateRef: state,
      enabledStrings: getEnabledStrings(dom.stringSelector),
      instrument: state.currentInstrument,
      redraw: redrawFretboard,
    });
  },
  freqToScientificNoteName,
});

const monophonicAudioFrameController = createMonophonicAudioFrameController({
  state,
  detectPitch,
  noteResolver: freqToNoteName,
  detectMonophonicFrame,
  buildAudioMonophonicReactionPlan,
  executeAudioMonophonicReaction,
  updateTuner,
  refreshReadinessUiThrottled: (nowMs) => micPerformanceRuntimeStatusController.refreshReadinessUiThrottled(nowMs),
  recordCaptureFrame: (input) => performanceMicTelemetryController.recordCaptureFrame(input),
  recordStableDetection: () => performanceMicTelemetryController.recordStableDetection(),
  recordUncertainFrame: (reason) => performanceMicTelemetryController.recordUncertainFrame(reason),
  setOnsetGateStatus: (status, text, options) => performanceMicTelemetryController.setOnsetGateStatus(status, text, options),
  resolveUncertainReasonKey: (input) => performanceMicTelemetryController.resolveUncertainReasonKey(input),
  resolveEffectiveRuntimeMicHoldCalibrationLevel: (enabled) =>
    performanceAdaptiveRuntimeController.resolveEffectiveRuntimeMicHoldCalibrationLevel(enabled),
  updateAttackTracking: (detectedNote, volume) => micMonophonicAttackTrackingController.update(detectedNote, volume),
  clearFreshAttackGuard: (event) => micMonophonicAttackTrackingController.clearFreshAttackGuard(event),
  resolveMicNoteAttackRequiredPeak,
  shouldAcceptMicNoteByAttackStrength,
  resolveMicNoteHoldRequiredDurationMs,
  shouldAcceptMicNoteByHoldDuration,
  resolvePerformanceMicJudgingThresholds,
  shouldReportPerformanceMicUncertainFrame,
  resolveLatencyCompensatedPromptStartedAtMs,
  setResultMessage,
  handleStableDetectedNote: (detectedNote, detectedFrequency) =>
    stableMonophonicDetectionController.handleDetectedNote(detectedNote, detectedFrequency),
});

const audioFrameRuntimeController = createAudioFrameRuntimeController({
  state,
  getTrainingMode: () => dom.trainingMode.value,
  getModeDetectionType: (trainingMode) => modes[trainingMode]?.detectionType ?? null,
  isMelodyWorkflowMode,
  isPerformanceStyleMode,
  isPolyphonicMelodyPrompt,
  resetStabilityTracking: () => {
    Object.assign(state, createStabilityTrackingResetState());
  },
  clearFreeHighlight: () => {
    clearLiveDetectedHighlight(state, redrawFretboard);
  },
  updateAttackTracking: (detectedNote, volume) => {
    micMonophonicAttackTrackingController.update(detectedNote, volume);
  },
  markSilenceDuringFreshAttackWait: () => {
    micMonophonicAttackTrackingController.markSilenceDuringFreshAttackWait();
  },
  resetAttackTracking: () => {
    micMonophonicAttackTrackingController.reset();
  },
  updateTuner,
  resolveMicVolumeThreshold,
  resolveStudyMelodyMicVolumeThreshold,
  resolvePerformanceMicVolumeThreshold,
  resolvePerformanceSilenceResetAfterFrames,
  resolveEffectiveStudyMelodySilenceResetFrames,
  resolveEffectiveStudyMelodyStableFrames,
  resolvePerformanceRequiredStableFrames,
  buildProcessAudioFramePreflightPlan,
  handleMicrophonePolyphonicMelodyFrame,
  handlePolyphonicChordFrame: (frameVolumeRms) => {
    polyphonicChordDetectionController.handleAudioChordFrame(frameVolumeRms);
  },
  handleMonophonicFrame: (input) => {
    monophonicAudioFrameController.handleFrame(input);
  },
  defaultRequiredStableFrames: REQUIRED_STABLE_FRAMES,
  calibrationSamples: CALIBRATION_SAMPLES,
  detectPitch,
  detectCalibrationFrame,
  buildCalibrationFrameReactionPlan,
  executeCalibrationFrameReaction,
  setCalibrationProgress,
  finishCalibration,
});

const melodyRuntimeDetectionController = createMelodyRuntimeDetectionController({
  state,
  requiredStableFrames: REQUIRED_STABLE_FRAMES,
  getTrainingMode: () => dom.trainingMode.value,
  detectMicPolyphonicFrame: (input) =>
    detectMicPolyphonicFrame({
      ...input,
      provider: normalizeMicPolyphonicDetectorProvider(input.provider),
    }),
  updateMicPolyphonicDetectorRuntimeStatus: micPerformanceRuntimeStatusController.updatePolyphonicDetectorRuntimeStatus,
  now: () => Date.now(),
  performanceNow: () => performance.now(),
  redrawFretboard,
  setResultMessage,
  recordPerformanceTimelineWrongAttempt: (note) => performanceTimelineFeedbackController.recordWrongAttempt(note),
  markPerformancePromptAttempt: () => {
    performanceMicTelemetryController.recordPromptAttempt();
    performancePromptController.markPromptAttempt();
  },
  performanceResolveSuccess: (elapsedSeconds, timingGrade) => {
    performanceAdaptiveRuntimeController.updateTimingBiasFromGrade(timingGrade ?? null);
    performancePromptController.resolveSuccess(elapsedSeconds, timingGrade ?? null);
  },
  displayResult,
  handleMelodyPolyphonicMismatch: (prompt, detectedText, context) => {
    melodyPolyphonicFeedbackController.handleMismatch(prompt, detectedText, context);
  },
  handleStableMonophonicDetectedNote,
});

const polyphonicChordDetectionController = createPolyphonicChordDetectionController({
  state,
  requiredStableFrames: REQUIRED_STABLE_FRAMES,
  detectMicPolyphonicFrame: (input) =>
    detectMicPolyphonicFrame({
      ...input,
      provider: normalizeMicPolyphonicDetectorProvider(input.provider),
    }),
  updateMicPolyphonicDetectorRuntimeStatus: micPerformanceRuntimeStatusController.updatePolyphonicDetectorRuntimeStatus,
  performanceNow: () => performance.now(),
  now: () => Date.now(),
  displayResult,
  recordSessionAttempt,
  setResultMessage,
  drawFretboard,
  scheduleSessionCooldown,
  redrawFretboard,
});

function handleMicrophonePolyphonicMelodyFrame(frameVolumeRms: number) {
  return melodyRuntimeDetectionController.handleMicrophonePolyphonicMelodyFrame(frameVolumeRms);
}

function handleMidiMelodyUpdate(event: MidiNoteEvent) {
  melodyRuntimeDetectionController.handleMidiMelodyUpdate(event);
}

function handleMidiPolyphonicChordUpdate(event: MidiNoteEvent) {
  polyphonicChordDetectionController.handleMidiChordUpdate(event);
}

function handleStableMonophonicDetectedNote(detectedNote: string, detectedFrequency?: number | null) {
  stableMonophonicDetectionController.handleDetectedNote(detectedNote, detectedFrequency);
}

export function scheduleSessionTimeout(delayMs: number, callback: () => void, context: string) {
  return scheduleTrackedTimeout({
    pendingTimeoutIds: state.pendingTimeoutIds,
    delayMs,
    callback,
    context,
    onError: handleSessionRuntimeError,
  });
}

function scheduleSessionCooldown(context: string, delayMs: number, callback: () => void) {
  scheduleTrackedCooldown({
    pendingTimeoutIds: state.pendingTimeoutIds,
    delayMs,
    callback,
    context,
    onError: handleSessionRuntimeError,
    setCooldown: (value) => {
      state.cooldown = value;
    },
  });
}

/** The main audio processing loop, called via requestAnimationFrame. */
function processAudio() {
  try {
    if (!state.isListening || !state.analyser || !state.audioContext) return;
    if (state.cooldown && !state.isCalibrating) {
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }
    // Shared volume calculation
    state.analyser.getFloatTimeDomainData(state.dataArray!);
    const volume = calculateRmsLevel(state.dataArray!);
    state.micLastInputRms = volume;
    setVolumeLevel(volume);

    audioFrameRuntimeController.handleFrame(volume);

    state.animationId = requestAnimationFrame(processAudio);
  } catch (error) {
    handleSessionRuntimeError('processAudio', error);
  }
}

/** Initializes the Web Audio API and starts listening to the microphone. */
export async function startListening(forCalibration = false) {
  if (forCalibration) {
    state.isCalibrating = true;
    state.calibrationFrequencies = [];
  } else {
    const trainingMode = dom.trainingMode.value;
    if (isPerformanceStyleMode(trainingMode)) {
      // Defensive reset so every fresh performance session starts from preroll.
      performanceTransportRuntimeController.stopLoop();
      clearTrackedTimeouts(state.pendingTimeoutIds);
      performancePromptController.invalidatePendingAdvance();
      state.performanceRuntimeStartedAtMs = null;
      state.performancePrerollLeadInVisible = false;
      state.performancePrerollStartedAtMs = null;
      state.performancePrerollDurationMs = 0;
      state.performancePrerollStepIndex = null;
      state.performanceActiveEventIndex = null;
      state.performanceRunCompleted = false;
    }
    const mode = modes[trainingMode];
    const startPlan = buildSessionStartPlan({
      trainingMode,
      modeDetectionType: mode?.detectionType ?? null,
      progressionName: dom.progressionSelector.value,
      progressions: state.currentInstrument.CHORD_PROGRESSIONS,
      timedDuration: TIMED_CHALLENGE_DURATION,
      selectedMelodyId: dom.melodySelector.value.trim() || null,
      currentInstrument: state.currentInstrument,
      melodyTransposeSemitones: state.melodyTransposeSemitones,
      melodyStringShift: state.melodyStringShift,
    });

    setSessionButtonsState(startPlan.sessionButtons);

    if (startPlan.timed.enabled) {
      state.timeLeft = startPlan.timed.durationSeconds;
      state.currentScore = startPlan.timed.initialScore;
      setTimerValue(startPlan.timed.durationSeconds);
      setScoreValue(startPlan.timed.initialScore);
      setTimedInfoVisible(true);
      clearSessionGoalProgress();
      state.timerId = window.setInterval(
        createTimedSessionIntervalHandler({
          decrementTimeLeft: () => {
            state.timeLeft--;
            return state.timeLeft;
          },
          setTimerValue,
          handleTimeUp,
          onRuntimeError: handleSessionRuntimeError,
        }),
        1000
      );
    }

    if (!startPlan.shouldStart) {
      const startErrorMessage = startPlan.errorMessage;
      stopListening();
      if (startErrorMessage) {
        showNonBlockingError(startErrorMessage);
      }
      return false;
    }

    if (startPlan.progression.isRequired) {
      state.currentProgression = startPlan.progression.selected;
      state.currentProgressionIndex = 0;
    }

    if (startPlan.resetArpeggioIndex) {
      state.currentArpeggioIndex = 0;
    }

    const goalTargetCorrect = getSessionGoalTargetCorrect(dom.sessionGoal.value);
    if (!startPlan.timed.enabled && goalTargetCorrect !== null) {
      setSessionGoalProgress(formatSessionGoalProgress(0, goalTargetCorrect));
    } else {
      clearSessionGoalProgress();
    }
  }

  try {
    const selectedMelodyId = dom.melodySelector.value.trim();
    const selectedBaseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
    const initialPromptMeterProfile = resolveMelodyMetronomeMeterProfile(selectedBaseMelody);
    const initialPromptPlan = !forCalibration
      ? buildSessionInitialPromptPlan({
          trainingMode: dom.trainingMode.value,
          bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
          beatsPerBar: initialPromptMeterProfile.beatsPerBar,
          beatUnitDenominator: initialPromptMeterProfile.beatUnitDenominator,
          secondaryAccentStepIndices: initialPromptMeterProfile.secondaryAccentBeatIndices,
        })
      : { delayMs: 0, prepMessage: '', pulseCount: 0, secondaryAccentStepIndices: [] };
    if (!forCalibration) {
      // Keep runtime source in sync with what the user currently selected in UI.
      // This prevents starting a MIDI-only session while the UI shows microphone (or vice versa).
      setInputSourcePreference(normalizeInputSource(dom.inputSource.value));
    }
    const selectedInputSource = !forCalibration ? state.inputSource : 'microphone';
    state.performanceMicHoldCalibrationLevel = forCalibration
      ? 'off'
      : performanceAdaptiveRuntimeController.resolveSessionMicHoldCalibrationLevel({
          trainingMode: dom.trainingMode.value,
          inputSource: selectedInputSource,
        });
    if (!forCalibration) {
      state.performanceMicLastJudgedOnsetNote = null;
      state.performanceMicLastJudgedOnsetAtMs = null;
      state.performanceMicLastUncertainOnsetNote = null;
      state.performanceMicLastUncertainOnsetAtMs = null;
      state.micLastInputRms = 0;
      state.micLastMonophonicConfidence = null;
      state.micLastMonophonicPitchSpreadCents = null;
      state.micLastMonophonicDetectedAtMs = null;
      micPerformanceRuntimeStatusController.resetReadinessAndJudgmentTelemetry();
      performanceMicTelemetryController.resetOnsetGateStatus();
      performanceMicTelemetryController.resetOnsetRejectTelemetry();
      state.currentMelodyId = dom.melodySelector.value.trim() || null;
      performanceTimelineFeedbackController.clearFeedback();
      resetMicPolyphonicDetectorTelemetry();
      if (selectedInputSource === 'microphone') {
        clearAudioInputGuidanceError();
        refreshMicPolyphonicDetectorAudioInfoUi();
        refreshMicPerformanceReadinessUi();
      }
    }
    if (!forCalibration && selectedInputSource === 'midi') {
      await startMidiInput(
        createMidiSessionMessageHandler({
          canProcessEvent: () => state.isListening && !state.cooldown && !state.isCalibrating,
          getCurrentModeDetectionType: () => modes[dom.trainingMode.value]?.detectionType ?? null,
          getTrainingModeValue: () => dom.trainingMode.value,
          handleMelodyUpdate: handleMidiMelodyUpdate,
          handlePolyphonicUpdate: handleMidiPolyphonicChordUpdate,
          clearLiveDetectedHighlight: () => {
            clearLiveDetectedHighlight(state, redrawFretboard);
          },
          handleStableMonophonicDetectedNote,
          onRuntimeError: handleSessionRuntimeError,
        })
      );
    } else {
      await ensureAudioRuntime(state, {
        audioInputDeviceId: state.preferredAudioInputDeviceId,
        analyserProfile:
          !forCalibration &&
          selectedInputSource === 'microphone' &&
          isPerformanceStyleMode(dom.trainingMode.value)
            ? 'low-latency-performance'
            : 'default',
      });
      await refreshAudioInputDeviceOptions();
    }

    if (state.audioContext?.state === 'suspended') {
      try {
        await state.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext during session start:', error);
      }
    }
    if (selectedInputSource !== 'midi' && state.audioContext?.state === 'suspended') {
      throw new Error(
        'Audio context is suspended. Click anywhere in the page and press Start Session again.'
      );
    }

    const selectedMode = !forCalibration ? dom.trainingMode.selectedOptions[0] : null;
    const fretRange = !forCalibration
      ? getSelectedFretRange(dom.startFret.value, dom.endFret.value)
      : { minFret: undefined, maxFret: undefined };
    executeSessionRuntimeActivation(
      {
        forCalibration,
        selectedInputSource,
        sessionInputSource: selectedInputSource,
        modeKey: !forCalibration ? dom.trainingMode.value : undefined,
        modeLabel: !forCalibration
          ? selectedMode?.textContent?.trim() || getTrainingModeLabel(dom.trainingMode.value)
          : undefined,
        instrumentName: !forCalibration ? state.currentInstrument.name : undefined,
        tuningPresetKey: !forCalibration ? state.currentTuningPresetKey : undefined,
        stringOrder: !forCalibration ? state.currentInstrument.STRING_ORDER : undefined,
        enabledStrings: !forCalibration ? Array.from(getEnabledStrings(dom.stringSelector)) : undefined,
        minFret: fretRange.minFret,
        maxFret: fretRange.maxFret,
        melodyId: !forCalibration ? dom.melodySelector.value.trim() || null : undefined,
        melodyStudyRangeStartIndex: !forCalibration ? state.melodyStudyRangeStartIndex : undefined,
        melodyStudyRangeEndIndex: !forCalibration ? state.melodyStudyRangeEndIndex : undefined,
        melodyTransposeSemitones: !forCalibration ? state.melodyTransposeSemitones : undefined,
        melodyStringShift: !forCalibration ? state.melodyStringShift : undefined,
        audioInputDeviceLabel: !forCalibration
          ? dom.audioInputDevice.selectedOptions[0]?.textContent?.trim()
          : undefined,
        midiInputDeviceLabel: !forCalibration
          ? dom.midiInputDevice.selectedOptions[0]?.textContent?.trim()
          : undefined,
      },
      {
        setIsListening: (value) => {
          state.isListening = value;
        },
        setActiveSessionStats: (sessionStats) => {
          state.activeSessionStats = sessionStats;
        },
        resetPromptCycleTracking: () => {
          Object.assign(state, createPromptCycleTrackingResetState());
        },
        setStatusText,
        nextPrompt: () => {
          if (initialPromptPlan.delayMs <= 0) {
            performanceTransportRuntimeController.startRuntimeClock();
            nextPrompt();
            return;
          }

          setPromptText('');
          if (initialPromptPlan.prepMessage) {
            setResultMessage(initialPromptPlan.prepMessage);
          }
          sessionPromptRuntimeController.applyInitialTimelinePreview(initialPromptPlan.prepMessage);
          performanceTransportRuntimeController.beginPrerollTimeline(initialPromptPlan.pulseCount, initialPromptPlan.delayMs);
          if (initialPromptPlan.pulseCount > 0) {
            void playMetronomeCue(true).catch((error) => {
              showNonBlockingError(formatUserFacingError('Failed to play preroll count-in', error));
            });
          }
          const pulseIntervalMs =
            initialPromptPlan.pulseCount > 0 ? initialPromptPlan.delayMs / initialPromptPlan.pulseCount : 0;
          for (let pulseIndex = 1; pulseIndex < initialPromptPlan.pulseCount; pulseIndex += 1) {
            scheduleSessionTimeout(
              Math.round(pulseIntervalMs * pulseIndex),
              () => {
                void playMetronomeCue(
                  initialPromptPlan.secondaryAccentStepIndices.includes(pulseIndex)
                ).catch((error) => {
                  showNonBlockingError(formatUserFacingError('Failed to play preroll count-in', error));
                });
                performanceTransportRuntimeController.advancePrerollTimeline(pulseIndex, initialPromptPlan.pulseCount);
              },
              `session initial prompt preroll pulse ${pulseIndex + 1}`
            );
          }
          scheduleSessionTimeout(
            initialPromptPlan.delayMs,
            () => {
              if (!state.isListening) return;
              performanceTransportRuntimeController.finishPrerollTimeline();
              sessionPromptRuntimeController.clearInitialTimelinePreview();
              clearResultMessage();
              performanceTransportRuntimeController.startRuntimeClock();
              nextPrompt();
            },
            'session initial prompt preroll'
          );
        },
        processAudio,
      }
    );
  } catch (err) {
    if (!forCalibration && state.inputSource === 'microphone') {
      const errorName =
        err instanceof DOMException
          ? err.name
          : err instanceof Error && typeof err.name === 'string'
            ? err.name
            : '';
      if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
        setAudioInputGuidanceError('permission');
      } else if (errorName === 'NotFoundError' || errorName === 'NotReadableError' || errorName === 'AbortError') {
        setAudioInputGuidanceError('device');
      } else if (errorName === 'NotSupportedError') {
        setAudioInputGuidanceError('unsupported');
      } else {
        setAudioInputGuidanceError('unknown');
      }
      refreshMicPolyphonicDetectorAudioInfoUi();
    }
    if (!forCalibration) stopListening();
    showNonBlockingError(formatUserFacingError('Failed to start input', err));
    return false;
  }
  return true;
}

/** Stops listening to the microphone and cleans up audio resources. */
export function stopListening(keepStreamOpen = false) {
  const preservedMicLatencyCalibrationState = captureMicPerformanceLatencyCalibrationState(state);
  if (state.isLoadingSamples) return;
  const shouldShowSessionSummary = state.showSessionSummaryOnStop;
  const preservedPerformanceTimelineVisualState = shouldShowSessionSummary
    ? {
        performanceTimelineFeedbackKey: state.performanceTimelineFeedbackKey,
        performanceTimelineFeedbackByEvent: structuredClone(state.performanceTimelineFeedbackByEvent),
        performanceTimingByEvent: structuredClone(state.performanceTimingByEvent),
        performanceOnsetRejectsByEvent: structuredClone(state.performanceOnsetRejectsByEvent),
        performanceCaptureTelemetryByEvent: structuredClone(state.performanceCaptureTelemetryByEvent),
      }
    : null;
  if (state.activeSessionStats && !state.isCalibrating) {
    const finalizedSessionStats = finalizeSessionStats(state.activeSessionStats);
    if (finalizedSessionStats && typeof finalizedSessionStats.completedRun !== 'boolean') {
      finalizedSessionStats.completedRun = state.performanceRunCompleted;
    }
    state.lastSessionStats = finalizedSessionStats;
    if (finalizedSessionStats?.modeKey === 'performance') {
      state.lastSessionPerformanceNoteLog = buildPerformanceSessionNoteLogSnapshot({
        sessionStats: finalizedSessionStats,
        feedbackKey: state.performanceTimelineFeedbackKey,
        feedbackByEvent: state.performanceTimelineFeedbackByEvent,
      });
      const performanceStarView = resolvePerformanceStarView(finalizedSessionStats);
      const performanceStarsRunKey = buildPerformanceStarsRunKey(finalizedSessionStats);
      if (performanceStarView && performanceStarsRunKey) {
        const previousBestStars = Math.max(0, Math.round(state.performanceStarsByRunKey[performanceStarsRunKey] ?? 0));
        if (performanceStarView.stars > previousBestStars) {
          state.performanceStarsByRunKey[performanceStarsRunKey] = performanceStarView.stars;
          savePerformanceStarResults();
        }
      }
    } else {
      state.lastSessionPerformanceNoteLog = null;
    }
    state.lastSessionAnalysisBundle = buildSessionAnalysisBundle({
      sessionStats: finalizedSessionStats,
      performanceNoteLog: state.lastSessionPerformanceNoteLog,
      performanceFeedbackByEvent: state.performanceTimelineFeedbackByEvent,
      performanceTimingByEvent: state.performanceTimingByEvent,
      performanceOnsetRejectsByEvent: state.performanceOnsetRejectsByEvent,
      performanceCaptureTelemetryByEvent: state.performanceCaptureTelemetryByEvent,
      selectedMelodyId: dom.melodySelector.value.trim() || null,
      melodyTempoBpm: (() => {
        const parsed = Number.parseInt(dom.melodyDemoBpm.value, 10);
        return Number.isFinite(parsed) ? parsed : null;
      })(),
      melodyStudyRange: (() => {
        const start = Number.parseInt(dom.melodyStudyStart.value, 10);
        const end = Number.parseInt(dom.melodyStudyEnd.value, 10);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return {
          startIndex: Math.max(0, start - 1),
          endIndex: Math.max(0, end - 1),
        };
      })(),
      inputSource: state.inputSource,
      inputDeviceLabel:
        state.inputSource === 'midi'
          ? dom.midiInputDevice.selectedOptions[0]?.textContent?.trim() ?? ''
          : dom.audioInputDevice.selectedOptions[0]?.textContent?.trim() ?? '',
      isDirectInputMode: state.isDirectInputMode,
      micSensitivityPreset: state.micSensitivityPreset,
      micNoteAttackFilterPreset: state.micNoteAttackFilterPreset,
      micNoteHoldFilterPreset: state.micNoteHoldFilterPreset,
      micPolyphonicDetectorProvider: state.micPolyphonicDetectorProvider,
      performanceMicTolerancePreset: state.performanceMicTolerancePreset,
      performanceTimingLeniencyPreset: state.performanceTimingLeniencyPreset,
      performanceMicLatencyCompensationMs: state.performanceMicLatencyCompensationMs,
      performanceTimingBiasMs: state.performanceTimingBiasMs,
      requestedAudioInputContentHint: state.requestedAudioInputContentHint,
      activeAudioInputTrackContentHint: state.activeAudioInputTrackContentHint,
      activeAudioInputTrackSettings: state.activeAudioInputTrackSettings
        ? {
            sampleRate: state.activeAudioInputTrackSettings.sampleRate ?? null,
            channelCount: state.activeAudioInputTrackSettings.channelCount ?? null,
            echoCancellation: state.activeAudioInputTrackSettings.echoCancellation ?? null,
            noiseSuppression: state.activeAudioInputTrackSettings.noiseSuppression ?? null,
            autoGainControl: state.activeAudioInputTrackSettings.autoGainControl ?? null,
          }
        : null,
      micLastInputRms: state.micLastInputRms,
      micLastMonophonicConfidence: state.micLastMonophonicConfidence,
      micLastMonophonicPitchSpreadCents: state.micLastMonophonicPitchSpreadCents,
      micPerformanceSuggestedLatencyMs: state.micPerformanceSuggestedLatencyMs,
      micPerformanceJudgmentCount: state.micPerformanceJudgmentCount,
      micPerformanceJudgmentTotalLatencyMs: state.micPerformanceJudgmentTotalLatencyMs,
      micPerformanceJudgmentLastLatencyMs: state.micPerformanceJudgmentLastLatencyMs,
      micPerformanceOnsetRejectedWeakAttackCount: state.micPerformanceOnsetRejectedWeakAttackCount,
      micPerformanceOnsetRejectedLowConfidenceCount: state.micPerformanceOnsetRejectedLowConfidenceCount,
      micPerformanceOnsetRejectedLowVoicingCount: state.micPerformanceOnsetRejectedLowVoicingCount,
      micPerformanceOnsetRejectedShortHoldCount: state.micPerformanceOnsetRejectedShortHoldCount,
      micPerformanceOnsetGateStatus: state.micPerformanceOnsetGateStatus,
      micPerformanceOnsetGateReason: state.micPerformanceOnsetGateReason,
      micPerformanceOnsetGateAtMs: state.micPerformanceOnsetGateAtMs,
      micPolyphonicDetectorTelemetryFrames: state.micPolyphonicDetectorTelemetryFrames,
      micPolyphonicDetectorTelemetryTotalLatencyMs: state.micPolyphonicDetectorTelemetryTotalLatencyMs,
      micPolyphonicDetectorTelemetryMaxLatencyMs: state.micPolyphonicDetectorTelemetryMaxLatencyMs,
      micPolyphonicDetectorTelemetryLastLatencyMs: state.micPolyphonicDetectorTelemetryLastLatencyMs,
      micPolyphonicDetectorTelemetryFallbackFrames: state.micPolyphonicDetectorTelemetryFallbackFrames,
      micPolyphonicDetectorTelemetryWarningFrames: state.micPolyphonicDetectorTelemetryWarningFrames,
      lastMicPolyphonicDetectorProviderUsed: state.lastMicPolyphonicDetectorProviderUsed,
      lastMicPolyphonicDetectorFallbackFrom: state.lastMicPolyphonicDetectorFallbackFrom,
      lastMicPolyphonicDetectorWarning: state.lastMicPolyphonicDetectorWarning,
      micPolyphonicDetectorTelemetryWindowStartedAtMs:
        state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
    });
    state.lastSessionAnalysisAutoDownloadKey = null;
    flushPendingStatsSave();
    saveLastSessionStats();
    saveLastSessionAnalysisBundle();
    displayStats();
    if (shouldShowSessionSummary) {
      displaySessionSummary();
    }
  }
  state.activeSessionStats = null;
  state.isListening = false;
  stopMetronome();
  if (state.animationId) cancelAnimationFrame(state.animationId);
  performanceTransportRuntimeController.stopLoop();
  clearTrackedTimeouts(state.pendingTimeoutIds);
  performancePromptController.invalidatePendingAdvance();
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.cooldown = false;
  state.ignorePromptAudioUntilMs = 0;
  micMonophonicAttackTrackingController.reset();
  resetMicPolyphonicDetectorTelemetry();
  stopMidiInput();
  if (!keepStreamOpen) {
    teardownAudioRuntime(state);
    setStatusText('Ready');
  }
  setTunerVisible(false);
  updateTuner(null);
  setVolumeLevel(0);
  state.micLastInputRms = 0;
  state.micLastMonophonicConfidence = null;
  state.micLastMonophonicPitchSpreadCents = null;
  state.micLastMonophonicDetectedAtMs = null;
  state.micPerformanceReadinessLastUiRefreshAtMs = 0;
  resetSessionButtonsState();
  setPromptText('');
  clearResultMessage();
  clearSessionGoalProgress();
  setInfoSlots();
  Object.assign(state, createSessionStopResetState());
  if (preservedPerformanceTimelineVisualState) {
    state.performanceTimelineFeedbackKey =
      preservedPerformanceTimelineVisualState.performanceTimelineFeedbackKey;
    state.performanceTimelineFeedbackByEvent =
      preservedPerformanceTimelineVisualState.performanceTimelineFeedbackByEvent;
    state.performanceTimingByEvent = preservedPerformanceTimelineVisualState.performanceTimingByEvent;
    state.performanceOnsetRejectsByEvent =
      preservedPerformanceTimelineVisualState.performanceOnsetRejectsByEvent;
    state.performanceCaptureTelemetryByEvent =
      preservedPerformanceTimelineVisualState.performanceCaptureTelemetryByEvent;
  }
  restoreMicPerformanceLatencyCalibrationState(state, preservedMicLatencyCalibrationState);
  dom.melodyTabTimelineGrid.scrollLeft = 0;
  setTimedInfoVisible(false);
  if (state.inputSource === 'microphone') {
    refreshMicPolyphonicDetectorAudioInfoUi();
    refreshMicPerformanceReadinessUi();
  }
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

export function seekActiveMelodySessionToEvent(eventIndex: number) {
  if (!state.isListening) return false;
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) return false;

  clearTrackedTimeouts(state.pendingTimeoutIds);
  performancePromptController.invalidatePendingAdvance();
  performanceTimelineFeedbackController.clearFeedback();
  state.currentMelodyEventIndex = Math.max(0, Math.round(eventIndex));
  state.performanceActiveEventIndex = isPerformanceStyleMode(dom.trainingMode.value)
    ? state.currentMelodyEventIndex
    : null;
  state.currentMelodyEventFoundNotes.clear();
  performancePromptController.resetPromptResolution();
  state.pendingSessionStopResultMessage = null;
  clearWrongDetectedHighlight();
  if (isPerformanceStyleMode(dom.trainingMode.value)) {
    performanceTransportRuntimeController.startRuntimeClock(state.currentMelodyEventIndex);
  }
  nextPrompt();
  return true;
}

/** Displays the result of a user's attempt and triggers the next prompt on success. */
function displayResult(correct: boolean, elapsed: number) {
  try {
    if (state.currentPrompt) {
      recordSessionAttempt(
        state.activeSessionStats,
        state.currentPrompt,
        correct,
        elapsed,
        state.currentInstrument
      );
    }
    updateStats(correct, elapsed);

    if (correct && state.currentPrompt) {
      const trainingMode = dom.trainingMode.value;
      const mode = modes[trainingMode];
      const goalTargetCorrect = getSessionGoalTargetCorrect(dom.sessionGoal.value);
      const successFlowOutcome = executeDisplayResultSuccessFlow(
        {
          prompt: state.currentPrompt,
          trainingMode,
          modeDetectionType: mode?.detectionType ?? null,
          elapsedSeconds: elapsed,
          currentArpeggioIndex: state.currentArpeggioIndex,
        showingAllNotes: state.showingAllNotes,
        sessionPace: state.sessionPace,
        goalTargetCorrect,
        correctAttempts: state.activeSessionStats?.correctAttempts ?? null,
        },
        {
          setInfoSlots,
          setSessionGoalProgress,
          requestSessionSummaryOnStop: () => {
            state.showSessionSummaryOnStop = true;
          },
          stopListening,
          setCurrentArpeggioIndex: (index) => {
            state.currentArpeggioIndex = index;
          },
          setResultMessage,
          advanceMelodyPromptIndex: () => {
            if (dom.trainingMode.value === 'melody') {
              state.currentMelodyEventIndex += 1;
            }
          },
          setScoreValue,
          setTunerVisible,
          redrawFretboard,
          drawFretboard,
          scheduleSessionTimeout,
          scheduleSessionCooldown,
          nextPrompt,
          addScore: (delta) => {
            state.currentScore += delta;
            return state.currentScore;
          },
        }
      );
      if (successFlowOutcome === 'goal_reached') return;
    }
  } catch (error) {
    handleSessionRuntimeError('displayResult', error);
  }
}

/** Generates and displays the next prompt for the user based on the selected mode. */
function nextPrompt() {
  try {
    if (!state.isListening) return;
    if (
      isPerformanceStyleMode(dom.trainingMode.value) &&
      state.performanceRuntimeStartedAtMs === null &&
      !state.performancePrerollLeadInVisible
    ) {
      performanceTransportRuntimeController.startRuntimeClock();
    }
    clearResultMessage();
    state.pendingSessionStopResultMessage = null;
    state.liveDetectedNote = null;
    state.liveDetectedString = null;
    state.wrongDetectedNote = null;
    state.wrongDetectedString = null;
    state.wrongDetectedFret = null;
    state.rhythmLastJudgedBeatAtMs = null;
    state.currentMelodyEventFoundNotes.clear();

    const trainingMode = dom.trainingMode.value;
    if (trainingMode !== 'melody') {
      micMonophonicAttackTrackingController.reset();
    }
    Object.assign(state, createPromptCycleTrackingResetState());
    const mode = modes[trainingMode];
    let prompt: Prompt | null = null;
    if (isPerformanceStyleMode(trainingMode)) {
      const { context: performanceContext, activeEventIndex: performanceEventIndex } =
        performanceTransportRuntimeController.syncPromptEventFromRuntime();
      if (
        performanceContext &&
        typeof performanceEventIndex === 'number' &&
        performanceEventIndex >= performanceContext.studyRange.startIndex &&
        performanceEventIndex <= performanceContext.studyRange.endIndex
      ) {
        prompt = buildPerformancePromptForEvent({
          melody: performanceContext.melody,
          studyRange: performanceContext.studyRange,
          eventIndex: performanceEventIndex,
          bpm: performanceContext.bpm,
        });
      }
    } else {
      prompt = mode?.generatePrompt() ?? null;
    }
    const nextPromptPlan = buildSessionNextPromptPlan({
      hasMode: Boolean(mode),
      detectionType: mode?.detectionType ?? null,
      hasPrompt: Boolean(prompt),
    });
    const pendingStopResultMessage = state.pendingSessionStopResultMessage;
    state.pendingSessionStopResultMessage = null;
    const executionResult = executeSessionNextPromptPlan(nextPromptPlan, prompt, {
      requestSessionSummaryOnStop: () => {
        state.showSessionSummaryOnStop = true;
      },
      stopListening,
      showError: showNonBlockingError,
      updateTuner,
      setTunerVisible,
      applyPrompt: (nextPrompt) => {
        const previousPrompt = state.currentPrompt;
        micMonophonicAttackTrackingController.syncPromptTransition(previousPrompt, nextPrompt);
        state.currentPrompt = nextPrompt;
        state.currentMelodyEventFoundNotes.clear();
        setPromptText(nextPrompt.displayText);
        redrawFretboard();
        scheduleMelodyTimelineRenderFromState();
        sessionPromptRuntimeController.configurePromptAudio();
        state.startTime = Date.now();
        void syncMelodySessionMetronomeToPromptStart();
        if (!isPerformanceStyleMode(trainingMode)) {
          performancePromptController.scheduleAdvance(nextPrompt);
        }
      },
    });
    if (executionResult === 'stopped' && pendingStopResultMessage) {
      setResultMessage(pendingStopResultMessage.text, pendingStopResultMessage.tone);
    }
    if (executionResult !== 'prompt_applied') return;
  } catch (error) {
    handleSessionRuntimeError('nextPrompt', error);
  }
}

async function syncMelodySessionMetronomeToPromptStart() {
  if (!state.isListening) return;
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) return;

  const selectedMelodyId = dom.melodySelector.value.trim();
  const selectedBaseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  const selectedMelody =
    selectedBaseMelody === null
      ? null
      : getMelodyWithPracticeAdjustments(
          selectedBaseMelody,
          state.melodyTransposeSemitones,
          state.melodyStringShift,
          state.currentInstrument
        );
  const meterProfile =
    selectedMelody === null
      ? {
          beatsPerBar: DEFAULT_METRONOME_BEATS_PER_BAR,
          beatUnitDenominator: 4,
          secondaryAccentBeatIndices: [],
        }
      : resolveMelodyMetronomeMeterProfile(selectedMelody);
  setMetronomeMeter(meterProfile);

  if (isPerformanceStyleMode(dom.trainingMode.value)) {
    if (state.performanceRuntimeStartedAtMs === null || state.performancePrerollLeadInVisible) {
      return;
    }
  }

  if (!dom.metronomeEnabled.checked) {
    if (isMetronomeRunning()) {
      stopMetronome();
    }
    return;
  }

  const bpm = clampMelodyPlaybackBpm(dom.melodyDemoBpm.value);
  try {
    if (isMetronomeRunning()) {
      if (getMetronomeBpm() !== bpm) {
        await setMetronomeTempo(bpm);
      }
      return;
    }
    await startMetronome(bpm);
  } catch (error) {
    showNonBlockingError(formatUserFacingError('Failed to synchronize metronome timing', error));
  }
}

export function finishCalibration() {
  try {
    const { octave } = getOpenATuningInfoFromTuning(state.currentInstrument.TUNING);
    const calibratedA4 = computeCalibratedA4FromSamples(state.calibrationFrequencies, octave);
    const finishOutcome = buildFinishCalibrationOutcome({
      hasSamples: state.calibrationFrequencies.length > 0,
      calibratedA4,
    });

    setCalibrationStatus(finishOutcome.statusText);
    if (finishOutcome.kind === 'retry') {
      scheduleSessionTimeout(finishOutcome.delayMs, cancelCalibration, finishOutcome.timeoutContext);
      return;
    }

    state.calibratedA4 = finishOutcome.nextCalibratedA4!;
    saveSettings();
    scheduleSessionTimeout(
      finishOutcome.delayMs,
      () => {
        closeCalibrationSession(state, { hideCalibrationModal, stopListening });
      },
      finishOutcome.timeoutContext
    );
  } catch (error) {
    handleSessionRuntimeError('finishCalibration', error);
  }
}

export function clearRetainedSessionTimelineFeedback() {
  if (state.isListening) return;
  performanceTimelineFeedbackController.clearFeedback();
  scheduleMelodyTimelineRenderFromState();
}

export function cancelCalibration() {
  try {
    closeCalibrationSession(state, { hideCalibrationModal, stopListening });
  } catch (error) {
    handleSessionRuntimeError('cancelCalibration', error);
  }
}

function handleTimeUp() {
  try {
    const timeUpPlan = buildSessionTimeUpPlan({
      currentScore: state.currentScore,
      currentHighScore: state.stats.highScore,
    });
    executeSessionTimeUpPlan(timeUpPlan, {
      clearTimer: () => {
        if (state.timerId) clearInterval(state.timerId);
        state.timerId = null;
      },
      persistHighScore: (nextHighScore) => {
        state.stats.highScore = nextHighScore;
        saveStats();
      },
      requestSessionSummaryOnStop: () => {
        state.showSessionSummaryOnStop = true;
      },
      stopListening,
      setResultMessage,
    });
  } catch (error) {
    handleSessionRuntimeError('handleTimeUp', error);
  }
}










