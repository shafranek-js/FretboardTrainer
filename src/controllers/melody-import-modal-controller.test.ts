import { describe, expect, it, vi } from 'vitest';
import type { MelodyDefinition } from '../melody-library';
import { createMelodyImportModalController } from './melody-import-modal-controller';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

function createDom() {
  return {
    melodyNameInput: {
      value: '',
      focus: vi.fn(),
      select: vi.fn(),
      classList: new FakeClassList(),
    },
    melodyAsciiTabInput: {
      value: '',
      disabled: false,
      classList: new FakeClassList(),
    },
    importMelodyGpBtn: { disabled: false },
    importMelodyMidiBtn: { disabled: false },
    importMelodyBtn: { textContent: '' },
    melodyImportTitle: { textContent: '' },
    melodyImportHelpText: { textContent: '', innerHTML: '' },
  };
}

function createDeps(overrides?: { melody?: MelodyDefinition | null }) {
  const dom = createDom();
  const state = {
    melodyEditorMode: 'create' as const,
    editingMelodyId: null as string | null,
  };
  const melody = overrides?.melody ?? null;
  const deps = {
    dom,
    state,
    hasStructuredEventDraft: vi.fn(() => false),
    resetImportPreviewDraft: vi.fn(),
    updatePreview: vi.fn(),
    renderStructuredPreview: vi.fn(),
    getSelectedMelodyId: vi.fn(() => melody?.id ?? null),
    getSelectedMelody: vi.fn(() => melody),
    setModalVisible: vi.fn(),
    focusNameInput: vi.fn(),
    setResultMessage: vi.fn(),
  };
  return { deps, dom, state };
}

describe('melody-import-modal-controller', () => {
  it('opens create mode with reset draft and empty inputs', () => {
    const { deps, dom, state } = createDeps();
    const controller = createMelodyImportModalController(deps);
    dom.melodyNameInput.value = 'Old';
    dom.melodyAsciiTabInput.value = 'Old tab';

    const opened = controller.open({ mode: 'create' });

    expect(opened).toBe(true);
    expect(state.melodyEditorMode).toBe('create');
    expect(state.editingMelodyId).toBeNull();
    expect(dom.melodyNameInput.value).toBe('');
    expect(dom.melodyAsciiTabInput.value).toBe('');
    expect(deps.resetImportPreviewDraft).toHaveBeenCalled();
    expect(deps.updatePreview).toHaveBeenCalled();
    expect(deps.setModalVisible).toHaveBeenCalledWith(true);
  });

  it('opens custom structured melody in edit mode', () => {
    const melody = {
      id: 'melody-1',
      name: 'Romanza',
      source: 'custom' as const,
      events: [{ notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
      tabText: undefined,
      sourceFormat: 'midi' as const,
      sourceFileName: 'romanza.mid',
      sourceTrackName: 'Lead',
      sourceScoreTitle: 'Romanza',
      sourceTempoBpm: 92,
    };
    const { deps, state } = createDeps({ melody });
    deps.hasStructuredEventDraft = vi.fn(() => true);
    const controller = createMelodyImportModalController(deps);

    const opened = controller.open({ mode: 'edit-custom' });

    expect(opened).toBe(true);
    expect(state.melodyEditorMode).toBe('edit-custom');
    expect(state.editingMelodyId).toBe('melody-1');
    expect(deps.renderStructuredPreview).toHaveBeenCalled();
    expect(deps.setModalVisible).toHaveBeenCalledWith(true);
  });

  it('refuses to open edit mode without selection', () => {
    const { deps } = createDeps();
    const controller = createMelodyImportModalController(deps);

    const opened = controller.open({ mode: 'edit-custom' });

    expect(opened).toBe(false);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Select a melody first.');
  });
});
