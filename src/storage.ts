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
import type { RhythmSessionStats, SessionStats } from './types';
import { getEnabledStrings } from './fretboard-ui-state';
import { normalizeNoteNamingPreference, setNoteNamingPreference } from './note-display';
import { getDefaultTuningPresetKey } from './tuning-presets';
import { normalizeSessionPace } from './session-pace';
import { normalizeAudioInputDeviceId, setPreferredAudioInputDeviceId } from './audio-input-devices';
import { normalizeMicSensitivityPreset } from './mic-input-sensitivity';
import { normalizeMicNoteAttackFilterPreset } from './mic-note-attack-filter';
import { normalizeMicNoteHoldFilterPreset } from './mic-note-hold-filter';
import { normalizeMicPolyphonicDetectorProvider } from './mic-polyphonic-detector';
import {
  normalizeInputSource,
  normalizeMidiInputDeviceId,
  setInputSourcePreference,
  setPreferredMidiInputDeviceId,
} from './midi-runtime';
import {
  formatMelodyTransposeSemitones,
  normalizeMelodyTransposeSemitones,
} from './melody-transposition';
import {
  formatMelodyStringShift,
  normalizeMelodyStringShift,
} from './melody-string-shift';

function normalizeStoredMelodyStudyRangeIndex(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
}

// --- PROFILE CONSTANTS ---
const PROFILES_KEY = 'fretflow-profiles';
const ACTIVE_PROFILE_KEY = 'fretflow-active-profile';
const STATS_KEY = 'fretflow-stats';
const LAST_SESSION_STATS_KEY = 'fretflow-last-session-stats';
type InstrumentName = IInstrument['name'];

function createDefaultRhythmSessionStats(): RhythmSessionStats {
  return {
    totalJudged: 0,
    onBeat: 0,
    early: 0,
    late: 0,
    totalAbsOffsetMs: 0,
    bestAbsOffsetMs: null,
  };
}

export interface ProfileSettings {
  instrument?: InstrumentName;
  tuningPreset?: string;
  showAllNotes?: boolean;
  showStringToggles?: boolean;
  autoPlayPromptSound?: boolean;
  difficulty?: string;
  noteNaming?: 'sharps' | 'flats';
  melodyTimelineViewMode?: 'classic' | 'grid';
  showTimelineSteps?: boolean;
  showTimelineDetails?: boolean;
  inputSource?: 'microphone' | 'midi';
  audioInputDeviceId?: string | null;
  micSensitivityPreset?: 'quiet_room' | 'normal' | 'noisy_room' | 'auto';
  micNoteAttackFilter?: 'off' | 'balanced' | 'strong';
  micNoteHoldFilter?: 'off' | '40ms' | '80ms' | '120ms';
  micPolyphonicDetectorProvider?: string;
  micAutoNoiseFloorRms?: number | null;
  midiInputDeviceId?: string | null;
  startFret?: string;
  endFret?: string;
  enabledStrings?: Partial<Record<InstrumentName, string[]>>;
  trainingMode?: string;
  sessionGoal?: string;
  sessionPace?: 'slow' | 'normal' | 'fast' | 'ultra';
  metronomeEnabled?: boolean;
  metronomeBpm?: string;
  rhythmTimingWindow?: string;
  selectedScale?: string;
  selectedChord?: string;
  randomizeChords?: boolean;
  selectedProgression?: string;
  arpeggioPattern?: string;
  selectedMelodyId?: string;
  melodyShowNote?: boolean;
  melodyTransposeById?: Record<string, number>;
  melodyStringShiftById?: Record<string, number>;
  melodyStudyRangeById?: Record<string, { startIndex: number; endIndex: number }>;
  melodyLoopRange?: boolean;
  melodyTransposeSemitones?: number;
  melodyStringShift?: number;
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
    tuningPreset: state.currentTuningPresetKey,
    showAllNotes: dom.showAllNotes.checked,
    showStringToggles: dom.showStringToggles.checked,
    autoPlayPromptSound: dom.autoPlayPromptSound.checked,
    difficulty: dom.difficulty.value,
    noteNaming: dom.noteNaming.value as 'sharps' | 'flats',
    melodyTimelineViewMode: state.melodyTimelineViewMode,
    showTimelineSteps: state.showMelodyTimelineSteps,
    showTimelineDetails: state.showMelodyTimelineDetails,
    inputSource: state.inputSource,
    audioInputDeviceId: state.preferredAudioInputDeviceId,
    micSensitivityPreset: state.micSensitivityPreset,
    micNoteAttackFilter: state.micNoteAttackFilterPreset,
    micNoteHoldFilter: state.micNoteHoldFilterPreset,
    micPolyphonicDetectorProvider: state.micPolyphonicDetectorProvider,
    micAutoNoiseFloorRms: state.micAutoNoiseFloorRms,
    midiInputDeviceId: state.preferredMidiInputDeviceId,
    startFret: dom.startFret.value,
    endFret: dom.endFret.value,
    enabledStrings: enabledStrings,
    trainingMode: dom.trainingMode.value,
    sessionGoal: dom.sessionGoal.value,
    sessionPace: state.sessionPace,
    metronomeEnabled: dom.metronomeEnabled.checked,
    metronomeBpm: dom.metronomeBpm.value,
    rhythmTimingWindow: dom.rhythmTimingWindow.value,
    selectedScale: dom.scaleSelector.value,
    selectedChord: dom.chordSelector.value,
    randomizeChords: dom.randomizeChords.checked,
    selectedProgression: dom.progressionSelector.value,
    arpeggioPattern: dom.arpeggioPatternSelector.value,
    selectedMelodyId: dom.melodySelector.value || undefined,
    melodyShowNote: dom.melodyShowNote.checked,
    melodyTransposeById: { ...state.melodyTransposeById },
    melodyStringShiftById: { ...state.melodyStringShiftById },
    melodyStudyRangeById: { ...state.melodyStudyRangeById },
    melodyLoopRange: state.melodyLoopRangeEnabled,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
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
    state.currentTuningPresetKey =
      typeof safeSettings.tuningPreset === 'string'
        ? safeSettings.tuningPreset
        : getDefaultTuningPresetKey(instrumentName);
    dom.instrumentSelector.value = instrumentName;

    const enabledStringsForCurrentInstrument = safeSettings.enabledStrings?.[instrumentName];
    // This will populate the UI, including chord/progression dropdowns
    updateInstrumentUI(enabledStringsForCurrentInstrument, state.currentTuningPresetKey);

    dom.showAllNotes.checked = safeSettings.showAllNotes ?? false;
    dom.showStringToggles.checked = safeSettings.showStringToggles ?? false;
    dom.autoPlayPromptSound.checked = safeSettings.autoPlayPromptSound ?? true;
    dom.difficulty.value = safeSettings.difficulty ?? 'natural';
    dom.noteNaming.value = normalizeNoteNamingPreference(safeSettings.noteNaming);
    setNoteNamingPreference(dom.noteNaming.value);
    state.melodyTimelineViewMode =
      safeSettings.melodyTimelineViewMode === 'grid' ? 'grid' : 'classic';
    dom.timelineViewMode.value = state.melodyTimelineViewMode;
    state.showMelodyTimelineSteps = safeSettings.showTimelineSteps ?? false;
    dom.showTimelineSteps.checked = state.showMelodyTimelineSteps;
    state.showMelodyTimelineDetails = safeSettings.showTimelineDetails ?? false;
    dom.showTimelineDetails.checked = state.showMelodyTimelineDetails;
    setInputSourcePreference(normalizeInputSource(safeSettings.inputSource));
    setPreferredAudioInputDeviceId(normalizeAudioInputDeviceId(safeSettings.audioInputDeviceId));
    state.micSensitivityPreset = normalizeMicSensitivityPreset(safeSettings.micSensitivityPreset);
    dom.micSensitivityPreset.value = state.micSensitivityPreset;
    state.micNoteAttackFilterPreset = normalizeMicNoteAttackFilterPreset(safeSettings.micNoteAttackFilter);
    dom.micNoteAttackFilter.value = state.micNoteAttackFilterPreset;
    state.micNoteHoldFilterPreset = normalizeMicNoteHoldFilterPreset(safeSettings.micNoteHoldFilter);
    dom.micNoteHoldFilter.value = state.micNoteHoldFilterPreset;
    state.micPolyphonicDetectorProvider = normalizeMicPolyphonicDetectorProvider(
      safeSettings.micPolyphonicDetectorProvider
    );
    dom.micPolyphonicDetectorProvider.value = state.micPolyphonicDetectorProvider;
    state.micAutoNoiseFloorRms =
      typeof safeSettings.micAutoNoiseFloorRms === 'number' &&
      Number.isFinite(safeSettings.micAutoNoiseFloorRms) &&
      safeSettings.micAutoNoiseFloorRms >= 0
        ? safeSettings.micAutoNoiseFloorRms
        : null;
    setPreferredMidiInputDeviceId(normalizeMidiInputDeviceId(safeSettings.midiInputDeviceId));
    dom.startFret.value = safeSettings.startFret ?? '0';
    dom.endFret.value = safeSettings.endFret ?? '20';
    dom.trainingMode.value = safeSettings.trainingMode ?? 'random';
    dom.sessionGoal.value = safeSettings.sessionGoal ?? 'none';
    state.sessionPace = normalizeSessionPace(safeSettings.sessionPace);
    dom.sessionPace.value = state.sessionPace;
    dom.metronomeEnabled.checked = safeSettings.metronomeEnabled ?? false;
    dom.metronomeBpm.value = safeSettings.metronomeBpm ?? '80';
    dom.metronomeBpmValue.textContent = dom.metronomeBpm.value;
    dom.rhythmTimingWindow.value = safeSettings.rhythmTimingWindow ?? 'normal';
    const selectedTrainingModeOption = dom.trainingMode.selectedOptions[0];
    if (selectedTrainingModeOption?.disabled) {
      dom.trainingMode.value = 'random';
    }
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
    state.preferredMelodyId =
      typeof safeSettings.selectedMelodyId === 'string' && safeSettings.selectedMelodyId.trim().length > 0
        ? safeSettings.selectedMelodyId
        : null;
    dom.melodyShowNote.checked = safeSettings.melodyShowNote ?? true;
    const melodyTransposeById: Record<string, number> = {};
    if (
      safeSettings.melodyTransposeById &&
      typeof safeSettings.melodyTransposeById === 'object' &&
      !Array.isArray(safeSettings.melodyTransposeById)
    ) {
      Object.entries(safeSettings.melodyTransposeById).forEach(([melodyId, transpose]) => {
        const key = melodyId.trim();
        if (!key) return;
        melodyTransposeById[key] = normalizeMelodyTransposeSemitones(transpose);
      });
    }
    state.melodyTransposeById = melodyTransposeById;
    const melodyStringShiftById: Record<string, number> = {};
    if (
      safeSettings.melodyStringShiftById &&
      typeof safeSettings.melodyStringShiftById === 'object' &&
      !Array.isArray(safeSettings.melodyStringShiftById)
    ) {
      Object.entries(safeSettings.melodyStringShiftById).forEach(([melodyId, shift]) => {
        const key = melodyId.trim();
        if (!key) return;
        melodyStringShiftById[key] = normalizeMelodyStringShift(shift, state.currentInstrument);
      });
    }
    state.melodyStringShiftById = melodyStringShiftById;
    const melodyStudyRangeById: Record<string, { startIndex: number; endIndex: number }> = {};
    if (
      safeSettings.melodyStudyRangeById &&
      typeof safeSettings.melodyStudyRangeById === 'object' &&
      !Array.isArray(safeSettings.melodyStudyRangeById)
    ) {
      Object.entries(safeSettings.melodyStudyRangeById).forEach(([melodyId, range]) => {
        const key = melodyId.trim();
        if (!key || !range || typeof range !== 'object' || Array.isArray(range)) return;
        melodyStudyRangeById[key] = {
          startIndex: normalizeStoredMelodyStudyRangeIndex((range as { startIndex?: unknown }).startIndex),
          endIndex: normalizeStoredMelodyStudyRangeIndex((range as { endIndex?: unknown }).endIndex),
        };
      });
    }
    state.melodyStudyRangeById = melodyStudyRangeById;
    state.melodyStudyRangeStartIndex = 0;
    state.melodyStudyRangeEndIndex = 0;
    state.melodyLoopRangeEnabled = safeSettings.melodyLoopRange ?? false;
    dom.melodyLoopRange.checked = state.melodyLoopRangeEnabled;
    state.melodyTransposeSemitones = normalizeMelodyTransposeSemitones(
      safeSettings.melodyTransposeSemitones
    );
    dom.melodyTranspose.value = String(state.melodyTransposeSemitones);
    dom.melodyTransposeValue.textContent = formatMelodyTransposeSemitones(state.melodyTransposeSemitones);
    state.melodyStringShift = normalizeMelodyStringShift(
      safeSettings.melodyStringShift,
      state.currentInstrument
    );
    dom.melodyStringShift.value = String(state.melodyStringShift);
    dom.melodyStringShiftValue.textContent = formatMelodyStringShift(state.melodyStringShift);
    dom.melodyDemoBpmValue.textContent = dom.melodyDemoBpm.value;
    state.calibratedA4 = safeSettings.calibratedA4 ?? DEFAULT_A4_FREQUENCY;
    state.showingAllNotes = dom.showAllNotes.checked;
    state.autoPlayPromptSound = dom.autoPlayPromptSound.checked;
    dom.stringSelector.classList.toggle('hidden', !dom.showStringToggles.checked);

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
  localStorage.setItem(STATS_KEY, JSON.stringify(state.stats));
}

export function saveLastSessionStats() {
  if (!state.lastSessionStats) {
    localStorage.removeItem(LAST_SESSION_STATS_KEY);
    return;
  }
  localStorage.setItem(LAST_SESSION_STATS_KEY, JSON.stringify(state.lastSessionStats));
}

/** Loads user statistics from localStorage. */
export function loadStats() {
  state.lastSessionStats = null;
  const statsString = localStorage.getItem(STATS_KEY);
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

  const lastSessionStatsString = localStorage.getItem(LAST_SESSION_STATS_KEY);
  if (lastSessionStatsString) {
    try {
      const loadedLastSession = JSON.parse(lastSessionStatsString) as Partial<SessionStats>;
      if (
        typeof loadedLastSession === 'object' &&
        loadedLastSession &&
        typeof loadedLastSession.modeKey === 'string' &&
        typeof loadedLastSession.modeLabel === 'string' &&
        typeof loadedLastSession.startedAtMs === 'number' &&
        typeof loadedLastSession.totalAttempts === 'number' &&
        typeof loadedLastSession.correctAttempts === 'number' &&
        typeof loadedLastSession.totalTime === 'number' &&
        typeof loadedLastSession.noteStats === 'object' &&
        typeof loadedLastSession.targetZoneStats === 'object'
      ) {
        state.lastSessionStats = {
          ...(loadedLastSession as SessionStats),
          inputSource:
            loadedLastSession.inputSource === 'midi' ? 'midi' : 'microphone',
          inputDeviceLabel:
            typeof loadedLastSession.inputDeviceLabel === 'string'
              ? loadedLastSession.inputDeviceLabel
              : '',
          tuningPresetKey:
            typeof loadedLastSession.tuningPresetKey === 'string' ? loadedLastSession.tuningPresetKey : '',
          currentCorrectStreak:
            typeof loadedLastSession.currentCorrectStreak === 'number'
              ? loadedLastSession.currentCorrectStreak
              : 0,
          bestCorrectStreak:
            typeof loadedLastSession.bestCorrectStreak === 'number'
              ? loadedLastSession.bestCorrectStreak
              : 0,
          rhythmStats:
            loadedLastSession.rhythmStats &&
            typeof loadedLastSession.rhythmStats === 'object' &&
            typeof (loadedLastSession.rhythmStats as Partial<RhythmSessionStats>).totalJudged ===
              'number'
              ? ({
                  ...createDefaultRhythmSessionStats(),
                  ...(loadedLastSession.rhythmStats as Partial<RhythmSessionStats>),
                } satisfies RhythmSessionStats)
              : createDefaultRhythmSessionStats(),
        };
      }
    } catch (error) {
      console.error('Failed to load last session stats:', error);
      localStorage.removeItem(LAST_SESSION_STATS_KEY);
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
  state.lastSessionStats = null;
  state.activeSessionStats = null;
  saveStats();
  localStorage.removeItem(LAST_SESSION_STATS_KEY);
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
