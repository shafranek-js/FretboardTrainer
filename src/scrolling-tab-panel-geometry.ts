import type { ScrollingTabPanelEvent, ScrollingTabPanelModel } from './scrolling-tab-panel-model';
import { sampleScrollingTabPanelTrajectoryY } from './scrolling-tab-panel-trajectory';

export interface ScrollingTabPanelLayout {
  width: number;
  height: number;
  playheadX: number;
  arcHeadroom: number;
  neckTopY: number;
  neckHeight: number;
  stringYs: number[];
  pixelsPerSecond: number;
  currentScrollX: number;
  playheadY: number;
  noteHeight: number;
  baseNoteWidth: number;
}

export interface ScrollingTabPanelGeometryInput {
  width: number;
  height: number;
  stringCount: number;
  model: Pick<ScrollingTabPanelModel, 'events' | 'minDurationSec' | 'currentTimeSec'>;
  zoomScale: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getEventMidpointY(event: ScrollingTabPanelEvent | null, stringYs: number[]) {
  if (!event || event.notes.length === 0) {
    return stringYs[Math.floor(stringYs.length / 2)] ?? 0;
  }
  const ys = event.notes.map((note) => stringYs[note.stringIndex] ?? stringYs[0] ?? 0);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return (minY + maxY) / 2;
}

export function computeScrollingTabPanelLayout(
  input: ScrollingTabPanelGeometryInput
): ScrollingTabPanelLayout {
  const width = Math.max(320, input.width);
  const height = Math.max(120, input.height);
  const normalizedZoomScale = clamp(input.zoomScale, 0.7, 1.7);
  const playheadX = width * 0.2;
  const topPadding = Math.max(56, height * 0.36);
  const bottomPadding = Math.max(12, height * 0.08);
  const arcHeadroom = Math.max(8, topPadding * 0.12);
  const neckHeight = Math.max(48, height - topPadding - bottomPadding);
  const neckTopY = topPadding;
  const stringGap = input.stringCount > 0 ? neckHeight / input.stringCount : neckHeight / 2;
  const noteHeight = clamp(stringGap * 0.8 * normalizedZoomScale, 10, stringGap * 0.92);
  const baseNoteWidth = noteHeight * 1.55;
  const stringYs = Array.from({ length: input.stringCount }, (_, index) =>
    neckTopY + stringGap * index + stringGap / 2
  );

  const minDurationSec = Math.max(0.16, input.model.minDurationSec || 0.35);
  const pixelsPerSecond = Math.max(150, ((noteHeight + 8) / minDurationSec) * normalizedZoomScale);
  const currentScrollX = input.model.currentTimeSec * pixelsPerSecond;

  const events = input.model.events;
  const currentIndex = events.findIndex((event, index) => {
    const nextStart = events[index + 1]?.startTimeSec ?? Number.POSITIVE_INFINITY;
    return input.model.currentTimeSec >= event.startTimeSec && input.model.currentTimeSec < nextStart;
  });
  const currentEvent =
    currentIndex >= 0 ? events[currentIndex] : events.at(-1) ?? null;
  const nextEvent =
    currentIndex >= 0 && currentIndex + 1 < events.length ? events[currentIndex + 1] : null;

  let playheadY = getEventMidpointY(currentEvent, stringYs);
  if (currentEvent && nextEvent) {
    const span = Math.max(0.001, nextEvent.startTimeSec - currentEvent.startTimeSec);
    const progress = clamp((input.model.currentTimeSec - currentEvent.startTimeSec) / span, 0, 1);
    const startY = getEventMidpointY(currentEvent, stringYs);
    const endY = getEventMidpointY(nextEvent, stringYs);
    playheadY = sampleScrollingTabPanelTrajectoryY({
      startY,
      endY,
      durationSec: currentEvent.durationSec,
      progress,
    });
  }
  playheadY = clamp(
    playheadY,
    -Math.max(12, noteHeight * 0.8),
    height - Math.max(10, noteHeight * 0.55)
  );

  return {
    width,
    height,
    playheadX,
    arcHeadroom,
    neckTopY,
    neckHeight,
    stringYs,
    pixelsPerSecond,
    currentScrollX,
    playheadY,
    noteHeight,
    baseNoteWidth,
  };
}
