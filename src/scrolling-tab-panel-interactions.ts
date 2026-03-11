import { dom } from './dom';
import {
  emitMelodyTimelineContextMenuOpen,
} from './melody-tab-timeline-context-menu';
import {
  emitMelodyTimelineEventDrag,
  emitMelodyTimelineNoteDrag,
  emitMelodyTimelineNoteSelect,
} from './melody-tab-timeline-drag';
import {
  emitMelodyTimelineEmptyCellAdd,
} from './melody-tab-timeline-handlers';
import {
  emitMelodyTimelineSelectionClear,
} from './melody-tab-timeline-interactions';
import type { ScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';
import {
  resolveScrollingTabPanelClosestEventIndex,
  resolveScrollingTabPanelHitTarget,
} from './scrolling-tab-panel-hit-testing';

interface ScrollingTabPanelInteractionState {
  melodyId: string;
  model: ScrollingTabPanelModel;
  layout: ScrollingTabPanelLayout;
  editingEnabled: boolean;
  selectedEventIndex: number | null;
  selectedNoteIndex: number | null;
}

let bound = false;
let interactionState: ScrollingTabPanelInteractionState | null = null;

function getCanvasPoint(event: MouseEvent | PointerEvent) {
  const rect = dom.scrollingTabPanelCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function resolveStringNameAtY(y: number, state: ScrollingTabPanelInteractionState) {
  const { layout, model } = state;
  if (y < layout.neckTopY || y > layout.neckTopY + layout.neckHeight) {
    return null;
  }
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  layout.stringYs.forEach((stringY, index) => {
    const distance = Math.abs(y - stringY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return model.stringNames[bestIndex] ?? null;
}

function setCanvasCursor(target: ReturnType<typeof resolveScrollingTabPanelHitTarget> | null, editingEnabled: boolean) {
  if (!target) {
    dom.scrollingTabPanelCanvas.style.cursor = editingEnabled ? 'default' : '';
    return;
  }
  if (target.kind === 'note') {
    dom.scrollingTabPanelCanvas.style.cursor = editingEnabled ? 'grab' : 'pointer';
    return;
  }
  if (target.kind === 'event' || target.kind === 'empty-cell') {
    dom.scrollingTabPanelCanvas.style.cursor = editingEnabled ? 'pointer' : 'default';
    return;
  }
  dom.scrollingTabPanelCanvas.style.cursor = 'default';
}

export function updateScrollingTabPanelInteractionState(nextState: ScrollingTabPanelInteractionState | null) {
  interactionState = nextState;
}

export function bindScrollingTabPanelInteractions() {
  if (bound) return;
  bound = true;

  dom.scrollingTabPanelCanvas.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  dom.scrollingTabPanelCanvas.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    const activeState = interactionState;
    if (!activeState || !activeState.editingEnabled) return;
    const { x, y } = getCanvasPoint(event);
    const hitTarget = resolveScrollingTabPanelHitTarget(x, y, activeState.model, activeState.layout);
    if (hitTarget?.kind !== 'empty-cell') return;
    emitMelodyTimelineEmptyCellAdd({
      melodyId: activeState.melodyId,
      eventIndex: hitTarget.eventIndex,
      stringName: hitTarget.stringName,
    });
  });

  dom.scrollingTabPanelCanvas.addEventListener('contextmenu', (event) => {
    const activeState = interactionState;
    if (!activeState || !activeState.editingEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const { x, y } = getCanvasPoint(event);
    const hitTarget = resolveScrollingTabPanelHitTarget(x, y, activeState.model, activeState.layout);
    if (!hitTarget) return;
    emitMelodyTimelineContextMenuOpen({
      melodyId: activeState.melodyId,
      eventIndex: hitTarget.eventIndex,
      noteIndex: hitTarget.kind === 'note' ? hitTarget.noteIndex : null,
      anchorX: event.clientX,
      anchorY: event.clientY,
    });
  });

  dom.scrollingTabPanelCanvas.addEventListener('pointermove', (event) => {
    const activeState = interactionState;
    if (!activeState) return;
    const { x, y } = getCanvasPoint(event);
    const hitTarget = resolveScrollingTabPanelHitTarget(x, y, activeState.model, activeState.layout);
    setCanvasCursor(hitTarget, activeState.editingEnabled);
  });

  dom.scrollingTabPanelCanvas.addEventListener('pointerleave', () => {
    dom.scrollingTabPanelCanvas.style.cursor = '';
  });

  dom.scrollingTabPanelCanvas.addEventListener('pointerdown', (event) => {
    const activeState = interactionState;
    if (!activeState) return;
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;

    const { x: startX, y: startY } = getCanvasPoint(event);
    const initialTarget = resolveScrollingTabPanelHitTarget(startX, startY, activeState.model, activeState.layout);

    if (!initialTarget) {
      if (activeState.selectedEventIndex !== null || activeState.selectedNoteIndex !== null) {
        event.preventDefault();
        event.stopPropagation();
        emitMelodyTimelineSelectionClear({ melodyId: activeState.melodyId });
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    let dragMode: 'note' | 'event' | null = null;
    let moved = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const { x, y } = getCanvasPoint(moveEvent);
      const dx = x - startX;
      const dy = y - startY;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      if (!activeState.editingEnabled) return;

      if (!dragMode) {
        if (
          initialTarget.kind === 'note' &&
          Math.abs(dx) > Math.abs(dy) &&
          activeState.selectedEventIndex === initialTarget.eventIndex
        ) {
          dragMode = 'event';
        } else if (initialTarget.kind === 'event' && activeState.selectedEventIndex === initialTarget.eventIndex) {
          dragMode = 'event';
        } else {
          dragMode = 'note';
        }

        if (initialTarget.kind === 'note') {
          emitMelodyTimelineNoteSelect({
            melodyId: activeState.melodyId,
            eventIndex: initialTarget.eventIndex,
            noteIndex: initialTarget.noteIndex,
            toggle: false,
          });
        }
      }

      if (dragMode === 'event') {
        dom.scrollingTabPanelCanvas.style.cursor = 'grabbing';
      } else if (dragMode === 'note') {
        dom.scrollingTabPanelCanvas.style.cursor = 'grabbing';
      }
    };

    const finish = (finishEvent: PointerEvent, commit: boolean) => {
      if (finishEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      dom.scrollingTabPanelCanvas.style.cursor = '';

      const latestState = interactionState;
      if (!latestState) return;

      const { x, y } = getCanvasPoint(finishEvent);

      if (!moved) {
        if (initialTarget.kind === 'note') {
          emitMelodyTimelineNoteSelect({
            melodyId: latestState.melodyId,
            eventIndex: initialTarget.eventIndex,
            noteIndex: initialTarget.noteIndex,
            toggle: true,
          });
        } else if (
          (latestState.selectedEventIndex !== null || latestState.selectedNoteIndex !== null) &&
          initialTarget.kind !== 'event' &&
          initialTarget.kind !== 'empty-cell'
        ) {
          emitMelodyTimelineSelectionClear({ melodyId: latestState.melodyId });
        }
        return;
      }

      if (!commit || !latestState.editingEnabled) return;

      if (dragMode === 'event') {
        const sourceEventIndex = initialTarget.eventIndex;
        const targetEventIndex = resolveScrollingTabPanelClosestEventIndex(x, latestState.model, latestState.layout);
        if (targetEventIndex !== null) {
          emitMelodyTimelineEventDrag({
            melodyId: latestState.melodyId,
            sourceEventIndex,
            targetEventIndex,
            commit: true,
          });
        }
        return;
      }

      if (initialTarget.kind === 'note') {
        const targetStringName = resolveStringNameAtY(y, latestState);
        if (targetStringName) {
          emitMelodyTimelineNoteDrag({
            melodyId: latestState.melodyId,
            eventIndex: initialTarget.eventIndex,
            noteIndex: initialTarget.noteIndex,
            stringName: targetStringName,
            commit: true,
          });
        }
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finish(upEvent, true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      finish(cancelEvent, false);
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
  });
}
