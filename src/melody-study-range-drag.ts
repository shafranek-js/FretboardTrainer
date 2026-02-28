import { normalizeMelodyStudyRange, type MelodyStudyRange } from './melody-study-range';

export type MelodyStudyRangeDragMode = 'start' | 'end' | 'move';

export interface TimelineStepMetric {
  index: number;
  left: number;
  right: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveTimelineStepIndexFromX(metrics: TimelineStepMetric[], x: number) {
  if (metrics.length === 0) return 0;

  const first = metrics[0];
  const last = metrics[metrics.length - 1];
  if (x <= first.left) return first.index;
  if (x >= last.right) return last.index;

  for (const metric of metrics) {
    const midpoint = metric.left + (metric.right - metric.left) / 2;
    if (x <= midpoint) return metric.index;
  }

  return last.index;
}

export function computeDraggedMelodyStudyRange(
  mode: MelodyStudyRangeDragMode,
  originRange: MelodyStudyRange,
  hoveredIndex: number,
  totalEvents: number,
  dragAnchorOffset = 0
) {
  const normalizedOrigin = normalizeMelodyStudyRange(originRange, totalEvents);
  const clampedHovered = clamp(Math.round(hoveredIndex), 0, Math.max(0, totalEvents - 1));

  if (mode === 'start') {
    return normalizeMelodyStudyRange(
      {
        startIndex: clampedHovered,
        endIndex: normalizedOrigin.endIndex,
      },
      totalEvents
    );
  }

  if (mode === 'end') {
    return normalizeMelodyStudyRange(
      {
        startIndex: normalizedOrigin.startIndex,
        endIndex: clampedHovered,
      },
      totalEvents
    );
  }

  const span = normalizedOrigin.endIndex - normalizedOrigin.startIndex;
  const proposedStart = clamp(
    Math.round(clampedHovered - dragAnchorOffset),
    0,
    Math.max(0, totalEvents - span - 1)
  );

  return normalizeMelodyStudyRange(
    {
      startIndex: proposedStart,
      endIndex: proposedStart + span,
    },
    totalEvents
  );
}
