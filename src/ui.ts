/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import { saveSettings, getProfiles, getActiveProfileName } from './storage';
import {
  setLoadingUi,
  setStatsView,
  setStatusText,
  setTrainingModeUi,
  setTunerReading,
  setTunerVisible,
} from './ui-signals';
import { computeFretboardRenderPlan } from './fretboard-render-plan';
import { drawFretboardSvg } from './svg-fretboard';
import { buildStatsViewModel } from './stats-view';
import { isChordDataMode } from './training-mode-groups';
import type { ChordNote } from './types';
import { nearestChromaticTargetFrequencyFromA4 } from './music-theory';
import {
  applyTuningPresetToInstrument,
  getDefaultTuningPresetKey,
  getTuningPresetsForInstrument,
  isChordCompatibleTuning,
} from './tuning-presets';

/** Populates the profile selector dropdown from localStorage. */
export function populateProfileSelector() {
  const profiles = getProfiles();
  const activeProfileName = getActiveProfileName();

  dom.profileSelector.innerHTML = ''; // Clear existing options

  // Add the default option first
  const defaultOption = document.createElement('option');
  defaultOption.value = '__default__';
  defaultOption.textContent = 'Default Settings';
  dom.profileSelector.appendChild(defaultOption);

  // Add all saved profiles, sorted alphabetically
  Object.keys(profiles)
    .filter((name) => name !== '__default__')
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dom.profileSelector.appendChild(option);
    });

  dom.profileSelector.value = activeProfileName in profiles ? activeProfileName : '__default__';
}

/** Populates the chord selector dropdown with chords available for the current instrument. */
function populateChordSelector(
  chordsByType: { [key: string]: string[] },
  availableChords: Set<string>
) {
  dom.chordSelector.innerHTML = ''; // Clear existing options
  Object.entries(chordsByType).forEach(([groupName, chordList]) => {
    const availableChordsInGroup = chordList.filter((chord) => availableChords.has(chord));
    if (availableChordsInGroup.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = groupName;
      availableChordsInGroup.forEach((chordName) => {
        const option = document.createElement('option');
        option.value = chordName;
        option.textContent = chordName;
        optgroup.appendChild(option);
      });
      dom.chordSelector.appendChild(optgroup);
    }
  });
}

/** Populates the progression selector dropdown with progressions available for the current instrument. */
function populateProgressionSelector(
  progressions: { [key: string]: string[] },
  availableChords: Set<string>
) {
  dom.progressionSelector.innerHTML = ''; // Clear existing options
  Object.entries(progressions).forEach(([progressionName, chordList]) => {
    const isPlayable = chordList.every((chord) => availableChords.has(chord));
    if (isPlayable) {
      const option = document.createElement('option');
      option.value = progressionName;
      option.textContent = progressionName;
      dom.progressionSelector.appendChild(option);
    }
  });
}

function renderSessionToolsStringSelector() {
  dom.sessionToolsStringSelector.innerHTML = '';

  const fretboardStringInputs = Array.from(
    dom.stringSelector.querySelectorAll('input[type="checkbox"]')
  ) as HTMLInputElement[];

  fretboardStringInputs.forEach((fretboardCheckbox) => {
    const label = document.createElement('label');
    label.className =
      'inline-flex items-center gap-1.5 cursor-pointer rounded-md border border-slate-600 bg-slate-800/70 px-2 py-1 text-slate-200';

    const mirrorCheckbox = document.createElement('input');
    mirrorCheckbox.type = 'checkbox';
    mirrorCheckbox.checked = fretboardCheckbox.checked;
    mirrorCheckbox.className = 'w-4 h-4 accent-cyan-500';
    mirrorCheckbox.setAttribute('aria-label', `Enable ${fretboardCheckbox.value} string`);

    const text = document.createElement('span');
    text.className = 'font-mono';
    text.textContent = fretboardCheckbox.value;

    mirrorCheckbox.addEventListener('change', () => {
      if (fretboardCheckbox.checked === mirrorCheckbox.checked) return;
      fretboardCheckbox.checked = mirrorCheckbox.checked;
      fretboardCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    fretboardCheckbox.addEventListener('change', () => {
      mirrorCheckbox.checked = fretboardCheckbox.checked;
    });

    label.appendChild(mirrorCheckbox);
    label.appendChild(text);
    dom.sessionToolsStringSelector.appendChild(label);
  });
}

/** Updates the entire UI to match the selected instrument. */
export function updateInstrumentUI(loadedStrings?: string[], requestedTuningPresetKey?: string) {
  const instrument = state.currentInstrument;
  const tuningPresets = getTuningPresetsForInstrument(instrument.name);
  const fallbackTuningPresetKey = getDefaultTuningPresetKey(instrument.name);
  const nextTuningPresetKey = requestedTuningPresetKey ?? state.currentTuningPresetKey ?? fallbackTuningPresetKey;

  dom.tuningPreset.innerHTML = '';
  tuningPresets.forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset.key;
    option.textContent = preset.label;
    dom.tuningPreset.appendChild(option);
  });
  dom.tuningPreset.value = tuningPresets.some((preset) => preset.key === nextTuningPresetKey)
    ? nextTuningPresetKey
    : fallbackTuningPresetKey;
  state.currentTuningPresetKey = dom.tuningPreset.value;
  const appliedPreset = applyTuningPresetToInstrument(instrument, state.currentTuningPresetKey);
  const tuningHelpText = appliedPreset
    ? `${appliedPreset.description}${appliedPreset.chordCompatible ? '' : ' Chord training modes are temporarily disabled in this tuning.'}`
    : '';
  dom.tuningPresetInfo.textContent = tuningHelpText;
  dom.tuningPresetInfo.classList.toggle('hidden', tuningHelpText.length === 0);

  // 1. Update string selector checkboxes
  dom.stringSelector.innerHTML = ''; // Clear old strings
  instrument.STRING_ORDER.forEach((stringName) => {
    const label = document.createElement('label');
    // Use simple flex layout, positioning is handled by CSS on the container
    label.className = 'flex items-center gap-2 cursor-pointer text-sm font-mono text-slate-300';
    label.dataset.stringName = stringName; // Keep for potential future use

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = stringName;
    checkbox.checked = loadedStrings ? loadedStrings.includes(stringName) : true;
    checkbox.setAttribute('aria-label', `Enable ${stringName} string`);
    checkbox.className = 'w-4 h-4 accent-cyan-500'; // Smaller to match screenshot

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(stringName));
    dom.stringSelector.appendChild(label);
  });
  dom.stringSelector.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      saveSettings();
      redrawFretboard(); // Redraw to potentially hide notes on disabled strings
    });
  });
  renderSessionToolsStringSelector();

  // 2. Dynamically populate chord and progression selectors
  const availableChords = new Set(Object.keys(instrument.CHORD_FINGERINGS));
  populateChordSelector(instrument.CHORDS_BY_TYPE, availableChords);
  populateProgressionSelector(instrument.CHORD_PROGRESSIONS, availableChords);

  // 3. Disable chord-based modes if the instrument has no defined chord fingerings
  const hasChords =
    availableChords.size > 0 && isChordCompatibleTuning(instrument.name, state.currentTuningPresetKey);
  dom.trainingMode.querySelectorAll('option').forEach((option) => {
    if (isChordDataMode(option.value)) {
      (option as HTMLOptionElement).disabled = !hasChords;
    }
  });

  // 4. If a disabled mode is selected, switch to a safe default
  if (!hasChords && isChordDataMode(dom.trainingMode.value)) {
    dom.trainingMode.value = 'random';
    handleModeChange();
  }

  redrawFretboard();
}

/** Draws the fretboard, optionally showing all notes or a specific target note. */
export function drawFretboard(
  showAll = false,
  rootNote: string | null = null,
  rootString: string | null = null,
  chordFingering: ChordNote[] = [],
  foundChordNotes: Set<string> = new Set(),
  currentTargetNote: string | null = null,
  wrongDetectedNote: string | null = null,
  wrongDetectedString: string | null = null,
  wrongDetectedFret: number | null = null
) {
  drawFretboardSvg(
    showAll,
    rootNote,
    rootString,
    chordFingering,
    foundChordNotes,
    currentTargetNote,
    wrongDetectedNote,
    wrongDetectedString,
    wrongDetectedFret
  );
}

/** Updates the visual tuner based on the detected frequency. */
export function updateTuner(frequency: number | null) {
  const effectiveTargetFrequency =
    state.targetFrequency ??
    nearestChromaticTargetFrequencyFromA4(frequency ?? 0, state.calibratedA4);
  setTunerReading(frequency, effectiveTargetFrequency);
}

/** Redraws the fretboard based on the current application state. */
export function redrawFretboard() {
  const plan = computeFretboardRenderPlan({
    trainingMode: dom.trainingMode.value,
    isListening: state.isListening,
    showingAllNotes: state.showingAllNotes,
    currentPrompt: state.currentPrompt,
    currentArpeggioIndex: state.currentArpeggioIndex,
    liveDetectedNote: state.liveDetectedNote,
    liveDetectedString: state.liveDetectedString,
    melodyFoundNotes: state.currentMelodyEventFoundNotes,
  });

  drawFretboard(
    plan.showAll,
    plan.rootNote,
    plan.rootString,
    plan.chordFingering,
    plan.foundChordNotes,
    plan.currentTargetNote,
    state.wrongDetectedNote,
    state.wrongDetectedString,
    state.wrongDetectedFret
  );
}

/** Handles UI changes when the training mode is switched. */
export function handleModeChange() {
  const mode = dom.trainingMode.value;
  setTunerVisible(false);
  setTrainingModeUi(mode);
}

/** Updates and displays the statistics in the modal. */
export function displayStats() {
  const statsView = buildStatsViewModel(state.stats, 3, state.lastSessionStats);
  setStatsView(statsView);
}

/** Sets the loading state of the UI, disabling controls and showing a message. */
export function setLoadingState(isLoading: boolean) {
  state.isLoadingSamples = isLoading;

  if (isLoading) {
    const message = `Loading ${state.currentInstrument.name} sounds...`;
    setStatusText(message);
    setLoadingUi(true, message);
  } else {
    setStatusText('Ready');
    setLoadingUi(false);
  }
}
