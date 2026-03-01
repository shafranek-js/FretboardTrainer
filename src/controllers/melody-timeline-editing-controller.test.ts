import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MelodyDefinition } from '../melody-library';

const testHarness = vi.hoisted(() => ({
  noteSelectHandler: null as
    | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; toggle?: boolean }) => void)
    | null,
  selectionClearHandler: null as ((payload: { melodyId: string }) => void) | null,
  emptyCellAddHandler: null as
    | ((payload: { melodyId: string; eventIndex: number; stringName: string }) => void)
    | null,
  noteDragHandler: null as
    | ((
        payload: {
          melodyId: string;
          eventIndex: number;
          noteIndex: number;
          stringName: string;
          commit: boolean;
        }
      ) => void)
    | null,
  eventDragHandler: null as
    | ((payload: {
        melodyId: string;
        sourceEventIndex: number;
        targetEventIndex: number;
        commit: boolean;
      }) => void)
    | null,
  contextMenuOpenHandler: null as
    | ((payload: {
        melodyId: string;
        eventIndex: number;
        noteIndex: number | null;
        anchorX: number;
        anchorY: number;
      }) => void)
    | null,
  contextActionHandler: null as ((payload: { melodyId: string; action: string }) => void) | null,
  mockDom: {
    melodyImportModal: {
      classList: {
        contains: vi.fn(() => true),
      },
    },
    melodyEventEditorPanel: { id: 'event-panel' } as unknown as HTMLElement,
    melodyPreviewList: { id: 'preview-list' } as unknown as HTMLElement,
    trainingMode: { value: 'melody' } as HTMLSelectElement,
    melodyTabTimelinePanel: { id: 'timeline-panel' } as unknown as HTMLElement,
  },
  mockState: {
    melodyTimelineSelectedEventIndex: null as number | null,
    melodyTimelineSelectedNoteIndex: null as number | null,
  },
}));

vi.mock('../state', () => ({
  dom: testHarness.mockDom,
  state: testHarness.mockState,
}));

vi.mock('../melody-tab-timeline', () => ({
  setMelodyTimelineNoteSelectHandler: vi.fn((handler: typeof testHarness.noteSelectHandler) => {
    testHarness.noteSelectHandler = handler;
  }),
  setMelodyTimelineSelectionClearHandler: vi.fn((handler: typeof testHarness.selectionClearHandler) => {
    testHarness.selectionClearHandler = handler;
  }),
  setMelodyTimelineEmptyCellAddHandler: vi.fn((handler: typeof testHarness.emptyCellAddHandler) => {
    testHarness.emptyCellAddHandler = handler;
  }),
  setMelodyTimelineNoteDragHandler: vi.fn((handler: typeof testHarness.noteDragHandler) => {
    testHarness.noteDragHandler = handler;
  }),
  setMelodyTimelineEventDragHandler: vi.fn((handler: typeof testHarness.eventDragHandler) => {
    testHarness.eventDragHandler = handler;
  }),
  setMelodyTimelineContextMenuOpenHandler: vi.fn((handler: typeof testHarness.contextMenuOpenHandler) => {
    testHarness.contextMenuOpenHandler = handler;
  }),
  setMelodyTimelineContextActionHandler: vi.fn((handler: typeof testHarness.contextActionHandler) => {
    testHarness.contextActionHandler = handler;
  }),
  clearMelodyTimelineContextMenu: vi.fn(),
}));

import { createMelodyTimelineEditingController } from './melody-timeline-editing-controller';

function createDeps(overrides: Partial<Parameters<typeof createMelodyTimelineEditingController>[0]> = {}) {
  const melody = { id: 'melody-1', name: 'Test melody' } as MelodyDefinition;
  return {
    getSelectedMelodyId: vi.fn(() => 'melody-1'),
    canEditSelectedMelodyOnTimeline: vi.fn(() => ({ editable: true as const, melody })),
    ensureDraftLoaded: vi.fn(),
    ensureSelection: vi.fn(),
    syncState: vi.fn(),
    renderTimeline: vi.fn(),
    stopPlaybackForEditing: vi.fn(),
    moveSelectedNoteToString: vi.fn(),
    adjustSelectedNoteFret: vi.fn(),
    moveSelectedEventToIndex: vi.fn(),
    adjustDuration: vi.fn(),
    addNote: vi.fn(),
    addNoteAtEventString: vi.fn(),
    addEventAfterSelection: vi.fn(),
    duplicateEvent: vi.fn(),
    splitEvent: vi.fn(),
    mergeEventWithNext: vi.fn(),
    deleteNote: vi.fn(),
    deleteEvent: vi.fn(),
    deleteEventEditorNote: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    undoEventEditor: vi.fn(),
    redoEventEditor: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string, error: unknown) =>
      `${prefix}: ${error instanceof Error ? error.message : String(error)}`
    ),
    isTextEntryElement: vi.fn(() => false),
    isElementWithin: vi.fn((target: EventTarget | null, container: HTMLElement | null | undefined) => target === container),
    isAnyBlockingModalOpen: vi.fn(() => false),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    ...overrides,
  };
}

function createKeyEvent(
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    target?: EventTarget | null;
  } = {}
) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: testHarness.mockDom.melodyTabTimelinePanel,
    preventDefault: vi.fn(),
    ...options,
  } as unknown as KeyboardEvent;
}

describe('melody-timeline-editing-controller', () => {
  beforeEach(() => {
    testHarness.noteSelectHandler = null;
    testHarness.selectionClearHandler = null;
    testHarness.emptyCellAddHandler = null;
    testHarness.noteDragHandler = null;
    testHarness.eventDragHandler = null;
    testHarness.contextMenuOpenHandler = null;
    testHarness.contextActionHandler = null;
    testHarness.mockState.melodyTimelineSelectedEventIndex = null;
    testHarness.mockState.melodyTimelineSelectedNoteIndex = null;
    testHarness.mockDom.trainingMode.value = 'melody';
    testHarness.mockDom.melodyImportModal.classList.contains.mockReturnValue(true);
  });

  it('selects a timeline note through registered handlers', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingController(deps);

    controller.registerInteractionHandlers();
    testHarness.noteSelectHandler?.({ melodyId: 'melody-1', eventIndex: 4, noteIndex: 1 });

    expect(deps.stopPlaybackForEditing).toHaveBeenCalled();
    expect(deps.ensureDraftLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'melody-1' })
    );
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBe(4);
    expect(testHarness.mockState.melodyTimelineSelectedNoteIndex).toBe(1);
    expect(deps.ensureSelection).toHaveBeenCalled();
    expect(deps.syncState).toHaveBeenCalled();
    expect(deps.renderTimeline).toHaveBeenCalled();
  });

  it('adds a note on a double-clicked empty cell', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingController(deps);

    controller.registerInteractionHandlers();
    testHarness.emptyCellAddHandler?.({ melodyId: 'melody-1', eventIndex: 3, stringName: 'D' });

    expect(deps.stopPlaybackForEditing).toHaveBeenCalled();
    expect(deps.ensureDraftLoaded).toHaveBeenCalledWith(expect.objectContaining({ id: 'melody-1' }));
    expect(deps.addNoteAtEventString).toHaveBeenCalledWith(3, 'D');
  });

  it('toggles off selection when the selected note is clicked again or cleared explicitly', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingController(deps);

    controller.registerInteractionHandlers();
    testHarness.noteSelectHandler?.({ melodyId: 'melody-1', eventIndex: 2, noteIndex: 0 });
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBe(2);

    testHarness.noteSelectHandler?.({ melodyId: 'melody-1', eventIndex: 2, noteIndex: 0, toggle: true });
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBeNull();
    expect(testHarness.mockState.melodyTimelineSelectedNoteIndex).toBeNull();

    testHarness.noteSelectHandler?.({ melodyId: 'melody-1', eventIndex: 1, noteIndex: 1 });
    testHarness.selectionClearHandler?.({ melodyId: 'melody-1' });
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBeNull();
    expect(testHarness.mockState.melodyTimelineSelectedNoteIndex).toBeNull();
  });

  it('suppresses non-playable note drag errors without showing an alert', () => {
    const deps = createDeps({
      moveSelectedNoteToString: vi.fn(() => {
        throw new Error('Cannot place this note on string A within the visible fret range');
      }),
    });
    const controller = createMelodyTimelineEditingController(deps);

    controller.registerInteractionHandlers();
    testHarness.noteDragHandler?.({
      melodyId: 'melody-1',
      eventIndex: 1,
      noteIndex: 0,
      stringName: 'A',
      commit: true,
    });

    expect(deps.moveSelectedNoteToString).toHaveBeenCalledWith('A', { commit: true });
    expect(deps.showNonBlockingError).not.toHaveBeenCalled();
  });

  it('routes timeline and modal hotkeys to the correct undo/redo handlers', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingController(deps);

    testHarness.mockState.melodyTimelineSelectedEventIndex = 2;
    const timelineUndo = createKeyEvent('z', {
      ctrlKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(timelineUndo)).toEqual({ handled: true });
    expect(deps.undo).toHaveBeenCalledTimes(1);

    testHarness.mockDom.melodyImportModal.classList.contains.mockReturnValue(false);
    const modalRedo = createKeyEvent('z', {
      ctrlKey: true,
      shiftKey: true,
      target: testHarness.mockDom.melodyEventEditorPanel,
    });
    expect(controller.handleHotkey(modalRedo)).toEqual({ handled: true });
    expect(deps.redoEventEditor).toHaveBeenCalledTimes(1);
  });

  it('dispatches context actions and timeline action hotkeys', () => {
    const deps = createDeps();
    const controller = createMelodyTimelineEditingController(deps);

    controller.registerInteractionHandlers();
    testHarness.contextMenuOpenHandler?.({
      melodyId: 'melody-1',
      eventIndex: 3,
      noteIndex: 0,
      anchorX: 24,
      anchorY: 12,
    });
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBe(3);
    expect(testHarness.mockState.melodyTimelineSelectedNoteIndex).toBe(0);

    testHarness.eventDragHandler?.({
      melodyId: 'melody-1',
      sourceEventIndex: 3,
      targetEventIndex: 1,
      commit: true,
    });
    expect(deps.ensureDraftLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'melody-1' })
    );
    expect(deps.moveSelectedEventToIndex).toHaveBeenCalledWith(1);

    testHarness.contextActionHandler?.({ melodyId: 'melody-1', action: 'split-event' });
    expect(deps.splitEvent).toHaveBeenCalledTimes(1);

    testHarness.mockState.melodyTimelineSelectedEventIndex = 3;
    const moveLeft = createKeyEvent('ArrowLeft', {
      altKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(moveLeft)).toEqual({ handled: true });
    expect(deps.moveSelectedEventToIndex).toHaveBeenCalledWith(2);

    const fretUp = createKeyEvent('ArrowUp', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(fretUp)).toEqual({ handled: true });
    expect(deps.adjustSelectedNoteFret).toHaveBeenCalledWith(1);

    const fretDown = createKeyEvent('ArrowDown', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(fretDown)).toEqual({ handled: true });
    expect(deps.adjustSelectedNoteFret).toHaveBeenCalledWith(-1);

    const decreaseDuration = createKeyEvent('-', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(decreaseDuration)).toEqual({ handled: true });
    expect(deps.adjustDuration).toHaveBeenCalledWith(-1);

    const increaseDuration = createKeyEvent('=', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(increaseDuration)).toEqual({ handled: true });
    expect(deps.adjustDuration).toHaveBeenCalledWith(1);

    const duplicate = createKeyEvent('d', {
      shiftKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(duplicate)).toEqual({ handled: true });
    expect(deps.duplicateEvent).toHaveBeenCalledTimes(1);

    const split = createKeyEvent('s', {
      shiftKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(split)).toEqual({ handled: true });
    expect(deps.splitEvent).toHaveBeenCalledTimes(2);

    const merge = createKeyEvent('m', {
      shiftKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(merge)).toEqual({ handled: true });
    expect(deps.mergeEventWithNext).toHaveBeenCalledTimes(1);

    const addEventByInsert = createKeyEvent('Insert', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(addEventByInsert)).toEqual({ handled: true });
    expect(deps.addEventAfterSelection).toHaveBeenCalledTimes(1);

    const addNote = createKeyEvent('Insert', {
      shiftKey: true,
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(addNote)).toEqual({ handled: true });
    expect(deps.addNote).toHaveBeenCalledTimes(1);

    const addEvent = createKeyEvent('Enter', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(addEvent)).toEqual({ handled: true });
    expect(deps.addEventAfterSelection).toHaveBeenCalledTimes(2);

    testHarness.mockState.melodyTimelineSelectedEventIndex = 1;
    testHarness.mockState.melodyTimelineSelectedNoteIndex = 0;
    const escape = createKeyEvent('Escape', {
      target: testHarness.mockDom.melodyTabTimelinePanel,
    });
    expect(controller.handleHotkey(escape)).toEqual({ handled: true, skipSync: true });
    expect(testHarness.mockState.melodyTimelineSelectedEventIndex).toBeNull();
    expect(testHarness.mockState.melodyTimelineSelectedNoteIndex).toBeNull();
  });
});
