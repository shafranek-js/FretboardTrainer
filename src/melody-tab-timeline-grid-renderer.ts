import type { IInstrument } from './instruments/instrument';
import type { MelodyTabTimelineViewModel } from './melody-tab-timeline-model';
import type { TimelineDurationLayout } from './melody-timeline-duration';
import { appendGridTimelinePlayedFeedback } from './melody-tab-timeline-performance-feedback-renderer';
import {
  createCellNoteChip,
  getFingerColor,
  getPrimaryCellFingerColor,
  scaleTimelinePixels,
  withAlpha,
} from './melody-tab-timeline-render-utils';

interface TimelineBarGrouping {
  source: 'none' | 'explicit' | 'duration';
  hasBeatTiming: boolean;
  beatsPerBar: number | null;
  totalBars: number | null;
  barStartEventIndexes: Set<number>;
}

interface TimelineNoteDragPayload {
  melodyId: string;
  eventIndex: number;
  noteIndex: number;
  stringName: string;
  fret: number;
}

interface GridRendererContextMenuPayload {
  melodyId: string;
  eventIndex: number;
  noteIndex: number | null;
}

interface GridRendererEventDragPayload {
  melodyId: string;
  sourceEventIndex: number;
  selectedEventIndex: number | null;
}

interface GridRendererDeps {
  bindTimelineContextMenu(element: HTMLElement, payload: GridRendererContextMenuPayload): void;
  bindTimelineNoteDrag(
    element: HTMLElement,
    payload: TimelineNoteDragPayload,
    instrument: Pick<IInstrument, 'getNoteWithOctave'>
  ): void;
  bindTimelineEventDrag(element: HTMLElement, payload: GridRendererEventDragPayload): void;
  onMelodyTimelineNoteSelect(payload: { melodyId: string; eventIndex: number; noteIndex: number; toggle: boolean }): void;
  onMelodyTimelineEmptyCellAdd(payload: { melodyId: string; eventIndex: number; stringName: string }): void;
}

export function renderGridTimeline(
  melodyId: string,
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  model: MelodyTabTimelineViewModel,
  barGrouping: TimelineBarGrouping,
  durationLayout: TimelineDurationLayout,
  root: HTMLElement,
  showStepNumbers: boolean,
  zoomScale: number,
  editingEnabled: boolean,
  selectedEventIndex: number | null,
  selectedNoteIndex: number | null,
  activeTimelineNoteDragSource: { eventIndex: number; noteIndex: number } | null,
  deps: GridRendererDeps
) {
  const table = document.createElement('table');
  table.className = 'min-w-max border-separate border-spacing-px text-[10px] font-mono text-slate-200';
  table.style.fontSize = `${scaleTimelinePixels(10, zoomScale, 8)}px`;
  table.style.lineHeight = '1.2';

  if (showStepNumbers) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className =
      'sticky left-0 z-[3] bg-slate-900/95 text-slate-300 px-1.5 py-0.5 border border-slate-600 rounded text-left';
    corner.textContent = 'Str';
    headerRow.appendChild(corner);

    for (let eventIndex = 0; eventIndex < model.totalEvents; eventIndex++) {
      const widthPx = scaleTimelinePixels(durationLayout.cellPixelWidths[eventIndex] ?? 28, zoomScale, 18);
      const step = document.createElement('th');
      step.dataset.eventIndex = String(eventIndex);
      const rangeCell = model.rows[0]?.cells[eventIndex] ?? null;
      const isInStudyRange = rangeCell?.isInStudyRange ?? false;
      const accentColor = getPrimaryCellFingerColor(rangeCell?.notes ?? []);
      step.className =
        'px-1.5 py-0.5 border rounded text-center whitespace-nowrap ' +
        (model.activeEventIndex === eventIndex
          ? 'text-slate-50'
          : isInStudyRange
            ? 'border-amber-600/70 bg-amber-900/20 text-amber-100'
            : 'border-slate-600 bg-slate-800/55 text-slate-500');
      step.style.minWidth = `${widthPx}px`;
      step.style.width = `${widthPx}px`;
      step.style.padding = `${scaleTimelinePixels(2, zoomScale, 1)}px ${scaleTimelinePixels(6, zoomScale, 3)}px`;
      if (model.activeEventIndex === eventIndex) {
        step.style.borderColor = withAlpha(accentColor, 0.88);
        step.style.backgroundColor = withAlpha(accentColor, 0.26);
        step.style.boxShadow = `inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`;
      }
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        step.style.borderLeftWidth = '2px';
        step.style.borderLeftColor = model.activeEventIndex === eventIndex ? accentColor : '#94a3b8';
      }
      step.textContent = String(eventIndex + 1);
      headerRow.appendChild(step);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  const tbody = document.createElement('tbody');
  model.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.dataset.timelineStringName = row.stringName;
    const label = document.createElement('th');
    label.className =
      'sticky left-0 z-[2] bg-slate-900/95 text-cyan-200 px-1.5 py-0.5 border border-slate-600 rounded text-left';
    label.textContent = row.stringName;
    label.style.padding = `${scaleTimelinePixels(2, zoomScale, 1)}px ${scaleTimelinePixels(6, zoomScale, 3)}px`;
    tr.appendChild(label);

    row.cells.forEach((cell, eventIndex) => {
      const widthPx = scaleTimelinePixels(durationLayout.cellPixelWidths[eventIndex] ?? 28, zoomScale, 18);
      const accentColor = getPrimaryCellFingerColor(cell.notes);
      const td = document.createElement('td');
      td.dataset.eventIndex = String(eventIndex);
      if (rowIndex === 0) {
        td.dataset.timelineStepAnchor = 'true';
      }
      td.className =
        'h-6 border rounded text-center align-middle ' +
        (cell.isActive
          ? ''
          : cell.isInStudyRange
            ? 'border-amber-700/60 bg-amber-950/20'
            : 'border-slate-700/70 bg-slate-900/25 opacity-70');
      td.style.minWidth = `${widthPx}px`;
      td.style.width = `${widthPx}px`;
      td.style.height = `${scaleTimelinePixels(24, zoomScale, 18)}px`;
      if (cell.isActive) {
        td.style.borderColor = withAlpha(accentColor, 0.88);
        td.style.backgroundColor = withAlpha(accentColor, 0.16);
        td.style.boxShadow = `inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`;
      }
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        td.style.borderLeftWidth = '2px';
        td.style.borderLeftColor = cell.isActive ? accentColor : '#94a3b8';
      }
      if (cell.isStudyRangeStart) {
        td.style.boxShadow = 'inset 2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (cell.isStudyRangeEnd) {
        td.style.boxShadow = td.style.boxShadow
          ? `${td.style.boxShadow}, inset -2px 0 0 rgba(251, 191, 36, 0.9)`
          : 'inset -2px 0 0 rgba(251, 191, 36, 0.9)';
      }

      if (cell.notes.length === 0 && cell.unmatchedPlayedNotes.length === 0) {
        const empty = document.createElement('span');
        empty.className = cell.isActive ? '' : cell.isInStudyRange ? 'text-amber-200/50' : 'text-slate-600';
        if (cell.isActive) {
          empty.style.color = withAlpha(accentColor, 0.84);
        }
        empty.textContent = '.';
        td.appendChild(empty);
        if (editingEnabled) {
          td.title = 'Double-click to add a note on this string';
          td.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            deps.onMelodyTimelineEmptyCellAdd({
              melodyId,
              eventIndex,
              stringName: row.stringName,
            });
          });
        }
      } else if (cell.notes.length === 1 && cell.unmatchedPlayedNotes.length === 0) {
        const note = cell.notes[0]!;
        const noteChip = createCellNoteChip(note, zoomScale);
        const isSelected = selectedEventIndex === eventIndex && selectedNoteIndex === note.noteIndex;
        const isDragSource =
          activeTimelineNoteDragSource?.eventIndex === eventIndex &&
          activeTimelineNoteDragSource?.noteIndex === note.noteIndex;
        noteChip.dataset.eventIndex = String(eventIndex);
        noteChip.dataset.noteIndex = String(note.noteIndex);
        if (isSelected) {
          noteChip.style.outline = `1px solid ${withAlpha(getFingerColor(note.finger), 0.92)}`;
          noteChip.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(note.finger), 0.28)}`;
        }
        if (isDragSource) {
          noteChip.classList.add('timeline-note-drag-source');
        }
        noteChip.addEventListener('click', () => {
          deps.onMelodyTimelineNoteSelect({ melodyId, eventIndex, noteIndex: note.noteIndex, toggle: true });
        });
        if (editingEnabled) {
          deps.bindTimelineContextMenu(noteChip, { melodyId, eventIndex, noteIndex: note.noteIndex });
        }
        deps.bindTimelineNoteDrag(
          noteChip,
          {
            melodyId,
            eventIndex,
            noteIndex: note.noteIndex,
            stringName: note.stringName,
            fret: note.fret,
          },
          instrument
        );
        td.appendChild(noteChip);
      } else {
        const stack = document.createElement('div');
        stack.className = 'flex flex-col items-center justify-center gap-px py-0';
        stack.style.gap = `${scaleTimelinePixels(1, zoomScale, 1)}px`;
        cell.notes.forEach((note) => {
          const noteChip = createCellNoteChip(note, zoomScale);
          const isSelected = selectedEventIndex === eventIndex && selectedNoteIndex === note.noteIndex;
          const isDragSource =
            activeTimelineNoteDragSource?.eventIndex === eventIndex &&
            activeTimelineNoteDragSource?.noteIndex === note.noteIndex;
          noteChip.dataset.eventIndex = String(eventIndex);
          noteChip.dataset.noteIndex = String(note.noteIndex);
          if (isSelected) {
            noteChip.style.outline = `1px solid ${withAlpha(getFingerColor(note.finger), 0.92)}`;
            noteChip.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(note.finger), 0.28)}`;
          }
          if (isDragSource) {
            noteChip.classList.add('timeline-note-drag-source');
          }
          noteChip.addEventListener('click', () => {
            deps.onMelodyTimelineNoteSelect({ melodyId, eventIndex, noteIndex: note.noteIndex, toggle: true });
          });
          if (editingEnabled) {
            deps.bindTimelineContextMenu(noteChip, { melodyId, eventIndex, noteIndex: note.noteIndex });
          }
          deps.bindTimelineNoteDrag(
            noteChip,
            {
              melodyId,
              eventIndex,
              noteIndex: note.noteIndex,
              stringName: note.stringName,
              fret: note.fret,
            },
            instrument
          );
          stack.appendChild(noteChip);
        });
        appendGridTimelinePlayedFeedback(stack, cell.unmatchedPlayedNotes, zoomScale);
        td.appendChild(stack);
      }

      deps.bindTimelineEventDrag(td, {
        melodyId,
        sourceEventIndex: eventIndex,
        selectedEventIndex,
      });
      if (editingEnabled) {
        deps.bindTimelineContextMenu(td, { melodyId, eventIndex, noteIndex: null });
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  root.appendChild(table);
}
