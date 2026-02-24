import { dom, state } from '../state';
import { saveSettings } from '../storage';
import { handleModeChange, redrawFretboard, updateInstrumentUI, drawFretboard } from '../ui';
import { playSound, loadInstrumentSoundfont } from '../audio';
import { scheduleSessionTimeout, startListening, stopListening } from '../logic';
import { instruments } from '../instruments';
import { ensureAudioRuntime } from '../audio-runtime';
import { calculateRmsLevel } from '../audio-frame-processing';
import {
  clearResultMessage,
  refreshDisplayFormatting,
  setPracticeSetupCollapsed,
  setPracticeSetupSummary,
  setModalVisible,
  setResultMessage,
  toggleSessionToolsCollapsed,
  togglePracticeSetupCollapsed,
} from '../ui-signals';
import { getEnabledStrings } from '../fretboard-ui-state';
import { buildPromptAudioPlan } from '../prompt-audio-plan';
import {
  buildCurriculumPresetPlan,
  getCurriculumPresetDefinitions,
  type CurriculumPresetPlan,
  type CurriculumPresetKey,
} from '../curriculum-presets';
import {
  clampMetronomeBpm,
  setMetronomeTempo,
  startMetronome,
  stopMetronome,
  subscribeMetronomeBeat,
} from '../metronome';
import { setNoteNamingPreference } from '../note-display';
import {
  normalizeAudioInputDeviceId,
  refreshAudioInputDeviceOptions,
  setPreferredAudioInputDeviceId,
} from '../audio-input-devices';
import {
  normalizeInputSource,
  normalizeMidiInputDeviceId,
  refreshInputSourceAvailabilityUi,
  refreshMidiInputDevices,
  setInputSourcePreference,
  setPreferredMidiInputDeviceId,
} from '../midi-runtime';
import { formatUserFacingError, showNonBlockingError } from '../app-feedback';
import {
  deleteCustomMelody,
  isCustomMelodyId,
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
} from '../melody-library';
import { confirmUserAction } from '../user-feedback-port';
import { normalizeSessionPace } from '../session-pace';
import {
  estimateNoiseFloorRms,
  normalizeMicSensitivityPreset,
  resolveMicVolumeThreshold,
} from '../mic-input-sensitivity';
import { normalizeMicNoteAttackFilterPreset } from '../mic-note-attack-filter';
import { normalizeMicNoteHoldFilterPreset } from '../mic-note-hold-filter';

function findPlayableStringForNote(note: string): string | null {
  const instrumentData = state.currentInstrument;
  const enabledStrings = getEnabledStrings(dom.stringSelector);

  for (const stringName of instrumentData.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    const fret =
      instrumentData.FRETBOARD[stringName as keyof typeof instrumentData.FRETBOARD][
        note as keyof typeof instrumentData.FRETBOARD.e
      ];
    if (typeof fret === 'number') {
      return stringName;
    }
  }

  return null;
}

function setCurriculumPresetInfo(text: string) {
  dom.curriculumPresetInfo.textContent = text;
  dom.curriculumPresetInfo.classList.toggle('hidden', text.length === 0);
}

function updateMicNoiseGateInfo() {
  const threshold = resolveMicVolumeThreshold(state.micSensitivityPreset, state.micAutoNoiseFloorRms);
  if (state.micSensitivityPreset === 'auto') {
    const noiseFloorText =
      typeof state.micAutoNoiseFloorRms === 'number' ? state.micAutoNoiseFloorRms.toFixed(4) : 'n/a';
    const attackLabel = dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
    const holdLabel = dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
    dom.micNoiseGateInfo.textContent = `Mic noise gate threshold: ${threshold.toFixed(4)} (Auto; room noise floor ${noiseFloorText} RMS). Attack: ${attackLabel}; Hold: ${holdLabel}.`;
    return;
  }

  const presetLabel = dom.micSensitivityPreset.selectedOptions[0]?.textContent?.trim() ?? 'Normal';
  const attackLabel = dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
  const holdLabel = dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
  dom.micNoiseGateInfo.textContent = `Mic noise gate threshold: ${threshold.toFixed(4)} (${presetLabel} preset). Attack: ${attackLabel}; Hold: ${holdLabel}. Use Auto calibration for noisy rooms.`;
}

async function measureRoomNoiseFloorRms(durationMs = 2000) {
  await ensureAudioRuntime(state, { audioInputDeviceId: state.preferredAudioInputDeviceId });
  await refreshAudioInputDeviceOptions();
  if (state.audioContext?.state === 'suspended') {
    await state.audioContext.resume();
  }
  if (!state.analyser || !state.dataArray) {
    throw new Error('Microphone analyser is not available.');
  }

  const samples: number[] = [];
  const startedAt = performance.now();
  await new Promise<void>((resolve, reject) => {
    const step = () => {
      try {
        if (!state.analyser || !state.dataArray) {
          reject(new Error('Microphone analyser was released during noise calibration.'));
          return;
        }
        state.analyser.getFloatTimeDomainData(state.dataArray);
        samples.push(calculateRmsLevel(state.dataArray));

        if (performance.now() - startedAt >= durationMs) {
          resolve();
          return;
        }
        requestAnimationFrame(step);
      } catch (error) {
        reject(error);
      }
    };
    requestAnimationFrame(step);
  });

  const estimated = estimateNoiseFloorRms(samples);
  if (estimated === null) {
    throw new Error('Could not estimate room noise floor.');
  }
  return estimated;
}

function setCurriculumPresetSelection(key: CurriculumPresetKey) {
  if (dom.curriculumPreset.value === key) return;
  dom.curriculumPreset.value = key;
  const preset = getCurriculumPresetDefinitions().find((item) => item.key === key);
  setCurriculumPresetInfo(preset?.description ?? '');
}

function markCurriculumPresetAsCustom() {
  setCurriculumPresetSelection('custom');
}

function applyEnabledStrings(enabledStrings: string[]) {
  const enabled = new Set(enabledStrings);
  dom.stringSelector.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    const checkbox = input as HTMLInputElement;
    checkbox.checked = enabled.has(checkbox.value);
  });
}

function populateMelodyOptions() {
  const melodies = listMelodiesForInstrument(state.currentInstrument);
  const previousValue = state.preferredMelodyId ?? dom.melodySelector.value;
  dom.melodySelector.innerHTML = '';

  melodies.forEach((melody) => {
    const option = document.createElement('option');
    option.value = melody.id;
    option.textContent = melody.source === 'custom' ? `${melody.name} (Custom)` : melody.name;
    dom.melodySelector.append(option);
  });

  const hasPrevious = melodies.some((melody) => melody.id === previousValue);
  if (hasPrevious) {
    dom.melodySelector.value = previousValue;
  } else if (melodies.length > 0) {
    dom.melodySelector.value = melodies[0].id;
  }

  state.preferredMelodyId = dom.melodySelector.value || null;
  dom.deleteMelodyBtn.disabled = !isCustomMelodyId(dom.melodySelector.value);
}

function setSelectValueIfAvailable(select: HTMLSelectElement, value: string | undefined) {
  if (!value) return false;
  const hasOption = Array.from(select.options).some((option) => option.value === value);
  if (!hasOption) return false;
  select.value = value;
  return true;
}

function setFirstAvailableSelectValue(select: HTMLSelectElement, candidates: string[] | undefined) {
  if (!candidates || candidates.length === 0) return false;
  for (const value of candidates) {
    if (setSelectValueIfAvailable(select, value)) return true;
  }
  return false;
}

function applyCurriculumPresetModeSpecificFields(plan: CurriculumPresetPlan) {
  setSelectValueIfAvailable(dom.sessionGoal, plan.sessionGoal);
  setSelectValueIfAvailable(dom.scaleSelector, plan.scaleValue);
  setFirstAvailableSelectValue(dom.chordSelector, plan.chordValueCandidates);
  setFirstAvailableSelectValue(dom.progressionSelector, plan.progressionValueCandidates);
  setSelectValueIfAvailable(dom.arpeggioPatternSelector, plan.arpeggioPatternValue);
  setSelectValueIfAvailable(dom.rhythmTimingWindow, plan.rhythmTimingWindow);

  if (typeof plan.metronomeEnabled === 'boolean') {
    dom.metronomeEnabled.checked = plan.metronomeEnabled;
  }
  if (typeof plan.metronomeBpm === 'number') {
    dom.metronomeBpm.value = String(plan.metronomeBpm);
    dom.metronomeBpm.value = String(getClampedMetronomeBpmFromInput());
  }
}

function applyCurriculumPreset(key: CurriculumPresetKey) {
  const plan = buildCurriculumPresetPlan(key, state.currentInstrument.STRING_ORDER);
  if (!plan) {
    setCurriculumPresetSelection('custom');
    return;
  }

  if (state.isListening) {
    stopListening();
  }

  dom.showAllNotes.checked = plan.showAllNotes;
  state.showingAllNotes = plan.showAllNotes;
  dom.trainingMode.value = plan.trainingMode;
  dom.difficulty.value = plan.difficulty;
  dom.startFret.value = String(plan.startFret);
  dom.endFret.value = String(plan.endFret);
  applyEnabledStrings(plan.enabledStrings);
  applyCurriculumPresetModeSpecificFields(plan);

  handleModeChange();
  redrawFretboard();
  saveSettings();

  setCurriculumPresetSelection(key);
  setResultMessage(`Applied ${plan.label}`);
}

function getClampedMetronomeBpmFromInput() {
  const parsed = Number.parseInt(dom.metronomeBpm.value, 10);
  const clamped = clampMetronomeBpm(parsed);
  dom.metronomeBpm.value = String(clamped);
  return clamped;
}

function resetMetronomeVisualIndicator() {
  dom.metronomeBeatLabel.textContent = '-';
  dom.metronomePulse.classList.remove('bg-amber-400', 'bg-amber-200', 'scale-125');
  dom.metronomePulse.classList.add('bg-slate-500');
}

function updatePracticeSetupSummary() {
  const modeLabel = dom.trainingMode.selectedOptions[0]?.textContent?.trim() ?? 'Mode';
  const difficultyLabel = dom.difficulty.selectedOptions[0]?.textContent?.trim() ?? dom.difficulty.value;
  const curriculumLabel = dom.curriculumPreset.selectedOptions[0]?.textContent?.trim() ?? 'Custom';
  const goalLabel = dom.sessionGoal.selectedOptions[0]?.textContent?.trim() ?? 'No Goal';
  const paceLabel = dom.sessionPace.selectedOptions[0]?.textContent?.trim() ?? 'Normal Pace';
  const fretRange = `${dom.startFret.value}-${dom.endFret.value}`;
  const enabledStringsCount = getEnabledStrings(dom.stringSelector).size;
  const totalStringsCount = state.currentInstrument.STRING_ORDER.length;

  let modeDetail = '';
  if (dom.trainingMode.value === 'scales') {
    modeDetail = ` | ${dom.scaleSelector.value}`;
  } else if (dom.trainingMode.value === 'melody') {
    const melodyLabel =
      dom.melodySelector.selectedOptions[0]?.textContent?.trim() ?? dom.melodySelector.value;
    modeDetail = ` | ${melodyLabel} | ${dom.melodyShowNote.checked ? 'Hint On' : 'Blind'}`;
  } else if (dom.trainingMode.value === 'chords') {
    modeDetail = ` | ${dom.chordSelector.value}`;
  } else if (dom.trainingMode.value === 'progressions') {
    modeDetail = ` | ${dom.progressionSelector.value}`;
  } else if (dom.trainingMode.value === 'arpeggios') {
    modeDetail = ` | ${dom.arpeggioPatternSelector.selectedOptions[0]?.textContent?.trim() ?? dom.arpeggioPatternSelector.value}`;
  }

  const summary = `${modeLabel}${modeDetail} | ${difficultyLabel} | Frets ${fretRange} | Strings ${enabledStringsCount}/${totalStringsCount} | ${goalLabel} | Pace: ${paceLabel} | ${curriculumLabel}`;
  setPracticeSetupSummary(summary);
}

async function startSessionFromUi() {
  if (!(await ensureRhythmModeMetronome())) return;
  await startListening();
}

async function ensureRhythmModeMetronome() {
  if (dom.trainingMode.value !== 'rhythm') return true;
  const bpm = getClampedMetronomeBpmFromInput();
  if (dom.metronomeEnabled.checked) return true;

  try {
    dom.metronomeEnabled.checked = true;
    await startMetronome(bpm);
    return true;
  } catch (error) {
    dom.metronomeEnabled.checked = false;
    showNonBlockingError(formatUserFacingError('Failed to start metronome for Rhythm mode', error));
    return false;
  }
}

export function registerSessionControls() {
  setCurriculumPresetSelection('custom');
  dom.metronomeBpm.value = String(getClampedMetronomeBpmFromInput());
  populateMelodyOptions();
  resetMetronomeVisualIndicator();
  updateMicNoiseGateInfo();
  updatePracticeSetupSummary();
  refreshInputSourceAvailabilityUi();
  setPracticeSetupCollapsed(window.innerWidth < 900);
  void refreshAudioInputDeviceOptions();
  void refreshMidiInputDevices(false);
  dom.closeMelodyImportBtn.addEventListener('click', () => setModalVisible('melodyImport', false));
  dom.cancelMelodyImportBtn.addEventListener('click', () => setModalVisible('melodyImport', false));
  dom.melodyImportModal.addEventListener('click', (e) => {
    if (e.target === dom.melodyImportModal) setModalVisible('melodyImport', false);
  });

  dom.practiceSetupToggleBtn.addEventListener('click', () => {
    togglePracticeSetupCollapsed();
  });
  dom.sessionToolsToggleBtn.addEventListener('click', () => {
    toggleSessionToolsCollapsed();
  });

  subscribeMetronomeBeat(({ beatInBar, accented }) => {
    dom.metronomeBeatLabel.textContent = String(beatInBar);
    dom.metronomePulse.classList.remove('bg-slate-500');
    dom.metronomePulse.classList.toggle('bg-amber-400', accented);
    dom.metronomePulse.classList.toggle('bg-amber-200', !accented);
    dom.metronomePulse.classList.add('scale-125');

    window.setTimeout(() => {
      dom.metronomePulse.classList.remove('bg-amber-400', 'bg-amber-200', 'scale-125');
      dom.metronomePulse.classList.add('bg-slate-500');
    }, 90);
  });

  // --- Main Session Controls ---
  dom.sessionToggleBtn.addEventListener('click', async () => {
    if (!dom.stopBtn.disabled) {
      stopListening();
      return;
    }

    await startSessionFromUi();
  });

  dom.startBtn.addEventListener('click', async () => {
    await startSessionFromUi();
  });

  dom.stopBtn.addEventListener('click', () => {
    stopListening();
  });

  // --- Top Control Bar Listeners ---
  dom.instrumentSelector.addEventListener('change', async () => {
    markCurriculumPresetAsCustom();
    state.currentInstrument = instruments[dom.instrumentSelector.value];
    state.currentTuningPresetKey = dom.tuningPreset.value;
    updateInstrumentUI(); // Redraw strings, fretboard, etc.
    populateMelodyOptions();
    updatePracticeSetupSummary();
    await loadInstrumentSoundfont(state.currentInstrument.name);
    saveSettings();
  });

  dom.tuningPreset.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    if (state.isListening) {
      stopListening();
    }

    state.currentTuningPresetKey = dom.tuningPreset.value;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));
    updateInstrumentUI(enabledStrings, state.currentTuningPresetKey);
    updatePracticeSetupSummary();
    saveSettings();
    setResultMessage(`Tuning set: ${dom.tuningPreset.selectedOptions[0]?.textContent ?? dom.tuningPreset.value}`);
  });

  dom.showAllNotes.addEventListener('change', (e) => {
    markCurriculumPresetAsCustom();
    state.showingAllNotes = (e.target as HTMLInputElement).checked;
    saveSettings();
    redrawFretboard();
  });
  dom.showStringToggles.addEventListener('change', () => {
    dom.stringSelector.classList.toggle('hidden', !dom.showStringToggles.checked);
    saveSettings();
  });
  dom.autoPlayPromptSound.addEventListener('change', () => {
    state.autoPlayPromptSound = dom.autoPlayPromptSound.checked;
    saveSettings();
  });
  dom.stringSelector.addEventListener('change', () => {
    updatePracticeSetupSummary();
  });

  dom.noteNaming.addEventListener('change', () => {
    setNoteNamingPreference(dom.noteNaming.value);
    saveSettings();
    redrawFretboard();
    refreshDisplayFormatting();
  });

  dom.audioInputDevice.addEventListener('change', () => {
    const selectedDeviceId = normalizeAudioInputDeviceId(dom.audioInputDevice.value);
    setPreferredAudioInputDeviceId(selectedDeviceId);

    if (state.isListening) {
      stopListening();
      setResultMessage('Microphone changed. Session stopped; press Start to use the selected input.');
    }

    saveSettings();
    updateMicNoiseGateInfo();
  });

  dom.micSensitivityPreset.addEventListener('change', () => {
    state.micSensitivityPreset = normalizeMicSensitivityPreset(dom.micSensitivityPreset.value);
    dom.micSensitivityPreset.value = state.micSensitivityPreset;
    updateMicNoiseGateInfo();
    saveSettings();
  });
  dom.micNoteAttackFilter.addEventListener('change', () => {
    state.micNoteAttackFilterPreset = normalizeMicNoteAttackFilterPreset(dom.micNoteAttackFilter.value);
    dom.micNoteAttackFilter.value = state.micNoteAttackFilterPreset;
    updateMicNoiseGateInfo();
    saveSettings();
  });
  dom.micNoteHoldFilter.addEventListener('change', () => {
    state.micNoteHoldFilterPreset = normalizeMicNoteHoldFilterPreset(dom.micNoteHoldFilter.value);
    dom.micNoteHoldFilter.value = state.micNoteHoldFilterPreset;
    updateMicNoiseGateInfo();
    saveSettings();
  });

  dom.calibrateNoiseFloorBtn.addEventListener('click', async () => {
    if (state.isListening) {
      setResultMessage('Stop the current session before calibrating room noise.', 'error');
      return;
    }

    const originalLabel = dom.calibrateNoiseFloorBtn.textContent ?? 'Calibrate Noise Floor (2s Silence)';
    dom.calibrateNoiseFloorBtn.disabled = true;
    dom.calibrateNoiseFloorBtn.textContent = 'Measuring... stay silent';
    dom.micNoiseGateInfo.textContent =
      'Measuring room noise floor... keep the room quiet for 2 seconds.';

    try {
      const noiseFloorRms = await measureRoomNoiseFloorRms(2000);
      state.micAutoNoiseFloorRms = noiseFloorRms;
      state.micSensitivityPreset = 'auto';
      dom.micSensitivityPreset.value = 'auto';
      updateMicNoiseGateInfo();
      saveSettings();
      setResultMessage(
        `Room noise calibrated. Auto threshold is now based on ${noiseFloorRms.toFixed(4)} RMS.`,
        'success'
      );
    } catch (error) {
      updateMicNoiseGateInfo();
      showNonBlockingError(formatUserFacingError('Failed to calibrate room noise floor', error));
    } finally {
      dom.calibrateNoiseFloorBtn.disabled = false;
      dom.calibrateNoiseFloorBtn.textContent = originalLabel;
    }
  });

  dom.inputSource.addEventListener('change', () => {
    const nextInputSource = normalizeInputSource(dom.inputSource.value);
    setInputSourcePreference(nextInputSource);

    if (nextInputSource === 'midi') {
      void refreshMidiInputDevices(true);
    }

    if (state.isListening) {
      stopListening();
      setResultMessage('Input source changed. Session stopped; press Start to continue.');
    }

    saveSettings();
  });

  dom.midiInputDevice.addEventListener('change', () => {
    const selectedDeviceId = normalizeMidiInputDeviceId(dom.midiInputDevice.value);
    setPreferredMidiInputDeviceId(selectedDeviceId);

    if (state.isListening && state.inputSource === 'midi') {
      stopListening();
      setResultMessage('MIDI device changed. Session stopped; press Start to use the selected input.');
    }

    saveSettings();
  });

  dom.trainingMode.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    handleModeChange();
    updatePracticeSetupSummary();
    saveSettings();
  });

  dom.sessionGoal.addEventListener('change', () => {
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.sessionPace.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    state.sessionPace = normalizeSessionPace(dom.sessionPace.value);
    dom.sessionPace.value = state.sessionPace;
    updatePracticeSetupSummary();
    saveSettings();
  });

  dom.curriculumPreset.addEventListener('change', () => {
    const key = dom.curriculumPreset.value as CurriculumPresetKey;
    if (key === 'custom') {
      setCurriculumPresetInfo('');
      updatePracticeSetupSummary();
      return;
    }
    applyCurriculumPreset(key);
    updatePracticeSetupSummary();
  });

  dom.startFret.addEventListener('input', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    redrawFretboard();
  });
  dom.endFret.addEventListener('input', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    redrawFretboard();
  });
  dom.metronomeEnabled.addEventListener('change', async () => {
    const bpm = getClampedMetronomeBpmFromInput();
    saveSettings();
    if (!dom.metronomeEnabled.checked) {
      stopMetronome();
      resetMetronomeVisualIndicator();
      return;
    }

    try {
      await startMetronome(bpm);
    } catch (error) {
      dom.metronomeEnabled.checked = false;
      resetMetronomeVisualIndicator();
      showNonBlockingError(formatUserFacingError('Failed to start metronome', error));
    }
  });
  dom.metronomeBpm.addEventListener('input', async () => {
    const bpm = getClampedMetronomeBpmFromInput();
    saveSettings();
    if (!dom.metronomeEnabled.checked) return;

    try {
      await setMetronomeTempo(bpm);
    } catch (error) {
      console.error('Failed to update metronome tempo:', error);
    }
  });
  dom.rhythmTimingWindow.addEventListener('change', () => {
    saveSettings();
  });
  dom.difficulty.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.scaleSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodySelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    state.preferredMelodyId = dom.melodySelector.value || null;
    dom.deleteMelodyBtn.disabled = !isCustomMelodyId(dom.melodySelector.value);
    if (state.isListening && dom.trainingMode.value === 'melody') {
      stopListening();
      setResultMessage('Melody changed. Session stopped; press Start to begin from the first note.');
    }
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodyShowNote.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.openMelodyImportBtn.addEventListener('click', () => {
    dom.melodyNameInput.focus();
    setModalVisible('melodyImport', true);
  });
  dom.importMelodyBtn.addEventListener('click', () => {
    try {
      const melodyId = saveCustomAsciiTabMelody(
        dom.melodyNameInput.value,
        dom.melodyAsciiTabInput.value,
        state.currentInstrument
      );
      populateMelodyOptions();
      dom.melodySelector.value = melodyId;
      state.preferredMelodyId = melodyId;
      dom.deleteMelodyBtn.disabled = false;
      dom.melodyNameInput.value = '';
      dom.melodyAsciiTabInput.value = '';
      setModalVisible('melodyImport', false);
      markCurriculumPresetAsCustom();
      updatePracticeSetupSummary();
      saveSettings();
      setResultMessage('Custom melody imported from ASCII tab.');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to import ASCII tab melody', error));
    }
  });
  dom.deleteMelodyBtn.addEventListener('click', async () => {
    const selectedId = dom.melodySelector.value;
    if (!isCustomMelodyId(selectedId)) return;

    const confirmed = await confirmUserAction('Delete selected custom melody from the local library?');
    if (!confirmed) return;

    const deleted = deleteCustomMelody(selectedId);
    populateMelodyOptions();
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
    if (deleted) {
      setResultMessage('Custom melody deleted.');
    }
  });
  dom.chordSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.randomizeChords.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    saveSettings();
  });
  dom.progressionSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.arpeggioPatternSelector.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  // String selector listeners are added dynamically in updateInstrumentUI.

  dom.playSoundBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt) return;

    const audioPlan = buildPromptAudioPlan({
      prompt,
      trainingMode: dom.trainingMode.value,
      instrument: state.currentInstrument,
      calibratedA4: state.calibratedA4,
      enabledStrings: getEnabledStrings(dom.stringSelector),
    });

    if (audioPlan.notesToPlay.length === 1) {
      playSound(audioPlan.notesToPlay[0]);
    } else if (audioPlan.notesToPlay.length > 1) {
      playSound(audioPlan.notesToPlay);
    }
  });

  dom.hintBtn.addEventListener('click', () => {
    const prompt = state.currentPrompt;
    if (!prompt) return;

    clearResultMessage();

    if ((prompt.targetMelodyEventNotes?.length ?? 0) > 1) {
      drawFretboard(false, null, null, prompt.targetMelodyEventNotes ?? []);
      state.cooldown = true;
      scheduleSessionTimeout(
        2000,
        () => {
          redrawFretboard();
          state.cooldown = false;
        },
        'melody poly hint cooldown redraw'
      );
      return;
    }

    if (!prompt.targetNote) return;

    const noteToShow = prompt.targetNote;
    const stringToShow = prompt.targetString || findPlayableStringForNote(noteToShow);

    if (stringToShow) {
      drawFretboard(false, noteToShow, stringToShow);
      state.cooldown = true;
      scheduleSessionTimeout(
        2000,
        () => {
          redrawFretboard();
          state.cooldown = false;
        },
        'hint cooldown redraw'
      );
    } else {
      setResultMessage(`Hint: The answer is ${noteToShow}`);
    }
  });
}
