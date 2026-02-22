import { dom, state } from '../state';
import { saveSettings } from '../storage';
import { handleModeChange, redrawFretboard, updateInstrumentUI, drawFretboard } from '../ui';
import { playSound, loadInstrumentSoundfont } from '../audio';
import { scheduleSessionTimeout, startListening, stopListening } from '../logic';
import { instruments } from '../instruments';
import {
  clearResultMessage,
  refreshDisplayFormatting,
  setPracticeSetupCollapsed,
  setPracticeSetupSummary,
  setResultMessage,
  toggleSessionToolsCollapsed,
  togglePracticeSetupCollapsed,
} from '../ui-signals';
import { getEnabledStrings } from '../fretboard-ui-state';
import { buildPromptAudioPlan } from '../prompt-audio-plan';
import {
  buildCurriculumPresetPlan,
  getCurriculumPresetDefinitions,
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
  const fretRange = `${dom.startFret.value}-${dom.endFret.value}`;
  const enabledStringsCount = getEnabledStrings(dom.stringSelector).size;
  const totalStringsCount = state.currentInstrument.STRING_ORDER.length;

  let modeDetail = '';
  if (dom.trainingMode.value === 'scales') {
    modeDetail = ` | ${dom.scaleSelector.value}`;
  } else if (dom.trainingMode.value === 'chords') {
    modeDetail = ` | ${dom.chordSelector.value}`;
  } else if (dom.trainingMode.value === 'progressions') {
    modeDetail = ` | ${dom.progressionSelector.value}`;
  } else if (dom.trainingMode.value === 'arpeggios') {
    modeDetail = ` | ${dom.arpeggioPatternSelector.selectedOptions[0]?.textContent?.trim() ?? dom.arpeggioPatternSelector.value}`;
  }

  const summary = `${modeLabel}${modeDetail} | ${difficultyLabel} | Frets ${fretRange} | Strings ${enabledStringsCount}/${totalStringsCount} | ${goalLabel} | ${curriculumLabel}`;
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
    alert(`Failed to start metronome for Rhythm mode: ${(error as Error).message}`);
    return false;
  }
}

export function registerSessionControls() {
  setCurriculumPresetSelection('custom');
  dom.metronomeBpm.value = String(getClampedMetronomeBpmFromInput());
  resetMetronomeVisualIndicator();
  updatePracticeSetupSummary();
  setPracticeSetupCollapsed(window.innerWidth < 900);

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
  dom.stringSelector.addEventListener('change', () => {
    updatePracticeSetupSummary();
  });

  dom.noteNaming.addEventListener('change', () => {
    setNoteNamingPreference(dom.noteNaming.value);
    saveSettings();
    redrawFretboard();
    refreshDisplayFormatting();
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
      alert(`Failed to start metronome: ${(error as Error).message}`);
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
    if (!prompt || !prompt.targetNote) return;

    clearResultMessage();

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
