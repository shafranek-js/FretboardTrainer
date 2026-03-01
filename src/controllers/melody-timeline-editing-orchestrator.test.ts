import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instruments } from '../instruments';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import { createMelodyTimelineEditingOrchestrator } from './melody-timeline-editing-orchestrator';

function cloneEvents(events: MelodyEvent[]) {
  return events.map((event) => ({
    ...event,
    notes: event.notes.map((note) => ({ ...note })),
  }));
}

function createCustomMelody(events: MelodyEvent[]): MelodyDefinition {
  return {
    id: 'melody-1',
    name: 'Custom melody',
    source: 'custom',
    instrumentName: instruments.guitar.name,
    events: cloneEvents(events),
    tabText: null,
    sourceFormat: 'midi',
    sourceFileName: 'demo.mid',
    sourceTrackName: 'Lead',
    sourceTempoBpm: 92,
  };
}

function createDeps(options?: {
  melody?: MelodyDefinition | null;
  trainingMode?: string;
  transpose?: number;
  stringShift?: number;
}) {
  let selectedMelody = options?.melody ?? null;
  let selection = { eventIndex: null as number | null, noteIndex: null as number | null };

  const deps = {
    getSelectedMelody: vi.fn(() => selectedMelody),
    getCurrentInstrument: vi.fn(() => instruments.guitar),
    getTimelineSelection: vi.fn(() => ({ ...selection })),
    setTimelineSelection: vi.fn((nextSelection: typeof selection) => {
      selection = { ...nextSelection };
    }),
    getMelodyTransposeSemitones: vi.fn(() => options?.transpose ?? 0),
    getMelodyStringShift: vi.fn(() => options?.stringShift ?? 0),
    getTrainingMode: vi.fn(() => options?.trainingMode ?? 'melody'),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    updateCustomEventMelody: vi.fn(
      (
        melodyId: string,
        melodyName: string,
        events: MelodyEvent[],
        _instrument,
        metadata?: {
          sourceFormat?: MelodyDefinition['sourceFormat'];
          sourceFileName?: string;
          sourceTrackName?: string;
          sourceScoreTitle?: string;
          sourceTempoBpm?: number;
        }
      ) => {
        if (selectedMelody) {
          selectedMelody = {
            ...selectedMelody,
            id: melodyId,
            name: melodyName,
            events: cloneEvents(events),
            sourceFormat: metadata?.sourceFormat ?? selectedMelody.sourceFormat,
            sourceFileName: metadata?.sourceFileName ?? selectedMelody.sourceFileName,
            sourceTrackName: metadata?.sourceTrackName ?? selectedMelody.sourceTrackName,
            sourceScoreTitle: metadata?.sourceScoreTitle ?? selectedMelody.sourceScoreTitle,
            sourceTempoBpm: metadata?.sourceTempoBpm ?? selectedMelody.sourceTempoBpm,
          };
        }
        return melodyId;
      }
    ),
    clearPracticeAdjustmentCaches: vi.fn(),
    renderTimeline: vi.fn(),
    redrawFretboard: vi.fn(),
  };

  return {
    deps,
    getSelection: () => selection,
    getSelectedMelody: () => selectedMelody,
    setSelectedMelody: (melody: MelodyDefinition | null) => {
      selectedMelody = melody;
    },
  };
}

describe('melody-timeline-editing-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-editable melodies and resets selection when workflow is inactive', () => {
    const asciiMelody: MelodyDefinition = {
      id: 'ascii-1',
      name: 'ASCII melody',
      source: 'custom',
      instrumentName: instruments.guitar.name,
      events: [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
      tabText: 'E|---|',
    };
    const harness = createDeps({ melody: asciiMelody, trainingMode: 'scale' });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    expect(orchestrator.canEditSelectedMelodyOnTimeline()).toEqual({
      editable: false,
      reason: 'Timeline editing is available for custom imported melodies only.',
    });

    harness.deps.setTimelineSelection({ eventIndex: 7, noteIndex: 2 });
    orchestrator.syncState();

    expect(harness.getSelection()).toEqual({ eventIndex: null, noteIndex: null });
  });

  it('loads editable melody state and persists moved notes back to the melody store', () => {
    const melody = createCustomMelody([{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    expect(harness.getSelection()).toEqual({ eventIndex: 0, noteIndex: 0 });

    orchestrator.moveSelectedNoteToString('E');

    expect(harness.deps.updateCustomEventMelody).toHaveBeenCalledTimes(1);
    expect(harness.getSelectedMelody()?.events[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'E',
      fret: 8,
    });
    expect(harness.deps.clearPracticeAdjustmentCaches).toHaveBeenCalledTimes(1);
    expect(harness.deps.renderTimeline).toHaveBeenCalledTimes(1);
    expect(harness.deps.redrawFretboard).toHaveBeenCalledTimes(1);
  });

  it('supports event split and merge through persisted mutations', () => {
    const melody = createCustomMelody([{ durationBeats: 2, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    orchestrator.splitEvent();

    expect(harness.getSelectedMelody()?.events).toHaveLength(2);
    expect(harness.getSelectedMelody()?.events[0]?.durationBeats).toBe(1);
    expect(harness.getSelectedMelody()?.events[1]?.durationBeats).toBe(1);

    orchestrator.mergeEventWithNext();

    expect(harness.getSelectedMelody()?.events).toHaveLength(1);
    expect(harness.getSelectedMelody()?.events[0]?.durationBeats).toBe(2);
  });

  it('restores persisted draft changes through undo and redo', () => {
    const melody = createCustomMelody([{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    orchestrator.addNote();
    expect(harness.getSelectedMelody()?.events[0]?.notes).toHaveLength(2);

    const renderCountAfterMutation = harness.deps.renderTimeline.mock.calls.length;
    const updateCountAfterMutation = harness.deps.updateCustomEventMelody.mock.calls.length;
    const redrawCountAfterMutation = harness.deps.redrawFretboard.mock.calls.length;
    orchestrator.undo();
    expect(harness.deps.renderTimeline.mock.calls.length).toBe(renderCountAfterMutation + 1);
    expect(harness.deps.updateCustomEventMelody.mock.calls.length).toBe(updateCountAfterMutation + 1);
    expect(harness.deps.redrawFretboard.mock.calls.length).toBe(redrawCountAfterMutation + 1);
    expect(harness.getSelectedMelody()?.events[0]?.notes).toHaveLength(1);

    orchestrator.redo();
    expect(harness.deps.renderTimeline.mock.calls.length).toBe(renderCountAfterMutation + 2);
    expect(harness.deps.updateCustomEventMelody.mock.calls.length).toBe(updateCountAfterMutation + 2);
    expect(harness.deps.redrawFretboard.mock.calls.length).toBe(redrawCountAfterMutation + 2);
    expect(harness.getSelectedMelody()?.events[0]?.notes).toHaveLength(2);
  });

  it('supports undo and redo for all primary timeline editing actions', () => {
    const createEvents = (): MelodyEvent[] => [
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 1, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
      { durationBeats: 2, notes: [{ note: 'E', stringName: 'D', fret: 2 }] },
    ];

    const operations = [
      {
        name: 'move note to another string',
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.moveSelectedNoteToString('E');
        },
      },
      {
        name: 'add note',
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.addNote();
        },
      },
      {
        name: 'delete note and remove empty event',
        setupSelection: { eventIndex: 1, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.deleteNote();
        },
      },
      {
        name: 'increase duration',
        setupSelection: { eventIndex: 2, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.adjustDuration(1);
        },
      },
      {
        name: 'add event after selection',
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.addEventAfterSelection();
        },
      },
      {
        name: 'duplicate event',
        setupSelection: { eventIndex: 1, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.duplicateEvent();
        },
      },
      {
        name: 'move event',
        setupSelection: { eventIndex: 2, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.moveSelectedEventToIndex(0);
        },
      },
      {
        name: 'delete event',
        setupSelection: { eventIndex: 1, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.deleteEvent();
        },
      },
      {
        name: 'split event',
        setupSelection: { eventIndex: 2, noteIndex: 0 },
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.splitEvent();
        },
      },
      {
        name: 'merge with next event',
        setupSelection: { eventIndex: 0, noteIndex: 0 },
        melody: createCustomMelody([
          { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
          { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
          { durationBeats: 1, notes: [{ note: 'E', stringName: 'D', fret: 2 }] },
        ]),
        run: (orchestrator: ReturnType<typeof createMelodyTimelineEditingOrchestrator>) => {
          orchestrator.mergeEventWithNext();
        },
      },
    ];

    for (const operation of operations) {
      const melody = operation.melody ?? createCustomMelody(createEvents());
      const harness = createDeps({ melody });
      const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

      orchestrator.syncState();
      if (operation.setupSelection) {
        harness.deps.setTimelineSelection(operation.setupSelection);
        orchestrator.syncState();
      }

      const initialSnapshot = JSON.stringify(harness.getSelectedMelody()?.events ?? []);
      operation.run(orchestrator);
      const mutatedSnapshot = JSON.stringify(harness.getSelectedMelody()?.events ?? []);
      expect(mutatedSnapshot, operation.name).not.toBe(initialSnapshot);

      orchestrator.undo();
      const undoneSnapshot = JSON.stringify(harness.getSelectedMelody()?.events ?? []);
      expect(undoneSnapshot, `${operation.name} undo`).toBe(initialSnapshot);

      orchestrator.redo();
      const redoneSnapshot = JSON.stringify(harness.getSelectedMelody()?.events ?? []);
      expect(redoneSnapshot, `${operation.name} redo`).toBe(mutatedSnapshot);
    }
  });

  it('inherits current event duration when adding a new event after selection', () => {
    const melody = createCustomMelody([
      { durationCountSteps: 3, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { durationBeats: 2, notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
    ]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    orchestrator.addEventAfterSelection();

    expect(harness.getSelectedMelody()?.events).toHaveLength(3);
    expect(harness.getSelectedMelody()?.events[1]).toMatchObject({
      durationCountSteps: 3,
      notes: [{ note: 'C', stringName: 'A', fret: 3 }],
    });
  });

  it('adds a note on the requested string for a clicked empty cell', () => {
    const melody = createCustomMelody([
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
    ]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    orchestrator.addNoteAtEventString(0, 'D');

    expect(harness.getSelectedMelody()?.events[0]?.notes).toEqual([
      { note: 'C', stringName: 'A', fret: 3 },
      { note: 'F', stringName: 'D', fret: 3 },
    ]);
  });

  it('adjusts selected note fret and supports undo/redo', () => {
    const melody = createCustomMelody([
      { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
    ]);
    const harness = createDeps({ melody });
    const orchestrator = createMelodyTimelineEditingOrchestrator(harness.deps);

    orchestrator.syncState();
    orchestrator.adjustSelectedNoteFret(1);
    expect(harness.getSelectedMelody()?.events[0]?.notes[0]).toEqual({
      note: 'C#',
      stringName: 'A',
      fret: 4,
    });

    orchestrator.undo();
    expect(harness.getSelectedMelody()?.events[0]?.notes[0]).toEqual({
      note: 'C',
      stringName: 'A',
      fret: 3,
    });

    orchestrator.redo();
    expect(harness.getSelectedMelody()?.events[0]?.notes[0]).toEqual({
      note: 'C#',
      stringName: 'A',
      fret: 4,
    });
  });
});
