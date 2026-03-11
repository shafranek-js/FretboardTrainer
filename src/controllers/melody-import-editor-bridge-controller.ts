import type { MelodyDefinition, MelodyEvent } from '../melody-library';

export type MelodyImportEditorMetadata = {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
  sourceTimeSignature?: string;
};

export type MelodyImportPreviewRenderOptions = {
  statusText?: string;
  summaryPrefix?: string;
  editableEvents?: boolean;
  metadata?: MelodyImportEditorMetadata;
};

export type GpLikeImportedMelody = {
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
};

export type MidiLikeImportedMelody = {
  suggestedName: string;
  events: MelodyEvent[];
  warnings: string[];
  metadata: {
    sourceFormat: MelodyDefinition['sourceFormat'];
    sourceFileName: string;
    trackName?: string | null;
    midiName?: string | null;
    tempoBpm?: number | null;
    timeSignatureText?: string | null;
  };
};

export interface MelodyImportEditorBridgeControllerDeps {
  hasStructuredEventDraft: () => boolean;
  resetImportPreviewDraft: () => void;
  updatePreview: () => void;
  schedulePreviewUpdate: () => void;
  loadGpImportDraftFromFile: (file: File) => Promise<void>;
  loadMidiImportDraftFromFile: (file: File) => Promise<void>;
  refreshMidiTrackPreviewFromSelection: () => void;
  hasPendingMidiImport: () => boolean;
  refreshGpTrackPreviewFromSelection: () => void;
  resolvePendingGpImportedPreview: () => GpLikeImportedMelody;
  resolvePendingMidiImportedPreview: () => MidiLikeImportedMelody;
  renderStructuredPreview: (parsedEvents: MelodyEvent[], options: MelodyImportPreviewRenderOptions) => void;
  renderPreviewError: (prefix: string, error: unknown) => void;
  clearPreview: () => void;
  getDraft: () => MelodyEvent[] | null;
  getSourceMetadata: () => MelodyImportEditorMetadata | null;
}

export function createMelodyImportEditorBridgeController(
  deps: MelodyImportEditorBridgeControllerDeps
) {
  return {
    hasStructuredEventDraft: () => deps.hasStructuredEventDraft(),
    resetImportPreviewDraft: () => deps.resetImportPreviewDraft(),
    updatePreview: () => deps.updatePreview(),
    schedulePreviewUpdate: () => deps.schedulePreviewUpdate(),
    loadGpImportDraftFromFile: (file: File) => deps.loadGpImportDraftFromFile(file),
    loadMidiImportDraftFromFile: (file: File) => deps.loadMidiImportDraftFromFile(file),
    refreshMidiTrackPreviewFromSelection: () => deps.refreshMidiTrackPreviewFromSelection(),
    hasPendingMidiImport: () => deps.hasPendingMidiImport(),
    refreshGpTrackPreviewFromSelection: () => deps.refreshGpTrackPreviewFromSelection(),
    resolvePendingGpImportedPreview: () => deps.resolvePendingGpImportedPreview(),
    resolvePendingMidiImportedPreview: () => deps.resolvePendingMidiImportedPreview(),
    renderStructuredPreview: (parsedEvents: MelodyEvent[], options: MelodyImportPreviewRenderOptions) =>
      deps.renderStructuredPreview(parsedEvents, options),
    renderPreviewError: (prefix: string, error: unknown) => deps.renderPreviewError(prefix, error),
    clearPreview: () => deps.clearPreview(),
    getDraft: () => deps.getDraft(),
    getSourceMetadata: () => deps.getSourceMetadata(),
  };
}
