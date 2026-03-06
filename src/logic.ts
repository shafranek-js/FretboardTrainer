/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import {
  flushPendingStatsSave,
  updateStats,
  saveLastSessionStats,
  saveLastSessionAnalysisBundle,
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
import { buildPromptAudioPlan } from './prompt-audio-plan';
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
  setMetronomeTempo,
  startMetronome,
  stopMetronome,
} from './metronome';
import { formatUserFacingError, showNonBlockingError } from './app-feedback';
import { evaluateRhythmTiming, formatRhythmFeedback } from './rhythm-timing';
import {
  formatSessionGoalProgress,
  getSessionGoalTargetCorrect,
} from './session-goal';
import {
  clearTrackedTimeouts,
  scheduleTrackedCooldown,
  scheduleTrackedTimeout,
} from './session-timeouts';
import { clearLiveDetectedHighlight, updateLiveDetectedHighlight } from './live-detected-highlight';
import { createSessionRuntimeErrorHandler } from './session-runtime-error-handler';
import { buildAudioMonophonicReactionPlan, buildCalibrationFrameReactionPlan } from './session-detection-reactions';
import { executeSessionNextPromptPlan } from './session-next-prompt-executor';
import {
  buildFinishCalibrationOutcome,
  closeCalibrationSession,
} from './calibration-session-flow';
import { executePromptAudioPlan } from './prompt-audio-executor';
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
import { shouldReportPerformanceMicUncertainFrame } from './performance-mic-uncertain';
import { resolveLatencyCompensatedPromptStartedAtMs } from './performance-mic-latency-compensation';
import { resolvePerformanceMicJudgingThresholds } from './performance-mic-judging-thresholds';
import { updatePerformanceTimingBias } from './performance-timing-bias';
import type { PerformanceTimingGrade } from './performance-timing-grade';
import { resolvePerformanceMicVolumeThreshold } from './performance-mic-volume-threshold';
import {
  resolvePerformanceMicDropHoldMs,
  resolvePerformanceRequiredStableFrames,
  resolvePerformanceSilenceResetAfterFrames,
} from './performance-mic-adaptive-gating';
import {
  mergePerformanceMicHoldCalibrationLevel,
  resolvePerformanceMicHoldCalibrationLevelFromBundle,
  resolveRuntimePerformanceMicHoldCalibrationLevel,
} from './performance-mic-hold-calibration';
import { shouldRearmMicOnsetForSameNote } from './mic-note-reattack';
import {
  detectMicPolyphonicFrame,
  normalizeMicPolyphonicDetectorProvider,
} from './mic-polyphonic-detector';
import { refreshMicPolyphonicDetectorAudioInfoUi } from './mic-polyphonic-detector-ui';
import { refreshMicPerformanceReadinessUi } from './mic-performance-readiness-ui';
import { isMelodyWorkflowMode } from './training-mode-groups';
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
  buildPerformanceTimelineWrongAttempt,
  clearPerformanceTimelineFeedbackState,
} from './performance-timeline-feedback';
import { buildSessionInitialPromptPlan } from './session-initial-prompt-plan';
import { buildSessionInitialTimelinePreview } from './session-initial-timeline-preview';
import { shouldIgnorePerformanceOctaveMismatch } from './performance-octave-policy';
import { isPerformancePitchWithinTolerance as isPerformancePitchWithinToleranceHelper } from './performance-pitch-tolerance';
import { getMelodyById } from './melody-library';
import { clampMelodyPlaybackBpm, getMelodyEventPlaybackDurationExactMs } from './melody-timeline-duration';
import { getMelodyWithPracticeAdjustments } from './melody-string-shift';
import { resolveMelodyMetronomeMeterProfile } from './melody-meter';
import { formatMelodyStudyRange, isDefaultMelodyStudyRange, normalizeMelodyStudyRange } from './melody-study-range';
import { resolvePerformanceTransportFrame } from './performance-transport';
import {
  captureMicPerformanceLatencyCalibrationState,
  restoreMicPerformanceLatencyCalibrationState,
} from './mic-performance-latency-calibration-state';
import { buildPerformanceSessionNoteLogSnapshot } from './performance-session-note-log';
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

function resetMicMonophonicAttackTracking() {
  state.micMonophonicAttackTrackedNote = null;
  state.micMonophonicAttackPeakVolume = 0;
  state.micMonophonicAttackLastVolume = 0;
  state.micMonophonicFirstDetectedAtMs = null;
}

function updateMicMonophonicAttackTracking(detectedNote: string | null, volume: number) {
  const nowMs = Date.now();
  const eventDurationMs = state.currentPrompt?.melodyEventDurationMs ?? null;
  const performanceAdaptive = dom.trainingMode.value === 'performance';
  const performanceDropHoldMs = performanceAdaptive
    ? resolvePerformanceMicDropHoldMs(eventDurationMs)
    : undefined;
  if (
    shouldResetMicAttackTracking({
      detectedNote,
      trackedNote: state.micMonophonicAttackTrackedNote,
      trainingMode: dom.trainingMode.value,
      lastDetectedAtMs: state.micLastMonophonicDetectedAtMs,
      nowMs,
      performanceDropHoldMs,
    })
  ) {
    resetMicMonophonicAttackTracking();
    return;
  }
  if (!detectedNote) return;

  if (state.micMonophonicAttackTrackedNote !== detectedNote) {
    state.micMonophonicAttackTrackedNote = detectedNote;
    state.micMonophonicAttackPeakVolume = volume;
    state.micMonophonicAttackLastVolume = volume;
    state.micMonophonicFirstDetectedAtMs = nowMs;
    return;
  }

  const onsetAgeMs =
    state.micMonophonicFirstDetectedAtMs === null
      ? null
      : Math.max(0, nowMs - state.micMonophonicFirstDetectedAtMs);
  if (
    shouldRearmMicOnsetForSameNote({
      performanceAdaptive,
      onsetAgeMs,
      currentVolume: volume,
      previousVolume: state.micMonophonicAttackLastVolume,
      peakVolume: state.micMonophonicAttackPeakVolume,
      eventDurationMs,
    })
  ) {
    state.micMonophonicAttackPeakVolume = volume;
    state.micMonophonicFirstDetectedAtMs = nowMs;
    state.micMonophonicAttackLastVolume = volume;
    return;
  }

  if (volume > state.micMonophonicAttackPeakVolume) {
    state.micMonophonicAttackPeakVolume = volume;
  }
  state.micMonophonicAttackLastVolume = volume;
}

function refreshMicPerformanceReadinessUiThrottled(nowMs = Date.now()) {
  if (nowMs - state.micPerformanceReadinessLastUiRefreshAtMs < 250) return;
  state.micPerformanceReadinessLastUiRefreshAtMs = nowMs;
  refreshMicPerformanceReadinessUi(nowMs);
}

function recordMicPerformanceOnsetRejectReason(input: {
  reasonKey: MicPerformanceOnsetRejectReasonKey;
  onsetNote: string | null;
  onsetAtMs: number | null;
}) {
  const dedupeMatched =
    state.micPerformanceOnsetLastRejectedReasonKey === input.reasonKey &&
    state.micPerformanceOnsetLastRejectedNote === input.onsetNote &&
    state.micPerformanceOnsetLastRejectedAtMs === input.onsetAtMs;
  if (dedupeMatched) return false;

  state.micPerformanceOnsetLastRejectedReasonKey = input.reasonKey;
  state.micPerformanceOnsetLastRejectedNote = input.onsetNote;
  state.micPerformanceOnsetLastRejectedAtMs = input.onsetAtMs;

  if (input.reasonKey === 'weak_attack') {
    state.micPerformanceOnsetRejectedWeakAttackCount += 1;
    return true;
  }
  if (input.reasonKey === 'low_confidence') {
    state.micPerformanceOnsetRejectedLowConfidenceCount += 1;
    return true;
  }
  if (input.reasonKey === 'low_voicing') {
    state.micPerformanceOnsetRejectedLowVoicingCount += 1;
    return true;
  }
  state.micPerformanceOnsetRejectedShortHoldCount += 1;
  return true;
}

function setMicPerformanceOnsetGateStatus(
  status: 'accepted' | 'rejected',
  reason: string,
  input?: {
    atMs?: number;
    rejectReasonKey?: MicPerformanceOnsetRejectReasonKey;
    onsetNote?: string | null;
    onsetAtMs?: number | null;
    eventDurationMs?: number | null;
    holdRequiredMs?: number | null;
    holdElapsedMs?: number | null;
    runtimeCalibrationLevel?: PerformanceMicHoldCalibrationLevel | null;
  }
) {
  const atMs = input?.atMs ?? Date.now();
  state.micPerformanceOnsetGateStatus = status;
  state.micPerformanceOnsetGateReason = reason;
  state.micPerformanceOnsetGateAtMs = atMs;

  if (status !== 'rejected' || !input?.rejectReasonKey) return;
  const recorded = recordMicPerformanceOnsetRejectReason({
    reasonKey: input.rejectReasonKey,
    onsetNote: input.onsetNote ?? null,
    onsetAtMs: input.onsetAtMs ?? atMs,
  });
  if (!recorded) return;
  recordPerformanceOnsetRejectByEvent({
    reasonKey: input.rejectReasonKey,
    reason,
    rejectedAtMs: atMs,
    onsetNote: input.onsetNote ?? null,
    onsetAtMs: input.onsetAtMs ?? atMs,
    eventDurationMs:
      typeof input.eventDurationMs === 'number' && Number.isFinite(input.eventDurationMs)
        ? input.eventDurationMs
        : null,
    holdRequiredMs:
      typeof input.holdRequiredMs === 'number' && Number.isFinite(input.holdRequiredMs)
        ? input.holdRequiredMs
        : null,
    holdElapsedMs:
      typeof input.holdElapsedMs === 'number' && Number.isFinite(input.holdElapsedMs)
        ? input.holdElapsedMs
        : null,
    runtimeCalibrationLevel: input.runtimeCalibrationLevel ?? null,
  });
}

function resetMicPerformanceOnsetGateStatus() {
  state.micPerformanceOnsetGateStatus = 'idle';
  state.micPerformanceOnsetGateReason = null;
  state.micPerformanceOnsetGateAtMs = null;
}

function resetMicPerformanceOnsetRejectTelemetry() {
  state.micPerformanceOnsetRejectedWeakAttackCount = 0;
  state.micPerformanceOnsetRejectedLowConfidenceCount = 0;
  state.micPerformanceOnsetRejectedLowVoicingCount = 0;
  state.micPerformanceOnsetRejectedShortHoldCount = 0;
  state.micPerformanceOnsetLastRejectedReasonKey = null;
  state.micPerformanceOnsetLastRejectedNote = null;
  state.micPerformanceOnsetLastRejectedAtMs = null;
}

function resolveSessionPerformanceMicHoldCalibrationLevel(input: {
  trainingMode: string;
  inputSource: 'microphone' | 'midi';
}) {
  if (input.trainingMode !== 'performance' || input.inputSource !== 'microphone') {
    return 'off' as const;
  }
  return resolvePerformanceMicHoldCalibrationLevelFromBundle(state.lastSessionAnalysisBundle);
}

function resolveEffectiveRuntimePerformanceMicHoldCalibrationLevel(performanceAdaptiveMicInput: boolean) {
  if (!performanceAdaptiveMicInput) return 'off' as const;
  const runtimeLevel = resolveRuntimePerformanceMicHoldCalibrationLevel({
    shortHoldRejectCount: state.micPerformanceOnsetRejectedShortHoldCount,
    weakAttackRejectCount: state.micPerformanceOnsetRejectedWeakAttackCount,
    lowConfidenceRejectCount: state.micPerformanceOnsetRejectedLowConfidenceCount,
    lowVoicingRejectCount: state.micPerformanceOnsetRejectedLowVoicingCount,
  });
  return mergePerformanceMicHoldCalibrationLevel(state.performanceMicHoldCalibrationLevel, runtimeLevel);
}

function updatePerformanceTimingBiasFromGrade(grade: PerformanceTimingGrade | null | undefined) {
  if (!grade) return;
  const next = updatePerformanceTimingBias({
    currentBiasMs: state.performanceTimingBiasMs,
    sampleCount: state.performanceTimingBiasSampleCount,
    signedOffsetMs: grade.signedOffsetMs,
    inputSource: state.inputSource,
  });
  state.performanceTimingBiasMs = next.nextBiasMs;
  state.performanceTimingBiasSampleCount = next.nextSampleCount;
}

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

function updateSessionGoalProgressFromActiveStats() {
  const goalTargetCorrect = getSessionGoalTargetCorrect(dom.sessionGoal.value);
  if (goalTargetCorrect === null) return;
  setSessionGoalProgress(
    formatSessionGoalProgress(state.activeSessionStats?.correctAttempts ?? 0, goalTargetCorrect)
  );
}

function applySessionInitialTimelinePreview(previewLabel: string) {
  const preview = buildSessionInitialTimelinePreview({
    trainingMode: dom.trainingMode.value,
    selectedMelodyId: dom.melodySelector.value,
    currentInstrument: state.currentInstrument,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
    melodyStudyRangeStartIndex: state.melodyStudyRangeStartIndex,
    melodyStudyRangeEndIndex: state.melodyStudyRangeEndIndex,
  });

  state.melodyTimelinePreviewIndex = preview?.eventIndex ?? null;
  state.melodyTimelinePreviewLabel = preview ? previewLabel : null;
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

function clearSessionInitialTimelinePreview() {
  if (state.melodyTimelinePreviewIndex === null && state.melodyTimelinePreviewLabel === null) {
    return;
  }

  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

function beginPerformancePrerollTimeline(pulseCount: number, durationMs: number) {
  state.performancePrerollLeadInVisible = pulseCount > 0;
  state.performancePrerollStartedAtMs = pulseCount > 0 ? Date.now() : null;
  state.performancePrerollDurationMs = pulseCount > 0 ? Math.max(0, durationMs) : 0;
  state.performancePrerollStepIndex = pulseCount > 0 ? 0 : null;
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

function advancePerformancePrerollTimeline(stepIndex: number, pulseCount: number) {
  if (!state.isListening) return;
  if (!state.performancePrerollLeadInVisible || pulseCount <= 0) return;
  state.performancePrerollStepIndex = Math.max(0, Math.min(pulseCount - 1, stepIndex));
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

function finishPerformancePrerollTimeline() {
  state.performancePrerollLeadInVisible = false;
  state.performancePrerollStartedAtMs = null;
  state.performancePrerollDurationMs = 0;
  state.performancePrerollStepIndex = null;
  redrawFretboard();
  scheduleMelodyTimelineRenderFromState();
}

function getPerformanceRuntimeElapsedBeforeEventSec(targetEventIndex: number) {
  const selectedMelodyId = dom.melodySelector.value.trim();
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!melody || melody.events.length === 0) return 0;

  const rangeStart = Math.max(0, Math.min(state.melodyStudyRangeStartIndex, melody.events.length - 1));
  const clampedTargetIndex = Math.max(rangeStart, Math.min(Math.round(targetEventIndex), melody.events.length));
  let totalSec = 0;
  for (let index = rangeStart; index < clampedTargetIndex; index += 1) {
    const event = melody.events[index];
    if (!event) continue;
    totalSec += getMelodyEventPlaybackDurationExactMs(event, Number(dom.melodyDemoBpm.value), melody) / 1000;
  }
  return totalSec;
}

function startPerformanceRuntimeClock(targetEventIndex = state.melodyStudyRangeStartIndex) {
  if (dom.trainingMode.value !== 'performance') return;
  const elapsedSec = getPerformanceRuntimeElapsedBeforeEventSec(targetEventIndex);
  state.performanceRuntimeStartedAtMs = Date.now() - Math.round(elapsedSec * 1000);
  schedulePerformanceTransportLoop();
}

function getActivePerformanceTransportContext() {
  if (dom.trainingMode.value !== 'performance') return null;
  const selectedMelodyId = dom.melodySelector.value.trim();
  const baseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!baseMelody) return null;
  const melody = getMelodyWithPracticeAdjustments(
    baseMelody,
    state.melodyTransposeSemitones,
    state.melodyStringShift,
    state.currentInstrument
  );
  if (melody.events.length === 0) return null;

  return {
    melody,
    studyRange: normalizeMelodyStudyRange(state.melodyStudyRangeById?.[melody.id], melody.events.length),
    bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
  };
}

function syncPerformanceTransport(nowMs = Date.now()) {
  if (
    dom.trainingMode.value !== 'performance' ||
    !state.isListening ||
    state.performanceRuntimeStartedAtMs === null
  ) {
    return;
  }

  const context = getActivePerformanceTransportContext();
  if (!context) return;
  state.currentMelodyId = context.melody.id;

  const transportFrame = resolvePerformanceTransportFrame({
    melody: context.melody,
    bpm: context.bpm,
    studyRange: context.studyRange,
    runtimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    nowMs,
  });

  if (transportFrame.isComplete) {
    if (state.currentPrompt && !state.performancePromptResolved) {
      performancePromptController.resolveMissed();
    }
    state.performanceActiveEventIndex = null;
    state.currentMelodyEventIndex = context.studyRange.endIndex + 1;
    state.pendingSessionStopResultMessage = {
      text: isDefaultMelodyStudyRange(context.studyRange, context.melody.events.length)
        ? `Performance complete! (${context.melody.name})`
        : `Performance range complete! (${context.melody.name}, ${formatMelodyStudyRange(
            context.studyRange,
            context.melody.events.length
          )})`,
      tone: 'success',
    };
    nextPrompt();
    return;
  }

  const activeEventIndex = transportFrame.activeEventIndex;
  if (activeEventIndex === null) return;

  if (state.performanceActiveEventIndex === activeEventIndex && state.currentPrompt) {
    if (transportFrame.eventStartedAtMs !== null) {
      state.startTime = transportFrame.eventStartedAtMs;
    }
    return;
  }

  if (state.currentPrompt && !state.performancePromptResolved) {
    performancePromptController.resolveMissed();
  }

  state.performanceActiveEventIndex = activeEventIndex;
  state.currentMelodyEventIndex = activeEventIndex;
  state.currentMelodyEventFoundNotes.clear();
  clearWrongDetectedHighlight();
  nextPrompt();
  if (transportFrame.eventStartedAtMs !== null) {
    state.startTime = transportFrame.eventStartedAtMs;
  }
}

function stopPerformanceTransportLoop() {
  if (state.performanceTransportAnimationId) {
    cancelAnimationFrame(state.performanceTransportAnimationId);
    state.performanceTransportAnimationId = 0;
  }
}

function schedulePerformanceTransportLoop() {
  if (state.performanceTransportAnimationId) return;
  const tick = () => {
    state.performanceTransportAnimationId = 0;
    if (
      !state.isListening ||
      dom.trainingMode.value !== 'performance' ||
      state.performanceRuntimeStartedAtMs === null
    ) {
      return;
    }

    syncPerformanceTransport();

    if (
      state.isListening &&
      dom.trainingMode.value === 'performance' &&
      state.performanceRuntimeStartedAtMs !== null
    ) {
      state.performanceTransportAnimationId = requestAnimationFrame(tick);
    }
  };
  state.performanceTransportAnimationId = requestAnimationFrame(tick);
}

const performancePromptController = createPerformancePromptController({
  state,
  getTrainingMode: () => dom.trainingMode.value,
  clearWrongDetectedHighlight: () => clearWrongDetectedHighlight(),
  recordPerformanceTimelineSuccess,
  recordPerformanceTimelineMissed,
  recordSessionAttempt,
  recordPerformancePromptResolution: (activeSessionStats, input) => {
    recordPerformancePromptResolution(activeSessionStats as typeof state.activeSessionStats, input);
  },
  updateStats,
  updateSessionGoalProgress: updateSessionGoalProgressFromActiveStats,
  recordPerformanceTimingAttempt: (activeSessionStats, grade) => {
    recordPerformanceTimingAttempt(activeSessionStats as typeof state.activeSessionStats, grade);
  },
  recordPerformanceTimingByEvent,
  setInfoSlots,
  redrawFretboard,
  drawFretboard,
  setResultMessage,
  scheduleSessionTimeout,
  nextPrompt,
});

function isPolyphonicMelodyPrompt(prompt: Prompt | null): prompt is Prompt & {
  targetMelodyEventNotes: NonNullable<Prompt['targetMelodyEventNotes']>;
} {
  return Boolean(prompt && (prompt.targetMelodyEventNotes?.length ?? 0) > 1);
}

function updateMicPolyphonicDetectorRuntimeStatusFromResult(
  result: ReturnType<typeof detectMicPolyphonicFrame>,
  latencyMs: number
) {
  const nowMs = Date.now();
  if (state.micPolyphonicDetectorTelemetryWindowStartedAtMs <= 0) {
    state.micPolyphonicDetectorTelemetryWindowStartedAtMs = nowMs;
  }
  state.micPolyphonicDetectorTelemetryFrames += 1;
  state.micPolyphonicDetectorTelemetryTotalLatencyMs += Math.max(0, latencyMs);
  state.micPolyphonicDetectorTelemetryMaxLatencyMs = Math.max(
    state.micPolyphonicDetectorTelemetryMaxLatencyMs,
    Math.max(0, latencyMs)
  );
  state.micPolyphonicDetectorTelemetryLastLatencyMs = Math.max(0, latencyMs);
  if (result.fallbackFrom) state.micPolyphonicDetectorTelemetryFallbackFrames += 1;
  if ((result.warnings?.length ?? 0) > 0) state.micPolyphonicDetectorTelemetryWarningFrames += 1;

  const nextProvider = result.provider ?? null;
  const nextFallbackFrom = result.fallbackFrom ?? null;
  const nextWarning = result.warnings?.[0] ?? null;
  const changed =
    state.lastMicPolyphonicDetectorProviderUsed !== nextProvider ||
    state.lastMicPolyphonicDetectorFallbackFrom !== nextFallbackFrom ||
    state.lastMicPolyphonicDetectorWarning !== nextWarning;

  state.lastMicPolyphonicDetectorProviderUsed = nextProvider;
  state.lastMicPolyphonicDetectorFallbackFrom = nextFallbackFrom;
  state.lastMicPolyphonicDetectorWarning = nextWarning;

  const shouldRefreshTelemetryUi =
    state.inputSource === 'microphone' &&
    (changed || nowMs - state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs >= 1000);

  if (shouldRefreshTelemetryUi) {
    state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = nowMs;
    refreshMicPolyphonicDetectorAudioInfoUi();
    refreshMicPerformanceReadinessUi(nowMs);
  }
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
  if (dom.trainingMode.value !== 'performance') return null;
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

function clearPerformanceTimelineFeedback() {
  clearPerformanceTimelineFeedbackState(state);
  state.performanceTimingByEvent = {};
  state.performanceOnsetRejectsByEvent = {};
  state.performanceCaptureTelemetryByEvent = {};
}

function ensureCurrentPerformanceTimelineFeedbackBucket() {
  const feedbackKey = getCurrentPerformanceTimelineFeedbackKey();
  if (!feedbackKey) return false;
  if (state.performanceTimelineFeedbackKey !== feedbackKey) {
    state.performanceTimelineFeedbackKey = feedbackKey;
    state.performanceTimelineFeedbackByEvent = {};
    state.performanceTimingByEvent = {};
    state.performanceOnsetRejectsByEvent = {};
    state.performanceCaptureTelemetryByEvent = {};
  }
  return true;
}

function recordPerformanceTimelineSuccess(prompt: Prompt, redraw = true) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  if (!ensureCurrentPerformanceTimelineFeedbackBucket()) return;
  appendPerformanceTimelineAttempts(
    state.performanceTimelineFeedbackByEvent,
    eventIndex,
    buildPerformanceTimelineSuccessAttempts(prompt)
  );
  if (redraw) {
    redrawFretboard();
    return;
  }
  scheduleMelodyTimelineRenderFromState();
}

function recordPerformanceTimelineWrongAttempt(note: string) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  if (!ensureCurrentPerformanceTimelineFeedbackBucket()) return;
  state.performancePromptHadWrongAttempt = true;
  appendPerformanceTimelineAttempts(
    state.performanceTimelineFeedbackByEvent,
    eventIndex,
    buildPerformanceTimelineWrongAttempt({
      note,
      stringName: state.wrongDetectedString,
      fret: state.wrongDetectedFret,
    })
  );
  scheduleMelodyTimelineRenderFromState();
}

function recordPerformanceTimelineMissed(prompt: Prompt) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  if (!ensureCurrentPerformanceTimelineFeedbackBucket()) return;
  appendPerformanceTimelineAttempts(
    state.performanceTimelineFeedbackByEvent,
    eventIndex,
    buildPerformanceTimelineMissedAttempts(prompt)
  );
  scheduleMelodyTimelineRenderFromState();
}

function recordPerformanceTimingByEvent(grade: PerformanceTimingGrade | null | undefined) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null || !grade) return;
  const bucket = state.performanceTimingByEvent[eventIndex] ?? [];
  bucket.push({
    bucket: grade.bucket,
    label: grade.label,
    weight: grade.weight,
    signedOffsetMs: grade.signedOffsetMs,
    judgedAtMs: Date.now(),
  });
  state.performanceTimingByEvent[eventIndex] = bucket;
}

function createEmptyPerformanceCaptureEventTelemetry(): PerformanceCaptureEventTelemetry {
  return {
    preStableSeenCount: 0,
    voicedFrameCount: 0,
    confidentFrameCount: 0,
    detectedNoteFrameCount: 0,
    maxStableRunFrames: 0,
    maxAttackPeak: 0,
    avgRms: 0,
    rmsSampleCount: 0,
    stableDetectionCount: 0,
    promptAttemptCount: 0,
    uncertainFrameCount: 0,
    uncertainReasonCounts: {
      weak_attack: 0,
      low_confidence: 0,
      low_voicing: 0,
      short_hold: 0,
    },
  };
}

function ensurePerformanceCaptureEventTelemetry(eventIndex: number) {
  const existing = state.performanceCaptureTelemetryByEvent[eventIndex];
  if (existing) return existing;
  const next = createEmptyPerformanceCaptureEventTelemetry();
  state.performanceCaptureTelemetryByEvent[eventIndex] = next;
  return next;
}

function recordPerformanceStableDetectionByEvent() {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  const telemetry = ensurePerformanceCaptureEventTelemetry(eventIndex);
  telemetry.stableDetectionCount += 1;
}

function recordPerformancePromptAttemptByEvent() {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  const telemetry = ensurePerformanceCaptureEventTelemetry(eventIndex);
  telemetry.promptAttemptCount += 1;
}

function recordPerformanceCaptureFrameTelemetry(input: {
  rms: number;
  detectedNote: string | null;
  nextStableNoteCounter: number;
  requiredStableFrames: number;
  confident: boolean;
  voiced: boolean;
  attackPeak: number;
}) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  const telemetry = ensurePerformanceCaptureEventTelemetry(eventIndex);
  telemetry.rmsSampleCount += 1;
  const nextCount = telemetry.rmsSampleCount;
  const safeRms = Number.isFinite(input.rms) ? Math.max(0, input.rms) : 0;
  telemetry.avgRms = ((telemetry.avgRms * (nextCount - 1)) + safeRms) / nextCount;
  const safeAttackPeak = Number.isFinite(input.attackPeak) ? Math.max(0, input.attackPeak) : 0;
  telemetry.maxAttackPeak = Math.max(telemetry.maxAttackPeak, safeAttackPeak);

  if (!input.detectedNote?.trim()) return;
  telemetry.detectedNoteFrameCount += 1;
  if (input.voiced) telemetry.voicedFrameCount += 1;
  if (input.confident) telemetry.confidentFrameCount += 1;

  const stableRun = Number.isFinite(input.nextStableNoteCounter)
    ? Math.max(0, Math.round(input.nextStableNoteCounter))
    : 0;
  telemetry.maxStableRunFrames = Math.max(telemetry.maxStableRunFrames, stableRun);
  if (stableRun > 0 && stableRun < Math.max(1, input.requiredStableFrames)) {
    telemetry.preStableSeenCount += 1;
  }
}

function resolvePerformanceUncertainReasonKey(input: {
  voicingAccepted: boolean;
  confidenceAccepted: boolean;
  attackAccepted: boolean;
  holdAccepted: boolean;
}): MicPerformanceOnsetRejectReasonKey | null {
  if (!input.voicingAccepted) return 'low_voicing';
  if (!input.confidenceAccepted) return 'low_confidence';
  if (!input.attackAccepted) return 'weak_attack';
  if (!input.holdAccepted) return 'short_hold';
  return null;
}

function recordPerformanceUncertainFrameByEvent(reasonKey: MicPerformanceOnsetRejectReasonKey | null) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  const telemetry = ensurePerformanceCaptureEventTelemetry(eventIndex);
  telemetry.uncertainFrameCount += 1;
  if (reasonKey) {
    telemetry.uncertainReasonCounts[reasonKey] += 1;
  }
}

function recordPerformanceOnsetRejectByEvent(input: {
  reasonKey: MicPerformanceOnsetRejectReasonKey;
  reason: string | null;
  rejectedAtMs: number;
  onsetNote: string | null;
  onsetAtMs: number | null;
  eventDurationMs: number | null;
  holdRequiredMs: number | null;
  holdElapsedMs: number | null;
  runtimeCalibrationLevel: PerformanceMicHoldCalibrationLevel | null;
}) {
  const eventIndex = getCurrentPerformanceTimelineEventIndex();
  if (eventIndex === null) return;
  const bucket = state.performanceOnsetRejectsByEvent[eventIndex] ?? [];
  const lastEntry = bucket[bucket.length - 1];
  if (
    lastEntry &&
    lastEntry.reasonKey === input.reasonKey &&
    lastEntry.onsetNote === input.onsetNote &&
    lastEntry.onsetAtMs === input.onsetAtMs
  ) {
    return;
  }
  bucket.push({
    reasonKey: input.reasonKey,
    reason: input.reason ?? null,
    rejectedAtMs: input.rejectedAtMs,
    onsetNote: input.onsetNote ?? null,
    onsetAtMs: input.onsetAtMs ?? null,
    eventDurationMs:
      typeof input.eventDurationMs === 'number' && Number.isFinite(input.eventDurationMs)
        ? Math.max(0, Math.round(input.eventDurationMs))
        : null,
    holdRequiredMs:
      typeof input.holdRequiredMs === 'number' && Number.isFinite(input.holdRequiredMs)
        ? Math.max(0, Math.round(input.holdRequiredMs))
        : null,
    holdElapsedMs:
      typeof input.holdElapsedMs === 'number' && Number.isFinite(input.holdElapsedMs)
        ? Math.max(0, Math.round(input.holdElapsedMs))
        : null,
    runtimeCalibrationLevel:
      input.runtimeCalibrationLevel === 'mild' || input.runtimeCalibrationLevel === 'strong'
        ? input.runtimeCalibrationLevel
        : input.runtimeCalibrationLevel === 'off'
          ? 'off'
          : null,
  });
  state.performanceOnsetRejectsByEvent[eventIndex] = bucket;
}

function detectMonophonicOctaveMismatch(
  detectedNote: string,
  detectedFrequency?: number | null
) {
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
  recordPerformanceTimelineWrongAttempt,
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
  recordPerformanceTimelineWrongAttempt,
  markPerformancePromptAttempt: () => {
    recordPerformancePromptAttemptByEvent();
    performancePromptController.markPromptAttempt();
  },
  markPerformanceMicOnsetJudged: (detectedNote, onsetAtMs) => {
    state.performanceMicLastJudgedOnsetNote = detectedNote;
    state.performanceMicLastJudgedOnsetAtMs = onsetAtMs;
  },
  recordPerformanceMicJudgmentLatency: (onsetAtMs, judgedAtMs) => {
    const latencyMs = Math.max(0, judgedAtMs - onsetAtMs);
    state.micPerformanceJudgmentCount += 1;
    state.micPerformanceJudgmentTotalLatencyMs += latencyMs;
    state.micPerformanceJudgmentLastLatencyMs = latencyMs;
    state.micPerformanceJudgmentMaxLatencyMs = Math.max(state.micPerformanceJudgmentMaxLatencyMs, latencyMs);
    if (state.micPerformanceLatencyCalibrationActive && state.micPerformanceJudgmentCount >= 5) {
      state.micPerformanceLatencyCalibrationActive = false;
    }
    refreshMicPerformanceReadinessUiThrottled(judgedAtMs);
  },
  isPerformancePitchWithinTolerance: (detectedFrequency) =>
    state.inputSource === 'microphone' &&
    isPerformancePitchWithinToleranceHelper(
      detectedFrequency,
      state.targetFrequency,
      state.performanceMicTolerancePreset
    ),
  detectMonophonicOctaveMismatch,
  performanceResolveSuccess: (elapsedSeconds, timingGrade) => {
    updatePerformanceTimingBiasFromGrade(timingGrade ?? null);
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

const melodyRuntimeDetectionController = createMelodyRuntimeDetectionController({
  state,
  requiredStableFrames: REQUIRED_STABLE_FRAMES,
  getTrainingMode: () => dom.trainingMode.value,
  detectMicPolyphonicFrame: (input) =>
    detectMicPolyphonicFrame({
      ...input,
      provider: normalizeMicPolyphonicDetectorProvider(input.provider),
    }),
  updateMicPolyphonicDetectorRuntimeStatus: updateMicPolyphonicDetectorRuntimeStatusFromResult,
  now: () => Date.now(),
  performanceNow: () => performance.now(),
  redrawFretboard,
  setResultMessage,
  recordPerformanceTimelineWrongAttempt,
  markPerformancePromptAttempt: () => {
    recordPerformancePromptAttemptByEvent();
    performancePromptController.markPromptAttempt();
  },
  performanceResolveSuccess: (elapsedSeconds, timingGrade) => {
    updatePerformanceTimingBiasFromGrade(timingGrade ?? null);
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
  updateMicPolyphonicDetectorRuntimeStatus: updateMicPolyphonicDetectorRuntimeStatusFromResult,
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
    if (
      !state.isCalibrating &&
      state.inputSource !== 'midi' &&
      Date.now() < state.ignorePromptAudioUntilMs
    ) {
      Object.assign(state, createStabilityTrackingResetState());
      resetMicMonophonicAttackTracking();
      setVolumeLevel(0);
      updateTuner(null);
      if (dom.trainingMode.value === 'free') {
        clearLiveDetectedHighlight(state, redrawFretboard);
      }
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }

    // Shared volume calculation
    state.analyser.getFloatTimeDomainData(state.dataArray!);
    const volume = calculateRmsLevel(state.dataArray!);
    state.micLastInputRms = volume;
    setVolumeLevel(volume);

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    const baseMicVolumeThreshold = resolveMicVolumeThreshold(
      state.micSensitivityPreset,
      state.micAutoNoiseFloorRms
    );
    const performanceAdaptiveMicInput = state.inputSource !== 'midi' && trainingMode === 'performance';
    const micVolumeThreshold = performanceAdaptiveMicInput
      ? resolvePerformanceMicVolumeThreshold({
          baseThreshold: baseMicVolumeThreshold,
          sensitivityPreset: state.micSensitivityPreset,
          autoNoiseFloorRms: state.micAutoNoiseFloorRms,
        })
      : baseMicVolumeThreshold;
    const preflightPlan = buildProcessAudioFramePreflightPlan({
      volume,
      volumeThreshold: micVolumeThreshold,
      consecutiveSilence: state.consecutiveSilence,
      silenceResetAfterFrames: performanceAdaptiveMicInput
        ? resolvePerformanceSilenceResetAfterFrames(state.currentPrompt?.melodyEventDurationMs ?? null)
        : undefined,
      isCalibrating: state.isCalibrating,
      trainingMode,
      hasMode: Boolean(mode),
      hasCurrentPrompt: Boolean(state.currentPrompt),
    });
    state.consecutiveSilence = preflightPlan.nextConsecutiveSilence;

    if (preflightPlan.kind === 'silence_wait') {
      if (preflightPlan.shouldResetTracking) {
        Object.assign(state, createStabilityTrackingResetState());
        resetMicMonophonicAttackTracking();
        if (preflightPlan.shouldResetTuner) updateTuner(null);
        if (preflightPlan.shouldClearFreeHighlight) clearLiveDetectedHighlight(state, redrawFretboard);
      }
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }

    if (preflightPlan.kind === 'missing_mode_or_prompt') {
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }

    const shouldUseMicrophonePolyphonicMelodyDetection =
      isMelodyWorkflowMode(trainingMode) &&
      state.inputSource !== 'midi' &&
      isPolyphonicMelodyPrompt(state.currentPrompt);

    if (shouldUseMicrophonePolyphonicMelodyDetection) {
      handleMicrophonePolyphonicMelodyFrame(volume);
    } else if (mode.detectionType === 'polyphonic') {
      // --- Polyphonic (Chord Strum) Detection ---
      polyphonicChordDetectionController.handleAudioChordFrame(volume);
    } else {
      // --- Monophonic (Single Note) Detection ---
      const frequency = detectPitch(state.dataArray!, state.audioContext.sampleRate, micVolumeThreshold, {
        expectedFrequency: performanceAdaptiveMicInput ? state.targetFrequency : null,
        preferLowLatency: performanceAdaptiveMicInput,
      });
      if (state.isCalibrating) {
        const { expectedFrequency } = getOpenATuningInfoFromTuning(state.currentInstrument.TUNING);
        const calibrationResult = detectCalibrationFrame({
          frequency,
          expectedFrequency,
          currentSampleCount: state.calibrationFrequencies.length,
          requiredSamples: CALIBRATION_SAMPLES,
        });
        const calibrationReactionPlan = buildCalibrationFrameReactionPlan({
          accepted: calibrationResult.accepted,
          progressPercent: calibrationResult.progressPercent,
          isComplete: calibrationResult.isComplete,
        });
        if (calibrationReactionPlan.kind === 'accept_sample') {
          executeCalibrationFrameReaction({
            reactionPlan: calibrationReactionPlan,
            acceptedFrequency: frequency,
            pushCalibrationFrequency: (value) => {
              state.calibrationFrequencies.push(value);
            },
            setCalibrationProgress,
            finishCalibration,
          });
        }
      } else {
        updateTuner(frequency);
        const requiredStableFrames = performanceAdaptiveMicInput
          ? resolvePerformanceRequiredStableFrames(state.currentPrompt?.melodyEventDurationMs ?? null)
          : REQUIRED_STABLE_FRAMES;
        const monophonicResult = detectMonophonicFrame({
          frequency,
          lastPitches: state.lastPitches,
          lastNote: state.lastNote,
          stableNoteCounter: state.stableNoteCounter,
          previousConfidenceEma: state.monophonicConfidenceEma,
          previousVoicingEma: state.monophonicVoicingEma,
          requiredStableFrames,
          targetNote: state.currentPrompt.targetNote,
          noteResolver: freqToNoteName,
          emaPreset: performanceAdaptiveMicInput ? 'performance_fast' : 'default',
        });
        state.micLastMonophonicConfidence = monophonicResult.confidence;
        state.micLastMonophonicPitchSpreadCents = monophonicResult.pitchSpreadCents;
        if (monophonicResult.detectedNote) {
          state.micLastMonophonicDetectedAtMs = Date.now();
        }
        if (state.inputSource === 'microphone') {
          refreshMicPerformanceReadinessUiThrottled();
        }
        state.lastPitches = monophonicResult.nextLastPitches;
        state.lastNote = monophonicResult.nextLastNote;
        state.stableNoteCounter = monophonicResult.nextStableNoteCounter;
        state.monophonicConfidenceEma = monophonicResult.nextConfidenceEma;
        state.monophonicVoicingEma = monophonicResult.nextVoicingEma;
        const monophonicReactionPlan = buildAudioMonophonicReactionPlan({
          detectedNote: monophonicResult.detectedNote,
          nextStableNoteCounter: monophonicResult.nextStableNoteCounter,
          requiredStableFrames,
        });
        if (performanceAdaptiveMicInput) {
          recordPerformanceCaptureFrameTelemetry({
            rms: volume,
            detectedNote: monophonicResult.detectedNote,
            nextStableNoteCounter: monophonicResult.nextStableNoteCounter,
            requiredStableFrames,
            confident: monophonicResult.isConfident,
            voiced: monophonicResult.isVoiced,
            attackPeak: state.micMonophonicAttackPeakVolume,
          });
        }
        executeAudioMonophonicReaction({
          reactionPlan: monophonicReactionPlan,
          onStableDetectedNote: (detectedNote) => {
            if (performanceAdaptiveMicInput) {
              recordPerformanceStableDetectionByEvent();
            }
            updateMicMonophonicAttackTracking(detectedNote, volume);
            const nowMs = Date.now();
            const performanceHoldCalibrationLevel =
              resolveEffectiveRuntimePerformanceMicHoldCalibrationLevel(
                performanceAdaptiveMicInput
              );
            const attackRequiredPeak =
              state.inputSource === 'midi'
                ? 0
                : resolveMicNoteAttackRequiredPeak({
                    preset: state.micNoteAttackFilterPreset,
                    volumeThreshold: micVolumeThreshold,
                    performanceAdaptive: performanceAdaptiveMicInput,
                    smoothedConfidence: monophonicResult.confidence,
                    smoothedVoicing: monophonicResult.voicingConfidence,
                  });
            const attackAccepted =
              state.inputSource === 'midi' ||
              shouldAcceptMicNoteByAttackStrength({
                preset: state.micNoteAttackFilterPreset,
                peakVolume: state.micMonophonicAttackPeakVolume,
                volumeThreshold: micVolumeThreshold,
                performanceAdaptive: performanceAdaptiveMicInput,
                smoothedConfidence: monophonicResult.confidence,
                smoothedVoicing: monophonicResult.voicingConfidence,
              });
            const holdRequiredMs = resolveMicNoteHoldRequiredDurationMs({
              preset: state.micNoteHoldFilterPreset,
              performanceAdaptive: performanceAdaptiveMicInput,
              eventDurationMs: state.currentPrompt?.melodyEventDurationMs ?? null,
              performanceCalibrationLevel: performanceHoldCalibrationLevel,
            });
            const holdElapsedMs =
              state.micMonophonicFirstDetectedAtMs === null
                ? null
                : Math.max(0, nowMs - state.micMonophonicFirstDetectedAtMs);
            const holdAccepted =
              state.inputSource === 'midi' ||
              shouldAcceptMicNoteByHoldDuration({
                preset: state.micNoteHoldFilterPreset,
                noteFirstDetectedAtMs: state.micMonophonicFirstDetectedAtMs,
                nowMs,
                performanceAdaptive: performanceAdaptiveMicInput,
                eventDurationMs: state.currentPrompt?.melodyEventDurationMs ?? null,
                performanceCalibrationLevel: performanceHoldCalibrationLevel,
              });
            const performanceMicThresholds =
              performanceAdaptiveMicInput
                ? resolvePerformanceMicJudgingThresholds({
                    smoothedConfidence: monophonicResult.confidence,
                    rawConfidence: monophonicResult.rawConfidence,
                    smoothedVoicing: monophonicResult.voicingConfidence,
                    rawVoicing: monophonicResult.rawVoicingConfidence,
                    attackPeakVolume: state.micMonophonicAttackPeakVolume,
                    attackRequiredPeak,
                  })
                : null;
            const confidenceAccepted =
              performanceMicThresholds?.confidenceAccepted ?? monophonicResult.isConfident;
            const voicingAccepted =
              performanceMicThresholds?.voicingAccepted ?? monophonicResult.isVoiced;
            if (performanceAdaptiveMicInput) {
              const onsetAtMs = state.micMonophonicFirstDetectedAtMs;
              const eventDurationMs = state.currentPrompt?.melodyEventDurationMs ?? null;
              if (!voicingAccepted) {
                setMicPerformanceOnsetGateStatus(
                  'rejected',
                  `Reason: low voicing (${monophonicResult.voicingConfidence.toFixed(2)}).`,
                  {
                    atMs: nowMs,
                    rejectReasonKey: 'low_voicing',
                    onsetNote: detectedNote,
                    onsetAtMs,
                    eventDurationMs,
                    runtimeCalibrationLevel: performanceHoldCalibrationLevel,
                  }
                );
              } else if (!confidenceAccepted) {
                setMicPerformanceOnsetGateStatus(
                  'rejected',
                  `Reason: low confidence (${monophonicResult.confidence.toFixed(2)}).`,
                  {
                    atMs: nowMs,
                    rejectReasonKey: 'low_confidence',
                    onsetNote: detectedNote,
                    onsetAtMs,
                    eventDurationMs,
                    runtimeCalibrationLevel: performanceHoldCalibrationLevel,
                  }
                );
              } else if (!attackAccepted) {
                setMicPerformanceOnsetGateStatus(
                  'rejected',
                  `Reason: weak attack (peak ${state.micMonophonicAttackPeakVolume.toFixed(3)} < ${attackRequiredPeak.toFixed(3)}).`,
                  {
                    atMs: nowMs,
                    rejectReasonKey: 'weak_attack',
                    onsetNote: detectedNote,
                    onsetAtMs,
                    eventDurationMs,
                    runtimeCalibrationLevel: performanceHoldCalibrationLevel,
                  }
                );
              } else if (!holdAccepted) {
                setMicPerformanceOnsetGateStatus(
                  'rejected',
                  `Reason: hold too short (${Math.round(holdElapsedMs ?? 0)}ms < ${holdRequiredMs}ms).`,
                  {
                    atMs: nowMs,
                    rejectReasonKey: 'short_hold',
                    onsetNote: detectedNote,
                    onsetAtMs,
                    eventDurationMs,
                    holdRequiredMs,
                    holdElapsedMs,
                    runtimeCalibrationLevel: performanceHoldCalibrationLevel,
                  }
                );
              } else {
                setMicPerformanceOnsetGateStatus(
                  'accepted',
                  `Peak ${state.micMonophonicAttackPeakVolume.toFixed(3)}, conf ${monophonicResult.confidence.toFixed(2)}, voicing ${monophonicResult.voicingConfidence.toFixed(2)}.`,
                  { atMs: nowMs }
                );
              }
              refreshMicPerformanceReadinessUiThrottled(nowMs);
            }
            const uncertainReasonKey = resolvePerformanceUncertainReasonKey({
              voicingAccepted,
              confidenceAccepted,
              attackAccepted,
              holdAccepted,
            });
            if (
              performanceAdaptiveMicInput &&
              shouldReportPerformanceMicUncertainFrame({
                detectedNote,
                noteFirstDetectedAtMs: state.micMonophonicFirstDetectedAtMs,
                promptStartedAtMs: resolveLatencyCompensatedPromptStartedAtMs(
                  state.startTime,
                  state.performanceMicLatencyCompensationMs
                ) ?? state.startTime,
                nowMs,
                attackAccepted,
                holdAccepted,
                confidenceAccepted,
                voicingAccepted,
                lastReportedOnsetNote: state.performanceMicLastUncertainOnsetNote,
                lastReportedOnsetAtMs: state.performanceMicLastUncertainOnsetAtMs,
                eventDurationMs: state.currentPrompt?.melodyEventDurationMs ?? null,
                leniencyPreset: state.performanceTimingLeniencyPreset ?? 'normal',
              })
            ) {
              state.performanceMicLastUncertainOnsetNote = detectedNote;
              state.performanceMicLastUncertainOnsetAtMs = state.micMonophonicFirstDetectedAtMs;
              recordPerformanceUncertainFrameByEvent(uncertainReasonKey);
              setResultMessage('Low mic confidence. Play a cleaner single-note attack.', 'neutral');
            }
            if (
              state.inputSource !== 'midi' &&
              !voicingAccepted
            ) {
              return;
            }
            if (
              state.inputSource !== 'midi' &&
              !confidenceAccepted
            ) {
              return;
            }
            if (
              state.inputSource !== 'midi' &&
              !attackAccepted
            ) {
              return;
            }
            if (
              state.inputSource !== 'midi' &&
              !holdAccepted
            ) {
              return;
            }
            handleStableMonophonicDetectedNote(detectedNote, monophonicResult.smoothedFrequency);
          },
        });
        if (monophonicReactionPlan.kind === 'none') {
          updateMicMonophonicAttackTracking(monophonicResult.detectedNote, volume);
        }
      }
    }

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
    if (trainingMode === 'performance') {
      // Defensive reset so every fresh performance session starts from preroll.
      stopPerformanceTransportLoop();
      clearTrackedTimeouts(state.pendingTimeoutIds);
      performancePromptController.invalidatePendingAdvance();
      state.performanceRuntimeStartedAtMs = null;
      state.performancePrerollLeadInVisible = false;
      state.performancePrerollStartedAtMs = null;
      state.performancePrerollDurationMs = 0;
      state.performancePrerollStepIndex = null;
      state.performanceActiveEventIndex = null;
    }
    const mode = modes[trainingMode];
    const startPlan = buildSessionStartPlan({
      trainingMode,
      modeDetectionType: mode?.detectionType ?? null,
      progressionName: dom.progressionSelector.value,
      progressions: state.currentInstrument.CHORD_PROGRESSIONS,
      timedDuration: TIMED_CHALLENGE_DURATION,
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
    const initialPromptPlan = !forCalibration
      ? buildSessionInitialPromptPlan(dom.trainingMode.value)
      : { delayMs: 0, prepMessage: '', pulseCount: 0 };
    if (!forCalibration) {
      // Keep runtime source in sync with what the user currently selected in UI.
      // This prevents starting a MIDI-only session while the UI shows microphone (or vice versa).
      setInputSourcePreference(normalizeInputSource(dom.inputSource.value));
    }
    const selectedInputSource = !forCalibration ? state.inputSource : 'microphone';
    state.performanceMicHoldCalibrationLevel = forCalibration
      ? 'off'
      : resolveSessionPerformanceMicHoldCalibrationLevel({
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
      state.micPerformanceReadinessLastUiRefreshAtMs = 0;
      state.micPerformanceJudgmentCount = 0;
      state.micPerformanceJudgmentTotalLatencyMs = 0;
      state.micPerformanceJudgmentLastLatencyMs = null;
      state.micPerformanceJudgmentMaxLatencyMs = 0;
      resetMicPerformanceOnsetGateStatus();
      resetMicPerformanceOnsetRejectTelemetry();
      state.currentMelodyId = dom.melodySelector.value.trim() || null;
      clearPerformanceTimelineFeedback();
      resetMicPolyphonicDetectorTelemetry();
      if (selectedInputSource === 'microphone') {
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
          dom.trainingMode.value === 'performance'
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
          ? selectedMode?.textContent?.trim() || dom.trainingMode.value
          : undefined,
        instrumentName: !forCalibration ? state.currentInstrument.name : undefined,
        tuningPresetKey: !forCalibration ? state.currentTuningPresetKey : undefined,
        stringOrder: !forCalibration ? state.currentInstrument.STRING_ORDER : undefined,
        enabledStrings: !forCalibration ? Array.from(getEnabledStrings(dom.stringSelector)) : undefined,
        minFret: fretRange.minFret,
        maxFret: fretRange.maxFret,
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
            startPerformanceRuntimeClock();
            nextPrompt();
            return;
          }

          setPromptText('');
          if (initialPromptPlan.prepMessage) {
            setResultMessage(initialPromptPlan.prepMessage);
          }
          applySessionInitialTimelinePreview(initialPromptPlan.prepMessage);
          beginPerformancePrerollTimeline(initialPromptPlan.pulseCount, initialPromptPlan.delayMs);
          const pulseIntervalMs =
            initialPromptPlan.pulseCount > 0 ? initialPromptPlan.delayMs / initialPromptPlan.pulseCount : 0;
          for (let pulseIndex = 1; pulseIndex < initialPromptPlan.pulseCount; pulseIndex += 1) {
            scheduleSessionTimeout(
              Math.round(pulseIntervalMs * pulseIndex),
              () => {
                advancePerformancePrerollTimeline(pulseIndex, initialPromptPlan.pulseCount);
              },
              `session initial prompt preroll pulse ${pulseIndex + 1}`
            );
          }
          scheduleSessionTimeout(
            initialPromptPlan.delayMs,
            () => {
              if (!state.isListening) return;
              finishPerformancePrerollTimeline();
              clearSessionInitialTimelinePreview();
              clearResultMessage();
              startPerformanceRuntimeClock();
              nextPrompt();
            },
            'session initial prompt preroll'
          );
        },
        processAudio,
      }
    );
  } catch (err) {
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
  if (state.activeSessionStats && !state.isCalibrating) {
    const finalizedSessionStats = finalizeSessionStats(state.activeSessionStats);
    state.lastSessionStats = finalizedSessionStats;
    if (finalizedSessionStats?.modeKey === 'performance') {
      state.lastSessionPerformanceNoteLog = buildPerformanceSessionNoteLogSnapshot({
        sessionStats: finalizedSessionStats,
        feedbackKey: state.performanceTimelineFeedbackKey,
        feedbackByEvent: state.performanceTimelineFeedbackByEvent,
      });
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
  stopPerformanceTransportLoop();
  clearTrackedTimeouts(state.pendingTimeoutIds);
  performancePromptController.invalidatePendingAdvance();
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.cooldown = false;
  state.ignorePromptAudioUntilMs = 0;
  resetMicMonophonicAttackTracking();
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
  clearPerformanceTimelineFeedback();
  state.currentMelodyEventIndex = Math.max(0, Math.round(eventIndex));
  state.performanceActiveEventIndex = dom.trainingMode.value === 'performance' ? state.currentMelodyEventIndex : null;
  state.currentMelodyEventFoundNotes.clear();
  performancePromptController.resetPromptResolution();
  state.pendingSessionStopResultMessage = null;
  clearWrongDetectedHighlight();
  if (dom.trainingMode.value === 'performance') {
    startPerformanceRuntimeClock(state.currentMelodyEventIndex);
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
      dom.trainingMode.value === 'performance' &&
      state.performanceRuntimeStartedAtMs === null &&
      !state.performancePrerollLeadInVisible
    ) {
      startPerformanceRuntimeClock();
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
    resetMicMonophonicAttackTracking();
    Object.assign(state, createPromptCycleTrackingResetState());

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
      let prompt: Prompt | null = null;
      if (trainingMode === 'performance') {
        const performanceContext = getActivePerformanceTransportContext();
        if (performanceContext) {
          state.currentMelodyId = performanceContext.melody.id;
        }
        let performanceEventIndex = state.performanceActiveEventIndex;
      if (
        performanceContext &&
        (!(typeof performanceEventIndex === 'number') ||
          performanceEventIndex < performanceContext.studyRange.startIndex ||
          performanceEventIndex > performanceContext.studyRange.endIndex) &&
        state.performanceRuntimeStartedAtMs !== null
      ) {
        const transportFrame = resolvePerformanceTransportFrame({
          melody: performanceContext.melody,
          bpm: performanceContext.bpm,
          studyRange: performanceContext.studyRange,
          runtimeStartedAtMs: state.performanceRuntimeStartedAtMs,
          nowMs: Date.now(),
        });
        if (!transportFrame.isComplete && transportFrame.activeEventIndex !== null) {
          performanceEventIndex = transportFrame.activeEventIndex;
          state.performanceActiveEventIndex = performanceEventIndex;
          state.currentMelodyEventIndex = performanceEventIndex;
          if (transportFrame.eventStartedAtMs !== null) {
            state.startTime = transportFrame.eventStartedAtMs;
          }
        }
      }
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
        state.currentPrompt = nextPrompt;
        state.currentMelodyEventFoundNotes.clear();
        setPromptText(nextPrompt.displayText);
        redrawFretboard();
        scheduleMelodyTimelineRenderFromState();
        configurePromptAudio();
        state.startTime = Date.now();
        void syncMelodySessionMetronomeToPromptStart();
        if (trainingMode !== 'performance') {
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

  if (dom.trainingMode.value === 'performance') {
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

/** After a prompt is generated, this configures the audio feedback for the user. */
function configurePromptAudio() {
  const audioPlan = buildPromptAudioPlan({
    prompt: state.currentPrompt,
    trainingMode: dom.trainingMode.value,
    autoPlayPromptSoundEnabled: state.autoPlayPromptSound,
    instrument: state.currentInstrument,
    calibratedA4: state.calibratedA4,
    enabledStrings: getEnabledStrings(dom.stringSelector),
  });
  executePromptAudioPlan(audioPlan, {
    setTargetFrequency: (frequency) => {
      state.targetFrequency = frequency;
    },
    setPlaySoundDisabled: (disabled) => {
      setSessionButtonsState({ playSoundDisabled: disabled });
    },
    playSound,
  });
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
