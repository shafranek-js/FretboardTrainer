import type { MelodyDefinition, MelodyEvent } from '../melody-library';

type MelodyEditorMode = 'create' | 'edit-custom' | 'duplicate-builtin';

interface MelodyImportModalControllerDom {
  melodyNameInput: HTMLInputElement;
  melodyAsciiTabInput: HTMLTextAreaElement;
  importMelodyGpBtn: HTMLButtonElement;
  importMelodyMidiBtn: HTMLButtonElement;
  importMelodyBtn: HTMLButtonElement;
  melodyImportTitle: HTMLElement;
  melodyImportHelpText: HTMLElement;
}

interface MelodyImportModalControllerState {
  melodyEditorMode: MelodyEditorMode;
  editingMelodyId: string | null;
}

interface MelodyImportModalControllerDeps {
  dom: MelodyImportModalControllerDom;
  state: MelodyImportModalControllerState;
  hasStructuredEventDraft(): boolean;
  resetImportPreviewDraft(): void;
  updatePreview(): void;
  renderStructuredPreview(
    events: MelodyEvent[],
    options: {
      statusText: string;
      summaryPrefix: string;
      editableEvents: boolean;
      metadata?: {
        sourceFormat?: MelodyDefinition['sourceFormat'];
        sourceFileName?: string;
        sourceTrackName?: string;
        sourceScoreTitle?: string;
        sourceTempoBpm?: number;
      };
    }
  ): void;
  getSelectedMelodyId(): string | null;
  getSelectedMelody(): MelodyDefinition | null;
  setModalVisible(visible: boolean): void;
  focusNameInput(selectText?: boolean): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
}

export function createMelodyImportModalController(deps: MelodyImportModalControllerDeps) {
  function resetDraft() {
    deps.state.melodyEditorMode = 'create';
    deps.state.editingMelodyId = null;
    deps.resetImportPreviewDraft();
  }

  function syncUi() {
    const mode = deps.state.melodyEditorMode;
    const isStructuredEventEditor = deps.hasStructuredEventDraft();
    deps.dom.melodyAsciiTabInput.disabled = isStructuredEventEditor;
    deps.dom.melodyAsciiTabInput.classList.toggle('opacity-50', isStructuredEventEditor);
    deps.dom.importMelodyGpBtn.disabled = mode === 'edit-custom';
    deps.dom.importMelodyMidiBtn.disabled = mode === 'edit-custom';

    if (mode === 'edit-custom') {
      deps.dom.melodyImportTitle.textContent = isStructuredEventEditor ? 'Edit Custom Melody Notes' : 'Edit Custom Melody';
      deps.dom.melodyImportHelpText.textContent = isStructuredEventEditor
        ? 'Edit note positions directly in the preview list. Undo/redo is available before saving.'
        : 'Edit the ASCII tab for your custom melody. Keep numbered string labels and spacing/dashes to control note timing.';
      deps.dom.importMelodyBtn.textContent = 'Save Changes';
      return;
    }

    if (mode === 'duplicate-builtin') {
      deps.dom.melodyImportTitle.textContent = 'Duplicate Melody as Custom';
      deps.dom.melodyImportHelpText.textContent =
        'This will create a new custom copy. You can rearrange notes freely by editing the ASCII tab.';
      deps.dom.importMelodyBtn.textContent = 'Save Custom Copy';
      return;
    }

    deps.dom.melodyImportTitle.textContent = 'Import Melody from ASCII Tab';
    deps.dom.melodyImportHelpText.innerHTML =
      'Paste monophonic ASCII tabs with numbered string labels, for example: ' +
      '<code class="text-cyan-200">1 string 0---5---8---</code>, or use <strong class="text-violet-200">Import GP...</strong>.';
    deps.dom.importMelodyBtn.textContent = 'Import Melody';
  }

  function open(options?: { mode?: MelodyEditorMode }) {
    const mode = options?.mode ?? 'create';
    const selectedMelodyId = deps.getSelectedMelodyId();

    if (mode === 'create') {
      resetDraft();
      deps.dom.melodyNameInput.value = '';
      deps.dom.melodyAsciiTabInput.value = '';
      syncUi();
      deps.updatePreview();
      deps.setModalVisible(true);
      deps.focusNameInput(false);
      return true;
    }

    if (!selectedMelodyId) {
      deps.setResultMessage('Select a melody first.');
      return false;
    }

    const melody = deps.getSelectedMelody();
    if (!melody) {
      deps.setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
      return false;
    }
    if (!melody.tabText && melody.source !== 'custom') {
      deps.setResultMessage('This melody cannot be edited because its ASCII tab source is unavailable.', 'error');
      return false;
    }

    deps.state.melodyEditorMode = melody.source === 'custom' ? 'edit-custom' : 'duplicate-builtin';
    deps.state.editingMelodyId = melody.source === 'custom' ? melody.id : null;
    deps.dom.melodyNameInput.value = melody.source === 'custom' ? melody.name : `${melody.name} (Custom)`;
    deps.dom.melodyAsciiTabInput.value = melody.tabText ?? '';

    if (melody.source === 'custom' && !melody.tabText) {
      deps.renderStructuredPreview(melody.events, {
        statusText: 'Structured melody loaded',
        summaryPrefix: melody.sourceFormat?.toUpperCase() ?? 'EVENTS',
        editableEvents: true,
        metadata: {
          sourceFormat: melody.sourceFormat,
          sourceFileName: melody.sourceFileName,
          sourceTrackName: melody.sourceTrackName,
          sourceScoreTitle: melody.sourceScoreTitle,
          sourceTempoBpm: melody.sourceTempoBpm,
        },
      });
    } else {
      deps.updatePreview();
    }

    syncUi();
    deps.setModalVisible(true);
    deps.focusNameInput(true);
    return true;
  }

  function close() {
    deps.setModalVisible(false);
    resetDraft();
    syncUi();
  }

  return {
    resetDraft,
    syncUi,
    open,
    close,
  };
}
