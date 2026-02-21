/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import { updateStats, saveSettings, saveStats } from './storage';
import { updateTuner, redrawFretboard, drawFretboard } from './ui';
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
  hideCalibrationModal,
  setInfoSlots,
  setCalibrationProgress,
  setCalibrationStatus,
  setPromptText,
  resetSessionButtonsState,
  setResultMessage,
  setScoreValue,
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
import { getEnabledStrings } from './fretboard-ui-state';
import { buildPromptAudioPlan } from './prompt-audio-plan';
import { buildSuccessInfoSlots } from './session-result';
import {
  createPromptCycleTrackingResetState,
  createStabilityTrackingResetState,
} from './prompt-tracking-state';
import { createSessionStopResetState } from './session-reset-state';
import { buildSessionStartPlan } from './session-start-preflight';
import { ensureAudioRuntime, teardownAudioRuntime } from './audio-runtime';
import { buildSessionSuccessPlan } from './session-success-plan';
import { buildSessionNextPromptPlan } from './session-next-prompt-plan';
import {
  computeCalibratedA4FromSamples,
  getOpenATuningInfoFromTuning,
} from './calibration-utils';
import { buildSessionTimeUpPlan } from './session-timeup-plan';

let isHandlingRuntimeError = false;

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

        if (monophonicResult.isStableMatch) {
          const elapsed = (Date.now() - state.startTime) / 1000;
          displayResult(true, elapsed);
        } else if (monophonicResult.isStableMismatch && monophonicResult.detectedNote) {
          setResultMessage(`Heard: ${monophonicResult.detectedNote} [wrong]`, 'error');
          if (state.currentPrompt.targetNote && !state.showingAllNotes) {
            drawFretboard(false, state.currentPrompt.targetNote, state.currentPrompt.targetString);
            scheduleSessionCooldown('monophonic mismatch redraw', 1500, () => {
              redrawFretboard();
            });
          }
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
  }

  try {
    await ensureAudioRuntime(state);
    state.isListening = true;
    Object.assign(state, createPromptCycleTrackingResetState());
    if (!forCalibration) {
      setStatusText('Listening...');
      nextPrompt();
    }
    processAudio();
  } catch (err) {
    alert('Failed to start audio: ' + (err as Error).message);
    if (!forCalibration) stopListening();
    return false;
  }
  return true;
}

/** Stops listening to the microphone and cleans up audio resources. */
export function stopListening(keepStreamOpen = false) {
  if (state.isLoadingSamples) return;
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
  setInfoSlots();
  Object.assign(state, createSessionStopResetState());
  setTimedInfoVisible(false);
  redrawFretboard();
}

/** Displays the result of a user's attempt and triggers the next prompt on success. */
function displayResult(correct: boolean, elapsed: number) {
  try {
    updateStats(correct, elapsed);

    if (correct && state.currentPrompt) {
      const trainingMode = dom.trainingMode.value;
      const { targetNote, targetString, targetChordNotes } = state.currentPrompt;
      const mode = modes[trainingMode];
      const infoSlots = buildSuccessInfoSlots(state.currentPrompt);
      if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
        setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
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
