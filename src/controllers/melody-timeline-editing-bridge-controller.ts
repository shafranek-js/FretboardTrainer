import type { MelodyDefinition } from '../melody-library';

interface TimelineEditingEligibilityFailure {
  editable: false;
  reason: string;
}

interface TimelineEditingEligibilitySuccess {
  editable: true;
  melody: MelodyDefinition;
}

type TimelineEditingEligibility = TimelineEditingEligibilityFailure | TimelineEditingEligibilitySuccess;

export interface MelodyTimelineEditingBridgeControllerDeps {
  resetState: () => void;
  canEditSelectedMelodyOnTimeline: () => TimelineEditingEligibility;
  ensureDraftLoaded: (melody: MelodyDefinition) => void;
  ensureSelection: () => void;
  syncState: (statusText?: string) => void;
  moveSelectedNoteToString: (targetStringName: string, options?: { commit?: boolean }) => void;
  adjustSelectedNoteFret: (direction: -1 | 1) => void;
  addNote: () => void;
  setSelectedNoteFinger: (finger: number | null) => void;
  addNoteAtEventString: (eventIndex: number, stringName: string) => void;
  deleteNote: () => void;
  adjustDuration: (direction: -1 | 1) => void;
  addEventAfterSelection: () => void;
  duplicateEvent: () => void;
  moveSelectedEventToIndex: (targetIndex: number) => void;
  deleteEvent: () => void;
  splitEvent: () => void;
  mergeEventWithNext: () => void;
  undo: () => void;
  redo: () => void;
}

export function createMelodyTimelineEditingBridgeController(
  deps: MelodyTimelineEditingBridgeControllerDeps
) {
  return {
    resetState: () => deps.resetState(),
    canEditSelectedMelodyOnTimeline: () => deps.canEditSelectedMelodyOnTimeline(),
    ensureDraftLoaded: (melody: MelodyDefinition) => deps.ensureDraftLoaded(melody),
    ensureSelection: () => deps.ensureSelection(),
    syncState: (statusText?: string) => deps.syncState(statusText),
    moveSelectedNoteToString: (targetStringName: string, options?: { commit?: boolean }) =>
      deps.moveSelectedNoteToString(targetStringName, options),
    adjustSelectedNoteFret: (direction: -1 | 1) => deps.adjustSelectedNoteFret(direction),
    addNote: () => deps.addNote(),
    setSelectedNoteFinger: (finger: number | null) => deps.setSelectedNoteFinger(finger),
    addNoteAtEventString: (eventIndex: number, stringName: string) =>
      deps.addNoteAtEventString(eventIndex, stringName),
    deleteNote: () => deps.deleteNote(),
    adjustDuration: (direction: -1 | 1) => deps.adjustDuration(direction),
    addEventAfterSelection: () => deps.addEventAfterSelection(),
    duplicateEvent: () => deps.duplicateEvent(),
    moveSelectedEventToIndex: (targetIndex: number) => deps.moveSelectedEventToIndex(targetIndex),
    deleteEvent: () => deps.deleteEvent(),
    splitEvent: () => deps.splitEvent(),
    mergeEventWithNext: () => deps.mergeEventWithNext(),
    undo: () => deps.undo(),
    redo: () => deps.redo(),
  };
}
