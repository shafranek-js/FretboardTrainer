import { createMelodyTimelineEditingBridgeController } from './melody-timeline-editing-bridge-controller';
import { createMelodyTimelineEditingOrchestrator } from './melody-timeline-editing-orchestrator';

interface SessionMelodyTimelineEditingClusterDeps {
  melodyTimelineEditingOrchestrator: Parameters<typeof createMelodyTimelineEditingOrchestrator>[0];
}

export function createSessionMelodyTimelineEditingCluster(
  deps: SessionMelodyTimelineEditingClusterDeps
) {
  const melodyTimelineEditingOrchestrator = createMelodyTimelineEditingOrchestrator(
    deps.melodyTimelineEditingOrchestrator
  );
  const melodyTimelineEditingBridgeController = createMelodyTimelineEditingBridgeController({
    resetState: () => melodyTimelineEditingOrchestrator.resetState(),
    canEditSelectedMelodyOnTimeline: () =>
      melodyTimelineEditingOrchestrator.canEditSelectedMelodyOnTimeline(),
    ensureDraftLoaded: (melody) => melodyTimelineEditingOrchestrator.ensureDraftLoaded(melody),
    ensureSelection: () => melodyTimelineEditingOrchestrator.ensureSelection(),
    syncState: (_statusText) => melodyTimelineEditingOrchestrator.syncState(),
    moveSelectedNoteToString: (targetStringName, options) =>
      melodyTimelineEditingOrchestrator.moveSelectedNoteToString(targetStringName, options),
    adjustSelectedNoteFret: (direction) => melodyTimelineEditingOrchestrator.adjustSelectedNoteFret(direction),
    addNote: () => melodyTimelineEditingOrchestrator.addNote(),
    setSelectedNoteFinger: (finger) => melodyTimelineEditingOrchestrator.setSelectedNoteFinger(finger),
    addNoteAtEventString: (eventIndex, stringName) =>
      melodyTimelineEditingOrchestrator.addNoteAtEventString(eventIndex, stringName),
    deleteNote: () => melodyTimelineEditingOrchestrator.deleteNote(),
    adjustDuration: (direction) => melodyTimelineEditingOrchestrator.adjustDuration(direction),
    addEventAfterSelection: () => melodyTimelineEditingOrchestrator.addEventAfterSelection(),
    duplicateEvent: () => melodyTimelineEditingOrchestrator.duplicateEvent(),
    moveSelectedEventToIndex: (targetIndex) =>
      melodyTimelineEditingOrchestrator.moveSelectedEventToIndex(targetIndex),
    deleteEvent: () => melodyTimelineEditingOrchestrator.deleteEvent(),
    splitEvent: () => melodyTimelineEditingOrchestrator.splitEvent(),
    mergeEventWithNext: () => melodyTimelineEditingOrchestrator.mergeEventWithNext(),
    undo: () => melodyTimelineEditingOrchestrator.undo(),
    redo: () => melodyTimelineEditingOrchestrator.redo(),
  });

  return {
    melodyTimelineEditingOrchestrator,
    melodyTimelineEditingBridgeController,
  };
}

