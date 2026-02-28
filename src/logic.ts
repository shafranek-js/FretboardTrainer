/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import { updateStats, saveLastSessionStats, saveSettings, saveStats } from './storage';
import { updateTuner, redrawFretboard, drawFretboard, displayStats } from './ui';
import { freqToNoteName, freqToScientificNoteName, detectPitch, playSound } from './audio';
import { modes } from './modes';
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
import { resolvePromptTargetPosition } from './prompt-audio';
import {
  createPromptCycleTrackingResetState,
  createStabilityTrackingResetState,
} from './prompt-tracking-state';
import { createSessionStopResetState } from './session-reset-state';
import { buildSessionStartPlan } from './session-start-preflight';
import { ensureAudioRuntime, teardownAudioRuntime } from './audio-runtime';
import { refreshAudioInputDeviceOptions } from './audio-input-devices';
import { startMidiInput, stopMidiInput, type MidiNoteEvent } from './midi-runtime';
import {
  areMidiHeldNotesMatchingTargetChord,
  formatDetectedMidiChordNotes,
} from './midi-chord-evaluation';
import { buildSessionNextPromptPlan } from './session-next-prompt-plan';
import {
  computeCalibratedA4FromSamples,
  getOpenATuningInfoFromTuning,
} from './calibration-utils';
import { buildSessionTimeUpPlan } from './session-timeup-plan';
import {
  finalizeSessionStats,
  recordRhythmTimingAttempt,
  recordSessionAttempt,
} from './session-stats';
import { getMetronomeTimingSnapshot } from './metronome';
import { formatUserFacingError, showNonBlockingError } from './app-feedback';
import { evaluateRhythmTiming, formatRhythmFeedback } from './rhythm-timing';
import { buildSuccessInfoSlots } from './session-result';
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
import {
  buildAudioPolyphonicReactionPlan,
  buildAudioMonophonicReactionPlan,
  buildCalibrationFrameReactionPlan,
  buildMidiPolyphonicReactionPlan,
  buildStableMonophonicReactionPlan,
} from './session-detection-reactions';
import { executeSessionNextPromptPlan } from './session-next-prompt-executor';
import {
  buildFinishCalibrationOutcome,
  closeCalibrationSession,
} from './calibration-session-flow';
import { executePromptAudioPlan } from './prompt-audio-executor';
import { executeSessionTimeUpPlan } from './session-timeup-executor';
import {
  executeAudioMonophonicReaction,
  executeAudioPolyphonicReaction,
  executeCalibrationFrameReaction,
} from './process-audio-reaction-executors';
import { executeDisplayResultSuccessFlow } from './display-result-success-flow-executor';
import { buildProcessAudioFramePreflightPlan } from './process-audio-frame-preflight';
import { executeSessionRuntimeActivation } from './session-runtime-activation-executor';
import { createMidiSessionMessageHandler } from './midi-session-message-handler';
import { createTimedSessionIntervalHandler } from './timed-session-interval-handler';
import type { Prompt } from './types';
import { resolveMicVolumeThreshold } from './mic-input-sensitivity';
import { shouldAcceptMicNoteByAttackStrength } from './mic-note-attack-filter';
import { shouldAcceptMicNoteByHoldDuration } from './mic-note-hold-filter';
import { detectMicPolyphonicFrame } from './mic-polyphonic-detector';
import { refreshMicPolyphonicDetectorAudioInfoUi } from './mic-polyphonic-detector-ui';
import { isMelodyWorkflowMode } from './training-mode-groups';

const handleSessionRuntimeError = createSessionRuntimeErrorHandler({
  stopSession: () => {
    stopListening();
  },
  setStatusText,
  setResultMessage,
});
let performancePromptRunToken = 0;

function resetMicPolyphonicDetectorTelemetry() {
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
  state.micMonophonicFirstDetectedAtMs = null;
}

function updateMicMonophonicAttackTracking(detectedNote: string | null, volume: number) {
  if (!detectedNote) {
    resetMicMonophonicAttackTracking();
    return;
  }

  if (state.micMonophonicAttackTrackedNote !== detectedNote) {
    state.micMonophonicAttackTrackedNote = detectedNote;
    state.micMonophonicAttackPeakVolume = volume;
    state.micMonophonicFirstDetectedAtMs = Date.now();
    return;
  }

  if (volume > state.micMonophonicAttackPeakVolume) {
    state.micMonophonicAttackPeakVolume = volume;
  }
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

function recordPerformancePromptOutcome(correct: boolean, elapsedSeconds: number) {
  const prompt = state.currentPrompt;
  if (!prompt) return;

  recordSessionAttempt(state.activeSessionStats, prompt, correct, elapsedSeconds, state.currentInstrument);
  updateStats(correct, elapsedSeconds);
  updateSessionGoalProgressFromActiveStats();

  if (!correct) return;

  const infoSlots = buildSuccessInfoSlots(prompt);
  if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
    setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
  }

  if (state.showingAllNotes) {
    redrawFretboard();
    return;
  }

  const melodyFingering = prompt.targetMelodyEventNotes ?? [];
  if (melodyFingering.length > 0) {
    drawFretboard(false, null, null, melodyFingering, new Set(melodyFingering.map((note) => note.note)));
    return;
  }

  if (prompt.targetChordNotes.length > 0) {
    drawFretboard(false, null, null, prompt.targetChordFingering, new Set(prompt.targetChordNotes));
    return;
  }

  drawFretboard(false, prompt.targetNote, prompt.targetString);
}

function resolvePerformancePromptSuccess(elapsedSeconds: number) {
  if (dom.trainingMode.value !== 'performance' || !state.currentPrompt || state.performancePromptResolved) {
    return;
  }

  clearWrongDetectedHighlight();
  state.performancePromptResolved = true;
  state.performancePromptMatched = true;
  recordPerformancePromptOutcome(true, elapsedSeconds);
  setResultMessage(`Hit: ${elapsedSeconds.toFixed(2)}s`, 'success');
}

function schedulePerformancePromptAdvance(prompt: Prompt) {
  if (dom.trainingMode.value !== 'performance') return;

  const durationMs =
    typeof prompt.melodyEventDurationMs === 'number' && Number.isFinite(prompt.melodyEventDurationMs)
      ? Math.max(1, Math.round(prompt.melodyEventDurationMs))
      : 700;
  const runToken = ++performancePromptRunToken;

  state.performancePromptResolved = false;
  state.performancePromptMatched = false;

  scheduleSessionTimeout(
    durationMs,
    () => {
      if (!state.isListening || dom.trainingMode.value !== 'performance') return;
      if (runToken !== performancePromptRunToken) return;
      if (state.currentPrompt !== prompt) return;

      if (!state.performancePromptResolved) {
        state.performancePromptResolved = true;
        state.performancePromptMatched = false;
        recordPerformancePromptOutcome(false, 0);
        setResultMessage('Missed event.', 'error');
        redrawFretboard();
      }

      nextPrompt();
    },
    'performance nextPrompt'
  );
}

function isPolyphonicMelodyPrompt(prompt: Prompt | null): prompt is Prompt & {
  targetMelodyEventNotes: NonNullable<Prompt['targetMelodyEventNotes']>;
} {
  return Boolean(prompt && (prompt.targetMelodyEventNotes?.length ?? 0) > 1);
}

function getPolyphonicMelodyTargetPitchClasses(prompt: Prompt) {
  if (prompt.targetChordNotes.length > 0) return [...new Set(prompt.targetChordNotes)];
  return [...new Set((prompt.targetMelodyEventNotes ?? []).map((note) => note.note))];
}

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
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

function resolveDetectedScientificPosition(
  detectedScientificNote: string,
  enabledStrings: Set<string>,
  maxFret = 24
) {
  for (const stringName of state.currentInstrument.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteWithOctave = state.currentInstrument.getNoteWithOctave(stringName, fret);
      if (noteWithOctave === detectedScientificNote) {
        return { stringName, fret };
      }
    }
  }
  return null;
}

function setWrongDetectedHighlight(detectedNote: string, detectedFrequency?: number | null) {
  const enabledStrings = getEnabledStrings(dom.stringSelector);
  const detectedScientific =
    typeof detectedFrequency === 'number' && detectedFrequency > 0
      ? freqToScientificNoteName(detectedFrequency)
      : null;
  const exactResolved = detectedScientific
    ? resolveDetectedScientificPosition(detectedScientific, enabledStrings)
    : null;
  const resolved = resolvePromptTargetPosition({
    targetNote: detectedNote,
    preferredString: null,
    enabledStrings,
    instrument: state.currentInstrument,
  });

  state.wrongDetectedNote = detectedNote;
  state.wrongDetectedString = exactResolved?.stringName ?? resolved?.stringName ?? null;
  state.wrongDetectedFret = exactResolved?.fret ?? resolved?.fret ?? null;
}

function stripScientificOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

function detectMonophonicOctaveMismatch(
  detectedNote: string,
  detectedFrequency?: number | null
): { detectedScientific: string; targetScientific: string } | null {
  const prompt = state.currentPrompt;
  if (!prompt?.targetNote || !prompt.targetString) return null;
  if (typeof detectedFrequency !== 'number' || !Number.isFinite(detectedFrequency) || detectedFrequency <= 0) {
    return null;
  }
  if (!Number.isFinite(state.targetFrequency) || !state.targetFrequency || state.targetFrequency <= 0) {
    return null;
  }

  const detectedScientific = freqToScientificNoteName(detectedFrequency);
  const targetScientific = freqToScientificNoteName(state.targetFrequency);
  if (!detectedScientific || !targetScientific) return null;
  if (stripScientificOctave(detectedScientific) !== detectedNote) return null;
  if (stripScientificOctave(targetScientific) !== prompt.targetNote) return null;
  if (detectedScientific === targetScientific) return null;
  return { detectedScientific, targetScientific };
}

function handleMelodyPolyphonicMismatch(prompt: Prompt, detectedText: string, context: string) {
  state.currentMelodyEventFoundNotes.clear();
  redrawFretboard();
  recordSessionAttempt(state.activeSessionStats, prompt, false, 0, state.currentInstrument);
  setResultMessage(`Heard: ${detectedText} [wrong]`, 'error');
  if (state.showingAllNotes) return;

  const fingering = prompt.targetMelodyEventNotes ?? prompt.targetChordFingering;
  drawFretboard(false, null, null, fingering, new Set());
  scheduleSessionCooldown(context, 1200, () => {
    redrawFretboard();
  });
}

function handleMicrophonePolyphonicMelodyFrame(frameVolumeRms: number) {
  const prompt = state.currentPrompt;
  if (!isPolyphonicMelodyPrompt(prompt) || !state.analyser || !state.audioContext) return false;
  const trainingMode = dom.trainingMode.value;

  state.analyser.getFloatFrequencyData(state.frequencyDataArray!);
  const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
  const polyphonicDetectorStartedAt = performance.now();
  const polyphonicResult = detectMicPolyphonicFrame({
    spectrum: state.frequencyDataArray!,
    timeDomainData: state.dataArray ?? undefined,
    frameVolumeRms,
    timestampMs: Date.now(),
    sampleRate: state.audioContext.sampleRate,
    fftSize: state.analyser.fftSize,
    calibratedA4: state.calibratedA4,
    lastDetectedChord: state.lastDetectedChord,
    stableChordCounter: state.stableChordCounter,
    requiredStableFrames: REQUIRED_STABLE_FRAMES,
    targetChordNotes: targetPitchClasses,
    provider: state.micPolyphonicDetectorProvider,
  });
  state.lastDetectedChord = polyphonicResult.detectedNotesText;
  state.stableChordCounter = polyphonicResult.nextStableChordCounter;
  updateMicPolyphonicDetectorRuntimeStatusFromResult(
    polyphonicResult,
    performance.now() - polyphonicDetectorStartedAt
  );

  const detectedNotes = polyphonicResult.detectedNoteNames;
  const matchedTargetNotes = detectedNotes.filter((note) => targetPitchClasses.includes(note));
  const nextFoundNotes = new Set(matchedTargetNotes);
  if (!setsEqual(state.currentMelodyEventFoundNotes, nextFoundNotes)) {
    state.currentMelodyEventFoundNotes = nextFoundNotes;
    redrawFretboard();
  }

  if (trainingMode === 'performance') {
    if (state.performancePromptResolved) return true;

    if (polyphonicResult.isStableMatch) {
      const elapsed = (Date.now() - state.startTime) / 1000;
      resolvePerformancePromptSuccess(elapsed);
      return true;
    }

    if (detectedNotes.length > 0) {
      const hasOutOfTargetNotes = detectedNotes.some((note) => !targetPitchClasses.includes(note));
      if (!hasOutOfTargetNotes && matchedTargetNotes.length < targetPitchClasses.length) {
        setResultMessage(`Heard: ${polyphonicResult.detectedNotesText} [${matchedTargetNotes.length}/${targetPitchClasses.length}]`);
        return true;
      }
      if (hasOutOfTargetNotes) {
        setResultMessage(`Heard: ${polyphonicResult.detectedNotesText || '...'} [off target]`, 'error');
      }
    }

    return true;
  }

  if (polyphonicResult.isStableMatch) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    displayResult(true, elapsed);
    return true;
  }

  if (detectedNotes.length > 0) {
    const hasOutOfTargetNotes = detectedNotes.some((note) => !targetPitchClasses.includes(note));
    if (!hasOutOfTargetNotes && matchedTargetNotes.length < targetPitchClasses.length) {
      setResultMessage(`Heard: ${polyphonicResult.detectedNotesText} [${matchedTargetNotes.length}/${targetPitchClasses.length}]`);
      return true;
    }
  }

  if (polyphonicResult.isStableMismatch) {
    handleMelodyPolyphonicMismatch(
      prompt,
      polyphonicResult.detectedNotesText || '...',
      'mic melody polyphonic mismatch redraw'
    );
    return true;
  }

  return true;
}

function handleMidiMelodyUpdate(event: MidiNoteEvent) {
  const prompt = state.currentPrompt;
  if (!prompt) return;
  const trainingMode = dom.trainingMode.value;

  if (!isPolyphonicMelodyPrompt(prompt)) {
    if (event.kind === 'noteoff') return;
    handleStableMonophonicDetectedNote(event.noteName);
    return;
  }

  const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
  const heldNoteNames = event.heldNoteNames;
  const detectedNotesText = formatDetectedMidiChordNotes(heldNoteNames);
  const matchedHeldTargetNotes = heldNoteNames.filter((note) => targetPitchClasses.includes(note));
  state.currentMelodyEventFoundNotes = new Set(matchedHeldTargetNotes);
  redrawFretboard();

  if (event.kind === 'noteoff' && heldNoteNames.length === 0) {
    return;
  }

  if (trainingMode === 'performance') {
    if (state.performancePromptResolved) return;

    if (areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetPitchClasses)) {
      const elapsed = (Date.now() - state.startTime) / 1000;
      resolvePerformancePromptSuccess(elapsed);
      return;
    }

    const heldUniqueCount = new Set(heldNoteNames).size;
    if (heldUniqueCount < targetPitchClasses.length) {
      setResultMessage(`Heard: ${detectedNotesText} [${state.currentMelodyEventFoundNotes.size}/${targetPitchClasses.length}]`);
      return;
    }

    setResultMessage(`Heard: ${detectedNotesText} [off target]`, 'error');
    return;
  }

  if (areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetPitchClasses)) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    displayResult(true, elapsed);
    return;
  }

  const heldUniqueCount = new Set(heldNoteNames).size;
  if (heldUniqueCount < targetPitchClasses.length) {
    setResultMessage(`Heard: ${detectedNotesText} [${state.currentMelodyEventFoundNotes.size}/${targetPitchClasses.length}]`);
    return;
  }

  handleMelodyPolyphonicMismatch(prompt, detectedNotesText, 'midi melody polyphonic mismatch redraw');
}

function handleMidiPolyphonicChordUpdate(event: MidiNoteEvent) {
  const prompt = state.currentPrompt;
  const heldNoteNames = event.heldNoteNames;
  const targetChordNotes = prompt?.targetChordNotes ?? [];

  const detectedNotesText = formatDetectedMidiChordNotes(heldNoteNames);
  state.lastDetectedChord = detectedNotesText;

  const reactionPlan = buildMidiPolyphonicReactionPlan({
    hasPrompt: Boolean(prompt),
    targetChordNotes,
    eventKind: event.kind,
    heldNoteNames,
    matchesTargetChord: areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetChordNotes),
  });

  if (reactionPlan.kind === 'ignore' || reactionPlan.kind === 'wait_for_more_notes') {
    return;
  }

  if (reactionPlan.kind === 'success') {
    const elapsed = (Date.now() - state.startTime) / 1000;
    displayResult(true, elapsed);
    return;
  }
  if (!prompt) return;

  recordSessionAttempt(state.activeSessionStats, prompt, false, 0, state.currentInstrument);
  setResultMessage(`Heard: ${detectedNotesText} [wrong]`, 'error');
  if (!state.showingAllNotes) {
    drawFretboard(false, null, null, prompt.targetChordFingering, new Set());
    scheduleSessionCooldown('midi polyphonic mismatch redraw', reactionPlan.cooldownDelayMs, () => {
      redrawFretboard();
    });
  }
}

function handleStableMonophonicDetectedNote(detectedNote: string, detectedFrequency?: number | null) {
  const trainingMode = dom.trainingMode.value;
  const prompt = state.currentPrompt;
  if (isMelodyWorkflowMode(trainingMode) && prompt && isPolyphonicMelodyPrompt(prompt)) {
    const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
    if (trainingMode === 'performance' && state.performancePromptResolved) {
      return;
    }
    if (!targetPitchClasses.includes(detectedNote)) {
      if (trainingMode === 'performance') {
        setResultMessage(`Heard: ${detectedNote} [off target]`, 'error');
        return;
      }
      handleMelodyPolyphonicMismatch(prompt, detectedNote, 'melody polyphonic mismatch redraw');
      return;
    }

    const wasAlreadyFound = state.currentMelodyEventFoundNotes.has(detectedNote);
    state.currentMelodyEventFoundNotes.add(detectedNote);
    redrawFretboard();

    const foundCount = state.currentMelodyEventFoundNotes.size;
    if (foundCount < targetPitchClasses.length) {
      if (!wasAlreadyFound) {
        setResultMessage(
          `Heard: ${detectedNote} [${foundCount}/${targetPitchClasses.length}] (mic poly mode: play remaining notes one by one)`
        );
      }
      return;
    }

    const elapsed = (Date.now() - state.startTime) / 1000;
    if (trainingMode === 'performance') {
      resolvePerformancePromptSuccess(elapsed);
    } else {
      displayResult(true, elapsed);
    }
    return;
  }

  if (trainingMode === 'performance') {
    if (state.performancePromptResolved || !prompt) return;

    const octaveMismatch = detectMonophonicOctaveMismatch(detectedNote, detectedFrequency);
    if (octaveMismatch) {
      setResultMessage(
        `Heard: ${octaveMismatch.detectedScientific} [wrong octave, expected ${octaveMismatch.targetScientific}]`,
        'error'
      );
      setWrongDetectedHighlight(detectedNote, detectedFrequency);
      redrawFretboard();
      return;
    }

    if (prompt.targetNote && detectedNote === prompt.targetNote) {
      const elapsed = (Date.now() - state.startTime) / 1000;
      resolvePerformancePromptSuccess(elapsed);
      return;
    }

    const detectedScientific =
      typeof detectedFrequency === 'number' && detectedFrequency > 0
        ? freqToScientificNoteName(detectedFrequency)
        : null;
    setResultMessage(`Heard: ${detectedScientific ?? detectedNote} [off target]`, 'error');
    setWrongDetectedHighlight(detectedNote, detectedFrequency);
    redrawFretboard();
    return;
  }

  const reactionPlan = buildStableMonophonicReactionPlan({
    trainingMode,
    detectedNote,
    hasCurrentPrompt: Boolean(prompt),
    promptTargetNote: prompt?.targetNote ?? null,
    promptTargetString: prompt?.targetString ?? null,
    showingAllNotes: state.showingAllNotes,
  });

  if (reactionPlan.kind === 'free_highlight') {
    clearWrongDetectedHighlight();
    updateLiveDetectedHighlight({
      note: detectedNote,
      stateRef: state,
      enabledStrings: getEnabledStrings(dom.stringSelector),
      instrument: state.currentInstrument,
      redraw: redrawFretboard,
    });
    return;
  }

  if (reactionPlan.kind === 'rhythm_feedback') {
    clearWrongDetectedHighlight();
    handleRhythmModeStableNote(detectedNote);
    return;
  }

  const octaveMismatch = detectMonophonicOctaveMismatch(detectedNote, detectedFrequency);
  if (octaveMismatch && prompt) {
    recordSessionAttempt(state.activeSessionStats, prompt, false, 0, state.currentInstrument);
    setResultMessage(
      `Heard: ${octaveMismatch.detectedScientific} [wrong octave, expected ${octaveMismatch.targetScientific}]`,
      'error'
    );
    setWrongDetectedHighlight(detectedNote, detectedFrequency);
    if (!state.showingAllNotes && prompt.targetNote) {
      drawFretboard(
        false,
        prompt.targetNote,
        prompt.targetString,
        [],
        new Set(),
        null,
        state.wrongDetectedNote,
        state.wrongDetectedString,
        state.wrongDetectedFret
      );
      scheduleSessionCooldown('monophonic octave mismatch redraw', 1500, () => {
        clearWrongDetectedHighlight();
        redrawFretboard();
      });
      return;
    }

    redrawFretboard();
    scheduleSessionCooldown('monophonic octave mismatch clear wrong highlight', 1500, () => {
      clearWrongDetectedHighlight();
      redrawFretboard();
    });
    return;
  }

  if (reactionPlan.kind === 'success') {
    clearWrongDetectedHighlight();
    const elapsed = (Date.now() - state.startTime) / 1000;
    displayResult(true, elapsed);
    return;
  }

  if (reactionPlan.kind === 'ignore_no_prompt' || !prompt) return;

  recordSessionAttempt(state.activeSessionStats, prompt, false, 0, state.currentInstrument);
  const detectedScientific =
    typeof detectedFrequency === 'number' && detectedFrequency > 0
      ? freqToScientificNoteName(detectedFrequency)
      : null;
  setResultMessage(`Heard: ${detectedScientific ?? detectedNote} [wrong]`, 'error');
  setWrongDetectedHighlight(detectedNote, detectedFrequency);
  if (reactionPlan.shouldDrawTargetFretboard) {
    drawFretboard(
      false,
      reactionPlan.targetNote,
      reactionPlan.targetString,
      [],
      new Set(),
      null,
      state.wrongDetectedNote,
      state.wrongDetectedString,
      state.wrongDetectedFret
    );
    scheduleSessionCooldown('monophonic mismatch redraw', reactionPlan.cooldownDelayMs, () => {
      clearWrongDetectedHighlight();
      redrawFretboard();
    });
    return;
  }

  redrawFretboard();
  scheduleSessionCooldown('monophonic mismatch clear wrong highlight', reactionPlan.cooldownDelayMs, () => {
    clearWrongDetectedHighlight();
    redrawFretboard();
  });
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
    setVolumeLevel(volume);

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    const micVolumeThreshold = resolveMicVolumeThreshold(
      state.micSensitivityPreset,
      state.micAutoNoiseFloorRms
    );
    const preflightPlan = buildProcessAudioFramePreflightPlan({
      volume,
      volumeThreshold: micVolumeThreshold,
      consecutiveSilence: state.consecutiveSilence,
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
      state.analyser.getFloatFrequencyData(state.frequencyDataArray!);
      const polyphonicDetectorStartedAt = performance.now();
      const polyphonicResult = detectMicPolyphonicFrame({
        spectrum: state.frequencyDataArray!,
        timeDomainData: state.dataArray ?? undefined,
        frameVolumeRms: volume,
        timestampMs: Date.now(),
        sampleRate: state.audioContext.sampleRate,
        fftSize: state.analyser.fftSize,
        calibratedA4: state.calibratedA4,
        lastDetectedChord: state.lastDetectedChord,
        stableChordCounter: state.stableChordCounter,
        requiredStableFrames: REQUIRED_STABLE_FRAMES,
        targetChordNotes: state.currentPrompt.targetChordNotes,
        provider: state.micPolyphonicDetectorProvider,
      });
      state.lastDetectedChord = polyphonicResult.detectedNotesText;
      state.stableChordCounter = polyphonicResult.nextStableChordCounter;
      updateMicPolyphonicDetectorRuntimeStatusFromResult(
        polyphonicResult,
        performance.now() - polyphonicDetectorStartedAt
      );
      const polyphonicReactionPlan = buildAudioPolyphonicReactionPlan({
        isStableMatch: polyphonicResult.isStableMatch,
        isStableMismatch: polyphonicResult.isStableMismatch,
        showingAllNotes: state.showingAllNotes,
      });
      executeAudioPolyphonicReaction({
        reactionPlan: polyphonicReactionPlan,
        detectedNotesText: polyphonicResult.detectedNotesText,
        onSuccess: () => {
          const elapsed = (Date.now() - state.startTime) / 1000;
          displayResult(true, elapsed);
        },
        onMismatchRecordAttempt: () => {
          recordSessionAttempt(
            state.activeSessionStats,
            state.currentPrompt,
            false,
            0,
            state.currentInstrument
          );
        },
        setResultMessage,
        drawHintFretboard: () => {
          drawFretboard(false, null, null, state.currentPrompt.targetChordFingering, new Set());
        },
        scheduleCooldownRedraw: (delayMs) => {
          scheduleSessionCooldown('polyphonic mismatch redraw', delayMs, () => {
            redrawFretboard();
          });
        },
      });
    } else {
      // --- Monophonic (Single Note) Detection ---
      const frequency = detectPitch(state.dataArray!, state.audioContext.sampleRate, micVolumeThreshold);
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
        const monophonicResult = detectMonophonicFrame({
          frequency,
          lastPitches: state.lastPitches,
          lastNote: state.lastNote,
          stableNoteCounter: state.stableNoteCounter,
          requiredStableFrames: REQUIRED_STABLE_FRAMES,
          targetNote: state.currentPrompt.targetNote,
          noteResolver: freqToNoteName,
        });
        state.lastPitches = monophonicResult.nextLastPitches;
        state.lastNote = monophonicResult.nextLastNote;
        state.stableNoteCounter = monophonicResult.nextStableNoteCounter;
        const monophonicReactionPlan = buildAudioMonophonicReactionPlan({
          detectedNote: monophonicResult.detectedNote,
          nextStableNoteCounter: monophonicResult.nextStableNoteCounter,
          requiredStableFrames: REQUIRED_STABLE_FRAMES,
        });
        executeAudioMonophonicReaction({
          reactionPlan: monophonicReactionPlan,
          onStableDetectedNote: (detectedNote) => {
            updateMicMonophonicAttackTracking(detectedNote, volume);
            if (
              state.inputSource !== 'midi' &&
              !shouldAcceptMicNoteByAttackStrength({
                preset: state.micNoteAttackFilterPreset,
                peakVolume: state.micMonophonicAttackPeakVolume,
                volumeThreshold: micVolumeThreshold,
              })
            ) {
              return;
            }
            if (
              state.inputSource !== 'midi' &&
              !shouldAcceptMicNoteByHoldDuration({
                preset: state.micNoteHoldFilterPreset,
                noteFirstDetectedAtMs: state.micMonophonicFirstDetectedAtMs,
                nowMs: Date.now(),
              })
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
    const selectedInputSource = !forCalibration ? state.inputSource : 'microphone';
    if (!forCalibration) {
      resetMicPolyphonicDetectorTelemetry();
      if (selectedInputSource === 'microphone') {
        refreshMicPolyphonicDetectorAudioInfoUi();
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
      await ensureAudioRuntime(state, { audioInputDeviceId: state.preferredAudioInputDeviceId });
      await refreshAudioInputDeviceOptions();
    }

    const selectedMode = !forCalibration ? dom.trainingMode.selectedOptions[0] : null;
    const fretRange = !forCalibration
      ? getSelectedFretRange(dom.startFret.value, dom.endFret.value)
      : { minFret: undefined, maxFret: undefined };
    executeSessionRuntimeActivation(
      {
        forCalibration,
        selectedInputSource,
        sessionInputSource: state.inputSource,
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
        nextPrompt,
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
  if (state.isLoadingSamples) return;
  if (state.activeSessionStats && !state.isCalibrating) {
    state.lastSessionStats = finalizeSessionStats(state.activeSessionStats);
    saveLastSessionStats();
    displayStats();
  }
  state.activeSessionStats = null;
  state.isListening = false;
  if (state.animationId) cancelAnimationFrame(state.animationId);
  clearTrackedTimeouts(state.pendingTimeoutIds);
  performancePromptRunToken++;
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
  resetSessionButtonsState();
  setPromptText('');
  clearResultMessage();
  clearSessionGoalProgress();
  setInfoSlots();
  Object.assign(state, createSessionStopResetState());
  setTimedInfoVisible(false);
  if (state.inputSource === 'microphone') {
    refreshMicPolyphonicDetectorAudioInfoUi();
  }
  redrawFretboard();
}

export function seekActiveMelodySessionToEvent(eventIndex: number) {
  if (!state.isListening) return false;
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) return false;

  clearTrackedTimeouts(state.pendingTimeoutIds);
  performancePromptRunToken++;
  state.currentMelodyEventIndex = Math.max(0, Math.round(eventIndex));
  state.currentMelodyEventFoundNotes.clear();
  state.performancePromptResolved = false;
  state.performancePromptMatched = false;
  state.pendingSessionStopResultMessage = null;
  clearWrongDetectedHighlight();
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
    redrawFretboard();

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    const prompt = mode?.generatePrompt() ?? null;
    const nextPromptPlan = buildSessionNextPromptPlan({
      hasMode: Boolean(mode),
      detectionType: mode?.detectionType ?? null,
      hasPrompt: Boolean(prompt),
    });
    const pendingStopResultMessage = state.pendingSessionStopResultMessage;
    state.pendingSessionStopResultMessage = null;
    const executionResult = executeSessionNextPromptPlan(nextPromptPlan, prompt, {
      stopListening,
      showError: showNonBlockingError,
      updateTuner,
      setTunerVisible,
      applyPrompt: (nextPrompt) => {
        state.currentPrompt = nextPrompt;
        state.currentMelodyEventFoundNotes.clear();
        setPromptText(nextPrompt.displayText);
        redrawFretboard();
        configurePromptAudio();
        state.startTime = Date.now();
        schedulePerformancePromptAdvance(nextPrompt);
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
      stopListening,
      setResultMessage,
    });
  } catch (error) {
    handleSessionRuntimeError('handleTimeUp', error);
  }
}
