import { describe, expect, it, vi } from 'vitest';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import { createMelodyLibraryActionsController } from './melody-library-actions-controller';

function createEvent(note = 'C', stringName = 'A', fret = 3): MelodyEvent {
  return {
    durationBeats: 1,
    notes: [{ note, stringName, fret }],
  };
}

function createMelody(overrides?: Partial<MelodyDefinition>): MelodyDefinition {
  return {
    id: 'melody-1',
    name: 'Romanza',
    source: 'custom',
    events: [createEvent()],
    ...overrides,
  } as MelodyDefinition;
}

function createDeps(overrides?: {
  selectedMelody?: MelodyDefinition | null;
  eventDraft?: MelodyEvent[] | null;
  mode?: 'create' | 'edit-custom' | 'duplicate-builtin';
}) {
  const selectedMelody = overrides?.selectedMelody ?? createMelody();
  const eventDraft = overrides?.eventDraft ?? null;
  return {
    getSelectedMelody: vi.fn(() => selectedMelody),
    getCurrentInstrument: vi.fn(() => ({ STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] })),
    getMelodyEditorMode: vi.fn(() => overrides?.mode ?? 'create'),
    getEditingMelodyId: vi.fn(() => 'editing-1'),
    getMelodyNameInputValue: vi.fn(() => 'Edited Romanza'),
    getAsciiTabInputValue: vi.fn(() => 'E|--0--|'),
    getEventEditorDraft: vi.fn(() => eventDraft),
    getEventEditorMetadata: vi.fn(() => ({
      sourceFormat: 'midi' as const,
      sourceFileName: 'romanza.mid',
      sourceTrackName: 'Lead',
      sourceScoreTitle: 'Romanza',
      sourceTempoBpm: 92,
    })),
    resolvePendingGpImportedPreview: vi.fn(() => ({
      suggestedName: 'Romanza GP',
      events: [createEvent('D', 'A', 5)],
      warnings: ['Warning A'],
      metadata: {
        sourceFormat: 'gp',
        sourceFileName: 'romanza.gp5',
        trackName: 'Lead',
        scoreTitle: 'Romanza',
        tempoBpm: 88,
      },
    })),
    resolvePendingMidiImportedPreview: vi.fn(() => ({
      suggestedName: 'Romanza MIDI',
      events: [createEvent('E', 'A', 7)],
      warnings: ['Warning B'],
      metadata: {
        sourceFormat: 'midi',
        sourceFileName: 'romanza.mid',
        trackName: 'Lead',
        midiName: 'Romanza',
        tempoBpm: 90,
      },
    })),
    getPracticeAdjustedMelody: vi.fn((melody: MelodyDefinition) => ({
      ...melody,
      name: `${melody.name} Adjusted`,
    })),
    saveCustomEventMelody: vi.fn(() => 'saved-event-id'),
    updateCustomEventMelody: vi.fn(() => 'updated-event-id'),
    saveCustomAsciiTabMelody: vi.fn(() => 'saved-ascii-id'),
    updateCustomAsciiTabMelody: vi.fn(() => 'updated-ascii-id'),
    exportMelodyToMidiBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
    buildExportMidiFileName: vi.fn((name: string) => `${name}.mid`),
    downloadBytesAsFile: vi.fn(),
    getPracticeAdjustmentSummary: vi.fn(() => ({ transposeSemitones: -2, stringShift: 1 })),
    getPracticeAdjustedBakeBpm: vi.fn(() => 76),
    finalizeImportSelection: vi.fn(),
  };
}

describe('melody-library-actions-controller', () => {
  it('saves pending GP import and finalizes selection', () => {
    const deps = createDeps({ eventDraft: [createEvent('F', 'D', 3)] });
    const controller = createMelodyLibraryActionsController(deps);

    controller.savePendingGpImportedTrack();

    expect(deps.saveCustomEventMelody).toHaveBeenCalledWith(
      'Edited Romanza',
      [createEvent('F', 'D', 3)],
      expect.any(Object),
      expect.objectContaining({
        sourceFormat: 'midi',
        sourceFileName: 'romanza.mid',
      })
    );
    expect(deps.finalizeImportSelection).toHaveBeenCalledWith(
      'saved-event-id',
      expect.stringContaining('Custom melody imported from romanza.gp5 (Lead).')
    );
  });

  it('saves event draft from modal in edit-custom mode', () => {
    const deps = createDeps({
      eventDraft: [createEvent('G', 'D', 5)],
      mode: 'edit-custom',
    });
    const controller = createMelodyLibraryActionsController(deps);

    controller.saveFromModal();

    expect(deps.updateCustomEventMelody).toHaveBeenCalledWith(
      'editing-1',
      'Edited Romanza',
      [createEvent('G', 'D', 5)],
      expect.any(Object),
      expect.objectContaining({
        sourceFormat: 'midi',
      })
    );
    expect(deps.finalizeImportSelection).toHaveBeenCalledWith('updated-event-id', 'Custom melody updated.');
  });

  it('bakes adjusted practice melody into a new custom copy', () => {
    const deps = createDeps({
      selectedMelody: createMelody({
        source: 'builtin',
        name: 'Demo Tune',
        sourceFormat: 'ascii',
      }),
    });
    const controller = createMelodyLibraryActionsController(deps);

    controller.bakeSelectedPracticeAdjustedMelodyAsCustom();

    expect(deps.saveCustomEventMelody).toHaveBeenCalledWith(
      'Demo Tune (Adjusted)',
      [createEvent()],
      expect.any(Object),
      expect.objectContaining({
        sourceFormat: 'ascii',
        sourceTempoBpm: 76,
      })
    );
    expect(deps.finalizeImportSelection).toHaveBeenCalledWith(
      'saved-event-id',
      'Adjusted melody baked into a new custom copy.'
    );
  });
});
