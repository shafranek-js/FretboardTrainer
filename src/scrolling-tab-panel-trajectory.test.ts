import { describe, expect, it } from 'vitest';
import {
  getScrollingTabPanelArcHeight,
  getScrollingTabPanelTrajectoryControlY,
  sampleScrollingTabPanelTrajectoryY,
} from './scrolling-tab-panel-trajectory';

describe('scrolling-tab-panel-trajectory', () => {
  it('builds control point from min endpoint and arc height', () => {
    expect(getScrollingTabPanelArcHeight(0.5)).toBeCloseTo(65, 6);
    expect(getScrollingTabPanelTrajectoryControlY(80, 120, 0.5)).toBeCloseTo(15, 6);
    expect(getScrollingTabPanelTrajectoryControlY(140, 90, 1)).toBeCloseTo(-1, 6);
  });

  it('samples quadratic path endpoints and midpoint consistently', () => {
    const startY = 100;
    const endY = 140;
    const durationSec = 1;
    const controlY = getScrollingTabPanelTrajectoryControlY(startY, endY, durationSec);
    const midpoint = sampleScrollingTabPanelTrajectoryY({
      startY,
      endY,
      durationSec,
      progress: 0.5,
    });

    expect(sampleScrollingTabPanelTrajectoryY({ startY, endY, durationSec, progress: 0 })).toBe(startY);
    expect(sampleScrollingTabPanelTrajectoryY({ startY, endY, durationSec, progress: 1 })).toBe(endY);
    expect(midpoint).toBeCloseTo((startY + 2 * controlY + endY) / 4, 6);
  });
});
