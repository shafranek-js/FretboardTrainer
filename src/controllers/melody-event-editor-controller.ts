import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import { DEFAULT_TABLATURE_MAX_FRET } from '../tablature-optimizer';

type MelodyEventEditorMetadata = {
  sourceFormat?: MelodyDefinition['sourceFormat'];
  sourceFileName?: string;
  sourceTrackName?: string;
  sourceScoreTitle?: string;
  sourceTempoBpm?: number;
};

interface MelodyEventEditorDom {
  melodyPreviewStatus: HTMLElement;
  melodyPreviewSummary: HTMLElement;
  melodyPreviewList: HTMLElement;
  melodyEventEditorPanel: HTMLElement;
  melodyEventEditorSelection: HTMLElement;
  melodyEventEditorNoteSelector: HTMLElement;
  melodyEventEditorString: HTMLSelectElement;
  melodyEventEditorFret: HTMLInputElement;
  melodyEventEditorAddBtn: HTMLButtonElement;
  melodyEventEditorDeleteBtn: HTMLButtonElement;
  melodyEventEditorUndoBtn: HTMLButtonElement;
  melodyEventEditorRedoBtn: HTMLButtonElement;
}

interface MelodyEventEditorControllerDeps {
  dom: MelodyEventEditorDom;
  getCurrentInstrument(): IInstrument;
  cloneDraft(events: MelodyEvent[]): MelodyEvent[];
  formatUserFacingError(prefix: string, error: unknown): string;
  onStateChange(): void;
}

interface RenderPreviewOptions {
  statusText?: string;
  summaryPrefix?: string;
  editableEvents?: boolean;
  preserveDraft?: boolean;
  metadata?: MelodyEventEditorMetadata;
}

function stripScientificOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

export function createMelodyEventEditorController(deps: MelodyEventEditorControllerDeps) {
  let draft: MelodyEvent[] | null = null;
  let history: MelodyEvent[][] = [];
  let future: MelodyEvent[][] = [];
  let selectedEventIndex: number | null = null;
  let selectedNoteIndex: number | null = null;
  let sourceMetadata: MelodyEventEditorMetadata | null = null;

  function resetState() {
    draft = null;
    history = [];
    future = [];
    selectedEventIndex = null;
    selectedNoteIndex = null;
    sourceMetadata = null;
    deps.dom.melodyEventEditorPanel.classList.add('hidden');
    deps.dom.melodyEventEditorSelection.textContent = 'Select a note';
    deps.dom.melodyEventEditorNoteSelector.innerHTML = '';
    deps.dom.melodyEventEditorString.innerHTML = '';
    deps.dom.melodyEventEditorString.disabled = true;
    deps.dom.melodyEventEditorFret.value = '';
    deps.dom.melodyEventEditorFret.disabled = true;
    deps.dom.melodyEventEditorAddBtn.disabled = true;
    deps.dom.melodyEventEditorDeleteBtn.disabled = true;
    deps.dom.melodyEventEditorUndoBtn.disabled = true;
    deps.dom.melodyEventEditorRedoBtn.disabled = true;
  }

  function clearPreview() {
    resetState();
    deps.dom.melodyPreviewStatus.textContent = 'Paste tab to preview';
    deps.dom.melodyPreviewStatus.className = 'text-xs text-slate-400';
    deps.dom.melodyPreviewSummary.textContent = '';
    deps.dom.melodyPreviewList.innerHTML = '';
    deps.onStateChange();
  }

  function renderPreviewError(prefix: string, error: unknown) {
    resetState();
    deps.dom.melodyPreviewStatus.textContent = 'Parse error';
    deps.dom.melodyPreviewStatus.className = 'text-xs text-red-300';
    deps.dom.melodyPreviewSummary.textContent = deps.formatUserFacingError(prefix, error);
    deps.dom.melodyPreviewList.innerHTML = '';
    deps.onStateChange();
  }

  function formatPreviewEventLine(eventIndex: number, totalEvents: number, event: MelodyEvent) {
    const barText =
      typeof event.barIndex === 'number' && Number.isFinite(event.barIndex)
        ? `bar ${Math.max(0, Math.round(event.barIndex)) + 1} | `
        : '';
    const notesText = event.notes
      .map((note) =>
        note.stringName !== null && typeof note.fret === 'number'
          ? `${note.note}(${note.stringName}:${note.fret})`
          : note.note
      )
      .join(' + ');
    const timingText =
      typeof event.durationBeats === 'number'
        ? `${event.durationBeats.toFixed(2)} beat`
        : `${Math.max(1, event.durationColumns ?? 1)} col`;
    return `[${eventIndex + 1}/${totalEvents}] ${barText}${notesText}  ->  ${timingText}`;
  }

  function ensureSelection() {
    if (!draft || draft.length === 0) {
      selectedEventIndex = null;
      selectedNoteIndex = null;
      return;
    }

    if (selectedEventIndex === null || selectedEventIndex < 0 || selectedEventIndex >= draft.length) {
      selectedEventIndex = 0;
    }

    let event = draft[selectedEventIndex];
    if (!event || event.notes.length === 0) {
      const nextIndex = draft.findIndex((candidate) => candidate.notes.length > 0);
      if (nextIndex >= 0) {
        selectedEventIndex = nextIndex;
        event = draft[nextIndex]!;
      }
    }

    if (!event || event.notes.length === 0) {
      selectedNoteIndex = null;
      return;
    }

    if (selectedNoteIndex === null || selectedNoteIndex < 0 || selectedNoteIndex >= event.notes.length) {
      selectedNoteIndex = 0;
    }
  }

  function pushHistory() {
    if (!draft) return;
    history.push(deps.cloneDraft(draft));
    if (history.length > 100) {
      history.shift();
    }
    future = [];
  }

  function getSelectedNoteRef() {
    if (!draft || selectedEventIndex === null || selectedNoteIndex === null) return null;
    const event = draft[selectedEventIndex];
    if (!event) return null;
    const note = event.notes[selectedNoteIndex];
    if (!note) return null;
    return { event, note };
  }

  function getSummaryPrefix() {
    return sourceMetadata?.sourceFormat ? sourceMetadata.sourceFormat.toUpperCase() : undefined;
  }

  function getNoteCount() {
    return draft?.reduce((sum, event) => sum + event.notes.length, 0) ?? 0;
  }

  function renderCurrentDraft(statusText?: string) {
    if (!draft) return;
    renderPreviewFromEvents(draft, {
      statusText: statusText ?? deps.dom.melodyPreviewStatus.textContent,
      summaryPrefix: getSummaryPrefix(),
      editableEvents: true,
      preserveDraft: true,
      metadata: sourceMetadata ?? undefined,
    });
  }

  function renderInspector() {
    if (!draft) {
      resetState();
      deps.onStateChange();
      return;
    }

    ensureSelection();
    deps.dom.melodyEventEditorPanel.classList.remove('hidden');
    deps.dom.melodyEventEditorUndoBtn.disabled = history.length === 0;
    deps.dom.melodyEventEditorRedoBtn.disabled = future.length === 0;

    const selectedEvent = selectedEventIndex === null ? null : draft[selectedEventIndex] ?? null;
    const selectedNote =
      selectedEvent && selectedNoteIndex !== null ? selectedEvent.notes[selectedNoteIndex] ?? null : null;

    deps.dom.melodyEventEditorSelection.textContent =
      selectedEvent && selectedNote && selectedEventIndex !== null && selectedNoteIndex !== null
        ? `Event ${selectedEventIndex + 1} | Note ${selectedNoteIndex + 1} | ${selectedNote.note}`
        : 'Select a note';

    deps.dom.melodyEventEditorNoteSelector.innerHTML = '';
    if (selectedEvent && selectedEventIndex !== null) {
      selectedEvent.notes.forEach((note, noteIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        const isSelected = noteIndex === selectedNoteIndex;
        button.className =
          'h-8 rounded-md border px-2 text-[11px] font-semibold ' +
          (isSelected
            ? 'border-cyan-400 bg-cyan-700/30 text-cyan-50'
            : 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600');
        button.textContent =
          note.stringName !== null && typeof note.fret === 'number'
            ? `${note.note} ${note.stringName}:${note.fret}`
            : note.note;
        button.addEventListener('click', () => {
          selectedNoteIndex = noteIndex;
          renderInspector();
          renderPreviewFromEvents(draft!, {
            statusText: deps.dom.melodyPreviewStatus.textContent,
            summaryPrefix: getSummaryPrefix(),
            editableEvents: true,
            metadata: sourceMetadata ?? undefined,
            preserveDraft: true,
          });
        });
        deps.dom.melodyEventEditorNoteSelector.appendChild(button);
      });
    }

    deps.dom.melodyEventEditorString.innerHTML = '';
    deps.getCurrentInstrument().STRING_ORDER.forEach((stringName) => {
      const option = document.createElement('option');
      option.value = stringName;
      option.textContent = stringName;
      deps.dom.melodyEventEditorString.appendChild(option);
    });

    deps.dom.melodyEventEditorString.disabled = !selectedNote;
    deps.dom.melodyEventEditorFret.disabled = !selectedNote;
    deps.dom.melodyEventEditorAddBtn.disabled = !selectedEvent;
    deps.dom.melodyEventEditorDeleteBtn.disabled = !selectedNote || getNoteCount() <= 1;
    if (!selectedNote) {
      deps.dom.melodyEventEditorFret.value = '';
      deps.onStateChange();
      return;
    }

    if (selectedNote.stringName) {
      deps.dom.melodyEventEditorString.value = selectedNote.stringName;
    } else if (deps.getCurrentInstrument().STRING_ORDER.length > 0) {
      deps.dom.melodyEventEditorString.value = deps.getCurrentInstrument().STRING_ORDER[0]!;
    }
    deps.dom.melodyEventEditorFret.value =
      typeof selectedNote.fret === 'number' && Number.isFinite(selectedNote.fret) ? String(selectedNote.fret) : '0';
    deps.onStateChange();
  }

  function renderPreviewFromEvents(parsedEvents: MelodyEvent[], options?: RenderPreviewOptions) {
    if (options?.editableEvents) {
      if (!options.preserveDraft) {
        draft = deps.cloneDraft(parsedEvents);
        history = [];
        future = [];
        selectedEventIndex = parsedEvents.findIndex((event) => event.notes.length > 0);
        if (selectedEventIndex < 0) selectedEventIndex = 0;
        selectedNoteIndex = 0;
        sourceMetadata = options.metadata ?? null;
      }
    } else {
      resetState();
    }

    const totalNotes = parsedEvents.reduce((sum, event) => sum + event.notes.length, 0);
    const polyphonicEvents = parsedEvents.filter((event) => event.notes.length > 1).length;
    const beatAwareEvents = parsedEvents.filter((event) => typeof event.durationBeats === 'number').length;

    deps.dom.melodyPreviewStatus.textContent = options?.statusText ?? 'Parsed successfully';
    deps.dom.melodyPreviewStatus.className = 'text-xs text-emerald-300';
    deps.dom.melodyPreviewSummary.textContent =
      `${options?.summaryPrefix ? `${options.summaryPrefix} | ` : ''}${parsedEvents.length} events, ${totalNotes} notes` +
      (polyphonicEvents > 0 ? `, ${polyphonicEvents} polyphonic` : '') +
      (beatAwareEvents > 0 ? `, beat timing detected` : ', column timing fallback');

    deps.dom.melodyPreviewList.innerHTML = '';
    const maxPreviewItems = 10;
    parsedEvents.slice(0, maxPreviewItems).forEach((event, index) => {
      const li = document.createElement('li');
      if (options?.editableEvents) {
        li.className = 'rounded-md border border-slate-600/70 bg-slate-900/35 px-2 py-1.5';
        const header = document.createElement('div');
        header.className = 'mb-1 flex items-center justify-between gap-2';
        const label = document.createElement('span');
        label.className = 'text-[11px] text-slate-300';
        label.textContent = `Event ${index + 1}`;
        header.appendChild(label);
        const timing = document.createElement('span');
        timing.className = 'text-[10px] text-slate-400';
        timing.textContent =
          typeof event.durationBeats === 'number'
            ? `${event.durationBeats.toFixed(2)} beat`
            : `${Math.max(1, event.durationColumns ?? 1)} col`;
        header.appendChild(timing);
        li.appendChild(header);

        const notesRow = document.createElement('div');
        notesRow.className = 'flex flex-wrap gap-1';
        event.notes.forEach((note, noteIndex) => {
          const button = document.createElement('button');
          button.type = 'button';
          const isSelected = index === selectedEventIndex && noteIndex === selectedNoteIndex;
          button.className =
            'rounded-md border px-2 py-1 text-[11px] font-semibold ' +
            (isSelected
              ? 'border-cyan-400 bg-cyan-700/30 text-cyan-50'
              : 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600');
          button.textContent =
            note.stringName !== null && typeof note.fret === 'number'
              ? `${note.note} ${note.stringName}:${note.fret}`
              : note.note;
          button.addEventListener('click', () => {
            selectedEventIndex = index;
            selectedNoteIndex = noteIndex;
            renderPreviewFromEvents(draft ?? parsedEvents, {
              statusText: options?.statusText,
              summaryPrefix: options?.summaryPrefix,
              editableEvents: true,
              preserveDraft: true,
              metadata: sourceMetadata ?? undefined,
            });
          });
          notesRow.appendChild(button);
        });
        li.appendChild(notesRow);
      } else {
        li.textContent = formatPreviewEventLine(index, parsedEvents.length, event);
      }
      deps.dom.melodyPreviewList.appendChild(li);
    });

    if (parsedEvents.length > maxPreviewItems) {
      const li = document.createElement('li');
      li.className = 'text-slate-400';
      li.textContent = `... and ${parsedEvents.length - maxPreviewItems} more events`;
      deps.dom.melodyPreviewList.appendChild(li);
    }

    if (options?.editableEvents) {
      renderInspector();
      return;
    }

    deps.onStateChange();
  }

  function commitMutation(mutator: (currentDraft: MelodyEvent[]) => void, statusText?: string) {
    if (!draft) return;
    pushHistory();
    mutator(draft);
    ensureSelection();
    renderCurrentDraft(statusText);
  }

  function updateSelectedNotePosition(stringName: string, fretValue: number) {
    const selected = getSelectedNoteRef();
    if (!selected) return;
    const fret = Math.max(0, Math.min(DEFAULT_TABLATURE_MAX_FRET, Math.round(fretValue)));
    const noteWithOctave = deps.getCurrentInstrument().getNoteWithOctave(stringName, fret);
    if (!noteWithOctave) {
      throw new Error(`Cannot resolve ${stringName} fret ${fret} for the current instrument.`);
    }
    commitMutation(() => {
      selected.note.stringName = stringName;
      selected.note.fret = fret;
      selected.note.note = stripScientificOctave(noteWithOctave);
    });
  }

  function deleteSelectedNote() {
    if (!draft || selectedEventIndex === null || selectedNoteIndex === null) return;
    if (getNoteCount() <= 1) {
      throw new Error('A melody must contain at least one note.');
    }
    commitMutation((currentDraft) => {
      const event = currentDraft[selectedEventIndex!];
      if (!event) return;
      event.notes.splice(selectedNoteIndex!, 1);
      if (event.notes.length === 0) {
        currentDraft.splice(selectedEventIndex!, 1);
        if (currentDraft.length === 0) {
          selectedEventIndex = null;
          selectedNoteIndex = null;
          return;
        }
        selectedEventIndex = Math.max(0, Math.min(selectedEventIndex!, currentDraft.length - 1));
        selectedNoteIndex = 0;
      }
    });
  }

  function addNote() {
    if (!draft || selectedEventIndex === null) return;
    const selectedEvent = draft[selectedEventIndex];
    if (!selectedEvent) return;

    const usedStrings = new Set(selectedEvent.notes.map((note) => note.stringName).filter((value): value is string => !!value));
    const selected = getSelectedNoteRef();
    const preferredFret =
      selected && typeof selected.note.fret === 'number' && Number.isFinite(selected.note.fret) ? selected.note.fret : 0;
    const candidateStrings = [
      ...(selected?.note.stringName ? [selected.note.stringName] : []),
      ...deps.getCurrentInstrument().STRING_ORDER,
    ];
    const targetStringName =
      candidateStrings.find((stringName) => !usedStrings.has(stringName)) ??
      deps.getCurrentInstrument().STRING_ORDER[0] ??
      null;
    if (!targetStringName) {
      throw new Error('Current instrument has no available strings.');
    }

    const noteWithOctave = deps.getCurrentInstrument().getNoteWithOctave(targetStringName, preferredFret);
    if (!noteWithOctave) {
      throw new Error(`Cannot resolve ${targetStringName} fret ${preferredFret} for the current instrument.`);
    }

    commitMutation((currentDraft) => {
      const event = currentDraft[selectedEventIndex!];
      if (!event) return;
      event.notes.push({
        note: stripScientificOctave(noteWithOctave),
        stringName: targetStringName,
        fret: preferredFret,
      });
      selectedNoteIndex = event.notes.length - 1;
    });
  }

  function undo() {
    if (!draft || history.length === 0) return;
    future.push(deps.cloneDraft(draft));
    const previous = history.pop();
    if (!previous) return;
    draft = deps.cloneDraft(previous);
    ensureSelection();
    renderCurrentDraft('Edit undone');
  }

  function redo() {
    if (!future.length) return;
    if (draft) {
      history.push(deps.cloneDraft(draft));
    }
    const next = future.pop();
    if (!next) return;
    draft = deps.cloneDraft(next);
    ensureSelection();
    renderCurrentDraft('Edit restored');
  }

  return {
    resetState,
    clearPreview,
    renderPreviewError,
    renderPreviewFromEvents,
    renderInspector,
    updateSelectedNotePosition,
    addNote,
    deleteSelectedNote,
    undo,
    redo,
    hasDraft: () => draft !== null,
    getDraft: () => (draft ? deps.cloneDraft(draft) : null),
    getSourceMetadata: () => (sourceMetadata ? { ...sourceMetadata } : null),
  };
}
