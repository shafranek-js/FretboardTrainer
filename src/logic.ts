/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { dom, state } from './state';
import { updateStats, saveSettings, saveStats } from './storage';
import { updateTuner, redrawCanvas, drawFretboard } from './ui';
import { freqToNoteName, detectPitch, playSound } from './audio';
import { modes } from './modes';
import {
    REQUIRED_STABLE_FRAMES,
    CALIBRATION_SAMPLES,
    TIMED_CHALLENGE_DURATION,
    NOTE_TO_SEMITONE,
    SEMITONE_TO_NOTE,
    VOLUME_THRESHOLD,
    ALL_NOTES,
} from './constants';
import type { ChordNote, Prompt } from './types';

/** Calculates musical intervals (Major Third, Perfect Fifth) for a given root note. */
function calculateIntervals(rootNote: string) {
    const rootSemitone = NOTE_TO_SEMITONE[rootNote];
    const majorThirdSemitone = (rootSemitone + 4) % 12;
    const perfectFifthSemitone = (rootSemitone + 7) % 12;
    return {
        majorThird: SEMITONE_TO_NOTE[majorThirdSemitone],
        perfectFifth: SEMITONE_TO_NOTE[perfectFifthSemitone]
    };
}


/**
 * Analyzes the frequency spectrum to find prominent musical notes.
 * Used for polyphonic chord detection.
 * @param spectrum - The frequency data from the AnalyserNode.
 * @param sampleRate - The audio context's sample rate.
 * @param fftSize - The FFT size of the AnalyserNode.
 * @returns A Set of detected note names (e.g., {'C', 'E', 'G'}).
 */
function findNotesInSpectrum(
    spectrum: Float32Array,
    sampleRate: number,
    fftSize: number
): Set<string> {
    const detectedNotes = new Set<string>();
    if (!spectrum) return detectedNotes;

    const maxDb = Math.max(...spectrum.filter(db => isFinite(db)));

    if (maxDb < -60) {
        return detectedNotes;
    }
    const threshold = maxDb - 20;

    for (let i = 1; i < spectrum.length - 1; i++) {
        const db = spectrum[i];
        if (db > spectrum[i - 1] && db > spectrum[i + 1] && db > threshold) {
            const freq = i * sampleRate / fftSize;
            if (freq > 60) {
                const note = freqToNoteName(freq);
                if (note) {
                    detectedNotes.add(note);
                }
            }
        }
    }
    return detectedNotes;
}

/**
 * Checks if the detected notes match the required notes for the target chord.
 * @param detectedNotes - A Set of notes found in the audio spectrum.
 * @param targetNotes - An array of note names required for the chord.
 * @returns True if all target notes are present in the detected notes.
 */
function areChordNotesMatching(detectedNotes: Set<string>, targetNotes: string[]): boolean {
    if (detectedNotes.size < targetNotes.length) {
        return false;
    }
    return targetNotes.every(note => detectedNotes.has(note));
}


/** The main audio processing loop, called via requestAnimationFrame. */
function processAudio() {
    if (!state.isListening || !state.analyser || !state.audioContext) return;
    if (state.cooldown && !state.isCalibrating) {
        state.animationId = requestAnimationFrame(processAudio);
        return;
    }

    // Shared volume calculation
    state.analyser.getFloatTimeDomainData(state.dataArray!);
    const volume = Math.sqrt(state.dataArray!.reduce((sum, val) => sum + val * val, 0) / state.dataArray!.length);
    dom.volumeBar.style.height = `${Math.min(100, volume * 500)}%`;

    if (volume < VOLUME_THRESHOLD) {
        state.consecutiveSilence++;
        if (state.consecutiveSilence >= 2) {
            state.stableNoteCounter = 0;
            state.lastNote = null;
            state.lastDetectedChord = '';
            state.stableChordCounter = 0;
            if (!state.isCalibrating) updateTuner(null);
        }
        state.animationId = requestAnimationFrame(processAudio);
        return;
    }
    state.consecutiveSilence = 0;

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    if (!mode || !state.currentPrompt) {
        state.animationId = requestAnimationFrame(processAudio);
        return;
    }


    if (mode.detectionType === 'polyphonic') {
        // --- Polyphonic (Chord Strum) Detection ---
        state.analyser.getFloatFrequencyData(state.frequencyDataArray!);
        const detectedNotes = findNotesInSpectrum(state.frequencyDataArray!, state.audioContext.sampleRate, state.analyser.fftSize);
        const detectedNotesStr = [...detectedNotes].sort().join(',');

        if (detectedNotesStr.length > 0 && detectedNotesStr === state.lastDetectedChord) {
            state.stableChordCounter++;
        } else {
            state.stableChordCounter = 1;
        }
        state.lastDetectedChord = detectedNotesStr;

        if (state.stableChordCounter >= REQUIRED_STABLE_FRAMES) {
            if (areChordNotesMatching(detectedNotes, state.currentPrompt.targetChordNotes)) {
                const elapsed = (Date.now() - state.startTime) / 1000;
                displayResult(true, elapsed);
            } else {
                dom.result.textContent = `Heard: ${detectedNotesStr || '...'} ✗`;
                dom.result.classList.remove('text-green-400');
                dom.result.classList.add('text-red-400');
                if (!state.showingAllNotes) {
                    state.cooldown = true;
                    drawFretboard(false, null, null, state.currentPrompt.targetChordFingering, new Set());
                    setTimeout(() => { redrawCanvas(); state.cooldown = false; }, 1500);
                }
            }
        }
    } else {
        // --- Monophonic (Single Note) Detection ---
        const frequency = detectPitch(state.dataArray!, state.audioContext.sampleRate);
        if (state.isCalibrating) {
            if (frequency > 100 && frequency < 120) { // A2=110, check around it
                state.calibrationFrequencies.push(frequency);
                const progress = (state.calibrationFrequencies.length / CALIBRATION_SAMPLES) * 100;
                dom.calibrationProgress.style.width = `${progress}%`;
                if (state.calibrationFrequencies.length >= CALIBRATION_SAMPLES) {
                    finishCalibration();
                }
            }
        } else {
            updateTuner(frequency);
            if (frequency > 50 && frequency < 1000) {
                state.lastPitches.push(frequency);
                if (state.lastPitches.length > 2) state.lastPitches.shift();
                const smoothedFreq = state.lastPitches.reduce((a, b) => a + b) / state.lastPitches.length;
                const detectedNote = freqToNoteName(smoothedFreq);

                if (detectedNote) {
                    if (detectedNote === state.lastNote) {
                        state.stableNoteCounter++;
                    } else {
                        state.stableNoteCounter = 1;
                    }
                    state.lastNote = detectedNote;

                    if (state.stableNoteCounter >= REQUIRED_STABLE_FRAMES) {
                        if (state.currentPrompt.targetNote && detectedNote === state.currentPrompt.targetNote) {
                            const elapsed = (Date.now() - state.startTime) / 1000;
                            displayResult(true, elapsed);
                        } else {
                            dom.result.textContent = `Heard: ${detectedNote} ✗`;
                            dom.result.classList.remove('text-green-400');
                            dom.result.classList.add('text-red-400');
                            if (state.currentPrompt.targetNote && !state.showingAllNotes) {
                                state.cooldown = true;
                                drawFretboard(false, state.currentPrompt.targetNote, state.currentPrompt.targetString);
                                setTimeout(() => { redrawCanvas(); state.cooldown = false; }, 1500);
                            }
                        }
                    }
                }
            }
        }
    }

    state.animationId = requestAnimationFrame(processAudio);
}


/** Initializes the Web Audio API and starts listening to the microphone. */
export async function startListening(forCalibration = false) {
    if (forCalibration) {
        state.isCalibrating = true;
        state.calibrationFrequencies = [];
    } else {
        dom.startBtn.disabled = true;
        dom.stopBtn.disabled = false;
        const trainingMode = dom.trainingMode.value;
        const mode = modes[trainingMode];
        if (mode.detectionType === 'monophonic') dom.hintBtn.disabled = false;

        if (trainingMode === 'timed') {
            state.timeLeft = TIMED_CHALLENGE_DURATION;
            state.currentScore = 0;
            dom.timer.textContent = state.timeLeft.toString();
            dom.score.textContent = state.currentScore.toString();
            dom.timedInfo.classList.remove('hidden');
            state.timerId = window.setInterval(() => {
                state.timeLeft--;
                dom.timer.textContent = state.timeLeft.toString();
                if (state.timeLeft <= 0) {
                    handleTimeUp();
                }
            }, 1000);
        }

        if (trainingMode === 'progressions') {
            const progressions = state.currentInstrument.CHORD_PROGRESSIONS;
            const progressionName = dom.progressionSelector.value;
            const progression = progressions[progressionName as keyof typeof progressions];
            if (!progressionName || !progression || progression.length === 0) {
                alert('Please select a valid chord progression.');
                stopListening();
                return false;
            }
            state.currentProgression = progression;
            state.currentProgressionIndex = 0;
        }

        if (trainingMode === 'arpeggios') state.currentArpeggioIndex = 0;
    }
    
    try {
        if (!state.audioContext || state.audioContext.state === 'closed') {
            state.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (!state.analyser) {
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 4096;
            state.dataArray = new Float32Array(state.analyser.fftSize);
            state.frequencyDataArray = new Float32Array(state.analyser.frequencyBinCount);
            state.analyser.minDecibels = -100;
            state.analyser.maxDecibels = -10;
            state.analyser.smoothingTimeConstant = 0.85;
        }
        if (!state.mediaStream) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaStream = stream;
            state.microphone = state.audioContext.createMediaStreamSource(stream);
            state.microphone.connect(state.analyser);
        }
        state.isListening = true;
        state.consecutiveSilence = 0;
        state.lastNote = null;
        state.stableNoteCounter = 0;
        state.lastPitches = [];
        state.lastDetectedChord = '';
        state.stableChordCounter = 0;
        if (!forCalibration) {
            dom.statusBar.textContent = "Listening...";
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
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    if (!keepStreamOpen) {
        if (state.microphone) state.microphone.disconnect();
        state.mediaStream?.getTracks().forEach(t => t.stop());
        state.mediaStream = null;
        state.microphone = null;
        state.analyser = null;
        state.dataArray = null;
        state.frequencyDataArray = null;
        dom.statusBar.textContent = "Ready";
    }
    dom.tunerDisplay.classList.remove('visible');
    dom.tunerDisplay.classList.add('invisible', 'opacity-0');
    updateTuner(null);
    dom.startBtn.disabled = false;
    dom.stopBtn.disabled = true;
    dom.hintBtn.disabled = true;
    dom.playSoundBtn.disabled = true;
    dom.prompt.textContent = '';
    dom.result.textContent = '';
    dom.infoSlot1.textContent = '';
    dom.infoSlot2.textContent = '';
    dom.infoSlot3.textContent = '';
    state.currentPrompt = null;
    state.scaleNotes = [];
    state.currentScaleIndex = 0;
    state.lastDetectedChord = '';
    state.stableChordCounter = 0;
    state.currentProgression = [];
    state.currentProgressionIndex = 0;
    state.currentArpeggioIndex = 0;
    dom.timedInfo.classList.add('hidden');
    redrawCanvas();
}


/** Displays the result of a user's attempt and triggers the next prompt on success. */
function displayResult(correct: boolean, elapsed: number) {
    updateStats(correct, elapsed);

    if (correct && state.currentPrompt) {
        const trainingMode = dom.trainingMode.value;
        const { targetNote, targetString, baseChordName, targetChordNotes } = state.currentPrompt;

        if (baseChordName && targetChordNotes.length > 0) {
            dom.infoSlot1.textContent = baseChordName;
            dom.infoSlot2.textContent = targetChordNotes.join(' - ');
            dom.infoSlot3.textContent = '';
        } else if (targetNote && targetString) {
            const intervals = calculateIntervals(targetNote);
            dom.infoSlot1.textContent = `Note: ${targetNote} on ${targetString}`;
            dom.infoSlot2.textContent = `Maj 3rd: ${intervals.majorThird}`;
            dom.infoSlot3.textContent = `Perf 5th: ${intervals.perfectFifth}`;
        }

        if (trainingMode === 'arpeggios') {
            state.currentArpeggioIndex++;
            redrawCanvas();
            if (state.currentArpeggioIndex >= targetChordNotes.length) {
                dom.result.textContent = 'Arpeggio Complete!';
                dom.result.classList.remove('text-red-400');
                dom.result.classList.add('text-green-400');
                state.currentArpeggioIndex = 0;
                state.cooldown = true;
                setTimeout(() => { nextPrompt(); state.cooldown = false; }, 1500);
            } else {
                nextPrompt();
            }
            return;
        }

        if (trainingMode === 'timed') {
            const points = Math.max(10, 100 - Math.floor(elapsed * 10));
            state.currentScore += points;
            dom.score.textContent = state.currentScore.toString();
            dom.result.textContent = `+${points}`;
            dom.result.classList.add('text-green-400');
            setTimeout(() => nextPrompt(), 200);
            return;
        }

        dom.result.textContent = `Correct! ⏱️ ${elapsed.toFixed(2)}s`;
        dom.result.classList.add('text-green-400');
        dom.tunerDisplay.classList.remove('visible');
        dom.tunerDisplay.classList.add('invisible', 'opacity-0');
        
        if (!state.showingAllNotes) {
            if (modes[trainingMode].detectionType === 'polyphonic') {
                drawFretboard(false, null, null, state.currentPrompt.targetChordFingering, new Set(state.currentPrompt.targetChordNotes));
            } else {
                drawFretboard(false, targetNote, targetString);
            }
        }

        state.cooldown = true;
        setTimeout(() => { nextPrompt(); state.cooldown = false; }, 1500);
    }
}

/** Generates and displays the next prompt for the user based on the selected mode. */
function nextPrompt() {
    dom.result.textContent = '';
    dom.result.classList.remove('text-green-400', 'text-red-400');
    state.stableNoteCounter = 0;
    state.lastNote = null;
    state.consecutiveSilence = 0;
    state.lastPitches = [];
    state.stableChordCounter = 0;
    state.lastDetectedChord = '';
    redrawCanvas();

    const trainingMode = dom.trainingMode.value;
    const mode = modes[trainingMode];
    if (!mode) {
        alert('Selected training mode is not available.');
        stopListening();
        return;
    }

    if (mode.detectionType === 'monophonic') {
        updateTuner(null);
        dom.tunerDisplay.classList.add('visible');
        dom.tunerDisplay.classList.remove('invisible', 'opacity-0');
    }

    const prompt = mode.generatePrompt();

    if (!prompt) {
        stopListening();
        return;
    }

    state.currentPrompt = prompt;
    dom.prompt.textContent = prompt.displayText;

    configurePromptAudio();
    state.startTime = Date.now();
}

/** After a prompt is generated, this configures the audio feedback for the user. */
function configurePromptAudio() {
    const prompt = state.currentPrompt;
    if (!prompt) {
        dom.playSoundBtn.disabled = true;
        state.targetFrequency = null;
        return;
    }

    const trainingMode = dom.trainingMode.value;
    // Arpeggios are played note-by-note, so we don't play the full chord at the start.
    const isChordBased = ['chords', 'progressions'].includes(trainingMode);

    if (isChordBased) {
        dom.playSoundBtn.disabled = false;
        state.targetFrequency = null; // No single target frequency for chords
        if (prompt.targetChordFingering.length > 0) {
            const notesToPlay = prompt.targetChordFingering
                .map(noteInfo => state.currentInstrument.getNoteWithOctave(noteInfo.string, noteInfo.fret))
                .filter((note): note is string => note !== null);

            if (notesToPlay.length > 0) {
                playSound(notesToPlay);
            }
        }
    } else if (prompt.targetNote) {
        // It's a single note prompt. Find frequency and play sound.
        let targetFret: number | undefined;
        let targetString: string | undefined = prompt.targetString;
        const FRETBOARD = state.currentInstrument.FRETBOARD;

        if (!targetString) {
            const enabledStrings = Array.from(dom.stringSelector.querySelectorAll('input:checked')).map(cb => (cb as HTMLInputElement).value);
            for (const s of state.currentInstrument.STRING_ORDER) {
                 if (enabledStrings.includes(s)) {
                    const fret = FRETBOARD[s as keyof typeof FRETBOARD][prompt.targetNote as keyof typeof FRETBOARD.e];
                    if (typeof fret === 'number') {
                        targetFret = fret;
                        targetString = s;
                        break;
                    }
                 }
            }
        } else {
            targetFret = FRETBOARD[targetString as keyof typeof FRETBOARD][prompt.targetNote as keyof typeof FRETBOARD.e];
        }
        
        if (typeof targetFret === 'number' && targetString) {
            const noteWithOctave = state.currentInstrument.getNoteWithOctave(targetString, targetFret);
            if (noteWithOctave) {
                dom.playSoundBtn.disabled = false;
                playSound(noteWithOctave);
            }

            const tuning = state.currentInstrument.TUNING;
            const openStringtuning = (tuning as {[key:string]:string})[targetString];
            const openStringNote = openStringtuning.slice(0, -1);
            const openStringOctave = parseInt(openStringtuning.slice(-1));
            
            const noteIndex = ALL_NOTES.indexOf(openStringNote);
            const semitonesFromC0 = noteIndex + openStringOctave * 12;

            const a4Index = ALL_NOTES.indexOf('A') + 4 * 12;
            const semitonesFromA4 = semitonesFromC0 - a4Index;

            const openStringFreq = state.calibratedA4 * Math.pow(2, (semitonesFromA4) / 12);
            state.targetFrequency = openStringFreq * Math.pow(2, targetFret / 12);
        } else {
            state.targetFrequency = null;
            dom.playSoundBtn.disabled = true;
        }
    } else {
        // Fallback: not a chord and not a single note? Disable the button.
        state.targetFrequency = null;
        dom.playSoundBtn.disabled = true;
    }
}

export function finishCalibration() {
    if (state.calibrationFrequencies.length === 0) {
        dom.calibrationStatus.textContent = 'Could not detect A string. Please try again.';
        setTimeout(cancelCalibration, 2000);
        return;
    }
    const avgFreq = state.calibrationFrequencies.reduce((a, b) => a + b) / state.calibrationFrequencies.length;
    state.calibratedA4 = avgFreq * 2;
    saveSettings();
    dom.calibrationStatus.textContent = `Calibration complete! New A4 = ${state.calibratedA4.toFixed(2)} Hz`;
    setTimeout(() => {
        dom.calibrationModal.classList.add('hidden');
        state.isCalibrating = false;
        state.calibrationFrequencies = [];
        stopListening(!state.isListening);
    }, 2000);
}

export function cancelCalibration() {
    dom.calibrationModal.classList.add('hidden');
    state.isCalibrating = false;
    state.calibrationFrequencies = [];
    stopListening(!state.isListening);
}

function handleTimeUp() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    dom.result.textContent = `Time's Up! Final Score: ${state.currentScore}`;
    if (state.currentScore > state.stats.highScore) {
        state.stats.highScore = state.currentScore;
        saveStats();
    }
    stopListening();
    dom.prompt.textContent = '';
    dom.timedInfo.classList.add('hidden');
}