const DEFAULT_SCROLLING_TAB_PANEL_ZOOM_PERCENT = 100;
const MIN_SCROLLING_TAB_PANEL_ZOOM_PERCENT = 70;
const MAX_SCROLLING_TAB_PANEL_ZOOM_PERCENT = 170;

export function normalizeScrollingTabPanelZoomPercent(value: unknown) {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCROLLING_TAB_PANEL_ZOOM_PERCENT;
  }
  return Math.min(
    MAX_SCROLLING_TAB_PANEL_ZOOM_PERCENT,
    Math.max(MIN_SCROLLING_TAB_PANEL_ZOOM_PERCENT, Math.round(parsed))
  );
}

export function formatScrollingTabPanelZoomPercent(value: unknown) {
  return `${normalizeScrollingTabPanelZoomPercent(value)}%`;
}

export function getScrollingTabPanelZoomScale(value: unknown) {
  return normalizeScrollingTabPanelZoomPercent(value) / 100;
}

export {
  DEFAULT_SCROLLING_TAB_PANEL_ZOOM_PERCENT,
  MIN_SCROLLING_TAB_PANEL_ZOOM_PERCENT,
  MAX_SCROLLING_TAB_PANEL_ZOOM_PERCENT,
};
