import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition, MelodyEvent } from '../melody-library';
import {
  addMelodyTimelineEditingEventAfterSelection,
  addMelodyTimelineEditingNote,
  adjustSelectedMelodyTimelineEventDuration,
  canMergeMelodyEventWithNext,
  canSplitMelodyEvent,
  cloneMelodyEventsDraft,
  deleteSelectedMelodyTimelineEvent,
  deleteSelectedMelodyTimelineEditingNote,
  duplicateSelectedMelodyTimelineEvent,
  ensureMelodyTimelineEditingDraftLoaded,
  ensureMelodyTimelineEditingSelection,
  mergeSelectedMelodyTimelineEventWithNext,
  moveSelectedMelodyTimelineEditingNoteToString,
  moveSelectedMelodyTimelineEventToIndex,
  pushMelodyTimelineEditingHistory,
  redoMelodyTimelineEditingMutation,
  resetMelodyTimelineEditingSession,
  splitSelectedMelodyTimelineEvent,
  type MelodyTimelineEditingSelection,
  type MelodyTimelineEditingSession,
  undoMelodyTimelineEditingMutation,
  updateSelectedMelodyTimelineEditingNotePosition,
} from '../melody-timeline-editing';

interface EditableTimelineMelodyResult {
  editable: false;
  reason: string;
}

interface EditableTimelineMelodySuccess {
  editable: true;
  melody: MelodyDefinition;
}

type EditableTimelineMelodyEligibility = EditableTimelineMelodyResult | EditableTimelineMelodySuccess;

interface MelodyTimelineEditingOrchestratorDeps {
  getSelectedMelody(): MelodyDefinition | null;
  getCurrentInstrument(): IInstrument;
  getTimelineSelection(): MelodyTimelineEditingSelection;
  setTimelineSelection(selection: MelodyTimelineEditingSelection): void;
  getMelodyTransposeSemitones(): number;
  getMelodyStringShift(): number;
  getTrainingMode(): string;
  isMelodyWorkflowMode(mode: string): boolean;
  updateCustomEventMelody(
    melodyId: string,
    melodyName: string,
    events: MelodyEvent[],
    instrument: IInstrument,
    metadata?: {
      sourceFormat?: MelodyDefinition['sourceFormat'];
      sourceFileName?: string;
      sourceTrackName?: string;
      sourceScoreTitle?: string;
      sourceTempoBpm?: number;
    }
  ): string | null;
  clearPracticeAdjustmentCaches(): void;
  renderTimeline(): void;
  redrawFretboard(): void;
}

export function createMelodyTimelineEditingOrchestrator(deps: MelodyTimelineEditingOrchestratorDeps) {
  let melodyId: string | null = null;
  let draft: MelodyEvent[] | null = null;
  let history: MelodyEvent[][] = [];
  let future: MelodyEvent[][] = [];

  function getSessionModel(): MelodyTimelineEditingSession {
    return { melodyId, draft, history, future };
  }

  function applySessionModel(session: MelodyTimelineEditingSession) {
    melodyId = session.melodyId;
    draft = session.draft;
    history = session.history;
    future = session.future;
  }

  function withModels<T>(
    callback: (session: MelodyTimelineEditingSession, selection: MelodyTimelineEditingSelection) => T
  ) {
    const session = getSessionModel();
    const selection = deps.getTimelineSelection();
    const result = callback(session, selection);
    applySessionModel(session);
    deps.setTimelineSelection(selection);
    return result;
  }

  function resetState() {
    withModels((session, selection) => {
      resetMelodyTimelineEditingSession(session, selection);
    });
  }

  function getSelectedTimelineEditableMelody() {
    const melody = deps.getSelectedMelody();
    if (!melody || melody.source !== 'custom' || typeof melody.tabText === 'string') return null;
    return melody;
  }

  function canEditSelectedMelodyOnTimeline(): EditableTimelineMelodyEligibility {
    const melody = getSelectedTimelineEditableMelody();
    if (!melody) {
      return { editable: false, reason: 'Timeline editing is available for custom imported melodies only.' };
    }
    if (deps.getMelodyTransposeSemitones() !== 0 || deps.getMelodyStringShift() !== 0) {
      return {
        editable: false,
        reason: 'Reset transpose and string shift to 0 before editing source notes on the timeline.',
      };
    }
    return { editable: true, melody };
  }

  function ensureDraftLoaded(melody: MelodyDefinition) {
    withModels((session) => {
      ensureMelodyTimelineEditingDraftLoaded(session, melody.id, melody.events);
    });
  }

  function ensureSelection() {
    withModels((session, selection) => {
      ensureMelodyTimelineEditingSelection(session, selection);
    });
  }

  function syncState() {
    if (!deps.isMelodyWorkflowMode(deps.getTrainingMode())) {
      resetState();
      return;
    }

    const eligibility = canEditSelectedMelodyOnTimeline();
    if (!eligibility.editable) {
      resetState();
      return;
    }

    ensureDraftLoaded(eligibility.melody);
    ensureSelection();
  }

  function pushHistory() {
    withModels((session) => {
      pushMelodyTimelineEditingHistory(session);
    });
  }

  function persistDraft(statusText = 'Timeline melody updated') {
    void statusText;
    if (!draft) return;
    const melody = getSelectedTimelineEditableMelody();
    if (!melody) {
      resetState();
      return;
    }

    deps.updateCustomEventMelody(melody.id, melody.name, draft, deps.getCurrentInstrument(), {
      sourceFormat: melody.sourceFormat,
      sourceFileName: melody.sourceFileName,
      sourceTrackName: melody.sourceTrackName,
      sourceScoreTitle: melody.sourceScoreTitle,
      sourceTempoBpm: melody.sourceTempoBpm,
    });
    deps.clearPracticeAdjustmentCaches();
    const refreshed = deps.getSelectedMelody();
    draft = refreshed ? cloneMelodyEventsDraft(refreshed.events) : draft;
    syncState();
    deps.renderTimeline();
    deps.redrawFretboard();
  }

  function commitMutation(mutator: () => void, statusText?: string) {
    if (!draft) return;
    pushHistory();
    mutator();
    ensureSelection();
    persistDraft(statusText);
  }

  function moveSelectedNoteToString(targetStringName: string, options?: { commit?: boolean }) {
    if (options?.commit === false) {
      withModels((session, selection) => {
        moveSelectedMelodyTimelineEditingNoteToString(
          session,
          selection,
          deps.getCurrentInstrument(),
          24,
          targetStringName,
          { commit: false }
        );
      });
      return;
    }

    commitMutation(() => {
      withModels((session, selection) => {
        moveSelectedMelodyTimelineEditingNoteToString(
          session,
          selection,
          deps.getCurrentInstrument(),
          24,
          targetStringName,
          options
        );
      });
    });
  }

  function adjustSelectedNoteFret(direction: -1 | 1) {
    commitMutation(() => {
      withModels((session, selection) => {
        const eventIndex = selection.eventIndex;
        const noteIndex = selection.noteIndex;
        const selectedNote =
          eventIndex === null || noteIndex === null ? null : session.draft?.[eventIndex]?.notes[noteIndex] ?? null;
        const stringName = selectedNote?.stringName;
        const currentFret = selectedNote?.fret;
        if (!stringName || typeof currentFret !== 'number' || !Number.isFinite(currentFret)) return;
        updateSelectedMelodyTimelineEditingNotePosition(
          session,
          selection,
          deps.getCurrentInstrument(),
          24,
          stringName,
          currentFret + direction
        );
      });
    }, direction > 0 ? 'Fret increased' : 'Fret decreased');
  }

  function addNote() {
    commitMutation(() => {
      withModels((session, selection) => {
        addMelodyTimelineEditingNote(session, selection, deps.getCurrentInstrument());
      });
    });
  }

  function addNoteAtEventString(eventIndex: number, stringName: string) {
    commitMutation(() => {
      withModels((session, selection) => {
        if (!session.draft || eventIndex < 0 || eventIndex >= session.draft.length) return;
        selection.eventIndex = eventIndex;
        selection.noteIndex = 0;
        ensureMelodyTimelineEditingSelection(session, selection);
        addMelodyTimelineEditingNote(session, selection, deps.getCurrentInstrument(), {
          preferredStringName: stringName,
        });
      });
    });
  }

  function deleteNote() {
    commitMutation(() => {
      withModels((session, selection) => {
        deleteSelectedMelodyTimelineEditingNote(session, selection);
      });
    });
  }

  function adjustDuration(direction: -1 | 1) {
    commitMutation(() => {
      withModels((session, selection) => {
        adjustSelectedMelodyTimelineEventDuration(session, selection, direction);
      });
    }, direction > 0 ? 'Duration increased' : 'Duration decreased');
  }

  function addEventAfterSelection() {
    commitMutation(() => {
      withModels((session, selection) => {
        addMelodyTimelineEditingEventAfterSelection(session, selection, deps.getCurrentInstrument());
      });
    }, 'Event added');
  }

  function duplicateEvent() {
    commitMutation(() => {
      withModels((session, selection) => {
        duplicateSelectedMelodyTimelineEvent(session, selection);
      });
    }, 'Event duplicated');
  }

  function moveSelectedEventToIndex(targetIndex: number) {
    const sourceIndex = deps.getTimelineSelection().eventIndex;
    if (!draft || sourceIndex === null) return;
    const normalizedTargetIndex = Math.max(0, Math.min(draft.length - 1, Math.round(targetIndex)));
    if (normalizedTargetIndex === sourceIndex) return;

    commitMutation(() => {
      withModels((session, selection) => {
        moveSelectedMelodyTimelineEventToIndex(session, selection, normalizedTargetIndex);
      });
    }, normalizedTargetIndex < sourceIndex ? 'Event moved earlier' : 'Event moved later');
  }

  function deleteEvent() {
    commitMutation(() => {
      withModels((session, selection) => {
        deleteSelectedMelodyTimelineEvent(session, selection);
      });
    }, 'Event deleted');
  }

  function splitEvent() {
    if (!canSplitMelodyEvent(draft?.[deps.getTimelineSelection().eventIndex ?? -1])) {
      throw new Error('Selected event is too short to split.');
    }

    commitMutation(() => {
      withModels((session, selection) => {
        splitSelectedMelodyTimelineEvent(session, selection);
      });
    }, 'Event split');
  }

  function mergeEventWithNext() {
    if (!canMergeMelodyEventWithNext(draft, deps.getTimelineSelection().eventIndex)) {
      throw new Error('Only neighboring events with the same notes can be merged.');
    }

    commitMutation(() => {
      withModels((session, selection) => {
        mergeSelectedMelodyTimelineEventWithNext(session, selection);
      });
    }, 'Events merged');
  }

  function undo() {
    const changed = withModels((session, selection) => undoMelodyTimelineEditingMutation(session, selection));
    if (!changed) return;
    persistDraft('Edit undone');
  }

  function redo() {
    const changed = withModels((session, selection) => redoMelodyTimelineEditingMutation(session, selection));
    if (!changed) return;
    persistDraft('Edit restored');
  }

  return {
    resetState,
    canEditSelectedMelodyOnTimeline,
    ensureDraftLoaded,
    ensureSelection,
    syncState,
    moveSelectedNoteToString,
    adjustSelectedNoteFret,
    addNote,
    addNoteAtEventString,
    deleteNote,
    adjustDuration,
    addEventAfterSelection,
    duplicateEvent,
    moveSelectedEventToIndex,
    deleteEvent,
    splitEvent,
    mergeEventWithNext,
    undo,
    redo,
  };
}
