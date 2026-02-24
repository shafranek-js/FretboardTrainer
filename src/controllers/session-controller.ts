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
  setPromptText,
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
  getMelodyById,
  isCustomMelodyId,
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
  saveCustomEventMelody,
  type MelodyEvent,
  updateCustomAsciiTabMelody,
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
  type MidiImportedMelody,
} from '../midi-file-import';

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
let melodyPreviewUpdateTimeoutId: number | null = null;
let pendingGpImport: {
  loaded: LoadedGpScore;
  selectedTrackIndex: number;
  importedPreview: GpImportedMelody | null;
} | null = null;
let pendingMidiImport: {
  loaded: LoadedMidiFile;
  selectedTrackIndex: number;
  importedPreview: MidiImportedMelody | null;
} | null = null;

function renderMelodyDemoButtonState() {
  dom.melodyDemoBtn.textContent = isMelodyDemoPlaying ? 'Stop Demo' : 'Play Demo';
  dom.melodyDemoBtn.classList.toggle('bg-emerald-700', !isMelodyDemoPlaying);
  dom.melodyDemoBtn.classList.toggle('hover:bg-emerald-600', !isMelodyDemoPlaying);
  dom.melodyDemoBtn.classList.toggle('border-emerald-500', !isMelodyDemoPlaying);
  dom.melodyDemoBtn.classList.toggle('bg-red-700', isMelodyDemoPlaying);
  dom.melodyDemoBtn.classList.toggle('hover:bg-red-600', isMelodyDemoPlaying);
  dom.melodyDemoBtn.classList.toggle('border-red-500', isMelodyDemoPlaying);
}

function clearMelodyEditorPreview() {
  dom.melodyPreviewStatus.textContent = 'Paste tab to preview';
  dom.melodyPreviewStatus.className = 'text-xs text-slate-400';
  dom.melodyPreviewSummary.textContent = '';
  dom.melodyPreviewList.innerHTML = '';
}

function formatMelodyPreviewEventLine(eventIndex: number, totalEvents: number, event: MelodyEvent) {
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

  return `[${eventIndex + 1}/${totalEvents}] ${notesText}  ->  ${timingText}`;
}

function renderMelodyEditorPreviewError(prefix: string, error: unknown) {
  dom.melodyPreviewStatus.textContent = 'Parse error';
  dom.melodyPreviewStatus.className = 'text-xs text-red-300';
  dom.melodyPreviewSummary.textContent = formatUserFacingError(prefix, error);
  dom.melodyPreviewList.innerHTML = '';
}

function renderMelodyEditorPreviewFromEvents(
  parsedEvents: MelodyEvent[],
  options?: { statusText?: string; summaryPrefix?: string }
) {
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
    li.textContent = formatMelodyPreviewEventLine(index, parsedEvents.length, event);
    dom.melodyPreviewList.appendChild(li);
  });

  if (parsedEvents.length > maxPreviewItems) {
    const li = document.createElement('li');
    li.className = 'text-slate-400';
    li.textContent = `... and ${parsedEvents.length - maxPreviewItems} more events`;
    dom.melodyPreviewList.appendChild(li);
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
  dom.melodyMidiTrackInfo.textContent = '';
  dom.melodyMidiTrackImportPanel.classList.add('hidden');
  dom.saveMelodyMidiTrackBtn.disabled = true;
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
  const pieces: string[] = [];
  if (loaded.midiName) pieces.push(`MIDI: ${loaded.midiName}`);
  if (preview?.metadata.trackName) pieces.push(`Track: ${preview.metadata.trackName}`);
  if (loaded.tempoBpm) pieces.push(`Tempo: ${loaded.tempoBpm} BPM`);
  if (preview?.warnings.length) pieces.push(preview.warnings.join(' '));
  dom.melodyMidiTrackInfo.textContent = pieces.join(' | ');
}

function refreshMidiTrackPreviewFromSelection() {
  if (!pendingMidiImport) return;
  const selectedTrackIndex = Number.parseInt(dom.melodyMidiTrackSelector.value, 10);
  if (!Number.isFinite(selectedTrackIndex)) return;

  pendingMidiImport.selectedTrackIndex = selectedTrackIndex;
  const imported = convertLoadedMidiTrackToImportedMelody(
    pendingMidiImport.loaded,
    state.currentInstrument,
    selectedTrackIndex
  );
  pendingMidiImport.importedPreview = imported;

  if (!dom.melodyNameInput.value.trim()) {
    dom.melodyNameInput.value = imported.suggestedName;
  }

  renderMelodyEditorPreviewFromEvents(imported.events, {
    statusText: 'MIDI parsed successfully',
    summaryPrefix: 'MIDI',
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
      });
      renderGpTrackInfo();
      return;
    }
    if (pendingMidiImport?.importedPreview) {
      renderMelodyEditorPreviewFromEvents(pendingMidiImport.importedPreview.events, {
        statusText: 'MIDI parsed successfully',
        summaryPrefix: 'MIDI',
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
    renderMelodyEditorPreviewFromEvents(parsedEvents);
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
  const melodyId = saveCustomEventMelody(melodyName, imported.events, state.currentInstrument, {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.scoreTitle ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  });

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
      pendingMidiImport.selectedTrackIndex
    );
  pendingMidiImport.importedPreview = imported;

  const melodyName = dom.melodyNameInput.value.trim() || imported.suggestedName;
  const melodyId = saveCustomEventMelody(melodyName, imported.events, state.currentInstrument, {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.midiName ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  });

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
  isMelodyDemoPlaying = false;
  renderMelodyDemoButtonState();

  if (options?.clearUi) {
    setPromptText('');
    redrawFretboard();
  }

  if (wasPlaying && options?.message) {
    setResultMessage(options.message);
  }
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

function toMelodyDemoFingering(event: MelodyEvent): ChordNote[] {
  return event.notes
    .filter(
      (note): note is MelodyEvent['notes'][number] & { stringName: string; fret: number } =>
        note.stringName !== null && typeof note.fret === 'number'
    )
    .map((note) => ({
      note: note.note,
      string: note.stringName,
      fret: note.fret,
    }));
}

function buildMelodyDemoPrompt(
  melodyName: string,
  event: MelodyEvent,
  eventIndex: number,
  totalEvents: number
): Prompt {
  const fingering = toMelodyDemoFingering(event);
  const isPolyphonic = event.notes.length > 1;
  const first = event.notes[0] ?? null;
  const stepLabel = `[${eventIndex + 1}/${totalEvents}]`;

  return {
    displayText: `Demo ${stepLabel}: ${formatMelodyDemoEventHint(event)} (${melodyName})`,
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

async function startMelodyDemoPlayback() {
  const selectedMelodyId = dom.melodySelector.value;
  if (!selectedMelodyId) {
    setResultMessage('Select a melody first.', 'error');
    return;
  }

  const melody = getMelodyById(selectedMelodyId, state.currentInstrument);
  if (!melody) {
    setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
    return;
  }
  if (melody.events.length === 0) {
    setResultMessage('Selected melody has no playable notes.', 'error');
    return;
  }

  if (state.isListening) {
    stopListening();
  }
  stopMelodyDemoPlayback();

  try {
    await loadInstrumentSoundfont(state.currentInstrument.name);
    if (state.audioContext?.state === 'suspended') {
      await state.audioContext.resume();
    }
  } catch (error) {
    showNonBlockingError(formatUserFacingError('Failed to initialize sound for melody demo', error));
  }

  isMelodyDemoPlaying = true;
  renderMelodyDemoButtonState();
  const runToken = ++melodyDemoRunToken;
  setResultMessage(`Playing demo: ${melody.name}`);

  const playStep = (index: number) => {
    if (!isMelodyDemoPlaying || runToken !== melodyDemoRunToken) return;

    if (index >= melody.events.length) {
      melodyDemoTimeoutId = null;
      isMelodyDemoPlaying = false;
      renderMelodyDemoButtonState();
      redrawFretboard();
      setResultMessage(`Demo complete: ${melody.name}`, 'success');
      return;
    }

    const event = melody.events[index];
    const prompt = buildMelodyDemoPrompt(melody.name, event, index, melody.events.length);
    setPromptText(prompt.displayText);

    if ((prompt.targetMelodyEventNotes?.length ?? 0) > 1) {
      drawFretboard(false, null, null, prompt.targetMelodyEventNotes ?? []);
    } else if (prompt.targetNote) {
      drawFretboard(false, prompt.targetNote, prompt.targetString || findPlayableStringForNote(prompt.targetNote));
    } else {
      redrawFretboard();
    }

    playPromptAudioFromPrompt(prompt);

    const stepDelayMs = getMelodyDemoStepDelayMs(event);
    melodyDemoTimeoutId = window.setTimeout(() => {
      playStep(index + 1);
    }, stepDelayMs);
  };

  playStep(0);
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
  updateMelodyActionButtonsForSelection();
}

function finalizeMelodyImportSelection(melodyId: string, successMessage: string) {
  populateMelodyOptions();
  dom.melodySelector.value = melodyId;
  state.preferredMelodyId = melodyId;
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
  dom.editMelodyBtn.disabled = !melody || typeof melody.tabText !== 'string';
  dom.melodyDemoBtn.disabled = !melody;
  dom.deleteMelodyBtn.disabled = !isCustomMelodyId(selectedMelodyId);
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
  if (mode === 'edit-custom') {
    dom.melodyImportTitle.textContent = 'Edit Custom Melody';
    dom.melodyImportHelpText.textContent =
      'Edit the ASCII tab for your custom melody. Keep numbered string labels and spacing/dashes to control note timing.';
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
  if (!melody.tabText) {
    setResultMessage('This melody cannot be edited because its ASCII tab source is unavailable.', 'error');
    return;
  }

  state.melodyEditorMode = melody.source === 'custom' ? 'edit-custom' : 'duplicate-builtin';
  state.editingMelodyId = melody.source === 'custom' ? melody.id : null;
  dom.melodyNameInput.value =
    melody.source === 'custom' ? melody.name : `${melody.name} (Custom)`;
  dom.melodyAsciiTabInput.value = melody.tabText;
  updateMelodyEditorUiForCurrentMode();
  updateMelodyEditorPreview();
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
  dom.melodyDemoBpm.value = String(getClampedMelodyDemoBpmFromInput());
  populateMelodyOptions();
  resetMelodyEditorDraft();
  updateMelodyEditorUiForCurrentMode();
  renderMelodyDemoButtonState();
  resetMetronomeVisualIndicator();
  updateMicNoiseGateInfo();
  updatePracticeSetupSummary();
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
    if (isMelodyDemoPlaying) {
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
    state.currentInstrument = instruments[dom.instrumentSelector.value];
    state.currentTuningPresetKey = dom.tuningPreset.value;
    updateInstrumentUI(); // Redraw strings, fretboard, etc.
    populateMelodyOptions();
    updatePracticeSetupSummary();
    await loadInstrumentSoundfont(state.currentInstrument.name);
    saveSettings();
  });

  dom.tuningPreset.addEventListener('change', () => {
    stopMelodyDemoPlayback({ clearUi: true });
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
    updateMelodyActionButtonsForSelection();
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
  dom.editMelodyBtn.addEventListener('click', () => {
    stopMelodyDemoPlayback({ clearUi: true });
    openMelodyEditorModal({ mode: 'edit-custom' });
  });
  dom.melodyDemoBtn.addEventListener('click', async () => {
    if (isMelodyDemoPlaying) {
      stopMelodyDemoPlayback({ clearUi: true, message: 'Melody demo stopped.' });
      return;
    }
    await startMelodyDemoPlayback();
  });
  dom.importMelodyBtn.addEventListener('click', () => {
    try {
      stopMelodyDemoPlayback({ clearUi: true });
      let melodyId: string;
      let successMessage = 'Custom melody imported from ASCII tab.';

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
