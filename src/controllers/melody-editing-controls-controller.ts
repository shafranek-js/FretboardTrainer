interface ElementLike {
  closest(selector: string): ElementLike | null;
}

type TimelineHotkeyResult = false | { handled: true; skipSync?: boolean };
type TimelineViewMode = 'classic' | 'grid';

interface MelodyEditingControlsDom {
  timelineViewMode: HTMLSelectElement;
  melodyEventEditorString: HTMLSelectElement;
  melodyEventEditorFret: HTMLInputElement;
  melodyEventEditorAddBtn: HTMLButtonElement;
  melodyEventEditorDeleteBtn: HTMLButtonElement;
  melodyEventEditorUndoBtn: HTMLButtonElement;
  melodyEventEditorRedoBtn: HTMLButtonElement;
}

interface MelodyEditingControlsState {
  melodyTimelineSelectedEventIndex: number | null;
  melodyTimelineSelectedNoteIndex: number | null;
  melodyTimelineViewMode: TimelineViewMode;
}

export interface MelodyEditingControlsControllerDeps {
  dom: MelodyEditingControlsDom;
  state: MelodyEditingControlsState;
  maxFret: number;
  saveSettings: () => void;
  refreshMelodyTimelineUi: () => void;
  updateSelectedMelodyEventEditorNotePosition: (stringName: string, fretValue: number) => void;
  addMelodyEventEditorNote: () => void;
  deleteSelectedMelodyEventEditorNote: () => void;
  undoMelodyEventEditorMutation: () => void;
  redoMelodyEventEditorMutation: () => void;
  renderMelodyEventEditorInspector: () => void;
  handleTimelineHotkey: (event: KeyboardEvent) => TimelineHotkeyResult;
  syncMelodyTimelineEditingState: () => void;
  clearMelodyTimelineSelection: () => void;
  clearMelodyTimelineContextMenu: () => boolean;
  renderMelodyTabTimelineFromState: () => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  showNonBlockingError: (message: string) => void;
}

function isElementLike(target: unknown): target is ElementLike {
  return typeof target === 'object' && target !== null && 'closest' in target && typeof (target as { closest?: unknown }).closest === 'function';
}

export function createMelodyEditingControlsController(deps: MelodyEditingControlsControllerDeps) {
  function register(doc: Pick<Document, 'addEventListener'> = document) {
    deps.dom.timelineViewMode.addEventListener('change', () => {
      deps.state.melodyTimelineViewMode = deps.dom.timelineViewMode.value === 'grid' ? 'grid' : 'classic';
      deps.dom.timelineViewMode.value = deps.state.melodyTimelineViewMode;
      deps.saveSettings();
      deps.refreshMelodyTimelineUi();
    });

    deps.dom.melodyEventEditorString.addEventListener('change', () => {
      try {
        const fretValue = Number.parseInt(deps.dom.melodyEventEditorFret.value, 10);
        deps.updateSelectedMelodyEventEditorNotePosition(
          deps.dom.melodyEventEditorString.value,
          Number.isFinite(fretValue) ? fretValue : 0
        );
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to update note string', error));
        deps.renderMelodyEventEditorInspector();
      }
    });

    deps.dom.melodyEventEditorFret.addEventListener('input', () => {
      const parsed = Number.parseInt(deps.dom.melodyEventEditorFret.value, 10);
      if (!Number.isFinite(parsed)) return;
      const clamped = Math.max(0, Math.min(deps.maxFret, Math.round(parsed)));
      deps.dom.melodyEventEditorFret.value = String(clamped);
      try {
        deps.updateSelectedMelodyEventEditorNotePosition(deps.dom.melodyEventEditorString.value, clamped);
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to update note fret', error));
        deps.renderMelodyEventEditorInspector();
      }
    });

    deps.dom.melodyEventEditorAddBtn.addEventListener('click', () => {
      try {
        deps.addMelodyEventEditorNote();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to add note', error));
        deps.renderMelodyEventEditorInspector();
      }
    });

    deps.dom.melodyEventEditorDeleteBtn.addEventListener('click', () => {
      try {
        deps.deleteSelectedMelodyEventEditorNote();
      } catch (error) {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to delete note', error));
        deps.renderMelodyEventEditorInspector();
      }
    });

    deps.dom.melodyEventEditorUndoBtn.addEventListener('click', () => {
      deps.undoMelodyEventEditorMutation();
    });

    deps.dom.melodyEventEditorRedoBtn.addEventListener('click', () => {
      deps.redoMelodyEventEditorMutation();
    });

    doc.addEventListener('keydown', (event) => {
      const hotkeyResult = deps.handleTimelineHotkey(event as KeyboardEvent);
      if (!hotkeyResult) return;
      if (!hotkeyResult.skipSync) {
        deps.syncMelodyTimelineEditingState();
      }
      deps.renderMelodyEventEditorInspector();
    });

    doc.addEventListener('click', (event) => {
      const target = (event as MouseEvent).target;
      if (!isElementLike(target)) return;
      if (!target.closest('.timeline-context-menu')) {
        const hadOpenTimelineContextMenu = deps.clearMelodyTimelineContextMenu();
        if (hadOpenTimelineContextMenu) {
          deps.renderMelodyTabTimelineFromState();
        }
      }

      if (
        deps.state.melodyTimelineSelectedEventIndex === null &&
        deps.state.melodyTimelineSelectedNoteIndex === null
      ) {
        return;
      }

      if (target.closest('[data-note-index]')) return;
      if (target.closest('.timeline-context-menu')) return;
      if (target.closest('[data-timeline-range-ui="true"]')) return;
      if (target.closest('button, input, select, textarea, a, label, summary')) return;
      if (target.closest('[role="button"]')) return;

      deps.clearMelodyTimelineSelection();
      deps.renderMelodyEventEditorInspector();
    });
  }

  return { register };
}
