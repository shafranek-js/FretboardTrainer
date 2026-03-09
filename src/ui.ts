/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { dom, state } from './state';
import { saveSettings, getProfiles, getActiveProfileName } from './storage';
import {
  setLoadingUi,
  setModalVisible,
  setSessionSummaryView,
  setStatsView,
  setStatusText,
  setTrainingModeUi,
  setUiWorkflow,
  setTunerReading,
  setTunerVisible,
} from './ui-signals';
import { computeFretboardRenderPlan } from './fretboard-render-plan';
import { drawFretboardSvg } from './svg-fretboard';
import { buildLastSessionViewModel, buildStatsViewModel } from './stats-view';
import { isChordDataMode } from './training-mode-groups';
import type { ChordNote } from './types';
import { nearestChromaticTargetFrequencyFromA4 } from './music-theory';
import {
  hideMelodyTabTimeline,
  renderMelodyTabTimeline,
  updateMelodyTabTimelineRuntimeCursor,
  setMelodyTimelineBackgroundCopyPayload,
} from './melody-tab-timeline';
import {
  hideScrollingTabPanel,
  renderScrollingTabPanel,
  updateScrollingTabPanelRuntime,
} from './scrolling-tab-panel';
import { resolveScrollingTabPanelRuntimeState } from './scrolling-tab-panel-runtime';
import { getMelodyTimelineZoomScale } from './melody-timeline-zoom';
import { getScrollingTabPanelZoomScale } from './scrolling-tab-panel-zoom';
import { clampMelodyPlaybackBpm } from './melody-timeline-duration';
import {
  resolveMelodyFretboardPreview,
  resolveMelodyTimelineRenderState,
} from './melody-timeline-ui-state';
import {
  applyTuningPresetToInstrument,
  getDefaultTuningPresetKey,
  getTuningPresetsForInstrument,
  isChordCompatibleTuning,
} from './tuning-presets';
import { resolveUiWorkflowFromTrainingMode } from './training-workflows';

let scrollingTabAnimationFrameId: number | null = null;
let pendingMelodyTimelineRenderFrameId: number | null = null;
let pendingFretboardRedrawFrameId: number | null = null;
let scrollingTabAnimationContext: {
  melody: Parameters<typeof renderMelodyTabTimeline>[0];
  bpm: number;
  studyRange: { startIndex: number; endIndex: number };
  runtimeSignature: string;
} | null = null;
let scrollingTabDisplayedTimeSec: number | null = null;
let scrollingTabLastFrameTimestampMs: number | null = null;
let scrollingTabLastRuntimeSignature = '';

function stopScrollingTabAnimationLoop() {
  if (scrollingTabAnimationFrameId !== null) {
    cancelAnimationFrame(scrollingTabAnimationFrameId);
    scrollingTabAnimationFrameId = null;
  }
}

function cancelPendingMelodyTimelineRender() {
  if (pendingMelodyTimelineRenderFrameId !== null) {
    cancelAnimationFrame(pendingMelodyTimelineRenderFrameId);
    pendingMelodyTimelineRenderFrameId = null;
  }
}

export function scheduleMelodyTimelineRenderFromState() {
  if (pendingMelodyTimelineRenderFrameId !== null) return;
  pendingMelodyTimelineRenderFrameId = requestAnimationFrame(() => {
    pendingMelodyTimelineRenderFrameId = null;
    renderMelodyTabTimelineFromState();
  });
}

function resolveSmoothedScrollingRuntimeTime(
  targetTimeSec: number | null,
  shouldAnimate: boolean,
  runtimeSignature: string,
  nowMs: number
) {
  if (targetTimeSec === null) {
    scrollingTabDisplayedTimeSec = null;
    scrollingTabLastFrameTimestampMs = nowMs;
    scrollingTabLastRuntimeSignature = runtimeSignature;
    return null;
  }

  if (
    !shouldAnimate ||
    scrollingTabDisplayedTimeSec === null ||
    scrollingTabLastFrameTimestampMs === null ||
    scrollingTabLastRuntimeSignature !== runtimeSignature
  ) {
    scrollingTabDisplayedTimeSec = targetTimeSec;
    scrollingTabLastFrameTimestampMs = nowMs;
    scrollingTabLastRuntimeSignature = runtimeSignature;
    return targetTimeSec;
  }

  if (scrollingTabLastFrameTimestampMs !== null && nowMs - scrollingTabLastFrameTimestampMs < 2) {
    // If called multiple times in the same frame, just return the already-smoothed value.
    // This prevents applying the P-controller multiple times per frame.
    return scrollingTabDisplayedTimeSec;
  }

  const dtSec = Math.max(0, Math.min(0.05, (nowMs - scrollingTabLastFrameTimestampMs) / 1000));
  scrollingTabLastFrameTimestampMs = nowMs;
  scrollingTabLastRuntimeSignature = runtimeSignature;

  const previousTimeSec = scrollingTabDisplayedTimeSec;
  
  // Ideally, we just move forward by the exact screen refresh time (dtSec)
  let nextTimeSec = previousTimeSec + dtSec;

  const distanceSec = targetTimeSec - nextTimeSec;

  if (Math.abs(distanceSec) > 0.15) {
    // Target is significantly out of sync (e.g., song reset, paused, or tab unfocused for a while). Snap immediately.
    nextTimeSec = targetTimeSec;
  } else {
    // Use a continuous proportional controller (spring) to smoothly close the gap.
    // This perfectly masks the ~15.6ms jitter of Windows Date.now(), prevents long-term drift,
    // and eliminates the periodic micro-stutters caused by hard snapping.
    nextTimeSec += distanceSec * 0.12;
  }

  scrollingTabDisplayedTimeSec = nextTimeSec;
  return nextTimeSec;
}

function scheduleScrollingTabAnimationLoop() {
  if (scrollingTabAnimationFrameId !== null) return;
  const tick = () => {
    scrollingTabAnimationFrameId = null;
    const animationContext = scrollingTabAnimationContext;
    if (!animationContext) return;
    const runtimeState = resolveScrollingTabPanelRuntimeState({
      melody: animationContext.melody,
      bpm: animationContext.bpm,
      studyRange: animationContext.studyRange,
      trainingMode: dom.trainingMode.value,
      isListening: state.isListening,
      currentPrompt: state.currentPrompt,
      promptStartedAtMs: state.startTime,
      currentMelodyEventIndex: state.currentMelodyEventIndex,
      performanceActiveEventIndex: state.performanceActiveEventIndex,
      melodyDemoRuntimeActive: state.melodyDemoRuntimeActive,
      melodyDemoRuntimePaused: state.melodyDemoRuntimePaused,
      melodyDemoRuntimeBaseTimeSec: state.melodyDemoRuntimeBaseTimeSec,
      melodyDemoRuntimeAnchorStartedAtMs: state.melodyDemoRuntimeAnchorStartedAtMs,
      melodyDemoRuntimePausedOffsetSec: state.melodyDemoRuntimePausedOffsetSec,
      performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
      performancePrerollStartedAtMs: state.performancePrerollStartedAtMs,
      performancePrerollDurationMs: state.performancePrerollDurationMs,
      performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
      nowMs: Date.now(),
    });
    const smoothedCurrentTimeSec = resolveSmoothedScrollingRuntimeTime(
      runtimeState.currentTimeSec,
      runtimeState.shouldAnimate,
      animationContext.runtimeSignature,
      performance.now()
    );
    if (state.showMelodyTabTimeline && smoothedCurrentTimeSec !== null) {
      updateMelodyTabTimelineRuntimeCursor(
        animationContext.melody,
        animationContext.bpm,
        animationContext.studyRange,
        smoothedCurrentTimeSec,
        runtimeState.leadInSec
      );
    }
    if (state.showScrollingTabPanel) {
      updateScrollingTabPanelRuntime(smoothedCurrentTimeSec);
    }
    if (runtimeState.shouldAnimate) {
      scheduleScrollingTabAnimationLoop();
    }
  };
  scrollingTabAnimationFrameId = requestAnimationFrame(tick);
}

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
    label.className = 'session-string-chip';

    const mirrorCheckbox = document.createElement('input');
    mirrorCheckbox.type = 'checkbox';
    mirrorCheckbox.checked = fretboardCheckbox.checked;
    mirrorCheckbox.className = 'session-string-chip-input';
    mirrorCheckbox.setAttribute('aria-label', `Enable ${fretboardCheckbox.value} string`);

    const text = document.createElement('span');
    text.className = 'session-string-chip-label';
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
    label.className = 'fretboard-string-toggle';
    label.dataset.stringName = stringName;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = stringName;
    checkbox.checked = loadedStrings ? loadedStrings.includes(stringName) : true;
    checkbox.setAttribute('aria-label', `Enable ${stringName} string`);
    checkbox.className = 'fretboard-string-toggle-input';

    const text = document.createElement('span');
    text.className = 'fretboard-string-toggle-label';
    text.textContent = stringName;

    label.appendChild(checkbox);
    label.appendChild(text);
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
function performRedrawFretboard() {
  const melodyPreview = resolveMelodyFretboardPreview({
    trainingMode: dom.trainingMode.value,
    isListening: state.isListening,
    melodyTimelinePreviewIndex: state.melodyTimelinePreviewIndex,
    selectedMelodyId: dom.melodySelector.value,
    instrument: state.currentInstrument,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
    melodyFingeringStrategy: state.melodyFingeringStrategy,
    melodyFingeringLevel: state.melodyFingeringLevel,
  });

  const plan = computeFretboardRenderPlan({
    trainingMode: dom.trainingMode.value,
    isListening: state.isListening,
    showingAllNotes: state.showingAllNotes,
    currentPrompt: state.currentPrompt,
    currentArpeggioIndex: state.currentArpeggioIndex,
    liveDetectedNote: state.liveDetectedNote,
    liveDetectedString: state.liveDetectedString,
    melodyFoundNotes: state.currentMelodyEventFoundNotes,
    melodyPreviewEventFingering: melodyPreview.eventFingering,
    melodyPreviewTargetNote: melodyPreview.targetNote,
    melodyPreviewTargetString: melodyPreview.targetString,
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

export function redrawFretboard() {
  if (pendingFretboardRedrawFrameId !== null) return;
  pendingFretboardRedrawFrameId = requestAnimationFrame(() => {
    pendingFretboardRedrawFrameId = null;
    performRedrawFretboard();
  });
}

export function renderMelodyTabTimelineFromState() {
  cancelPendingMelodyTimelineRender();
  const renderState = resolveMelodyTimelineRenderState({
    trainingMode: dom.trainingMode.value,
    selectedMelodyId: dom.melodySelector.value,
    instrument: state.currentInstrument,
    melodyTransposeSemitones: state.melodyTransposeSemitones,
    melodyStringShift: state.melodyStringShift,
    melodyStudyRangeStartIndex: state.melodyStudyRangeStartIndex,
    melodyStudyRangeEndIndex: state.melodyStudyRangeEndIndex,
    isListening: state.isListening,
    currentMelodyEventIndex: state.currentMelodyEventIndex,
    performanceActiveEventIndex: state.performanceActiveEventIndex,
    melodyTimelinePreviewIndex: state.melodyTimelinePreviewIndex,
    melodyTimelinePreviewLabel: state.melodyTimelinePreviewLabel,
    performanceTimelineFeedbackKey: state.performanceTimelineFeedbackKey,
    performanceTimelineFeedbackByEvent: state.performanceTimelineFeedbackByEvent,
  });

  if (!renderState) {
    stopScrollingTabAnimationLoop();
    scrollingTabAnimationContext = null;
    setMelodyTimelineBackgroundCopyPayload(null);
    hideMelodyTabTimeline();
    hideScrollingTabPanel();
    return;
  }
  const scrollingRuntime = resolveScrollingTabPanelRuntimeState({
    melody: renderState.melody,
    bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
    studyRange: renderState.studyRange,
    trainingMode: dom.trainingMode.value,
    isListening: state.isListening,
    currentPrompt: state.currentPrompt,
    promptStartedAtMs: state.startTime,
    currentMelodyEventIndex: state.currentMelodyEventIndex,
    performanceActiveEventIndex: state.performanceActiveEventIndex,
    melodyDemoRuntimeActive: state.melodyDemoRuntimeActive,
    melodyDemoRuntimePaused: state.melodyDemoRuntimePaused,
    melodyDemoRuntimeBaseTimeSec: state.melodyDemoRuntimeBaseTimeSec,
    melodyDemoRuntimeAnchorStartedAtMs: state.melodyDemoRuntimeAnchorStartedAtMs,
    melodyDemoRuntimePausedOffsetSec: state.melodyDemoRuntimePausedOffsetSec,
    performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
    performancePrerollStartedAtMs: state.performancePrerollStartedAtMs,
    performancePrerollDurationMs: state.performancePrerollDurationMs,
    performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    nowMs: Date.now(),
  });
  const runtimeSignature = JSON.stringify({
    melodyId: renderState.melody.id,
    bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
    trainingMode: dom.trainingMode.value,
    studyRange: renderState.studyRange,
    leadInSec: scrollingRuntime.leadInSec,
    melodyDemoRuntimeActive: state.melodyDemoRuntimeActive,
    melodyDemoRuntimePaused: state.melodyDemoRuntimePaused,
    melodyDemoRuntimeBaseTimeSec: state.melodyDemoRuntimeBaseTimeSec,
    melodyDemoRuntimePausedOffsetSec: state.melodyDemoRuntimePausedOffsetSec,
    performancePrerollLeadInVisible: state.performancePrerollLeadInVisible,
    performancePrerollStartedAtMs: state.performancePrerollStartedAtMs,
    performanceRuntimeStartedAtMs: state.performanceRuntimeStartedAtMs,
    melodyFingeringStrategy: state.melodyFingeringStrategy,
    melodyFingeringLevel: state.melodyFingeringLevel,
  });
  const effectiveCurrentTimeSec = resolveSmoothedScrollingRuntimeTime(
    scrollingRuntime.currentTimeSec,
    scrollingRuntime.shouldAnimate,
    runtimeSignature,
    performance.now()
  );
  setMelodyTimelineBackgroundCopyPayload({
    text: renderState.copyText,
    melodyName: renderState.melody.name,
  });
  if (state.showMelodyTabTimeline) {
    renderMelodyTabTimeline(renderState.melody, state.currentInstrument, renderState.activeIndex, {
      modeLabel: renderState.modeLabel,
      viewMode: state.melodyTimelineViewMode,
      fingeringStrategy: state.melodyFingeringStrategy,
      fingeringLevel: state.melodyFingeringLevel,
      zoomScale: getMelodyTimelineZoomScale(state.melodyTimelineZoomPercent),
      studyRange: renderState.studyRange,
      showStepNumbers: state.showMelodyTimelineSteps,
      showMetaDetails: state.showMelodyTimelineDetails,
      minimapRangeEditor: dom.trainingMode.value === 'melody',
      showPrerollLeadIn: renderState.showPrerollLeadIn,
      activePrerollStepIndex: state.performancePrerollStepIndex,
      editingEnabled: renderState.editingEnabled,
      selectedEventIndex: state.melodyTimelineSelectedEventIndex,
      selectedNoteIndex: state.melodyTimelineSelectedNoteIndex,
      performanceFeedbackByEvent: renderState.performanceFeedbackByEvent,
    });
  } else {
    hideMelodyTabTimeline();
  }
  if (state.showScrollingTabPanel) {
    renderScrollingTabPanel(renderState.melody, state.currentInstrument.STRING_ORDER, {
      bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
      zoomScale: getScrollingTabPanelZoomScale(state.scrollingTabZoomPercent),
      studyRange: renderState.studyRange,
      activeEventIndex: renderState.activeIndex,
      fingeringStrategy: state.melodyFingeringStrategy,
      fingeringLevel: state.melodyFingeringLevel,
      currentTimeSec: effectiveCurrentTimeSec,
      leadInSec: scrollingRuntime.leadInSec,
      performanceFeedbackByEvent: renderState.performanceFeedbackByEvent,
      editingEnabled: renderState.editingEnabled,
      selectedEventIndex: state.melodyTimelineSelectedEventIndex,
      selectedNoteIndex: state.melodyTimelineSelectedNoteIndex,
    });
  } else {
    hideScrollingTabPanel();
  }

  if (state.showScrollingTabPanel || state.showMelodyTabTimeline) {
    scrollingTabAnimationContext = {
      melody: renderState.melody,
      bpm: clampMelodyPlaybackBpm(dom.melodyDemoBpm.value),
      studyRange: renderState.studyRange,
      runtimeSignature,
    };
    if (scrollingRuntime.shouldAnimate) {
      scheduleScrollingTabAnimationLoop();
    } else {
      stopScrollingTabAnimationLoop();
    }
  } else {
    stopScrollingTabAnimationLoop();
    scrollingTabAnimationContext = null;
  }
}

/** Handles UI changes when the training mode is switched. */
export function handleModeChange() {
  const mode = dom.trainingMode.value;
  state.uiWorkflow = resolveUiWorkflowFromTrainingMode(mode);
  setTunerVisible(false);
  setTrainingModeUi(mode);
  setUiWorkflow(state.uiWorkflow);
  renderMelodyTabTimelineFromState();
}

/** Updates and displays the statistics in the modal. */
export function displayStats() {
  const statsView = buildStatsViewModel(state.stats, 3, state.lastSessionStats, state.performanceStarsByRunKey);
  setStatsView(statsView);
}

export function displaySessionSummary() {
  const sessionSummary = buildLastSessionViewModel(state.lastSessionStats, 3, state.performanceStarsByRunKey);
  setSessionSummaryView(sessionSummary);
  setModalVisible('sessionSummary', Boolean(sessionSummary));
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


