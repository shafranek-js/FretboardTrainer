import { dom } from './state';
import type { MelodyDefinition } from './melody-library';
import { buildScrollingTabPanelModel } from './scrolling-tab-panel-model';
import { computeScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import { buildMelodyContentSignature } from './melody-tab-timeline-metadata';
import {
  renderScrollingTabPanelSelection,
  renderScrollingTabPanelFeedback,
  renderScrollingTabPanelPlayhead,
  renderScrollingTabPanelMovingLayer,
  renderScrollingTabPanelStaticLayer,
  renderScrollingTabPanelViewport,
} from './scrolling-tab-panel-renderer';
import type { PerformanceTimelineFeedbackByEvent } from './performance-timeline-feedback';
import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';
import { renderTimelineContextMenu } from './melody-tab-timeline-context-menu';
import { bindScrollingTabPanelInteractions, updateScrollingTabPanelInteractionState } from './scrolling-tab-panel-interactions';

let lastRenderKey = '';
let lastStructuralRenderKey = '';
let lastStructuralModel: ScrollingTabPanelModel | null = null;
let lastRenderedMelody: MelodyDefinition | null = null;
let lastSceneRenderKey = '';
let lastCanvasConfigKey = '';
let lastRenderContext: {
  bpm: number;
  zoomScale: number;
  studyRange: { startIndex: number; endIndex: number };
  performanceFeedbackByEvent: PerformanceTimelineFeedbackByEvent | null | undefined;
  editingEnabled: boolean;
  selectedEventIndex: number | null;
  selectedNoteIndex: number | null;
} | null = null;
let panelCtx: CanvasRenderingContext2D | null = null;
let cachedStaticCanvas: HTMLCanvasElement | null = null;
let cachedMovingCanvas: HTMLCanvasElement | null = null;
const BASE_SCROLLING_TAB_PANEL_VIEWPORT_HEIGHT = 196;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPerformanceFeedbackSignature(feedbackByEvent: PerformanceTimelineFeedbackByEvent | null | undefined) {
  if (!feedbackByEvent) return '';
  return Object.entries(feedbackByEvent)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([eventIndex, attempts]) =>
      `${eventIndex}:${attempts
        .map((attempt) => `${attempt.status}:${attempt.note}:${attempt.stringName ?? '-'}:${attempt.fret ?? '-'}`)
        .join(',')}`
    )
    .join('|');
}

function clearScrollingTabCanvas() {
  if (!panelCtx) return;
  panelCtx.setTransform(1, 0, 0, 1, 0, 0);
  panelCtx.clearRect(0, 0, dom.scrollingTabPanelCanvas.width, dom.scrollingTabPanelCanvas.height);
}

export function hideScrollingTabPanel() {
  bindScrollingTabPanelInteractions();
  dom.scrollingTabPanel.classList.add('hidden');
  dom.scrollingTabPanelMeta.textContent = '';
  lastRenderKey = '';
  lastStructuralRenderKey = '';
  lastSceneRenderKey = '';
  lastCanvasConfigKey = '';
  lastStructuralModel = null;
  lastRenderedMelody = null;
  cachedStaticCanvas = null;
  cachedMovingCanvas = null;
  lastRenderContext = null;
  updateScrollingTabPanelInteractionState(null);
  clearScrollingTabCanvas();
}

function getPanelContext() {
  if (!panelCtx) {
    panelCtx = dom.scrollingTabPanelCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
  }
  return panelCtx;
}

function drawScrollingTabPanel(
  melody: MelodyDefinition,
  model: ScrollingTabPanelModel,
  options: {
    bpm: number;
    zoomScale: number;
    studyRange: { startIndex: number; endIndex: number };
    hasRuntimeCursor: boolean;
    structuralRenderKey: string;
    feedbackSignature: string;
    editingEnabled: boolean;
    selectedEventIndex: number | null;
    selectedNoteIndex: number | null;
  }
) {
  bindScrollingTabPanelInteractions();
  if (dom.scrollingTabPanel.classList.contains('hidden')) {
    dom.scrollingTabPanel.classList.remove('hidden');
  }
  const targetViewportHeight = clamp(
    Math.round(BASE_SCROLLING_TAB_PANEL_VIEWPORT_HEIGHT * options.zoomScale),
    140,
    360
  );
  if (dom.scrollingTabPanelViewport.style.height !== `${targetViewportHeight}px`) {
    dom.scrollingTabPanelViewport.style.height = `${targetViewportHeight}px`;
  }
  const viewportWidth = Math.max(320, dom.scrollingTabPanelViewport.clientWidth);
  const viewportHeight = Math.max(140, targetViewportHeight);
  const zoomScaleText = String(options.zoomScale);
  if (dom.scrollingTabPanel.style.getPropertyValue('--melody-timeline-zoom-scale') !== zoomScaleText) {
    dom.scrollingTabPanel.style.setProperty('--melody-timeline-zoom-scale', zoomScaleText);
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const drawCtx = getPanelContext();
  if (!drawCtx) {
    hideScrollingTabPanel();
    return;
  }
  const viewportLayout = computeScrollingTabPanelLayout({
    width: viewportWidth,
    height: viewportHeight,
    stringCount: model.stringCount,
    model,
    zoomScale: options.zoomScale,
  });
  updateScrollingTabPanelInteractionState({
    melodyId: melody.id,
    model,
    layout: viewportLayout,
    editingEnabled: options.editingEnabled,
    selectedEventIndex: options.selectedEventIndex,
    selectedNoteIndex: options.selectedNoteIndex,
  });
  const sceneWidth = Math.max(
    viewportWidth,
    Math.ceil(
      viewportLayout.playheadX +
        model.totalDurationSec * viewportLayout.pixelsPerSecond +
        viewportLayout.baseNoteWidth +
        64
    )
  );
  const staticRenderKey = JSON.stringify({
    viewportWidth,
    viewportHeight,
    pixelRatio,
    stringCount: model.stringCount,
  });
  const renderKey = JSON.stringify({
    currentTimeSec: model.currentTimeSec,
    viewportWidth,
    viewportHeight,
    structuralRenderKey: options.structuralRenderKey,
    feedbackSignature: options.feedbackSignature,
    sceneWidth,
    editingEnabled: options.editingEnabled,
    selectedEventIndex: options.selectedEventIndex,
    selectedNoteIndex: options.selectedNoteIndex,
  });
  const canvasConfigKey = `${viewportWidth}x${viewportHeight}|${sceneWidth}@${pixelRatio}`;
  const movingRenderKey = JSON.stringify({
    structuralRenderKey: options.structuralRenderKey,
    feedbackSignature: options.feedbackSignature,
    sceneWidth,
    viewportHeight,
    pixelRatio,
  });
  const shouldResizeCanvases = canvasConfigKey !== lastCanvasConfigKey;
  const shouldRebuildMoving = movingRenderKey !== lastSceneRenderKey;
  if (renderKey === lastRenderKey && !shouldResizeCanvases && !shouldRebuildMoving) return;
  lastRenderKey = renderKey;

  if (canvasConfigKey !== lastCanvasConfigKey) {
    lastCanvasConfigKey = canvasConfigKey;
    dom.scrollingTabPanelCanvas.width = Math.round(viewportWidth * pixelRatio);
    dom.scrollingTabPanelCanvas.height = Math.round(viewportHeight * pixelRatio);
    dom.scrollingTabPanelCanvas.style.width = `${viewportWidth}px`;
    dom.scrollingTabPanelCanvas.style.height = `${viewportHeight}px`;
  }
  if (shouldResizeCanvases || !cachedStaticCanvas || cachedStaticCanvas.dataset.renderKey !== staticRenderKey) {
    cachedStaticCanvas = document.createElement('canvas');
    cachedStaticCanvas.width = Math.round(viewportWidth * pixelRatio);
    cachedStaticCanvas.height = Math.round(viewportHeight * pixelRatio);
    cachedStaticCanvas.dataset.renderKey = staticRenderKey;
    const cachedStaticCtx = cachedStaticCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!cachedStaticCtx) {
      hideScrollingTabPanel();
      return;
    }
    cachedStaticCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    renderScrollingTabPanelStaticLayer(cachedStaticCtx, viewportLayout);
  }
  if (movingRenderKey !== lastSceneRenderKey || !cachedMovingCanvas) {
    lastSceneRenderKey = movingRenderKey;
    cachedMovingCanvas = document.createElement('canvas');
    cachedMovingCanvas.width = Math.round(sceneWidth * pixelRatio);
    cachedMovingCanvas.height = Math.round(viewportHeight * pixelRatio);
    const cachedMovingCtx = cachedMovingCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });
    if (!cachedMovingCtx) {
      hideScrollingTabPanel();
      return;
    }
    cachedMovingCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const movingLayout = {
      ...viewportLayout,
      width: sceneWidth,
      currentScrollX: 0,
    };
    renderScrollingTabPanelMovingLayer(cachedMovingCtx, model, movingLayout);
    renderScrollingTabPanelFeedback(
      cachedMovingCtx,
      model,
      movingLayout,
      lastRenderContext?.performanceFeedbackByEvent
    );
  }
  if (cachedStaticCanvas && cachedMovingCanvas) {
    drawCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    drawCtx.drawImage(cachedStaticCanvas, 0, 0, viewportWidth, viewportHeight);
    renderScrollingTabPanelViewport(drawCtx, cachedMovingCanvas, viewportLayout, pixelRatio);
    renderScrollingTabPanelSelection(drawCtx, model, viewportLayout, {
      editingEnabled: options.editingEnabled,
      selectedEventIndex: options.selectedEventIndex,
      selectedNoteIndex: options.selectedNoteIndex,
    });
    renderScrollingTabPanelPlayhead(drawCtx, viewportLayout);
  }
  if (dom.scrollingTabPanelMeta.textContent !== '') {
    dom.scrollingTabPanelMeta.textContent = '';
  }
  renderTimelineContextMenu(melody, options.selectedEventIndex, {
    editingEnabled: options.editingEnabled,
  });
}

export function updateScrollingTabPanelRuntime(currentTimeSec: number | null) {
  if (!lastStructuralModel || !lastRenderContext || !lastRenderedMelody) return;
  if (typeof currentTimeSec === 'number') {
    lastStructuralModel = {
      ...lastStructuralModel,
      currentTimeSec: Math.max(0, currentTimeSec),
    };
  }
  const model: ScrollingTabPanelModel = {
    ...lastStructuralModel,
    currentTimeSec:
      typeof currentTimeSec === 'number'
        ? Math.max(0, currentTimeSec)
        : lastStructuralModel.currentTimeSec,
  };

  drawScrollingTabPanel(lastRenderedMelody, model, {
    bpm: lastRenderContext.bpm,
    zoomScale: lastRenderContext.zoomScale,
    studyRange: lastRenderContext.studyRange,
    hasRuntimeCursor: typeof currentTimeSec === 'number',
    structuralRenderKey: lastStructuralRenderKey,
    feedbackSignature: getPerformanceFeedbackSignature(lastRenderContext.performanceFeedbackByEvent),
    editingEnabled: lastRenderContext.editingEnabled,
    selectedEventIndex: lastRenderContext.selectedEventIndex,
    selectedNoteIndex: lastRenderContext.selectedNoteIndex,
  });
}

export function renderScrollingTabPanel(
  melody: MelodyDefinition,
  _stringOrder: string[],
  options: {
    bpm: number;
    zoomScale: number;
    studyRange: { startIndex: number; endIndex: number };
    activeEventIndex: number | null;
    currentTimeSec?: number | null;
    leadInSec?: number;
    performanceFeedbackByEvent?: PerformanceTimelineFeedbackByEvent | null;
    editingEnabled: boolean;
    selectedEventIndex: number | null;
    selectedNoteIndex: number | null;
  }
) {
  lastRenderedMelody = melody;
  const structuralRenderKey = JSON.stringify({
    melodyId: melody.id,
    melodyContentSignature: buildMelodyContentSignature(melody),
    eventCount: melody.events.length,
    bpm: options.bpm,
    zoomScale: options.zoomScale,
    studyRange: options.studyRange,
    leadInSec: options.leadInSec,
  });
  if (structuralRenderKey !== lastStructuralRenderKey || lastStructuralModel === null) {
    lastStructuralRenderKey = structuralRenderKey;
    lastStructuralModel = buildScrollingTabPanelModel({
      melody,
      stringOrder: _stringOrder,
      bpm: options.bpm,
      studyRange: options.studyRange,
      activeEventIndex: options.activeEventIndex,
      currentTimeSec: options.currentTimeSec,
      leadInSec: options.leadInSec,
    });
  }
  lastRenderContext = {
    bpm: options.bpm,
    zoomScale: options.zoomScale,
    studyRange: options.studyRange,
    performanceFeedbackByEvent: options.performanceFeedbackByEvent,
    editingEnabled: options.editingEnabled,
    selectedEventIndex: options.selectedEventIndex,
    selectedNoteIndex: options.selectedNoteIndex,
  };
  if (typeof options.currentTimeSec === 'number') {
    lastStructuralModel = {
      ...lastStructuralModel,
      currentTimeSec: Math.max(0, options.currentTimeSec),
    };
  }
  const model: ScrollingTabPanelModel = {
    ...lastStructuralModel,
    currentTimeSec:
      typeof options.currentTimeSec === 'number'
        ? Math.max(0, options.currentTimeSec)
        : lastStructuralModel.currentTimeSec,
  };
  const renderFeedbackSignature = getPerformanceFeedbackSignature(options.performanceFeedbackByEvent);
  drawScrollingTabPanel(melody, model, {
    bpm: options.bpm,
    zoomScale: options.zoomScale,
    studyRange: options.studyRange,
    hasRuntimeCursor: typeof options.currentTimeSec === 'number',
    structuralRenderKey,
    feedbackSignature: renderFeedbackSignature,
    editingEnabled: options.editingEnabled,
    selectedEventIndex: options.selectedEventIndex,
    selectedNoteIndex: options.selectedNoteIndex,
  });
}
