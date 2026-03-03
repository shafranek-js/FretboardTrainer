export interface RuntimeTimelineEventPoint {
  eventIndex: number;
  startTimeSec: number;
  endTimeSec: number;
  travelStartX: number;
  travelEndX: number;
  leftX: number;
  rightX: number;
  centerX: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function resolveTimelineRuntimeCenterX(
  currentTimeSec: number,
  leadInSec: number,
  points: RuntimeTimelineEventPoint[]
) {
  if (points.length === 0) return 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (!firstPoint) return 0;
  if (!lastPoint) return firstPoint.travelEndX;
  if (leadInSec > 0 && currentTimeSec <= leadInSec) {
    return lerp(0, firstPoint.travelStartX, clamp(currentTimeSec / leadInSec, 0, 1));
  }
  const activePoint =
    points.find((point) => currentTimeSec >= point.startTimeSec && currentTimeSec <= point.endTimeSec) ?? null;
  if (activePoint) {
    const durationSec = Math.max(0.001, activePoint.endTimeSec - activePoint.startTimeSec);
    const progress = clamp((currentTimeSec - activePoint.startTimeSec) / durationSec, 0, 1);
    return lerp(activePoint.travelStartX, activePoint.travelEndX, progress);
  }
  if (currentTimeSec < firstPoint.startTimeSec) {
    return firstPoint.travelStartX;
  }
  return lastPoint.travelEndX;
}

export function resolveTimelineRuntimeCursorState(
  currentTimeSec: number,
  leadInSec: number,
  points: RuntimeTimelineEventPoint[]
) {
  const centerX = resolveTimelineRuntimeCenterX(currentTimeSec, leadInSec, points);
  const activeEventIndex =
    points.find((point) => centerX >= point.leftX && centerX <= point.rightX)?.eventIndex ?? null;
  return {
    centerX,
    activeEventIndex,
  };
}
