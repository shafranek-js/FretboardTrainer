import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';

type MelodyEditorMode = 'create' | 'edit-custom' | 'duplicate-builtin';

interface MelodyEventEditorMetadata {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
}

interface GpLikeImportedMelody {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: {
    sourceFormat: MelodyDefinition['sourceFormat'];
    sourceFileName: string;
    trackName?: string | null;
    scoreTitle?: string | null;
    tempoBpm?: number | null;
  };
}

interface MidiLikeImportedMelody {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: {
    sourceFormat: MelodyDefinition['sourceFormat'];
    sourceFileName: string;
    trackName?: string | null;
    midiName?: string | null;
    tempoBpm?: number | null;
  };
}

interface MelodyLibraryActionsControllerDeps {
  getSelectedMelody(): MelodyDefinition | null;
  getCurrentInstrument(): IInstrument;
  getMelodyEditorMode(): MelodyEditorMode;
  getEditingMelodyId(): string | null;
  getMelodyNameInputValue(): string;
  getAsciiTabInputValue(): string;
  getEventEditorDraft(): MelodyEvent[] | null;
  getEventEditorMetadata(): MelodyEventEditorMetadata | null;
  resolvePendingGpImportedPreview(): GpLikeImportedMelody;
  resolvePendingMidiImportedPreview(): MidiLikeImportedMelody;
  getPracticeAdjustedMelody(melody: MelodyDefinition): MelodyDefinition;
  getPracticeAdjustedExportBpm(melody: MelodyDefinition): number | undefined;
  saveCustomEventMelody(
    name: string,
    events: MelodyEvent[],
    instrument: IInstrument,
    metadata?: MelodyEventEditorMetadata
  ): string;
  updateCustomEventMelody(
    melodyId: string,
    name: string,
    events: MelodyEvent[],
    instrument: IInstrument,
    metadata?: MelodyEventEditorMetadata
  ): string;
  saveCustomAsciiTabMelody(name: string, tabText: string, instrument: IInstrument): string;
  updateCustomAsciiTabMelody(melodyId: string, name: string, tabText: string, instrument: IInstrument): string;
  exportMelodyToMidiBytes(
    melody: MelodyDefinition,
    instrument: IInstrument,
    options?: { bpm?: number }
  ): Promise<Uint8Array>;
  buildExportMidiFileName(name: string): string;
  buildPracticeAdjustedMidiFileName(
    name: string,
    options: { transposeSemitones: number; stringShift: number; bpm?: number }
  ): string;
  downloadBytesAsFile(bytes: Uint8Array, fileName: string, mimeType: string): void;
  getPracticeAdjustmentSummary(): { transposeSemitones: number; stringShift: number };
  finalizeImportSelection(melodyId: string, successMessage: string): void;
}

function buildWarningSuffix(warnings: string[]) {
  return warnings.length > 0
    ? ` ${warnings.slice(0, 2).join(' ')}${warnings.length > 2 ? ' ...' : ''}`
    : '';
}

export function createMelodyLibraryActionsController(deps: MelodyLibraryActionsControllerDeps) {
  function savePendingGpImportedTrack() {
    const imported = deps.resolvePendingGpImportedPreview();
    const eventEditorDraft = deps.getEventEditorDraft();
    const eventEditorMetadata = deps.getEventEditorMetadata();
    const instrument = deps.getCurrentInstrument();
    const melodyName = deps.getMelodyNameInputValue() || imported.suggestedName;
    const sourceMetadata = eventEditorMetadata ?? {
      sourceFormat: imported.metadata.sourceFormat,
      sourceFileName: imported.metadata.sourceFileName,
      sourceTrackName: imported.metadata.trackName ?? undefined,
      sourceScoreTitle: imported.metadata.scoreTitle ?? undefined,
      sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
    };
    const melodyId = deps.saveCustomEventMelody(
      melodyName,
      eventEditorDraft ?? imported.events,
      instrument,
      sourceMetadata
    );
    const trackLabel = imported.metadata.trackName ? ` (${imported.metadata.trackName})` : '';
    deps.finalizeImportSelection(
      melodyId,
      `Custom melody imported from ${imported.metadata.sourceFileName}${trackLabel}.${buildWarningSuffix(imported.warnings)}`.trim()
    );
  }

  function savePendingMidiImportedTrack() {
    const imported = deps.resolvePendingMidiImportedPreview();
    const eventEditorDraft = deps.getEventEditorDraft();
    const eventEditorMetadata = deps.getEventEditorMetadata();
    const instrument = deps.getCurrentInstrument();
    const melodyName = deps.getMelodyNameInputValue() || imported.suggestedName;
    const sourceMetadata = eventEditorMetadata ?? {
      sourceFormat: imported.metadata.sourceFormat,
      sourceFileName: imported.metadata.sourceFileName,
      sourceTrackName: imported.metadata.trackName ?? undefined,
      sourceScoreTitle: imported.metadata.midiName ?? undefined,
      sourceTempoBpm: imported.metadata.tempoBpm ?? undefined,
    };
    const melodyId = deps.saveCustomEventMelody(
      melodyName,
      eventEditorDraft ?? imported.events,
      instrument,
      sourceMetadata
    );
    const trackLabel = imported.metadata.trackName ? ` (${imported.metadata.trackName})` : '';
    deps.finalizeImportSelection(
      melodyId,
      `Custom melody imported from ${imported.metadata.sourceFileName}${trackLabel}.${buildWarningSuffix(imported.warnings)}`.trim()
    );
  }

  function saveFromModal() {
    const instrument = deps.getCurrentInstrument();
    const eventEditorDraft = deps.getEventEditorDraft();
    const mode = deps.getMelodyEditorMode();
    let melodyId: string;
    let successMessage = 'Custom melody imported from ASCII tab.';

    if (eventEditorDraft) {
      const melodyName = deps.getMelodyNameInputValue();
      const sourceMetadata = deps.getEventEditorMetadata() ?? undefined;
      const formatLabel = sourceMetadata?.sourceFormat?.toUpperCase() ?? 'EVENTS';
      const editingMelodyId = deps.getEditingMelodyId();
      if (mode === 'edit-custom' && editingMelodyId) {
        melodyId = deps.updateCustomEventMelody(editingMelodyId, melodyName, eventEditorDraft, instrument, sourceMetadata);
        successMessage = 'Custom melody updated.';
      } else {
        melodyId = deps.saveCustomEventMelody(melodyName, eventEditorDraft, instrument, sourceMetadata);
        successMessage =
          mode === 'duplicate-builtin'
            ? 'Built-in melody duplicated and saved as custom.'
            : `Custom melody imported from ${formatLabel}.`;
      }
      deps.finalizeImportSelection(melodyId, successMessage);
      return;
    }

    const editingMelodyId = deps.getEditingMelodyId();
    if (mode === 'edit-custom' && editingMelodyId) {
      melodyId = deps.updateCustomAsciiTabMelody(
        editingMelodyId,
        deps.getMelodyNameInputValue(),
        deps.getAsciiTabInputValue(),
        instrument
      );
      successMessage = 'Custom melody updated.';
    } else {
      melodyId = deps.saveCustomAsciiTabMelody(
        deps.getMelodyNameInputValue(),
        deps.getAsciiTabInputValue(),
        instrument
      );
      successMessage =
        mode === 'duplicate-builtin'
          ? 'Built-in melody duplicated and saved as custom.'
          : 'Custom melody imported from ASCII tab.';
    }
    deps.finalizeImportSelection(melodyId, successMessage);
  }

  async function exportSelectedMelodyAsMidi() {
    const melody = deps.getSelectedMelody();
    if (!melody || melody.source !== 'custom') {
      throw new Error('Select a custom melody to export MIDI.');
    }

    const bytes = await deps.exportMelodyToMidiBytes(melody, deps.getCurrentInstrument(), {
      bpm: melody.sourceTempoBpm ?? undefined,
    });
    deps.downloadBytesAsFile(bytes, deps.buildExportMidiFileName(melody.name), 'audio/midi');
  }

  async function exportSelectedPracticeAdjustedMelodyAsMidi() {
    const melody = deps.getSelectedMelody();
    if (!melody) {
      throw new Error('Select a melody to export adjusted practice MIDI.');
    }

    const adjustedMelody = deps.getPracticeAdjustedMelody(melody);
    if (adjustedMelody.events.length === 0) {
      throw new Error('Selected melody has no playable notes after practice adjustments.');
    }

    const exportBpm = deps.getPracticeAdjustedExportBpm(adjustedMelody);
    const bytes = await deps.exportMelodyToMidiBytes(adjustedMelody, deps.getCurrentInstrument(), {
      bpm: exportBpm,
    });
    const practiceAdjustment = deps.getPracticeAdjustmentSummary();
    deps.downloadBytesAsFile(
      bytes,
      deps.buildPracticeAdjustedMidiFileName(melody.name, {
        transposeSemitones: practiceAdjustment.transposeSemitones,
        stringShift: practiceAdjustment.stringShift,
        bpm: exportBpm,
      }),
      'audio/midi'
    );
  }

  return {
    savePendingGpImportedTrack,
    savePendingMidiImportedTrack,
    saveFromModal,
    exportSelectedMelodyAsMidi,
    exportSelectedPracticeAdjustedMelodyAsMidi,
  };
}
