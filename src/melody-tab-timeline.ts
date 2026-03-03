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
  updateTimelineScrollChrome,
} from './melody-tab-timeline-scroll';
import {
  getRenderedTimelineStepMetrics,
  renderStudyRangeBar,
} from './melody-tab-timeline-study-range-renderer';
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
  dom.melodyTabTimelineGrid.dataset.activeEventIndex = '';
  dom.melodyTabTimelineViewport.dataset.scrollable = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollLeft = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollRight = 'false';
  clearGrid();
  lastRenderKey = '';
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
      model,
      barGrouping,
      durationLayout,
      studyRange: resolvedOptions.studyRange,
      contextMenuSignature,
      activeTimelineNoteDragSource,
    },
    resolvedOptions
  );
  if (renderKey === lastRenderKey && dom.melodyTabTimelineGrid.childElementCount > 0) {
    return;
  }
  lastRenderKey = renderKey;
  dom.melodyTabTimelineGrid.dataset.activeEventIndex =
    model.activeEventIndex === null ? '' : String(model.activeEventIndex);
  dom.melodyTabTimelineGrid.dataset.melodyId = melody.id;

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
    model.activeEventIndex,
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
      model,
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
      model,
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

  if (model.activeEventIndex !== null) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    centerTimelineEvent(model.activeEventIndex, prefersReducedMotion ? 'auto' : 'smooth');
  }

  updateTimelineScrollChrome();
  window.requestAnimationFrame(() => {
    updateTimelineScrollChrome();
  });
}



