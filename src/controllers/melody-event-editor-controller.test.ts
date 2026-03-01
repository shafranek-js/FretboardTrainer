import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MelodyEvent } from '../melody-library';
import { createMelodyEventEditorController } from './melody-event-editor-controller';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

class FakeElement {
  value = '';
  textContent = '';
  innerHTML = '';
  className = '';
  type = '';
  disabled = false;
  classList = new FakeClassList();
  children: FakeElement[] = [];

  appendChild(child: FakeElement) {
    this.children.push(child);
    return child;
  }

  addEventListener(_event: string, _handler: EventListener) {}
}

function installDocumentStub() {
  const original = globalThis.document;
  (globalThis as { document?: { createElement(tagName: string): FakeElement } }).document = {
    createElement: (_tagName: string) => new FakeElement(),
  };
  return () => {
    if (original) {
      globalThis.document = original;
      return;
    }
    delete (globalThis as { document?: unknown }).document;
  };
}

function createDom() {
  return {
    melodyPreviewStatus: new FakeElement() as unknown as HTMLElement,
    melodyPreviewSummary: new FakeElement() as unknown as HTMLElement,
    melodyPreviewList: new FakeElement() as unknown as HTMLElement,
    melodyEventEditorPanel: new FakeElement() as unknown as HTMLElement,
    melodyEventEditorSelection: new FakeElement() as unknown as HTMLElement,
    melodyEventEditorNoteSelector: new FakeElement() as unknown as HTMLElement,
    melodyEventEditorString: new FakeElement() as unknown as HTMLSelectElement,
    melodyEventEditorFret: new FakeElement() as unknown as HTMLInputElement,
    melodyEventEditorAddBtn: new FakeElement() as unknown as HTMLButtonElement,
    melodyEventEditorDeleteBtn: new FakeElement() as unknown as HTMLButtonElement,
    melodyEventEditorUndoBtn: new FakeElement() as unknown as HTMLButtonElement,
    melodyEventEditorRedoBtn: new FakeElement() as unknown as HTMLButtonElement,
  };
}

function cloneDraft(events: MelodyEvent[]) {
  return events.map((event) => ({
    barIndex: event.barIndex,
    column: event.column,
    durationColumns: event.durationColumns,
    durationCountSteps: event.durationCountSteps,
    durationBeats: event.durationBeats,
    notes: event.notes.map((note) => ({
      note: note.note,
      stringName: note.stringName,
      fret: note.fret,
    })),
  }));
}

function createInstrument() {
  return {
    STRING_ORDER: ['A', 'D', 'G'],
    getNoteWithOctave: vi.fn((stringName: string, fret: number) => {
      if (stringName === 'A') return `C${fret}`;
      if (stringName === 'D') return `D${fret}`;
      if (stringName === 'G') return `G${fret}`;
      return null;
    }),
  };
}

describe('melody-event-editor-controller', () => {
  let restoreDocument: (() => void) | null = null;

  beforeEach(() => {
    restoreDocument = installDocumentStub();
  });

  afterEach(() => {
    restoreDocument?.();
    restoreDocument = null;
  });

  it('loads editable preview draft and updates selected note position', () => {
    const dom = createDom();
    const instrument = createInstrument();
    const controller = createMelodyEventEditorController({
      dom,
      getCurrentInstrument: () => instrument as never,
      cloneDraft,
      formatUserFacingError: (prefix, error) => `${prefix}: ${String(error)}`,
      onStateChange: vi.fn(),
    });

    controller.renderPreviewFromEvents(
      [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
      { editableEvents: true, summaryPrefix: 'GP' }
    );

    expect(controller.hasDraft()).toBe(true);
    controller.updateSelectedNotePosition('D', 5);
    expect(controller.getDraft()?.[0]?.notes[0]).toEqual({ note: 'D', stringName: 'D', fret: 5 });
  });

  it('adds note and supports undo redo', () => {
    const dom = createDom();
    const instrument = createInstrument();
    const controller = createMelodyEventEditorController({
      dom,
      getCurrentInstrument: () => instrument as never,
      cloneDraft,
      formatUserFacingError: (prefix, error) => `${prefix}: ${String(error)}`,
      onStateChange: vi.fn(),
    });

    controller.renderPreviewFromEvents(
      [{ durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
      { editableEvents: true }
    );

    controller.addNote();
    expect(controller.getDraft()?.[0]?.notes).toHaveLength(2);

    controller.undo();
    expect(controller.getDraft()?.[0]?.notes).toHaveLength(1);

    controller.redo();
    expect(controller.getDraft()?.[0]?.notes).toHaveLength(2);
  });

  it('removes the whole event when deleting its last note', () => {
    const dom = createDom();
    const instrument = createInstrument();
    const controller = createMelodyEventEditorController({
      dom,
      getCurrentInstrument: () => instrument as never,
      cloneDraft,
      formatUserFacingError: (prefix, error) => `${prefix}: ${String(error)}`,
      onStateChange: vi.fn(),
    });

    controller.renderPreviewFromEvents(
      [
        { durationBeats: 1, notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
        { durationBeats: 2, notes: [{ note: 'D', stringName: 'D', fret: 5 }] },
      ],
      { editableEvents: true }
    );

    controller.deleteSelectedNote();
    expect(controller.getDraft()).toHaveLength(1);
    expect(controller.getDraft()?.[0]?.notes[0]).toEqual({ note: 'D', stringName: 'D', fret: 5 });
  });
});
