/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import {
  updateInstrumentUI,
  handleModeChange,
  populateProfileSelector,
  redrawFretboard,
} from './ui';
import { DEFAULT_A4_FREQUENCY } from './constants';
import { loadInstrumentSoundfont } from './audio';
import { instruments } from './instruments';
import type { IInstrument } from './instruments/instrument';
import { getEnabledStrings } from './fretboard-ui-state';

// --- PROFILE CONSTANTS ---
const PROFILES_KEY = 'fretflow-profiles';
const ACTIVE_PROFILE_KEY = 'fretflow-active-profile';
type InstrumentName = IInstrument['name'];

export interface ProfileSettings {
  instrument?: InstrumentName;
  showAllNotes?: boolean;
  difficulty?: string;
  startFret?: string;
  endFret?: string;
  enabledStrings?: Partial<Record<InstrumentName, string[]>>;
  trainingMode?: string;
  selectedScale?: string;
  selectedChord?: string;
  randomizeChords?: boolean;
  selectedProgression?: string;
  arpeggioPattern?: string;
  calibratedA4?: number;
}

type ProfilesMap = Record<string, ProfileSettings>;

// --- PROFILE MANAGEMENT ---

/** Gets all saved profiles from localStorage. */
export function getProfiles(): ProfilesMap {
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ProfilesMap;
    }
  } catch (error) {
    console.warn('Failed to parse saved profiles. Resetting profiles storage.', error);
  }

  localStorage.removeItem(PROFILES_KEY);
  return {};
}

/** Saves the entire profiles object to localStorage. */
export function saveProfiles(profiles: ProfilesMap) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/** Gets the name of the currently active profile. */
export function getActiveProfileName(): string {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || '__default__';
}

/** Sets the name of the active profile. */
export function setActiveProfileName(name: string) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, name);
}

/** Gathers the current UI state into a settings object. */
export function gatherCurrentSettings(): ProfileSettings {
  const currentEnabledStrings = Array.from(getEnabledStrings(dom.stringSelector));

  // To preserve string settings for the *other* instrument, we read the existing profile first.
  const profiles = getProfiles();
  const activeProfileName = getActiveProfileName();
  const existingProfile = profiles[activeProfileName] || {};
  const enabledStrings: NonNullable<ProfileSettings['enabledStrings']> =
    existingProfile.enabledStrings
      ? { ...existingProfile.enabledStrings }
      : { guitar: [], ukulele: [] };
  enabledStrings[state.currentInstrument.name] = currentEnabledStrings;

  return {
    instrument: state.currentInstrument.name,
    showAllNotes: dom.showAllNotes.checked,
    difficulty: dom.difficulty.value,
    startFret: dom.startFret.value,
    endFret: dom.endFret.value,
    enabledStrings: enabledStrings,
    trainingMode: dom.trainingMode.value,
    selectedScale: dom.scaleSelector.value,
    selectedChord: dom.chordSelector.value,
    randomizeChords: dom.randomizeChords.checked,
    selectedProgression: dom.progressionSelector.value,
    arpeggioPattern: dom.arpeggioPatternSelector.value,
    calibratedA4: state.calibratedA4,
  };
}

/** Saves the current UI state to the active profile. Called on any UI change. */
export function saveSettings() {
  const activeProfileName = getActiveProfileName();
  if (activeProfileName === '__default__') return; // Do not save changes to the default placeholder
  const profiles = getProfiles();
  profiles[activeProfileName] = gatherCurrentSettings();
  saveProfiles(profiles);
}

/** Applies a settings object to the DOM and application state. */
export async function applySettings(settings: ProfileSettings | null | undefined) {
  try {
    const safeSettings = settings ?? {};
    const previousInstrumentName = state.currentInstrument.name;
    const requestedInstrument =
      typeof safeSettings.instrument === 'string' ? safeSettings.instrument : 'guitar';
    const instrumentName = instruments[requestedInstrument] ? requestedInstrument : 'guitar';
    state.currentInstrument = instruments[instrumentName];
    dom.instrumentSelector.value = instrumentName;

    const enabledStringsForCurrentInstrument = safeSettings.enabledStrings?.[instrumentName];
    // This will populate the UI, including chord/progression dropdowns
    updateInstrumentUI(enabledStringsForCurrentInstrument);

    dom.showAllNotes.checked = safeSettings.showAllNotes ?? false;
    dom.difficulty.value = safeSettings.difficulty ?? 'natural';
    dom.startFret.value = safeSettings.startFret ?? '0';
    dom.endFret.value = safeSettings.endFret ?? '12';
    dom.trainingMode.value = safeSettings.trainingMode ?? 'random';
    dom.scaleSelector.value = safeSettings.selectedScale ?? 'C Major';
    dom.randomizeChords.checked = safeSettings.randomizeChords ?? false;

    // Validate and set saved chord, or default to first option
    if (
      safeSettings.selectedChord &&
      [...dom.chordSelector.options].some((opt) => opt.value === safeSettings.selectedChord)
    ) {
      dom.chordSelector.value = safeSettings.selectedChord;
    } else if (dom.chordSelector.options.length > 0) {
      dom.chordSelector.selectedIndex = 0;
    }

    // Validate and set saved progression, or default to first option
    if (
      safeSettings.selectedProgression &&
      [...dom.progressionSelector.options].some(
        (opt) => opt.value === safeSettings.selectedProgression
      )
    ) {
      dom.progressionSelector.value = safeSettings.selectedProgression;
    } else if (dom.progressionSelector.options.length > 0) {
      dom.progressionSelector.selectedIndex = 0;
    }

    dom.arpeggioPatternSelector.value = safeSettings.arpeggioPattern ?? 'ascending';
    state.calibratedA4 = safeSettings.calibratedA4 ?? DEFAULT_A4_FREQUENCY;
    state.showingAllNotes = dom.showAllNotes.checked;

    // If instrument changed, load new sounds. Otherwise, this is very fast.
    if (
      previousInstrumentName !== state.currentInstrument.name ||
      !state.audioCache[state.currentInstrument.name]
    ) {
      await loadInstrumentSoundfont(state.currentInstrument.name);
    }

    handleModeChange();
    redrawFretboard();
  } catch (error) {
    console.error('Failed to apply settings:', error);
  }
}

/** Loads the active profile from localStorage on startup. */
export async function loadSettings() {
  const profiles = getProfiles();
  const activeProfileName = getActiveProfileName();
  // Use empty object for default if profile doesn't exist to reset to defaults
  const settings = profiles[activeProfileName] || {};

  await applySettings(settings);
  populateProfileSelector();
}

/** Saves user statistics to localStorage. */
export function saveStats() {
  localStorage.setItem('fretflow-stats', JSON.stringify(state.stats));
}

/** Loads user statistics from localStorage. */
export function loadStats() {
  const statsString = localStorage.getItem('fretflow-stats');
  if (statsString) {
    try {
      const loadedStats = JSON.parse(statsString);
      // Basic validation
      if (typeof loadedStats.highScore === 'number' && typeof loadedStats.noteStats === 'object') {
        state.stats = loadedStats;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // If stats are corrupted, reset them
      resetStats();
    }
  }
}

/** Resets all user statistics to their default values. */
export function resetStats() {
  state.stats = {
    highScore: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    noteStats: {},
  };
  saveStats();
  // Assuming displayStats is imported and available to call
  // displayStats();
}

/** Updates statistics after a note attempt. */
export function updateStats(isCorrect: boolean, time: number) {
  if (dom.trainingMode.value === 'timed' || !state.currentPrompt) return;

  let noteKey: string | null = null;
  const { baseChordName, targetNote, targetString } = state.currentPrompt;

  if (baseChordName) {
    noteKey = `${baseChordName}-CHORD`;
  } else if (targetNote && targetString) {
    noteKey = `${targetNote}-${targetString}`;
  }

  if (!noteKey) return;

  state.stats.totalAttempts++;

  if (!state.stats.noteStats[noteKey]) {
    state.stats.noteStats[noteKey] = { attempts: 0, correct: 0, totalTime: 0 };
  }

  state.stats.noteStats[noteKey].attempts++;

  if (isCorrect) {
    state.stats.correctAttempts++;
    state.stats.totalTime += time;
    state.stats.noteStats[noteKey].correct++;
    state.stats.noteStats[noteKey].totalTime += time;
  }
  saveStats();
}
