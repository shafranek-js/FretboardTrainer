import { dom, state } from '../state';
import type { MelodyDefinition } from '../melody-library';
import {
  clearMelodyTimelineContextMenu,
  setMelodyTimelineEmptyCellAddHandler,
  setMelodyTimelineContextActionHandler,
  setMelodyTimelineContextMenuOpenHandler,
  setMelodyTimelineEventDragHandler,
  setMelodyTimelineNoteDragHandler,
  setMelodyTimelineNoteSelectHandler,
  setMelodyTimelineSelectionClearHandler,
} from '../melody-tab-timeline';

interface MelodyTimelineEditingControllerDeps {
  getSelectedMelodyId(): string | null;
  canEditSelectedMelodyOnTimeline(): { editable: false; reason: string } | { editable: true; melody: MelodyDefinition };
  ensureDraftLoaded(melody: MelodyDefinition): void;
  ensureSelection(): void;
  syncState(statusText?: string): void;
  renderTimeline(): void;
  stopPlaybackForEditing(): void;
  moveSelectedNoteToString(targetStringName: string, options?: { commit?: boolean }): void;
  adjustSelectedNoteFret(direction: -1 | 1): void;
  moveSelectedEventToIndex(targetIndex: number): void;
  adjustDuration(direction: -1 | 1): void;
  addNote(): void;
  addNoteAtEventString(eventIndex: number, stringName: string): void;
  addEventAfterSelection(): void;
  duplicateEvent(): void;
  splitEvent(): void;
  mergeEventWithNext(): void;
  deleteNote(): void;
  deleteEvent(): void;
  deleteEventEditorNote(): void;
  undo(): void;
  redo(): void;
  undoEventEditor(): void;
  redoEventEditor(): void;
  showNonBlockingError(message: string): void;
  formatUserFacingError(prefix: string, error: unknown): string;
  isTextEntryElement(target: EventTarget | null): boolean;
  isElementWithin(target: EventTarget | null, container: HTMLElement | null | undefined): boolean;
  isAnyBlockingModalOpen(): boolean;
  isMelodyWorkflowMode(mode: string): boolean;
}

type MelodyTimelineHotkeyResult = false | { handled: true; skipSync?: boolean };

export function createMelodyTimelineEditingController(deps: MelodyTimelineEditingControllerDeps) {
  function clearTimelineSelection() {
    clearMelodyTimelineContextMenu();
    state.melodyTimelineSelectedEventIndex = null;
    state.melodyTimelineSelectedNoteIndex = null;
    deps.renderTimeline();
  }

  function selectTimelineNote(eventIndex: number, noteIndex: number, options?: { toggle?: boolean }) {
    if (
      options?.toggle &&
      state.melodyTimelineSelectedEventIndex === eventIndex &&
      state.melodyTimelineSelectedNoteIndex === noteIndex
    ) {
      clearTimelineSelection();
      return;
    }

    const eligibility = deps.canEditSelectedMelodyOnTimeline();
    if (!eligibility.editable) {
      deps.syncState();
      deps.renderTimeline();
      return;
    }

    clearMelodyTimelineContextMenu();
    deps.stopPlaybackForEditing();
    deps.ensureDraftLoaded(eligibility.melody);
    state.melodyTimelineSelectedEventIndex = eventIndex;
    state.melodyTimelineSelectedNoteIndex = noteIndex;
    deps.ensureSelection();
    deps.syncState();
    deps.renderTimeline();
  }

  function isIgnorableNoteDragError(error: unknown) {
    if (!(error instanceof Error)) return false;
    return (
      error.message.includes('Cannot place this note on string') ||
      error.message.includes('is already occupied in this event')
    );
  }

  function handleContextAction(action: string) {
    switch (action) {
      case 'fret-down':
        deps.adjustSelectedNoteFret(-1);
        return;
      case 'fret-up':
        deps.adjustSelectedNoteFret(1);
        return;
      case 'duration-down':
        deps.adjustDuration(-1);
        return;
      case 'duration-up':
        deps.adjustDuration(1);
        return;
      case 'add-note':
        deps.addNote();
        return;
      case 'add-event':
        deps.addEventAfterSelection();
        return;
      case 'duplicate-event':
        deps.duplicateEvent();
        return;
      case 'split-event':
        deps.splitEvent();
        return;
      case 'merge-event':
        deps.mergeEventWithNext();
        return;
      case 'delete-note':
        deps.deleteNote();
        return;
      case 'delete-event':
        deps.deleteEvent();
        return;
      case 'undo':
        deps.undo();
        return;
      case 'redo':
        deps.redo();
        return;
      default:
        return;
    }
  }

  function getHotkeyContext(event: KeyboardEvent): 'timeline' | 'event-modal' | null {
    const target = event.target;
    const isMelodyImportOpen = !dom.melodyImportModal.classList.contains('hidden');
    if (
      isMelodyImportOpen &&
      (deps.isElementWithin(target, dom.melodyEventEditorPanel) || deps.isElementWithin(target, dom.melodyPreviewList))
    ) {
      return 'event-modal';
    }

    if (deps.isAnyBlockingModalOpen()) return null;
    if (
      deps.isMelodyWorkflowMode(dom.trainingMode.value) &&
      state.melodyTimelineSelectedEventIndex !== null &&
      (deps.isElementWithin(target, dom.melodyTabTimelinePanel) || target === document.body)
    ) {
      return 'timeline';
    }

    return null;
  }

  function handleUndoRedoHotkey(event: KeyboardEvent): MelodyTimelineHotkeyResult {
    const context = getHotkeyContext(event);
    if (!context) return false;

    const isPrimaryModifier = event.ctrlKey || event.metaKey;
    if (!isPrimaryModifier) return false;

    const key = event.key.toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!isUndo && !isRedo) return false;

    event.preventDefault();
    if (context === 'event-modal') {
      if (isUndo) {
        deps.undoEventEditor();
      } else {
        deps.redoEventEditor();
      }
      return { handled: true };
    }

    if (isUndo) {
      deps.undo();
    } else {
      deps.redo();
    }
    return { handled: true };
  }

  function handleActionHotkeys(event: KeyboardEvent): MelodyTimelineHotkeyResult {
    const context = getHotkeyContext(event);
    if (!context) return false;
    if (deps.isTextEntryElement(event.target)) return false;

    if (context === 'event-modal') {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deps.deleteEventEditorNote();
        return { handled: true };
      }
      return false;
    }

    if (context !== 'timeline') return false;

    const key = event.key;
    const lowerKey = key.toLowerCase();

    if (key === 'Escape') {
      event.preventDefault();
      clearTimelineSelection();
      return { handled: true, skipSync: true };
    }

    if ((key === 'Delete' || key === 'Backspace') && event.shiftKey) {
      event.preventDefault();
      deps.deleteEvent();
      return { handled: true };
    }
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      deps.deleteNote();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && key === '-') {
      event.preventDefault();
      deps.adjustDuration(-1);
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && (key === '=' || key === '+')) {
      event.preventDefault();
      deps.adjustDuration(1);
      return { handled: true };
    }
    if (event.altKey && key === 'ArrowLeft') {
      event.preventDefault();
      deps.moveSelectedEventToIndex(Math.max(0, (state.melodyTimelineSelectedEventIndex ?? 0) - 1));
      return { handled: true };
    }
    if (event.altKey && key === 'ArrowRight') {
      event.preventDefault();
      deps.moveSelectedEventToIndex((state.melodyTimelineSelectedEventIndex ?? 0) + 1);
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'ArrowUp') {
      event.preventDefault();
      deps.adjustSelectedNoteFret(1);
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'ArrowDown') {
      event.preventDefault();
      deps.adjustSelectedNoteFret(-1);
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && key === 'Insert') {
      event.preventDefault();
      deps.addNote();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && key === 'Insert') {
      event.preventDefault();
      deps.addEventAfterSelection();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'Enter') {
      event.preventDefault();
      deps.addEventAfterSelection();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && lowerKey === 'd') {
      event.preventDefault();
      deps.duplicateEvent();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && lowerKey === 's') {
      event.preventDefault();
      deps.splitEvent();
      return { handled: true };
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && lowerKey === 'm') {
      event.preventDefault();
      deps.mergeEventWithNext();
      return { handled: true };
    }

    return false;
  }

  function registerInteractionHandlers() {
    setMelodyTimelineNoteSelectHandler(({ melodyId, eventIndex, noteIndex, toggle }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      selectTimelineNote(eventIndex, noteIndex, { toggle });
    });

    setMelodyTimelineSelectionClearHandler(({ melodyId }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      clearTimelineSelection();
    });

    setMelodyTimelineEmptyCellAddHandler(({ melodyId, eventIndex, stringName }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      const eligibility = deps.canEditSelectedMelodyOnTimeline();
      if (!eligibility.editable) {
        deps.syncState();
        deps.renderTimeline();
        return;
      }
      deps.stopPlaybackForEditing();
      deps.ensureDraftLoaded(eligibility.melody);
      try {
        deps.addNoteAtEventString(eventIndex, stringName);
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to add note on the timeline', error));
      }
    });

    setMelodyTimelineNoteDragHandler(({ melodyId, eventIndex, noteIndex, stringName, commit }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      if (!commit) return;
      selectTimelineNote(eventIndex, noteIndex, { toggle: false });
      try {
        deps.moveSelectedNoteToString(stringName, { commit });
      } catch (error) {
        if (isIgnorableNoteDragError(error)) return;
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to drag note to a new string', error));
      }
    });

    setMelodyTimelineEventDragHandler(({ melodyId, sourceEventIndex, targetEventIndex, commit }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      if (!commit) return;
      const eligibility = deps.canEditSelectedMelodyOnTimeline();
      if (!eligibility.editable) return;
      deps.ensureDraftLoaded(eligibility.melody);
      state.melodyTimelineSelectedEventIndex = sourceEventIndex;
      deps.ensureSelection();
      try {
        deps.moveSelectedEventToIndex(targetEventIndex);
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to reorder event on the timeline', error));
      }
    });

    setMelodyTimelineContextActionHandler(({ melodyId, action }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      try {
        handleContextAction(action);
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Timeline action failed', error));
      }
    });

    setMelodyTimelineContextMenuOpenHandler(({ melodyId, eventIndex, noteIndex }) => {
      if (melodyId !== deps.getSelectedMelodyId()) return;
      const eligibility = deps.canEditSelectedMelodyOnTimeline();
      if (!eligibility.editable) return;
      deps.stopPlaybackForEditing();
      deps.ensureDraftLoaded(eligibility.melody);
      state.melodyTimelineSelectedEventIndex = eventIndex;
      state.melodyTimelineSelectedNoteIndex = noteIndex;
      deps.ensureSelection();
      deps.syncState();
      deps.renderTimeline();
    });
  }

  function handleHotkey(event: KeyboardEvent): MelodyTimelineHotkeyResult {
    try {
      const undoRedoResult = handleUndoRedoHotkey(event);
      if (undoRedoResult) return undoRedoResult;
      return handleActionHotkeys(event);
    } catch (error) {
      deps.showNonBlockingError(deps.formatUserFacingError('Melody editor shortcut failed', error));
      deps.syncState();
      return { handled: true };
    }
  }

  return {
    registerInteractionHandlers,
    handleHotkey,
    clearSelection: clearTimelineSelection,
  };
}
