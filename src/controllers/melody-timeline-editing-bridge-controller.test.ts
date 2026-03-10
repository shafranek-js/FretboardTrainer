import { describe, expect, it, vi } from 'vitest';
import type { MelodyDefinition } from '../melody-library';
import { createMelodyTimelineEditingBridgeController } from './melody-timeline-editing-bridge-controller';

function createDeps() {
  const melody = { id: 'melody-1', name: 'Test melody' } as MelodyDefinition;
  return {
    melody,
    resetState: vi.fn(),
    canEditSelectedMelodyOnTimeline: vi.fn(() => ({ editable: true as const, melody })),
    ensureDraftLoaded: vi.fn(),
    ensureSelection: vi.fn(),
    syncState: vi.fn(),
    moveSelectedNoteToString: vi.fn(),
    adjustSelectedNoteFret: vi.fn(),
    addNote: vi.fn(),
    setSelectedNoteFinger: vi.fn(),
    addNoteAtEventString: vi.fn(),
    deleteNote: vi.fn(),
    adjustDuration: vi.fn(),
    addEventAfterSelection: vi.fn(),
    duplicateEvent: vi.fn(),
    moveSelectedEventToIndex: vi.fn(),
    deleteEvent: vi.fn(),
    splitEvent: vi.fn(),
    mergeEventWithNext: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

describe('melody-timeline-editing-bridge-controller', () => {
  it('delegates state sync and selection helpers', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingBridgeController(deps);

    controller.resetState();
    expect(controller.canEditSelectedMelodyOnTimeline()).toEqual({ editable: true, melody: deps.melody });
    controller.ensureDraftLoaded(deps.melody);
    controller.ensureSelection();
    controller.syncState('ignored');

    expect(deps.resetState).toHaveBeenCalledTimes(1);
    expect(deps.canEditSelectedMelodyOnTimeline).toHaveBeenCalledTimes(1);
    expect(deps.ensureDraftLoaded).toHaveBeenCalledWith(deps.melody);
    expect(deps.ensureSelection).toHaveBeenCalledTimes(1);
    expect(deps.syncState).toHaveBeenCalledWith('ignored');
  });

  it('delegates editing mutations with their arguments', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingBridgeController(deps);

    controller.moveSelectedNoteToString('A', { commit: true });
    controller.adjustSelectedNoteFret(1);
    controller.addNote();
    controller.setSelectedNoteFinger(3);
    controller.addNoteAtEventString(4, 'D');
    controller.deleteNote();
    controller.adjustDuration(-1);
    controller.addEventAfterSelection();
    controller.duplicateEvent();
    controller.moveSelectedEventToIndex(7);
    controller.deleteEvent();
    controller.splitEvent();
    controller.mergeEventWithNext();
    controller.undo();
    controller.redo();

    expect(deps.moveSelectedNoteToString).toHaveBeenCalledWith('A', { commit: true });
    expect(deps.adjustSelectedNoteFret).toHaveBeenCalledWith(1);
    expect(deps.addNote).toHaveBeenCalledTimes(1);
    expect(deps.setSelectedNoteFinger).toHaveBeenCalledWith(3);
    expect(deps.addNoteAtEventString).toHaveBeenCalledWith(4, 'D');
    expect(deps.deleteNote).toHaveBeenCalledTimes(1);
    expect(deps.adjustDuration).toHaveBeenCalledWith(-1);
    expect(deps.addEventAfterSelection).toHaveBeenCalledTimes(1);
    expect(deps.duplicateEvent).toHaveBeenCalledTimes(1);
    expect(deps.moveSelectedEventToIndex).toHaveBeenCalledWith(7);
    expect(deps.deleteEvent).toHaveBeenCalledTimes(1);
    expect(deps.splitEvent).toHaveBeenCalledTimes(1);
    expect(deps.mergeEventWithNext).toHaveBeenCalledTimes(1);
    expect(deps.undo).toHaveBeenCalledTimes(1);
    expect(deps.redo).toHaveBeenCalledTimes(1);
  });
});
