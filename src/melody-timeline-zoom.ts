const DEFAULT_MELODY_TIMELINE_ZOOM_PERCENT = 100;
const MIN_MELODY_TIMELINE_ZOOM_PERCENT = 70;
const MAX_MELODY_TIMELINE_ZOOM_PERCENT = 250;

export function normalizeMelodyTimelineZoomPercent(value: unknown) {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MELODY_TIMELINE_ZOOM_PERCENT;
  }
  return Math.min(
    MAX_MELODY_TIMELINE_ZOOM_PERCENT,
    Math.max(MIN_MELODY_TIMELINE_ZOOM_PERCENT, Math.round(parsed))
  );
}

export function formatMelodyTimelineZoomPercent(value: unknown) {
  return `${normalizeMelodyTimelineZoomPercent(value)}%`;
}

export function getMelodyTimelineZoomScale(value: unknown) {
  return normalizeMelodyTimelineZoomPercent(value) / 100;
}

export {
  DEFAULT_MELODY_TIMELINE_ZOOM_PERCENT,
  MIN_MELODY_TIMELINE_ZOOM_PERCENT,
  MAX_MELODY_TIMELINE_ZOOM_PERCENT,
};
