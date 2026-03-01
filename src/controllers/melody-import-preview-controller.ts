import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import type {
  GpImportedMelody,
  LoadedGpScore,
} from '../gp-import';
import type {
  LoadedMidiFile,
  MidiImportedMelody,
  MidiImportQuantize,
} from '../midi-file-import';

type PreviewMetadata = {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
};

type PreviewRenderOptions = {
  statusText?: string;
  summaryPrefix?: string;
  editableEvents?: boolean;
  metadata?: PreviewMetadata;
};

interface MelodyImportPreviewControllerDom {
  melodyNameInput: HTMLInputElement;
  melodyAsciiTabInput: HTMLTextAreaElement;
  melodyGpTrackImportPanel: HTMLElement;
  melodyGpTrackSelector: HTMLSelectElement;
  melodyGpTrackInfo: HTMLElement;
  saveMelodyGpTrackBtn: HTMLButtonElement;
  melodyMidiTrackImportPanel: HTMLElement;
  melodyMidiTrackSelector: HTMLSelectElement;
  melodyMidiQuantize: HTMLSelectElement;
  melodyMidiTrackInfo: HTMLElement;
  saveMelodyMidiTrackBtn: HTMLButtonElement;
}

interface MelodyImportPreviewControllerDeps {
  dom: MelodyImportPreviewControllerDom;
  getCurrentInstrument(): IInstrument;
  getSelectedMidiImportQuantize(): MidiImportQuantize;
  parseAsciiTabToEvents(tabText: string, instrument: IInstrument): MelodyEvent[];
  loadGpScoreFromBytes(bytes: Uint8Array, instrument: IInstrument, fileName: string): Promise<LoadedGpScore>;
  convertLoadedGpScoreTrackToImportedMelody(
    loaded: LoadedGpScore,
    instrument: IInstrument,
    trackIndex: number
  ): GpImportedMelody;
  loadMidiFileFromBytes(bytes: Uint8Array, fileName: string): Promise<LoadedMidiFile>;
  convertLoadedMidiTrackToImportedMelody(
    loaded: LoadedMidiFile,
    instrument: IInstrument,
    trackIndex: number,
    options: { quantize: MidiImportQuantize }
  ): MidiImportedMelody;
  renderPreviewFromEvents(events: MelodyEvent[], options?: PreviewRenderOptions): void;
  renderPreviewError(prefix: string, error: unknown): void;
  clearPreview(): void;
}

interface PendingGpImport {
  loaded: LoadedGpScore;
  selectedTrackIndex: number;
  importedPreview: GpImportedMelody | null;
}

interface PendingMidiImport {
  loaded: LoadedMidiFile;
  selectedTrackIndex: number;
  quantize: MidiImportQuantize;
  importedPreview: MidiImportedMelody | null;
}

function cloneParsedEvents(events: MelodyEvent[]): MelodyEvent[] {
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

function getGpPreviewMetadata(imported: GpImportedMelody): PreviewMetadata {
  return {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.scoreTitle ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  };
}

function getMidiPreviewMetadata(imported: MidiImportedMelody): PreviewMetadata {
  return {
    sourceFormat: imported.metadata.sourceFormat,
    sourceFileName: imported.metadata.sourceFileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.midiName ?? undefined,
    sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
  };
}

export function createMelodyImportPreviewController(deps: MelodyImportPreviewControllerDeps) {
  let previewUpdateTimeoutId: number | null = null;
  let pendingGpImport: PendingGpImport | null = null;
  let pendingMidiImport: PendingMidiImport | null = null;

  function clearPendingGpImportDraft() {
    pendingGpImport = null;
    deps.dom.melodyGpTrackSelector.innerHTML = '';
    deps.dom.melodyGpTrackInfo.textContent = '';
    deps.dom.melodyGpTrackImportPanel.classList.add('hidden');
    deps.dom.saveMelodyGpTrackBtn.disabled = true;
  }

  function clearPendingMidiImportDraft() {
    pendingMidiImport = null;
    deps.dom.melodyMidiTrackSelector.innerHTML = '';
    deps.dom.melodyMidiQuantize.value = 'off';
    deps.dom.melodyMidiTrackInfo.textContent = '';
    deps.dom.melodyMidiTrackImportPanel.classList.add('hidden');
    deps.dom.saveMelodyMidiTrackBtn.disabled = true;
  }

  function clearPendingImportDrafts() {
    clearPendingGpImportDraft();
    clearPendingMidiImportDraft();
  }

  function clearScheduledPreviewUpdate() {
    if (previewUpdateTimeoutId !== null) {
      clearTimeout(previewUpdateTimeoutId);
      previewUpdateTimeoutId = null;
    }
  }

  function reset() {
    clearScheduledPreviewUpdate();
    clearPendingImportDrafts();
    deps.clearPreview();
  }

  function renderGpTrackInfo() {
    if (!pendingGpImport) {
      deps.dom.melodyGpTrackInfo.textContent = '';
      return;
    }
    const preview = pendingGpImport.importedPreview;
    const loaded = pendingGpImport.loaded;
    const pieces: string[] = [];
    if (loaded.scoreTitle) pieces.push(`Score: ${loaded.scoreTitle}`);
    if (preview?.metadata.trackName) pieces.push(`Track: ${preview.metadata.trackName}`);
    if (loaded.tempoBpm) pieces.push(`Tempo: ${loaded.tempoBpm} BPM`);
    if (preview?.warnings.length) pieces.push(preview.warnings.join(' '));
    deps.dom.melodyGpTrackInfo.textContent = pieces.join(' | ');
  }

  function renderMidiTrackInfo() {
    if (!pendingMidiImport) {
      deps.dom.melodyMidiTrackInfo.textContent = '';
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
    deps.dom.melodyMidiTrackInfo.textContent = pieces.join(' | ');
  }

  function refreshGpTrackPreviewFromSelection() {
    if (!pendingGpImport) return;
    const selectedTrackIndex = Number.parseInt(deps.dom.melodyGpTrackSelector.value, 10);
    if (!Number.isFinite(selectedTrackIndex)) return;

    pendingGpImport.selectedTrackIndex = selectedTrackIndex;
    const imported = deps.convertLoadedGpScoreTrackToImportedMelody(
      pendingGpImport.loaded,
      deps.getCurrentInstrument(),
      selectedTrackIndex
    );
    pendingGpImport.importedPreview = imported;

    if (!deps.dom.melodyNameInput.value.trim()) {
      deps.dom.melodyNameInput.value = imported.suggestedName;
    }

    deps.renderPreviewFromEvents(imported.events, {
      statusText: 'GP parsed successfully',
      summaryPrefix: imported.metadata.sourceFormat.toUpperCase(),
      editableEvents: true,
      metadata: getGpPreviewMetadata(imported),
    });
    renderGpTrackInfo();
    deps.dom.saveMelodyGpTrackBtn.disabled = false;
  }

  function refreshMidiTrackPreviewFromSelection() {
    if (!pendingMidiImport) return;
    const selectedTrackIndex = Number.parseInt(deps.dom.melodyMidiTrackSelector.value, 10);
    if (!Number.isFinite(selectedTrackIndex)) return;

    pendingMidiImport.selectedTrackIndex = selectedTrackIndex;
    pendingMidiImport.quantize = deps.getSelectedMidiImportQuantize();
    const imported = deps.convertLoadedMidiTrackToImportedMelody(
      pendingMidiImport.loaded,
      deps.getCurrentInstrument(),
      selectedTrackIndex,
      { quantize: pendingMidiImport.quantize }
    );
    pendingMidiImport.importedPreview = imported;

    if (!deps.dom.melodyNameInput.value.trim()) {
      deps.dom.melodyNameInput.value = imported.suggestedName;
    }

    deps.renderPreviewFromEvents(imported.events, {
      statusText: 'MIDI parsed successfully',
      summaryPrefix: 'MIDI',
      editableEvents: true,
      metadata: getMidiPreviewMetadata(imported),
    });
    renderMidiTrackInfo();
    deps.dom.saveMelodyMidiTrackBtn.disabled = false;
  }

  function renderGpTrackSelectorForPendingImport() {
    if (!pendingGpImport) return;
    const { loaded } = pendingGpImport;
    deps.dom.melodyGpTrackSelector.innerHTML = '';
    loaded.trackOptions.forEach((option) => {
      const element = document.createElement('option');
      element.value = String(option.trackIndex);
      element.textContent = option.label;
      deps.dom.melodyGpTrackSelector.append(element);
    });
    if (loaded.defaultTrackIndex !== null) {
      deps.dom.melodyGpTrackSelector.value = String(loaded.defaultTrackIndex);
    }
    deps.dom.melodyGpTrackImportPanel.classList.remove('hidden');
    refreshGpTrackPreviewFromSelection();
  }

  function renderMidiTrackSelectorForPendingImport() {
    if (!pendingMidiImport) return;
    const { loaded } = pendingMidiImport;
    deps.dom.melodyMidiTrackSelector.innerHTML = '';
    loaded.trackOptions.forEach((option) => {
      const element = document.createElement('option');
      element.value = String(option.trackIndex);
      element.textContent = option.label;
      deps.dom.melodyMidiTrackSelector.append(element);
    });
    if (loaded.defaultTrackIndex !== null) {
      deps.dom.melodyMidiTrackSelector.value = String(loaded.defaultTrackIndex);
    }
    deps.dom.melodyMidiQuantize.value = pendingMidiImport.quantize;
    deps.dom.melodyMidiTrackImportPanel.classList.remove('hidden');
    refreshMidiTrackPreviewFromSelection();
  }

  async function loadGpImportDraftFromFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loaded = await deps.loadGpScoreFromBytes(bytes, deps.getCurrentInstrument(), file.name);
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

  async function loadMidiImportDraftFromFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loaded = await deps.loadMidiFileFromBytes(bytes, file.name);
    if (loaded.trackOptions.length === 0 || loaded.defaultTrackIndex === null) {
      throw new Error('MIDI file does not contain importable note tracks.');
    }

    pendingMidiImport = {
      loaded,
      selectedTrackIndex: loaded.defaultTrackIndex,
      quantize: deps.getSelectedMidiImportQuantize(),
      importedPreview: null,
    };
    renderMidiTrackSelectorForPendingImport();
  }

  function updatePreview() {
    const tabText = deps.dom.melodyAsciiTabInput.value.trim();
    if (!tabText) {
      if (pendingGpImport?.importedPreview) {
        deps.renderPreviewFromEvents(pendingGpImport.importedPreview.events, {
          statusText: 'GP parsed successfully',
          summaryPrefix: pendingGpImport.importedPreview.metadata.sourceFormat.toUpperCase(),
          editableEvents: true,
          metadata: getGpPreviewMetadata(pendingGpImport.importedPreview),
        });
        renderGpTrackInfo();
        return;
      }

      if (pendingMidiImport?.importedPreview) {
        deps.renderPreviewFromEvents(pendingMidiImport.importedPreview.events, {
          statusText: 'MIDI parsed successfully',
          summaryPrefix: 'MIDI',
          editableEvents: true,
          metadata: getMidiPreviewMetadata(pendingMidiImport.importedPreview),
        });
        renderMidiTrackInfo();
        return;
      }

      deps.clearPreview();
      return;
    }

    try {
      clearPendingImportDrafts();
      const parsedEvents = cloneParsedEvents(
        deps.parseAsciiTabToEvents(tabText, deps.getCurrentInstrument())
      );
      deps.renderPreviewFromEvents(parsedEvents, { editableEvents: false });
    } catch (error) {
      deps.renderPreviewError('ASCII tab preview failed', error);
    }
  }

  function schedulePreviewUpdate() {
    clearScheduledPreviewUpdate();
    previewUpdateTimeoutId = setTimeout(() => {
      previewUpdateTimeoutId = null;
      updatePreview();
    }, 120);
  }

  function resolvePendingGpImportedPreview() {
    if (!pendingGpImport) {
      throw new Error('No loaded Guitar Pro file to import.');
    }

    const imported =
      pendingGpImport.importedPreview ??
      deps.convertLoadedGpScoreTrackToImportedMelody(
        pendingGpImport.loaded,
        deps.getCurrentInstrument(),
        pendingGpImport.selectedTrackIndex
      );
    pendingGpImport.importedPreview = imported;
    return imported;
  }

  function resolvePendingMidiImportedPreview() {
    if (!pendingMidiImport) {
      throw new Error('No loaded MIDI file to import.');
    }

    const imported =
      pendingMidiImport.importedPreview ??
      deps.convertLoadedMidiTrackToImportedMelody(
        pendingMidiImport.loaded,
        deps.getCurrentInstrument(),
        pendingMidiImport.selectedTrackIndex,
        { quantize: pendingMidiImport.quantize }
      );
    pendingMidiImport.importedPreview = imported;
    return imported;
  }

  function hasPendingMidiImport() {
    return pendingMidiImport !== null;
  }

  return {
    reset,
    clearPendingGpImportDraft,
    clearPendingMidiImportDraft,
    clearPendingImportDrafts,
    loadGpImportDraftFromFile,
    loadMidiImportDraftFromFile,
    refreshGpTrackPreviewFromSelection,
    refreshMidiTrackPreviewFromSelection,
    updatePreview,
    schedulePreviewUpdate,
    resolvePendingGpImportedPreview,
    resolvePendingMidiImportedPreview,
    hasPendingMidiImport,
  };
}
