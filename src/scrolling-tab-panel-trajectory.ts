function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const SCROLLING_TAB_TRAJECTORY_HEIGHT_BOOST = 1.3;

export function getScrollingTabPanelArcHeight(durationSec: number) {
  return (30 + Math.max(0, durationSec) * 40) * SCROLLING_TAB_TRAJECTORY_HEIGHT_BOOST;
}

export function getScrollingTabPanelTrajectoryControlY(
  startY: number,
  endY: number,
  durationSec: number
) {
  return Math.min(startY, endY) - getScrollingTabPanelArcHeight(durationSec);
}

export function sampleScrollingTabPanelTrajectoryY(options: {
  startY: number;
  endY: number;
  durationSec: number;
  progress: number;
}) {
  const { startY, endY, durationSec } = options;
  const progress = clamp(options.progress, 0, 1);
  const controlY = getScrollingTabPanelTrajectoryControlY(startY, endY, durationSec);
  const oneMinus = 1 - progress;
  return (
    oneMinus * oneMinus * startY +
    2 * oneMinus * progress * controlY +
    progress * progress * endY
  );
}
