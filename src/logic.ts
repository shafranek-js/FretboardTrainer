/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import { updateStats, saveLastSessionStats, saveSettings, saveStats } from './storage';
import { updateTuner, redrawFretboard, drawFretboard, displayStats } from './ui';
import { freqToNoteName, detectPitch, playSound } from './audio';
import { modes } from './modes';
import {
  calculateRmsLevel,
} from './audio-frame-processing';
import {
  detectCalibrationFrame,
  detectMonophonicFrame,
  detectPolyphonicFrame,
  evaluateSilenceGate,
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
  VOLUME_THRESHOLD,
} from './constants';
import { getEnabledStrings, getSelectedFretRange } from './fretboard-ui-state';
import { buildPromptAudioPlan } from './prompt-audio-plan';
import { buildSuccessInfoSlots } from './session-result';
import {
  createPromptCycleTrackingResetState,
  createStabilityTrackingResetState,
} from './prompt-tracking-state';
import { createSessionStopResetState } from './session-reset-state';
import { buildSessionStartPlan } from './session-start-preflight';
import { ensureAudioRuntime, teardownAudioRuntime } from './audio-runtime';
import { refreshAudioInputDeviceOptions } from './audio-input-devices';
import { startMidiInput, stopMidiInput } from './midi-runtime';
import { buildSessionSuccessPlan } from './session-success-plan';
import { buildSessionNextPromptPlan } from './session-next-prompt-plan';
import {
  computeCalibratedA4FromSamples,
  getOpenATuningInfoFromTuning,
} from './calibration-utils';
import { buildSessionTimeUpPlan } from './session-timeup-plan';
import { resolvePromptTargetPosition } from './prompt-audio';
import {
  createSessionStats,
  finalizeSessionStats,
  recordRhythmTimingAttempt,
  recordSessionAttempt,
} from './session-stats';
import { getMetronomeTimingSnapshot } from './metronome';

let isHandlingRuntimeError = false;

interface RhythmTimingEvaluation {
  beatAtMs: number;
  signedOffsetMs: number;
  absOffsetMs: number;
  tone: 'success' | 'error';
  label: string;
}

function getRhythmTimingThresholds(windowKey: string) {
  if (windowKey === 'strict') return { onBeatMs: 55, feedbackMs: 120 };
  if (windowKey === 'loose') return { onBeatMs: 130, feedbackMs: 240 };
  return { onBeatMs: 90, feedbackMs: 180 };
}

function evaluateRhythmTiming(nowMs: number): RhythmTimingEvaluation | null {
  const timing = getMetronomeTimingSnapshot();
  if (!timing.isRunning || timing.lastBeatAtMs === null || timing.intervalMs <= 0) return null;

  const previousBeatAtMs = timing.lastBeatAtMs;
  const nextBeatAtMs = previousBeatAtMs + timing.intervalMs;
  const previousOffset = nowMs - previousBeatAtMs;
  const nextOffset = nowMs - nextBeatAtMs;

  const useNextBeat = Math.abs(nextOffset) < Math.abs(previousOffset);
  const beatAtMs = useNextBeat ? nextBeatAtMs : previousBeatAtMs;
  const signedOffsetMs = Math.round(useNextBeat ? nextOffset : previousOffset);
  const absOffsetMs = Math.abs(signedOffsetMs);
  const thresholds = getRhythmTimingThresholds(dom.rhythmTimingWindow.value);

  if (absOffsetMs <= thresholds.onBeatMs) {
    return {
      beatAtMs,
      signedOffsetMs,
      absOffsetMs,
      tone: 'success',
      label: 'On beat',
    };
  }

  if (absOffsetMs <= thresholds.feedbackMs) {
    return {
      beatAtMs,
      signedOffsetMs,
      absOffsetMs,
      tone: 'error',
      label: signedOffsetMs < 0 ? 'Early' : 'Late',
    };
  }

  return {
    beatAtMs,
    signedOffsetMs,
    absOffsetMs,
    tone: 'error',
    label: signedOffsetMs < 0 ? 'Too early' : 'Too late',
  };
}

function formatRhythmFeedback(result: RhythmTimingEvaluation, detectedNote: string) {
  const sign = result.signedOffsetMs > 0 ? '+' : '';
  return `${result.label}: ${detectedNote} (${sign}${result.signedOffsetMs}ms)`;
}

function getSessionGoalTargetCorrect(goalValue: string) {
  if (goalValue === 'correct_10') return 10;
  if (goalValue === 'correct_20') return 20;
  if (goalValue === 'correct_50') return 50;
  return null;
}

function clearLiveDetectedNoteHighlight() {
  if (state.liveDetectedNote === null && state.liveDetectedString === null) return;
  state.liveDetectedNote = null;
  state.liveDetectedString = null;
  redrawFretboard();
}

function handleRhythmModeStableNote(detectedNote: string) {
  const timing = evaluateRhythmTiming(Date.now());
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

function handleStableMonophonicDetectedNote(detectedNote: string) {
  const trainingMode = dom.trainingMode.value;

  if (trainingMode === 'free') {
    updateLiveDetectedNoteHighlight(detectedNote);
    return;
  }

  if (trainingMode === 'rhythm') {
    handleRhythmModeStableNote(detectedNote);
    return;
  }

  if (state.currentPrompt?.targetNote && detectedNote === state.currentPrompt.targetNote) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    displayResult(true, elapsed);
    return;
  }

  if (!state.currentPrompt) return;

  recordSessionAttempt(state.activeSessionStats, state.currentPrompt, false, 0, state.currentInstrument);
  setResultMessage(`Heard: ${detectedNote} [wrong]`, 'error');
  if (state.currentPrompt.targetNote && !state.showingAllNotes) {
    drawFretboard(false, state.currentPrompt.targetNote, state.currentPrompt.targetString);
    scheduleSessionCooldown('monophonic mismatch redraw', 1500, () => {
      redrawFretboard();
    });
  }
}

function updateLiveDetectedNoteHighlight(note: string) {
  const resolved = resolvePromptTargetPosition({
    targetNote: note,
    preferredString: null,
    enabledStrings: getEnabledStrings(dom.stringSelector),
    instrument: state.currentInstrument,
  });

  const nextString = resolved?.stringName ?? null;
  if (state.liveDetectedNote === note && state.liveDetectedString === nextString) return;

  state.liveDetectedNote = note;
  state.liveDetectedString = nextString;
  redrawFretboard();
}

function handleSessionRuntimeError(context: string, error: unknown) {
  console.error(`[Session Runtime Error] ${context}:`, error);
  if (isHandlingRuntimeError) return;

  isHandlingRuntimeError = true;
  try {
    stopListening();
    setStatusText('Session stopped due to an internal error.');
    setResultMessage('Runtime error. Session stopped.', 'error');
  } catch (stopError) {
    console.error('[Session Runtime Error] Failed to stop session cleanly:', stopError);
  } finally {
    isHandlingRuntimeError = false;
  }
}

export function scheduleSessionTimeout(delayMs: number, callback: () => void, context: string) {
  const timeoutId = window.setTimeout(() => {
    state.pendingTimeoutIds.delete(timeoutId);
    try {
      callback();
    } catch (error) {
      handleSessionRuntimeError(context, error);
    }
  }, delayMs);
  state.pendingTimeoutIds.add(timeoutId);
  return timeoutId;
}

function scheduleSessionCooldown(context: string, delayMs: number, callback: () => void) {
  state.cooldown = true;
  scheduleSessionTimeout(
    delayMs,
    () => {
      try {
        callback();
      } finally {
        state.cooldown = false;
      }
    },
    context
  );
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
    setVolumeLevel(volume);

    const silenceGate = evaluateSilenceGate({
      volume,
      volumeThreshold: VOLUME_THRESHOLD,
      consecutiveSilence: state.consecutiveSilence,
    });
    state.consecutiveSilence = silenceGate.nextConsecutiveSilence;

    if (silenceGate.isBelowThreshold) {
      if (silenceGate.shouldResetTracking) {
        Object.assign(state, createStabilityTrackingResetState());
        if (!state.isCalibrating) updateTuner(null);
        if (dom.trainingMode.value === 'free') clearLiveDetectedNoteHighlight();
      }
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    if (!mode || !state.currentPrompt) {
      state.animationId = requestAnimationFrame(processAudio);
      return;
    }

    if (mode.detectionType === 'polyphonic') {
      // --- Polyphonic (Chord Strum) Detection ---
      state.analyser.getFloatFrequencyData(state.frequencyDataArray!);
      const polyphonicResult = detectPolyphonicFrame({
        spectrum: state.frequencyDataArray!,
        sampleRate: state.audioContext.sampleRate,
        fftSize: state.analyser.fftSize,
        calibratedA4: state.calibratedA4,
        lastDetectedChord: state.lastDetectedChord,
        stableChordCounter: state.stableChordCounter,
        requiredStableFrames: REQUIRED_STABLE_FRAMES,
        targetChordNotes: state.currentPrompt.targetChordNotes,
      });
      state.lastDetectedChord = polyphonicResult.detectedNotesText;
      state.stableChordCounter = polyphonicResult.nextStableChordCounter;

      if (polyphonicResult.isStableMatch) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        displayResult(true, elapsed);
      } else if (polyphonicResult.isStableMismatch) {
        recordSessionAttempt(state.activeSessionStats, state.currentPrompt, false, 0, state.currentInstrument);
        setResultMessage(`Heard: ${polyphonicResult.detectedNotesText || '...'} [wrong]`, 'error');
        if (!state.showingAllNotes) {
          drawFretboard(false, null, null, state.currentPrompt.targetChordFingering, new Set());
          scheduleSessionCooldown('polyphonic mismatch redraw', 1500, () => {
            redrawFretboard();
          });
        }
      }
    } else {
      // --- Monophonic (Single Note) Detection ---
      const frequency = detectPitch(state.dataArray!, state.audioContext.sampleRate);
      if (state.isCalibrating) {
        const { expectedFrequency } = getOpenATuningInfoFromTuning(state.currentInstrument.TUNING);
        const calibrationResult = detectCalibrationFrame({
          frequency,
          expectedFrequency,
          currentSampleCount: state.calibrationFrequencies.length,
          requiredSamples: CALIBRATION_SAMPLES,
        });
        if (calibrationResult.accepted) {
          state.calibrationFrequencies.push(frequency);
          setCalibrationProgress(calibrationResult.progressPercent);
          if (calibrationResult.isComplete) {
            finishCalibration();
          }
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

        const isStableDetectedNote =
          Boolean(monophonicResult.detectedNote) &&
          monophonicResult.nextStableNoteCounter >= REQUIRED_STABLE_FRAMES;
        if (isStableDetectedNote && monophonicResult.detectedNote) {
          handleStableMonophonicDetectedNote(monophonicResult.detectedNote);
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
      state.timerId = window.setInterval(() => {
        try {
          state.timeLeft--;
          setTimerValue(state.timeLeft);
          if (state.timeLeft <= 0) {
            handleTimeUp();
          }
        } catch (error) {
          handleSessionRuntimeError('timed interval tick', error);
        }
      }, 1000);
    }

    if (!startPlan.shouldStart) {
      if (startPlan.errorMessage) {
        alert(startPlan.errorMessage);
      }
      stopListening();
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
      setSessionGoalProgress(`Goal progress: 0 / ${goalTargetCorrect} correct`);
    } else {
      clearSessionGoalProgress();
    }
  }

  try {
    const selectedInputSource = !forCalibration ? state.inputSource : 'microphone';
    if (!forCalibration && selectedInputSource === 'midi' && modes[dom.trainingMode.value]?.detectionType === 'polyphonic') {
      throw new Error('MIDI input currently supports only single-note modes (including Free Play and Rhythm).');
    }

    if (!forCalibration && selectedInputSource === 'midi') {
      await startMidiInput((event) => {
        try {
          if (!state.isListening || state.cooldown || state.isCalibrating) return;
          handleStableMonophonicDetectedNote(event.noteName);
        } catch (error) {
          handleSessionRuntimeError('midi input message', error);
        }
      });
    } else {
      await ensureAudioRuntime(state, { audioInputDeviceId: state.preferredAudioInputDeviceId });
      await refreshAudioInputDeviceOptions();
    }

    state.isListening = true;
    if (!forCalibration) {
      const selectedMode = dom.trainingMode.selectedOptions[0];
      const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
      state.activeSessionStats = createSessionStats({
        modeKey: dom.trainingMode.value,
        modeLabel: selectedMode?.textContent?.trim() || dom.trainingMode.value,
        instrumentName: state.currentInstrument.name,
        tuningPresetKey: state.currentTuningPresetKey,
        stringOrder: state.currentInstrument.STRING_ORDER,
        enabledStrings: Array.from(getEnabledStrings(dom.stringSelector)),
        minFret,
        maxFret,
      });
    }
    Object.assign(state, createPromptCycleTrackingResetState());
    if (!forCalibration) {
      setStatusText(selectedInputSource === 'midi' ? 'Listening (MIDI)...' : 'Listening...');
      nextPrompt();
    }
    if (selectedInputSource !== 'midi' || forCalibration) {
      processAudio();
    }
  } catch (err) {
    alert('Failed to start input: ' + (err as Error).message);
    if (!forCalibration) stopListening();
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
  if (state.pendingTimeoutIds.size > 0) {
    for (const timeoutId of state.pendingTimeoutIds) {
      clearTimeout(timeoutId);
    }
    state.pendingTimeoutIds.clear();
  }
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.cooldown = false;
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
  redrawFretboard();
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
      const { targetNote, targetString, targetChordNotes } = state.currentPrompt;
      const mode = modes[trainingMode];
      const goalTargetCorrect = getSessionGoalTargetCorrect(dom.sessionGoal.value);
      const infoSlots = buildSuccessInfoSlots(state.currentPrompt);
      if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
        setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
      }
      if (goalTargetCorrect !== null && state.activeSessionStats) {
        setSessionGoalProgress(
          `Goal progress: ${Math.min(state.activeSessionStats.correctAttempts, goalTargetCorrect)} / ${goalTargetCorrect} correct`
        );
      }

      if (
        trainingMode !== 'timed' &&
        goalTargetCorrect !== null &&
        state.activeSessionStats &&
        state.activeSessionStats.correctAttempts >= goalTargetCorrect
      ) {
        stopListening();
        setResultMessage(`Goal reached: ${goalTargetCorrect} correct answers.`, 'success');
        return;
      }

      const successPlan = buildSessionSuccessPlan({
        trainingMode,
        detectionType: mode?.detectionType ?? null,
        elapsedSeconds: elapsed,
        currentArpeggioIndex: state.currentArpeggioIndex,
        arpeggioLength: targetChordNotes.length,
        showingAllNotes: state.showingAllNotes,
      });
      state.currentArpeggioIndex = successPlan.nextArpeggioIndex;

      if (successPlan.kind === 'arpeggio_continue') {
        redrawFretboard();
        nextPrompt();
        return;
      }

      if (successPlan.kind === 'arpeggio_complete') {
        redrawFretboard();
        setResultMessage(successPlan.message, 'success');
        scheduleSessionCooldown('arpeggio complete nextPrompt', successPlan.delayMs, () => {
          nextPrompt();
        });
        return;
      }

      if (successPlan.kind === 'timed') {
        state.currentScore += successPlan.scoreDelta;
        setScoreValue(state.currentScore);
        setResultMessage(successPlan.message, 'success');
        scheduleSessionTimeout(successPlan.delayMs, () => {
          nextPrompt();
        }, 'timed nextPrompt');
        return;
      }

      setResultMessage(successPlan.message, 'success');
      if (successPlan.hideTuner) {
        setTunerVisible(false);
      }

      if (successPlan.drawSolvedFretboard) {
        if (successPlan.drawSolvedAsPolyphonic) {
          drawFretboard(
            false,
            null,
            null,
            state.currentPrompt.targetChordFingering,
            new Set(state.currentPrompt.targetChordNotes)
          );
        } else {
          drawFretboard(false, targetNote, targetString);
        }
      }

      if (successPlan.usesCooldownDelay) {
        scheduleSessionCooldown('standard cooldown nextPrompt', successPlan.delayMs, () => {
          nextPrompt();
        });
        return;
      }

      scheduleSessionTimeout(successPlan.delayMs, () => {
        nextPrompt();
      }, 'standard nextPrompt');
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
    state.liveDetectedNote = null;
    state.liveDetectedString = null;
    state.rhythmLastJudgedBeatAtMs = null;
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

    if (nextPromptPlan.errorMessage) {
      alert(nextPromptPlan.errorMessage);
    }
    if (nextPromptPlan.shouldStopListening) {
      stopListening();
      return;
    }
    if (nextPromptPlan.shouldResetTuner) {
      updateTuner(null);
    }
    setTunerVisible(nextPromptPlan.tunerVisible);
    if (!prompt) return;

    state.currentPrompt = prompt;
    setPromptText(prompt.displayText);

    configurePromptAudio();
    state.startTime = Date.now();
  } catch (error) {
    handleSessionRuntimeError('nextPrompt', error);
  }
}

/** After a prompt is generated, this configures the audio feedback for the user. */
function configurePromptAudio() {
  const audioPlan = buildPromptAudioPlan({
    prompt: state.currentPrompt,
    trainingMode: dom.trainingMode.value,
    instrument: state.currentInstrument,
    calibratedA4: state.calibratedA4,
    enabledStrings: getEnabledStrings(dom.stringSelector),
  });

  state.targetFrequency = audioPlan.targetFrequency;
  setSessionButtonsState({ playSoundDisabled: !audioPlan.playSoundEnabled });

  if (audioPlan.notesToPlay.length === 1) {
    playSound(audioPlan.notesToPlay[0]);
  } else if (audioPlan.notesToPlay.length > 1) {
    playSound(audioPlan.notesToPlay);
  }
}

export function finishCalibration() {
  try {
    if (state.calibrationFrequencies.length === 0) {
      setCalibrationStatus('Could not detect A string. Please try again.');
      scheduleSessionTimeout(2000, cancelCalibration, 'finishCalibration empty-samples');
      return;
    }

    const { octave } = getOpenATuningInfoFromTuning(state.currentInstrument.TUNING);
    const calibratedA4 = computeCalibratedA4FromSamples(state.calibrationFrequencies, octave);
    if (calibratedA4 === null) {
      setCalibrationStatus('Could not detect A string. Please try again.');
      scheduleSessionTimeout(2000, cancelCalibration, 'finishCalibration invalid-samples');
      return;
    }

    state.calibratedA4 = calibratedA4;
    saveSettings();
    setCalibrationStatus(`Calibration complete! New A4 = ${state.calibratedA4.toFixed(2)} Hz`);
    scheduleSessionTimeout(
      2000,
      () => {
        hideCalibrationModal();
        state.isCalibrating = false;
        state.calibrationFrequencies = [];
        stopListening(!state.isListening);
      },
      'finishCalibration timeout'
    );
  } catch (error) {
    handleSessionRuntimeError('finishCalibration', error);
  }
}

export function cancelCalibration() {
  try {
    hideCalibrationModal();
    state.isCalibrating = false;
    state.calibrationFrequencies = [];
    stopListening(!state.isListening);
  } catch (error) {
    handleSessionRuntimeError('cancelCalibration', error);
  }
}

function handleTimeUp() {
  try {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;

    const timeUpPlan = buildSessionTimeUpPlan({
      currentScore: state.currentScore,
      currentHighScore: state.stats.highScore,
    });
    if (timeUpPlan.shouldPersistHighScore) {
      state.stats.highScore = timeUpPlan.nextHighScore;
      saveStats();
    }
    stopListening();
    setResultMessage(timeUpPlan.message);
  } catch (error) {
    handleSessionRuntimeError('handleTimeUp', error);
  }
}
