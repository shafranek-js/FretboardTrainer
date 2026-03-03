import { dom } from './state';
import type { MelodyDefinition } from './melody-library';
import type { IInstrument } from './instruments/instrument';
import { buildMelodyTabTimelineViewModel } from './melody-tab-timeline-model';
import {
  bindTimelineContextMenu,
  clearMelodyTimelineContextMenu,
  getTimelineContextMenuSignature,
  renderTimelineContextMenu,
  setMelodyTimelineContextActionHandler,
  setMelodyTimelineContextMenuOpenHandler,
  type MelodyTimelineContextAction,
} from './melody-tab-timeline-context-menu';
import {
  bindTimelineEventDrag,
  bindTimelineNoteDrag,
  emitMelodyTimelineNoteSelect,
  getActiveTimelineNoteDragSource,
  setMelodyTimelineEventDragHandler,
  setMelodyTimelineNoteDragHandler,
  setMelodyTimelineNoteSelectHandler,
} from './melody-tab-timeline-drag';
import {
  bindTimelineBackgroundCopy,
  bindTimelineSelectionClear,
  setMelodyTimelineBackgroundCopyPayload,
  setMelodyTimelineSelectionClearHandler,
} from './melody-tab-timeline-interactions';
import {
  buildMelodyContentSignature,
  buildTimelineBarGrouping,
} from './melody-tab-timeline-metadata';
import {
  buildMelodyTimelineMetaText,
  buildMelodyTimelineRenderKey,
  type MelodyTimelineRenderOptions,
  resolveMelodyTimelineRenderOptions,
} from './melody-tab-timeline-render-state';
import {
  getMelodyTimelineEmptyCellAddHandler,
  getMelodyTimelineSeekHandler,
  getMelodyTimelineStudyRangeCommitHandler,
  setMelodyTimelineEmptyCellAddHandler,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineStudyRangeCommitHandler,
} from './melody-tab-timeline-handlers';
import { renderClassicTimeline } from './melody-tab-timeline-classic-renderer';
import { renderGridTimeline } from './melody-tab-timeline-grid-renderer';
import { renderTimelineMinimap } from './melody-tab-timeline-minimap-renderer';
import {
  bindTimelineDragPan,
  bindTimelineScrollChrome,
  centerTimelineEvent,
  followTimelineRuntimeScroll,
  updateTimelineScrollChrome,
} from './melody-tab-timeline-scroll';
import {
  getRenderedTimelineStepMetrics,
  renderStudyRangeBar,
} from './melody-tab-timeline-study-range-renderer';
import { buildClassicTimelineFeedbackSegment } from './melody-tab-timeline-performance-feedback-renderer';
import {
  applyClassicCellFeedbackStyles,
  getClassicCellText,
  getPrimaryCellFingerColor,
  resolveClassicCellFeedbackTone,
} from './melody-tab-timeline-render-utils';
import {
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  normalizeMelodyStudyRange,
} from './melody-study-range';
import { computeTimelineDurationLayout } from './melody-timeline-duration';

export {
  clearMelodyTimelineContextMenu,
  setMelodyTimelineEventDragHandler,
  setMelodyTimelineBackgroundCopyPayload,
  setMelodyTimelineEmptyCellAddHandler,
  setMelodyTimelineNoteDragHandler,
  setMelodyTimelineNoteSelectHandler,
  setMelodyTimelineContextActionHandler,
  setMelodyTimelineContextMenuOpenHandler,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineSelectionClearHandler,
  setMelodyTimelineStudyRangeCommitHandler,
};
export type { MelodyTimelineContextAction };

let lastRenderKey = '';
let lastStructuralRenderKey = '';
let lastClassicActiveEventIndex: number | null = null;
let lastPlayheadEventIndex: number | null = null;

function applyTimelinePlayheadCellVisualState(cell: HTMLElement, active: boolean) {
  cell.dataset.playheadActive = active ? 'true' : 'false';
  if (cell.dataset.feedbackTone) return;

  if (cell.dataset.timelineGridCell === 'true') {
    cell.style.borderColor = active
      ? cell.style.getPropertyValue('--timeline-grid-playhead-border')
      : cell.style.getPropertyValue('--timeline-grid-base-border');
    cell.style.backgroundColor = active
      ? cell.style.getPropertyValue('--timeline-grid-playhead-bg')
      : cell.style.getPropertyValue('--timeline-grid-base-bg');
    if (cell.tagName === 'TH') {
      cell.style.color = active
        ? cell.style.getPropertyValue('--timeline-grid-playhead-color')
        : cell.style.getPropertyValue('--timeline-grid-base-color');
    }
    cell.style.boxShadow = active ? cell.style.getPropertyValue('--timeline-grid-playhead-box-shadow') : '';
    return;
  }

  cell.style.backgroundColor = active
    ? cell.style.getPropertyValue('--timeline-playhead-bg')
    : cell.style.getPropertyValue('--timeline-base-bg');
  cell.style.color = active
    ? cell.style.getPropertyValue('--timeline-playhead-color')
    : cell.style.getPropertyValue('--timeline-base-color');
  const boxShadow = active
    ? cell.style.getPropertyValue('--timeline-playhead-box-shadow')
    : cell.style.getPropertyValue('--timeline-base-box-shadow');
  cell.style.boxShadow = boxShadow === 'none' ? '' : boxShadow;
}

function updateTimelinePlayheadEventCells(eventIndex: number | null, active: boolean) {
  if (eventIndex === null) return;
  const cells = dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>(
    `[data-event-index="${eventIndex}"][data-timeline-track-cell="true"], [data-event-index="${eventIndex}"][data-timeline-grid-cell="true"]`
  );
  cells.forEach((cell) => {
    if ((cell.dataset.feedbackTone ?? '') !== '') return;
    applyTimelinePlayheadCellVisualState(cell, active);
  });
}

function updateTimelinePlayheadEvent(activeEventIndex: number | null) {
  if (lastPlayheadEventIndex === activeEventIndex) return;
  updateTimelinePlayheadEventCells(lastPlayheadEventIndex, false);
  updateTimelinePlayheadEventCells(activeEventIndex, true);
  lastPlayheadEventIndex = activeEventIndex;
}

function applyClassicTimelineTrackCellVisualState(
  cell: HTMLElement,
  active: boolean,
  feedbackTone: 'correct' | 'wrong' | 'missed' | null
) {
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
}

function updateClassicTimelineEventCells(eventIndex: number | null, active: boolean) {
  if (eventIndex === null) return;
  const cells = dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>(
    `[data-timeline-track-cell="true"][data-event-index="${eventIndex}"]`
  );
  cells.forEach((cell) => {
    if ((cell.dataset.feedbackTone ?? '') !== '') return;
    applyClassicTimelineTrackCellVisualState(cell, active, null);
  });
}

function updateClassicTimelineActiveEvent(activeEventIndex: number | null) {
  if (lastClassicActiveEventIndex === activeEventIndex) return;
  updateClassicTimelineEventCells(lastClassicActiveEventIndex, false);
  updateClassicTimelineEventCells(activeEventIndex, true);
  lastClassicActiveEventIndex = activeEventIndex;
}

function followHighlightedTimelineEvent(eventIndex: number | null) {
  if (eventIndex === null) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  centerTimelineEvent(eventIndex, prefersReducedMotion ? 'auto' : 'smooth');
}

function updateClassicTimelineFeedback(model: ReturnType<typeof buildMelodyTabTimelineViewModel>) {
  model.rows.forEach((row) => {
    const rowLine = dom.melodyTabTimelineGrid.querySelector<HTMLElement>(
      `[data-timeline-string-name="${row.stringName}"]`
    );
    if (!rowLine) return;
    row.cells.forEach((rowCell, eventIndex) => {
      const cell = rowLine.querySelector<HTMLElement>(`[data-event-index="${eventIndex}"]`);
      if (!cell) return;

      const cellWidth = Number.parseInt(cell.dataset.cellWidth ?? '3', 10);
      const feedbackTone = resolveClassicCellFeedbackTone(rowCell);
      const accentColor = getPrimaryCellFingerColor(rowCell.notes);
      const displaySegment =
        rowCell.unmatchedPlayedNotes.length > 0
          ? buildClassicTimelineFeedbackSegment(rowCell, cellWidth)
          : getClassicCellText(rowCell.notes, cellWidth);

      if (cell.textContent !== displaySegment) {
        cell.textContent = displaySegment;
      }

      cell.dataset.feedbackTone = feedbackTone ?? '';
      cell.style.backgroundColor = '';
      cell.style.color = '';
      const baseBoxShadow = cell.style.getPropertyValue('--timeline-base-box-shadow');
      cell.style.boxShadow = baseBoxShadow === 'none' ? '' : baseBoxShadow;
      applyClassicTimelineTrackCellVisualState(cell, model.activeEventIndex === eventIndex, feedbackTone);
      applyClassicCellFeedbackStyles(cell, feedbackTone, accentColor);
    });
  });
}

function clearGrid() {
  dom.melodyTabTimelineGrid.innerHTML = '';
}

export function hideMelodyTabTimeline() {
  setMelodyTimelineBackgroundCopyPayload(null);
  dom.melodyTabTimelinePanel.classList.add('hidden');
  dom.melodyTabTimelineMinimapDock.classList.add('hidden');
  dom.melodyTabTimelineMinimap.classList.add('hidden');
  dom.melodyTabTimelineMinimap.innerHTML = '';
  dom.melodyTabTimelineMeta.classList.add('hidden');
  dom.melodyTabTimelineMeta.textContent = '';
  dom.melodyTabTimelinePlayhead.style.opacity = '0';
  dom.melodyTabTimelineGrid.dataset.activeEventIndex = '';
  dom.melodyTabTimelineViewport.dataset.scrollable = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollLeft = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollRight = 'false';
  clearGrid();
  lastRenderKey = '';
  lastStructuralRenderKey = '';
  lastClassicActiveEventIndex = null;
  lastPlayheadEventIndex = null;
}

export function updateMelodyTabTimelineRuntimeCursor(
  melody: MelodyDefinition,
  bpm: number,
  studyRange: { startIndex: number; endIndex: number },
  currentTimeSec: number,
  leadInSec = 0
) {
  if (dom.melodyTabTimelineGrid.childElementCount <= 0) return;
  followTimelineRuntimeScroll(melody, bpm, studyRange, currentTimeSec, leadInSec);
  updateTimelinePlayheadEvent(null);
  dom.melodyTabTimelinePlayhead.style.opacity = '0';
}

export function renderMelodyTabTimeline(
  melody: MelodyDefinition,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  activeEventIndex: number | null,
  options: MelodyTimelineRenderOptions = {}
) {
  bindTimelineBackgroundCopy();
  const studyRange = normalizeMelodyStudyRange(options.studyRange, melody.events.length);
  const resolvedOptions = resolveMelodyTimelineRenderOptions(options, studyRange);
  bindTimelineScrollChrome();
  bindTimelineDragPan();
  bindTimelineSelectionClear();
  const model = buildMelodyTabTimelineViewModel(
    melody,
    instrument.STRING_ORDER,
    activeEventIndex,
    resolvedOptions.studyRange,
    resolvedOptions.performanceFeedbackByEvent
  );
  const runtimePlayheadActive = resolvedOptions.currentTimeSec !== null && resolvedOptions.bpm !== null;
  const renderModel = model;
  const barGrouping = buildTimelineBarGrouping(melody);
  const durationLayout = computeTimelineDurationLayout(melody);
  const melodyContentSignature = buildMelodyContentSignature(melody);
  const contextMenuSignature = getTimelineContextMenuSignature(melody.id);
  const activeTimelineNoteDragSource = getActiveTimelineNoteDragSource();
  const renderKey = buildMelodyTimelineRenderKey(
    {
      melody,
      stringOrder: instrument.STRING_ORDER,
      melodyContentSignature,
      model: renderModel,
      barGrouping,
      durationLayout,
      studyRange: resolvedOptions.studyRange,
      contextMenuSignature,
      activeTimelineNoteDragSource,
      includePerformanceFeedbackSignature: true,
    },
    resolvedOptions
  );
  const structuralRenderKey = buildMelodyTimelineRenderKey(
    {
      melody,
      stringOrder: instrument.STRING_ORDER,
      melodyContentSignature,
      model: { activeEventIndex: options.viewMode === 'classic' ? null : renderModel.activeEventIndex },
      barGrouping,
      durationLayout,
      studyRange: resolvedOptions.studyRange,
      contextMenuSignature,
      activeTimelineNoteDragSource,
      includePerformanceFeedbackSignature: false,
    },
    resolvedOptions
  );
  if (
    structuralRenderKey === lastStructuralRenderKey &&
    dom.melodyTabTimelineGrid.childElementCount > 0 &&
    resolvedOptions.viewMode === 'classic'
  ) {
    const previousActiveEventIndex = lastClassicActiveEventIndex;
    dom.melodyTabTimelineGrid.dataset.activeEventIndex =
      renderModel.activeEventIndex === null ? '' : String(renderModel.activeEventIndex);
    updateClassicTimelineFeedback(renderModel);
    updateClassicTimelineActiveEvent(renderModel.activeEventIndex);
    if (!runtimePlayheadActive && previousActiveEventIndex !== renderModel.activeEventIndex) {
      followHighlightedTimelineEvent(renderModel.activeEventIndex);
    }
    if (runtimePlayheadActive && resolvedOptions.currentTimeSec !== null && resolvedOptions.bpm !== null) {
      followTimelineRuntimeScroll(
        melody,
        resolvedOptions.bpm,
        resolvedOptions.studyRange,
        resolvedOptions.currentTimeSec,
        resolvedOptions.leadInSec
      );
      updateTimelinePlayheadEvent(null);
      dom.melodyTabTimelinePlayhead.style.opacity = '0';
    } else {
      updateTimelinePlayheadEvent(null);
      dom.melodyTabTimelinePlayhead.style.opacity = '0';
    }
    const studyRangeText = ` | Study: ${formatMelodyStudyRange(studyRange, melody.events.length)} (${getMelodyStudyRangeLength(studyRange, melody.events.length)} steps)`;
    dom.melodyTabTimelineMeta.textContent = buildMelodyTimelineMetaText({
      modeLabel: resolvedOptions.modeLabel,
      viewMode: resolvedOptions.viewMode,
      model,
      barGrouping,
      durationLayout,
      studyRangeText,
      showMetaDetails: resolvedOptions.showMetaDetails,
    });
    if (resolvedOptions.currentTimeSec !== null && resolvedOptions.bpm !== null) {
      followTimelineRuntimeScroll(
        melody,
        resolvedOptions.bpm,
        resolvedOptions.studyRange,
        resolvedOptions.currentTimeSec,
        resolvedOptions.leadInSec
      );
      updateTimelinePlayheadEvent(null);
      dom.melodyTabTimelinePlayhead.style.opacity = '0';
    }
    lastRenderKey = renderKey;
    return;
  }
  if (renderKey === lastRenderKey && dom.melodyTabTimelineGrid.childElementCount > 0) {
    if (resolvedOptions.currentTimeSec !== null && resolvedOptions.bpm !== null) {
      followTimelineRuntimeScroll(
        melody,
        resolvedOptions.bpm,
        resolvedOptions.studyRange,
        resolvedOptions.currentTimeSec,
        resolvedOptions.leadInSec
      );
      updateTimelinePlayheadEvent(null);
      dom.melodyTabTimelinePlayhead.style.opacity = '0';
    }
    return;
  }
  lastRenderKey = renderKey;
  lastStructuralRenderKey = structuralRenderKey;
  lastClassicActiveEventIndex = renderModel.activeEventIndex;
  dom.melodyTabTimelineGrid.dataset.activeEventIndex =
    renderModel.activeEventIndex === null ? '' : String(renderModel.activeEventIndex);
  dom.melodyTabTimelineGrid.dataset.melodyId = melody.id;
  dom.melodyTabTimelineGrid.dataset.renderEpoch = String(
    Number.parseInt(dom.melodyTabTimelineGrid.dataset.renderEpoch ?? '0', 10) + 1
  );

  dom.melodyTabTimelinePanel.classList.remove('hidden');
  dom.melodyTabTimelinePanel.style.setProperty(
    '--melody-timeline-zoom-scale',
    String(resolvedOptions.zoomScale)
  );
  dom.melodyTabTimelineMinimapDock.style.setProperty(
    '--melody-timeline-zoom-scale',
    String(resolvedOptions.zoomScale)
  );
  dom.melodyTabTimelineMeta.classList.toggle('hidden', !resolvedOptions.showMetaDetails);
  const studyRangeText = ` | Study: ${formatMelodyStudyRange(studyRange, melody.events.length)} (${getMelodyStudyRangeLength(studyRange, melody.events.length)} steps)`;
  dom.melodyTabTimelineMeta.textContent = buildMelodyTimelineMetaText({
    modeLabel: resolvedOptions.modeLabel,
    viewMode: resolvedOptions.viewMode,
    model,
    barGrouping,
    durationLayout,
    studyRangeText,
    showMetaDetails: resolvedOptions.showMetaDetails,
  });

  clearGrid();
    renderTimelineMinimap(
    melody,
    instrument.STRING_ORDER,
    renderModel.activeEventIndex,
    durationLayout,
    resolvedOptions.studyRange,
    {
      showRangeEditor: resolvedOptions.minimapRangeEditor,
      zoomScale: resolvedOptions.zoomScale,
    },
    {
      centerTimelineEvent,
      onMelodyTimelineSeek: getMelodyTimelineSeekHandler(),
      onMelodyStudyRangeCommit: getMelodyTimelineStudyRangeCommitHandler(),
    }
  );
  const content = document.createElement('div');
  content.className = 'relative min-w-max';
  dom.melodyTabTimelineGrid.appendChild(content);
  if (resolvedOptions.viewMode === 'grid') {
    renderGridTimeline(
      melody.id,
      instrument,
      renderModel,
      barGrouping,
      durationLayout,
      content,
      resolvedOptions.showStepNumbers,
      resolvedOptions.zoomScale,
      resolvedOptions.editingEnabled,
      resolvedOptions.selectedEventIndex,
      resolvedOptions.selectedNoteIndex,
      activeTimelineNoteDragSource,
      {
        bindTimelineContextMenu,
        bindTimelineNoteDrag,
        bindTimelineEventDrag,
        onMelodyTimelineNoteSelect: (payload) => {
          emitMelodyTimelineNoteSelect(payload);
        },
        onMelodyTimelineEmptyCellAdd: (payload) => {
          getMelodyTimelineEmptyCellAddHandler()?.(payload);
        },
      }
    );
  } else {
    renderClassicTimeline(
      melody.id,
      instrument,
      renderModel,
      barGrouping,
      durationLayout,
      content,
      resolvedOptions.showStepNumbers,
      resolvedOptions.showPrerollLeadIn,
      resolvedOptions.activePrerollStepIndex,
      resolvedOptions.zoomScale,
      resolvedOptions.editingEnabled,
      resolvedOptions.selectedEventIndex,
      resolvedOptions.selectedNoteIndex,
      activeTimelineNoteDragSource,
      {
        bindTimelineContextMenu,
        bindTimelineNoteDrag,
        bindTimelineEventDrag,
        onMelodyTimelineNoteSelect: (payload) => {
          emitMelodyTimelineNoteSelect(payload);
        },
        onMelodyTimelineEmptyCellAdd: (payload) => {
          getMelodyTimelineEmptyCellAddHandler()?.(payload);
        },
      }
    );
  }

  const renderedMetrics = getRenderedTimelineStepMetrics(content);
  renderTimelineContextMenu(melody, resolvedOptions.selectedEventIndex, {
    editingEnabled: resolvedOptions.editingEnabled,
  });
  renderStudyRangeBar(
    content,
    melody.id,
    melody.events.length,
    renderedMetrics,
    resolvedOptions.studyRange,
    resolvedOptions.zoomScale,
    getMelodyTimelineStudyRangeCommitHandler()
  );

  if (resolvedOptions.currentTimeSec !== null && resolvedOptions.bpm !== null) {
    followTimelineRuntimeScroll(
      melody,
      resolvedOptions.bpm,
      resolvedOptions.studyRange,
      resolvedOptions.currentTimeSec,
      resolvedOptions.leadInSec
    );
    updateTimelinePlayheadEvent(null);
    dom.melodyTabTimelinePlayhead.style.opacity = '0';
  } else if (renderModel.activeEventIndex !== null) {
    updateTimelinePlayheadEvent(null);
    dom.melodyTabTimelinePlayhead.style.opacity = '0';
    followHighlightedTimelineEvent(renderModel.activeEventIndex);
  } else {
    updateTimelinePlayheadEvent(null);
    dom.melodyTabTimelinePlayhead.style.opacity = '0';
  }

  updateTimelineScrollChrome();
  window.requestAnimationFrame(() => {
    updateTimelineScrollChrome();
  });
}



