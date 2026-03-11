import { dom } from './dom';
import type { IInstrument } from './instruments/instrument';
import type { TimelineStepMetric } from './melody-study-range-drag';
import { getRenderedTimelineStepMetrics } from './melody-tab-timeline-study-range-renderer';

let onMelodyTimelineNoteSelect:
  | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; toggle?: boolean }) => void)
  | null = null;
let onMelodyTimelineNoteDrag:
  | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; stringName: string; commit: boolean }) => void)
  | null = null;
let onMelodyTimelineEventDrag:
  | ((payload: { melodyId: string; sourceEventIndex: number; targetEventIndex: number; commit: boolean }) => void)
  | null = null;

let activeTimelineNoteDragSource: { eventIndex: number; noteIndex: number } | null = null;

export function setMelodyTimelineNoteSelectHandler(
  handler: ((payload: { melodyId: string; eventIndex: number; noteIndex: number; toggle?: boolean }) => void) | null
) {
  onMelodyTimelineNoteSelect = handler;
}

export function emitMelodyTimelineNoteSelect(payload: {
  melodyId: string;
  eventIndex: number;
  noteIndex: number;
  toggle?: boolean;
}) {
  onMelodyTimelineNoteSelect?.(payload);
}

export function setMelodyTimelineNoteDragHandler(
  handler:
    | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; stringName: string; commit: boolean }) => void)
    | null
) {
  onMelodyTimelineNoteDrag = handler;
}

export function emitMelodyTimelineNoteDrag(payload: {
  melodyId: string;
  eventIndex: number;
  noteIndex: number;
  stringName: string;
  commit: boolean;
}) {
  onMelodyTimelineNoteDrag?.(payload);
}

export function setMelodyTimelineEventDragHandler(
  handler:
    | ((payload: { melodyId: string; sourceEventIndex: number; targetEventIndex: number; commit: boolean }) => void)
    | null
) {
  onMelodyTimelineEventDrag = handler;
}

export function emitMelodyTimelineEventDrag(payload: {
  melodyId: string;
  sourceEventIndex: number;
  targetEventIndex: number;
  commit: boolean;
}) {
  onMelodyTimelineEventDrag?.(payload);
}

export function getActiveTimelineNoteDragSource() {
  return activeTimelineNoteDragSource;
}

function parseScientificNoteToMidiValue(noteWithOctave: string) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

function resolveEquivalentTimelineDragFret(
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  sourceStringName: string,
  sourceFret: number,
  targetStringName: string
) {
  if (targetStringName === sourceStringName) return sourceFret;
  const sourceScientific = instrument.getNoteWithOctave(sourceStringName, sourceFret);
  if (!sourceScientific) return null;
  const targetMidi = parseScientificNoteToMidiValue(sourceScientific);
  if (targetMidi === null) return null;

  for (let fret = 0; fret <= 24; fret += 1) {
    const candidate = instrument.getNoteWithOctave(targetStringName, fret);
    if (!candidate) continue;
    if (parseScientificNoteToMidiValue(candidate) === targetMidi) {
      return fret;
    }
  }
  return null;
}

function clearTimelineNoteDragPreview() {
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-preview')
    .forEach((element) => {
      element.classList.remove('timeline-note-drag-preview');
      element.style.removeProperty('--timeline-drag-preview-color');
      delete element.dataset.timelineDragPreviewFret;
    });
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-target-chip')
    .forEach((element) => element.remove());
}

function clearTimelineEventDragPreview() {
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-event-drag-source, .timeline-event-drag-target')
    .forEach((element) => {
      element.classList.remove('timeline-event-drag-source', 'timeline-event-drag-target');
    });
}

function markTimelineEventDragPreview(sourceEventIndex: number, targetEventIndex: number) {
  clearTimelineEventDragPreview();
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${sourceEventIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-event-drag-source');
    });
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${targetEventIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-event-drag-target');
    });
}

export function bindTimelineEventDrag(
  dragTarget: HTMLElement,
  payload: { melodyId: string; sourceEventIndex: number; selectedEventIndex: number | null }
) {
  dragTarget.dataset.timelineNoPan = 'true';

  dragTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.metaKey) return;
    const pointerId = event.pointerId;
    const originalTarget = event.target as HTMLElement | null;
    if (originalTarget?.closest('[data-note-index]')) return;
    if (payload.selectedEventIndex !== payload.sourceEventIndex) return;

    const metrics = getRenderedTimelineStepMetrics(dom.melodyTabTimelineGrid);
    if (metrics.length === 0) return;

    let hasMoved = false;
    let lastTargetIndex = payload.sourceEventIndex;

    const resolveTargetEventIndex = (clientX: number) => {
      const gridRect = dom.melodyTabTimelineGrid.getBoundingClientRect();
      const offsetX = clientX - gridRect.left + dom.melodyTabTimelineGrid.scrollLeft;
      const metric =
        metrics.find((candidate) => offsetX >= candidate.left && offsetX <= candidate.right) ??
        metrics.reduce<TimelineStepMetric | null>((best, candidate) => {
          if (!best) return candidate;
          const bestCenter = (best.left + best.right) / 2;
          const candidateCenter = (candidate.left + candidate.right) / 2;
          return Math.abs(offsetX - candidateCenter) < Math.abs(offsetX - bestCenter) ? candidate : best;
        }, null);
      return metric?.index ?? payload.sourceEventIndex;
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      hasMoved = true;
      const targetEventIndex = resolveTargetEventIndex(moveEvent.clientX);
      if (targetEventIndex !== lastTargetIndex) {
        lastTargetIndex = targetEventIndex;
        markTimelineEventDragPreview(payload.sourceEventIndex, targetEventIndex);
      }
      moveEvent.preventDefault();
    };

    const finish = (finishEvent: PointerEvent, commit: boolean) => {
      if (finishEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      if (commit && hasMoved) {
        const targetEventIndex = resolveTargetEventIndex(finishEvent.clientX);
        onMelodyTimelineEventDrag?.({
          melodyId: payload.melodyId,
          sourceEventIndex: payload.sourceEventIndex,
          targetEventIndex,
          commit: true,
        });
      }
      clearTimelineEventDragPreview();
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finish(upEvent, true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      finish(cancelEvent, false);
    };

    markTimelineEventDragPreview(payload.sourceEventIndex, payload.sourceEventIndex);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
  });
}

function clearTimelineNoteDragSource() {
  activeTimelineNoteDragSource = null;
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-source')
    .forEach((element) => {
      element.classList.remove('timeline-note-drag-source');
    });
}

function markTimelineNoteDragSource(eventIndex: number, noteIndex: number) {
  activeTimelineNoteDragSource = { eventIndex, noteIndex };
  clearTimelineNoteDragSource();
  activeTimelineNoteDragSource = { eventIndex, noteIndex };
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${eventIndex}"][data-note-index="${noteIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-note-drag-source');
    });
}

function setTimelineNoteDragPreview(stringName: string, eventIndex: number, color: string, previewFret: number | null) {
  clearTimelineNoteDragPreview();
  const rowElements = Array.from(
    dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>('[data-timeline-string-name]')
  ).filter((element) => element.dataset.timelineStringName === stringName);

  rowElements.forEach((rowElement) => {
    rowElement
      .querySelectorAll<HTMLElement>(`[data-event-index="${eventIndex}"]:not([data-note-index])`)
      .forEach((cellElement) => {
        cellElement.classList.add('timeline-note-drag-preview');
        cellElement.style.setProperty('--timeline-drag-preview-color', color);
        if (previewFret !== null) {
          cellElement.dataset.timelineDragPreviewFret = String(previewFret);
          const targetChip = document.createElement('span');
          targetChip.className = 'timeline-note-drag-target-chip';
          targetChip.textContent = String(previewFret);
          targetChip.style.backgroundColor = color;
          cellElement.appendChild(targetChip);
        }
      });
  });
}

export function bindTimelineNoteDrag(
  noteTarget: HTMLElement,
  payload: {
    melodyId: string;
    eventIndex: number;
    noteIndex: number;
    stringName: string;
    fret: number;
  },
  instrument: Pick<IInstrument, 'getNoteWithOctave'>
) {
  noteTarget.dataset.timelineNoPan = 'true';
  noteTarget.style.cursor = 'grab';

  noteTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    const pointerId = event.pointerId;
    let lastStringName: string | null = null;
    let hasMoved = false;
    const computedStyle = window.getComputedStyle(noteTarget);
    const previewColor =
      computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? computedStyle.backgroundColor
        : computedStyle.color || '#67e8f9';

    onMelodyTimelineNoteSelect?.({ ...payload, toggle: false });
    markTimelineNoteDragSource(payload.eventIndex, payload.noteIndex);
    document.body.classList.add('timeline-note-drag-active');

    const resolveStringName = (_clientX: number, clientY: number) => {
      const rows = Array.from(
        dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>('[data-timeline-string-name]')
      );
      if (rows.length === 0) return null;

      let bestRow: HTMLElement | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(clientY - centerY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRow = row;
        }
      });

      return bestRow?.dataset.timelineStringName ?? null;
    };

    const updateHoverTarget = (clientX: number, clientY: number, commit: boolean) => {
      const stringName = resolveStringName(clientX, clientY);
      if (!stringName) {
        lastStringName = null;
        clearTimelineNoteDragPreview();
        return;
      }
      if (stringName !== lastStringName) {
        lastStringName = stringName;
        setTimelineNoteDragPreview(
          stringName,
          payload.eventIndex,
          previewColor,
          resolveEquivalentTimelineDragFret(instrument, payload.stringName, payload.fret, stringName)
        );
      }
      if (commit) {
        onMelodyTimelineNoteDrag?.({
          ...payload,
          stringName,
          commit: true,
        });
      }
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      hasMoved = true;
      noteTarget.style.cursor = 'grabbing';
      window.getSelection()?.removeAllRanges();
      updateHoverTarget(moveEvent.clientX, moveEvent.clientY, false);
      moveEvent.preventDefault();
    };

    const finish = (upEvent: PointerEvent, commit: boolean) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      noteTarget.style.cursor = 'grab';
      clearTimelineNoteDragSource();
      document.body.classList.remove('timeline-note-drag-active');
      if (commit && hasMoved) {
        updateHoverTarget(upEvent.clientX, upEvent.clientY, true);
      }
      clearTimelineNoteDragPreview();
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
