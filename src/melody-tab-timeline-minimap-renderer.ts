import { dom } from './dom';
import type { MelodyDefinition } from './melody-library';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';
import type { MelodyStudyRange } from './melody-study-range';
import { normalizeMelodyStudyRange } from './melody-study-range';
import type { TimelineDurationLayout } from './melody-timeline-duration';
import {
  buildMelodyMinimapLayout,
  resolveMelodyMinimapEventIndexFromRatio,
} from './melody-minimap';
import {
  getFingerColor,
  scaleTimelinePixels,
  withAlpha,
} from './melody-tab-timeline-render-utils';

interface RenderTimelineMinimapOptions {
  showRangeEditor: boolean;
  zoomScale: number;
  fingeringStrategy: MelodyFingeringStrategy;
  fingeringLevel: MelodyFingeringLevel;
}

interface RenderTimelineMinimapCallbacks {
  centerTimelineEvent: (eventIndex: number, behavior?: ScrollBehavior) => void;
  onMelodyTimelineSeek: ((payload: { melodyId: string; eventIndex: number; commit: boolean }) => void) | null;
  onMelodyStudyRangeCommit: ((payload: { melodyId: string; range: MelodyStudyRange }) => void) | null;
}

let cachedMinimapPlayhead: HTMLElement | null = null;
let cachedMinimapProgressFill: HTMLElement | null = null;
let cachedMinimapActiveRatiosByEvent: number[] | null = null;

export function clearTimelineMinimapRuntimeCache() {
  cachedMinimapPlayhead = null;
  cachedMinimapProgressFill = null;
  cachedMinimapActiveRatiosByEvent = null;
}

export function updateTimelineMinimapRuntime(activeEventIndex: number | null) {
  if (!cachedMinimapPlayhead || !cachedMinimapProgressFill || !cachedMinimapActiveRatiosByEvent) return;
  if (
    activeEventIndex === null ||
    !Number.isInteger(activeEventIndex) ||
    activeEventIndex < 0 ||
    activeEventIndex >= cachedMinimapActiveRatiosByEvent.length
  ) {
    cachedMinimapPlayhead.style.display = 'none';
    cachedMinimapProgressFill.style.display = 'none';
    return;
  }
  const activeRatio = cachedMinimapActiveRatiosByEvent[activeEventIndex];
  if (typeof activeRatio !== 'number' || !Number.isFinite(activeRatio)) {
    cachedMinimapPlayhead.style.display = 'none';
    cachedMinimapProgressFill.style.display = 'none';
    return;
  }
  cachedMinimapPlayhead.style.display = 'block';
  cachedMinimapPlayhead.style.left = `${activeRatio * 100}%`;
  cachedMinimapProgressFill.style.display = 'block';
  cachedMinimapProgressFill.style.width = `${activeRatio * 100}%`;
}

export function renderTimelineMinimap(
  melody: MelodyDefinition,
  stringOrder: string[],
  activeEventIndex: number | null,
  durationLayout: TimelineDurationLayout,
  studyRange: MelodyStudyRange,
  options: RenderTimelineMinimapOptions,
  callbacks: RenderTimelineMinimapCallbacks
) {
  clearTimelineMinimapRuntimeCache();
  dom.melodyTabTimelineMinimap.innerHTML = '';
  if (durationLayout.weights.length === 0 || melody.events.length === 0) {
    dom.melodyTabTimelineMinimapDock.classList.add('hidden');
    dom.melodyTabTimelineMinimap.classList.add('hidden');
    return;
  }

  const layout = buildMelodyMinimapLayout(
    melody,
    stringOrder,
    durationLayout.weights,
    activeEventIndex,
    studyRange,
    options.fingeringStrategy,
    options.fingeringLevel
  );
  const normalizedStudyRange = normalizeMelodyStudyRange(studyRange, layout.eventSegments.length);

  const shell = document.createElement('div');
  shell.className = 'timeline-minimap-shell';
  shell.style.height = `${scaleTimelinePixels(29, options.zoomScale, 22)}px`;
  shell.dataset.cursor = options.showRangeEditor ? 'range' : 'seek';
  shell.title = options.showRangeEditor
    ? 'Timeline minimap. Click or drag to seek. Drag the yellow handles to set the study range.'
    : 'Timeline minimap. Click or drag to seek through the melody.';
  shell.setAttribute('aria-label', shell.title);

  const track = document.createElement('div');
  track.className = 'timeline-minimap-track';
  track.style.inset = `${scaleTimelinePixels(3, options.zoomScale, 2)}px ${scaleTimelinePixels(4, options.zoomScale, 3)}px`;
  shell.appendChild(track);

  const progressFill = document.createElement('div');
  progressFill.className = 'timeline-minimap-progress-fill';
  if (layout.activeRatio !== null) {
    progressFill.style.width = `${layout.activeRatio * 100}%`;
  } else {
    progressFill.style.display = 'none';
  }
  track.appendChild(progressFill);
  cachedMinimapProgressFill = progressFill;

  const rowHeightPercent = 100 / layout.rowCount;
  layout.noteRects.forEach((noteRect) => {
    const element = document.createElement('span');
    element.className = 'timeline-minimap-note' + (noteRect.isInStudyRange ? ' is-study' : '');
    const fingerColor = getFingerColor(noteRect.finger);
    element.style.left = `${noteRect.startRatio * 100}%`;
    element.style.width = `${Math.max(0.28, noteRect.widthRatio * 100)}%`;
    element.style.top = `calc(${noteRect.rowIndex * rowHeightPercent}% + 2px)`;
    element.style.height = `max(3px, calc(${rowHeightPercent}% - 4px))`;
    element.style.backgroundColor = withAlpha(
      fingerColor,
      noteRect.isInStudyRange ? 0.8 : 0.58
    );
    track.appendChild(element);
  });

  const rangeStartSegment =
    layout.eventSegments[normalizedStudyRange.startIndex] ?? layout.eventSegments[0]!;
  const rangeEndSegment =
    layout.eventSegments[normalizedStudyRange.endIndex] ??
    layout.eventSegments[layout.eventSegments.length - 1]!;
  let previewRange = normalizedStudyRange;

  const rangeStartShade = document.createElement('div');
  const rangeEndShade = document.createElement('div');
  const rangeStartLine = document.createElement('div');
  const rangeEndLine = document.createElement('div');
  const startHandle = document.createElement('div');
  const endHandle = document.createElement('div');

  if (options.showRangeEditor) {
    rangeStartShade.className = 'timeline-minimap-outside-range';
    rangeEndShade.className = 'timeline-minimap-outside-range';
    rangeStartLine.className = 'timeline-minimap-range-line';
    rangeEndLine.className = 'timeline-minimap-range-line';
    startHandle.className = 'timeline-minimap-handle';
    endHandle.className = 'timeline-minimap-handle';
    const handleWidth = scaleTimelinePixels(14, options.zoomScale, 10);
    startHandle.style.width = `${handleWidth}px`;
    startHandle.style.marginLeft = `${-Math.round(handleWidth / 2)}px`;
    endHandle.style.width = `${handleWidth}px`;
    endHandle.style.marginLeft = `${-Math.round(handleWidth / 2)}px`;
    startHandle.dataset.dragMode = 'start';
    endHandle.dataset.dragMode = 'end';
    track.append(
      rangeStartShade,
      rangeEndShade,
      rangeStartLine,
      rangeEndLine,
      startHandle,
      endHandle
    );
  }

  const applyRangeVisuals = (range: MelodyStudyRange) => {
    if (!options.showRangeEditor) return;
    const startSegment = layout.eventSegments[range.startIndex] ?? rangeStartSegment;
    const endSegment = layout.eventSegments[range.endIndex] ?? rangeEndSegment;
    rangeStartShade.style.left = '0';
    rangeStartShade.style.width = `${startSegment.startRatio * 100}%`;
    rangeEndShade.style.left = `${endSegment.endRatio * 100}%`;
    rangeEndShade.style.width = `${Math.max(0, 1 - endSegment.endRatio) * 100}%`;
    rangeStartLine.style.left = `${startSegment.startRatio * 100}%`;
    rangeEndLine.style.left = `${endSegment.endRatio * 100}%`;
    startHandle.style.left = `${startSegment.startRatio * 100}%`;
    endHandle.style.left = `${endSegment.endRatio * 100}%`;
  };

  applyRangeVisuals(normalizedStudyRange);

  const playhead = document.createElement('div');
  playhead.className = 'timeline-minimap-playhead';
  if (layout.activeRatio !== null) {
    playhead.style.left = `${layout.activeRatio * 100}%`;
  } else {
    playhead.style.display = 'none';
  }
  track.appendChild(playhead);
  cachedMinimapPlayhead = playhead;
  cachedMinimapActiveRatiosByEvent = layout.eventSegments.map(
    (eventSegment) =>
      eventSegment.startRatio + (eventSegment.endRatio - eventSegment.startRatio) / 2
  );

  const resolveSeekTargetIndex = (clientX: number) => {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = (clientX - rect.left) / rect.width;
    return resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, ratio);
  };

  type MinimapDragMode = 'seek' | 'start' | 'end';
  let pointerId: number | null = null;
  let dragMode: MinimapDragMode | null = null;

  const resolveDragMode = (event: PointerEvent): MinimapDragMode => {
    if (!options.showRangeEditor) return 'seek';
    const explicitMode = (event.target as HTMLElement | null)?.dataset.dragMode;
    if (explicitMode === 'start' || explicitMode === 'end') return explicitMode;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 'seek';
    const ratio = (event.clientX - rect.left) / rect.width;
    const threshold = 12 / rect.width;
    if (Math.abs(ratio - layout.rangeStartRatio) <= threshold) return 'start';
    if (Math.abs(ratio - layout.rangeEndRatio) <= threshold) return 'end';
    return 'seek';
  };

  const updateFromPointer = (event: PointerEvent, commit: boolean) => {
    if (!dragMode) return;
    if (dragMode === 'seek') {
      const targetIndex = resolveSeekTargetIndex(event.clientX);
      if (typeof targetIndex !== 'number') return;
      if (commit) {
        callbacks.onMelodyTimelineSeek?.({ melodyId: melody.id, eventIndex: targetIndex, commit: true });
      } else {
        callbacks.centerTimelineEvent(targetIndex, 'auto');
      }
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const hoveredIndex = resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, ratio);
    previewRange = normalizeMelodyStudyRange(
      dragMode === 'start'
        ? {
            startIndex: Math.min(hoveredIndex, normalizedStudyRange.endIndex),
            endIndex: normalizedStudyRange.endIndex,
          }
        : {
            startIndex: normalizedStudyRange.startIndex,
            endIndex: Math.max(hoveredIndex, normalizedStudyRange.startIndex),
          },
      layout.eventSegments.length
    );
    applyRangeVisuals(previewRange);
    if (commit) {
      callbacks.onMelodyStudyRangeCommit?.({ melodyId: melody.id, range: previewRange });
    }
  };

  const finishDrag = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    if (shell.hasPointerCapture(event.pointerId)) {
      shell.releasePointerCapture(event.pointerId);
    }
    const shouldCommit = dragMode === 'seek' || dragMode === 'start' || dragMode === 'end';
    updateFromPointer(event, shouldCommit);
    pointerId = null;
    dragMode = null;
    shell.classList.remove('is-scrubbing');
  };

  shell.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    dragMode = resolveDragMode(event);
    shell.classList.add('is-scrubbing');
    shell.setPointerCapture(event.pointerId);
    updateFromPointer(event, false);
    event.preventDefault();
  });

  shell.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) {
      if (options.showRangeEditor) {
        shell.dataset.cursor = resolveDragMode(event) === 'seek' ? 'seek' : 'range';
      }
      return;
    }
    updateFromPointer(event, false);
    event.preventDefault();
  });

  shell.addEventListener('pointerup', finishDrag);
  shell.addEventListener('pointercancel', finishDrag);

  dom.melodyTabTimelineMinimapDock.classList.remove('hidden');
  dom.melodyTabTimelineMinimap.classList.remove('hidden');
  dom.melodyTabTimelineMinimap.appendChild(shell);
}
