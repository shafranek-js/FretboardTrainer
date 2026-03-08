import { describe, expect, it, vi } from 'vitest';
import { createMelodyEventEditorController } from './melody-event-editor-controller';

class FakeClassList {
  private readonly classes = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.classes.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.classes.delete(token));
  }

  contains(token: string) {
    return this.classes.has(token);
  }
}

function createButton() {
  return {
    disabled: false,
  } as HTMLButtonElement;
}

function createSelect() {
  return {
    innerHTML: '',
    disabled: false,
    value: '',
    appendChild: vi.fn(),
  } as unknown as HTMLSelectElement;
}

function createHarness() {
  return {
    dom: {
      melodyPreviewStatus: { textContent: '', className: '' } as HTMLElement,
      melodyPreviewSummary: { textContent: '' } as HTMLElement,
      melodyPreviewList: { innerHTML: '' } as HTMLElement,
      melodyEventEditorPanel: { classList: new FakeClassList() } as unknown as HTMLElement,
      melodyEventEditorSelection: { textContent: '' } as HTMLElement,
      melodyEventEditorNoteSelector: { innerHTML: '' } as HTMLElement,
      melodyEventEditorString: createSelect(),
      melodyEventEditorFret: { value: '', disabled: false } as HTMLInputElement,
      melodyEventEditorAddBtn: createButton(),
      melodyEventEditorDeleteBtn: createButton(),
      melodyEventEditorUndoBtn: createButton(),
      melodyEventEditorRedoBtn: createButton(),
    },
    onStateChange: vi.fn(),
  };
}

describe('melody-event-editor-controller', () => {
  it('adds an actionable next step to import preview errors', () => {
    const harness = createHarness();
    const controller = createMelodyEventEditorController({
      dom: harness.dom,
      getCurrentInstrument: () =>
        ({
          STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'],
          getNoteWithOctave: () => 'E4',
        }) as never,
      cloneDraft: (events) => structuredClone(events),
      formatUserFacingError: (prefix, error) => `${prefix}: ${String(error)}`,
      onStateChange: harness.onStateChange,
    });

    controller.renderPreviewError('Import failed', 'Bad track layout');

    expect(harness.dom.melodyPreviewStatus.textContent).toBe('Parse error');
    expect(harness.dom.melodyPreviewSummary.textContent).toContain('Import failed: Bad track layout');
    expect(harness.dom.melodyPreviewSummary.textContent).toContain('Try another file or track');
    expect(harness.dom.melodyEventEditorPanel.classList.contains('hidden')).toBe(true);
    expect(harness.onStateChange).toHaveBeenCalled();
  });
});
