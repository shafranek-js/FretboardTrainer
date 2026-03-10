import type { MelodyDefinition, MelodyEvent } from '../melody-library';

type MelodyEventEditorMetadata = {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
  sourceTimeSignature?: string;
};

type RenderPreviewOptions = {
  statusText?: string;
  summaryPrefix?: string;
  editableEvents?: boolean;
  preserveDraft?: boolean;
  metadata?: MelodyEventEditorMetadata;
};

export interface MelodyEventEditorBridgeControllerDeps {
  clearPreview: () => void;
  renderPreviewError: (prefix: string, error: unknown) => void;
  renderPreviewFromEvents: (events: MelodyEvent[], options?: RenderPreviewOptions) => void;
  renderInspector: () => void;
  updateSelectedNotePosition: (stringName: string, fretValue: number) => void;
  deleteSelectedNote: () => void;
  addNote: () => void;
  undo: () => void;
  redo: () => void;
  hasDraft: () => boolean;
  getDraft: () => MelodyEvent[] | null;
  getSourceMetadata: () => MelodyEventEditorMetadata | null;
}

export function createMelodyEventEditorBridgeController(deps: MelodyEventEditorBridgeControllerDeps) {
  return {
    clearPreview: () => deps.clearPreview(),
    renderPreviewError: (prefix: string, error: unknown) => deps.renderPreviewError(prefix, error),
    renderPreviewFromEvents: (events: MelodyEvent[], options?: RenderPreviewOptions) =>
      deps.renderPreviewFromEvents(events, options),
    renderInspector: () => deps.renderInspector(),
    updateSelectedNotePosition: (stringName: string, fretValue: number) =>
      deps.updateSelectedNotePosition(stringName, fretValue),
    deleteSelectedNote: () => deps.deleteSelectedNote(),
    addNote: () => deps.addNote(),
    undo: () => deps.undo(),
    redo: () => deps.redo(),
    hasDraft: () => deps.hasDraft(),
    getDraft: () => deps.getDraft(),
    getSourceMetadata: () => deps.getSourceMetadata(),
  };
}
