import { describe, expect, it, vi } from 'vitest';
import { createMelodyEditingControlsController } from './melody-editing-controls-controller';

type Listener = (event?: unknown) => void;

function createTarget(matches: string[] = []) {
  return {
    closest: (selector: string) => (matches.includes(selector) ? ({} as object) : null),
  };
}

function createInput(value = '') {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLInputElement & { listeners: Record<string, Listener> };
}

function createButton() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as HTMLButtonElement & { listeners: Record<string, Listener> };
}

function createDocumentStub() {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  } as unknown as Pick<Document, 'addEventListener'> & { listeners: Record<string, Listener> };
}

function createDeps() {
  const dom = {
    timelineViewMode: createInput('classic') as unknown as HTMLSelectElement & { listeners: Record<string, Listener> },
    melodyEventEditorString: createInput('A') as unknown as HTMLSelectElement & { listeners: Record<string, Listener> },
    melodyEventEditorFret: createInput('3'),
    melodyEventEditorAddBtn: createButton(),
    melodyEventEditorDeleteBtn: createButton(),
    melodyEventEditorUndoBtn: createButton(),
    melodyEventEditorRedoBtn: createButton(),
  };

  return {
    dom,
    state: {
      melodyTimelineSelectedEventIndex: 1,
      melodyTimelineSelectedNoteIndex: 0,
      melodyTimelineViewMode: 'classic' as const,
    },
    maxFret: 24,
    saveSettings: vi.fn(),
    refreshMelodyTimelineUi: vi.fn(),
    updateSelectedMelodyEventEditorNotePosition: vi.fn(),
    addMelodyEventEditorNote: vi.fn(),
    deleteSelectedMelodyEventEditorNote: vi.fn(),
    undoMelodyEventEditorMutation: vi.fn(),
    redoMelodyEventEditorMutation: vi.fn(),
    renderMelodyEventEditorInspector: vi.fn(),
    handleTimelineHotkey: vi.fn(() => false),
    syncMelodyTimelineEditingState: vi.fn(),
    clearMelodyTimelineSelection: vi.fn(),
    clearMelodyTimelineContextMenu: vi.fn(() => false),
    renderMelodyTabTimelineFromState: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    showNonBlockingError: vi.fn(),
  };
}

describe('melody-editing-controls-controller', () => {
  it('syncs timeline view mode and refreshes the timeline', () => {
    const deps = createDeps();
    const controller = createMelodyEditingControlsController(deps);

    controller.register(createDocumentStub());
    deps.dom.timelineViewMode.value = 'grid';
    deps.dom.timelineViewMode.listeners.change();

    expect(deps.state.melodyTimelineViewMode).toBe('grid');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });

  it('clamps fret input and updates selected note position', () => {
    const deps = createDeps();
    const controller = createMelodyEditingControlsController(deps);

    controller.register(createDocumentStub());
    deps.dom.melodyEventEditorFret.value = '99';
    deps.dom.melodyEventEditorFret.listeners.input();

    expect(deps.dom.melodyEventEditorFret.value).toBe('24');
    expect(deps.updateSelectedMelodyEventEditorNotePosition).toHaveBeenCalledWith('A', 24);
  });

  it('wires event editor action buttons', () => {
    const deps = createDeps();
    const controller = createMelodyEditingControlsController(deps);

    controller.register(createDocumentStub());
    deps.dom.melodyEventEditorAddBtn.listeners.click();
    deps.dom.melodyEventEditorDeleteBtn.listeners.click();
    deps.dom.melodyEventEditorUndoBtn.listeners.click();
    deps.dom.melodyEventEditorRedoBtn.listeners.click();

    expect(deps.addMelodyEventEditorNote).toHaveBeenCalledTimes(1);
    expect(deps.deleteSelectedMelodyEventEditorNote).toHaveBeenCalledTimes(1);
    expect(deps.undoMelodyEventEditorMutation).toHaveBeenCalledTimes(1);
    expect(deps.redoMelodyEventEditorMutation).toHaveBeenCalledTimes(1);
  });

  it('applies timeline hotkey follow-up sync and inspector refresh', () => {
    const deps = createDeps();
    deps.handleTimelineHotkey = vi.fn(() => ({ handled: true }));
    const doc = createDocumentStub();
    const controller = createMelodyEditingControlsController(deps);

    controller.register(doc);
    doc.listeners.keydown({ key: 'Delete' });

    expect(deps.handleTimelineHotkey).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
    expect(deps.renderMelodyEventEditorInspector).toHaveBeenCalledTimes(1);
  });

  it('clears selection on background click and rerenders open context menu', () => {
    const deps = createDeps();
    deps.clearMelodyTimelineContextMenu = vi.fn(() => true);
    const doc = createDocumentStub();
    const controller = createMelodyEditingControlsController(deps);

    controller.register(doc);
    doc.listeners.click({ target: createTarget() });

    expect(deps.renderMelodyTabTimelineFromState).toHaveBeenCalledTimes(1);
    expect(deps.clearMelodyTimelineSelection).toHaveBeenCalledTimes(1);
    expect(deps.renderMelodyEventEditorInspector).toHaveBeenCalledTimes(1);
  });
});
