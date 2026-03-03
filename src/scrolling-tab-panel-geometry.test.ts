import { describe, expect, it } from 'vitest';
import { computeScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';

const model: ScrollingTabPanelModel = {
  stringCount: 6,
  stringNames: ['e', 'B', 'G', 'D', 'A', 'E'],
  events: [
    {
      index: 0,
      barIndex: 0,
      startTimeSec: 1,
      durationSec: 0.5,
      isChord: false,
      notes: [{ noteIndex: 0, stringIndex: 0, stringName: 'e', fret: 0, note: 'E', finger: 0, performanceStatus: null }],
    },
    {
      index: 1,
      barIndex: 1,
      startTimeSec: 2,
      durationSec: 0.5,
      isChord: true,
      notes: [
        { noteIndex: 0, stringIndex: 1, stringName: 'B', fret: 3, note: 'D', finger: 1, performanceStatus: null },
        { noteIndex: 1, stringIndex: 3, stringName: 'D', fret: 2, note: 'E', finger: 2, performanceStatus: null },
      ],
    },
  ],
  totalDurationSec: 4,
  currentTimeSec: 1.5,
  activeEventIndex: 0,
  minDurationSec: 0.5,
  leadInSec: 1,
};

describe('scrolling-tab-panel-geometry', () => {
  it('computes a fixed playhead and evenly spaced string lanes', () => {
    const layout = computeScrollingTabPanelLayout({
      width: 800,
      height: 160,
      stringCount: 6,
      model,
      zoomScale: 1,
    });

    expect(layout.playheadX).toBe(160);
    expect(layout.stringYs).toHaveLength(6);
    expect(layout.stringYs[0]).toBeLessThan(layout.stringYs[5]);
    expect(layout.currentScrollX).toBeGreaterThan(0);
    expect(layout.pixelsPerSecond).toBeGreaterThan(0);
    expect(layout.noteHeight).toBeLessThan(layout.stringYs[1]! - layout.stringYs[0]!);
  });

  it('uses an arced playhead path between current and next event midpoints', () => {
    const layout = computeScrollingTabPanelLayout({
      width: 800,
      height: 160,
      stringCount: 6,
      model,
      zoomScale: 1,
    });

    const linearMidpoint =
      (((layout.stringYs[0] ?? 0) + (layout.stringYs[3] ?? 0)) / 2);
    expect(layout.playheadY).toBeLessThan(linearMidpoint);
    expect(layout.playheadY).toBeLessThan(layout.stringYs[0] ?? Number.POSITIVE_INFINITY);
  });
});
