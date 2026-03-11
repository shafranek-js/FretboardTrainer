import { describe, expect, it, vi } from 'vitest';
import { createMelodyImportEditorBridgeController } from './melody-import-editor-bridge-controller';

describe('melody-import-editor-bridge-controller', () => {
  it('delegates preview and draft operations', async () => {
    const gpFile = new File(['gp'], 'demo.gp5');
    const midiFile = new File(['midi'], 'demo.mid');
    const draft = [{ barIndex: 0, column: 0, durationColumns: 4, notes: [] }];
    const metadata = { sourceFormat: 'midi' as const, sourceFileName: 'demo.mid' };
    const gpPreview = {
      suggestedName: 'GP Demo',
      events: [],
      warnings: [],
      metadata: { sourceFormat: 'gp' as const, sourceFileName: 'demo.gp5' },
    };
    const midiPreview = {
      suggestedName: 'MIDI Demo',
      events: [],
      warnings: [],
      metadata: { sourceFormat: 'midi' as const, sourceFileName: 'demo.mid' },
    };
    const deps = {
      hasStructuredEventDraft: vi.fn(() => true),
      resetImportPreviewDraft: vi.fn(),
      updatePreview: vi.fn(),
      schedulePreviewUpdate: vi.fn(),
      loadGpImportDraftFromFile: vi.fn(async () => {}),
      loadMidiImportDraftFromFile: vi.fn(async () => {}),
      refreshMidiTrackPreviewFromSelection: vi.fn(),
      hasPendingMidiImport: vi.fn(() => true),
      refreshGpTrackPreviewFromSelection: vi.fn(),
      resolvePendingGpImportedPreview: vi.fn(() => gpPreview),
      resolvePendingMidiImportedPreview: vi.fn(() => midiPreview),
      renderStructuredPreview: vi.fn(),
      renderPreviewError: vi.fn(),
      clearPreview: vi.fn(),
      getDraft: vi.fn(() => draft),
      getSourceMetadata: vi.fn(() => metadata),
    };

    const controller = createMelodyImportEditorBridgeController(deps);

    expect(controller.hasStructuredEventDraft()).toBe(true);
    controller.resetImportPreviewDraft();
    controller.updatePreview();
    controller.schedulePreviewUpdate();
    await controller.loadGpImportDraftFromFile(gpFile);
    await controller.loadMidiImportDraftFromFile(midiFile);
    controller.refreshMidiTrackPreviewFromSelection();
    expect(controller.hasPendingMidiImport()).toBe(true);
    controller.refreshGpTrackPreviewFromSelection();
    expect(controller.resolvePendingGpImportedPreview()).toBe(gpPreview);
    expect(controller.resolvePendingMidiImportedPreview()).toBe(midiPreview);
    controller.renderStructuredPreview([], { editableEvents: true });
    controller.renderPreviewError('Preview failed', new Error('boom'));
    controller.clearPreview();
    expect(controller.getDraft()).toBe(draft);
    expect(controller.getSourceMetadata()).toBe(metadata);

    expect(deps.resetImportPreviewDraft).toHaveBeenCalledTimes(1);
    expect(deps.updatePreview).toHaveBeenCalledTimes(1);
    expect(deps.schedulePreviewUpdate).toHaveBeenCalledTimes(1);
    expect(deps.loadGpImportDraftFromFile).toHaveBeenCalledWith(gpFile);
    expect(deps.loadMidiImportDraftFromFile).toHaveBeenCalledWith(midiFile);
    expect(deps.refreshMidiTrackPreviewFromSelection).toHaveBeenCalledTimes(1);
    expect(deps.refreshGpTrackPreviewFromSelection).toHaveBeenCalledTimes(1);
    expect(deps.renderStructuredPreview).toHaveBeenCalledWith([], { editableEvents: true });
    expect(deps.renderPreviewError).toHaveBeenCalledTimes(1);
    expect(deps.clearPreview).toHaveBeenCalledTimes(1);
  });
});
