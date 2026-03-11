/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom } from './dom';
import { state } from './state';
import {
  updateInstrumentUI,
  handleModeChange,
  populateProfileSelector,
  redrawFretboard,
} from './ui';
import {
  getMelodySetupCollapsed,
  getPracticeSetupCollapsed,
  getSessionToolsCollapsed,
  setMelodySetupCollapsed,
  setPracticeSetupCollapsed,
  setSessionToolsCollapsed,
  setUiWorkflow,
  setUiMode,
} from './ui-signals';
import { DEFAULT_A4_FREQUENCY } from './constants';
import { loadInstrumentSoundfont } from './audio';
import { instruments } from './instruments';
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
  formatStudyMelodyMicAutoFrameValue,
  formatStudyMelodyMicPercent,
  normalizeStudyMelodyMicGatePercent,
  normalizeStudyMelodyMicNoiseGuardPercent,
  normalizeStudyMelodyMicSilenceResetFrames,
  normalizeStudyMelodyMicStableFrames,
  normalizeStudyMelodyPreEmphasisFrequencyHz,
  normalizeStudyMelodyPreEmphasisGainDb,
  formatStudyMelodyPreEmphasisFrequency,
  formatStudyMelodyPreEmphasisGain,
} from './study-melody-mic-tuning';
import { normalizeMelodyFingeringLevel } from './melody-fingering';
import { normalizePerformanceMicTolerancePreset } from './performance-mic-tolerance';
import {
  normalizePerformanceTimingLeniencyPreset,
} from './performance-timing-forgiveness';
import { normalizePerformanceMicLatencyCompensationMs } from './performance-mic-latency-compensation';
import { getCurriculumPresetDefinitions, type CurriculumPresetKey } from './curriculum-presets';
import {
  normalizeInputSource,
  normalizeMidiInputDeviceId,
  setInputSourcePreference,
  setPreferredMidiInputDeviceId,
} from './midi-runtime';
import { normalizeMelodyTimelineZoomPercent } from './melody-timeline-zoom';
import { clampMetronomeVolumePercent, setMetronomeVolume } from './metronome';
import { formatPromptSoundTailMs, normalizePromptSoundTailMs } from './prompt-sound-tail';
import {
  getActiveProfileName,
  getDefaultMelodyIdForInstrument,
  getDefaultTrainingMode,
  getProfiles,
  resetSavedSettings,
  saveProfiles,
  setActiveProfileName,
  type ProfileSettings,
} from './storage-profiles';
import {
  flushPendingStatsSave,
  loadStats,
  resetStats,
  saveLastSessionAnalysisBundle,
  saveLastSessionStats,
  savePerformanceStarResults,
  saveStats,
  updateStats,
} from './storage-stats';
import {
  applyStoredMelodySettings,
  resolveStoredMelodySettings,
} from './storage-melody-settings';
import { normalizeUiMode } from './ui-mode';
import {
  getDefaultTrainingModeForUiWorkflow,
  isTrainingModeInUiWorkflow,
  normalizeUiWorkflow,
  resolveUiWorkflowFromTrainingMode,
} from './training-workflows';

import { resolveSessionToolsVisibility } from './session-tools-visibility';

export {
  getProfiles,
  saveProfiles,
  getActiveProfileName,
  setActiveProfileName,
  resetSavedSettings,
  getDefaultTrainingMode,
  getDefaultMelodyIdForInstrument,
  saveStats,
  flushPendingStatsSave,
  saveLastSessionAnalysisBundle,
  saveLastSessionStats,
  savePerformanceStarResults,
  loadStats,
  resetStats,
  updateStats,
};
export type { ProfileSettings } from './storage-profiles';

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
    promptSoundTailMs: normalizePromptSoundTailMs(dom.promptSoundTail.value),
    relaxPerformanceOctaveCheck: dom.relaxPerformanceOctaveCheck.checked,
    performanceMicTolerancePreset: normalizePerformanceMicTolerancePreset(dom.performanceMicTolerancePreset.value),
    performanceTimingLeniencyPreset: normalizePerformanceTimingLeniencyPreset(
      dom.performanceTimingLeniencyPreset.value
    ),
    performanceMicLatencyCompensationMs: normalizePerformanceMicLatencyCompensationMs(
      dom.performanceMicLatencyCompensation.value
    ),
    difficulty: dom.difficulty.value,
    noteNaming: dom.noteNaming.value as 'sharps' | 'flats',
    melodyTimelineViewMode: state.melodyTimelineViewMode,
    melodyFingeringStrategy: state.melodyFingeringStrategy,
    melodyFingeringLevel: state.melodyFingeringLevel,
    showTimelineSteps: state.showMelodyTimelineSteps,
    showTimelineDetails: state.showMelodyTimelineDetails,
    inputSource: state.inputSource,
    audioInputDeviceId: state.preferredAudioInputDeviceId,
    micSensitivityPreset: state.micSensitivityPreset,
    micNoteAttackFilter: state.micNoteAttackFilterPreset,
    micNoteHoldFilter: state.micNoteHoldFilterPreset,
    isDirectInputMode: dom.micDirectInputMode.checked,
    micPolyphonicDetectorProvider: state.micPolyphonicDetectorProvider,
    micAutoNoiseFloorRms: state.micAutoNoiseFloorRms,
    studyMelodyMicGatePercent: state.studyMelodyMicGatePercent,
    studyMelodyMicNoiseGuardPercent: state.studyMelodyMicNoiseGuardPercent,
    studyMelodyMicSilenceResetFrames: state.studyMelodyMicSilenceResetFrames,
    studyMelodyMicStableFrames: state.studyMelodyMicStableFrames,
    studyMelodyPreEmphasisFrequencyHz: state.studyMelodyPreEmphasisFrequencyHz,
    studyMelodyPreEmphasisGainDb: state.studyMelodyPreEmphasisGainDb,
    midiInputDeviceId: state.preferredMidiInputDeviceId,
    startFret: dom.startFret.value,
    endFret: dom.endFret.value,
    enabledStrings: enabledStrings,
    trainingMode: dom.trainingMode.value,
    uiWorkflow: state.uiWorkflow,
    uiMode: state.uiMode,
    sessionGoal: dom.sessionGoal.value,
    sessionPace: state.sessionPace,
    practiceSetupCollapsed: getPracticeSetupCollapsed(),
    melodySetupCollapsed: getMelodySetupCollapsed(),
    sessionToolsCollapsed: getSessionToolsCollapsed(),
    metronomeEnabled: dom.metronomeEnabled.checked,
    metronomeBpm: dom.metronomeBpm.value,
    metronomeVolume: dom.metronomeVolume.value,
    rhythmTimingWindow: dom.rhythmTimingWindow.value,
    selectedScale: dom.scaleSelector.value,
    selectedChord: dom.chordSelector.value,
    randomizeChords: dom.randomizeChords.checked,
    selectedProgression: dom.progressionSelector.value,
    arpeggioPattern: dom.arpeggioPatternSelector.value,
    curriculumPreset: dom.curriculumPreset.value as CurriculumPresetKey,
    selectedMelodyId: dom.melodySelector.value || undefined,
    melodyShowNote: dom.melodyShowNote.checked,
    melodyShowTabTimeline: state.showMelodyTabTimeline,
    melodyShowScrollingTab: state.showScrollingTabPanel,
    melodyTimelineZoomPercent: normalizeMelodyTimelineZoomPercent(dom.melodyTimelineZoom.value),
    scrollingTabZoomPercent: state.scrollingTabZoomPercent,
    melodyDemoBpm: dom.melodyDemoBpm.value,
    melodyPlaybackBpmById: { ...state.melodyPlaybackBpmById },
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
    state.promptSoundTailMs = normalizePromptSoundTailMs(safeSettings.promptSoundTailMs);
    dom.promptSoundTail.value = String(state.promptSoundTailMs);
    dom.promptSoundTailValue.textContent = formatPromptSoundTailMs(state.promptSoundTailMs);
    dom.relaxPerformanceOctaveCheck.checked = safeSettings.relaxPerformanceOctaveCheck ?? true;
    state.performanceMicTolerancePreset = normalizePerformanceMicTolerancePreset(
      safeSettings.performanceMicTolerancePreset
    );
    dom.performanceMicTolerancePreset.value = state.performanceMicTolerancePreset;
    state.performanceTimingLeniencyPreset = normalizePerformanceTimingLeniencyPreset(
      safeSettings.performanceTimingLeniencyPreset
    );
    dom.performanceTimingLeniencyPreset.value = state.performanceTimingLeniencyPreset;
    state.performanceMicLatencyCompensationMs = normalizePerformanceMicLatencyCompensationMs(
      safeSettings.performanceMicLatencyCompensationMs
    );
    dom.performanceMicLatencyCompensation.value = String(state.performanceMicLatencyCompensationMs);
    dom.performanceMicLatencyCompensationExact.value = String(state.performanceMicLatencyCompensationMs);
    dom.performanceMicLatencyCompensationValue.textContent = `${state.performanceMicLatencyCompensationMs} ms`;
    dom.difficulty.value = safeSettings.difficulty ?? 'natural';
    dom.noteNaming.value = normalizeNoteNamingPreference(safeSettings.noteNaming);
    setNoteNamingPreference(dom.noteNaming.value);
    state.melodyTimelineViewMode =
      safeSettings.melodyTimelineViewMode === 'grid' ? 'grid' : 'classic';
    dom.timelineViewMode.value = state.melodyTimelineViewMode;
    state.melodyFingeringStrategy = 'minimax';
    dom.melodyFingeringStrategy.value = state.melodyFingeringStrategy;
    dom.melodyFingeringStrategyQuick.value = state.melodyFingeringStrategy;
    state.melodyFingeringLevel = normalizeMelodyFingeringLevel(safeSettings.melodyFingeringLevel);
    dom.melodyFingeringLevel.value = state.melodyFingeringLevel;
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
    state.isDirectInputMode = Boolean(safeSettings.isDirectInputMode);
    dom.micDirectInputMode.checked = state.isDirectInputMode;
    if (state.isDirectInputMode) {
      state.ignorePromptAudioUntilMs = 0;
    }
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
    state.studyMelodyMicGatePercent = normalizeStudyMelodyMicGatePercent(safeSettings.studyMelodyMicGatePercent);
    state.studyMelodyMicNoiseGuardPercent = normalizeStudyMelodyMicNoiseGuardPercent(
      safeSettings.studyMelodyMicNoiseGuardPercent
    );
    state.studyMelodyMicSilenceResetFrames = normalizeStudyMelodyMicSilenceResetFrames(
      safeSettings.studyMelodyMicSilenceResetFrames
    );
    state.studyMelodyMicStableFrames = normalizeStudyMelodyMicStableFrames(
      safeSettings.studyMelodyMicStableFrames
    );
    state.studyMelodyPreEmphasisFrequencyHz = normalizeStudyMelodyPreEmphasisFrequencyHz(
      safeSettings.studyMelodyPreEmphasisFrequencyHz
    );
    state.studyMelodyPreEmphasisGainDb = normalizeStudyMelodyPreEmphasisGainDb(
      safeSettings.studyMelodyPreEmphasisGainDb
    );
    dom.studyMelodyMicGatePercent.value = String(state.studyMelodyMicGatePercent);
    dom.studyMelodyMicGatePercentValue.textContent = formatStudyMelodyMicPercent(state.studyMelodyMicGatePercent);
    dom.studyMelodyMicNoiseGuardPercent.value = String(state.studyMelodyMicNoiseGuardPercent);
    dom.studyMelodyMicNoiseGuardPercentValue.textContent = formatStudyMelodyMicPercent(
      state.studyMelodyMicNoiseGuardPercent
    );
    dom.studyMelodyMicSilenceResetFrames.value = String(state.studyMelodyMicSilenceResetFrames);
    dom.studyMelodyMicSilenceResetFramesValue.textContent = formatStudyMelodyMicAutoFrameValue(
      state.studyMelodyMicSilenceResetFrames
    );
    dom.studyMelodyMicStableFrames.value = String(state.studyMelodyMicStableFrames);
    dom.studyMelodyMicStableFramesValue.textContent = formatStudyMelodyMicAutoFrameValue(
      state.studyMelodyMicStableFrames
    );
    dom.studyMelodyPreEmphasisFrequencyHz.value = String(state.studyMelodyPreEmphasisFrequencyHz);
    dom.studyMelodyPreEmphasisFrequencyHzValue.textContent = formatStudyMelodyPreEmphasisFrequency(
      state.studyMelodyPreEmphasisFrequencyHz
    );
    dom.studyMelodyPreEmphasisGainDb.value = String(state.studyMelodyPreEmphasisGainDb);
    dom.studyMelodyPreEmphasisGainDbValue.textContent = formatStudyMelodyPreEmphasisGain(
      state.studyMelodyPreEmphasisGainDb
    );
    setPreferredMidiInputDeviceId(normalizeMidiInputDeviceId(safeSettings.midiInputDeviceId));
    dom.startFret.value = safeSettings.startFret ?? '0';
    dom.endFret.value = safeSettings.endFret ?? '20';
    const requestedTrainingMode = safeSettings.trainingMode ?? getDefaultTrainingMode();
    const requestedUiWorkflow = normalizeUiWorkflow(
      safeSettings.uiWorkflow ?? resolveUiWorkflowFromTrainingMode(requestedTrainingMode)
    );
    dom.trainingMode.value = requestedTrainingMode;
    if (!isTrainingModeInUiWorkflow(dom.trainingMode.value, requestedUiWorkflow)) {
      dom.trainingMode.value = getDefaultTrainingModeForUiWorkflow(requestedUiWorkflow);
    }
    state.uiWorkflow = requestedUiWorkflow;
    setUiWorkflow(state.uiWorkflow);
    state.uiMode = normalizeUiMode(safeSettings.uiMode);
    setUiMode(state.uiMode);
    dom.sessionGoal.value = safeSettings.sessionGoal ?? 'none';
    state.sessionPace = normalizeSessionPace(safeSettings.sessionPace);
    dom.sessionPace.value = state.sessionPace;
    setPracticeSetupCollapsed(safeSettings.practiceSetupCollapsed ?? window.innerWidth < 900);
    setMelodySetupCollapsed(safeSettings.melodySetupCollapsed ?? false);
    setSessionToolsCollapsed(safeSettings.sessionToolsCollapsed ?? true);
    dom.metronomeEnabled.checked = safeSettings.metronomeEnabled ?? false;
    dom.metronomeBpm.value = safeSettings.metronomeBpm ?? '80';
    dom.metronomeBpmValue.textContent = dom.metronomeBpm.value;
    const resolvedMetronomeVolume = clampMetronomeVolumePercent(
      Number.parseInt(safeSettings.metronomeVolume ?? '100', 10)
    );
    dom.metronomeVolume.value = String(resolvedMetronomeVolume);
    dom.metronomeVolumeValue.textContent = `${resolvedMetronomeVolume}%`;
    setMetronomeVolume(resolvedMetronomeVolume);
    dom.rhythmTimingWindow.value = safeSettings.rhythmTimingWindow ?? 'normal';
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
    const curriculumPreset = safeSettings.curriculumPreset ?? 'custom';
    const hasCurriculumPresetOption = [...dom.curriculumPreset.options].some(
      (option) => option.value === curriculumPreset
    );
    dom.curriculumPreset.value = hasCurriculumPresetOption ? curriculumPreset : 'custom';
    const curriculumPresetDescription =
      getCurriculumPresetDefinitions().find((preset) => preset.key === dom.curriculumPreset.value)?.description ??
      '';
    dom.curriculumPresetInfo.textContent = curriculumPresetDescription;
    dom.curriculumPresetInfo.classList.toggle('hidden', curriculumPresetDescription.length === 0);
    dom.melodyShowNote.checked = safeSettings.melodyShowNote ?? true;
    state.showMelodyTabTimeline = safeSettings.melodyShowTabTimeline ?? true;
    dom.melodyShowTabTimeline.checked = state.showMelodyTabTimeline;
    state.showScrollingTabPanel = safeSettings.melodyShowScrollingTab ?? true;
    dom.melodyShowScrollingTab.checked = state.showScrollingTabPanel;
    const resolvedMelodySettings = resolveStoredMelodySettings(
      safeSettings,
      state.currentInstrument,
      getDefaultMelodyIdForInstrument
    );
    applyStoredMelodySettings(resolvedMelodySettings, dom, state);
    state.calibratedA4 = safeSettings.calibratedA4 ?? DEFAULT_A4_FREQUENCY;
    state.showingAllNotes = dom.showAllNotes.checked;
    state.autoPlayPromptSound = dom.autoPlayPromptSound.checked;
    state.promptSoundTailMs = normalizePromptSoundTailMs(dom.promptSoundTail.value);
    state.relaxPerformanceOctaveCheck = dom.relaxPerformanceOctaveCheck.checked;
    state.performanceMicTolerancePreset = normalizePerformanceMicTolerancePreset(
      dom.performanceMicTolerancePreset.value
    );
    state.performanceTimingLeniencyPreset = normalizePerformanceTimingLeniencyPreset(
      dom.performanceTimingLeniencyPreset.value
    );
    state.performanceMicLatencyCompensationMs = normalizePerformanceMicLatencyCompensationMs(
      dom.performanceMicLatencyCompensation.value
    );
    state.melodyFingeringStrategy = 'minimax';
    state.melodyFingeringLevel = normalizeMelodyFingeringLevel(dom.melodyFingeringLevel.value);
    dom.melodyFingeringStrategyQuick.value = state.melodyFingeringStrategy;
    state.isDirectInputMode = dom.micDirectInputMode.checked;
    dom.performanceMicLatencyCompensationExact.value = String(state.performanceMicLatencyCompensationMs);
    dom.stringSelector.classList.toggle('hidden', !dom.showStringToggles.checked);

    // If instrument changed, load new sounds. Otherwise, this is very fast.
    if (
      previousInstrumentName !== state.currentInstrument.name ||
      !state.audioCache[state.currentInstrument.name]
    ) {
      await loadInstrumentSoundfont(state.currentInstrument.name);
    }

    handleModeChange();
    const stringSelectorVisibility = resolveSessionToolsVisibility(dom.trainingMode.value, state.uiWorkflow);
    const shouldShowStringSelector =
      stringSelectorVisibility.showShowStringTogglesRow && dom.showStringToggles.checked;
    dom.stringSelector.hidden = !shouldShowStringSelector;
    dom.stringSelector.classList.toggle('hidden', !shouldShowStringSelector);
    dom.stringSelector.style.display = shouldShowStringSelector ? '' : 'none';
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




