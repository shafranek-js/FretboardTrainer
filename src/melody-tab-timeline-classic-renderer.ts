import type { IInstrument } from './instruments/instrument';
import type { MelodyTabTimelineViewModel } from './melody-tab-timeline-model';
import type { TimelineDurationLayout } from './melody-timeline-duration';
import { appendClassicTimelinePreroll, computeClassicTimelinePrerollLayout } from './melody-tab-timeline-preroll-renderer';
import { buildClassicTimelineFeedbackSegment } from './melody-tab-timeline-performance-feedback-renderer';
import {
  applyClassicCellFeedbackStyles,
  getClassicCellText,
  getClassicCellTextRaw,
  getClassicFingeredCellSignature,
  getClassicPlayedCellTextRaw,
  getFingerColor,
  getPrimaryEventFingerColor,
  renderClassicFingeredCellText,
  resolveClassicCellFeedbackTone,
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

interface ClassicRendererContextMenuPayload {
  melodyId: string;
  eventIndex: number;
  noteIndex: number | null;
}

interface ClassicRendererEventDragPayload {
  melodyId: string;
  sourceEventIndex: number;
  selectedEventIndex: number | null;
}

interface ClassicRendererDeps {
  bindTimelineContextMenu(element: HTMLElement, payload: ClassicRendererContextMenuPayload): void;
  bindTimelineNoteDrag(
    element: HTMLElement,
    payload: TimelineNoteDragPayload,
    instrument: Pick<IInstrument, 'getNoteWithOctave'>
  ): void;
  bindTimelineEventDrag(element: HTMLElement, payload: ClassicRendererEventDragPayload): void;
  onMelodyTimelineNoteSelect(payload: { melodyId: string; eventIndex: number; noteIndex: number; toggle: boolean }): void;
  onMelodyTimelineEmptyCellAdd(payload: { melodyId: string; eventIndex: number; stringName: string }): void;
}

export function renderClassicTimeline(
  melodyId: string,
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  model: MelodyTabTimelineViewModel,
  barGrouping: TimelineBarGrouping,
  durationLayout: TimelineDurationLayout,
  root: HTMLElement,
  showStepNumbers: boolean,
  showPrerollLeadIn: boolean,
  activePrerollStepIndex: number | null,
  zoomScale: number,
  editingEnabled: boolean,
  selectedEventIndex: number | null,
  selectedNoteIndex: number | null,
  activeTimelineNoteDragSource: { eventIndex: number; noteIndex: number } | null,
  deps: ClassicRendererDeps
) {
  const applyTrackCellVisualState = (
    cell: HTMLElement,
    active: boolean,
    feedbackTone: 'correct' | 'wrong' | 'missed' | null
  ) => {
    if (feedbackTone) return;
    cell.dataset.activeEvent = active ? 'true' : 'false';
    cell.style.backgroundColor = active
      ? cell.style.getPropertyValue('--timeline-active-bg')
      : cell.style.getPropertyValue('--timeline-base-bg');
    cell.style.color = active
      ? cell.style.getPropertyValue('--timeline-active-color')
      : cell.style.getPropertyValue('--timeline-base-color');
    const boxShadow = active
      ? cell.style.getPropertyValue('--timeline-active-box-shadow')
      : cell.style.getPropertyValue('--timeline-base-box-shadow');
    cell.style.boxShadow = boxShadow === 'none' ? '' : boxShadow;
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-max text-[11px] leading-5 font-mono text-slate-200';
  wrapper.style.fontSize = `${scaleTimelinePixels(11, zoomScale, 8)}px`;
  wrapper.style.lineHeight = `${scaleTimelinePixels(20, zoomScale, 14)}px`;

  const eventWidths = Array.from({ length: model.totalEvents }, (_, eventIndex) => {
    const durationWidth = durationLayout.cellCharWidths[eventIndex] ?? 3;
    const widestRaw = Math.max(
      0,
      ...model.rows.map((row) =>
        Math.max(
          getClassicCellTextRaw(row.cells[eventIndex]?.notes ?? []).length,
          getClassicPlayedCellTextRaw(row.cells[eventIndex]?.unmatchedPlayedNotes ?? []).length
        )
      )
    );
    return Math.max(3, widestRaw, durationWidth);
  });
  const eventAccentColors = Array.from({ length: model.totalEvents }, (_, eventIndex) =>
    getPrimaryEventFingerColor(model.rows, eventIndex)
  );
  const prerollLayout = computeClassicTimelinePrerollLayout(eventWidths, showPrerollLeadIn);

  const buildLine = (labelText: string, segments: string[], options?: { isHeader?: boolean; isAnchorRow?: boolean }) => {
    const isHeader = options?.isHeader ?? false;
    const isAnchorRow = options?.isAnchorRow ?? false;
    const line = document.createElement('div');
    line.className = 'flex items-center whitespace-nowrap';
    if (!isHeader) {
      line.dataset.timelineStringName = labelText;
    }

    const label = document.createElement('span');
    label.className = `inline-block w-7 shrink-0 ${isHeader ? 'text-slate-400' : 'text-cyan-200'}`;
    label.style.width = `${scaleTimelinePixels(28, zoomScale, 22)}px`;
    label.textContent = labelText;
    line.appendChild(label);

    const startPipe = document.createElement('span');
    startPipe.className = 'text-slate-500';
    startPipe.textContent = '|';
    line.appendChild(startPipe);

    appendClassicTimelinePreroll(line, prerollLayout, activePrerollStepIndex, isHeader);

    segments.forEach((segment, eventIndex) => {
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        const barPipe = document.createElement('span');
        barPipe.className = 'text-slate-500';
        barPipe.textContent = '|';
        line.appendChild(barPipe);
      }

      const cell = document.createElement('span');
      cell.dataset.timelineTrackCell = 'true';
      cell.dataset.eventIndex = String(eventIndex);
      if (isAnchorRow) {
        cell.dataset.timelineStepAnchor = 'true';
      }
      const rangeCell = model.rows[0]?.cells[eventIndex] ?? null;
      const accentColor = eventAccentColors[eventIndex] ?? '#67e8f9';
      const baseColor = isHeader
        ? '#64748b'
        : rangeCell?.isInStudyRange
          ? '#fef3c7'
          : '#64748b';
      const baseBackground = rangeCell?.isInStudyRange && !isHeader ? 'rgba(120, 53, 15, 0.25)' : 'transparent';
      cell.className =
        'inline-block px-[1px] rounded-sm ' +
        (model.activeEventIndex === eventIndex
          ? 'text-slate-50'
          : rangeCell?.isInStudyRange
            ? 'bg-amber-900/25 text-amber-100'
            : isHeader
              ? 'text-slate-500'
              : 'text-slate-500');
      cell.style.minWidth = `${eventWidths[eventIndex]}ch`;
      cell.style.width = `${eventWidths[eventIndex]}ch`;
      cell.style.fontWeight = '500';
      cell.dataset.cellWidth = String(eventWidths[eventIndex]);
      cell.style.setProperty('--timeline-base-bg', baseBackground);
      cell.style.setProperty('--timeline-base-color', baseColor);
      cell.style.setProperty('--timeline-active-bg', withAlpha(accentColor, 0.36));
      cell.style.setProperty('--timeline-active-color', '#f8fafc');
      cell.style.setProperty('--timeline-playhead-bg', withAlpha(accentColor, 0.3));
      cell.style.setProperty('--timeline-playhead-color', '#f8fafc');
      let baseBoxShadow = 'none';
      const rowCell = model.rows.find((row) => row.stringName === labelText)?.cells[eventIndex] ?? null;
      const selectedRowNote = rowCell?.notes[0] ?? null;
      const isDragSource =
        !isHeader &&
        selectedRowNote &&
        activeTimelineNoteDragSource?.eventIndex === eventIndex &&
        activeTimelineNoteDragSource?.noteIndex === selectedRowNote.noteIndex;
      if (
        !isHeader &&
        selectedRowNote &&
        selectedEventIndex === eventIndex &&
        selectedNoteIndex === selectedRowNote.noteIndex
      ) {
        cell.style.outline = `1px solid ${withAlpha(getFingerColor(selectedRowNote.finger), 0.92)}`;
        cell.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(selectedRowNote.finger), 0.28)}`;
      }
      if (rangeCell?.isStudyRangeStart) {
        baseBoxShadow = 'inset 2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (rangeCell?.isStudyRangeEnd) {
        baseBoxShadow =
          baseBoxShadow !== 'none'
            ? `${baseBoxShadow}, inset -2px 0 0 rgba(251, 191, 36, 0.9)`
            : 'inset -2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (isDragSource) {
        cell.classList.add('timeline-note-drag-source');
      }
      const feedbackTone = rowCell ? resolveClassicCellFeedbackTone(rowCell) : null;
      const hasUnmatchedPlayedNotes = !!rowCell && rowCell.unmatchedPlayedNotes.length > 0;
      if (rowCell && !hasUnmatchedPlayedNotes && feedbackTone === null) {
        renderClassicFingeredCellText(cell, rowCell.notes, eventWidths[eventIndex]);
        cell.dataset.timelineDisplaySignature = `fingered:${getClassicFingeredCellSignature(
          rowCell.notes,
          eventWidths[eventIndex]
        )}`;
      } else {
        const fallbackSegment =
          rowCell && hasUnmatchedPlayedNotes
            ? buildClassicTimelineFeedbackSegment(rowCell, eventWidths[eventIndex])
            : segment;
        cell.textContent = fallbackSegment;
        cell.dataset.timelineDisplaySignature = `plain:${fallbackSegment}`;
      }
      cell.dataset.feedbackTone = feedbackTone ?? '';
      cell.style.setProperty('--timeline-base-box-shadow', baseBoxShadow);
      cell.style.setProperty(
        '--timeline-active-box-shadow',
        baseBoxShadow !== 'none'
          ? `${baseBoxShadow}, inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`
          : `inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`
      );
      cell.style.setProperty(
        '--timeline-playhead-box-shadow',
        baseBoxShadow !== 'none'
          ? `${baseBoxShadow}, inset 0 0 0 1px ${withAlpha(accentColor, 0.14)}`
          : `inset 0 0 0 1px ${withAlpha(accentColor, 0.14)}`
      );
      applyTrackCellVisualState(cell, model.activeEventIndex === eventIndex, feedbackTone);
      if (rowCell) {
        applyClassicCellFeedbackStyles(cell, feedbackTone, accentColor);
      }
      if (!isHeader && selectedRowNote) {
        cell.dataset.timelineNoPan = 'true';
        cell.dataset.noteIndex = String(selectedRowNote.noteIndex);
        cell.addEventListener('click', () => {
          deps.onMelodyTimelineNoteSelect({
            melodyId,
            eventIndex,
            noteIndex: selectedRowNote.noteIndex,
            toggle: true,
          });
        });
        if (editingEnabled) {
          deps.bindTimelineContextMenu(cell, { melodyId, eventIndex, noteIndex: selectedRowNote.noteIndex });
        }
        deps.bindTimelineNoteDrag(
          cell,
          {
            melodyId,
            eventIndex,
            noteIndex: selectedRowNote.noteIndex,
            stringName: selectedRowNote.stringName,
            fret: selectedRowNote.fret,
          },
          instrument
        );
      }
      if (!isHeader) {
        if (!selectedRowNote && editingEnabled) {
          cell.title = 'Double-click to add a note on this string';
          cell.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            deps.onMelodyTimelineEmptyCellAdd({
              melodyId,
              eventIndex,
              stringName: labelText,
            });
          });
        }
        if (editingEnabled && !selectedRowNote) {
          deps.bindTimelineContextMenu(cell, { melodyId, eventIndex, noteIndex: null });
        }
        deps.bindTimelineEventDrag(cell, {
          melodyId,
          sourceEventIndex: eventIndex,
          selectedEventIndex,
        });
      }
      line.appendChild(cell);
    });

    const endPipe = document.createElement('span');
    endPipe.className = 'text-slate-500';
    endPipe.textContent = '|';
    line.appendChild(endPipe);

    return line;
  };

  if (showStepNumbers) {
    const headerSegments = eventWidths.map((width, eventIndex) => String(eventIndex + 1).padEnd(width, ' '));
    wrapper.appendChild(buildLine('Stp', headerSegments, { isHeader: true }));
  }

  model.rows.forEach((row, rowIndex) => {
    const segments = row.cells.map((cell, eventIndex) => getClassicCellText(cell.notes, eventWidths[eventIndex]));
    wrapper.appendChild(buildLine(row.stringName, segments, { isAnchorRow: rowIndex === 0 }));
  });

  root.appendChild(wrapper);
}
