import { describe, expect, it, vi } from 'vitest';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import { createMelodyEventEditorBridgeController } from './melody-event-editor-bridge-controller';

function createDeps() {
  const draft = [{ notes: [] }] as unknown as MelodyEvent[];
  const metadata = {
    sourceFormat: 'midi' as MelodyDefinition['sourceFormat'],
    sourceFileName: 'demo.mid',
  };

  return {
    draft,
    metadata,
    clearPreview: vi.fn(),
    renderPreviewError: vi.fn(),
    renderPreviewFromEvents: vi.fn(),
    renderInspector: vi.fn(),
    updateSelectedNotePosition: vi.fn(),
    deleteSelectedNote: vi.fn(),
    addNote: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    hasDraft: vi.fn(() => true),
    getDraft: vi.fn(() => draft),
    getSourceMetadata: vi.fn(() => metadata),
  };
}

describe('melody-event-editor-bridge-controller', () => {
  it('delegates preview helpers and metadata access', () => {
    const deps = createDeps();
    const controller = createMelodyEventEditorBridgeController(deps);

    controller.clearPreview();
    controller.renderPreviewError('Import failed', new Error('boom'));
    controller.renderPreviewFromEvents(deps.draft, {
      statusText: 'Parsed successfully',
      summaryPrefix: 'MIDI',
      editableEvents: true,
      preserveDraft: true,
      metadata: deps.metadata,
    });
    controller.renderInspector();

    expect(controller.hasDraft()).toBe(true);
    expect(controller.getDraft()).toBe(deps.draft);
    expect(controller.getSourceMetadata()).toEqual(deps.metadata);
    expect(deps.clearPreview).toHaveBeenCalledTimes(1);
    expect(deps.renderPreviewError).toHaveBeenCalledTimes(1);
    expect(deps.renderPreviewFromEvents).toHaveBeenCalledWith(deps.draft, {
      statusText: 'Parsed successfully',
      summaryPrefix: 'MIDI',
      editableEvents: true,
      preserveDraft: true,
      metadata: deps.metadata,
    });
    expect(deps.renderInspector).toHaveBeenCalledTimes(1);
  });

  it('delegates editor note mutations', () => {
    const deps = createDeps();
    const controller = createMelodyEventEditorBridgeController(deps);

    controller.updateSelectedNotePosition('A', 7);
    controller.addNote();
    controller.deleteSelectedNote();
    controller.undo();
    controller.redo();

    expect(deps.updateSelectedNotePosition).toHaveBeenCalledWith('A', 7);
    expect(deps.addNote).toHaveBeenCalledTimes(1);
    expect(deps.deleteSelectedNote).toHaveBeenCalledTimes(1);
    expect(deps.undo).toHaveBeenCalledTimes(1);
    expect(deps.redo).toHaveBeenCalledTimes(1);
  });
});
