/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom } from './dom';
import { state, type AppState } from './state';
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
import {
  recordPerformancePromptResolution,
  recordPerformanceTimingAttempt,
  recordRhythmTimingAttempt,
  recordSessionAttempt,
} from './session-stats';
import {
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
import { createSessionLifecycleRuntimeGraphCluster } from './session-runtime/lifecycle';
import { buildSessionLifecycleRuntimeGraphDeps } from './session-runtime/lifecycle';
import { createSessionAudioRuntimeGraphCluster } from './session-runtime/audio';
import { buildSessionAudioRuntimeGraphDeps } from './session-runtime/audio';
import { createSessionDetectionRuntimeGraphCluster } from './session-runtime/detection';
import { buildSessionDetectionRuntimeGraphDeps } from './session-runtime/detection';
import { createSessionPromptPerformanceRuntimeGraphCluster } from './session-runtime/prompt-performance';
import { buildSessionPromptPerformanceRuntimeGraphDeps } from './session-runtime/prompt-performance';
import { buildFinishCalibrationOutcome } from './calibration-session-flow';
import {
  executeAudioMonophonicReaction,
  executeCalibrationFrameReaction,
} from './process-audio-reaction-executors';
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
import { createSessionPerformanceFeedbackGraphCluster } from './session-runtime/performance-feedback';
import { buildSessionPerformanceFeedbackGraphDeps } from './session-runtime/performance-feedback';
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
import {
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

function getPracticeAdjustedMelodyForRuntime(
  melody: Parameters<typeof getMelodyWithPracticeAdjustments>[0]
) {
  return getMelodyWithPracticeAdjustments(
    melody,
    state.melodyTransposeSemitones,
    state.melodyStringShift,
    state.currentInstrument
  );
}

function getModeDetectionTypeForRuntime(trainingMode: string) {
  return modes[trainingMode]?.detectionType ?? null;
}

function getCurrentModeDetectionTypeForRuntime() {
  return getModeDetectionTypeForRuntime(dom.trainingMode.value);
}

function getModeForRuntime(trainingMode: string) {
  return modes[trainingMode] ?? null;
}


export function resetMicPolyphonicDetectorTelemetry() {
  micPerformanceRuntimeStatusController.resetPolyphonicDetectorTelemetry();
}
const {
  performanceTimelineFeedbackController,
  performanceMicTelemetryController,
  micPerformanceRuntimeStatusController,
  detectedNoteFeedbackRuntimeController,
  performanceAdaptiveRuntimeController,
} = createSessionPerformanceFeedbackGraphCluster(
  buildSessionPerformanceFeedbackGraphDeps({
    dom: {
      trainingMode: dom.trainingMode,
      stringSelector: dom.stringSelector,
    },
    state,
    isPerformanceStyleMode,
    buildPerformanceTimelineFeedbackKey,
    redrawFretboard,
    scheduleMelodyTimelineRenderFromState,
    refreshMicPerformanceReadinessUi,
    refreshMicPolyphonicDetectorAudioInfoUi,
    getEnabledStrings,
    freqToScientificNoteName,
    shouldIgnorePerformanceOctaveMismatch,
  })
);
const {
  rhythmModeRuntimeController,
  micMonophonicAttackTrackingController,
  sessionPromptRuntimeController,
  performancePromptController,
  performanceTransportRuntimeController,
} = createSessionPromptPerformanceRuntimeGraphCluster(
  buildSessionPromptPerformanceRuntimeGraphDeps({
    dom: {
      rhythmTimingWindow: dom.rhythmTimingWindow,
      trainingMode: dom.trainingMode,
      melodySelector: dom.melodySelector,
      sessionGoal: dom.sessionGoal,
      stringSelector: dom.stringSelector,
      melodyDemoBpm: dom.melodyDemoBpm,
    },
    state,
    nextPrompt,
    getMetronomeTimingSnapshot,
    evaluateRhythmTiming,
    recordRhythmTimingAttempt,
    formatRhythmFeedback,
    setResultMessage,
    isMelodyWorkflowMode,
    resolvePerformanceMicDropHoldMs,
    shouldResetMicAttackTracking,
    shouldRearmMicOnsetForSameNote,
    shouldResetStudyMelodyOnsetTrackingOnPromptChange,
    getEnabledStrings,
    redrawFretboard,
    scheduleMelodyTimelineRenderFromState,
    setSessionGoalProgress,
    setSessionButtonsState,
    playSound,
    clearWrongDetectedHighlight: () => detectedNoteFeedbackRuntimeController.clearWrongDetectedHighlight(),
    recordPerformanceTimelineSuccess: (prompt, redraw) => performanceTimelineFeedbackController.recordSuccess(prompt, redraw),
    recordPerformanceTimelineMissed: (prompt) => performanceTimelineFeedbackController.recordMissed(prompt),
    recordSessionAttempt,
    recordPerformancePromptResolution: (activeSessionStats, input) => {
      recordPerformancePromptResolution(activeSessionStats as AppState['activeSessionStats'], input);
    },
    updateStats,
    recordPerformanceTimingAttempt: (activeSessionStats, grade) => {
      recordPerformanceTimingAttempt(activeSessionStats as AppState['activeSessionStats'], grade);
    },
    recordPerformanceTimingByEvent: (grade) => performanceTimelineFeedbackController.recordTiming(grade),
    setInfoSlots,
    drawFretboard,
    scheduleSessionTimeout,
    isPerformanceStyleMode,
    getMelodyById,
    getPracticeAdjustedMelody: getPracticeAdjustedMelodyForRuntime,
    clearPerformanceTimelineFeedback: () => performanceTimelineFeedbackController.clearFeedback(),
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => cancelAnimationFrame(handle),
  })
);
const {
  melodyPolyphonicFeedbackController,
  stableMonophonicDetectionController,
  monophonicAudioFrameController,
  audioFrameRuntimeController,
  melodyRuntimeDetectionController,
  polyphonicChordDetectionController,
} = createSessionDetectionRuntimeGraphCluster(
  buildSessionDetectionRuntimeGraphDeps({
    dom: {
      trainingMode: dom.trainingMode,
    },
    state,
    recordSessionAttempt,
    redrawFretboard,
    drawFretboard,
    setResultMessage,
    scheduleSessionCooldown,
    freqToScientificNoteName,
    detectPitch,
    noteResolver: freqToNoteName,
    detectMonophonicFrame,
    buildAudioMonophonicReactionPlan,
    executeAudioMonophonicReaction,
    updateTuner,
    resolveMicNoteAttackRequiredPeak,
    shouldAcceptMicNoteByAttackStrength,
    resolveMicNoteHoldRequiredDurationMs,
    shouldAcceptMicNoteByHoldDuration,
    resolvePerformanceMicJudgingThresholds,
    shouldReportPerformanceMicUncertainFrame,
    resolveLatencyCompensatedPromptStartedAtMs,
    isMelodyWorkflowMode,
    isPerformanceStyleMode,
    isPolyphonicMelodyPrompt,
    resolveMicVolumeThreshold,
    resolveStudyMelodyMicVolumeThreshold,
    resolvePerformanceMicVolumeThreshold,
    resolvePerformanceSilenceResetAfterFrames,
    resolveEffectiveStudyMelodySilenceResetFrames,
    resolveEffectiveStudyMelodyStableFrames,
    resolvePerformanceRequiredStableFrames,
    buildProcessAudioFramePreflightPlan,
    defaultRequiredStableFrames: REQUIRED_STABLE_FRAMES,
    calibrationSamples: CALIBRATION_SAMPLES,
    detectCalibrationFrame,
    buildCalibrationFrameReactionPlan,
    executeCalibrationFrameReaction,
    setCalibrationProgress,
    finishCalibration,
    requiredStableFrames: REQUIRED_STABLE_FRAMES,
    getModeDetectionType: getModeDetectionTypeForRuntime,
    now: () => Date.now(),
    performanceNow: () => performance.now(),
    performanceTimelineFeedbackController,
    detectedNoteFeedbackRuntimeController,
    performanceMicTelemetryController,
    performancePromptController,
    performanceAdaptiveRuntimeController,
    micPerformanceRuntimeStatusController,
    micMonophonicAttackTrackingController,
    rhythmModeRuntimeController,
    displayResult,
    clearLiveDetectedHighlight: () => {
      clearLiveDetectedHighlight(state, redrawFretboard);
    },
    updateFreePlayLiveHighlight: (detectedNote) => {
      updateLiveDetectedHighlight({
        note: detectedNote,
        stateRef: state,
        enabledStrings: getEnabledStrings(dom.stringSelector),
        instrument: state.currentInstrument,
        redraw: redrawFretboard,
      });
    },
    detectMicPolyphonicFrame: (input) =>
      detectMicPolyphonicFrame({
        ...input,
        provider: normalizeMicPolyphonicDetectorProvider(input.provider),
      }),
    isPerformancePitchWithinTolerance: (detectedFrequency) =>
      state.inputSource === 'microphone' &&
      isPerformancePitchWithinToleranceHelper(
        detectedFrequency,
        state.targetFrequency,
        state.performanceMicTolerancePreset
      ),
    markPerformanceMicOnsetJudged: (detectedNote, onsetAtMs) => {
      state.performanceMicLastJudgedOnsetNote = detectedNote;
      state.performanceMicLastJudgedOnsetAtMs = onsetAtMs;
    },
    resetStabilityTracking: () => {
      Object.assign(state, createStabilityTrackingResetState());
    },
  })
);

const {
  sessionInputRuntimeController,
  sessionStartRuntimeController,
  sessionActivationRuntimeController,
  sessionStartErrorRuntimeController,
  stopListening: stopSessionRuntime,
  nextPrompt: advanceSessionPromptRuntime,
  displayResult: displaySessionResultRuntime,
  handleTimeUp: handleSessionTimeUpRuntime,
  seekActiveMelodySessionToEvent: seekActiveMelodySessionRuntimeToEvent,
} = createSessionLifecycleRuntimeGraphCluster(
  buildSessionLifecycleRuntimeGraphDeps({
    dom: {
      trainingMode: dom.trainingMode,
      inputSource: dom.inputSource,
      melodySelector: dom.melodySelector,
      melodyDemoBpm: dom.melodyDemoBpm,
      melodyStudyStart: dom.melodyStudyStart,
      melodyStudyEnd: dom.melodyStudyEnd,
      audioInputDevice: dom.audioInputDevice,
      midiInputDevice: dom.midiInputDevice,
      melodyTabTimelineGrid: dom.melodyTabTimelineGrid,
      progressionSelector: dom.progressionSelector,
      sessionGoal: dom.sessionGoal,
      startFret: dom.startFret,
      endFret: dom.endFret,
      stringSelector: dom.stringSelector,
    },
    state,
    timedDurationSeconds: TIMED_CHALLENGE_DURATION,
    captureMicPerformanceLatencyCalibrationState: () => captureMicPerformanceLatencyCalibrationState(state),
    restoreMicPerformanceLatencyCalibrationState: (captured) => {
      restoreMicPerformanceLatencyCalibrationState(state, captured);
    },
    flushPendingStatsSave,
    saveLastSessionStats,
    saveLastSessionAnalysisBundle,
    savePerformanceStarResults,
    displayStats,
    displaySessionSummary,
    stopMetronome,
    clearTrackedTimeouts,
    stopMidiInput,
    teardownAudioRuntime: () => teardownAudioRuntime(state),
    setStatusText,
    setTunerVisible,
    updateTuner,
    setVolumeLevel,
    resetSessionButtonsState,
    setPromptText,
    clearResultMessage,
    clearSessionGoalProgress,
    setInfoSlots,
    setTimedInfoVisible,
    createSessionStopResetState,
    refreshMicPolyphonicDetectorAudioInfoUi,
    refreshMicPerformanceReadinessUi,
    redrawFretboard,
    scheduleMelodyTimelineRenderFromState,
    normalizeInputSource,
    setInputSourcePreference,
    clearAudioInputGuidanceError,
    createMidiSessionMessageHandler,
    startMidiInput,
    ensureAudioRuntime: (runtimeState, options) => ensureAudioRuntime(runtimeState as AppState, options),
    refreshAudioInputDeviceOptions,
    isPerformanceStyleMode,
    buildSessionStartPlan,
    setSessionButtonsState,
    setTimerValue,
    setScoreValue,
    createTimedSessionIntervalHandler,
    getSelectedFretRange,
    getEnabledStrings,
    executeSessionRuntimeActivation,
    setResultMessage,
    playMetronomeCue,
    scheduleSessionTimeout,
    showNonBlockingError,
    formatUserFacingError,
    setAudioInputGuidanceError,
    buildPerformancePromptForEvent,
    buildSessionNextPromptPlan,
    executeSessionNextPromptPlan,
    recordSessionAttempt,
    updateStats,
    setSessionGoalProgress,
    scheduleSessionCooldown,
    saveStats,
    drawFretboard,
    isMelodyWorkflowMode,
    getCurrentModeDetectionType: getCurrentModeDetectionTypeForRuntime,
    handleSessionRuntimeError,
    getModeDetectionType: getModeDetectionTypeForRuntime,
    getMode: getModeForRuntime,
    performanceTransportRuntimeController,
    performancePromptController,
    micMonophonicAttackTrackingController,
    micPerformanceRuntimeStatusController,
    performanceMicTelemetryController,
    performanceTimelineFeedbackController,
    performanceAdaptiveRuntimeController,
    melodyRuntimeDetectionController,
    polyphonicChordDetectionController,
    detectedNoteFeedbackRuntimeController,
    stableMonophonicDetectionController,
    sessionPromptRuntimeController,
    clearLiveDetectedHighlight: () => {
      clearLiveDetectedHighlight(state, redrawFretboard);
    },
    resetPromptCycleTracking: () => {
      Object.assign(state, createPromptCycleTrackingResetState());
    },
    requestSessionSummaryOnStop: () => {
      state.showSessionSummaryOnStop = true;
    },
    syncMetronomeToPromptStart: () => sessionMetronomeSyncRuntimeController.syncToPromptStart(),
    processAudio: () => audioProcessLoopRuntimeController.processAudio(),
    warn: (message, error) => {
      console.warn(message, error);
    },
  })
);

const {
  audioProcessLoopRuntimeController,
  sessionMetronomeSyncRuntimeController,
  scheduleSessionTimeout: scheduleSessionRuntimeTimeout,
  scheduleSessionCooldown: scheduleSessionRuntimeCooldown,
  finishCalibration: finishCalibrationRuntime,
  cancelCalibration: cancelCalibrationRuntime,
} = createSessionAudioRuntimeGraphCluster(
  buildSessionAudioRuntimeGraphDeps({
    dom: {
      trainingMode: dom.trainingMode,
      metronomeEnabled: dom.metronomeEnabled,
      melodyDemoBpm: dom.melodyDemoBpm,
      melodySelector: dom.melodySelector,
    },
    state,
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    calculateRmsLevel,
    setVolumeLevel,
    handleAudioFrame: (volume) => audioFrameRuntimeController.handleFrame(volume),
    onRuntimeError: handleSessionRuntimeError,
    isMelodyWorkflowMode,
    isPerformanceStyleMode,
    getMelodyById,
    getPracticeAdjustedMelody: getPracticeAdjustedMelodyForRuntime,
    resolveMelodyMetronomeMeterProfile,
    setMetronomeMeter,
    isMetronomeRunning,
    stopMetronome,
    getMetronomeBpm,
    setMetronomeTempo,
    startMetronome,
    clampMelodyPlaybackBpm,
    showNonBlockingError,
    formatUserFacingError,
    getOpenATuningInfoFromTuning,
    computeCalibratedA4FromSamples,
    buildFinishCalibrationOutcome,
    setCalibrationStatus,
    saveSettings,
    hideCalibrationModal,
    stopListening,
    scheduleTrackedTimeout,
    scheduleTrackedCooldown,
  })
);

export function scheduleSessionTimeout(delayMs: number, callback: () => void, context: string) {
  return scheduleSessionRuntimeTimeout(delayMs, callback, context);
}

function scheduleSessionCooldown(context: string, delayMs: number, callback: () => void) {
  scheduleSessionRuntimeCooldown(context, delayMs, callback);
}

/** Initializes the Web Audio API and starts listening to the microphone. */
export async function startListening(forCalibration = false) {
  const startPreparation = sessionStartRuntimeController.prepare(forCalibration);
  if (!startPreparation.shouldProceed) {
    stopListening();
    if (startPreparation.errorMessage) {
      showNonBlockingError(startPreparation.errorMessage);
    }
    return false;
  }

  try {
    const { selectedInputSource } = await sessionInputRuntimeController.prepareSessionInput(forCalibration);

    sessionActivationRuntimeController.activateSession(forCalibration, selectedInputSource);
  } catch (err) {
    sessionStartErrorRuntimeController.handleStartError(forCalibration, err);
    return false;
  }
  return true;
}

/** Stops listening to the microphone and cleans up audio resources. */
export function stopListening(keepStreamOpen = false) {
  stopSessionRuntime(keepStreamOpen);
}

export function seekActiveMelodySessionToEvent(eventIndex: number) {
  return seekActiveMelodySessionRuntimeToEvent(eventIndex);
}

/** Displays the result of a user's attempt and triggers the next prompt on success. */
function displayResult(correct: boolean, elapsed: number) {
  try {
    displaySessionResultRuntime(correct, elapsed);
  } catch (error) {
    handleSessionRuntimeError('displayResult', error);
  }
}

/** Generates and displays the next prompt for the user based on the selected mode. */
function nextPrompt() {
  try {
    advanceSessionPromptRuntime();
  } catch (error) {
    handleSessionRuntimeError('nextPrompt', error);
  }
}

export function finishCalibration() {
  try {
    finishCalibrationRuntime();
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
    cancelCalibrationRuntime();
  } catch (error) {
    handleSessionRuntimeError('cancelCalibration', error);
  }
}

function handleTimeUp() {
  try {
    handleSessionTimeUpRuntime();
  } catch (error) {
    handleSessionRuntimeError('handleTimeUp', error);
  }
}



















