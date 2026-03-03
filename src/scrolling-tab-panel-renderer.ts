import type { ScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import type { ScrollingTabPanelModel, ScrollingTabPanelEvent } from './scrolling-tab-panel-model';
import type {
  PerformanceTimelineAttempt,
  PerformanceTimelineFeedbackByEvent,
} from './performance-timeline-feedback';

const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

const FEEDBACK_COLORS = {
  good: '#4ade80',
  wrong: '#f87171',
  missed: '#991b1b',
} as const;

function getStringStrokeStyle(
  ctx: CanvasRenderingContext2D,
  stringIndex: number
) {
  const isWound = stringIndex >= 3;
  const gradient = ctx.createLinearGradient(0, 0, 0, 8);
  if (isWound) {
    gradient.addColorStop(0, 'rgba(212, 194, 142, 0.96)');
    gradient.addColorStop(0.5, 'rgba(158, 139, 85, 0.98)');
    gradient.addColorStop(1, 'rgba(116, 95, 52, 0.96)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(0.5, 'rgba(208, 208, 208, 0.96)');
    gradient.addColorStop(1, 'rgba(138, 138, 138, 0.9)');
  }
  return gradient;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getEventX(event: ScrollingTabPanelEvent, layout: ScrollingTabPanelLayout) {
  return layout.playheadX + event.startTimeSec * layout.pixelsPerSecond - layout.currentScrollX;
}

function getEventMidpointY(event: ScrollingTabPanelEvent, layout: ScrollingTabPanelLayout) {
  if (event.notes.length === 0) {
    return layout.stringYs[Math.floor(layout.stringYs.length / 2)] ?? layout.height / 2;
  }
  const ys = event.notes.map((note) => layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? layout.height / 2);
  return (Math.min(...ys) + Math.max(...ys)) / 2;
}

function getNoteColors(
  note: ScrollingTabPanelModel['events'][number]['notes'][number]
) {
  if (note.performanceStatus === 'correct') {
    return {
      fill: FEEDBACK_COLORS.good,
      stroke: null,
      alpha: 1,
      strokeWidth: 0,
    };
  }
  if (note.performanceStatus === 'wrong' || note.performanceStatus === 'missed') {
    return {
      fill: FINGER_COLORS[note.finger] ?? FINGER_COLORS[0],
      stroke: FEEDBACK_COLORS.wrong,
      alpha: 0.5,
      strokeWidth: 4,
    };
  }
  return {
    fill: FINGER_COLORS[note.finger] ?? FINGER_COLORS[0],
    stroke: null,
    alpha: 1,
    strokeWidth: 0,
  };
}

function resolveNoteFeedbackStatus(
  note: ScrollingTabPanelModel['events'][number]['notes'][number],
  attempts: PerformanceTimelineAttempt[],
  matchedAttemptIndexes: Set<number>
) {
  const findMatchingAttempt = (status: PerformanceTimelineAttempt['status']) =>
    attempts.findIndex(
      (attempt, attemptIndex) =>
        !matchedAttemptIndexes.has(attemptIndex) &&
        attempt.status === status &&
        attempt.stringName === note.stringName &&
        attempt.fret === note.fret
    );

  const correctAttemptIndex = findMatchingAttempt('correct');
  const wrongAttemptIndex = correctAttemptIndex >= 0 ? -1 : findMatchingAttempt('wrong');
  const missedAttemptIndex =
    correctAttemptIndex >= 0 || wrongAttemptIndex >= 0 ? -1 : findMatchingAttempt('missed');
  const matchedAttemptIndex =
    correctAttemptIndex >= 0
      ? correctAttemptIndex
      : wrongAttemptIndex >= 0
        ? wrongAttemptIndex
        : missedAttemptIndex;

  if (matchedAttemptIndex >= 0) {
    matchedAttemptIndexes.add(matchedAttemptIndex);
    return attempts[matchedAttemptIndex]?.status ?? null;
  }

  return null;
}

export function renderScrollingTabPanelCanvas(
  ctx: CanvasRenderingContext2D,
  model: ScrollingTabPanelModel,
  layout: ScrollingTabPanelLayout
) {
  renderScrollingTabPanelStaticLayer(ctx, layout);
  renderScrollingTabPanelMovingLayer(ctx, model, layout);
  renderScrollingTabPanelPlayhead(ctx, layout);
}

export function renderScrollingTabPanelSelection(
  ctx: CanvasRenderingContext2D,
  model: ScrollingTabPanelModel,
  layout: ScrollingTabPanelLayout,
  selection: { selectedEventIndex: number | null; selectedNoteIndex: number | null; editingEnabled: boolean }
) {
  if (!selection.editingEnabled) return;

  for (const event of model.events) {
    if (event.index !== selection.selectedEventIndex) continue;
    const eventX = getEventX(event, layout);
    const noteWidth =
      layout.baseNoteWidth + Math.max(0, (event.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
    if (eventX + noteWidth < -24 || eventX > layout.width + 24) continue;

    const yValues = event.notes.map((note) => layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? layout.height / 2);
    const topY = yValues.length > 0 ? Math.min(...yValues) - layout.noteHeight * 0.7 : layout.neckTopY;
    const bottomY =
      yValues.length > 0 ? Math.max(...yValues) + layout.noteHeight * 0.7 : layout.neckTopY + layout.neckHeight;

    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    drawRoundedRect(ctx, eventX - 4, topY, noteWidth + 8, Math.max(16, bottomY - topY), 10);
    ctx.stroke();
    ctx.restore();

    for (const note of event.notes) {
      if (note.noteIndex !== selection.selectedNoteIndex) continue;
      const noteY = layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? layout.height / 2;
      const blockHeight = layout.noteHeight;
      const blockY = noteY - blockHeight / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, eventX - 2, blockY - 2, noteWidth + 4, blockHeight + 4, (blockHeight + 4) / 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function renderScrollingTabPanelStaticLayer(
  ctx: CanvasRenderingContext2D,
  layout: ScrollingTabPanelLayout
) {
  ctx.clearRect(0, 0, layout.width, layout.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.fillStyle = '#374151';
  ctx.fillRect(0, layout.neckTopY, layout.width, layout.neckHeight);

  for (let index = 0; index < layout.stringYs.length; index += 1) {
    const y = layout.stringYs[index] ?? 0;
    ctx.strokeStyle = getStringStrokeStyle(ctx, index);
    ctx.lineWidth = index >= 3 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(layout.width, y);
    ctx.stroke();
  }
}

export function renderScrollingTabPanelMovingLayer(
  ctx: CanvasRenderingContext2D,
  model: ScrollingTabPanelModel,
  layout: ScrollingTabPanelLayout
) {
  ctx.clearRect(0, 0, layout.width, layout.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  for (let index = 0; index < model.events.length - 1; index += 1) {
    const currentEvent = model.events[index];
    const nextEvent = model.events[index + 1];
    const currentWidth =
      layout.baseNoteWidth + Math.max(0, (currentEvent.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
    const nextWidth =
      layout.baseNoteWidth + Math.max(0, (nextEvent.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
    const currentX = getEventX(currentEvent, layout) + currentWidth / 2;
    const nextX = getEventX(nextEvent, layout) + nextWidth / 2;
    if (nextX < -32 || currentX > layout.width + 32) continue;
    const currentY = getEventMidpointY(currentEvent, layout);
    const nextY = getEventMidpointY(nextEvent, layout);
    const controlX = (currentX + nextX) / 2;
    const arcHeight = 30 + currentEvent.durationSec * 40;
    const controlY = Math.min(currentY, nextY) - arcHeight;
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
    const arcGradient = ctx.createLinearGradient(currentX, 0, nextX, 0);
    arcGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    arcGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    arcGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = arcGradient;
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(244, 114, 182, 0.34)';
  ctx.lineWidth = 1;
  for (const marker of model.barMarkers) {
    const markerX = layout.playheadX + marker.startTimeSec * layout.pixelsPerSecond - layout.currentScrollX;
    if (markerX < -24 || markerX > layout.width + 24) continue;
    ctx.beginPath();
    ctx.moveTo(markerX, 10);
    ctx.lineTo(markerX, layout.height - 10);
    ctx.stroke();
  }

  for (const event of model.events) {
    const eventX = getEventX(event, layout);
    const noteWidth =
      layout.baseNoteWidth + Math.max(0, (event.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
    if (eventX + noteWidth < -24 || eventX > layout.width + 24) continue;

    if (event.isChord && event.notes.length > 1) {
      const ys = event.notes.map((note) => layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eventX + noteWidth / 2, Math.min(...ys));
      ctx.lineTo(eventX + noteWidth / 2, Math.max(...ys));
      ctx.stroke();
    }

    for (const note of event.notes) {
      const y = layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? 0;
      const blockHeight = layout.noteHeight;
      const blockY = y - blockHeight / 2;
      const colors = getNoteColors(note);
      const labelFontPx = Math.max(11, Math.min(19, blockHeight * 0.5));
      ctx.globalAlpha = colors.alpha;
      ctx.fillStyle = colors.fill;
      drawRoundedRect(ctx, eventX, blockY, noteWidth, blockHeight, blockHeight / 2);
      ctx.fill();
      if (colors.stroke) {
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = colors.strokeWidth;
        ctx.stroke();
      }

      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `700 ${labelFontPx}px Inter, ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(note.fret), eventX + noteWidth / 2, y + 1);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
}

export function renderScrollingTabPanelViewport(
  ctx: CanvasRenderingContext2D,
  sceneCanvas: CanvasImageSource,
  layout: ScrollingTabPanelLayout,
  pixelRatio = 1
) {
  const sourceX = Math.max(0, Math.round(layout.currentScrollX * pixelRatio));
  const sourceWidth = Math.max(1, Math.round(layout.width * pixelRatio));
  const sourceHeight = Math.max(1, Math.round(layout.height * pixelRatio));
  ctx.drawImage(sceneCanvas, sourceX, 0, sourceWidth, sourceHeight, 0, 0, layout.width, layout.height);
}

export function renderScrollingTabPanelFeedback(
  ctx: CanvasRenderingContext2D,
  model: ScrollingTabPanelModel,
  layout: ScrollingTabPanelLayout,
  feedbackByEvent: PerformanceTimelineFeedbackByEvent | null | undefined
) {
  if (!feedbackByEvent) return;

  for (const event of model.events) {
    const eventAttempts = feedbackByEvent[event.index] ?? [];
    if (eventAttempts.length === 0) continue;

    const eventX = getEventX(event, layout);
    const noteWidth =
      layout.baseNoteWidth + Math.max(0, (event.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
    if (eventX + noteWidth < -24 || eventX > layout.width + 24) continue;

    const matchedAttemptIndexes = new Set<number>();
    for (const note of event.notes) {
      const feedbackStatus = resolveNoteFeedbackStatus(note, eventAttempts, matchedAttemptIndexes);
      if (!feedbackStatus) continue;

      const y = layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? 0;
      const blockHeight = layout.noteHeight;
      const blockY = y - blockHeight / 2;
      const labelFontPx = Math.max(11, Math.min(19, blockHeight * 0.5));
      const fill =
        feedbackStatus === 'correct'
          ? FEEDBACK_COLORS.good
          : feedbackStatus === 'missed'
            ? FEEDBACK_COLORS.missed
            : FEEDBACK_COLORS.wrong;

      ctx.fillStyle = fill;
      drawRoundedRect(ctx, eventX, blockY, noteWidth, blockHeight, blockHeight / 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `700 ${labelFontPx}px Inter, ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(note.fret), eventX + layout.baseNoteWidth / 2, y + 1);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }
}

export function renderScrollingTabPanelPlayhead(
  ctx: CanvasRenderingContext2D,
  layout: ScrollingTabPanelLayout
) {
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = 12;
  const playheadRadius = Math.max(2.5, Math.min(4.5, layout.noteHeight * 0.18));
  ctx.beginPath();
  ctx.arc(layout.playheadX, layout.playheadY, playheadRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}
