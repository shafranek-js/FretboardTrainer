import { describe, expect, it } from 'vitest';
import { resolveTimelineRuntimeCenterX } from './melody-tab-timeline-runtime-follow';

describe('melody-tab-timeline-runtime-follow', () => {
  it('interpolates smoothly during preroll towards the first visible event', () => {
    const centerX = resolveTimelineRuntimeCenterX(1, 2, [
      { eventIndex: 0, startTimeSec: 2, endTimeSec: 3, travelStartX: 400, travelEndX: 560, leftX: 400, rightX: 520, centerX: 460 },
      { eventIndex: 1, startTimeSec: 3, endTimeSec: 4, travelStartX: 560, travelEndX: 700, leftX: 560, rightX: 680, centerX: 620 },
    ]);

    expect(centerX).toBe(200);
  });

  it('interpolates smoothly between consecutive event anchors', () => {
    const centerX = resolveTimelineRuntimeCenterX(2.5, 0, [
      { eventIndex: 0, startTimeSec: 2, endTimeSec: 3, travelStartX: 400, travelEndX: 560, leftX: 400, rightX: 520, centerX: 460 },
      { eventIndex: 1, startTimeSec: 3, endTimeSec: 4, travelStartX: 560, travelEndX: 700, leftX: 560, rightX: 680, centerX: 620 },
    ]);

    expect(centerX).toBe(480);
  });
});
