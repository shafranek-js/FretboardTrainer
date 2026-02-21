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

/** Updates the entire UI to match the selected instrument. */
export function updateInstrumentUI(loadedStrings?: string[]) {
  const instrument = state.currentInstrument;

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

  // 2. Dynamically populate chord and progression selectors
  const availableChords = new Set(Object.keys(instrument.CHORD_FINGERINGS));
  populateChordSelector(instrument.CHORDS_BY_TYPE, availableChords);
  populateProgressionSelector(instrument.CHORD_PROGRESSIONS, availableChords);

  // 3. Disable chord-based modes if the instrument has no defined chord fingerings
  const hasChords = availableChords.size > 0;
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
  currentTargetNote: string | null = null
) {
  drawFretboardSvg(
    showAll,
    rootNote,
    rootString,
    chordFingering,
    foundChordNotes,
    currentTargetNote
  );
}

/** Updates the visual tuner based on the detected frequency. */
export function updateTuner(frequency: number | null) {
  setTunerReading(frequency, state.targetFrequency);
}

/** Redraws the fretboard based on the current application state. */
export function redrawFretboard() {
  const plan = computeFretboardRenderPlan({
    trainingMode: dom.trainingMode.value,
    isListening: state.isListening,
    showingAllNotes: state.showingAllNotes,
    currentPrompt: state.currentPrompt,
    currentArpeggioIndex: state.currentArpeggioIndex,
  });

  drawFretboard(
    plan.showAll,
    plan.rootNote,
    plan.rootString,
    plan.chordFingering,
    plan.foundChordNotes,
    plan.currentTargetNote
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
  const statsView = buildStatsViewModel(state.stats);
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
