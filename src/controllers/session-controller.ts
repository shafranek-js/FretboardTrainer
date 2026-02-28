import { dom, state } from '../state';
import { saveSettings } from '../storage';
import {
  handleModeChange,
  redrawFretboard,
  updateInstrumentUI,
  drawFretboard,
  renderMelodyTabTimelineFromState,
} from '../ui';
import { playSound, loadInstrumentSoundfont } from '../audio';
import {
  scheduleSessionTimeout,
  seekActiveMelodySessionToEvent,
  startListening,
  stopListening,
} from '../logic';
import { instruments } from '../instruments';
import { ensureAudioRuntime } from '../audio-runtime';
import { calculateRmsLevel } from '../audio-frame-processing';
import {
  clearResultMessage,
  refreshDisplayFormatting,
  setMelodySetupSummary,
  setPracticeSetupCollapsed,
  setPracticeSetupSummary,
  setSessionToolsSummary,
  setModalVisible,
  setPromptText,
  setResultMessage,
  toggleMelodySetupCollapsed,
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
  getMelodyById,
  isCustomMelodyId,
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
  saveCustomEventMelody,
  type MelodyEvent,
  type MelodyDefinition,
  updateCustomEventMelody,
  updateCustomAsciiTabMelody,
} from '../melody-library';
import { getMelodyFingeredEvent } from '../melody-fingering';
import { confirmUserAction } from '../user-feedback-port';
import { normalizeSessionPace } from '../session-pace';
import {
  estimateNoiseFloorRms,
  normalizeMicSensitivityPreset,
  resolveMicVolumeThreshold,
} from '../mic-input-sensitivity';
import { normalizeMicNoteAttackFilterPreset } from '../mic-note-attack-filter';
import { normalizeMicNoteHoldFilterPreset } from '../mic-note-hold-filter';
import { normalizeMicPolyphonicDetectorProvider } from '../mic-polyphonic-detector';
import { refreshMicPolyphonicDetectorAudioInfoUi } from '../mic-polyphonic-detector-ui';
import type { ChordNote, Prompt } from '../types';
import { parseAsciiTabToMelodyEvents } from '../ascii-tab-melody-parser';
import {
  convertLoadedGpScoreTrackToImportedMelody,
  loadGpScoreFromBytes,
  type GpImportedMelody,
  type LoadedGpScore,
} from '../gp-import';
import {
  convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes,
  type LoadedMidiFile,
  normalizeMidiImportQuantize,
  type MidiImportedMelody,
  type MidiImportQuantize,
} from '../midi-file-import';
import {
  buildExportMidiFileName,
  buildPracticeAdjustedMidiFileName,
  exportMelodyToMidiBytes,
} from '../midi-file-export';
import {
  clearMelodyTransposeCache,
  formatMelodyTransposeSemitones,
  normalizeMelodyTransposeSemitones,
} from '../melody-transposition';
import {
  clearMelodyStringShiftCache,
  coerceMelodyStringShiftToFeasible,
  formatMelodyStringShift,
  getMelodyWithPracticeAdjustments,
  isMelodyStringShiftFeasible,
  normalizeMelodyStringShift,
} from '../melody-string-shift';
import {
  setMelodyTimelineNoteSelectHandler,
  setMelodyTimelineNoteDragHandler,
  setMelodyTimelineEventDragHandler,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineStudyRangeCommitHandler,
} from '../melody-tab-timeline';
import { DEFAULT_TABLATURE_MAX_FRET } from '../tablature-optimizer';
import {
  areMelodyStudyRangesEqual,
  buildDefaultMelodyStudyRange,
  formatMelodyStudyRange,
  formatMelodyStudyStepLabel,
  getMelodyStudyRangeLength,
  isDefaultMelodyStudyRange,
  normalizeMelodyStudyRange,
  type MelodyStudyRange,
} from '../melody-study-range';
import { isMelodyWorkflowMode } from '../training-mode-groups';

const MELODY_DEMO_FALLBACK_STEP_MS = 700;
const MELODY_DEMO_MIN_STEP_MS = 160;
const MELODY_DEMO_MAX_STEP_MS = 1800;
const MELODY_DEMO_COLUMN_MS = 95;
const MELODY_DEMO_MIN_BPM = 40;
const MELODY_DEMO_MAX_BPM = 220;
const MELODY_DEMO_DEFAULT_BPM = 90;
let melodyDemoTimeoutId: number | null = null;
let melodyDemoRunToken = 0;
let isMelodyDemoPlaying = false;
let isMelodyDemoPaused = false;
let melodyDemoNextEventIndex = 0;
let melodyStepPreviewIndex: number | null = null;
let melodyPreviewUpdateTimeoutId: number | null = null;
let melodyTimelineSeekResumeMode: 'playing' | 'paused' | null = null;
let melodyEventEditorDraft: MelodyEvent[] | null = null;
let melodyEventEditorHistory: MelodyEvent[][] = [];
let melodyEventEditorFuture: MelodyEvent[][] = [];
let melodyEventEditorSelectedEventIndex: number | null = null;
let melodyEventEditorSelectedNoteIndex: number | null = null;
let melodyEventEditorSourceMetadata: {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
} | null = null;
let melodyTimelineEditorMelodyId: string | null = null;
let melodyTimelineEditorDraft: MelodyEvent[] | null = null;
let melodyTimelineEditorHistory: MelodyEvent[][] = [];
let melodyTimelineEditorFuture: MelodyEvent[][] = [];
let pendingGpImport: {
  loaded: LoadedGpScore;
  selectedTrackIndex: number;
  importedPreview: GpImportedMelody | null;
} | null = null;
let pendingMidiImport: {
  loaded: LoadedMidiFile;
  selectedTrackIndex: number;
  quantize: MidiImportQuantize;
  importedPreview: MidiImportedMelody | null;
} | null = null;

function syncMetronomeBpmDisplay() {
  dom.metronomeBpmValue.textContent = dom.metronomeBpm.value;
}

function syncMelodyDemoBpmDisplay() {
  dom.melodyDemoBpmValue.textContent = dom.melodyDemoBpm.value;
}

function getSelectedMelodyId() {
  const selectedMelodyId = dom.melodySelector.value.trim();
  return selectedMelodyId.length > 0 ? selectedMelodyId : null;
}

function getStoredMelodyTransposeSemitones(melodyId: string | null) {
  const transposeById = state.melodyTransposeById ?? {};
  if (melodyId && Object.prototype.hasOwnProperty.call(transposeById, melodyId)) {
    return normalizeMelodyTransposeSemitones(transposeById[melodyId]);
  }
  return 0;
}

function setStoredMelodyTransposeSemitones(melodyId: string | null, semitones: number) {
  if (!state.melodyTransposeById) {
    state.melodyTransposeById = {};
  }
  const normalized = normalizeMelodyTransposeSemitones(semitones);
  state.melodyTransposeSemitones = normalized;
  if (melodyId) {
    if (normalized === 0) {
      delete state.melodyTransposeById[melodyId];
    } else {
      state.melodyTransposeById[melodyId] = normalized;
    }
  }
  return normalized;
}

function getStoredMelodyStringShift(melodyId: string | null) {
  const shiftById = state.melodyStringShiftById ?? {};
  if (melodyId && Object.prototype.hasOwnProperty.call(shiftById, melodyId)) {
    return normalizeMelodyStringShift(shiftById[melodyId], state.currentInstrument);
  }
  return 0;
}

function setStoredMelodyStringShift(melodyId: string | null, stringShift: number) {
  if (!state.melodyStringShiftById) {
    state.melodyStringShiftById = {};
  }
  const normalized = normalizeMelodyStringShift(stringShift, state.currentInstrument);
  state.melodyStringShift = normalized;
  if (melodyId) {
    if (normalized === 0) {
      delete state.melodyStringShiftById[melodyId];
    } else {
      state.melodyStringShiftById[melodyId] = normalized;
    }
  }
  return normalized;
}

function getStoredMelodyStudyRange(melodyId: string | null, totalEvents: number) {
  const stored = melodyId ? state.melodyStudyRangeById?.[melodyId] : null;
  return normalizeMelodyStudyRange(stored, totalEvents);
}

function setStoredMelodyStudyRange(
  melodyId: string | null,
  totalEvents: number,
  range: Partial<MelodyStudyRange> | null | undefined
) {
  if (!state.melodyStudyRangeById) {
    state.melodyStudyRangeById = {};
  }

  const normalized = normalizeMelodyStudyRange(range, totalEvents);
  state.melodyStudyRangeStartIndex = normalized.startIndex;
  state.melodyStudyRangeEndIndex = normalized.endIndex;

  if (melodyId) {
    if (isDefaultMelodyStudyRange(normalized, totalEvents)) {
      delete state.melodyStudyRangeById[melodyId];
    } else {
      state.melodyStudyRangeById[melodyId] = normalized;
    }
  }

  return normalized;
}

function formatMelodySelectorOptionLabel(
  melody: { id: string; name: string; source: 'builtin' | 'custom' },
  transposeSemitones: number
) {
  const baseLabel = melody.source === 'custom' ? `${melody.name} (Custom)` : melody.name;
  const normalizedTranspose = normalizeMelodyTransposeSemitones(transposeSemitones);
  if (normalizedTranspose === 0) return baseLabel;
  return `${baseLabel} [${formatMelodyTransposeSemitones(normalizedTranspose)}]`;
}

function refreshMelodySelectorOptionLabels() {
  const melodies = listMelodiesForInstrument(state.currentInstrument);
  const labelById = new Map(
    melodies.map((melody) => [melody.id, formatMelodySelectorOptionLabel(melody, getStoredMelodyTransposeSemitones(melody.id))])
  );

  Array.from(dom.melodySelector.options).forEach((option) => {
    option.textContent = labelById.get(option.value) ?? option.textContent;
  });
}

function syncMelodyTransposeDisplay() {
  const normalized = normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones);
  state.melodyTransposeSemitones = normalized;
  dom.melodyTranspose.value = String(normalized);
  dom.melodyTransposeValue.textContent = formatMelodyTransposeSemitones(normalized);
}

function syncMelodyStringShiftDisplay() {
  const normalized = normalizeMelodyStringShift(state.melodyStringShift, state.currentInstrument);
  state.melodyStringShift = normalized;
  const maxAbsoluteShift = Math.max(0, state.currentInstrument.STRING_ORDER.length - 1);
  dom.melodyStringShift.min = String(-maxAbsoluteShift);
  dom.melodyStringShift.max = String(maxAbsoluteShift);
  dom.melodyStringShift.value = String(normalized);
  dom.melodyStringShiftValue.textContent = formatMelodyStringShift(normalized);
}

function syncMelodyStudyRangeDisplay(totalEvents: number) {
  const normalized = normalizeMelodyStudyRange(
    {
      startIndex: state.melodyStudyRangeStartIndex,
      endIndex: state.melodyStudyRangeEndIndex,
    },
    totalEvents
  );
  state.melodyStudyRangeStartIndex = normalized.startIndex;
  state.melodyStudyRangeEndIndex = normalized.endIndex;

  const hasEvents = totalEvents > 0;
  const maxStep = Math.max(1, totalEvents);
  dom.melodyStudyStart.min = hasEvents ? '1' : '0';
  dom.melodyStudyStart.max = String(maxStep);
  dom.melodyStudyEnd.min = hasEvents ? '1' : '0';
  dom.melodyStudyEnd.max = String(maxStep);
  dom.melodyStudyStart.disabled = !hasEvents;
  dom.melodyStudyEnd.disabled = !hasEvents;
  dom.melodyStudyStart.value = hasEvents ? String(normalized.startIndex + 1) : '';
  dom.melodyStudyEnd.value = hasEvents ? String(normalized.endIndex + 1) : '';
  dom.melodyStudyValue.textContent = hasEvents
    ? `${formatMelodyStudyRange(normalized, totalEvents)} | ${getMelodyStudyRangeLength(normalized, totalEvents)} steps`
    : 'No steps';
  dom.melodyStudyResetBtn.disabled = !hasEvents || isDefaultMelodyStudyRange(normalized, totalEvents);
}

function syncMelodyLoopRangeDisplay() {
  dom.melodyLoopRange.checked = state.melodyLoopRangeEnabled;
  dom.melodyLoopRange.disabled = !getSelectedMelodyId();
}

function hydrateMelodyTransposeForSelectedMelody(options?: { migrateLegacyValue?: boolean }) {
  const selectedMelodyId = getSelectedMelodyId();
  if (!state.melodyTransposeById) {
    state.melodyTransposeById = {};
  }
  const transposeById = state.melodyTransposeById;
  if (
    options?.migrateLegacyValue &&
    selectedMelodyId &&
    !Object.prototype.hasOwnProperty.call(transposeById, selectedMelodyId) &&
    Object.keys(transposeById).length === 0 &&
    normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones) !== 0
  ) {
    setStoredMelodyTransposeSemitones(selectedMelodyId, state.melodyTransposeSemitones);
  } else {
    state.melodyTransposeSemitones = getStoredMelodyTransposeSemitones(selectedMelodyId);
  }
  syncMelodyTransposeDisplay();
  refreshMelodySelectorOptionLabels();
}

function hydrateMelodyStringShiftForSelectedMelody() {
  const selectedMelodyId = getSelectedMelodyId();
  const baseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!baseMelody) {
    state.melodyStringShift = 0;
    syncMelodyStringShiftDisplay();
    return;
  }

  const transposedMelody = getMelodyWithPracticeAdjustments(
    baseMelody,
    state.melodyTransposeSemitones,
    0,
    state.currentInstrument
  );
  const preferredShift = getStoredMelodyStringShift(selectedMelodyId);
  const feasibleShift = coerceMelodyStringShiftToFeasible(
    transposedMelody,
    preferredShift,
    state.currentInstrument
  );
  setStoredMelodyStringShift(selectedMelodyId, feasibleShift);
  syncMelodyStringShiftDisplay();
}

function hydrateMelodyStudyRangeForSelectedMelody() {
  const selectedMelodyId = getSelectedMelodyId();
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  const totalEvents = melody?.events.length ?? 0;
  const normalized = getStoredMelodyStudyRange(selectedMelodyId, totalEvents);
  state.melodyStudyRangeStartIndex = normalized.startIndex;
  state.melodyStudyRangeEndIndex = normalized.endIndex;
  syncMelodyStudyRangeDisplay(totalEvents);
}

function applyMelodyTransposeSemitones(nextValue: unknown) {
  const selectedMelodyId = getSelectedMelodyId();
  const previous = getStoredMelodyTransposeSemitones(selectedMelodyId);
  const next = normalizeMelodyTransposeSemitones(nextValue);
  setStoredMelodyTransposeSemitones(selectedMelodyId, next);
  syncMelodyTransposeDisplay();
  if (next === previous) return false;

  hydrateMelodyStringShiftForSelectedMelody();

  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  clearMelodyTransposeCache();
  clearMelodyStringShiftCache();
  return true;
}

function applyMelodyStringShift(nextValue: unknown) {
  const selectedMelodyId = getSelectedMelodyId();
  const baseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!baseMelody || baseMelody.events.length === 0) {
    state.melodyStringShift = 0;
    syncMelodyStringShiftDisplay();
    return { changed: false, valid: false };
  }

  const transposedMelody = getMelodyWithPracticeAdjustments(
    baseMelody,
    state.melodyTransposeSemitones,
    0,
    state.currentInstrument
  );
  const previous = getStoredMelodyStringShift(selectedMelodyId);
  const next = normalizeMelodyStringShift(nextValue, state.currentInstrument);

  if (!isMelodyStringShiftFeasible(transposedMelody, next, state.currentInstrument)) {
    setStoredMelodyStringShift(selectedMelodyId, previous);
    syncMelodyStringShiftDisplay();
    return { changed: false, valid: false };
  }

  setStoredMelodyStringShift(selectedMelodyId, next);
  syncMelodyStringShiftDisplay();
  if (next === previous) return { changed: false, valid: true };

  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  clearMelodyStringShiftCache();
  return { changed: true, valid: true };
}

function applyMelodyStudyRange(range: Partial<MelodyStudyRange>) {
  const selectedMelodyId = getSelectedMelodyId();
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!melody || melody.events.length === 0) {
    syncMelodyStudyRangeDisplay(0);
    return false;
  }

  const previous = getStoredMelodyStudyRange(selectedMelodyId, melody.events.length);
  const next = normalizeMelodyStudyRange(range, melody.events.length);
  setStoredMelodyStudyRange(selectedMelodyId, melody.events.length, next);
  syncMelodyStudyRangeDisplay(melody.events.length);
  if (areMelodyStudyRangesEqual(previous, next, melody.events.length)) {
    return false;
  }

  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  return true;
}

function commitMelodyStudyRangeChange(range: Partial<MelodyStudyRange>, options?: { stopMessage?: string }) {
  const changed = applyMelodyStudyRange(range);
  if (!changed) return false;
  stopMelodyDemoPlayback({ clearUi: true });
  markCurriculumPresetAsCustom();
  updateMelodyActionButtonsForSelection();
  if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
    stopListening();
    setResultMessage(options?.stopMessage ?? 'Study range changed. Session stopped; press Start to continue.');
  }
  updatePracticeSetupSummary();
  saveSettings();
  redrawFretboard();
  return true;
}

function handleMelodyTransposeInputChange() {
  const changed = applyMelodyTransposeSemitones(dom.melodyTranspose.value);
  if (!changed) return false;
  stopMelodyDemoPlayback({ clearUi: true });
  markCurriculumPresetAsCustom();
  updateMelodyActionButtonsForSelection();
  if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
    stopListening();
    setResultMessage('Melody transpose changed. Session stopped; press Start to continue.');
  }
  updatePracticeSetupSummary();
  saveSettings();
  redrawFretboard();
  refreshMelodyTimelineUi();
  return true;
}

function handleMelodyStringShiftInputChange() {
  const result = applyMelodyStringShift(dom.melodyStringShift.value);
  if (!result.valid) {
    setResultMessage('This string shift is not playable on the current instrument setup.', 'error');
    return false;
  }
  if (!result.changed) return false;

  stopMelodyDemoPlayback({ clearUi: true });
  markCurriculumPresetAsCustom();
  updateMelodyActionButtonsForSelection();
  if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
    stopListening();
    setResultMessage('Melody string shift changed. Session stopped; press Start to continue.');
  }
  updatePracticeSetupSummary();
  saveSettings();
  redrawFretboard();
  refreshMelodyTimelineUi();
  return true;
}

function renderMelodyDemoButtonState() {
  const isMelodyDemoActive = isMelodyDemoPlaying || isMelodyDemoPaused;
  dom.melodyDemoBtn.textContent = isMelodyDemoActive ? 'Stop Demo' : 'Play Demo';
  dom.melodyDemoBtn.classList.toggle('bg-emerald-700', !isMelodyDemoActive);
  dom.melodyDemoBtn.classList.toggle('hover:bg-emerald-600', !isMelodyDemoActive);
  dom.melodyDemoBtn.classList.toggle('border-emerald-500', !isMelodyDemoActive);
  dom.melodyDemoBtn.classList.toggle('bg-red-700', isMelodyDemoActive);
  dom.melodyDemoBtn.classList.toggle('hover:bg-red-600', isMelodyDemoActive);
  dom.melodyDemoBtn.classList.toggle('border-red-500', isMelodyDemoActive);
  dom.melodyPauseDemoBtn.textContent = isMelodyDemoPaused ? 'Resume' : 'Pause';
  dom.melodyPauseDemoBtn.disabled = !isMelodyDemoActive;
  dom.melodyPauseDemoBtn.classList.toggle('bg-amber-700', !isMelodyDemoPaused);
  dom.melodyPauseDemoBtn.classList.toggle('hover:bg-amber-600', !isMelodyDemoPaused);
  dom.melodyPauseDemoBtn.classList.toggle('border-amber-500', !isMelodyDemoPaused);
  dom.melodyPauseDemoBtn.classList.toggle('bg-cyan-700', isMelodyDemoPaused);
  dom.melodyPauseDemoBtn.classList.toggle('hover:bg-cyan-600', isMelodyDemoPaused);
  dom.melodyPauseDemoBtn.classList.toggle('border-cyan-500', isMelodyDemoPaused);
  const selectedMelodyId = dom.melodySelector.value;
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  dom.melodyPlaybackControls.classList.toggle('hidden', !isMelodyWorkflowMode(dom.trainingMode.value));
  const canStep = Boolean(melody) && !isMelodyDemoActive;
  dom.melodyStepBackBtn.disabled = !canStep;
  dom.melodyStepForwardBtn.disabled = !canStep;
  dom.melodyLoopRange.disabled = !melody;
  syncMelodyLoopRangeDisplay();
}

function cloneMelodyEventsDraft(events: MelodyEvent[]) {
  return events.map((event) => ({
    barIndex: event.barIndex,
    column: event.column,
    durationColumns: event.durationColumns,
    durationCountSteps: event.durationCountSteps,
    durationBeats: event.durationBeats,
    notes: event.notes.map((note) => ({
      note: note.note,
      stringName: note.stringName,
      fret: note.fret,
    })),
  }));
}

function resetMelodyEventEditorState() {
  melodyEventEditorDraft = null;
  melodyEventEditorHistory = [];
  melodyEventEditorFuture = [];
  melodyEventEditorSelectedEventIndex = null;
  melodyEventEditorSelectedNoteIndex = null;
  melodyEventEditorSourceMetadata = null;
  dom.melodyEventEditorPanel.classList.add('hidden');
  dom.melodyEventEditorSelection.textContent = 'Select a note';
  dom.melodyEventEditorNoteSelector.innerHTML = '';
  dom.melodyEventEditorString.innerHTML = '';
  dom.melodyEventEditorString.disabled = true;
  dom.melodyEventEditorFret.value = '';
  dom.melodyEventEditorFret.disabled = true;
  dom.melodyEventEditorAddBtn.disabled = true;
  dom.melodyEventEditorDeleteBtn.disabled = true;
  dom.melodyEventEditorUndoBtn.disabled = true;
  dom.melodyEventEditorRedoBtn.disabled = true;
}

function clearMelodyEditorPreview() {
  resetMelodyEventEditorState();
  dom.melodyPreviewStatus.textContent = 'Paste tab to preview';
  dom.melodyPreviewStatus.className = 'text-xs text-slate-400';
  dom.melodyPreviewSummary.textContent = '';
  dom.melodyPreviewList.innerHTML = '';
}

function formatMelodyPreviewEventLine(eventIndex: number, totalEvents: number, event: MelodyEvent) {
  const barText =
    typeof event.barIndex === 'number' && Number.isFinite(event.barIndex)
      ? `bar ${Math.max(0, Math.round(event.barIndex)) + 1} | `
      : '';
  const notesText = event.notes
    .map((note) =>
      note.stringName !== null && typeof note.fret === 'number'
        ? `${note.note}(${note.stringName}:${note.fret})`
        : note.note
    )
    .join(' + ');

  const timingText =
    typeof event.durationBeats === 'number'
      ? `${event.durationBeats.toFixed(2)} beat`
      : `${Math.max(1, event.durationColumns ?? 1)} col`;

  return `[${eventIndex + 1}/${totalEvents}] ${barText}${notesText}  ->  ${timingText}`;
}

function renderMelodyEditorPreviewError(prefix: string, error: unknown) {
  resetMelodyEventEditorState();
  dom.melodyPreviewStatus.textContent = 'Parse error';
  dom.melodyPreviewStatus.className = 'text-xs text-red-300';
  dom.melodyPreviewSummary.textContent = formatUserFacingError(prefix, error);
  dom.melodyPreviewList.innerHTML = '';
}

function ensureMelodyEventEditorSelection() {
  if (!melodyEventEditorDraft || melodyEventEditorDraft.length === 0) {
    melodyEventEditorSelectedEventIndex = null;
    melodyEventEditorSelectedNoteIndex = null;
    return;
  }

  if (
    melodyEventEditorSelectedEventIndex === null ||
    melodyEventEditorSelectedEventIndex < 0 ||
    melodyEventEditorSelectedEventIndex >= melodyEventEditorDraft.length
  ) {
    melodyEventEditorSelectedEventIndex = 0;
  }

  let event = melodyEventEditorDraft[melodyEventEditorSelectedEventIndex];
  if (!event || event.notes.length === 0) {
    const nextEventIndex = melodyEventEditorDraft.findIndex((candidate) => candidate.notes.length > 0);
    if (nextEventIndex >= 0) {
      melodyEventEditorSelectedEventIndex = nextEventIndex;
      event = melodyEventEditorDraft[nextEventIndex]!;
    }
  }

  if (!event || event.notes.length === 0) {
    melodyEventEditorSelectedNoteIndex = null;
    return;
  }

  if (
    melodyEventEditorSelectedNoteIndex === null ||
    melodyEventEditorSelectedNoteIndex < 0 ||
    melodyEventEditorSelectedNoteIndex >= event.notes.length
  ) {
    melodyEventEditorSelectedNoteIndex = 0;
  }
}

function pushMelodyEventEditorHistory() {
  if (!melodyEventEditorDraft) return;
  melodyEventEditorHistory.push(cloneMelodyEventsDraft(melodyEventEditorDraft));
  if (melodyEventEditorHistory.length > 100) {
    melodyEventEditorHistory.shift();
  }
  melodyEventEditorFuture = [];
}

function stripScientificOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

function getSelectedMelodyEventEditorNote() {
  if (
    !melodyEventEditorDraft ||
    melodyEventEditorSelectedEventIndex === null ||
    melodyEventEditorSelectedNoteIndex === null
  ) {
    return null;
  }

  const event = melodyEventEditorDraft[melodyEventEditorSelectedEventIndex];
  if (!event) return null;
  const note = event.notes[melodyEventEditorSelectedNoteIndex];
  if (!note) return null;
  return { event, note };
}

function getMelodyEventEditorSummaryPrefix() {
  const sourceFormat = melodyEventEditorSourceMetadata?.sourceFormat;
  return sourceFormat ? sourceFormat.toUpperCase() : undefined;
}

function getMelodyEventEditorNoteCount() {
  return melodyEventEditorDraft?.reduce((sum, event) => sum + event.notes.length, 0) ?? 0;
}

function renderCurrentMelodyEventEditorDraft(statusText?: string) {
  if (!melodyEventEditorDraft) return;
  renderMelodyEditorPreviewFromEvents(melodyEventEditorDraft, {
    statusText: statusText ?? dom.melodyPreviewStatus.textContent,
    summaryPrefix: getMelodyEventEditorSummaryPrefix(),
    editableEvents: true,
    preserveDraft: true,
    metadata: melodyEventEditorSourceMetadata ?? undefined,
  });
  updateMelodyEditorUiForCurrentMode();
}

function resetMelodyTimelineEditorState() {
  melodyTimelineEditorMelodyId = null;
  melodyTimelineEditorDraft = null;
  melodyTimelineEditorHistory = [];
  melodyTimelineEditorFuture = [];
  state.melodyTimelineSelectedEventIndex = null;
  state.melodyTimelineSelectedNoteIndex = null;
  dom.melodyTimelineEditorPanel.classList.add('hidden');
  dom.melodyTimelineEditorStatus.textContent = 'Timeline note editor';
  dom.melodyTimelineEditorSelection.textContent = 'Select a note on the timeline';
  dom.melodyTimelineEditorDuration.textContent = 'Duration -';
  dom.melodyTimelineEditorDurationDownBtn.disabled = true;
  dom.melodyTimelineEditorDurationUpBtn.disabled = true;
  dom.melodyTimelineEditorNoteSelector.innerHTML = '';
  dom.melodyTimelineEditorString.innerHTML = '';
  dom.melodyTimelineEditorString.disabled = true;
  dom.melodyTimelineEditorFret.value = '';
  dom.melodyTimelineEditorFret.disabled = true;
  dom.melodyTimelineEditorAddBtn.disabled = true;
  dom.melodyTimelineEditorAddEventBtn.disabled = true;
  dom.melodyTimelineEditorDuplicateEventBtn.disabled = true;
  dom.melodyTimelineEditorMoveEventLeftBtn.disabled = true;
  dom.melodyTimelineEditorMoveEventRightBtn.disabled = true;
  dom.melodyTimelineEditorSplitEventBtn.disabled = true;
  dom.melodyTimelineEditorMergeEventBtn.disabled = true;
  dom.melodyTimelineEditorSplitEventBtn.textContent = 'Split';
  dom.melodyTimelineEditorMergeEventBtn.textContent = 'Merge';
  dom.melodyTimelineEditorDeleteEventBtn.disabled = true;
  dom.melodyTimelineEditorDeleteBtn.disabled = true;
  dom.melodyTimelineEditorUndoBtn.disabled = true;
  dom.melodyTimelineEditorRedoBtn.disabled = true;
}

function getSelectedTimelineEditableMelody() {
  const selectedMelodyId = dom.melodySelector.value;
  if (!selectedMelodyId) return null;
  const melody = getMelodyById(selectedMelodyId, state.currentInstrument);
  if (!melody || melody.source !== 'custom' || typeof melody.tabText === 'string') return null;
  return melody;
}

function canEditSelectedMelodyOnTimeline() {
  const melody = getSelectedTimelineEditableMelody();
  if (!melody) {
    return { editable: false, reason: 'Timeline editing is available for custom imported melodies only.' };
  }
  if (state.melodyTransposeSemitones !== 0 || state.melodyStringShift !== 0) {
    return { editable: false, reason: 'Reset transpose and string shift to 0 before editing source notes on the timeline.' };
  }
  return { editable: true, melody };
}

function ensureMelodyTimelineEditorDraftLoaded(melody: MelodyDefinition) {
  if (melodyTimelineEditorMelodyId === melody.id && melodyTimelineEditorDraft) return;
  melodyTimelineEditorMelodyId = melody.id;
  melodyTimelineEditorDraft = cloneMelodyEventsDraft(melody.events);
  melodyTimelineEditorHistory = [];
  melodyTimelineEditorFuture = [];
}

function ensureMelodyTimelineEditorSelection() {
  if (!melodyTimelineEditorDraft || melodyTimelineEditorDraft.length === 0) {
    state.melodyTimelineSelectedEventIndex = null;
    state.melodyTimelineSelectedNoteIndex = null;
    return;
  }

  if (
    state.melodyTimelineSelectedEventIndex === null ||
    state.melodyTimelineSelectedEventIndex < 0 ||
    state.melodyTimelineSelectedEventIndex >= melodyTimelineEditorDraft.length
  ) {
    state.melodyTimelineSelectedEventIndex = 0;
  }

  let event = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!event || event.notes.length === 0) {
    const nextEventIndex = melodyTimelineEditorDraft.findIndex((candidate) => candidate.notes.length > 0);
    if (nextEventIndex >= 0) {
      state.melodyTimelineSelectedEventIndex = nextEventIndex;
      event = melodyTimelineEditorDraft[nextEventIndex]!;
    }
  }

  if (!event || event.notes.length === 0) {
    state.melodyTimelineSelectedNoteIndex = null;
    return;
  }

  if (
    state.melodyTimelineSelectedNoteIndex === null ||
    state.melodyTimelineSelectedNoteIndex < 0 ||
    state.melodyTimelineSelectedNoteIndex >= event.notes.length
  ) {
    state.melodyTimelineSelectedNoteIndex = 0;
  }
}

function getSelectedMelodyTimelineEditorNote() {
  if (
    !melodyTimelineEditorDraft ||
    state.melodyTimelineSelectedEventIndex === null ||
    state.melodyTimelineSelectedNoteIndex === null
  ) {
    return null;
  }
  const event = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!event) return null;
  const note = event.notes[state.melodyTimelineSelectedNoteIndex];
  if (!note) return null;
  return { event, note };
}

function pushMelodyTimelineEditorHistory() {
  if (!melodyTimelineEditorDraft) return;
  melodyTimelineEditorHistory.push(cloneMelodyEventsDraft(melodyTimelineEditorDraft));
  if (melodyTimelineEditorHistory.length > 100) {
    melodyTimelineEditorHistory.shift();
  }
  melodyTimelineEditorFuture = [];
}

function persistMelodyTimelineEditorDraft(statusText = 'Timeline melody updated') {
  if (!melodyTimelineEditorDraft) return;
  const melody = getSelectedTimelineEditableMelody();
  if (!melody) {
    resetMelodyTimelineEditorState();
    return;
  }

  updateCustomEventMelody(melody.id, melody.name, melodyTimelineEditorDraft, state.currentInstrument, {
    sourceFormat: melody.sourceFormat,
    sourceFileName: melody.sourceFileName,
    sourceTrackName: melody.sourceTrackName,
    sourceScoreTitle: melody.sourceScoreTitle,
    sourceTempoBpm: melody.sourceTempoBpm,
  });
  clearMelodyTransposeCache();
  clearMelodyStringShiftCache();
  const refreshed = getMelodyById(melody.id, state.currentInstrument);
  melodyTimelineEditorDraft = refreshed ? cloneMelodyEventsDraft(refreshed.events) : melodyTimelineEditorDraft;
  renderMelodyTimelineEditorPanel(statusText);
  renderMelodyTabTimelineFromState();
  redrawFretboard();
}

function commitMelodyTimelineEditorMutation(mutator: (draft: MelodyEvent[]) => void, statusText?: string) {
  if (!melodyTimelineEditorDraft) return;
  pushMelodyTimelineEditorHistory();
  mutator(melodyTimelineEditorDraft);
  ensureMelodyTimelineEditorSelection();
  persistMelodyTimelineEditorDraft(statusText);
}

function renderMelodyTimelineEditorPanel(statusText?: string) {
  dom.melodyTimelineEditorPanel.classList.add('hidden');

  if (!isMelodyWorkflowMode(dom.trainingMode.value)) {
    resetMelodyTimelineEditorState();
    return;
  }

  const eligibility = canEditSelectedMelodyOnTimeline();
  if (!eligibility.editable) {
    resetMelodyTimelineEditorState();
    return;
  }

  const melody = eligibility.melody;
  ensureMelodyTimelineEditorDraftLoaded(melody);
  ensureMelodyTimelineEditorSelection();
  dom.melodyTimelineEditorStatus.textContent = statusText ?? 'Timeline note editor';
  dom.melodyTimelineEditorUndoBtn.disabled = melodyTimelineEditorHistory.length === 0;
  dom.melodyTimelineEditorRedoBtn.disabled = melodyTimelineEditorFuture.length === 0;

  const selectedEvent =
    state.melodyTimelineSelectedEventIndex === null
      ? null
      : melodyTimelineEditorDraft?.[state.melodyTimelineSelectedEventIndex] ?? null;
  const selectedNote =
    selectedEvent && state.melodyTimelineSelectedNoteIndex !== null
      ? selectedEvent.notes[state.melodyTimelineSelectedNoteIndex] ?? null
      : null;
  const splitPreview = selectedEvent && canSplitMelodyEvent(selectedEvent) ? splitMelodyEventDuration(selectedEvent) : null;
  const mergedEventPreview =
    selectedEvent &&
    state.melodyTimelineSelectedEventIndex !== null &&
    canMergeMelodyEventWithNext(melodyTimelineEditorDraft, state.melodyTimelineSelectedEventIndex)
      ? mergeMelodyEventDurations(
          selectedEvent,
          melodyTimelineEditorDraft?.[state.melodyTimelineSelectedEventIndex + 1] ?? selectedEvent
        )
      : null;

  dom.melodyTimelineEditorSelection.textContent =
    selectedEvent && selectedNote && state.melodyTimelineSelectedEventIndex !== null && state.melodyTimelineSelectedNoteIndex !== null
      ? `Event ${state.melodyTimelineSelectedEventIndex + 1} | Note ${state.melodyTimelineSelectedNoteIndex + 1} | ${selectedNote.note}`
      : 'Select a note on the timeline';
  dom.melodyTimelineEditorDuration.textContent = `Duration ${formatMelodyEventDuration(selectedEvent)}`;
  dom.melodyTimelineEditorDurationDownBtn.disabled = !canDecreaseMelodyEventDuration(selectedEvent);
  dom.melodyTimelineEditorDurationUpBtn.disabled = !selectedEvent;

  dom.melodyTimelineEditorNoteSelector.innerHTML = '';
  if (selectedEvent) {
    selectedEvent.notes.forEach((note, noteIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      const isSelected = noteIndex === state.melodyTimelineSelectedNoteIndex;
      button.className =
        'h-7 rounded-md border px-2 text-[10px] font-semibold ' +
        (isSelected
          ? 'border-cyan-400 bg-cyan-700/30 text-cyan-50'
          : 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600');
      button.textContent =
        note.stringName !== null && typeof note.fret === 'number' ? `${note.note} ${note.stringName}:${note.fret}` : note.note;
      button.addEventListener('click', () => {
        state.melodyTimelineSelectedNoteIndex = noteIndex;
        renderMelodyTimelineEditorPanel();
        renderMelodyTabTimelineFromState();
      });
      dom.melodyTimelineEditorNoteSelector.appendChild(button);
    });
  }

  dom.melodyTimelineEditorString.innerHTML = '';
  state.currentInstrument.STRING_ORDER.forEach((stringName) => {
    const option = document.createElement('option');
    option.value = stringName;
    option.textContent = stringName;
    dom.melodyTimelineEditorString.appendChild(option);
  });

  const totalNotes = melodyTimelineEditorDraft?.reduce((sum, event) => sum + event.notes.length, 0) ?? 0;
  dom.melodyTimelineEditorString.disabled = !selectedNote;
  dom.melodyTimelineEditorFret.disabled = !selectedNote;
  dom.melodyTimelineEditorAddBtn.disabled = !selectedEvent;
  dom.melodyTimelineEditorAddEventBtn.disabled = state.melodyTimelineSelectedEventIndex === null;
  dom.melodyTimelineEditorDuplicateEventBtn.disabled = !selectedEvent || selectedEvent.notes.length === 0;
  dom.melodyTimelineEditorMoveEventLeftBtn.disabled =
    state.melodyTimelineSelectedEventIndex === null || state.melodyTimelineSelectedEventIndex <= 0;
  dom.melodyTimelineEditorMoveEventRightBtn.disabled =
    state.melodyTimelineSelectedEventIndex === null ||
    state.melodyTimelineSelectedEventIndex >= (melodyTimelineEditorDraft?.length ?? 0) - 1;
  dom.melodyTimelineEditorSplitEventBtn.disabled = !canSplitMelodyEvent(selectedEvent);
  dom.melodyTimelineEditorMergeEventBtn.disabled = !canMergeMelodyEventWithNext(
    melodyTimelineEditorDraft,
    state.melodyTimelineSelectedEventIndex
  );
  dom.melodyTimelineEditorSplitEventBtn.textContent = splitPreview
    ? `Split ${formatMelodyEventDuration(splitPreview.first)}+${formatMelodyEventDuration(splitPreview.second)}`
    : 'Split';
  dom.melodyTimelineEditorMergeEventBtn.textContent = mergedEventPreview
    ? `Merge -> ${formatMelodyEventDuration(mergedEventPreview)}`
    : 'Merge';
  dom.melodyTimelineEditorDeleteEventBtn.disabled = !selectedEvent || (melodyTimelineEditorDraft?.length ?? 0) <= 1;
  dom.melodyTimelineEditorDeleteBtn.disabled = !selectedNote || totalNotes <= 1;
  if (!selectedNote) {
    dom.melodyTimelineEditorFret.value = '';
    return;
  }

  dom.melodyTimelineEditorString.value =
    selectedNote.stringName && state.currentInstrument.STRING_ORDER.includes(selectedNote.stringName)
      ? selectedNote.stringName
      : state.currentInstrument.STRING_ORDER[0]!;
  dom.melodyTimelineEditorFret.value =
    typeof selectedNote.fret === 'number' && Number.isFinite(selectedNote.fret) ? String(selectedNote.fret) : '0';
}

function renderMelodyEventEditorInspector() {
  const draft = melodyEventEditorDraft;
  if (!draft) {
    resetMelodyEventEditorState();
    return;
  }

  ensureMelodyEventEditorSelection();
  dom.melodyEventEditorPanel.classList.remove('hidden');
  dom.melodyEventEditorUndoBtn.disabled = melodyEventEditorHistory.length === 0;
  dom.melodyEventEditorRedoBtn.disabled = melodyEventEditorFuture.length === 0;

  const selectedEvent =
    melodyEventEditorSelectedEventIndex === null ? null : draft[melodyEventEditorSelectedEventIndex] ?? null;
  const selectedNote =
    selectedEvent && melodyEventEditorSelectedNoteIndex !== null
      ? selectedEvent.notes[melodyEventEditorSelectedNoteIndex] ?? null
      : null;

  dom.melodyEventEditorSelection.textContent =
    selectedEvent && selectedNote && melodyEventEditorSelectedEventIndex !== null && melodyEventEditorSelectedNoteIndex !== null
      ? `Event ${melodyEventEditorSelectedEventIndex + 1} | Note ${melodyEventEditorSelectedNoteIndex + 1} | ${selectedNote.note}`
      : 'Select a note';

  dom.melodyEventEditorNoteSelector.innerHTML = '';
  if (selectedEvent && melodyEventEditorSelectedEventIndex !== null) {
    selectedEvent.notes.forEach((note, noteIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      const isSelected = noteIndex === melodyEventEditorSelectedNoteIndex;
      button.className =
        'h-8 rounded-md border px-2 text-[11px] font-semibold ' +
        (isSelected
          ? 'border-cyan-400 bg-cyan-700/30 text-cyan-50'
          : 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600');
      button.textContent =
        note.stringName !== null && typeof note.fret === 'number'
          ? `${note.note} ${note.stringName}:${note.fret}`
          : note.note;
      button.addEventListener('click', () => {
        melodyEventEditorSelectedNoteIndex = noteIndex;
        renderMelodyEventEditorInspector();
        renderMelodyEditorPreviewFromEvents(draft, {
          statusText: dom.melodyPreviewStatus.textContent,
          summaryPrefix: getMelodyEventEditorSummaryPrefix(),
          editableEvents: true,
          metadata: melodyEventEditorSourceMetadata ?? undefined,
          preserveDraft: true,
        });
      });
      dom.melodyEventEditorNoteSelector.appendChild(button);
    });
  }

  dom.melodyEventEditorString.innerHTML = '';
  state.currentInstrument.STRING_ORDER.forEach((stringName) => {
    const option = document.createElement('option');
    option.value = stringName;
    option.textContent = stringName;
    dom.melodyEventEditorString.appendChild(option);
  });

  dom.melodyEventEditorString.disabled = !selectedNote;
  dom.melodyEventEditorFret.disabled = !selectedNote;
  dom.melodyEventEditorAddBtn.disabled = !selectedEvent;
  dom.melodyEventEditorDeleteBtn.disabled = !selectedNote || getMelodyEventEditorNoteCount() <= 1;
  if (!selectedNote) {
    dom.melodyEventEditorFret.value = '';
    return;
  }

  if (selectedNote.stringName) {
    dom.melodyEventEditorString.value = selectedNote.stringName;
  } else if (state.currentInstrument.STRING_ORDER.length > 0) {
    dom.melodyEventEditorString.value = state.currentInstrument.STRING_ORDER[0]!;
  }
  dom.melodyEventEditorFret.value =
    typeof selectedNote.fret === 'number' && Number.isFinite(selectedNote.fret) ? String(selectedNote.fret) : '0';
}

function renderMelodyEditorPreviewFromEvents(
  parsedEvents: MelodyEvent[],
  options?: {
    statusText?: string;
    summaryPrefix?: string;
    editableEvents?: boolean;
    preserveDraft?: boolean;
    metadata?: {
      sourceFormat?: MelodyDefinition['sourceFormat'];
      sourceFileName?: string;
      sourceTrackName?: string;
      sourceScoreTitle?: string;
      sourceTempoBpm?: number;
    };
  }
) {
  if (options?.editableEvents) {
    if (!options.preserveDraft) {
      melodyEventEditorDraft = cloneMelodyEventsDraft(parsedEvents);
      melodyEventEditorHistory = [];
      melodyEventEditorFuture = [];
      melodyEventEditorSelectedEventIndex = parsedEvents.findIndex((event) => event.notes.length > 0);
      if (melodyEventEditorSelectedEventIndex < 0) melodyEventEditorSelectedEventIndex = 0;
      melodyEventEditorSelectedNoteIndex = 0;
      melodyEventEditorSourceMetadata = options.metadata ?? null;
    }
  } else {
    resetMelodyEventEditorState();
  }

  const totalNotes = parsedEvents.reduce((sum, event) => sum + event.notes.length, 0);
  const polyphonicEvents = parsedEvents.filter((event) => event.notes.length > 1).length;
  const beatAwareEvents = parsedEvents.filter((event) => typeof event.durationBeats === 'number').length;

  dom.melodyPreviewStatus.textContent = options?.statusText ?? 'Parsed successfully';
  dom.melodyPreviewStatus.className = 'text-xs text-emerald-300';
  dom.melodyPreviewSummary.textContent =
    `${options?.summaryPrefix ? `${options.summaryPrefix} | ` : ''}${parsedEvents.length} events, ${totalNotes} notes` +
    (polyphonicEvents > 0 ? `, ${polyphonicEvents} polyphonic` : '') +
    (beatAwareEvents > 0 ? `, beat timing detected` : ', column timing fallback');

  dom.melodyPreviewList.innerHTML = '';
  const maxPreviewItems = 10;
  parsedEvents.slice(0, maxPreviewItems).forEach((event, index) => {
    const li = document.createElement('li');
    if (options?.editableEvents) {
      li.className = 'rounded-md border border-slate-600/70 bg-slate-900/35 px-2 py-1.5';
      const header = document.createElement('div');
      header.className = 'mb-1 flex items-center justify-between gap-2';
      const label = document.createElement('span');
      label.className = 'text-[11px] text-slate-300';
      label.textContent = `Event ${index + 1}`;
      header.appendChild(label);
      const timing = document.createElement('span');
      timing.className = 'text-[10px] text-slate-400';
      timing.textContent =
        typeof event.durationBeats === 'number'
          ? `${event.durationBeats.toFixed(2)} beat`
          : `${Math.max(1, event.durationColumns ?? 1)} col`;
      header.appendChild(timing);
      li.appendChild(header);

      const notesRow = document.createElement('div');
      notesRow.className = 'flex flex-wrap gap-1';
      event.notes.forEach((note, noteIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        const isSelected =
          index === melodyEventEditorSelectedEventIndex && noteIndex === melodyEventEditorSelectedNoteIndex;
        button.className =
          'rounded-md border px-2 py-1 text-[11px] font-semibold ' +
          (isSelected
            ? 'border-cyan-400 bg-cyan-700/30 text-cyan-50'
            : 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600');
        button.textContent =
          note.stringName !== null && typeof note.fret === 'number'
            ? `${note.note} ${note.stringName}:${note.fret}`
            : note.note;
        button.addEventListener('click', () => {
          melodyEventEditorSelectedEventIndex = index;
          melodyEventEditorSelectedNoteIndex = noteIndex;
          renderMelodyEditorPreviewFromEvents(melodyEventEditorDraft ?? parsedEvents, {
            statusText: options?.statusText,
            summaryPrefix: options?.summaryPrefix,
            editableEvents: true,
            preserveDraft: true,
            metadata: melodyEventEditorSourceMetadata ?? undefined,
          });
        });
        notesRow.appendChild(button);
      });
      li.appendChild(notesRow);
    } else {
      li.textContent = formatMelodyPreviewEventLine(index, parsedEvents.length, event);
    }
    dom.melodyPreviewList.appendChild(li);
  });

  if (parsedEvents.length > maxPreviewItems) {
    const li = document.createElement('li');
    li.className = 'text-slate-400';
    li.textContent = `... and ${parsedEvents.length - maxPreviewItems} more events`;
    dom.melodyPreviewList.appendChild(li);
  }

  if (options?.editableEvents) {
    renderMelodyEventEditorInspector();
  }
}

function clearPendingGpImportDraft() {
  pendingGpImport = null;
  dom.melodyGpTrackSelector.innerHTML = '';
  dom.melodyGpTrackInfo.textContent = '';
  dom.melodyGpTrackImportPanel.classList.add('hidden');
  dom.saveMelodyGpTrackBtn.disabled = true;
}

function clearPendingMidiImportDraft() {
  pendingMidiImport = null;
  dom.melodyMidiTrackSelector.innerHTML = '';
  dom.melodyMidiQuantize.value = 'off';
  dom.melodyMidiTrackInfo.textContent = '';
  dom.melodyMidiTrackImportPanel.classList.add('hidden');
  dom.saveMelodyMidiTrackBtn.disabled = true;
}

function getSelectedMidiImportQuantize(): MidiImportQuantize {
  return normalizeMidiImportQuantize(dom.melodyMidiQuantize.value);
}

function renderGpTrackInfo() {
  if (!pendingGpImport) {
    dom.melodyGpTrackInfo.textContent = '';
    return;
  }
  const preview = pendingGpImport.importedPreview;
  const loaded = pendingGpImport.loaded;
  const pieces: string[] = [];
  if (loaded.scoreTitle) pieces.push(`Score: ${loaded.scoreTitle}`);
  if (preview?.metadata.trackName) pieces.push(`Track: ${preview.metadata.trackName}`);
  if (loaded.tempoBpm) pieces.push(`Tempo: ${loaded.tempoBpm} BPM`);
  if (preview?.warnings.length) pieces.push(preview.warnings.join(' '));
  dom.melodyGpTrackInfo.textContent = pieces.join(' | ');
}

function refreshGpTrackPreviewFromSelection() {
  if (!pendingGpImport) return;
  const selectedTrackIndex = Number.parseInt(dom.melodyGpTrackSelector.value, 10);
  if (!Number.isFinite(selectedTrackIndex)) return;

  pendingGpImport.selectedTrackIndex = selectedTrackIndex;
  const imported = convertLoadedGpScoreTrackToImportedMelody(
    pendingGpImport.loaded,
    state.currentInstrument,
    selectedTrackIndex
  );
  pendingGpImport.importedPreview = imported;

  if (!dom.melodyNameInput.value.trim()) {
    dom.melodyNameInput.value = imported.suggestedName;
  }

  renderMelodyEditorPreviewFromEvents(imported.events, {
    statusText: 'GP parsed successfully',
    summaryPrefix: imported.metadata.sourceFormat.toUpperCase(),
    editableEvents: true,
    metadata: {
      sourceFormat: imported.metadata.sourceFormat,
      sourceFileName: imported.metadata.sourceFileName,
      sourceTrackName: imported.metadata.trackName ?? undefined,
      sourceScoreTitle: imported.metadata.scoreTitle ?? undefined,
      sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
    },
  });
  renderGpTrackInfo();
  dom.saveMelodyGpTrackBtn.disabled = false;
}

function renderGpTrackSelectorForPendingImport() {
  if (!pendingGpImport) return;
  const { loaded } = pendingGpImport;
  dom.melodyGpTrackSelector.innerHTML = '';
  loaded.trackOptions.forEach((option) => {
    const element = document.createElement('option');
    element.value = String(option.trackIndex);
    element.textContent = option.label;
    dom.melodyGpTrackSelector.append(element);
  });
  if (loaded.defaultTrackIndex !== null) {
    dom.melodyGpTrackSelector.value = String(loaded.defaultTrackIndex);
  }
  dom.melodyGpTrackImportPanel.classList.remove('hidden');
  refreshGpTrackPreviewFromSelection();
}

function renderMidiTrackInfo() {
  if (!pendingMidiImport) {
    dom.melodyMidiTrackInfo.textContent = '';
    return;
  }
  const preview = pendingMidiImport.importedPreview;
  const loaded = pendingMidiImport.loaded;
  const selectedOption =
    loaded.trackOptions.find((option) => option.trackIndex === pendingMidiImport.selectedTrackIndex) ?? null;
  const pieces: string[] = [];
  if (loaded.midiName) pieces.push(`MIDI: ${loaded.midiName}`);
  if (preview?.metadata.trackName) pieces.push(`Track: ${preview.metadata.trackName}`);
  if (loaded.tempoBpm) pieces.push(`Tempo: ${loaded.tempoBpm} BPM`);
  if (loaded.tempoChangesCount > 1) pieces.push(`Tempo changes: ${loaded.tempoChangesCount}`);
  if (loaded.timeSignatureText) pieces.push(`Time Sig: ${loaded.timeSignatureText}`);
  if (loaded.keySignatureText) pieces.push(`Key: ${loaded.keySignatureText}`);
  if (pendingMidiImport.quantize !== 'off') pieces.push(`Quantize: ${pendingMidiImport.quantize}`);
  if (selectedOption?.estimatedBars) pieces.push(`Bars: ~${selectedOption.estimatedBars}`);
  if (selectedOption?.noteRangeText) pieces.push(`Range: ${selectedOption.noteRangeText}`);
  if (preview?.warnings.length) pieces.push(preview.warnings.join(' '));
  dom.melodyMidiTrackInfo.textContent = pieces.join(' | ');
}

function refreshMidiTrackPreviewFromSelection() {
  if (!pendingMidiImport) return;
  const selectedTrackIndex = Number.parseInt(dom.melodyMidiTrackSelector.value, 10);
  if (!Number.isFinite(selectedTrackIndex)) return;

  pendingMidiImport.selectedTrackIndex = selectedTrackIndex;
  pendingMidiImport.quantize = getSelectedMidiImportQuantize();
  const imported = convertLoadedMidiTrackToImportedMelody(
    pendingMidiImport.loaded,
    state.currentInstrument,
    selectedTrackIndex,
    { quantize: pendingMidiImport.quantize }
  );
  pendingMidiImport.importedPreview = imported;

  if (!dom.melodyNameInput.value.trim()) {
    dom.melodyNameInput.value = imported.suggestedName;
  }

  renderMelodyEditorPreviewFromEvents(imported.events, {
    statusText: 'MIDI parsed successfully',
    summaryPrefix: 'MIDI',
    editableEvents: true,
    metadata: {
      sourceFormat: imported.metadata.sourceFormat,
      sourceFileName: imported.metadata.sourceFileName,
      sourceTrackName: imported.metadata.trackName ?? undefined,
      sourceScoreTitle: imported.metadata.midiName ?? undefined,
      sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
    },
  });
  renderMidiTrackInfo();
  dom.saveMelodyMidiTrackBtn.disabled = false;
}

function renderMidiTrackSelectorForPendingImport() {
  if (!pendingMidiImport) return;
  const { loaded } = pendingMidiImport;
  dom.melodyMidiTrackSelector.innerHTML = '';
  loaded.trackOptions.forEach((option) => {
    const element = document.createElement('option');
    element.value = String(option.trackIndex);
    element.textContent = option.label;
    dom.melodyMidiTrackSelector.append(element);
  });
  if (loaded.defaultTrackIndex !== null) {
    dom.melodyMidiTrackSelector.value = String(loaded.defaultTrackIndex);
  }
  dom.melodyMidiQuantize.value = pendingMidiImport.quantize;
  dom.melodyMidiTrackImportPanel.classList.remove('hidden');
  refreshMidiTrackPreviewFromSelection();
}

function updateMelodyEditorPreview() {
  const tabText = dom.melodyAsciiTabInput.value.trim();
  if (!tabText) {
    if (pendingGpImport?.importedPreview) {
      renderMelodyEditorPreviewFromEvents(pendingGpImport.importedPreview.events, {
        statusText: 'GP parsed successfully',
        summaryPrefix: pendingGpImport.importedPreview.metadata.sourceFormat.toUpperCase(),
        editableEvents: true,
        metadata: {
          sourceFormat: pendingGpImport.importedPreview.metadata.sourceFormat,
          sourceFileName: pendingGpImport.importedPreview.metadata.sourceFileName,
          sourceTrackName: pendingGpImport.importedPreview.metadata.trackName ?? undefined,
          sourceScoreTitle: pendingGpImport.importedPreview.metadata.scoreTitle ?? undefined,
          sourceTempoBpm: pendingGpImport.importedPreview.metadata.tempoBpm ?? undefined,
        },
      });
      renderGpTrackInfo();
      return;
    }
    if (pendingMidiImport?.importedPreview) {
      renderMelodyEditorPreviewFromEvents(pendingMidiImport.importedPreview.events, {
        statusText: 'MIDI parsed successfully',
        summaryPrefix: 'MIDI',
        editableEvents: true,
        metadata: {
          sourceFormat: pendingMidiImport.importedPreview.metadata.sourceFormat,
          sourceFileName: pendingMidiImport.importedPreview.metadata.sourceFileName,
          sourceTrackName: pendingMidiImport.importedPreview.metadata.trackName ?? undefined,
          sourceScoreTitle: pendingMidiImport.importedPreview.metadata.midiName ?? undefined,
          sourceTempoBpm: pendingMidiImport.importedPreview.metadata.tempoBpm ?? undefined,
        },
      });
      renderMidiTrackInfo();
      return;
    }
    clearMelodyEditorPreview();
    return;
  }

  try {
    // Switching back to ASCII editing hides any pending GP import draft.
    clearPendingGpImportDraft();
    clearPendingMidiImportDraft();
    const parsedEvents = parseAsciiTabToMelodyEvents(tabText, state.currentInstrument).map((event) => ({
      barIndex: event.barIndex,
      column: event.column,
      durationColumns: event.durationColumns,
      durationCountSteps: event.durationCountSteps,
      durationBeats: event.durationBeats,
      notes: event.notes.map((note) => ({
        note: note.note,
        stringName: note.stringName,
        fret: note.fret,
      })),
    }));
    renderMelodyEditorPreviewFromEvents(parsedEvents, { editableEvents: false });
  } catch (error) {
    renderMelodyEditorPreviewError('ASCII tab preview failed', error);
  }
}

function scheduleMelodyEditorPreviewUpdate() {
  if (melodyPreviewUpdateTimeoutId !== null) {
    window.clearTimeout(melodyPreviewUpdateTimeoutId);
  }
  melodyPreviewUpdateTimeoutId = window.setTimeout(() => {
    melodyPreviewUpdateTimeoutId = null;
    updateMelodyEditorPreview();
  }, 120);
}

function commitMelodyEventEditorMutation(mutator: (draft: MelodyEvent[]) => void) {
  if (!melodyEventEditorDraft) return;
  pushMelodyEventEditorHistory();
  mutator(melodyEventEditorDraft);
  ensureMelodyEventEditorSelection();
  renderCurrentMelodyEventEditorDraft();
}

function updateSelectedMelodyEventEditorNotePosition(stringName: string, fretValue: number) {
  const selected = getSelectedMelodyEventEditorNote();
  if (!selected) return;

  const fret = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(fretValue)));
  const noteWithOctave = state.currentInstrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
  }

  commitMelodyEventEditorMutation(() => {
    selected.note.stringName = stringName;
    selected.note.fret = fret;
    selected.note.note = stripScientificOctave(noteWithOctave);
  });
}

function deleteSelectedMelodyEventEditorNote() {
  if (
    !melodyEventEditorDraft ||
    melodyEventEditorSelectedEventIndex === null ||
    melodyEventEditorSelectedNoteIndex === null
  ) {
    return;
  }
  if (getMelodyEventEditorNoteCount() <= 1) {
    throw new Error('A melody must contain at least one note.');
  }

  commitMelodyEventEditorMutation((draft) => {
    const event = draft[melodyEventEditorSelectedEventIndex!];
    if (!event) return;
    event.notes.splice(melodyEventEditorSelectedNoteIndex!, 1);
  });
}

function addMelodyEventEditorNote() {
  if (!melodyEventEditorDraft || melodyEventEditorSelectedEventIndex === null) return;

  const selectedEvent = melodyEventEditorDraft[melodyEventEditorSelectedEventIndex];
  if (!selectedEvent) return;

  const usedStrings = new Set(selectedEvent.notes.map((note) => note.stringName).filter((value): value is string => !!value));
  const selected = getSelectedMelodyEventEditorNote();
  const preferredFret =
    selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret) ? selected.note.fret : 0;
  const candidateStrings = [
    ...(selected?.note.stringName ? [selected.note.stringName] : []),
    ...state.currentInstrument.STRING_ORDER,
  ];
  const targetStringName =
    candidateStrings.find((stringName) => !usedStrings.has(stringName)) ?? state.currentInstrument.STRING_ORDER[0] ?? null;
  if (!targetStringName) {
    throw new Error('Current instrument has no available strings.');
  }

  const noteWithOctave = state.currentInstrument.getNoteWithOctave(targetStringName, preferredFret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${targetStringName} fret ${preferredFret} for the current instrument.`);
  }

  commitMelodyEventEditorMutation((draft) => {
    const event = draft[melodyEventEditorSelectedEventIndex!];
    if (!event) return;
    event.notes.push({
      note: stripScientificOctave(noteWithOctave),
      stringName: targetStringName,
      fret: preferredFret,
    });
    melodyEventEditorSelectedNoteIndex = event.notes.length - 1;
  });
}

function undoMelodyEventEditorMutation() {
  if (!melodyEventEditorDraft || melodyEventEditorHistory.length === 0) return;
  melodyEventEditorFuture.push(cloneMelodyEventsDraft(melodyEventEditorDraft));
  const previous = melodyEventEditorHistory.pop();
  if (!previous) return;
  melodyEventEditorDraft = cloneMelodyEventsDraft(previous);
  ensureMelodyEventEditorSelection();
  renderCurrentMelodyEventEditorDraft('Edit undone');
}

function redoMelodyEventEditorMutation() {
  if (!melodyEventEditorFuture.length) return;
  if (melodyEventEditorDraft) {
    melodyEventEditorHistory.push(cloneMelodyEventsDraft(melodyEventEditorDraft));
  }
  const next = melodyEventEditorFuture.pop();
  if (!next) return;
  melodyEventEditorDraft = cloneMelodyEventsDraft(next);
  ensureMelodyEventEditorSelection();
  renderCurrentMelodyEventEditorDraft('Edit restored');
}

function stopPlaybackForTimelineEditing() {
  if (isMelodyDemoPlaying || isMelodyDemoPaused) {
    stopMelodyDemoPlayback({ clearUi: true, message: 'Playback stopped to edit the melody.' });
  }
  if (state.isListening) {
    stopListening();
    setResultMessage('Session stopped to edit the melody.');
  }
}

function selectTimelineMelodyEditorNote(eventIndex: number, noteIndex: number) {
  const eligibility = canEditSelectedMelodyOnTimeline();
  if (!eligibility.editable) {
    renderMelodyTimelineEditorPanel();
    renderMelodyTabTimelineFromState();
    return;
  }

  stopPlaybackForTimelineEditing();
  ensureMelodyTimelineEditorDraftLoaded(eligibility.melody);
  state.melodyTimelineSelectedEventIndex = eventIndex;
  state.melodyTimelineSelectedNoteIndex = noteIndex;
  ensureMelodyTimelineEditorSelection();
  renderMelodyTimelineEditorPanel();
  renderMelodyTabTimelineFromState();
}

function updateSelectedMelodyTimelineEditorNotePosition(stringName: string, fretValue: number) {
  const selected = getSelectedMelodyTimelineEditorNote();
  if (!selected) return;

  const fret = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(fretValue)));
  const noteWithOctave = state.currentInstrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
  }

  commitMelodyTimelineEditorMutation((draft) => {
    const event = draft[state.melodyTimelineSelectedEventIndex!];
    const note = event?.notes[state.melodyTimelineSelectedNoteIndex!];
    if (!note) return;
    note.stringName = stringName;
    note.fret = fret;
    note.note = stripScientificOctave(noteWithOctave);
  });
}

function parseScientificNoteToMidiValue(noteWithOctave: string) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

function resolveEquivalentStringFretForTimelineNote(targetStringName: string) {
  const selected = getSelectedMelodyTimelineEditorNote();
  if (!selected) return null;
  const sourceStringName = selected.note.stringName;
  const sourceFret = selected.note.fret;
  if (!sourceStringName || typeof sourceFret !== 'number' || !Number.isFinite(sourceFret)) {
    return null;
  }
  if (targetStringName === sourceStringName) {
    return sourceFret;
  }

  const noteWithOctave = state.currentInstrument.getNoteWithOctave(sourceStringName, sourceFret);
  if (!noteWithOctave) return null;
  const targetMidi = parseScientificNoteToMidiValue(noteWithOctave);
  if (targetMidi === null) return null;

  for (let fret = 0; fret <= DEFAULT_TABLATURE_MAX_FRET; fret += 1) {
    const candidate = state.currentInstrument.getNoteWithOctave(targetStringName, fret);
    if (!candidate) continue;
    if (parseScientificNoteToMidiValue(candidate) === targetMidi) {
      return fret;
    }
  }
  return null;
}

function moveSelectedMelodyTimelineEditorNoteToString(targetStringName: string, options?: { commit?: boolean }) {
  const selected = getSelectedMelodyTimelineEditorNote();
  if (!selected) return;
  const sourceStringName = selected.note.stringName;
  if (!sourceStringName || sourceStringName === targetStringName) return;

  const selectedEvent = melodyTimelineEditorDraft?.[state.melodyTimelineSelectedEventIndex ?? -1];
  if (!selectedEvent) return;
  if (
    selectedEvent.notes.some(
      (note, noteIndex) => noteIndex !== state.melodyTimelineSelectedNoteIndex && note.stringName === targetStringName
    )
  ) {
    throw new Error(`Target string ${targetStringName} is already occupied in this event.`);
  }

  const targetFret = resolveEquivalentStringFretForTimelineNote(targetStringName);
  if (targetFret === null) {
    throw new Error(`Cannot place this note on string ${targetStringName} within the visible fret range.`);
  }

  if (options?.commit === false) return;
  updateSelectedMelodyTimelineEditorNotePosition(targetStringName, targetFret);
}

function isIgnorableMelodyTimelineNoteDragError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Cannot place this note on string') ||
    error.message.includes('is already occupied in this event')
  );
}

function addMelodyTimelineEditorNote() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const selectedEvent = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!selectedEvent) return;

  const usedStrings = new Set(selectedEvent.notes.map((note) => note.stringName).filter((value): value is string => !!value));
  const selected = getSelectedMelodyTimelineEditorNote();
  const preferredFret =
    selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret) ? selected.note.fret : 0;
  const candidateStrings = [
    ...(selected?.note.stringName ? [selected.note.stringName] : []),
    ...state.currentInstrument.STRING_ORDER,
  ];
  const targetStringName =
    candidateStrings.find((stringName) => !usedStrings.has(stringName)) ?? state.currentInstrument.STRING_ORDER[0] ?? null;
  if (!targetStringName) {
    throw new Error('Current instrument has no available strings.');
  }
  const noteWithOctave = state.currentInstrument.getNoteWithOctave(targetStringName, preferredFret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${targetStringName} fret ${preferredFret} for the current instrument.`);
  }

  commitMelodyTimelineEditorMutation((draft) => {
    const event = draft[state.melodyTimelineSelectedEventIndex!];
    if (!event) return;
    event.notes.push({
      note: stripScientificOctave(noteWithOctave),
      stringName: targetStringName,
      fret: preferredFret,
    });
    state.melodyTimelineSelectedNoteIndex = event.notes.length - 1;
  });
}

function deleteSelectedMelodyTimelineEditorNote() {
  if (
    !melodyTimelineEditorDraft ||
    state.melodyTimelineSelectedEventIndex === null ||
    state.melodyTimelineSelectedNoteIndex === null
  ) {
    return;
  }

  const totalNotes = melodyTimelineEditorDraft.reduce((sum, event) => sum + event.notes.length, 0);
  if (totalNotes <= 1) {
    throw new Error('A melody must contain at least one note.');
  }

  commitMelodyTimelineEditorMutation((draft) => {
    const event = draft[state.melodyTimelineSelectedEventIndex!];
    if (!event) return;
    event.notes.splice(state.melodyTimelineSelectedNoteIndex!, 1);
  });
}

function createDefaultMelodyEventFromSelection() {
  const selected = getSelectedMelodyTimelineEditorNote();
  const stringName = selected?.note.stringName ?? state.currentInstrument.STRING_ORDER[0] ?? null;
  const fret =
    selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret) ? selected.note.fret : 0;

  if (!stringName) {
    throw new Error('Current instrument has no available strings.');
  }

  const noteWithOctave = state.currentInstrument.getNoteWithOctave(stringName, fret);
  if (!noteWithOctave) {
    throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
  }

  return {
    durationBeats: 1,
    notes: [
      {
        note: stripScientificOctave(noteWithOctave),
        stringName,
        fret,
      },
    ],
  } satisfies MelodyEvent;
}

function getMelodyEventDurationMagnitude(event: MelodyEvent) {
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    return event.durationBeats;
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    return event.durationCountSteps;
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    return event.durationColumns;
  }
  return 1;
}

function formatMelodyEventDuration(event: MelodyEvent | null | undefined) {
  if (!event) return '-';
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    return `${event.durationBeats.toFixed(event.durationBeats % 1 === 0 ? 0 : 2)} beat`;
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    return `${Math.round(event.durationCountSteps)} step`;
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    return `${Math.round(event.durationColumns)} col`;
  }
  return `${getMelodyEventDurationMagnitude(event).toFixed(2)} beat`;
}

function canSplitMelodyEvent(event: MelodyEvent | null | undefined) {
  if (!event) return false;
  return getMelodyEventDurationMagnitude(event) > 1;
}

function areMelodyEventNotesEquivalent(left: MelodyEvent, right: MelodyEvent) {
  if (left.notes.length !== right.notes.length) return false;
  const leftSignature = left.notes
    .map((note) => `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`)
    .sort();
  const rightSignature = right.notes
    .map((note) => `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`)
    .sort();
  return leftSignature.every((value, index) => value === rightSignature[index]);
}

function canMergeMelodyEventWithNext(events: MelodyEvent[] | null, eventIndex: number | null) {
  if (!events || eventIndex === null || eventIndex < 0 || eventIndex >= events.length - 1) return false;
  const current = events[eventIndex];
  const next = events[eventIndex + 1];
  if (!current || !next) return false;
  return areMelodyEventNotesEquivalent(current, next);
}

function splitMelodyEventDuration(event: MelodyEvent) {
  const first = cloneMelodyEventsDraft([event])[0]!;
  const second = cloneMelodyEventsDraft([event])[0]!;

  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    const firstValue = Math.max(0.25, event.durationBeats / 2);
    const secondValue = Math.max(0.25, event.durationBeats - firstValue);
    first.durationBeats = firstValue;
    second.durationBeats = secondValue;
    return { first, second };
  }
  if (
    typeof event.durationCountSteps === 'number' &&
    Number.isFinite(event.durationCountSteps) &&
    event.durationCountSteps > 0
  ) {
    const firstValue = Math.max(1, Math.floor(event.durationCountSteps / 2));
    const secondValue = Math.max(1, event.durationCountSteps - firstValue);
    first.durationCountSteps = firstValue;
    second.durationCountSteps = secondValue;
    return { first, second };
  }
  if (
    typeof event.durationColumns === 'number' &&
    Number.isFinite(event.durationColumns) &&
    event.durationColumns > 0
  ) {
    const firstValue = Math.max(1, Math.floor(event.durationColumns / 2));
    const secondValue = Math.max(1, event.durationColumns - firstValue);
    first.durationColumns = firstValue;
    second.durationColumns = secondValue;
    return { first, second };
  }

  first.durationBeats = 0.5;
  second.durationBeats = 0.5;
  return { first, second };
}

function mergeMelodyEventDurations(current: MelodyEvent, next: MelodyEvent) {
  const merged = cloneMelodyEventsDraft([current])[0]!;
  if (
    typeof current.durationBeats === 'number' &&
    typeof next.durationBeats === 'number' &&
    Number.isFinite(current.durationBeats) &&
    Number.isFinite(next.durationBeats)
  ) {
    merged.durationBeats = current.durationBeats + next.durationBeats;
    return merged;
  }
  if (
    typeof current.durationCountSteps === 'number' &&
    typeof next.durationCountSteps === 'number' &&
    Number.isFinite(current.durationCountSteps) &&
    Number.isFinite(next.durationCountSteps)
  ) {
    merged.durationCountSteps = current.durationCountSteps + next.durationCountSteps;
    return merged;
  }
  if (
    typeof current.durationColumns === 'number' &&
    typeof next.durationColumns === 'number' &&
    Number.isFinite(current.durationColumns) &&
    Number.isFinite(next.durationColumns)
  ) {
    merged.durationColumns = current.durationColumns + next.durationColumns;
    return merged;
  }

  merged.durationBeats = getMelodyEventDurationMagnitude(current) + getMelodyEventDurationMagnitude(next);
  return merged;
}

function canDecreaseMelodyEventDuration(event: MelodyEvent | null | undefined) {
  if (!event) return false;
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats)) {
    return event.durationBeats > 0.25;
  }
  if (typeof event.durationCountSteps === 'number' && Number.isFinite(event.durationCountSteps)) {
    return event.durationCountSteps > 1;
  }
  if (typeof event.durationColumns === 'number' && Number.isFinite(event.durationColumns)) {
    return event.durationColumns > 1;
  }
  return false;
}

function adjustSelectedMelodyTimelineEventDuration(direction: -1 | 1) {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const selectedEvent = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!selectedEvent) return;

  commitMelodyTimelineEditorMutation((draft) => {
    const event = draft[state.melodyTimelineSelectedEventIndex!];
    if (!event) return;

    if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats)) {
      const next = Math.max(0.25, Math.min(32, event.durationBeats + direction * 0.25));
      event.durationBeats = Math.round(next * 100) / 100;
      return;
    }
    if (typeof event.durationCountSteps === 'number' && Number.isFinite(event.durationCountSteps)) {
      event.durationCountSteps = Math.max(1, Math.min(64, event.durationCountSteps + direction));
      return;
    }
    if (typeof event.durationColumns === 'number' && Number.isFinite(event.durationColumns)) {
      event.durationColumns = Math.max(1, Math.min(64, event.durationColumns + direction));
      return;
    }

    event.durationBeats = direction > 0 ? 1.25 : 0.25;
  }, direction > 0 ? 'Duration increased' : 'Duration decreased');
}

function addMelodyTimelineEditorEventAfterSelection() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;

  commitMelodyTimelineEditorMutation((draft) => {
    const insertIndex = Math.max(0, Math.min(draft.length, state.melodyTimelineSelectedEventIndex! + 1));
    draft.splice(insertIndex, 0, createDefaultMelodyEventFromSelection());
    state.melodyTimelineSelectedEventIndex = insertIndex;
    state.melodyTimelineSelectedNoteIndex = 0;
  }, 'Event added');
}

function duplicateSelectedMelodyTimelineEvent() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const sourceEvent = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!sourceEvent || sourceEvent.notes.length === 0) return;

  commitMelodyTimelineEditorMutation((draft) => {
    const clone = cloneMelodyEventsDraft([sourceEvent])[0]!;
    const insertIndex = state.melodyTimelineSelectedEventIndex! + 1;
    draft.splice(insertIndex, 0, clone);
    state.melodyTimelineSelectedEventIndex = insertIndex;
    state.melodyTimelineSelectedNoteIndex = Math.min(
      state.melodyTimelineSelectedNoteIndex ?? 0,
      Math.max(0, clone.notes.length - 1)
    );
  }, 'Event duplicated');
}

function moveSelectedMelodyTimelineEvent(direction: -1 | 1) {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const sourceIndex = state.melodyTimelineSelectedEventIndex;
  const targetIndex = sourceIndex + direction;
  if (targetIndex < 0 || targetIndex >= melodyTimelineEditorDraft.length) return;

  commitMelodyTimelineEditorMutation((draft) => {
    const [movedEvent] = draft.splice(sourceIndex, 1);
    if (!movedEvent) return;
    draft.splice(targetIndex, 0, movedEvent);
    state.melodyTimelineSelectedEventIndex = targetIndex;
    state.melodyTimelineSelectedNoteIndex = Math.min(
      state.melodyTimelineSelectedNoteIndex ?? 0,
      Math.max(0, movedEvent.notes.length - 1)
    );
  }, direction < 0 ? 'Event moved earlier' : 'Event moved later');
}

function moveSelectedMelodyTimelineEventToIndex(targetIndex: number) {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const sourceIndex = state.melodyTimelineSelectedEventIndex;
  const normalizedTargetIndex = Math.max(0, Math.min(melodyTimelineEditorDraft.length - 1, Math.round(targetIndex)));
  if (normalizedTargetIndex === sourceIndex) return;

  commitMelodyTimelineEditorMutation((draft) => {
    const [movedEvent] = draft.splice(sourceIndex, 1);
    if (!movedEvent) return;
    draft.splice(normalizedTargetIndex, 0, movedEvent);
    state.melodyTimelineSelectedEventIndex = normalizedTargetIndex;
    state.melodyTimelineSelectedNoteIndex = Math.min(
      state.melodyTimelineSelectedNoteIndex ?? 0,
      Math.max(0, movedEvent.notes.length - 1)
    );
  }, normalizedTargetIndex < sourceIndex ? 'Event moved earlier' : 'Event moved later');
}

function deleteSelectedMelodyTimelineEvent() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  if (melodyTimelineEditorDraft.length <= 1) {
    throw new Error('A melody must contain at least one event.');
  }

  commitMelodyTimelineEditorMutation((draft) => {
    draft.splice(state.melodyTimelineSelectedEventIndex!, 1);
    if (draft.length === 0) {
      state.melodyTimelineSelectedEventIndex = null;
      state.melodyTimelineSelectedNoteIndex = null;
      return;
    }
    state.melodyTimelineSelectedEventIndex = Math.max(
      0,
      Math.min(state.melodyTimelineSelectedEventIndex!, draft.length - 1)
    );
    state.melodyTimelineSelectedNoteIndex = 0;
  }, 'Event deleted');
}

function splitSelectedMelodyTimelineEvent() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  const sourceEvent = melodyTimelineEditorDraft[state.melodyTimelineSelectedEventIndex];
  if (!sourceEvent || !canSplitMelodyEvent(sourceEvent)) {
    throw new Error('Selected event is too short to split.');
  }

  commitMelodyTimelineEditorMutation((draft) => {
    const event = draft[state.melodyTimelineSelectedEventIndex!];
    if (!event) return;
    const { first, second } = splitMelodyEventDuration(event);
    draft.splice(state.melodyTimelineSelectedEventIndex!, 1, first, second);
    state.melodyTimelineSelectedEventIndex = state.melodyTimelineSelectedEventIndex!;
    state.melodyTimelineSelectedNoteIndex = Math.min(
      state.melodyTimelineSelectedNoteIndex ?? 0,
      Math.max(0, first.notes.length - 1)
    );
  }, 'Event split');
}

function mergeSelectedMelodyTimelineEventWithNext() {
  if (!melodyTimelineEditorDraft || state.melodyTimelineSelectedEventIndex === null) return;
  if (!canMergeMelodyEventWithNext(melodyTimelineEditorDraft, state.melodyTimelineSelectedEventIndex)) {
    throw new Error('Only neighboring events with the same notes can be merged.');
  }

  commitMelodyTimelineEditorMutation((draft) => {
    const currentIndex = state.melodyTimelineSelectedEventIndex!;
    const current = draft[currentIndex];
    const next = draft[currentIndex + 1];
    if (!current || !next) return;
    draft.splice(currentIndex, 2, mergeMelodyEventDurations(current, next));
    state.melodyTimelineSelectedNoteIndex = Math.min(
      state.melodyTimelineSelectedNoteIndex ?? 0,
      Math.max(0, draft[currentIndex]!.notes.length - 1)
    );
  }, 'Events merged');
}

function undoMelodyTimelineEditorMutation() {
  if (!melodyTimelineEditorDraft || melodyTimelineEditorHistory.length === 0) return;
  melodyTimelineEditorFuture.push(cloneMelodyEventsDraft(melodyTimelineEditorDraft));
  const previous = melodyTimelineEditorHistory.pop();
  if (!previous) return;
  melodyTimelineEditorDraft = cloneMelodyEventsDraft(previous);
  ensureMelodyTimelineEditorSelection();
  renderMelodyTimelineEditorPanel('Edit undone');
  renderMelodyTabTimelineFromState();
}

function redoMelodyTimelineEditorMutation() {
  if (!melodyTimelineEditorFuture.length) return;
  if (melodyTimelineEditorDraft) {
    melodyTimelineEditorHistory.push(cloneMelodyEventsDraft(melodyTimelineEditorDraft));
  }
  const next = melodyTimelineEditorFuture.pop();
  if (!next) return;
  melodyTimelineEditorDraft = cloneMelodyEventsDraft(next);
  ensureMelodyTimelineEditorSelection();
  renderMelodyTimelineEditorPanel('Edit restored');
  renderMelodyTabTimelineFromState();
}

async function loadGpImportDraftFromFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loaded = await loadGpScoreFromBytes(bytes, state.currentInstrument, file.name);
  if (loaded.trackOptions.length === 0 || loaded.defaultTrackIndex === null) {
    throw new Error('No importable stringed track was found in the Guitar Pro file.');
  }

  pendingGpImport = {
    loaded,
    selectedTrackIndex: loaded.defaultTrackIndex,
    importedPreview: null,
  };

  renderGpTrackSelectorForPendingImport();
}

function savePendingGpImportedTrack() {
  if (!pendingGpImport) {
    throw new Error('No loaded Guitar Pro file to import.');
  }

  const imported =
    pendingGpImport.importedPreview ??
    convertLoadedGpScoreTrackToImportedMelody(
      pendingGpImport.loaded,
      state.currentInstrument,
      pendingGpImport.selectedTrackIndex
    );
  pendingGpImport.importedPreview = imported;

  const melodyName = dom.melodyNameInput.value.trim() || imported.suggestedName;
  const sourceMetadata = melodyEventEditorSourceMetadata ?? {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.scoreTitle ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  };
  const melodyId = saveCustomEventMelody(
    melodyName,
    melodyEventEditorDraft ?? imported.events,
    state.currentInstrument,
    sourceMetadata
  );

  const warningSuffix =
    imported.warnings.length > 0
      ? ` ${imported.warnings.slice(0, 2).join(' ')}${imported.warnings.length > 2 ? ' ...' : ''}`
      : '';
  const trackLabel = imported.metadata.trackName ? ` (${imported.metadata.trackName})` : '';
  finalizeMelodyImportSelection(
    melodyId,
    `Custom melody imported from ${imported.metadata.sourceFileName}${trackLabel}.${warningSuffix}`.trim()
  );
}

async function loadMidiImportDraftFromFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loaded = await loadMidiFileFromBytes(bytes, file.name);
  if (loaded.trackOptions.length === 0 || loaded.defaultTrackIndex === null) {
    throw new Error('MIDI file does not contain importable note tracks.');
  }

  pendingMidiImport = {
    loaded,
    selectedTrackIndex: loaded.defaultTrackIndex,
    quantize: getSelectedMidiImportQuantize(),
    importedPreview: null,
  };
  renderMidiTrackSelectorForPendingImport();
}

function savePendingMidiImportedTrack() {
  if (!pendingMidiImport) {
    throw new Error('No loaded MIDI file to import.');
  }

  const imported =
    pendingMidiImport.importedPreview ??
    convertLoadedMidiTrackToImportedMelody(
      pendingMidiImport.loaded,
      state.currentInstrument,
      pendingMidiImport.selectedTrackIndex,
      { quantize: pendingMidiImport.quantize }
    );
  pendingMidiImport.importedPreview = imported;

  const melodyName = dom.melodyNameInput.value.trim() || imported.suggestedName;
  const sourceMetadata = melodyEventEditorSourceMetadata ?? {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.midiName ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  };
  const melodyId = saveCustomEventMelody(
    melodyName,
    melodyEventEditorDraft ?? imported.events,
    state.currentInstrument,
    sourceMetadata
  );

  const warningSuffix =
    imported.warnings.length > 0
      ? ` ${imported.warnings.slice(0, 2).join(' ')}${imported.warnings.length > 2 ? ' ...' : ''}`
      : '';
  const trackLabel = imported.metadata.trackName ? ` (${imported.metadata.trackName})` : '';
  finalizeMelodyImportSelection(
    melodyId,
    `Custom melody imported from ${imported.metadata.sourceFileName}${trackLabel}.${warningSuffix}`.trim()
  );
}

function stopMelodyDemoPlayback(options?: { clearUi?: boolean; message?: string }) {
  melodyDemoRunToken++;
  if (melodyDemoTimeoutId !== null) {
    window.clearTimeout(melodyDemoTimeoutId);
    melodyDemoTimeoutId = null;
  }
  const wasPlaying = isMelodyDemoPlaying;
  const wasPaused = isMelodyDemoPaused;
  isMelodyDemoPlaying = false;
  isMelodyDemoPaused = false;
  melodyDemoNextEventIndex = 0;
  if (options?.clearUi) {
    melodyTimelineSeekResumeMode = null;
  }
  renderMelodyDemoButtonState();

  if (options?.clearUi) {
    melodyStepPreviewIndex = null;
    state.melodyTimelinePreviewIndex = null;
    state.melodyTimelinePreviewLabel = null;
    setPromptText('');
    redrawFretboard();
  }

  if ((wasPlaying || wasPaused) && options?.message) {
    setResultMessage(options.message);
  }
}

function pauseMelodyDemoPlayback() {
  if (!isMelodyDemoPlaying) return;
  if (melodyDemoTimeoutId !== null) {
    window.clearTimeout(melodyDemoTimeoutId);
    melodyDemoTimeoutId = null;
  }
  isMelodyDemoPlaying = false;
  isMelodyDemoPaused = true;
  renderMelodyDemoButtonState();
  setResultMessage('Melody demo paused.');
}

async function resumeMelodyDemoPlayback() {
  const selection = getSelectedMelodyForDemoControls();
  if (!selection) return;
  if (!isMelodyDemoPaused) return;

  await ensureMelodyDemoAudioReady();
  melodyTimelineSeekResumeMode = null;
  isMelodyDemoPaused = false;
  isMelodyDemoPlaying = true;
  renderMelodyDemoButtonState();
  setResultMessage(`Resumed demo: ${selection.melody.name}`);
  startMelodyDemoPlaybackFromIndex(selection, melodyDemoNextEventIndex);
}

function formatMelodyDemoEventHint(event: MelodyEvent) {
  return event.notes
    .map((note) => {
      if (note.stringName !== null && typeof note.fret === 'number') {
        return `${note.note} (${note.stringName}, fret ${note.fret})`;
      }
      return note.note;
    })
    .join(' + ');
}

function buildMelodyDemoPrompt(
  melodyName: string,
  event: MelodyEvent,
  eventIndexInRange: number,
  totalEventsInRange: number,
  studyRange: MelodyStudyRange,
  totalMelodyEvents: number,
  fingering: ChordNote[],
  options?: { label?: string }
): Prompt {
  const isPolyphonic = event.notes.length > 1;
  const first = event.notes[0] ?? null;
  const stepLabel = formatMelodyStudyStepLabel(
    eventIndexInRange,
    totalEventsInRange,
    studyRange,
    totalMelodyEvents
  );
  const prefixLabel = options?.label ?? 'Demo';

  return {
    displayText: `${prefixLabel} ${stepLabel}: ${formatMelodyDemoEventHint(event)} (${melodyName})`,
    targetNote: isPolyphonic ? null : (first?.note ?? null),
    targetString: isPolyphonic ? null : (first?.stringName ?? null),
    targetChordNotes: isPolyphonic ? [...new Set(event.notes.map((note) => note.note))] : [],
    targetChordFingering: isPolyphonic ? fingering : [],
    targetMelodyEventNotes: fingering,
    baseChordName: null,
  };
}

function getClampedMelodyDemoBpmFromInput() {
  const parsed = Number.parseInt(dom.melodyDemoBpm.value, 10);
  const clamped = Number.isFinite(parsed)
    ? Math.max(MELODY_DEMO_MIN_BPM, Math.min(MELODY_DEMO_MAX_BPM, parsed))
    : MELODY_DEMO_DEFAULT_BPM;
  dom.melodyDemoBpm.value = String(clamped);
  syncMelodyDemoBpmDisplay();
  return clamped;
}

function getMelodyDemoStepDelayMs(event: MelodyEvent) {
  if (typeof event.durationBeats === 'number' && Number.isFinite(event.durationBeats) && event.durationBeats > 0) {
    const bpm = getClampedMelodyDemoBpmFromInput();
    const beatMs = 60000 / bpm;
    const computedFromBeats = Math.round(event.durationBeats * beatMs);
    return Math.max(MELODY_DEMO_MIN_STEP_MS, Math.min(MELODY_DEMO_MAX_STEP_MS, computedFromBeats));
  }

  const durationColumns = Math.max(1, event.durationColumns ?? 0);
  const computed = Math.round(durationColumns * MELODY_DEMO_COLUMN_MS);
  return Math.max(
    MELODY_DEMO_MIN_STEP_MS,
    Math.min(MELODY_DEMO_MAX_STEP_MS, computed || MELODY_DEMO_FALLBACK_STEP_MS)
  );
}

function playPromptAudioFromPrompt(prompt: Prompt) {
  const audioPlan = buildPromptAudioPlan({
    prompt,
    trainingMode: 'melody',
    autoPlayPromptSoundEnabled: true,
    instrument: state.currentInstrument,
    calibratedA4: state.calibratedA4,
    enabledStrings: getEnabledStrings(dom.stringSelector),
  });

  if (audioPlan.notesToPlay.length === 1) {
    playSound(audioPlan.notesToPlay[0]);
  } else if (audioPlan.notesToPlay.length > 1) {
    playSound(audioPlan.notesToPlay);
  }
}

function getSelectedMelodyForDemoControls() {
  const selectedMelodyId = dom.melodySelector.value;
  if (!selectedMelodyId) {
    setResultMessage('Select a melody first.', 'error');
    return null;
  }
  const baseMelody = getMelodyById(selectedMelodyId, state.currentInstrument);
  if (!baseMelody) {
    setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
    return null;
  }
  const melody = getMelodyWithPracticeAdjustments(
    baseMelody,
    state.melodyTransposeSemitones,
    state.melodyStringShift,
    state.currentInstrument
  );
  if (melody.events.length === 0) {
    setResultMessage('Selected melody has no playable notes.', 'error');
    return null;
  }
  return {
    melody,
    studyRange: getStoredMelodyStudyRange(melody.id, melody.events.length),
  };
}

async function ensureMelodyDemoAudioReady() {
  try {
    await loadInstrumentSoundfont(state.currentInstrument.name);
    if (state.audioContext?.state === 'suspended') {
      await state.audioContext.resume();
    }
  } catch (error) {
    showNonBlockingError(formatUserFacingError('Failed to initialize sound for melody playback', error));
  }
}

function previewMelodyDemoEvent(
  melodyEvents: MelodyEvent[],
  melodyName: string,
  event: MelodyEvent,
  eventIndex: number,
  totalEventsInRange: number,
  studyRange: MelodyStudyRange,
  options?: { label?: string; autoplaySound?: boolean }
) {
  state.melodyTimelinePreviewIndex = eventIndex;
  state.melodyTimelinePreviewLabel = options?.label ?? 'Demo';
  const fingering = getMelodyFingeredEvent(melodyEvents, eventIndex);
  const prompt = buildMelodyDemoPrompt(
    melodyName,
    event,
    eventIndex - studyRange.startIndex,
    totalEventsInRange,
    studyRange,
    melodyEvents.length,
    fingering,
    {
    label: options?.label,
    }
  );
  setPromptText(prompt.displayText);

  if ((prompt.targetMelodyEventNotes?.length ?? 0) >= 1) {
    drawFretboard(false, null, null, prompt.targetMelodyEventNotes ?? []);
  } else if (prompt.targetNote) {
    drawFretboard(false, prompt.targetNote, prompt.targetString || findPlayableStringForNote(prompt.targetNote));
  } else {
    redrawFretboard();
  }

  if (options?.autoplaySound !== false) {
    playPromptAudioFromPrompt(prompt);
  }

  renderMelodyTabTimelineFromState();
}

function seekMelodyTimelineToEvent(eventIndex: number, options?: { commit?: boolean }) {
  const selection = getSelectedMelodyForDemoControls();
  if (!selection) return;

  const { melody, studyRange } = selection;
  const clampedIndex = Math.max(
    studyRange.startIndex,
    Math.min(studyRange.endIndex, Math.round(eventIndex))
  );
  const totalEventsInRange = getMelodyStudyRangeLength(studyRange, melody.events.length);
  const event = melody.events[clampedIndex];
  if (!event) return;

  const isCommit = options?.commit === true;
  const wasPlaying = isMelodyDemoPlaying || melodyTimelineSeekResumeMode === 'playing';
  const wasPaused = isMelodyDemoPaused || melodyTimelineSeekResumeMode === 'paused';

  if (!isCommit && melodyTimelineSeekResumeMode === null) {
    if (isMelodyDemoPlaying) {
      melodyTimelineSeekResumeMode = 'playing';
    } else if (isMelodyDemoPaused) {
      melodyTimelineSeekResumeMode = 'paused';
    }
  }

  if (isMelodyDemoPlaying || isMelodyDemoPaused || melodyTimelineSeekResumeMode !== null) {
    stopMelodyDemoPlayback();
    melodyDemoNextEventIndex = clampedIndex;
    melodyStepPreviewIndex = clampedIndex;
    previewMelodyDemoEvent(melody.events, melody.name, event, clampedIndex, totalEventsInRange, studyRange, {
      label: wasPlaying ? 'Demo' : 'Pause',
      autoplaySound: false,
    });

    if (isCommit && wasPlaying) {
      isMelodyDemoPlaying = true;
      isMelodyDemoPaused = false;
      melodyTimelineSeekResumeMode = null;
      renderMelodyDemoButtonState();
      startMelodyDemoPlaybackFromIndex(selection, clampedIndex);
      return;
    }

    if (wasPaused) {
      isMelodyDemoPaused = true;
      melodyTimelineSeekResumeMode = null;
      renderMelodyDemoButtonState();
    }

    if (isCommit) {
      setResultMessage(
        `${wasPaused ? 'Demo paused at' : 'Demo repositioned to'} step ${clampedIndex - studyRange.startIndex + 1}/${totalEventsInRange}.`
      );
    } else {
      renderMelodyDemoButtonState();
    }
    return;
  }

  if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
    if (!isCommit) return;
    state.currentMelodyId = melody.id;
    if (seekActiveMelodySessionToEvent(clampedIndex)) {
      setResultMessage(
        `Positioned at step ${clampedIndex - studyRange.startIndex + 1}/${totalEventsInRange}.`
      );
    }
    melodyTimelineSeekResumeMode = null;
    return;
  }

  melodyStepPreviewIndex = clampedIndex;
  previewMelodyDemoEvent(melody.events, melody.name, event, clampedIndex, totalEventsInRange, studyRange, {
    label: 'Seek',
    autoplaySound: isCommit,
  });
  if (isCommit) {
    setResultMessage(`Preview step ${clampedIndex - studyRange.startIndex + 1}/${totalEventsInRange}.`);
  }
  melodyTimelineSeekResumeMode = null;
}

async function stepMelodyPreview(direction: -1 | 1) {
  const selection = getSelectedMelodyForDemoControls();
  if (!selection) return;
  const { melody, studyRange } = selection;
  const totalEventsInRange = getMelodyStudyRangeLength(studyRange, melody.events.length);

  if (isMelodyDemoPlaying) {
    setResultMessage('Stop demo playback before manual stepping.', 'error');
    return;
  }

  if (state.isListening) {
    stopListening();
  }

  await ensureMelodyDemoAudioReady();

  const nextIndex =
    melodyStepPreviewIndex === null
      ? studyRange.startIndex
      : Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, melodyStepPreviewIndex + direction));
  melodyStepPreviewIndex = nextIndex;

  const event = melody.events[nextIndex];
  previewMelodyDemoEvent(melody.events, melody.name, event, nextIndex, totalEventsInRange, studyRange, {
    label: 'Step',
    autoplaySound: true,
  });
  setResultMessage(
    `Step ${nextIndex - studyRange.startIndex + 1}/${totalEventsInRange}: ${melody.name} (${formatMelodyStudyRange(studyRange, melody.events.length)})`
  );
}

async function startMelodyDemoPlayback() {
  const selection = getSelectedMelodyForDemoControls();
  if (!selection) return;
  const { melody, studyRange } = selection;

  if (state.isListening) {
    stopListening();
  }
  stopMelodyDemoPlayback();
  melodyTimelineSeekResumeMode = null;
  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;

  await ensureMelodyDemoAudioReady();

  isMelodyDemoPlaying = true;
  isMelodyDemoPaused = false;
  melodyDemoNextEventIndex = studyRange.startIndex;
  renderMelodyDemoButtonState();
  setResultMessage(
    `Playing demo: ${melody.name} (${formatMelodyStudyRange(studyRange, melody.events.length)}${state.melodyLoopRangeEnabled ? ', loop' : ''})`
  );
  startMelodyDemoPlaybackFromIndex(selection, studyRange.startIndex);
}

function startMelodyDemoPlaybackFromIndex(
  selection: NonNullable<ReturnType<typeof getSelectedMelodyForDemoControls>>,
  startIndex: number
) {
  const runToken = ++melodyDemoRunToken;
  const { melody, studyRange } = selection;
  const totalEventsInRange = getMelodyStudyRangeLength(studyRange, melody.events.length);

  const playStep = (index: number) => {
    if (!isMelodyDemoPlaying || isMelodyDemoPaused || runToken !== melodyDemoRunToken) return;

    if (index > studyRange.endIndex) {
      if (state.melodyLoopRangeEnabled) {
        melodyDemoTimeoutId = null;
        melodyDemoNextEventIndex = studyRange.startIndex;
        playStep(studyRange.startIndex);
        return;
      }
      melodyDemoTimeoutId = null;
      melodyDemoNextEventIndex = studyRange.startIndex;
      isMelodyDemoPlaying = false;
      isMelodyDemoPaused = false;
      renderMelodyDemoButtonState();
      state.melodyTimelinePreviewIndex = null;
      state.melodyTimelinePreviewLabel = null;
      redrawFretboard();
      setResultMessage(
        `Demo complete: ${melody.name} (${formatMelodyStudyRange(studyRange, melody.events.length)})`,
        'success'
      );
      return;
    }

    melodyDemoNextEventIndex = index + 1;
    const event = melody.events[index];
    previewMelodyDemoEvent(melody.events, melody.name, event, index, totalEventsInRange, studyRange, {
      label: 'Demo',
      autoplaySound: true,
    });

    const stepDelayMs = getMelodyDemoStepDelayMs(event);
    melodyDemoTimeoutId = window.setTimeout(() => {
      playStep(index + 1);
    }, stepDelayMs);
  };

  playStep(Math.max(studyRange.startIndex, Math.min(studyRange.endIndex, startIndex)));
}

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
  const polyProviderLabel =
    dom.micPolyphonicDetectorProvider.selectedOptions[0]?.textContent?.trim() ?? 'Spectrum (Fast baseline)';
  if (state.micSensitivityPreset === 'auto') {
    const noiseFloorText =
      typeof state.micAutoNoiseFloorRms === 'number' ? state.micAutoNoiseFloorRms.toFixed(4) : 'n/a';
    const attackLabel = dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
    const holdLabel = dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
    dom.micNoiseGateInfo.textContent = `Mic noise gate threshold: ${threshold.toFixed(4)} (Auto; room noise floor ${noiseFloorText} RMS). Attack: ${attackLabel}; Hold: ${holdLabel}. Poly detector: ${polyProviderLabel}.`;
    return;
  }

  const presetLabel = dom.micSensitivityPreset.selectedOptions[0]?.textContent?.trim() ?? 'Normal';
  const attackLabel = dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
  const holdLabel = dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
  dom.micNoiseGateInfo.textContent = `Mic noise gate threshold: ${threshold.toFixed(4)} (${presetLabel} preset). Attack: ${attackLabel}; Hold: ${holdLabel}. Poly detector: ${polyProviderLabel}. Use Auto calibration for noisy rooms.`;
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

function isTextEntryElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function isElementWithin(target: EventTarget | null, container: HTMLElement | null | undefined) {
  return target instanceof Node && !!container && container.contains(target);
}

function isAnyBlockingModalOpen() {
  return [
    dom.settingsModal,
    dom.statsModal,
    dom.guideModal,
    dom.linksModal,
    dom.profileNameModal,
    dom.melodyImportModal,
    dom.confirmModal,
    dom.calibrationModal,
  ].some((element) => !element.classList.contains('hidden'));
}

function shouldHandleMelodyDemoHotkeys(event: KeyboardEvent) {
  if (!isMelodyWorkflowMode(dom.trainingMode.value)) return false;
  if (isTextEntryElement(event.target)) return false;
  if (isAnyBlockingModalOpen()) return false;
  return isMelodyDemoPlaying || isMelodyDemoPaused;
}

function getMelodyNoteEditorHotkeyContext(event: KeyboardEvent): 'timeline' | 'event-modal' | null {
  const target = event.target;
  const isMelodyImportOpen = !dom.melodyImportModal.classList.contains('hidden');
  if (
    isMelodyImportOpen &&
    melodyEventEditorDraft &&
    (isElementWithin(target, dom.melodyEventEditorPanel) || isElementWithin(target, dom.melodyPreviewList))
  ) {
    return 'event-modal';
  }

  if (isAnyBlockingModalOpen()) return null;
  if (
    !dom.melodyTimelineEditorPanel.classList.contains('hidden') &&
    (isElementWithin(target, dom.melodyTimelineEditorPanel) ||
      isElementWithin(target, dom.melodyTabTimelinePanel) ||
      target === document.body)
  ) {
    return 'timeline';
  }

  return null;
}

function handleMelodyNoteEditorUndoRedoHotkey(event: KeyboardEvent) {
  const context = getMelodyNoteEditorHotkeyContext(event);
  if (!context) return false;

  const isPrimaryModifier = event.ctrlKey || event.metaKey;
  if (!isPrimaryModifier) return false;

  const key = event.key.toLowerCase();
  const isUndo = key === 'z' && !event.shiftKey;
  const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
  if (!isUndo && !isRedo) return false;

  event.preventDefault();
  if (context === 'event-modal') {
    if (isUndo) {
      undoMelodyEventEditorMutation();
    } else {
      redoMelodyEventEditorMutation();
    }
    return true;
  }

  if (isUndo) {
    undoMelodyTimelineEditorMutation();
  } else {
    redoMelodyTimelineEditorMutation();
  }
  return true;
}

function handleMelodyNoteEditorActionHotkeys(event: KeyboardEvent) {
  const context = getMelodyNoteEditorHotkeyContext(event);
  if (!context || isTextEntryElement(event.target)) return false;

  if (context === 'event-modal') {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedMelodyEventEditorNote();
      return true;
    }
    return false;
  }

  if (context !== 'timeline') return false;

  const key = event.key;
  if ((key === 'Delete' || key === 'Backspace') && event.shiftKey) {
    event.preventDefault();
    deleteSelectedMelodyTimelineEvent();
    return true;
  }
  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    deleteSelectedMelodyTimelineEditorNote();
    return true;
  }
  if (key === '[') {
    event.preventDefault();
    adjustSelectedMelodyTimelineEventDuration(-1);
    return true;
  }
  if (key === ']') {
    event.preventDefault();
    adjustSelectedMelodyTimelineEventDuration(1);
    return true;
  }
  if (key === 'ArrowLeft' && event.altKey) {
    event.preventDefault();
    moveSelectedMelodyTimelineEvent(-1);
    return true;
  }
  if (key === 'ArrowRight' && event.altKey) {
    event.preventDefault();
    moveSelectedMelodyTimelineEvent(1);
    return true;
  }

  const isPrimaryModifier = event.ctrlKey || event.metaKey;
  if (isPrimaryModifier && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateSelectedMelodyTimelineEvent();
    return true;
  }

  return false;
}

export function refreshMelodyOptionsForCurrentInstrument() {
  clearMelodyTransposeCache();
  clearMelodyStringShiftCache();
  const melodies = listMelodiesForInstrument(state.currentInstrument);
  const previousValue = state.preferredMelodyId ?? dom.melodySelector.value;
  dom.melodySelector.innerHTML = '';

  melodies.forEach((melody) => {
    const option = document.createElement('option');
    option.value = melody.id;
    option.textContent = formatMelodySelectorOptionLabel(
      melody,
      getStoredMelodyTransposeSemitones(melody.id)
    );
    dom.melodySelector.append(option);
  });

  const hasPrevious = melodies.some((melody) => melody.id === previousValue);
  if (hasPrevious) {
    dom.melodySelector.value = previousValue;
  } else if (melodies.length > 0) {
    dom.melodySelector.value = melodies[0].id;
  }

  state.preferredMelodyId = dom.melodySelector.value || null;
  hydrateMelodyTransposeForSelectedMelody({ migrateLegacyValue: true });
  hydrateMelodyStringShiftForSelectedMelody();
  hydrateMelodyStudyRangeForSelectedMelody();
  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  updateMelodyActionButtonsForSelection();
  renderMelodyTabTimelineFromState();
}

function finalizeMelodyImportSelection(melodyId: string, successMessage: string) {
  resetMelodyTimelineEditorState();
  refreshMelodyOptionsForCurrentInstrument();
  dom.melodySelector.value = melodyId;
  state.preferredMelodyId = melodyId;
  hydrateMelodyTransposeForSelectedMelody();
  hydrateMelodyStringShiftForSelectedMelody();
  hydrateMelodyStudyRangeForSelectedMelody();
  melodyStepPreviewIndex = null;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  updateMelodyActionButtonsForSelection();
  dom.melodyNameInput.value = '';
  dom.melodyAsciiTabInput.value = '';
  setModalVisible('melodyImport', false);
  resetMelodyEditorDraft();
  updateMelodyEditorUiForCurrentMode();
  markCurriculumPresetAsCustom();
  updatePracticeSetupSummary();
  saveSettings();
  setResultMessage(successMessage, 'success');
  refreshMelodyTimelineUi();
}

function downloadBytesAsFile(bytes: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

async function exportSelectedMelodyAsMidi() {
  const selectedMelodyId = dom.melodySelector.value;
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!melody || melody.source !== 'custom') {
    throw new Error('Select a custom melody to export MIDI.');
  }

  const bytes = await exportMelodyToMidiBytes(melody, state.currentInstrument, {
    bpm: melody.sourceTempoBpm ?? undefined,
  });
  downloadBytesAsFile(bytes, buildExportMidiFileName(melody.name), 'audio/midi');
}

async function exportSelectedPracticeAdjustedMelodyAsMidi() {
  const selectedMelodyId = dom.melodySelector.value;
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  if (!melody) {
    throw new Error('Select a melody to export adjusted practice MIDI.');
  }

  const adjustedMelody = getMelodyWithPracticeAdjustments(
    melody,
    state.melodyTransposeSemitones,
    state.melodyStringShift,
    state.currentInstrument
  );
  if (adjustedMelody.events.length === 0) {
    throw new Error('Selected melody has no playable notes after practice adjustments.');
  }

  const parsedDemoBpm = Number.parseInt(dom.melodyDemoBpm.value, 10);
  const exportBpm = Number.isFinite(parsedDemoBpm) ? parsedDemoBpm : adjustedMelody.sourceTempoBpm ?? undefined;
  const bytes = await exportMelodyToMidiBytes(adjustedMelody, state.currentInstrument, {
    bpm: exportBpm,
  });
  downloadBytesAsFile(
    bytes,
    buildPracticeAdjustedMidiFileName(melody.name, {
      transposeSemitones: state.melodyTransposeSemitones,
      stringShift: state.melodyStringShift,
      bpm: exportBpm,
    }),
    'audio/midi'
  );
}

function resetMelodyGpFileInput() {
  dom.melodyGpFileInput.value = '';
}

function resetMelodyMidiFileInput() {
  dom.melodyMidiFileInput.value = '';
}

function updateMelodyActionButtonsForSelection() {
  const selectedMelodyId = dom.melodySelector.value;
  const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
  const transposedMelody = melody
    ? getMelodyWithPracticeAdjustments(melody, state.melodyTransposeSemitones, 0, state.currentInstrument)
    : null;
  const adjustedMelody = melody
    ? getMelodyWithPracticeAdjustments(
        melody,
        state.melodyTransposeSemitones,
        state.melodyStringShift,
        state.currentInstrument
      )
    : null;
  const customMelodies = listMelodiesForInstrument(state.currentInstrument).filter(
    (entry) => entry.source === 'custom'
  );
  dom.melodyPlaybackControls.classList.toggle('hidden', !isMelodyWorkflowMode(dom.trainingMode.value));
  dom.editMelodyBtn.disabled = !melody || (melody.source !== 'custom' && typeof melody.tabText !== 'string');
  dom.exportMelodyMidiBtn.disabled = !melody || melody.source !== 'custom';
  dom.exportPracticeMelodyMidiBtn.disabled = !adjustedMelody || adjustedMelody.events.length === 0;
  dom.melodyDemoBtn.disabled = !melody;
  const canStep = Boolean(melody) && !isMelodyDemoPlaying && !isMelodyDemoPaused;
  dom.melodyStepBackBtn.disabled = !canStep;
  dom.melodyStepForwardBtn.disabled = !canStep;
  dom.melodyTransposeResetBtn.disabled = !melody || state.melodyTransposeSemitones === 0;
  dom.melodyStringShiftResetBtn.disabled = !melody || state.melodyStringShift === 0;
  dom.melodyTransposeBatchCustomBtn.disabled = customMelodies.length === 0;
  dom.melodyStringShift.disabled = !melody;
  dom.melodyStringShiftDownBtn.disabled =
    !transposedMelody ||
    !isMelodyStringShiftFeasible(transposedMelody, state.melodyStringShift - 1, state.currentInstrument);
  dom.melodyStringShiftUpBtn.disabled =
    !transposedMelody ||
    !isMelodyStringShiftFeasible(transposedMelody, state.melodyStringShift + 1, state.currentInstrument);
  dom.melodyStudyStart.disabled = !melody;
  dom.melodyStudyEnd.disabled = !melody;
  dom.melodyStudyResetBtn.disabled =
    !melody ||
    isDefaultMelodyStudyRange(
      { startIndex: state.melodyStudyRangeStartIndex, endIndex: state.melodyStudyRangeEndIndex },
      melody.events.length
    );
  dom.deleteMelodyBtn.disabled = !isCustomMelodyId(selectedMelodyId);
  renderMelodyTabTimelineFromState();
}

async function applyCurrentTransposeToAllCustomMelodies() {
  const customMelodies = listMelodiesForInstrument(state.currentInstrument).filter(
    (entry) => entry.source === 'custom'
  );
  if (customMelodies.length === 0) {
    setResultMessage('No custom melodies available for batch transpose.', 'error');
    return;
  }

  const transposeText = formatMelodyTransposeSemitones(state.melodyTransposeSemitones);
  const confirmed = await confirmUserAction(
    state.melodyTransposeSemitones === 0
      ? `Reset transpose for all ${customMelodies.length} custom melodies?`
      : `Set transpose ${transposeText} for all ${customMelodies.length} custom melodies?`
  );
  if (!confirmed) return;

  if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
    stopListening();
  }

  customMelodies.forEach((melody) => {
    setStoredMelodyTransposeSemitones(melody.id, state.melodyTransposeSemitones);
  });

  hydrateMelodyTransposeForSelectedMelody();
  updateMelodyActionButtonsForSelection();
  updatePracticeSetupSummary();
  saveSettings();
  redrawFretboard();
  setResultMessage(
    state.melodyTransposeSemitones === 0
      ? `Reset transpose for ${customMelodies.length} custom melodies.`
      : `Set transpose ${transposeText} for ${customMelodies.length} custom melodies.`,
    'success'
  );
}

function resetMelodyEditorDraft() {
  state.melodyEditorMode = 'create';
  state.editingMelodyId = null;
  clearPendingGpImportDraft();
  clearPendingMidiImportDraft();
  clearMelodyEditorPreview();
}

function updateMelodyEditorUiForCurrentMode() {
  const mode = state.melodyEditorMode;
  const isStructuredEventEditor = melodyEventEditorDraft !== null;
  dom.melodyAsciiTabInput.disabled = isStructuredEventEditor;
  dom.melodyAsciiTabInput.classList.toggle('opacity-50', isStructuredEventEditor);
  dom.importMelodyGpBtn.disabled = mode === 'edit-custom';
  dom.importMelodyMidiBtn.disabled = mode === 'edit-custom';

  if (mode === 'edit-custom') {
    dom.melodyImportTitle.textContent = isStructuredEventEditor ? 'Edit Custom Melody Notes' : 'Edit Custom Melody';
    dom.melodyImportHelpText.textContent = isStructuredEventEditor
      ? 'Edit note positions directly in the preview list. Undo/redo is available before saving.'
      : 'Edit the ASCII tab for your custom melody. Keep numbered string labels and spacing/dashes to control note timing.';
    dom.importMelodyBtn.textContent = 'Save Changes';
    return;
  }

  if (mode === 'duplicate-builtin') {
    dom.melodyImportTitle.textContent = 'Duplicate Melody as Custom';
    dom.melodyImportHelpText.textContent =
      'This will create a new custom copy. You can rearrange notes freely by editing the ASCII tab.';
    dom.importMelodyBtn.textContent = 'Save Custom Copy';
    return;
  }

  dom.melodyImportTitle.textContent = 'Import Melody from ASCII Tab';
  dom.melodyImportHelpText.innerHTML =
    'Paste monophonic ASCII tabs with numbered string labels, for example: ' +
    '<code class="text-cyan-200">1 string 0---5---8---</code>, or use <strong class="text-violet-200">Import GP...</strong>.';
  dom.importMelodyBtn.textContent = 'Import Melody';
}

function openMelodyEditorModal(options?: { mode?: 'create' | 'edit-custom' | 'duplicate-builtin' }) {
  const mode = options?.mode ?? 'create';
  const selectedMelodyId = dom.melodySelector.value;

  if (mode === 'create') {
    resetMelodyEditorDraft();
    dom.melodyNameInput.value = '';
    dom.melodyAsciiTabInput.value = '';
    updateMelodyEditorUiForCurrentMode();
    updateMelodyEditorPreview();
    setModalVisible('melodyImport', true);
    dom.melodyNameInput.focus();
    return;
  }

  if (!selectedMelodyId) {
    setResultMessage('Select a melody first.');
    return;
  }

  const melody = getMelodyById(selectedMelodyId, state.currentInstrument);
  if (!melody) {
    setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
    return;
  }
  if (!melody.tabText && melody.source !== 'custom') {
    setResultMessage('This melody cannot be edited because its ASCII tab source is unavailable.', 'error');
    return;
  }

  state.melodyEditorMode = melody.source === 'custom' ? 'edit-custom' : 'duplicate-builtin';
  state.editingMelodyId = melody.source === 'custom' ? melody.id : null;
  dom.melodyNameInput.value =
    melody.source === 'custom' ? melody.name : `${melody.name} (Custom)`;
  dom.melodyAsciiTabInput.value = melody.tabText ?? '';
  if (melody.source === 'custom' && !melody.tabText) {
    renderMelodyEditorPreviewFromEvents(melody.events, {
      statusText: 'Structured melody loaded',
      summaryPrefix: melody.sourceFormat?.toUpperCase() ?? 'EVENTS',
      editableEvents: true,
      metadata: {
        sourceFormat: melody.sourceFormat,
        sourceFileName: melody.sourceFileName,
        sourceTrackName: melody.sourceTrackName,
        sourceScoreTitle: melody.sourceScoreTitle,
        sourceTempoBpm: melody.sourceTempoBpm,
      },
    });
  } else {
    updateMelodyEditorPreview();
  }
  updateMelodyEditorUiForCurrentMode();
  setModalVisible('melodyImport', true);
  dom.melodyNameInput.focus();
  dom.melodyNameInput.select();
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
  syncMetronomeBpmDisplay();
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
  } else if (dom.trainingMode.value === 'chords') {
    modeDetail = ` | ${dom.chordSelector.value}`;
  } else if (dom.trainingMode.value === 'progressions') {
    modeDetail = ` | ${dom.progressionSelector.value}`;
  } else if (dom.trainingMode.value === 'arpeggios') {
    modeDetail = ` | ${dom.arpeggioPatternSelector.selectedOptions[0]?.textContent?.trim() ?? dom.arpeggioPatternSelector.value}`;
  }

  const practiceSummary = `${modeLabel}${modeDetail} | ${difficultyLabel}`;
  setPracticeSetupSummary(practiceSummary);
  setSessionToolsSummary(
    `Frets ${fretRange} | Strings ${enabledStringsCount}/${totalStringsCount} | ${goalLabel} | Pace: ${paceLabel} | ${curriculumLabel}`
  );

  if (isMelodyWorkflowMode(dom.trainingMode.value)) {
    const melodyLabel =
      dom.melodySelector.selectedOptions[0]?.textContent?.trim() ?? dom.melodySelector.value;
    const selectedMelody = dom.melodySelector.value
      ? getMelodyById(dom.melodySelector.value, state.currentInstrument)
      : null;
    const studyRangeText = selectedMelody
      ? formatMelodyStudyRange(
          getStoredMelodyStudyRange(selectedMelody.id, selectedMelody.events.length),
          selectedMelody.events.length
        )
      : 'No steps';
    const modePrefix = dom.trainingMode.value === 'performance' ? 'Performance' : 'Melody';
    const melodySummary = `${modePrefix}: ${melodyLabel || 'No melody selected'} | Transpose ${formatMelodyTransposeSemitones(state.melodyTransposeSemitones)} | Shift ${formatMelodyStringShift(state.melodyStringShift)} | ${studyRangeText} | ${state.melodyLoopRangeEnabled ? 'Loop On' : 'Loop Off'} | ${dom.melodyShowNote.checked ? 'Hint On' : 'Blind'}`;
    setMelodySetupSummary(melodySummary);
    return;
  }

  setMelodySetupSummary('');
}

function refreshMelodyTimelineUi() {
  renderMelodyTabTimelineFromState();
  renderMelodyTimelineEditorPanel();
}

async function startSessionFromUi() {
  if (!(await ensureRhythmModeMetronome())) return;
  state.melodyTimelinePreviewIndex = null;
  state.melodyTimelinePreviewLabel = null;
  refreshMelodyTimelineUi();
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
  dom.melodyDemoBpm.value = String(getClampedMelodyDemoBpmFromInput());
  state.melodyTransposeById = state.melodyTransposeById ?? {};
  state.melodyStringShiftById = state.melodyStringShiftById ?? {};
  state.melodyStudyRangeById = state.melodyStudyRangeById ?? {};
  syncMelodyLoopRangeDisplay();
  dom.timelineViewMode.value = state.melodyTimelineViewMode;
  dom.showTimelineSteps.checked = state.showMelodyTimelineSteps;
  dom.showTimelineDetails.checked = state.showMelodyTimelineDetails;
  syncMetronomeBpmDisplay();
  syncMelodyDemoBpmDisplay();
  refreshMelodyOptionsForCurrentInstrument();
  setMelodyTimelineStudyRangeCommitHandler(({ melodyId, range }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    commitMelodyStudyRangeChange(range, {
      stopMessage: 'Study range adjusted. Session stopped; press Start to continue.',
    });
  });
  setMelodyTimelineNoteSelectHandler(({ melodyId, eventIndex, noteIndex }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    selectTimelineMelodyEditorNote(eventIndex, noteIndex);
  });
  setMelodyTimelineNoteDragHandler(({ melodyId, eventIndex, noteIndex, stringName, commit }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    if (!commit) return;
    selectTimelineMelodyEditorNote(eventIndex, noteIndex);
    try {
      moveSelectedMelodyTimelineEditorNoteToString(stringName, { commit });
    } catch (error) {
      if (isIgnorableMelodyTimelineNoteDragError(error)) return;
      showNonBlockingError(formatUserFacingError('Failed to drag note to a new string', error));
    }
  });
  setMelodyTimelineEventDragHandler(({ melodyId, sourceEventIndex, targetEventIndex, commit }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    if (!commit) return;
    const eligibility = canEditSelectedMelodyOnTimeline();
    if (!eligibility.editable) return;
    ensureMelodyTimelineEditorDraftLoaded(eligibility.melody);
    state.melodyTimelineSelectedEventIndex = sourceEventIndex;
    ensureMelodyTimelineEditorSelection();
    try {
      moveSelectedMelodyTimelineEventToIndex(targetEventIndex);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to reorder event on the timeline', error));
    }
  });
  setMelodyTimelineSeekHandler(({ melodyId, eventIndex, commit }) => {
    if (melodyId !== getSelectedMelodyId()) return;
    seekMelodyTimelineToEvent(eventIndex, { commit });
  });
  resetMelodyEditorDraft();
  updateMelodyEditorUiForCurrentMode();
  renderMelodyDemoButtonState();
  resetMetronomeVisualIndicator();
  updateMicNoiseGateInfo();
  refreshMicPolyphonicDetectorAudioInfoUi();
  updatePracticeSetupSummary();
  renderMelodyTimelineEditorPanel();
  refreshInputSourceAvailabilityUi();
  setPracticeSetupCollapsed(window.innerWidth < 900);
  void refreshAudioInputDeviceOptions();
  void refreshMidiInputDevices(false);
  dom.closeMelodyImportBtn.addEventListener('click', () => {
    setModalVisible('melodyImport', false);
    resetMelodyGpFileInput();
    resetMelodyMidiFileInput();
    resetMelodyEditorDraft();
    updateMelodyEditorUiForCurrentMode();
  });
  dom.cancelMelodyImportBtn.addEventListener('click', () => {
    setModalVisible('melodyImport', false);
    resetMelodyGpFileInput();
    resetMelodyMidiFileInput();
    resetMelodyEditorDraft();
    updateMelodyEditorUiForCurrentMode();
  });
  dom.melodyImportModal.addEventListener('click', (e) => {
    if (e.target === dom.melodyImportModal) {
      setModalVisible('melodyImport', false);
      resetMelodyGpFileInput();
      resetMelodyMidiFileInput();
      resetMelodyEditorDraft();
      updateMelodyEditorUiForCurrentMode();
    }
  });

  dom.practiceSetupToggleBtn.addEventListener('click', () => {
    togglePracticeSetupCollapsed();
  });
  dom.melodySetupToggleBtn.addEventListener('click', () => {
    toggleMelodySetupCollapsed();
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
    if (isMelodyDemoPlaying || isMelodyDemoPaused) {
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody demo stopped.' });
      return;
    }
    if (!dom.stopBtn.disabled) {
      stopListening();
      return;
    }

    await startSessionFromUi();
  });

  dom.startBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    await startSessionFromUi();
  });

  dom.stopBtn.addEventListener('click', () => {
    stopListening();
  });

  // --- Top Control Bar Listeners ---
  dom.instrumentSelector.addEventListener('change', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    resetMelodyTimelineEditorState();
    state.currentInstrument = instruments[dom.instrumentSelector.value];
    state.currentTuningPresetKey = dom.tuningPreset.value;
    updateInstrumentUI(); // Redraw strings, fretboard, etc.
    refreshMelodyOptionsForCurrentInstrument();
    updatePracticeSetupSummary();
    await loadInstrumentSoundfont(state.currentInstrument.name);
    saveSettings();
    refreshMelodyTimelineUi();
  });

  dom.tuningPreset.addEventListener('change', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    resetMelodyTimelineEditorState();
    if (state.isListening) {
      stopListening();
    }

    state.currentTuningPresetKey = dom.tuningPreset.value;
    const enabledStrings = Array.from(getEnabledStrings(dom.stringSelector));
    updateInstrumentUI(enabledStrings, state.currentTuningPresetKey);
    updatePracticeSetupSummary();
    saveSettings();
    setResultMessage(`Tuning set: ${dom.tuningPreset.selectedOptions[0]?.textContent ?? dom.tuningPreset.value}`);
    refreshMelodyTimelineUi();
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
  dom.showTimelineSteps.addEventListener('change', () => {
    state.showMelodyTimelineSteps = dom.showTimelineSteps.checked;
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.showTimelineDetails.addEventListener('change', () => {
    state.showMelodyTimelineDetails = dom.showTimelineDetails.checked;
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.timelineViewMode.addEventListener('change', () => {
    state.melodyTimelineViewMode = dom.timelineViewMode.value === 'grid' ? 'grid' : 'classic';
    dom.timelineViewMode.value = state.melodyTimelineViewMode;
    saveSettings();
    refreshMelodyTimelineUi();
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
  dom.micPolyphonicDetectorProvider.addEventListener('change', () => {
    state.micPolyphonicDetectorProvider = normalizeMicPolyphonicDetectorProvider(
      dom.micPolyphonicDetectorProvider.value
    );
    dom.micPolyphonicDetectorProvider.value = state.micPolyphonicDetectorProvider;
    state.lastMicPolyphonicDetectorProviderUsed = null;
    state.lastMicPolyphonicDetectorFallbackFrom = null;
    state.lastMicPolyphonicDetectorWarning = null;
    state.micPolyphonicDetectorTelemetryFrames = 0;
    state.micPolyphonicDetectorTelemetryTotalLatencyMs = 0;
    state.micPolyphonicDetectorTelemetryMaxLatencyMs = 0;
    state.micPolyphonicDetectorTelemetryLastLatencyMs = null;
    state.micPolyphonicDetectorTelemetryFallbackFrames = 0;
    state.micPolyphonicDetectorTelemetryWarningFrames = 0;
    state.micPolyphonicDetectorTelemetryWindowStartedAtMs = 0;
    state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = 0;
    updateMicNoiseGateInfo();
    refreshMicPolyphonicDetectorAudioInfoUi();
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
      refreshMicPolyphonicDetectorAudioInfoUi();
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
    stopMelodyDemoPlayback({ clearUi: true });
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
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    handleModeChange();
    updatePracticeSetupSummary();
    saveSettings();
    renderMelodyTimelineEditorPanel();
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
    stopMelodyDemoPlayback({ clearUi: true });
    markCurriculumPresetAsCustom();
    state.preferredMelodyId = dom.melodySelector.value || null;
    resetMelodyTimelineEditorState();
    hydrateMelodyTransposeForSelectedMelody();
    hydrateMelodyStringShiftForSelectedMelody();
    hydrateMelodyStudyRangeForSelectedMelody();
    melodyStepPreviewIndex = null;
    updateMelodyActionButtonsForSelection();
    if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
      stopListening();
      setResultMessage('Melody changed. Session stopped; press Start to begin from the first event.');
    }
    updatePracticeSetupSummary();
    saveSettings();
    refreshMelodyTimelineUi();
  });
  dom.melodyTranspose.addEventListener('input', () => {
    handleMelodyTransposeInputChange();
  });
  dom.melodyTranspose.addEventListener('change', () => {
    handleMelodyTransposeInputChange();
  });
  dom.melodyTransposeDownBtn.addEventListener('click', () => {
    dom.melodyTranspose.value = String(
      normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones - 1)
    );
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeUpBtn.addEventListener('click', () => {
    dom.melodyTranspose.value = String(
      normalizeMelodyTransposeSemitones(state.melodyTransposeSemitones + 1)
    );
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeResetBtn.addEventListener('click', () => {
    if (state.melodyTransposeSemitones === 0) return;
    dom.melodyTranspose.value = '0';
    dom.melodyTranspose.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShift.addEventListener('input', () => {
    handleMelodyStringShiftInputChange();
  });
  dom.melodyStringShift.addEventListener('change', () => {
    handleMelodyStringShiftInputChange();
  });
  dom.melodyStringShiftDownBtn.addEventListener('click', () => {
    dom.melodyStringShift.value = String(
      normalizeMelodyStringShift(state.melodyStringShift - 1, state.currentInstrument)
    );
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShiftUpBtn.addEventListener('click', () => {
    dom.melodyStringShift.value = String(
      normalizeMelodyStringShift(state.melodyStringShift + 1, state.currentInstrument)
    );
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyStringShiftResetBtn.addEventListener('click', () => {
    if (state.melodyStringShift === 0) return;
    dom.melodyStringShift.value = '0';
    dom.melodyStringShift.dispatchEvent(new Event('input'));
  });
  dom.melodyTransposeBatchCustomBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    await applyCurrentTransposeToAllCustomMelodies();
  });
  dom.melodyStudyStart.addEventListener('change', () => {
    commitMelodyStudyRangeChange(
      {
        startIndex: Number.parseInt(dom.melodyStudyStart.value, 10) - 1,
        endIndex: Number.parseInt(dom.melodyStudyEnd.value, 10) - 1,
      },
      {
        stopMessage: 'Study range changed. Session stopped; press Start to continue.',
      }
    );
  });
  dom.melodyStudyEnd.addEventListener('change', () => {
    dom.melodyStudyStart.dispatchEvent(new Event('change'));
  });
  dom.melodyStudyResetBtn.addEventListener('click', () => {
    const selectedMelodyId = getSelectedMelodyId();
    const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, state.currentInstrument) : null;
    if (!melody) return;
    const fullRange = buildDefaultMelodyStudyRange(melody.events.length);
    dom.melodyStudyStart.value = String(fullRange.startIndex + 1);
    dom.melodyStudyEnd.value = String(fullRange.endIndex + 1);
    dom.melodyStudyStart.dispatchEvent(new Event('change'));
  });
  dom.melodyShowNote.addEventListener('change', () => {
    markCurriculumPresetAsCustom();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodyLoopRange.addEventListener('change', () => {
    state.melodyLoopRangeEnabled = dom.melodyLoopRange.checked;
    syncMelodyLoopRangeDisplay();
    updatePracticeSetupSummary();
    saveSettings();
  });
  dom.melodyAsciiTabInput.addEventListener('input', () => {
    scheduleMelodyEditorPreviewUpdate();
  });
  dom.melodyNameInput.addEventListener('input', () => {
    if (!dom.melodyAsciiTabInput.value.trim()) {
      updateMelodyEditorPreview();
    }
  });
  dom.melodyDemoBpm.addEventListener('input', () => {
    getClampedMelodyDemoBpmFromInput();
  });
  dom.openMelodyImportBtn.addEventListener('click', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    openMelodyEditorModal({ mode: 'create' });
  });
  dom.importMelodyGpBtn.addEventListener('click', () => {
    dom.melodyGpFileInput.click();
  });
  dom.importMelodyMidiBtn.addEventListener('click', () => {
    dom.melodyMidiFileInput.click();
  });
  dom.melodyGpFileInput.addEventListener('change', async () => {
    const file = dom.melodyGpFileInput.files?.[0];
    if (!file) return;

    const originalLabel = dom.importMelodyGpBtn.textContent ?? 'Import GP...';
    dom.importMelodyGpBtn.disabled = true;
    dom.importMelodyGpBtn.textContent = 'Importing...';

    try {
      stopMelodyDemoPlayback({ clearUi: true });
      await loadGpImportDraftFromFile(file);
      setResultMessage('GP file parsed. Review the preview, choose a track, then save.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to import Guitar Pro file', error));
    } finally {
      dom.importMelodyGpBtn.disabled = false;
      dom.importMelodyGpBtn.textContent = originalLabel;
      resetMelodyGpFileInput();
    }
  });
  dom.melodyMidiFileInput.addEventListener('change', async () => {
    const file = dom.melodyMidiFileInput.files?.[0];
    if (!file) return;

    const originalLabel = dom.importMelodyMidiBtn.textContent ?? 'Import MIDI...';
    dom.importMelodyMidiBtn.disabled = true;
    dom.importMelodyMidiBtn.textContent = 'Importing...';

    try {
      stopMelodyDemoPlayback({ clearUi: true });
      await loadMidiImportDraftFromFile(file);
      setResultMessage('MIDI file parsed. Review the preview, choose a track, then save.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to import MIDI file', error));
    } finally {
      dom.importMelodyMidiBtn.disabled = false;
      dom.importMelodyMidiBtn.textContent = originalLabel;
      resetMelodyMidiFileInput();
    }
  });
  dom.melodyMidiTrackSelector.addEventListener('change', () => {
    try {
      refreshMidiTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('MIDI track preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to preview selected MIDI track', error));
    }
  });
  dom.melodyMidiQuantize.addEventListener('change', () => {
    if (!pendingMidiImport) return;
    try {
      refreshMidiTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('MIDI quantized preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to apply MIDI quantize preview', error));
    }
  });
  dom.saveMelodyMidiTrackBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      savePendingMidiImportedTrack();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save imported MIDI track', error));
    }
  });
  dom.melodyGpTrackSelector.addEventListener('change', () => {
    try {
      refreshGpTrackPreviewFromSelection();
    } catch (error) {
      renderMelodyEditorPreviewError('GP track preview failed', error);
      showNonBlockingError(formatUserFacingError('Failed to preview selected GP track', error));
    }
  });
  dom.saveMelodyGpTrackBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      savePendingGpImportedTrack();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save imported GP track', error));
    }
  });
  dom.melodyEventEditorString.addEventListener('change', () => {
    try {
      const fretValue = Number.parseInt(dom.melodyEventEditorFret.value, 10);
      updateSelectedMelodyEventEditorNotePosition(
        dom.melodyEventEditorString.value,
        Number.isFinite(fretValue) ? fretValue : 0
      );
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update note string', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorFret.addEventListener('input', () => {
    const parsed = Number.parseInt(dom.melodyEventEditorFret.value, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(parsed)));
    dom.melodyEventEditorFret.value = String(clamped);
    try {
      updateSelectedMelodyEventEditorNotePosition(dom.melodyEventEditorString.value, clamped);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update note fret', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorAddBtn.addEventListener('click', () => {
    try {
      addMelodyEventEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to add note', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorDeleteBtn.addEventListener('click', () => {
    try {
      deleteSelectedMelodyEventEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to delete note', error));
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyEventEditorUndoBtn.addEventListener('click', () => {
    undoMelodyEventEditorMutation();
  });
  dom.melodyEventEditorRedoBtn.addEventListener('click', () => {
    redoMelodyEventEditorMutation();
  });
  dom.melodyTimelineEditorString.addEventListener('change', () => {
    try {
      const fretValue = Number.parseInt(dom.melodyTimelineEditorFret.value, 10);
      updateSelectedMelodyTimelineEditorNotePosition(
        dom.melodyTimelineEditorString.value,
        Number.isFinite(fretValue) ? fretValue : 0
      );
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update timeline note string', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorFret.addEventListener('input', () => {
    const parsed = Number.parseInt(dom.melodyTimelineEditorFret.value, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(parsed)));
    dom.melodyTimelineEditorFret.value = String(clamped);
    try {
      updateSelectedMelodyTimelineEditorNotePosition(dom.melodyTimelineEditorString.value, clamped);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to update timeline note fret', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorAddBtn.addEventListener('click', () => {
    try {
      addMelodyTimelineEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to add timeline note', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorAddEventBtn.addEventListener('click', () => {
    try {
      addMelodyTimelineEditorEventAfterSelection();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to add event', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorDuplicateEventBtn.addEventListener('click', () => {
    try {
      duplicateSelectedMelodyTimelineEvent();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to duplicate event', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorMoveEventLeftBtn.addEventListener('click', () => {
    try {
      moveSelectedMelodyTimelineEvent(-1);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to move event earlier', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorMoveEventRightBtn.addEventListener('click', () => {
    try {
      moveSelectedMelodyTimelineEvent(1);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to move event later', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorSplitEventBtn.addEventListener('click', () => {
    try {
      splitSelectedMelodyTimelineEvent();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to split event', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorMergeEventBtn.addEventListener('click', () => {
    try {
      mergeSelectedMelodyTimelineEventWithNext();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to merge events', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorDeleteEventBtn.addEventListener('click', () => {
    try {
      deleteSelectedMelodyTimelineEvent();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to delete event', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorDeleteBtn.addEventListener('click', () => {
    try {
      deleteSelectedMelodyTimelineEditorNote();
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to delete timeline note', error));
      renderMelodyTimelineEditorPanel();
    }
  });
  dom.melodyTimelineEditorUndoBtn.addEventListener('click', () => {
    undoMelodyTimelineEditorMutation();
  });
  dom.melodyTimelineEditorRedoBtn.addEventListener('click', () => {
    redoMelodyTimelineEditorMutation();
  });
  dom.melodyTimelineEditorDurationDownBtn.addEventListener('click', () => {
    try {
      adjustSelectedMelodyTimelineEventDuration(-1);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to decrease event duration', error));
    }
  });
  dom.melodyTimelineEditorDurationUpBtn.addEventListener('click', () => {
    try {
      adjustSelectedMelodyTimelineEventDuration(1);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to increase event duration', error));
    }
  });
  dom.editMelodyBtn.addEventListener('click', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    openMelodyEditorModal({ mode: 'edit-custom' });
  });
  dom.exportMelodyMidiBtn.addEventListener('click', async () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
        stopListening();
      }
      await exportSelectedMelodyAsMidi();
      setResultMessage('MIDI file exported.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to export MIDI file', error));
    }
  });
  dom.exportPracticeMelodyMidiBtn.addEventListener('click', async () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      if (state.isListening && isMelodyWorkflowMode(dom.trainingMode.value)) {
        stopListening();
      }
      await exportSelectedPracticeAdjustedMelodyAsMidi();
      setResultMessage('Adjusted practice MIDI exported.', 'success');
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to export adjusted practice MIDI', error));
    }
  });
  dom.melodyDemoBtn.addEventListener('click', async () => {
    if (isMelodyDemoPlaying || isMelodyDemoPaused) {
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody demo stopped.' });
      return;
    }
    setPracticeSetupCollapsed(true);
    await startMelodyDemoPlayback();
  });
  dom.melodyPauseDemoBtn.addEventListener('click', async () => {
    if (isMelodyDemoPlaying) {
      pauseMelodyDemoPlayback();
      return;
    }
    if (isMelodyDemoPaused) {
      await resumeMelodyDemoPlayback();
    }
  });
  document.addEventListener('keydown', async (event) => {
    if (!shouldHandleMelodyDemoHotkeys(event)) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (isMelodyDemoPlaying) {
        pauseMelodyDemoPlayback();
      } else if (isMelodyDemoPaused) {
        await resumeMelodyDemoPlayback();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody demo stopped.' });
    }
  });
  document.addEventListener('keydown', (event) => {
    try {
      if (handleMelodyNoteEditorUndoRedoHotkey(event)) return;
      handleMelodyNoteEditorActionHotkeys(event);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Melody editor shortcut failed', error));
      renderMelodyTimelineEditorPanel();
      renderMelodyEventEditorInspector();
    }
  });
  dom.melodyStepBackBtn.addEventListener('click', async () => {
    await stepMelodyPreview(-1);
  });
  dom.melodyStepForwardBtn.addEventListener('click', async () => {
    await stepMelodyPreview(1);
  });
  dom.importMelodyBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      let melodyId: string;
      let successMessage = 'Custom melody imported from ASCII tab.';

      if (melodyEventEditorDraft) {
        const melodyName = dom.melodyNameInput.value.trim();
        const sourceMetadata = melodyEventEditorSourceMetadata ?? undefined;
        const formatLabel = sourceMetadata?.sourceFormat?.toUpperCase() ?? 'EVENTS';
        if (state.melodyEditorMode === 'edit-custom' && state.editingMelodyId) {
          melodyId = updateCustomEventMelody(
            state.editingMelodyId,
            melodyName,
            melodyEventEditorDraft,
            state.currentInstrument,
            sourceMetadata
          );
          successMessage = 'Custom melody updated.';
        } else {
          melodyId = saveCustomEventMelody(melodyName, melodyEventEditorDraft, state.currentInstrument, sourceMetadata);
          successMessage =
            state.melodyEditorMode === 'duplicate-builtin'
              ? 'Built-in melody duplicated and saved as custom.'
              : `Custom melody imported from ${formatLabel}.`;
        }
        finalizeMelodyImportSelection(melodyId, successMessage);
        return;
      }

      if (state.melodyEditorMode === 'edit-custom' && state.editingMelodyId) {
        melodyId = updateCustomAsciiTabMelody(
          state.editingMelodyId,
          dom.melodyNameInput.value,
          dom.melodyAsciiTabInput.value,
          state.currentInstrument
        );
        successMessage = 'Custom melody updated.';
      } else {
        melodyId = saveCustomAsciiTabMelody(
          dom.melodyNameInput.value,
          dom.melodyAsciiTabInput.value,
          state.currentInstrument
        );
        successMessage =
          state.melodyEditorMode === 'duplicate-builtin'
            ? 'Built-in melody duplicated and saved as custom.'
            : 'Custom melody imported from ASCII tab.';
      }
      finalizeMelodyImportSelection(melodyId, successMessage);
    } catch (error) {
      showNonBlockingError(formatUserFacingError('Failed to save melody from ASCII tab', error));
    }
  });
  dom.deleteMelodyBtn.addEventListener('click', async () => {
    stopMelodyDemoPlayback({ clearUi: true });
    const selectedId = dom.melodySelector.value;
    if (!isCustomMelodyId(selectedId)) return;

    const confirmed = await confirmUserAction('Delete selected custom melody from the local library?');
    if (!confirmed) return;

    const deleted = deleteCustomMelody(selectedId);
    refreshMelodyOptionsForCurrentInstrument();
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

    if ((prompt.targetMelodyEventNotes?.length ?? 0) >= 1) {
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
